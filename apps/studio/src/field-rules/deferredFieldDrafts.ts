export type DeferredFieldCommitResult = { accepted: boolean; stale?: boolean; blockingErrors?: readonly { message: string }[] };
export type DeferredFieldDraft = {
  valid: boolean;
  composing?: boolean;
  message?: string;
  focus?: () => void;
  commit: () => DeferredFieldCommitResult | Promise<DeferredFieldCommitResult>;
  /** UI callbacks run only while this exact local generation remains current. */
  onSettled?: () => void;
  onFailure?: (message: string) => void;
};
export type DeferredFieldFlushResult = { accepted: boolean; invalidKeys: string[] };
export interface DeferredDraftClock {
  now(): number;
  setTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout>;
  clearTimeout(timer: ReturnType<typeof setTimeout>): void;
}
const browserClock: DeferredDraftClock = {
  now: () => performance.now(),
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: timer => clearTimeout(timer),
};
type Entry = DeferredFieldDraft & { generation: number; firstPendingAt: number; dueAt: number };
export type DeferredDraftSummary = Readonly<{ pendingCount: number; invalidCount: number; composingCount: number; provisionalCount: number }>;

/** Studio-owned coalescing. Native canonical mutations and save scheduling stay independent. */
export class DeferredFieldDraftCoordinator {
  private entries = new Map<string, Entry>();
  private listeners = new Set<() => void>();
  private revision = 0;
  private generation = 0;
  private provisional = 0;
  private mutationSerial = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private active: Promise<boolean> | null = null;
  private activeEntry: Entry | null = null;
  private summary: DeferredDraftSummary = { pendingCount: 0, invalidCount: 0, composingCount: 0, provisionalCount: 0 };

  constructor(readonly delayMs: number, readonly maxWaitMs = 325, private readonly clock: DeferredDraftClock = browserClock) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  getSnapshot = () => this.revision;
  getSummarySnapshot = () => this.summary;
  get pendingCount() { return this.summary.pendingCount; }
  get invalidCount() { return this.summary.invalidCount; }
  get dirty() { return this.entries.size > 0 || this.provisional > 0; }
  get provisionalCount() { return this.provisional; }
  async withProvisional<T>(action: () => Promise<T>): Promise<T> {
    this.provisional++; this.notify();
    try { return await action(); }
    finally { this.provisional--; this.notify(); }
  }
  /** Other canonical writes share the active transaction barrier, without
   * forcing unrelated incomplete local drafts to commit. */
  async runMutation<T>(action: () => T | Promise<T>): Promise<T> {
    const preceding = [...this.entries].filter(([, entry]) => entry.valid).map(([key]) => key);
    const key = `mutation:${++this.mutationSerial}`;
    let result: T | undefined, failure: unknown, ran = false;
    this.schedule(key, { valid: true, commit: async () => {
      ran = true;
      try { result = await action(); } catch (error) { failure = error; }
      return { accepted: true };
    } });
    for (const earlier of preceding) await this.flushKey(earlier);
    await this.flushKey(key);
    if (failure) throw failure;
    if (!ran) throw new Error("This editing session is no longer current.");
    return result as T;
  }
  /** Presentation navigation only; never flushes or accepts a draft. */
  focusFirstInvalid() {
    const entry = [...this.entries.values()].find(value => !value.valid && !value.composing);
    entry?.focus?.(); return Boolean(entry);
  }

  private notify() {
    const pendingCount = this.entries.size, invalidCount = [...this.entries.values()].filter(entry => !entry.valid && !entry.composing).length, composingCount = [...this.entries.values()].filter(entry => entry.composing).length;
    if (pendingCount !== this.summary.pendingCount || invalidCount !== this.summary.invalidCount || composingCount !== this.summary.composingCount || this.provisional !== this.summary.provisionalCount) this.summary = { pendingCount, invalidCount, composingCount, provisionalCount: this.provisional };
    this.revision += 1;
    this.listeners.forEach(listener => listener());
  }
  private clearTimer() { if (this.timer !== undefined) this.clock.clearTimeout(this.timer); this.timer = undefined; }
  private arm() {
    this.clearTimer();
    if (this.active) return;
    const next = [...this.entries].filter(([, entry]) => entry.valid).sort((a,b) => a[1].dueAt-b[1].dueAt)[0];
    if (!next) return;
    this.timer = this.clock.setTimeout(() => { this.timer = undefined; void this.flushKey(next[0], true); }, Math.max(0, next[1].dueAt-this.clock.now()));
  }
  schedule(key: string, draft: DeferredFieldDraft) {
    const previous = this.entries.get(key), now = this.clock.now();
    const firstPendingAt = previous?.valid && previous !== this.activeEntry ? previous.firstPendingAt : now;
    this.entries.set(key, { ...draft, generation: ++this.generation, firstPendingAt, dueAt: Math.min(now+this.delayMs, firstPendingAt+this.maxWaitMs) });
    this.notify(); this.arm();
  }
  cancel(key: string) { if (!this.entries.delete(key)) return; this.notify(); this.arm(); }
  async flushKey(key: string, automatic = false): Promise<boolean> {
    for (;;) {
      if (this.active) { await this.active; continue; }
      const entry = this.entries.get(key);
      if (!entry) return true;
      if (!entry.valid) { entry.focus?.(); return false; }
      this.clearTimer(); this.activeEntry = entry;
      const running = Promise.resolve().then(async () => {
        // Cancellation/disposal can occur between flush invocation and this task.
        if (this.entries.get(key) !== entry) return true;
        try {
          const result = await entry.commit();
          const accepted = result.accepted && !result.stale;
          if (this.entries.get(key) === entry) {
            if (accepted) this.entries.delete(key);
            else { entry.valid = false; entry.message = result.blockingErrors?.map(issue => issue.message).join("\n") || "This value could not be applied."; entry.focus?.(); }
            entry.onSettled?.(); this.notify();
          }
          return accepted;
        } catch (cause) {
          if (this.entries.get(key) === entry) {
            entry.valid = false; entry.message = cause instanceof Error ? cause.message : String(cause);
            entry.onFailure?.(entry.message || "This value could not be applied."); entry.focus?.(); this.notify();
          }
          return false;
        }
      });
      this.active = running;
      let accepted = false;
      try { accepted = await running; }
      finally { if (this.active === running) { this.active = null; this.activeEntry = null; this.arm(); } }
      if (automatic) return accepted;
      // Drain any newer local generation before an explicit caller continues.
    }
  }
  async flush(): Promise<DeferredFieldFlushResult> {
    const invalidKeys: string[] = [];
    for (const key of [...this.entries.keys()]) if (!await this.flushKey(key)) invalidKeys.push(key);
    return { accepted: invalidKeys.length === 0, invalidKeys };
  }
  dispose() { this.clearTimer(); this.entries.clear(); this.notify(); this.listeners.clear(); }
}
export const STUDIO_FIELD_DRAFT_DELAY_MS = 100;

export async function waitForCanonicalExportReadiness(session: {
  getSnapshot(): { readiness: { exportReady: boolean; state: string; reasons: readonly string[] } };
  subscribe(listener: () => void): () => void;
}, timeoutMs = 10000): Promise<void> {
  if (session.getSnapshot().readiness.exportReady) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { stop(); reject(new Error("The preview did not become ready for export in time.")); }, timeoutMs);
    const inspect = () => {
      const readiness = session.getSnapshot().readiness;
      if (readiness.exportReady) { clearTimeout(timer); stop(); resolve(); }
      else if (readiness.state === "blocked") { clearTimeout(timer); stop(); reject(new Error(readiness.reasons[0] ?? "The current content is not ready to export.")); }
    };
    const stop = session.subscribe(inspect);
    inspect();
  });
}

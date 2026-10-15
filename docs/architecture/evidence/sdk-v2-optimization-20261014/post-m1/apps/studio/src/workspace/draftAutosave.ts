/** Studio content coordinator. Pending values are immutable canonical record snapshots. */
export function createStudioAutosave<T>(write: (value: T) => Promise<unknown>, notify: (status: string) => void, delay = 650, failure: (cause: unknown | null) => void = () => {}) {
  let disposed = false;
  let generation = 0;
  let pending: { value: T; revision: number } | null = null;
  let revision = 0;
  let saved = 0;
  let running: Promise<void> | null = null;
  let runningGeneration = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = async (): Promise<void> => {
    clearTimeout(timer);
    if (running) {
      const owner = runningGeneration;
      try { await running; } catch (cause) { if (owner === generation) throw cause; }
      return flush();
    }
    if (disposed || !pending) return;
    const job = pending; pending = null;
    const scope = generation;
    const current = () => !disposed && scope === generation;
    failure(null); notify("Saving…"); runningGeneration = scope;
    running = (async () => {
      try {
        await Promise.resolve().then(() => current() ? write(job.value) : undefined);
        if (current()) { saved = job.revision; notify(saved === revision ? "Saved" : "Unsaved changes"); }
      } catch (cause) {
        if (current()) { pending ??= job; failure(cause); notify(`Save failed: ${cause instanceof Error ? cause.message : String(cause)}`); }
        throw cause;
      } finally { running = null; }
    })();
    await running;
    if (current() && pending) await flush();
  };
  return {
    schedule(value: T) { if (disposed) return; pending = { value: structuredClone(value), revision: ++revision }; notify("Unsaved changes"); clearTimeout(timer); timer = setTimeout(() => { void flush().catch(() => {}); }, delay); },
    flush,
    activate() { disposed = false; },
    dirty: () => !disposed && saved !== revision,
    dispose() { disposed = true; generation++; pending = null; clearTimeout(timer); },
  };
}

/** Private host composition. No Studio imports or additional canonical authority. */
import { appendTemplateSourcesV2, type TemplateImportSourceV2 } from "@sleinity/template-browser/importer";
import { createTemplateSessionV2, createTemplateFieldFamilySessionV2 } from "@sleinity/template-browser/session";
import {
  getTemplateSessionRepositoryV2, getTemplateFieldFamilyRepositoryV3, getTemplateRecoveryRepository,
  TemplateRecoveryCleanupError,
  type TemplateSessionRepositoryV2, type TemplateFieldFamilyRepositoryV3, type TemplateRecoveryRepository,
  type TemplateRecoveryLease, type TemplateRecoveryPayload,
} from "@sleinity/template-browser/persistence";
import type { ReactTemplateFieldSessionV2 } from "@sleinity/template-react/editor";

export type StarterRecord = TemplateRecoveryPayload;
export type StarterAdapters = {
  single: TemplateSessionRepositoryV2;
  family: TemplateFieldFamilyRepositoryV3;
  recovery: TemplateRecoveryRepository;
};
export const defaultStarterAdapters = (): StarterAdapters => ({
  single: getTemplateSessionRepositoryV2(), family: getTemplateFieldFamilyRepositoryV3(), recovery: getTemplateRecoveryRepository(),
});
export const listStarterRecords = async (a: StarterAdapters): Promise<StarterRecord[]> =>
  (await Promise.all([a.single.listTemplateSessionsV2(), a.family.listTemplateFieldFamiliesV3()])).flat();

export class StarterOutput {
  session!: ReactTemplateFieldSessionV2;
  record: StarterRecord | null = null;
  lease: TemplateRecoveryLease | null = null;
  private initial: StarterRecord | null = null;
  private target: "library" | "recovery" = "library";
  private disposed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private tail: Promise<unknown> = Promise.resolve();
  private stop?: () => void;
  private listeners = new Set<() => void>();
  private view = { dirty: false, error: null as unknown, finished: false, cleanupRequired: false };
  readonly id = crypto.randomUUID();
  constructor(readonly adapters: StarterAdapters) {}
  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private publish(update: Partial<typeof this.view>) {
    this.view = { ...this.view, ...update };
    if (!this.disposed) for (const listener of this.listeners) listener();
  }
  private active() { if (this.disposed) throw new Error("This host output has been disposed."); }
  private queue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.catch(() => {}).then(() => { this.active(); return operation(); });
    this.tail = result;
    return result;
  }
  private clearTimer() { clearTimeout(this.timer); this.timer = undefined; }
  private watch() {
    const identity = () => { const s = this.session.getSnapshot(); return `${s.operationRevision}:${s.contentState?.revision}`; };
    let previous = identity();
    this.stop = this.session.subscribe(() => {
      const next = identity(); if (next === previous) return; previous = next;
      if (this.view.finished) return;
      this.publish({ dirty: true }); this.clearTimer();
      // Example policy: sessions themselves never schedule autosave.
      if (this.lease && !this.view.error) this.timer = setTimeout(() => { void this.flushRecovery().catch(() => {}); }, 650);
    });
  }
  private metadata<T extends StarterRecord>(value: T): T {
    return this.record ? { ...value, id: this.record.id, createdAt: this.record.createdAt } : value;
  }
  private singleRepository(): TemplateSessionRepositoryV2 {
    const a = this.adapters;
    return {
      listTemplateSessionsV2: () => a.single.listTemplateSessionsV2(),
      listIncompatibleTemplateSessionsV2: () => a.single.listIncompatibleTemplateSessionsV2(),
      deleteIncompatibleTemplateSessionV2: id => a.single.deleteIncompatibleTemplateSessionV2(id),
      deleteTemplateSessionV2: id => a.single.deleteTemplateSessionV2(id),
      getTemplateSessionV2: id => this.initial && !("family" in this.initial) ? Promise.resolve(this.initial) : a.single.getTemplateSessionV2(id),
      getManagedAsset: async hash => this.lease ? await a.recovery.getManagedAsset(hash) ?? a.single.getManagedAsset(hash) : a.single.getManagedAsset(hash),
      saveTemplateSessionV2: async value => {
        const next = this.metadata(value);
        if (this.target === "recovery") {
          if (!this.lease) throw new Error("Recovery has no active lease.");
          return await a.recovery.save(this.lease, next) as typeof value;
        }
        const saved = await a.single.saveTemplateSessionV2(next); this.record = saved; return saved;
      },
    };
  }
  private familyRepository(): TemplateFieldFamilyRepositoryV3 {
    const a = this.adapters;
    return {
      listTemplateFieldFamiliesV3: () => a.family.listTemplateFieldFamiliesV3(),
      listIncompatibleTemplateFieldFamiliesV3: () => a.family.listIncompatibleTemplateFieldFamiliesV3(),
      deleteIncompatibleTemplateFieldFamilyV3: id => a.family.deleteIncompatibleTemplateFieldFamilyV3(id),
      deleteTemplateFieldFamilyV3: id => a.family.deleteTemplateFieldFamilyV3(id),
      getTemplateFieldFamilyV3: id => this.initial && "family" in this.initial ? Promise.resolve(this.initial) : a.family.getTemplateFieldFamilyV3(id),
      getManagedAsset: async hash => this.lease ? await a.recovery.getManagedAsset(hash) ?? a.family.getManagedAsset(hash) : a.family.getManagedAsset(hash),
      saveTemplateFieldFamilyV3: async value => {
        const next = this.metadata(value);
        if (this.target === "recovery") {
          if (!this.lease) throw new Error("Recovery has no active lease.");
          return await a.recovery.save(this.lease, next) as typeof value;
        }
        const saved = await a.family.saveTemplateFieldFamilyV3(next); this.record = saved; return saved;
      },
    };
  }
  static fromSources(adapters: StarterAdapters, sources: readonly TemplateImportSourceV2[]) {
    if (!sources.length) throw new Error("Choose at least one prepared source.");
    const output = new StarterOutput(adapters);
    output.session = appendTemplateSourcesV2(null, [], sources, "Host Family", {}, {
      single: { repository: output.singleRepository() }, family: { repository: output.familyRepository() },
    });
    if (output.session.getSnapshot().status !== "ready") { output.dispose(); throw new Error("Sources could not be accepted."); }
    output.watch(); return output;
  }
  static async reopen(adapters: StarterAdapters, record: StarterRecord, mode: "fresh" | "resume") {
    const output = new StarterOutput(adapters); output.record = record;
    try {
      const begun = await adapters.recovery.begin({ kind: "family" in record ? "family" : "single", templateId: record.id }, mode);
      output.lease = begun.lease; output.initial = begun.payload ?? record; output.target = "recovery";
      output.session = "family" in record
        ? createTemplateFieldFamilySessionV2({ repository: output.familyRepository() })
        : createTemplateSessionV2({ repository: output.singleRepository() });
      const snapshot = await output.session.loadSaved(record.id);
      if (snapshot.status !== "ready") throw new Error(snapshot.error?.message ?? "Saved work could not load.");
      output.watch(); return output;
    } catch (error) { output.dispose(); throw error; }
  }
  async saveTemplate(name: string) {
    this.clearTimer();
    return this.queue(async () => {
      try {
        this.target = "library";
        const saved = await this.session.save({ name });
        if (!this.lease) this.lease = (await this.adapters.recovery.begin({ kind: "family" in saved ? "family" : "single", templateId: saved.id }, "fresh")).lease;
        this.publish({ error: null, dirty: false }); return saved;
      } catch (error) { this.publish({ error, dirty: true }); throw error; }
      finally { this.target = this.lease ? "recovery" : "library"; }
    });
  }
  async flushRecovery() {
    this.clearTimer();
    return this.queue(async () => {
      if (this.view.finished) return;
      try {
        // A library write may have succeeded before starting recovery failed.
        // Retry that missing lease explicitly; never replace a superseded lease.
        if (!this.lease && this.record) this.lease = (await this.adapters.recovery.begin({ kind: "family" in this.record ? "family" : "single", templateId: this.record.id }, "fresh")).lease;
        if (!this.lease) return;
        const revision = this.session.getSnapshot().operationRevision;
        this.target = "recovery"; await this.session.save();
        this.publish({ error: null, dirty: this.session.getSnapshot().operationRevision !== revision });
      } catch (error) { this.publish({ error, dirty: true }); throw error; }
    });
  }
  async exportPng(capture: () => Promise<unknown>) {
    await this.flushRecovery();
    return this.queue(async () => {
      this.clearTimer();
      try {
        if (this.lease) await this.adapters.recovery.exportAndComplete(this.lease, capture); else await capture();
        this.publish({ error: null, dirty: false, finished: true });
      } catch (error) {
        if (error instanceof TemplateRecoveryCleanupError) this.publish({ error, dirty: false, finished: true, cleanupRequired: true });
        else this.publish({ error });
        throw error;
      }
    });
  }
  async retryCleanup() {
    return this.queue(async () => {
      if (!this.lease || !this.view.cleanupRequired) return;
      await this.adapters.recovery.complete(this.lease); this.publish({ error: null, cleanupRequired: false });
    });
  }
  async discard() {
    this.clearTimer(); await this.queue(async () => { if (this.lease) await this.adapters.recovery.discard(this.lease); this.publish({ finished: true, dirty: false, error: null }); });
  }
  dispose() { if (this.disposed) return; this.disposed = true; this.clearTimer(); this.stop?.(); this.listeners.clear(); this.session?.dispose(); }
}

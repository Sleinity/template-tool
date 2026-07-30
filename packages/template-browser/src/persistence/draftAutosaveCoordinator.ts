import type { TemplatePackageV1 } from "@sleinity/template-core";

export type DraftAutosaveStatus =
  | "clean"
  | "pending"
  | "saving"
  | "saved"
  | "failed";

export interface DraftAutosaveState {
  status: DraftAutosaveStatus;
  revision: number;
  savedRevision: number;
  message: string | null;
}

export interface DraftAutosaveCoordinator {
  schedule(draftId: string, packageValue: TemplatePackageV1): number;
  flush(): Promise<void>;
  retry(): Promise<void>;
  reset(): void;
  getState(): DraftAutosaveState;
}

export interface DraftAutosaveLifecycleTarget {
  addEventListener(type: "pagehide", listener: () => void): void;
  removeEventListener(type: "pagehide", listener: () => void): void;
}

interface PendingDraftSave {
  draftId: string;
  packageValue: TemplatePackageV1;
  revision: number;
}

interface DraftAutosaveCoordinatorOptions {
  save: (draftId: string, packageValue: TemplatePackageV1) => Promise<void>;
  onStateChange?: (state: DraftAutosaveState) => void;
  delayMs?: number;
  setTimer?: (callback: () => void, delayMs: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}

const initialState = (): DraftAutosaveState => ({
  status: "clean",
  revision: 0,
  savedRevision: 0,
  message: null,
});

export function createDraftAutosaveCoordinator({
  save,
  onStateChange,
  delayMs = 650,
  setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimer = (timer) => globalThis.clearTimeout(timer as number),
}: DraftAutosaveCoordinatorOptions): DraftAutosaveCoordinator {
  let state = initialState();
  let latest: PendingDraftSave | null = null;
  let requestedRevision = 0;
  let timer: unknown = null;
  let worker: Promise<void> | null = null;
  let generation = 0;

  const publish = (next: DraftAutosaveState) => {
    state = next;
    onStateChange?.(next);
  };

  const clearPendingTimer = () => {
    if (timer === null) return;
    clearTimer(timer);
    timer = null;
  };

  const runWorker = (workerGeneration: number): Promise<void> => {
    const operation = (async () => {
      while (
        latest &&
        state.savedRevision < requestedRevision &&
        workerGeneration === generation
      ) {
        const pending = latest;
        publish({
          status: "saving",
          revision: pending.revision,
          savedRevision: state.savedRevision,
          message: "Saving changes…",
        });
        try {
          await save(pending.draftId, structuredClone(pending.packageValue));
        } catch (error) {
          if (workerGeneration === generation) {
            publish({
              status: "failed",
              revision: latest?.revision ?? pending.revision,
              savedRevision: state.savedRevision,
              message:
                error instanceof Error
                  ? `Automatic save failed: ${error.message}`
                  : "Automatic save failed. Retry to keep your latest changes.",
            });
          }
          throw error;
        }

        if (workerGeneration !== generation) return;
        const savedRevision = pending.revision;
        const hasNewerEdit = (latest?.revision ?? savedRevision) > savedRevision;
        publish({
          status: hasNewerEdit ? "pending" : "saved",
          revision: latest?.revision ?? savedRevision,
          savedRevision,
          message: hasNewerEdit ? "Changes waiting to save." : "Changes saved.",
        });
      }
    })();

    worker = operation.finally(() => {
      if (worker === operation || workerGeneration === generation) {
        worker = null;
      }
    });
    return worker;
  };

  const flush = async () => {
    clearPendingTimer();
    if (!latest || latest.revision <= state.savedRevision) {
      if (worker) await worker;
      return;
    }
    requestedRevision = Math.max(requestedRevision, latest.revision);
    const activeWorker = worker ?? runWorker(generation);
    await activeWorker;
    if (latest && latest.revision > state.savedRevision) {
      requestedRevision = latest.revision;
      await (worker ?? runWorker(generation));
    }
  };

  return {
    schedule(draftId, packageValue) {
      const revision = state.revision + 1;
      latest = {
        draftId,
        packageValue: structuredClone(packageValue),
        revision,
      };
      publish({
        status: "pending",
        revision,
        savedRevision: state.savedRevision,
        message: "Changes waiting to save.",
      });
      clearPendingTimer();
      timer = setTimer(() => {
        timer = null;
        void flush().catch(() => undefined);
      }, delayMs);
      return revision;
    },
    flush,
    retry: flush,
    reset() {
      generation += 1;
      clearPendingTimer();
      latest = null;
      requestedRevision = 0;
      worker = null;
      publish(initialState());
    },
    getState: () => state,
  };
}

export function bindDraftAutosaveLifecycle(
  coordinator: Pick<DraftAutosaveCoordinator, "flush">,
  target: DraftAutosaveLifecycleTarget,
): () => void {
  const flushPendingSave = () => {
    void coordinator.flush().catch(() => undefined);
  };
  target.addEventListener("pagehide", flushPendingSave);
  return () => {
    target.removeEventListener("pagehide", flushPendingSave);
    flushPendingSave();
  };
}

export async function runAfterDraftAutosaveFlush(
  coordinator: Pick<DraftAutosaveCoordinator, "flush">,
  action: () => void | Promise<void>,
  onError?: (error: unknown) => void,
): Promise<boolean> {
  try {
    await coordinator.flush();
    await action();
    return true;
  } catch (error) {
    onError?.(error);
    return false;
  }
}

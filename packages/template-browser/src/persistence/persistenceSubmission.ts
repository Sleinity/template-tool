export type PersistenceSubmissionStatus = "idle" | "saving" | "failed";

export interface PersistenceSubmissionState {
  status: PersistenceSubmissionStatus;
  message: string | null;
}

export type PersistenceSubmissionResult =
  | { status: "saved" }
  | { status: "failed"; error: unknown }
  | { status: "ignored" };

export interface PersistenceSubmissionController {
  run(
    action: () => Promise<void>,
    fallbackMessage: string,
  ): Promise<PersistenceSubmissionResult>;
  reset(): void;
  getState(): PersistenceSubmissionState;
}

export function createPersistenceSubmissionController(
  onStateChange?: (state: PersistenceSubmissionState) => void,
): PersistenceSubmissionController {
  let inFlight = false;
  let state: PersistenceSubmissionState = { status: "idle", message: null };

  const publish = (next: PersistenceSubmissionState) => {
    state = next;
    onStateChange?.(next);
  };

  return {
    async run(action, fallbackMessage) {
      if (inFlight) return { status: "ignored" };
      inFlight = true;
      publish({ status: "saving", message: null });
      try {
        await action();
        publish({ status: "idle", message: null });
        return { status: "saved" };
      } catch (error) {
        publish({
          status: "failed",
          message: error instanceof Error ? error.message : fallbackMessage,
        });
        return { status: "failed", error };
      } finally {
        inFlight = false;
      }
    },
    reset() {
      if (inFlight) return;
      publish({ status: "idle", message: null });
    },
    getState: () => state,
  };
}

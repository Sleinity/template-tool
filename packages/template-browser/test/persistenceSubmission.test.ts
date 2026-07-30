import { createPersistenceSubmissionController } from "../src/persistence/persistenceSubmission";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const states: string[] = [];
const controller = createPersistenceSubmissionController((state) =>
  states.push(state.status),
);
let releaseSave: (() => void) | null = null;
let createCalls = 0;
const firstSubmission = controller.run(async () => {
  createCalls += 1;
  await new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
}, "Template could not be created.");
await Promise.resolve();
const duplicateSubmission = await controller.run(async () => {
  createCalls += 1;
}, "Template could not be created.");
assert(
  duplicateSubmission.status === "ignored" &&
    createCalls === 1 &&
    controller.getState().status === "saving",
  "A second Create or Update click should be ignored while persistence is in flight.",
);
(releaseSave as (() => void) | null)?.();
const firstResult = await firstSubmission;
assert(
  firstResult.status === "saved" &&
    controller.getState().status === "idle" &&
    states.includes("saving"),
  "Explicit persistence should remain in saving state until the awaited action succeeds.",
);

const failedResult = await controller.run(async () => {
  throw new Error("IndexedDB write failed");
}, "Template changes could not be saved.");
assert(
  failedResult.status === "failed" &&
    controller.getState().status === "failed" &&
    controller.getState().message === "IndexedDB write failed",
  "Explicit persistence failures should remain visible and preserve the actionable error.",
);

let retried = false;
const retryResult = await controller.run(async () => {
  retried = true;
}, "Template changes could not be saved.");
assert(
  retryResult.status === "saved" &&
    retried &&
    controller.getState().status === "idle",
  "A failed explicit submission should be retryable without recreating its UI state.",
);

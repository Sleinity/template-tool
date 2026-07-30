import figmaPluginV041 from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import type { TemplatePackageV1 } from "../../../src/template-package/types";
import {
  bindDraftAutosaveLifecycle,
  createDraftAutosaveCoordinator,
  runAfterDraftAutosaveFlush,
} from "../src/persistence/draftAutosaveCoordinator";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const packageValue = figmaPluginV041 as unknown as TemplatePackageV1;
const states: string[] = [];
const saves: string[] = [];
let scheduled: (() => void) | null = null;
const coordinator = createDraftAutosaveCoordinator({
  save: async (_draftId, value) => {
    saves.push(value.name);
  },
  onStateChange: (state) => states.push(state.status),
  setTimer: (callback) => {
    scheduled = callback;
    return callback;
  },
  clearTimer: () => {
    scheduled = null;
  },
});

const firstEdit = structuredClone(packageValue);
firstEdit.name = "First edit";
coordinator.schedule("draft-1", firstEdit);
assert(
  coordinator.getState().status === "pending" && scheduled !== null,
  "Scheduling an editor change should expose a pending autosave state.",
);
await coordinator.flush();
assert(
  saves.join(",") === "First edit" &&
    coordinator.getState().status === "saved" &&
    states.includes("saving"),
  "Flushing should persist the latest package and transition through saving to saved.",
);

const firstSaveGate: { release: (() => void) | null } = { release: null };
const orderedSaves: string[] = [];
const orderedCoordinator = createDraftAutosaveCoordinator({
  save: async (_draftId, value) => {
    orderedSaves.push(value.name);
    if (value.name === "Older edit") {
      await new Promise<void>((resolve) => {
        firstSaveGate.release = resolve;
      });
    }
  },
  setTimer: () => 1,
  clearTimer: () => undefined,
});
const olderEdit = structuredClone(packageValue);
olderEdit.name = "Older edit";
orderedCoordinator.schedule("draft-1", olderEdit);
const olderFlush = orderedCoordinator.flush();
await Promise.resolve();
const newerEdit = structuredClone(packageValue);
newerEdit.name = "Newer edit";
orderedCoordinator.schedule("draft-1", newerEdit);
const newerFlush = orderedCoordinator.flush();
firstSaveGate.release?.();
await Promise.all([olderFlush, newerFlush]);
assert(
  orderedSaves.join(",") === "Older edit,Newer edit" &&
    orderedCoordinator.getState().status === "saved" &&
    orderedCoordinator.getState().savedRevision === 2,
  "Serialized saves should persist the newest revision last and never let an older response win.",
);

let shouldFail = true;
const failingCoordinator = createDraftAutosaveCoordinator({
  save: async () => {
    if (shouldFail) throw new Error("Storage unavailable");
  },
  setTimer: () => 1,
  clearTimer: () => undefined,
});
failingCoordinator.schedule("draft-2", packageValue);
await failingCoordinator.flush().catch(() => undefined);
assert(
  failingCoordinator.getState().status === "failed" &&
    failingCoordinator.getState().message?.includes("Storage unavailable"),
  "Autosave failures should remain visible and retain the pending revision for retry.",
);
shouldFail = false;
await failingCoordinator.retry();
assert(
  failingCoordinator.getState().status === "saved",
  "Retry should persist the retained working package after a save failure.",
);

let pageHideListener: (() => void) | null = null;
let lifecycleSaveCount = 0;
let resolveLifecycleSave: (() => void) | null = null;
const lifecycleSaved = new Promise<void>((resolve) => {
  resolveLifecycleSave = resolve;
});
const lifecycleCoordinator = createDraftAutosaveCoordinator({
  save: async () => {
    lifecycleSaveCount += 1;
    resolveLifecycleSave?.();
  },
  setTimer: () => 1,
  clearTimer: () => undefined,
});
const lifecycleTarget = {
  addEventListener(_type: "pagehide", listener: () => void) {
    pageHideListener = listener;
  },
  removeEventListener(_type: "pagehide", listener: () => void) {
    if (pageHideListener === listener) pageHideListener = null;
  },
};
const unbindLifecycle = bindDraftAutosaveLifecycle(
  lifecycleCoordinator,
  lifecycleTarget,
);
lifecycleCoordinator.schedule("draft-lifecycle", packageValue);
(pageHideListener as (() => void) | null)?.();
await lifecycleSaved;
assert(
  lifecycleSaveCount === 1,
  "The pagehide lifecycle hook should flush a pending debounced draft.",
);

let resolveUnmountSave: (() => void) | null = null;
const unmountSaved = new Promise<void>((resolve) => {
  resolveUnmountSave = resolve;
});
const unmountPackage = structuredClone(packageValue);
unmountPackage.name = "Unmount edit";
lifecycleCoordinator.schedule("draft-lifecycle", unmountPackage);
const previousSaveCount = lifecycleSaveCount;
resolveLifecycleSave = resolveUnmountSave;
unbindLifecycle();
await unmountSaved;
assert(
  lifecycleSaveCount === previousSaveCount + 1 && pageHideListener === null,
  "Lifecycle cleanup should remove pagehide handling and attempt one final unmount flush.",
);

let navigationCount = 0;
const navigated = await runAfterDraftAutosaveFlush(
  { flush: async () => undefined },
  () => {
    navigationCount += 1;
  },
);
let navigationError: unknown = null;
const blockedNavigation = await runAfterDraftAutosaveFlush(
  {
    flush: async () => {
      throw new Error("Draft flush failed");
    },
  },
  () => {
    navigationCount += 1;
  },
  (error) => {
    navigationError = error;
  },
);
assert(
  navigated &&
    !blockedNavigation &&
    navigationCount === 1 &&
    navigationError instanceof Error,
  "Navigation should continue only after a successful draft flush and remain blocked on failure.",
);

const switchedDrafts: string[] = [];
const switchingCoordinator = createDraftAutosaveCoordinator({
  save: async (draftId) => {
    switchedDrafts.push(draftId);
  },
  setTimer: () => 1,
  clearTimer: () => undefined,
});
switchingCoordinator.schedule("draft-before-switch", packageValue);
await switchingCoordinator.flush();
switchingCoordinator.reset();
switchingCoordinator.schedule("draft-after-switch", packageValue);
await switchingCoordinator.flush();
assert(
  switchedDrafts.join(",") === "draft-before-switch,draft-after-switch",
  "Template switching should flush the old draft before resetting autosave for the new draft.",
);

import assert from "node:assert/strict";
import { TemplateStorageBlockedError, TemplateRecoveryCleanupError } from "@sleinity/template-browser/persistence";
import { blockedStorageCause } from "./storageFailure";
import { createStudioAutosave } from "./draftAutosave";

export async function runStudioStorageTests() {
  const blocked = new TemplateStorageBlockedError("template-package-platform", 5);
  assert.equal(blockedStorageCause(new TemplateRecoveryCleanupError(blocked)), blocked);
  assert.equal(blockedStorageCause(new Error(blocked.message)), null, "Never classify by message text");
  const cycle = new Error("Cycle"); Object.assign(cycle, { cause: cycle }); assert.equal(blockedStorageCause(cycle), null);
  const nativeSet = globalThis.setTimeout, nativeClear = globalThis.clearTimeout;
  let timer: (() => void) | null = null; let delay: number | undefined;
  Object.assign(globalThis, { setTimeout: (callback: () => void, ms: number) => { timer = callback; delay = ms; return 1; }, clearTimeout: () => { timer = null; } });
  const writes: number[] = [], notifications: string[] = [], causes: unknown[] = [];
  let reject!: (cause: unknown) => void;
  let first = true;
  const autosave = createStudioAutosave<number>(async value => { writes.push(value); if (first) { first = false; await new Promise<void>((_, fail) => { reject = fail; }); } }, value => notifications.push(value), undefined, cause => causes.push(cause));
  try {
    autosave.schedule(1); assert.equal(delay, 650);
    const active = autosave.flush(); await Promise.resolve();
    autosave.schedule(2); reject(blocked); await assert.rejects(active, cause => cause === blocked);
    assert(autosave.dirty()); assert.equal(causes[causes.length - 1], blocked); assert.deepEqual(writes, [1]);
    // No automatic retry is added; the existing new-edit timer is unchanged.
    assert(timer); await autosave.flush(); assert.deepEqual(writes, [1, 2]); assert(!autosave.dirty()); assert.equal(notifications[notifications.length - 1], "Saved");
    let failOld!: (cause: unknown) => void;
    const late = createStudioAutosave(async () => new Promise<void>((_, fail) => { failOld = fail; }), value => notifications.push(value), 650, cause => causes.push(cause));
    late.schedule(3); const old = late.flush(); await Promise.resolve(); late.dispose(); late.activate();
    const count = notifications.length, failures = causes.length;
    failOld(blocked); await assert.rejects(old); assert.equal(notifications.length, count); assert.equal(causes.length, failures);
    late.dispose();
    console.log("Studio storage: structured causes, 650 ms schedule, latest-value manual retry and abandoned feedback pass.");
  } finally { autosave.dispose(); Object.assign(globalThis, { setTimeout: nativeSet, clearTimeout: nativeClear }); }
}

import assert from "node:assert/strict";
import { captureCompletedOutput } from "./output-lifecycle.mjs";
const events = [];
const result = await captureCompletedOutput({
  captureEditor: async () => { events.push("evidence"); return "current"; },
  exportOutput: async () => { events.push("export"); return "png"; },
  awaitLibrary: async () => { await Promise.resolve(); events.push("library"); },
  captureCompletion: async () => { events.push("completion"); return "disposed"; },
});
assert.deepEqual(events, ["evidence", "export", "library", "completion"]);
assert.deepEqual(result, { editor: "current", output: "png", completion: "disposed" });
await assert.rejects(captureCompletedOutput({
  captureEditor: async () => "current",
  exportOutput: async () => { throw new Error("export rejected"); },
  awaitLibrary: async () => assert.fail("Failed export must not imply completion"),
  captureCompletion: async () => assert.fail("Failed export has no successful capture"),
}), /export rejected/);
console.log("Export capture lifecycle tests passed.");

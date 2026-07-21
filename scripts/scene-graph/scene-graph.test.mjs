import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compareSceneSnapshot, createSceneSnapshot, promoteSceneSnapshot, requireSceneUpdateReason, sceneSnapshotPath } from "./core.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

let missingReasonFailed = false;
try { requireSceneUpdateReason(""); } catch { missingReasonFailed = true; }
assert(missingReasonFailed, "scene update must reject a missing reason");
assert(requireSceneUpdateReason("reviewed initial scene baseline") === "reviewed initial scene baseline", "scene update must preserve a valid reason");
const fixture = { id: "fixture", filename: "fixture.zip", byteSize: 10, zipSha256: "a".repeat(64), embeddedPreview: null, rootNodeId: "root", canvas: { width: 1, height: 1 }, packageVersion: "1.0" };
const model = { graph: { nodeOrder: ["root"] }, validation: { valid: true, issues: [] }, equivalence: { timings: { equivalenceMs: 1 }, summary: {} } };
const snapshot = createSceneSnapshot(fixture, model);
assert(snapshot.equivalence.timings === undefined, "comparison-critical scene snapshots must normalize timings");
assert(compareSceneSnapshot(snapshot, structuredClone(snapshot)).equal, "identical scene snapshots must compare equal");
const changed = structuredClone(snapshot);
changed.graph.nodeOrder.push("new");
assert(!compareSceneSnapshot(snapshot, changed).equal, "structural scene changes must compare unequal");
const root = mkdtempSync(join(tmpdir(), "scene-update-test-"));
const candidate = join(root, "candidate.json");
writeFileSync(candidate, JSON.stringify(snapshot));
promoteSceneSnapshot({ fixtureId: "fixture", candidatePath: candidate, reason: "reviewed temporary update", approvedRoot: join(root, "approved"), evidenceRoot: join(root, "evidence"), timestamp: "2026-07-13T00:00:00.000Z" });
assert(JSON.parse(readFileSync(sceneSnapshotPath(join(root, "approved"), "fixture"), "utf8")).fixture.zipSha256 === fixture.zipSha256, "promoted scene snapshot must retain fixture identity");
console.log("Scene snapshot guard tests passed.");

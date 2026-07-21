import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { repoRoot, safeSegment, stableStringify } from "../fidelity/core.mjs";

export const sceneRoot = join(repoRoot, "fidelity", "scene-graph");
export const approvedSceneRoot = join(sceneRoot, "snapshots", "approved");

export function sceneSnapshotPath(root, fixtureId) {
  return join(resolve(root), safeSegment(fixtureId), "scene.json");
}

export function requireSceneUpdateReason(reason) {
  if (!reason || String(reason).trim().length < 8) {
    throw new Error("Scene snapshot update requires a developer-supplied reason of at least 8 characters.");
  }
  return String(reason).trim();
}

export function createSceneSnapshot(fixture, model) {
  const equivalence = structuredClone(model.equivalence);
  delete equivalence.timings;
  return {
    schemaVersion: "canonical-scene-snapshot-v1",
    fixture: {
      id: fixture.id,
      filename: fixture.filename,
      byteSize: fixture.byteSize,
      zipSha256: fixture.zipSha256,
      embeddedPreviewSha256: fixture.embeddedPreview?.sha256 ?? null,
      rootNodeId: fixture.rootNodeId,
      canvas: fixture.canvas,
      packageVersion: fixture.packageVersion,
    },
    graph: model.graph,
    validation: model.validation,
    equivalence,
  };
}

export function compareSceneSnapshot(expected, actual) {
  const expectedText = stableStringify(expected);
  const actualText = stableStringify(actual);
  if (expectedText === actualText) return { equal: true, expectedSha256: null, actualSha256: null, firstDifference: null };
  const expectedLines = expectedText.split("\n");
  const actualLines = actualText.split("\n");
  const index = Array.from({ length: Math.max(expectedLines.length, actualLines.length) }, (_, line) => line).find((line) => expectedLines[line] !== actualLines[line]) ?? 0;
  return { equal: false, firstDifference: { line: index + 1, expected: expectedLines[index] ?? null, actual: actualLines[index] ?? null } };
}

export function promoteSceneSnapshot({ fixtureId, candidatePath, reason, approvedRoot = approvedSceneRoot, evidenceRoot = join(sceneRoot, "update-evidence"), timestamp = new Date().toISOString() }) {
  const updateReason = requireSceneUpdateReason(reason);
  if (!existsSync(candidatePath)) throw new Error(`Missing scene candidate: ${candidatePath}`);
  const approvedPath = sceneSnapshotPath(approvedRoot, fixtureId);
  const evidenceDir = join(resolve(evidenceRoot), safeSegment(timestamp.replace(/[:.]/g, "-")), safeSegment(fixtureId));
  mkdirSync(dirname(approvedPath), { recursive: true });
  mkdirSync(evidenceDir, { recursive: true });
  const before = existsSync(approvedPath) ? JSON.parse(readFileSync(approvedPath, "utf8")) : null;
  const after = JSON.parse(readFileSync(candidatePath, "utf8"));
  if (before) writeFileSync(join(evidenceDir, "before.json"), stableStringify(before));
  writeFileSync(join(evidenceDir, "after.json"), stableStringify(after));
  writeFileSync(join(evidenceDir, "difference.json"), stableStringify(before ? compareSceneSnapshot(before, after) : { initialApproval: true }));
  writeFileSync(join(evidenceDir, "update.json"), stableStringify({ fixtureId, reason: updateReason, updateTimestamp: timestamp, initialApproval: !before }));
  const pending = `${approvedPath}.pending`;
  cpSync(candidatePath, pending);
  renameSync(pending, approvedPath);
  return { approvedPath, evidenceDir };
}

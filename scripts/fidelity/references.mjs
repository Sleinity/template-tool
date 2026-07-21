import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { comparePng, writeDifferenceImage } from "./image.mjs";
import { normalizeStructuralSnapshot, repoRoot, safeSegment, stableStringify } from "./core.mjs";

export function approvedReferenceDirectory(fixtureId, surface, root = join(repoRoot, "fidelity", "references", "approved")) {
  return join(resolve(root), safeSegment(fixtureId), safeSegment(surface));
}

export function assertReferenceImmutable(before, after) {
  if (before !== after) throw new Error("Normal fidelity runs must not modify approved references.");
}

export function requireUpdateReason(reason) {
  if (!reason || String(reason).trim().length < 8) throw new Error("Reference update requires a developer-supplied fidelity reason of at least 8 characters.");
  return String(reason).trim();
}

export function updateApprovedReference({ fixtureId, surface, candidatePng, candidateStructure, environment, fixtureIdentity, reason, approvedRoot, evidenceRoot, timestamp = new Date().toISOString() }) {
  const updateReason = requireUpdateReason(reason);
  const approvedDir = approvedReferenceDirectory(fixtureId, surface, approvedRoot);
  const evidenceDir = join(resolve(evidenceRoot), safeSegment(timestamp.replace(/[:.]/g, "-")), safeSegment(fixtureId), safeSegment(surface));
  mkdirSync(approvedDir, { recursive: true });
  mkdirSync(evidenceDir, { recursive: true });
  const approvedPng = join(approvedDir, "reference.png");
  const approvedStructure = join(approvedDir, "structure.json");
  if (existsSync(approvedPng)) cpSync(approvedPng, join(evidenceDir, "previous.png"));
  if (existsSync(approvedStructure)) cpSync(approvedStructure, join(evidenceDir, "structural-before.json"));
  cpSync(candidatePng, join(evidenceDir, "candidate.png"));
  const normalizedCandidateStructure = normalizeStructuralSnapshot(JSON.parse(readFileSync(candidateStructure, "utf8")));
  writeFileSync(join(evidenceDir, "structural-after.json"), stableStringify(normalizedCandidateStructure));
  let comparison = null;
  if (existsSync(approvedPng)) {
    comparison = comparePng(approvedPng, candidatePng);
    writeDifferenceImage(comparison, join(evidenceDir, "difference.png"));
    delete comparison.differenceImage;
  }
  const metadata = { fixtureId, surface, fixtureIdentity, environment, reason: updateReason, updateTimestamp: timestamp, comparison };
  writeFileSync(join(evidenceDir, "update.json"), stableStringify(metadata));
  const pendingPng = join(dirname(approvedPng), ".reference.png.pending");
  const pendingStructure = join(dirname(approvedStructure), ".structure.json.pending");
  cpSync(candidatePng, pendingPng);
  writeFileSync(pendingStructure, stableStringify(normalizedCandidateStructure));
  renameSync(pendingPng, approvedPng);
  renameSync(pendingStructure, approvedStructure);
  return { approvedDir, evidenceDir, metadata };
}

export function approvedReferenceHash(path) {
  return existsSync(path) ? readFileSync(path).toString("base64") : null;
}

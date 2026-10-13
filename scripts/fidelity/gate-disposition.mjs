import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot, sha256, surfaces } from "./core.mjs";

export const trackedSdkGateDispositionPath = join(repoRoot, "fidelity", "gates", "sdk-061-dispositions.json");

export function validateSdkGateDisposition(record, fixtures, runId, environmentSha256) {
  const issues = [];
  if (record?.schemaVersion !== "sdk-061-dispositions-v1" || record.gate !== "sdk-061") issues.push("wrong disposition schema or gate");
  if (record?.runId !== runId) issues.push("cross-run disposition");
  if (record?.environmentSha256 !== environmentSha256) issues.push("environment identity differs");
  if (record?.fixtures?.length !== fixtures.length) issues.push("fixture count differs");
  for (const fixture of fixtures) {
    const item = record?.fixtures?.find(value => value.id === fixture.id);
    if (!item) { issues.push(`${fixture.id}: missing disposition`); continue; }
    if (item.zipSha256 !== fixture.zipSha256 || item.templateJsonSha256 !== fixture.templateJsonSha256 || item.embeddedPreviewSha256 !== fixture.embeddedPreview?.sha256) issues.push(`${fixture.id}: source identity differs`);
    for (const surface of surfaces) {
      const entry = item.surfaces?.[surface];
      if (!entry || !entry.capture || !entry.comparison || !entry.sourceReview || !entry.reviewerRationale || !entry.cause || !entry.regenerate) issues.push(`${fixture.id}/${surface}: incomplete disposition`);
    }
    if (!item.scene?.sourceReview || !item.scene?.reviewerRationale || !item.settlement) issues.push(`${fixture.id}: scene/settlement disposition missing`);
    for (const surface of surfaces) if (!item.settlement?.[surface]?.sourceReview || !item.settlement?.[surface]?.reviewerRationale) issues.push(`${fixture.id}/${surface}: settlement disposition missing`);
  }
  if (issues.length) throw new Error(`SDK gate disposition invalid: ${issues.join("; ")}`);
  return record;
}

export function sdkGateSourceReviewComplete(record) {
  return record.fixtures.every(item =>
    Object.values(item.surfaces).every(surface => surface.sourceReview === "reviewed-source-faithful") &&
    item.scene.sourceReview === "reviewed-source-faithful" &&
    Object.values(item.settlement).every(surface => surface.sourceReview === "reviewed-source-faithful"));
}

export function readSdkGateDisposition(fixtures, runId, environment) {
  if (!existsSync(trackedSdkGateDispositionPath)) return null;
  const record = validateSdkGateDisposition(JSON.parse(readFileSync(trackedSdkGateDispositionPath, "utf8")), fixtures, runId, sha256(JSON.stringify(environment)));
  for (const item of record.fixtures) for (const surface of surfaces) {
    const entry = item.surfaces[surface];
    const candidate = join(repoRoot, "fidelity", "candidates", runId, item.id, surface, "capture-1.png");
    if (entry.capture === "complete-stable" && !entry.candidatePngSha256) throw new Error(`${item.id}/${surface}: reviewed candidate hash is missing.`);
    if (entry.candidatePngSha256 && (!existsSync(candidate) || sha256(readFileSync(candidate)) !== entry.candidatePngSha256)) throw new Error(`${item.id}/${surface}: candidate hash differs from tracked review.`);
  }
  return record;
}

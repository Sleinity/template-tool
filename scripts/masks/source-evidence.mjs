#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { unzipSync } from "fflate";
import { PNG } from "pngjs";
import { loadManifest, sha256, stableStringify, verifyFixture } from "../fidelity/core.mjs";
import { comparePng } from "../fidelity/image.mjs";

const fixtureId = "deal-of-the-week-banner-crop-mask";
const args = Object.fromEntries(process.argv.slice(2).map((value, index, values) => value.startsWith("--") ? [value.slice(2), values[index + 1]?.startsWith("--") ? true : values[index + 1]] : null).filter(Boolean));
const runId = String(args["run-id"] || "milestone-7-alpha-mask-final");
const repoRoot = resolve(import.meta.dirname, "../..");
const candidateRoot = resolve(args.candidates || join(repoRoot, "fidelity/candidates"));
const evidenceDirectory = resolve(args.output || join(repoRoot, "fidelity/evidence/milestone-7-alpha-mask"));
const fixture = loadManifest().fixtures.find((entry) => entry.id === fixtureId);
if (!fixture) throw new Error(`Missing exact fixture registration ${fixtureId}.`);
const verified = verifyFixture(loadManifest(), fixture);
const entries = unzipSync(new Uint8Array(verified.bytes));
const preview = entries[fixture.embeddedPreview.entry];
const templateBytes = entries["template.json"];
if (!preview || !templateBytes) throw new Error("Source ZIP must contain preview.png and template.json.");
const previewBuffer = Buffer.from(preview);
if (sha256(templateBytes) !== fixture.templateJsonSha256) throw new Error("template.json hash differs from the registered source contract.");
const template = JSON.parse(Buffer.from(templateBytes).toString("utf8"));
const declared = template.maskRelationships?.[0];
const sourceNode = template.nodes[fixture.maskEvidence.maskSourceId];
if (sourceNode?.mask?.isMask !== true || sourceNode.mask.maskType !== "ALPHA") throw new Error("Registered source node no longer declares ALPHA mask authority.");
if (stableStringify(declared) !== stableStringify({ maskSourceId: "429:41", affectedSiblingIds: ["429:42"], parentId: "429:40", scopeTerminationReason: "end_of_siblings" })) throw new Error("Exporter-authored mask relationship changed.");

mkdirSync(evidenceDirectory, { recursive: true });
const sourceDirectory = join(evidenceDirectory, "source");
mkdirSync(sourceDirectory, { recursive: true });
writeFileSync(join(sourceDirectory, "preview.png"), preview);
writeFileSync(join(sourceDirectory, "mask-contract.json"), stableStringify({ fixture: { id: fixture.id, filename: fixture.filename, byteSize: fixture.byteSize, zipSha256: fixture.zipSha256, previewSha256: fixture.embeddedPreview.sha256, templateJsonSha256: fixture.templateJsonSha256, packageId: fixture.packageId, exporterVersion: fixture.exporterVersion, rootNodeId: fixture.rootNodeId }, relationship: declared, maskNode: sourceNode, affectedNode: template.nodes["429:42"] }));

function candidatePath(surface, filename) {
  return join(candidateRoot, runId, fixtureId, surface, filename);
}

function plainComparison(comparison) {
  const clone = { ...comparison };
  delete clone.differenceImage;
  return clone;
}

function crop(bytes, bounds) {
  const source = PNG.sync.read(bytes);
  const output = new PNG({ width: bounds.width, height: bounds.height });
  PNG.bitblt(source, output, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0);
  return PNG.sync.write(output);
}

const surfaces = ["validate", "fields", "editor", "png-export"];
const telemetry = [];
for (const surface of surfaces) {
  const structurePath = candidatePath(surface, "structure-1.json");
  const repeatPath = candidatePath(surface, "structure-2.json");
  const capturePath = candidatePath(surface, "capture-1.png");
  if (![structurePath, repeatPath, capturePath].every(existsSync)) throw new Error(`Candidate ${runId}/${surface} is incomplete.`);
  const first = JSON.parse(readFileSync(structurePath, "utf8"));
  const second = JSON.parse(readFileSync(repeatPath, "utf8"));
  const affected = first.nodes.find((node) => node.id === "429:42");
  const repeated = second.nodes.find((node) => node.id === "429:42");
  const sourceRecord = first.nodes.find((node) => node.id === "429:41");
  const sourceRendered = Boolean(sourceRecord?.dataAttributes?.["data-package-node-id"]);
  const attrs = affected?.dataAttributes ?? {};
  const repeatAttrs = repeated?.dataAttributes ?? {};
  telemetry.push({
    surface,
    sourceRenderedAsOrdinaryNode: sourceRendered,
    relationshipId: attrs["data-package-mask-relationship"] ?? null,
    maskRevision: attrs["data-package-mask-revision"] ?? null,
    capability: attrs["data-package-mask-capability"] ?? null,
    renderStrategy: attrs["data-package-mask-render-strategy"] ?? null,
    clipInsets: attrs["data-package-mask-clip-insets"] ? JSON.parse(attrs["data-package-mask-clip-insets"]) : null,
    repeatedIdentity: attrs["data-package-mask-relationship"] === repeatAttrs["data-package-mask-relationship"] && attrs["data-package-mask-revision"] === repeatAttrs["data-package-mask-revision"] && attrs["data-package-mask-clip-insets"] === repeatAttrs["data-package-mask-clip-insets"],
    affectedBounds: affected?.bounds ?? null,
    timings: first.timings ?? null,
  });
}

const identities = new Set(telemetry.map((entry) => `${entry.relationshipId}|${entry.maskRevision}|${JSON.stringify(entry.clipInsets)}`));
if (identities.size !== 1 || telemetry.some((entry) => entry.sourceRenderedAsOrdinaryNode || !entry.repeatedIdentity || entry.capability !== "exact-opaque-rectangular-alpha" || entry.renderStrategy !== "css-clip-path")) {
  throw new Error("All-surface mask identity or single-owner evidence failed.");
}

const pngCandidate = readFileSync(candidatePath("png-export", "capture-1.png"));
const sourceComparison = comparePng(previewBuffer, pngCandidate, { threshold: 0.1, allowedChangedPixelPercentage: 100 });
const maskBounds = { x: 0, y: 0, width: 1080, height: 1080 };
const sourceRegion = crop(previewBuffer, maskBounds);
const candidateRegion = crop(pngCandidate, maskBounds);
const regionComparison = comparePng(sourceRegion, candidateRegion, { threshold: 0.1, allowedChangedPixelPercentage: 100 });
writeFileSync(join(evidenceDirectory, "source-preview.png"), preview);
writeFileSync(join(evidenceDirectory, "png-export-candidate.png"), pngCandidate);
writeFileSync(join(evidenceDirectory, "mask-region-source.png"), sourceRegion);
writeFileSync(join(evidenceDirectory, "mask-region-candidate.png"), candidateRegion);
if (sourceComparison.differenceImage) writeFileSync(join(evidenceDirectory, "source-vs-png-diff.png"), sourceComparison.differenceImage);
if (regionComparison.differenceImage) writeFileSync(join(evidenceDirectory, "mask-region-diff.png"), regionComparison.differenceImage);

const historicalCandidate = join(repoRoot, "fidelity/candidates/milestone-6-1-editable-source/deal-of-the-week-banner-crop-editable/png-export/capture-1.png");
let historical = null;
if (existsSync(historicalCandidate)) {
  const comparison = comparePng(previewBuffer, historicalCandidate, { threshold: 0.1, allowedChangedPixelPercentage: 100 });
  historical = { path: historicalCandidate, comparison: plainComparison(comparison) };
  copyFileSync(historicalCandidate, join(evidenceDirectory, "historical-crop-2-png-export.png"));
  if (comparison.differenceImage) writeFileSync(join(evidenceDirectory, "historical-crop-2-diff.png"), comparison.differenceImage);
}

const report = {
  schemaVersion: "source-certified-alpha-mask-evidence-v1",
  fixtureId,
  runId,
  sourceIdentity: {
    path: verified.path,
    byteSize: fixture.byteSize,
    zipSha256: fixture.zipSha256,
    previewSha256: fixture.embeddedPreview.sha256,
    templateJsonSha256: fixture.templateJsonSha256,
    packageId: fixture.packageId,
    exporterVersion: fixture.exporterVersion,
    rootNodeId: fixture.rootNodeId,
  },
  sourceContract: {
    relationship: declared,
    maskType: sourceNode.mask.maskType,
    maskBounds: sourceNode.bounds.relative,
    paintRole: "mask-input",
    exactSubset: "opaque rectangular ALPHA lowered to one CSS clip-path",
    expectedClipInsets: fixture.maskEvidence.expectedClipInsets,
  },
  telemetry,
  comparisons: {
    sourcePreviewToPngExport: plainComparison(sourceComparison),
    sourceMaskRegionToCandidate: plainComparison(regionComparison),
    historicalCrop2ToSource: historical,
  },
  references: { approvedUpdated: false, status: "candidate-only; explicit visual review required" },
};
writeFileSync(join(evidenceDirectory, "report.json"), stableStringify(report));
writeFileSync(join(evidenceDirectory, "report.md"), [
  "# Milestone 7 source-certified ALPHA mask evidence",
  "",
  `- Fixture: ${fixture.filename}`,
  `- ZIP SHA-256: ${fixture.zipSha256}`,
  `- Mask: ${declared.maskSourceId} -> ${declared.affectedSiblingIds.join(", ")} under ${declared.parentId}`,
  `- Runtime subset: opaque rectangular ALPHA, one CSS clip-path owner`,
  `- Full source/PNG changed pixels: ${sourceComparison.changedPixelCount} (${sourceComparison.changedPixelPercentage}%)`,
  `- Mask-region changed pixels: ${regionComparison.changedPixelCount} (${regionComparison.changedPixelPercentage}%)`,
  `- All-surface relationship identity: ${identities.size === 1 ? "identical" : "mismatch"}`,
  `- Mask source rendered as ordinary RGB node: ${telemetry.some((entry) => entry.sourceRenderedAsOrdinaryNode) ? "yes" : "no"}`,
  `- Reference status: unchanged; candidate evidence only`,
  "",
].join("\n"));
console.log(`[mask-evidence] fixture=${fixtureId} run=${runId}`);
console.log(`[mask-evidence] source-png changed=${sourceComparison.changedPixelCount} percent=${sourceComparison.changedPixelPercentage}`);
console.log(`[mask-evidence] mask-region changed=${regionComparison.changedPixelCount} percent=${regionComparison.changedPixelPercentage}`);
console.log(`[mask-evidence] output=${evidenceDirectory}`);

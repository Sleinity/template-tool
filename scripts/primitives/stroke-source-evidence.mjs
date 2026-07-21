#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { unzipSync } from "fflate";
import { PNG } from "pngjs";
import {
  loadManifest,
  parseArguments,
  repoRoot,
  sha256,
  stableStringify,
  verifyFixture,
} from "../fidelity/core.mjs";
import { comparePng } from "../fidelity/image.mjs";

const args = parseArguments(process.argv.slice(2));
const runId = String(args["run-id"] || "milestone-7-2-final");
const previousRunId = String(args["previous-run-id"] || "milestone-7-2-compatibility-before");
const output = resolve(args.output || join(repoRoot, "fidelity/evidence/milestone-7-2-strokes", runId));
const fixtureId = "stroke-test-primitives";
const surfaces = ["validate", "fields", "editor", "png-export"];
const nodeIds = ["443:88", "443:89", "443:90", "443:94", "443:95"];

function withoutImage(result) {
  const copy = { ...result };
  delete copy.differenceImage;
  return copy;
}

function rootBounds(template, nodeId) {
  let node = template.nodes[nodeId];
  if (!node) throw new Error(`Missing source node ${nodeId}.`);
  let x = node.bounds.relative.x;
  let y = node.bounds.relative.y;
  const width = node.bounds.relative.width;
  const height = node.bounds.relative.height;
  while (node.parentId) {
    node = template.nodes[node.parentId];
    if (!node) throw new Error(`Broken parent chain for ${nodeId}.`);
    if (node.id !== template.rootNodeId) {
      x += node.bounds.relative.x;
      y += node.bounds.relative.y;
    }
  }
  return { x, y, width, height };
}

function crop(bytes, bounds, margin = 12) {
  const image = PNG.sync.read(bytes);
  const x = Math.max(0, Math.floor(bounds.x - margin));
  const y = Math.max(0, Math.floor(bounds.y - margin));
  const right = Math.min(image.width, Math.ceil(bounds.x + bounds.width + margin));
  const bottom = Math.min(image.height, Math.ceil(bounds.y + bounds.height + margin));
  const result = new PNG({ width: right - x, height: bottom - y });
  PNG.bitblt(image, result, x, y, result.width, result.height, 0, 0);
  return PNG.sync.write(result);
}

mkdirSync(output, { recursive: true });
const manifest = loadManifest();
const fixture = manifest.fixtures.find((entry) => entry.id === fixtureId);
if (!fixture) throw new Error(`Missing exact fixture ${fixtureId}.`);
const verified = verifyFixture(manifest, fixture);
const entries = unzipSync(new Uint8Array(verified.bytes));
const preview = entries[fixture.embeddedPreview.entry];
const templateBytes = entries["template.json"];
if (!preview || !templateBytes) throw new Error("Source fixture lacks preview.png or template.json.");
if (sha256(templateBytes) !== fixture.templateJsonSha256) throw new Error("template.json hash mismatch.");
const template = JSON.parse(Buffer.from(templateBytes).toString("utf8"));
const previewBytes = Buffer.from(preview);
const candidatePath = join(repoRoot, "fidelity/candidates", runId, fixtureId, "png-export/capture-1.png");
const previousPath = join(repoRoot, "fidelity/candidates", previousRunId, fixtureId, "png-export/capture-1.png");
if (!existsSync(candidatePath)) throw new Error(`Missing current candidate ${candidatePath}.`);
if (!existsSync(previousPath)) throw new Error(`Missing compatibility candidate ${previousPath}.`);
const candidateBytes = readFileSync(candidatePath);
const previousBytes = readFileSync(previousPath);
const fullCurrent = comparePng(previewBytes, candidateBytes, { threshold: 0.1, allowedChangedPixelPercentage: 100 });
const fullPrevious = comparePng(previewBytes, previousBytes, { threshold: 0.1, allowedChangedPixelPercentage: 100 });

writeFileSync(join(output, "source-preview.png"), previewBytes);
writeFileSync(join(output, "current-candidate.png"), candidateBytes);
writeFileSync(join(output, "compatibility-before.png"), previousBytes);
if (fullCurrent.differenceImage) writeFileSync(join(output, "source-current-diff.png"), fullCurrent.differenceImage);
if (fullPrevious.differenceImage) writeFileSync(join(output, "source-compatibility-before-diff.png"), fullPrevious.differenceImage);

const regions = [];
for (const nodeId of nodeIds) {
  const node = template.nodes[nodeId];
  const bounds = rootBounds(template, nodeId);
  const sourceRegion = crop(previewBytes, bounds);
  const currentRegion = crop(candidateBytes, bounds);
  const previousRegion = crop(previousBytes, bounds);
  const current = comparePng(sourceRegion, currentRegion, { threshold: 0.1, allowedChangedPixelPercentage: 100 });
  const previous = comparePng(sourceRegion, previousRegion, { threshold: 0.1, allowedChangedPixelPercentage: 100 });
  const regionOutput = join(output, nodeId.replace(":", "-"));
  mkdirSync(regionOutput, { recursive: true });
  writeFileSync(join(regionOutput, "source.png"), sourceRegion);
  writeFileSync(join(regionOutput, "current.png"), currentRegion);
  writeFileSync(join(regionOutput, "compatibility-before.png"), previousRegion);
  if (current.differenceImage) writeFileSync(join(regionOutput, "source-current-diff.png"), current.differenceImage);
  if (previous.differenceImage) writeFileSync(join(regionOutput, "source-compatibility-before-diff.png"), previous.differenceImage);
  regions.push({
    nodeId,
    name: node.name,
    type: node.type,
    bounds,
    cornerRadius: node.appearance.cornerRadius ?? null,
    cornerRadii: node.appearance.cornerRadii ?? null,
    strokeAlignment: node.appearance.strokeAlign ?? node.appearance.strokes?.[0]?.align ?? null,
    strokeWeight: node.appearance.strokeWeight ?? node.appearance.strokes?.[0]?.weight ?? null,
    sourceCurrent: withoutImage(current),
    sourceCompatibilityBefore: withoutImage(previous),
  });
}

const surfaceEvidence = surfaces.map((surface) => {
  const firstPath = join(repoRoot, "fidelity/candidates", runId, fixtureId, surface, "structure-1.json");
  const secondPath = join(repoRoot, "fidelity/candidates", runId, fixtureId, surface, "structure-2.json");
  if (!existsSync(firstPath) || !existsSync(secondPath)) throw new Error(`${surface} lacks repeated structure.`);
  const first = JSON.parse(readFileSync(firstPath, "utf8"));
  const second = JSON.parse(readFileSync(secondPath, "utf8"));
  return {
    surface,
    nodes: nodeIds.map((nodeId) => {
      const firstNode = first.nodes.find((entry) => entry.id === nodeId);
      const secondNode = second.nodes.find((entry) => entry.id === nodeId);
      if (!firstNode?.primitiveAppearance || !secondNode?.primitiveAppearance) {
        throw new Error(`${surface}/${nodeId} lacks primitive evidence.`);
      }
      const identity = (value) => ({
        ownership: value.ownership,
        backend: value.backend,
        sourceRevision: value.sourceRevision,
        geometryRevision: value.geometryRevision,
        requestedCorners: value.requestedCorners,
        effectiveCorners: value.effectiveCorners,
        cornerNormalizationScale: value.cornerNormalizationScale,
        cornerNormalizationScales: value.cornerNormalizationScales,
        ancestorClipChain: value.ancestorClipChain,
        strokeStrategy: value.strokeStrategy,
        strokeGeometry: value.strokeGeometry,
        computed: value.computed,
      });
      const primitive = firstNode.primitiveAppearance;
      const repeatedIdentity = stableStringify(identity(primitive)) === stableStringify(identity(secondNode.primitiveAppearance));
      if (!repeatedIdentity || primitive.ownership !== "primitive-authoritative") {
        throw new Error(`${surface}/${nodeId} is not stable primitive authority.`);
      }
      return { nodeId, bounds: firstNode.bounds, repeatedIdentity, primitiveAppearance: identity(primitive) };
    }),
  };
});

for (const nodeId of nodeIds) {
  const identities = surfaceEvidence.map((surface) => {
    const node = surface.nodes.find((entry) => entry.nodeId === nodeId);
    return stableStringify(node?.primitiveAppearance);
  });
  if (new Set(identities).size !== 1) throw new Error(`${nodeId} differs across live surfaces.`);
}

const report = {
  schemaVersion: "source-certified-stroke-evidence-v1",
  runId,
  previousRunId,
  sourceIdentity: {
    fixtureId,
    path: verified.path,
    filename: fixture.filename,
    byteSize: fixture.byteSize,
    zipSha256: fixture.zipSha256,
    previewSha256: fixture.embeddedPreview.sha256,
    templateJsonSha256: fixture.templateJsonSha256,
    packageId: fixture.packageId,
    exporterVersion: fixture.exporterVersion,
    rootNodeId: fixture.rootNodeId,
  },
  subsets: {
    fullCanvas: {
      sourceCurrent: withoutImage(fullCurrent),
      sourceCompatibilityBefore: withoutImage(fullPrevious),
      authority: "source-preview-evidence-not-approved-renderer-reference",
    },
    regions,
  },
  surfaceEvidence,
  interpretation: "The fixture certifies isolated opaque solid rectangular INSIDE, CENTER, and OUTSIDE strokes plus independent corner radii. Source comparisons remain separate from guarded approved renderer references.",
};
writeFileSync(join(output, "report.json"), stableStringify(report));
console.log(`[stroke-source-evidence] source-current=${fullCurrent.changedPixelPercentage.toFixed(4)}% source-before=${fullPrevious.changedPixelPercentage.toFixed(4)}%`);
console.log(`[stroke-source-evidence] output=${output}`);

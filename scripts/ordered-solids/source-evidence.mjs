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
const runId = String(args["run-id"] || "milestone-7-4-ordered-solids");
const outputRoot = resolve(args.output || join(repoRoot, "fidelity/evidence/milestone-7-4-ordered-solids/source"));
const surfaces = ["validate", "fields", "editor", "png-export"];
const fixtureIds = [
  "ordered-solid-blue-then-red",
  "ordered-solid-red-then-blue",
  "ordered-solid-three",
  "ordered-solid-hidden-middle",
  "ordered-solid-paint-opacity",
  "ordered-solid-independent-corners",
];

function withoutImage(comparison) {
  const report = { ...comparison };
  delete report.differenceImage;
  return report;
}

function templateBounds(template, nodeId) {
  let node = template.nodes[nodeId];
  if (!node) throw new Error(`Missing source node ${nodeId}.`);
  let x = node.bounds.relative.x;
  let y = node.bounds.relative.y;
  const width = node.bounds.relative.width;
  const height = node.bounds.relative.height;
  while (node.parentId) {
    node = template.nodes[node.parentId];
    if (!node) throw new Error(`Broken source parent chain for ${nodeId}.`);
    if (node.id !== template.rootNodeId) {
      x += node.bounds.relative.x;
      y += node.bounds.relative.y;
    }
  }
  return { x, y, width, height };
}

function crop(bytes, bounds) {
  const source = PNG.sync.read(bytes);
  const x = Math.max(0, Math.round(bounds.x));
  const y = Math.max(0, Math.round(bounds.y));
  const width = Math.min(source.width - x, Math.round(bounds.width));
  const height = Math.min(source.height - y, Math.round(bounds.height));
  if (width <= 0 || height <= 0) throw new Error(`Invalid crop ${JSON.stringify(bounds)}.`);
  const result = new PNG({ width, height });
  PNG.bitblt(source, result, x, y, width, height, 0, 0);
  return PNG.sync.write(result);
}

mkdirSync(outputRoot, { recursive: true });
const manifest = loadManifest();
const reports = [];
for (const fixtureId of fixtureIds) {
  const fixture = manifest.fixtures.find((entry) => entry.id === fixtureId);
  if (!fixture?.orderedSolidEvidence) throw new Error(`Missing ordered-SOLID registration for ${fixtureId}.`);
  const verified = verifyFixture(manifest, fixture);
  const entries = unzipSync(new Uint8Array(verified.bytes));
  const preview = entries[fixture.embeddedPreview.entry];
  if (!preview || sha256(preview) !== fixture.embeddedPreview.sha256) {
    throw new Error(`${fixtureId} source preview identity changed.`);
  }
  const sourceNode = verified.template.nodes[fixture.orderedSolidEvidence.nodeId];
  if (!sourceNode) throw new Error(`${fixtureId} lacks ${fixture.orderedSolidEvidence.nodeId}.`);
  const candidateDir = join(repoRoot, "fidelity/candidates", runId, fixtureId);
  const candidatePath = join(candidateDir, "png-export/capture-1.png");
  if (!existsSync(candidatePath)) throw new Error(`Missing ${candidatePath}.`);
  const candidate = readFileSync(candidatePath);
  const pixel = comparePng(Buffer.from(preview), candidate, {
    threshold: 0.1,
    allowedChangedPixelPercentage: 100,
  });
  const sourceBounds = templateBounds(verified.template, fixture.orderedSolidEvidence.nodeId);
  const sourceRegion = crop(Buffer.from(preview), sourceBounds);
  const candidateRegion = crop(candidate, sourceBounds);
  const regionPixel = comparePng(sourceRegion, candidateRegion, {
    threshold: 0.1,
    allowedChangedPixelPercentage: 100,
  });
  const fixtureOutput = join(outputRoot, fixtureId);
  mkdirSync(fixtureOutput, { recursive: true });
  writeFileSync(join(fixtureOutput, "source-preview.png"), preview);
  writeFileSync(join(fixtureOutput, "png-export-candidate.png"), candidate);
  writeFileSync(join(fixtureOutput, "source-region.png"), sourceRegion);
  writeFileSync(join(fixtureOutput, "candidate-region.png"), candidateRegion);
  if (pixel.differenceImage) writeFileSync(join(fixtureOutput, "source-diff.png"), pixel.differenceImage);
  if (regionPixel.differenceImage) writeFileSync(join(fixtureOutput, "source-region-diff.png"), regionPixel.differenceImage);

  const surfaceEvidence = surfaces.map((surface) => {
    const first = JSON.parse(readFileSync(join(candidateDir, surface, "structure-1.json"), "utf8"));
    const second = JSON.parse(readFileSync(join(candidateDir, surface, "structure-2.json"), "utf8"));
    const node = first.nodes.find((entry) => entry.id === fixture.orderedSolidEvidence.nodeId);
    const repeated = second.nodes.find((entry) => entry.id === fixture.orderedSolidEvidence.nodeId);
    const stack = node?.primitiveAppearance?.orderedSolidStack;
    const repeatedStack = repeated?.primitiveAppearance?.orderedSolidStack;
    if (!stack || !repeatedStack) throw new Error(`${fixtureId}/${surface} lacks ordered-SOLID telemetry.`);
    const identity = {
      sourceRevision: node.primitiveAppearance.sourceRevision,
      geometryRevision: node.primitiveAppearance.geometryRevision,
      stackRevision: stack.resolvedStackRevision,
      runtimeOwner: stack.runtimeOwner,
      visiblePaintIndices: stack.visiblePaintIndices,
      currentBounds: stack.currentBounds,
      corners: stack.cornerGeometry,
      orderedPaints: stack.orderedPaints,
      paintStrategy: node.primitiveAppearance.paintStrategy,
      computed: node.primitiveAppearance.computed,
    };
    const repeatedIdentity = {
      sourceRevision: repeated.primitiveAppearance.sourceRevision,
      geometryRevision: repeated.primitiveAppearance.geometryRevision,
      stackRevision: repeatedStack.resolvedStackRevision,
      runtimeOwner: repeatedStack.runtimeOwner,
      visiblePaintIndices: repeatedStack.visiblePaintIndices,
      currentBounds: repeatedStack.currentBounds,
      corners: repeatedStack.cornerGeometry,
      orderedPaints: repeatedStack.orderedPaints,
      paintStrategy: repeated.primitiveAppearance.paintStrategy,
      computed: repeated.primitiveAppearance.computed,
    };
    if (stableStringify(identity) !== stableStringify(repeatedIdentity)) {
      throw new Error(`${fixtureId}/${surface} repeated structural identity changed.`);
    }
    if (
      stack.runtimeOwner !== "svg-ordered-solid-stack" ||
      stack.capability !== "source-certified-ordered-solid-stack" ||
      node.primitiveAppearance.paintStrategy !== "svg-ordered-solid-stack" ||
      node.primitiveAppearance.computed.svgOrderedSolidLayerCount !== stack.visiblePaintIndices.length
    ) {
      throw new Error(`${fixtureId}/${surface} does not have singular ordered-SOLID ownership.`);
    }
    return { surface, identity };
  });
  const crossSurfaceIdentities = new Set(surfaceEvidence.map((entry) => stableStringify({
    sourceRevision: entry.identity.sourceRevision,
    geometryRevision: entry.identity.geometryRevision,
    stackRevision: entry.identity.stackRevision,
    runtimeOwner: entry.identity.runtimeOwner,
    visiblePaintIndices: entry.identity.visiblePaintIndices,
    currentBounds: entry.identity.currentBounds,
    corners: entry.identity.corners,
    orderedPaints: entry.identity.orderedPaints,
    paintStrategy: entry.identity.paintStrategy,
  })));
  if (crossSurfaceIdentities.size !== 1) throw new Error(`${fixtureId} differs across live surfaces.`);

  const report = {
    schemaVersion: "ordered-solid-source-evidence-v1",
    runId,
    sourceIdentity: {
      fixtureId,
      path: verified.path,
      filename: fixture.filename,
      byteSize: fixture.byteSize,
      zipSha256: fixture.zipSha256,
      previewSha256: fixture.embeddedPreview.sha256,
      templateJsonSha256: fixture.templateJsonSha256,
      packageId: fixture.packageId,
      rootNodeId: fixture.rootNodeId,
      nodeId: fixture.orderedSolidEvidence.nodeId,
      exporterVersion: fixture.exporterVersion,
    },
    sourcePaints: sourceNode.appearance.fills,
    sourceBounds,
    registeredEvidence: fixture.orderedSolidEvidence,
    surfaces: surfaceEvidence,
    allSurfaceIdentity: true,
    sourcePreviewComparison: withoutImage(pixel),
    sourceRegionComparison: withoutImage(regionPixel),
    references: {
      sourcePreviewIsApprovedReference: false,
      approvedUpdated: false,
      status: "candidate-only pending explicit visual review",
    },
  };
  writeFileSync(join(fixtureOutput, "report.json"), stableStringify(report));
  reports.push(report);
  console.log(`[ordered-solid-evidence] fixture=${fixtureId} regionPixels=${regionPixel.changedPixelCount} fullPixels=${pixel.changedPixelCount} surfaces=stable`);
}

writeFileSync(join(outputRoot, "report.json"), stableStringify({
  schemaVersion: "ordered-solid-source-evidence-index-v1",
  runId,
  reports,
  approvedReferencesUpdated: false,
}));
console.log(`[ordered-solid-evidence] output=${outputRoot}`);

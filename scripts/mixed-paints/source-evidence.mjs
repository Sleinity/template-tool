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
const fixtureId = "ordered-solid-linear-normal";
const runId = String(args["run-id"] || "issue-2f69124d-7c79de23-resolution");
const outputRoot = resolve(args.output || join(repoRoot, "fidelity/evidence/ordered-solid-linear-normal"));
const surfaces = ["validate", "fields", "editor", "png-export"];

function withoutImage(comparison) {
  const report = { ...comparison };
  delete report.differenceImage;
  return report;
}

function crop(bytes, bounds) {
  const source = PNG.sync.read(bytes);
  const x = Math.max(0, Math.round(bounds.x));
  const y = Math.max(0, Math.round(bounds.y));
  const width = Math.min(source.width - x, Math.round(bounds.width));
  const height = Math.min(source.height - y, Math.round(bounds.height));
  const result = new PNG({ width, height });
  PNG.bitblt(source, result, x, y, width, height, 0, 0);
  return PNG.sync.write(result);
}

mkdirSync(outputRoot, { recursive: true });
const manifest = loadManifest();
const fixture = manifest.fixtures.find((entry) => entry.id === fixtureId);
if (!fixture?.orderedNormalPaintEvidence) throw new Error(`Missing ${fixtureId} source registration.`);
const verified = verifyFixture(manifest, fixture);
const entries = unzipSync(new Uint8Array(verified.bytes));
const preview = entries[fixture.embeddedPreview.entry];
if (!preview || sha256(preview) !== fixture.embeddedPreview.sha256) {
  throw new Error("The source preview identity changed.");
}
const candidateDir = join(repoRoot, "fidelity/candidates", runId, fixtureId);
const candidatePath = join(candidateDir, "png-export/capture-1.png");
if (!existsSync(candidatePath)) throw new Error(`Missing ${candidatePath}.`);
const candidate = readFileSync(candidatePath);
const sourceBounds = verified.template.nodes[fixture.orderedNormalPaintEvidence.nodeId].bounds.relative;
const sourceRegion = crop(Buffer.from(preview), sourceBounds);
const candidateRegion = crop(candidate, sourceBounds);
const fullComparison = comparePng(Buffer.from(preview), candidate, {
  threshold: 0.1,
  allowedChangedPixelPercentage: 100,
});
const regionComparison = comparePng(sourceRegion, candidateRegion, {
  threshold: 0.1,
  allowedChangedPixelPercentage: 100,
});

writeFileSync(join(outputRoot, "source-preview.png"), preview);
writeFileSync(join(outputRoot, "png-export-candidate.png"), candidate);
writeFileSync(join(outputRoot, "source-region.png"), sourceRegion);
writeFileSync(join(outputRoot, "candidate-region.png"), candidateRegion);
if (fullComparison.differenceImage) writeFileSync(join(outputRoot, "source-diff.png"), fullComparison.differenceImage);
if (regionComparison.differenceImage) writeFileSync(join(outputRoot, "source-region-diff.png"), regionComparison.differenceImage);

const surfaceEvidence = surfaces.map((surface) => {
  const first = JSON.parse(readFileSync(join(candidateDir, surface, "structure-1.json"), "utf8"));
  const second = JSON.parse(readFileSync(join(candidateDir, surface, "structure-2.json"), "utf8"));
  const node = first.nodes.find((entry) => entry.id === fixture.orderedNormalPaintEvidence.nodeId);
  const repeated = second.nodes.find((entry) => entry.id === fixture.orderedNormalPaintEvidence.nodeId);
  const stack = node?.primitiveAppearance?.orderedNormalPaintStack;
  const repeatedStack = repeated?.primitiveAppearance?.orderedNormalPaintStack;
  const backendDecision = first.backendRouting?.decisions?.find(
    (entry) => entry.nodeId === fixture.orderedNormalPaintEvidence.nodeId,
  );
  const repeatedBackendDecision = second.backendRouting?.decisions?.find(
    (entry) => entry.nodeId === fixture.orderedNormalPaintEvidence.nodeId,
  );
  if (!stack || !repeatedStack) throw new Error(`${surface} lacks ordered mixed-paint telemetry.`);
  if (!backendDecision || !repeatedBackendDecision) {
    throw new Error(`${surface} lacks central backend-decision evidence.`);
  }
  const identity = {
    sourceRevision: node.primitiveAppearance.sourceRevision,
    geometryRevision: node.primitiveAppearance.geometryRevision,
    stackRevision: stack.resolvedStackRevision,
    runtimeOwner: stack.runtimeOwner,
    visiblePaintIndices: stack.visiblePaintIndices,
    currentBounds: stack.currentBounds,
    corners: stack.cornerGeometry,
    orderedLayers: stack.orderedLayers,
    paintStrategy: node.primitiveAppearance.paintStrategy,
    backendDecision: {
      selectedBackend: backendDecision.selectedBackend,
      runtimeOwner: backendDecision.runtimeOwner,
      requiredCapabilities: backendDecision.requiredCapabilities,
      fallback: backendDecision.fallback,
      revisions: backendDecision.revisions,
    },
  };
  const repeatedIdentity = {
    sourceRevision: repeated.primitiveAppearance.sourceRevision,
    geometryRevision: repeated.primitiveAppearance.geometryRevision,
    stackRevision: repeatedStack.resolvedStackRevision,
    runtimeOwner: repeatedStack.runtimeOwner,
    visiblePaintIndices: repeatedStack.visiblePaintIndices,
    currentBounds: repeatedStack.currentBounds,
    corners: repeatedStack.cornerGeometry,
    orderedLayers: repeatedStack.orderedLayers,
    paintStrategy: repeated.primitiveAppearance.paintStrategy,
    backendDecision: {
      selectedBackend: repeatedBackendDecision.selectedBackend,
      runtimeOwner: repeatedBackendDecision.runtimeOwner,
      requiredCapabilities: repeatedBackendDecision.requiredCapabilities,
      fallback: repeatedBackendDecision.fallback,
      revisions: repeatedBackendDecision.revisions,
    },
  };
  if (stableStringify(identity) !== stableStringify(repeatedIdentity)) {
    throw new Error(`${surface} repeated structural identity changed.`);
  }
  if (
    stack.capability !== "source-certified-solid-linear-normal-stack" ||
    stack.runtimeOwner !== "svg-ordered-normal-paint-stack" ||
    backendDecision.selectedBackend !== "dom-svg" ||
    backendDecision.runtimeOwner !== "ordered-normal-paint-svg" ||
    !backendDecision.requiredCapabilities.includes("PNT-ORDERED-SOLID-LINEAR-NORMAL") ||
    backendDecision.fallback.active ||
    node.primitiveAppearance.computed.svgOrderedNormalPaintLayerCount !== 2 ||
    node.primitiveAppearance.computed.svgGradientStopCount !== 2
  ) throw new Error(`${surface} does not expose singular two-layer SVG ownership.`);
  return { surface, identity };
});

const sharedIdentity = new Set(surfaceEvidence.map((entry) => stableStringify(entry.identity)));
if (sharedIdentity.size !== 1) throw new Error("The four surfaces do not share one mixed-paint identity.");

const report = {
  schemaVersion: "ordered-solid-linear-source-evidence-v1",
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
    nodeId: fixture.orderedNormalPaintEvidence.nodeId,
    exporterVersion: fixture.exporterVersion,
  },
  sourcePaints: verified.template.nodes[fixture.orderedNormalPaintEvidence.nodeId].appearance.fills,
  registeredEvidence: fixture.orderedNormalPaintEvidence,
  sourceBounds,
  surfaces: surfaceEvidence,
  allSurfaceIdentity: true,
  sourcePreviewComparison: withoutImage(fullComparison),
  sourceRegionComparison: withoutImage(regionComparison),
  approvedReferencesUpdated: false,
};
writeFileSync(join(outputRoot, "report.json"), stableStringify(report));
console.log(`[mixed-paint-evidence] regionPixels=${regionComparison.changedPixelCount} fullPixels=${fullComparison.changedPixelCount} surfaces=stable output=${outputRoot}`);

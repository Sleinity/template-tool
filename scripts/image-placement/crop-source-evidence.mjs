import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { unzipSync } from "fflate";
import { PNG } from "pngjs";
import { comparePng, writeDifferenceImage } from "../fidelity/image.mjs";
import { loadManifest, repoRoot, stableStringify, verifyFixture } from "../fidelity/core.mjs";

function options(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = argv[index + 1];
    result[key] = next && !next.startsWith("--") ? argv[++index] : true;
  }
  return result;
}

function finiteMatrix(matrix) {
  return Array.isArray(matrix) && matrix.length === 2 && matrix.every(
    (row) => Array.isArray(row) && row.length === 3 && row.every(Number.isFinite),
  );
}

function boundsOf(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function deriveCropGeometry(crop) {
  const matrix = crop.imageTransform;
  if (!finiteMatrix(matrix)) throw new Error("CROP evidence requires a finite 2x3 imageTransform.");
  const [[a, c, tx], [b, d, ty]] = matrix;
  const determinant = a * d - b * c;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) {
    throw new Error(`CROP evidence matrix is singular (determinant ${determinant}).`);
  }
  const inverse = [
    d / determinant,
    -b / determinant,
    -c / determinant,
    a / determinant,
    (c * ty - d * tx) / determinant,
    (b * tx - a * ty) / determinant,
  ];
  const sourcePolygon = [
    { x: tx, y: ty },
    { x: a + tx, y: b + ty },
    { x: a + c + tx, y: b + d + ty },
    { x: c + tx, y: d + ty },
  ];
  const sourceRect = boundsOf(sourcePolygon);
  const { width: slotWidth, height: slotHeight } = crop.sourceSlot;
  const { width: intrinsicWidth, height: intrinsicHeight } = crop.intrinsic;
  const [ia, ib, ic, id, ie, iff] = inverse;
  const cssTransform = [
    (slotWidth / intrinsicWidth) * ia,
    (slotHeight / intrinsicWidth) * ib,
    (slotWidth / intrinsicHeight) * ic,
    (slotHeight / intrinsicHeight) * id,
    slotWidth * ie,
    slotHeight * iff,
  ];
  const destinationPolygon = [
    { x: cssTransform[4], y: cssTransform[5] },
    { x: cssTransform[0] * intrinsicWidth + cssTransform[4], y: cssTransform[1] * intrinsicWidth + cssTransform[5] },
    { x: cssTransform[0] * intrinsicWidth + cssTransform[2] * intrinsicHeight + cssTransform[4], y: cssTransform[1] * intrinsicWidth + cssTransform[3] * intrinsicHeight + cssTransform[5] },
    { x: cssTransform[2] * intrinsicHeight + cssTransform[4], y: cssTransform[3] * intrinsicHeight + cssTransform[5] },
  ];
  return {
    coordinateModel: "raw 2x3 maps normalized slot coordinates to normalized source coordinates",
    matrixDirection: "slot-to-source",
    inversion: { required: true, count: 1, stage: "source-to-slot CSS placement" },
    rawMatrix: matrix,
    determinant,
    inverseMatrix: [[inverse[0], inverse[2], inverse[4]], [inverse[1], inverse[3], inverse[5]]],
    sourcePolygon,
    sourceRect: {
      normalized: sourceRect,
      pixels: {
        x: sourceRect.x * intrinsicWidth,
        y: sourceRect.y * intrinsicHeight,
        width: sourceRect.width * intrinsicWidth,
        height: sourceRect.height * intrinsicHeight,
      },
    },
    cssTransform,
    destinationPolygon,
    destinationBounds: boundsOf(destinationPolygon),
    clipBounds: { x: 0, y: 0, width: slotWidth, height: slotHeight },
  };
}

function cropPng(buffer, rect) {
  const source = PNG.sync.read(Buffer.isBuffer(buffer) ? buffer : readFileSync(buffer));
  const x = Math.round(rect.x);
  const y = Math.round(rect.y);
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  if (x < 0 || y < 0 || x + width > source.width || y + height > source.height) {
    throw new Error(`Crop region ${x},${y},${width},${height} exceeds ${source.width}x${source.height}.`);
  }
  const output = new PNG({ width, height });
  PNG.bitblt(source, output, x, y, width, height, 0, 0);
  return PNG.sync.write(output);
}

function serializableComparison(comparison) {
  const { differenceImage: _differenceImage, ...report } = comparison;
  return report;
}

function surfaceIdentity(runId, fixtureId, nodeId) {
  const surfaces = ["validate", "fields", "editor", "png-export"];
  const placements = Object.fromEntries(surfaces.map((surface) => {
    const path = join(repoRoot, "fidelity", "candidates", runId, fixtureId, surface, "structure-1.json");
    const structure = JSON.parse(readFileSync(path, "utf8"));
    const node = structure.nodes.find((entry) => entry.id === nodeId);
    if (!node) throw new Error(`Surface ${surface} has no structural node ${nodeId}.`);
    return [surface, {
      slot: node.imageSlot,
      renderStrategy: node.renderStrategy,
      fallbackReason: node.fallbackReason,
      strategy: node.imagePlacement?.strategy,
      coordinateSpace: node.imagePlacement?.coordinateSpace,
      transformApplicability: node.imagePlacement?.transformApplicability,
      sourceTransform: node.imagePlacement?.sourceTransform,
      visibleSourcePolygon: node.imagePlacement?.visibleSourcePolygon,
      visibleSourceRect: node.imagePlacement?.visibleSourceRect,
      destinationBounds: node.imagePlacement?.destinationBounds,
    }];
  }));
  const png = placements["png-export"];
  const sameSemanticPlacement = surfaces.every((surface) => (
    JSON.stringify(placements[surface].sourceTransform) === JSON.stringify(png.sourceTransform)
    && JSON.stringify(placements[surface].visibleSourcePolygon) === JSON.stringify(png.visibleSourcePolygon)
    && JSON.stringify(placements[surface].visibleSourceRect) === JSON.stringify(png.visibleSourceRect)
    && placements[surface].strategy === png.strategy
    && placements[surface].coordinateSpace === png.coordinateSpace
    && placements[surface].transformApplicability === png.transformApplicability
  ));
  const withinTemplateSpaceTolerance = surfaces.every((surface) => {
    const candidate = placements[surface];
    return ["width", "height"].every((key) => Math.abs(candidate.slot[key] - png.slot[key]) <= 0.001)
      && ["x", "y", "width", "height"].every(
        (key) => Math.abs(candidate.destinationBounds[key] - png.destinationBounds[key]) <= 0.001,
      );
  });
  return { sameSemanticPlacement, withinTemplateSpaceTolerance, tolerancePx: 0.001, placements };
}

async function main() {
  const args = options(process.argv.slice(2));
  const fixtureId = String(args.fixture ?? "deal-of-the-week-banner-crop");
  const runId = String(args["run-id"] ?? "milestone-6-1-crop-current");
  const surface = String(args.surface ?? "png-export");
  const manifest = loadManifest();
  const fixture = manifest.fixtures.find((entry) => entry.id === fixtureId);
  if (!fixture) throw new Error(`Unknown exact fixture ID ${fixtureId}.`);
  if (!fixture.cropEvidence) throw new Error(`Fixture ${fixtureId} has no registered cropEvidence.`);
  const verified = verifyFixture(manifest, fixture);
  const entries = unzipSync(new Uint8Array(verified.bytes));
  const preview = entries[fixture.embeddedPreview?.entry];
  if (!preview) throw new Error(`Fixture ${fixtureId} has no registered embedded source preview.`);
  const candidate = resolve(
    args.candidate ?? join(repoRoot, "fidelity", "candidates", runId, fixtureId, surface, "capture-1.png"),
  );
  const output = resolve(
    args.output ?? join(repoRoot, "fidelity", "evidence", "crop-source", runId, fixtureId, surface),
  );
  mkdirSync(output, { recursive: true });
  const evidenceStarted = performance.now();
  const previewBuffer = Buffer.from(preview);
  const comparisonStarted = performance.now();
  const fullComparison = comparePng(previewBuffer, candidate, { threshold: 0.1, includeAA: false });
  const sourceRegion = cropPng(previewBuffer, fixture.cropEvidence.sourceSlot);
  const candidateRegion = cropPng(candidate, fixture.cropEvidence.sourceSlot);
  const regionComparison = comparePng(sourceRegion, candidateRegion, { threshold: 0.1, includeAA: false });
  const comparisonMs = performance.now() - comparisonStarted;
  const geometryStarted = performance.now();
  const geometry = deriveCropGeometry(fixture.cropEvidence);
  const geometryMs = performance.now() - geometryStarted;
  const surfaces = surfaceIdentity(runId, fixtureId, fixture.cropEvidence.nodeId);

  writeFileSync(join(output, "source-reference.png"), previewBuffer);
  copyFileSync(candidate, join(output, "current-candidate.png"));
  writeDifferenceImage(fullComparison, join(output, "difference.png"));
  writeFileSync(join(output, "source-crop-region.png"), sourceRegion);
  writeFileSync(join(output, "candidate-crop-region.png"), candidateRegion);
  writeDifferenceImage(regionComparison, join(output, "crop-region-difference.png"));
  writeFileSync(join(output, "geometry.json"), stableStringify({
    schemaVersion: 1,
    fixtureId,
    fixtureIdentity: {
      filename: fixture.filename,
      zipSha256: fixture.zipSha256,
      embeddedPreviewSha256: fixture.embeddedPreview.sha256,
      cropNodeId: fixture.cropEvidence.nodeId,
      assetId: fixture.cropEvidence.assetId,
      assetSha256: fixture.cropEvidence.assetSha256,
    },
    geometry,
  }));
  writeFileSync(join(output, "comparison.json"), stableStringify({
    schemaVersion: 1,
    fixtureId,
    runId,
    surface,
    candidate,
    sourceAuthority: "embedded-preview",
    fullCanvas: serializableComparison(fullComparison),
    cropRegion: serializableComparison(regionComparison),
    performance: { comparisonMs, geometryMs, evidenceTotalMs: performance.now() - evidenceStarted },
    referenceStatus: "exploratory-unapproved",
  }));
  writeFileSync(join(output, "surface-identity.json"), stableStringify({ schemaVersion: 1, fixtureId, runId, ...surfaces }));
  console.log(stableStringify({ output, fullCanvas: serializableComparison(fullComparison), cropRegion: serializableComparison(regionComparison) }));
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

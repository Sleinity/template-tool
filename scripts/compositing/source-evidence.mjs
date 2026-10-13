#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import { PNG } from "pngjs";
import {
  loadManifest, parseArguments, repoRoot, sha256, stableStringify, verifyFixture,
} from "../fidelity/core.mjs";
import { resolveSceneModel } from "../scene-graph/model.mjs";

export const MATRIX_MODES = ["NORMAL", "DARKEN", "MULTIPLY", "SCREEN", "OVERLAY", "LIGHTEN"];
const fixtureIds = ["exporter-061-compositing-matrix", "exporter-061-cover"];
const profilePath = join(repoRoot, "fidelity", "gates", "phase9-compositing-source.json");

export function blendChannel(backdrop, source, mode) {
  switch (mode) {
    case "NORMAL": return source;
    case "DARKEN": return Math.min(backdrop, source);
    case "MULTIPLY": return backdrop * source;
    case "SCREEN": return backdrop + source - backdrop * source;
    case "OVERLAY": return backdrop <= 0.5
      ? 2 * backdrop * source
      : 1 - 2 * (1 - backdrop) * (1 - source);
    case "LIGHTEN": return Math.max(backdrop, source);
    default: throw new Error(`Unrecognized source-gate blend mode ${mode}.`);
  }
}

export function validateSourceProfile(profile, manifest) {
  assert.equal(profile?.schemaVersion, "phase9-compositing-source-v1");
  assert.equal(profile?.exporterVersion, "0.6.1");
  assert.deepEqual(profile.fixtures?.map((entry) => entry.id), fixtureIds,
    "Phase 9 research must select Matrix and Cover only; the active SDK gate is separate.");
  assert.equal(new Set(profile.fixtures.map((entry) => entry.id)).size, fixtureIds.length);
  for (const entry of profile.fixtures) {
    const fixture = manifest.fixtures.find((item) => item.id === entry.id);
    assert.ok(fixture, `Missing registered source fixture ${entry.id}.`);
    assert.equal(fixture.exporterVersion, "0.6.1");
    assert.equal(entry.zipSha256, fixture.zipSha256);
    assert.equal(entry.templateJsonSha256, fixture.templateJsonSha256);
    assert.equal(entry.embeddedPreviewSha256, fixture.embeddedPreview.sha256);
  }
  assert.equal(profile.screenshots?.length, 3);
  assert.equal(profile.matrixImage?.entry, "assets/asset_matrix_001.png");
  assert.match(profile.matrixImage.sha256, /^[a-f0-9]{64}$/);
  assert.equal(new Set(profile.screenshots.map((item) => item.filename)).size, 3);
  for (const screenshot of profile.screenshots) {
    assert.match(screenshot.sha256, /^[a-f0-9]{64}$/);
    assert.ok(screenshot.evidence?.trim(), `Missing screenshot evidence role: ${screenshot.filename}`);
  }
}

function sample(png, x, y) {
  assert.ok(x >= 0 && x < png.width && y >= 0 && y < png.height);
  const offset = (y * png.width + x) * 4;
  return Array.from(png.data.subarray(offset, offset + 4));
}

function imageDifference(reference, candidate, region) {
  assert.equal(candidate.width, reference.width, "Source-sized PNG width changed.");
  assert.equal(candidate.height, reference.height, "Source-sized PNG height changed.");
  let changedAboveTen = 0;
  let maximumChannelDelta = 0;
  for (let y = region.y; y < region.y + region.height; y++) {
    for (let x = region.x; x < region.x + region.width; x++) {
      const offset = (y * reference.width + x) * 4;
      let delta = 0;
      for (let channel = 0; channel < 3; channel++) {
        delta = Math.max(delta, Math.abs(reference.data[offset + channel] - candidate.data[offset + channel]));
      }
      maximumChannelDelta = Math.max(maximumChannelDelta, delta);
      if (delta > 10) changedAboveTen++;
    }
  }
  return { pixels: region.width * region.height, changedAboveTen, maximumChannelDelta };
}

export function reviewCapture(runId, source) {
  const root = join(repoRoot, "fidelity", "candidates", runId);
  const run = JSON.parse(readFileSync(join(root, "run.json"), "utf8"));
  assert.deepEqual(run.selectedFixtures, fixtureIds);
  assert.deepEqual(run.selectedSurfaces, ["validate", "fields", "editor", "png-export"]);
  assert.ok(run.expectedRepeat >= 2);
  const review = [];
  for (const entry of source) {
    const summary = run.summaries.find((item) => item.fixtureId === entry.fixtureId);
    assert.ok(summary && !summary.error && summary.completeness.complete,
      `Incomplete source-gate capture for ${entry.fixtureId}.`);
    const surfaces = {};
    for (const surface of run.selectedSurfaces) {
      assert.ok(summary.repeatability[surface]?.stable,
        `Unstable ${entry.fixtureId}/${surface} capture.`);
      const png = readFileSync(join(root, entry.fixtureId, surface, "capture-1.png"));
      const parsed = PNG.sync.read(png);
      surfaces[surface] = { captureSha256: sha256(png),
        width: parsed.width, height: parsed.height, repeatStable: true };
    }
    const png = PNG.sync.read(readFileSync(join(root, entry.fixtureId, "png-export", "capture-1.png")));
    const full = { x: 0, y: 0, width: entry.preview.width, height: entry.preview.height };
    const regions = entry.fixtureId === fixtureIds[0]
      ? Object.fromEntries(MATRIX_MODES.map((mode, index) => [mode, {
        fullRow: imageDifference(entry.preview, png, { x: 0, y: index * 225, width: 1080, height: 225 }),
        flatStrip: imageDifference(entry.preview, png, { x: 728, y: index * 225, width: 352, height: 225 }),
      }]))
      : { coverMixedPaintFrame: imageDifference(entry.preview, png,
        { x: 0, y: 392, width: 1080, height: 838 }) };
    review.push({ fixtureId: entry.fixtureId, surfaces,
      sourceSizedPngDifference: imageDifference(entry.preview, png, full), regions });
  }
  return { runId, completeStable: true, review };
}

export function verifyMatrixSource(template, previewPng, imagePng) {
  const root = template.nodes[template.rootNodeId];
  const flat = template.nodes["1099:305"];
  assert.equal(template.source?.pluginVersion, "0.6.1");
  assert.equal(root?.image?.assetId, "asset:image:ceab5479");
  assert.equal(root.image.scaleMode, "CROP");
  assert.equal(root.appearance.fills[0]?.type, "IMAGE");
  assert.equal(flat?.appearance.fills[0]?.type, "SOLID");
  assert.deepEqual(flat.bounds.relative, { x: 728, y: 0, width: 352, height: 1350 });
  assert.equal(root.children[0], flat.id, "The flat-color underlay must precede all six blend rows.");
  assert.equal(previewPng.width, 1080);
  assert.equal(previewPng.height, 1350);
  const backdrop = flat.appearance.fills[0].color;
  const samples = [];
  let sourceColor = null;
  for (const [index, mode] of MATRIX_MODES.entries()) {
    const node = template.nodes[root.children[index + 1]];
    const paint = node?.appearance.fills?.[0];
    const raw = node?.extensions?.figma?.rawFills?.[0];
    assert.equal(node?.name?.toUpperCase(), mode, `Row ${index} name must identify its exported blend mode.`);
    assert.equal(node.type, "RECTANGLE");
    assert.deepEqual(node.bounds.relative, { x: 0, y: index * 225, width: 1080, height: 225 });
    assert.equal(node.appearance.fills.length, 1);
    assert.equal(node.appearance.opacity, 1);
    assert.equal(paint.type, "SOLID");
    assert.equal(paint.blendMode, mode);
    assert.equal(paint.opacity, 1);
    assert.equal(paint.color.a, 1);
    assert.equal(raw, undefined,
      "Matrix must preserve the source's canonical-shaped paint without inventing a rawFills entry.");
    if (sourceColor) assert.deepEqual(paint.color, sourceColor);
    else sourceColor = paint.color;
    const y = index * 225 + 112;
    const actual = sample(previewPng, 900, y);
    const predicted = ["r", "g", "b"].map((channel) =>
      Math.round(255 * blendChannel(backdrop[channel], paint.color[channel], mode)));
    assert.equal(actual[3], 255);
    for (let channel = 0; channel < 3; channel++) {
      assert.ok(Math.abs(actual[channel] - predicted[channel]) <= 1,
        `${mode} flat-color preview sample differs from its declared source blend: ${actual} versus ${predicted}.`);
    }
    const imageSamples = [400, 600].map((x) => {
      const transform = root.image.imageTransform;
      const sourceX = (transform[0][0] * x / previewPng.width + transform[0][2]) * imagePng.width;
      const sourceY = (transform[1][1] * y / previewPng.height + transform[1][2]) * imagePng.height;
      const imageBase = sample(imagePng, Math.round(sourceX), Math.round(sourceY));
      const imageActual = sample(previewPng, x, y);
      const imagePredicted = ["r", "g", "b"].map((channel, channelIndex) =>
        Math.round(255 * blendChannel(imageBase[channelIndex] / 255, paint.color[channel], mode)));
      for (let channel = 0; channel < 3; channel++) {
        assert.ok(Math.abs(imageActual[channel] - imagePredicted[channel]) <= 3,
          `${mode} image sample at ${x},${y} differs from source imageTransform and blend: ${imageActual} versus ${imagePredicted}.`);
      }
      return { x, y, imageBase, actual: imageActual, predicted: imagePredicted };
    });
    samples.push({ mode, flatBackdrop: actual, predictedFlatBackdrop: predicted, imageSamples });
  }
  assert.equal(root.children.length, 7);
  return { rootNodeId: root.id, flatUnderlayId: flat.id, rowIds: root.children.slice(1), samples,
    supportedClaim: "opaque SOLID paint blend modes over flat-color and source-CROP image underlays at sampled pixels",
    unresolved: ["rawFills are absent; canonical-shaped ZIP paint is the serialized source",
      "full-region image resampling", "partial alpha", "group isolation", "node/group opacity"] };
}

export function verifyCoverSource(template) {
  const node = template.nodes["987:6774"];
  assert.equal(template.source?.pluginVersion, "0.6.1");
  assert.ok(node, "Cover's mixed paint frame is missing.");
  assert.deepEqual(node.appearance.fills.map((paint) => [paint.type, paint.blendMode]), [
    ["SOLID", "NORMAL"], ["IMAGE", "NORMAL"], ["GRADIENT_LINEAR", "DARKEN"],
  ]);
  assert.deepEqual(node.extensions?.figma?.rawFills?.map((paint) => [paint.type, paint.blendMode]), [
    ["SOLID", "NORMAL"], ["IMAGE", "NORMAL"], ["GRADIENT_LINEAR", "DARKEN"],
  ]);
  assert.equal(node.image?.assetId, "asset:image:6ead0168");
  assert.equal(node.image?.scaleMode, "FILL");
  assert.deepEqual(node.appearance.fills[2].gradientStops,
    node.extensions.figma.rawFills[2].gradientStops.map(({ color, position }) => ({ color, position })));
  assert.deepEqual(node.appearance.fills[2].gradientTransform,
    node.extensions.figma.rawFills[2].gradientTransform);
  return { nodeId: node.id, sourceOrder: node.appearance.fills.map((paint) => paint.type),
    blendModes: node.appearance.fills.map((paint) => paint.blendMode),
    imageAssetId: node.image.assetId, imagePlacement: node.image,
    gradientStops: node.appearance.fills[2].gradientStops,
    gradientTransform: node.appearance.fills[2].gradientTransform,
    supportedClaim: "exact source order and paint values are preserved",
    unresolved: ["blend backdrop and isolation scope", "mixed IMAGE plus gradient runtime owner"] };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const profile = JSON.parse(readFileSync(profilePath, "utf8"));
  const manifest = loadManifest();
  validateSourceProfile(profile, manifest);
  const screenshotDirectory = resolve(String(options.screenshots || process.env.FIGMA_COMPOSITING_EVIDENCE_DIR || "/Users/niels/Desktop"));
  const screenshots = profile.screenshots.map((entry) => {
    const path = join(screenshotDirectory, entry.filename);
    assert.ok(existsSync(path), `Missing exact Figma screenshot: ${path}`);
    assert.equal(sha256(readFileSync(path)), entry.sha256, `Figma screenshot hash changed: ${entry.filename}`);
    return { ...entry, path };
  });
  const verified = profile.fixtures.map((entry) => {
    const fixture = manifest.fixtures.find((item) => item.id === entry.id);
    return verifyFixture(manifest, fixture);
  });
  const source = verified.map((item) => {
    const entries = unzipSync(new Uint8Array(item.bytes));
    return { fixtureId: item.fixture.id, zipSha256: item.fixture.zipSha256,
      templateJsonSha256: sha256(entries["template.json"]),
      embeddedPreviewSha256: sha256(entries["preview.png"]),
      template: item.template, preview: PNG.sync.read(Buffer.from(entries["preview.png"])), entries };
  });
  assert.equal(sha256(source[0].entries[profile.matrixImage.entry]), profile.matrixImage.sha256);
  const matrix = verifyMatrixSource(source[0].template, source[0].preview,
    PNG.sync.read(Buffer.from(source[0].entries[profile.matrixImage.entry])));
  const cover = verifyCoverSource(source[1].template);
  const projections = [];
  for (const item of verified) {
    const first = await resolveSceneModel(item);
    const second = await resolveSceneModel(item);
    assert.ok(first.validation.valid && first.appearanceValidation.valid,
      `${item.fixture.id} must retain a valid scene and appearance projection.`);
    assert.equal(stableStringify(first.graph), stableStringify(second.graph),
      `${item.fixture.id} canonical scene projection is not deterministic.`);
    assert.equal(stableStringify(first.appearance), stableStringify(second.appearance),
      `${item.fixture.id} appearance projection is not deterministic.`);
    const targetIds = item.fixture.id === fixtureIds[0] ? matrix.rowIds : [cover.nodeId];
    for (const id of targetIds) {
      const rawFills = item.template.nodes[id].appearance.fills;
      const projectedFills = first.appearance.paints.find((paint) => paint.nodeId === id)?.paints;
      assert.ok(projectedFills, `Missing appearance paint projection for ${id}.`);
      assert.deepEqual(projectedFills.map(({ type, blendMode, sourceIndex }) => [type, blendMode, sourceIndex]),
        rawFills.map(({ type, blendMode }, sourceIndex) => [type, blendMode, sourceIndex]));
    }
    projections.push({ fixtureId: item.fixture.id, sceneValid: true, appearanceValid: true,
      deterministic: true, importMs: first.performance.importMs,
      sceneSha256: sha256(stableStringify(first.graph)),
      appearanceSha256: sha256(stableStringify(first.appearance)) });
  }
  const runId = String(options["run-id"] || `phase9-source-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  const output = resolve(String(options.output || join(repoRoot, "fidelity", "appearance-contracts", "candidates", runId, "compositing-source.json")));
  assert.ok(!existsSync(output), `Source evidence run already exists: ${output}`);
  const report = { schemaVersion: "phase9-compositing-source-report-v1", runId,
    fixtureIds, sourceIdentities: source.map(({ fixtureId, zipSha256, templateJsonSha256, embeddedPreviewSha256 }) =>
      ({ fixtureId, zipSha256, templateJsonSha256, embeddedPreviewSha256 })),
    screenshots, matrix, cover, projections,
    captureReview: options["capture-run"]
      ? reviewCapture(String(options["capture-run"]), source)
      : null,
    disposition: "partial-source-evidence-no-runtime-transfer",
    blockers: ["No matched PASS_THROUGH versus isolated group control is supplied.",
      "No source control isolates partial-alpha or node/group opacity order.",
      "The Cover mixed IMAGE and DARKEN gradient cannot establish its blend backdrop without an isolation control."],
  };
  mkdirSync(resolve(output, ".."), { recursive: true });
  writeFileSync(output, stableStringify(report));
  console.log(`[phase9-source] run=${runId} fixtures=${fixtureIds.join(",")} matrix-flat-blends=6 projection=valid-deterministic disposition=${report.disposition} report=${output}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}

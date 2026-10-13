#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import { PNG } from "pngjs";
import {
  loadManifest, parseArguments, repoRoot, sha256, stableStringify, verifyFixture,
} from "../fidelity/core.mjs";
import { resolveSceneModel } from "../scene-graph/model.mjs";
import { blendChannel } from "./source-evidence.mjs";

export const CONTROL_ID = "exporter-061-compositing-group-control";
export const GROUPS = [
  { id: "1100:310", mode: "PASS_THROUGH", y: 0 },
  { id: "1100:319", mode: "NORMAL", y: 675 },
  { id: "1100:324", mode: "OVERLAY", y: 1350 },
];
export const ROW_MODES = ["DARKEN", "MULTIPLY", "SCREEN"];
const profilePath = join(repoRoot, "fidelity", "gates", "phase9-compositing-group-control.json");
const figmaInspectionPath = join(repoRoot, "fidelity", "gates", "phase9-compositing-group-control-figma.json");

export function validateGroupProfile(profile, manifest) {
  assert.equal(profile?.schemaVersion, "phase9-compositing-group-control-v1");
  assert.equal(profile?.exporterVersion, "0.6.1");
  assert.equal(profile?.fixture?.id, CONTROL_ID);
  const fixture = manifest.fixtures.find((entry) => entry.id === CONTROL_ID);
  assert.ok(fixture, `Missing registered ${CONTROL_ID} fixture.`);
  assert.equal(fixture.exporterVersion, "0.6.1");
  assert.equal(profile.fixture.zipSha256, fixture.zipSha256);
  assert.equal(profile.fixture.templateJsonSha256, fixture.templateJsonSha256);
  assert.equal(profile.fixture.embeddedPreviewSha256, fixture.embeddedPreview.sha256);
  assert.equal(profile.image?.entry, "assets/asset_matrix_2_001.png");
  assert.match(profile.image.sha256, /^[a-f0-9]{64}$/);
  assert.equal(profile.screenshots?.length, 6);
  assert.equal(new Set(profile.screenshots.map((item) => item.filename)).size, 6);
  for (const screenshot of profile.screenshots) {
    assert.match(screenshot.sha256, /^[a-f0-9]{64}$/);
    assert.ok(screenshot.evidence?.trim());
  }
  return fixture;
}

function sample(png, x, y) {
  assert.ok(x >= 0 && x < png.width && y >= 0 && y < png.height);
  const offset = (Math.round(y) * png.width + Math.round(x)) * 4;
  return Array.from(png.data.subarray(offset, offset + 4));
}

function sourceOver(backdrop, source, opacity) {
  return backdrop * (1 - opacity) + source * opacity;
}

export function projectGroupPixel(backdropRgb, fills, rowMode, groupMode, groupOpacity) {
  assert.ok(["PASS_THROUGH", "NORMAL"].includes(groupMode),
    "The isolated source model covers only matched PASS_THROUGH and NORMAL groups.");
  assert.ok(ROW_MODES.includes(rowMode));
  assert.ok(groupOpacity >= 0 && groupOpacity <= 1);
  return ["r", "g", "b"].map((channel, index) => {
    const backdrop = backdropRgb[index] / 255;
    let groupPaint = groupMode === "PASS_THROUGH"
      ? blendChannel(backdrop, fills[0].color[channel], rowMode)
      : fills[0].color[channel];
    for (const fill of fills.slice(1)) {
      assert.equal(fill.blendMode, "NORMAL");
      groupPaint = sourceOver(groupPaint, fill.color[channel], fill.opacity);
    }
    return Math.round(255 * sourceOver(backdrop, groupPaint, groupOpacity));
  });
}

export function projectIndependentChildOpacityPixel(backdropRgb, fills, groupOpacity) {
  assert.equal(fills.length, 2);
  const firstAlpha = fills[0].opacity * groupOpacity;
  const secondAlpha = fills[1].opacity * groupOpacity;
  return ["r", "g", "b"].map((channel, index) => Math.round(255 * (
    (backdropRgb[index] / 255) * (1 - firstAlpha) * (1 - secondAlpha) +
    fills[0].color[channel] * firstAlpha * (1 - secondAlpha) +
    fills[1].color[channel] * secondAlpha
  )));
}

export function projectOverlayGroupPixel(backdropRgb, fills, rowMode, groupOpacity,
  isolated = true) {
  assert.ok(ROW_MODES.includes(rowMode));
  return ["r", "g", "b"].map((channel, index) => {
    const backdrop = backdropRgb[index] / 255;
    let groupPaint = isolated ? fills[0].color[channel]
      : blendChannel(backdrop, fills[0].color[channel], rowMode);
    for (const fill of fills.slice(1)) {
      assert.equal(fill.blendMode, "NORMAL");
      groupPaint = sourceOver(groupPaint, fill.color[channel], fill.opacity);
    }
    return Math.round(255 * sourceOver(backdrop,
      blendChannel(backdrop, groupPaint, "OVERLAY"), groupOpacity));
  });
}

export function verifyLiveFigmaInspection(template, inspection) {
  assert.equal(inspection?.schemaVersion, "phase9-matrix2-live-figma-inspection-v1");
  assert.equal(inspection?.fileKey, "Tb4DXmBGjBDkJ9eoBQwFYO");
  assert.equal(inspection?.nodeId, template.rootNodeId);
  assert.equal(inspection.rows?.length, Object.keys(template.nodes).length);
  let paintCount = 0;
  for (const row of inspection.rows) {
    const node = template.nodes[row.id];
    assert.ok(node, `Live Figma node ${row.id} is absent from the ZIP.`);
    assert.equal(row.name, node.name);
    assert.equal(row.type, node.type);
    assert.equal(row.blendMode, node.appearance.blendMode);
    assert.equal(row.opacity, node.appearance.opacity);
    assert.equal(row.visible, node.visible ?? true);
    assert.equal(row.width, node.bounds.relative.width);
    assert.equal(row.height, node.bounds.relative.height);
    assert.deepEqual(row.children, node.children ?? []);
    assert.equal(row.fills.length, node.appearance.fills.length);
    for (const paint of row.fills) {
      const sourcePaint = node.appearance.fills[paint.index];
      assert.equal(paint.type, sourcePaint.type);
      assert.equal(paint.blendMode, sourcePaint.blendMode);
      assert.equal(paint.opacity, sourcePaint.opacity);
      assert.equal(paint.visible, sourcePaint.visible);
      if (paint.type === "SOLID") {
        assert.deepEqual(paint.color, {
          r: sourcePaint.color.r, g: sourcePaint.color.g, b: sourcePaint.color.b,
        });
        assert.equal(sourcePaint.color.a, 1);
      }
      if (paint.type === "IMAGE") {
        assert.equal(node.image?.assetId, `asset:image:${paint.imageHash.slice(0, 8)}`);
      }
      paintCount++;
    }
  }
  return { nodeCount: inspection.rows.length, paintCount,
    groupModes: GROUPS.map(({ id }) => inspection.rows.find((row) => row.id === id).blendMode),
    sourceUrl: inspection.sourceUrl, inspectedOn: inspection.inspectedOn };
}

function maxRgbDifference(first, second) {
  return Math.max(...first.slice(0, 3).map((value, index) => Math.abs(value - second[index])));
}

function compareRegion(reference, candidate, y, height) {
  assert.equal(candidate.width, reference.width);
  assert.equal(candidate.height, reference.height);
  let changedAboveTen = 0;
  for (let row = y; row < y + height; row++) {
    for (let x = 0; x < reference.width; x++) {
      const offset = (row * reference.width + x) * 4;
      if (maxRgbDifference(reference.data.subarray(offset, offset + 3),
        candidate.data.subarray(offset, offset + 3)) > 10) changedAboveTen++;
    }
  }
  return { pixels: reference.width * height, changedAboveTen };
}

export function verifyGroupControlSource(template, preview, image) {
  assert.equal(template.source?.pluginVersion, "0.6.1");
  assert.equal(preview.width, 1080);
  assert.equal(preview.height, 2025);
  const root = template.nodes[template.rootNodeId];
  const flat = template.nodes["1099:305"];
  assert.deepEqual(root?.children, [flat.id, ...GROUPS.map((entry) => entry.id)]);
  assert.deepEqual(root.bounds.relative, { x: 0, y: 0, width: 1080, height: 2025 });
  assert.equal(root?.appearance.fills[0]?.type, "IMAGE");
  assert.equal(root?.image?.assetId, "asset:image:ceab5479");
  assert.equal(root?.image?.scaleMode, "CROP");
  assert.equal(flat?.appearance.fills[0]?.type, "SOLID");
  assert.deepEqual(flat.bounds.relative, { x: 728, y: 0, width: 352, height: 1350 });
  assert.equal(image.width, 1125);
  assert.equal(image.height, 750);

  const probes = [];
  const overlayProbes = [];
  let opacityOrderControl = null;
  const groups = [];
  let referenceFills = null;
  for (const group of GROUPS) {
    const node = template.nodes[group.id];
    assert.equal(node.type, "GROUP");
    assert.equal(node.appearance.blendMode, group.mode);
    assert.equal(node.appearance.opacity, 0.800000011920929);
    assert.deepEqual(node.bounds.relative, { x: 0, y: group.y, width: 1080, height: 675 });
    assert.equal(node.children.length, 3);
    const rows = [];
    for (const [index, rowMode] of ROW_MODES.entries()) {
      const row = template.nodes[node.children[index]];
      const fills = row.appearance.fills;
      assert.equal(row.type, "RECTANGLE");
      assert.equal(row.name.toUpperCase(), rowMode);
      assert.deepEqual(row.bounds.relative, { x: 0, y: index * 225, width: 1080, height: 225 });
      assert.equal(row.appearance.opacity, 1);
      assert.equal(fills[0]?.type, "SOLID");
      assert.equal(fills[0]?.blendMode, rowMode);
      assert.equal(fills[0]?.opacity, 1);
      assert.equal(fills[0]?.color?.a, 1);
      assert.equal(fills.length, index === 0 ? 2 : 1);
      if (index === 0) {
        assert.equal(fills[1].type, "SOLID");
        assert.equal(fills[1].blendMode, "NORMAL");
        assert.equal(fills[1].opacity, 0.4000000059604645);
      }
      if (referenceFills?.[index]) assert.deepEqual(fills, referenceFills[index]);
      rows.push({ nodeId: row.id, mode: rowMode, fills });
      if (group.mode === "OVERLAY") {
        const x = 700;
        const y = group.y + index * 225 + 112;
        const transform = root.image.imageTransform;
        const sourceX = (transform[0][0] * x / preview.width + transform[0][2]) * image.width;
        const sourceY = (transform[1][1] * y / preview.height + transform[1][2]) * image.height;
        const backdrop = sample(image, sourceX, sourceY).slice(0, 3);
        const actual = sample(preview, x, y);
        const predicted = projectOverlayGroupPixel(backdrop, fills, rowMode,
          node.appearance.opacity);
        const competing = projectOverlayGroupPixel(backdrop, fills, rowMode,
          node.appearance.opacity, false);
        const maximumDelta = maxRgbDifference(actual, predicted);
        assert.ok(maximumDelta <= 2,
          `OVERLAY ${rowMode} source sample ${x},${y}: ${actual} versus ${predicted}.`);
        assert.ok(maxRgbDifference(actual, competing) > 10,
          `OVERLAY ${rowMode} source sample must distinguish isolated from pass-through children.`);
        overlayProbes.push({ groupId: node.id, rowMode, x, y,
          backdrop, actual, predicted, competing, maximumDelta });
        continue;
      }

      const y = group.y + index * 225 + 112;
      for (const x of [450, 800, 900, 1000]) {
        const backdrop = x >= 728
          ? ["r", "g", "b"].map((channel) => Math.round(255 * flat.appearance.fills[0].color[channel]))
          : (() => {
            const transform = root.image.imageTransform;
            const sourceX = (transform[0][0] * x / preview.width + transform[0][2]) * image.width;
            const sourceY = (transform[1][1] * y / preview.height + transform[1][2]) * image.height;
            return sample(image, sourceX, sourceY).slice(0, 3);
          })();
        const actual = sample(preview, x, y);
        const predicted = projectGroupPixel(backdrop, fills, rowMode,
          group.mode, node.appearance.opacity);
        const competingMode = group.mode === "NORMAL" ? "PASS_THROUGH" : "NORMAL";
        const competing = projectGroupPixel(backdrop, fills, rowMode,
          competingMode, node.appearance.opacity);
        const maximumDelta = maxRgbDifference(actual, predicted);
        assert.ok(maximumDelta <= (x >= 728 ? 1 : 3),
          `${group.mode} ${rowMode} source sample ${x},${y}: ${actual} versus ${predicted}.`);
        if (x === 900) assert.ok(maxRgbDifference(actual, competing) > 10,
          `${group.mode} ${rowMode} flat source must distinguish isolation models.`);
        if (group.mode === "NORMAL" && rowMode === "DARKEN" && x === 900) {
          const independentChildOpacity = projectIndependentChildOpacityPixel(
            backdrop, fills, node.appearance.opacity);
          assert.ok(maxRgbDifference(actual, independentChildOpacity) > 10,
            "The mixed-opacity row must distinguish post-group opacity from scaling both child opacities.");
          opacityOrderControl = { x, y, actual, postGroupOpacity: predicted,
            independentChildOpacity };
        }
        probes.push({ groupId: node.id, groupMode: group.mode, rowMode, x, y,
          backdrop, actual, predicted, competing, maximumDelta });
      }
    }
    referenceFills ??= rows.map((row) => row.fills);
    groups.push({ nodeId: node.id, mode: group.mode, opacity: node.appearance.opacity,
      rows: rows.map(({ nodeId, mode }) => ({ nodeId, mode })) });
  }
  assert.ok(opacityOrderControl);
  return { rootNodeId: root.id, flatUnderlayId: flat.id, groups, probes,
    overlayProbes,
    opacityOrderControl,
    sourceCertified: "matched PASS_THROUGH versus NORMAL group isolation, post-group 80% opacity, and a 40% top SOLID over opaque flat and sampled image backdrops; three isolated OVERLAY group samples over an opaque image interior",
    preservedOnly: ["general OVERLAY group behavior beyond three image-interior samples", "transparent backdrop/edge behavior",
      "general IMAGE plus gradient stack", "production backend choice"] };
}

export function assertCaptureIdentity(run, zipSha256) {
  assert.deepEqual(run.selectedFixtures, [CONTROL_ID]);
  assert.deepEqual(run.fixtures.map(({ id, zipSha256: hash }) => [id, hash]),
    [[CONTROL_ID, zipSha256]], "Capture must use this exact source ZIP, not a prior export at the same path.");
}

export function reviewGroupCapture(runId, preview, zipSha256) {
  const root = join(repoRoot, "fidelity", "candidates", runId);
  const run = JSON.parse(readFileSync(join(root, "run.json"), "utf8"));
  assertCaptureIdentity(run, zipSha256);
  assert.deepEqual(run.selectedSurfaces, ["validate", "fields", "editor", "png-export"]);
  assert.ok(run.expectedRepeat >= 2);
  const summary = run.summaries.find((item) => item.fixtureId === CONTROL_ID);
  assert.ok(summary && !summary.error && summary.completeness.complete,
    "The group-control capture must be complete.");
  const surfaces = {};
  for (const surface of run.selectedSurfaces) {
    assert.ok(summary.repeatability[surface]?.stable,
      `Unstable group-control ${surface} capture.`);
    const bytes = readFileSync(join(root, CONTROL_ID, surface, "capture-1.png"));
    const parsed = PNG.sync.read(bytes);
    surfaces[surface] = { captureSha256: sha256(bytes), width: parsed.width,
      height: parsed.height, repeatStable: true };
  }
  const candidate = PNG.sync.read(readFileSync(join(root, CONTROL_ID, "png-export", "capture-1.png")));
  const regions = Object.fromEntries(GROUPS.map((group) => [group.mode,
    compareRegion(preview, candidate, group.y, 675)]));
  return { runId, completeStable: true, surfaces, regions };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const manifest = loadManifest();
  const profile = JSON.parse(readFileSync(profilePath, "utf8"));
  const fixture = validateGroupProfile(profile, manifest);
  const screenshotDirectory = resolve(String(options.screenshots ||
    process.env.FIGMA_COMPOSITING_EVIDENCE_DIR || "/Users/niels/Desktop"));
  const screenshots = profile.screenshots.map((entry) => {
    const path = join(screenshotDirectory, entry.filename);
    assert.ok(existsSync(path), `Missing exact Figma screenshot: ${path}`);
    assert.equal(sha256(readFileSync(path)), entry.sha256,
      `Figma screenshot hash changed: ${entry.filename}`);
    return { ...entry, path };
  });
  const verified = verifyFixture(manifest, fixture);
  const entries = unzipSync(new Uint8Array(verified.bytes));
  assert.equal(sha256(entries[profile.image.entry]), profile.image.sha256);
  const preview = PNG.sync.read(Buffer.from(entries["preview.png"]));
  const image = PNG.sync.read(Buffer.from(entries[profile.image.entry]));
  const source = verifyGroupControlSource(verified.template, preview, image);
  const liveFigma = verifyLiveFigmaInspection(verified.template,
    JSON.parse(readFileSync(figmaInspectionPath, "utf8")));
  const [browserImporter, browserPersistence, browserSession, core] = await Promise.all([
    import("@sleinity/template-browser/importer"),
    import("@sleinity/template-browser/persistence"),
    import("@sleinity/template-browser/session"),
    import("@sleinity/template-core"),
  ]);
  const { buildZipPackageImportResult } = browserImporter;
  const { InMemoryTemplateSessionRepositoryV2 } = browserPersistence;
  const { createTemplateSessionV2 } = browserSession;
  const { parseTemplatePackageV2 } = core;
  const publicImport = await buildZipPackageImportResult(
    verified.bytes.buffer.slice(verified.bytes.byteOffset,
      verified.bytes.byteOffset + verified.bytes.byteLength),
    fixture.filename, "", undefined, null);
  let publicV2;
  try {
    assert.ok(publicImport.validation?.valid && publicImport.package,
      "The exact Matrix 2 ZIP must import through the public Browser entry point.");
    assert.ok(publicImport.previewBlob,
      "The public import must retain the embedded source preview.");
    assert.equal(sha256(Buffer.from(await publicImport.previewBlob.arrayBuffer())),
      fixture.embeddedPreview.sha256);
    const parsed = parseTemplatePackageV2(publicImport.package);
    assert.ok(parsed.validation?.valid && parsed.package,
      "The public Core V2 parser must accept the imported package.");
    const session = createTemplateSessionV2({ repository: new InMemoryTemplateSessionRepositoryV2() });
    try {
      session.load(parsed.package);
      const snapshot = session.getSnapshot();
      assert.ok(snapshot.basePackage && snapshot.workingPackage && snapshot.resolvedTree,
        "The public V2 session must resolve the control package.");
      publicV2 = { importValid: true, embeddedPreviewReused: true,
        parserValid: true, sessionResolved: true,
        rootNodeId: snapshot.basePackage.rootNodeId };
      assert.equal(publicV2.rootNodeId, source.rootNodeId);
    } finally { session.dispose(); }
  } finally { publicImport.dispose?.(); }
  const first = await resolveSceneModel(verified);
  const second = await resolveSceneModel(verified);
  assert.ok(first.validation.valid && first.appearanceValidation.valid);
  assert.equal(stableStringify(first.graph), stableStringify(second.graph));
  assert.equal(stableStringify(first.appearance), stableStringify(second.appearance));
  for (const group of source.groups) {
    const projection = first.appearance.compositing.find((entry) => entry.nodeId === group.nodeId);
    assert.ok(projection, `Missing compositing projection for ${group.nodeId}.`);
    assert.equal(projection.blendMode, group.mode);
    assert.equal(projection.opacity, group.opacity);
    assert.deepEqual(projection.childOrder, group.rows.map((row) => row.nodeId));
    for (const row of group.rows) {
      const sourceFills = verified.template.nodes[row.nodeId].appearance.fills;
      const projectedFills = first.appearance.paints.find((entry) => entry.nodeId === row.nodeId)?.paints;
      assert.deepEqual(projectedFills?.map(({ type, blendMode, opacity, sourceIndex }) =>
        [type, blendMode, opacity, sourceIndex]),
      sourceFills.map(({ type, blendMode, opacity }, index) =>
        [type, blendMode, opacity, index]));
    }
  }
  const runId = String(options["run-id"] ||
    `phase9-group-source-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  const output = resolve(String(options.output || join(repoRoot, "fidelity",
    "appearance-contracts", "candidates", runId, "group-control-source.json")));
  assert.ok(!existsSync(output), `Source evidence run already exists: ${output}`);
  const report = { schemaVersion: "phase9-compositing-group-control-report-v1", runId,
    fixtureId: CONTROL_ID, zipSha256: fixture.zipSha256,
    templateJsonSha256: fixture.templateJsonSha256,
    embeddedPreviewSha256: fixture.embeddedPreview.sha256,
    imageSha256: profile.image.sha256, screenshots, liveFigma, source,
    publicV2,
    projection: { sceneValid: true, appearanceValid: true, deterministic: true,
      importMs: first.performance.importMs,
      sceneSha256: sha256(stableStringify(first.graph)),
      appearanceSha256: sha256(stableStringify(first.appearance)) },
    captureReview: options["capture-run"]
      ? reviewGroupCapture(String(options["capture-run"]), preview, fixture.zipSha256) : null,
    disposition: "bounded-source-contract-runtime-reviewed-separately",
    remaining: ["The third OVERLAY group has no matched isolation control.",
      "No transparent backdrop/edge control is present.",
      "Cover's mixed IMAGE plus DARKEN gradient remains outside the certified group subset."],
  };
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, stableStringify(report));
  console.log(`[phase9-group] run=${runId} fixture=${CONTROL_ID} figma-paints=${liveFigma.paintCount} flat-samples=18 image-samples=9 disposition=${report.disposition} report=${output}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error); process.exitCode = 1; });
}

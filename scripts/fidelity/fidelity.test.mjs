import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PNG } from "pngjs";
import { unzipSync } from "fflate";
import {
  artifactDirectory,
  compareGeometry,
  createRepeatabilityReport,
  environmentMetadata,
  loadManifest,
  normalizeStructuralSnapshot,
  sha256,
  selectFixtures,
  selectSurfaces,
  validateManifest,
  verifyFixture,
} from "./core.mjs";
import { comparePng } from "./image.mjs";
import { approvedReferenceHash, assertReferenceImmutable, requireUpdateReason, updateApprovedReference } from "./references.mjs";
import { retainFailureArtifacts } from "./artifacts.mjs";
import { deriveCropGeometry } from "../image-placement/crop-source-evidence.mjs";

function png(width, height, color = [0, 0, 0, 255]) {
  const value = new PNG({ width, height });
  for (let offset = 0; offset < value.data.length; offset += 4) value.data.set(color, offset);
  return PNG.sync.write(value);
}

const manifest = loadManifest();
assert.equal(manifest.fixtures.length, 19, "Registered fixture manifest should contain nineteen exact fixtures.");
for (const fixture of manifest.fixtures) assert.equal(verifyFixture(manifest, fixture).fixture.id, fixture.id, `Fixture hash and metadata should verify for ${fixture.id}.`);
const cropFixture = manifest.fixtures.find((fixture) => fixture.id === "deal-of-the-week-banner-crop");
assert.ok(cropFixture?.cropEvidence, "The real CROP fixture must retain exact source evidence.");
const cropGeometry = deriveCropGeometry(cropFixture.cropEvidence);
assert.equal(cropGeometry.matrixDirection, "slot-to-source", "CROP source matrix direction must be explicit.");
assert.equal(cropGeometry.inversion.count, 1, "CROP placement must invert the source transform exactly once.");
assert.ok(Math.abs(cropGeometry.determinant) > 1e-12, "The source-certified CROP transform must be invertible.");
assert.notEqual(cropGeometry.sourcePolygon[0].y, cropGeometry.sourcePolygon[1].y, "The source fixture must retain a rotated, non-rectangular source polygon.");
assert.ok(cropGeometry.sourceRect.normalized.x > 0 && cropGeometry.sourceRect.normalized.y > 0, "The source fixture must exercise a non-centred crop.");
const editableCropFixture = manifest.fixtures.find((fixture) => fixture.id === "deal-of-the-week-banner-crop-editable");
assert.equal(editableCropFixture?.zipSha256, "415062d2378194354f242dc643f965cbf7fa665ad3ecd034664d0211144b6382", "The editable media fixture must bind the exact new ZIP bytes.");
assert.deepEqual(editableCropFixture?.mediaFieldEvidence?.fields.map((field) => field.sourceScaleMode), ["FILL", "CROP", "FIT"], "One real fixture must exercise all three imported source modes.");
assert.equal(new Set(editableCropFixture?.mediaFieldEvidence?.fields.map(() => editableCropFixture.mediaFieldEvidence.sharedAsset.assetId)).size, 1, "Per-node source modes must remain independent when fields share one binary asset.");
const editableCropVerified = verifyFixture(manifest, editableCropFixture);
const editableEntries = unzipSync(new Uint8Array(editableCropVerified.bytes));
const editableAssetBytes = editableEntries[editableCropFixture.mediaFieldEvidence.sharedAsset.assetPath];
assert.equal(editableAssetBytes?.byteLength, 1441382, "Editable shared image asset must retain exact byte size.");
assert.equal(sha256(editableAssetBytes), "5dcfbc0b02a55dde8a347ca283dc1babb25958fbaa7e977d89e4d063286491f0", "Editable shared image asset must retain exact SHA-256.");
assert.equal(editableCropVerified.template.packageId, "pkg_429_39_1784233341362", "Editable media evidence must bind the source package ID.");
assert.equal(editableCropVerified.template.source?.pluginVersion, "0.6.0", "Editable media evidence must bind the exporter version.");
assert.deepEqual(
  editableCropVerified.template.editableFields.filter((field) => field.property === "image.assetId").map((field) => [field.id, field.nodeId]),
  [["top", "429:43"], ["main", "429:46"], ["bottom", "429:49"]],
  "The exact source ZIP must expose all three registered image fields without substitution.",
);
for (const expected of editableCropFixture.mediaFieldEvidence.fields) {
  const node = editableCropVerified.template.nodes[expected.nodeId];
  assert.equal(node.image?.assetId, editableCropFixture.mediaFieldEvidence.sharedAsset.assetId, `${expected.fieldId} must use the registered shared asset.`);
  assert.equal(node.image?.scaleMode, expected.sourceScaleMode, `${expected.fieldId} must retain independent source placement mode.`);
  assert.deepEqual(node.image?.imageTransform, expected.imageTransform, `${expected.fieldId} must retain exact raw transform provenance.`);
}

const maskFixture = manifest.fixtures.find((fixture) => fixture.id === "deal-of-the-week-banner-crop-mask");
assert.equal(maskFixture?.zipSha256, "017204b839e4269174c822daeb3799eb7ebf8c5e8d955d47723ab7a7e498e689", "Mask fixture must bind exact crop-3 ZIP bytes.");
const maskVerified = verifyFixture(manifest, maskFixture);
assert.equal(maskVerified.template.packageId, "pkg_429_39_1784238619750", "Mask evidence must bind the exact package ID.");
assert.equal(maskVerified.template.nodes["429:41"].mask?.isMask, true, "Only the canonical isMask marker classifies the mask source.");
assert.equal(maskVerified.template.nodes["429:42"].mask?.isMask, false, "maskType on the affected node must not classify another source.");
assert.deepEqual(maskVerified.template.maskRelationships?.[0], {
  maskSourceId: "429:41",
  affectedSiblingIds: ["429:42"],
  parentId: "429:40",
  scopeTerminationReason: "end_of_siblings",
}, "Exact exporter-authored mask scope must be retained without inference.");

const primitiveCover = manifest.fixtures.find((fixture) => fixture.id === "bb-cover-thing-primitives");
assert.equal(primitiveCover?.zipSha256, "7349496cd1cca9012d55791ac92b2d0d1ade2dc9fe204102b5074566ad06e4b3", "Primitive cover fixture must bind exact bytes.");
assert.equal(primitiveCover?.primitiveEvidence.insideStrokeNodeId, "421:27", "Primitive cover must identify the exact rectangular INSIDE stroke source.");
assert.equal(primitiveCover?.primitiveEvidence.insideStrokeWidth, 2.4000000953674316, "Primitive cover must retain exact stroke width.");
assert.equal(primitiveCover?.primitiveEvidence.unsupportedPaintTypes.at(-1), "GRADIENT_LINEAR", "Gradient evidence must remain explicitly unsupported.");

const primitiveVisual = manifest.fixtures.find((fixture) => fixture.id === "main-visual-section-primitives");
assert.equal(primitiveVisual?.zipSha256, "c3562c456978758384ba592fd463ac30ec7b7566ee55a67068691d8d260331df", "Primitive visual fixture must bind exact bytes.");
assert.equal(primitiveVisual?.primitiveEvidence.fixedInsideStrokeNodeId, "2453:1436", "Primitive visual must identify the fixed rectangular INSIDE stroke source.");
assert.equal(primitiveVisual?.primitiveEvidence.clampedRadiusExpected, 48, "The 96px circular frame must clamp its 999px source radius to 48px.");
assert.deepEqual(primitiveVisual?.primitiveEvidence.unsupportedRootPaintTypes, ["SOLID", "SHADER", "GRADIENT_LINEAR"], "Unsupported root paint order must remain explicit.");

const primitiveStrokeTest = manifest.fixtures.find((fixture) => fixture.id === "stroke-test-primitives");
assert.equal(primitiveStrokeTest?.zipSha256, "53564876e6bf9d9924528eefbbd8eea9ab8f176bb91bef731c0f9785c3b3eb29", "Stroke test fixture must bind exact bytes.");
assert.equal(primitiveStrokeTest?.embeddedPreview?.sha256, "8fb0bca096694f177f02871fa4dd775b8ae51c7fc510bfcf4b848a1a17e1c4be", "Stroke test fixture must bind exact preview bytes.");
assert.equal(primitiveStrokeTest?.templateJsonSha256, "28b6720e417ea339a432ff79f127b34a191801c975e121c73a4ac0d18f0c75a9", "Stroke test fixture must bind exact template bytes.");
assert.equal(primitiveStrokeTest?.primitiveEvidence?.centerStrokeNodeId, "443:89");
assert.equal(primitiveStrokeTest?.primitiveEvidence?.outsideStrokeNodeId, "443:90");
assert.deepEqual(primitiveStrokeTest?.primitiveEvidence?.independentRadii, [40, 20, 80, 8]);

const linearGradientFixture = manifest.fixtures.find((fixture) => fixture.id === "gradient-test-linear");
assert.equal(linearGradientFixture?.zipSha256, "d3904ce8b52c57111235482fecdd126a6ecf63ddbca1eb72a52e364dc927031b", "Linear-gradient fixture must bind the exact source-certified ZIP bytes.");
assert.equal(linearGradientFixture?.templateJsonSha256, "87295fc9534b9ef47d7ea607f2e527b5b5be5535b1ac80547e8fa8fae61bb8cd", "Linear-gradient fixture must bind exact template bytes.");
assert.equal(linearGradientFixture?.linearGradientEvidence?.matrixDirection, "node-local-to-gradient", "The registered matrix direction must remain explicit.");
assert.equal(linearGradientFixture?.linearGradientEvidence?.inversionCount, 1, "The registered geometry contract must invert exactly once.");
assert.equal(Object.keys(linearGradientFixture?.linearGradientEvidence?.nodes ?? {}).length, 9, "The source fixture must retain all nine isolated gradient cases.");
const linearGradientVerified = verifyFixture(manifest, linearGradientFixture);
assert.equal(linearGradientVerified.template.nodes["454:32"].appearance.cornerRadii?.topRight, 170, "Independent-corner gradient evidence must bind the exact source node.");
assert.equal(linearGradientVerified.template.nodes["451:181"].extensions.figma.rotation < -90, true, "Rotated three-stop evidence must bind the source rotation.");

const paintOpacityFixture = manifest.fixtures.find((fixture) => fixture.id === "gradient-test-paint-opacity");
assert.equal(paintOpacityFixture?.zipSha256, "9da63d95f3a6b661a0c4818908abc39735e63a9b8cdf00e8aa42c243813a0ad3", "Paint-opacity fixture must bind the exact final source-gate ZIP bytes.");
assert.equal(paintOpacityFixture?.embeddedPreview?.sha256, "4d12e49e0b0734f092c34a9257fb3c8b6287ba07ddd638704056bdee8665afc4", "Paint-opacity fixture must bind exact preview bytes.");
assert.equal(paintOpacityFixture?.linearGradientEvidence?.paintOpacity, 0.5, "Paint opacity must remain distinct fixture authority.");
assert.deepEqual(paintOpacityFixture?.linearGradientEvidence?.stopAlphas, [1, 1], "The opacity fixture must not conflate stop alpha with paint opacity.");

const orderedSolidFixtures = [
  ["ordered-solid-blue-then-red", "a5ef4e091e6a46f436705c86fdc6e5a664c4ab1e825742531540410c29b82d8b", "459:49", [0, 1]],
  ["ordered-solid-red-then-blue", "83e0345c7e85aac44f089de56a8c0bcf1d8a9968b45de338e18c34547730d8ff", "459:51", [0, 1]],
  ["ordered-solid-three", "050d0a8f444efca9508688434b80437bfa5a59223eb6808e3ba5d2c58d01bb6d", "459:53", [0, 1, 2]],
  ["ordered-solid-hidden-middle", "644950e26b06d7555f48b260c8d18b0aa2fd16f3fd9a3bcb85093b3fe1b696b1", "459:55", [0, 2]],
  ["ordered-solid-paint-opacity", "d5b76315245df3036fd8ebc74120cfdfa6d4de1eccca14f417271728e2723734", "459:57", [0, 1]],
  ["ordered-solid-independent-corners", "a080321e8689a342f64dca1d3e38b462a07042b04411f1d746af18fcb572bb47", "465:73", [0, 1]],
];
for (const [fixtureId, zipSha256, nodeId, visiblePaintIndices] of orderedSolidFixtures) {
  const fixture = manifest.fixtures.find((entry) => entry.id === fixtureId);
  assert.equal(fixture?.zipSha256, zipSha256, `${fixtureId} must bind the exact source ZIP bytes.`);
  assert.equal(fixture?.orderedSolidEvidence?.nodeId, nodeId, `${fixtureId} must bind the exact source node.`);
  assert.deepEqual(fixture?.orderedSolidEvidence?.visiblePaintIndices, visiblePaintIndices, `${fixtureId} must retain source visibility and order.`);
  const verified = verifyFixture(manifest, fixture);
  const sourceNode = verified.template.nodes[nodeId];
  assert.ok(sourceNode, `${fixtureId} must contain its registered source node.`);
  assert.ok(sourceNode.appearance.fills.length >= 2, `${fixtureId} must remain a multiple-paint source fixture.`);
  assert.ok(sourceNode.appearance.fills.every((paint) => paint.type === "SOLID"), `${fixtureId} must isolate SOLID paints.`);
}

const orderedSolidLinearFixture = manifest.fixtures.find(
  (entry) => entry.id === "ordered-solid-linear-normal",
);
assert.equal(
  orderedSolidLinearFixture?.zipSha256,
  "781e54def68e2dd769c96f9bc2a7152c9e0ab7db4f1137844d6fa15c019ace94",
  "The ordered SOLID plus linear-gradient fixture must bind the exact issue-reproduction ZIP bytes.",
);
assert.equal(
  orderedSolidLinearFixture?.templateJsonSha256,
  "6060987914aa5c377c44da4ca051fcb7f679ca1659586bf1d6872ef2e440fc75",
  "The mixed ordered-paint fixture must bind exact template bytes.",
);
assert.deepEqual(
  orderedSolidLinearFixture?.orderedNormalPaintEvidence?.sourceOrder,
  ["SOLID", "GRADIENT_LINEAR"],
  "The registered fixture must retain the certified back-to-front layer pattern.",
);
const orderedSolidLinearVerified = verifyFixture(manifest, orderedSolidLinearFixture);
assert.equal(
  orderedSolidLinearVerified.template.nodes["459:68"].appearance.fills[1].type,
  "GRADIENT_LINEAR",
  "The exact target node must retain the linear-gradient layer at source index 1.",
);
assert.deepEqual(
  manifest.fixtures.find((entry) => entry.id === "ordered-solid-independent-corners")?.orderedSolidEvidence?.corners,
  [120, 48, 84, 24],
  "The independent-corner fixture must retain its exact corner geometry.",
);

const duplicate = structuredClone(manifest);
duplicate.fixtures.push(structuredClone(duplicate.fixtures[0]));
assert.throws(() => validateManifest(duplicate), /Duplicate fixture ID/, "Duplicate fixture IDs should fail.");
assert.throws(() => verifyFixture(manifest, manifest.fixtures[0], { [manifest.fixtureDirectoryEnv]: join(tmpdir(), "missing-fidelity-fixtures") }), /Missing fixture/, "Missing fixture files should fail.");
assert.deepEqual(selectFixtures(manifest, "now-hiring-post").map((item) => item.id), ["now-hiring-post"], "Single-fixture filter should use exact IDs.");
assert.deepEqual(selectSurfaces("editor"), ["editor"], "Single-surface filter should use registered surface IDs.");
assert.throws(() => selectFixtures(manifest, "now-hiring"), /Unknown fixture ID/, "Similar fixture names must not be substituted.");

const snapshot = { runId: "a", captureTimestamp: "now", timings: { captureMs: 1 }, nodes: [{ id: "root", bounds: { x: 1.00001, y: 2, width: 3, height: 4 } }] };
const normalized = normalizeStructuralSnapshot(snapshot);
assert.equal(normalized.runId, undefined, "Structural normalization should remove run IDs.");
assert.equal(normalized.captureTimestamp, undefined, "Structural normalization should remove timestamps.");
assert.equal(normalized.nodes[0].bounds.x, 1, "Structural normalization should round geometry.");

const baseStructure = { nodes: [{ id: "a", parentId: null, bounds: { x: 0, y: 0, width: 10, height: 10 } }, { id: "b", parentId: "a", bounds: { x: 1, y: 1, width: 2, height: 2 }, textMeasurement: { width: 2, height: 2 }, imageSlot: { x: 1, y: 1, width: 2, height: 2 } }] };
const withinTolerance = structuredClone(baseStructure);
withinTolerance.nodes[1].bounds.x = 1.2;
assert.equal(compareGeometry(baseStructure, withinTolerance).equal, true, "Geometry within tolerance should pass.");
const changed = structuredClone(baseStructure);
changed.nodes[1].bounds.width = 5;
assert.equal(compareGeometry(baseStructure, changed).geometryChanges.length, 1, "Geometry outside tolerance should report changes.");
const transformed = structuredClone(baseStructure);
baseStructure.nodes[1].transform = [1, 0, 0, 1];
transformed.nodes[1].transform = [1, 0.01, 0, 1];
assert.equal(compareGeometry(baseStructure, transformed).geometryChanges[0].transformChanged, true, "Transform changes outside tolerance should be reported.");
const missing = { nodes: [baseStructure.nodes[0], { id: "c", parentId: "a", bounds: { x: 0, y: 0, width: 1, height: 1 } }] };
const missingReport = compareGeometry(baseStructure, missing);
assert.deepEqual(missingReport.missingNodes, ["b"], "Missing nodes should be reported.");
assert.deepEqual(missingReport.extraNodes, ["c"], "Extra nodes should be reported.");
const reordered = { nodes: [...baseStructure.nodes].reverse() };
assert.ok(compareGeometry(baseStructure, reordered).reorderedNodes.length, "Reordered nodes should be reported.");

const black = png(4, 4);
const white = png(4, 4, [255, 255, 255, 255]);
const dimensionMismatch = comparePng(black, png(5, 4));
assert.equal(dimensionMismatch.dimensionsEqual, false, "PNG dimension mismatch should be explicit.");
const pixelMismatch = comparePng(black, white);
assert.equal(pixelMismatch.changedPixelCount, 16, "Pixel comparison should count changed pixels.");
assert.ok(pixelMismatch.differenceImage?.length, "Pixel comparison should generate a difference image.");
assert.deepEqual(pixelMismatch.differenceBounds, { x: 0, y: 0, width: 4, height: 4 }, "Pixel comparison should report difference bounds.");

const repeatability = createRepeatabilityReport([
  { structure: baseStructure, timings: { captureMs: 1 }, fontReadiness: { status: "loaded" } },
  { structure: structuredClone(baseStructure), timings: { captureMs: 2 }, fontReadiness: { status: "loaded" }, pixelRepeat: { equal: true } },
]);
assert.equal(repeatability.stable, true, "Repeatability report should classify stable geometry, pixels, and fonts.");
assert.equal(repeatability.comparisons[0].timingVariationMs.captureMs, 1, "Repeatability report should retain timing variation.");

const environment = environmentMetadata({ name: "test-browser", version: "1", loadedFonts: [] });
assert.equal(environment.gitCommit, null, "Environment metadata must not fabricate Git metadata.");
assert.equal(environment.browser, "test-browser", "Environment metadata should retain browser identity.");

const temporary = mkdtempSync(join(tmpdir(), "renderer-fidelity-test-"));
const candidatePng = join(temporary, "candidate.png");
const candidateStructure = join(temporary, "candidate.json");
writeFileSync(candidatePng, black);
writeFileSync(candidateStructure, JSON.stringify(baseStructure));
assert.throws(() => requireUpdateReason(""), /requires/, "Reference update should require a reason.");
const updateOne = updateApprovedReference({ fixtureId: "fixture", surface: "editor", candidatePng, candidateStructure, environment, fixtureIdentity: { zipSha256: "a".repeat(64) }, reason: "Initial reviewed baseline", approvedRoot: join(temporary, "approved"), evidenceRoot: join(temporary, "evidence"), timestamp: "2026-07-13T10:00:00.000Z" });
assert.ok(existsSync(join(updateOne.approvedDir, "reference.png")), "Explicit update should create an approved reference.");
const approvedHash = approvedReferenceHash(join(updateOne.approvedDir, "reference.png"));
assert.doesNotThrow(() => assertReferenceImmutable(approvedHash, approvedReferenceHash(join(updateOne.approvedDir, "reference.png"))), "Unchanged references should pass immutability guard.");
assert.throws(() => assertReferenceImmutable(approvedHash, "changed"), /must not modify/, "Reference mutation should fail.");
writeFileSync(candidatePng, white);
const updateTwo = updateApprovedReference({ fixtureId: "fixture", surface: "editor", candidatePng, candidateStructure, environment, fixtureIdentity: { zipSha256: "a".repeat(64) }, reason: "Reviewed fidelity correction", approvedRoot: join(temporary, "approved"), evidenceRoot: join(temporary, "evidence"), timestamp: "2026-07-13T11:00:00.000Z" });
assert.ok(existsSync(join(updateTwo.evidenceDir, "previous.png")) && existsSync(join(updateTwo.evidenceDir, "candidate.png")) && existsSync(join(updateTwo.evidenceDir, "difference.png")), "Reference update evidence should retain before, after, and diff images.");

const failureCandidateDir = join(temporary, "candidate-dir");
const failureCandidate = { directory: failureCandidateDir, png: candidatePng, structure: candidateStructure };
const failureApproved = { png: join(updateTwo.approvedDir, "reference.png"), structure: join(updateTwo.approvedDir, "structure.json") };
const failureDir = retainFailureArtifacts({ fixture: { id: "fixture", zipSha256: "a".repeat(64) }, surface: "editor", runId: "run-1", candidate: failureCandidate, approved: failureApproved, pixel: comparePng(black, white), geometry: { equal: false }, environment, result: { route: "/drafts/id", fullDurationMs: 10, surfaces: { editor: [{ timings: { captureMs: 1 }, fontReadiness: { status: "loaded" } }] } }, artifactsRoot: join(temporary, "failures") });
assert.ok(existsSync(join(failureDir, "approved-reference.png")) && existsSync(join(failureDir, "current-candidate.png")) && existsSync(join(failureDir, "difference.png")) && existsSync(join(failureDir, "comparison.json")), "Failed comparisons should retain review artifacts.");
assert.match(artifactDirectory(temporary, "run id", "fixture/id", "png export"), /run-id.*fixture-id.*png-export/, "Artifact paths should sanitize stable segments.");

assert.ok(readFileSync(join(updateTwo.evidenceDir, "update.json"), "utf8").includes("Reviewed fidelity correction"), "Reference evidence should retain the developer reason.");
console.log("Renderer fidelity harness unit tests passed.");

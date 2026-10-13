import assert from "node:assert/strict";
import { loadManifest } from "./core.mjs";
import { assertSdkGateCaptureRun, gateFixtureSelection, loadSdkGateProfile, selectSdkGateFixtures } from "./gate-profile.mjs";
import { sdkGateSourceReviewComplete, validateSdkGateDisposition } from "./gate-disposition.mjs";
import { validateSdkGateComparisons, validateSdkGateEnvironments } from "./gate-evidence.mjs";

const manifest = loadManifest();
const profile = loadSdkGateProfile();
const fixtures = selectSdkGateFixtures(manifest, profile);
assert.deepEqual(fixtures.map(item => item.id), ["exporter-061-now-hiring", "exporter-061-cover", "exporter-061-carrousel"]);
assert.equal(new Set(fixtures.map(item => item.id)).size, 3);
assert(fixtures.every(item => item.exporterVersion === "0.6.1"));
assert.deepEqual(gateFixtureSelection(manifest, { gate: "sdk-061" }).map(item => item.id), fixtures.map(item => item.id));
assert.throws(() => gateFixtureSelection(manifest, { gate: "sdk-061", fixture: fixtures[0].id }), /cannot be narrowed/);
assert.throws(() => selectSdkGateFixtures(manifest, { ...profile, fixtures: [profile.fixtures[0], profile.fixtures[0], ...profile.fixtures.slice(2)] }), /duplicate/);
assert.throws(() => selectSdkGateFixtures(manifest, { ...profile, fixtures: [{ ...profile.fixtures[0], id: "missing" }, ...profile.fixtures.slice(1)] }), /missing from the registry/);
assert.throws(() => selectSdkGateFixtures(manifest, { ...profile, fixtures: [{ ...profile.fixtures[0], zipSha256: "0".repeat(64) }, ...profile.fixtures.slice(1)] }), /identity differs/);
assert.throws(() => selectSdkGateFixtures(manifest, { ...profile, fixtures: [{ ...profile.fixtures[0], templateJsonSha256: "0".repeat(64) }, ...profile.fixtures.slice(1)] }), /identity differs/);

const run = {
  runId: "sdk-test", gate: "sdk-061", selectedFixtures: fixtures.map(item => item.id),
  selectedSurfaces: profile.surfaces, expectedRepeat: 2,
  fixtures: fixtures.map(item => ({ id: item.id, zipSha256: item.zipSha256 })),
  summaries: fixtures.map(item => ({ fixtureId: item.id, error: null, repeatability: Object.fromEntries(profile.surfaces.map(surface => [surface, { repeatCount: 2, stable: true }])) })),
};
assert.doesNotThrow(() => assertSdkGateCaptureRun(run, fixtures, "sdk-test"));
assert.throws(() => assertSdkGateCaptureRun(run, fixtures, "other-run"), /run identity differs/);
assert.throws(() => assertSdkGateCaptureRun({ ...run, selectedFixtures: run.selectedFixtures.slice(1) }, fixtures, "sdk-test"), /fixture selection differs/);
assert.throws(() => assertSdkGateCaptureRun({ ...run, summaries: run.summaries.slice(1) }, fixtures, "sdk-test"), /missing capture summary/);
assert.throws(() => assertSdkGateCaptureRun({ ...run, summaries: [run.summaries[0], ...run.summaries] }, fixtures, "sdk-test"), /duplicated/);
assert.throws(() => assertSdkGateCaptureRun({ ...run, summaries: run.summaries.map((item, index) => index === 0 ? { ...item, repeatability: { ...item.repeatability, editor: { repeatCount: 1, stable: true } } } : item) }, fixtures, "sdk-test"), /incomplete repeats/);
const reviewEntry = { capture: "complete-stable", comparison: "pass", sourceReview: "reviewed-source-faithful", reviewerRationale: "Compared exact source and approved output.", cause: "Source-faithful.", regenerate: "node gate" };
const disposition = { schemaVersion: "sdk-061-dispositions-v1", gate: "sdk-061", runId: "sdk-test", environmentSha256: "environment-hash", fixtures: fixtures.map(item => ({ id: item.id, zipSha256: item.zipSha256, templateJsonSha256: item.templateJsonSha256, embeddedPreviewSha256: item.embeddedPreview.sha256, surfaces: Object.fromEntries(profile.surfaces.map(surface => [surface, reviewEntry])), scene: { sourceReview: "reviewed-source-faithful", reviewerRationale: "Reviewed scene." }, settlement: Object.fromEntries(profile.surfaces.map(surface => [surface, { sourceReview: "reviewed-source-faithful", reviewerRationale: "Reviewed settlement." }])) })) };
assert.doesNotThrow(() => validateSdkGateDisposition(disposition, fixtures, "sdk-test", "environment-hash"));
assert.equal(sdkGateSourceReviewComplete(disposition), true);
assert.throws(() => validateSdkGateDisposition(disposition, fixtures, "other-run", "environment-hash"), /cross-run/);
assert.throws(() => validateSdkGateDisposition(disposition, fixtures, "sdk-test", "other-environment"), /environment identity differs/);
assert.throws(() => validateSdkGateDisposition({ ...disposition, fixtures: disposition.fixtures.slice(1) }, fixtures, "sdk-test", "environment-hash"), /missing disposition/);
assert.equal(sdkGateSourceReviewComplete({ ...disposition, fixtures: [{ ...disposition.fixtures[0], surfaces: { ...disposition.fixtures[0].surfaces, editor: { ...reviewEntry, sourceReview: "pending" } } }, ...disposition.fixtures.slice(1)] }), false);
const renderer = { runId: "sdk-test", gate: "sdk-061", comparisons: fixtures.flatMap(item => profile.surfaces.map(surface => ({ fixtureId: item.id, surface, status: "pass" }))) };
const scene = { runId: "sdk-test", gate: "sdk-061", sourceFidelityRun: "sdk-test", comparisons: fixtures.map(item => ({ fixtureId: item.id, status: "pass" })) };
const settlement = { runId: "sdk-test", gate: "sdk-061", sourceFidelityRun: "sdk-test", comparisons: fixtures.flatMap(item => profile.surfaces.map(surface => ({ fixtureId: item.id, surface, equal: true }))) };
assert.equal(validateSdkGateComparisons({ runId: "sdk-test", fixtures, renderer, scene, settlement }), true);
assert.throws(() => validateSdkGateComparisons({ runId: "sdk-test", fixtures, renderer: { ...renderer, comparisons: renderer.comparisons.slice(1) }, scene, settlement }), /missing/);
assert.throws(() => validateSdkGateComparisons({ runId: "sdk-test", fixtures, renderer: { ...renderer, comparisons: [renderer.comparisons[0], ...renderer.comparisons] }, scene, settlement }), /duplicate/);
assert.throws(() => validateSdkGateComparisons({ runId: "sdk-test", fixtures, renderer, scene: { ...scene, sourceFidelityRun: "other" }, settlement }), /not bound/);
assert.equal(validateSdkGateEnvironments({ fidelity: { browser: "Chromium", fontProfile: "source-authoritative" }, scene: { browser: "Chromium", fontProfile: "source-authoritative" }, settlement: { source: { browser: "Chromium", fontProfile: "source-authoritative" } } }), true);
assert.throws(() => validateSdkGateEnvironments({ fidelity: { browser: "Chromium" }, scene: { browser: "other" }, settlement: { source: { browser: "Chromium" } } }), /environment differs/);
console.log("SDK 0.6.1 gate profile, identity, and capture integrity passed.");

#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";
import { unzipSync } from "fflate";
import { browserStructure, launchBrowser, waitForCurrentReadiness } from "../fidelity/browser.mjs";
import { loadManifest, parseArguments, repoRoot, stableStringify, verifyFixture } from "../fidelity/core.mjs";

const args = parseArguments(process.argv.slice(2));
const fixtureId = "deal-of-the-week-banner-crop-editable";
const manifest = loadManifest();
const fixture = manifest.fixtures.find((item) => item.id === fixtureId);
if (!fixture) throw new Error(`Registered ${fixtureId} fixture is required.`);
const verified = verifyFixture(manifest, fixture);
const runId = String(args["run-id"] || `replacement-authority-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const output = join(repoRoot, "fidelity", "evidence", "image-replacement", runId);
const headed = Boolean(args.headed);
mkdirSync(output, { recursive: true });

const entries = unzipSync(new Uint8Array(verified.bytes));
const replacementBytes = entries[fixture.embeddedPreview.entry];
if (!replacementBytes) throw new Error("Exact fixture has no embedded preview replacement source.");
const replacementPath = join(output, "replacement-source.png");
writeFileSync(replacementPath, replacementBytes);
const replacementAssetBytes = entries[fixture.mediaFieldEvidence.sharedAsset.assetPath];
if (!replacementAssetBytes) throw new Error("Exact fixture has no registered shared image asset.");
const replacementAssetPath = join(output, "replacement-source-asset.png");
writeFileSync(replacementAssetPath, replacementAssetBytes);

const fieldEvidence = fixture.mediaFieldEvidence.fields;
const nodeByField = Object.fromEntries(fieldEvidence.map((field) => [field.fieldId, field.nodeId]));
const selector = '[data-testid="package-working-preview"] [data-template-package-canvas]';

const server = await createServer({ root: repoRoot, logLevel: "error", server: { host: "127.0.0.1", port: Number(args.port || 0), strictPort: Boolean(args.port) } });
await server.listen();
const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
if (!baseUrl) throw new Error("Replacement scenario server did not publish a local URL.");
const browser = await launchBrowser(headed);
const context = await browser.newContext({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", acceptDownloads: true, reducedMotion: "reduce" });
const page = await context.newPage();
const consoleMessages = [];
page.on("console", (message) => { if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() }); });
page.on("pageerror", (error) => consoleMessages.push({ type: "pageerror", text: error.message }));

async function waitForAutosave() {
  const status = page.getByTestId("package-autosave-status");
  if (await status.count()) await status.filter({ hasText: "Saved" }).waitFor({ timeout: 10_000 });
}

async function exportPng(id) {
  const downloadPromise = page.waitForEvent("download");
  const started = performance.now();
  await page.getByTestId("package-export-png-button").click();
  const download = await downloadPromise;
  const path = join(output, `${id}-png-export.png`);
  await download.saveAs(path);
  return { path, durationMs: performance.now() - started, suggestedFilename: download.suggestedFilename() };
}

async function capture(id, fieldId = null, includePng = false) {
  const readiness = await waitForCurrentReadiness(page, selector);
  const first = await browserStructure(page, selector);
  const second = await browserStructure(page, selector);
  const nodes = Object.fromEntries(fieldEvidence.map((field) => {
    const node = first.nodes.find((item) => item.id === field.nodeId);
    const backendDecision = first.backendRouting?.decisions?.find(
      (decision) => decision.nodeId === field.nodeId,
    );
    if (!node) throw new Error(`Capture ${id} has no node ${field.nodeId}.`);
    if (!backendDecision) throw new Error(`Capture ${id} has no backend decision for ${field.nodeId}.`);
    return [field.fieldId, {
      nodeId: field.nodeId,
      sourceScaleMode: field.sourceScaleMode,
      assetId: node.dataAttributes?.["data-package-image-asset"],
      activePlacementState: node.imagePlacement?.activePlacementState,
      placementRevision: node.imagePlacement?.placementRevision,
      scaleMode: node.imagePlacement?.scaleMode,
      strategy: node.imagePlacement?.strategy,
      transformApplicability: node.imagePlacement?.transformApplicability,
      sourceTransform: node.imagePlacement?.sourceTransform,
      visibleSourceRect: node.imagePlacement?.visibleSourceRect,
      visibleSourcePolygon: node.imagePlacement?.visibleSourcePolygon,
      destinationBounds: node.imagePlacement?.destinationBounds,
      slot: node.bounds,
      clipOrMaskStrategy: node.clipOrMaskStrategy,
      backendDecision,
    }];
  }));
  const record = {
    id,
    fieldId,
    route: new URL(page.url()).pathname,
    readiness,
    repeatStructureExact: stableStringify(first) === stableStringify(second),
    runtimeRouting: first.runtimeRouting,
    nodes,
    pngExport: includePng ? await exportPng(id) : null,
  };
  writeFileSync(join(output, `${id}.json`), stableStringify(record));
  await page.locator(selector).screenshot({ path: join(output, `${id}.png`) });
  return record;
}

function fieldContainer(fieldId) {
  return page.locator(`[data-package-field-id="${fieldId}"]`);
}

async function setMode(fieldId, value) {
  await fieldContainer(fieldId).getByLabel("Replacement placement").selectOption(value);
}

async function upload(fieldId) {
  const label = fieldEvidence.find((field) => field.fieldId === fieldId)?.label;
  await page.getByLabel(`${label} image`, { exact: true }).setInputFiles(replacementPath);
  await fieldContainer(fieldId).getByRole("button", { name: "Clear replacement" }).waitFor();
}

const results = [];
try {
  await page.goto(`${baseUrl}/templates/new`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("zip-package-input").setInputFiles(verified.path);
  await page.getByRole("button", { name: "Import template" }).click();
  await page.getByTestId("package-step-prepare-fonts").waitFor();
  const replacements = page.getByRole("button", { name: "Use replacement" });
  for (let index = (await replacements.count()) - 1; index >= 0; index -= 1) await replacements.nth(index).click();
  await page.getByRole("button", { name: "Check template" }).click();
  await page.getByTestId("package-step-validate").waitFor();
  await page.getByRole("button", { name: "Continue to fields" }).click();
  await page.getByTestId("package-step-fields").waitFor();
  await page.getByRole("button", { name: "Continue to template details" }).click();
  await page.getByLabel("Template name").fill(`Replacement authority ${runId}`);
  await page.getByRole("button", { name: "Add template", exact: true }).click();
  await page.getByRole("button", { name: `Open template Replacement authority ${runId}` }).click();
  await page.getByTestId("package-editor-panel").waitFor();
  results.push(await capture("imported-source", null, true));

  for (const field of fieldEvidence) {
    await upload(field.fieldId);
    results.push(await capture(`${field.fieldId}-replacement-fill`, field.fieldId, true));
    await setMode(field.fieldId, "replacement-fit");
    results.push(await capture(`${field.fieldId}-replacement-fit`, field.fieldId, true));
    await setMode(field.fieldId, "replacement-fill");
    results.push(await capture(`${field.fieldId}-fill-after-fit`, field.fieldId));
    await waitForAutosave();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByTestId("package-editor-panel").waitFor();
    results.push(await capture(`${field.fieldId}-replacement-fill-reload`, field.fieldId));
    await setMode(field.fieldId, "replacement-fit");
    await waitForAutosave();
    results.push(await capture(`${field.fieldId}-replacement-fit-before-reload`, field.fieldId));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByTestId("package-editor-panel").waitFor();
    results.push(await capture(`${field.fieldId}-replacement-fit-reload`, field.fieldId));
    await fieldContainer(field.fieldId).getByRole("button", { name: "Clear replacement" }).click();
    results.push(await capture(`${field.fieldId}-reset`, field.fieldId, true));
    await waitForAutosave();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByTestId("package-editor-panel").waitFor();
    results.push(await capture(`${field.fieldId}-reset-reload`, field.fieldId));
  }

  const staleField = fieldEvidence.find((field) => field.fieldId === "main");
  if (!staleField) throw new Error("Main CROP field is required for stale-operation evidence.");
  await page.evaluate(() => { window.__templatePackageImageDecodeDelayMs = 750; });
  const staleInput = page.getByLabel(`${staleField.label} image`, { exact: true });
  await staleInput.setInputFiles(replacementPath);
  await staleInput.setInputFiles(replacementAssetPath);
  await fieldContainer(staleField.fieldId).getByRole("button", { name: "Clear replacement" }).waitFor();
  const rapidPackage = await page.evaluate(() => window.__templatePackageRuntimeRoutingHarness?.getPackage());
  const rapidAssetId = rapidPackage.nodes[nodeByField.main].image.assetId;
  const rapidAsset = rapidPackage.assets[rapidAssetId];
  const rapid = await capture("main-rapid-replacement", "main");
  rapid.finalAssetDimensions = { width: rapidAsset.width, height: rapidAsset.height };
  writeFileSync(join(output, "main-rapid-replacement.json"), stableStringify(rapid));
  await fieldContainer(staleField.fieldId).getByRole("button", { name: "Clear replacement" }).click();
  await waitForCurrentReadiness(page, selector);
  await staleInput.setInputFiles(replacementPath);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.waitForTimeout(900);
  const resetBeforeDecode = await capture("main-reset-before-decode", "main");
  results.push(rapid, resetBeforeDecode);
  await page.evaluate(() => { delete window.__templatePackageImageDecodeDelayMs; });

  const imported = results[0];
  const checks = [];
  for (const field of fieldEvidence) {
    const fill = results.find((item) => item.id === `${field.fieldId}-replacement-fill`);
    const fit = results.find((item) => item.id === `${field.fieldId}-replacement-fit`);
    const reset = results.find((item) => item.id === `${field.fieldId}-reset`);
    const fillReload = results.find((item) => item.id === `${field.fieldId}-replacement-fill-reload`);
    const fillBeforeReload = results.find((item) => item.id === `${field.fieldId}-fill-after-fit`);
    const fitReload = results.find((item) => item.id === `${field.fieldId}-replacement-fit-reload`);
    const fitBeforeReload = results.find((item) => item.id === `${field.fieldId}-replacement-fit-before-reload`);
    const resetReload = results.find((item) => item.id === `${field.fieldId}-reset-reload`);
    checks.push({
      fieldId: field.fieldId,
      importedSourceMode: imported.nodes[field.fieldId].scaleMode === field.sourceScaleMode,
      importedState: imported.nodes[field.fieldId].activePlacementState === "imported-source",
      replacementFill: fill.nodes[field.fieldId].activePlacementState === "replacement-fill" && fill.nodes[field.fieldId].strategy === "cover" && fill.nodes[field.fieldId].transformApplicability !== "active-crop",
      replacementFit: fit.nodes[field.fieldId].activePlacementState === "replacement-fit" && fit.nodes[field.fieldId].strategy === "contain" && fit.nodes[field.fieldId].transformApplicability !== "active-crop",
      fillReload: fillReload.nodes[field.fieldId].activePlacementState === "replacement-fill",
      fitReload: fitReload.nodes[field.fieldId].activePlacementState === "replacement-fit",
      reset: reset.nodes[field.fieldId].activePlacementState === "imported-source" && reset.nodes[field.fieldId].scaleMode === field.sourceScaleMode,
      resetReload: resetReload.nodes[field.fieldId].activePlacementState === "imported-source" && resetReload.nodes[field.fieldId].scaleMode === field.sourceScaleMode,
      fillReloadBackendIdentity: stableStringify(fillBeforeReload.nodes[field.fieldId].backendDecision) === stableStringify(fillReload.nodes[field.fieldId].backendDecision),
      fitReloadBackendIdentity: stableStringify(fitBeforeReload.nodes[field.fieldId].backendDecision) === stableStringify(fitReload.nodes[field.fieldId].backendDecision),
      resetReloadBackendIdentity: stableStringify(reset.nodes[field.fieldId].backendDecision) === stableStringify(resetReload.nodes[field.fieldId].backendDecision),
      independentSharedAssetMode: fieldEvidence.every((other) => reset.nodes[other.fieldId].scaleMode === other.sourceScaleMode),
    });
  }
  const passed = checks.every((check) => Object.entries(check).every(([key, value]) => key === "fieldId" || value === true));
  const staleChecks = {
    rapidReplacementNewestWins:
      rapid.finalAssetDimensions.width === 1125 &&
      rapid.finalAssetDimensions.height === 750 &&
      rapid.nodes.main.activePlacementState === "replacement-fill",
    resetBeforeDecodeRejectsStale:
      resetBeforeDecode.nodes.main.activePlacementState === "imported-source" &&
      resetBeforeDecode.nodes.main.scaleMode === "CROP" &&
      resetBeforeDecode.nodes.main.assetId === fixture.mediaFieldEvidence.sharedAsset.assetId,
  };
  const fullyPassed = passed && Object.values(staleChecks).every(Boolean);
  writeFileSync(join(output, "run.json"), stableStringify({
    schemaVersion: "image-replacement-authority-run-v1",
    runId,
    headed,
    fixture: { id: fixture.id, path: verified.path, byteSize: fixture.byteSize, zipSha256: fixture.zipSha256, previewSha256: fixture.embeddedPreview.sha256, packageId: fixture.packageId, exporterVersion: fixture.exporterVersion },
    replacementSource: replacementPath,
    nodeByField,
    checks,
    staleChecks,
    passed: fullyPassed,
    referencesModified: false,
    consoleMessages,
    results: results.map(({ readiness, ...item }) => ({ ...item, readiness: { stable: readiness.stable, durationMs: readiness.durationMs, fontReadiness: readiness.fontReadiness, assetReadiness: readiness.assetReadiness } })),
  }));
  console.log(`[image-replacement] run=${runId} passed=${fullyPassed} output=${output}`);
  for (const check of checks) console.log(`[image-replacement] field=${check.fieldId} passed=${Object.entries(check).every(([key, value]) => key === "fieldId" || value === true)}`);
  console.log(`[image-replacement] stale=${Object.values(staleChecks).every(Boolean)}`);
  if (!fullyPassed) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
  await server.close();
}

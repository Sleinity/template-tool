#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { PNG } from "pngjs";
import { importTemplatePackage, normalizeTemplatePackageV1ToV2 } from "@sleinity/template-core";
import { browserStructure, launchBrowser, waitForCurrentReadiness } from "../fidelity/browser.mjs";
import { loadManifest, parseArguments, repoRoot, stableStringify, verifyFixture } from "../fidelity/core.mjs";
import { comparePng } from "../fidelity/image.mjs";
import { createStudioViteServer } from "../repository/studio-vite-server.mjs";
import { applyCompatibilityFontFallbacks } from "../repository/studio-font-harness.mjs";

const args = parseArguments(process.argv.slice(2));
const fixtureId = "field-rules-boolean-structural-visibility";
const runId = String(args["run-id"] || `boolean-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const outputRoot = join(repoRoot, "fidelity", "runtime-routing", "boolean", runId);
const manifest = loadManifest();
const fixture = manifest.fixtures.find((item) => item.id === fixtureId);
if (!fixture) throw new Error(`Missing exact fixture registration ${fixtureId}.`);
const verified = verifyFixture(manifest, fixture);
const entries = unzipSync(new Uint8Array(verified.bytes));
const previewBytes = entries[fixture.embeddedPreview.entry];
const templateBytes = entries["template.json"];
if (!previewBytes || !templateBytes) throw new Error("Boolean source ZIP must include preview.png and template.json.");
const template = JSON.parse(Buffer.from(templateBytes).toString("utf8"));
const selector = '[data-testid="package-working-preview"] [data-template-package-canvas]';
const nodeIds = {
  root: "859:29",
  content: "859:30",
  logoBar: "859:31",
  logoRow: "859:32",
  logo: "859:33",
  enddateText: "859:34",
  headlineControl: "859:35",
  headlineSection: "859:36",
  headlineText: "859:37",
  followingFill: "859:38",
  enddateControl: "859:48",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function close(left, right, tolerance = 0.1) {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= tolerance;
}

function cropPng(bytes, bounds) {
  const source = PNG.sync.read(bytes);
  const output = new PNG({ width: bounds.width, height: bounds.height });
  PNG.bitblt(source, output, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0);
  return PNG.sync.write(output);
}

function plainComparison(comparison) {
  return { ...comparison, differenceImage: undefined };
}

function node(structure, id) {
  return structure.nodes.find((item) => item.id === id) ?? null;
}

function sourceField(id) {
  return template.editableFields.find((field) => field.id === id);
}

function verifySourceContract() {
  const headline = sourceField("showHeadline");
  const enddate = sourceField("showEnddate");
  assert(headline?.type === "boolean" && headline.property === "visible" && headline.nodeId === nodeIds.headlineControl && headline.defaultValue === true, "showHeadline source binding changed.");
  assert(enddate?.type === "boolean" && enddate.property === "visible" && enddate.nodeId === nodeIds.enddateControl && enddate.defaultValue === true, "showEnddate source binding changed.");

  const content = template.nodes[nodeIds.content];
  const headlineNode = template.nodes[nodeIds.headlineControl];
  const following = template.nodes[nodeIds.followingFill];
  assert(content.children.join(",") === `${nodeIds.logoBar},${nodeIds.headlineControl}`, "Headline participant is no longer the second FLOW child of content-section.");
  assert(content.layout.mode === "VERTICAL" && content.sizing.vertical.mode === "HUG" && headlineNode.positioning === "FLOW", "Headline source no longer provides vertical HUG structural-reflow evidence.");
  assert(following.parentId === nodeIds.root && following.positioning === "FLOW" && following.sizing.vertical.mode === "FILL", "Following source node no longer provides FILL reflow evidence.");

  const row = template.nodes[nodeIds.logoRow];
  const enddateNode = template.nodes[nodeIds.enddateControl];
  assert(row.children.join(",") === `${nodeIds.logo},${nodeIds.enddateControl}`, "End-date participant is no longer the second FLOW child of logo-row.");
  assert(row.layout.mode === "HORIZONTAL" && row.layout.primaryAlignment === "SPACE_BETWEEN" && row.sizing.vertical.mode === "FIXED" && enddateNode.positioning === "FLOW", "End-date source no longer provides fixed SPACE_BETWEEN participation evidence.");
  return { headline, enddate, content, headlineNode, following, row, enddateNode };
}

const sourceContract = verifySourceContract();
const fixtureArrayBuffer = verified.bytes.buffer.slice(
  verified.bytes.byteOffset,
  verified.bytes.byteOffset + verified.bytes.byteLength,
);
const imported = importTemplatePackage(fixtureArrayBuffer, verified.path);
assert(imported.importable && imported.workingPackage, "Boolean source ZIP must pass strict package import.");
const normalized = normalizeTemplatePackageV1ToV2(imported.workingPackage);
assert(normalized.package, "Boolean source ZIP must normalize once into strict TemplatePackageV2.");
const normalizedBooleans = normalized.package.editableFields
  .filter((field) => field.type === "boolean")
  .map((field) => ({ id: field.id, binding: field.binding, defaultValue: field.defaultValue }));
assert(stableStringify(normalizedBooleans) === stableStringify([
  { id: "boolean:showEnddate", binding: { kind: "structural-visibility", nodeId: nodeIds.enddateControl }, defaultValue: true },
  { id: "boolean:showHeadline", binding: { kind: "structural-visibility", nodeId: nodeIds.headlineControl }, defaultValue: true },
]), "V1 source normalization did not retain both exact V2 structural bindings.");

async function capture(page, id, canvasSelector = selector) {
  const readiness = await waitForCurrentReadiness(page, canvasSelector);
  const structure = await browserStructure(page, canvasSelector);
  const directory = join(outputRoot, id);
  mkdirSync(directory, { recursive: true });
  const screenshotPath = join(directory, "renderer.png");
  await page.locator(canvasSelector).screenshot({ path: screenshotPath, animations: "disabled", caret: "hide", scale: "css" });
  const result = {
    id,
    readiness,
    runtimeRouting: structure.runtimeRouting,
    canvas: structure.canvas,
    nodes: Object.fromEntries(Object.values(nodeIds).map((target) => [target, node(structure, target)])),
    screenshotSha256: sha256(readFileSync(screenshotPath)),
  };
  writeFileSync(join(directory, "evidence.json"), stableStringify(result));
  return result;
}

async function selectValidatePreview(page, canvasSelector) {
  const previewFilter = page.getByRole("button", { name: /^Preview(?:\s|$)/ });
  if (await previewFilter.count()) await previewFilter.first().click();
  if (await page.locator(canvasSelector).waitFor({ state: "attached", timeout: 1_500 }).then(() => true, () => false)) return;
  const groups = page.getByTestId("quality-issue-group");
  for (let index = 0; index < await groups.count(); index += 1) {
    await groups.nth(index).locator("button").first().click();
    if (await page.locator(canvasSelector).count()) return;
  }
  throw new Error("Validate did not expose a live renderer preview.");
}

async function exportPng(page, id) {
  const directory = join(outputRoot, id);
  mkdirSync(directory, { recursive: true });
  await waitForCurrentReadiness(page, selector);
  const hiddenStructure = await browserStructure(page, '[data-testid="package-png-export-target"] [data-template-package-canvas]');
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("package-export-png-button").click();
  const download = await downloadPromise;
  const path = join(directory, "export.png");
  await download.saveAs(path);
  const bytes = readFileSync(path);
  return {
    id,
    path,
    suggestedFilename: download.suggestedFilename(),
    sha256: sha256(bytes),
    byteSize: bytes.length,
    hiddenRenderer: {
      runtimeRouting: hiddenStructure.runtimeRouting,
      canvas: hiddenStructure.canvas,
      nodes: Object.fromEntries(Object.values(nodeIds).map((target) => [target, node(hiddenStructure, target)])),
    },
  };
}

function assertSourceBaseline(result, label) {
  const content = result.nodes[nodeIds.content];
  const headline = result.nodes[nodeIds.headlineControl];
  const following = result.nodes[nodeIds.followingFill];
  const row = result.nodes[nodeIds.logoRow];
  const enddate = result.nodes[nodeIds.enddateControl];
  assert(content && headline && following && row && enddate, `${label} did not render both source-visible Boolean subtrees.`);
  // Editor-mode compatibility font substitution can alter the text-backed HUG
  // result by a fraction of a logical pixel. This bound is observational and
  // does not change the fidelity comparison threshold.
  assert(close(content.bounds.height, sourceContract.content.bounds.relative.height, 0.5), `${label} content-section height differs from imported HUG geometry.`);
  assert(close(headline.bounds.height, sourceContract.headlineNode.bounds.relative.height, 0.5), `${label} headline participant height differs from source geometry.`);
  assert(close(following.bounds.y, sourceContract.following.bounds.relative.y, 0.5), `${label} following FILL participant starts at the wrong source position.`);
  assert(close(row.bounds.width, sourceContract.row.bounds.relative.width, 0.5) && close(row.bounds.height, sourceContract.row.bounds.relative.height, 0.5), `${label} fixed end-date row geometry differs from source.`);
}

function assertHeadlineExcluded(result, baseline, label) {
  for (const id of [nodeIds.headlineControl, nodeIds.headlineSection, nodeIds.headlineText]) assert(!result.nodes[id], `${label} retained hidden headline subtree node ${id}.`);
  const content = result.nodes[nodeIds.content];
  const logoBar = result.nodes[nodeIds.logoBar];
  const following = result.nodes[nodeIds.followingFill];
  assert(content && logoBar && following, `${label} lost active surrounding nodes.`);
  assert(close(content.bounds.height, logoBar.bounds.height, 0.25), `${label} did not shrink the HUG content-section to its active child.`);
  assert(close(following.bounds.y, content.bounds.y + content.bounds.height, 0.25), `${label} left occupied space between the HUG section and following FILL participant.`);
  assert(content.bounds.height < baseline.nodes[nodeIds.content].bounds.height - 200, `${label} did not remove the headline participant's occupied height.`);
  assert(result.runtimeRouting.structurallyExcludedNodeCount === 3, `${label} did not report the exact excluded headline subtree.`);
  assert(result.runtimeRouting.structuralExclusionRootIds?.includes(nodeIds.headlineControl), `${label} did not retain the headline exclusion root.`);
}

function assertEnddateExcluded(result, baseline, label) {
  for (const id of [nodeIds.enddateControl, nodeIds.enddateText]) assert(!result.nodes[id], `${label} retained hidden end-date subtree node ${id}.`);
  const row = result.nodes[nodeIds.logoRow];
  const logo = result.nodes[nodeIds.logo];
  const baselineRow = baseline.nodes[nodeIds.logoRow];
  const baselineLogo = baseline.nodes[nodeIds.logo];
  assert(row && logo && baselineRow && baselineLogo, `${label} lost the fixed row or surviving logo.`);
  assert(close(row.bounds.width, baselineRow.bounds.width) && close(row.bounds.height, baselineRow.bounds.height), `${label} invented HUG resizing for the source-fixed SPACE_BETWEEN row.`);
  assert(close(logo.bounds.x, baselineLogo.bounds.x) && close(logo.bounds.y, baselineLogo.bounds.y), `${label} moved the sole remaining start-aligned logo unexpectedly.`);
  assert(result.runtimeRouting.structurallyExcludedNodeCount === 2, `${label} did not report the exact excluded end-date subtree.`);
  assert(result.runtimeRouting.structuralExclusionRootIds?.includes(nodeIds.enddateControl), `${label} did not retain the end-date exclusion root.`);
}

function assertReset(result, baseline, label) {
  for (const id of Object.values(nodeIds)) {
    const current = result.nodes[id];
    const before = baseline.nodes[id];
    assert(Boolean(current) === Boolean(before), `${label} node presence differs after reset for ${id}.`);
    if (!current || !before) continue;
    for (const key of ["x", "y", "width", "height"]) assert(close(current.bounds[key], before.bounds[key], 0.25), `${label} did not restore ${id} ${key}.`);
  }
  assert(!result.runtimeRouting.structurallyExcludedNodeCount, `${label} retained structural exclusion telemetry after reset.`);
}

const server = await createStudioViteServer({ port: Number(args.port || 0), strictPort: Boolean(args.port) });
await server.listen();
const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
if (!baseUrl) throw new Error("Boolean evidence server did not publish a local URL.");
const browser = await launchBrowser(Boolean(args.headed));
const context = await browser.newContext({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", acceptDownloads: true, reducedMotion: "reduce" });
const page = await context.newPage();
const consoleMessages = [];
page.on("console", (message) => {
  if (["error", "warning"].includes(message.type()) && !message.text().includes("favicon.ico")) consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() });
});
page.on("pageerror", (error) => consoleMessages.push({ type: "pageerror", text: error.message }));

try {
  await page.goto(`${baseUrl}/templates/new?studio-mode=single-template-fidelity`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("zip-package-input").setInputFiles(verified.path);
  await page.getByRole("button", { name: "Import template" }).click();
  await page.getByTestId("package-step-prepare-fonts").waitFor();
  const fontFallbacks = await applyCompatibilityFontFallbacks(page);
  await page.getByRole("button", { name: "Check template" }).click();
  await page.getByTestId("package-step-validate").waitFor();
  const validateSelector = '[data-testid="package-step-validate"] [data-template-package-canvas]';
  if (!(await page.locator(validateSelector).count())) await selectValidatePreview(page, validateSelector);
  const validate = await capture(page, "validate-default", validateSelector);
  assertSourceBaseline(validate, "Validate");

  await page.getByRole("button", { name: "Continue to fields" }).click();
  await page.getByTestId("package-step-fields").waitFor();
  const fieldsSelector = '[data-testid="package-step-fields"] [data-template-package-canvas]';
  const fields = await capture(page, "fields-default", fieldsSelector);
  assertSourceBaseline(fields, "Fields");

  await page.getByRole("button", { name: "Continue to template details" }).click();
  const templateName = `Boolean source ${runId}`;
  await page.getByLabel("Template name").fill(templateName);
  await page.getByRole("button", { name: "Add template", exact: true }).click();
  await page.getByRole("button", { name: `Open template ${templateName}` }).click();
  await page.getByTestId("package-editor-panel").waitFor();

  const baseline = await capture(page, "editor-default");
  assertSourceBaseline(baseline, "Editor");
  const baselineExport = await exportPng(page, "png-default");
  assertSourceBaseline(baselineExport.hiddenRenderer, "Hidden PNG renderer");

  const headlineToggle = page.locator('[data-package-field-id="showHeadline"] input[type="checkbox"]');
  const enddateToggle = page.locator('[data-package-field-id="showEnddate"] input[type="checkbox"]');
  await headlineToggle.uncheck();
  const headlineHidden = await capture(page, "editor-headline-hidden");
  assertHeadlineExcluded(headlineHidden, baseline, "Headline false");
  const headlineHiddenExport = await exportPng(page, "png-headline-hidden");
  assertHeadlineExcluded(headlineHiddenExport.hiddenRenderer, baselineExport.hiddenRenderer, "Headline false PNG renderer");

  await page.getByRole("button", { name: "Reset", exact: true }).click();
  const headlineReset = await capture(page, "editor-headline-reset");
  assertReset(headlineReset, baseline, "Headline reset");

  await enddateToggle.uncheck();
  const enddateHidden = await capture(page, "editor-enddate-hidden");
  assertEnddateExcluded(enddateHidden, baseline, "End-date false");
  const enddateHiddenExport = await exportPng(page, "png-enddate-hidden");
  assertEnddateExcluded(enddateHiddenExport.hiddenRenderer, baselineExport.hiddenRenderer, "End-date false PNG renderer");

  await page.getByRole("button", { name: "Reset", exact: true }).click();
  const enddateReset = await capture(page, "editor-enddate-reset");
  assertReset(enddateReset, baseline, "End-date reset");
  const resetExport = await exportPng(page, "png-reset");
  assertReset(resetExport.hiddenRenderer, baselineExport.hiddenRenderer, "Reset PNG renderer");
  assert(resetExport.sha256 === baselineExport.sha256, "Reset PNG did not restore the default rendered bytes.");

  const baselinePng = readFileSync(baselineExport.path);
  const headlineHiddenPng = readFileSync(headlineHiddenExport.path);
  const enddateHiddenPng = readFileSync(enddateHiddenExport.path);
  const headlineSurvivorRegion = comparePng(
    cropPng(baselinePng, { x: 0, y: 0, width: 1080, height: 112 }),
    cropPng(headlineHiddenPng, { x: 0, y: 0, width: 1080, height: 112 }),
    { threshold: 0.1, allowedChangedPixelPercentage: 0 },
  );
  assert(headlineSurvivorRegion.exact, "Headline exclusion changed pixels belonging to the surviving logo/end-date row.");
  const enddateLogoRegion = comparePng(
    cropPng(baselinePng, { x: 0, y: 0, width: 300, height: 112 }),
    cropPng(enddateHiddenPng, { x: 0, y: 0, width: 300, height: 112 }),
    { threshold: 0.1, allowedChangedPixelPercentage: 0 },
  );
  assert(enddateLogoRegion.exact, "End-date exclusion changed pixels belonging to the surviving logo.");

  await headlineToggle.uncheck();
  await page.evaluate(() => window.__templatePackageRuntimeRoutingHarness?.resizeRoot(900, 1600));
  const resizedHidden = await capture(page, "editor-resized-headline-hidden");
  assertHeadlineExcluded(resizedHidden, baseline, "Resize while headline false");
  await headlineToggle.check();
  const resizedShown = await capture(page, "editor-resized-headline-shown");
  assert(resizedShown.nodes[nodeIds.headlineControl] && resizedShown.nodes[nodeIds.headlineText], "Resize then show did not restore the headline subtree.");
  assert(resizedShown.runtimeRouting.revision !== resizedHidden.runtimeRouting.revision, "Resize then show did not advance semantic settlement identity.");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  const finalReset = await capture(page, "editor-final-reset");
  assertReset(finalReset, baseline, "Final reset");

  const sourceComparison = comparePng(Buffer.from(previewBytes), readFileSync(baselineExport.path), { threshold: 0.1, allowedChangedPixelPercentage: 100 });
  const resetSourceComparison = comparePng(Buffer.from(previewBytes), readFileSync(resetExport.path), { threshold: 0.1, allowedChangedPixelPercentage: 100 });
  const report = {
    schemaVersion: "boolean-structural-visibility-source-evidence-v1",
    runId,
    fixture: {
      id: fixture.id,
      path: verified.path,
      byteSize: fixture.byteSize,
      zipSha256: fixture.zipSha256,
      previewSha256: fixture.embeddedPreview.sha256,
      templateJsonSha256: fixture.templateJsonSha256,
      exporterVersion: fixture.exporterVersion,
      packageId: fixture.packageId,
      rootNodeId: fixture.rootNodeId,
    },
    sourceContract: {
      booleanFields: [sourceContract.headline, sourceContract.enddate],
      headlineParticipant: { nodeId: nodeIds.headlineControl, parentId: nodeIds.content, parentLayout: "VERTICAL/HUG", sourceHeight: sourceContract.headlineNode.bounds.relative.height },
      enddateParticipant: { nodeId: nodeIds.enddateControl, parentId: nodeIds.logoRow, parentLayout: "HORIZONTAL/FIXED/SPACE_BETWEEN", sourceBounds: sourceContract.enddateNode.bounds.relative },
    },
    v2Normalization: {
      schemaVersion: normalized.package.schemaVersion,
      editableFieldOrder: normalized.package.editableFieldOrder,
      booleanFields: normalizedBooleans,
      diagnostics: normalized.diagnostics,
    },
    fontFallbacks,
    surfaces: { validate, fields, baseline, headlineHidden, headlineReset, enddateHidden, enddateReset, resizedHidden, resizedShown, finalReset },
    exports: { baselineExport, headlineHiddenExport, enddateHiddenExport, resetExport },
    sourceComparisons: { baseline: plainComparison(sourceComparison), reset: plainComparison(resetSourceComparison) },
    survivorPixelComparisons: {
      headlineHiddenHeader: plainComparison(headlineSurvivorRegion),
      enddateHiddenLogo: plainComparison(enddateLogoRegion),
    },
    consoleMessages,
    supportedSubset: "Boolean visibility structural exclusion for this exporter-authentic vertical HUG/FILL chain and fixed horizontal SPACE_BETWEEN row, using the shared renderer pipeline.",
  };
  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(join(outputRoot, "run.json"), stableStringify(report));
  if (sourceComparison.differenceImage) writeFileSync(join(outputRoot, "source-vs-default-export-diff.png"), sourceComparison.differenceImage);
  if (resetSourceComparison.differenceImage) writeFileSync(join(outputRoot, "source-vs-reset-export-diff.png"), resetSourceComparison.differenceImage);
  assert(consoleMessages.length === 0, `Browser console emitted errors or warnings: ${JSON.stringify(consoleMessages)}`);
  console.log(`[runtime-routing] boolean=pass output=${outputRoot}`);
} finally {
  await context.close();
  await browser.close();
  await server.close();
}

#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { strFromU8, unzipSync } from "fflate";
import { createServer } from "vite";
import { browserStructure, launchBrowser, waitForCurrentReadiness } from "../fidelity/browser.mjs";
import { loadManifest, parseArguments, repoRoot, stableStringify, verifyFixture } from "../fidelity/core.mjs";

const args = parseArguments(process.argv.slice(2));
const runId = String(args["run-id"] || `font-evidence-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const outputRoot = join(repoRoot, "fidelity", "runtime-routing", "font-evidence", runId);
const fontManifest = JSON.parse(readFileSync(join(repoRoot, "fidelity", "fonts.json"), "utf8"));
const defaultFontDirectory = "/Users/niels/Documents/Codex/renderer-fidelity-fonts";

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function resolvePath(font) {
  return font.sourcePath
    .replace("${RENDERER_FIDELITY_FONT_DIR}", process.env.RENDERER_FIDELITY_FONT_DIR || defaultFontDirectory)
    .replace("${INTER_TIGHT_FIDELITY_FONT_PATH}", process.env.INTER_TIGHT_FIDELITY_FONT_PATH || font.defaultSourcePath || "");
}

const fonts = fontManifest.fonts.map((font) => {
  const path = resolvePath(font);
  assert(existsSync(path), `Exact font file is missing for ${font.id}: ${path}`);
  const bytes = readFileSync(path);
  assert(bytes.length === font.byteSize, `Exact font byte size mismatch for ${font.id}.`);
  assert(sha256(bytes) === font.sha256, `Exact font SHA-256 mismatch for ${font.id}.`);
  return { ...font, path, bytes, dataUrl: `data:font/ttf;base64,${bytes.toString("base64")}` };
});

const fixtureManifest = loadManifest();
const fixture = fixtureManifest.fixtures.find((item) => item.id === "now-hiring-post");
if (!fixture) throw new Error("Exact-font evidence requires now-hiring-post.");
const verified = verifyFixture(fixtureManifest, fixture);
const sourceTemplate = JSON.parse(strFromU8(unzipSync(new Uint8Array(verified.bytes))["template.json"]));
const sourceTrimHeights = Object.fromEntries(Object.values(sourceTemplate.nodes)
  .filter((node) => node.type === "TEXT" && node.text?.leadingTrim === "CAP_HEIGHT")
  .map((node) => [node.id, node.bounds.relative.height]));
const selectors = {
  validate: '[data-testid="package-step-validate"] [data-template-package-canvas]',
  fields: '[data-testid="package-step-fields"] [data-template-package-canvas]',
  editor: '[data-testid="package-working-preview"] [data-template-package-canvas]',
  "png-export": '[data-testid="package-png-export-target"] [data-template-package-canvas]',
};

async function installFonts(page) {
  return page.evaluate(async (descriptors) => {
    const loaded = [];
    for (const descriptor of descriptors) {
      const face = new FontFace(descriptor.family, `url(${descriptor.dataUrl})`, { weight: String(descriptor.weight), style: descriptor.style });
      document.fonts.add(face);
      await face.load();
      loaded.push({ id: descriptor.id, family: face.family, weight: face.weight, style: face.style, status: face.status, sha256: descriptor.sha256 });
    }
    await document.fonts.ready;
    window.__rendererFidelityExactFonts = loaded;
    return loaded;
  }, fonts.map(({ id, family, weight, style, sha256, dataUrl }) => ({ id, family, weight, style, sha256, dataUrl })));
}

async function selectValidatePreview(page) {
  if (await page.locator(selectors.validate).count()) return;
  const groups = page.getByTestId("quality-issue-group");
  for (let index = 0; index < await groups.count(); index += 1) {
    await groups.nth(index).locator("button").first().click();
    if (await page.locator(selectors.validate).count()) return;
  }
  throw new Error("Validate did not expose a live renderer preview.");
}

async function capture(page, scenario, surface, index) {
  const selector = selectors[surface];
  const readiness = await waitForCurrentReadiness(page, selector);
  const structure = await browserStructure(page, selector);
  const exact = await page.evaluate(() => ({
    injected: window.__rendererFidelityExactFonts ?? [],
    documentStatus: document.fonts?.status ?? "unsupported",
    availableFaces: [...(document.fonts ?? [])].map((face) => ({ family: face.family, weight: face.weight, style: face.style, status: face.status })),
  }));
  const directory = join(outputRoot, scenario, surface);
  mkdirSync(directory, { recursive: true });
  const screenshotPath = join(directory, `capture-${index}.png`);
  await page.locator(selector).screenshot({ path: screenshotPath, animations: "disabled", caret: "hide", scale: "css" });
  const report = {
    schemaVersion: "exact-font-surface-evidence-v1",
    scenario,
    surface,
    fixture: { id: fixture.id, zipSha256: fixture.zipSha256, rootNodeId: fixture.rootNodeId },
    fontManifest: fonts.map(({ bytes, dataUrl, ...font }) => font),
    readiness,
    exact,
    runtimeRouting: structure.runtimeRouting,
    canvas: structure.canvas,
    textNodes: structure.nodes.filter((node) => node.textMeasurement).map((node) => ({ id: node.id, bounds: node.bounds, fontReady: node.fontReady, textMeasurement: node.textMeasurement, textGeometry: node.textGeometry })),
  };
  writeFileSync(join(directory, `evidence-${index}.json`), stableStringify(report));
  return { ...report, screenshotSha256: sha256(readFileSync(screenshotPath)) };
}

async function advanceToEditor(page, installAtStart) {
  await page.goto(`${baseUrl}/templates/new`, { waitUntil: "domcontentloaded" });
  if (installAtStart) await installFonts(page);
  await page.getByTestId("zip-package-input").setInputFiles(verified.path);
  await page.getByRole("button", { name: "Import template" }).click();
  await page.getByTestId("package-step-prepare-fonts").waitFor();
  const replacements = page.getByRole("button", { name: "Use replacement" });
  for (let index = (await replacements.count()) - 1; index >= 0; index -= 1) await replacements.nth(index).click();
  await page.getByRole("button", { name: "Check template" }).click();
  await page.getByTestId("package-step-validate").waitFor();
  await selectValidatePreview(page);
}

const server = await createServer({ root: repoRoot, logLevel: "error", server: { host: "127.0.0.1", port: Number(args.port || 0), strictPort: Boolean(args.port) } });
await server.listen();
const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
if (!baseUrl) throw new Error("Exact-font evidence server did not publish a local URL.");
const browser = await launchBrowser(Boolean(args.headed));
const results = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", acceptDownloads: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await advanceToEditor(page, true);
  results.push(await capture(page, "exact-initial", "validate", 1), await capture(page, "exact-initial", "validate", 2));
  await page.getByRole("button", { name: "Continue to fields" }).click();
  await page.getByTestId("package-step-fields").waitFor();
  results.push(await capture(page, "exact-initial", "fields", 1), await capture(page, "exact-initial", "fields", 2));
  await page.getByRole("button", { name: "Continue to template details" }).click();
  const templateName = `M5 exact fonts ${runId}`;
  await page.getByLabel("Template name").fill(templateName);
  await page.getByRole("button", { name: "Add template", exact: true }).click();
  await page.getByRole("button", { name: `Open template ${templateName}` }).click();
  await page.getByTestId("package-editor-panel").waitFor();
  results.push(await capture(page, "exact-initial", "editor", 1), await capture(page, "exact-initial", "editor", 2));
  const exportDirectory = join(outputRoot, "exact-initial", "png-export");
  mkdirSync(exportDirectory, { recursive: true });
  await waitForCurrentReadiness(page, selectors["png-export"]);
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("package-export-png-button").click();
  const download = await downloadPromise;
  const exportPath = join(exportDirectory, "exported.png");
  await download.saveAs(exportPath);
  const exportPng = PNG.sync.read(readFileSync(exportPath));
  const hidden = await capture(page, "exact-initial", "png-export", 1);
  hidden.export = { width: exportPng.width, height: exportPng.height, sha256: sha256(readFileSync(exportPath)) };
  results.push(hidden);
  await context.close();

  const delayedContext = await browser.newContext({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", acceptDownloads: true, reducedMotion: "reduce" });
  const delayedPage = await delayedContext.newPage();
  await advanceToEditor(delayedPage, false);
  const before = await capture(delayedPage, "delayed-activation", "validate", 1);
  await installFonts(delayedPage);
  const after = await capture(delayedPage, "delayed-activation", "validate", 2);
  assert(before.runtimeRouting.revision !== after.runtimeRouting.revision, "Exact font activation must publish a new settlement revision.");
  assert(after.exact.injected.length === fonts.length, "Every exact required identity must be explicitly installed.");
  results.push(before, after);
  await delayedContext.close();

  const repeatSurfaces = results.filter((item) => item.scenario === "exact-initial");
  for (const surface of ["validate", "fields", "editor"]) {
    const pair = repeatSurfaces.filter((item) => item.surface === surface);
    assert(pair.length === 2 && pair[0].screenshotSha256 === pair[1].screenshotSha256, `${surface} exact-font capture was not pixel-repeatable.`);
    assert(pair.every((item) => item.runtimeRouting.mode === "authoritative" && item.runtimeRouting.readiness === "ready"), `${surface} did not expose ready authoritative core routing.`);
  }
  for (const surface of repeatSurfaces) {
    for (const [nodeId, expectedHeight] of Object.entries(sourceTrimHeights)) {
      const textNode = surface.textNodes.find((node) => node.id === nodeId);
      assert(textNode?.textGeometry?.authority === "authoritative", `${surface.surface} ${nodeId} did not publish authoritative trim geometry.`);
      assert(textNode.textGeometry.fontState === "exact", `${surface.surface} ${nodeId} did not use the exact managed face.`);
      assert(Math.abs(textNode.textGeometry.trimmedTextBox.height - expectedHeight) <= 0.5, `${surface.surface} ${nodeId} trimmed height ${textNode.textGeometry.trimmedTextBox.height} differs from source ${expectedHeight}.`);
      assert(textNode.textGeometry.verticalAlignmentMode === "hug-trim-origin" && textNode.textGeometry.justifyContent === "flex-start", `${surface.surface} ${nodeId} reapplied fixed-box vertical alignment to HUG trim text.`);
      assert(Math.abs(textNode.textGeometry.actualFirstCapTopY) <= 0.05, `${surface.surface} ${nodeId} first cap top ${textNode.textGeometry.actualFirstCapTopY} does not meet the semantic top.`);
      assert(Math.abs(textNode.textGeometry.actualFinalBaselineY - textNode.textGeometry.trimmedTextBox.height) <= 0.05, `${surface.surface} ${nodeId} final baseline does not meet the semantic bottom.`);
      assert(Math.abs(textNode.textGeometry.paintBox.y - textNode.textGeometry.glyphOrigin.translationY) <= 0.05, `${surface.surface} ${nodeId} glyph layer is not anchored in browser line-box coordinates.`);
    }
  }
  const exactBySurface = Object.fromEntries(["validate", "fields", "editor", "png-export"].map((surface) => [surface, results.find((item) => item.scenario === "exact-initial" && item.surface === surface)]));
  for (const nodeId of Object.keys(sourceTrimHeights)) {
    const heights = Object.values(exactBySurface).map((surface) => surface?.textNodes.find((node) => node.id === nodeId)?.textGeometry?.trimmedTextBox?.height);
    assert(heights.every((height) => typeof height === "number") && Math.max(...heights) - Math.min(...heights) <= 0.01, `${nodeId} trim geometry diverged across Validate, Fields, editor, or PNG.`);
  }
  const delayed = results.filter((item) => item.scenario === "delayed-activation" && item.surface === "validate");
  assert(delayed.length === 2 && delayed[0].runtimeRouting.revision !== delayed[1].runtimeRouting.revision, "Delayed exact activation must invalidate the earlier font revision.");
  assert(delayed[1].textNodes.filter((node) => sourceTrimHeights[node.id] !== undefined).every((node) => node.textGeometry?.fontState === "exact"), "The exact-face revision must win after delayed activation.");
  const run = { schemaVersion: "exact-font-evidence-run-v2", runId, headed: Boolean(args.headed), fixture: { id: fixture.id, zipSha256: fixture.zipSha256 }, sourceTrimHeights, results };
  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(join(outputRoot, "run.json"), stableStringify(run));
  console.log(`[runtime-routing] exact-font-evidence=pass output=${outputRoot}`);
} finally {
  await browser.close();
  await server.close();
}

#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";
import { browserStructure, launchBrowser, waitForCurrentReadiness } from "../fidelity/browser.mjs";
import { loadManifest, parseArguments, repoRoot, stableStringify, verifyFixture } from "../fidelity/core.mjs";

const args = parseArguments(process.argv.slice(2));
const runId = String(args["run-id"] || `text-trim-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const outputRoot = join(repoRoot, "fidelity", "runtime-routing", "text-trim", runId);
const manifest = loadManifest();
const fixture = manifest.fixtures.find((item) => item.id === "now-hiring-post");
if (!fixture) throw new Error("Text-trim evidence requires now-hiring-post.");
const verified = verifyFixture(manifest, fixture);
const fontManifest = JSON.parse(readFileSync(join(repoRoot, "fidelity", "fonts.json"), "utf8"));
const defaultFontDirectory = "/Users/niels/Documents/Codex/renderer-fidelity-fonts";
const selector = '[data-testid="package-working-preview"] [data-template-package-canvas]';

function assert(condition, message) { if (!condition) throw new Error(message); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function sourcePath(font) {
  return font.sourcePath
    .replace("${RENDERER_FIDELITY_FONT_DIR}", process.env.RENDERER_FIDELITY_FONT_DIR || defaultFontDirectory)
    .replace("${INTER_TIGHT_FIDELITY_FONT_PATH}", process.env.INTER_TIGHT_FIDELITY_FONT_PATH || font.defaultSourcePath || "");
}

const fonts = fontManifest.fonts.map((font) => {
  const path = sourcePath(font);
  assert(existsSync(path), `Exact font file is missing for ${font.id}: ${path}`);
  const bytes = readFileSync(path);
  assert(bytes.length === font.byteSize && sha256(bytes) === font.sha256, `Exact font identity mismatch for ${font.id}.`);
  return { ...font, dataUrl: `data:font/ttf;base64,${bytes.toString("base64")}` };
});

async function installFonts(page) {
  await page.evaluate(async (descriptors) => {
    const installed = [];
    for (const descriptor of descriptors) {
      const face = new FontFace(descriptor.family, `url(${descriptor.dataUrl})`, { weight: String(descriptor.weight), style: descriptor.style });
      document.fonts.add(face);
      await face.load();
      installed.push({ id: descriptor.id, family: face.family, weight: face.weight, style: face.style, status: face.status, sha256: descriptor.sha256 });
    }
    await document.fonts.ready;
    window.__rendererFidelityExactFonts = installed;
  }, fonts.map(({ id, family, weight, style, sha256: digest, dataUrl }) => ({ id, family, weight, style, sha256: digest, dataUrl })));
}

function trimNodes(structure) {
  return structure.nodes.filter((node) => node.textGeometry?.verticalTrim === "cap-height-to-baseline");
}

function verifyTrimGeometry(structure, label) {
  const nodes = trimNodes(structure);
  assert(nodes.length === 4, `${label} must expose all four source CAP_HEIGHT text nodes.`);
  for (const node of nodes) {
    const geometry = node.textGeometry;
    assert(geometry.authority === "authoritative" && geometry.fontState === "exact", `${label} ${node.id} is not exact-font trim authority.`);
    const metrics = geometry.fontMetrics;
    const expected = metrics.capHeight + Math.max(0, node.textMeasurement ? Math.round((geometry.browserLineBox.height / metrics.lineHeight)) - 1 : 0) * metrics.lineHeight;
    assert(Math.abs(geometry.trimmedTextBox.height - expected) <= 0.01, `${label} ${node.id} does not use cap-height plus baseline gaps.`);
    assert(geometry.semanticContentBox && Math.abs(geometry.semanticContentBox.height - geometry.trimmedTextBox.height) <= 0.05, `${label} ${node.id} semantic wrapper does not match the trimmed box.`);
    assert(geometry.paintBox && Math.abs(geometry.paintBox.y - geometry.glyphOrigin.translationY - geometry.semanticContentBox.y) <= 0.05, `${label} ${node.id} paint layer is not anchored to the semantic content origin.`);
    assert(Math.abs(geometry.actualFirstCapTopY - geometry.semanticContentBox.y) <= 0.05, `${label} ${node.id} first cap top does not meet the semantic content top.`);
    assert(Math.abs(geometry.actualFinalBaselineY - (geometry.semanticContentBox.y + geometry.trimmedTextBox.height)) <= 0.05, `${label} ${node.id} final baseline does not meet the semantic content bottom.`);
    if (geometry.verticalAlignmentMode === "hug-trim-origin") {
      assert(Math.abs(node.bounds.height - geometry.trimmedTextBox.height) <= 0.05, `${label} ${node.id} HUG bounds do not match the semantic trimmed box.`);
      assert(geometry.justifyContent === "flex-start" && Math.abs(geometry.semanticContentBox.y) <= 0.05, `${label} ${node.id} HUG trim incorrectly reapplied vertical alignment.`);
    }
  }
  return nodes;
}

async function capture(page, id) {
  const started = performance.now();
  const readiness = await waitForCurrentReadiness(page, selector);
  const structure = await browserStructure(page, selector);
  const nodes = verifyTrimGeometry(structure, id);
  const directory = join(outputRoot, id);
  mkdirSync(directory, { recursive: true });
  const screenshotPath = join(directory, "renderer.png");
  await page.locator(selector).screenshot({ path: screenshotPath, animations: "disabled", caret: "hide", scale: "css" });
  const result = {
    id,
    durationMs: performance.now() - started,
    readiness,
    runtimeRouting: structure.runtimeRouting,
    trimNodes: nodes.map((node) => ({ id: node.id, bounds: node.bounds, textMeasurement: node.textMeasurement, textGeometry: node.textGeometry })),
    imageSlots: structure.nodes.filter((node) => node.dataAttributes?.["data-package-image-asset"]).map((node) => ({ id: node.id, bounds: node.bounds })),
    screenshotSha256: sha256(readFileSync(screenshotPath)),
  };
  writeFileSync(join(directory, "evidence.json"), stableStringify(result));
  return result;
}

const server = await createServer({ root: repoRoot, logLevel: "error", server: { host: "127.0.0.1", port: Number(args.port || 0), strictPort: Boolean(args.port) } });
await server.listen();
const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
if (!baseUrl) throw new Error("Text-trim server did not publish a local URL.");
const browser = await launchBrowser(Boolean(args.headed));
const context = await browser.newContext({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", acceptDownloads: true, reducedMotion: "reduce" });
const page = await context.newPage();
const consoleMessages = [];
const ignoredConsoleMessages = [];
page.on("console", (message) => {
  if (!["error", "warning"].includes(message.type())) return;
  const entry = { type: message.type(), text: message.text(), location: message.location() };
  if (entry.location.url.endsWith("/favicon.ico") && entry.text.includes("404")) ignoredConsoleMessages.push({ ...entry, classification: "browser-favicon-request" });
  else consoleMessages.push(entry);
});
page.on("pageerror", (error) => consoleMessages.push({ type: "pageerror", text: error.message }));

try {
  await page.goto(`${baseUrl}/templates/new`, { waitUntil: "domcontentloaded" });
  await installFonts(page);
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
  const templateName = `M5.1 trim ${runId}`;
  await page.getByLabel("Template name").fill(templateName);
  await page.getByRole("button", { name: "Add template", exact: true }).click();
  await page.getByRole("button", { name: `Open template ${templateName}` }).click();
  await page.getByTestId("package-editor-panel").waitFor();

  const baseline = await capture(page, "baseline");
  const text = page.getByLabel("Text", { exact: true });
  const original = await text.inputValue();
  await text.fill(original);
  const identical = await capture(page, "identical-edit");
  assert(identical.runtimeRouting.settlementId === baseline.runtimeRouting.settlementId, "An identical edit changed settlement identity.");

  await text.fill("LEAD THE TEAM\nBUILD THE FUTURE");
  const multiline = await capture(page, "multiline-uppercase");
  assert(multiline.trimNodes.some((node) => Math.abs(node.textMeasurement.height - (baseline.trimNodes.find((item) => item.id === node.id)?.textMeasurement.height ?? node.textMeasurement.height)) > 0.05), "Multiline content did not update a trimmed HUG box.");
  assert(multiline.imageSlots.some((slot, index) => Math.abs(slot.bounds.height - baseline.imageSlots[index].bounds.height) > 0.05), "Trimmed text expansion did not propagate to the dependent image slot.");

  await text.fill("growing beyond\ngypsy");
  const descenders = await capture(page, "lowercase-descenders");
  assert(descenders.trimNodes.some((node) => Number(node.textGeometry.glyphPaintBounds?.split(",")[1]) > node.textGeometry.trimmedTextBox.height), "Descender paint was not retained outside the semantic layout box telemetry.");

  await page.getByRole("button", { name: "Reset" }).click();
  const reset = await capture(page, "reset");
  assert(reset.trimNodes.every((node) => {
    const before = baseline.trimNodes.find((item) => item.id === node.id);
    return before && Math.abs(before.bounds.height - node.bounds.height) <= 0.01;
  }), "Reset did not restore imported trim geometry.");

  const originalPackage = await page.evaluate(() => window.__templatePackageRuntimeRoutingHarness?.getPackage());
  assert(originalPackage, "Runtime-routing harness did not expose the working package.");
  await page.evaluate(() => {
    const api = window.__templatePackageRuntimeRoutingHarness;
    if (!api) throw new Error("Runtime-routing harness is unavailable.");
    const packageValue = api.getPackage();
    const target = Object.values(packageValue.nodes).find((node) =>
      node.type === "TEXT" &&
      "characters" in node.text &&
      node.text.leadingTrim === "CAP_HEIGHT" &&
      node.sizing.vertical.mode === "HUG" &&
      node.text.textAlignVertical === "CENTER"
    );
    if (!target || target.type !== "TEXT" || !("characters" in target.text)) throw new Error("A capability-matched centred CAP_HEIGHT text node is required.");
    target.sizing.vertical = { ...target.sizing.vertical, mode: "FIXED", value: 193 };
    target.bounds.relative = { ...target.bounds.relative, height: 193 };
    target.bounds.absolute = { ...target.bounds.absolute, height: 193 };
    target.text.textAutoResize = "NONE";
    api.replacePackage(packageValue);
  });
  const fixedCenter = await capture(page, "fixed-height-center");
  const fixedCenterNode = fixedCenter.trimNodes.find((node) => node.textGeometry.verticalAlignmentMode === "fixed-trim-center");
  assert(fixedCenterNode, "Fixed-height CENTER trim scenario was not observed.");
  assert(Math.abs(fixedCenterNode.textGeometry.semanticContentBox.y - (fixedCenterNode.bounds.height - fixedCenterNode.textGeometry.trimmedTextBox.height) / 2) <= 0.05, "Fixed-height CENTER must align the semantic content box, not the browser line box.");

  await page.evaluate(() => {
    const api = window.__templatePackageRuntimeRoutingHarness;
    if (!api) throw new Error("Runtime-routing harness is unavailable.");
    const packageValue = api.getPackage();
    const target = Object.values(packageValue.nodes).find((node) =>
      node.type === "TEXT" &&
      "characters" in node.text &&
      node.text.leadingTrim === "CAP_HEIGHT" &&
      node.sizing.vertical.mode === "FIXED" &&
      node.text.textAlignVertical === "CENTER"
    );
    if (!target || target.type !== "TEXT" || !("characters" in target.text)) throw new Error("The fixed CAP_HEIGHT target is unavailable.");
    target.text.textAlignVertical = "BOTTOM";
    api.replacePackage(packageValue);
  });
  const fixedBottom = await capture(page, "fixed-height-bottom");
  const fixedBottomNode = fixedBottom.trimNodes.find((node) => node.textGeometry.verticalAlignmentMode === "fixed-trim-bottom");
  assert(fixedBottomNode, "Fixed-height BOTTOM trim scenario was not observed.");
  assert(Math.abs(fixedBottomNode.textGeometry.semanticContentBox.y - (fixedBottomNode.bounds.height - fixedBottomNode.textGeometry.trimmedTextBox.height)) <= 0.05, "Fixed-height BOTTOM must align the semantic content box, not the browser line box.");
  await page.evaluate((packageValue) => window.__templatePackageRuntimeRoutingHarness?.replacePackage(packageValue), originalPackage);

  const run = { schemaVersion: "vertical-text-trim-evidence-v2", runId, fixture: { id: fixture.id, zipSha256: fixture.zipSha256 }, fonts: fonts.map(({ dataUrl, ...font }) => font), results: [baseline, identical, multiline, descenders, reset, fixedCenter, fixedBottom], consoleMessages, ignoredConsoleMessages };
  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(join(outputRoot, "run.json"), stableStringify(run));
  assert(consoleMessages.length === 0, `Browser console emitted errors or warnings: ${JSON.stringify(consoleMessages)}`);
  console.log(`[runtime-routing] text-trim=pass output=${outputRoot}`);
} finally {
  await context.close();
  await browser.close();
  await server.close();
}

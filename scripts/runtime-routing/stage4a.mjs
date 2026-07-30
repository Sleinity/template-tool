#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { browserStructure, launchBrowser, waitForCurrentReadiness } from "../fidelity/browser.mjs";
import { loadManifest, parseArguments, repoRoot, stableStringify, verifyFixture } from "../fidelity/core.mjs";
import { createStudioViteServer } from "../repository/studio-vite-server.mjs";
import { applyCompatibilityFontFallbacks } from "../repository/studio-font-harness.mjs";

const args = parseArguments(process.argv.slice(2));
const runId = String(args["run-id"] || `stage-4a-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const outputRoot = join(repoRoot, "fidelity", "runtime-routing", "stage-4a", runId);
const headed = Boolean(args.headed);
const manifest = loadManifest();
const fixture = manifest.fixtures.find((item) => item.id === "now-hiring-post");
if (!fixture) throw new Error("Stage 4A requires the registered now-hiring-post fixture.");
const verified = verifyFixture(manifest, fixture);
const selector = '[data-testid="package-working-preview"] [data-template-package-canvas]';

const fontUrl = "/src/assets/fonts/rethink-sans-600.ttf";
const chainIds = ["387:340", "387:341", "387:336", "378:27", "378:22", "378:21"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fontCheck(page, family) {
  return page.evaluate((value) => ["500", "700"].every((weight) => [...(document.fonts ?? [])].some((face) =>
    face.family.replace(/^['"]|['"]$/g, "") === value &&
    face.status === "loaded" &&
    face.weight === weight)),
  family);
}

async function addExactFont(page, family) {
  return page.evaluate(async ({ name, url }) => {
    const loadedFaces = [];
    for (const weight of ["500", "700"]) {
      const requestUrl = `${url}?runtime-routing-family=${encodeURIComponent(name)}&weight=${weight}`;
      const face = new FontFace(name, `url(${requestUrl})`, { style: "normal", weight });
      document.fonts.add(face);
      const loaded = await face.load();
      loadedFaces.push({ family: loaded.family, weight: loaded.weight, status: loaded.status });
    }
    await document.fonts.ready;
    return { faces: loadedFaces, status: loadedFaces.every((face) => face.status === "loaded") ? "loaded" : "error", exact: ["500", "700"].every((weight) => [...document.fonts].some((candidate) => candidate.family === name && candidate.weight === weight && candidate.status === "loaded")) };
  }, { name: family, url: fontUrl });
}

async function setFamily(page, family) {
  await page.evaluate((value) => {
    const api = window.__templatePackageRuntimeRoutingHarness;
    if (!api) throw new Error("Runtime-routing development harness is unavailable.");
    api.setTextFontFamily(value);
  }, family);
}

async function capture(page, id, family = null) {
  const readiness = await waitForCurrentReadiness(page, selector);
  const structure = await browserStructure(page, selector);
  const routing = await page.locator(selector).evaluate((element) => ({
    mode: element.getAttribute("data-package-runtime-routing"),
    settlementId: element.getAttribute("data-package-settlement-id"),
    revision: element.getAttribute("data-package-settlement-revision"),
    readiness: element.getAttribute("data-package-settlement-readiness"),
    routedNodeCount: Number(element.getAttribute("data-package-routed-node-count") || 0),
    compatibilityNodeCount: Number(element.getAttribute("data-package-compatibility-node-count") || 0),
  }));
  const nodes = Object.fromEntries(structure.nodes.filter((node) => chainIds.includes(node.id)).map((node) => [node.id, {
    bounds: node.bounds,
    fontReady: node.fontReady,
    textGeometry: node.textGeometry,
    dataAttributes: node.dataAttributes,
    measuredHeight: node.dataAttributes?.["data-package-hug-text-measured"] ?? null,
    imageMode: node.dataAttributes?.["data-package-image-render-mode"] ?? null,
  }]));
  const result = {
    id,
    family,
    exactFontReady: family ? await fontCheck(page, family) : null,
    documentFontStatus: readiness.fontReadiness.status,
    stable: readiness.stable,
    framesObserved: readiness.framesObserved,
    canvas: structure.canvas,
    routing,
    nodes,
  };
  mkdirSync(join(outputRoot, id), { recursive: true });
  writeFileSync(join(outputRoot, id, "evidence.json"), stableStringify(result));
  await page.locator(selector).screenshot({ path: join(outputRoot, id, "renderer.png"), animations: "disabled", caret: "hide", scale: "css" });
  return result;
}

const server = await createStudioViteServer({
  port: Number(args.port || 0),
  strictPort: Boolean(args.port),
});
await server.listen();
const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
if (!baseUrl) throw new Error("Stage 4A server did not publish a local URL.");
const browser = await launchBrowser(headed);
const context = await browser.newContext({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", acceptDownloads: true, reducedMotion: "reduce" });
const page = await context.newPage();
const consoleMessages = [];
page.on("console", (message) => { if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() }); });
page.on("pageerror", (error) => consoleMessages.push({ type: "pageerror", text: error.message }));

const results = [];
try {
  await page.goto(`${baseUrl}/templates/new`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("zip-package-input").setInputFiles(verified.path);
  await page.getByRole("button", { name: "Import template" }).click();
  await page.getByTestId("package-step-prepare-fonts").waitFor();
  await applyCompatibilityFontFallbacks(page);
  await page.getByRole("button", { name: "Check template" }).click();
  await page.getByTestId("package-step-validate").waitFor();
  await page.getByRole("button", { name: "Continue to fields" }).click();
  await page.getByTestId("package-step-fields").waitFor();
  await page.getByRole("button", { name: "Continue to template details" }).click();
  const templateName = `Stage 4A ${runId}`;
  await page.getByLabel("Template name").fill(templateName);
  await page.getByRole("button", { name: "Add template", exact: true }).click();
  await page.getByRole("button", { name: `Open template ${templateName}` }).click();
  await page.getByTestId("package-editor-panel").waitFor();
  const originalPackage = await page.evaluate(() => window.__templatePackageRuntimeRoutingHarness?.getPackage());
  assert(originalPackage, "Development harness did not expose the working package.");

  results.push(await capture(page, "explicit-replacement"));

  const exactInitialFamily = "M4 Exact Initial";
  const exactInitialLoad = await addExactFont(page, exactInitialFamily);
  await setFamily(page, exactInitialFamily);
  const exactInitial = await capture(page, "exact-initial", exactInitialFamily);
  assert(exactInitialLoad.status === "loaded" && exactInitial.exactFontReady, "Exact font must be active before the exact-initial capture.");
  results.push(exactInitial);

  const delayedFamily = "M4 Delayed Exact";
  await setFamily(page, delayedFamily);
  const fallback = await capture(page, "delayed-fallback", delayedFamily);
  assert(!fallback.exactFontReady, "Delayed-font fallback capture unexpectedly had the exact face.");
  results.push(fallback);
  const delayedLoad = await addExactFont(page, delayedFamily);
  await setFamily(page, delayedFamily);
  const delayedExact = await capture(page, "delayed-exact", delayedFamily);
  assert(delayedLoad.status === "loaded" && delayedExact.exactFontReady, "Delayed exact font did not activate.");
  assert(fallback.routing.revision !== delayedExact.routing.revision && delayedExact.routing.readiness === "ready", "Exact-font activation must publish a new ready settlement revision.");
  results.push(delayedExact);

  const unavailableFamily = "M4 Unavailable Exact";
  await setFamily(page, unavailableFamily);
  const unavailable = await capture(page, "unavailable-exact", unavailableFamily);
  assert(!unavailable.exactFontReady, "Unavailable exact font was unexpectedly reported as ready.");
  results.push(unavailable);

  await page.evaluate((packageValue) => window.__templatePackageRuntimeRoutingHarness?.replacePackage(packageValue), originalPackage);
  await waitForCurrentReadiness(page, selector);
  await page.evaluate(() => window.__templatePackageRuntimeRoutingHarness?.resizeRoot(800, 1080));
  const resized = await capture(page, "root-resize");
  assert(Math.round(resized.canvas.width) === 800 && Math.round(resized.canvas.height) === 1080, `Resized renderer is ${resized.canvas.width}x${resized.canvas.height}, expected 800x1080.`);
  results.push(resized);

  try {
    await page.waitForFunction(() => {
      const visible = document.querySelector('[data-testid="package-working-preview"] [data-template-package-canvas]');
      const hidden = document.querySelector('[data-testid="package-png-export-target"] [data-template-package-canvas]');
      return visible?.getAttribute("data-package-settlement-readiness") === "ready" &&
        hidden?.getAttribute("data-package-settlement-readiness") === "ready" &&
        visible.getAttribute("data-package-settlement-id") === hidden.getAttribute("data-package-settlement-id") &&
        visible.getAttribute("data-package-settlement-revision") === hidden.getAttribute("data-package-settlement-revision");
    }, undefined, { timeout: 10_000 });
  } catch {
    const identities = await page.evaluate(() => [...document.querySelectorAll("[data-template-package-canvas]")].map((element) => ({
      testId: element.closest("[data-testid]")?.getAttribute("data-testid"),
      settlementId: element.getAttribute("data-package-settlement-id"),
      revision: element.getAttribute("data-package-settlement-revision"),
      readiness: element.getAttribute("data-package-settlement-readiness"),
      routed: element.getAttribute("data-package-routed-node-count"),
    })));
    throw new Error(`Visible/hidden renderer convergence timed out: ${JSON.stringify(identities)}`);
  }

  const surfaceIdentity = await page.evaluate(() => {
    const visible = document.querySelector('[data-testid="package-working-preview"] [data-template-package-canvas]');
    const hidden = document.querySelector('[data-testid="package-png-export-target"] [data-template-package-canvas]');
    const read = (element) => element ? { settlementId: element.getAttribute("data-package-settlement-id"), revision: element.getAttribute("data-package-settlement-revision"), readiness: element.getAttribute("data-package-settlement-readiness") } : null;
    return { visible: read(visible), hidden: read(hidden) };
  });
  assert(surfaceIdentity.visible?.readiness === "ready" && surfaceIdentity.hidden?.readiness === "ready", "Visible and hidden export renderers must both be ready.");
  assert(surfaceIdentity.visible.settlementId === surfaceIdentity.hidden.settlementId && surfaceIdentity.visible.revision === surfaceIdentity.hidden.revision, "Visible and hidden export renderers must share the same settlement identity and revision.");

  const exportDirectory = join(outputRoot, "root-resize");
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("package-export-png-button").click();
  const download = await downloadPromise;
  const exportPath = join(exportDirectory, "export.png");
  await download.saveAs(exportPath);
  const png = PNG.sync.read(readFileSync(exportPath));
  assert(png.width === 800 && png.height === 1080, `Exported PNG is ${png.width}x${png.height}, expected 800x1080.`);

  const report = {
    schemaVersion: "runtime-routing-stage-4a-v1",
    runId,
    headed,
    fixture: { id: fixture.id, zipSha256: fixture.zipSha256, rootNodeId: fixture.rootNodeId },
    fontEvidence: {
      exactInitial: exactInitial.exactFontReady,
      fallbackInitially: !fallback.exactFontReady,
      delayedExactActivated: delayedExact.exactFontReady,
      unavailableExactRecorded: !unavailable.exactFontReady,
      explicitReplacementCaptured: true,
    },
    rootResize: { renderer: { width: resized.canvas.width, height: resized.canvas.height }, png: { width: png.width, height: png.height } },
    surfaceIdentity,
    results,
    consoleMessages,
  };
  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(join(outputRoot, "run.json"), stableStringify(report));
  console.log(`[runtime-routing] stage=4a font-gate=pass root-resize-gate=pass output=${outputRoot}`);
} finally {
  await context.close();
  await browser.close();
  await server.close();
}

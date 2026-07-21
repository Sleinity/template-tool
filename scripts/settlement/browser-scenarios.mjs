#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";
import { browserStructure, launchBrowser, waitForCurrentReadiness } from "../fidelity/browser.mjs";
import { loadManifest, parseArguments, repoRoot, stableStringify, verifyFixture } from "../fidelity/core.mjs";
import { observationFromStructure, settlementRoot, writeSettlementCandidate } from "./core.mjs";
import { resolveSettlementModel } from "./model.mjs";

const args = parseArguments(process.argv.slice(2));
const manifest = loadManifest();
const fixture = manifest.fixtures.find((item) => item.id === "now-hiring-post");
if (!fixture) throw new Error("Registered now-hiring-post fixture is required.");
const verified = verifyFixture(manifest, fixture);
const runId = String(args["run-id"] || `browser-scenarios-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const root = join(settlementRoot, "browser-scenarios", runId);
const headed = Boolean(args.headed);
const profile = headed ? "chromium-visible" : "chromium-headless";

function enrichBrowserNodes(browser) {
  return browser.nodes.map((node) => {
    const intrinsic = node.dataAttributes?.["data-package-image-intrinsic-size"]?.split("x").map(Number);
    return { ...node, imageAssetId: node.dataAttributes?.["data-package-image-asset"] ?? null, imageIntrinsicDimensions: intrinsic?.length === 2 && intrinsic.every(Number.isFinite) ? { width: intrinsic[0], height: intrinsic[1] } : null };
  });
}

function comparisonCriticalBrowser(browser) {
  const normalized = structuredClone(browser);
  if (normalized.runtimeRouting) normalized.runtimeRouting.settlementMs = 0;
  return normalized;
}

const server = await createServer({ root: repoRoot, logLevel: "error", server: { host: "127.0.0.1", port: Number(args.port || 0), strictPort: Boolean(args.port) } });
await server.listen();
const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
if (!baseUrl) throw new Error("Scenario Vite server did not publish a local URL.");
const browser = await launchBrowser(headed);
const context = await browser.newContext({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", acceptDownloads: true, reducedMotion: "reduce" });
const page = await context.newPage();
const consoleMessages = [];
page.on("console", (message) => { if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() }); });
page.on("pageerror", (error) => consoleMessages.push({ type: "pageerror", text: error.message }));

async function capture(id, scenario = null) {
  const selector = '[data-testid="package-working-preview"] [data-template-package-canvas]';
  const samples = [];
  let readiness = null;
  for (let index = 0; index < 2; index += 1) {
    readiness = await waitForCurrentReadiness(page, selector);
    samples.push(await browserStructure(page, selector));
  }
  const first = samples[0];
  const structure = {
    fixtureId: fixture.id,
    fixtureHashes: { zipSha256: fixture.zipSha256 },
    rootNodeId: fixture.rootNodeId,
    rootDimensions: { width: first.canvas.width, height: first.canvas.height },
    surface: `scenario-${id}`,
    route: new URL(page.url()).pathname,
    rendererMode: "editor",
    captureTimestamp: new Date().toISOString(),
    fontReadiness: readiness.fontReadiness,
    assetReadiness: readiness.assetReadiness,
    nodes: enrichBrowserNodes(first),
  };
  const observation = observationFromStructure(fixture, structure, { profile, fidelityRun: runId });
  const model = await resolveSettlementModel(verified, observation, scenario);
  const directory = join(root, id);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "browser-1.json"), stableStringify(samples[0]));
  writeFileSync(join(directory, "browser-2.json"), stableStringify(samples[1]));
  writeFileSync(join(directory, "readiness.json"), stableStringify(readiness));
  writeSettlementCandidate(directory, model, { fixture: { id: fixture.id, zipSha256: fixture.zipSha256 }, surface: `scenario-${id}`, environmentProfile: profile, scenarioId: id });
  return { id, repeatStructureExact: stableStringify(comparisonCriticalBrowser(samples[0])) === stableStringify(comparisonCriticalBrowser(samples[1])), readiness: model.settled.readiness, stable: model.settled.stable, withinTolerance: model.comparison.equivalentWithinTolerance, invalidation: model.settled.invalidation, runtimeRouting: samples[0].runtimeRouting, nodeCount: samples[0].nodes.length };
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
  await page.getByLabel("Template name").fill(`Settlement ${runId}`);
  await page.getByRole("button", { name: "Add template", exact: true }).click();
  await page.getByRole("button", { name: `Open template Settlement ${runId}` }).click();
  await page.getByTestId("package-editor-panel").waitFor();
  results.push(await capture("baseline"));

  const text = page.getByLabel("Text", { exact: true });
  await text.fill("JOIN US");
  results.push(await capture("text-short", { id: "text-short", type: "text-edit", value: "JOIN US" }));
  const longValue = "WE ARE SEEKING AN EXPERIENCED OFFICER TO LEAD A GROWING INTERNATIONAL TEAM ACROSS MULTIPLE REGIONS";
  await text.fill(longValue);
  results.push(await capture("text-long", { id: "text-long", type: "text-edit", value: longValue }));
  await text.fill("");
  results.push(await capture("text-clear", { id: "text-clear", type: "text-edit", value: "<clear>" }));
  for (const value of ["A", "JOIN", "JOIN OUR", "JOIN OUR TEAM", "JOIN OUR TEAM TODAY"]) await text.fill(value);
  results.push(await capture("rapid-text-edits", { id: "rapid-text-edits", type: "text-edit", value: "JOIN OUR TEAM TODAY" }));
  await page.getByRole("button", { name: "Reset" }).click();
  results.push(await capture("reset-imported-defaults"));

  const replacementPath = join(repoRoot, "fidelity", "candidates", "milestone-3-headless-baseline", fixture.id, "editor", "capture-1.png");
  await page.getByLabel("Product image", { exact: true }).setInputFiles(replacementPath);
  await page.getByRole("button", { name: "Clear replacement" }).waitFor();
  results.push(await capture("image-replacement", { id: "image-replacement", type: "asset-state", assetId: "asset:image:ceab5479" }));
  await page.getByRole("button", { name: "Clear replacement" }).click();
  results.push(await capture("image-clear"));

  await page.setViewportSize({ width: 1100, height: 1200 });
  results.push(await capture("preview-container-resize"));
  writeFileSync(join(root, "run.json"), stableStringify({ schemaVersion: "settlement-browser-scenario-run-v1", runId, fixture: { id: fixture.id, zipSha256: fixture.zipSha256 }, environmentProfile: profile, results, consoleMessages }));
  results.forEach((item) => console.log(`[settlement-browser] scenario=${item.id} repeat=${item.repeatStructureExact} stable=${item.stable} ready=${item.readiness} tolerance=${item.withinTolerance}`));
  if (results.some((item) => !item.repeatStructureExact || !item.stable || !item.withinTolerance)) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
  await server.close();
}

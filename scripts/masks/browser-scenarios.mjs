#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { browserStructure, launchBrowser, waitForCurrentReadiness } from "../fidelity/browser.mjs";
import { loadManifest, parseArguments, repoRoot, stableStringify, verifyFixture } from "../fidelity/core.mjs";
import { createStudioViteServer } from "../repository/studio-vite-server.mjs";

const args = parseArguments(process.argv.slice(2));
const fixtureId = "deal-of-the-week-banner-crop-mask";
const manifest = loadManifest();
const fixture = manifest.fixtures.find((item) => item.id === fixtureId);
if (!fixture) throw new Error(`Registered ${fixtureId} fixture is required.`);
const verified = verifyFixture(manifest, fixture);
const runId = String(args["run-id"] || "milestone-7-alpha-mask-reload");
const output = join(repoRoot, "fidelity/evidence/milestone-7-alpha-mask", runId);
mkdirSync(output, { recursive: true });
const selector = '[data-testid="package-working-preview"] [data-template-package-canvas]';

const server = await createStudioViteServer({
  port: Number(args.port || 0),
  strictPort: Boolean(args.port),
});
await server.listen();
const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
if (!baseUrl) throw new Error("Mask scenario server did not publish a local URL.");
const browser = await launchBrowser(Boolean(args.headed));
const context = await browser.newContext({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", reducedMotion: "reduce" });
let runtimeFigmaRequests = 0;
await context.route("**/api/template-package/enrich-figma", async (route) => {
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: false, code: "provider-unavailable", message: "Optional provider disabled by mask persistence scenario." }) });
});
const page = await context.newPage();
const consoleMessages = [];
page.on("console", (message) => { if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() }); });
page.on("pageerror", (error) => consoleMessages.push({ type: "pageerror", text: error.message }));

async function state(label) {
  const readiness = await waitForCurrentReadiness(page, selector);
  const structure = await browserStructure(page, selector);
  const affected = structure.nodes.find((node) => node.id === "429:42");
  const source = structure.nodes.find((node) => node.id === "429:41");
  const affectedBackendDecision = structure.backendRouting?.decisions?.find(
    (decision) => decision.nodeId === "429:42",
  );
  if (!affected?.maskPlacement) throw new Error(`${label} has no active mask placement.`);
  if (!affectedBackendDecision) throw new Error(`${label} has no backend-decision telemetry.`);
  const result = {
    label,
    route: new URL(page.url()).pathname,
    readiness,
    packageId: fixture.packageId,
    fixtureHash: fixture.zipSha256,
    maskPlacement: affected.maskPlacement,
    affectedBounds: affected.bounds,
    sourceSemanticRecordPresent: Boolean(source),
    sourceRenderedAsOrdinaryNode: Boolean(source?.dataAttributes?.["data-package-node-id"]),
    backendDecision: affectedBackendDecision,
    backendAvailability: structure.backendRouting?.availability ?? null,
    runtimeRouting: structure.runtimeRouting,
  };
  writeFileSync(join(output, `${label}.json`), stableStringify(result));
  await page.locator(selector).screenshot({ path: join(output, `${label}.png`) });
  return result;
}

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
  await page.getByLabel("Template name").fill(`Mask persistence ${runId}`);
  await page.getByRole("button", { name: "Add template", exact: true }).click();
  await page.getByRole("button", { name: `Open template Mask persistence ${runId}` }).click();
  await page.getByTestId("package-editor-panel").waitFor();
  const imported = await state("imported");
  await context.unroute("**/api/template-package/enrich-figma");
  await context.route("**/api/template-package/enrich-figma", async (route) => {
    runtimeFigmaRequests += 1;
    await route.abort("blockedbyclient");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("package-editor-panel").waitFor();
  const restored = await state("restored-with-figma-blocked");
  const identityFields = ["relationshipId", "maskRevision", "maskSourceId", "maskType", "capability", "renderStrategy", "clipInsets"];
  const identityEqual = identityFields.every((key) => stableStringify(imported.maskPlacement[key]) === stableStringify(restored.maskPlacement[key]))
    && stableStringify(imported.backendDecision) === stableStringify(restored.backendDecision)
    && stableStringify(imported.backendAvailability) === stableStringify(restored.backendAvailability);
  if (!identityEqual || runtimeFigmaRequests !== 0 || restored.sourceRenderedAsOrdinaryNode) throw new Error("Mask persistence/offline identity failed.");
  const report = { schemaVersion: "mask-persistence-evidence-v1", fixtureId, runId, identityEqual, runtimeFigmaRequests, imported, restored, consoleMessages };
  writeFileSync(join(output, "report.json"), stableStringify(report));
  console.log(`[mask-scenario] fixture=${fixtureId} identity=${identityEqual} runtimeFigmaRequests=${runtimeFigmaRequests}`);
  console.log(`[mask-scenario] output=${output}`);
} finally {
  await context.close();
  await browser.close();
  await server.close();
}

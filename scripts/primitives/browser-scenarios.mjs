#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createServer } from "vite";
import {
  browserStructure,
  launchBrowser,
  waitForCurrentReadiness,
} from "../fidelity/browser.mjs";
import {
  loadManifest,
  parseArguments,
  repoRoot,
  stableStringify,
  verifyFixture,
} from "../fidelity/core.mjs";

const args = parseArguments(process.argv.slice(2));
const runId = String(args["run-id"] || "milestone-7-1-primitives-reload");
const allSpecifications = [
  { fixtureId: "bb-cover-thing-primitives", nodeId: "421:27" },
  { fixtureId: "main-visual-section-primitives", nodeId: "2453:1436" },
  { fixtureId: "stroke-test-primitives", nodeId: "443:89" },
  { fixtureId: "gradient-test-linear", nodeId: "451:175" },
  { fixtureId: "gradient-test-paint-opacity", nodeId: "457:46" },
  { fixtureId: "ordered-solid-blue-then-red", nodeId: "459:49" },
  { fixtureId: "ordered-solid-red-then-blue", nodeId: "459:51" },
  { fixtureId: "ordered-solid-three", nodeId: "459:53" },
  { fixtureId: "ordered-solid-hidden-middle", nodeId: "459:55" },
  { fixtureId: "ordered-solid-paint-opacity", nodeId: "459:57" },
  { fixtureId: "ordered-solid-independent-corners", nodeId: "465:73" },
  { fixtureId: "ordered-solid-linear-normal", nodeId: "459:68" },
];
const fixtureFilter = args.fixture ? new Set(String(args.fixture).split(",")) : null;
const specifications = fixtureFilter
  ? allSpecifications.filter((entry) => fixtureFilter.has(entry.fixtureId))
  : allSpecifications;
if (specifications.length === 0) throw new Error(`Unknown primitive fixture filter ${args.fixture}.`);
const output = resolve(args.output || join(repoRoot, "fidelity/evidence/milestone-7-1-primitives", runId));
mkdirSync(output, { recursive: true });
const selector = '[data-testid="package-working-preview"] [data-template-package-canvas]';
const server = await createServer({
  root: repoRoot,
  logLevel: "error",
  server: {
    host: "127.0.0.1",
    port: Number(args.port || 0),
    strictPort: Boolean(args.port),
  },
});
await server.listen();
const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
if (!baseUrl) throw new Error("Primitive scenario server did not publish a URL.");
const browser = await launchBrowser(Boolean(args.headed));
const results = [];

try {
  for (const specification of specifications) {
    const fixture = loadManifest().fixtures.find((entry) => entry.id === specification.fixtureId);
    if (!fixture) throw new Error(`Missing ${specification.fixtureId}.`);
    const verified = verifyFixture(loadManifest(), fixture);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1600 },
      deviceScaleFactor: 1,
      locale: "en-US",
      timezoneId: "UTC",
      reducedMotion: "reduce",
    });
    let runtimeFigmaRequests = 0;
    await context.route("**/api/template-package/enrich-figma", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          code: "provider-unavailable",
          message: "Optional provider disabled by primitive persistence scenario.",
        }),
      });
    });
    const page = await context.newPage();
    const consoleMessages = [];
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        consoleMessages.push({ type: message.type(), text: message.text() });
      }
    });
    page.on("pageerror", (error) =>
      consoleMessages.push({ type: "pageerror", text: error.message }),
    );
    const fixtureOutput = join(output, fixture.id);
    mkdirSync(fixtureOutput, { recursive: true });

    async function state(label) {
      const readiness = await waitForCurrentReadiness(page, selector);
      const structure = await browserStructure(page, selector);
      const node = structure.nodes.find((entry) => entry.id === specification.nodeId);
      const backendDecision = structure.backendRouting?.decisions?.find(
        (entry) => entry.nodeId === specification.nodeId,
      );
      if (!node?.primitiveAppearance) throw new Error(`${fixture.id}/${label} lacks primitive telemetry.`);
      if (!backendDecision) throw new Error(`${fixture.id}/${label} lacks backend-decision telemetry.`);
      const result = {
        label,
        route: new URL(page.url()).pathname,
        fixtureHash: fixture.zipSha256,
        packageId: fixture.packageId,
        nodeId: specification.nodeId,
        readiness,
        bounds: node.bounds,
        primitiveAppearance: node.primitiveAppearance,
        backendDecision,
        backendAvailability: structure.backendRouting?.availability ?? null,
        runtimeRouting: structure.runtimeRouting,
      };
      writeFileSync(join(fixtureOutput, `${label}.json`), stableStringify(result));
      await page.locator(selector).screenshot({ path: join(fixtureOutput, `${label}.png`) });
      return result;
    }

    try {
      await page.goto(`${baseUrl}/templates/new`, { waitUntil: "domcontentloaded" });
      await page.getByTestId("zip-package-input").setInputFiles(verified.path);
      await page.getByRole("button", { name: "Import template" }).click();
      await page.getByTestId("package-step-prepare-fonts").waitFor();
      const replacements = page.getByRole("button", { name: "Use replacement" });
      for (let index = (await replacements.count()) - 1; index >= 0; index -= 1) {
        await replacements.nth(index).click();
      }
      await page.getByRole("button", { name: "Check template" }).click();
      await page.getByTestId("package-step-validate").waitFor();
      await page.getByRole("button", { name: "Continue to fields" }).click();
      await page.getByTestId("package-step-fields").waitFor();
      await page.getByRole("button", { name: "Continue to template details" }).click();
      const templateName = `Primitive persistence ${fixture.id} ${runId}`;
      await page.getByLabel("Template name").fill(templateName);
      await page.getByRole("button", { name: "Add template", exact: true }).click();
      await page.getByRole("button", { name: `Open template ${templateName}` }).click();
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
      const identityEqual = stableStringify({
        sourceRevision: imported.primitiveAppearance.sourceRevision,
        geometryRevision: imported.primitiveAppearance.geometryRevision,
        ownership: imported.primitiveAppearance.ownership,
        effectiveCorners: imported.primitiveAppearance.effectiveCorners,
        strokeStrategy: imported.primitiveAppearance.strokeStrategy,
        linearGradient: imported.primitiveAppearance.linearGradient,
        orderedSolidStack: imported.primitiveAppearance.orderedSolidStack,
        orderedNormalPaintStack: imported.primitiveAppearance.orderedNormalPaintStack,
        paintStrategy: imported.primitiveAppearance.paintStrategy,
        computed: imported.primitiveAppearance.computed,
        backendDecision: imported.backendDecision,
        backendAvailability: imported.backendAvailability,
      }) === stableStringify({
        sourceRevision: restored.primitiveAppearance.sourceRevision,
        geometryRevision: restored.primitiveAppearance.geometryRevision,
        ownership: restored.primitiveAppearance.ownership,
        effectiveCorners: restored.primitiveAppearance.effectiveCorners,
        strokeStrategy: restored.primitiveAppearance.strokeStrategy,
        linearGradient: restored.primitiveAppearance.linearGradient,
        orderedSolidStack: restored.primitiveAppearance.orderedSolidStack,
        orderedNormalPaintStack: restored.primitiveAppearance.orderedNormalPaintStack,
        paintStrategy: restored.primitiveAppearance.paintStrategy,
        computed: restored.primitiveAppearance.computed,
        backendDecision: restored.backendDecision,
        backendAvailability: restored.backendAvailability,
      });
      if (!identityEqual || runtimeFigmaRequests !== 0) {
        throw new Error(`${fixture.id} persistence/offline primitive identity failed.`);
      }
      const report = {
        schemaVersion: "primitive-persistence-evidence-v1",
        fixtureId: fixture.id,
        runId,
        headed: Boolean(args.headed),
        identityEqual,
        runtimeFigmaRequests,
        imported,
        restored,
        consoleMessages,
      };
      writeFileSync(join(fixtureOutput, "report.json"), stableStringify(report));
      results.push(report);
      console.log(`[primitive-scenario] fixture=${fixture.id} identity=${identityEqual} figmaRequests=${runtimeFigmaRequests}`);
    } finally {
      await context.close();
    }
  }
  writeFileSync(join(output, "report.json"), stableStringify({
    schemaVersion: "primitive-persistence-evidence-index-v1",
    runId,
    headed: Boolean(args.headed),
    results,
  }));
  console.log(`[primitive-scenario] output=${output}`);
} finally {
  await browser.close();
  await server.close();
}

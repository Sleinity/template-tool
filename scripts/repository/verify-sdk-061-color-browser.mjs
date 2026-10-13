/** Carrousel's Color control and export lifecycle; numeric color proof is source-level. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import pngjs from "pngjs";
import { launchBrowser, waitForCurrentReadiness } from "../fidelity/browser.mjs";
import { loadManifest, resolveFixture } from "../fidelity/core.mjs";
import { loadExactFontManifest, requireExactFont } from "../fidelity/fonts.mjs";
import { awaitReviewSaveReady } from "../fidelity/review-readiness.mjs";
import { createStudioViteServer } from "./studio-vite-server.mjs";

const fixtureManifest = loadManifest();
const fixture = fixtureManifest.fixtures.find((item) => item.id === "exporter-061-carrousel");
assert(fixture, "Exact Carrousel fixture must be registered.");
const fonts = loadExactFontManifest(fixture.requiredFonts);
const server = await createStudioViteServer();
await server.listen();
const browser = await launchBrowser(false);
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1, acceptDownloads: true });
  await page.goto(`${server.resolvedUrls.local[0]}templates/new`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Import source packages").setInputFiles(resolveFixture(fixtureManifest, fixture));
  await page.getByRole("button", { name: "Continue to fonts", exact: true }).click();
  await page.getByRole("region", { name: "Font preparation", exact: true }).waitFor();
  for (const row of await page.locator("[data-font-requirement-id]").all()) {
    if (await row.getAttribute("data-font-resolution-classification") === "exact") continue;
    const font = requireExactFont(fonts, await row.getAttribute("data-font-family") ?? "", await row.getAttribute("data-font-weight") ?? "", await row.getAttribute("data-font-style") ?? "normal");
    await row.getByRole("button", { name: "Upload font file" }).click();
    await page.getByTestId("package-font-upload-input").setInputFiles(font.path);
    await page.waitForFunction(({ hash }) => [...document.querySelectorAll("[data-font-requirement-id]")].some((element) => element.getAttribute("data-font-linked-binary-hash") === hash && element.getAttribute("data-font-ui-status") === "Ready"), { hash: font.verifiedSha256 });
  }
  await page.getByRole("button", { name: "Continue to checks", exact: true }).click();
  await page.getByRole("region", { name: "Validation workbench", exact: true }).waitFor();
  await page.getByRole("button", { name: "Continue to fields" }).click();
  await page.getByRole("button", { name: "Continue to review", exact: true }).click();
  const name = "SDK 0.6.1 Carrousel Color browser proof";
  await page.getByLabel("Template name").fill(name);
  await awaitReviewSaveReady(page);
  await page.getByRole("button", { name: "Save template", exact: true }).click();
  await page.getByRole("heading", { name: "Library", exact: true }).waitFor();
  const card = page.locator("article").filter({ has: page.getByRole("heading", { name, exact: true }) });
  await card.getByRole("button", { name: "Create output", exact: true }).click();
  await page.getByTestId("studio-draft-editor").waitFor();
  await waitForCurrentReadiness(page, '[data-testid="studio-draft-editor"] [data-template-package-canvas]');
  const colorInputs = page.locator('[data-testid="studio-draft-editor"] input[type="color"]');
  assert.equal(await colorInputs.count(), 1, "Carrousel should expose one marked Color control.");
  await colorInputs.fill("#123456");
  await waitForCurrentReadiness(page, '[data-testid="studio-draft-editor"] [data-template-package-canvas]');
  assert.equal(await colorInputs.inputValue(), "#123456", "Color control must show the accepted explicit edit.");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG", exact: true }).click();
  const download = await downloadPromise;
  const png = pngjs.PNG.sync.read(readFileSync(await download.path()));
  assert.equal(png.width, fixture.canvas.width);
  assert.equal(png.height, fixture.canvas.height);
  await page.getByRole("heading", { name: "Library", exact: true }).waitFor();
  console.log(JSON.stringify({ fixtureId: fixture.id, explicitControlValue: "#123456", dimensions: [png.width, png.height], exportCompleted: true, colorValueOracle: "raw-zip-template-json", result: "pass" }));
} finally {
  await browser.close();
  await server.close();
}

import { chromium } from "playwright";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createStudioViteServer } from "./studio-vite-server.mjs";
import { createCompactLifecycleFixture } from "../compact-lifecycle-fixture.mjs";

const server = await createStudioViteServer({ logLevel: "warn" });
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "template-studio-browser-"));
const fixture = await createCompactLifecycleFixture();
const fixturePath = path.join(temporaryDirectory, fixture.sourceName);
await writeFile(fixturePath, fixture.bytes);
let browser;

try {
  await server.listen();
  const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("The Studio Vite server has no local URL.");

  const [figmaResponse, fontApiResponse, fontAssetResponse] = await Promise.all([
    fetch(`${baseUrl}/api/template-package/enrich-figma`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
    fetch(`${baseUrl}/api/template-package/resolve-open-font`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
    fetch(`${baseUrl}/src/assets/fonts/rethink-sans-600.ttf`),
  ]);
  if (figmaResponse.status !== 400 || fontApiResponse.status !== 404) {
    throw new Error(
      `Studio API routes were not handled: figma=${figmaResponse.status} font=${fontApiResponse.status}.`,
    );
  }
  if (!fontAssetResponse.ok || (await fontAssetResponse.arrayBuffer()).byteLength === 0) {
    throw new Error("The exact Studio font asset URL is unavailable.");
  }

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  let externalRequestCount = 0;
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      await route.continue();
    } else {
      externalRequestCount += 1;
      await route.abort();
    }
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(`${baseUrl}/`);
  await page.waitForURL(`${baseUrl}/templates`);
  await page.getByRole("heading", { name: "Templates", exact: true }).waitFor();

  await page.getByRole("button", { name: "Add template" }).first().click();
  await page.waitForURL(`${baseUrl}/templates/new`);
  await page.getByTestId("zip-package-input").waitFor();
  await page.goBack();
  await page.waitForURL(`${baseUrl}/templates`);
  await page.goForward();
  await page.waitForURL(`${baseUrl}/templates/new`);

  await page.getByTestId("zip-package-input").setInputFiles(fixturePath);
  await page.getByRole("button", { name: "Import template" }).click();
  await page.getByTestId("package-step-prepare-fonts").waitFor();
  await page.getByRole("button", { name: "Check template" }).click();
  await page.getByTestId("package-step-validate").waitFor();
  await page.getByRole("button", { name: "Continue to fields" }).click();
  await page.getByTestId("package-step-fields").waitFor();

  const preview = page.locator(".template-inspection-preview").last();
  const transform = preview.locator(".inspection-preview-transform");
  await transform.waitFor();
  const initialTransform = await transform.getAttribute("style");
  await preview.getByRole("button", { name: "Zoom in" }).click();
  await page.waitForFunction(() =>
    document.querySelector(".template-inspection-preview")?.getAttribute("data-focus-mode") === "manual");
  const zoomedTransform = await transform.getAttribute("style");
  if (initialTransform === zoomedTransform) {
    throw new Error("Studio inspection viewport did not apply imperative zoom.");
  }
  await preview.getByRole("button", { name: "Fit template" }).click();
  await page.waitForFunction(() =>
    document.querySelector(".template-inspection-preview")?.getAttribute("data-focus-mode") === "template");
  const targetButton = preview.getByRole("button", { name: "Fit selected field" });
  if (await targetButton.isDisabled()) {
    throw new Error("Studio inspection viewport did not publish target availability.");
  }
  await targetButton.click();
  await page.waitForFunction(() =>
    document.querySelector(".template-inspection-preview")?.getAttribute("data-focus-mode") === "target");
  const beforeResize = await transform.getAttribute("style");
  await preview.locator(".inspection-preview-viewport").evaluate((element) => {
    element.style.width = "520px";
  });
  await page.waitForFunction((previous) =>
    document.querySelector(".inspection-preview-transform")?.getAttribute("style") !== previous,
  beforeResize);
  await page.goto(`${baseUrl}/templates`);
  await page.getByRole("heading", { name: "Templates", exact: true }).waitFor();

  for (const path of [
    "/templates/missing-template/settings",
    "/drafts/missing-draft",
  ]) {
    await page.goto(`${baseUrl}${path}`);
    await page.waitForURL(`${baseUrl}/templates`);
    await page.getByRole("heading", { name: "Templates", exact: true }).waitFor();
  }

  if (consoleErrors.length) {
    throw new Error(`Studio browser smoke logged errors: ${JSON.stringify(consoleErrors)}`);
  }
  if (externalRequestCount !== 0) {
    throw new Error(`Studio browser smoke attempted ${externalRequestCount} external requests.`);
  }
  await context.close();
  console.log(
    "Studio browser smoke passed: routes, history, APIs, font URL, and inspection fit/zoom/resize/disposal.",
  );
} finally {
  await browser?.close();
  await server.close();
  await rm(temporaryDirectory, { recursive: true, force: true });
}

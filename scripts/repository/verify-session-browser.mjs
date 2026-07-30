import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import { createCompactLifecycleFixture } from "../compact-lifecycle-fixture.mjs";

const root = process.cwd();
const temporaryDirectory = await mkdtemp(
  path.join(os.tmpdir(), "template-session-browser-"),
);
const fixture = await createCompactLifecycleFixture(root);
const fixturePath = path.join(temporaryDirectory, fixture.sourceName);
await writeFile(fixturePath, fixture.bytes);

const server = await createServer({
  root: path.join(root, "examples/minimal-renderer"),
  logLevel: "warn",
  server: { host: "127.0.0.1", port: 0 },
});
let browser;

try {
  await server.listen();
  const applicationUrl = server.resolvedUrls?.local[0];
  if (!applicationUrl) throw new Error("The session browser server has no local URL.");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.goto(applicationUrl);
  await page.locator('input[type="file"]').setInputFiles(fixturePath);
  await page.locator("[data-template-package-canvas]").waitFor();
  await page
    .getByLabel("Upload required font")
    .setInputFiles(
      path.join(
        root,
        "apps/studio/src/assets/fonts/rethink-sans-600.ttf",
      ),
    );
  await page.getByText("Required font is ready.").waitFor();
  await page.waitForFunction(() =>
    !document.querySelector(".identity")?.textContent?.includes("not ready"));

  await page.getByRole("button", { name: "Edit first text field" }).click();
  await page.waitForFunction(() => document.body.textContent?.includes("· edited"));
  await page.getByRole("button", { name: "Save session" }).click();
  await page.getByText("Session saved for offline reload.").waitFor();

  try {
    await page.waitForFunction(() => {
      const button = Array.from(document.querySelectorAll("button")).find(
        (candidate) => candidate.textContent?.trim() === "Export PNG",
      );
      return button instanceof HTMLButtonElement && !button.disabled;
    });
  } catch (error) {
    const state = await page.evaluate(() => ({
      identity: document.querySelector(".identity")?.textContent ?? null,
      status: document.querySelector(".status")?.textContent ?? null,
      canvasReadiness: document.querySelector("[data-template-package-canvas]")
        ?.getAttribute("data-package-settlement-readiness") ?? null,
      exportDisabled: Array.from(document.querySelectorAll("button")).find(
        (candidate) => candidate.textContent?.trim() === "Export PNG",
      )?.disabled ?? null,
    }));
    throw new Error(
      `The session export identity did not become ready: ${JSON.stringify(state)}. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  await page.getByRole("button", { name: "Export PNG" }).click();
  try {
    await page.getByText(
      "PNG captured from the same package revision shown above.",
    ).waitFor({ timeout: 60000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      status: document.querySelector(".status")?.textContent ?? null,
      identity: document.querySelector(".identity")?.textContent ?? null,
      canvasReadiness: document.querySelector("[data-template-package-canvas]")
        ?.getAttribute("data-package-settlement-readiness") ?? null,
    }));
    throw new Error(
      `Session PNG export did not complete: ${JSON.stringify(state)}; errors=${JSON.stringify(consoleErrors)}. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

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
  await page.reload();
  await page.getByText("Restored saved session offline.").waitFor();
  await page.locator("[data-template-package-canvas]").waitFor();
  await page.waitForFunction(() => document.body.textContent?.includes("· edited"));

  if (externalRequestCount !== 0) {
    throw new Error(`Offline restoration attempted ${externalRequestCount} external requests.`);
  }
  if (consoleErrors.length) {
    throw new Error(`Session browser smoke emitted console errors:\n${consoleErrors.join("\n")}`);
  }
  console.log(
    "TemplateSession browser smoke passed: ZIP, edit, save, PNG, reload, and offline restore.",
  );
} finally {
  await browser?.close();
  await server.close();
  await rm(temporaryDirectory, { recursive: true, force: true });
}

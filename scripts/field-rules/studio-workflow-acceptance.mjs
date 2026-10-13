import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launchBrowser } from "../fidelity/browser.mjs";
import { createStudioViteServer } from "../repository/studio-vite-server.mjs";

const root = process.cwd();
const output = resolve(root, "fidelity/evidence/studio-phase-6-workflow-acceptance");
await mkdir(output, { recursive: true });
await Promise.all([rm(resolve(output, "failure.png"), { force: true }), rm(resolve(output, "failure.txt"), { force: true })]);
const manifest = JSON.parse(await readFile(resolve(root, "fidelity/fixtures.json"), "utf8"));
const fixtureRoot = process.env.TEMPLATE_PACKAGE_FIXTURE_DIR ?? manifest.defaultFixtureDirectory;
const fixtureIds = ["exporter-061-deal-of-the-week-post", "deal-of-the-week-banner-crop-editable", "field-rules-boolean-structural-visibility"];
const fixtureFile = async (id) => {
  const entry = manifest.fixtures.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Registered fixture ${id} is missing.`);
  const path = entry.sourcePath.replace("${TEMPLATE_PACKAGE_FIXTURE_DIR}", fixtureRoot);
  const buffer = await readFile(path);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  if (sha256 !== entry.zipSha256) throw new Error(`${id} does not match its registered ZIP bytes.`);
  return {
    file: { name: entry.filename, mimeType: "application/zip", buffer },
    evidence: { id, filename: entry.filename, sha256, bytes: buffer.byteLength },
  };
};
const resolvedFixtures = await Promise.all(fixtureIds.map(fixtureFile));
const [postZip, cropZip, booleanZip] = resolvedFixtures.map((entry) => entry.file);
const fixtureEvidence = resolvedFixtures.map((entry) => entry.evidence);

const server = await createStudioViteServer();
await server.listen();
const browser = await launchBrowser(false);
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(25000);
const errors = [];
const checks = [];
page.on("pageerror", (error) => errors.push(error.message));
const assert = (value, reason) => { if (!value) throw new Error(reason); };
const step = (name) => page.locator(".setup-navigation").getByRole("button", { name, exact: true }).click();
const templateCard = (name) => page.locator("article").filter({ has: page.getByRole("heading", { name, exact: true }) }).filter({ has: page.getByRole("button", { name: "Create output", exact: true }) });
const openSettings = async (card) => {
  await card.getByRole("button", { name: /Actions for/ }).click();
  await page.getByRole("menuitem", { name: "Template Settings", exact: true }).click();
};
const prepareFonts = async () => {
  for (;;) {
    const uploads = page.getByRole("button", { name: /^Upload font(?: file)?$/ });
    const count = await uploads.count();
    if (!count) break;
    const chooser = page.waitForEvent("filechooser");
    await uploads.first().click();
    await (await chooser).setFiles(resolve(root, "apps/studio/src/assets/fonts/rethink-sans-600.ttf"));
    await page.waitForFunction((previous) => [...document.querySelectorAll("button")].filter((button) => /^Upload font(?: file)?$/.test(button.textContent?.trim() ?? "")).length < previous, count);
  }
};
const saveSetup = async (label) => {
  await step("Review");
  const button = page.getByRole("button", { name: label, exact: true });
  await page.waitForFunction((name) => [...document.querySelectorAll("button")].some((candidate) => candidate.textContent === name && !candidate.disabled), label);
  await button.click();
  await page.getByRole("heading", { name: "Library", exact: true }).waitFor();
};
const screenshotPair = async (name) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: resolve(output, `${name}-desktop.png`), fullPage: true });
  await page.setViewportSize({ width: 768, height: 900 });
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  assert(fits, `${name} must fit the supported 768-pixel workspace.`);
  await page.screenshot({ path: resolve(output, `${name}-768.png`), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
};
const backToLibrary = async () => {
  await page.getByRole("button", { name: /Back to (templates|Library)/, exact: true }).click();
  await page.getByRole("heading", { name: "Library", exact: true }).waitFor();
};

try {
  const url = server.resolvedUrls.local[0];
  await page.goto(url);
  await page.getByRole("button", { name: "Add template", exact: true }).click();
  await page.getByLabel("Import source packages").setInputFiles(postZip);
  await step("Fonts"); await prepareFonts();
  assert(await page.getByText("Exact font verified", { exact: true }).count() > 0, "The real post must retain exact managed-font identity.");
  await step("Checks");
  await page.locator('[aria-label="Validation workbench"][data-sdk-export-ready="true"]').waitFor();
  await step("Fields");
  assert(await page.locator("[data-field-id]").count() === 7, "The current exporter post must expose its seven imported fields.");
  await screenshotPair("single-fields");
  await step("Review");
  await page.getByLabel("Template name").fill("Restoration post");
  await step("Fields");
  await saveSetup("Save template");
  checks.push("Exact 0.6.1 post completes Designs, Fonts, Checks, Fields and Review as a reusable Template");

  await templateCard("Restoration post").getByRole("button", { name: "Create output", exact: true }).click();
  await page.getByTestId("studio-draft-editor").waitFor();
  await page.getByLabel("Title", { exact: true }).fill("Independent real-package draft");
  await page.getByText("Saved", { exact: true }).first().waitFor();
  await screenshotPair("single-draft");
  await backToLibrary();
  await templateCard("Restoration post").getByRole("button", { name: "Create output", exact: true }).click();
  await page.getByRole("button", { name: "Continue draft", exact: true }).click();
  assert(await page.getByLabel("Title", { exact: true }).inputValue() === "Independent real-package draft", "Recovery must reload canonical content.");
  const png = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG", exact: true }).click();
  await (await png).saveAs(resolve(output, "single-draft.png"));
  await page.getByRole("heading", {name:"Library",exact:true}).waitFor();
  checks.push("Real-package recovery resumes canonical content and successful export returns to Library");

  await openSettings(templateCard("Restoration post"));
  await step("Designs");
  await page.getByLabel("Import source packages").setInputFiles(cropZip);
  await page.locator(".studio-design-collection").waitFor();
  await step("Fonts"); await prepareFonts();
  await step("Fields");
  let sparseCoverage = false;
  for (const card of await page.locator('.studio-field-rule-list .field-rule-card').all()) {
    await card.locator('.field-rule-card__select').click();
    if (await page.getByLabel('Inspect design', { exact: true }).locator('option').count() === 1) {
      const coverage = card.locator('.studio-field-coverage summary');
      sparseCoverage = await coverage.count() === 1 && !(await coverage.innerText()).includes('2 designs');
      break;
    }
  }
  assert(sparseCoverage, "The real post/banner Family names the design containing a sparse common field.");
  await screenshotPair("family-fields");
  await step("Checks");
  await page.getByRole("button", { name: "Check again", exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent === "Check again" && !button.disabled));
  await screenshotPair("family-validate");
  await saveSetup("Save as new template");
  const familyCard = templateCard("Restoration post").filter({ hasText: "2 designs" });
  await familyCard.waitFor();
  checks.push("Exact portrait post and landscape crop package form a sparse two-aspect Family without changing the original Template");

  await familyCard.getByRole("button", { name: "Create output", exact: true }).click();
  await page.getByTestId("studio-draft-editor").waitFor();
  await page.getByLabel("Title", { exact: true }).fill("Family draft one");
  await page.getByText("Unsaved changes", { exact: true }).waitFor();
  await page.getByLabel(/^(Selected variant|Design)$/).selectOption({ label: "deal-of-the-week-banner-crop-2" });
  await page.getByLabel("Replace Main", { exact: true }).setInputFiles({ name: "replacement.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#ff0066"/></svg>') });
  await page.getByText("Saved", { exact: true }).first().waitFor();
  await backToLibrary();
  await familyCard.getByRole("button", { name: "Create output", exact: true }).click();
  await page.getByRole("button", { name: "Start from scratch", exact: true }).click();
  await page.getByTestId("studio-draft-editor").waitFor();
  assert(await page.getByLabel("Title", { exact: true }).inputValue() !== "Family draft one", "Starting over restores Family defaults.");
  await backToLibrary();
  checks.push("Family variant selection, sparse image replacement and recovery replacement use existing V2 authorities");

  await page.getByRole("button", { name: "Add template", exact: true }).click();
  await page.getByLabel("Import source packages").setInputFiles(booleanZip);
  await step("Fonts"); await prepareFonts();
  await step("Review");
  await page.getByLabel("Template name").fill("Visibility proof");
  await step("Fonts");
  await saveSetup("Save template");
  await templateCard("Visibility proof").getByRole("button", { name: "Create output", exact: true }).click();
  await page.getByTestId("studio-draft-editor").waitFor();
  const visible = page.getByLabel("ShowHeadline", { exact: true });
  await visible.uncheck();
  assert(!await visible.isChecked(), "The real Boolean field must accept structural exclusion.");
  await visible.check();
  assert(await visible.isChecked(), "The real Boolean field must accept restoring structural inclusion.");
  const booleanPng = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG", exact: true }).click();
  await (await booleanPng).saveAs(resolve(output, "boolean-draft.png"));
  checks.push("Exact Boolean package edits, resets, persists and exports through the restored Draft shell");

  assert(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
  await writeFile(resolve(output, "report.json"), JSON.stringify({ passed: true, fixtures: fixtureEvidence, checks, syntheticCoverage: ["number", "date", "color"], errors }, null, 2));
  console.log(JSON.stringify({ passed: true, checks, fixtures: fixtureEvidence, output }));
} catch (cause) {
  await page.screenshot({ path: resolve(output, "failure.png"), fullPage: true });
  await writeFile(resolve(output, "failure.txt"), `${cause.stack}\n${await page.locator("body").innerText()}\nErrors: ${errors.join("; ")}`);
  throw cause;
} finally {
  await browser.close();
  await server.close();
}

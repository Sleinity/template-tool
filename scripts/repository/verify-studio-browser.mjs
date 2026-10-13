import { chromium } from "playwright";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { createHash } from "node:crypto";
import path from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { createStudioViteServer } from "./studio-vite-server.mjs";
import { createCompactLifecycleFixture } from "../compact-lifecycle-fixture.mjs";

const server = await createStudioViteServer({ logLevel: "warn" });
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "template-studio-browser-"));
const fixture = await createCompactLifecycleFixture();
const fixturePath = path.join(temporaryDirectory, "blue-portrait.zip");
const blueLandscapeFixturePath = path.join(temporaryDirectory, "blue-landscape.zip");
const redPortraitFixturePath = path.join(temporaryDirectory, "red-portrait.zip");
const redLandscapeFixturePath = path.join(temporaryDirectory, "red-landscape.zip");
const exactFontPath = path.join(
  process.cwd(),
  "apps",
  "studio",
  "src",
  "assets",
  "fonts",
  "rethink-sans-600.ttf",
);
const previewPng = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XyT9WQAAAABJRU5ErkJggg==",
  "base64",
));
await writeFile(fixturePath, zipSync({
  ...unzipSync(fixture.bytes),
  "preview.png": previewPng,
}, { level: 0 }));
const createFamilyVariantFixture = async ({ outputPath, id, title, withNote = false }) => {
  const entries = unzipSync(fixture.bytes);
  const packageValue = JSON.parse(strFromU8(entries["template.json"]));
  packageValue.packageId = id;
  packageValue.name = title;
  if (withNote) {
    packageValue.nodes.root.children.push("variant-note");
    packageValue.nodes["variant-note"] = {
      ...structuredClone(packageValue.nodes.headline),
      id: "variant-note",
      name: "Variant note",
      bounds: {
        absolute: { x: 40, y: 160, width: 240, height: 40 },
        relative: { x: 40, y: 160, width: 240, height: 40 },
      },
      sizing: {
        horizontal: { mode: "FIXED", value: 240, min: null, max: null },
        vertical: { mode: "FIXED", value: 40, min: null, max: null },
      },
      text: {
        ...structuredClone(packageValue.nodes.headline.text),
        characters: "Only in this variant",
        fontSize: 18,
        lineHeight: { value: 24, unit: "PIXELS" },
      },
    };
    packageValue.editableFields.push({
      id: "variant-note",
      type: "text",
      nodeId: "variant-note",
      property: "text.characters",
      label: "Variant note",
      defaultValue: "Only in this variant",
    });
    (packageValue.diagnostics ??= []).push({
      severity: "warning",
      code: "VARIANT_NOTE_REVIEW",
      message: "Variant-specific review note for searchable validation.",
      nodeId: "variant-note",
      nodeName: "Variant note",
    });
  }
  await writeFile(outputPath, zipSync({
    ...entries,
    "template.json": strToU8(JSON.stringify(packageValue)),
    "preview.png": previewPng,
  }, { level: 0 }));
};
await createFamilyVariantFixture({
  outputPath: blueLandscapeFixturePath,
  id: "sdk-family-blue-landscape",
  title: "Blue Landscape",
});
await createFamilyVariantFixture({
  outputPath: redPortraitFixturePath,
  id: "sdk-family-red-portrait",
  title: "Red Portrait",
});
await createFamilyVariantFixture({
  outputPath: redLandscapeFixturePath,
  id: "sdk-family-red-landscape",
  title: "Red Landscape",
  withNote: true,
});
let browser;

const waitForPath = (page, pathname) => page.waitForURL((url) => url.pathname === pathname);

try {
  await server.listen();
  const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("The Studio Vite server has no local URL.");

  const [figmaResponse, retiredFontApiResponse, fontAssetResponse] = await Promise.all([
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
  if (
    figmaResponse.status !== 400 ||
    retiredFontApiResponse.status !== 404
  ) {
    throw new Error(
      `Studio API contract is unexpected: figma=${figmaResponse.status} retired-font=${retiredFontApiResponse.status}.`,
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
  let allowBlobTeardownErrors = false;
  page.on("console", (message) => {
    if (message.type() === "error") {
      if (
        allowBlobTeardownErrors &&
        message.text().includes("net::ERR_FILE_NOT_FOUND") &&
        message.location().url.startsWith("blob:")
      ) return;
      consoleErrors.push(`${message.text()} (${message.location().url || page.url()})`);
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  // Existing V1 saved-work lifecycle is explicitly isolated after the V2 cutover.
  await page.goto(`${baseUrl}/templates?studio-mode=family-template-fidelity`);
  await waitForPath(page, "/templates");
  await page.getByRole("heading", { name: "Templates", exact: true }).waitFor();
  await page.getByText("Choose a template, then create content for any of its variants.").waitFor();
  await page.getByRole("button", { name: "Add template" }).first().click();
  await waitForPath(page, "/templates/new");
  await page.getByTestId("family-step-variants").waitFor();
  await page.getByText("Drop a template ZIP").waitFor();
  await page.getByRole("button", { name: /3 Fields/ }).waitFor();
  if (await page.getByRole("textbox", { name: "Template name", exact: true }).count()) {
    throw new Error("Template naming should remain focused on Review, not Variants.");
  }

  await page.locator('.setup-package-dropzone input[type="file"]').setInputFiles(fixturePath);
  if (await page.locator(".setup-header__context").count()) {
    throw new Error("A new import should not repeat its temporary title in the setup header.");
  }
  await page.locator(".family-property-table tbody tr").first().waitFor({ timeout: 30_000 });
  if (await page.locator(".family-property-table tbody tr").count() !== 1) {
    throw new Error("The first imported ZIP did not appear in the variant table.");
  }
  const addZipInput = page.locator('label.ui-file-picker-button:has-text("Add variant") input[type="file"]');
  await addZipInput.setInputFiles(blueLandscapeFixturePath);
  await addZipInput.setInputFiles(redPortraitFixturePath);
  await addZipInput.setInputFiles(redLandscapeFixturePath);
  const variantNameInputs = page.locator(".family-variant-row__name");
  for (const [index, title] of [
    "Blue Portrait",
    "Blue Landscape",
    "Red Portrait",
    "Red Landscape",
  ].entries()) {
    await variantNameInputs.nth(index).fill(title);
  }
  const variantMenuTrigger = page.getByRole("button", {
    name: "More actions for Blue Portrait",
    exact: true,
  });
  await variantMenuTrigger.click();
  const variantMenu = page.getByRole("menu").last();
  await variantMenu.waitFor();
  const variantMenuBounds = await variantMenu.boundingBox();
  if (
    !variantMenuBounds ||
    variantMenuBounds.x < 0 ||
    variantMenuBounds.y < 0 ||
    variantMenuBounds.x + variantMenuBounds.width > 1280 ||
    variantMenuBounds.y + variantMenuBounds.height > 900
  ) {
    throw new Error("The variant action menu was clipped or escaped the viewport.");
  }
  if (!(await variantMenu.evaluate((element) => element.parentElement === document.body))) {
    throw new Error("The variant action menu was not portalled above its clipping list.");
  }
  await page.keyboard.press("Escape");
  await page.waitForFunction(() =>
    document.activeElement?.getAttribute("aria-label") === "More actions for Blue Portrait",
  );
  const previewTrigger = page.locator(".family-property-table tbody tr").first().getByRole("button", { name: "Preview" });
  await previewTrigger.click();
  const variantDrawer = page.getByRole("dialog", { name: "Blue Portrait" });
  await variantDrawer.waitFor();
  await variantDrawer.getByRole("button", { name: "Close details" }).press("Escape");
  await variantDrawer.waitFor({ state: "hidden" });
  if (!(await previewTrigger.evaluate((element) => element === document.activeElement))) {
    throw new Error("Closing variant details did not restore focus to the preview trigger.");
  }

  const addProperty = async (name, assignments) => {
    await page.getByRole("button", { name: "Add property" }).click();
    const propertyName = page.getByRole("textbox", { name: "New property name", exact: true });
    if (await propertyName.inputValue() !== "") {
      throw new Error("A new selection property was unexpectedly prefilled.");
    }
    await propertyName.fill(name);
    await page.locator(".family-property-table__draft-heading").getByRole("button", { name: "Add", exact: true }).click();
    for (const [variant, option] of Object.entries(assignments)) {
      const assignment = page.getByLabel(`${name} for ${variant}`, { exact: true });
      await assignment.fill(option);
      await assignment.press("Tab");
    }
  };
  await addProperty("Colour", {
    "Blue Portrait": "Blue",
    "Blue Landscape": "Blue",
    "Red Portrait": "Red",
    "Red Landscape": "Red",
  });
  await addProperty("Dimension", {
    "Blue Portrait": "Portrait",
    "Blue Landscape": "Landscape",
    "Red Portrait": "Portrait",
    "Red Landscape": "Landscape",
  });

  const redLandscapeColour = page.getByLabel("Colour for Red Landscape", { exact: true });
  await redLandscapeColour.fill("Blue");
  await redLandscapeColour.press("Tab");
  await page.getByText("Same selection values as Blue Landscape", { exact: true }).waitFor();
  await redLandscapeColour.fill("Red");
  await redLandscapeColour.press("Tab");
  await page.getByText("Same selection values as Blue Landscape", { exact: true }).waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Continue to fonts" }).click();
  await page.getByTestId("family-step-fonts").waitFor();
  await page.locator('.family-font-row input[type="file"]').first().setInputFiles(exactFontPath);
  await page.locator('.family-font-row[data-ready="true"]').waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: "Continue to fields" }).click();
  await page.getByTestId("family-step-fields").waitFor();
  const exactTextNode = page.locator('[data-package-text-runtime-font-family^="__template_font_"]').first();
  await exactTextNode.waitFor({ timeout: 30_000 });
  const runtimeFamily = await exactTextNode.getAttribute("data-package-text-runtime-font-family");
  if (!runtimeFamily) throw new Error("The family preview did not publish a private exact-font family.");
  await page.waitForFunction((family) => {
    const normalize = (value) => value.replace(/^['"]|['"]$/g, "");
    const registeredFace = Array.from(document.fonts).some((candidate) =>
      normalize(candidate.family) === family && candidate.status === "loaded"
    );
    const cssOwner = Array.from(document.querySelectorAll("style[data-template-managed-font]"))
      .some((node) => node.dataset.templateManagedFont === family && node.isConnected);
    return registeredFace || cssOwner;
  }, runtimeFamily, { timeout: 30_000 });
  const exactFontEvidence = await page.evaluate((family) => {
    const normalize = (value) => value.replace(/^['"]|['"]$/g, "");
    const face = Array.from(document.fonts).find((candidate) =>
      normalize(candidate.family) === family && candidate.status === "loaded"
    );
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return { registered: Boolean(face), metricDelta: 0 };
    const sample = "Deal of the week WWW iii";
    context.font = `600 96px ${JSON.stringify(family)}, system-ui`;
    const exactWidth = context.measureText(sample).width;
    context.font = "600 96px system-ui";
    const fallbackWidth = context.measureText(sample).width;
    return {
      registered: Boolean(face),
      metricDelta: Math.abs(exactWidth - fallbackWidth),
      family,
      registeredFamilies: Array.from(document.fonts).map((candidate) => ({
        family: candidate.family,
        status: candidate.status,
      })),
      styleOwnerConnected: Array.from(document.querySelectorAll("style[data-template-managed-font]"))
        .some((node) => node.dataset.templateManagedFont === family && node.isConnected),
    };
  }, runtimeFamily);
  if (
    (!exactFontEvidence.registered && !exactFontEvidence.styleOwnerConnected) ||
    exactFontEvidence.metricDelta < 0.5
  ) {
    throw new Error(
      `The family preview declared an exact font without a loaded, metrically distinct private face: ${JSON.stringify(exactFontEvidence)}`,
    );
  }
  // The legacy package-only inspection viewport does not own managed-font
  // preparation. External face removal is exercised by the public V2 lifecycle
  // harness; keep this explicit probe to reproduce the old unsupported assumption.
  const probeExternalRemoval = process.argv.includes("--probe-external-font-removal");
  const fontEvidence = async () => page.evaluate((family) => ({
    selectedVariant: document.querySelector(".context-preview-dock__trigger")?.textContent,
    faces: [...document.fonts].filter(face => face.family.replace(/^['"]|['"]$/g, "") === family).map(face => ({ family: face.family, status: face.status, weight: face.weight, style: face.style })),
    renderIdentities: [...document.querySelectorAll("[data-template-package-canvas]")].map(node => Object.fromEntries([...node.attributes].filter(attribute => /revision|readiness|identity/.test(attribute.name)).map(attribute => [attribute.name, attribute.value]))),
  }), runtimeFamily);
  const lifecycleEvidence = { runtimeFamily, probeExternalRemoval, binaryHash: createHash("sha256").update(await readFile(exactFontPath)).digest("hex"), before: await fontEvidence() };
  if (probeExternalRemoval) await page.evaluate((family) => {
    const face = [...document.fonts].find(candidate => candidate.family.replace(/^['"]|['"]$/g, "") === family);
    if (face) document.fonts.delete(face);
  }, runtimeFamily);
  await page.locator(".context-preview-dock__trigger").click();
  await page.getByRole("textbox", { name: "Search variants" }).fill("Blue Landscape");
  await page.getByRole("option").filter({ hasText: "Blue Landscape" }).click();
  try {
  await page.waitForFunction((family) => {
    const normalize = (value) => value.replace(/^['"]|['"]$/g, "");
    return Array.from(document.fonts).some((candidate) =>
      normalize(candidate.family) === family && candidate.status === "loaded"
    );
  }, runtimeFamily, { timeout: 30_000 });
  } finally {
    lifecycleEvidence.after = await fontEvidence();
    await mkdir("fidelity/evidence/prerelease-20260929", { recursive: true });
    await writeFile(`fidelity/evidence/prerelease-20260929/legacy-font-${probeExternalRemoval ? "removal-probe" : "switch"}.json`, JSON.stringify(lifecycleEvidence, null, 2));
  }
  await page.getByText("All variants").first().waitFor();
  await page.locator(".family-field-card--attention .family-field-card__summary").first().click();
  await page.locator(".family-unmatched-field").getByRole("button", {
    name: "Keep only in Red Landscape",
  }).click();
  await page.getByText("Red Landscape only").waitFor();
  await page.getByRole("button", { name: "Continue to field rules" }).click();
  await page.getByTestId("family-step-rules").waitFor();
  await page.getByText("Red Landscape only").waitFor();
  await page.getByRole("button", { name: "Validate template" }).click();
  await page.getByTestId("family-step-validate").waitFor();
  await page.getByTestId("package-quality-report").waitFor();
  await page.getByRole("button", { name: /Import (Ready|Needs attention|Blocked)/ }).waitFor();
  await page.getByRole("button", { name: /Preview (Ready|Needs attention|Blocked)/ }).waitFor();
  await page.getByRole("button", { name: /Media & fonts (Ready|Needs attention|Blocked)/ }).waitFor();
  await page.getByRole("button", { name: /Fields (Ready|Needs attention|Blocked)/ }).waitFor();
  await page.getByRole("button", { name: /Export (Ready|Needs attention|Blocked)/ }).waitFor();
  if (
    await page.locator(".family-readiness-table").count() !== 0 ||
    await page.getByText(/^Test content ·/).count() !== 0 ||
    await page.getByText("Package technical report", { exact: true }).count() !== 0
  ) {
    throw new Error("Family validation rendered a removed duplicate summary or technical section.");
  }

  const selectValidationVariant = async (name) => {
    await page.locator(".context-preview-dock__trigger").click();
    const search = page.getByRole("textbox", { name: "Search variants" });
    await search.fill(name);
    await page.getByRole("option").filter({ hasText: name }).click();
  };

  await selectValidationVariant("Blue Portrait");
  const qualitySearch = page.getByLabel("Search", { exact: true });
  await qualitySearch.fill("VARIANT_NOTE_REVIEW");
  await page.getByText("No diagnostics match these filters").waitFor();
  await selectValidationVariant("Red Landscape");
  await page.getByText("Variant-specific review note for searchable validation.", { exact: true }).waitFor();
  await selectValidationVariant("Blue Portrait");
  await page.getByText("No diagnostics match these filters").waitFor();
  await selectValidationVariant("Red Landscape");
  await page.getByText("Variant-specific review note for searchable validation.", { exact: true }).waitFor();
  if (await page.locator(".family-import-preview--diagnostics").count() !== 1) {
    throw new Error("Family validation must use exactly one visible session preview.");
  }
  await qualitySearch.fill("");
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll("button"))
      .find((candidate) => candidate.textContent?.trim() === "Review template");
    return button instanceof HTMLButtonElement && !button.disabled;
  }, undefined, { timeout: 30_000 });
  await page.getByRole("button", { name: "Review template" }).click();
  await page.getByTestId("family-step-review").waitFor();
  const reviewTemplateName = page.getByRole("textbox", { name: "Template name", exact: true });
  if (await reviewTemplateName.inputValue() !== "") {
    throw new Error("A new import unexpectedly persisted the temporary setup title as its final name.");
  }
  await reviewTemplateName.fill("Studio family smoke");
  await page.getByTestId("family-step-review").getByText(/variant-specific/i).waitFor();
  for (const width of [1280, 900, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const overflows = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    if (overflows) throw new Error(`Family Review overflowed horizontally at ${width}px.`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Add template" }).click();
  await waitForPath(page, "/templates");
  const familyThumbnail = page.getByRole("img", { name: "Studio family smoke preview" });
  try { await familyThumbnail.waitFor({ timeout: 30_000 }); }
  catch (error) {
    await mkdir("fidelity/evidence/prerelease-20260929", { recursive: true });
    await writeFile("fidelity/evidence/prerelease-20260929/legacy-thumbnail-blocker.json", JSON.stringify(await page.evaluate(() => ({ url: location.href, cards: [...document.querySelectorAll(".family-template-card")].map(card => ({ text: card.textContent, image: card.querySelector("img")?.outerHTML, thumbnail: card.querySelector(".template-thumbnail")?.outerHTML })) })), null, 2));
    throw error;
  }
  await page.waitForFunction(() =>
    document.querySelector('img[alt="Studio family smoke preview"]')?.getAttribute("data-loaded") === "true",
  );
  if (!(await familyThumbnail.getAttribute("src"))?.startsWith("blob:")) {
    throw new Error("The saved family card did not resolve the first variant preview.png asset.");
  }
  const restorationPage = await context.newPage();
  await restorationPage.goto(`${baseUrl}/templates?studio-mode=family-template-fidelity`);
  await restorationPage.getByRole("heading", { name: "Templates", exact: true }).waitFor();
  const restoredFamilyThumbnail = restorationPage.getByRole("img", { name: "Studio family smoke preview" });
  try { await restoredFamilyThumbnail.waitFor({ timeout: 30_000 }); }
  catch (error) {
    await mkdir("fidelity/evidence/prerelease-20260929", { recursive: true });
    await writeFile("fidelity/evidence/prerelease-20260929/legacy-restored-thumbnail-blocker.json", JSON.stringify(await restorationPage.evaluate(() => ({ url: location.href, cards: [...document.querySelectorAll(".family-template-card")].map(card => ({ text: card.textContent, thumbnail: card.querySelector(".template-thumbnail")?.outerHTML })) })), null, 2));
    throw error;
  }
  await restorationPage.waitForFunction(() =>
    document.querySelector('img[alt="Studio family smoke preview"]')?.getAttribute("data-loaded") === "true",
  );
  if (!(await restoredFamilyThumbnail.getAttribute("src"))?.startsWith("blob:")) {
    throw new Error("The saved family preview.png was not restored in a fresh page session.");
  }
  await restorationPage.close();
  await page.setViewportSize({ width: 390, height: 650 });
  const familyMenuTrigger = page.getByRole("button", {
    name: "Actions for Studio family smoke",
    exact: true,
  });
  await familyMenuTrigger.click();
  const familyMenuBounds = await page.getByRole("menu").last().boundingBox();
  if (
    !familyMenuBounds ||
    familyMenuBounds.x < 0 ||
    familyMenuBounds.y < 0 ||
    familyMenuBounds.x + familyMenuBounds.width > 390 ||
    familyMenuBounds.y + familyMenuBounds.height > 650
  ) {
    throw new Error("The responsive family-card menu was clipped or escaped the viewport.");
  }
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", {
    name: "Open template Studio family smoke",
  }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/drafts/"));
  await page.getByTestId("family-editor-panel").waitFor();
  const studioVariantNote = page.getByLabel("Variant note", { exact: true });
  if (await studioVariantNote.count() !== 0) {
    throw new Error("Studio showed a variant-specific field in an inapplicable variant.");
  }
  const colourSelector = page.getByLabel("Colour", { exact: true });
  const dimensionSelector = page.getByLabel("Dimension", { exact: true });
  await colourSelector.selectOption({ label: "Red" });
  await dimensionSelector.selectOption({ label: "Landscape" });
  await studioVariantNote.fill("Studio retained variant-only value");
  await colourSelector.selectOption({ label: "Blue" });
  if (await studioVariantNote.count() !== 0) {
    throw new Error("Studio did not hide a variant-specific field after selection changed.");
  }
  await colourSelector.selectOption({ label: "Red" });
  if (await studioVariantNote.inputValue() !== "Studio retained variant-only value") {
    throw new Error("Studio lost a hidden variant-specific field value.");
  }
  await page.getByText("Saving…", { exact: true }).waitFor();
  await page.getByText("Saved", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Templates" }).click();
  await waitForPath(page, "/templates");
  await page.getByRole("button", {
    name: "Open template Studio family smoke",
  }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Continue latest draft" }).waitFor();
  await page.getByRole("dialog").getByRole("button", { name: "Start new" }).waitFor();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

  allowBlobTeardownErrors = true;
  await page.goto(`${baseUrl}/templates?studio-mode=single-template-fidelity`);
  allowBlobTeardownErrors = false;
  await page.getByRole("heading", { name: "Templates", exact: true }).waitFor();

  await page.getByRole("button", { name: "Add template" }).first().click();
  await waitForPath(page, "/templates/new");
  await page.getByTestId("zip-package-input").waitFor();
  await page.goBack();
  await waitForPath(page, "/templates");
  await page.goForward();
  await waitForPath(page, "/templates/new");

  await page.getByTestId("zip-package-input").setInputFiles(fixturePath);
  await page.getByRole("button", { name: "Import template" }).click();
  await page.getByTestId("package-step-prepare-fonts").waitFor();
  if (
    await page.getByText(/available fonts|add open font|use replacement|link font/i)
      .count()
  ) {
    throw new Error("Studio exposed a retired font suggestion or replacement control.");
  }
  const initialFontUpload = page.getByRole("button", { name: "Upload font file" });
  if (await initialFontUpload.count()) {
    await initialFontUpload.click();
    await page.getByTestId("package-font-upload-input").setInputFiles({
      name: "not-a-font.ttf",
      mimeType: "font/ttf",
      buffer: Buffer.from("not a font"),
    });
    await page.locator('[data-font-ui-status="File doesn’t match"]').waitFor();
    if (!(await page.getByRole("button", { name: "Check template" }).isDisabled())) {
      throw new Error("Studio allowed progression after an invalid font upload.");
    }
    await page.getByRole("button", { name: "Upload font file" }).click();
    await page.getByTestId("package-font-upload-input").setInputFiles(
      exactFontPath,
    );
  }
  await page.locator('[data-font-ui-status="Ready"]').waitFor();
  if (await page.getByText(/emoji/i).count()) {
    throw new Error("Studio exposed internal emoji fallback evidence.");
  }
  const verifiedHash = await page
    .locator("[data-font-linked-binary-hash]")
    .getAttribute("data-font-linked-binary-hash");
  await page.getByRole("button", { name: "Replace file" }).click();
  await page.getByTestId("package-font-upload-input").setInputFiles({
    name: "invalid-replacement.ttf",
    mimeType: "font/ttf",
    buffer: Buffer.from("not a font"),
  });
  await page.locator('[data-font-ui-status="Ready"]').waitFor();
  if (
    !verifiedHash ||
    await page.locator("[data-font-linked-binary-hash]").getAttribute(
      "data-font-linked-binary-hash",
    ) !== verifiedHash
  ) {
    throw new Error("An invalid replacement changed the verified exact font.");
  }
  await page.goto(`${baseUrl}/templates/new?studio-mode=single-template-fidelity`);
  await page.getByTestId("zip-package-input").setInputFiles(fixturePath);
  await page.getByRole("button", { name: "Import template" }).click();
  await page.getByTestId("package-step-prepare-fonts").waitFor();
  await page.locator('[data-font-ui-status="Ready"]').waitFor();
  await page.getByRole("button", { name: "Replace file" }).waitFor();
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
  await page.goto(`${baseUrl}/templates?studio-mode=single-template-fidelity`);
  await page.getByRole("heading", { name: "Templates", exact: true }).waitFor();

  for (const path of [
    "/templates/missing-template/settings",
    "/drafts/missing-draft",
  ]) {
    await page.goto(`${baseUrl}${path}?studio-mode=single-template-fidelity`);
    await waitForPath(page, "/templates");
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
    "Studio browser smoke passed: four-ZIP Colour/Dimension selection, duplicate tuple blocking, sparse-field import/edit/draft entry, exact font rejection/upload/atomic replacement/reuse, routes, history, Figma API, retired open-font route, font URL, and inspection fit/zoom/resize/disposal.",
  );
} finally {
  await browser?.close();
  await server.close();
  await rm(temporaryDirectory, { recursive: true, force: true });
}

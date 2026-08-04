import { createHash } from "node:crypto";
import {
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { strToU8, unzipSync, zipSync } from "fflate";
import { chromium } from "playwright";
import { preview } from "vite";
import { createCompactLifecycleFixture } from "../compact-lifecycle-fixture.mjs";
import {
  loadRuntimePackageDefinitions,
  resolveFixedRuntimeVersion,
  runtimeArchiveName,
} from "./sdk-runtime-manifest.mjs";

const root = process.cwd();
const fixedVersion = await resolveFixedRuntimeVersion(root);
const version =
  process.env.TEMPLATE_RUNTIME_RELEASE_VERSION ??
  fixedVersion;
if (version !== fixedVersion) {
  throw new Error(
    `Requested runtime version ${version} does not match ${fixedVersion}.`,
  );
}
const args = process.argv.slice(2);
if (args.length > 0 && (args[0] !== "--archives" || !args[1])) {
  throw new Error(
    "Usage: node verify-template-editor-reference.mjs [--archives ARCHIVES_DIRECTORY]",
  );
}
const sourceArchivesDirectory = args[0] === "--archives"
  ? path.resolve(args[1])
  : null;
const packageDefinitions = await loadRuntimePackageDefinitions(root);
const pnpmExecutable = process.env.TEMPLATE_PNPM_EXECUTABLE ?? "pnpm";
const workspace = await mkdtemp(
  path.join(os.tmpdir(), "template-editor-reference-"),
);
const consumerDirectory = path.join(workspace, "consumer");
const vendorDirectory = path.join(consumerDirectory, "vendor");
const fixturePath = path.join(workspace, "template-editor-acceptance.zip");
const imagePath = path.join(workspace, "replacement.png");
const fontPath = path.join(
  root,
  "apps",
  "studio",
  "src",
  "assets",
  "fonts",
  "rethink-sans-600.ttf",
);
let browser;
let server;
let restrictedServer;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result.stdout;
}

function secretFreeEnvironment() {
  const environment = { ...process.env, CI: "true" };
  for (const name of [
    "NODE_AUTH_TOKEN",
    "NPM_TOKEN",
    "GITHUB_TOKEN",
    "GH_TOKEN",
  ]) {
    delete environment[name];
  }
  environment.NPM_CONFIG_USERCONFIG = path.join(
    consumerDirectory,
    ".npmrc-public-only",
  );
  return environment;
}

async function createAcceptanceFixture() {
  const compact = await createCompactLifecycleFixture(root);
  const files = unzipSync(compact.bytes);
  const packageValue = JSON.parse(
    new TextDecoder().decode(files["template.json"]),
  );
  const assetId = "asset:image:template-editor-acceptance";
  packageValue.nodes.root.children.push("hero-image");
  packageValue.nodes["hero-image"] = {
    id: "hero-image",
    name: "Hero image",
    type: "RECTANGLE",
    parentId: "root",
    children: [],
    bounds: {
      absolute: { x: 320, y: 20, width: 120, height: 120 },
      relative: { x: 320, y: 20, width: 120, height: 120 },
    },
    positioning: "ABSOLUTE",
    layout: {
      mode: "NONE",
      wrap: false,
      gap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      primaryAlignment: "MIN",
      counterAlignment: "MIN",
      clipContent: false,
    },
    sizing: {
      horizontal: { mode: "FIXED", value: 120, min: null, max: null },
      vertical: { mode: "FIXED", value: 120, min: null, max: null },
    },
    appearance: {
      visible: true,
      opacity: 1,
      fills: [{
        type: "IMAGE",
        visible: true,
        opacity: 1,
        blendMode: "NORMAL",
      }],
      strokes: [],
      effects: [],
      cornerRadius: 0,
      clipContent: false,
    },
    image: {
      assetId,
      deferred: false,
      hash: "template-editor-acceptance",
      scaleMode: "FILL",
      imageTransform: [[1, 0, 0], [0, 1, 0]],
    },
  };
  packageValue.assets[assetId] = {
    id: assetId,
    type: "image",
    source: "embedded",
    deferred: false,
    nodeId: "hero-image",
    mimeType: "image/png",
    hash: "template-editor-acceptance",
    dataUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    width: 120,
    height: 120,
    scaleMode: "FILL",
    imageTransform: [[1, 0, 0], [0, 1, 0]],
  };
  packageValue.editableFields.push({
    id: "hero-image",
    type: "image",
    nodeId: "hero-image",
    property: "image.assetId",
    label: "Hero image",
    defaultValue: assetId,
    constraints: {
      allowedMimeTypes: ["image/png"],
      maxFileSizeMb: 0.01,
      replacementMode: "cover",
    },
  });
  const headlineNodeId =
    packageValue.editableFields.find((field) => field.id === "headline")
      ?.nodeId ?? packageValue.rootNodeId;
  packageValue.fontRequirements = [
    {
      id: "font:rethink-sans:600:normal",
      family: "Rethink Sans",
      style: "SemiBold",
      cssStyle: "normal",
      weight: 600,
      postScriptName: "RethinkSans-SemiBold",
      usedBy: [headlineNodeId],
      characters: "Portable SDK session ☀️",
      editable: true,
      mixedStyle: false,
      source: "template-editor-acceptance",
      availableInFigma: false,
    },
  ];
  return zipSync({
    "template.json": strToU8(JSON.stringify(packageValue)),
    "assets.json": strToU8(JSON.stringify({ version: 1, assets: [] })),
  }, { level: 0 });
}

try {
  await cp(
    path.join(root, "examples", "template-editor-integration"),
    consumerDirectory,
    {
      recursive: true,
      filter(source) {
        const relative = path.relative(
          path.join(root, "examples", "template-editor-integration"),
          source,
        );
        const segments = relative.split(path.sep);
        return !segments.some((segment) =>
          segment === "dist" ||
          segment === "node_modules" ||
          segment.endsWith(".tsbuildinfo") ||
          segment === "vite.config.js" ||
          segment === "vite.config.d.ts");
      },
    },
  );
  const referenceSource = await readFile(
    path.join(consumerDirectory, "src", "main.tsx"),
    "utf8",
  );
  for (const required of [
    'from "@sleinity/template-react/editor"',
    "TemplateSessionViewport",
    "useTemplateSessionEditableFields",
    "useTemplateSessionEditableField",
    "useTemplateSessionDiagnosticSummary",
  ]) {
    if (!referenceSource.includes(required)) {
      throw new Error(`The generic reference does not adopt ${required}.`);
    }
  }
  for (const retiredGlue of [
    "function SessionPreviewViewport",
    "getPackageFieldValue",
    "ResizeObserver",
  ]) {
    if (referenceSource.includes(retiredGlue)) {
      throw new Error(`The generic reference retains host glue: ${retiredGlue}.`);
    }
  }
  await mkdir(vendorDirectory, { recursive: true });
  await writeFile(
    path.join(consumerDirectory, ".npmrc-public-only"),
    "",
  );
  await writeFile(fixturePath, await createAcceptanceFixture());
  await writeFile(
    imagePath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  );

  if (sourceArchivesDirectory) {
    for (const item of packageDefinitions) {
      const archive = runtimeArchiveName(item, version);
      await copyFile(
        path.join(sourceArchivesDirectory, archive),
        path.join(vendorDirectory, archive),
      );
    }
  } else {
    for (const item of packageDefinitions) {
      run(
        pnpmExecutable,
        ["pack", "--pack-destination", vendorDirectory],
        {
          cwd: path.join(root, "packages", item.directory),
          env: { ...process.env, CI: "true" },
        },
      );
    }
  }

  const archiveEvidence = [];
  const vendoredDependencies = {};
  for (const item of packageDefinitions) {
    const archive = runtimeArchiveName(item, version);
    const archivePath = path.join(vendorDirectory, archive);
    const bytes = await readFile(archivePath);
    archiveEvidence.push({
      ...item,
      archive,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
    vendoredDependencies[item.name] = `file:vendor/${archive}`;
  }

  const consumerManifestPath = path.join(consumerDirectory, "package.json");
  const consumerManifest = JSON.parse(
    await readFile(consumerManifestPath, "utf8"),
  );
  consumerManifest.dependencies = {
    ...consumerManifest.dependencies,
    ...vendoredDependencies,
  };
  await writeFile(
    consumerManifestPath,
    JSON.stringify(consumerManifest, null, 2) + "\n",
  );
  await writeFile(
    path.join(consumerDirectory, "pnpm-workspace.yaml"),
    `packages:
  - "."
allowBuilds:
  esbuild: true
onlyBuiltDependencies:
  - esbuild
overrides:
${Object.entries(vendoredDependencies)
  .map(([name, archive]) => `  "${name}": "${archive}"`)
  .join("\n")}
`,
  );

  const environment = secretFreeEnvironment();
  run(pnpmExecutable, ["install", "--prefer-offline=false"], {
    cwd: consumerDirectory,
    env: environment,
  });
  const lockFile = await readFile(
    path.join(consumerDirectory, "pnpm-lock.yaml"),
    "utf8",
  );
  if (
    lockFile.includes("workspace:") ||
    lockFile.includes("link:") ||
    lockFile.includes("npm.pkg.github.com")
  ) {
    throw new Error(
      "The packed reference lockfile contains a workspace, link, or GitHub Packages reference.",
    );
  }
  for (const item of archiveEvidence) {
    if (!lockFile.includes(`vendor/${item.archive}`)) {
      throw new Error(`The packed reference lockfile omits ${item.archive}.`);
    }
    const installedRoot = path.join(
      consumerDirectory,
      "node_modules",
      "@sleinity",
      item.directory,
    );
    const manifest = JSON.parse(
      await readFile(path.join(installedRoot, "package.json"), "utf8"),
    );
    if (manifest.version !== version) {
      throw new Error(
        `${item.name}@${manifest.version} installed; expected ${version}.`,
      );
    }
    for (const fileName of ["index.js", "index.d.ts"]) {
      const source = await readFile(
        path.join(installedRoot, "dist", fileName),
        "utf8",
      );
      if (
        [
          "apps/studio",
          "workspace:",
          "/Users/",
          "/private/",
          "NODE_AUTH_TOKEN",
        ].some((term) => source.includes(term)) ||
        /(?:from|import)\s*["']\.\.\/\.\.\/src\//.test(source)
      ) {
        throw new Error(
          `${item.name}/${fileName} contains a repository or credential reference.`,
        );
      }
    }
    if (item.directory === "template-react") {
      for (const fileName of [
        "importer.js",
        "importer.d.ts",
        "importer.css",
        "editor.js",
        "editor.d.ts",
      ]) {
        const source = await readFile(
          path.join(installedRoot, "dist", fileName),
          "utf8",
        );
        if (
          [
            "apps/studio",
            "lucide-react",
            "workspace:",
            "/Users/",
            "/private/",
          ].some((term) => source.includes(term))
        ) {
          throw new Error(
            `@sleinity/template-react/${fileName} contains a Studio, workspace, or repository reference.`,
          );
        }
      }
    }
  }
  run(pnpmExecutable, ["build"], {
    cwd: consumerDirectory,
    env: environment,
  });

  server = await preview({
    root: consumerDirectory,
    configFile: false,
    logLevel: "warn",
    preview: {
      host: "127.0.0.1",
      port: 0,
      headers: {
        "Content-Security-Policy": [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self' data: blob:",
          "connect-src 'self' blob: data:",
          "worker-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'self'",
        ].join("; "),
      },
    },
  });
  const applicationUrl = server.resolvedUrls?.local?.[0];
  if (!applicationUrl) {
    throw new Error("The packed template editor reference has no browser URL.");
  }

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  let externalRequestCount = 0;
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.hostname === "127.0.0.1" ||
      url.hostname === "localhost" ||
      url.protocol === "data:" ||
      url.protocol === "blob:"
    ) {
      await route.continue();
    } else {
      externalRequestCount += 1;
      await route.abort();
    }
  });
  const page = await context.newPage();
  const consoleErrors = [];
  let downloadCount = 0;
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("download", () => {
    downloadCount += 1;
  });

  await page.goto(`${applicationUrl}?acceptance=1`);
  const runtimeSupport = page.locator('[data-testid="runtime-support"]');
  await page.waitForTimeout(1_000);
  if (await runtimeSupport.count() === 0) {
    throw new Error(
      `Supported-CSP reference did not mount. Browser errors: ${
        consoleErrors.join(" | ") || "none"
      }. Body: ${(await page.locator("body").innerText()).slice(0, 500)}`,
    );
  }
  await page.waitForFunction(() =>
    document.querySelector('[data-testid="runtime-support"]')
      ?.getAttribute("data-runtime-status") !== "checking");
  const runtimeStatus = await runtimeSupport.getAttribute("data-runtime-status");
  if (runtimeStatus !== "ready") {
    throw new Error(
      `Supported-CSP runtime preflight returned ${runtimeStatus}: ${
        await runtimeSupport.getAttribute("data-runtime-issues")
      }`,
    );
  }
  for (const surface of ["page", "modal", "drawer"]) {
    await page
      .locator(
        `[data-headless-surface="${surface}"][data-active-step="zip-import"]`,
      )
      .waitFor();
  }
  await page.getByRole("heading", { name: "Template dashboard" }).waitFor();
  await page.getByText("No templates have been added.").waitFor();
  await page.getByRole("button", { name: "Add new template" }).click();
  await page.getByRole("button", { name: "Templates" }).click();
  await page.getByText("Template setup cancelled.").waitFor();
  await page.getByText("No templates have been added.").waitFor();
  await page.getByRole("button", { name: "Add new template" }).click();
  const zipInput = page.getByLabel(/Choose template ZIP/);
  await zipInput.setInputFiles({
    name: "invalid.zip",
    mimeType: "application/zip",
    buffer: Buffer.from([0, 1, 2, 3]),
  });
  const invalidImportSummary = page.getByLabel("Template validation summary");
  await invalidImportSummary.waitFor();
  if (!(await invalidImportSummary.getByText("Template blocked", { exact: true }).isVisible())) {
    throw new Error("Invalid ZIP did not surface a blocked validation result.");
  }

  await zipInput.setInputFiles(fixturePath);
  await page.getByRole("heading", { name: "Package", exact: true }).waitFor();
  await page.getByRole("button", { name: "Import package" }).click();
  await page.getByRole("heading", { name: "Fonts", exact: true }).waitFor();
  const exactFont = page
    .locator(".template-importer__font")
    .filter({ hasText: "Rethink Sans" });
  await exactFont.getByText(
    "Rethink Sans — SemiBold (600)",
    { exact: true },
  ).waitFor();
  const continueFromFonts = page.getByRole("button", { name: "Continue to validation" });
  if (!(await continueFromFonts.isDisabled())) {
    throw new Error("Font progression was enabled before the exact face was ready.");
  }
  await exactFont.getByLabel("Upload font file").setInputFiles({
    name: "not-a-font.ttf",
    mimeType: "font/ttf",
    buffer: Buffer.from("not a font"),
  });
  await exactFont.getByText("File doesn’t match", { exact: true }).waitFor();
  await exactFont.getByRole("alert").waitFor();
  if (!(await continueFromFonts.isDisabled())) {
    throw new Error("Font progression was enabled after an invalid upload.");
  }
  await exactFont.getByLabel("Upload font file").setInputFiles(fontPath);
  await exactFont.getByText("Ready", { exact: true }).waitFor();
  await exactFont.getByText(/Exact font verified/).waitFor();
  if (await page.getByText(/emoji/i).count()) {
    throw new Error("The default setup UI exposed internal emoji fallback evidence.");
  }
  if (
    await page.getByText(/replacement|available fonts|open font/i).count()
  ) {
    throw new Error("The exact upload wizard exposed a retired font choice.");
  }

  await page.reload();
  await page.getByRole("button", { name: "Add new template" }).click();
  const reloadedZipInput = page.getByLabel(/Choose template ZIP/);
  await reloadedZipInput.setInputFiles(fixturePath);
  await page.getByRole("heading", { name: "Package", exact: true }).waitFor();
  await page.getByRole("button", { name: "Import package" }).click();
  await page.getByRole("heading", { name: "Fonts", exact: true }).waitFor();
  const reusedFont = page
    .locator(".template-importer__font")
    .filter({ hasText: "Rethink Sans" });
  await reusedFont.getByText("Ready", { exact: true }).waitFor();
  await reusedFont.getByText(/Exact font verified/).waitFor();
  if (await page.getByText(/emoji/i).count()) {
    throw new Error("Stored exact-font reuse exposed internal emoji fallback evidence.");
  }
  await page.getByRole("button", { name: "Continue to validation" }).click();
  await page.getByRole("heading", { name: "Validate", exact: true }).waitFor();
  await page.locator("[data-template-package-canvas]").waitFor();
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (item) => item.textContent?.includes("Continue"),
    );
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  const previewGeometry = await page.locator(".template-importer__preview").evaluate(
    (preview) => {
      const layer = preview.querySelector("[data-template-session-viewport-transform='true']");
      if (!(layer instanceof HTMLElement)) return null;
      const outer = preview.getBoundingClientRect();
      const inner = layer.getBoundingClientRect();
      const style = getComputedStyle(preview);
      return {
        clientWidth: preview.clientWidth,
        clientHeight: preview.clientHeight,
        scrollWidth: preview.scrollWidth,
        scrollHeight: preview.scrollHeight,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        padding: {
          left: inner.left - outer.left,
          right: outer.right - inner.right,
          top: inner.top - outer.top,
          bottom: outer.bottom - inner.bottom,
        },
        aspectRatio: inner.width / inner.height,
      };
    },
  );
  if (
    !previewGeometry ||
    previewGeometry.scrollWidth > previewGeometry.clientWidth ||
    previewGeometry.scrollHeight > previewGeometry.clientHeight ||
    previewGeometry.overflowX !== "hidden" ||
    previewGeometry.overflowY !== "hidden" ||
    // The transformed canvas is measured inside a one-pixel preview border, so
    // a 24px fit margin can resolve to just under 24 device pixels.
    Object.values(previewGeometry.padding).some((value) => value < 22.5) ||
    Math.abs(previewGeometry.aspectRatio - 480 / 240) > 0.01
  ) {
    throw new Error(
      `The import preview was not fully fitted with protected padding: ${JSON.stringify(previewGeometry)}.`,
    );
  }
  await page.getByRole("button", { name: "Continue to fields" }).click();
  await page.locator('[aria-label="Template fields"]').waitFor();
  for (const viewport of [
    { name: "wide", width: 1440, height: 900 },
    { name: "narrow", width: 700, height: 820 },
    { name: "short", width: 1100, height: 650 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const layout = await page.locator(".template-importer").evaluate((root) => {
      const content = root.querySelector(".template-importer__content");
      const footer = root.querySelector(".template-importer__actions");
      const sidebar = root.querySelector(".template-importer__sidebar");
      const fields = root.querySelector(".template-importer__fields-layout");
      if (!(content instanceof HTMLElement) ||
          !(footer instanceof HTMLElement) ||
          !(sidebar instanceof HTMLElement) ||
          !(fields instanceof HTMLElement)) return null;
      const rootBounds = root.getBoundingClientRect();
      const footerBounds = footer.getBoundingClientRect();
      return {
        rootClientWidth: root.clientWidth,
        rootScrollWidth: root.scrollWidth,
        contentClientWidth: content.clientWidth,
        contentScrollWidth: content.scrollWidth,
        contentOverflowY: getComputedStyle(content).overflowY,
        rootOverflow: getComputedStyle(root).overflow,
        sidebarDisplay: getComputedStyle(sidebar).display,
        fieldColumns: getComputedStyle(fields).gridTemplateColumns.split(" ").length,
        footerInsideRoot: footerBounds.bottom <= rootBounds.bottom + 0.5,
      };
    });
    const narrow = viewport.width <= 720;
    if (!layout ||
        layout.rootScrollWidth > layout.rootClientWidth ||
        layout.contentScrollWidth > layout.contentClientWidth ||
        layout.contentOverflowY !== "auto" ||
        layout.rootOverflow !== "hidden" ||
        !layout.footerInsideRoot ||
        (narrow && layout.sidebarDisplay !== "none") ||
        (narrow && layout.fieldColumns !== 1)) {
      throw new Error(
        `${viewport.name} wizard layout did not preserve the fixed shell and responsive field layout: ${JSON.stringify(layout)}.`,
      );
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  const orderedFields = page.locator('[aria-label="Template fields"] .template-importer__field');
  const headlineRuleForDrag = orderedFields.filter({ hasText: "Headline" }).first();
  const heroImageRuleForDrag = orderedFields.filter({ hasText: "Hero image" }).first();
  await page.evaluate(() => {
    const fields = Array.from(document.querySelectorAll(
      '[aria-label="Template fields"] .template-importer__field',
    ));
    const source = fields.find((field) => field.textContent?.includes("Hero image"));
    if (!source) {
      throw new Error(`Field cards were unavailable for drag acceptance: ${fields.map((field) => field.textContent?.trim()).join(" | ")}.`);
    }
    source.dispatchEvent(new DragEvent("dragstart", {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    }));
  });
  await heroImageRuleForDrag.getAttribute("data-dragging").then((value) => {
    if (value !== "true") throw new Error("Whole-card drag did not enter a dragging state.");
  });
  await page.evaluate(() => {
    const target = Array.from(document.querySelectorAll(
      '[aria-label="Template fields"] .template-importer__field',
    )).find((field) => field.textContent?.includes("Headline"));
    if (!target) throw new Error("Drop target was unavailable for drag acceptance.");
    const bounds = target.getBoundingClientRect();
    target.dispatchEvent(new DragEvent("dragover", {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
      clientY: bounds.top + 1,
    }));
  });
  await headlineRuleForDrag.getAttribute("data-drop-position").then((position) => {
    if (position !== "before") {
      throw new Error(`Whole-card drag did not expose a before-drop indicator: ${position}.`);
    }
  });
  await page.evaluate(() => {
    const fields = Array.from(document.querySelectorAll(
      '[aria-label="Template fields"] .template-importer__field',
    ));
    const target = fields.find((field) => field.textContent?.includes("Headline"));
    if (!target) throw new Error("Drop target was unavailable for drag acceptance.");
    target.dispatchEvent(new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    }));
  });
  await page.waitForFunction(() =>
    document.querySelector('[aria-label="Template fields"] .template-importer__field')
      ?.textContent?.includes("Hero image"));
  if (await orderedFields.first().textContent().then((value) => !value?.includes("Hero image"))) {
    throw new Error("Whole-card drag did not commit the indicated field order.");
  }
  const heroImageMenu = heroImageRuleForDrag.locator(".template-importer__field-menu");
  await heroImageMenu.locator("summary").click();
  await heroImageMenu.getByRole("menuitem", { name: "Move down" }).click();
  await page.waitForFunction(() =>
    document.querySelector('[aria-label="Template fields"] .template-importer__field')
      ?.textContent?.includes("Headline"));
  if (await heroImageRuleForDrag.getAttribute("data-dragging")) {
    throw new Error("An interactive field control incorrectly initiated whole-card dragging.");
  }
  const headlineRule = page
    .locator(".template-importer__field")
    .filter({ hasText: "Headline" });
  let maximumCharacters = headlineRule.getByLabel("Maximum characters");
  if ((await maximumCharacters.count()) === 0) {
    await headlineRuleForDrag.getByRole("button", { name: /Headline/ }).click();
    maximumCharacters = headlineRule.getByLabel("Maximum characters");
  }
  await maximumCharacters.fill("-1");
  await headlineRule.getByRole("alert").waitFor();
  if (!(await page.getByRole("button", { name: "Continue to confirmation" }).isDisabled())) {
    throw new Error("An invalid field-rule draft did not block progression.");
  }
  const maximumCharactersAfterRejection = headlineRule.getByLabel("Maximum characters");
  await maximumCharactersAfterRejection.fill("");
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (item) => item.textContent?.includes("Continue"),
    );
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  const wizardImageField = page
    .locator(".template-importer__field")
    .filter({ hasText: "Hero image" });
  await wizardImageField
    .getByRole("button", { name: /Hero image/ })
    .click();
  await wizardImageField.getByLabel("Image placement").selectOption("contain");
  await page.waitForFunction(() => {
    const select = Array.from(document.querySelectorAll("select")).find(
      (item) => item.previousElementSibling?.textContent === "Image placement",
    );
    return select instanceof HTMLSelectElement && select.value === "contain";
  });
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (item) => item.textContent?.includes("Continue"),
    );
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  await page.getByRole("button", { name: "Continue to confirmation" }).click();
  await page.getByRole("heading", { name: "Confirm", exact: true }).waitFor();
  const useTemplateButton = page.getByRole("button", { name: "Use template" });
  await useTemplateButton.waitFor();
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (item) => item.textContent?.includes("Use template"),
    );
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  await useTemplateButton.click();
  await page.getByRole("heading", { name: "Template dashboard" }).waitFor();
  await page
    .getByText("Confirmed template added to the in-memory host catalogue.")
    .waitFor();
  await page
    .getByRole("button", { name: /^Open template / })
    .click();
  await page.locator('[data-testid="validation-status"][data-valid="true"]').waitFor();
  await page.locator('[data-template-session-viewport-readiness="ready"]').last().waitFor();
  const diagnosticStatus = await page
    .locator('[data-testid="validation-status"]')
    .getAttribute("data-diagnostic-status");
  if (diagnosticStatus !== "ready" && diagnosticStatus !== "needs-review") {
    throw new Error(
      `The current-revision diagnostic summary stayed ${diagnosticStatus ?? "unpublished"} after the viewport became ready.`,
    );
  }
  const fieldHookAcceptance = page.locator('[data-testid="field-hook-acceptance"]');
  const fieldHookEvidence = {
    stable: await fieldHookAcceptance.getAttribute("data-controller-stable"),
    parity: await fieldHookAcceptance.getAttribute("data-field-parity"),
    missing: await fieldHookAcceptance.getAttribute("data-missing-field-null"),
  };
  if (
    fieldHookEvidence.stable !== "true" ||
    fieldHookEvidence.parity !== "true" ||
    fieldHookEvidence.missing !== "true"
  ) {
    throw new Error(
      `Plural and singular editable-field hooks did not expose stable parity: ${JSON.stringify(fieldHookEvidence)}.`,
    );
  }
  const captureButton = page.getByRole("button", {
    name: "Capture latest PNG",
  });
  await captureButton.waitFor();
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (item) => item.textContent?.includes("Capture latest PNG"),
    );
    return button instanceof HTMLButtonElement && !button.disabled;
  });

  const headline = page.getByLabel("Headline");
  await headline.fill("Acceptance headline");
  const hostTransform = page.getByRole("button", {
    name: "Apply host uppercase transform",
  });
  if ((await hostTransform.count()) === 0 || !(await hostTransform.isVisible())) {
    const utilitiesToggle = page.locator(".editor-utilities > summary");
    await utilitiesToggle.click();
  }
  await hostTransform.click();
  if (await headline.inputValue() !== "ACCEPTANCE HEADLINE") {
    throw new Error("The host-owned text transformation was not applied.");
  }
  await page.getByRole("button", {
    name: "Acceptance stale export",
  }).click();
  await page.getByText("Stale export rejected.").waitFor();
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (item) => item.textContent?.includes("Capture latest PNG"),
    );
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  const headlineField = page.locator(".field").filter({ hasText: "Headline" });
  await headlineField.getByRole("button", { name: "Reset" }).click();
  await page.waitForFunction(() =>
    (document.querySelector('[aria-label="Headline"]') instanceof HTMLInputElement) &&
    document.querySelector('[aria-label="Headline"]').value ===
      "Portable SDK session ☀️");

  const imageInput = page.getByLabel("Hero image");
  await imageInput.setInputFiles({
    name: "rejected.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await page.getByText(/does not accept text\/plain/).waitFor();
  await imageInput.setInputFiles(imagePath);
  const imageField = page.locator(".field").filter({ hasText: "Hero image" });
  const placement = imageField.locator("[data-placement-mode]");
  await placement.waitFor();
  await page.waitForFunction(() =>
    document.querySelector("[data-placement-mode]")?.getAttribute(
      "data-placement-mode",
    ) === "replacement-fill");
  await imageField.getByRole("button", { name: "Fit" }).click();
  await page.waitForFunction(() =>
    document.querySelector("[data-placement-mode]")?.getAttribute(
      "data-placement-mode",
    ) === "replacement-fit");
  await imageField.getByRole("button", { name: "Reset" }).click();
  await page.waitForFunction(() =>
    document.querySelector("[data-placement-mode]")?.getAttribute(
      "data-placement-mode",
    ) === "imported-source");

  await headline.fill("Persisted acceptance value");
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (item) => item.textContent?.includes("Capture latest PNG"),
    );
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  await page.getByRole("button", { name: "Save browser draft" }).click();
  await page.getByText(/Saved browser-local draft/).waitFor();
  await headline.fill("Unsaved value");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Reload browser draft" }).click();
  await page.getByText("Reloaded the browser-local draft.").waitFor();
  if (await headline.inputValue() !== "Persisted acceptance value") {
    throw new Error("Offline explicit draft reload did not restore the saved value.");
  }
  await context.setOffline(false);

  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (item) => item.textContent?.includes("Capture latest PNG"),
    );
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  await captureButton.click();
  await page.getByText(
    "The latest ready revision was captured without downloading.",
  ).waitFor({ timeout: 60_000 });
  await page.getByAltText("Latest template PNG").waitFor();
  if (downloadCount !== 0) {
    throw new Error("The packed reference unexpectedly initiated a PNG download.");
  }

  await page.getByRole("button", {
    name: "Unmount acceptance workspace",
  }).click();
  await page.getByText("disposed", { exact: true }).waitFor();

  if (externalRequestCount !== 0) {
    throw new Error(
      `The packed reference attempted ${externalRequestCount} external requests.`,
    );
  }
  if (consoleErrors.length) {
    throw new Error(
      `The packed reference emitted browser errors:\n${consoleErrors.join("\n")}`,
    );
  }
  await context.close();

  restrictedServer = await preview({
    root: consumerDirectory,
    configFile: false,
    logLevel: "warn",
    preview: {
      host: "127.0.0.1",
      port: 0,
      headers: {
        "Content-Security-Policy": [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self'",
          "img-src 'self'",
          "font-src 'self'",
          "connect-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
        ].join("; "),
      },
    },
  });
  const restrictedApplicationUrl = restrictedServer.resolvedUrls?.local?.[0];
  if (!restrictedApplicationUrl) {
    throw new Error("The restricted-CSP reference has no browser URL.");
  }
  const restrictedContext = await browser.newContext();
  const restrictedPage = await restrictedContext.newPage();
  await restrictedPage.goto(restrictedApplicationUrl);
  await restrictedPage
    .locator('[data-testid="runtime-support"][data-runtime-status="blocked"]')
    .waitFor();
  const restrictedIssues = await restrictedPage
    .locator('[data-testid="runtime-support"]')
    .getAttribute("data-runtime-issues");
  if (!restrictedIssues?.includes("runtime.dynamic-code.unavailable")) {
    throw new Error(
      `Restricted CSP did not expose the expected dynamic-code blocker: ${restrictedIssues}`,
    );
  }
  await restrictedContext.close();

  const files = await readdir(vendorDirectory);
  console.log(
    `Verified packed template editor reference with ${files.length} archives: supported-CSP runtime readiness, restricted-CSP structured blocking, dashboard-to-wizard confirmation, fresh confirmed-state hydration, default UI plus simultaneous headless page/modal/drawer composition, invalid/valid ZIP, exact font rejection/upload/reuse, field rules, host-owned text transformation and downstream image edits, Fill/Fit/reset, stale export rejection, offline persistence, silent PNG, disposal, and zero external requests (${archiveEvidence
      .map((item) => `${item.directory}=${item.sha256}`)
      .join(", ")}).`,
  );
} finally {
  await browser?.close();
  await restrictedServer?.close();
  await server?.close();
  await rm(workspace, { recursive: true, force: true });
}

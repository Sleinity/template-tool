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
import { chromium } from "playwright";
import { preview } from "vite";
import { strToU8, unzipSync, zipSync } from "fflate";
import { createCompactLifecycleFixture } from "../compact-lifecycle-fixture.mjs";
import {
  loadRuntimePackageDefinitions,
  resolveFixedRuntimeVersion,
  runtimeArchiveName,
} from "./sdk-runtime-manifest.mjs";

const root = process.cwd();
const version = process.env.TEMPLATE_RUNTIME_RELEASE_VERSION ??
  await resolveFixedRuntimeVersion(root);
const args = process.argv.slice(2);
if (args.length > 0 && (args[0] !== "--archives" || !args[1])) {
  throw new Error(
    "Usage: node verify-template-family-reference.mjs [--archives ARCHIVES_DIRECTORY]",
  );
}
const sourceArchivesDirectory = args[0] === "--archives"
  ? path.resolve(args[1])
  : null;
const packageDefinitions = await loadRuntimePackageDefinitions(root);
const pnpmExecutable = process.env.TEMPLATE_PNPM_EXECUTABLE ?? "pnpm";
const workspace = await mkdtemp(path.join(os.tmpdir(), "template-family-reference-"));
const consumerDirectory = path.join(workspace, "consumer");
const vendorDirectory = path.join(consumerDirectory, "vendor");
const compactFixture = await createCompactLifecycleFixture(root);
let browser;
let supportedServer;
let restrictedServer;

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed:\n${result.stdout}\n${result.stderr}`,
    );
  }
}

function secretFreeEnvironment() {
  const environment = { ...process.env, CI: "true" };
  for (const name of ["NODE_AUTH_TOKEN", "NPM_TOKEN", "GITHUB_TOKEN", "GH_TOKEN"]) {
    delete environment[name];
  }
  environment.NPM_CONFIG_USERCONFIG = path.join(consumerDirectory, ".npmrc-public-only");
  return environment;
}

async function createServer(contentSecurityPolicy) {
  return preview({
    root: consumerDirectory,
    configFile: false,
    logLevel: "warn",
    preview: {
      host: "127.0.0.1",
      port: 0,
      headers: { "Content-Security-Policy": contentSecurityPolicy },
    },
  });
}

function createFamilyFixture() {
  const files = unzipSync(compactFixture.bytes);
  const packageValue = JSON.parse(new TextDecoder().decode(files["template.json"]));
  packageValue.nodes.headline.text.fontFamily = "system-ui";
  packageValue.nodes.headline.text.fontStyle = "Regular";
  packageValue.nodes.headline.text.fontWeight = 400;
  const assetId = "asset:image:family-acceptance";
  packageValue.nodes.root.children.push("family-hero-image");
  packageValue.nodes["family-hero-image"] = {
    id: "family-hero-image",
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
      fills: [{ type: "IMAGE", visible: true, opacity: 1, blendMode: "NORMAL" }],
      strokes: [],
      effects: [],
      cornerRadius: 0,
      clipContent: false,
    },
    image: {
      assetId,
      deferred: false,
      hash: "family-acceptance",
      scaleMode: "FILL",
      imageTransform: [[1, 0, 0], [0, 1, 0]],
    },
  };
  packageValue.assets[assetId] = {
    id: assetId,
    type: "image",
    source: "embedded",
    deferred: false,
    nodeId: "family-hero-image",
    mimeType: "image/png",
    hash: "family-acceptance",
    dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    width: 120,
    height: 120,
    scaleMode: "FILL",
    imageTransform: [[1, 0, 0], [0, 1, 0]],
  };
  packageValue.editableFields.push({
    id: "hero-image",
    type: "image",
    nodeId: "family-hero-image",
    property: "image.assetId",
    label: "Hero image",
    defaultValue: assetId,
    constraints: { allowedMimeTypes: ["image/png"], replacementMode: "cover" },
  });
  return zipSync({
    "template.json": strToU8(JSON.stringify(packageValue)),
    "assets.json": strToU8(JSON.stringify({ version: 1, assets: [] })),
  }, { level: 0 });
}

const fixture = createFamilyFixture();

try {
  await cp(path.join(root, "examples/template-family-integration"), consumerDirectory, {
    recursive: true,
    filter(source) {
      return !path.relative(
        path.join(root, "examples/template-family-integration"),
        source,
      ).split(path.sep).some((segment) =>
        segment === "dist" || segment === "node_modules" || segment.endsWith(".tsbuildinfo")
      );
    },
  });
  const referenceSource = await readFile(path.join(consumerDirectory, "src/main.tsx"), "utf8");
  for (const required of [
    'from "@sleinity/template-core/family"',
    'from "@sleinity/template-browser/importer"',
    'from "@sleinity/template-react/importer"',
    'from "@sleinity/template-react/editor"',
    "TemplateFamilyImportPreview",
    "useTemplateFamilyEditor",
    "TemplateSessionViewport",
    "planTemplateFamilyVariantReimport",
  ]) {
    if (!referenceSource.includes(required)) {
      throw new Error(`The Template Family reference does not adopt ${required}.`);
    }
  }
  for (const forbidden of ["apps/studio", "renderer-internal", "../../packages", "/src/"]) {
    if (referenceSource.includes(forbidden)) {
      throw new Error(`The Template Family reference contains forbidden ${forbidden}.`);
    }
  }

  await Promise.all([
    mkdir(vendorDirectory, { recursive: true }),
    writeFile(path.join(consumerDirectory, ".npmrc-public-only"), ""),
  ]);
  const archiveEvidence = [];
  for (const item of packageDefinitions) {
    const archive = runtimeArchiveName(item, version);
    const destination = path.join(vendorDirectory, archive);
    if (sourceArchivesDirectory) {
      await copyFile(path.join(sourceArchivesDirectory, archive), destination);
    } else {
      run(pnpmExecutable, ["pack", "--pack-destination", vendorDirectory], {
        cwd: path.join(root, "packages", item.directory),
        env: { ...process.env, CI: "true" },
      });
    }
    const bytes = await readFile(destination);
    archiveEvidence.push({
      ...item,
      archive,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  const vendoredDependencies = Object.fromEntries(
    archiveEvidence.map((item) => [item.name, `file:vendor/${item.archive}`]),
  );
  const manifestPath = path.join(consumerDirectory, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.dependencies = { ...manifest.dependencies, ...vendoredDependencies };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(
    path.join(consumerDirectory, "pnpm-workspace.yaml"),
    `packages:\n  - "."\nallowBuilds:\n  esbuild: true\nonlyBuiltDependencies:\n  - esbuild\noverrides:\n${Object.entries(vendoredDependencies)
      .map(([name, archive]) => `  "${name}": "${archive}"`)
      .join("\n")}\n`,
  );

  const environment = secretFreeEnvironment();
  run(pnpmExecutable, ["install", "--prefer-offline=false"], {
    cwd: consumerDirectory,
    env: environment,
  });
  const lockfile = await readFile(path.join(consumerDirectory, "pnpm-lock.yaml"), "utf8");
  if (/workspace:|link:|npm\.pkg\.github\.com/u.test(lockfile)) {
    throw new Error("The packed family reference lockfile contains a workspace, link or registry reference.");
  }
  for (const item of archiveEvidence) {
    if (!lockfile.includes(`vendor/${item.archive}`)) {
      throw new Error(`The packed family reference lockfile omits ${item.archive}.`);
    }
    const installedRoot = path.join(consumerDirectory, "node_modules/@sleinity", item.directory);
    const installedManifest = JSON.parse(await readFile(path.join(installedRoot, "package.json"), "utf8"));
    if (installedManifest.version !== version) {
      throw new Error(`${item.name}@${installedManifest.version} installed; expected ${version}.`);
    }
    for (const fileName of await readdir(path.join(installedRoot, "dist"))) {
      if (!/\.(?:js|d\.ts|css)$/u.test(fileName)) continue;
      const source = await readFile(path.join(installedRoot, "dist", fileName), "utf8");
      if (["apps/studio", "workspace:", "/Users/", "/private/", "NODE_AUTH_TOKEN"].some((term) => source.includes(term))) {
        throw new Error(`${item.name}/${fileName} contains a repository or credential reference.`);
      }
    }
  }
  run(pnpmExecutable, ["build"], { cwd: consumerDirectory, env: environment });

  supportedServer = await createServer([
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data: blob:",
    "connect-src 'self' blob: data:",
    "worker-src 'self' blob:",
    "object-src 'none'",
  ].join("; "));
  const supportedUrl = supportedServer.resolvedUrls?.local?.[0];
  if (!supportedUrl) throw new Error("The packed family reference has no browser URL.");

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  let externalRequests = 0;
  let downloads = 0;
  const consoleErrors = [];
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["127.0.0.1", "localhost"].includes(url.hostname) || ["data:", "blob:"].includes(url.protocol)) {
      await route.continue();
    } else {
      externalRequests += 1;
      await route.abort();
    }
  });
  const page = await context.newPage();
  page.on("download", () => { downloads += 1; });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.goto(supportedUrl);
  await page.getByRole("heading", { name: "Template Family integration" }).waitFor();
  await page.getByLabel("Choose first ZIP").setInputFiles({
    name: "family-a.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(fixture),
  });
  await page.waitForFunction(() => {
    const input = Array.from(document.querySelectorAll('input[type="file"]'))
      .find((candidate) => candidate.parentElement?.textContent?.includes("Add variant ZIP"));
    return input instanceof HTMLInputElement && !input.disabled;
  });
  await page.getByLabel("Add variant ZIP").setInputFiles({
    name: "family-b.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(fixture),
  });
  const addGroupButton = page.getByRole("button", { name: /Add generic.*Format.*group/ });
  if (!await addGroupButton.count()) {
    throw new Error(
      `The packed family example stopped before group setup. Page=${await page.locator("body").innerText()} Errors=${consoleErrors.join(" | ") || "none"}.`,
    );
  }
  try {
    await page.waitForFunction(() => {
      const button = Array.from(document.querySelectorAll("button"))
        .find((candidate) => candidate.textContent?.includes("Add generic"));
      return button instanceof HTMLButtonElement && !button.disabled;
    }, undefined, { timeout: 60_000 });
    await addGroupButton.click({ timeout: 60_000 });
  } catch (error) {
    throw new Error(
      `The packed family example could not complete the second variant import. Page=${await page.locator("body").innerText()} Errors=${consoleErrors.join(" | ") || "none"}.`,
      { cause: error },
    );
  }

  for (const expectedStep of [
    "field-matches",
    "variant-groups",
    "common-rules",
    "variant-overrides",
    "validation-preview",
  ]) {
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByText(`Step: ${expectedStep}`).waitFor();
  }
  const previewButtons = page.getByRole("region", { name: "Sequential variant preview" }).getByRole("button");
  await previewButtons.nth(0).click();
  await page.locator("[data-template-package-canvas]").last().waitFor();
  await previewButtons.nth(1).click();
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.trim() === "Continue");
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Step: confirmation").waitFor();
  await page.getByRole("button", { name: "Confirm family" }).click();
  await page.locator('[data-testid="family-wizard-status"]', { hasText: "completed" }).waitFor();

  const headline = page.getByLabel("Headline", { exact: true });
  await headline.fill("Shared family acceptance");
  const selector = page.getByLabel("Current family variant");
  await selector.selectOption({ index: 0 });
  await selector.selectOption({ index: 1 });
  if (await headline.inputValue() !== "Shared family acceptance") {
    throw new Error("Shared family text was lost while switching variants.");
  }
  const imageStatus = page.locator('[data-testid^="family-image-"]');
  const originalImageReference = await imageStatus.textContent();
  await page.getByLabel("Hero image", { exact: true }).setInputFiles({
    name: "shared-replacement.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.waitForFunction((previous) =>
    document.querySelector('[data-testid^="family-image-"]')?.textContent !== previous,
  originalImageReference);
  const sharedImageReference = await imageStatus.textContent();
  await selector.selectOption({ index: 0 });
  if (await imageStatus.textContent() !== sharedImageReference) {
    throw new Error("Shared family image identity was lost while switching variants.");
  }

  await context.setOffline(true);
  await page.getByRole("button", { name: "Save, reset and reopen offline" }).click();
  await page.waitForFunction(() => {
    const status = document.querySelector('[data-testid="family-persistence-status"]')?.textContent;
    return status === "reopened" || status === "blocked";
  });
  if (await page.locator('[data-testid="family-persistence-status"]').textContent() !== "reopened") {
    throw new Error(
      `The packed family example could not reopen offline. Page=${await page.locator("body").innerText()} Errors=${consoleErrors.join(" | ") || "none"}.`,
    );
  }
  if (await headline.inputValue() !== "Shared family acceptance") {
    throw new Error("Shared family text was lost after offline reopening.");
  }
  if (await imageStatus.textContent() !== sharedImageReference) {
    throw new Error("Shared family image identity was lost after offline reopening.");
  }
  await context.setOffline(false);

  await page.getByLabel("Inspect reimport for selected variant").setInputFiles({
    name: "family-reimport.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(fixture),
  });
  await page.locator('[data-testid="family-reimport-status"]').waitFor();
  await page.locator('.workspace > [data-template-session-viewport-readiness="ready"]').waitFor({ timeout: 60_000 });
  await page.getByRole("button", { name: "Capture current variant" }).click();
  await page.waitForFunction(() => {
    const status = document.querySelector('[data-testid="family-capture-status"]')?.textContent ?? "";
    return status === "captured" || status.startsWith("blocked:");
  }, undefined, { timeout: 60_000 });
  if (await page.locator('[data-testid="family-capture-status"]').textContent() !== "captured") {
    throw new Error(
      `The current family revision could not be captured. Page=${await page.locator("body").innerText()} Errors=${consoleErrors.join(" | ") || "none"}.`,
    );
  }
  await page.getByRole("button", { name: "Unmount family workspace" }).click();
  await page.locator('[data-testid="family-disposal-status"]', { hasText: "disposed" }).waitFor();

  if (externalRequests !== 0 || downloads !== 0 || consoleErrors.length) {
    throw new Error(`Packed family browser evidence failed: external=${externalRequests}, downloads=${downloads}, errors=${consoleErrors.join(" | ") || "none"}.`);
  }
  await context.close();

  restrictedServer = await createServer([
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data: blob:",
    "connect-src 'self'",
    "object-src 'none'",
  ].join("; "));
  const restrictedUrl = restrictedServer.resolvedUrls?.local?.[0];
  if (!restrictedUrl) throw new Error("The restricted family reference has no browser URL.");
  const restrictedContext = await browser.newContext();
  const restrictedPage = await restrictedContext.newPage();
  await restrictedPage.goto(restrictedUrl);
  await restrictedPage.getByLabel("Choose first ZIP").setInputFiles({
    name: "restricted-family.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(fixture),
  });
  await restrictedPage.getByRole("alert").filter({ hasText: /dynamic|content security|import/i }).waitFor();
  await restrictedContext.close();

  console.log(`Verified packed Template Family reference: two variants, shared switching, confirmation, offline reopening, reimport inspection, current capture, disposal, supported/restricted CSP, and zero external requests (${archiveEvidence.map((item) => `${item.directory}=${item.sha256}`).join(", ")}).`);
} finally {
  await browser?.close();
  await restrictedServer?.close();
  await supportedServer?.close();
  await rm(workspace, { recursive: true, force: true });
}

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
    "Usage: node verify-narrowcasting-reference.mjs [--archives ARCHIVES_DIRECTORY]",
  );
}
const sourceArchivesDirectory = args[0] === "--archives"
  ? path.resolve(args[1])
  : null;
const packageDefinitions = await loadRuntimePackageDefinitions(root);
const pnpmExecutable = process.env.TEMPLATE_PNPM_EXECUTABLE ?? "pnpm";
const workspace = await mkdtemp(
  path.join(os.tmpdir(), "template-narrowcasting-reference-"),
);
const consumerDirectory = path.join(workspace, "consumer");
const vendorDirectory = path.join(consumerDirectory, "vendor");
const fixturePath = path.join(workspace, "narrowcasting-acceptance.zip");
const imagePath = path.join(workspace, "replacement.png");
let browser;
let server;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`,
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
  const assetId = "asset:image:narrowcasting-acceptance";
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
      hash: "narrowcasting-acceptance",
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
    hash: "narrowcasting-acceptance",
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
  return zipSync({
    "template.json": strToU8(JSON.stringify(packageValue)),
    "assets.json": strToU8(JSON.stringify({ version: 1, assets: [] })),
  }, { level: 0 });
}

try {
  await cp(
    path.join(root, "examples", "narrowcasting-integration"),
    consumerDirectory,
    {
      recursive: true,
      filter(source) {
        const relative = path.relative(
          path.join(root, "examples", "narrowcasting-integration"),
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
  }
  run(pnpmExecutable, ["build"], {
    cwd: consumerDirectory,
    env: environment,
  });

  server = await preview({
    root: consumerDirectory,
    configFile: false,
    logLevel: "warn",
    preview: { host: "127.0.0.1", port: 0 },
  });
  const applicationUrl = server.resolvedUrls?.local?.[0];
  if (!applicationUrl) {
    throw new Error("The packed narrowcasting reference has no browser URL.");
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
  const zipInput = page.getByLabel("Choose ZIP");
  await zipInput.setInputFiles({
    name: "invalid.zip",
    mimeType: "application/zip",
    buffer: Buffer.from([0, 1, 2, 3]),
  });
  await page.locator(".status-blocked").waitFor();
  await page.locator(".diagnostics li").first().waitFor();

  await zipInput.setInputFiles(fixturePath);
  await page.locator("[data-template-package-canvas]").waitFor();
  await page.locator('[data-testid="validation-status"][data-valid="true"]').waitFor();
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
      "Portable SDK session");

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

  const files = await readdir(vendorDirectory);
  console.log(
    `Verified packed narrowcasting reference with ${files.length} archives: invalid/valid ZIP, validation, text/image edits, Fill/Fit/reset, stale export rejection, offline persistence, silent PNG, disposal, and zero external requests (${archiveEvidence
      .map((item) => `${item.directory}=${item.sha256}`)
      .join(", ")}).`,
  );
} finally {
  await browser?.close();
  await server?.close();
  await rm(workspace, { recursive: true, force: true });
}

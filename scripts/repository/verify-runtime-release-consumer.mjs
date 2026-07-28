import { createHash } from "node:crypto";
import {
  copyFile,
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
import { createCompactLifecycleFixture } from "../compact-lifecycle-fixture.mjs";
import {
  loadRuntimePackageDefinitions,
  resolveFixedRuntimeVersion,
  runtimeArchiveName,
} from "./sdk-runtime-manifest.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
if (args[0] !== "--archives" || !args[1]) {
  throw new Error(
    "Usage: node verify-runtime-release-consumer.mjs --archives ARCHIVES_DIRECTORY",
  );
}

const sourceArchivesDirectory = path.resolve(args[1]);
const version =
  process.env.TEMPLATE_RUNTIME_RELEASE_VERSION ??
  await resolveFixedRuntimeVersion(root);
const packageManager =
  process.env.TEMPLATE_CONSUMER_PACKAGE_MANAGER ?? "npm";
const packageManagerScript =
  process.env.TEMPLATE_CONSUMER_PACKAGE_MANAGER_SCRIPT ?? null;
const packageDefinitions = (await loadRuntimePackageDefinitions(root)).map(
  (item) => ({
    ...item,
    archive: runtimeArchiveName(item, version),
  }),
);
const workspace = await mkdtemp(
  path.join(os.tmpdir(), "template-runtime-release-consumer-"),
);
const consumerDirectory = path.join(workspace, "consumer");
const vendorDirectory = path.join(consumerDirectory, "vendor");
const fixture = await createCompactLifecycleFixture(root);
const fixturePath = path.join(workspace, fixture.sourceName);
let browser;
let server;

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${commandArgs.join(" ")} failed:\n${result.stderr || result.stdout}`,
    );
  }
  return result.stdout;
}

async function rootDependencyVersion(dependencyName) {
  const manifest = JSON.parse(
    await readFile(
      path.join(root, "node_modules", dependencyName, "package.json"),
      "utf8",
    ),
  );
  return manifest.version;
}

function secretFreeEnvironment() {
  const environment = { ...process.env, CI: "true" };
  for (const secretName of [
    "NODE_AUTH_TOKEN",
    "NPM_TOKEN",
    "GITHUB_TOKEN",
    "GH_TOKEN",
  ]) {
    delete environment[secretName];
  }
  environment.NPM_CONFIG_USERCONFIG = path.join(
    consumerDirectory,
    ".npmrc-public-only",
  );
  return environment;
}

function installArguments() {
  if (path.basename(packageManager).startsWith("pnpm")) {
    return ["install", "--prefer-offline=false"];
  }
  return ["install", "--no-audit", "--no-fund"];
}

function packageManagerArguments(argumentsValue) {
  return packageManagerScript
    ? [packageManagerScript, ...argumentsValue]
    : argumentsValue;
}

try {
  await Promise.all([
    mkdir(path.join(consumerDirectory, "src"), { recursive: true }),
    mkdir(vendorDirectory, { recursive: true }),
    writeFile(fixturePath, fixture.bytes),
  ]);

  const archiveEvidence = [];
  for (const packageValue of packageDefinitions) {
    const sourceArchive = path.join(
      sourceArchivesDirectory,
      packageValue.archive,
    );
    const targetArchive = path.join(vendorDirectory, packageValue.archive);
    await copyFile(sourceArchive, targetArchive);
    const bytes = await readFile(targetArchive);
    archiveEvidence.push({
      ...packageValue,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }

  const dependencyVersions = {
    react: await rootDependencyVersion("react"),
    "react-dom": await rootDependencyVersion("react-dom"),
    "@types/react": await rootDependencyVersion("@types/react"),
    "@types/react-dom": await rootDependencyVersion("@types/react-dom"),
    typescript: await rootDependencyVersion("typescript"),
    vite: await rootDependencyVersion("vite"),
  };
  const vendoredDependencies = Object.fromEntries(
    archiveEvidence.map((item) => [
      item.name,
      `file:vendor/${item.archive}`,
    ]),
  );

  await writeFile(path.join(consumerDirectory, ".npmrc-public-only"), "");
  await writeFile(
    path.join(consumerDirectory, "package.json"),
    JSON.stringify(
      {
        name: "template-runtime-release-consumer",
        private: true,
        type: "module",
        scripts: {
          build: "tsc -b && vite build",
        },
        dependencies: {
          ...vendoredDependencies,
          react: dependencyVersions.react,
          "react-dom": dependencyVersions["react-dom"],
        },
        devDependencies: {
          "@types/react": dependencyVersions["@types/react"],
          "@types/react-dom": dependencyVersions["@types/react-dom"],
          typescript: dependencyVersions.typescript,
          vite: dependencyVersions.vite,
        },
      },
      null,
      2,
    ),
  );
  if (path.basename(packageManager).startsWith("pnpm")) {
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
  }
  await writeFile(
    path.join(consumerDirectory, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          skipLibCheck: true,
          jsx: "react-jsx",
          noEmit: true,
        },
        include: ["src"],
      },
      null,
      2,
    ),
  );
  await writeFile(
    path.join(consumerDirectory, "index.html"),
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
  );
  await writeFile(
    path.join(consumerDirectory, "src/main.tsx"),
    `import {
  StrictMode,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { createRoot } from "react-dom/client";
import {
  getPackageFieldValue,
} from "@sleinity/template-core";
import type { TemplateSessionV1 } from "@sleinity/template-browser";
import {
  TemplateSessionProvider,
  TemplateSessionRenderer,
  useTemplateSession,
  useTemplateSessionSnapshot,
  type ResolvedProductRenderIdentityV1,
  type TemplateSessionRendererHandle,
} from "@sleinity/template-react";

interface RevisionedIdentity {
  revision: number;
  value: ResolvedProductRenderIdentityV1;
}

function RuntimeTest({ session }: { session: TemplateSessionV1 }) {
  const snapshot = useTemplateSessionSnapshot();
  const rendererRef = useRef<TemplateSessionRendererHandle>(null);
  const restored = useRef(false);
  const [identity, setIdentity] = useState<RevisionedIdentity | null>(null);
  const [message, setMessage] = useState("idle");
  const [exportPreview, setExportPreview] = useState<string | null>(null);
  const [importDiagnosticCount, setImportDiagnosticCount] = useState(0);
  const firstTextField = snapshot.editableFields.find(
    (field) => field.type === "text" || field.type === "textarea",
  );
  const identityReady =
    identity?.revision === snapshot.revision &&
    identity.value.readiness === "ready";

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const savedId = localStorage.getItem("template-runtime-release-saved-id");
    if (!savedId) return;
    void session.loadSavedTemplate(savedId).then((result) => {
      if (result.status === "ready") setMessage("restored");
    });
  }, [session]);

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const bytes = await file.arrayBuffer();
    setMessage("loading");
    const result = await session.loadZip({
      bytes,
      sourceName: file.name,
    });
    setMessage(result.status === "ready" ? "ready" : "load-failed");
  }

  async function loadInvalid() {
    const result = await session.loadZip({
      bytes: new Uint8Array([0, 1, 2, 3]).buffer,
      sourceName: "invalid.zip",
    });
    setImportDiagnosticCount(result.diagnostics.length);
    setMessage(
      result.status === "blocked" && result.diagnostics.length > 0
        ? "invalid-diagnostics"
        : "invalid-missing-diagnostics",
    );
  }

  async function editAndCheckStaleExport() {
    if (!snapshot.workingPackage || !firstTextField) return;
    const currentValue = getPackageFieldValue(
      snapshot.workingPackage,
      firstTextField,
    );
    const mutation = session.setField(
      firstTextField.id,
      \`\${String(currentValue ?? "")} · release edit\`,
    );
    if (!mutation.applied) {
      setMessage("edit-rejected");
      return;
    }
    try {
      await rendererRef.current?.exportPng({ download: false });
      setMessage("stale-export-accepted");
    } catch {
      setMessage("stale-export-rejected");
    }
  }

  async function saveDraft() {
    const saved = await session.save({ name: "Runtime release consumer" });
    localStorage.setItem("template-runtime-release-saved-id", saved.id);
    setMessage("saved");
  }

  async function exportPng() {
    const result = await rendererRef.current?.exportPng({ download: false });
    if (!result) return;
    setExportPreview(result.pngDataUrl);
    setMessage(
      result.width > 0 && result.height > 0
        ? "exported"
        : "invalid-export-metadata",
    );
  }

  return (
    <main data-session-status={snapshot.status}>
      <input
        aria-label="Template ZIP"
        type="file"
        accept=".zip,application/zip"
        onChange={loadFile}
      />
      <button onClick={() => void loadInvalid()}>Load invalid ZIP</button>
      <button
        disabled={!firstTextField || snapshot.status !== "ready"}
        onClick={() => void editAndCheckStaleExport()}
      >
        Edit and check stale export
      </button>
      <button
        disabled={snapshot.status !== "ready"}
        onClick={() => void saveDraft()}
      >
        Save browser draft
      </button>
      <button
        disabled={!identityReady}
        onClick={() => void exportPng()}
      >
        Export current PNG
      </button>
      <p className="message">{message}</p>
      <p className="diagnostics">
        {snapshot.diagnostics.length + importDiagnosticCount}
      </p>
      <p className="session-error">{snapshot.error?.code ?? "no-error"}</p>
      <p className="identity">
        {identityReady ? \`ready:\${identity.revision}\` : "not-ready"}
      </p>
      <TemplateSessionRenderer
        ref={rendererRef}
        mode="editor"
        fallback={<p>Waiting for a ready package.</p>}
        onRenderIdentity={(value) =>
          setIdentity({ revision: snapshot.revision, value })
        }
      />
      {exportPreview ? (
        <img alt="Export preview" src={exportPreview} />
      ) : null}
    </main>
  );
}

function App() {
  const session = useTemplateSession();
  lastOwnedSession = session;
  return (
    <TemplateSessionProvider session={session}>
      <RuntimeTest session={session} />
    </TemplateSessionProvider>
  );
}

let lastOwnedSession: TemplateSessionV1 | null = null;

function ConsumerRoot() {
  const [mounted, setMounted] = useState(true);
  const [unmountStatus, setUnmountStatus] = useState("mounted");
  useEffect(() => {
    if (mounted) return;
    queueMicrotask(() => {
      setUnmountStatus(lastOwnedSession?.getSnapshot().status ?? "missing");
    });
  }, [mounted]);
  return (
    <>
      <button onClick={() => setMounted(false)}>Unmount session workspace</button>
      <p className="unmount-status">{unmountStatus}</p>
      {mounted ? <App /> : null}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><ConsumerRoot /></StrictMode>,
);
`,
  );

  const environment = secretFreeEnvironment();
  run(packageManager, packageManagerArguments(installArguments()), {
    cwd: consumerDirectory,
    env: environment,
  });

  const lockFileName = (await readdir(consumerDirectory)).find((file) =>
    ["package-lock.json", "pnpm-lock.yaml"].includes(file),
  );
  if (!lockFileName) {
    throw new Error("The vendored runtime consumer produced no lockfile.");
  }
  const lockFile = await readFile(
    path.join(consumerDirectory, lockFileName),
    "utf8",
  );
  for (const packageValue of packageDefinitions) {
    if (!lockFile.includes(`vendor/${packageValue.archive}`)) {
      throw new Error(
        `The consumer lockfile does not retain ${packageValue.archive}.`,
      );
    }
  }
  if (
    lockFile.includes("npm.pkg.github.com") ||
    lockFile.includes("workspace:") ||
    lockFile.includes("link:")
  ) {
    throw new Error(
      "The vendored runtime lockfile contains a private registry or workspace reference.",
    );
  }

  for (const packageValue of packageDefinitions) {
    const installedRoot = path.join(
      consumerDirectory,
      "node_modules/@sleinity",
      packageValue.directory,
    );
    const manifest = JSON.parse(
      await readFile(path.join(installedRoot, "package.json"), "utf8"),
    );
    if (manifest.version !== version) {
      throw new Error(
        `${packageValue.name}@${manifest.version} installed; expected ${version}.`,
      );
    }
    if (
      JSON.stringify(manifest).includes("workspace:") ||
      JSON.stringify(manifest).includes("NODE_AUTH_TOKEN")
    ) {
      throw new Error(
        `${packageValue.name} manifest contains a workspace or credential reference.`,
      );
    }
    for (const fileName of ["index.js", "index.d.ts"]) {
      const source = await readFile(
        path.join(installedRoot, "dist", fileName),
        "utf8",
      );
      if (
        /(?:from|import)\s*["']\.\.\/\.\.\/src\//.test(source) ||
        [
          "apps/studio",
          "apps\\studio",
          "workspace:",
          "/Users/",
          "/private/",
          "NODE_AUTH_TOKEN",
        ].some((term) => source.includes(term))
      ) {
        throw new Error(
          `${packageValue.name}/${fileName} contains a forbidden repository or credential reference.`,
        );
      }
    }
  }

  run(
    process.execPath,
    [path.join(consumerDirectory, "node_modules/typescript/bin/tsc"), "-b"],
    { cwd: consumerDirectory, env: environment },
  );
  run(
    process.execPath,
    [
      path.join(consumerDirectory, "node_modules/vite/bin/vite.js"),
      "build",
    ],
    { cwd: consumerDirectory, env: environment },
  );

  server = await preview({
    root: consumerDirectory,
    configFile: false,
    logLevel: "warn",
    preview: { host: "127.0.0.1", port: 0 },
  });
  const applicationUrl = server.resolvedUrls?.local?.[0];
  if (!applicationUrl) {
    throw new Error("The vendored runtime consumer has no browser URL.");
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

  await page.goto(applicationUrl);
  await page.getByRole("button", { name: "Load invalid ZIP" }).click();
  try {
    await page.getByText("invalid-diagnostics").waitFor();
  } catch (error) {
    const state = await page.evaluate(() => ({
      body: document.body.textContent,
      status: document.querySelector("main")?.getAttribute(
        "data-session-status",
      ),
      message: document.querySelector(".message")?.textContent,
      diagnostics: document.querySelector(".diagnostics")?.textContent,
      sessionError: document.querySelector(".session-error")?.textContent,
    }));
    throw new Error(
      `Invalid ZIP browser state did not settle: ${JSON.stringify(state)}; errors=${JSON.stringify(consoleErrors)}. ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const diagnosticCount = Number(
    await page.locator(".diagnostics").textContent(),
  );
  const sessionError = await page.locator(".session-error").textContent();
  if (
    (!Number.isFinite(diagnosticCount) || diagnosticCount < 1) &&
    sessionError !== "import-failed"
  ) {
    throw new Error(
      "Invalid ZIP did not publish diagnostics or a typed session error.",
    );
  }

  await page.getByLabel("Template ZIP").setInputFiles(fixturePath);
  await page.locator("[data-template-package-canvas]").waitFor();
  await page.waitForFunction(() =>
    document.querySelector(".identity")?.textContent?.startsWith("ready:"),
  );

  await page
    .getByRole("button", { name: "Edit and check stale export" })
    .click();
  await page.getByText("stale-export-rejected").waitFor();
  await page.waitForFunction(() =>
    document.body.textContent?.includes("· release edit"),
  );
  await page.waitForFunction(() =>
    document.querySelector(".identity")?.textContent?.startsWith("ready:"),
  );

  await page.getByRole("button", { name: "Save browser draft" }).click();
  await page.getByText("saved").waitFor();

  await page.getByRole("button", { name: "Export current PNG" }).click();
  await page.getByText("exported").waitFor({ timeout: 60_000 });
  await page.getByAltText("Export preview").waitFor();
  if (downloadCount !== 0) {
    throw new Error("Silent host PNG capture unexpectedly initiated a download.");
  }

  await page.reload();
  await page.getByText("restored").waitFor();
  await page.locator("[data-template-package-canvas]").waitFor();
  await page.waitForFunction(() =>
    document.body.textContent?.includes("· release edit"),
  );
  await page
    .getByRole("button", { name: "Unmount session workspace" })
    .click();
  await page.getByText("disposed").waitFor();

  if (externalRequestCount !== 0) {
    throw new Error(
      `Vendored runtime attempted ${externalRequestCount} external requests.`,
    );
  }
  if (consoleErrors.length) {
    throw new Error(
      `Vendored runtime emitted browser errors:\n${consoleErrors.join("\n")}`,
    );
  }
  await context.close();

  console.log(
    `Verified secret-free runtime archives: import, diagnostics, edit, stale-export rejection, persistence, ready PNG, and offline reload (${archiveEvidence
      .map((item) => `${item.directory}=${item.sha256}`)
      .join(", ")}).`,
  );
} finally {
  await browser?.close();
  await server?.close();
  await rm(workspace, { recursive: true, force: true });
}

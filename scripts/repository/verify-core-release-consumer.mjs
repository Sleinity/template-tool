import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createCompactLifecycleFixture } from "../compact-lifecycle-fixture.mjs";
import { resolveFixedRuntimeVersion } from "./sdk-runtime-manifest.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const mode = args[0];
const version =
  process.env.TEMPLATE_CORE_RELEASE_VERSION ??
  await resolveFixedRuntimeVersion(root);
const packageName = "@sleinity/template-core";
const registry = "https://npm.pkg.github.com";
const packageManager = process.env.TEMPLATE_CONSUMER_PACKAGE_MANAGER ?? "npm";
const workspace = await mkdtemp(path.join(os.tmpdir(), "template-core-release-consumer-"));
const consumerDirectory = path.join(workspace, "consumer");
const vendorDirectory = path.join(consumerDirectory, "vendor");

if (mode !== "--published" && mode !== "--archive") {
  throw new Error(
    `Use --published or --archive /absolute/path/to/sleinity-template-core-${version}.tgz.`,
  );
}

const archiveArgument = mode === "--archive" ? args[1] : null;
if (mode === "--archive" && !archiveArgument) {
  throw new Error("--archive requires an absolute package archive path.");
}
if (mode === "--published" && !process.env.NODE_AUTH_TOKEN) {
  throw new Error("NODE_AUTH_TOKEN is required for the published-package verification.");
}

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

function installArguments() {
  if (path.basename(packageManager).startsWith("pnpm")) {
    return ["install", "--prefer-offline=false"];
  }
  return ["install", "--no-audit", "--no-fund"];
}

async function installWithRegistryRetry(environment) {
  const attempts = mode === "--published" ? 6 : 1;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return run(packageManager, installArguments(), {
        cwd: consumerDirectory,
        env: environment,
      });
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await Promise.all([
        rm(path.join(consumerDirectory, "node_modules"), {
          recursive: true,
          force: true,
        }),
        rm(path.join(consumerDirectory, "package-lock.json"), { force: true }),
        rm(path.join(consumerDirectory, "pnpm-lock.yaml"), { force: true }),
      ]);
      const delayMs = Math.min(attempt * 5_000, 30_000);
      console.warn(
        `Published package install attempt ${attempt}/${attempts} failed; retrying in ${delayMs / 1000}s.`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

async function installedVersion(dependencyName) {
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

try {
  await Promise.all([
    mkdir(path.join(consumerDirectory, "src"), { recursive: true }),
    mkdir(vendorDirectory, { recursive: true }),
  ]);

  let dependencySpec = version;
  let archiveHash = null;
  if (mode === "--archive") {
    const sourceArchive = path.resolve(archiveArgument);
    const vendorFileName = `sleinity-template-core-${version}.tgz`;
    const vendoredArchive = path.join(vendorDirectory, vendorFileName);
    await copyFile(sourceArchive, vendoredArchive);
    const archiveBytes = await readFile(vendoredArchive);
    archiveHash = createHash("sha256").update(archiveBytes).digest("hex");
    const expectedHash = process.env.TEMPLATE_CORE_ARCHIVE_SHA256;
    if (expectedHash && archiveHash !== expectedHash) {
      throw new Error(
        `Vendored archive hash mismatch: expected ${expectedHash}, received ${archiveHash}.`,
      );
    }
    dependencySpec = `file:vendor/${vendorFileName}`;
    await writeFile(path.join(consumerDirectory, ".npmrc-public-only"), "");
  } else {
    await writeFile(
      path.join(consumerDirectory, ".npmrc"),
      `@sleinity:registry=${registry}\n//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}\nalways-auth=true\n`,
    );
  }

  const dependencyVersions = {
    react: await installedVersion("react"),
    "react-dom": await installedVersion("react-dom"),
    "@types/react": await installedVersion("@types/react"),
    "@types/react-dom": await installedVersion("@types/react-dom"),
    typescript: await installedVersion("typescript"),
    vite: await installedVersion("vite"),
  };
  await writeFile(
    path.join(consumerDirectory, "package.json"),
    JSON.stringify(
      {
        name: "template-core-release-consumer",
        private: true,
        type: "module",
        scripts: {
          build: "tsc -b && vite build",
          verify: "node verify.mjs",
        },
        dependencies: {
          [packageName]: dependencySpec,
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
    `import { useState, type ChangeEvent } from "react";
import { createRoot } from "react-dom/client";
import { importTemplatePackage } from "@sleinity/template-core";

function App() {
  const [summary, setSummary] = useState("Choose a TemplatePackage ZIP");
  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const result = importTemplatePackage(await file.arrayBuffer(), file.name);
    setSummary(result.importable && result.workingPackage
      ? \`Imported \${result.workingPackage.name}\`
      : \`Rejected with \${result.source.diagnostics.length} source diagnostics\`);
  }
  return <main><input type="file" accept=".zip,application/zip" onChange={onFile} /><p>{summary}</p></main>;
}

createRoot(document.getElementById("root")!).render(<App />);
`,
  );
  await writeFile(
    path.join(consumerDirectory, "verify.mjs"),
    `import { readFile } from "node:fs/promises";
import { importTemplatePackage } from "@sleinity/template-core";

const bytes = await readFile(new URL("./template.zip", import.meta.url));
const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const imported = importTemplatePackage(arrayBuffer, "release-consumer.zip");
if (!imported.importable || !imported.workingPackage || !imported.basePackage) {
  throw new Error("The released importer rejected the canonical ZIP.");
}
const invalid = importTemplatePackage(new Uint8Array([0, 1, 2, 3]).buffer, "invalid.zip");
if (invalid.importable || invalid.source.valid || invalid.source.diagnostics.length === 0) {
  throw new Error("The released importer did not return structured invalid-ZIP diagnostics.");
}
`,
  );
  const fixture = await createCompactLifecycleFixture();
  await writeFile(path.join(consumerDirectory, "template.zip"), fixture.bytes);

  const environment =
    mode === "--published"
      ? { ...process.env, CI: "true" }
      : secretFreeEnvironment();
  await installWithRegistryRetry(environment);

  const installedManifest = JSON.parse(
    await readFile(
      path.join(
        consumerDirectory,
        "node_modules/@sleinity/template-core/package.json",
      ),
      "utf8",
    ),
  );
  if (installedManifest.version !== version) {
    throw new Error(
      `Installed ${packageName}@${installedManifest.version}; expected ${version}.`,
    );
  }
  if (installedManifest.peerDependencies) {
    throw new Error("template-core unexpectedly declares peer dependencies.");
  }

  const lockFileName = (await readdir(consumerDirectory)).find((file) =>
    ["package-lock.json", "pnpm-lock.yaml"].includes(file),
  );
  if (!lockFileName) throw new Error("The isolated consumer produced no lockfile.");
  const lockFile = await readFile(
    path.join(consumerDirectory, lockFileName),
    "utf8",
  );
  if (mode === "--published") {
    if (
      lockFile.includes("file:") ||
      lockFile.includes("workspace:") ||
      lockFile.includes("link:")
    ) {
      throw new Error("Published consumer lockfile contains a local package reference.");
    }
    if (!lockFile.includes("npm.pkg.github.com")) {
      throw new Error("Published consumer lockfile does not resolve through GitHub Packages.");
    }
  } else if (
    !lockFile.includes(`vendor/sleinity-template-core-${version}.tgz`)
  ) {
    throw new Error("Vendored consumer lockfile does not retain the file dependency.");
  }

  const installedDist = path.join(
    consumerDirectory,
    "node_modules/@sleinity/template-core/dist",
  );
  const declaration = await readFile(path.join(installedDist, "index.d.ts"));
  const declarationHash = createHash("sha256")
    .update(declaration)
    .digest("hex");
  if (
    declaration.byteLength !== 87_431 ||
    declarationHash !==
      "7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033"
  ) {
    throw new Error(
      `Released core declaration drifted: ${declaration.byteLength} bytes / ${declarationHash}.`,
    );
  }
  for (const fileName of ["index.js", "index.d.ts"]) {
    const source = await readFile(path.join(installedDist, fileName), "utf8");
    if (
      /(?:from|import)\s*["']\.\.\/\.\.\/src\//.test(source) ||
      /apps[\\/]studio|workspace:|\/Users\/|\/private\//.test(source)
    ) {
      throw new Error(
        `Released template-core ${fileName} contains a forbidden repository dependency.`,
      );
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
  run(process.execPath, [path.join(consumerDirectory, "verify.mjs")], {
    cwd: consumerDirectory,
    env: environment,
  });

  console.log(
    mode === "--published"
      ? `Verified ${packageName}@${version} from GitHub Packages in an isolated React/TypeScript consumer.`
      : `Verified published archive as a secret-free vendored consumer (${archiveHash}).`,
  );
} finally {
  await rm(workspace, { recursive: true, force: true });
}

import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const workspace = await mkdtemp(path.join(os.tmpdir(), "template-sdk-bundles-"));
const archivesDirectory = path.join(workspace, "archives");
const consumerDirectory = path.join(workspace, "consumer");
const packageDirectories = ["template-core", "template-browser", "template-react"];
const pnpmExecutable = process.env.TEMPLATE_PNPM_EXECUTABLE ?? "pnpm";
const baselinePath = path.join(root, "config", "sdk-bundle-baselines.json");

const profiles = {
  "core-import-validation": `
export { importTemplatePackage, validateTemplatePackage } from "@sleinity/template-core";
`,
  "browser-session-importer": `
export { createTemplateSession } from "@sleinity/template-browser/session";
export { createTemplateImportWizard } from "@sleinity/template-browser/importer";
export { inspectTemplateRuntimeSupport } from "@sleinity/template-browser/compatibility";
`,
  "react-renderer": `
export { TemplatePackageRenderer, TemplateSessionProvider, TemplateSessionRenderer } from "@sleinity/template-react";
`,
  "react-importer": `
import "@sleinity/template-react/importer.css";
export { TemplateImportWizard, useTemplateImportWizard } from "@sleinity/template-react/importer";
`,
  "react-editor": `
export {
  TemplateSessionViewport,
  useTemplateSessionDiagnosticSummary,
  useTemplateSessionEditableField,
  useTemplateSessionEditableFields,
} from "@sleinity/template-react/editor";
`,
};

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

async function installedVersion(packageName) {
  const manifest = JSON.parse(
    await readFile(path.join(root, "node_modules", packageName, "package.json"), "utf8"),
  );
  return manifest.version;
}

try {
  await Promise.all([
    mkdir(archivesDirectory, { recursive: true }),
    mkdir(path.join(consumerDirectory, "src"), { recursive: true }),
  ]);
  for (const packageDirectory of packageDirectories) {
    run(pnpmExecutable, ["pack", "--pack-destination", archivesDirectory], {
      cwd: path.join(root, "packages", packageDirectory),
    });
  }
  const archives = (await readdir(archivesDirectory))
    .filter((item) => item.endsWith(".tgz"))
    .sort();
  const packedDependencies = Object.fromEntries(
    packageDirectories.map((directory) => {
      const archive = archives.find((item) => item.includes(directory));
      if (!archive) throw new Error(`Missing packed archive for ${directory}.`);
      return [
        `@sleinity/${directory}`,
        `file:${path.join(archivesDirectory, archive)}`,
      ];
    }),
  );
  const dependencyVersions = {
    react: await installedVersion("react"),
    "react-dom": await installedVersion("react-dom"),
    vite: await installedVersion("vite"),
  };
  await writeFile(
    path.join(consumerDirectory, "package.json"),
    JSON.stringify({
      name: "template-sdk-curated-bundle-probes",
      private: true,
      type: "module",
      dependencies: {
        ...packedDependencies,
        react: dependencyVersions.react,
        "react-dom": dependencyVersions["react-dom"],
      },
      devDependencies: { vite: dependencyVersions.vite },
    }, null, 2),
  );
  await writeFile(
    path.join(consumerDirectory, "pnpm-workspace.yaml"),
    `packages:\n  - "."\nallowBuilds:\n  esbuild: true\nonlyBuiltDependencies:\n  - esbuild\noverrides:\n${Object.entries(packedDependencies)
      .map(([name, archive]) => `  "${name}": "${archive}"`)
      .join("\n")}\n`,
  );
  await writeFile(
    path.join(consumerDirectory, "vite.config.js"),
    `import { defineConfig } from "vite";
export default defineConfig(({ mode }) => ({
  build: {
    lib: { entry: \`src/\${mode}.tsx\`, formats: ["es"], fileName: mode },
    outDir: \`dist-\${mode}\`,
    emptyOutDir: true,
    minify: true,
    sourcemap: false,
    rollupOptions: { external: ["react", "react-dom", "react/jsx-runtime"] },
  },
}));
`,
  );
  await Promise.all(
    Object.entries(profiles).map(([name, source]) =>
      writeFile(path.join(consumerDirectory, "src", `${name}.tsx`), source)
    ),
  );
  run(pnpmExecutable, ["install", "--prefer-offline"], {
    cwd: consumerDirectory,
    env: { ...process.env, CI: "true" },
  });

  const observed = {};
  for (const name of Object.keys(profiles)) {
    run(
      process.execPath,
      [path.join(consumerDirectory, "node_modules/vite/bin/vite.js"), "build", "--mode", name],
      { cwd: consumerDirectory },
    );
    const outputDirectory = path.join(consumerDirectory, `dist-${name}`);
    const outputFiles = (await readdir(outputDirectory)).filter((item) =>
      item.endsWith(".js") || item.endsWith(".css")
    );
    let bytes = 0;
    let gzipBytes = 0;
    for (const outputFile of outputFiles) {
      const content = await readFile(path.join(outputDirectory, outputFile));
      const source = content.toString("utf8");
      bytes += content.byteLength;
      gzipBytes += gzipSync(content).byteLength;
      for (const forbidden of [
        "apps/studio",
        "src/template-package",
        "/Users/",
        "NODE_AUTH_TOKEN",
        "GITHUB_TOKEN",
        "react.production.min",
      ]) {
        if (source.includes(forbidden)) {
          throw new Error(`${name}/${outputFile} contains forbidden ${forbidden}.`);
        }
      }
    }
    observed[name] = { bytes, gzipBytes };
  }

  if (process.argv.includes("--print")) {
    process.stdout.write(`${JSON.stringify({
      schemaVersion: "template-sdk-bundle-baselines-v1",
      profiles: observed,
    }, null, 2)}\n`);
  } else {
    const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
    if (baseline.schemaVersion !== "template-sdk-bundle-baselines-v1") {
      throw new Error("The SDK bundle baseline is invalid.");
    }
    for (const [name, measurement] of Object.entries(observed)) {
      const limit = baseline.profiles?.[name];
      if (!limit) throw new Error(`Missing SDK bundle baseline for ${name}.`);
      if (measurement.bytes > limit.maxBytes || measurement.gzipBytes > limit.maxGzipBytes) {
        throw new Error(
          `${name} exceeds its SDK bundle budget: ${measurement.bytes}/${measurement.gzipBytes} bytes; ` +
          `limits ${limit.maxBytes}/${limit.maxGzipBytes}.`,
        );
      }
    }
    console.log(
      `Curated SDK entry bundles passed: ${Object.entries(observed)
        .map(([name, value]) => `${name}=${value.bytes}/${value.gzipBytes}`)
        .join(", ")} bytes/gzip.`,
    );
  }
} finally {
  await rm(workspace, { recursive: true, force: true });
}

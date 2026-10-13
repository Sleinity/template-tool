import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import { createHash } from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const workspace = await mkdtemp(path.join(os.tmpdir(), "template-sdk-bundles-"));
const archivesDirectory = path.join(workspace, "archives");
const consumerDirectory = path.join(workspace, "consumer");
const packageDirectories = ["template-core", "template-browser", "template-react"];
const pnpmExecutable = process.env.TEMPLATE_PNPM_EXECUTABLE ?? "pnpm";
const reportIndex = process.argv.indexOf("--report");
const reportPath = reportIndex < 0 ? null : path.resolve(process.argv[reportIndex + 1] ?? "");
if (reportIndex >= 0 && !process.argv[reportIndex + 1]) throw new Error("--report requires a path.");
const baselinePath = path.join(root, "config", "sdk-bundle-baselines.json");

const profiles = {
  "core-import-validation": `
export { importTemplatePackage, validateTemplatePackage } from "@sleinity/template-core";
`,
  "core-family": `
export {
  createTemplateFamilyFromPackage,
  validateTemplateFamily,
  resolveTemplateFamilyVariant,
  materializeTemplateFamilyVariant,
} from "@sleinity/template-core/family";
`,
  "browser-session-importer": `
export { createTemplateSession } from "@sleinity/template-browser/session";
export { createTemplateImportWizard } from "@sleinity/template-browser/importer";
export { inspectTemplateRuntimeSupport } from "@sleinity/template-browser/compatibility";
`,
  "browser-field-session-v2": `
export {
  createTemplateSessionV2,
  createTemplateFieldFamilySessionV2,
} from "@sleinity/template-browser/session";
export { planTemplateReimportV2 } from "@sleinity/template-browser/importer";
export {
  getTemplateSessionRepositoryV2,
  getTemplateFieldFamilyRepositoryV3,
} from "@sleinity/template-browser/persistence";
`,
  "browser-family": `
export { createTemplateFamilySession } from "@sleinity/template-browser/session";
export {
  createTemplateFamilyImportWizard,
  planTemplateFamilyVariantReimport,
} from "@sleinity/template-browser/importer";
export {
  getTemplateFamilyRepository,
  listTemplateFamiliesIncludingLegacy,
} from "@sleinity/template-browser/persistence";
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
  "react-field-session-v2": `
export {
  TemplateFieldSessionV2Provider,
  TemplateFieldSessionRendererV2,
  useTemplateFieldControllersV2,
  useTemplateFieldFamilySessionV2,
  useTemplateFieldSessionV2Snapshot,
  useTemplateSessionV2,
} from "@sleinity/template-react/editor";
`,
  "react-family": `
export {
  TemplateFamilyImportWizardProvider,
  TemplateFamilyImportPreview,
  useTemplateFamilyImportWizard,
} from "@sleinity/template-react/importer";
export {
  TemplateFamilySessionProvider,
  useTemplateFamilyEditor,
  useTemplateFamilyEditableFields,
  useTemplateFamilyDiagnosticSummary,
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
  plugins: [{ name: "bundle-attribution", generateBundle(options, bundle) {
    const modules = Object.values(bundle).filter(item => item.type === "chunk").flatMap(chunk =>
      Object.entries(chunk.modules).map(([id, data]) => ({
        id: id.includes("node_modules/") ? id.slice(id.lastIndexOf("node_modules/") + 13) : id.split("/").pop(),
        chunk: chunk.fileName, renderedLength: data.renderedLength, originalLength: data.originalLength,
        renderedExports: data.renderedExports, removedExports: data.removedExports,
      })));
    this.emitFile({ type: "asset", fileName: "module-contributions.json", source: JSON.stringify(modules.sort((a,b) => b.renderedLength - a.renderedLength)) });
  }}],
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
  const attribution = {};
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
    attribution[name] = JSON.parse(await readFile(path.join(outputDirectory, "module-contributions.json"), "utf8"));
  }

  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  if (baseline.schemaVersion !== "template-sdk-bundle-baselines-v1") throw new Error("The SDK bundle baseline is invalid.");
  const failures = Object.entries(observed).flatMap(([name, measurement]) => {
    const limit = baseline.profiles?.[name];
    if (!limit) return [`Missing SDK bundle baseline for ${name}.`];
    return measurement.bytes > limit.maxBytes || measurement.gzipBytes > limit.maxGzipBytes
      ? [`${name} exceeds its SDK bundle budget: ${measurement.bytes}/${measurement.gzipBytes} bytes; limits ${limit.maxBytes}/${limit.maxGzipBytes}.`] : [];
  });
  if (reportPath) {
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify({ schemaVersion: "sdk-bundle-measurement-v1",
      measuredAt: new Date().toISOString(), commit: run("git", ["rev-parse", "HEAD"], { cwd: root }).trim(),
      tooling: { node: process.version, platform: process.platform, arch: process.arch, ...dependencyVersions },
      inputHashes: {
        budgets: createHash("sha256").update(await readFile(baselinePath)).digest("hex"),
        probes: createHash("sha256").update(JSON.stringify(profiles)).digest("hex"),
        worktreeDiff: createHash("sha256").update(run("git", ["diff", "HEAD"], { cwd: root })).digest("hex"),
      },
      packageBuilds: Object.fromEntries(await Promise.all(packageDirectories.map(async name =>
        [name, JSON.parse(await readFile(path.join(root, "packages", name, "package.json"), "utf8")).scripts.build]))),
      packageVersions: Object.fromEntries(await Promise.all(packageDirectories.map(async name =>
        [name, JSON.parse(await readFile(path.join(root, "packages", name, "package.json"), "utf8")).version]))),
      archiveHashes: Object.fromEntries(await Promise.all(archives.map(async name => [name,
        createHash("sha256").update(await readFile(path.join(archivesDirectory, name))).digest("hex")]))),
      profiles: observed, limits: baseline.profiles, failures, moduleContributions: attribution,
      attributionNote: "Rollup renderedLength is pre-minification attribution, not a sum of minified or gzip contribution; total measured JS/CSS budgets are unchanged.",
    }, null, 2) + "\n");
  }
  console.log(JSON.stringify({ profiles: observed, failures }, null, 2));
  if (!process.argv.includes("--print") && failures.length) throw new Error(failures.join("\n"));
  if (!failures.length) console.log("Curated SDK entry bundles passed.");

} finally {
  await rm(workspace, { recursive: true, force: true });
}

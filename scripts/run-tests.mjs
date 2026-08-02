import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import react from "@vitejs/plugin-react";
import { build } from "vite";
import {
  formatLifecycleFixtureReport,
  portableTestsRequested,
  selectLifecycleZipFixture,
  strictRealisticZipRequested,
} from "./realistic-zip-fixture.mjs";

const portableTestMode = portableTestsRequested();
globalThis.__templateToolPortableTests = portableTestMode;

await import("./realistic-zip-fixture.test.mjs");
await import("./fidelity/fidelity.test.mjs");
await import("./scene-graph/scene-graph.test.mjs");
await import("./settlement/settlement.test.mjs");
await import("./runtime-routing/font-manifest.test.mjs");

const projectRoot = path.resolve(import.meta.dirname, "..");
const outputDirectory = await mkdtemp(
  path.join(tmpdir(), "template-package-tests-"),
);

const strictRealisticZip = strictRealisticZipRequested();
const lifecycleFixture = await selectLifecycleZipFixture({
  strict: strictRealisticZip,
  forceCompactFallback: portableTestMode,
});
console.log(formatLifecycleFixtureReport(lifecycleFixture));
globalThis.__templatePackageLifecycleFixtureMode = lifecycleFixture.kind;
globalThis.__templatePackageLifecycleFixtureStrict = lifecycleFixture.strict;
if (lifecycleFixture.kind === "realistic") {
  globalThis.__templatePackageLifecycleZip = lifecycleFixture.bytes;
  globalThis.__templatePackageLifecycleZipName = lifecycleFixture.sourceName;
  globalThis.__templatePackageLifecycleZipIdentity = {
    sha256: lifecycleFixture.sha256,
    sizeBytes: lifecycleFixture.sizeBytes,
    sourcePath: lifecycleFixture.sourcePath,
  };
}

const forbiddenSourceTerms = [
  "Legacy JSX",
  "legacy-jsx",
  "parseJsxTemplate",
  "validateJsxSnippet",
  "createImportedTemplateDefinition",
];
const forbiddenDirectories = ["import", "motion", "remotion", "templates", "export"];
const sourceRoots = [
  path.join(projectRoot, "src"),
  path.join(projectRoot, "apps", "studio", "src"),
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(resolved)));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(resolved);
  }
  return files;
}

try {
  for (const sourceRoot of sourceRoots) {
    for (const directory of forbiddenDirectories) {
      const removedPipelinePath = path.join(sourceRoot, directory);
      const exists = await readdir(removedPipelinePath).then(
        () => true,
        () => false,
      );
      if (exists) {
        throw new Error(
          `Removed pipeline directory still exists: ${path.relative(projectRoot, removedPipelinePath)}`,
        );
      }
    }
  }

  for (const sourceRoot of sourceRoots) {
    for (const file of await sourceFiles(sourceRoot)) {
      if (file.endsWith("packageOnlyArchitecture.test.tsx")) continue;
      const source = await readFile(file, "utf8");
      const forbidden = forbiddenSourceTerms.find((term) => source.includes(term));
      if (forbidden) {
        throw new Error(
          `Removed pipeline reference "${forbidden}" remains in ${path.relative(projectRoot, file)}`,
        );
      }
    }
  }

  await build({
    root: projectRoot,
    configFile: false,
    plugins: [react()],
    logLevel: "warn",
    resolve: {
      alias: [
        {
          find: "@sleinity/template-core/renderer-internal",
          replacement: path.join(
            projectRoot,
            "packages/template-core/src/renderer-internal.ts",
          ),
        },
        {
          find: "@sleinity/template-react/renderer-internal",
          replacement: path.join(
            projectRoot,
            "packages/template-react/src/renderer-internal.ts",
          ),
        },
      ],
    },
    ssr: {
      noExternal: true,
    },
    build: {
      ssr: path.join(projectRoot, "src", "test-suite.ts"),
      outDir: outputDirectory,
      emptyOutDir: false,
      minify: false,
      target: "esnext",
    },
  });
  await import(pathToFileURL(path.join(outputDirectory, "test-suite.js")).href);
  console.log("Template Package test suite passed.");
} finally {
  await rm(outputDirectory, { recursive: true, force: true });
}

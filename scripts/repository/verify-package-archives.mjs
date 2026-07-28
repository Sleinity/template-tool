import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadRuntimePackageDefinitions } from "./sdk-runtime-manifest.mjs";

const root = process.cwd();
const output = await mkdtemp(path.join(os.tmpdir(), "template-sdk-pack-"));
const packages = (await loadRuntimePackageDefinitions(root)).map(
  (item) => item.directory,
);
const pnpmExecutable = process.env.TEMPLATE_PNPM_EXECUTABLE ?? "pnpm";
const forbidden = [
  /^package\/src\//,
  /^package\/fidelity\//,
  /^package\/fixtures\//,
  /^package\/tests?\//,
  /\.env(?:\.|$)/,
  /TemplatePackageQualityPanel/,
  /TemplatePackageFieldEditor/,
  /apps[\\/]studio/,
];

try {
  for (const packageName of packages) {
    const cwd = path.join(root, "packages", packageName);
    const packed = spawnSync(
      pnpmExecutable,
      ["pack", "--pack-destination", output],
      { cwd, encoding: "utf8" },
    );
    if (packed.status !== 0) {
      throw new Error(`Packing ${packageName} failed:\n${packed.stderr || packed.stdout}`);
    }
  }
  const archives = (await readdir(output)).filter((file) => file.endsWith(".tgz"));
  if (archives.length !== packages.length) {
    throw new Error(`Expected ${packages.length} package archives, found ${archives.length}.`);
  }
  for (const archive of archives) {
    const listed = spawnSync("tar", ["-tzf", path.join(output, archive)], { encoding: "utf8" });
    if (listed.status !== 0) throw new Error(`Could not inspect ${archive}.`);
    const entries = listed.stdout.trim().split("\n").filter(Boolean);
    const bad = entries.filter((entry) => forbidden.some((pattern) => pattern.test(entry)));
    if (bad.length) throw new Error(`${archive} contains forbidden files:\n${bad.join("\n")}`);
    for (const requiredEntry of [
      "package/package.json",
      "package/README.md",
      "package/dist/index.js",
      "package/dist/index.js.map",
      "package/dist/index.d.ts",
    ]) {
      if (!entries.includes(requiredEntry)) {
        throw new Error(`${archive} is missing ${requiredEntry}.`);
      }
    }
    const manifestSource = spawnSync(
      "tar",
      ["-xOzf", path.join(output, archive), "package/package.json"],
      { encoding: "utf8" },
    );
    if (manifestSource.status !== 0) {
      throw new Error(`Could not inspect package.json in ${archive}.`);
    }
    const manifest = JSON.parse(manifestSource.stdout);
    if (JSON.stringify(manifest).includes("workspace:")) {
      throw new Error(`${archive} contains a workspace dependency.`);
    }
    for (const entry of ["package/dist/index.js", "package/dist/index.d.ts"]) {
      const extracted = spawnSync("tar", ["-xOzf", path.join(output, archive), entry], { encoding: "utf8" });
      if (extracted.status !== 0) throw new Error(`Could not inspect ${entry} in ${archive}.`);
      for (const forbiddenSource of ["apps/studio", "components/ui", "lucide-react"]) {
        if (extracted.stdout.includes(forbiddenSource)) {
          throw new Error(`${archive} ${entry} contains forbidden dependency ${forbiddenSource}.`);
        }
      }
      if (archive.includes("template-core")) {
        for (const migratedRootSource of [
          "src/template-package/types",
          "src/template-package/packageDiagnostics",
          "src/template-package/packageAssetSafety",
          "src/template-package/migrateTemplatePackage",
          "src/template-package/parseTemplatePackage",
          "src/template-package/validateTemplatePackage",
          "src/template-package/bundle/loadTemplatePackageBundleSource",
          "src/template-package/bundle/normalizeTemplatePackageBundle",
          "src/template-package/bundle/sourceContract",
          "src/template-package/bundle/zipBundleReader",
          "src/template-package/editor/packageEditorSession",
          "src/template-package/editor/packageFieldBindings",
          "src/template-package/editor/fieldConstraints",
        ]) {
          if (extracted.stdout.includes(migratedRootSource)) {
            throw new Error(`${archive} ${entry} contains migrated root source ${migratedRootSource}.`);
          }
        }
      }
    }
  }
  const archiveSizes = Object.fromEntries(
    await Promise.all(
      archives
        .sort()
        .map(async (archive) => [archive, (await stat(path.join(output, archive))).size]),
    ),
  );
  console.log(
    `Verified ${archives.length} private SDK package archives: ${Object.entries(archiveSizes)
      .map(([archive, size]) => `${archive}=${size} bytes`)
      .join(", ")}.`,
  );
} finally {
  await rm(output, { recursive: true, force: true });
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(scriptPath), "../..");

async function readRuntimeManifest(root = defaultRoot) {
  return JSON.parse(
    await readFile(
      path.join(root, "config", "sdk-runtime-packages.json"),
      "utf8",
    ),
  );
}

export async function loadRuntimeDistribution(root = defaultRoot) {
  const manifest = await readRuntimeManifest(root);
  const distribution = manifest.distribution;
  if (
    distribution?.repositoryUrl !==
      "https://github.com/Sleinity/template-tool" ||
    distribution?.releaseVisibility !== "public" ||
    distribution?.licensePolicy !== "sleinity-tools-only" ||
    typeof distribution?.authorizedUse !== "string" ||
    !distribution.authorizedUse
  ) {
    throw new Error(
      "The SDK runtime distribution must explicitly record the Sleinity-tools-only policy.",
    );
  }
  return { ...distribution };
}

export async function loadRuntimePackageDefinitions(root = defaultRoot) {
  const manifest = await readRuntimeManifest(root);
  await loadRuntimeDistribution(root);
  if (
    manifest.schemaVersion !== "template-sdk-runtime-package-set-v1" ||
    !Array.isArray(manifest.packages) ||
    manifest.packages.length === 0
  ) {
    throw new Error("The SDK runtime package manifest is invalid.");
  }
  const names = new Set();
  const directories = new Set();
  const definitions = manifest.packages.map((item) => {
    if (
      typeof item.name !== "string" ||
      !item.name.startsWith("@sleinity/") ||
      typeof item.directory !== "string" ||
      !item.directory ||
      path.basename(item.directory) !== item.directory ||
      typeof item.role !== "string" ||
      !item.role
    ) {
      throw new Error("Every SDK runtime package needs a name, directory, and role.");
    }
    if (names.has(item.name) || directories.has(item.directory)) {
      throw new Error(`Duplicate SDK runtime package owner: ${item.name}.`);
    }
    names.add(item.name);
    directories.add(item.directory);
    return {
      name: item.name,
      directory: item.directory,
      role: item.role,
    };
  });
  const packageManifests = await Promise.all(
    definitions.map(async (item) => JSON.parse(
      await readFile(
        path.join(root, "packages", item.directory, "package.json"),
        "utf8",
      ),
    )),
  );
  definitions.forEach((item, index) => {
    const packageManifest = packageManifests[index];
    if (packageManifest.name !== item.name) {
      throw new Error(
        `SDK runtime manifest name mismatch for ${item.directory}: expected ${item.name}, found ${packageManifest.name}.`,
      );
    }
    const earlierPackages = new Set(
      definitions.slice(0, index).map((candidate) => candidate.name),
    );
    const runtimeNames = new Set(definitions.map((candidate) => candidate.name));
    for (const dependencyName of Object.keys(packageManifest.dependencies ?? {})) {
      if (runtimeNames.has(dependencyName) && !earlierPackages.has(dependencyName)) {
        throw new Error(
          `${item.name} must appear after its runtime dependency ${dependencyName}.`,
        );
      }
    }
  });
  return definitions;
}

export async function resolveFixedRuntimeVersion(root = defaultRoot) {
  const packages = await loadRuntimePackageDefinitions(root);
  const versions = new Set();
  for (const item of packages) {
    const packageManifest = JSON.parse(
      await readFile(
        path.join(root, "packages", item.directory, "package.json"),
        "utf8",
      ),
    );
    versions.add(packageManifest.version);
  }
  if (versions.size !== 1) {
    throw new Error(
      `Runtime packages must use one fixed version; found ${Array.from(versions).join(", ")}.`,
    );
  }
  return Array.from(versions)[0];
}

export function runtimeArchiveName(item, version) {
  return `${item.name.replace("@sleinity/", "sleinity-")}-${version}.tgz`;
}

async function cli() {
  const command = process.argv[2];
  const packages = await loadRuntimePackageDefinitions();
  const fixedVersion = await resolveFixedRuntimeVersion();
  const tagVersion = process.env.GITHUB_REF_NAME?.startsWith("sdk-v")
    ? process.env.GITHUB_REF_NAME.slice("sdk-v".length)
    : null;
  const version =
    process.env.TEMPLATE_RUNTIME_RELEASE_VERSION ??
    tagVersion ??
    fixedVersion;
  if (version !== fixedVersion) {
    throw new Error(
      `Requested SDK version ${version} does not match the fixed package version ${fixedVersion}.`,
    );
  }
  if (command === "package-directories") {
    process.stdout.write(packages.map((item) => item.directory).join("\n") + "\n");
    return;
  }
  if (command === "package-names") {
    process.stdout.write(packages.map((item) => item.name).join("\n") + "\n");
    return;
  }
  if (command === "archive-paths") {
    const outputDirectory = process.argv[3] ?? "release-artifacts";
    process.stdout.write(
      packages
        .map((item) => path.join(outputDirectory, runtimeArchiveName(item, version)))
        .join("\n") + "\n",
    );
    return;
  }
  if (command === "env") {
    const distribution = await loadRuntimeDistribution();
    process.stdout.write(
      [
        `SDK_VERSION=${version}`,
        `SDK_RELEASE_TAG=sdk-v${version}`,
        `SDK_RELEASE_TITLE=SDK ${version}`,
        `SDK_RELEASE_VISIBILITY=${distribution.releaseVisibility}`,
        `SDK_LICENSE_POLICY=${distribution.licensePolicy}`,
        `SDK_AUTHORIZED_USE=${distribution.authorizedUse}`,
      ].join("\n") + "\n",
    );
    return;
  }
  throw new Error(
    "Usage: sdk-runtime-manifest.mjs env|package-directories|package-names|archive-paths [OUTPUT_DIRECTORY]",
  );
}

if (path.resolve(process.argv[1] ?? "") === scriptPath) {
  await cli();
}

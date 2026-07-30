import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  loadRuntimeDistribution,
  loadRuntimePackageDefinitions,
  resolveFixedRuntimeVersion,
} from "./sdk-runtime-manifest.mjs";

const root = process.cwd();
const retiredActivePaths = [
  "docs/sdk/BAS_NARROWCASTING_LOVABLE_PROMPTS.md",
  "examples/narrowcasting-integration/package.json",
  "examples/narrowcasting-integration/src/main.tsx",
  "scripts/repository/verify-narrowcasting-reference.mjs",
];
for (const retiredPath of retiredActivePaths) {
  try {
    await access(path.join(root, retiredPath));
    throw new Error(`Retired active SDK path still exists: ${retiredPath}.`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const hostSpecificPattern =
  /\bBas\b|narrowcast|screen\/player|campaign|playlist|authorizedConsumer|authorized-pilot/iu;
const activeRoots = [
  "config/sdk-runtime-packages.json",
  "docs/sdk",
  "examples/minimal-renderer/README.md",
  "examples/template-editor-integration",
  "packages/template-core/README.md",
  "packages/template-browser/README.md",
  "packages/template-react/README.md",
  ".github/workflows/ci.yml",
  ".github/workflows/release.yml",
  "scripts/repository/create-core-release-handoff.mjs",
  "scripts/repository/create-runtime-release-handoff.mjs",
  "scripts/repository/sdk-runtime-manifest.mjs",
  "scripts/repository/verify-template-editor-reference.mjs",
];

async function collectFiles(relativePath) {
  const absolutePath = path.join(root, relativePath);
  const entries = await readdir(absolutePath, { withFileTypes: true }).catch(
    (error) => {
      if (error?.code === "ENOTDIR") return null;
      throw error;
    },
  );
  if (entries === null) return [relativePath];
  const files = [];
  for (const entry of entries) {
    if (entry.name === "dist" || entry.name === "node_modules") continue;
    const childPath = path.join(relativePath, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(childPath));
    else files.push(childPath);
  }
  return files;
}

for (const activeRoot of activeRoots) {
  for (const activeFile of await collectFiles(activeRoot)) {
    const source = await readFile(path.join(root, activeFile), "utf8");
    if (hostSpecificPattern.test(source)) {
      throw new Error(
        `Active SDK surface contains retired host-specific naming: ${activeFile}.`,
      );
    }
  }
}

const lovablePrompts = await readFile(
  path.join(root, "docs", "sdk", "LOVABLE_TEMPLATE_EDITOR_PROMPTS.md"),
  "utf8",
);
if (
  /From @sleinity\/template-react\/importer:\n(?:- [^\n]+\n)*- TemplateImportConfirmationV1/mu
    .test(lovablePrompts) ||
  /TemplateSessionProvider using wizard\.session/u.test(lovablePrompts) ||
  !lovablePrompts.includes("loadTemplateImportConfirmation()") ||
  !lovablePrompts.includes(
    "TemplateImportConfirmationV1 as a type from @sleinity/template-browser/importer",
  )
) {
  throw new Error(
    "Lovable handoff must import confirmation from template-browser and reopen it in a fresh session.",
  );
}

const runtimeHandoffGenerator = await readFile(
  path.join(
    root,
    "scripts",
    "repository",
    "create-runtime-release-handoff.mjs",
  ),
  "utf8",
);
if (
  runtimeHandoffGenerator.includes(
    "<TemplateSessionProvider session={wizard.session}>",
  ) ||
  !runtimeHandoffGenerator.includes("loadTemplateImportConfirmation(") ||
  !runtimeHandoffGenerator.includes("inspectTemplateRuntimeSupport(") ||
  !runtimeHandoffGenerator.includes(
    'from "@sleinity/template-browser/importer";',
  )
) {
  throw new Error(
    "Generated runtime handoff must return confirmation to the host and reopen it in a fresh session.",
  );
}

const workflow = await readFile(
  path.join(root, ".github", "workflows", "release.yml"),
  "utf8",
);
const publishStart = workflow.indexOf("\n  publish:");
const handoffStart = workflow.indexOf("\n  handoff:");
if (publishStart < 0 || handoffStart <= publishStart) {
  throw new Error("Release workflow must have distinct publish and handoff jobs.");
}
const publishJob = workflow.slice(publishStart, handoffStart);
const handoffJob = workflow.slice(handoffStart);
if (
  !publishJob.includes(
    "if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/sdk-v')",
  ) ||
  !publishJob.includes("pnpm release")
) {
  throw new Error(
    "Only an sdk-v tag push may own the package publication command.",
  );
}
if (
  handoffJob.includes("pnpm release") ||
  !handoffJob.includes("github.event_name == 'workflow_dispatch'") ||
  !handoffJob.includes("inputs.prepare_runtime_handoff == true")
) {
  throw new Error(
    "Manual handoff refresh must never enter package publication.",
  );
}
for (const required of [
  "npm pack",
  "create-runtime-release-handoff.mjs",
  "create-core-release-handoff.mjs",
  "verify-runtime-release-consumer.mjs",
  "verify-template-editor-reference.mjs",
  "SDK-CORE-HANDOFF.md",
  "SDK-RUNTIME-HANDOFF.md",
  "LOVABLE-TEMPLATE-EDITOR-PROMPTS.md",
  "SDK_RELEASE_VISIBILITY",
  "SDK_LICENSE_POLICY",
  "SDK_AUTHORIZED_USE",
]) {
  if (!handoffJob.includes(required)) {
    throw new Error(`Release handoff job is missing ${required}.`);
  }
}

const distribution = await loadRuntimeDistribution(root);
if (
  distribution.releaseVisibility !== "public" ||
  distribution.licensePolicy !== "sleinity-tools-only" ||
  distribution.authorizedUse !== "Sleinity-owned applications"
) {
  throw new Error("Release distribution policy is not explicit.");
}
const version = await resolveFixedRuntimeVersion(root);
const apiContract = JSON.parse(
  await readFile(path.join(root, "config", "sdk-public-api.json"), "utf8"),
);
if (
  apiContract.schemaVersion !== "template-sdk-public-api-contract-v1" ||
  apiContract.sdkVersion !== version
) {
  throw new Error("The committed SDK public API contract is missing or stale.");
}
for (const item of await loadRuntimePackageDefinitions(root)) {
  const manifest = JSON.parse(
    await readFile(
      path.join(root, "packages", item.directory, "package.json"),
      "utf8",
    ),
  );
  if (
    manifest.version !== version ||
    manifest.publishConfig?.registry !== "https://npm.pkg.github.com" ||
    manifest.scripts?.prepack !== "pnpm run build"
  ) {
    throw new Error(
      `${item.name} does not satisfy the fixed-version registry/prepack contract.`,
    );
  }
  const contractPackage = apiContract.packages?.find(
    (candidate) => candidate.name === item.name,
  );
  const manifestExports = Object.keys(manifest.exports ?? {}).sort();
  const contractExports = (contractPackage?.entries ?? [])
    .map((entry) => entry.path)
    .sort();
  if (
    contractPackage?.version !== version ||
    JSON.stringify(manifestExports) !== JSON.stringify(contractExports)
  ) {
    throw new Error(`${item.name} export paths differ from the API contract.`);
  }
}

console.log(
  `SDK ${version} release contract passed: tag-only publication, manual handoff-only refresh, public Sleinity-tools-only assets.`,
);

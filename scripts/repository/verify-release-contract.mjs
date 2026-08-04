import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  loadRuntimeDistribution,
  loadRuntimePackageDefinitions,
  resolveFixedRuntimeVersion,
} from "./sdk-runtime-manifest.mjs";
import { loadSdkEntryPointInventory } from "./sdk-entry-points.mjs";

const root = process.cwd();
const retiredActivePaths = [
  "docs/sdk/BAS_NARROWCASTING_LOVABLE_PROMPTS.md",
  "docs/sdk/FIRST_HOST_ACCEPTANCE.md",
  "docs/sdk/LOVABLE_TEMPLATE_EDITOR_PROMPTS.md",
  "scripts/repository/create-sdk-release-candidate.mjs",
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
  "config/sdk-entry-points.json",
  "config/sdk-bundle-baselines.json",
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
  "scripts/repository/create-sdk-local-release-verification.mjs",
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

const agentPrompts = await readFile(
  path.join(root, "docs", "sdk", "AGENT_INTEGRATION_PROMPTS.md"),
  "utf8",
);
if (
  !agentPrompts.includes("core-only ZIP import and validation") ||
  !agentPrompts.includes("createTemplateImportWizard") ||
  !agentPrompts.includes("TemplateImportWizard") ||
  !agentPrompts.includes("TemplateSessionViewport") ||
  !agentPrompts.includes("loadTemplateImportConfirmation") ||
  !agentPrompts.includes("renderer-internal")
) {
  throw new Error(
    "Agent prompts must cover core, headless and React lifecycle contracts.",
  );
}
const lovableMigration = await readFile(
  path.join(root, "docs", "sdk", "SDK_0_2_TO_0_7_LOVABLE_HANDOFF.md"),
  "utf8",
);
if (
  !lovableMigration.includes("Upgrade it in place") ||
  !lovableMigration.includes("rollback commit") ||
  !lovableMigration.includes("requiring one-time ZIP re-import") ||
  !lovableMigration.includes("TemplateSessionViewport") ||
  !lovableMigration.includes("renderer-internal")
) {
  throw new Error("The SDK 0.2 Lovable handoff is incomplete.");
}
const runtimeHandoff = await readFile(
  path.join(root, "docs", "sdk", "RUNTIME_HANDOFF.md"),
  "utf8",
);
if (
  !runtimeHandoff.includes("they are not supported host APIs") ||
  !runtimeHandoff.includes("Focused and advanced entries") ||
  !runtimeHandoff.includes("@sleinity/template-react/inspection")
) {
  throw new Error("Runtime handoff must exclude renderer-internal entries from host use.");
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
    'from "@sleinity/template-react/editor";',
  ) ||
  !runtimeHandoffGenerator.includes("TemplateSessionViewport") ||
  !runtimeHandoffGenerator.includes("useTemplateSessionEditableFields") ||
  !runtimeHandoffGenerator.includes("useTemplateSessionDiagnosticSummary") ||
  !runtimeHandoffGenerator.includes(
    'from "@sleinity/template-browser/importer";',
  ) ||
  !runtimeHandoffGenerator.includes("Focused and advanced entries") ||
  !runtimeHandoffGenerator.includes("SDK-CAPABILITIES.md") ||
  !runtimeHandoffGenerator.includes("must never import those internal entries")
) {
  throw new Error(
    "Generated runtime handoff must return confirmation to the host and reopen it in a fresh session.",
  );
}

const localVerificationGenerator = await readFile(
  path.join(
    root,
    "scripts",
    "repository",
    "create-sdk-local-release-verification.mjs",
  ),
  "utf8",
);
for (const required of [
  "SDK-INSTALLATION.md",
  "SDK-CAPABILITIES.md",
  "AGENT-INTEGRATION-PROMPTS.md",
  "SDK-0.2-TO-0.7-LOVABLE-HANDOFF.md",
  "SDK-0.7-MIGRATION.md",
  "LOCAL-RELEASE-VERIFICATION.md",
]) {
  if (!localVerificationGenerator.includes(required)) {
    throw new Error(`Local release verification is missing ${required}.`);
  }
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
  "SDK-INSTALLATION.md",
  "SDK-CAPABILITIES.md",
  "AGENT-INTEGRATION-PROMPTS.md",
  "SDK-0.2-TO-0.7-LOVABLE-HANDOFF.md",
  "SDK-0.7-MIGRATION.md",
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

const capabilityCatalog = await readFile(
  path.join(root, "docs", "sdk", "SDK_CAPABILITIES.md"),
  "utf8",
);
const catalogStart = "<!-- sdk-capability-entry-points:start -->";
const catalogEnd = "<!-- sdk-capability-entry-points:end -->";
const catalogStartIndex = capabilityCatalog.indexOf(catalogStart);
const catalogEndIndex = capabilityCatalog.indexOf(catalogEnd);
if (catalogStartIndex < 0 || catalogEndIndex <= catalogStartIndex) {
  throw new Error("The SDK capability catalog checked inventory is missing.");
}
const catalogInventory = capabilityCatalog.slice(
  catalogStartIndex + catalogStart.length,
  catalogEndIndex,
);
const catalogRows = new Map();
const catalogRowPattern =
  /^\| (?:core|browser|react) \| `([^`]+)` \| `([^`]+)` \| (.+) \|$/gmu;
for (const match of catalogInventory.matchAll(catalogRowPattern)) {
  const [, entryPath, classification, representativeExports] = match;
  if (catalogRows.has(entryPath)) {
    throw new Error(`Duplicate SDK capability catalog entry: ${entryPath}.`);
  }
  catalogRows.set(entryPath, { classification, representativeExports });
}

const entryPointInventory = await loadSdkEntryPointInventory(root);
const expectedCatalogEntries = new Map();
for (const packageValue of entryPointInventory.packages) {
  const contractPackage = apiContract.packages.find(
    (candidate) => candidate.name === packageValue.name,
  );
  for (const entry of packageValue.entries) {
    const publicPath = entry.path === "."
      ? packageValue.name
      : `${packageValue.name}/${entry.path.slice(2)}`;
    expectedCatalogEntries.set(publicPath, entry);
    const row = catalogRows.get(publicPath);
    if (!row || row.classification !== entry.classification) {
      throw new Error(
        `SDK capability catalog classification is missing or stale for ${publicPath}.`,
      );
    }
    if (entry.classification === "sdk-internal") {
      if (!row.representativeExports.includes("Prohibited for host applications")) {
        throw new Error(`Internal SDK entry is not prohibited: ${publicPath}.`);
      }
      continue;
    }
    const contractEntry = contractPackage?.entries?.find(
      (candidate) => candidate.path === entry.path,
    );
    const namedSymbols = [...row.representativeExports.matchAll(/`([^`]+)`/gu)]
      .map((symbolMatch) => symbolMatch[1]);
    if (entry.path !== "./importer.css" && namedSymbols.length === 0) {
      throw new Error(`SDK capability catalog needs a named API for ${publicPath}.`);
    }
    for (const symbol of namedSymbols) {
      if (!contractEntry?.symbols?.includes(symbol)) {
        throw new Error(
          `SDK capability catalog names missing API ${symbol} from ${publicPath}.`,
        );
      }
    }
  }
}
for (const catalogPath of catalogRows.keys()) {
  if (!expectedCatalogEntries.has(catalogPath)) {
    throw new Error(`SDK capability catalog contains unknown entry: ${catalogPath}.`);
  }
}
if (catalogRows.size !== expectedCatalogEntries.size) {
  throw new Error("SDK capability catalog does not cover every SDK entry point.");
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
  const internalExports = new Set(manifest.sdkInternalExports ?? []);
  const manifestExports = Object.keys(manifest.exports ?? {})
    .filter((entry) => !internalExports.has(entry))
    .sort();
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

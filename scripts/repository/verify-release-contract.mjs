import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  loadRuntimeDistribution,
  loadRuntimePackageDefinitions,
  resolveFixedRuntimeVersion,
} from "./sdk-runtime-manifest.mjs";

const root = process.cwd();
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
  "verify-narrowcasting-reference.mjs",
  "SDK_RELEASE_VISIBILITY",
  "SDK_LICENSE_POLICY",
]) {
  if (!handoffJob.includes(required)) {
    throw new Error(`Release handoff job is missing ${required}.`);
  }
}

const distribution = await loadRuntimeDistribution(root);
if (
  distribution.releaseVisibility !== "public" ||
  distribution.licensePolicy !== "authorized-pilot-only"
) {
  throw new Error("Release distribution policy is not explicit.");
}
const version = await resolveFixedRuntimeVersion(root);
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
}

console.log(
  `SDK ${version} release contract passed: tag-only publication, manual handoff-only refresh, public authorized pilot assets.`,
);

import { cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  loadRuntimePackageDefinitions,
  resolveFixedRuntimeVersion,
} from "./sdk-runtime-manifest.mjs";

const root = process.cwd();
const version = await resolveFixedRuntimeVersion(root);
const runId = new Date().toISOString().replaceAll(/[:.]/gu, "-");
const requestedOutput = process.argv[2] ??
  path.join("release-verification-artifacts", `sdk-v${version}-${runId}`);
const output = path.resolve(root, requestedOutput);
const packages = await loadRuntimePackageDefinitions(root);
const pnpmExecutable = process.env.TEMPLATE_PNPM_EXECUTABLE ?? "pnpm";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`,
    );
  }
}

await mkdir(path.dirname(output), { recursive: true });
await mkdir(output, { recursive: false });
for (const packageValue of packages) {
  run(pnpmExecutable, ["pack", "--pack-destination", output], {
    cwd: path.join(root, "packages", packageValue.directory),
  });
}
run(process.execPath, [
  path.join(root, "scripts/repository/create-runtime-release-handoff.mjs"),
  output,
  output,
]);
run(process.execPath, [
  path.join(root, "scripts/repository/create-core-release-handoff.mjs"),
  path.join(output, `sleinity-template-core-${version}.tgz`),
  output,
]);
await Promise.all([
  cp(
    path.join(root, "docs/sdk/SDK_0_7_MIGRATION.md"),
    path.join(output, "SDK-0.7-MIGRATION.md"),
  ),
  cp(
    path.join(root, "docs/sdk/INSTALLATION.md"),
    path.join(output, "SDK-INSTALLATION.md"),
  ),
  cp(
    path.join(root, "docs/sdk/SDK_CAPABILITIES.md"),
    path.join(output, "SDK-CAPABILITIES.md"),
  ),
  cp(
    path.join(root, "docs/sdk/AGENT_INTEGRATION_PROMPTS.md"),
    path.join(output, "AGENT-INTEGRATION-PROMPTS.md"),
  ),
  cp(
    path.join(root, "docs/sdk/SDK_0_2_TO_0_7_LOVABLE_HANDOFF.md"),
    path.join(output, "SDK-0.2-TO-0.7-LOVABLE-HANDOFF.md"),
  ),
]);
await writeFile(
  path.join(output, "LOCAL-RELEASE-VERIFICATION.md"),
  `# SDK ${version} local release verification\n\n` +
    `These locally packed archives verify the source tree before publication. ` +
    `They are not public delivery artifacts. The sdk-v${version} tag workflow ` +
    `publishes the fixed train and creates the final handoff only from archives ` +
    `downloaded back from GitHub Packages.\n`,
);
console.log(`Created SDK ${version} local release verification at ${output}.`);

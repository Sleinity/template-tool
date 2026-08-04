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
  path.join("release-candidate-artifacts", `sdk-v${version}-rc-${runId}`);
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
    path.join(root, "docs/sdk/LOVABLE_TEMPLATE_EDITOR_PROMPTS.md"),
    path.join(output, "LOVABLE-TEMPLATE-EDITOR-PROMPTS.md"),
  ),
  cp(
    path.join(root, "docs/sdk/FIRST_HOST_ACCEPTANCE.md"),
    path.join(output, "FIRST-HOST-ACCEPTANCE.md"),
  ),
]);
await writeFile(
  path.join(output, "RELEASE-CANDIDATE.md"),
  `# SDK ${version} release candidate\n\n` +
    `These locally packed archives are for the bounded first-host acceptance ` +
    `trial only. They are not the published GitHub Release. After acceptance, ` +
    `the sdk-v${version} tag workflow publishes the fixed train and regenerates ` +
    `the final handoff from registry-derived archives.\n`,
);
console.log(`Created SDK ${version} release candidate at ${output}.`);

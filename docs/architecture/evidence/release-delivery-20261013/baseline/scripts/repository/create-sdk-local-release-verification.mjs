import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  loadRuntimePackageDefinitions,
  resolveFixedRuntimeVersion,
  runtimeArchiveName,
} from "./sdk-runtime-manifest.mjs";
import { candidateManifestName, fileIdentity, sourceIdentity, validateCandidateManifest } from "./local-sdk-candidate.mjs";
import { loadManifest, verifyFixture } from "../fidelity/core.mjs";
import { selectSdkGateFixtures } from "../fidelity/gate-profile.mjs";
import { loadExactFontManifest } from "../fidelity/fonts.mjs";

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
// Build before consumers inspect distribution files; pack/prepack remains sequential.
run(pnpmExecutable, ["packages:build"]);
const source = await sourceIdentity(root);
const fixtureManifest = loadManifest();
const fixtures = selectSdkGateFixtures(fixtureManifest);
for (const fixture of fixtures) verifyFixture(fixtureManifest, fixture);
const fonts = loadExactFontManifest(fixtures.flatMap(item => item.requiredFonts ?? [])).fonts;
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
    path.join(root, "docs/sdk/SDK_0_8_MIGRATION.md"),
    path.join(output, "SDK-0.8-MIGRATION.md"),
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
  cp(path.join(root, "docs/sdk/V2_INTEGRATION.md"), path.join(output, "SDK-V2-INTEGRATION.md")),
  cp(path.join(root, "docs/sdk/RELEASE_PREPARATION.md"), path.join(output, "SDK-RELEASE-PREPARATION.md")),
  cp(path.join(root, "docs/field-rules/BROWSER_SESSION.md"), path.join(output, "FIELD-RULES-BROWSER-SESSION.md")),
  cp(path.join(root, "docs/field-rules/STUDIO_AND_HOSTS.md"), path.join(output, "FIELD-RULES-STUDIO-AND-HOSTS.md")),
  cp(path.join(root, "docs/architecture/template-recovery.md"), path.join(output, "TEMPLATE-RECOVERY.md")),
]);
const bundledLinks = {
  "V2_INTEGRATION.md": "SDK-V2-INTEGRATION.md", "RELEASE_PREPARATION.md": "SDK-RELEASE-PREPARATION.md",
  "INSTALLATION.md": "SDK-INSTALLATION.md", "SDK_CAPABILITIES.md": "SDK-CAPABILITIES.md",
  "SDK_0_8_MIGRATION.md": "SDK-0.8-MIGRATION.md", "AGENT_INTEGRATION_PROMPTS.md": "AGENT-INTEGRATION-PROMPTS.md",
  "../field-rules/BROWSER_SESSION.md": "FIELD-RULES-BROWSER-SESSION.md",
  "../field-rules/STUDIO_AND_HOSTS.md": "FIELD-RULES-STUDIO-AND-HOSTS.md",
  "../architecture/template-recovery.md": "TEMPLATE-RECOVERY.md",
};
for (const file of ["SDK-V2-INTEGRATION.md", "SDK-INSTALLATION.md", "SDK-CAPABILITIES.md", "AGENT-INTEGRATION-PROMPTS.md"]) {
  let document = await readFile(path.join(output, file), "utf8");
  for (const [before, after] of Object.entries(bundledLinks)) document = document.replaceAll(`](${before})`, `](${after})`);
  await writeFile(path.join(output, file), document);
}
const candidateId = `unpublished-${version}-${source.filesSha256}`;
await writeFile(
  path.join(output, "LOCAL-RELEASE-VERIFICATION.md"),
  `# SDK ${version} unpublished local candidate\n\nCandidate: \`${candidateId}\`\n\n` +
    `These locally packed archives verify the source tree before publication. ` +
    `They are not public delivery artifacts and packing alone is not certification. ` +
    `Do not use the existing sdk-v${version} tag or mix these archives with published ` +
    `archives of the same version. Read SDK-V2-INTEGRATION.md first.\n\n` +
    `Version selection, tagging and publication require a separate release step. ` +
    `The publication workflow derives its final handoff from archives downloaded ` +
    `back from GitHub Packages. SDK-0.8-MIGRATION.md is historical.\n`,
);
for (const file of ["SDK-RUNTIME-HANDOFF.md", "SDK-CORE-HANDOFF.md"]) {
  const previous = await readFile(path.join(output, file), "utf8");
  await writeFile(path.join(output, file), `> Unpublished source candidate: ${candidateId}. Start with SDK-V2-INTEGRATION.md.\n> Published-version examples below are retained compatibility guidance, not the current V2 recommendation.\n\n${previous}`);
}
const archives = [];
for (const item of packages) {
  const manifest = JSON.parse(await readFile(path.join(root, "packages", item.directory, "package.json"), "utf8"));
  archives.push({ ...await fileIdentity(output, runtimeArchiveName(item, version)), name: item.name, version,
    dependencies: manifest.dependencies ?? {}, peerDependencies: manifest.peerDependencies ?? {},
    supportedEntries: Object.keys(manifest.exports).filter(entry => !manifest.sdkInternalExports?.includes(entry)),
    restrictedEntries: manifest.sdkInternalExports ?? [] });
}
const documentNames = ["SDK-INSTALLATION.md", "SDK-CAPABILITIES.md", "AGENT-INTEGRATION-PROMPTS.md", "SDK-0.8-MIGRATION.md", "SDK-V2-INTEGRATION.md", "SDK-RELEASE-PREPARATION.md", "FIELD-RULES-BROWSER-SESSION.md", "FIELD-RULES-STUDIO-AND-HOSTS.md", "TEMPLATE-RECOVERY.md", "LOCAL-RELEASE-VERIFICATION.md", "SDK-RUNTIME-HANDOFF.md", "SDK-CORE-HANDOFF.md", "SHA256SUMS", "CORE-SHA256SUMS"];
const manifest = validateCandidateManifest({ schemaVersion: "local-sdk-candidate-v1", candidateId, version, published: false,
  certification: "not-yet-verified", createdAt: new Date().toISOString(), source,
  environment: { node: process.version, platform: process.platform, arch: process.arch,
    packageManager: spawnSync(pnpmExecutable, ["--version"], { encoding: "utf8" }).stdout.trim() },
  archives, documents: await Promise.all(documentNames.map(file => fileIdentity(output, file))),
  fixtures: fixtures.map(item => ({ id: item.id, zipSha256: item.zipSha256, templateJsonSha256: item.templateJsonSha256, embeddedPreviewSha256: item.embeddedPreview.sha256 })),
  fonts: fonts.map(({ id, sha256, byteSize, family, style, weight }) => ({ id, sha256, byteSize, family, style, weight })),
}, packages, version);
await writeFile(path.join(output, candidateManifestName), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Created SDK ${version} local release verification at ${output}.`);

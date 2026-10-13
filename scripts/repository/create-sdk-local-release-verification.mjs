import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  loadRuntimePackageDefinitions,
  resolveFixedRuntimeVersion,
  runtimeArchiveName,
} from "./sdk-runtime-manifest.mjs";
import { candidateManifestName, fileIdentity, sourceIdentity, validateCandidateManifest } from "./local-sdk-candidate.mjs";
import { generateDeliveryBundle, deliveryManifestName } from "../release-delivery/bundle.mjs";
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
for (const packageValue of packages) run(pnpmExecutable, ["--filter", packageValue.name, "build"]);
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
const delivery = await generateDeliveryBundle({ archivesDirectory: output, outputDirectory: output,
  root, version, mode: "local", provenance: "local-pack" });
const candidateId = `unpublished-${version}-${source.filesSha256}`;
const archives = [];
for (const item of packages) {
  const manifest = JSON.parse(await readFile(path.join(root, "packages", item.directory, "package.json"), "utf8"));
  archives.push({ ...await fileIdentity(output, runtimeArchiveName(item, version)), name: item.name, version,
    dependencies: manifest.dependencies ?? {}, peerDependencies: manifest.peerDependencies ?? {},
    supportedEntries: Object.keys(manifest.exports).filter(entry => !manifest.sdkInternalExports?.includes(entry)),
    restrictedEntries: manifest.sdkInternalExports ?? [] });
}
const documentNames = [...delivery.files.map(item => item.file), deliveryManifestName];
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

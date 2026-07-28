import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  loadRuntimeDistribution,
  loadRuntimePackageDefinitions,
  resolveFixedRuntimeVersion,
  runtimeArchiveName,
} from "./sdk-runtime-manifest.mjs";

const [archivesArgument, outputArgument] = process.argv.slice(2);
if (!archivesArgument || !outputArgument) {
  throw new Error(
    "Usage: node create-runtime-release-handoff.mjs ARCHIVES_DIRECTORY OUTPUT_DIRECTORY",
  );
}

const version =
  process.env.TEMPLATE_RUNTIME_RELEASE_VERSION ??
  await resolveFixedRuntimeVersion();
const archivesDirectory = path.resolve(archivesArgument);
const outputDirectory = path.resolve(outputArgument);
const distribution = await loadRuntimeDistribution();
const releaseUrl = `${distribution.repositoryUrl}/releases/tag/sdk-v${version}`;
const releaseDownloadUrl =
  `${distribution.repositoryUrl}/releases/download/sdk-v${version}`;
const packages = (await loadRuntimePackageDefinitions()).map((item) => ({
  ...item,
  archive: runtimeArchiveName(item, version),
}));

const packageEvidence = [];
for (const packageValue of packages) {
  const archivePath = path.join(archivesDirectory, packageValue.archive);
  const bytes = await readFile(archivePath);
  packageEvidence.push({
    ...packageValue,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sizeBytes: bytes.byteLength,
  });
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(
  path.join(outputDirectory, "SHA256SUMS"),
  packageEvidence
    .map((item) => `${item.sha256}  ${item.archive}`)
    .join("\n") + "\n",
);

const checksumRows = packageEvidence
  .map(
    (item) =>
      `| \`${item.name}\` | [\`${item.archive}\`](${releaseDownloadUrl}/${item.archive}) | \`${item.sha256}\` | ${item.sizeBytes.toLocaleString("en-US")} |`,
  )
  .join("\n");
const dependencyRows = packageEvidence
  .map(
    (item) =>
      `    "${item.name}": "file:vendor/${item.archive}"`,
  )
  .join(",\n");
const overrideRows = packageEvidence
  .map(
    (item) =>
      `  "${item.name}": "file:vendor/${item.archive}"`,
  )
  .join("\n");
const roleRows = packageEvidence
  .map((item) => `- \`${item.name}\`: ${item.role}.`)
  .join("\n");

await writeFile(
  path.join(outputDirectory, "BAS-RUNTIME-HANDOFF.md"),
  `# Template Platform ${version} — Lovable Business runtime handoff

This handoff lets a private Lovable Business repository import, edit, render,
save, restore, and export TemplatePackage ZIPs without a private-registry
secret. The screen/player consumes only Bas's exported media and does not need
these SDK packages.

The [source repository](${distribution.repositoryUrl}) and
[GitHub Release](${releaseUrl}) are ${distribution.releaseVisibility}, so
downloading the release assets requires no GitHub token. The package manifests
remain \`UNLICENSED\`; policy \`${distribution.licensePolicy}\` authorizes
${distribution.authorizedConsumer} and is not a general reuse license.

## Verified published archives

| Package | Archive | SHA-256 | Bytes |
| --- | --- | --- | ---: |
${checksumRows}

Verify all archives from the same directory:

\`\`\`sh
shasum -a 256 -c SHA256SUMS
\`\`\`

## Runtime ownership

${roleRows}

The consumer must install every vendored archive listed above at the root so
npm resolves the private dependency closure without contacting GitHub
Packages. Package manifests retain the internal dependency order.

React 19 and React DOM 19 are required peer dependencies of
\`@sleinity/template-react\`.

## Lovable Business installation

Commit the verified archives under \`vendor/\`, then add:

\`\`\`json
{
  "dependencies": {
${dependencyRows}
  }
}
\`\`\`

Run the repository's package manager and commit its lockfile. Do not add a
GitHub Packages \`.npmrc\`, \`NODE_AUTH_TOKEN\`, a GitHub PAT, or another
registry secret to the Lovable repository.

For pnpm consumers, also map the private transitive dependency closure to the
vendored archives in \`pnpm-workspace.yaml\`:

\`\`\`yaml
overrides:
${overrideRows}
\`\`\`

## Supported application contract

\`\`\`tsx
import {
  TemplateSessionProvider,
  TemplateSessionRenderer,
  useTemplateSession,
} from "@sleinity/template-react";

export function TemplateWorkspace() {
  const session = useTemplateSession();
  return (
    <TemplateSessionProvider session={session}>
      <TemplateSessionRenderer mode="editor" />
    </TemplateSessionProvider>
  );
}
\`\`\`

Use \`session.loadZip()\` for import, \`session.setField()\` and the image
mutation methods for editing, \`session.save()\` / \`loadSavedTemplate()\` for
browser-local persistence, and the renderer handle's \`exportPng()\` only when
the current render identity is ready.

Blocked imports publish structured diagnostics directly through the session
snapshot. Consumers do not need to parse a ZIP twice.

The PNG result contains \`filename\`, \`pngDataUrl\`, dimensions, readiness,
and diagnostics. Use \`exportPng({ download: false })\` when Bas will pass that
result into his existing media upload, campaign, scheduling, and playback
contracts.

## Acceptance

- A valid ZIP reaches a ready render identity.
- An invalid ZIP produces structured diagnostics.
- A field edit invalidates the previous export identity.
- Save/reload restores the edited package from browser storage while offline.
- PNG export uses the current ready revision.
- Import, render, persistence, and export make no external runtime requests.
- The Lovable build succeeds without GitHub credentials.

Follow \`BAS-NARROWCASTING-LOVABLE-PROMPTS.md\` one prompt at a time for the
repository-specific implementation.
`,
);

for (const item of packageEvidence) {
  console.log(
    `${item.archive} sha256=${item.sha256} bytes=${item.sizeBytes}`,
  );
}

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [archivesArgument, outputArgument] = process.argv.slice(2);
if (!archivesArgument || !outputArgument) {
  throw new Error(
    "Usage: node create-runtime-release-handoff.mjs ARCHIVES_DIRECTORY OUTPUT_DIRECTORY",
  );
}

const version = process.env.TEMPLATE_RUNTIME_RELEASE_VERSION ?? "0.2.0";
const archivesDirectory = path.resolve(archivesArgument);
const outputDirectory = path.resolve(outputArgument);
const packages = [
  {
    name: "@sleinity/template-core",
    archive: `sleinity-template-core-${version}.tgz`,
    role: "ZIP import, validation, portable fields, and package models",
  },
  {
    name: "@sleinity/template-browser",
    archive: `sleinity-template-browser-${version}.tgz`,
    role: "Browser session, assets, fonts, persistence, readiness, and PNG export",
  },
  {
    name: "@sleinity/template-react",
    archive: `sleinity-template-react-${version}.tgz`,
    role: "React provider, renderer, inspection viewport, and export handle",
  },
];

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
      `| \`${item.name}\` | \`${item.archive}\` | \`${item.sha256}\` | ${item.sizeBytes.toLocaleString("en-US")} |`,
  )
  .join("\n");
const dependencyRows = packageEvidence
  .map(
    (item) =>
      `    "${item.name}": "file:vendor/${item.archive}"`,
  )
  .join(",\n");
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

\`template-react\` depends on \`template-browser\` and \`template-core\`.
\`template-browser\` depends on \`template-core\`. The consumer must install all
three vendored archives at the root so npm resolves the private dependency
closure without contacting GitHub Packages.

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
  "@sleinity/template-core": "file:vendor/sleinity-template-core-${version}.tgz"
  "@sleinity/template-browser": "file:vendor/sleinity-template-browser-${version}.tgz"
  "@sleinity/template-react": "file:vendor/sleinity-template-react-${version}.tgz"
\`\`\`

## Supported application contract

\`\`\`tsx
import { useState } from "react";
import { createTemplateSession } from "@sleinity/template-browser";
import {
  TemplateSessionProvider,
  TemplateSessionRenderer,
} from "@sleinity/template-react";

export function TemplateWorkspace() {
  const [session] = useState(() => createTemplateSession());
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

For immutable 0.2.0 consumers, first call
\`importTemplatePackage(bytes, filename)\` from \`template-core\`. Show its
source diagnostics when the result is not importable and pass the same bytes
to \`session.loadZip()\` only after that preflight succeeds.

The PNG result contains \`filename\`, \`pngDataUrl\`, dimensions, readiness,
and diagnostics. Bas owns converting that result into his existing media
upload, campaign, scheduling, and playback contracts.

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

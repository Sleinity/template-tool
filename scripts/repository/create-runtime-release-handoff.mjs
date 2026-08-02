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
  path.join(outputDirectory, "SDK-RUNTIME-HANDOFF.md"),
  `# Template Platform ${version} — runtime handoff

This handoff lets a React/TypeScript application import, validate, edit, render,
save, restore, and export TemplatePackage ZIPs. The SDK owns template behavior;
the host owns product navigation, authentication, catalogues, collaboration,
cloud storage, publishing, and other application workflows.

The [source repository](${distribution.repositoryUrl}) and
[GitHub Release](${releaseUrl}) are ${distribution.releaseVisibility}, so
downloading the release assets requires no GitHub token. The package manifests
remain \`UNLICENSED\`; policy \`${distribution.licensePolicy}\` authorizes
${distribution.authorizedUse} and is not a general reuse license.

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

Entries named \`renderer-internal\` are unsupported fixed-train repository
seams. Host applications must use only the documented root and curated entry
points and must never import those internal entries.

## Vendored installation

Commit the verified archives under \`vendor/\`, then add:

\`\`\`json
{
  "dependencies": {
${dependencyRows}
  }
}
\`\`\`

Run the repository's package manager and commit its lockfile. A vendored
consumer does not need a GitHub Packages \`.npmrc\`, \`NODE_AUTH_TOKEN\`, a
GitHub PAT, or another registry secret.

For pnpm consumers, also map the private transitive dependency closure to the
vendored archives in \`pnpm-workspace.yaml\`:

\`\`\`yaml
overrides:
${overrideRows}
\`\`\`

## Focused and advanced entries

Ordinary hosts use the existing root, session, importer, compatibility, and
React contracts. Focused integrations may additionally import core
\`editor\`/\`assets\`/\`fonts\`/\`motion\`, browser
\`assets\`/\`fonts\`/\`persistence\`/\`capture\`/\`enrichment\`, and advanced
core or React \`inspection\` entries. Inspection is optional evidence and does
not select rendering authority. Studio-only debug components, stress reports,
visual-difference tooling, issue packets, and development harnesses are not SDK
APIs.

## Supported application contract

\`\`\`tsx
import { useEffect } from "react";
import type {
  TemplateImportConfirmationV1,
} from "@sleinity/template-browser/importer";
import {
  inspectTemplateRuntimeSupport,
  loadTemplateImportConfirmation,
} from "@sleinity/template-browser/compatibility";
import {
  TemplateSessionProvider,
  TemplateSessionRenderer,
  useTemplateSession,
} from "@sleinity/template-react";
import {
  TemplateImportWizard,
  useTemplateImportWizard,
} from "@sleinity/template-react/importer";
import "@sleinity/template-react/importer.css";

export function AddTemplate({
  onConfirmed,
}: {
  onConfirmed(result: TemplateImportConfirmationV1): void;
}) {
  const wizard = useTemplateImportWizard();
  useEffect(() => {
    void inspectTemplateRuntimeSupport().then((report) => {
      if (report.status === "blocked") {
        console.error("Template runtime unavailable", report.issues);
      }
    });
  }, []);
  return (
    <TemplateImportWizard
      wizard={wizard}
      onComplete={(result) => {
        onConfirmed(result);
        // The host returns to its own dashboard.
      }}
    />
  );
}

export function ConfirmedTemplateEditor({
  record,
}: {
  record: TemplateImportConfirmationV1;
}) {
  const session = useTemplateSession();
  useEffect(() => {
    void loadTemplateImportConfirmation(session, record).then((result) => {
      if (!result.applied) {
        throw new Error(
          result.inspection.issues[0]?.message ?? "Template rejected.",
        );
      }
    });
  }, [record, session]);

  return (
    <TemplateSessionProvider session={session}>
      <TemplateSessionRenderer mode="editor" />
    </TemplateSessionProvider>
  );
}
\`\`\`

The seven-step wizard provides ZIP import, structured package validation,
exact-font preparation, render validation, diagnostics, field-rule setup and
current-revision confirmation. Its controller/provider/hooks can also power a
custom page, modal, drawer or workspace UI. It does not publish or navigate;
post-confirmation persistence runs only when the host provides an adapter.

The wizard session is setup-owned. Store the immutable confirmation only after
explicit confirmation, return to host navigation, and create a fresh
\`useTemplateSession()\` when the user selects that template. Reopen it with
\`loadTemplateImportConfirmation()\`; the SDK verifies confirmation integrity,
clones and revalidates both packages through \`loadTemplateState()\`, rebuilds
resolved/editable state, and publishes a fresh revision. Run
\`inspectTemplateRuntimeSupport()\` before exposing template workflows so
restricted browser or CSP environments fail with stable structured codes.

The host owns forms, croppers, transformations, AI features, and other content
workflows. Read \`snapshot.editableFields\` and deliver final supported values
through \`session.setField()\`, \`session.replaceImage()\`,
\`session.setImageReplacementMode()\`, reset, and restore. Template constraints
remain the minimum safety and fidelity authority.

Use \`session.save()\` / \`loadSavedTemplate()\` for browser-local persistence,
and the renderer handle's \`exportPng()\` only when the current render identity
is ready.

Blocked imports publish structured diagnostics directly through the session
snapshot. Consumers do not need to parse a ZIP twice.

The PNG result contains \`filename\`, \`pngDataUrl\`, dimensions, readiness,
and diagnostics. Use \`exportPng({ download: false })\` when the host consumes
the returned output without initiating a browser download.

## Lovable Business recipe

Lovable Business consumers use the vendored installation above because the
private-registry build secret is unavailable. Follow
\`LOVABLE-TEMPLATE-EDITOR-PROMPTS.md\` one prompt at a time after committing
the checksum-verified archives.

## Acceptance

- A valid ZIP reaches a ready render identity.
- An invalid ZIP produces structured diagnostics.
- Invalid font files are rejected, exact uploaded faces complete the wizard,
  and a verified stored exact face is reused automatically.
- Field-rule edits and image Fill/Fit defaults publish a new session revision.
- Confirmation returns to host state and reopens in a fresh validated session.
- Host-owned controls can preprocess values before supported session mutations.
- A field edit invalidates the previous export identity.
- Save/reload restores the edited package from browser storage while offline.
- PNG export uses the current ready revision.
- Import, render, persistence, and export make no external runtime requests.
- A vendored build succeeds without GitHub credentials.

The committed generic template editor reference is the implementation and
browser-acceptance authority for this release.
`,
);

for (const item of packageEvidence) {
  console.log(
    `${item.archive} sha256=${item.sha256} bytes=${item.sizeBytes}`,
  );
}

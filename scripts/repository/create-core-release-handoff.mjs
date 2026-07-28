import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  loadRuntimeDistribution,
  loadRuntimePackageDefinitions,
  resolveFixedRuntimeVersion,
  runtimeArchiveName,
} from "./sdk-runtime-manifest.mjs";

const [archiveArgument, outputArgument] = process.argv.slice(2);
if (!archiveArgument || !outputArgument) {
  throw new Error(
    "Usage: node create-core-release-handoff.mjs ARCHIVE OUTPUT_DIRECTORY",
  );
}

const archivePath = path.resolve(archiveArgument);
const outputDirectory = path.resolve(outputArgument);
const archiveName = path.basename(archivePath);
const distribution = await loadRuntimeDistribution();
const version =
  process.env.TEMPLATE_CORE_RELEASE_VERSION ??
  await resolveFixedRuntimeVersion();
const corePackage = (await loadRuntimePackageDefinitions()).find(
  (item) => item.name === "@sleinity/template-core",
);
if (!corePackage) throw new Error("The runtime manifest has no template-core package.");
const expectedArchiveName = runtimeArchiveName(corePackage, version);
const releaseUrl =
  `${distribution.repositoryUrl}/releases/tag/sdk-v${version}`;
const archiveUrl =
  `${distribution.repositoryUrl}/releases/download/sdk-v${version}/${expectedArchiveName}`;
if (archiveName !== expectedArchiveName) {
  throw new Error(
    `Expected published archive ${expectedArchiveName}, received ${archiveName}.`,
  );
}

const archive = await readFile(archivePath);
const sha256 = createHash("sha256").update(archive).digest("hex");
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  path.join(outputDirectory, "CORE-SHA256SUMS"),
  `${sha256}  ${archiveName}\n`,
);
await writeFile(
  path.join(outputDirectory, "BAS-LOVABLE-HANDOFF.md"),
  `# Template core ${version} — Lovable Business handoff

- Package: \`@sleinity/template-core\`
- Version: \`${version}\`
- Importer export: \`importTemplatePackage\`
- Archive: \`${archiveName}\`
- Public download: ${archiveUrl}
- SHA-256: \`${sha256}\`
- Lovable secret: none
- Release download token: none

The [source repository](${distribution.repositoryUrl}) and
[GitHub Release](${releaseUrl}) are ${distribution.releaseVisibility}. The
package manifest remains \`UNLICENSED\`; policy
\`${distribution.licensePolicy}\` authorizes
${distribution.authorizedConsumer} and is not a general reuse license.

## Install

1. Verify the archive:

   \`\`\`sh
   shasum -a 256 ${archiveName}
   \`\`\`

2. Commit it to the private Lovable-synced repository as
   \`vendor/${archiveName}\`.
3. Add the dependency:

   \`\`\`json
   {
     "dependencies": {
       "@sleinity/template-core": "file:vendor/${archiveName}"
     }
   }
   \`\`\`

4. Run \`npm install\` and commit the lockfile. Do not add a GitHub Packages
   \`.npmrc\` or token to the Lovable repository.

## Use

\`\`\`ts
import { importTemplatePackage } from "@sleinity/template-core";

export async function importTemplateZip(file: File) {
  const result = importTemplatePackage(await file.arrayBuffer(), file.name);
  if (!result.importable || !result.workingPackage) {
    return {
      ok: false as const,
      diagnostics: result.source.diagnostics,
      validation: result.validation,
    };
  }
  return {
    ok: true as const,
    template: result.workingPackage,
    importedBaseline: result.basePackage,
    source: result.source,
    validation: result.validation,
  };
}
\`\`\`

## Test

- Select a valid TemplatePackage ZIP and require \`ok === true\`.
- Select an invalid ZIP and require \`ok === false\` with source diagnostics.
- Confirm the browser performs no importer-time network requests.

## Optional authenticated registry installation

Outside Lovable Business, configure:

\`\`\`ini
@sleinity:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}
always-auth=true
\`\`\`

Then run \`npm install @sleinity/template-core@${version}\`. The token must be a
GitHub personal access token (classic) with \`read:packages\`, and its user must
have read access to the private package.
`,
);

console.log(`${archiveName} sha256=${sha256}`);

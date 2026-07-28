import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [archiveArgument, outputArgument] = process.argv.slice(2);
if (!archiveArgument || !outputArgument) {
  throw new Error(
    "Usage: node create-core-release-handoff.mjs ARCHIVE OUTPUT_DIRECTORY",
  );
}

const archivePath = path.resolve(archiveArgument);
const outputDirectory = path.resolve(outputArgument);
const archiveName = path.basename(archivePath);
const expectedArchiveName = "sleinity-template-core-0.2.0.tgz";
if (archiveName !== expectedArchiveName) {
  throw new Error(
    `Expected published archive ${expectedArchiveName}, received ${archiveName}.`,
  );
}

const archive = await readFile(archivePath);
const sha256 = createHash("sha256").update(archive).digest("hex");
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  path.join(outputDirectory, "SHA256SUMS"),
  `${sha256}  ${archiveName}\n`,
);
await writeFile(
  path.join(outputDirectory, "BAS-LOVABLE-HANDOFF.md"),
  `# Template core 0.2.0 — Lovable Business handoff

- Package: \`@sleinity/template-core\`
- Version: \`0.2.0\`
- Importer export: \`importTemplatePackage\`
- Archive: \`${archiveName}\`
- SHA-256: \`${sha256}\`
- Lovable secret: none

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

Then run \`npm install @sleinity/template-core@0.2.0\`. The token must be a
GitHub personal access token (classic) with \`read:packages\`, and its user must
have read access to the private package.
`,
);

console.log(`${archiveName} sha256=${sha256}`);

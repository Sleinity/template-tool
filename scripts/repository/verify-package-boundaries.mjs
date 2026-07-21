import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const violations = [];

async function read(relative) {
  return readFile(path.join(root, relative), "utf8");
}

const coreEntry = await read("packages/template-core/src/index.ts");
for (const forbidden of [
  /from\s+["']react(?:-dom)?["']/,
  /from\s+["'][^"']*\/persistence(?:\/|["'])/,
  /from\s+["'][^"']*TemplatePackageRenderer["']/,
  /from\s+["'][^"']*TemplatePackageQualityPanel["']/,
]) {
  if (forbidden.test(coreEntry)) {
    violations.push(`template-core public entry contains forbidden dependency: ${forbidden}`);
  }
}

const reactEntry = await read("packages/template-react/src/index.ts");
for (const studioOnly of ["TemplatePackageQualityPanel", "TemplatePackageFieldEditor", "TemplatePackageImportFlow", "TemplateOverviewPage"]) {
  if (reactEntry.includes(studioOnly)) {
    violations.push(`template-react exports Studio-only UI: ${studioOnly}`);
  }
}

const coreBundlePath = path.join(root, "packages/template-core/dist/index.js");
try {
  await stat(coreBundlePath);
  const coreBundle = await readFile(coreBundlePath, "utf8");
  for (const forbidden of ["from\"react\"", "from'react'", "indexedDB", "localStorage", "document.createElement", "window.addEventListener"]) {
    if (coreBundle.includes(forbidden)) {
      violations.push(`template-core bundle contains browser/UI runtime token: ${forbidden}`);
    }
  }
} catch {
  violations.push("template-core must be built before boundary verification");
}

if (violations.length) {
  console.error(violations.map((item) => `- ${item}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("SDK package boundaries are clean.");
}

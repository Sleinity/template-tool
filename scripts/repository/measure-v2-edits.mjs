/** Test-only instrumentation: no counters or benchmark hooks enter SDK bundles. */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
const output = await mkdtemp(join(tmpdir(), "sdk-edit-measure-"));
try {
  await build({ configFile: false, logLevel: "silent", resolve: { alias: [
    { find: "@sleinity/template-core/family", replacement: resolve("packages/template-core/src/family/index.ts") },
    { find: /^@sleinity\/template-core$/, replacement: resolve("packages/template-core/src/index.ts") },
    { find: "@sleinity/template-browser/session", replacement: resolve("packages/template-browser/src/session/index.ts") },
    { find: "@sleinity/template-browser/importer", replacement: resolve("packages/template-browser/src/importer.ts") },
  ] }, plugins: [{ name: "measure-sdk-work", enforce: "pre", transform(code, id) {
    const names = id.endsWith("/materializeTemplateFieldContentV2.ts") ? ["materializeTemplateFieldContentV2"] : id.endsWith("/validateTemplatePackageV2.ts") ? ["validateTemplatePackageV2"] : [];
    for (const name of names) {
      code = code.replace(`export function ${name}(`, `function measured_${name}(`);
      code += `\nexport function ${name}(...args: Parameters<typeof measured_${name}>) { const start = performance.now(); try { return measured_${name}(...args); } finally { const stats = globalThis.__sdkEditWork; if (stats) { const row = stats[${JSON.stringify(name)}] ??= { calls: 0, ms: 0 }; row.calls++; row.ms += performance.now() - start; } } }\n`;
    }
    if (id.endsWith("/validateTemplatePackageV2.ts")) code = code.replace("const schemaValidator = getSchemaValidator();", "if (globalThis.__sdkEditWork) globalThis.__sdkEditWork.schemaEvaluations++;\n  const schemaValidator = getSchemaValidator();");
    return names.length ? { code, map: null } : null;
  } }], ssr: { noExternal: true }, build: { ssr: resolve("scripts/repository/measure-v2-edits-workload.mjs"), outDir: output, target: "esnext", minify: false } });
  await import(pathToFileURL(join(output, "measure-v2-edits-workload.js")).href);
} finally { await rm(output, { recursive: true, force: true }); }

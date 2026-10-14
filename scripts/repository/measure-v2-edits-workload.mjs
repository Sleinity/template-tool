import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseTemplatePackageV2 } from "@sleinity/template-core";
import { createTemplateSessionV2, createTemplateFieldFamilySessionV2 } from "@sleinity/template-browser/session";
import { buildZipPackageImportResult, createTemplateFieldFamilyFromSourcesV2 } from "@sleinity/template-browser/importer";
const manifest = JSON.parse(await readFile("fidelity/fixtures.json", "utf8"));
const entry = manifest.fixtures.find(item => item.id === "field-rules-boolean-structural-visibility");
const bytes = await readFile(entry.sourcePath.replace("${TEMPLATE_PACKAGE_FIXTURE_DIR}", process.env.TEMPLATE_PACKAGE_FIXTURE_DIR ?? manifest.defaultFixtureDirectory));
const hash = value => createHash("sha256").update(value).digest("hex");
if (hash(bytes) !== entry.zipSha256) throw new Error("Benchmark source hash mismatch.");
const imported = await buildZipPackageImportResult(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), entry.filename, "", undefined, null);
const base = parseTemplatePackageV2(imported.package).package;
base.fontRequirements = [];
const clone = globalThis.structuredClone;
let clones = 0;
globalThis.structuredClone = (...args) => { clones++; return clone(...args); };
const results = [];
try {
  for (const scale of [1, 4]) for (const variants of [1, 5, 20]) {
    const source = clone(base);
    const leaf = Object.values(source.nodes).find(node => node.text && !node.children?.length);
    const originalCount = Object.keys(source.nodes).length;
    // Explicit synthetic static leaf volume; original source field bindings stay untouched.
    for (let index = 0; index < originalCount * (scale - 1); index++) {
      const id = `benchmark-leaf-${index}`;
      source.nodes[id] = { ...clone(leaf), id, parentId: source.rootNodeId };
      source.nodes[source.rootNodeId].children.push(id);
    }
    const session = variants === 1 ? createTemplateSessionV2() : createTemplateFieldFamilySessionV2();
    const family = variants === 1 ? null : createTemplateFieldFamilyFromSourcesV2(Array.from({ length: variants }, () => clone(source)), "Measured family");
    if (family) family.id = "benchmark-family";
    session.load(family ?? source);
    const id = session.getFieldControllers().find(field => field.type === "text").id;
    const edit = index => {
      const result = session.getFieldControllers().find(field => field.id === id).setValue(`Edit ${index}`);
      if (!result.accepted) throw new Error("Measurement edit rejected");
    };
    for (let i = 0; i < 5; i++) edit(i);
    clones = 0; globalThis.__sdkEditWork = { schemaEvaluations: 0 };
    const durations = [];
    for (let i = 0; i < 20; i++) { const start = performance.now(); edit(i + 5); durations.push(performance.now() - start); }
    durations.sort((a, b) => a - b);
    const snapshot = session.getSnapshot();
    results.push({ variants, nodesPerDesign: Object.keys(source.nodes).length, edits: 20, clonesPerEdit: clones / 20, medianMs: +durations[10].toFixed(3), p95Ms: +durations[18].toFixed(3), work: globalThis.__sdkEditWork,
      outputHash: hash(JSON.stringify({ workingPackage: snapshot.workingPackage, content: snapshot.contentState, readiness: snapshot.readiness })) });
    globalThis.__sdkEditWork = null; session.dispose();
  }
} finally { globalThis.structuredClone = clone; globalThis.__sdkEditWork = null; imported.dispose?.(); }
console.log(JSON.stringify({ node: process.version, source: { id: entry.id, sha256: entry.zipSha256 }, syntheticVolume: true, results }, null, 2));

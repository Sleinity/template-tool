import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { parseTemplatePackageV2, validateTemplatePackageV2, type TemplatePackageV2 } from "@sleinity/template-core";
import { resolveTemplateFieldFamilyVariantV2 } from "@sleinity/template-core/family";
import { buildZipPackageImportResult, type PackageImportResult } from "../src/import/runTemplatePackageImportPipeline";
import { appendTemplateSourcesV2, createTemplateFieldFamilyFromSourcesV2 } from "../src/import/templateSourceAssemblyV2";
import { compileZipSource, assembleCompiledFamily, type CompiledSingleResult } from "../src/internal/compilerResult";
import { createV2ImportOperation } from "../src/import/runTemplatePackageImportPipelineV2";
import { createTemplateSessionV2, type TemplateSessionV2, type TemplateFieldControllerV2 } from "../src/session/templateSessionV2";
import { InMemoryTemplateSessionRepositoryV2 } from "../src/persistence/v2SessionRepositories";

// Test-only, exact-fixture entry. Native reader internals and URL allocation are
// not a serialized compiler contract; complete authority objects are retained.
function compareSessions(a: TemplateSessionV2, b: TemplateSessionV2) {
  const left = a.getSnapshot(), right = b.getSnapshot();
  for (const key of ["status", "basePackage", "contentState", "sessionAssets", "materialization",
    "workingPackage", "rendererPackage", "resolvedTree", "fields", "readiness", "error"] as const) {
    assert.deepEqual(left[key], right[key], `Session authority differs: ${key}`);
  }
}

async function edit(field: TemplateFieldControllerV2) {
  let result;
  switch (field.type) {
    case "text": result = field.setValue("Updated text"); break;
    case "textarea": result = field.setValue("Updated paragraph"); break;
    case "number": result = field.setValue(42); break;
    case "date": result = field.setValue("2027-04-16"); break;
    case "color": result = field.setValue("#123456"); break;
    case "boolean": result = field.setValue(!field.value); break;
    case "image": result = await field.replaceImage({ assetId: `compiler-test-image:${field.id}`,
      dataUrl: "data:image/png;base64,iVBORw0KGgo=", width: 2, height: 2 }); break;
  }
  assert(result.accepted, `${field.id}: current mutation must be accepted`);
  return result;
}

export async function verifyCompilerFixture(buffer: ArrayBuffer, filename: string, fixtureId: string) {
  const directStart = performance.now();
  const direct = await buildZipPackageImportResult(buffer, filename, "", undefined, null);
  const directImportMs = performance.now() - directStart;
  const parseStart = performance.now();
  const expected = parseTemplatePackageV2(direct.package);
  const directParseMs = performance.now() - parseStart;
  let imports = 0, parses = 0, importMs = 0, parseMs = 0;
  let original: PackageImportResult | null = null;
  let parsed: ReturnType<typeof parseTemplatePackageV2> | null = null;
  const started = performance.now();
  let compiled!: CompiledSingleResult;
  let compilerTotalMs = 0;
  const publicResult = await createV2ImportOperation(async input => {
    const compilerStart = performance.now();
    compiled = await compileZipSource(input, {
    importZip: async (...args) => {
      imports++; const start = performance.now();
      original = await buildZipPackageImportResult(...args);
      importMs = performance.now() - start; return original;
    },
    parseV2: source => {
      parses++; const start = performance.now();
      parsed = parseTemplatePackageV2(source);
      parseMs = performance.now() - start; return parsed;
    },
    });
    compilerTotalMs = performance.now() - compilerStart;
    return compiled;
  })({ format: "zip", buffer, sourceName: filename, sourceId: fixtureId, figmaUrl: "", fontRegistry: null });
  const totalMs = performance.now() - started;
  const repositoryA = new InMemoryTemplateSessionRepositoryV2();
  const repositoryB = new InMemoryTemplateSessionRepositoryV2();
  const a = createTemplateSessionV2({ repository: repositoryA });
  const b = createTemplateSessionV2({ repository: repositoryB });
  let standaloneValidationMs = 0, authoringAcceptanceMs = 0, sessionAcceptanceMs = 0;
  try {
    assert.equal(compiled.status, "ready");
    assert.equal(publicResult.status, "ready");
    assert.equal(publicResult.parseResult, compiled.sources[0].parseResult);
    assert.equal(publicResult.importEvidence, compiled.sources[0].importResult);
    assert.deepEqual([imports, parses], [1, 1]);
    assert(expected.package && expected.validation?.valid);
    const source = compiled.sources[0];
    const importAuthority = original! as PackageImportResult;
    assert.deepEqual(Reflect.ownKeys(source.importResult!), Reflect.ownKeys(importAuthority).filter(key => key !== "dispose"));
    for (const key of Reflect.ownKeys(source.importResult!)) {
      assert.equal((source.importResult as any)[key], (importAuthority as any)[key], `Lost import authority identity: ${String(key)}`);
    }
    assert.equal(source.parseResult, parsed);
    assert.equal(compiled.output!.packageValue, parsed!.package);
    assert.deepEqual(source.parseResult, expected);
    // No dispose callbacks in the data view; every diagnostic collection keeps
    // its authority. Deep equality checks property presence, not just JSON.
    const { dispose: _release, ...directData } = direct;
    assert.deepEqual(source.importResult, directData);
    assert.deepEqual(new Uint8Array(await source.importResult!.previewBlob!.arrayBuffer()),
      new Uint8Array(await direct.previewBlob!.arrayBuffer()));
    const base = compiled.output!.packageValue as TemplatePackageV2;
    const validationStart = performance.now();
    assert(validateTemplatePackageV2(publicResult.package!).valid);
    standaloneValidationMs = performance.now() - validationStart;
    const authoringStart = performance.now();
    const accepted = appendTemplateSourcesV2(null, [], [{ id: fixtureId, name: filename, packageValue: publicResult.package! }], filename);
    authoringAcceptanceMs = performance.now() - authoringStart;
    a.load(expected.package);
    try { assert.deepEqual(accepted.getSnapshot().workingPackage, a.getSnapshot().workingPackage); } finally { accepted.dispose(); }
    const sessionStart = performance.now();
    b.load(publicResult.package!); sessionAcceptanceMs = performance.now() - sessionStart;
    compareSessions(a, b);
    const initial = b.getSnapshot();
    const raw = source.importResult!.loadedSource!.rawTemplateJson as any;
    for (const field of raw.editableFields) {
      assert.equal(raw.nodes[field.nodeId].name.trim(), `field:${field.type}:${field.id}`);
      const canonical = base.editableFields.find(item => item.id === `${field.type}:${field.id}`)!;
      assert.equal(canonical.binding.nodeId, field.nodeId);
    }
    if (fixtureId === "exporter-061-carrousel") {
      assert.deepEqual(new Set(base.editableFields.map(field => field.type)),
        new Set(["text", "textarea", "number", "date", "boolean", "color", "image"]));
      const color = base.editableFields.find(field => field.id === "color:backgroundColor")!;
      assert.equal(color.binding.kind, "solid-fill-color");
      if (color.binding.kind !== "solid-fill-color") throw new Error("Wrong Color binding");
      const { nodeId, sourceIndex } = color.binding;
      assert.deepEqual(base.nodes[nodeId].appearance.fills[sourceIndex], raw.nodes[nodeId].appearance.fills[sourceIndex]);
      assert.deepEqual(initial.workingPackage!.nodes[nodeId].appearance.fills[sourceIndex], raw.nodes[nodeId].appearance.fills[sourceIndex]);
    }
    const editedFields = [...b.getFieldControllers()].sort((left, right) => Number(left.type === "boolean") - Number(right.type === "boolean"));
    const directControls = new Map(a.getFieldControllers().map(field => [field.id, field]));
    for (const field of editedFields) {
      assert.deepEqual(await edit(directControls.get(field.id)!), await edit(field));
      compareSessions(a, b);
    }
    const savedA = await a.save({ name: filename });
    const savedB = await b.save({ name: filename });
    const restoredA = createTemplateSessionV2({ repository: repositoryA });
    const restoredB = createTemplateSessionV2({ repository: repositoryB });
    try {
      await restoredA.loadSaved(savedA.id); await restoredB.loadSaved(savedB.id);
      compareSessions(restoredA, restoredB);
      // Existing persistence enriches asset descriptors with hash/storageKey.
      // Paired restored snapshots compare those descriptors above; visual nodes
      // and accepted values additionally match the pre-save state exactly.
      assert.deepEqual(restoredB.getSnapshot().workingPackage!.nodes, b.getSnapshot().workingPackage!.nodes);
      assert.deepEqual(restoredB.getSnapshot().contentState, b.getSnapshot().contentState);
      const pending = new Set(editedFields.map(field => field.id));
      while (pending.size) {
        let progress = false;
        for (const field of [...restoredB.getFieldControllers()].sort((left, right) => Number(right.type === "boolean") - Number(left.type === "boolean"))) {
          if (!pending.has(field.id)) continue;
          assert.deepEqual(restoredA.getFieldControllers().find(item => item.id === field.id)!.reset(), field.reset());
          pending.delete(field.id); progress = true; compareSessions(restoredA, restoredB);
        }
        assert(progress, "Reset must restore access to structurally hidden descendant fields");
      }
      assert.deepEqual(restoredB.getSnapshot().workingPackage!.nodes, initial.workingPackage!.nodes);
    } finally { restoredA.dispose(); restoredB.dispose(); }
    // Compiled sources are reused: Family assembly adds no ZIP/parse calls.
    let assemblyMs = 0, assemblies = 0;
    let familyAuthority: ReturnType<typeof createTemplateFieldFamilyFromSourcesV2> | null = null;
    const assemblyStart = performance.now();
    const family = assembleCompiledFamily([compiled], filename, { assembleFamily: (packages, title) => {
      assemblies++; const start = performance.now();
      familyAuthority = createTemplateFieldFamilyFromSourcesV2(packages, title);
      assemblyMs = performance.now() - start; return familyAuthority;
    } });
    const familyTotalMs = performance.now() - assemblyStart;
    try {
      assert.equal(family.status, "ready");
      assert.equal(family.output!.family === familyAuthority, true, "Complete Family authority is retained by identity");
      assert.deepEqual([imports, parses, assemblies], [1, 1, 1]);
      assert.deepEqual(family.sourceVariants, [{ sourceId: fixtureId, variantId: "variant-1" }]);
      const expectedFamily = createTemplateFieldFamilyFromSourcesV2([expected.package], filename);
      assert.deepEqual({ ...family.output!.family, id: expectedFamily.id }, expectedFamily);
      assert.deepEqual(resolveTemplateFieldFamilyVariantV2(family.output!.family as any, "variant-1").packageValue,
        resolveTemplateFieldFamilyVariantV2(expectedFamily, "variant-1").packageValue);
      compiled.resources.release();
      assert.equal(family.resources.released, false);
    } finally { family.resources.release(); }
    return { fixtureId, fieldTypes: [...new Set(base.editableFields.map(field => field.type))],
      editedFieldIds: editedFields.map(field => field.id),
      delegateCalls: { imports, parses, assemblies }, directImportMs, directParseMs,
      adapterImportMs: importMs, adapterParseMs: parseMs, adapterTotalMs: totalMs,
      standaloneValidationMs, authoringAcceptanceMs, sessionAcceptanceMs,
      compilerTotalMs, publicFacadeOverheadMs: Math.max(0, totalMs - compilerTotalMs),
      adapterOverheadMs: Math.max(0, compilerTotalMs - importMs - parseMs), assemblyMs,
      familyTotalMs, familyAdapterOverheadMs: Math.max(0, familyTotalMs - assemblyMs) };
  } finally { a.dispose(); b.dispose(); publicResult.dispose(); direct.dispose?.(); }
}

export async function verifyCompilerFamily(inputs: { buffer: ArrayBuffer; filename: string; id: string }[]) {
  const sources: Awaited<ReturnType<typeof compileZipSource>>[] = [];
  let imports = 0, parses = 0, assemblies = 0;
  try {
    for (const input of inputs) sources.push(await compileZipSource({ format: "zip", buffer: input.buffer,
      sourceName: input.filename, sourceId: input.id, fontRegistry: null }, {
      importZip: async (...args) => { imports++; return buildZipPackageImportResult(...args); },
      parseV2: value => { parses++; return parseTemplatePackageV2(value); },
    }));
    const packages = sources.map(source => source.output!.packageValue as TemplatePackageV2);
    const family = assembleCompiledFamily(sources, "Three source Family", { assembleFamily: (packages, title) => {
      assemblies++; return createTemplateFieldFamilyFromSourcesV2(packages, title);
    } });
    try {
      assert.equal(family.status, "ready");
      assert.deepEqual([imports, parses, assemblies], [inputs.length, inputs.length, 1]);
      const expected = createTemplateFieldFamilyFromSourcesV2(packages, "Three source Family");
      assert.deepEqual({ ...family.output!.family, id: expected.id }, expected);
      assert.deepEqual(family.sourceVariants, inputs.map((input, index) => ({ sourceId: input.id, variantId: `variant-${index + 1}` })));
      for (const variant of expected.variants) assert.deepEqual(
        resolveTemplateFieldFamilyVariantV2(family.output!.family as any, variant.id).packageValue,
        resolveTemplateFieldFamilyVariantV2(expected, variant.id).packageValue);
      sources.forEach(source => source.resources.release());
      return { sourceIds: inputs.map(input => input.id), delegateCalls: { imports, parses, assemblies }, passed: true };
    } finally { family.resources.release(); }
  } finally { sources.forEach(source => source.resources.release()); }
}

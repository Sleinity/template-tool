import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import rawFixture from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import { parseTemplatePackageV2, validateTemplatePackage, type TemplatePackageV1, type TemplatePackageV2 } from "@sleinity/template-core";
import { resolveTemplateFieldFamilyVariantV2, getTemplateFieldFamilyEditorControlOrderV2 } from "@sleinity/template-core/family";
import { projectionPackage } from "../../template-core/test/definitionProjection.fixtures";
import { compileZipSource, assembleCompiledFamily, CompilerContractError } from "../src/internal/compilerResult";
import { buildZipPackageImportResult, type PackageImportResult } from "../src/import/runTemplatePackageImportPipeline";
import { createTemplateFieldFamilyFromSourcesV2 } from "../src/import/templateSourceAssemblyV2";
import { createTemplateSessionV2 } from "../src/session/templateSessionV2";
import { createTemplateFieldFamilySessionV2 } from "../src/session/templateFieldFamilySessionV2";
import { createIndexedDbAssetStore } from "../src/assets/indexedDbAssetStore";
import type { ManagedFontRegistry } from "../src/fonts/fontRegistryTypes";

const bytes = new ArrayBuffer(0);
const input = (sourceId: string) => ({ format: "zip" as const, buffer: bytes, sourceName: `${sourceId}.zip`, sourceId });
function imported(packageValue = structuredClone(rawFixture) as unknown as TemplatePackageV1): PackageImportResult {
  const validation = validateTemplatePackage(packageValue);
  return { package: packageValue, validation, diagnostics: validation.diagnostics,
    pluginDiagnostics: validation.pluginDiagnostics, enrichment: null,
    sourceMetadata: { type: "package-zip", sourceName: "source.zip", figmaUrl: undefined } };
}

// Multiple retained compiler owners and cleanup exceptions cannot skip peers.
{
  let released = 0, peerReleased = 0;
  const cause = new Error("Cleanup failed");
  const source = await ready("shared-owner", undefined, () => { released++; throw cause; });
  const peer = await ready("peer", undefined, () => { peerReleased++; });
  const first = assembleCompiledFamily([source], "First");
  const second = assembleCompiledFamily([source, peer], "Second");
  source.resources.release(); peer.resources.release(); first.resources.release();
  assert.equal(released, 0);
  assert.throws(() => second.resources.release(), error => error === cause);
  second.resources.release();
  assert.deepEqual([released, peerReleased], [1, 1]);
  assert(second.resources.released);
}
async function ready(id: string, packageValue = projectionPackage(), release?: () => void) {
  return compileZipSource(input(id), { importZip: async () => ({ ...imported(), dispose: release }), parseV2: () => parseTemplatePackageV2(packageValue) });
}

// Exactly one invocation per authority; preserve object/property evidence.
{
  const original = imported();
  original.previewBlob = new Blob([new Uint8Array([1, 2])]);
  const parsed = parseTemplatePackageV2(original.package);
  let imports = 0, parses = 0;
  const before = structuredClone(original.package);
  const result = await compileZipSource(input("single"), {
    importZip: async (...args) => { imports++; assert.equal(args[0], bytes); assert.equal(args[1], "single.zip"); return original; },
    parseV2: source => { parses++; assert.equal(source, original.package); return parsed; },
  });
  assert.equal(result.status, "ready");
  assert.deepEqual(result.sources[0].importResult, original);
  assert.equal(result.sources[0].parseResult, parsed);
  assert.equal(result.sources[0].importResult!.previewBlob, original.previewBlob);
  assert.equal(result.output!.packageValue, parsed.package);
  assert.deepEqual(original.package, before);
  assert(Object.hasOwn(result.sources[0].importResult!.sourceMetadata!, "figmaUrl"));
  assert.deepEqual([imports, parses], [1, 1]);
  result.resources.release(); result.resources.release();
  assert.throws(() => assembleCompiledFamily([result], "Released"), CompilerContractError);
  assert.throws(() => assembleCompiledFamily([], "Empty"), CompilerContractError);
  await assert.rejects(compileZipSource(input(" ")), CompilerContractError);
  const callerInput = input("original-id");
  const originalName = callerInput.sourceName;
  const pending = compileZipSource(callerInput, { importZip: async () => {
    callerInput.sourceId = "changed"; callerInput.sourceName = "changed.zip";
    return imported();
  } });
  const accepted = await pending;
  assert.equal(accepted.sources[0].id, "original-id");
  assert.equal(accepted.sources[0].sourceName, originalName);
  accepted.resources.release();
}

// Declared failures retain data and original causes; no partial assembly.
{
  const parseError = { message: "normalization failed" };
  let released = 0;
  const normalization = await compileZipSource(input("normalization"), {
    importZip: async () => ({ ...imported(), dispose: () => { released++; } }),
    parseV2: () => { throw parseError; },
  });
  assert.equal(normalization.status, "error");
  assert.equal(normalization.failures[0].cause, parseError);
  assert.equal(normalization.failures[0].stage, "v2-normalization");
  assert(normalization.sources[0].importResult?.package);
  const ioError = new Error("storage transaction failed");
  let parses = 0;
  const failed = await compileZipSource(input("failure"), {
    importZip: async () => { throw ioError; }, parseV2: () => { parses++; throw new Error("Unreachable"); },
  });
  assert.equal(failed.failures[0].cause, ioError);
  assert.equal(failed.failures[0].stage, "import");
  assert.equal(failed.sources[0].importResult, null);
  assert.equal(parses, 0);
  const blockedImport = imported();
  blockedImport.layeredDiagnostics = { canImport: false, status: "blocked", diagnostics: [], blockingDiagnostics: [], warningDiagnostics: [], infoDiagnostics: [], layers: [] };
  const blocked = await compileZipSource(input("blocked"), { importZip: async () => blockedImport });
  assert.equal(blocked.status, "blocked");
  assert(blocked.sources[0].parseResult?.package);
  assert.equal(blocked.output, null);
  let assemblies = 0;
  const family = assembleCompiledFamily([normalization, blocked, failed], "Blocked", { assembleFamily: () => { assemblies++; throw new Error("Unreachable"); } });
  assert.equal(family.status, "error");
  assert.deepEqual(family.sources, [normalization.sources[0], blocked.sources[0], failed.sources[0]]);
  assert.equal(assemblies, 0);
  normalization.resources.release(); assert.equal(released, 0);
  family.resources.release(); family.resources.release(); assert.equal(released, 1);
  blocked.resources.release(); failed.resources.release();
  const v2Blocked = await compileZipSource(input("invalid-v2"), { importZip: async () => imported(), parseV2: () => parseTemplatePackageV2({ schemaVersion: "2.2" }) });
  assert.equal(v2Blocked.status, "blocked");
  assert(v2Blocked.sources[0].parseResult!.diagnostics.length > 0);
  v2Blocked.resources.release();
}

// Actual ZIP error paths, without an external fixture requirement.
for (const buffer of [new ArrayBuffer(4), zipSync({ "template.json": strToU8("{"), "assets.json": strToU8('{"assets":[]}') }).buffer as ArrayBuffer]) {
  const direct = await buildZipPackageImportResult(buffer, "malformed.zip");
  const result = await compileZipSource({ ...input("malformed"), buffer, sourceName: "malformed.zip" });
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.sources[0].importResult!.diagnostics, direct.diagnostics);
  assert.deepEqual(result.sources[0].importResult!.layeredDiagnostics, direct.layeredDiagnostics);
  assert.deepEqual(result.sources[0].importResult!.loadedSource?.rawTemplateJson, direct.loadedSource?.rawTemplateJson);
  result.resources.release(); direct.dispose?.();
}

// Canonical Family delegation, identity mapping, overrides and current selectors.
{
  const a = projectionPackage();
  const b = structuredClone(a);
  b.editableFields.find(field => field.type === "text")!.configuration = { maxCharacters: 80 };
  b.editableFields.find(field => field.type === "text")!.defaultValue = "Bye";
  b.editableFieldOrder.reverse();
  let releaseA = 0, releaseB = 0;
  const first = await ready("a", a, () => { releaseA++; });
  const second = await ready("b", b, () => { releaseB++; });
  let calls = 0;
  let originalFamily: ReturnType<typeof createTemplateFieldFamilyFromSourcesV2> | null = null;
  const family = assembleCompiledFamily([first, second], "Family", { assembleFamily: (sources, title) => {
    calls++; originalFamily = createTemplateFieldFamilyFromSourcesV2(sources, title); return originalFamily;
  } });
  assert.equal(family.status, "ready"); assert.equal(calls, 1);
  assert.equal(family.output!.family === originalFamily, true, "Complete Family authority is retained by identity");
  assert.deepEqual(family.sourceVariants, [{ sourceId: "a", variantId: "variant-1" }, { sourceId: "b", variantId: "variant-2" }]);
  assert.equal(family.output!.family.variants.length, 2, "Duplicate package IDs remain distinct variants");
  assert.throws(() => assembleCompiledFamily([first, first], "Duplicate"), CompilerContractError);
  assert.deepEqual(a, projectionPackage(), "Assembly must not mutate canonical source input");
  const expected = createTemplateFieldFamilyFromSourcesV2([a, b], "Family");
  const actual = structuredClone(family.output!.family) as ReturnType<typeof createTemplateFieldFamilyFromSourcesV2>;
  assert.deepEqual({ ...actual, id: expected.id }, expected, "Only independently generated Family ID differs");
  assert.deepEqual(actual.variants[1].fieldOverrides!["text:title"].configuration,
    { maxCharacters: 80, warningAtCharacters: null, choices: null });
  assert.equal(actual.variants[1].packageValue.editableFields.find(field => field.type === "text")!.defaultValue, "Bye");
  assert.deepEqual(actual.variants[1].packageValue.editableFieldOrder, b.editableFieldOrder);
  for (const variant of actual.variants) assert.deepEqual(resolveTemplateFieldFamilyVariantV2(actual, variant.id), resolveTemplateFieldFamilyVariantV2({ ...expected, id: actual.id }, variant.id));
  actual.variantGroups = [{ id: "size", title: "Size", options: [{ id: "small", title: "Small" }, { id: "large", title: "Large" }] }];
  actual.variants.forEach((variant, index) => { variant.groupAssignments = { size: index ? "large" : "small" }; });
  actual.editorControlOrder = getTemplateFieldFamilyEditorControlOrderV2(actual);
  const session = createTemplateFieldFamilySessionV2();
  session.load(actual);
  assert.equal(session.getSnapshot().status, "ready");
  session.selectVariant("variant-2");
  assert.equal(session.getSnapshot().selectedVariantId, "variant-2");
  session.selectOption("size", "small");
  assert.equal(session.getSnapshot().selectedVariantId, "variant-1");
  const shared = actual.fields.find(field => field.type === "text")!;
  assert(shared.type === "text");
  session.configure({ fields: [{ ...shared, configuration: { ...shared.configuration, maxCharacters: 120 } }] });
  assert.equal(session.getSnapshot().family!.fields.find(field => field.type === "text")!.configuration.maxCharacters, 120);
  session.configure({ variants: [{ id: "variant-2", fieldOverrides: actual.variants[1].fieldOverrides,
    editableFieldOrder: [...b.editableFieldOrder] }] });
  session.selectOption("size", "large");
  assert.deepEqual(session.getSnapshot().effectivePackage!.editableFieldOrder, b.editableFieldOrder);
  session.dispose();
  first.resources.release(); second.resources.release();
  assert.deepEqual([releaseA, releaseB], [0, 0]);
  family.resources.release(); family.resources.release();
  assert.deepEqual([releaseA, releaseB], [1, 1]);

  const changed = projectionPackage();
  const field = changed.editableFields.find(f => f.type === "text")!;
  changed.editableFields[changed.editableFields.indexOf(field)] = {
    id: field.id, type: "textarea", binding: field.binding,
    defaultValue: field.defaultValue as string, configuration: {},
  }; // Individually valid input with a conflicting common field type.
  const conflicting = await ready("conflict", changed);
  assert.equal(conflicting.status, "blocked", "Type-prefixed canonical IDs reject conflicting field types before assembly");
  const good = await ready("good");
  const broken = assembleCompiledFamily([good, conflicting], "Conflict");
  assert.equal(broken.status, "blocked");
  assert.equal(broken.sources.length, 2);
  const cause = new Error("Family assembly failed");
  const thrown = assembleCompiledFamily([good], "Failure", { assembleFamily: () => { throw cause; } });
  assert.equal(thrown.status, "error");
  assert.equal(thrown.failures[0].stage, "family-assembly");
  assert.equal(thrown.failures[0].cause, cause);
  thrown.resources.release();
  good.resources.release(); conflicting.resources.release(); broken.resources.release();
}

// Default-store leases and independently loaded sessions keep their existing authority.
{
  const previousDb = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  let created = 0; const revoked: string[] = [];
  Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: { open() {
    const request: any = { result: { close() {}, transaction() {
      const transaction: any = { objectStore: () => ({ put() { queueMicrotask(() => transaction.oncomplete()); } }) };
      return transaction;
    } } }; queueMicrotask(() => request.onsuccess()); return request;
  } } });
  URL.createObjectURL = () => `blob:compiler-owner-${++created}`;
  URL.revokeObjectURL = url => revoked.push(url);
  try {
    const make = async (id: string) => compileZipSource(input(id), { importZip: async () => {
      const store = createIndexedDbAssetStore()!;
      const ref = await store.put("compiler-shared-binary", new Uint8Array([1]), "image/png");
      const data = imported();
      const image = Object.values(data.package!.nodes).find(node => node.image?.assetId)!;
      data.package!.assets[image.image!.assetId!].stableUrl = ref.stableUrl;
      return { ...data, dispose: () => store.dispose!() };
    } });
    const first = await make("owner-a"), second = await make("owner-b");
    assert.equal(first.status, "ready"); assert.equal(second.status, "ready");
    const family = assembleCompiledFamily([first, second], "Shared");
    const session = createTemplateSessionV2(); session.load(first.output!.packageValue);
    assert.equal(session.getSnapshot().status, "ready");
    first.resources.release(); second.resources.release(); family.resources.release();
    assert.equal(revoked.length, 0); assert.equal(created, 1);
    session.dispose(); assert.equal(revoked.length, 1);
    const bad = await make("failed-load");
    const invalid = structuredClone(bad.output!.packageValue) as TemplatePackageV2;
    delete invalid.nodes[invalid.rootNodeId];
    const rejected = createTemplateSessionV2(); rejected.load(invalid);
    assert.equal(rejected.getSnapshot().status, "blocked", "Invalid session input retains the existing blocked outcome");
    bad.resources.release(); rejected.dispose(); assert.equal(revoked.length, 2);

    let externalReleases = 0;
    const external = { async put() { return { storageKey: "external", stableUrl: "https://host.invalid/asset" }; }, dispose() { externalReleases++; } };
    const zipWithAsset = (packageValue: TemplatePackageV1) => {
      const asset = Object.values(packageValue.assets).find(item => item.type === "image")!;
      const png = Uint8Array.from(atob((asset as { dataUrl: string }).dataUrl.split(",")[1]), character => character.charCodeAt(0));
      return zipSync({ "template.json": strToU8(JSON.stringify(packageValue)),
        "assets.json": strToU8(JSON.stringify({ version: 1, assets: [{ id: asset.id, type: "image", path: "assets/test.png", mimeType: "image/png", byteSize: png.length }] })),
        "assets/test.png": png });
    };
    const archive = zipWithAsset(structuredClone(rawFixture) as unknown as TemplatePackageV1);
    const externalResult = await compileZipSource({ ...input("external"), buffer: archive.buffer as ArrayBuffer, assetStorage: external });
    externalResult.resources.release(); assert.equal(externalReleases, 0);

    // Failure after asset ingestion uses the real pipeline's default-store
    // cleanup, not a compiler-specific resource policy.
    const linked = structuredClone(rawFixture) as unknown as TemplatePackageV1;
    linked.fontRequirements = [{ id: "font:failure", family: "Failure", weight: 400, style: "Regular", cssStyle: "normal",
      postScriptName: null, usedBy: [], characters: "", editable: true,
      mixedStyle: false, source: "figma", availableInFigma: true }];
    const failingArchive = zipWithAsset(linked);
    const linkCause = new Error("Managed font registry unavailable");
    const registry = { listManagedFonts: async () => { throw linkCause; } } as unknown as ManagedFontRegistry;
    const beforeCreated = created, beforeRevoked = revoked.length;
    const failedImport = await compileZipSource({ ...input("registry-failure"), buffer: failingArchive.buffer as ArrayBuffer, fontRegistry: registry });
    assert.equal(failedImport.status, "error");
    assert.equal(failedImport.failures[0].cause, linkCause);
    assert.equal(failedImport.failures[0].stage, "import");
    assert(created > beforeCreated, "Failure must occur after temporary asset acquisition");
    assert.equal(revoked.length - beforeRevoked, created - beforeCreated);
    failedImport.resources.release();

    let storageAttempts = 0;
    const failingStorage = { async put(): Promise<never> { storageAttempts++; throw new Error("Storage failed"); }, dispose() { externalReleases++; } };
    const storageFailure = await compileZipSource({ ...input("storage-failure"), buffer: archive.buffer as ArrayBuffer, assetStorage: failingStorage, fontRegistry: null });
    const directStorageFailure = await buildZipPackageImportResult(archive.buffer as ArrayBuffer, "storage-failure.zip", "", failingStorage, null);
    assert(storageAttempts > 0);
    const { dispose: _dispose, ...data } = directStorageFailure;
    assert.deepEqual(storageFailure.sources[0].importResult, data, "Storage diagnostics and embedded fallback remain owned by the existing importer");
    storageFailure.resources.release(); directStorageFailure.dispose?.();
    assert.equal(externalReleases, 0);
  } finally {
    URL.createObjectURL = create; URL.revokeObjectURL = revoke;
    if (previousDb) Object.defineProperty(globalThis, "indexedDB", previousDb); else delete (globalThis as { indexedDB?: unknown }).indexedDB;
  }
}
console.log("Internal compiler-result contracts, failures and resource ownership passed.");

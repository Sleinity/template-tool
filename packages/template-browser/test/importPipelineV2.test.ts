import assert from "node:assert/strict";
import { strToU8, zipSync, unzipSync } from "fflate";
import { createCompactLifecycleFixture } from "../../../scripts/compact-lifecycle-fixture.mjs";
import raw from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import { parseTemplatePackageV2, validateTemplatePackage, type TemplatePackageV1 } from "@sleinity/template-core";
import { createV2ImportOperation, runTemplatePackageImportPipelineV2 } from "../src/import/runTemplatePackageImportPipelineV2";
import { compileZipSource } from "../src/internal/compilerResult";
import type { PackageImportResult } from "../src/import/runTemplatePackageImportPipeline";
import { createTemplateSessionV2 } from "../src/session/templateSessionV2";

const input = { format: "zip" as const, buffer: new ArrayBuffer(0), sourceId: "host-source", sourceName: "source.zip", fontRegistry: null };
function imported(): PackageImportResult {
  const packageValue = structuredClone(raw) as unknown as TemplatePackageV1;
  const validation = validateTemplatePackage(packageValue);
  return { package: packageValue, validation, diagnostics: validation.diagnostics,
    pluginDiagnostics: validation.pluginDiagnostics, enrichment: null,
    previewBlob: new Blob(["reused preview"]), sourceMetadata: { type: "package-zip", figmaUrl: undefined } };
}

{
  const original = imported(), parsed = parseTemplatePackageV2(original.package);
  let imports = 0, parses = 0, releases = 0;
  original.dispose = () => { releases++; };
  const run = createV2ImportOperation(args => compileZipSource(args, {
    importZip: async () => { imports++; return original; },
    parseV2: value => { parses++; assert.equal(value, original.package); return parsed; },
  }));
  const result = await run(input);
  assert.equal(result.status, "ready");
  assert.equal(result.sourceId, input.sourceId);
  assert.equal(result.sourceName, input.sourceName);
  assert.equal(result.package, parsed.package);
  assert.equal(result.parseResult, parsed);
  const { dispose: _dispose, ...evidence } = original;
  assert.deepEqual(result.importEvidence, evidence);
  assert.equal(result.importEvidence!.previewBlob, original.previewBlob);
  assert(Object.hasOwn(result.importEvidence!.sourceMetadata!, "figmaUrl"));
  assert.deepEqual([imports, parses], [1, 1]);
  assert.deepEqual(Object.keys(result), ["sourceId", "sourceName", "status", "package", "importEvidence", "parseResult", "failure", "dispose"]);
  result.dispose(); result.dispose(); assert.equal(releases, 1);
}

{
  const original = imported();
  original.validation = { ...original.validation!, valid: false };
  const blocked = await createV2ImportOperation(args => compileZipSource(args, { importZip: async () => original }))(input);
  assert.equal(blocked.status, "blocked");
  assert(blocked.package && blocked.parseResult && blocked.importEvidence);
  assert.equal(blocked.failure, null); blocked.dispose();
  const cause = new Error("V2 normalization failed");
  let releases = 0;
  const failed = await createV2ImportOperation(args => compileZipSource(args, {
    importZip: async () => ({ ...imported(), dispose: () => { releases++; } }),
    parseV2: () => { throw cause; },
  }))(input);
  assert.equal(failed.status, "error"); assert.equal(failed.failure!.cause, cause);
  assert.equal(failed.failure!.stage, "v2-normalization");
  assert(failed.importEvidence!.package); assert.equal(failed.parseResult, null);
  failed.dispose(); failed.dispose(); assert.equal(releases, 1);
  const io = { message: "import failed" };
  const rejected = await createV2ImportOperation(args => compileZipSource(args, { importZip: async () => { throw io; } }))(input);
  assert.equal(rejected.failure!.cause, io); assert.equal(rejected.failure!.stage, "import");
  assert.equal(rejected.importEvidence, null); rejected.dispose();
}

for (const buffer of [new ArrayBuffer(0), zipSync({ "template.json": strToU8("{broken") }).buffer as ArrayBuffer]) {
  const result = await runTemplatePackageImportPipelineV2({ ...input, buffer });
  assert.notEqual(result.status, "ready");
  assert(result.importEvidence?.diagnostics.length || result.importEvidence?.layeredDiagnostics || result.failure);
  result.dispose(); result.dispose();
}
await assert.rejects(runTemplatePackageImportPipelineV2({ ...input, sourceId: " " }), /nonempty/);

// Real public ZIP pipeline: compiler disposal must not revoke two session owners.
{
  const oldDb = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  let created = 0, revoked = 0;
  Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: { open() {
    const request: any = { result: { close() {}, transaction() {
      const transaction: any = { objectStore: () => ({ put() { queueMicrotask(() => transaction.oncomplete()); } }) };
      return transaction;
    } } };
    queueMicrotask(() => request.onsuccess()); return request;
  } } });
  URL.createObjectURL = () => `blob:public-compiler-${++created}`;
  URL.revokeObjectURL = () => { revoked++; };
  const sessions = [createTemplateSessionV2(), createTemplateSessionV2()];
  try {
    const compact = await createCompactLifecycleFixture();
    const packageValue = JSON.parse(new TextDecoder().decode(unzipSync(compact.bytes)["template.json"])) as TemplatePackageV1;
    packageValue.assets = structuredClone((raw as unknown as TemplatePackageV1).assets);
    const asset = Object.values(packageValue.assets).find(item => item.type === "image")!;
    const png = Uint8Array.from(atob((asset as { dataUrl: string }).dataUrl.split(",")[1]), char => char.charCodeAt(0));
    const zip = zipSync({ "template.json": strToU8(JSON.stringify(packageValue)), "asset.png": png,
      "assets.json": strToU8(JSON.stringify({ version: 1, assets: [{ id: asset.id, type: "image", path: "asset.png", mimeType: "image/png", byteSize: png.length }] })) });
    const result = await runTemplatePackageImportPipelineV2({ ...input, buffer: zip.buffer as ArrayBuffer });
    assert.equal(result.status, "ready"); assert(created > 0);
    for (const session of sessions) { session.load(result.package); assert.equal(session.getSnapshot().status, "ready"); }
    result.dispose(); result.dispose(); assert.equal(revoked, 0);
    sessions[0].dispose(); assert.equal(revoked, 0);
    sessions[1].dispose(); assert.equal(revoked, created);
  } finally {
    sessions.forEach(session => session.dispose());
    URL.createObjectURL = create; URL.revokeObjectURL = revoke;
    if (oldDb) Object.defineProperty(globalThis, "indexedDB", oldDb); else delete (globalThis as { indexedDB?: unknown }).indexedDB;
  }
}
console.log("Public V2 ZIP import: evidence, call counts, blocked/errors and idempotent disposal passed.");

// Admission inspects the raw source once and cannot allocate persistent assets.
{
 const fixture = await createCompactLifecycleFixture();
 const template = JSON.parse(new TextDecoder().decode(unzipSync(fixture.bytes)['template.json']));
 const {createZipBundleReader,loadTemplatePackageBundleSource} = await import('@sleinity/template-core');
 for (const version of [undefined, null, 61, {}, '', '0.6.0', '0.6.2', '0.6.1 ']) {
   const rawSource = structuredClone(template);
   if (version === undefined) delete rawSource.source.pluginVersion; else rawSource.source.pluginVersion = version;
   const bytes = zipSync({'template.json':strToU8(JSON.stringify(rawSource))});
   const reader = createZipBundleReader(bytes.buffer as ArrayBuffer);
   const read = reader.readText.bind(reader); let reads = 0;
   reader.readText = path => {if(path === 'template.json') reads++; return read(path);};
   const loaded = loadTemplatePackageBundleSource(reader);
   assert.equal(reads,1); assert.equal(loaded.valid,false); assert.equal(loaded.packageValue,null);
   assert.deepEqual(loaded.rawTemplateJson,rawSource);
   assert(loaded.diagnostics.some(d=>d.code==='SOURCE_EXPORTER_VERSION_UNSUPPORTED' && d.severity==='error'));
   let writes=0;
   const result = await runTemplatePackageImportPipelineV2({...input,buffer:bytes.buffer as ArrayBuffer,assetStorage:{put:async()=>{writes++;throw Error('admission wrote assets');}}});
   assert.equal(result.status,'blocked'); assert.equal(result.package,null);assert.equal(result.failure,null);assert.equal(writes,0);
   assert.deepEqual(result.importEvidence!.loadedSource!.rawTemplateJson,rawSource);result.dispose();
 }
 const wrongSchema={...template,schemaVersion:'2.2'};
 const wrong=loadTemplatePackageBundleSource(createZipBundleReader(zipSync({'template.json':strToU8(JSON.stringify(wrongSchema))}).buffer as ArrayBuffer));
 assert.equal(wrong.valid,false);assert(wrong.diagnostics.some(d=>d.code==='SOURCE_EXPORTER_VERSION_UNSUPPORTED'));
 const good=await runTemplatePackageImportPipelineV2({...input,buffer:fixture.bytes.buffer as ArrayBuffer});
 assert.equal(good.status,'ready');assert.equal(good.package!.schemaVersion,'2.2');good.dispose();
 console.log('Exporter admission: exact 0.6.1, raw evidence, one read and zero persistent writes passed.');
}

/** Exact exporter 0.6.1 ZIPs through public Core and Browser entry points only. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { runTemplatePackageImportPipelineV2 } from "@sleinity/template-browser/importer";
import { InMemoryTemplateSessionRepositoryV2 } from "@sleinity/template-browser/persistence";
import { createTemplateSessionV2 } from "@sleinity/template-browser/session";
import { loadManifest, resolveFixture } from "../fidelity/core.mjs";
import { selectSdkGateFixtures } from "../fidelity/gate-profile.mjs";

const manifest = loadManifest();
const fixtures = selectSdkGateFixtures(manifest);
assert.deepEqual(fixtures.map(item => item.id), ["exporter-061-now-hiring", "exporter-061-cover", "exporter-061-carrousel"]);
const rows = [];
const findings = [];
for (const fixture of fixtures) {
  const bytes = readFileSync(resolveFixture(manifest, fixture));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), fixture.zipSha256);
  const started = performance.now();
  const result = await runTemplatePackageImportPipelineV2({ format: "zip", sourceId: fixture.id, sourceName: fixture.filename,
    buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), fontRegistry: null });
  const imported = result.importEvidence;
  const importedAt = performance.now();
  const repository = new InMemoryTemplateSessionRepositoryV2();
  const session = createTemplateSessionV2({ repository });
  try {
    assert(result.status === "ready" && result.package && imported?.validation?.valid, `${fixture.id}: current ZIP must import`);
    assert(imported.previewBlob, `${fixture.id}: embedded source preview must be reused`);
    assert.equal(createHash("sha256").update(Buffer.from(await imported.previewBlob.arrayBuffer())).digest("hex"), fixture.embeddedPreview.sha256);
    const parsed = result.parseResult;
    assert(parsed?.validation?.valid && parsed.package, `${fixture.id}: canonical V2 must validate`);
    const parsedAt = performance.now();
    session.load(parsed.package);
    const snapshot = session.getSnapshot();
    assert(snapshot.basePackage && snapshot.workingPackage && snapshot.resolvedTree, `${fixture.id}: session must materialize and resolve`);
    assert.deepEqual(new Set(snapshot.basePackage.editableFieldOrder), new Set(snapshot.basePackage.editableFields.map(item => item.id)), `${fixture.id}: ordered field controls must be complete`);
    if (fixture.id === "exporter-061-carrousel") {
      const rawPaint = imported.loadedSource?.rawTemplateJson?.nodes?.["987:6811"]?.appearance?.fills?.[0];
      const sourceFill = snapshot.basePackage.nodes["987:6811"].appearance.fills[0];
      const defaultFill = snapshot.workingPackage.nodes["987:6811"].appearance.fills[0];
      assert(rawPaint?.type === "SOLID" && sourceFill?.type === "SOLID", "Marked raw and normalized paints must both be SOLID.");
      assert.deepEqual(sourceFill.color, rawPaint.color, "Normalization must retain the ZIP's exact floating-point RGBA.");
      assert.deepEqual(defaultFill, sourceFill, "Initial Color materialization must retain the entire bound source paint.");
    }
    if (fixture.id === "exporter-061-cover") {
      const rawFills = imported.loadedSource?.rawTemplateJson?.nodes?.["987:6774"]?.appearance?.fills;
      const baseFills = snapshot.basePackage.nodes["987:6774"]?.appearance.fills;
      const initialFills = snapshot.workingPackage.nodes["987:6774"]?.appearance.fills;
      assert.deepEqual(rawFills?.map((paint) => [paint.type, paint.blendMode]),
        [["SOLID", "NORMAL"], ["IMAGE", "NORMAL"], ["GRADIENT_LINEAR", "DARKEN"]],
        "Cover must retain the source-ordered mixed paint contract.");
      assert.deepEqual(initialFills, baseFills, "Initial Cover materialization must preserve the complete fade stack.");
    }
    const materializedAt = performance.now();

    const sourcePackage = imported.loadedSource?.rawTemplateJson;
    assert(sourcePackage?.nodes && Array.isArray(sourcePackage.editableFields), `${fixture.id}: raw exporter field evidence must be retained`);
    const sourceFields = sourcePackage.editableFields;
    for (const field of sourceFields) {
      const node = sourcePackage.nodes[field.nodeId];
      assert.equal(node?.name?.trim(), `field:${field.type}:${field.id}`, `${fixture.id}/${field.id}: exported descriptor must target its marker layer`);
      const canonical = snapshot.basePackage.editableFields.find(item => item.id === `${field.type}:${field.id}`);
      assert(canonical && canonical.binding.nodeId === field.nodeId, `${fixture.id}/${field.id}: V2 binding must retain the marked node`);
    }

    const controls = session.getFieldControllers();
    for (const type of new Set(controls.map(item => item.type))) {
      const field = controls.find(item => item.type === type);
      const next = type === "number" ? 42 : type === "date" ? "2027-04-16" : type === "boolean" ? !field.value : type === "color" ? "#123456" : type === "text" ? "Updated text" : type === "textarea" ? "Updated paragraph" : null;
      if (next !== null) assert(field.setValue(next).accepted, `${fixture.id}/${type}: canonical edit must be accepted`);
      if (type === "image") {
        assert((await field.replaceImage({ dataUrl: "data:image/png;base64,iVBORw0KGgo=", width: 2, height: 2 })).accepted, `${fixture.id}: image replacement must be accepted`);
      }
    }
    if (fixture.id === "exporter-061-carrousel") {
      const base = snapshot.basePackage;
      const color = base.editableFields.find(item => item.id === "color:backgroundColor");
      assert(color?.binding.kind === "solid-fill-color" && color.binding.nodeId === "987:6811", "BackgroundColor must bind to its marked layer and exact SOLID fill.");
      const working = session.getSnapshot().workingPackage;
      const fill = working.nodes[color.binding.nodeId].appearance.fills[color.binding.sourceIndex];
      assert(fill.type === "SOLID" && fill.color.r === 0x12 / 255 && fill.color.g === 0x34 / 255 && fill.color.b === 0x56 / 255, "BackgroundColor edit must change only its exact SOLID fill.");
      for (const [id, node] of Object.entries(base.nodes)) if (id !== color.binding.nodeId) assert.deepEqual(working.nodes[id].appearance.fills, node.appearance.fills, `${id}: unrelated paint must not change`);
      assert.deepEqual(working.maskRelationships, base.maskRelationships, "Color edit must retain declared mask scope.");
      assert.deepEqual(working.nodes[color.binding.nodeId].mask, base.nodes[color.binding.nodeId].mask, "Color edit must retain source mask semantics.");
    }
    if (fixture.id === "exporter-061-cover") {
      assert.deepEqual(session.getSnapshot().workingPackage.nodes["987:6774"].appearance.fills,
        snapshot.basePackage.nodes["987:6774"].appearance.fills,
        "Editing Cover fields must not rewrite its source-owned image/gradient fade.");
    }
    const saved = await session.save({ name: fixture.id });
    assert(saved.id && saved.contentState, `${fixture.id}: accepted content must persist`);
    const restored = createTemplateSessionV2({ repository });
    try {
      await restored.loadSaved(saved.id);
      assert.deepEqual(restored.getSnapshot().contentState, session.getSnapshot().contentState, `${fixture.id}: canonical edits must reload exactly`);
      assert.deepEqual(restored.getSnapshot().workingPackage.nodes, session.getSnapshot().workingPackage.nodes, `${fixture.id}: materialized visual nodes must reload exactly`);
      if (fixture.id === "exporter-061-carrousel") {
        const color = restored.getFieldControllers().find(item => item.id === "color:backgroundColor");
        assert(color?.reset().accepted, "BackgroundColor must reset to its marked layer's imported fill.");
        const baseFill = restored.getSnapshot().basePackage.nodes["987:6811"].appearance.fills[0];
        const resetFill = restored.getSnapshot().workingPackage.nodes["987:6811"].appearance.fills[0];
        assert.deepEqual(resetFill, baseFill, "Reset must restore the entire source SOLID fill after save/reload.");
      }
      if (fixture.id === "exporter-061-cover") {
        const text = restored.getFieldControllers().find(item => item.type === "textarea");
        assert(text?.reset().accepted, "Cover visible text must reset after save/reload.");
        assert.deepEqual(restored.getSnapshot().workingPackage.nodes["987:6774"].appearance.fills,
          restored.getSnapshot().basePackage.nodes["987:6774"].appearance.fills,
          "Cover Reset must preserve the entire imported mixed-paint stack.");
      }
    } finally {
      restored.dispose();
    }
    rows.push({ fixtureId: fixture.id, zipSha256: fixture.zipSha256, fieldTypes: [...new Set(controls.map(item => item.type))], v2ImportMs: +(importedAt - started).toFixed(2), sessionMaterializeMs: +(materializedAt - parsedAt).toFixed(2) });
  } finally {
    session.dispose();
    result.dispose();
  }
}
console.log(JSON.stringify({ schemaVersion: "sdk-061-single-host-v1", rows, findings }, null, 2));
if (findings.length) process.exitCode = 1;

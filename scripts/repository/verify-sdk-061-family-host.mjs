/** Exact exporter 0.6.1 Family gate through public Core and Browser entry points only. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runTemplatePackageImportPipelineV2, appendTemplateSourcesV2, mutateTemplateFamilyV2 } from "@sleinity/template-browser/importer";
import { getTemplateFieldFamilyEditorControlOrderV2, resolveTemplateFieldFamilySelectionV2, resolveTemplateFieldFamilyVariantV2 } from "@sleinity/template-core/family";
import { InMemoryTemplateSessionRepositoryV2 } from "@sleinity/template-browser/persistence";
import { createTemplateSessionV2, createTemplateFieldFamilySessionV2 } from "@sleinity/template-browser/session";
import { loadManifest, resolveFixture } from "../fidelity/core.mjs";
import { selectFamilyProbeFixtures, withFamilyProbeImports } from "./sdk-061-family-profile.mjs";

const args = process.argv.slice(2).filter(arg => arg !== "--");
if (args.length && (args.length !== 2 || args[0] !== "--profile")) throw new Error("Usage: verify-sdk-061-family-host.mjs [--profile sdk-061|historical-family-061]");
const profile = args[1] ?? "sdk-061";
const manifest = loadManifest();
const fixtures = selectFamilyProbeFixtures(manifest, profile);
const sessions = [];
try {
  await withFamilyProbeImports(fixtures, async fixture => {
    const bytes = readFileSync(resolveFixture(manifest, fixture));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), fixture.zipSha256);
    const result = await runTemplatePackageImportPipelineV2({ format: "zip", sourceId: fixture.id, sourceName: fixture.filename,
      buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), fontRegistry: null });
    // Ownership is released here if evidence validation throws before the result is handed off.
    try {
      const preview = result.importEvidence?.previewBlob;
      if (preview) assert.equal(createHash("sha256").update(Buffer.from(await preview.arrayBuffer())).digest("hex"), fixture.embeddedPreview.sha256);
      if (result.status === "ready") assert(preview, `${fixture.id}: ready import must retain preview evidence`);
      return result;
    } catch (error) { result.dispose(); throw error; }
  }, async sources => {
    const repository = new InMemoryTemplateSessionRepositoryV2();
    const options = { single: { repository }, family: { repository } };
    const assembled = appendTemplateSourcesV2(null, [], sources, "SDK 0.6.1 Family", {}, options);
    sessions.push(assembled);
    assert.equal(assembled.getSnapshot().family.variants.length, fixtures.length);
    const configured = structuredClone(assembled.getSnapshot().family);
    const assignments = id => profile === "sdk-061" ? { design: id } : {
      orientation: id.includes("landscape") ? "landscape" : "portrait", color: id.endsWith("gray") ? "gray" : "pink",
    };
    configured.variantGroups = profile === "sdk-061"
      ? [{ id: "design", title: "Design", options: sources.map(source => ({ id: source.id, title: source.name })) }]
      : [
        { id: "orientation", title: "Orientation", options: [{ id: "landscape", title: "Landscape" }, { id: "portrait", title: "Portrait" }] },
        { id: "color", title: "Color", options: [{ id: "gray", title: "Gray" }, { id: "pink", title: "Pink" }] },
      ];
    configured.variants.forEach(variant => { variant.groupAssignments = assignments(variant.id); });
    configured.editorControlOrder = getTemplateFieldFamilyEditorControlOrderV2(configured);
    const selected = mutateTemplateFamilyV2(assembled, sources, { type: "selection-metadata", family: configured }, { session: options.family });
    sessions.push(selected.session);
    for (const source of sources) {
      const family = selected.session.getSnapshot().family;
      const resolution = resolveTemplateFieldFamilySelectionV2(family, { groupSelections: assignments(source.id) });
      assert.equal(resolution.status, "resolved", `${source.id} must resolve uniquely`);
      assert.equal(resolution.variantId, source.id);
      if (profile === "sdk-061") selected.session.selectOption("design", source.id);
      else selected.session.selectVariant(resolution.variantId);
      const snapshot = selected.session.getSnapshot();
      assert.equal(snapshot.selectedVariantId, source.id);
      const effective = resolveTemplateFieldFamilyVariantV2(family, source.id).packageValue;
      assert.deepEqual(effective.editableFields, source.packageValue.editableFields, `${source.id}: imported defaults/configuration/bindings must survive assembly`);
      // Family control order is intentionally shared, unlike standalone source order.
      assert.deepEqual(family.variants.find(variant => variant.id === source.id).packageValue.editableFieldOrder, source.packageValue.editableFieldOrder);
      assert.deepEqual(effective.editableFieldOrder, family.editableFieldOrder.filter(id => source.packageValue.editableFields.some(field => field.id === id)));

      const standalone = createTemplateSessionV2(); sessions.push(standalone);
      const single = standalone.load(source.packageValue);
      assert.deepEqual(snapshot.workingPackage, { ...single.workingPackage, editableFieldOrder: effective.editableFieldOrder }, `${source.id}: initial standalone materialization must match`);
      assert.deepEqual(snapshot.rendererPackage, single.rendererPackage, `${source.id}: renderer input must match`);
      const saved = await selected.session.save(); assert(saved.id);
      const restored = createTemplateFieldFamilySessionV2({ repository }); sessions.push(restored);
      const reloaded = await restored.loadSaved(saved.id);
      assert.equal(reloaded.selectedVariantId, source.id);
      assert.deepEqual(reloaded.family, family);
      assert.deepEqual(reloaded.contentState, snapshot.contentState);
      assert.deepEqual(reloaded.workingPackage, snapshot.workingPackage);
      assert.deepEqual(reloaded.sessionAssets, snapshot.sessionAssets);
    }
    // Dispose session leases before relinquishing import ownership.
    sessions.forEach(session => session.dispose()); sessions.length = 0;
    console.log(`SDK 0.6.1 public Family host (${profile}): ${sources.length} exact sources, ${profile === "sdk-061" ? "one design selector" : "historical orientation/color matrix"}, configuration/defaults, standalone materialization and save/reload passed.`);
  });
} catch (error) {
  console.error(`[sdk-061-family:${profile}] ${error instanceof Error ? error.stack : String(error)}`);
  process.exitCode = 1;
} finally { sessions.forEach(session => session.dispose()); }

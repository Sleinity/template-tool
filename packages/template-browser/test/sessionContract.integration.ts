import { assert, equal } from "./sessionContract.fixtures";
import { runTemplatePackageImportPipelineV2 } from "../src/import/runTemplatePackageImportPipelineV2";
import { createTemplateFieldFamilyFromSourcesV2 } from "../src/import/templateSourceAssemblyV2";
import { createTemplateSessionV2 } from "../src/session/templateSessionV2";
import { createTemplateFieldFamilySessionV2 } from "../src/session/templateFieldFamilySessionV2";
import { InMemoryTemplateSessionRepositoryV2 } from "../src/persistence/v2SessionRepositories";
import { adaptSingleSession, adaptFamilySession } from "../src/internal/sessionContract/adapt";
import { createSingleSessionSnapshotReader, createFamilySessionSnapshotReader } from "../src/session-internal";
import type { InternalSessionAdapter } from "../src/internal/sessionContract/types";

type Counts = Record<string, number>;
const counters = globalThis as typeof globalThis & { __sessionAuthorityCounts: Counts };
function resetCounts() { counters.__sessionAuthorityCounts = Object.fromEntries(["parse", "validate", "mutation", "materializeSingle", "materializeFamily", "rendererProjection", "resolvedTree", "captureSingle", "captureFamily"].map(name => [name, 0])); }
function measure<T>(action: () => T) { resetCounts(); const start = performance.now(), result = action(); return { result, milliseconds: performance.now() - start, calls: { ...counters.__sessionAuthorityCounts } }; }

export async function verifySessionFixture(buffer: ArrayBuffer, filename: string, fixtureId: string) {
  resetCounts();
  const imported = await runTemplatePackageImportPipelineV2({ sourceId: fixtureId, format: "zip", buffer, sourceName: filename, fontRegistry: null });
  assert(imported.status === "ready" && imported.package, "Exact fixture enters its current canonical workflow.");
  const source = imported.package;
  const family = createTemplateFieldFamilyFromSourcesV2([source], `Contract ${fixtureId}`);
  const rows = [];
  try { for (const kind of ["single", "family"] as const) {
    const pairs: InternalSessionAdapter[] = [0, 1].map(() => {
      const repository = new InMemoryTemplateSessionRepositoryV2();
      return kind === "single" ? adaptSingleSession(createTemplateSessionV2({ repository })) : adaptFamilySession(createTemplateFieldFamilySessionV2({ repository }));
    });
    try {
      const load = (pair: InternalSessionAdapter) => pair.kind === "single" ? pair.authority.load(source) : pair.authority.load(family);
      const loads = pairs.map(pair => measure(() => load(pair)));
      equal(loads[0].calls, loads[1].calls);
      equal(pairs[0].authority.getSnapshot(), pairs[1].getSnapshot().nativeSnapshot);
      const reads = pairs.map((pair, index) => measure(() => { for (let i = 0; i < 10000; i++) index ? pair.getSnapshot() : pair.authority.getSnapshot(); }));
      assert(Object.values(reads[1].calls).every(value => value === 0), "Snapshot reads call zero canonical/renderer/persistence authorities.");
      const reader = pairs[1].kind === "single" ? createSingleSessionSnapshotReader(pairs[1].authority) : createFamilySessionSnapshotReader(pairs[1].authority);
      const readerReads = measure(() => { for (let i = 0; i < 10000; i++) reader.getSnapshot(); });
      assert(Object.values(readerReads.calls).every(value => value === 0), "Production reader invokes no canonical/renderer/persistence authorities.");
      assert(reader.getSnapshot().nativeSnapshot === pairs[1].authority.getSnapshot(), "Production reader preserves exact snapshot identity.");
      const edits = pairs.map((pair, index) => measure(() => {
        for (const field of index ? pair.getFieldControllers() : pair.authority.getFieldControllers()) {
          if (field.type === "text") assert(field.setValue("Updated text").accepted);
          else if (field.type === "textarea") assert(field.setValue("Updated paragraph").accepted);
          else if (field.type === "number") assert(field.setValue(42).accepted);
          else if (field.type === "date") assert(field.setValue("2027-04-16").accepted);
          else if (field.type === "boolean") assert(field.setValue(!field.value).accepted);
          else if (field.type === "color") assert(field.setValue("#123456").accepted);
        }
      }));
      equal(edits[0].calls, edits[1].calls);
      equal(pairs[0].authority.getSnapshot(), pairs[1].getSnapshot().nativeSnapshot);
      const saveCaptures = pairs.map(pair => measure(() => pair.kind === "single" ? pair.authority.save({ id: "contract-save" }) : pair.authority.save()));
      equal(saveCaptures[0].calls, saveCaptures[1].calls);
      const saved = await Promise.all(saveCaptures.map(item => item.result));
      const restore = [];
      for (const [index, pair] of pairs.entries()) {
        resetCounts(); const started = performance.now(); await pair.authority.loadSaved(saved[index].id);
        restore.push({ milliseconds: performance.now() - started, calls: { ...counters.__sessionAuthorityCounts } });
      }
      equal(restore[0].calls, restore[1].calls);
      equal(pairs[0].authority.getSnapshot().contentState, pairs[1].getSnapshot().contentState);
      equal(pairs[0].authority.getSnapshot().workingPackage?.nodes, pairs[1].getSnapshot().workingPackage?.nodes);
      // URL allocation is session-local. Verify binary identity instead of deleting URL evidence.
      const descriptors = pairs.map(pair => Object.values(pair.getSnapshot().workingPackage!.assets));
      for (const asset of descriptors[0]) {
        const peer = descriptors[1].find(item => item.id === asset.id)!;
        assert(peer); const { stableUrl, ...data } = asset, { stableUrl: peerUrl, ...peerData } = peer;
        equal(data, peerData);
        if (stableUrl && peerUrl && stableUrl !== peerUrl) equal(new Uint8Array(await (await fetch(stableUrl)).arrayBuffer()), new Uint8Array(await (await fetch(peerUrl)).arrayBuffer()), "Independently allocated URL bytes match.");
      }
      for (const pair of pairs) for (const field of pair.getFieldControllers()) assert(field.reset().accepted);
      equal(pairs[0].authority.getSnapshot().workingPackage?.nodes, pairs[1].getSnapshot().workingPackage?.nodes);
      for (const field of source.editableFields.filter(field => field.type === "color")) {
        const nodeId = field.binding.nodeId, index = field.binding.sourceIndex;
        equal(pairs[1].getSnapshot().workingPackage!.nodes[nodeId].appearance.fills[index], source.nodes[nodeId].appearance.fills[index], "Reset retains ZIP numeric paints.");
      }
      const output = (items: Array<{ milliseconds: number; calls: Counts }>) => ({
        direct: { milliseconds: items[0].milliseconds, calls: items[0].calls },
        adapter: { milliseconds: items[1].milliseconds, calls: items[1].calls },
        overheadMs: items[1].milliseconds - items[0].milliseconds,
      });
      rows.push({ kind, fixtureId, fieldTypes: [...new Set(source.editableFields.map(field => field.type))],
        load: output(loads), snapshot10000: output(reads), snapshotReader10000: { milliseconds: readerReads.milliseconds, calls: readerReads.calls, overheadVsDirectMs: readerReads.milliseconds - reads[0].milliseconds }, acceptedEdits: output(edits), saveCapture: output(saveCaptures), restore: output(restore) });
    } finally { pairs.forEach(pair => pair.authority.dispose()); }
  } } finally { imported.dispose(); }
  return rows;
}

export async function verifySessionFamily(inputs: Array<{ buffer: ArrayBuffer; filename: string; id: string }>) {
  resetCounts();
  const imports: Awaited<ReturnType<typeof runTemplatePackageImportPipelineV2>>[] = [];
  const sessions = [createTemplateFieldFamilySessionV2(), createTemplateFieldFamilySessionV2()];
  const adapter = adaptFamilySession(sessions[1]);
  try {
    for (const input of inputs) {
      const result = await runTemplatePackageImportPipelineV2({ sourceId: input.id, format: "zip", buffer: input.buffer, sourceName: input.filename, fontRegistry: null });
      imports.push(result); assert(result.status === "ready" && result.package, "Family uses complete ready source evidence.");
    }
    const family = createTemplateFieldFamilyFromSourcesV2(imports.map(result => result.package!), "Three-export session contract");
    sessions.forEach(session => session.load(family));
    const selections = [];
    for (const variant of family.variants) {
      const direct = measure(() => sessions[0].selectVariant(variant.id));
      const forwarded = measure(() => adapter.authority.selectVariant(variant.id));
      equal(direct.result, forwarded.result, "Complete selected native snapshot"); equal(direct.calls, forwarded.calls);
      assert(adapter.getSnapshot().selectedVariantId === variant.id, "Existing variant identity is preserved.");
      assert(adapter.getSnapshot().configuredPackage === sessions[1].getSnapshot().effectivePackage, "Configured selected package remains native.");
      selections.push({ variantId: variant.id, calls: direct.calls });
    }
    return { variantIds: family.variants.map(variant => variant.id), sourcePackageIds: family.variants.map(variant => variant.packageValue.packageId), selections, equivalent: true };
  } finally { sessions.forEach(session => session.dispose()); imports.forEach(result => result.dispose()); }
}

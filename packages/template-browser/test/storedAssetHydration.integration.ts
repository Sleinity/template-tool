import { createTemplateSessionV2 } from "../src/session/templateSessionV2";
import { createTemplateFieldFamilySessionV2 } from "../src/session/templateFieldFamilySessionV2";
import { createTemplateFieldFamilyFromSourcesV2 } from "../src/import/templateSourceAssemblyV2";
import { InMemoryTemplateSessionRepositoryV2 } from "../src/persistence/v2SessionRepositories";
import { sessionAssetUrlLeases, retainSessionAssetUrls } from "../src/session/sessionAssetUrlLeases";
import { runTemplatePackageImportPipelineV2 } from "../src/import/runTemplatePackageImportPipelineV2";
import { assert, deferred, equal, v2Package } from "./sessionContract.fixtures";
import type { SavedTemplateSessionRecordV2, SavedTemplateFieldFamilyRecordV3 } from "../src/persistence/types";

type Kind = "single" | "family";
type Session = ReturnType<typeof createTemplateSessionV2> | ReturnType<typeof createTemplateFieldFamilySessionV2>;
type RecordValue = SavedTemplateSessionRecordV2 | SavedTemplateFieldFamilyRecordV3;
const copy = <T>(value: T): T => structuredClone(value);
const scenarios = ["success", "equal-hash", "collision", "missing-blob", "missing-nonblob", "embedded", "read-failure", "allocation-failure", "reset", "dispose", "replacement", "concurrent", "repository-failure", "shared-session", "save-pin", "field-reset"] as const;

/** Captures native checkpoints without deleting revisions, diagnostics or optional properties. */
export async function verifyStoredAssetHydration(expectRepairs = true) {
  const transcripts: Array<{ kind: Kind; scenario: string; events: unknown[] }> = [];
  for (const kind of ["single", "family"] as const) for (const scenario of scenarios) {
    const events: unknown[] = [], pkg = v2Package();
    const family = createTemplateFieldFamilyFromSourcesV2([pkg, pkg], "Hydration audit");
    const repository = new InMemoryTemplateSessionRepositoryV2();
    const author: Session = kind === "single" ? createTemplateSessionV2({ repository }) : createTemplateFieldFamilySessionV2({ repository });
    if (kind === "single") (author as ReturnType<typeof createTemplateSessionV2>).load(pkg);
    else (author as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(family);
    const record = copy(await author.save()); author.dispose();
    const sourceMaps = "basePackage" in record ? [record.basePackage.assets] : record.family.variants.map(variant => variant.packageValue.assets);
    const hero = pkg.editableFields.find(field => field.type === "image")!;
    assert(hero.type === "image" && hero.defaultValue.assetId);
    const sourceId = hero.defaultValue.assetId;
    for (const assets of sourceMaps) {
      const asset = assets[sourceId];
      delete asset.dataUrl; delete asset.data; delete asset.svgString; delete asset.stableUrl;
      asset.hash = "1".repeat(64); asset.source = "stored"; asset.storageKey = `sha256:${asset.hash}`;
      if (scenario === "missing-blob") asset.stableUrl = "blob:obsolete-session";
      if (scenario === "missing-nonblob") asset.stableUrl = "https://example.invalid/opaque.png";
      if (scenario === "embedded") { asset.dataUrl = "data:image/png;base64,AQID"; asset.stableUrl = "blob:embedded-authority"; }
    }
    if (!["missing-blob", "missing-nonblob", "embedded", "repository-failure"].includes(scenario)) {
      const assetId = scenario === "collision" || scenario === "field-reset" ? sourceId : "replacement:hydration";
      record.sessionAssets[assetId] = { ...sourceMaps[0][sourceId], id: assetId, hash: scenario === "equal-hash" ? "1".repeat(64) : "2".repeat(64) };
      record.sessionAssets[assetId].storageKey = `sha256:${record.sessionAssets[assetId].hash}`;
      record.contentState.values[hero.id] = { value: { assetId, placement: { mode: "fill" } } };
    } else if (scenario.startsWith("missing")) record.contentState.values[hero.id] = { value: { assetId: sourceId, placement: { mode: "fill" } } };
    const originalRecord = copy(record);
    const recordError = new Error("controlled record lookup failure"), readError = new Error("controlled second asset failure"), allocationError = new Error("controlled allocation failure");
    repository.getTemplateSessionV2 = async () => { events.push({ event: "record-read" }); if (scenario === "repository-failure") throw recordError; return record as SavedTemplateSessionRecordV2; };
    repository.getTemplateFieldFamilyV3 = async () => { events.push({ event: "record-read" }); if (scenario === "repository-failure") throw recordError; return record as SavedTemplateFieldFamilyRecordV3; };
    const secondStarted = deferred<void>(), secondRead = deferred<void>(); let reads = 0;
    repository.getManagedAsset = async hash => {
      const index = ++reads; events.push({ event: "asset-read", hash });
      if (["reset", "dispose", "replacement", "concurrent"].includes(scenario) && index === 2) { secondStarted.resolve(); await secondRead.promise; }
      if (scenario === "read-failure" && index === 2) throw readError;
      if (scenario.startsWith("missing")) return null;
      return { hash, blob: new Blob([hash], { type: "image/png" }), mimeType: "image/png", sizeBytes: hash.length, createdAt: "2026-10-09T00:00:00.000Z" };
    };
    const prefix = `blob:hydration-${kind}-${scenario}-`, created: string[] = [], revoked: string[] = [];
    const objectUrls = {
      create: () => { if (scenario === "allocation-failure" && created.length === 1) throw allocationError; const url = `${prefix}${created.length}`; created.push(url); events.push({ event: "create", url }); return url; },
      revoke: (url: string) => { revoked.push(url); events.push({ event: "revoke", url }); },
    };
    const session: Session = kind === "single" ? createTemplateSessionV2({ repository, objectUrls }) : createTemplateFieldFamilySessionV2({ repository, objectUrls });
    const leases = () => [...sessionAssetUrlLeases].filter(([url]) => url.startsWith(prefix)).map(([url, value]) => ({ url, count: value.count }));
    const checkpoint = (name: string) => events.push({ event: "checkpoint", name, snapshot: copy(session.getSnapshot()), leases: leases() });
    const stop = session.subscribe(() => events.push({ event: "notification", snapshot: copy(session.getSnapshot()), leases: leases() }));
    const load = () => kind === "single" ? (session as ReturnType<typeof createTemplateSessionV2>).load(pkg) : (session as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(family);
    const accepted = load(); checkpoint("accepted-before-restore");
    let receiver: Session | undefined;
    try {
      const pending = session.loadSaved(record.id).then(() => ({ error: null as Error | null }), error => ({ error }));
      if (["reset", "dispose", "replacement", "concurrent"].includes(scenario)) {
        await secondStarted.promise; checkpoint("partial-acquisition");
        if (scenario === "reset") session.reset();
        else if (scenario === "dispose") session.dispose();
        else if (scenario === "replacement") load();
        else { const newer = session.loadSaved(record.id); await newer; }
        const current = session.getSnapshot(); secondRead.resolve(); await pending;
        assert(session.getSnapshot() === current, "Stale hydration cannot publish.");
        if (scenario !== "concurrent") assert(created.length === 1 && revoked.length === 1, "No late allocation after stale read.");
      } else {
        const result = await pending;
        events.push({ event: "restore-outcome", error: result.error ? { name: result.error.name, message: result.error.message, original: result.error === recordError } : null });
        if (scenario === "repository-failure") assert(kind === "single" ? session.getSnapshot().error?.message === recordError.message : result.error === recordError, "Native error policies remain distinct.");
        if (scenario === "read-failure" || scenario === "allocation-failure") {
          const s = session.getSnapshot(); assert(("basePackage" in s ? s.basePackage : s.family) === ("basePackage" in accepted ? accepted.basePackage : accepted.family), "Failed restore retains accepted definition.");
          assert(created.length === revoked.length && s.error?.message === (scenario === "read-failure" ? readError.message : allocationError.message));
        }
      }
      checkpoint("restored");
      if (scenario === "collision" || scenario === "field-reset") assert(session.getSnapshot().status === "ready", "Colliding IDs remain valid canonical inputs.");
      if (scenario === "equal-hash") assert(reads === 1 && created.length === 1, "One read/allocation per hash, including Family variants.");
      if (scenario === "embedded") assert(reads === 0 && created.length === 0, "Embedded descriptors retain their authority without hydration.");
      if (scenario === "missing-blob") {
        const s = session.getSnapshot(), assets = "basePackage" in s ? s.basePackage!.assets : s.family!.variants[0].packageValue.assets;
        assert((assets[sourceId].stableUrl === undefined) === (kind === "family" || expectRepairs), "Only the intended stale blob repair changes this descriptor.");
        assert(s.readiness.assets === (kind === "family" || expectRepairs ? "blocked" : "ready"));
      }
      if (scenario === "missing-nonblob") {
        const s = session.getSnapshot(), assets = "basePackage" in s ? s.basePackage!.assets : s.family!.variants[0].packageValue.assets;
        assert(assets[sourceId].stableUrl === "https://example.invalid/opaque.png", "Opaque non-blob URLs are preserved.");
      }
      if (scenario === "shared-session") {
        const s = session.getSnapshot();
        receiver = kind === "single" ? createTemplateSessionV2({ objectUrls }) : createTemplateFieldFamilySessionV2({ objectUrls });
        if ("basePackage" in s) (receiver as ReturnType<typeof createTemplateSessionV2>).load({ ...s.basePackage!, assets: { ...s.basePackage!.assets, ...s.sessionAssets } }, s.contentState!);
        else (receiver as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(s.family!, { contentState: s.contentState!, sessionAssets: s.sessionAssets, selectedVariantId: s.selectedVariantId! });
        checkpoint("shared-owner"); session.dispose(); assert(revoked.length === 0, "Receiving session retains source and replacement URLs."); receiver.dispose();
      }
      if (scenario === "save-pin") {
        const releasePin = retainSessionAssetUrls(leases().map(lease => lease.url)); session.dispose();
        assert(revoked.length === 0, "Captured save pin survives disposal."); checkpoint("save-pinned"); releasePin(); releasePin();
      }
      if (scenario === "field-reset") {
        const controller = session.getFieldControllers().find(field => field.id === hero.id)!; controller.reset(); checkpoint("field-reset");
        const s = session.getSnapshot(), base = "basePackage" in s ? s.basePackage! : s.effectivePackage!;
        assert(!revoked.includes(base.assets[sourceId].stableUrl!), "Reset cannot revoke a retained source URL.");
        if (kind === "family") { (session as ReturnType<typeof createTemplateFieldFamilySessionV2>).selectVariant(family.variants[1].id); checkpoint("selected-after-reset"); }
      }
      session.dispose(); session.dispose(); checkpoint("disposed");
      if (kind === "single" && !expectRepairs && ["collision", "field-reset"].includes(scenario)) assert(created.length === revoked.length + 1, "Original collision leak is reproduced.");
      else assert(created.length === revoked.length && new Set(revoked).size === revoked.length, "Final ownership releases each allocation exactly once.");
      equal(record, originalRecord, "Unmutated repository record");
      transcripts.push({ kind, scenario, events });
    } catch (cause) { throw new Error(`${kind}/${scenario}: ${cause instanceof Error ? cause.message : cause}`, { cause }); } finally {
      stop(); session.dispose(); receiver?.dispose();
      // Original leak reproduction is cleaned up outside the recorded native transcript.
      for (const url of created) if (!revoked.includes(url)) objectUrls.revoke(url);
      assert(leases().length === 0, "No registry entries escape a scenario.");
    }
  }
  return transcripts;
}

/** Exact exports; repetitions are synthetic, never new certified fixtures. */
export async function measureStoredAssetHydration(bytes: ArrayBuffer, filename: string, sourceId: string) {
  const imported = await runTemplatePackageImportPipelineV2({ buffer: bytes, sourceName: filename, sourceId, format: "zip", fontRegistry: null });
  assert(imported.status === "ready" && imported.package);
  const measurements: unknown[] = [];
  try {
    for (const kind of ["single", "family"] as const) for (const repetitions of [1, 5, 20]) for (const mode of ["success", "partial-failure"] as const) {
      const repository = new InMemoryTemplateSessionRepositoryV2(), pkg = imported.package;
      const author: Session = kind === "single" ? createTemplateSessionV2({ repository }) : createTemplateFieldFamilySessionV2({ repository });
      if (kind === "single") (author as ReturnType<typeof createTemplateSessionV2>).load(pkg);
      else (author as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(createTemplateFieldFamilyFromSourcesV2([pkg], "Measurement"));
      const record = copy(await author.save()); author.dispose();
      const maps = "basePackage" in record ? [record.basePackage.assets] : record.family.variants.map(v => v.packageValue.assets);
      let hashIndex = 0;
      for (const assets of [...maps, record.sessionAssets]) for (const asset of Object.values(assets)) {
        if (asset.dataUrl || asset.data || asset.svgString) continue;
        asset.hash ??= String(++hashIndex).padStart(64, "0");
      }
      for (let i = 0; i < repetitions; i++) record.sessionAssets[`synthetic:${i}`] = { id: `synthetic:${i}`, type: "image", source: "stored", hash: "a".repeat(64), mimeType: "image/png", width: 1, height: 1 };
      repository.getTemplateSessionV2 = async () => record as SavedTemplateSessionRecordV2;
      repository.getTemplateFieldFamilyV3 = async () => record as SavedTemplateFieldFamilyRecordV3;
      let reads = 0, allocations = 0, releases = 0, readMs = 0, allocationMs = 0, releaseMs = 0;
      repository.getManagedAsset = async hash => { const start = performance.now(); reads++; if (mode === "partial-failure" && reads === 2) { readMs += performance.now() - start; throw new Error("measured partial hydration failure"); } const result = { hash, blob: new Blob([hash]), mimeType: "image/png", sizeBytes: hash.length, createdAt: "2026-10-09T00:00:00.000Z" }; readMs += performance.now() - start; return result; };
      const objectUrls = { create: () => { const start = performance.now(); const url = `blob:measurement-${allocations++}`; allocationMs += performance.now() - start; return url; }, revoke: () => { const start = performance.now(); releases++; releaseMs += performance.now() - start; } };
      const session: Session = kind === "single" ? createTemplateSessionV2({ repository, objectUrls }) : createTemplateFieldFamilySessionV2({ repository, objectUrls });
      const transfer = { ms: 0, count: 0, temporaryCleanupMs: 0, temporaryCleanupCount: 0 };
      (globalThis as typeof globalThis & { __hydrationTransferMeasure: typeof transfer }).__hydrationTransferMeasure = transfer;
      const start = performance.now(); await session.loadSaved(record.id); const restoreMs = performance.now() - start; session.dispose();
      assert(allocations === releases);
      measurements.push({ kind, repetitions, mode, reads, allocations, releases, restoreMs, readMs, allocationMs, releaseMs, transferMs: transfer.ms, transferCount: transfer.count, temporaryCleanupMs: transfer.temporaryCleanupMs, temporaryCleanupCount: transfer.temporaryCleanupCount });
    }
  } finally { imported.dispose(); }
  return measurements;
}

/** Live accepted resources survive failed candidate hydration, not merely definitions. */
export async function verifyHydrationAcceptedOwnership() {
  const rows: unknown[] = [];
  for (const kind of ["single", "family"] as const) for (const ending of ["failure", "reset", "dispose", "replacement"] as const) {
    const events: unknown[] = [], pkg = v2Package(), family = createTemplateFieldFamilyFromSourcesV2([pkg], "Accepted owner");
    const repository = new InMemoryTemplateSessionRepositoryV2();
    const donor: Session = kind === "single" ? createTemplateSessionV2({ repository }) : createTemplateFieldFamilySessionV2({ repository });
    if (kind === "single") (donor as ReturnType<typeof createTemplateSessionV2>).load(pkg); else (donor as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(family);
    const record = copy(await donor.save()); donor.dispose();
    const assets = "basePackage" in record ? record.basePackage.assets : record.family.variants[0].packageValue.assets;
    Object.values(assets).filter(asset => asset.type === "image").slice(0, 2).forEach((asset, i) => { delete asset.dataUrl; delete asset.data; delete asset.svgString; delete asset.stableUrl; asset.hash = String(i + 1).repeat(64); asset.source = "stored"; });
    repository.getTemplateSessionV2 = async () => record as SavedTemplateSessionRecordV2; repository.getTemplateFieldFamilyV3 = async () => record as SavedTemplateFieldFamilyRecordV3;
    const prefix = `blob:accepted-${kind}-${ending}-`, created: string[] = [], revoked: string[] = [];
    const objectUrls = { create: () => { const url = `${prefix}${created.length}`; created.push(url); events.push({ event: "create", url }); return url; }, revoke: (url: string) => { revoked.push(url); events.push({ event: "revoke", url }); } };
    const session: Session = kind === "single" ? createTemplateSessionV2({ repository, objectUrls }) : createTemplateFieldFamilySessionV2({ repository, objectUrls });
    const load = () => kind === "single" ? (session as ReturnType<typeof createTemplateSessionV2>).load(pkg) : (session as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(family);
    load(); const hero = session.getFieldControllers().find(field => field.type === "image")!; assert(hero.type === "image");
    assert((await hero.replaceImage({ blob: new Blob(["accepted"], { type: "image/png" }), width: 1, height: 1 })).accepted);
    const acceptedUrl = created[0], accepted = session.getSnapshot();
    const stop = session.subscribe(() => events.push({ event: "notification", snapshot: copy(session.getSnapshot()) }));
    const second = deferred<void>(), started = deferred<void>(); let reads = 0;
    repository.getManagedAsset = async hash => { events.push({ event: "read", hash }); if (++reads === 2) { started.resolve(); await second.promise; if (ending === "failure") throw new Error("candidate hydration rejected"); } return { hash, blob: new Blob([hash]), mimeType: "image/png", sizeBytes: hash.length, createdAt: "2026-10-09T00:00:00.000Z" }; };
    try {
      const pending = session.loadSaved(record.id); await started.promise;
      assert(!revoked.includes(acceptedUrl), "Pending candidate cannot release accepted resources.");
      if (ending === "reset") session.reset(); else if (ending === "dispose") session.dispose(); else if (ending === "replacement") load();
      const beforeCompletion = session.getSnapshot(); second.resolve(); await pending;
      if (ending === "failure") {
        const current = session.getSnapshot();
        assert(current.contentState === accepted.contentState && current.sessionAssets === accepted.sessionAssets);
        assert(!revoked.includes(acceptedUrl) && sessionAssetUrlLeases.get(acceptedUrl)?.count === 1, "Failed restore retains the accepted image lease.");
      } else assert(session.getSnapshot() === beforeCompletion, "Stale candidate does not publish.");
      assert(created.length === 2 && revoked.includes(created[1]), "Partial temporary ownership is released without late allocation.");
      events.push({ event: "after-restore", snapshot: copy(session.getSnapshot()), acceptedLeaseCount: sessionAssetUrlLeases.get(acceptedUrl)?.count ?? 0 });
      session.dispose(); assert(created.length === revoked.length && new Set(revoked).size === revoked.length);
      rows.push({ kind, ending, events });
    } finally { stop(); session.dispose(); }
  }
  return rows;
}

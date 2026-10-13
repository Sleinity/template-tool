import { normalizeTemplatePackageV1ToV2, type TemplatePackageV1 } from "@sleinity/template-core";
import { createTemplateSessionV2, createTemplateFieldFamilySessionV2 } from "@sleinity/template-browser/session";
import { createTemplateFieldFamilyFromSourcesV2 } from "@sleinity/template-browser/importer";
import { getTemplateSessionRepositoryV2, getTemplateFieldFamilyRepositoryV3, getTemplateRecoveryRepository, TemplateStorageBlockedError, openTemplatePlatformDatabase } from "@sleinity/template-browser/persistence";
import { TemplateStorageBlockedError as RootBlockedError } from "@sleinity/template-browser";
import { getManagedFontRegistry, uploadExactManagedFontForRequirement, autoLinkManagedFonts, createFontRequirementKey } from "@sleinity/template-browser/fonts";

export async function runBlockedHost(raw: TemplatePackageV1, fontBytes: number[], kind: "single" | "family") {
  const events: Array<{ event: string; ms: number }> = [];
  const log = (event: string) => events.push({ event, ms: performance.now() });
  const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); };
  assert(RootBlockedError === TemplateStorageBlockedError, "Root and persistence expose the same error type");
  const nativeOpen = indexedDB.open.bind(indexedDB);
  const holder = await new Promise<IDBDatabase>((resolve, reject) => { const r = nativeOpen("template-package-platform", 4); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  holder.onversionchange = () => log("blocker-version-change");
  let opens = 0, writes = 0, latestRequest!: IDBOpenDBRequest, blockedResolve!: () => void;
  const blocked = new Promise<void>(resolve => { blockedResolve = resolve; });
  indexedDB.open = ((...args: Parameters<IDBFactory["open"]>) => { opens++; const r = nativeOpen(...args); latestRequest = r; for (const name of ["upgradeneeded", "blocked", "success", "error"]) r.addEventListener(name, () => { log(name); if (name === "blocked") blockedResolve(); }); return r; }) as IDBFactory["open"];
  const transaction = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function(...args: Parameters<IDBDatabase["transaction"]>) { if (args[1] === "readwrite") writes++; return transaction.apply(this, args); };
  const base = normalizeTemplatePackageV1ToV2(raw).package!;
  const second = structuredClone(base); second.packageId += "-second";
  const session = kind === "single" ? createTemplateSessionV2() : createTemplateFieldFamilySessionV2();
  const restore = kind === "single" ? createTemplateSessionV2() : createTemplateFieldFamilySessionV2();
  if ("selectVariant" in session) session.load(createTemplateFieldFamilyFromSourcesV2([base, second], "Blocked host")); else session.load(base);
  let notifications = 0; const stop = session.subscribe(() => notifications++);
  const repository = kind === "single" ? getTemplateSessionRepositoryV2() : getTemplateFieldFamilyRepositoryV3();
  const recovery = getTemplateRecoveryRepository(), key = { kind, templateId: "blocked-host" }, lease = { key, token: "unaccepted" };
  const fontSource = structuredClone(raw);
  fontSource.fontRequirements = [{ id: "rethink-600", family: "Rethink Sans", postScriptName: "RethinkSans-SemiBold", style: "SemiBold", cssStyle: "normal", weight: 600, usedBy: ["headline"], characters: "Host", editable: true, mixedStyle: false, source: "figma", availableInFigma: true }];
  const registry = getManagedFontRegistry()!;
  const fontKey = createFontRequirementKey(fontSource.fontRequirements![0]);
  const settled: Array<{ operation: string; outcome: string; code?: string }> = [];
  const expectBlocked = async (operation: string, task: Promise<unknown>) => { try { await task; throw new Error(`${operation} unexpectedly succeeded`); } catch (error) { assert(error instanceof TemplateStorageBlockedError, `${operation} lost structured blocked error: ${String(error)}`); settled.push({ operation, outcome: "rejected", code: (error as TemplateStorageBlockedError).code }); } };
  const save1 = expectBlocked("save-first", session.save({ name: "First captured" }));
  const field = session.getFieldControllers().find(field => field.type === "text");
  assert(field?.type === "text" && field.setValue("Newer captured input").accepted, "Native edit accepted during blocked save");
  const save2 = expectBlocked("save-queued", session.save({ name: "Second captured" }));
  // Capturing does not require successful storage, so reuse the public record factory via an in-memory native session save.
  const { InMemoryTemplateSessionRepositoryV2 } = await import("@sleinity/template-browser/persistence");
  const memory = new InMemoryTemplateSessionRepositoryV2();
  const staging = kind === "single" ? createTemplateSessionV2({ repository: memory }) : createTemplateFieldFamilySessionV2({ repository: memory });
  if ("selectVariant" in staging) staging.load(createTemplateFieldFamilyFromSourcesV2([base, second], "Blocked recovery")); else staging.load(base);
  const payload = await staging.save(); staging.dispose();
  const tasks = [save1, save2,
    expectBlocked("asset-read", repository.getManagedAsset("missing")),
    expectBlocked("recovery-inspect", recovery.inspect(key)), expectBlocked("recovery-begin", recovery.begin(key, "fresh")),
    expectBlocked("recovery-save", recovery.save(lease, payload)), expectBlocked("recovery-complete", recovery.complete(lease)),
    expectBlocked("recovery-discard", recovery.discard(lease)), expectBlocked("recovery-ownership", recovery.isCurrent(lease)), expectBlocked("recovery-asset", recovery.getManagedAsset("missing")),
    expectBlocked("recovery-export-preflight", recovery.exportAndComplete(lease, async () => { throw new Error("Blocked storage must not invoke export"); })),
    expectBlocked("font-list", registry.listManagedFonts()), expectBlocked("font-record", registry.getManagedFont("missing")), expectBlocked("font-bytes", registry.getFontBlob("missing")),
    expectBlocked("font-mapping", registry.getMapping(fontKey)), expectBlocked("font-link", registry.linkRequirementToManagedFont(fontKey,"missing")), expectBlocked("font-unlink", registry.unlinkRequirement(fontKey)), expectBlocked("font-delete", registry.deleteManagedFont("missing")), expectBlocked("font-auto-link", autoLinkManagedFonts(fontSource, registry)),
    expectBlocked("font-upload", uploadExactManagedFontForRequirement(fontSource, "rethink-600", new Uint8Array(fontBytes).buffer, {registry,fileName:"rethink-sans-600.ttf"})),
    "selectVariant" in restore ? expectBlocked("family-restore", restore.loadSaved("missing")) : restore.loadSaved("missing").then(snapshot => { assert(snapshot.status === "blocked" && snapshot.error?.code === "saved-session-load-failed", "Single native restore outcome preserved"); settled.push({operation:"single-restore",outcome:"blocked-snapshot",code:snapshot.error?.code}); }),
  ];
  await blocked; await Promise.all(tasks); log("all-operations-settled");
  assert(opens === 1 && writes === 0, "One blocked open and no application writes");
  const before = { opens, writes, notifications, outcomes: settled };
  const ended = new Promise<void>(resolve => { latestRequest.addEventListener("success", () => resolve()); latestRequest.addEventListener("error", () => resolve()); });
  holder.close(); await ended;
  const record = await session.save({ name: "Retry latest" });
  const reopened = kind === "single" ? createTemplateSessionV2() : createTemplateFieldFamilySessionV2();
  await reopened.loadSaved(record.id); assert(reopened.getSnapshot().status === "ready", "Retry restores through fresh native candidate");
  const { lease: nextLease } = await recovery.begin(key, "fresh"); await recovery.save(nextLease, record); assert(await recovery.inspect(key), "Recovery save retry"); await recovery.complete(nextLease); assert(!await recovery.inspect(key), "Recovery cleanup retry");
  const uploaded = await uploadExactManagedFontForRequirement(fontSource, "rethink-600", new Uint8Array(fontBytes).buffer, {registry,fileName:"rethink-sans-600.ttf"});
  assert(uploaded.packageValue.fontRequirements?.[0].resolution?.match === "exact", "Font upload/link retry"); assert((await registry.listManagedFonts()).length === 1, "No duplicated font records");
  assert(opens === 2, "Successful operations share one retry connection");
  const db = await openTemplatePlatformDatabase(); const stores = [...db.objectStoreNames];
  stop(); session.dispose(); restore.dispose(); reopened.dispose(); db.close();
  return {kind,before,after:{opens,writes,notifications,stores},events};
}

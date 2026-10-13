import { createTemplateSessionV2, type ImageFieldControllerV2 } from "../src/session/templateSessionV2";
import { InMemoryTemplateSessionRepositoryV2 } from "../src/persistence/v2SessionRepositories";
import { assert, deferred, v2Package } from "./sessionContract.fixtures";

// A later storage failure must release URLs acquired earlier in the same restore.
{
  const repository = new InMemoryTemplateSessionRepositoryV2();
  const author = createTemplateSessionV2({ repository });
  author.load(v2Package());
  const record = structuredClone(await author.save());
  author.dispose();
  const assets = Object.values(record.basePackage.assets).filter(asset => asset.type === "image").slice(0, 2);
  assert(assets.length === 2, "Partial restore needs two stored source assets.");
  assets.forEach((asset, index) => {
    delete asset.dataUrl; delete asset.data; delete asset.stableUrl; delete asset.svgString;
    asset.hash = String(index + 1).repeat(64); asset.source = "stored";
    asset.storageKey = `sha256:${asset.hash}`;
  });
  repository.getTemplateSessionV2 = async () => record;
  let reads = 0;
  repository.getManagedAsset = async hash => {
    if (++reads === 2) throw new Error("second asset unavailable");
    return { hash, blob: new Blob(["source"], { type: "image/png" }), mimeType: "image/png", sizeBytes: 6, createdAt: "2026-10-08T00:00:00.000Z" };
  };
  const created: string[] = [], revoked: string[] = [];
  const session = createTemplateSessionV2({ repository, objectUrls: {
    create: () => { const url = `blob:partial-restore-${created.length}`; created.push(url); return url; },
    revoke: url => revoked.push(url),
  } });
  const accepted = session.load(v2Package()).basePackage;
  await session.loadSaved(record.id);
  assert(session.getSnapshot().basePackage === accepted, "Failed restore preserves accepted source ownership.");
  assert(session.getSnapshot().error?.message === "second asset unavailable", "Restore retains its original error message.");
  assert(created.length === 1 && revoked.length === 1, "Partial restore failure releases the acquired URL.");
  session.dispose();
  assert(revoked.length === 1, "Disposal cannot release an abandoned URL twice.");
}

for (const source of ["embedded", "blob"] as const) {
  const packageValue = v2Package();
  const hero = packageValue.editableFields.find(field => field.type === "image")!;
  packageValue.editableFields.push({ ...hero, id: "image:secondImage", binding: { kind: "image-content", nodeId: "58:87" } });
  packageValue.editableFieldOrder.push("image:secondImage");
  const repository = new InMemoryTemplateSessionRepositoryV2();
  const created: string[] = [], revoked: string[] = [];
  const session = createTemplateSessionV2({ repository, objectUrls: {
    create: blob => { const url = URL.createObjectURL(blob); created.push(url); return url; },
    revoke: url => { revoked.push(url); URL.revokeObjectURL(url); },
  } });
  session.load(packageValue);
  const images = () => session.getFieldControllers().filter((field): field is ImageFieldControllerV2 => field.type === "image");
  const bytes = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
  const input = source === "blob" ? { blob: bytes, width: 1, height: 1 }
    : { assetId: "shared-embedded", dataUrl: "data:image/png;base64,AQID", width: 1, height: 1 };
  for (const field of images()) assert((await field.replaceImage(input)).accepted, "Both image replacements are accepted.");
  const assetId = (session.getSnapshot().contentState!.values[hero.id].value as { assetId: string }).assetId;
  assert((session.getSnapshot().contentState!.values["image:secondImage"].value as { assetId: string }).assetId === assetId, "Both fields share an asset identity.");
  const saved = await session.save();
  await session.loadSaved(saved.id);
  images()[0].reset();
  assert(session.getSnapshot().sessionAssets[assetId], "First reset retains the surviving image asset.");
  assert(images()[1].blockingErrors.length === 0, "The surviving image stays valid.");
  images()[1].reset();
  assert(!session.getSnapshot().sessionAssets[assetId], "Final reset releases the replacement.");
  for (const field of images()) await field.replaceImage(input);
  await images()[0].replaceImage({ dataUrl: "data:image/png;base64,BAUG", width: 1, height: 1 });
  assert(session.getSnapshot().sessionAssets[assetId], "Replacing one field retains the other field's asset.");
  const pending = images()[0].replaceImage({ blob: bytes, width: 1, height: 1 });
  images()[0].reset();
  assert((await pending).stale, "Reset cancels older asynchronous replacement.");
  assert(images()[1].blockingErrors.length === 0, "Stale replacement cleanup retains surviving content.");
  // A receiving session retains known managed URLs before the sender releases them.
  const handoff = createTemplateSessionV2();
  const accepted = session.getSnapshot();
  handoff.load({ ...structuredClone(accepted.basePackage!), assets: { ...accepted.basePackage!.assets, ...accepted.sessionAssets } }, accepted.contentState!);
  const survivingUrl = accepted.sessionAssets[assetId]?.stableUrl;
  session.dispose();
  if (survivingUrl) assert(!revoked.includes(survivingUrl), "Session handoff retains the final shared URL owner.");
  assert(handoff.getFieldControllers().find(field => field.id === "image:secondImage")!.blockingErrors.length === 0, "Receiving session preserves surviving content.");
  handoff.dispose();
  assert(created.length === revoked.length && new Set(revoked).size === revoked.length, "Each created URL is released exactly once.");
}

for (const ending of ["superseded", "disposed"] as const) {
  const repository = new InMemoryTemplateSessionRepositoryV2();
  const author = createTemplateSessionV2({ repository }); author.load(v2Package());
  const record = structuredClone(await author.save()); author.dispose();
  const sources = Object.values(record.basePackage.assets).filter(asset => asset.type === "image").slice(0, 2);
  sources.forEach((asset, index) => {
    delete asset.dataUrl; delete asset.data; delete asset.stableUrl; delete asset.svgString;
    asset.hash = String(index + 1).repeat(64); asset.source = "stored";
  });
  repository.getTemplateSessionV2 = async () => record;
  const secondStarted = deferred<void>(), secondRead = deferred<void>(); let reads = 0;
  repository.getManagedAsset = async hash => {
    if (++reads === 2) { secondStarted.resolve(); await secondRead.promise; }
    return { hash, blob: new Blob(["source"], { type: "image/png" }), mimeType: "image/png", sizeBytes: 6, createdAt: "2026-10-08T00:00:00.000Z" };
  };
  const created: string[] = [], revoked: string[] = [];
  const session = createTemplateSessionV2({ repository, objectUrls: {
    create: () => { const url = `blob:cancel-${ending}-${created.length}`; created.push(url); return url; },
    revoke: url => revoked.push(url),
  } });
  const pending = session.loadSaved(record.id); await secondStarted.promise;
  if (ending === "superseded") session.load(v2Package()); else session.dispose();
  const accepted = session.getSnapshot(); secondRead.resolve(); await pending;
  assert(session.getSnapshot() === accepted, "Late hydration cannot publish after replacement or disposal.");
  assert(created.length === 1 && revoked.length === 1, "Cancelled hydration releases acquired URLs without allocating late ones.");
  session.dispose(); assert(revoked.length === 1, "Cancellation cleanup is idempotent.");
}

console.log("Single-session partial restore and shared replacement resource lifecycles passed.");

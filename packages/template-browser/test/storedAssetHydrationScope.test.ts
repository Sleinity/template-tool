import { createStoredAssetHydration } from "../src/session/storedAssetHydration";
import { assert, deferred } from "./sessionContract.fixtures";
import { sessionAssetUrlLeases } from "../src/session/sessionAssetUrlLeases";

{
  let reads = 0, creates = 0; const revoked: string[] = [], leases = sessionAssetUrlLeases.size;
  const scope = createStoredAssetHydration({ getManagedAsset: async () => { reads++; return { blob: new Blob(["source"]) }; }, objectUrls: { create: () => `blob:scope-${creates++}`, revoke: url => revoked.push(url) }, isStale: () => false });
  assert(!scope.getCachedUrl("a"));
  const a = await scope.readUrl("a"); assert(a.status === "available");
  assert(scope.getCachedUrl("a") === a.url, "Cache hits remain synchronous.");
  const again = await scope.readUrl("a"); assert(again.status === "available" && again.url === a.url);
  await scope.readUrl("b"); assert(reads === 2 && creates === 2 && sessionAssetUrlLeases.size === leases, "The scope acquires no accepted leases.");
  const list = scope.getCreatedUrls(); assert(list.length === 2);
  scope.release(); scope.release(); scope.transfer(); assert(revoked.length === 2);
  assert((await scope.readUrl("c")).status === "stale" && reads === 2);
}
{
  const revoked: string[] = [];
  const scope = createStoredAssetHydration({ getManagedAsset: async () => ({ blob: new Blob() }), objectUrls: { create: () => "blob:transferred", revoke: url => revoked.push(url) }, isStale: () => false });
  await scope.readUrl("a"); scope.transfer(); scope.transfer(); scope.release();
  assert(revoked.length === 0 && scope.getCreatedUrls().length === 0, "Native ownership transfer disables temporary cleanup.");
}
for (const ending of ["stale", "release", "failure"] as const) {
  const second = deferred<{ blob: Blob } | null>(), started = deferred<void>();
  const failure = new Error("original storage failure"); let stale = false, reads = 0, creates = 0; const revoked: string[] = [];
  const scope = createStoredAssetHydration({ getManagedAsset: async () => { if (++reads === 2) { started.resolve(); return second.promise; } return { blob: new Blob() }; }, objectUrls: { create: () => `blob:deferred-${creates++}`, revoke: url => revoked.push(url) }, isStale: () => stale });
  await scope.readUrl("a"); const pending = scope.readUrl("b"); await started.promise;
  if (ending === "failure") second.reject(failure);
  else { if (ending === "stale") stale = true; else scope.release(); second.resolve({ blob: new Blob() }); }
  if (ending === "failure") { const caught = await pending.catch(cause => cause); assert(caught === failure); }
  else assert((await pending).status === "stale");
  scope.release(); assert(creates === 1 && revoked.length === 1, "Late work never allocates and temporary cleanup occurs once.");
}
{
  let reads = 0;
  const scope = createStoredAssetHydration({ getManagedAsset: async () => { reads++; return null; }, objectUrls: { create: () => { throw new Error("Cannot allocate missing storage"); }, revoke: () => { throw new Error("No URL to revoke"); } }, isStale: () => false });
  assert((await scope.readUrl("missing")).status === "missing");
  assert(!scope.getCachedUrl("missing")); await scope.readUrl("missing"); assert(reads === 2, "Missing binaries are not negatively cached."); scope.release();
}
{
  const primary = new Error("original allocation failure"), cleanup = new Error("cleanup failure"); let creates = 0, releases = 0;
  const scope = createStoredAssetHydration({ getManagedAsset: async () => ({ blob: new Blob() }), objectUrls: { create: () => { if (creates++ === 2) throw primary; return `blob:failure-${creates}`; }, revoke: () => { releases++; throw cleanup; } }, isStale: () => false });
  await scope.readUrl("a"); await scope.readUrl("b");
  assert(await scope.readUrl("c").catch(cause => cause) === primary, "Cleanup cannot replace the original exception.");
  scope.release(); assert(releases === 2, "Cleanup attempts every unique temporary URL once.");
}
console.log("Private hydration scope cache, cancellation, transfer and cleanup passed.");

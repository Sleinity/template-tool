import assert from "node:assert/strict";
import { openTemplatePlatformDatabase } from "../src/storage/indexedDb";

/** Controlled native callbacks supplement the real Chromium upgrade probe. */
export async function runBlockedStorageTests() {
  const original = globalThis.indexedDB;
  const requests: any[] = [];
  let synchronousFailure: unknown;
  const fake = { open() { if (synchronousFailure) throw synchronousFailure; const request = { result: undefined, error: null } as any; requests.push(request); return request; } };
  const database = () => ({ closes: 0, close() { this.closes++; }, onversionchange: null as any });
  const rejection = (promise: Promise<unknown>) => promise.then(() => { throw new Error("Expected rejection"); }, error => error);
  try {
    Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: fake });
    const first = openTemplatePlatformDatabase();
    assert.equal(openTemplatePlatformDatabase(), first, "Concurrent callers share the opening attempt");
    assert.equal(requests.length, 1);
    const failed = rejection(first);
    assert.equal(typeof requests[0].onblocked, "function", "Blocked opens need an immediate failure handler");
    requests[0].onblocked();
    const error = await failed;
    assert.equal(error.name, "TemplateStorageBlockedError");
    assert.equal(error.code, "template-storage-blocked");
    assert.equal(error.databaseName, "template-package-platform");
    assert.equal(error.requestedVersion, 5);
    assert.equal(error.retryable, true);
    assert.equal(error.message, "Local storage is blocked. Close other tabs or windows of this app, then retry.");
    requests[0].onblocked();
    for (let i = 0; i < 10; i++) assert.equal((await rejection(openTemplatePlatformDatabase())).code, error.code);
    assert.equal(requests.length, 1, "Retries must not queue behind the rejected native request");
    const abandoned = database(); requests[0].result = abandoned; requests[0].onsuccess();
    assert.equal(abandoned.closes, 1);
    const second = openTemplatePlatformDatabase(); const accepted = database();
    requests[1].result = accepted; requests[1].onsuccess();
    assert.equal(await second, accepted);
    requests[0].onerror(); requests[0].onblocked(); requests[0].onsuccess();
    assert.equal(openTemplatePlatformDatabase(), second, "Obsolete callbacks cannot clear the accepted connection");
    assert.equal(abandoned.closes, 1, "Repeated success closes an abandoned connection exactly once");
    const oldVersionChange = accepted.onversionchange; oldVersionChange();
    assert.equal(accepted.closes, 1);
    const third = openTemplatePlatformDatabase(); const next = database(); requests[2].result = next; requests[2].onsuccess();
    assert.equal(await third, next); oldVersionChange(); requests[1].onerror();
    assert.equal(openTemplatePlatformDatabase(), third);
    assert.equal(next.closes, 0);
    next.onversionchange();
    synchronousFailure = new Error("Synchronous open failure");
    assert.equal(await rejection(openTemplatePlatformDatabase()), synchronousFailure);
    synchronousFailure = undefined;
    const fourth = openTemplatePlatformDatabase(); const nativeError = new DOMException("Native open error", "UnknownError");
    const failedFourth = rejection(fourth); requests[3].error = nativeError; requests[3].onerror();
    assert.equal(await failedFourth, nativeError);
    const fifth = openTemplatePlatformDatabase(); const final = database(); requests[4].result = final; requests[4].onsuccess();
    assert.equal(await fifth, final); requests[3].onerror(); assert.equal(openTemplatePlatformDatabase(), fifth);
    final.onversionchange();
    const lateError = openTemplatePlatformDatabase(); const failedLate = rejection(lateError);
    requests[5].error = nativeError; requests[5].onerror(); assert.equal(await failedLate, nativeError);
    const current = openTemplatePlatformDatabase(); const live = database(); requests[6].result = live; requests[6].onsuccess(); await current;
    const deliveredAfterError = database(); requests[5].result = deliveredAfterError; requests[5].onsuccess(); requests[5].onsuccess();
    assert.equal(deliveredAfterError.closes, 1, "A connection delivered after terminal failure is closed once");
    assert.equal(openTemplatePlatformDatabase(), current); assert.equal(live.closes, 0); live.onversionchange();
    const blockedOld = rejection(openTemplatePlatformDatabase()); requests[7].onblocked(); await blockedOld;
    requests[7].onerror();
    const blockedNew = rejection(openTemplatePlatformDatabase()); requests[8].onblocked(); const currentBlocked = await blockedNew;
    const obsolete = database(); requests[7].result = obsolete; requests[7].onsuccess(); requests[7].onerror();
    assert.equal(await rejection(openTemplatePlatformDatabase()), currentBlocked, "Old callbacks cannot clear a newer native blocked marker");
    assert.equal(requests.length, 9); assert.equal(obsolete.closes, 1); requests[8].onerror();
    const recovered = openTemplatePlatformDatabase(); const recoveredDb = database(); requests[9].result = recoveredDb; requests[9].onsuccess(); await recovered; recoveredDb.onversionchange();
    console.log("Blocked storage: shared requests, prompt retries, stale callbacks, sync/native errors and connection ownership pass.");
  } finally { Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: original }); }
}

import assert from "node:assert/strict";
import { createTemplateSessionV2 } from "../src/session/templateSessionV2";
import { createTemplateFieldFamilySessionV2 } from "../src/session/templateFieldFamilySessionV2";
import { createTemplateFieldFamilyFromSourcesV2 } from "../src/import/templateSourceAssemblyV2";
import { InMemoryTemplateSessionRepositoryV2 } from "../src/persistence/v2SessionRepositories";
import { TemplateStorageBlockedError } from "../src/storage/indexedDb";
import { sessionAssetUrlLeases } from "../src/session/sessionAssetUrlLeases";
import { v2Package, deferred } from "./sessionContract.fixtures";

export async function runBlockedStoragePinsTests() {
  for (const kind of ["single", "family"] as const) {
    const source = v2Package(), repository = new InMemoryTemplateSessionRepositoryV2();
    const started = deferred<void>(), finish = deferred<void>();
    const urls: string[] = [], revoked: string[] = [], captured: unknown[] = [];
    const objectUrls = { create() { const url = `blob:r04-${kind}-${urls.length}`; urls.push(url); return url; }, revoke(url: string) { revoked.push(url); } };
    const write = async (record: any) => { captured.push(record); started.resolve(); await finish.promise; return record; };
    repository.saveTemplateSessionV2 = write; repository.saveTemplateFieldFamilyV3 = write;
    const session = kind === "single" ? createTemplateSessionV2({repository,objectUrls}) : createTemplateFieldFamilySessionV2({repository,objectUrls});
    if ("selectVariant" in session) session.load(createTemplateFieldFamilyFromSourcesV2([source], "R04 pins")); else session.load(source);
    let notifications = 0; session.subscribe(() => notifications++);
    const image = session.getFieldControllers().find(field => field.type === "image")!;
    assert(image.type === "image");
    assert((await image.replaceImage({blob:new Blob(["one"],{type:"image/png"}),width:1,height:1})).accepted);
    const first = session.save().then(() => null, cause => cause); await started.promise;
    assert((await image.replaceImage({blob:new Blob(["two"],{type:"image/png"}),width:1,height:1})).accepted);
    const queued = session.save().then(() => null, cause => cause);
    image.reset(); session.dispose(); assert.deepEqual(revoked,[]);
    assert(urls.every(url => sessionAssetUrlLeases.has(url)), "Both captured records retain their generations");
    const blocked = new TemplateStorageBlockedError("template-package-platform",5); finish.reject(blocked);
    assert.equal(await first,blocked); assert(await queued); assert.equal(captured.length,1);
    assert.deepEqual(revoked,urls); assert(urls.every(url => !sessionAssetUrlLeases.has(url)));
    console.log(`R04 ${kind}: one active rejected write, one cancelled queued save, ${urls.length} allocations/${revoked.length} final-owner releases, ${notifications} notifications.`);
  }
}

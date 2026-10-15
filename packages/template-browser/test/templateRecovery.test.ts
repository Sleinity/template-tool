import fixture from '../../../src/template-package/fixtures/figma-plugin-v0.4.1.json';
import { normalizeTemplatePackageV1ToV2, type TemplatePackageV1 } from '@sleinity/template-core';
import { createTemplateSessionV2 } from '../src/session/templateSessionV2';
import { createInMemoryTemplateSessionRepositoryV2Storage, InMemoryTemplateSessionRepositoryV2 } from '../src/persistence/v2SessionRepositories';
import { createInMemoryTemplateRecoveryRepository, SupersededTemplateRecoveryError, TemplateRecoveryCleanupError } from '../src/persistence/templateRecovery';
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const rejects = async (operation: Promise<unknown>, type: typeof Error = Error) => { try { await operation; } catch (error) { assert(error instanceof type, `Expected ${type.name}: ${error}`); return; } throw new Error('Expected rejection'); };
const storage = createInMemoryTemplateSessionRepositoryV2Storage();
const repository = new InMemoryTemplateSessionRepositoryV2(storage);
const recovery = createInMemoryTemplateRecoveryRepository(storage);
const packageValue = normalizeTemplatePackageV1ToV2(structuredClone(fixture) as unknown as TemplatePackageV1).package!;
const session = createTemplateSessionV2({ repository }); session.load(packageValue);
const payload = await session.save({ name: 'Recovery contract' });
const key = { kind: 'single' as const, templateId: payload.id };
const first = await recovery.begin(key, 'fresh');
assert(!await recovery.inspect(key), 'Fresh open has no persisted recovery payload');
await recovery.save(first.lease, payload);
const second = await recovery.begin(key, 'resume');
assert(JSON.stringify(second.payload?.contentState) === JSON.stringify(payload.contentState), 'Resume retains canonical content');
await rejects(recovery.save(first.lease, payload), SupersededTemplateRecoveryError);
await rejects(recovery.complete(first.lease), SupersededTemplateRecoveryError);
await rejects(recovery.exportAndComplete(second.lease, async () => { throw new Error('export failed'); }));
assert(await recovery.inspect(key), 'Failed export retains recovery');
let finish!: () => void;
const exporting = recovery.exportAndComplete(second.lease, () => new Promise<void>(resolve => { finish = resolve; }));
await Promise.resolve(); await Promise.resolve();
const third = await recovery.begin(key, 'resume');
finish(); await rejects(exporting, TemplateRecoveryCleanupError);
assert(await recovery.isCurrent(third.lease), 'Older export cannot delete a newer session');
await recovery.exportAndComplete(third.lease, async () => 'downloaded');
assert(!await recovery.inspect(key), 'Successful completion removes payload');
await recovery.complete(third.lease); // Retry after an uncertain response is idempotent.
await rejects(recovery.save(third.lease, payload), SupersededTemplateRecoveryError);
assert(storage.assets.size > 0, 'Shared template resources survive recovery cleanup');
const fourth = await recovery.begin(key, 'fresh');
const saving = recovery.save(fourth.lease, payload);
await recovery.discard(fourth.lease);
await rejects(saving, SupersededTemplateRecoveryError);
assert(!await recovery.inspect(key), 'In-flight preparation cannot resurrect discarded work');
await recovery.adopt(key, payload, ['old']);
assert(!await recovery.inspect(key), 'Migration retry cannot resurrect completed work');
const migrationKey = { ...key, templateId: 'migration-target' };
await recovery.adopt(migrationKey, payload, ['retained']);
assert((await recovery.resolveLegacy('single', 'retained'))?.templateId === 'migration-target', 'Legacy retained URL resolves to owning template');
const resumed = await recovery.begin(migrationKey, 'resume');
await recovery.removeTemplate(migrationKey);
await rejects(recovery.save(resumed.lease, payload), SupersededTemplateRecoveryError);
session.dispose();

// Supported entry points do not expose the retired catalogue, including at runtime.
const publicPersistence = await import('../src/persistence/index');
for (const name of ['createSavedOutputDraftRecord', 'createSavedTemplateFamilyDraftRecord', 'listTemplateFamilyDraftsIncludingLegacy', 'createLegacyTemplateFamilyDraftRecord']) {
  assert(!(name in publicPersistence), `Retired public export: ${name}`);
}
for (const name of ['InMemoryTemplateRepository', 'IndexedDbTemplateRepository', 'hydratePackageAssets']) assert(!(name in publicPersistence), 'Retired V1 persistence: '+name);
const publicSessions = await import('../src/session/index');
for (const name of ['createTemplateSession','createTemplateFamilySession']) assert(!(name in publicSessions), 'Retired V1 session: '+name);
assert(typeof publicSessions.createTemplateSessionV2 === 'function');

// Retirement leaves historical bytes intact and excludes them from supported catalogues.
const historical = {id:'historical', name:'Old', schemaVersion:'saved-template-v1'};
const unknown = {id:'unknown', name:'Unknown', schemaVersion:'future-or-unknown'};
(storage.templateSessions as Map<string,unknown>).set(historical.id,historical);
(storage.fieldFamilies as Map<string,unknown>).set(unknown.id,unknown);
assert(!(await repository.listIncompatibleTemplateSessionsV2()).some(r=>r.id===historical.id), 'V1 is outside the incompatible V2 catalogue');
assert(!(await repository.listIncompatibleTemplateFieldFamiliesV3()).some(r=>r.id===unknown.id), 'Unknown Family bytes are outside the catalogue');
assert(await repository.getTemplateSessionV2(historical.id)===null, 'V1 cannot restore through V2');
assert(await repository.getTemplateFieldFamilyV3(unknown.id)===null, 'Unknown Family cannot restore through V2');
assert(storage.templateSessions.get(historical.id)===historical && storage.fieldFamilies.get(unknown.id)===unknown, 'Retirement never deletes stored bytes');
const incompatibleV2 = { ...payload, id: 'incompatible-v2', schemaVersion: 'saved-template-session-v2' };
(storage.templateSessions as Map<string,unknown>).set(incompatibleV2.id,incompatibleV2);
assert((await repository.listIncompatibleTemplateSessionsV2()).some(record=>record.id===incompatibleV2.id), 'Incompatible V2 remains visible for reimport');
await rejects(repository.getTemplateSessionV2(incompatibleV2.id));
assert(storage.templateSessions.get(incompatibleV2.id)===incompatibleV2, 'An incompatible V2 read preserves stored bytes');

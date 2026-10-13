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
const generic = new publicPersistence.InMemoryTemplateRepository();
for (const name of ['listDrafts','getDraft','saveDraft','deleteDraft','updateDraftPackage','listFamilyDrafts','getFamilyDraft','saveFamilyDraft','deleteFamilyDraft']) {
  assert(!(name in generic), `Retired repository operation: ${name}`);
}
assert(typeof generic.updateWorkingPackage === 'function' && typeof generic.saveTemplate === 'function', 'Generic template persistence remains available');
const publicSession = (await import('../src/session/index')).createTemplateFamilySession();
assert(!('saveDraft' in publicSession), 'Legacy Family sessions no longer expose arbitrary draft creation');
publicSession.dispose();

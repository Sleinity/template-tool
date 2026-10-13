import { defaultPlatformMemoryStorage } from "./platformMemory";
import { collectSavedAssets } from './assetRepository';
import { normalizeSavedTemplateSessionV2Record, validateCurrentSavedTemplateFieldFamilyV3Record } from './savedRecordValidationV2';
import { ASSET_STORE, ASSET_REFERENCE_STORE, MANAGED_FONT_STORE, RECOVERY_STORE, openTemplatePlatformDatabase } from '../storage/indexedDb';
import type { SavedTemplateSessionRecordV2, SavedTemplateFieldFamilyRecordV3, SavedAssetRecord, SavedAssetReference } from './types';
import type { ManagedFontRecord } from '../fonts/fontRegistryTypes';

export type TemplateRecoveryKey = { kind: 'single' | 'family'; templateId: string };
export type TemplateRecoveryPayload = SavedTemplateSessionRecordV2 | SavedTemplateFieldFamilyRecordV3;
export type TemplateRecoveryLease = { key: TemplateRecoveryKey; token: string };
export type TemplateRecoverySnapshot = { payload: TemplateRecoveryPayload; updatedAt: string };
export class SupersededTemplateRecoveryError extends Error {
  constructor() { super('This editing session is no longer active. Open the template again to continue its current draft.'); this.name = 'SupersededTemplateRecoveryError'; }
}
export class TemplateRecoveryCleanupError extends Error {
  constructor(public readonly cause: unknown) { super('Output exported, but the saved draft could not be cleared.'); this.name = 'TemplateRecoveryCleanupError'; }
}
export interface TemplateRecoveryRepository {
  getManagedAsset(hash: string): Promise<SavedAssetRecord | null>;
  inspect(key: TemplateRecoveryKey): Promise<TemplateRecoverySnapshot | null>;
  begin(key: TemplateRecoveryKey, mode: 'fresh' | 'resume'): Promise<{ lease: TemplateRecoveryLease; payload: TemplateRecoveryPayload | null }>;
  isCurrent(lease: TemplateRecoveryLease): Promise<boolean>;
  save(lease: TemplateRecoveryLease, payload: TemplateRecoveryPayload): Promise<TemplateRecoveryPayload>;
  discard(lease: TemplateRecoveryLease): Promise<void>;
  complete(lease: TemplateRecoveryLease): Promise<void>;
  exportAndComplete<T>(lease: TemplateRecoveryLease, exportOutput: () => Promise<T>): Promise<T>;
  /** Transfer existing work only if no recovery lifecycle has begun for this template. */
  adopt(key: TemplateRecoveryKey, payload: TemplateRecoveryPayload, legacyIds: readonly string[]): Promise<void>;
  resolveLegacy(kind: TemplateRecoveryKey['kind'], draftId: string): Promise<TemplateRecoveryKey | null>;
  /** Template deletion invalidates every lease, including pending saves. */
  removeTemplate(key: TemplateRecoveryKey): Promise<void>;
}
export type RecoverySlot = { id: string; key: TemplateRecoveryKey; token: string | null; finishedToken?: string; payload: TemplateRecoveryPayload | null; legacyKeys: string[]; updatedAt: string };
const keyId = (key: TemplateRecoveryKey) => JSON.stringify([key.kind, key.templateId]);
const owner = (key: TemplateRecoveryKey) => `recovery:${keyId(key)}`;
const legacyKey = (kind: TemplateRecoveryKey['kind'], id: string) => JSON.stringify([kind, id]);
const slotFor = (key: TemplateRecoveryKey): RecoverySlot => ({ id: keyId(key), key: structuredClone(key), token: null, payload: null, legacyKeys: [], updatedAt: new Date().toISOString() });
function assertLease(slot: RecoverySlot | null, lease: TemplateRecoveryLease) {
  if (!slot || slot.token !== lease.token) throw new SupersededTemplateRecoveryError();
}
async function prepare(key: TemplateRecoveryKey, value: TemplateRecoveryPayload) {
  const isFamily = 'family' in value;
  if (isFamily !== (key.kind === 'family')) throw new Error('Recovery payload does not match template kind.');
  const payload = isFamily ? validateCurrentSavedTemplateFieldFamilyV3Record(value) : normalizeSavedTemplateSessionV2Record(value);
  const sources = 'family' in payload ? payload.family.variants.map(v => v.packageValue) : [payload.basePackage];
  const collected = await collectSavedAssets([...sources, { ...structuredClone(sources[0]), assets: structuredClone(payload.sessionAssets) }]);
  if ('family' in payload) payload.family.variants.forEach((variant, index) => { variant.packageValue = collected.packages[index]; });
  else payload.basePackage = collected.packages[0];
  payload.sessionAssets = collected.packages[collected.packages.length - 1].assets;
  payload.assetReferences = [...new Set(collected.hashes)]; payload.fontReferences = collected.fontHashes;
  return { payload, assets: collected.assets };
}
type Change = (slot: RecoverySlot | null) => RecoverySlot;
interface RecoveryBackend {
  asset(hash: string): Promise<SavedAssetRecord | null>;
  read(key: TemplateRecoveryKey): Promise<RecoverySlot | null>;
  change(key: TemplateRecoveryKey, change: Change, assets?: readonly SavedAssetRecord[]): Promise<RecoverySlot>;
  legacy(key: string): Promise<TemplateRecoveryKey | null>;
}
function service(backend: RecoveryBackend): TemplateRecoveryRepository {
  const saves = new Map<string, Promise<TemplateRecoveryPayload>>();
  const complete = async (lease: TemplateRecoveryLease) => {
    await backend.change(lease.key, slot => {
      if (slot?.token === null && slot.finishedToken === lease.token) return slot;
      assertLease(slot, lease); return { ...slot!, payload: null, token: null, finishedToken: lease.token };
    });
  };
  return {
    getManagedAsset: hash => backend.asset(hash),
    async inspect(key) { const slot = await backend.read(key); return slot?.payload ? { payload: slot.payload, updatedAt: slot.updatedAt } : null; },
    async begin(key, mode) {
      const slot = await backend.change(key, previous => ({ ...(previous ?? slotFor(key)), token: crypto.randomUUID(), payload: mode === 'resume' ? previous?.payload ?? null : null }));
      return { lease: { key: structuredClone(key), token: slot.token! }, payload: slot.payload };
    },
    async isCurrent(lease) { return (await backend.read(lease.key))?.token === lease.token; },
    save(lease, value) {
      const submitted = structuredClone(value);
      const ownership = structuredClone(lease);
      const queued = saves.get(ownership.token) ?? Promise.resolve();
      const job = queued.catch(() => {}).then(async () => {
        const prepared = await prepare(ownership.key, submitted);
        const slot = await backend.change(ownership.key, previous => { assertLease(previous, ownership); return { ...previous!, payload: prepared.payload, updatedAt: new Date().toISOString() }; }, prepared.assets);
        return slot.payload!;
      });
      saves.set(ownership.token, job);
      const release = () => { if (saves.get(ownership.token) === job) saves.delete(ownership.token); };
      void job.then(release, release);
      return job;
    },
    discard: complete, complete,
    async exportAndComplete(lease, exportOutput) {
      assertLease(await backend.read(lease.key), lease);
      const result = await exportOutput();
      try { await complete(lease); } catch (cause) { throw new TemplateRecoveryCleanupError(cause); }
      return result;
    },
    async adopt(key, value, legacyIds) {
      const prepared = await prepare(key, value);
      await backend.change(key, previous => previous ?? { ...slotFor(key), payload: prepared.payload, updatedAt: value.updatedAt, legacyKeys: legacyIds.map(id => legacyKey(key.kind, id)) }, prepared.assets);
    },
    resolveLegacy: (kind, id) => backend.legacy(legacyKey(kind, id)),
    async removeTemplate(key) { await backend.change(key, previous => ({ ...(previous ?? slotFor(key)), payload: null, token: null })); },
  };
}
export interface TemplateRecoveryMemoryStorage {
  recoverySlots: Map<string, RecoverySlot>;
  assets: Map<string, SavedAssetRecord>;
  references: Map<string, Set<string>>;
}
export function createInMemoryTemplateRecoveryRepository(storage: TemplateRecoveryMemoryStorage = { recoverySlots: new Map(), assets: new Map(), references: new Map() }): TemplateRecoveryRepository {
  return service({
    async asset(hash) { return structuredClone(storage.assets.get(hash) ?? null); },
    async read(key) { return structuredClone(storage.recoverySlots.get(keyId(key)) ?? null); },
    async legacy(key) { return structuredClone([...storage.recoverySlots.values()].find(slot => slot.legacyKeys.includes(key))?.key ?? null); },
    async change(key, update, assets = []) {
      // No await between ownership check and commit. Binary preparation happens before this boundary.
      const next = update(structuredClone(storage.recoverySlots.get(keyId(key)) ?? null));
      const hashes = new Set(next.payload?.assetReferences ?? []);
      for (const asset of assets) if (hashes.has(asset.hash)) storage.assets.set(asset.hash, structuredClone(asset));
      for (const hash of hashes) { const owners = storage.references.get(hash) ?? new Set(); owners.add(owner(key)); storage.references.set(hash, owners); }
      for (const [hash, owners] of storage.references) {
        if (!hashes.has(hash)) owners.delete(owner(key));
        if (!owners.size) { storage.references.delete(hash); storage.assets.delete(hash); }
      }
      storage.recoverySlots.set(keyId(key), structuredClone(next));
      return structuredClone(next);
    },
  });
}
const request = <T>(value: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => { value.onsuccess = () => resolve(value.result); value.onerror = () => reject(value.error); });
export function createIndexedDbTemplateRecoveryRepository(): TemplateRecoveryRepository {
  return service({
    async asset(hash) { const db = await openTemplatePlatformDatabase(); return (await request<SavedAssetRecord | undefined>(db.transaction(ASSET_STORE).objectStore(ASSET_STORE).get(hash))) ?? null; },
    async read(key) { const db = await openTemplatePlatformDatabase(); return (await request<RecoverySlot | undefined>(db.transaction(RECOVERY_STORE).objectStore(RECOVERY_STORE).get(keyId(key)))) ?? null; },
    async legacy(key) { const db = await openTemplatePlatformDatabase(); return (await request<RecoverySlot | undefined>(db.transaction(RECOVERY_STORE).objectStore(RECOVERY_STORE).index('legacyKeys').get(key)))?.key ?? null; },
    async change(key, update, assets = []) {
      const db = await openTemplatePlatformDatabase();
      const tx = db.transaction([RECOVERY_STORE, ASSET_STORE, ASSET_REFERENCE_STORE, MANAGED_FONT_STORE], 'readwrite');
      const done = new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Recovery transaction aborted.')); });
      // Attach a rejection handler immediately; an ownership rejection also aborts the transaction.
      void done.catch(() => {});
      try {
        const store = tx.objectStore(RECOVERY_STORE);
        const next = update((await request<RecoverySlot | undefined>(store.get(keyId(key)))) ?? null);
        const refs = tx.objectStore(ASSET_REFERENCE_STORE);
        const previous = await request<SavedAssetReference[]>(refs.index('templateId').getAll(owner(key)));
        const hashes = next.payload?.assetReferences ?? [];
        for (const ref of previous) refs.delete(ref.id);
        for (const asset of assets) if (hashes.includes(asset.hash)) tx.objectStore(ASSET_STORE).put(asset);
        for (const hash of hashes) refs.put({ id: `${owner(key)}:${hash}`, templateId: owner(key), hash } satisfies SavedAssetReference);
        const managed = await request<ManagedFontRecord[]>(tx.objectStore(MANAGED_FONT_STORE).getAll());
        for (const ref of previous) {
          if (hashes.includes(ref.hash)) continue;
          const owners = await request<IDBValidKey[]>(refs.index('hash').getAllKeys(ref.hash));
          if (!owners.length && !managed.some(font => font.assetHash === ref.hash)) tx.objectStore(ASSET_STORE).delete(ref.hash);
        }
        store.put(next); await done; return next;
      } catch (error) { try { tx.abort(); } catch {} await done.catch(() => {}); throw error; }
    },
  });
}
let defaultRecovery: TemplateRecoveryRepository | undefined;
export function getTemplateRecoveryRepository(): TemplateRecoveryRepository {
  return defaultRecovery ??= typeof indexedDB === 'undefined' ? createInMemoryTemplateRecoveryRepository(defaultPlatformMemoryStorage) : createIndexedDbTemplateRecoveryRepository();
}

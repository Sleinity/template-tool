import { InMemoryTemplateRepository as LegacyMemory, createInMemoryTemplateRepositoryStorage as legacyStorage, type InMemoryTemplateRepositoryStorage as LegacyStorage } from './inMemoryTemplateRepository';
import { IndexedDbTemplateRepository as LegacyIndexedDb } from './indexedDbTemplateRepository';
import { getTemplateRepository as legacySingle, getTemplateFamilyRepository as legacyFamily } from './templateRepository';
import type { TemplateRepository as LegacySingle, TemplateFamilyRepository as LegacyFamily } from './types';

export type InMemoryTemplateRepositoryStorage = Omit<LegacyStorage, 'drafts' | 'familyDrafts'>;
export function createInMemoryTemplateRepositoryStorage(): InMemoryTemplateRepositoryStorage {
  const { drafts: _drafts, familyDrafts: _families, ...storage } = legacyStorage(); return storage;
}
export type TemplateRepository = Omit<LegacySingle, 'listDrafts' | 'getDraft' | 'saveDraft' | 'updateDraftPackage' | 'deleteDraft'>;
export type TemplateFamilyRepository = Omit<LegacyFamily, 'listFamilyDrafts' | 'getFamilyDraft' | 'saveFamilyDraft' | 'deleteFamilyDraft'>;
const singleMethods = ['listTemplates','getTemplate','saveTemplate','getManagedAsset','updateWorkingPackage','updateTemplateSettings','renameTemplate','duplicateTemplate','deleteTemplate'] as const;
const familyMethods = ['listFamilies','getFamily','saveFamily','deleteFamily','getManagedAsset'] as const;
function expose<T extends object>(source: object, names: readonly string[]): T {
  return Object.fromEntries(names.filter(name => typeof Reflect.get(source,name)==='function').map(name => [name, Reflect.get(source,name).bind(source)])) as T;
}
export function getTemplateRepository(): TemplateRepository { return expose(legacySingle(),singleMethods); }
export function getTemplateFamilyRepository(): TemplateFamilyRepository { return expose(legacyFamily(),familyMethods); }
/** Generic template storage remains supported. Recovery has its own scoped repository. */
export const InMemoryTemplateRepository = class {
  constructor(storage?: InMemoryTemplateRepositoryStorage) { return expose(new LegacyMemory(storage ? { ...storage, drafts: new Map(), familyDrafts: new Map() } : undefined),[...singleMethods,...familyMethods]); }
} as unknown as { new(storage?: InMemoryTemplateRepositoryStorage): TemplateRepository & TemplateFamilyRepository };
export const IndexedDbTemplateRepository = class {
  constructor() { return expose(new LegacyIndexedDb(),[...singleMethods,...familyMethods]); }
} as unknown as { new(): TemplateRepository & TemplateFamilyRepository };

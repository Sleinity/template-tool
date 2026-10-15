import type { InMemoryTemplateSessionRepositoryV2Storage } from './v2SessionRepositories';

// Public entry points are built independently. Keep their default ownership maps
// together, just as the browser's IndexedDB stores share one database.
const key = Symbol.for('@sleinity/template-browser/default-recovery-memory/v1');
const platform = globalThis as typeof globalThis & { [key]?: InMemoryTemplateSessionRepositoryV2Storage };
export const defaultPlatformMemoryStorage = platform[key] ??= {
  recoverySlots: new Map(),
  templateSessions: new Map(),
  fieldFamilies: new Map(),
  assets: new Map(),
  references: new Map(),
};

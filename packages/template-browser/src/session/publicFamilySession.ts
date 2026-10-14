import { createTemplateFamilySession as createInternal, type TemplateFamilySessionV1 as InternalSession, type TemplateFamilySessionOptionsV1 as InternalOptions } from './templateFamilySession';
import type { TemplateRepository, TemplateFamilyRepository } from '../persistence/publicRepositories';
export type TemplateFamilySessionOptionsV1 = Omit<InternalOptions,'familyRepository'|'templateRepository'> & { familyRepository?: TemplateFamilyRepository; templateRepository?: TemplateRepository };
export type TemplateFamilySessionV1 = Omit<InternalSession,'saveDraft'|'loadSavedFamily'|'loadLegacyTemplate'> & {
  loadSavedFamily(id: string): ReturnType<InternalSession['loadSavedFamily']>;
  loadLegacyTemplate(id: string): ReturnType<InternalSession['loadLegacyTemplate']>;
};
/** Legacy field semantics remain available; catalogue persistence is not part of this facade. */
export function createTemplateFamilySession(options: TemplateFamilySessionOptionsV1 = {}): TemplateFamilySessionV1 {
  const internal = createInternal(options as InternalOptions);
  const { saveDraft: _retiredDraftOperation, ...session } = internal;
  return { ...session, loadSavedFamily: id => internal.loadSavedFamily(id), loadLegacyTemplate: id => internal.loadLegacyTemplate(id) };
}

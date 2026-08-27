import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createLegacyTemplateFamilyRecord,
  createLegacyTemplateFamilyDraftRecord,
  createSavedTemplateFamilyRecord,
  getTemplateFamilyRepository,
  getTemplateRepository,
  listTemplateFamiliesIncludingLegacy,
  listTemplateFamilyDraftsIncludingLegacy,
  type SavedTemplateFamilyDraftRecord,
  type SavedTemplateFamilyRecord,
} from "@sleinity/template-browser/persistence";
import {
  createTemplateFamilySession,
  type TemplateFamilySessionV1,
} from "@sleinity/template-browser/session";
import type { TemplateFamilyImportConfirmationV1 } from "@sleinity/template-browser/importer";
import { appRoutePath, parseAppRoute, type AppRoute } from "./routing/appRoutes";
import { TemplateFamilyEditorPage } from "./views/TemplateFamilyEditorPage";
import { TemplateFamilyOverviewPage } from "./views/TemplateFamilyOverviewPage";
import { TemplateFamilySetupPage } from "./views/TemplateFamilySetupPage";

type FamilySaveStatus = "saved" | "saving" | "error";

export function TemplateFamilyApp() {
  const [route, setRoute] = useState<AppRoute>(() =>
    parseAppRoute(typeof window === "undefined" ? "/templates" : window.location.pathname),
  );
  const templateRepository = useMemo(() => getTemplateRepository(), []);
  const familyRepository = useMemo(() => getTemplateFamilyRepository(), []);
  const [records, setRecords] = useState<SavedTemplateFamilyRecord[]>([]);
  const [drafts, setDrafts] = useState<SavedTemplateFamilyDraftRecord[]>([]);
  const [settingsRecord, setSettingsRecord] = useState<SavedTemplateFamilyRecord | null>(null);
  const [session, setSession] = useState<TemplateFamilySessionV1 | null>(null);
  const sessionRef = useRef<TemplateFamilySessionV1 | null>(null);
  const [saveStatus, setSaveStatus] = useState<FamilySaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);

  const navigate = useCallback((next: AppRoute, replace = false) => {
    if (typeof window !== "undefined") {
      const path = appRoutePath(next);
      if (replace) window.history.replaceState(null, "", path);
      else window.history.pushState(null, "", path);
    }
    setRoute(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [nextRecords, nextDrafts] = await Promise.all([
        listTemplateFamiliesIncludingLegacy(familyRepository, templateRepository),
        listTemplateFamilyDraftsIncludingLegacy(familyRepository, templateRepository),
      ]);
      setRecords(nextRecords);
      setDrafts(nextDrafts);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Template Families could not be loaded.");
    }
  }, [familyRepository, templateRepository]);

  const replaceSession = useCallback((next: TemplateFamilySessionV1 | null) => {
    const previous = sessionRef.current;
    sessionRef.current = next;
    setSession(next);
    if (previous && previous !== next) previous.dispose();
  }, []);

  const saveCurrentSession = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    setSaveStatus("saving");
    try {
      await current.saveDraft();
      setSaveStatus("saved");
      await refresh();
      setError(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The template draft could not be saved.";
      setSaveStatus("error");
      setError(message);
      throw cause;
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onPopState = () => setRoute(parseAppRoute(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    if (window.location.pathname === "/") navigate({ kind: "templates" }, true);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navigate]);

  useEffect(() => () => {
    sessionRef.current?.dispose();
    sessionRef.current = null;
  }, []);

  useEffect(() => {
    if (!session) return;
    const initial = session.getSnapshot();
    let lastScheduled = `${initial.contentRevision}:${initial.selectionRevision}`;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = session.subscribe(() => {
      const snapshot = session.getSnapshot();
      const signature = `${snapshot.contentRevision}:${snapshot.selectionRevision}`;
      if (snapshot.status === "disposed" || signature === lastScheduled) return;
      lastScheduled = signature;
      if (timer) clearTimeout(timer);
      setSaveStatus("saving");
      timer = setTimeout(() => {
        void saveCurrentSession().catch(() => undefined);
      }, 350);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [saveCurrentSession, session]);

  const createSession = useCallback(() => createTemplateFamilySession({
    familyRepository,
    templateRepository,
  }), [familyRepository, templateRepository]);

  const loadFamilyDefinition = useCallback(async (
    familyId: string,
  ): Promise<{ session: TemplateFamilySessionV1; legacy: boolean }> => {
    const next = createSession();
    const saved = await familyRepository.getFamily(familyId);
    if (saved) {
      await next.loadSavedFamily(saved.id);
      return { session: next, legacy: false };
    }
    await next.loadLegacyTemplate(familyId);
    return { session: next, legacy: true };
  }, [createSession, familyRepository]);

  const startDraft = useCallback(async (familyId: string) => {
    try {
      const loaded = await loadFamilyDefinition(familyId);
      const snapshot = loaded.session.getSnapshot();
      if (!snapshot.family || !snapshot.content) throw new Error("The template could not be opened.");
      const draft = await loaded.session.saveDraft();
      replaceSession(loaded.session);
      setSaveStatus("saved");
      await refresh();
      navigate({ kind: "draft-workspace", draftId: draft.id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The template could not be opened.");
    }
  }, [loadFamilyDefinition, navigate, refresh, replaceSession]);

  const openDraft = useCallback(async (draftId: string, updateRoute = true) => {
    const next = createSession();
    try {
      const savedDraft = await familyRepository.getFamilyDraft(draftId);
      if (savedDraft) {
        const savedFamily = await familyRepository.getFamily(savedDraft.familyId);
        if (savedFamily) {
          await next.loadSavedFamily(savedFamily.id, savedDraft.id);
        } else {
          const legacyTemplate = await templateRepository.getTemplate(savedDraft.familyId);
          if (!legacyTemplate) throw new Error("The template for this draft was not found.");
          const converted = createLegacyTemplateFamilyRecord(legacyTemplate);
          next.load({
            family: converted.record.family,
            content: savedDraft.content,
            selectedVariantId: savedDraft.selectedVariantId,
            sharedImageAssets: {
              ...converted.record.sharedImageAssets,
              ...savedDraft.sharedImageAssets,
            },
            savedDraftId: savedDraft.id,
          });
        }
      } else {
        const legacyDraft = await templateRepository.getDraft(draftId);
        if (!legacyDraft) throw new Error("The template draft was not found.");
        const legacyTemplate = await templateRepository.getTemplate(legacyDraft.templateId);
        if (!legacyTemplate) throw new Error("The legacy template for this draft was not found.");
        const converted = createLegacyTemplateFamilyRecord({
          ...legacyTemplate,
          workingPackage: legacyDraft.workingPackage,
        });
        const migrated = createLegacyTemplateFamilyDraftRecord(
          legacyTemplate,
          legacyDraft,
        );
        migrated.id = `family-draft:${crypto.randomUUID()}`;
        const saved = await familyRepository.saveFamilyDraft(migrated);
        next.load({
          family: converted.record.family,
          content: saved.content,
          selectedVariantId: saved.selectedVariantId,
          sharedImageAssets: saved.sharedImageAssets,
          savedDraftId: saved.id,
        });
      }
      if (next.getSnapshot().status === "blocked") {
        throw new Error(next.getSnapshot().error?.message ?? "The template draft is blocked.");
      }
      replaceSession(next);
      setSaveStatus("saved");
      if (updateRoute) navigate({ kind: "draft-workspace", draftId: next.getSnapshot().savedDraftId ?? draftId });
      await refresh();
      setError(null);
    } catch (cause) {
      next.dispose();
      setError(cause instanceof Error ? cause.message : "The template draft could not be opened.");
      if (!updateRoute) navigate({ kind: "templates" }, true);
    }
  }, [createSession, familyRepository, navigate, refresh, replaceSession, templateRepository]);

  const openSettings = useCallback(async (familyId: string, updateRoute = true) => {
    try {
      const saved = await familyRepository.getFamily(familyId);
      const record = saved ?? records.find((candidate) => candidate.id === familyId) ?? null;
      if (!record) throw new Error("The template was not found.");
      setSettingsRecord(record);
      if (updateRoute) navigate({ kind: "template-settings", templateId: familyId });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Template settings could not be opened.");
      if (!updateRoute) navigate({ kind: "templates" }, true);
    }
  }, [familyRepository, navigate, records]);

  useEffect(() => {
    if (route.kind === "draft-workspace" && session?.getSnapshot().savedDraftId !== route.draftId) {
      void openDraft(route.draftId, false);
    }
    if (route.kind === "template-settings" && settingsRecord?.id !== route.templateId) {
      void openSettings(route.templateId, false);
    }
  }, [openDraft, openSettings, route, session, settingsRecord?.id]);

  const saveConfirmation = useCallback(async (
    confirmation: TemplateFamilyImportConfirmationV1,
    previous?: SavedTemplateFamilyRecord | null,
  ) => {
    const next = createSavedTemplateFamilyRecord({
      family: confirmation.family,
      name: confirmation.family.title,
      description: previous?.description,
      sharedImageAssets: confirmation.sharedImageAssets,
      migratedFromTemplateId: previous?.migratedFromTemplateId,
    });
    if (previous) {
      next.createdAt = previous.createdAt;
      next.validation = confirmation.validation;
    }
    await familyRepository.saveFamily(next);
    await refresh();
    setSettingsRecord(null);
    navigate({ kind: "templates" });
  }, [familyRepository, navigate, refresh]);

  if (route.kind === "templates") {
    return (
      <TemplateFamilyOverviewPage
        records={records}
        drafts={drafts}
        error={error}
        onCreate={() => navigate({ kind: "new-template" })}
        onStartNew={(familyId) => void startDraft(familyId)}
        onOpenDraft={(draftId) => void openDraft(draftId)}
        onSettings={(familyId) => void openSettings(familyId)}
        onDelete={async (familyId) => {
          const saved = await familyRepository.getFamily(familyId);
          const familyDrafts = await familyRepository.listFamilyDrafts();
          await Promise.all(familyDrafts.filter((draft) => draft.familyId === familyId).map((draft) => familyRepository.deleteFamilyDraft(draft.id)));
          if (saved) await familyRepository.deleteFamily(familyId);
          else await templateRepository.deleteTemplate(familyId);
          await refresh();
        }}
        onDeleteDraft={async (draftId) => {
          if (await familyRepository.getFamilyDraft(draftId)) await familyRepository.deleteFamilyDraft(draftId);
          else await templateRepository.deleteDraft(draftId);
          await refresh();
        }}
      />
    );
  }

  if (route.kind === "new-template") {
    return <TemplateFamilySetupPage onCancel={() => navigate({ kind: "templates" })} onSave={saveConfirmation} />;
  }

  if (route.kind === "template-settings" && settingsRecord) {
    return (
      <TemplateFamilySetupPage
        key={settingsRecord.id}
        savedFamily={settingsRecord}
        onCancel={() => {
          setSettingsRecord(null);
          navigate({ kind: "templates" });
        }}
        onSave={saveConfirmation}
      />
    );
  }

  if (route.kind === "draft-workspace" && session) {
    const familyId = session.getSnapshot().family?.id;
    return (
      <TemplateFamilyEditorPage
        session={session}
        saveStatus={saveStatus}
        onRetrySave={saveCurrentSession}
        onBack={async () => {
          try {
            await saveCurrentSession();
            replaceSession(null);
            navigate({ kind: "templates" });
          } catch {
            // Keep the editor open so the user can retry the failed save.
          }
        }}
        onSettings={async () => {
          if (!familyId) return;
          try {
            await saveCurrentSession();
            replaceSession(null);
            await openSettings(familyId);
          } catch {
            // Keep the current draft open until its pending changes are safe.
          }
        }}
      />
    );
  }

  return <div className="app-route-loading" role="status">Loading template…</div>;
}

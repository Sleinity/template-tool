import { useCallback, useEffect, useMemo, useState } from "react";
import { appRoutePath, parseAppRoute, type AppRoute } from "./routing/appRoutes";
import type { TemplatePackageEditorSession } from "./template-package/editor";
import {
  createSavedOutputDraftRecord,
  createSavedTemplateRecord,
  createDraftAutosaveCoordinator,
  bindDraftAutosaveLifecycle,
  runAfterDraftAutosaveFlush,
  getTemplateRepository,
  type DraftAutosaveState,
  type SavedOutputDraftRecord,
  type SavedTemplateRecord,
  createSavedAssetRecord,
  recordSemanticRendererMvpMigration,
} from "./template-package/persistence";
import type { TemplatePackageCreateMetadata } from "./views/TemplatePackageImportFlow";
import { TemplatePackageImportFlow } from "./views/TemplatePackageImportFlow";
import { TemplateOverviewPage } from "./views/TemplateOverviewPage";
import { TemplatePackageEditorPage } from "./views/TemplatePackageEditorPage";

function AppContent() {
  const [route, setRoute] = useState<AppRoute>(() =>
    parseAppRoute(typeof window === "undefined" ? "/templates" : window.location.pathname),
  );
  const repository = useMemo(() => getTemplateRepository(), []);
  const [records, setRecords] = useState<SavedTemplateRecord[]>([]);
  const [drafts, setDrafts] = useState<SavedOutputDraftRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [selectedSession, setSelectedSession] =
    useState<TemplatePackageEditorSession | null>(null);
  const [settingsRecord, setSettingsRecord] =
    useState<SavedTemplateRecord | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [draftSaveState, setDraftSaveState] = useState<DraftAutosaveState>({
    status: "clean",
    revision: 0,
    savedRevision: 0,
    message: null,
  });
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  const navigate = useCallback((nextRoute: AppRoute, replace = false) => {
    if (typeof window !== "undefined") {
      const path = appRoutePath(nextRoute);
      if (replace) window.history.replaceState(null, "", path);
      else window.history.pushState(null, "", path);
    }
    setRoute(nextRoute);
  }, []);

  const refreshRecords = useCallback(async () => {
    try {
      const [nextRecords, nextDrafts] = await Promise.all([
        repository.listTemplates(),
        repository.listDrafts(),
      ]);
      setRecords(nextRecords);
      setDrafts(nextDrafts);
      setPersistenceError(null);
    } catch (error) {
      setPersistenceError(
        error instanceof Error
          ? error.message
          : "Saved templates could not be loaded.",
      );
    }
  }, [repository]);

  const draftAutosave = useMemo(
    () =>
      createDraftAutosaveCoordinator({
        save: async (draftId, packageValue) => {
          await repository.updateDraftPackage(draftId, packageValue);
          await refreshRecords();
        },
        onStateChange: (state) => {
          setDraftSaveState(state);
          if (state.status === "failed") {
            setPersistenceError(state.message);
          }
        },
      }),
    [refreshRecords, repository],
  );

  const flushDraftAutosave = useCallback(async (): Promise<boolean> => {
    return runAfterDraftAutosaveFlush(
      draftAutosave,
      () => undefined,
      (error) => {
        setPersistenceError(
          error instanceof Error
            ? `Automatic save failed: ${error.message}`
            : "Automatic save failed. Retry before leaving the editor.",
        );
      },
    );
  }, [draftAutosave]);

  useEffect(() => {
    void refreshRecords();
  }, [refreshRecords]);

  useEffect(() => {
    const onPopState = () => setRoute(parseAppRoute(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    if (window.location.pathname === "/") {
      navigate({ kind: "templates" }, true);
    }
    return () => window.removeEventListener("popstate", onPopState);
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];
    void Promise.all(
      records.map(async (record) => {
        if (!record.previewAssetHash) return null;
        try {
          const asset = await repository.getManagedAsset(record.previewAssetHash);
          if (!asset) return null;
          const url = URL.createObjectURL(asset.blob);
          if (cancelled) {
            URL.revokeObjectURL(url);
            return null;
          }
          createdUrls.push(url);
          return [record.id, url] as const;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setPreviewUrls(
        Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry))),
      );
    });
    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [records, repository]);

  useEffect(() => {
    return bindDraftAutosaveLifecycle(draftAutosave, window);
  }, [draftAutosave]);

  const loadDraft = useCallback(async (draftId: string, updateRoute = true) => {
    try {
      const draft = await repository.getDraft(draftId);
      if (!draft) throw new Error("Saved output draft was not found.");
      draftAutosave.reset();
      setSelectedTemplateId(draft.templateId);
      setSelectedSession({
        savedTemplateId: draft.templateId,
        draftId: draft.id,
        originalPackage: draft.basePackage,
        workingPackage: draft.workingPackage,
        validation: draft.validation,
        templateName: draft.name,
      });
      if (updateRoute) navigate({ kind: "draft-workspace", draftId });
      setPersistenceError(null);
    } catch (error) {
      setPersistenceError(
        error instanceof Error ? error.message : "Draft could not be opened.",
      );
      if (!updateRoute) navigate({ kind: "templates" }, true);
    }
  }, [draftAutosave, navigate, repository]);

  const openDraft = async (draftId: string) => {
    if (!(await flushDraftAutosave())) return;
    await loadDraft(draftId);
  };

  const startDraftFromTemplate = async (templateId: string) => {
    if (!(await flushDraftAutosave())) return;
    try {
      const template = await repository.getTemplate(templateId);
      if (!template) throw new Error("Saved template was not found.");
      const draft = await repository.saveDraft(
        createSavedOutputDraftRecord(template),
      );
      await refreshRecords();
      await loadDraft(draft.id);
    } catch (error) {
      setPersistenceError(
        error instanceof Error ? error.message : "Draft could not be created.",
      );
    }
  };

  const openTemplateSettings = useCallback(async (templateId: string, updateRoute = true) => {
    if (!(await flushDraftAutosave())) return;
    try {
      const record = await repository.getTemplate(templateId);
      if (!record) throw new Error("Saved template was not found.");
      setSelectedTemplateId(templateId);
      setSettingsRecord(record);
      setSelectedSession(null);
      if (updateRoute) navigate({ kind: "template-settings", templateId });
      setPersistenceError(null);
    } catch (error) {
      setPersistenceError(
        error instanceof Error
          ? error.message
          : "Template settings could not be opened.",
      );
      if (!updateRoute) navigate({ kind: "templates" }, true);
    }
  }, [flushDraftAutosave, navigate, repository]);

  useEffect(() => {
    if (route.kind === "draft-workspace" && selectedSession?.draftId !== route.draftId) {
      void loadDraft(route.draftId, false);
    }
    if (
      route.kind === "template-settings" &&
      settingsRecord?.id !== route.templateId
    ) {
      void openTemplateSettings(route.templateId, false);
    }
  }, [loadDraft, openTemplateSettings, route, selectedSession?.draftId, settingsRecord?.id]);

  const handleAddTemplate = async (
    packageValue: Parameters<
      NonNullable<
        React.ComponentProps<typeof TemplatePackageImportFlow>["onAddTemplate"]
      >
    >[0],
    validation: Parameters<
      NonNullable<
        React.ComponentProps<typeof TemplatePackageImportFlow>["onAddTemplate"]
      >
    >[1],
    metadata: TemplatePackageCreateMetadata,
  ) => {
    try {
      const previewAsset = metadata.previewBlob
        ? await createSavedAssetRecord(metadata.previewBlob)
        : undefined;
      const record = createSavedTemplateRecord({
        name: metadata.templateName,
        description: metadata.description,
        packageValue: metadata.originalPackage ?? packageValue,
        workingPackageValue: packageValue,
        validation,
        figmaUrl: metadata.figmaUrl,
        source: metadata.source,
        previewAssetHash: previewAsset?.hash,
      });
      await repository.saveTemplate(record, { previewAsset });
      await refreshRecords();
      setPersistenceError(null);
      navigate({ kind: "templates" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Template could not be saved.";
      setPersistenceError(message);
      throw error;
    }
  };

  const updateSelectedSession = (
    sessionUpdate: TemplatePackageEditorSession,
  ) => {
    if (!sessionUpdate.draftId) return;
    setSelectedSession(sessionUpdate);
    draftAutosave.schedule(
      sessionUpdate.draftId,
      sessionUpdate.workingPackage,
    );
  };

  if (route.kind === "templates") {
    return (
      <TemplateOverviewPage
        records={records}
        drafts={drafts}
        previewUrls={previewUrls}
        persistenceError={persistenceError}
        onOpenTemplate={(templateId) =>
          void startDraftFromTemplate(templateId)
        }
        onOpenDraft={(draftId) => void openDraft(draftId)}
        onDeleteDraft={async (draftId) => {
          await repository.deleteDraft(draftId);
          await refreshRecords();
        }}
        onOpenSettings={(templateId) => void openTemplateSettings(templateId)}
        onCreateTemplate={() => navigate({ kind: "new-template" })}
        onRenameTemplate={async (templateId, name) => {
          await repository.renameTemplate(templateId, name);
          await refreshRecords();
        }}
        onDuplicateTemplate={async (templateId) => {
          await repository.duplicateTemplate(templateId);
          await refreshRecords();
        }}
        onDeleteTemplate={async (templateId) => {
          await repository.deleteTemplate(templateId);
          await refreshRecords();
        }}
      />
    );
  }

  if (route.kind === "new-template") {
    return (
      <TemplatePackageImportFlow
        onCancel={() => navigate({ kind: "templates" })}
        onAddTemplate={handleAddTemplate}
      />
    );
  }

  if (route.kind === "template-settings" && settingsRecord) {
    return (
      <TemplatePackageImportFlow
        key={settingsRecord.id}
        mode="settings"
        initialStep={2}
        savedTemplate={settingsRecord}
        onCancel={() => {
          navigate({ kind: "templates" });
          setSettingsRecord(null);
          setSelectedTemplateId(null);
        }}
        onUpdateTemplate={async (packageValue, validation, metadata) => {
          try {
            await repository.updateTemplateSettings(settingsRecord.id, {
              name: metadata.templateName,
              description: metadata.description,
              workingPackage: packageValue,
              validation,
            });
            await refreshRecords();
            setPersistenceError(null);
            navigate({ kind: "templates" });
            setSettingsRecord(null);
            setSelectedTemplateId(null);
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Template settings could not be saved.";
            setPersistenceError(message);
            throw error;
          }
        }}
        onSaveChanges={async (packageValue, validation) => {
          try {
            const updated = await repository.updateTemplateSettings(settingsRecord.id, {
              name: settingsRecord.name,
              description: settingsRecord.description,
              workingPackage: packageValue,
              validation,
            });
            setSettingsRecord(updated);
            await refreshRecords();
            setPersistenceError(null);
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Template changes could not be saved.";
            setPersistenceError(message);
            throw error;
          }
        }}
        onDuplicateTemplate={async () => {
          await repository.duplicateTemplate(settingsRecord.id);
          await refreshRecords();
          navigate({ kind: "templates" });
          setSettingsRecord(null);
          setSelectedTemplateId(null);
        }}
        onDeleteTemplate={async () => {
          await repository.deleteTemplate(settingsRecord.id);
          await refreshRecords();
          navigate({ kind: "templates" });
          setSettingsRecord(null);
          setSelectedTemplateId(null);
        }}
      />
    );
  }

  if (route.kind !== "draft-workspace" || !selectedSession) {
    return <div className="app-route-loading" role="status">Loading template…</div>;
  }

  return (
    <TemplatePackageEditorPage
      session={selectedSession}
      onSessionChange={updateSelectedSession}
      saveState={draftSaveState}
      onRetrySave={() => draftAutosave.retry()}
      onFlushPendingSave={() => draftAutosave.flush()}
      onOpenTemplateSettings={async () => {
        if (selectedTemplateId) {
          await openTemplateSettings(selectedTemplateId);
        }
      }}
      onBackToTemplates={async () => {
        if (!(await flushDraftAutosave())) return;
        navigate({ kind: "templates" });
        setSelectedSession(null);
        setSelectedTemplateId(null);
      }}
    />
  );
}

export default function App() {
  useEffect(() => {
    void recordSemanticRendererMvpMigration();
  }, []);
  return <AppContent />;
}

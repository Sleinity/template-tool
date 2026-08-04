import {
  StrictMode,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { createRoot } from "react-dom/client";
import type {
  PackageImageFieldConstraints,
  PackageTextFieldConstraints,
} from "@sleinity/template-core";
import type {
  TemplateImportConfirmationV1,
  TemplateImportWizardControllerV1,
} from "@sleinity/template-browser/importer";
import type {
  TemplateSessionMutationResult,
  TemplateSessionV1,
} from "@sleinity/template-browser/session";
import {
  inspectTemplateRuntimeSupport,
  loadTemplateImportConfirmation,
  type TemplateRuntimeSupportReportV1,
} from "@sleinity/template-browser/compatibility";
import {
  TemplateSessionProvider,
  useTemplateSession,
  useTemplateSessionSnapshot,
  type ResolvedProductRenderIdentityV1,
} from "@sleinity/template-react";
import {
  TemplateSessionViewport,
  useTemplateSessionDiagnosticSummary,
  useTemplateSessionEditableField,
  useTemplateSessionEditableFields,
  type TemplateSessionEditableFieldControllerV1,
  type TemplateSessionViewportHandle,
  type TemplateSessionViewportSnapshotV1,
} from "@sleinity/template-react/editor";
import {
  TemplateImportWizard,
  TemplateImportWizardProvider,
  useTemplateImportWizard,
  useTemplateImportWizardSnapshot,
} from "@sleinity/template-react/importer";
import "@sleinity/template-react/importer.css";
import "./styles.css";

const SAVED_TEMPLATE_KEY = "template-platform:editor-example:saved-id";

interface HostTemplateRecord {
  id: string;
  confirmation: TemplateImportConfirmationV1;
}

export interface TemplateExportReadyPayload {
  filename: string;
  pngDataUrl: string;
  width: number;
  height: number;
  sessionRevision: number;
  renderIdentity: ResolvedProductRenderIdentityV1;
  diagnostics: Array<{
    code: string;
    severity: "warning" | "error";
    message: string;
    target?: string;
  }>;
}

function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("The image could not be converted to a data URL."));
    reader.onerror = () => reject(reader.error ?? new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}

function mutationMessage(result: TemplateSessionMutationResult): string {
  if (!result.applied) return result.warning?.message ?? "The update was rejected.";
  return result.warning?.message ?? "Field updated.";
}

function fieldConstraintSummary(
  field: TemplateSessionEditableFieldControllerV1["field"],
): string {
  if (field.type === "text" || field.type === "textarea") {
    const constraints = field.constraints as PackageTextFieldConstraints | undefined;
    const parts = [
      constraints?.maxCharacters
        ? `Maximum ${constraints.maxCharacters} characters`
        : null,
      field.type === "textarea" && constraints?.maxLines
        ? `Maximum ${constraints.maxLines} lines`
        : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : "No input limits";
  }
  if (field.type === "image") {
    const constraints = field.constraints as PackageImageFieldConstraints | undefined;
    return [
      constraints?.allowedMimeTypes?.length
        ? constraints.allowedMimeTypes.map((mime) => mime.replace("image/", "").toUpperCase()).join("/")
        : null,
      constraints?.maxFileSizeMb ? `Maximum ${constraints.maxFileSizeMb} MB` : null,
    ].filter(Boolean).join(" · ") || "Template image requirements apply";
  }
  return field.type === "boolean"
    ? "On or off"
    : `${field.type.charAt(0).toUpperCase()}${field.type.slice(1)} input`;
}

function FieldControl({
  controller,
  onMessage,
}: {
  controller: TemplateSessionEditableFieldControllerV1;
  onMessage(message: string): void;
}) {
  const snapshot = useTemplateSessionSnapshot();
  const imageReadRevision = useRef(0);
  const packageValue = snapshot.workingPackage;
  if (!packageValue) return null;
  const { field, value } = controller;
  const label = field.label ?? field.id;
  const setValue = (next: unknown) => {
    try {
      onMessage(mutationMessage(controller.setValue(next)));
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "The field update failed.");
    }
  };
  const common = {
    id: `field-${field.id}`,
    "aria-label": label,
  };

  let control;
  if (field.type === "textarea") {
    control = (
      <textarea
        {...common}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => setValue(event.currentTarget.value)}
      />
    );
  } else if (field.type === "number") {
    control = (
      <input
        {...common}
        type="number"
        value={typeof value === "number" ? value : ""}
        onChange={(event) =>
          setValue(event.currentTarget.value === "" ? null : Number(event.currentTarget.value))
        }
      />
    );
  } else if (field.type === "date") {
    control = (
      <input
        {...common}
        type="date"
        value={typeof value === "string" ? value : ""}
        onChange={(event) => setValue(event.currentTarget.value)}
      />
    );
  } else if (field.type === "color") {
    control = (
      <input
        {...common}
        type="color"
        value={typeof value === "string" ? value : "#000000"}
        onChange={(event) => setValue(event.currentTarget.value)}
      />
    );
  } else if (field.type === "boolean") {
    control = (
      <input
        {...common}
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event) => setValue(event.currentTarget.checked)}
      />
    );
  } else if (field.type === "image") {
    const constraints = field.constraints as PackageImageFieldConstraints | undefined;
    const accept = constraints?.allowedMimeTypes?.length
      ? constraints.allowedMimeTypes.join(",")
      : "image/png,image/jpeg,image/webp,image/gif";
    const activePlacement =
      packageValue.nodes[field.nodeId]?.image?.activePlacement?.state ??
      "imported-source";
    control = (
      <div className="image-field" data-placement-mode={activePlacement}>
        <input
          {...common}
          type="file"
          accept={accept}
          onChange={async (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.currentTarget.files?.[0];
            if (!file) return;
            if (
              constraints?.allowedMimeTypes?.length &&
              !constraints.allowedMimeTypes.includes(file.type)
            ) {
              onMessage(`${label} does not accept ${file.type || "this file type"}.`);
              return;
            }
            if (
              constraints?.maxFileSizeMb !== undefined &&
              file.size > constraints.maxFileSizeMb * 1024 * 1024
            ) {
              onMessage(`${label} must be smaller than ${constraints.maxFileSizeMb} MB.`);
              return;
            }
            const revision = ++imageReadRevision.current;
            try {
              const [dataUrl, bitmap] = await Promise.all([
                fileAsDataUrl(file),
                createImageBitmap(file),
              ]);
              if (imageReadRevision.current !== revision) {
                bitmap.close();
                return;
              }
              const width = bitmap.width;
              const height = bitmap.height;
              bitmap.close();
              const result = controller.replaceImage?.({
                dataUrl,
                mimeType: file.type,
                sizeBytes: file.size,
                width,
                height,
                placementState: "replacement-fill",
              });
              if (result) onMessage(mutationMessage(result));
            } catch (error) {
              onMessage(error instanceof Error ? error.message : "Image replacement failed.");
            }
          }}
        />
        <button
          type="button"
          onClick={() =>
            onMessage(
              mutationMessage(
                controller.setImageReplacementMode!("replacement-fill"),
              ),
            )
          }
        >
          Fill
        </button>
        <button
          type="button"
          onClick={() =>
            onMessage(
              mutationMessage(
                controller.setImageReplacementMode!("replacement-fit"),
              ),
            )
          }
        >
          Fit
        </button>
      </div>
    );
  } else {
    control = (
      <input
        {...common}
        type="text"
        value={typeof value === "string" ? value : ""}
        onChange={(event) => setValue(event.currentTarget.value)}
      />
    );
  }

  return (
    <div className="field">
      <label htmlFor={`field-${field.id}`}>{label}</label>
      {control}
      <small>{fieldConstraintSummary(field)}</small>
      <button
        type="button"
        onClick={() => {
          imageReadRevision.current += 1;
          onMessage(mutationMessage(controller.reset()));
        }}
      >
        Reset
      </button>
    </div>
  );
}

export function TemplateEditorWorkspace({
  record,
  onBack,
  onTemplateExportReady,
  onSession,
  acceptanceMode = false,
}: {
  record: HostTemplateRecord;
  onBack(): void;
  onTemplateExportReady(payload: TemplateExportReadyPayload): void;
  onSession?(session: TemplateSessionV1): void;
  acceptanceMode?: boolean;
}) {
  const session = useTemplateSession();
  const loadedRecord = useRef<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    onSession?.(session);
  }, [onSession, session]);
  useEffect(() => {
    if (loadedRecord.current === record.id) return;
    loadedRecord.current = record.id;
    setLoadError(null);
    void loadTemplateImportConfirmation(session, record.confirmation).then(
      (result) => {
        if (!result.applied) {
          setLoadError(
            result.inspection.issues[0]?.message ??
              result.sessionResult?.diagnostics[0]?.message ??
              "The confirmed template could not be reopened.",
          );
        }
      },
      (error) => {
        setLoadError(
          error instanceof Error
            ? error.message
            : "The confirmed template could not be reopened.",
        );
      },
    );
  }, [record, session]);
  if (loadError) {
    return (
      <main>
        <p role="alert">{loadError}</p>
        <button type="button" onClick={onBack}>Back to dashboard</button>
      </main>
    );
  }
  return (
    <TemplateSessionProvider session={session}>
      <TemplateEditor
        session={session}
        onBack={onBack}
        onTemplateExportReady={onTemplateExportReady}
        acceptanceMode={acceptanceMode}
      />
    </TemplateSessionProvider>
  );
}

function TemplateEditor({
  session,
  onBack,
  onTemplateExportReady,
  acceptanceMode,
}: {
  session: TemplateSessionV1;
  onBack(): void;
  onTemplateExportReady(payload: TemplateExportReadyPayload): void;
  acceptanceMode: boolean;
}) {
  const snapshot = useTemplateSessionSnapshot();
  const fieldControllers = useTemplateSessionEditableFields(session);
  const rendererRef = useRef<TemplateSessionViewportHandle>(null);
  const [viewportSnapshot, setViewportSnapshot] =
    useState<TemplateSessionViewportSnapshotV1 | null>(null);
  const diagnosticSummary = useTemplateSessionDiagnosticSummary({
    session,
    viewportSnapshot,
  });
  const [message, setMessage] = useState(
    "Host-owned controls are connected to the hydrated template session.",
  );
  const [exportPreview, setExportPreview] = useState<TemplateExportReadyPayload | null>(null);
  const identityReady = viewportSnapshot?.canExport === true;
  const firstTextField = fieldControllers.find(
    (controller) =>
      controller.field.type === "text" || controller.field.type === "textarea",
  );

  const reloadSavedDraft = useCallback(async () => {
    const savedId = localStorage.getItem(SAVED_TEMPLATE_KEY);
    if (!savedId) {
      setMessage("No browser-local draft has been saved.");
      return;
    }
    const result = await session.loadSavedTemplate(savedId);
    setExportPreview(null);
    setMessage(
      result.status === "ready"
        ? "Reloaded the browser-local draft."
        : result.error?.message ?? "The browser-local draft could not be reloaded.",
    );
  }, [session]);

  const save = async () => {
    try {
      const record = await session.save({ name: snapshot.workingPackage?.name });
      localStorage.setItem(SAVED_TEMPLATE_KEY, record.id);
      setMessage(`Saved browser-local draft ${record.id}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Saving failed.");
    }
  };

  const capture = async () => {
    try {
      if (!identityReady) {
        throw new Error("The current render identity is not ready.");
      }
      const result = await rendererRef.current?.exportPng({ download: false });
      if (!result) throw new Error("The current renderer is unavailable.");
      const payload: TemplateExportReadyPayload = {
        filename: result.filename,
        pngDataUrl: result.pngDataUrl,
        width: result.width,
        height: result.height,
        sessionRevision: snapshot.revision,
        renderIdentity: viewportSnapshot!.renderIdentity!,
        diagnostics: result.diagnostics,
      };
      setExportPreview(payload);
      onTemplateExportReady(payload);
      setMessage("The latest ready revision was captured without downloading.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "PNG capture failed.");
    }
  };

  const exerciseStaleExport = async () => {
    if (!snapshot.workingPackage || !firstTextField) return;
    firstTextField.setValue(
      `${String(firstTextField.value ?? "")} · acceptance stale check`,
    );
    setExportPreview(null);
    try {
      await rendererRef.current?.exportPng({ download: false });
      setMessage("Stale export was incorrectly accepted.");
    } catch {
      setMessage("Stale export rejected.");
    }
  };

  return (
    <main className="editor-page">
      <header className="host-header">
        <div>
          <p className="eyebrow">Host-owned editor</p>
          <h1>{snapshot.workingPackage?.name ?? "Template editor"}</h1>
          <p className="supporting-copy">The host supplies the controls; the SDK validates values and renders the current revision.</p>
        </div>
        <button
          className="button-secondary"
          type="button"
          onClick={onBack}
        >
          Back to dashboard
        </button>
      </header>

      <details className="editor-utilities">
        <summary>Integration utilities</summary>
        <div className="toolbar">
          <button type="button" disabled={!snapshot.workingPackage || !firstTextField} onClick={() => {
            if (!snapshot.workingPackage || !firstTextField) return;
            setMessage(mutationMessage(firstTextField.setValue(String(firstTextField.value ?? "").toLocaleUpperCase())));
            setExportPreview(null);
          }}>Apply host uppercase transform</button>
          <button disabled={snapshot.status !== "ready"} onClick={() => void save()}>Save browser draft</button>
          <button type="button" onClick={() => void reloadSavedDraft()}>Reload browser draft</button>
          <button disabled={snapshot.status !== "ready"} onClick={() => {
            session.restoreImportedState();
            setExportPreview(null);
            setMessage("Restored all imported values.");
          }}>Restore imported state</button>
          {acceptanceMode ? <button type="button" disabled={!identityReady || !firstTextField} onClick={() => void exerciseStaleExport()}>Acceptance stale export</button> : null}
        </div>
        <p className="identity">Revision {snapshot.revision} · render identity {identityReady ? viewportSnapshot?.renderIdentity?.identityId : "pending"}</p>
      </details>

      {diagnosticSummary.issues.length > 0 ? (
        <section className="diagnostics" aria-label="Template diagnostics">
          <h2>Diagnostics</h2>
          <ul>
            {diagnosticSummary.issues.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${diagnostic.target ?? ""}-${index}`}>
                <strong>{diagnostic.code}</strong>: {diagnostic.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {snapshot.validation ? (
        <p
          className="validation-status"
          data-testid="validation-status"
          data-valid={String(snapshot.validation.valid)}
          data-diagnostic-status={diagnosticSummary.status}
        >
          {snapshot.validation.valid ? "✓" : "!"} Template {snapshot.validation.valid ? "valid" : "blocked"} · Schema{" "}
          {snapshot.validation.schemaValid ? "valid" : "invalid"} · Semantic{" "}
          {snapshot.validation.semanticValid ? "valid" : "invalid"} · {diagnosticSummary.counts.blockers + diagnosticSummary.counts.warnings} unresolved diagnostics
        </p>
      ) : null}

      <p className="editor-feedback" aria-live="polite">{message}</p>

      {acceptanceMode && firstTextField ? (
        <FieldHookAcceptance
          fieldId={firstTextField.field.id}
          collectionValue={firstTextField.value}
        />
      ) : null}

      <div className="workspace">
        <section className="preview-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Current revision</p><h2>Live preview</h2></div>
          </div>
          <TemplateSessionViewport
            ref={rendererRef}
            session={session}
            className="session-preview"
            fallback={<p>Import a valid ZIP to render the template.</p>}
            onViewportSnapshot={setViewportSnapshot}
          />
        </section>
        <aside className="edit-content">
          <div className="panel-heading">
            <div><p className="eyebrow">Host controls</p><h2>Edit content</h2></div>
          </div>
          {fieldControllers.length === 0 ? (
            <p>No editable fields are available.</p>
          ) : (
            fieldControllers.map((controller) => (
              <FieldControl
                key={controller.field.id}
                controller={controller}
                onMessage={(next) => {
                  setExportPreview(null);
                  setMessage(next);
                }}
              />
            ))
          )}
          <div className="edit-content__footer">
            <button className="button-primary" disabled={!identityReady} onClick={() => void capture()}>
              Capture latest PNG
            </button>
          </div>
        </aside>
      </div>

      {exportPreview ? (
        <section className="export-result">
          <h2>Export callback payload</h2>
          <img src={exportPreview.pngDataUrl} alt="Latest template PNG" />
          <p>
            {exportPreview.filename} · {exportPreview.width}×{exportPreview.height}
          </p>
        </section>
      ) : null}
    </main>
  );
}

function FieldHookAcceptance({
  fieldId,
  collectionValue,
}: {
  fieldId: string;
  collectionValue: unknown;
}) {
  const controller = useTemplateSessionEditableField(fieldId);
  const missing = useTemplateSessionEditableField("acceptance:missing-field");
  const previous = useRef(controller);
  const stable = previous.current === controller;
  previous.current = controller;
  return (
    <output
      hidden
      data-testid="field-hook-acceptance"
      data-controller-stable={String(stable)}
      data-field-parity={String(
        controller?.field.id === fieldId &&
        Object.is(controller.value, collectionValue),
      )}
      data-missing-field-null={String(missing === null)}
    />
  );
}

function TemplateImportWorkspace({
  onConfirmed,
  onCancel,
}: {
  onConfirmed(result: TemplateImportConfirmationV1): void;
  onCancel(): void;
}) {
  const wizard = useTemplateImportWizard();
  return (
    <main>
      <TemplateImportWizard
        wizard={wizard}
        onComplete={onConfirmed}
        onCancel={onCancel}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ReferenceApplication />
  </StrictMode>,
);

function DashboardTemplateCard({
  record,
  onOpen,
}: {
  record: HostTemplateRecord;
  onOpen(): void;
}) {
  const session = useTemplateSession();
  const snapshot = useTemplateSessionSnapshot(session);
  useEffect(() => {
    void loadTemplateImportConfirmation(session, record.confirmation);
  }, [record, session]);
  return (
    <article className="template-card">
      <div className="template-card__preview" aria-label={`${record.confirmation.packageValue.name} preview`}>
        <TemplateSessionViewport
          session={session}
          className="session-preview session-preview--compact"
          padding={20}
        />
      </div>
      <div className="template-card__body">
        <div className="template-card__title">
          <h2>{record.confirmation.packageValue.name}</h2>
          <span className="status">Confirmed</span>
        </div>
        <p>
          {record.confirmation.packageValue.canvas.width} × {record.confirmation.packageValue.canvas.height} · {record.confirmation.editableFields.length} editable fields
        </p>
        <button className="button-secondary" type="button" aria-label={`Open template ${record.confirmation.packageValue.name}`} disabled={snapshot.status !== "ready"} onClick={onOpen}>
          Open editor
        </button>
      </div>
    </article>
  );
}

function ReferenceApplication() {
  const acceptanceMode = new URLSearchParams(window.location.search).has(
    "acceptance",
  );
  const [mounted, setMounted] = useState(true);
  const [disposedStatus, setDisposedStatus] = useState("mounted");
  const [view, setView] = useState<"dashboard" | "import" | "editor">(
    "dashboard",
  );
  const [records, setRecords] = useState<HostTemplateRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [hostMessage, setHostMessage] = useState(
    "No template is added until the wizard is confirmed.",
  );
  const [runtimeSupport, setRuntimeSupport] =
    useState<TemplateRuntimeSupportReportV1 | null>(null);
  const sessionRef = useRef<TemplateSessionV1 | null>(null);
  const rememberSession = useCallback((session: TemplateSessionV1) => {
    sessionRef.current = session;
  }, []);
  const unmountWorkspace = () => {
    setMounted(false);
    window.setTimeout(() => {
      setDisposedStatus(sessionRef.current?.getSnapshot().status ?? "missing");
    }, 0);
  };
  const selectedRecord =
    records.find((record) => record.id === selectedRecordId) ?? null;
  useEffect(() => {
    let active = true;
    void inspectTemplateRuntimeSupport({ pngCapture: true }).then((report) => {
      if (active) setRuntimeSupport(report);
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <>
      {acceptanceMode ? (
        <>
          <section className="acceptance-controls">
            <button type="button" onClick={unmountWorkspace}>
              Unmount acceptance workspace
            </button>
            <span data-testid="disposed-status">{disposedStatus}</span>
          </section>
          <HeadlessAcceptanceSurfaces />
        </>
      ) : null}
      {mounted ? (
        view === "import" ? (
          <TemplateImportWorkspace
            onCancel={() => {
              setHostMessage("Template setup cancelled.");
              setView("dashboard");
            }}
            onConfirmed={(confirmation) => {
              const record: HostTemplateRecord = {
                id: confirmation.packageFingerprint,
                confirmation,
              };
              setRecords((current) => [
                ...current.filter((item) => item.id !== record.id),
                record,
              ]);
              setSelectedRecordId(null);
              setHostMessage("Confirmed template added to the in-memory host catalogue.");
              setView("dashboard");
            }}
          />
        ) : view === "editor" && selectedRecord ? (
          <TemplateEditorWorkspace
            key={selectedRecord.id}
            record={selectedRecord}
            onBack={() => {
              setSelectedRecordId(null);
              setHostMessage("Returned from the host-owned editor.");
              setView("dashboard");
            }}
            acceptanceMode={acceptanceMode}
            onSession={rememberSession}
            onTemplateExportReady={(payload) => {
              console.info("Template output ready for the host application", {
                filename: payload.filename,
                width: payload.width,
                height: payload.height,
                sessionRevision: payload.sessionRevision,
                renderIdentity: payload.renderIdentity.identityId,
                diagnosticCount: payload.diagnostics.length,
              });
            }}
          />
        ) : (
          <main className="dashboard">
            <header className="host-header">
              <div>
                <p className="eyebrow">Host application</p>
                <h1>Template dashboard</h1>
                <p className="supporting-copy">This dashboard and in-memory catalogue belong to the host. The wizard is a reference implementation built on the SDK.</p>
              </div>
              <button
                className="button-primary"
                type="button"
                onClick={() => {
                  setHostMessage("Template setup opened.");
                  setView("import");
                }}
              >
                Add new template
              </button>
            </header>
            <div className="dashboard-status">
            <p
              className="message"
              data-testid="runtime-support"
              data-runtime-status={runtimeSupport?.status ?? "checking"}
              data-runtime-issues={
                runtimeSupport?.issues.map((issue) => issue.code).join(",") ?? ""
              }
            >
              Runtime compatibility: {runtimeSupport?.status ?? "checking"}.
            </p>
            <p className="message">{hostMessage}</p>
            </div>
            {records.length === 0 ? (
              <section className="empty-state">
                <h2>No templates have been added.</h2>
                <p>
                  The host catalogue changes only after explicit wizard
                  confirmation.
                </p>
              </section>
            ) : (
              <section className="template-list" aria-label="Host templates">
                {records.map((record) => (
                  <DashboardTemplateCard key={record.id} record={record} onOpen={() => {
                    setSelectedRecordId(record.id);
                    setView("editor");
                  }} />
                ))}
              </section>
            )}
          </main>
        )
      ) : null}
    </>
  );
}

function HeadlessStatus({
  label,
}: {
  label: string;
}) {
  const snapshot = useTemplateImportWizardSnapshot();
  return (
    <div
      data-headless-surface={label}
      data-active-step={snapshot.activeStep}
      data-wizard-revision={snapshot.revision}
    >
      {label}: {snapshot.activeStep}
    </div>
  );
}

function HeadlessAcceptanceSurfaces() {
  const pageWizard = useTemplateImportWizard();
  const modalWizard = useTemplateImportWizard();
  const drawerWizard = useTemplateImportWizard();
  const surfaces: Array<[string, TemplateImportWizardControllerV1]> = [
    ["page", pageWizard],
    ["modal", modalWizard],
    ["drawer", drawerWizard],
  ];
  return (
    <section aria-label="Headless wizard composition acceptance">
      {surfaces.map(([label, wizard]) => (
        <TemplateImportWizardProvider
          key={label}
          wizard={wizard}
        >
          <HeadlessStatus label={label} />
        </TemplateImportWizardProvider>
      ))}
    </section>
  );
}

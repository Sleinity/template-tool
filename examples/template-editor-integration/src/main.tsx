import {
  StrictMode,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { createRoot } from "react-dom/client";
import {
  getPackageFieldValue,
  type EditableFieldBinding,
  type PackageImageFieldConstraints,
} from "@sleinity/template-core";
import type {
  TemplateImportConfirmationV1,
  TemplateImportWizardControllerV1,
  TemplateSessionMutationResult,
  TemplateSessionV1,
} from "@sleinity/template-browser";
import {
  TemplateSessionProvider,
  TemplateSessionRenderer,
  useTemplateSession,
  useTemplateSessionSnapshot,
  type ResolvedProductRenderIdentityV1,
  type TemplateSessionRendererHandle,
} from "@sleinity/template-react";
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

interface RevisionedIdentity {
  revision: number;
  value: ResolvedProductRenderIdentityV1;
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

function FieldControl({
  field,
  session,
  onMessage,
}: {
  field: EditableFieldBinding;
  session: TemplateSessionV1;
  onMessage(message: string): void;
}) {
  const snapshot = useTemplateSessionSnapshot();
  const imageReadRevision = useRef(0);
  const packageValue = snapshot.workingPackage;
  if (!packageValue) return null;
  const value = getPackageFieldValue(packageValue, field);
  const label = field.label ?? field.id;
  const setValue = (next: unknown) => {
    try {
      onMessage(mutationMessage(session.setField(field.id, next)));
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
              const result = session.replaceImage(field.id, {
                dataUrl,
                mimeType: file.type,
                sizeBytes: file.size,
                width,
                height,
                placementState: "replacement-fill",
              });
              onMessage(mutationMessage(result));
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
                session.setImageReplacementMode(field.id, "replacement-fill"),
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
                session.setImageReplacementMode(field.id, "replacement-fit"),
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
      <small>{field.type} · {field.property}</small>
      {field.constraints ? (
        <small>Constraints: {JSON.stringify(field.constraints)}</small>
      ) : null}
      <button
        type="button"
        onClick={() => {
          imageReadRevision.current += 1;
          onMessage(mutationMessage(session.resetField(field.id)));
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
  useEffect(() => {
    onSession?.(session);
  }, [onSession, session]);
  useEffect(() => {
    if (loadedRecord.current === record.id) return;
    loadedRecord.current = record.id;
    const result = session.loadTemplateState({
      importedPackage: record.confirmation.importedPackage,
      packageValue: record.confirmation.packageValue,
      source: {
        type: "package-zip",
        sourceName: record.confirmation.sourceName,
      },
      importValidation: record.confirmation.importValidation,
    });
    if (!result.applied) {
      throw new Error(
        result.diagnostics[0]?.message ??
          "The confirmed template could not be reopened.",
      );
    }
  }, [record, session]);
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
  const rendererRef = useRef<TemplateSessionRendererHandle>(null);
  const [identity, setIdentity] = useState<RevisionedIdentity | null>(null);
  const [message, setMessage] = useState(
    "Host-owned controls are connected to the hydrated template session.",
  );
  const [exportPreview, setExportPreview] = useState<TemplateExportReadyPayload | null>(null);
  const identityReady =
    identity?.revision === snapshot.revision &&
    identity.value.readiness === "ready";
  const firstTextField = snapshot.editableFields.find(
    (field) => field.type === "text" || field.type === "textarea",
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
        renderIdentity: identity.value,
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
    const current = getPackageFieldValue(snapshot.workingPackage, firstTextField);
    session.setField(
      firstTextField.id,
      `${String(current ?? "")} · acceptance stale check`,
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
    <main>
      <header>
        <div>
          <p className="eyebrow">Reusable editor reference</p>
          <h1>Template Platform integration test</h1>
        </div>
        <span className={`status status-${snapshot.status}`}>{snapshot.status}</span>
      </header>

      <section className="toolbar">
        <button
          type="button"
          onClick={onBack}
        >
          Back to dashboard
        </button>
        <button
          type="button"
          disabled={!snapshot.workingPackage || !firstTextField}
          onClick={() => {
            if (!snapshot.workingPackage || !firstTextField) return;
            const current = getPackageFieldValue(
              snapshot.workingPackage,
              firstTextField,
            );
            const next = String(current ?? "").toLocaleUpperCase();
            setMessage(
              mutationMessage(session.setField(firstTextField.id, next)),
            );
            setExportPreview(null);
          }}
        >
          Apply host uppercase transform
        </button>
        <button disabled={snapshot.status !== "ready"} onClick={() => void save()}>
          Save browser draft
        </button>
        <button type="button" onClick={() => void reloadSavedDraft()}>
          Reload browser draft
        </button>
        <button
          disabled={snapshot.status !== "ready"}
          onClick={() => {
            session.restoreImportedState();
            setExportPreview(null);
            setMessage("Restored all imported values.");
          }}
        >
          Restore imported state
        </button>
        <button disabled={!identityReady} onClick={() => void capture()}>
          Capture latest PNG
        </button>
        {acceptanceMode ? (
          <button
            type="button"
            disabled={!identityReady || !firstTextField}
            onClick={() => void exerciseStaleExport()}
          >
            Acceptance stale export
          </button>
        ) : null}
      </section>

      <p className="message">{message}</p>
      <p className="identity">
        Revision {snapshot.revision} · render identity{" "}
        {identityReady ? identity.value.identityId : "pending"}
      </p>

      {snapshot.diagnostics.length > 0 ? (
        <section className="diagnostics" aria-label="Template diagnostics">
          <h2>Diagnostics</h2>
          <ul>
            {snapshot.diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${diagnostic.path ?? ""}-${index}`}>
                <strong>{diagnostic.code}</strong>: {diagnostic.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {snapshot.validation ? (
        <section
          className="validation"
          data-testid="validation-status"
          data-valid={String(snapshot.validation.valid)}
        >
          <h2>Validation</h2>
          <p>
            Overall {snapshot.validation.valid ? "valid" : "blocked"} · schema{" "}
            {snapshot.validation.schemaValid ? "valid" : "invalid"} · semantic{" "}
            {snapshot.validation.semanticValid ? "valid" : "invalid"}
          </p>
          <p>{snapshot.validation.diagnostics.length} validation diagnostics</p>
        </section>
      ) : null}

      <div className="workspace">
        <aside>
          <h2>Editable fields</h2>
          {snapshot.editableFields.length === 0 ? (
            <p>No editable fields are available.</p>
          ) : (
            snapshot.editableFields.map((field) => (
              <FieldControl
                key={field.id}
                field={field}
                session={session}
                onMessage={(next) => {
                  setExportPreview(null);
                  setMessage(next);
                }}
              />
            ))
          )}
        </aside>
        <section className="stage">
          <TemplateSessionRenderer
            ref={rendererRef}
            mode="editor"
            fallback={<p>Import a valid ZIP to render the template.</p>}
            onRenderIdentity={(value) =>
              setIdentity({ revision: snapshot.revision, value })
            }
          />
        </section>
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
            <header>
              <div>
                <p className="eyebrow">HOST APPLICATION</p>
                <h1>Template dashboard</h1>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHostMessage("Template setup opened.");
                  setView("import");
                }}
              >
                Add new template
              </button>
            </header>
            <p className="message">{hostMessage}</p>
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
                  <article key={record.id} className="template-card">
                    <h2>{record.confirmation.packageValue.name}</h2>
                    <p>
                      {record.confirmation.packageValue.canvas.width}×
                      {record.confirmation.packageValue.canvas.height} ·{" "}
                      {record.confirmation.editableFields.length} editable fields
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecordId(record.id);
                        setView("editor");
                      }}
                    >
                      Open template {record.confirmation.packageValue.name}
                    </button>
                  </article>
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

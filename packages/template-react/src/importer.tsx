import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import type {
  PackageImageFieldConstraints,
  PackageTextFieldConstraints,
} from "@sleinity/template-core";
import {
  createTemplateImportWizard,
  formatRequiredFontFace,
  type TemplateImportConfirmationV1,
  type TemplateImportFieldRulePatchV1,
  type TemplateImportFieldRuleV1,
  type TemplateImportIssueV1,
  type TemplateImportWizardControllerV1,
  type TemplateImportWizardOptionsV1,
  type TemplateImportWizardSnapshotV1,
  type TemplateImportWizardStepId,
  type TemplateSessionSnapshotV1,
  type TemplateSessionV1,
} from "@sleinity/template-browser";
import {
  TemplateSessionRenderer,
  type TemplateSessionRendererHandle,
} from "./session";
import "./importer.css";

const TemplateImportWizardContext =
  createContext<TemplateImportWizardControllerV1 | null>(null);

const defaultStepTitles: Record<TemplateImportWizardStepId, string> = {
  "zip-import": "ZIP Import",
  "package-validation": "Package Validation",
  "font-validation": "Font Validation",
  "render-validation": "Render Validation",
  "field-rules": "Field Rules",
  confirmation: "Confirmation",
  completed: "Completed",
};

export interface TemplateImportWizardProviderProps {
  wizard: TemplateImportWizardControllerV1;
}

export function useTemplateImportWizard(
  options: TemplateImportWizardOptionsV1 = {},
): TemplateImportWizardControllerV1 {
  const [wizard] = useState(() => createTemplateImportWizard(options));
  const lifecycleGeneration = useRef(0);
  useEffect(() => {
    const generation = ++lifecycleGeneration.current;
    return () => {
      queueMicrotask(() => {
        if (lifecycleGeneration.current === generation) wizard.dispose();
      });
    };
  }, [wizard]);
  return wizard;
}

export function TemplateImportWizardProvider({
  wizard,
  children,
}: PropsWithChildren<TemplateImportWizardProviderProps>) {
  return (
    <TemplateImportWizardContext.Provider value={wizard}>
      {children}
    </TemplateImportWizardContext.Provider>
  );
}

function useResolvedWizard(
  override?: TemplateImportWizardControllerV1,
): TemplateImportWizardControllerV1 {
  const context = useContext(TemplateImportWizardContext);
  const wizard = override ?? context;
  if (!wizard) {
    throw new Error(
      "A TemplateImportWizard is required. Pass wizard or use TemplateImportWizardProvider.",
    );
  }
  return wizard;
}

export function useTemplateImportWizardSnapshot(
  wizardOverride?: TemplateImportWizardControllerV1,
): TemplateImportWizardSnapshotV1 {
  const wizard = useResolvedWizard(wizardOverride);
  return useSyncExternalStore(
    wizard.subscribe,
    wizard.getSnapshot,
    wizard.getSnapshot,
  );
}

export interface TemplateImportWizardPreviewProps {
  wizard?: TemplateImportWizardControllerV1;
  className?: string;
  style?: CSSProperties;
  fallback?: ReactNode;
}

export function TemplateImportWizardPreview({
  wizard: wizardOverride,
  className,
  style,
  fallback = <p>Preparing preview…</p>,
}: TemplateImportWizardPreviewProps) {
  const wizard = useResolvedWizard(wizardOverride);
  const snapshot = useTemplateImportWizardSnapshot(wizard);
  const assetErrors = useRef<TemplateImportIssueV1[]>([]);

  useEffect(() => {
    assetErrors.current = [];
  }, [snapshot.sessionRevision]);

  return (
    <TemplateSessionRenderer
      session={wizard.session}
      mode="editor"
      className={className}
      style={style}
      fallback={fallback}
      onAssetLoadError={(assetId, nodeId) => {
        assetErrors.current.push({
          code: "render.asset-load-failed",
          severity: "error",
          message: `Asset "${assetId}" could not be loaded for preview.`,
          details: { assetId, nodeId },
        });
      }}
      onRenderIdentity={(identity) => {
        wizard.publishRenderValidation({
          sessionRevision: snapshot.sessionRevision,
          identity,
          diagnostics: assetErrors.current,
        });
      }}
    />
  );
}

export interface TemplateImportWizardHandle {
  getSnapshot(): TemplateImportWizardSnapshotV1;
  loadZip(file: File): Promise<TemplateImportWizardSnapshotV1>;
  next(): TemplateImportWizardSnapshotV1;
  back(): TemplateImportWizardSnapshotV1;
  restart(): TemplateImportWizardSnapshotV1;
  cancel(): TemplateImportWizardSnapshotV1;
  confirm(): Promise<TemplateImportConfirmationV1>;
}

export interface TemplateImportWizardClassNames {
  root?: string;
  header?: string;
  steps?: string;
  step?: string;
  activeStep?: string;
  panel?: string;
  actions?: string;
  diagnostics?: string;
  fieldList?: string;
  field?: string;
  preview?: string;
  summary?: string;
}

export interface TemplateImportWizardLabels {
  title?: ReactNode;
  eyebrow?: ReactNode;
  chooseZip?: ReactNode;
  cancel?: ReactNode;
  back?: ReactNode;
  continue?: ReactNode;
  confirm?: ReactNode;
  restart?: ReactNode;
}

export interface TemplateImportWizardProps {
  wizard?: TemplateImportWizardControllerV1;
  options?: TemplateImportWizardOptionsV1;
  onComplete?(result: TemplateImportConfirmationV1): void | Promise<void>;
  onCancel?(): void;
  className?: string;
  classNames?: TemplateImportWizardClassNames;
  style?: CSSProperties;
  theme?: "light" | "dark" | "system";
  labels?: TemplateImportWizardLabels;
  stepTitles?: Partial<Record<TemplateImportWizardStepId, string>>;
  renderDiagnostic?: (issue: TemplateImportIssueV1) => ReactNode;
  renderActions?: (context: {
    wizard: TemplateImportWizardControllerV1;
    snapshot: TemplateImportWizardSnapshotV1;
  }) => ReactNode;
}

function joinClasses(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

function diagnosticLabel(issue: TemplateImportIssueV1): string {
  return `${issue.severity.toUpperCase()} · ${issue.code}`;
}

function DiagnosticList({
  issues,
  className,
  renderDiagnostic,
  hideWhenEmpty = false,
}: {
  issues: TemplateImportIssueV1[];
  className?: string;
  renderDiagnostic?: (issue: TemplateImportIssueV1) => ReactNode;
  hideWhenEmpty?: boolean;
}) {
  if (!issues.length) return hideWhenEmpty ? null : <p>No diagnostics.</p>;
  return (
    <div
      className={joinClasses("template-importer__diagnostics", className)}
      aria-label="Import diagnostics"
    >
      {issues.map((issue, index) => (
        <article
          key={`${issue.code}:${issue.fieldId ?? ""}:${index}`}
          role={issue.severity === "error" ? "alert" : undefined}
        >
          {renderDiagnostic ? (
            renderDiagnostic(issue)
          ) : (
            <>
              <strong>{diagnosticLabel(issue)}</strong>
              <p>{issue.message}</p>
            </>
          )}
        </article>
      ))}
    </div>
  );
}

function FieldRuleControl({
  wizard,
  field,
  className,
}: {
  wizard: TemplateImportWizardControllerV1;
  field: TemplateImportFieldRuleV1;
  className?: string;
}) {
  const textConstraints = field.constraints as
    | PackageTextFieldConstraints
    | undefined;
  const imageConstraints = field.constraints as
    | PackageImageFieldConstraints
    | undefined;
  const applyPatch = (patch: TemplateImportFieldRulePatchV1) => {
    wizard.updateFieldRule(field.ruleId, patch);
  };
  const updateTextNumber = (
    property: "maxCharacters" | "maxLines",
    value: string,
  ) => {
    applyPatch({
      constraints: {
        ...(textConstraints ?? {}),
        [property]: value === "" ? undefined : Math.max(1, Number(value)),
      },
    });
  };
  const updateImageNumber = (
    property: "maxFileSizeMb" | "minWidth" | "minHeight",
    value: string,
  ) => {
    applyPatch({
      constraints: {
        ...(imageConstraints ?? {}),
        [property]: value === "" ? undefined : Math.max(0, Number(value)),
      },
    });
  };
  return (
    <section className={joinClasses("template-importer__field", className)}>
      <div className="template-importer__field-heading">
        <strong>{field.label}</strong>
        <span>{field.type}</span>
      </div>
      <div className="template-importer__grid">
        <label>
          <span>Enabled</span>
          <input
            type="checkbox"
            checked={field.enabled}
            onChange={(event) => applyPatch({ enabled: event.target.checked })}
          />
        </label>
        <label>
          <span>Label</span>
          <input
            value={field.label}
            onChange={(event) => applyPatch({ label: event.target.value })}
          />
        </label>
        <label className="template-importer__wide">
          <span>Help text</span>
          <input
            value={field.helpText ?? ""}
            onChange={(event) => applyPatch({ helpText: event.target.value })}
          />
        </label>
      </div>
      {field.targetStatus !== "ready" ? (
        <p className="template-importer__notice" role="alert">
          This field remains visible, but its target is {field.targetStatus}.
        </p>
      ) : null}
      {field.warnings.map((warning) => (
        <p
          className="template-importer__notice"
          key={warning.code}
          role="status"
        >
          {warning.message}
        </p>
      ))}
      {field.type === "text" ||
      field.type === "textarea" ||
      field.type === "number" ||
      field.type === "date" ? (
        <div className="template-importer__grid">
          <label>
            <span>Maximum characters</span>
            <input
              type="number"
              min={1}
              value={textConstraints?.maxCharacters ?? ""}
              onChange={(event) =>
                updateTextNumber("maxCharacters", event.target.value)}
            />
          </label>
          <label>
            <span>Maximum lines</span>
            <input
              type="number"
              min={1}
              value={textConstraints?.maxLines ?? ""}
              onChange={(event) =>
                updateTextNumber("maxLines", event.target.value)}
            />
          </label>
          <label>
            <span>Pattern</span>
            <select
              value={textConstraints?.pattern ?? "free"}
              onChange={(event) =>
                applyPatch({
                  constraints: {
                    ...(textConstraints ?? {}),
                    pattern: event.target.value as NonNullable<
                      PackageTextFieldConstraints["pattern"]
                    >,
                  },
                })}
            >
              <option value="free">Free text</option>
              <option value="number">Number</option>
              <option value="currency">Currency</option>
              <option value="percentage">Percentage</option>
              <option value="date">Date</option>
              <option value="email">Email</option>
              <option value="url">URL</option>
            </select>
          </label>
          <label>
            <span>Overflow</span>
            <select
              value={field.behavior?.onOverflow ?? "allow"}
              onChange={(event) =>
                applyPatch({
                  behavior: {
                    ...(field.behavior ?? {}),
                    onOverflow: event.target.value as NonNullable<
                      NonNullable<TemplateImportFieldRuleV1["behavior"]>["onOverflow"]
                    >,
                  },
                })}
            >
              <option value="allow">Allow</option>
              <option value="prevent-input">Prevent input</option>
              <option value="trim">Trim</option>
              <option value="warn-only">Warn</option>
              <option value="clip-preview">Clip preview</option>
              <option value="shrink-to-fit">Shrink to fit</option>
            </select>
          </label>
        </div>
      ) : null}
      {field.type === "image" ? (
        <>
          <div className="template-importer__grid">
            <label>
              <span>Replacement mode</span>
              <select
                value={
                  imageConstraints?.replacementMode ??
                  "preserve-original-crop"
                }
                onChange={(event) =>
                  applyPatch({
                    constraints: {
                      ...(imageConstraints ?? {}),
                      replacementMode: event.target.value as NonNullable<
                        PackageImageFieldConstraints["replacementMode"]
                      >,
                    },
                  })}
              >
                <option value="cover">Fill frame</option>
                <option value="contain">Fit inside frame</option>
                <option value="preserve-original-crop">
                  Preserve imported crop
                </option>
                <option value="user-crop">Host-provided crop</option>
              </select>
            </label>
            <label>
              <span>Maximum file size (MB)</span>
              <input
                type="number"
                min={0}
                step="0.1"
                value={imageConstraints?.maxFileSizeMb ?? ""}
                onChange={(event) =>
                  updateImageNumber("maxFileSizeMb", event.target.value)}
              />
            </label>
            <label>
              <span>Minimum width</span>
              <input
                type="number"
                min={0}
                value={imageConstraints?.minWidth ?? ""}
                onChange={(event) =>
                  updateImageNumber("minWidth", event.target.value)}
              />
            </label>
            <label>
              <span>Minimum height</span>
              <input
                type="number"
                min={0}
                value={imageConstraints?.minHeight ?? ""}
                onChange={(event) =>
                  updateImageNumber("minHeight", event.target.value)}
              />
            </label>
            <label className="template-importer__wide">
              <span>Allowed MIME types</span>
              <input
                value={imageConstraints?.allowedMimeTypes?.join(", ") ?? ""}
                onChange={(event) =>
                  applyPatch({
                    constraints: {
                      ...(imageConstraints ?? {}),
                      allowedMimeTypes: event.target.value
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean),
                    },
                  })}
              />
            </label>
          </div>
        </>
      ) : null}
    </section>
  );
}

interface TemplateImportWizardContentProps
  extends Omit<TemplateImportWizardProps, "wizard" | "options"> {
  wizard: TemplateImportWizardControllerV1;
}

const TemplateImportWizardContent = forwardRef<
  TemplateImportWizardHandle,
  TemplateImportWizardContentProps
>(function TemplateImportWizardContent(
  {
    wizard,
    onComplete,
    onCancel,
    className,
    classNames = {},
    style,
    theme = "system",
    labels = {},
    stepTitles = {},
    renderDiagnostic,
    renderActions,
  },
  forwardedRef,
) {
  const snapshot = useTemplateImportWizardSnapshot(wizard);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titles = { ...defaultStepTitles, ...stepTitles };

  const loadFile = async (file: File) =>
    wizard.loadZip({
      bytes: await file.arrayBuffer(),
      sourceName: file.name,
    });

  useImperativeHandle(
    forwardedRef,
    () => ({
      getSnapshot: wizard.getSnapshot,
      loadZip: loadFile,
      next: wizard.next,
      back: wizard.back,
      restart: wizard.restart,
      cancel: wizard.cancel,
      confirm: wizard.confirm,
    }),
    [wizard],
  );

  const selectZip = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void loadFile(file);
  };
  const dropZip = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) void loadFile(file);
  };
  const finish = async () => {
    try {
      const result = await wizard.confirm();
      await onComplete?.(result);
    } catch {
      // The controller publishes the retryable error in its snapshot.
    }
  };
  const active = snapshot.steps[snapshot.activeStep];
  const showPreview =
    snapshot.activeStep === "render-validation" ||
    snapshot.activeStep === "field-rules" ||
    snapshot.activeStep === "confirmation";

  return (
    <TemplateImportWizardProvider wizard={wizard}>
      <section
        className={joinClasses(
          "template-importer",
          classNames.root,
          className,
        )}
        style={style}
        data-theme={theme}
        data-active-step={snapshot.activeStep}
        aria-label="Template setup wizard"
      >
        <input
          ref={fileInputRef}
          type="file"
          aria-label="Choose template ZIP"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={selectZip}
          hidden
        />
        <header
          className={joinClasses(
            "template-importer__header",
            classNames.header,
          )}
        >
          <div>
            <p className="template-importer__eyebrow">
              {labels.eyebrow ?? "Template Platform"}
            </p>
            <h2>{labels.title ?? "Import template"}</h2>
          </div>
          <span
            className="template-importer__status"
            data-status={active.status}
          >
            {active.status}
          </span>
        </header>

        <ol
          className={joinClasses(
            "template-importer__steps",
            classNames.steps,
          )}
        >
          {Object.entries(titles).map(([id, title], index) => {
            const stepId = id as TemplateImportWizardStepId;
            const step = snapshot.steps[stepId];
            return (
              <li
                key={stepId}
                className={joinClasses(
                  "template-importer__step",
                  classNames.step,
                  stepId === snapshot.activeStep &&
                    "template-importer__step--active",
                  stepId === snapshot.activeStep && classNames.activeStep,
                )}
                aria-current={
                  stepId === snapshot.activeStep ? "step" : undefined
                }
                data-status={step.status}
              >
                <span>{index + 1}</span>
                {title}
              </li>
            );
          })}
        </ol>

        {snapshot.error ? (
          <p className="template-importer__notice" role="alert">
            {snapshot.error.message}
          </p>
        ) : null}

        <div
          className={joinClasses(
            "template-importer__panel",
            classNames.panel,
          )}
        >
          {snapshot.activeStep === "zip-import" ? (
            <>
              <h3>Import TemplatePackage ZIP</h3>
              <p>
                Select or drop the ZIP. It is read once locally and is never
                uploaded.
              </p>
              <div
                className="template-importer__dropzone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={dropZip}
              >
                <strong>{labels.chooseZip ?? "Choose template ZIP"}</strong>
                <span>Accepts .zip and application/zip.</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={snapshot.busy}
                >
                  Browse files
                </button>
              </div>
            </>
          ) : null}

          {snapshot.activeStep === "package-validation" ? (
            <>
              <h3>Package validation</h3>
              {snapshot.packageSummary ? (
                <dl
                  className={joinClasses(
                    "template-importer__summary",
                    classNames.summary,
                  )}
                >
                  <div>
                    <dt>File</dt>
                    <dd>{snapshot.sourceName}</dd>
                  </div>
                  <div>
                    <dt>Package</dt>
                    <dd>{snapshot.packageSummary.name}</dd>
                  </div>
                  <div>
                    <dt>Dimensions</dt>
                    <dd>
                      {snapshot.packageSummary.width} ×{" "}
                      {snapshot.packageSummary.height}
                    </dd>
                  </div>
                  <div>
                    <dt>Editable fields</dt>
                    <dd>{snapshot.packageSummary.editableFieldCount}</dd>
                  </div>
                  <div>
                    <dt>Assets</dt>
                    <dd>{snapshot.packageSummary.assetCount}</dd>
                  </div>
                  <div>
                    <dt>Required fonts</dt>
                    <dd>{snapshot.packageSummary.requiredFontCount}</dd>
                  </div>
                </dl>
              ) : null}
              <DiagnosticList
                issues={active.diagnostics}
                className={classNames.diagnostics}
                renderDiagnostic={renderDiagnostic}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={snapshot.busy}
              >
                Choose another ZIP
              </button>
            </>
          ) : null}

          {snapshot.activeStep === "font-validation" ? (
            <>
              <h3>Validate required fonts</h3>
              <p>
                Every text face requires an exact bundled, managed, host, or
                uploaded font binary.
              </p>
              {!snapshot.fontValidation.requirements.length ? (
                <p>No font files are required.</p>
              ) : (
                snapshot.fontValidation.requirements.map((requirement) => (
                  <section
                    className="template-importer__font"
                    key={requirement.requirementId}
                    data-font-requirement-id={requirement.requirementId}
                    data-font-family={requirement.family}
                    data-font-weight={requirement.weight}
                    data-font-style={requirement.posture}
                    data-font-resolution-classification={
                      requirement.status === "ready" ||
                      requirement.status === "warning"
                        ? "exact"
                        : "missing"
                    }
                    data-font-linked-binary-hash={requirement.binaryHash}
                  >
                    <div>
                      <strong>
                        {formatRequiredFontFace({
                          id: requirement.requirementId,
                          family: requirement.family,
                          style: requirement.style,
                          cssStyle: requirement.posture,
                          weight: requirement.weight,
                          postScriptName: null,
                          usedBy: [],
                          characters: "",
                          editable: true,
                          mixedStyle: false,
                          source: "wizard",
                          availableInFigma: false,
                        })}
                      </strong>
                      <p>
                        {requirement.fileName
                          ? `Exact font verified · ${requirement.fileName}`
                          : "Upload the exact font file specified above."}
                      </p>
                      {requirement.emojiFallback ? (
                        <p>
                          Emoji in this template will use the device emoji
                          font.
                        </p>
                      ) : null}
                    </div>
                    <div className="template-importer__font-actions">
                      {(() => {
                        const rejected = requirement.diagnostics.some(
                          (diagnostic) =>
                            diagnostic.code === "font.upload-rejected" ||
                            diagnostic.code === "font.adapter-failed",
                        );
                        const status = requirement.status === "warning" ||
                          requirement.status === "ready"
                          ? "Ready"
                          : requirement.status === "running"
                            ? "Checking file…"
                            : rejected
                              ? "File doesn’t match"
                              : "Font required";
                        return (
                      <span
                        className="template-importer__font-status"
                        data-status={
                          status === "Ready"
                            ? "ready"
                            : status === "File doesn’t match"
                              ? "invalid"
                              : "required"
                        }
                      >
                        {status}
                      </span>
                        );
                      })()}
                      <label className="template-importer__button">
                        {requirement.fileName
                          ? "Replace file"
                          : "Upload font file"}
                        <input
                          type="file"
                          accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            event.currentTarget.value = "";
                            if (!file) return;
                            void file.arrayBuffer().then((bytes) =>
                              wizard.uploadFont(requirement.requirementId, {
                                bytes,
                                mimeType:
                                  file.type ||
                                  "application/octet-stream",
                                fileName: file.name,
                              }),
                            );
                          }}
                        />
                      </label>
                    </div>
                    <DiagnosticList
                      issues={requirement.diagnostics.filter(
                        (diagnostic) =>
                          diagnostic.code !== "font.emoji-platform-fallback",
                      )}
                      renderDiagnostic={renderDiagnostic}
                      hideWhenEmpty
                    />
                  </section>
                ))
              )}
            </>
          ) : null}

          {snapshot.activeStep === "render-validation" ? (
            <>
              <h3>Render validation</h3>
              <p>
                This uses the same renderer and current revision as the editor.
              </p>
              <DiagnosticList
                issues={snapshot.renderValidation.diagnostics}
                className={classNames.diagnostics}
                renderDiagnostic={renderDiagnostic}
              />
            </>
          ) : null}

          {snapshot.activeStep === "field-rules" ? (
            <>
              <h3>Configure field rules</h3>
              <p>
                Fields remain descriptor-driven; target paths stay internal to
                the SDK.
              </p>
              <div
                className={joinClasses(
                  "template-importer__fields",
                  classNames.fieldList,
                )}
              >
                {snapshot.fieldRules.map((field, index) => (
                  <div key={field.ruleId}>
                    <div className="template-importer__order">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() =>
                          wizard.reorderFieldRule(field.ruleId, index - 1)}
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        disabled={index === snapshot.fieldRules.length - 1}
                        onClick={() =>
                          wizard.reorderFieldRule(field.ruleId, index + 1)}
                      >
                        Move down
                      </button>
                    </div>
                    <FieldRuleControl
                      wizard={wizard}
                      field={field}
                      className={classNames.field}
                    />
                  </div>
                ))}
                {!snapshot.fieldRules.length ? (
                  <p>No editable fields were declared or derived.</p>
                ) : null}
              </div>
            </>
          ) : null}

          {snapshot.activeStep === "confirmation" ? (
            <>
              <h3>Confirm template</h3>
              <p>
                Review the package, field, font, and render evidence before
                handing the result to the host.
              </p>
              <dl
                className={joinClasses(
                  "template-importer__summary",
                  classNames.summary,
                )}
              >
                <div>
                  <dt>Package</dt>
                  <dd>{snapshot.packageSummary?.name}</dd>
                </div>
                <div>
                  <dt>Fields</dt>
                  <dd>
                    {
                      snapshot.fieldRules.filter((field) => field.enabled)
                        .length
                    }
                  </dd>
                </div>
                <div>
                  <dt>Fonts</dt>
                  <dd>{snapshot.fontValidation.status}</dd>
                </div>
                <div>
                  <dt>Render</dt>
                  <dd>{snapshot.renderValidation.status}</dd>
                </div>
              </dl>
              <DiagnosticList
                issues={active.diagnostics}
                className={classNames.diagnostics}
                renderDiagnostic={renderDiagnostic}
              />
            </>
          ) : null}

          {snapshot.activeStep === "completed" ? (
            <>
              <h3>Template ready</h3>
              <p>
                The host-neutral result is complete. The host may now persist,
                publish, or navigate through its own services.
              </p>
              <p>
                Package fingerprint:{" "}
                <code>{snapshot.completion?.packageFingerprint}</code>
              </p>
            </>
          ) : null}

          {showPreview ? (
            <div
              className={joinClasses(
                "template-importer__preview",
                classNames.preview,
              )}
            >
              <TemplateImportWizardPreview />
            </div>
          ) : null}
        </div>

        <footer
          className={joinClasses(
            "template-importer__actions",
            classNames.actions,
          )}
        >
          {renderActions ? (
            renderActions({ wizard, snapshot })
          ) : snapshot.activeStep === "completed" ? (
            <button type="button" onClick={wizard.restart}>
              {labels.restart ?? "Import another template"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  wizard.cancel();
                  onCancel?.();
                }}
              >
                {labels.cancel ?? "Cancel"}
              </button>
              <div>
                <button
                  type="button"
                  onClick={wizard.back}
                  disabled={!active.canGoBack}
                >
                  {labels.back ?? "Back"}
                </button>
                {snapshot.activeStep === "confirmation" ? (
                  <button
                    type="button"
                    disabled={!active.canContinue}
                    onClick={() => void finish()}
                  >
                    {labels.confirm ?? "Use template"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!active.canContinue}
                    onClick={wizard.next}
                  >
                    {labels.continue ?? "Continue"}
                  </button>
                )}
              </div>
            </>
          )}
        </footer>
      </section>
    </TemplateImportWizardProvider>
  );
});

const OwnedTemplateImportWizard = forwardRef<
  TemplateImportWizardHandle,
  Omit<TemplateImportWizardProps, "wizard">
>(function OwnedTemplateImportWizard({ options, ...props }, forwardedRef) {
  const wizard = useTemplateImportWizard(options);
  return (
    <TemplateImportWizardContent
      {...props}
      ref={forwardedRef}
      wizard={wizard}
    />
  );
});

export const TemplateImportWizard = forwardRef<
  TemplateImportWizardHandle,
  TemplateImportWizardProps
>(function TemplateImportWizard({ wizard, ...props }, forwardedRef) {
  return wizard ? (
    <TemplateImportWizardContent
      {...props}
      ref={forwardedRef}
      wizard={wizard}
    />
  ) : (
    <OwnedTemplateImportWizard {...props} ref={forwardedRef} />
  );
});

export interface TemplateImporterCompletionV1
  extends TemplateImportConfirmationV1 {
  snapshot: TemplateSessionSnapshotV1;
  source: TemplateSessionSnapshotV1["source"];
}

export interface TemplateImporterWizardProps
  extends Omit<TemplateImportWizardProps, "wizard" | "options" | "onComplete"> {
  session: TemplateSessionV1;
  onComplete(
    result: TemplateImporterCompletionV1,
  ): void | Promise<void>;
}

/**
 * @deprecated Use TemplateImportWizard or the provider/hooks from this entry.
 */
export function TemplateImporterWizard({
  session,
  onComplete,
  ...props
}: TemplateImporterWizardProps) {
  const wizard = useTemplateImportWizard({ session });
  return (
    <TemplateImportWizard
      {...props}
      wizard={wizard}
      onComplete={(result) =>
        onComplete({
          ...result,
          snapshot: session.getSnapshot(),
          source: session.getSnapshot().source,
        })}
    />
  );
}

export type TemplateImporterWizardStep = TemplateImportWizardStepId;

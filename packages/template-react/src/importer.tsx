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
import {
  createTemplateImportWizard,
  formatRequiredFontFace,
  type TemplateImportConfirmationV1,
  type TemplateImportIssueV1,
  type TemplateImportWizardControllerV1,
  type TemplateImportWizardOptionsV1,
  type TemplateImportWizardSnapshotV1,
  type TemplateImportWizardStepId,
} from "@sleinity/template-browser/importer";
import type {
  TemplateSessionSnapshotV1,
  TemplateSessionV1,
} from "@sleinity/template-browser/session";
import {
  TemplateSessionRenderer,
  useTemplateSessionSnapshot,
  type TemplateSessionRendererHandle,
} from "./session";
import {
  fitPreviewBounds,
  type PreviewViewportTransform,
} from "./render/previewViewport";
import {
  TemplateImportFieldRulesEditor,
  TemplateImportValidationSummary,
} from "./importerComponents";
export {
  TemplateImportFieldRulesEditor,
  TemplateImportRenderValidationSummary,
  TemplateImportValidationSummary,
} from "./importerComponents";
export type {
  TemplateImportFieldRulesEditorProps,
  TemplateImportRenderValidationSummaryProps,
  TemplateImportValidationSummaryProps,
} from "./importerComponents";
import "./importer.css";

const TemplateImportWizardContext =
  createContext<TemplateImportWizardControllerV1 | null>(null);

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
  const sessionSnapshot = useTemplateSessionSnapshot(wizard.session);
  const assetErrors = useRef<TemplateImportIssueV1[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportTransform, setViewportTransform] =
    useState<PreviewViewportTransform | null>(null);
  const canvas = sessionSnapshot.workingPackage?.canvas ?? null;

  useEffect(() => {
    assetErrors.current = [];
  }, [snapshot.sessionRevision]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !canvas) {
      setViewportTransform(null);
      return;
    }
    const refit = () => {
      const bounds = viewport.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      setViewportTransform(
        fitPreviewBounds(
          { width: bounds.width, height: bounds.height },
          { x: 0, y: 0, width: canvas.width, height: canvas.height },
          { safePadding: bounds.width < 480 ? 16 : bounds.width < 900 ? 24 : 32 },
        ),
      );
    };
    const observer = new ResizeObserver(refit);
    observer.observe(viewport);
    refit();
    return () => observer.disconnect();
  }, [canvas?.height, canvas?.width]);

  const transformStyle = canvas
    ? ({
        width: canvas.width,
        height: canvas.height,
        transform: viewportTransform
          ? `translate(${viewportTransform.translateX}px, ${viewportTransform.translateY}px) scale(${viewportTransform.scale})`
          : undefined,
        transformOrigin: "0 0",
        opacity: viewportTransform ? 1 : 0,
      } satisfies CSSProperties)
    : undefined;

  return (
    <div
      ref={viewportRef}
      className={className}
      style={style}
    >
      {canvas ? (
        <div
          className="template-importer__preview-transform"
          style={transformStyle}
        >
          <TemplateSessionRenderer
            session={wizard.session}
            mode="editor"
            className="template-importer__preview-renderer"
            style={{ width: canvas.width, height: canvas.height }}
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
        </div>
      ) : (
        fallback
      )}
    </div>
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
  if (!issues.length) {
    return hideWhenEmpty ? null : <p>No unresolved diagnostics</p>;
  }
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

function visiblePageIndex(step: TemplateImportWizardStepId): number {
  if (step === "zip-import" || step === "package-validation") return 0;
  if (step === "font-validation") return 1;
  if (step === "render-validation") return 2;
  if (step === "field-rules") return 3;
  return 4;
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
  const contentRef = useRef<HTMLDivElement>(null);
  const visiblePages = [
    { id: "package", title: stepTitles["package-validation"] ?? stepTitles["zip-import"] ?? "Package" },
    { id: "fonts", title: stepTitles["font-validation"] ?? "Fonts" },
    { id: "validate", title: stepTitles["render-validation"] ?? "Validate" },
    { id: "fields", title: stepTitles["field-rules"] ?? "Fields" },
    { id: "confirm", title: stepTitles.confirmation ?? "Confirm" },
  ] as const;

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
  const pageIndex = visiblePageIndex(snapshot.activeStep);
  const currentPage = visiblePages[pageIndex];

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [pageIndex]);

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
        <aside className="template-importer__sidebar">
          <button
            type="button"
            className="template-importer__host-back"
            onClick={() => {
              wizard.cancel();
              onCancel?.();
            }}
          >
            <span aria-hidden="true">←</span> Templates
          </button>
          <div className="template-importer__sidebar-heading">
            <strong>{labels.title ?? "Import template"}</strong>
          </div>
          <ol className={joinClasses("template-importer__steps", classNames.steps)}>
            {visiblePages.map((page, index) => (
              <li
                key={page.id}
                className={joinClasses(
                  "template-importer__step",
                  classNames.step,
                  index === pageIndex && "template-importer__step--active",
                  index === pageIndex && classNames.activeStep,
                )}
                aria-current={index === pageIndex ? "step" : undefined}
                aria-label={`${page.title}, ${index < pageIndex ? "completed" : index === pageIndex ? "current step" : "upcoming"}`}
                data-status={index < pageIndex ? "ready" : index === pageIndex ? active.status : "idle"}
              >
                <span className="template-importer__step-marker" aria-hidden="true">{index < pageIndex ? "✓" : index + 1}</span>
                {page.title}
              </li>
            ))}
          </ol>
          <p className="template-importer__ownership-note">
            The SDK checks the package and returns the confirmed template to
            the host application.
          </p>
        </aside>

        <div className="template-importer__main">
          <header className={joinClasses("template-importer__header", classNames.header)}>
            <div>
              <p className="template-importer__mobile-step">
                Step {pageIndex + 1} of 5 · {currentPage.title}
              </p>
              <h2>{currentPage.title}</h2>
              <p className="template-importer__supporting-copy">
                {pageIndex === 0
                  ? "Choose a TemplatePackage ZIP. It is processed locally and never uploaded."
                  : pageIndex === 1
                    ? "Provide each exact font file required for consistent rendering."
                    : pageIndex === 2
                      ? "Review package correctness and the current renderer result."
                      : pageIndex === 3
                        ? "Drag to set input order. Open a field to set its limits."
                        : "Review the template before returning it to the host application."}
              </p>
            </div>
          </header>

          <div ref={contentRef} className="template-importer__content">
            {snapshot.error ? (
              <p className="template-importer__notice" role="alert">
                {snapshot.error.message}
              </p>
            ) : null}

            <div className={joinClasses("template-importer__panel", classNames.panel)}>
            {snapshot.activeStep === "zip-import" ? (
            <section className="template-importer__section" aria-label="Package upload">
              <div
                className="template-importer__dropzone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={dropZip}
              >
                <span className="template-importer__drop-icon" aria-hidden="true">↑</span>
                <strong>{labels.chooseZip ?? "Drop or choose a TemplatePackage ZIP"}</strong>
                <span>ZIP only · processed in this browser</span>
                <button
                  className="template-importer__secondary-button"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={snapshot.busy}
                >
                  Choose ZIP
                </button>
              </div>
            </section>
          ) : null}

          {snapshot.activeStep === "package-validation" ? (
            <section className="template-importer__section">
              <div className="template-importer__section-heading">
                <div><h3>Selected package</h3><p>The package is ready for the remaining setup checks.</p></div>
                <button className="template-importer__secondary-button" type="button" onClick={() => fileInputRef.current?.click()} disabled={snapshot.busy}>Choose another ZIP</button>
              </div>
              {snapshot.packageSummary ? (
                <dl
                  className={joinClasses(
                    "template-importer__summary",
                    classNames.summary,
                  )}
                >
                  <div>
                    <dt>File</dt>
                    <dd title={snapshot.sourceName ?? undefined}>{snapshot.sourceName}</dd>
                  </div>
                  <div>
                    <dt>Package</dt>
                    <dd title={snapshot.packageSummary.name}>{snapshot.packageSummary.name}</dd>
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
              {snapshot.importValidation?.status !== "ready" ? (
                <TemplateImportValidationSummary
                  report={snapshot.importValidation}
                  className={classNames.diagnostics}
                  renderIssue={renderDiagnostic}
                />
              ) : null}
            </section>
          ) : null}

          {snapshot.activeStep === "font-validation" ? (
            <section className="template-importer__section" aria-label="Required fonts">
              {!snapshot.fontValidation.requirements.length ? (
                <p>No font files are required.</p>
              ) : (
                <div className="template-importer__font-list">
                {snapshot.fontValidation.requirements.map((requirement) => (
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
                          diagnostic.code !== "font.emoji-platform-fallback" &&
                          // This is the expected unresolved state. The status
                          // and upload action already explain the next step;
                          // reserving diagnostic space for actual file errors
                          // keeps the row calm and actionable.
                          diagnostic.code !== "font.exact-face-required",
                      )}
                      renderDiagnostic={renderDiagnostic}
                      hideWhenEmpty
                    />
                  </section>
                ))}
                </div>
              )}
            </section>
          ) : null}

          {snapshot.activeStep === "render-validation" ? (
            <div className="template-importer__two-column-layout template-importer__validate-layout">
              <section className="template-importer__section">
                <TemplateImportValidationSummary
                  report={snapshot.importValidation}
                  packageSummary={snapshot.packageSummary}
                  sourceFilename={snapshot.sourceName}
                  fontReport={snapshot.fontValidation}
                  renderReport={snapshot.renderValidation}
                  className={classNames.diagnostics}
                  renderIssue={renderDiagnostic}
                />
              </section>
              <section className="template-importer__section template-importer__preview-column" aria-label="Template preview">
                <TemplateImportWizardPreview className={joinClasses("template-importer__preview", classNames.preview)} />
              </section>
            </div>
          ) : null}

          {snapshot.activeStep === "field-rules" ? (
            <div className="template-importer__two-column-layout template-importer__fields-layout">
              <section className="template-importer__section">
                <TemplateImportFieldRulesEditor fields={snapshot.fieldRules} onUpdateField={wizard.updateFieldRule} onReorderField={wizard.reorderFieldRule} className={classNames.fieldList} fieldClassName={classNames.field} />
              </section>
              <section className="template-importer__section template-importer__preview-column" aria-label="Template preview">
                <TemplateImportWizardPreview className={joinClasses("template-importer__preview", classNames.preview)} />
              </section>
            </div>
          ) : null}

          {snapshot.activeStep === "confirmation" ? (
            <div className="template-importer__two-column-layout template-importer__confirmation-layout">
              <section className="template-importer__section">
              <dl
                className={joinClasses(
                  "template-importer__summary",
                  classNames.summary,
                )}
              >
                <div>
                  <dt>Package</dt>
                  <dd title={snapshot.packageSummary?.name}>{snapshot.packageSummary?.name}</dd>
                </div>
                <div>
                  <dt>Fields</dt>
                  <dd>
                    {
                      snapshot.fieldRules.length
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
              </section>
              <section className="template-importer__section template-importer__preview-column" aria-label="Final template preview">
                <TemplateImportWizardPreview className={joinClasses("template-importer__preview", classNames.preview)} />
              </section>
            </div>
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

            </div>
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
              <div>
                {snapshot.activeStep !== "zip-import" ? (
                  <button
                    className="template-importer__secondary-button"
                    type="button"
                    onClick={wizard.back}
                    disabled={!active.canGoBack}
                  >
                    {labels.back ?? "Back"}
                  </button>
                ) : null}
                {snapshot.activeStep === "confirmation" ? (
                  <button
                    className="template-importer__primary-button"
                    type="button"
                    disabled={!active.canContinue}
                    onClick={() => void finish()}
                  >
                    {labels.confirm ?? "Use template"}
                  </button>
                ) : (
                  <button
                    className="template-importer__primary-button"
                    type="button"
                    disabled={!active.canContinue}
                    onClick={wizard.next}
                  >
                    {labels.continue ?? (
                      snapshot.activeStep === "zip-import" || snapshot.activeStep === "package-validation" ? "Import package" :
                      snapshot.activeStep === "font-validation" ? "Continue to validation" :
                      snapshot.activeStep === "render-validation" ? "Continue to fields" :
                      snapshot.activeStep === "field-rules" ? "Continue to confirmation" :
                      "Continue"
                    )}
                  </button>
                )}
              </div>
            </>
          )}
          </footer>
        </div>
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

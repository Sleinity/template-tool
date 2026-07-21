import {
  ArrowLeft,
  ListChecks,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EditorLayout } from "../components/EditorLayout";
import {
  Alert,
  Button,
  CountBadge,
  IconButton,
  PreviewWorkspace,
  Status,
  TemplatePreviewStage,
  Toggle,
  WorkspaceSidePanel,
} from "../components/ui";
import {
  TemplatePackageDiagnosticsPanel,
  TemplatePackageFieldEditor,
  validatePackageFieldConstraints,
} from "../template-package/editor";
import {
  collectTemplatePackageRenderWarnings,
  ScaledTemplatePackagePreview,
  TemplatePackageRenderer,
  type TemplatePackageMotionRenderMode,
} from "@sleinity/template-react";
import {
  createResolvedRenderTree,
  type FontReadinessReport,
  type PackageEditorFieldWarning,
  type TemplatePackageEditorSession,
  type EditableFieldBinding,
  type TemplatePackageV1,
} from "@sleinity/template-core";
import {
  exportTemplatePackagePng,
  measureTextFieldFit,
  PackagePngExportError,
  prepareTemplatePackageFonts,
  validatePackageJpgExportReadiness,
  type FieldTextFitResult,
  type PackagePngExportDiagnostic,
  type DraftAutosaveState,
} from "@sleinity/template-browser";
import { getPackageMotionSummary } from "../template-package/motion";
import { createRuntimeRoutingHarnessApi } from "../template-package/runtime-routing/devHarness";

interface TemplatePackageEditorPageProps {
  session: TemplatePackageEditorSession;
  onSessionChange?: (session: TemplatePackageEditorSession) => void;
  saveState?: DraftAutosaveState;
  onRetrySave?: () => Promise<void>;
  onFlushPendingSave?: () => Promise<void>;
  onOpenTemplateSettings: () => void | Promise<void>;
  onBackToTemplates: () => void | Promise<void>;
}

const cleanSaveState: DraftAutosaveState = {
  status: "clean",
  revision: 0,
  savedRevision: 0,
  message: null,
};

export function getLivePreviewMotionRenderMode(
  motionEnabled: boolean,
  hasPlayableMotion: boolean,
): TemplatePackageMotionRenderMode {
  return motionEnabled && hasPlayableMotion ? "playback" : "final-frame";
}

export function getPngExportMotionRenderMode(
  _motionEnabled: boolean,
): TemplatePackageMotionRenderMode {
  return "final-frame";
}

export function TemplatePackageEditorPage({
  session,
  onSessionChange,
  saveState = cleanSaveState,
  onRetrySave,
  onFlushPendingSave,
  onOpenTemplateSettings,
  onBackToTemplates,
}: TemplatePackageEditorPageProps) {
  const { originalPackage, validation } = session;
  const [workingPackage, setWorkingPackage] = useState<TemplatePackageV1>(() =>
    structuredClone(session.workingPackage),
  );
  const [hasEdits, setHasEdits] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [debugField, setDebugField] =
    useState<EditableFieldBinding | null>(null);
  const [editorWarnings, setEditorWarnings] = useState<
    PackageEditorFieldWarning[]
  >([]);
  const [fontReadiness, setFontReadiness] =
    useState<FontReadinessReport | null>(null);
  const [textFitResults, setTextFitResults] = useState<
    FieldTextFitResult[]
  >([]);
  const [pngExportState, setPngExportState] = useState<{
    status: "idle" | "preparing" | "complete" | "failed";
    message: string | null;
    diagnostics: PackagePngExportDiagnostic[];
  }>({
    status: "idle",
    message: null,
    diagnostics: [],
  });
  const previewScopeRef = useRef<HTMLDivElement>(null);
  const exportCaptureRef = useRef<HTMLDivElement>(null);
  const motionAnimationRef = useRef<number | null>(null);
  const motionLastFrameRef = useRef<number | null>(null);
  const flushPendingSaveRef = useRef(onFlushPendingSave);
  const workingPackageRef = useRef(workingPackage);

  useEffect(() => {
    workingPackageRef.current = workingPackage;
  }, [workingPackage]);

  useEffect(() => {
    flushPendingSaveRef.current = onFlushPendingSave;
  }, [onFlushPendingSave]);
  useEffect(
    () => () => {
      void flushPendingSaveRef.current?.().catch(() => undefined);
    },
    [],
  );

  const motionSummary = useMemo(
    () => getPackageMotionSummary(workingPackage),
    [workingPackage],
  );
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [motionPlaying, setMotionPlaying] = useState(false);
  const [motionTimeMs, setMotionTimeMs] = useState(0);
  const hasPlayableMotion =
    Boolean(workingPackage.motion) &&
    motionSummary.durationMs > 0 &&
    motionSummary.animatedNodeCount > 0;

  const rendererWarnings = useMemo(
    () =>
      collectTemplatePackageRenderWarnings(
        workingPackage,
        "editor",
      ),
    [workingPackage],
  );
  const appWarnings = validation.diagnostics.filter(
    (item) => item.severity === "warning",
  );
  const appErrors = validation.diagnostics.filter(
    (item) => item.severity === "error",
  );
  const resolvedTree = useMemo(
    () => createResolvedRenderTree(workingPackage),
    [workingPackage],
  );
  useEffect(() => {
    let cancelled = false;
    void prepareTemplatePackageFonts(
      workingPackage,
      resolvedTree,
      document.fonts,
    ).then(
      (report) => {
        if (!cancelled) setFontReadiness(report);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [resolvedTree, workingPackage]);
  const exportReadiness = useMemo(
    () =>
      validatePackageJpgExportReadiness(
        {
          format: "png",
          packageValue: workingPackage,
          renderMode: "editor",
        },
        fontReadiness ?? undefined,
      ),
    [fontReadiness, workingPackage],
  );
  const constraintValidation = useMemo(
    () => validatePackageFieldConstraints(workingPackage),
    [workingPackage],
  );
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const scope = previewScopeRef.current;
      if (!scope) return;
      setTextFitResults(
        workingPackage.editableFields
          .map((field) =>
            measureTextFieldFit(
              field,
              scope,
              fontReadiness?.reliable ?? false,
            ),
          )
          .filter(
            (result): result is FieldTextFitResult => Boolean(result),
          ),
      );
    };
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    scheduleMeasure();
    const scope = previewScopeRef.current;
    const observer =
      scope && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(scheduleMeasure)
        : null;
    if (scope && observer) {
      observer.observe(scope);
      for (const field of workingPackage.editableFields) {
        const element = scope.querySelector<HTMLElement>(
          `[data-package-node-id="${CSS.escape(field.nodeId)}"]`,
        );
        if (element) observer.observe(element);
      }
    }
    void document.fonts?.ready.then(scheduleMeasure);
    document.fonts?.addEventListener?.("loadingdone", scheduleMeasure);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", scheduleMeasure);
    };
  }, [fontReadiness?.reliable, workingPackage]);
  useEffect(() => {
    if (!hasPlayableMotion) {
      setMotionEnabled(false);
      setMotionPlaying(false);
      setMotionTimeMs(0);
      return;
    }
    setMotionTimeMs((current) =>
      Math.min(current, motionSummary.durationMs),
    );
  }, [hasPlayableMotion, motionSummary.durationMs]);
  const livePreviewMotionMode = getLivePreviewMotionRenderMode(
    motionEnabled,
    hasPlayableMotion,
  );
  useEffect(() => {
    if (!motionPlaying || !hasPlayableMotion) {
      if (motionAnimationRef.current !== null) {
        cancelAnimationFrame(motionAnimationRef.current);
        motionAnimationRef.current = null;
      }
      motionLastFrameRef.current = null;
      return;
    }
    const tick = (timestamp: number) => {
      const previous = motionLastFrameRef.current ?? timestamp;
      const delta = timestamp - previous;
      motionLastFrameRef.current = timestamp;
      setMotionTimeMs(
        (current) => (current + delta) % motionSummary.durationMs,
      );
      motionAnimationRef.current = requestAnimationFrame(tick);
    };
    motionAnimationRef.current = requestAnimationFrame(tick);
    return () => {
      if (motionAnimationRef.current !== null) {
        cancelAnimationFrame(motionAnimationRef.current);
      }
      motionAnimationRef.current = null;
      motionLastFrameRef.current = null;
    };
  }, [hasPlayableMotion, motionPlaying, motionSummary.durationMs]);
  const constraintWarnings = useMemo<PackageEditorFieldWarning[]>(
    () => [
      ...constraintValidation.issues.map((item) => ({
        code: item.code,
        message: item.message,
        fieldId: item.fieldId,
        nodeId: item.nodeId,
      })),
      ...textFitResults
        .filter((result) => !result.fits)
        .map((result) => ({
          code: result.reliable
            ? "field-visual-overflow"
            : "field-visual-overflow-unreliable",
          fieldId: result.fieldId,
          nodeId: result.nodeId,
          message: result.reliable
            ? `Text uses ${result.measuredLines} lines and exceeds its intended area by ${result.overflowPx.x}px horizontally and ${result.overflowPx.y}px vertically.`
            : "Text may exceed its intended area, but the measurement is potentially unreliable because required fonts are unavailable.",
        })),
    ],
    [constraintValidation.issues, textFitResults],
  );
  const combinedEditorWarnings = useMemo(
    () =>
      [...editorWarnings, ...constraintWarnings].filter(
        (item, index, all) =>
          all.findIndex(
            (candidate) =>
              candidate.fieldId === item.fieldId &&
              candidate.code === item.code,
          ) === index,
      ),
    [constraintWarnings, editorWarnings],
  );
  const noticeCount =
    appWarnings.length +
    validation.pluginDiagnostics.filter(
      (item) => item.severity !== "info",
    ).length +
    rendererWarnings.length +
    combinedEditorWarnings.length;

  const resetChanges = () => {
    const resetPackage = structuredClone(originalPackage);
    setWorkingPackage(resetPackage);
    setHasEdits(false);
    setDebugField(null);
    onSessionChange?.({
      ...session,
      workingPackage: resetPackage,
    });
  };

  const updateWorkingPackage = (packageValue: TemplatePackageV1) => {
    setWorkingPackage(packageValue);
    setHasEdits(true);
    onSessionChange?.({
      ...session,
      workingPackage: packageValue,
    });
  };

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const api = createRuntimeRoutingHarnessApi(
      () => workingPackageRef.current,
      updateWorkingPackage,
    );
    window.__templatePackageRuntimeRoutingHarness = api;
    return () => {
      if (window.__templatePackageRuntimeRoutingHarness === api) {
        delete window.__templatePackageRuntimeRoutingHarness;
      }
    };
  });

  const updateEditorWarnings = useCallback(
    (warnings: PackageEditorFieldWarning[]) => {
      setEditorWarnings(warnings);
    },
    [],
  );

  useEffect(() => {
    if (pngExportState.status === "preparing") return;
    setPngExportState({
      status: "idle",
      message: null,
      diagnostics: [],
    });
    // Export status is intentionally reset whenever the working template changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingPackage]);

  const handleExportPng = useCallback(async () => {
    const node = exportCaptureRef.current;
    if (!node) {
      setPngExportState({
        status: "failed",
        message: "Export failed",
        diagnostics: [
          {
            code: "export.capture-unavailable",
            severity: "error",
            message: "The native-size preview was not ready for export.",
          },
        ],
      });
      return;
    }
    setPngExportState({
      status: "preparing",
      message: "Preparing export…",
      diagnostics: [],
    });
    try {
      const result = await exportTemplatePackagePng({
        packageValue: workingPackage,
        node,
        renderMode: "editor",
        templateName: workingPackage.name,
        fontSet: document.fonts,
        onProgress: (message) =>
          setPngExportState({
            status: "preparing",
            message,
            diagnostics: [],
          }),
      });
      setPngExportState({
        status: "complete",
        message: `Export complete · ${result.filename}`,
        diagnostics: result.diagnostics,
      });
    } catch (error) {
      setPngExportState({
        status: "failed",
        message: "Export failed",
        diagnostics:
          error instanceof PackagePngExportError
            ? error.diagnostics
            : [
                {
                  code: "export.failed",
                  severity: "error",
                  message:
                    error instanceof Error
                      ? error.message
                      : "The browser could not complete the PNG export.",
                },
              ],
      });
    }
  }, [workingPackage]);

  const motionToolbar = hasPlayableMotion ? (
    <div className="workspace-motion-dock">
      <Toggle
        data-testid="package-motion-toggle"
        aria-label="Play template motion"
        checked={motionEnabled}
        label="Motion preview"
        onChange={(enabled) => {
          if (!enabled) {
            setMotionEnabled(false);
            setMotionPlaying(false);
            return;
          }
          setMotionTimeMs(0);
          setMotionEnabled(true);
          setMotionPlaying(true);
        }}
      />
      <span className="workspace-motion-dock__state">
        {motionEnabled ? "Playing loop" : "Showing final frame"}
      </span>
      {motionEnabled ? (
        <div
          data-testid="package-motion-controls"
          className="workspace-motion-controls"
        >
          <IconButton
            label={motionPlaying ? "Pause motion" : "Play motion"}
            onClick={() => setMotionPlaying((playing) => !playing)}
            icon={motionPlaying ? (
              <Pause aria-hidden="true" size={14} />
            ) : (
              <Play aria-hidden="true" size={14} />
            )}
          />
          <IconButton
            label="Reset motion"
            onClick={() => {
              setMotionPlaying(false);
              setMotionTimeMs(0);
            }}
            icon={<SkipBack aria-hidden="true" size={13} />}
          />
          <input
            aria-label="Motion timeline"
            type="range"
            min={0}
            max={Math.round(motionSummary.durationMs)}
            value={Math.round(motionTimeMs)}
            onChange={(event) => {
              setMotionPlaying(false);
              setMotionTimeMs(Number(event.target.value));
            }}
            className="workspace-motion-controls__timeline"
          />
          <span className="workspace-motion-controls__time">
            {(motionTimeMs / 1000).toFixed(2)}s /{" "}
            {(motionSummary.durationMs / 1000).toFixed(2)}s
          </span>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      <EditorLayout
        toolbar={
        <div className="workspace-toolbar">
          <Button
            variant="secondary"
            onClick={onBackToTemplates}
            leadingIcon={<ArrowLeft aria-hidden="true" size={16} />}
          >
            Templates
          </Button>
          <Button
            variant="quiet"
            onClick={onOpenTemplateSettings}
          >
            Review template health
          </Button>
        </div>
      }
        panel={
        <WorkspaceSidePanel
          data-testid="package-editor-panel"
          className="workspace-panel"
          header={
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="ui-subsection-title">Edit content</h1>
              </div>
              {saveState.status !== "clean" ? (
                <Status
                  data-testid="package-autosave-status"
                  tone={
                    saveState.status === "failed"
                      ? "blocked"
                      : saveState.status === "pending" || saveState.status === "saving"
                        ? "attention"
                        : "repaired"
                  }
                >
                  {saveState.status === "pending"
                    ? "Pending"
                    : saveState.status === "saving"
                      ? "Saving…"
                      : saveState.status === "saved"
                        ? "Saved"
                        : "Save failed"}
                </Status>
              ) : null}
            </div>
          }
          footer={
            <>
            {saveState.status === "failed" ? (
              <Alert
                data-testid="package-autosave-error"
                tone="blocked"
                title="Automatic save failed"
              >
                <p>{saveState.message ?? "Automatic save failed."}</p>
                {onRetrySave ? (
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => void onRetrySave().catch(() => undefined)}
                  >
                    Retry save
                  </Button>
                ) : null}
              </Alert>
            ) : null}
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="secondary"
                onClick={resetChanges}
                leadingIcon={<RotateCcw aria-hidden="true" size={15} />}
              >
                Reset
              </Button>
              <Button
                data-testid="package-export-png-button"
                onClick={handleExportPng}
                disabled={pngExportState.status === "preparing"}
                title={
                  exportReadiness.status === "blocked"
                    ? "Export will explain the missing or unsafe asset blockers."
                    : exportReadiness.status === "warning"
                      ? "Export may show review warnings for fonts or assets."
                      : "Export the current template as a full-resolution PNG."
                }
                loading={pngExportState.status === "preparing"}
                loadingLabel="Preparing export"
              >
                {pngExportState.status === "preparing"
                  ? "Preparing export…"
                  : pngExportState.status === "complete"
                    ? "Export complete"
                    : pngExportState.status === "failed"
                      ? "Export failed"
                      : "Export PNG"}
              </Button>
              <Button
                variant="secondary"
                disabled
                title="MP4 export is not available for Template Package output yet."
              >
                Export MP4
              </Button>
            </div>
            {pngExportState.message || pngExportState.diagnostics.length ? (
              <div
                data-testid="package-png-export-status"
                className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                  pngExportState.status === "failed"
                    ? "border-[var(--color-status-blocked-border)] bg-[var(--color-status-blocked-bg)] text-[var(--color-status-blocked-fg)]"
                    : "border-line-subtle bg-surface-secondary text-content-secondary"
                }`}
              >
                {pngExportState.message ? (
                  <p className="font-medium">{pngExportState.message}</p>
                ) : null}
                {pngExportState.diagnostics.length ? (
                  <ul className="mt-1 space-y-1">
                    {pngExportState.diagnostics.slice(0, 3).map((item) => (
                      <li key={`${item.code}:${item.target ?? ""}`}>
                        {item.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            </>
          }
        >
            <TemplatePackageFieldEditor
              packageValue={workingPackage}
              onPackageChange={updateWorkingPackage}
              onFieldEdited={setDebugField}
              onWarningsChange={updateEditorWarnings}
              variant="plain"
              showTechnicalDetails={false}
              showWarnings={false}
              getMeasurementRoot={() => previewScopeRef.current}
            />
        </WorkspaceSidePanel>
        }
        preview={
        <div
          data-testid="package-working-preview"
          className="workspace-preview"
        >
          <header className="workspace-preview__header">
            <h2 className="ui-subsection-title">
              Live preview
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                data-testid="package-editor-diagnostics-button"
                aria-expanded={showDiagnostics}
                onClick={() => setShowDiagnostics(true)}
                leadingIcon={<ListChecks aria-hidden="true" size={14} />}
              >
                Open diagnostics
                <CountBadge
                  count={appErrors.length + noticeCount}
                  label="diagnostic issues"
                />
              </Button>
            </div>
          </header>

          <PreviewWorkspace
            className="workspace-preview__body"
            toolbar={motionToolbar}
          >
            <div ref={previewScopeRef} className="workspace-preview__canvas">
              <TemplatePreviewStage size="fill">
                <ScaledTemplatePackagePreview
                  packageValue={workingPackage}
                  fill
                  padding={0}
                  mode="editor"
                  motionTimeMs={motionTimeMs}
                  motionRenderMode={livePreviewMotionMode}
                />
              </TemplatePreviewStage>
            </div>
          </PreviewWorkspace>

          {showDiagnostics ? (
            <button
              type="button"
              aria-label="Close diagnostics"
              onClick={() => setShowDiagnostics(false)}
              className="absolute inset-0 z-20 bg-black/55"
            />
          ) : null}
          <aside
            aria-hidden={!showDiagnostics}
            className={`workspace-diagnostics ${
              showDiagnostics
                ? "translate-x-0"
                : "invisible translate-x-full pointer-events-none"
            }`}
          >
            <header className="workspace-diagnostics__header">
              <div>
                <h2 className="ui-subsection-title">
                  Diagnostics
                </h2>
                <p className="ui-metadata mt-1">
                  {appErrors.length} errors · {noticeCount} notices
                </p>
              </div>
              <IconButton
                label="Close diagnostics panel"
                onClick={() => setShowDiagnostics(false)}
                icon={<X aria-hidden="true" size={16} />}
              />
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <TemplatePackageDiagnosticsPanel
                packageValue={workingPackage}
                validation={validation}
                rendererWarnings={rendererWarnings}
                editorWarnings={combinedEditorWarnings}
                selectedField={debugField}
                renderMode="editor"
              />
            </div>
          </aside>
        </div>
        }
      />
      <div
        aria-hidden="true"
        data-testid="package-png-export-target"
        data-package-png-frame-policy="final-frame"
        style={{
          position: "fixed",
          left: -100000,
          top: 0,
          width: workingPackage.canvas.width,
          height: workingPackage.canvas.height,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        <div
          ref={exportCaptureRef}
          style={{
            width: workingPackage.canvas.width,
            height: workingPackage.canvas.height,
          }}
        >
          <TemplatePackageRenderer
            packageValue={workingPackage}
            mode="editor"
            motionRenderMode={getPngExportMotionRenderMode(motionEnabled)}
          />
        </div>
      </div>
    </>
  );
}

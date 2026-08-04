import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  getPackageEditorFieldTargetStatuses,
  getPackageFieldValue,
  type PackageEditorFieldTargetStatus,
  type PackageFieldUpdateOptions,
} from "@sleinity/template-core/editor";
import type { EditableFieldBinding } from "@sleinity/template-core";
import type {
  TemplateSessionImageReplacementInput,
  TemplateSessionMutationResult,
  TemplateSessionV1,
} from "@sleinity/template-browser/session";
import { useResolvedTemplateSession } from "./internal/templateSessionContext";
import {
  TemplateSessionRenderer,
  useTemplateSessionSnapshot,
  type TemplateSessionPngExportOptions,
  type TemplateSessionRendererHandle,
} from "./session";
import {
  fitPreviewBounds,
  type PreviewViewportTransform,
} from "./render/previewViewport";
import type { TemplatePackageRenderMode } from "./render/TemplatePackageRenderer";
import type { ResolvedProductRenderIdentityV1 } from "./render/productRenderIdentity";
import type { PackagePngExportResult } from "@sleinity/template-browser/capture";

export type TemplateSessionViewportReadiness =
  | "idle"
  | "pending"
  | "ready"
  | "blocked";

export interface TemplateSessionViewportIssueV1 {
  code: string;
  severity: "warning" | "error";
  message: string;
  target?: string;
  sessionRevision: number;
  evidence?: unknown;
}

export interface TemplateSessionViewportSnapshotV1 {
  sessionRevision: number;
  measured: boolean;
  scale: number;
  readiness: TemplateSessionViewportReadiness;
  canExport: boolean;
  renderIdentity: ResolvedProductRenderIdentityV1 | null;
  issues: TemplateSessionViewportIssueV1[];
}

export interface TemplateSessionViewportHandle {
  getSnapshot(): TemplateSessionViewportSnapshotV1;
  getRenderIdentity(): ResolvedProductRenderIdentityV1 | null;
  exportPng(options?: TemplateSessionPngExportOptions): Promise<PackagePngExportResult>;
}

export interface TemplateSessionViewportProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  session?: TemplateSessionV1;
  mode?: TemplatePackageRenderMode;
  padding?: number;
  fallback?: ReactNode;
  rendererClassName?: string;
  rendererStyle?: CSSProperties;
  onAssetLoadError?: (assetId: string, nodeId: string) => void;
  onRenderIdentity?: (identity: ResolvedProductRenderIdentityV1) => void;
  onViewportSnapshot?: (snapshot: TemplateSessionViewportSnapshotV1) => void;
}

interface RevisionedIdentity {
  sessionRevision: number;
  value: ResolvedProductRenderIdentityV1;
}

function sameRenderIdentity(
  current: RevisionedIdentity | null,
  sessionRevision: number,
  value: ResolvedProductRenderIdentityV1,
): boolean {
  return current?.sessionRevision === sessionRevision &&
    current.value.identityId === value.identityId &&
    current.value.readiness === value.readiness &&
    current.value.exportSafety === value.exportSafety;
}

const emptyTransform: PreviewViewportTransform = {
  scale: 0,
  translateX: 0,
  translateY: 0,
};

function responsivePadding(width: number): number {
  return width < 480 ? 16 : width < 900 ? 24 : 32;
}

function viewportReadiness(
  sessionStatus: ReturnType<TemplateSessionV1["getSnapshot"]>["status"],
  identity: ResolvedProductRenderIdentityV1 | null,
  issues: TemplateSessionViewportIssueV1[],
): TemplateSessionViewportReadiness {
  if (sessionStatus === "idle") return "idle";
  if (sessionStatus === "loading") return "pending";
  if (sessionStatus === "blocked" || sessionStatus === "disposed") return "blocked";
  if (issues.some((issue) => issue.severity === "error")) return "blocked";
  if (!identity || identity.readiness === "pending") return "pending";
  if (identity.readiness === "unsupported" || identity.exportSafety === "blocked") {
    return "blocked";
  }
  return "ready";
}

export const TemplateSessionViewport = forwardRef<
  TemplateSessionViewportHandle,
  TemplateSessionViewportProps
>(function TemplateSessionViewport(
  {
    session: sessionOverride,
    mode = "editor",
    padding,
    fallback = null,
    className,
    style,
    rendererClassName,
    rendererStyle,
    onAssetLoadError,
    onRenderIdentity,
    onViewportSnapshot,
    ...viewportProps
  },
  forwardedRef,
) {
  const session = useResolvedTemplateSession(sessionOverride);
  const sessionSnapshot = useTemplateSessionSnapshot(session);
  const viewportRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<TemplateSessionRendererHandle>(null);
  const [transform, setTransform] = useState<PreviewViewportTransform>(emptyTransform);
  const [measured, setMeasured] = useState(false);
  const [identity, setIdentity] = useState<RevisionedIdentity | null>(null);
  const [recordedIssues, setRecordedIssues] = useState<TemplateSessionViewportIssueV1[]>([]);
  const canvas = sessionSnapshot.workingPackage?.canvas ?? null;

  const currentIdentity = identity?.sessionRevision === sessionSnapshot.revision
    ? identity.value
    : null;
  const currentIssues = useMemo(
    () => recordedIssues.filter((issue) => issue.sessionRevision === sessionSnapshot.revision),
    [recordedIssues, sessionSnapshot.revision],
  );

  useEffect(() => {
    setRecordedIssues((current) => current.filter(
      (issue) => issue.sessionRevision === sessionSnapshot.revision,
    ));
    setIdentity((current) => current?.sessionRevision === sessionSnapshot.revision
      ? current
      : null);
  }, [sessionSnapshot.revision]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !canvas) {
      setTransform(emptyTransform);
      setMeasured(false);
      return;
    }
    const refit = () => {
      const bounds = viewport.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      setTransform(fitPreviewBounds(
        { width: bounds.width, height: bounds.height },
        { x: 0, y: 0, width: canvas.width, height: canvas.height },
        { safePadding: padding ?? responsivePadding(bounds.width) },
      ));
      setMeasured(true);
    };
    const observer = new ResizeObserver(refit);
    observer.observe(viewport);
    refit();
    return () => observer.disconnect();
  }, [canvas?.height, canvas?.width, padding, sessionSnapshot.revision]);

  const readiness = viewportReadiness(
    sessionSnapshot.status,
    currentIdentity,
    currentIssues,
  );
  const canExport = readiness === "ready" && currentIdentity?.readiness === "ready";
  const viewportSnapshot = useMemo<TemplateSessionViewportSnapshotV1>(() => ({
    sessionRevision: sessionSnapshot.revision,
    measured,
    scale: transform.scale,
    readiness,
    canExport,
    renderIdentity: currentIdentity,
    issues: currentIssues,
  }), [
    canExport,
    currentIdentity,
    currentIssues,
    measured,
    readiness,
    sessionSnapshot.revision,
    transform.scale,
  ]);
  const viewportSnapshotRef = useRef(viewportSnapshot);
  viewportSnapshotRef.current = viewportSnapshot;

  useEffect(() => {
    onViewportSnapshot?.(viewportSnapshot);
  }, [onViewportSnapshot, viewportSnapshot]);

  useImperativeHandle(forwardedRef, () => ({
    getSnapshot: () => viewportSnapshotRef.current,
    getRenderIdentity: () => viewportSnapshotRef.current.renderIdentity,
    async exportPng(options = {}) {
      if (!viewportSnapshotRef.current.canExport || !rendererRef.current) {
        throw new Error(
          "PNG export requires the current TemplateSession viewport revision to be ready.",
        );
      }
      return rendererRef.current.exportPng(options);
    },
  }), []);

  const handleAssetLoadError = useCallback((assetId: string, nodeId: string) => {
    if (session.getSnapshot().revision !== sessionSnapshot.revision) return;
    const issue: TemplateSessionViewportIssueV1 = {
      code: "render.asset-load-failed",
      severity: "error",
      message: `Asset "${assetId}" could not be loaded for rendering.`,
      target: nodeId,
      sessionRevision: sessionSnapshot.revision,
      evidence: { assetId, nodeId },
    };
    setRecordedIssues((current) => current.some((candidate) =>
      candidate.code === issue.code &&
      candidate.target === issue.target &&
      candidate.sessionRevision === issue.sessionRevision
    ) ? current : [...current, issue]);
    onAssetLoadError?.(assetId, nodeId);
  }, [onAssetLoadError, session, sessionSnapshot.revision]);

  const handleRenderIdentity = useCallback((value: ResolvedProductRenderIdentityV1) => {
    const revision = sessionSnapshot.revision;
    if (session.getSnapshot().revision !== revision) return;
    setIdentity((current) => sameRenderIdentity(current, revision, value)
      ? current
      : { sessionRevision: revision, value });
    setRecordedIssues((current) => {
      const next = current.filter((issue) =>
        issue.sessionRevision !== revision ||
        (issue.code !== "render.unsupported" && issue.code !== "render.export-blocked")
      );
      if (value.readiness === "unsupported") {
        next.push({
        code: "render.unsupported",
        severity: "error",
        message: "The current template revision cannot complete renderer readiness.",
        sessionRevision: revision,
        evidence: value,
        });
      }
      if (value.exportSafety === "blocked") {
        next.push({
          code: "render.export-blocked",
          severity: "error",
          message: "The current template revision is not safe to export.",
          sessionRevision: revision,
          evidence: value,
        });
      }
      const unchanged = next.length === current.length && next.every((issue, index) =>
        issue === current[index]
      );
      return unchanged ? current : next;
    });
    onRenderIdentity?.(value);
  }, [onRenderIdentity, session, sessionSnapshot.revision]);

  const transformStyle: CSSProperties | undefined = canvas ? {
    position: "absolute",
    inset: "0 auto auto 0",
    width: canvas.width,
    height: canvas.height,
    transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
    transformOrigin: "0 0",
    opacity: measured ? 1 : 0,
    willChange: "transform",
  } : undefined;

  return (
    <div
      {...viewportProps}
      ref={viewportRef}
      className={className}
      style={{ position: "relative", overflow: "hidden", minWidth: 0, ...style }}
      data-template-session-viewport-readiness={readiness}
      data-template-session-viewport-revision={sessionSnapshot.revision}
    >
      {canvas ? (
        <div style={transformStyle} data-template-session-viewport-transform="true">
          <TemplateSessionRenderer
            ref={rendererRef}
            session={session}
            mode={mode}
            className={rendererClassName}
            style={{
              width: canvas.width,
              height: canvas.height,
              overflow: "visible",
              ...rendererStyle,
            }}
            fallback={fallback}
            onAssetLoadError={handleAssetLoadError}
            onRenderIdentity={handleRenderIdentity}
          />
        </div>
      ) : fallback}
    </div>
  );
});

export interface TemplateSessionEditableFieldControllerV1 {
  field: EditableFieldBinding;
  value: ReturnType<typeof getPackageFieldValue>;
  targetStatus: PackageEditorFieldTargetStatus;
  sessionRevision: number;
  setValue(value: unknown, options?: PackageFieldUpdateOptions): TemplateSessionMutationResult;
  reset(): TemplateSessionMutationResult;
  replaceImage?: (input: TemplateSessionImageReplacementInput) => TemplateSessionMutationResult;
  setImageReplacementMode?: (
    mode: "replacement-fill" | "replacement-fit",
  ) => TemplateSessionMutationResult;
}

function createFieldControllers(
  session: TemplateSessionV1,
  snapshot: ReturnType<TemplateSessionV1["getSnapshot"]>,
): TemplateSessionEditableFieldControllerV1[] {
  if (!snapshot.workingPackage) return [];
  const packageValue = snapshot.workingPackage;
  const targetByFieldId = new Map(
    getPackageEditorFieldTargetStatuses(packageValue).map((status) => [status.field.id, status]),
  );
  return snapshot.editableFields.flatMap((field) => {
    const targetStatus = targetByFieldId.get(field.id);
    if (!targetStatus) return [];
    const base: TemplateSessionEditableFieldControllerV1 = {
      field,
      value: getPackageFieldValue(packageValue, field),
      targetStatus,
      sessionRevision: snapshot.revision,
      setValue: (value, options) => session.setField(field.id, value, options),
      reset: () => session.resetField(field.id),
    };
    if (field.type === "image") {
      base.replaceImage = (input) => session.replaceImage(field.id, input);
      base.setImageReplacementMode = (mode) =>
        session.setImageReplacementMode(field.id, mode);
    }
    return [base];
  });
}

interface FieldControllerCacheEntry {
  revision: number;
  fieldKey: string;
  hasWorkingPackage: boolean;
  controllers: TemplateSessionEditableFieldControllerV1[];
}

const fieldControllerCache = new WeakMap<TemplateSessionV1, FieldControllerCacheEntry>();

function getCachedFieldControllers(
  session: TemplateSessionV1,
  snapshot: ReturnType<TemplateSessionV1["getSnapshot"]>,
): TemplateSessionEditableFieldControllerV1[] {
  const fieldKey = snapshot.editableFields.map((field) => field.id).join("\u0000");
  const hasWorkingPackage = snapshot.workingPackage !== null;
  const current = fieldControllerCache.get(session);
  if (
    current?.revision === snapshot.revision &&
    current.fieldKey === fieldKey &&
    current.hasWorkingPackage === hasWorkingPackage
  ) {
    return current.controllers;
  }
  const controllers = createFieldControllers(session, snapshot);
  fieldControllerCache.set(session, {
    revision: snapshot.revision,
    fieldKey,
    hasWorkingPackage,
    controllers,
  });
  return controllers;
}

export function useTemplateSessionEditableFields(
  sessionOverride?: TemplateSessionV1,
): TemplateSessionEditableFieldControllerV1[] {
  const session = useResolvedTemplateSession(sessionOverride);
  const snapshot = useTemplateSessionSnapshot(session);
  return useMemo(
    () => getCachedFieldControllers(session, snapshot),
    [session, snapshot],
  );
}

export function useTemplateSessionEditableField(
  fieldId: string,
  sessionOverride?: TemplateSessionV1,
): TemplateSessionEditableFieldControllerV1 | null {
  const fields = useTemplateSessionEditableFields(sessionOverride);
  return useMemo(
    () => fields.find((field) => field.field.id === fieldId) ?? null,
    [fieldId, fields],
  );
}

export type TemplateSessionDiagnosticStatus =
  | "pending"
  | "ready"
  | "needs-review"
  | "blocked";

export interface TemplateSessionDiagnosticIssueV1 {
  code: string;
  severity: "blocker" | "warning" | "note";
  category: string;
  target?: string;
  message: string;
  repairGuidance: string;
  source: "package" | "font" | "asset" | "session" | "renderer";
  sessionRevision: number;
  evidence: unknown;
}

export interface TemplateSessionDiagnosticSummaryV1 {
  status: TemplateSessionDiagnosticStatus;
  sessionRevision: number;
  counts: {
    blockers: number;
    warnings: number;
    notes: number;
  };
  issues: TemplateSessionDiagnosticIssueV1[];
}

export interface TemplateSessionDiagnosticSummaryOptions {
  session?: TemplateSessionV1;
  viewportSnapshot?: TemplateSessionViewportSnapshotV1 | null;
}

function repairGuidance(source: TemplateSessionDiagnosticIssueV1["source"]): string {
  if (source === "font") return "Provide the exact required font file and wait for activation.";
  if (source === "asset") return "Restore or replace the affected asset, then render the revision again.";
  if (source === "renderer") return "Resolve the reported render blocker and wait for the current revision.";
  if (source === "session") return "Reload the template session or correct the reported state.";
  return "Correct the template package issue and validate it again.";
}

function diagnosticSeverity(severity: string): TemplateSessionDiagnosticIssueV1["severity"] {
  if (severity === "error") return "blocker";
  if (severity === "warning") return "warning";
  return "note";
}

export function useTemplateSessionDiagnosticSummary(
  options: TemplateSessionDiagnosticSummaryOptions = {},
): TemplateSessionDiagnosticSummaryV1 {
  const session = useResolvedTemplateSession(options.session);
  const snapshot = useTemplateSessionSnapshot(session);
  const expectsViewport = options.viewportSnapshot != null;
  const viewport = options.viewportSnapshot?.sessionRevision === snapshot.revision
    ? options.viewportSnapshot
    : null;

  return useMemo(() => {
    const issues: TemplateSessionDiagnosticIssueV1[] = [];
    for (const diagnostic of snapshot.diagnostics) {
      const source = diagnostic.category === "font"
        ? "font"
        : diagnostic.category === "asset"
          ? "asset"
          : "package";
      issues.push({
        code: diagnostic.code,
        severity: diagnosticSeverity(diagnostic.severity),
        category: diagnostic.category,
        target: diagnostic.path,
        message: diagnostic.message,
        repairGuidance: repairGuidance(source),
        source,
        sessionRevision: snapshot.revision,
        evidence: diagnostic,
      });
    }
    for (const issue of snapshot.fontPreparation.issues) {
      issues.push({
        code: issue.code,
        severity: diagnosticSeverity(issue.severity),
        category: "font",
        target: issue.requirementId,
        message: issue.message,
        repairGuidance: repairGuidance("font"),
        source: "font",
        sessionRevision: snapshot.revision,
        evidence: issue,
      });
    }
    if (snapshot.error) {
      issues.push({
        code: snapshot.error.code,
        severity: "blocker",
        category: "session",
        message: snapshot.error.message,
        repairGuidance: repairGuidance("session"),
        source: "session",
        sessionRevision: snapshot.revision,
        evidence: snapshot.error,
      });
    }
    for (const issue of viewport?.issues ?? []) {
      issues.push({
        code: issue.code,
        severity: issue.severity === "error" ? "blocker" : "warning",
        category: issue.code.includes("asset") ? "asset" : "renderer",
        target: issue.target,
        message: issue.message,
        repairGuidance: repairGuidance(issue.code.includes("asset") ? "asset" : "renderer"),
        source: issue.code.includes("asset") ? "asset" : "renderer",
        sessionRevision: snapshot.revision,
        evidence: issue.evidence ?? issue,
      });
    }
    if (
      (snapshot.status === "blocked" || snapshot.status === "disposed") &&
      issues.every((issue) => issue.severity !== "blocker")
    ) {
      issues.push({
        code: snapshot.status === "disposed" ? "session.disposed" : "session.blocked",
        severity: "blocker",
        category: "session",
        message: snapshot.status === "disposed"
          ? "The template session has been disposed."
          : "The template session is blocked.",
        repairGuidance: snapshot.status === "disposed"
          ? "Create a new template session before reopening the template."
          : repairGuidance("session"),
        source: "session",
        sessionRevision: snapshot.revision,
        evidence: { status: snapshot.status },
      });
    }
    if (
      viewport?.readiness === "blocked" &&
      issues.every((issue) =>
        issue.source !== "renderer" && issue.source !== "asset"
      )
    ) {
      issues.push({
        code: "render.blocked",
        severity: "blocker",
        category: "renderer",
        message: "The current template revision cannot complete renderer readiness.",
        repairGuidance: repairGuidance("renderer"),
        source: "renderer",
        sessionRevision: snapshot.revision,
        evidence: viewport,
      });
    }
    const deduplicated = [...new Map(issues.map((issue) => [
      `${issue.code}:${issue.target ?? ""}:${issue.source}:${issue.sessionRevision}`,
      issue,
    ])).values()];
    const blockers = deduplicated.filter((issue) => issue.severity === "blocker").length;
    const warnings = deduplicated.filter((issue) => issue.severity === "warning").length;
    const notes = deduplicated.filter((issue) => issue.severity === "note").length;
    const pending = snapshot.status === "idle" || snapshot.status === "loading" || (
      snapshot.status === "ready" &&
      expectsViewport &&
      (viewport === null || viewport.readiness === "idle" || viewport.readiness === "pending")
    );
    const status: TemplateSessionDiagnosticStatus = blockers > 0 ||
      snapshot.status === "blocked" ||
      snapshot.status === "disposed" ||
      viewport?.readiness === "blocked"
      ? "blocked"
      : pending
        ? "pending"
        : warnings > 0
          ? "needs-review"
          : "ready";
    return {
      status,
      sessionRevision: snapshot.revision,
      counts: { blockers, warnings, notes },
      issues: deduplicated,
    };
  }, [expectsViewport, snapshot, viewport]);
}

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PropsWithChildren,
} from "react";
import {
  getTemplateFamilyOptionAvailability,
  type TemplateFamilyContentValueV1,
  type TemplateFamilyFieldV1,
  type TemplateFamilyIssueV1,
  type TemplateFamilyOptionAvailabilityV1,
} from "@sleinity/template-core/family";
import {
  createTemplateFamilySession,
  type TemplateFamilySessionMutationResultV1,
  type TemplateFamilySessionOptionsV1,
  type TemplateFamilySessionSnapshotV1,
  type TemplateFamilySessionV1,
  type TemplateSessionImageReplacementInput,
} from "@sleinity/template-browser/session";

const TemplateFamilySessionContext =
  createContext<TemplateFamilySessionV1 | null>(null);

export function useTemplateFamilySession(
  options: TemplateFamilySessionOptionsV1 = {},
): TemplateFamilySessionV1 {
  const [session] = useState(() => createTemplateFamilySession(options));
  const lifecycleGeneration = useRef(0);
  useEffect(() => {
    const generation = ++lifecycleGeneration.current;
    return () => {
      queueMicrotask(() => {
        if (lifecycleGeneration.current === generation) session.dispose();
      });
    };
  }, [session]);
  return session;
}

export interface TemplateFamilySessionProviderProps {
  session: TemplateFamilySessionV1;
}

export function TemplateFamilySessionProvider({
  session,
  children,
}: PropsWithChildren<TemplateFamilySessionProviderProps>) {
  return (
    <TemplateFamilySessionContext.Provider value={session}>
      {children}
    </TemplateFamilySessionContext.Provider>
  );
}

function useResolvedTemplateFamilySession(
  override?: TemplateFamilySessionV1,
): TemplateFamilySessionV1 {
  const context = useContext(TemplateFamilySessionContext);
  const session = override ?? context;
  if (!session) {
    throw new Error(
      "A TemplateFamilySession is required. Pass session or use TemplateFamilySessionProvider.",
    );
  }
  return session;
}

export function useTemplateFamilySessionSnapshot(
  sessionOverride?: TemplateFamilySessionV1,
): TemplateFamilySessionSnapshotV1 {
  const session = useResolvedTemplateFamilySession(sessionOverride);
  return useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
}

export interface TemplateFamilyFieldControllerV1 {
  field: TemplateFamilyFieldV1;
  value: TemplateFamilyContentValueV1;
  familyRevision: number;
  selectedVariantId: string | null;
  issues: TemplateFamilyIssueV1[];
  setValue(value: TemplateFamilyContentValueV1): TemplateFamilySessionMutationResultV1;
  reset(): TemplateFamilySessionMutationResultV1;
  replaceImage?: (
    input: TemplateSessionImageReplacementInput,
  ) => TemplateFamilySessionMutationResultV1;
  setImageReplacementMode?: (
    mode: "replacement-fill" | "replacement-fit",
  ) => TemplateFamilySessionMutationResultV1;
}

function createFamilyFieldControllers(
  session: TemplateFamilySessionV1,
  snapshot: TemplateFamilySessionSnapshotV1,
): TemplateFamilyFieldControllerV1[] {
  if (!snapshot.family || !snapshot.content) return [];
  return snapshot.family.fields.map((field) => {
    const base: TemplateFamilyFieldControllerV1 = {
      field,
      value: Object.prototype.hasOwnProperty.call(snapshot.content!.values, field.id)
        ? snapshot.content!.values[field.id]
        : field.defaultValue,
      familyRevision: snapshot.revision,
      selectedVariantId: snapshot.selectedVariantId,
      issues: snapshot.validation?.issues.filter((issue) => issue.fieldId === field.id) ?? [],
      setValue: (value) => session.setField(
        field.id,
        value,
        snapshot.operationRevision,
      ),
      reset: () => session.resetField(field.id, snapshot.operationRevision),
    };
    if (field.type === "image") {
      base.replaceImage = (input) => session.replaceImage(
        field.id,
        input,
        snapshot.operationRevision,
      );
      base.setImageReplacementMode = (mode) =>
        session.setImageReplacementMode(
          field.id,
          mode,
          snapshot.operationRevision,
        );
    }
    return base;
  });
}

export function useTemplateFamilyEditableFields(
  sessionOverride?: TemplateFamilySessionV1,
): TemplateFamilyFieldControllerV1[] {
  const session = useResolvedTemplateFamilySession(sessionOverride);
  const snapshot = useTemplateFamilySessionSnapshot(session);
  return useMemo(
    () => createFamilyFieldControllers(session, snapshot),
    [session, snapshot],
  );
}

export function useTemplateFamilyEditableField(
  fieldId: string,
  sessionOverride?: TemplateFamilySessionV1,
): TemplateFamilyFieldControllerV1 | null {
  const fields = useTemplateFamilyEditableFields(sessionOverride);
  return useMemo(
    () => fields.find((field) => field.field.id === fieldId) ?? null,
    [fieldId, fields],
  );
}

export interface TemplateFamilySelectionModelV1 {
  selectedVariantId: string | null;
  options: TemplateFamilyOptionAvailabilityV1[];
  selectVariant(variantId: string): TemplateFamilySessionMutationResultV1;
}

export function useTemplateFamilySelection(
  groupSelections: Record<string, string> = {},
  sessionOverride?: TemplateFamilySessionV1,
): TemplateFamilySelectionModelV1 {
  const session = useResolvedTemplateFamilySession(sessionOverride);
  const snapshot = useTemplateFamilySessionSnapshot(session);
  return useMemo(() => ({
    selectedVariantId: snapshot.selectedVariantId,
    options: snapshot.family
      ? getTemplateFamilyOptionAvailability(snapshot.family, { groupSelections })
      : [],
    selectVariant: (variantId: string) => session.selectVariant(
      variantId,
      snapshot.operationRevision,
    ),
  }), [
    groupSelections,
    session,
    snapshot.family,
    snapshot.operationRevision,
    snapshot.selectedVariantId,
  ]);
}

export interface TemplateFamilyDiagnosticSummaryV1 {
  status: "idle" | "ready" | "needs-review" | "blocked";
  familyRevision: number;
  counts: { blockers: number; warnings: number; notes: number };
  issues: TemplateFamilyIssueV1[];
}

export function useTemplateFamilyDiagnosticSummary(
  sessionOverride?: TemplateFamilySessionV1,
): TemplateFamilyDiagnosticSummaryV1 {
  const snapshot = useTemplateFamilySessionSnapshot(sessionOverride);
  return useMemo(() => {
    const issues: TemplateFamilyIssueV1[] = [
      ...(snapshot.validation?.issues ?? []),
      ...(snapshot.materialization?.issues ?? []).map((issue) => ({
        ...issue,
        familyId: snapshot.family?.id ?? "",
      })),
    ];
    const blockers = issues.filter((issue) => issue.severity === "error").length;
    const warnings = issues.filter((issue) => issue.severity === "warning").length;
    const notes = issues.filter((issue) => issue.severity === "info").length;
    return {
      status: snapshot.status === "idle"
        ? "idle"
        : snapshot.status === "blocked" || snapshot.status === "disposed" || blockers > 0
          ? "blocked"
          : warnings > 0
            ? "needs-review"
            : "ready",
      familyRevision: snapshot.revision,
      counts: { blockers, warnings, notes },
      issues,
    };
  }, [snapshot]);
}

export interface TemplateFamilyEditorModelV1 {
  snapshot: TemplateFamilySessionSnapshotV1;
  renderSession: TemplateFamilySessionV1["renderSession"];
  fields: TemplateFamilyFieldControllerV1[];
  diagnostics: TemplateFamilyDiagnosticSummaryV1;
}

export function useTemplateFamilyEditor(
  sessionOverride?: TemplateFamilySessionV1,
): TemplateFamilyEditorModelV1 {
  const session = useResolvedTemplateFamilySession(sessionOverride);
  const snapshot = useTemplateFamilySessionSnapshot(session);
  const fields = useTemplateFamilyEditableFields(session);
  const diagnostics = useTemplateFamilyDiagnosticSummary(session);
  return useMemo(() => ({
    snapshot,
    renderSession: session.renderSession,
    fields,
    diagnostics,
  }), [diagnostics, fields, session.renderSession, snapshot]);
}

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
  getTemplateFamilyControlOrder,
  getTemplateFamilyFieldScope,
  type TemplateFamilyContentValueV1,
  type TemplateFamilyControlRefV1,
  type TemplateFamilyFieldV1,
  type TemplateFamilyFieldScopeV1,
  type TemplateFamilyIssueV1,
  type TemplateFamilyOptionAvailabilityV1,
  type TemplateFamilyVariantV1,
  type TemplateVariantGroupV1,
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
  scope: TemplateFamilyFieldScopeV1;
  value: TemplateFamilyContentValueV1;
  familyRevision: number;
  selectedVariantId: string | null;
  issues: TemplateFamilyIssueV1[];
  selectedVariantIssues: TemplateFamilyIssueV1[];
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
    const issues = snapshot.validation?.issues.filter(
      (issue) => issue.fieldId === field.id,
    ) ?? [];
    const base: TemplateFamilyFieldControllerV1 = {
      field,
      scope: getTemplateFamilyFieldScope(snapshot.family!, field.id),
      value: Object.prototype.hasOwnProperty.call(snapshot.content!.values, field.id)
        ? snapshot.content!.values[field.id]
        : field.defaultValue,
      familyRevision: snapshot.revision,
      selectedVariantId: snapshot.selectedVariantId,
      issues,
      selectedVariantIssues: issues.filter(
        (issue) => issue.variantId === snapshot.selectedVariantId,
      ),
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

export function useTemplateFamilyVisibleFields(
  sessionOverride?: TemplateFamilySessionV1,
): TemplateFamilyFieldControllerV1[] {
  const session = useResolvedTemplateFamilySession(sessionOverride);
  const snapshot = useTemplateFamilySessionSnapshot(session);
  const fields = useTemplateFamilyEditableFields(session);
  return useMemo(
    () => snapshot.selectedVariantId
      ? fields.filter((field) =>
          field.scope.variantIds.includes(snapshot.selectedVariantId!),
        )
      : [],
    [fields, snapshot.selectedVariantId],
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

export interface TemplateFamilySelectionOptionV1
  extends TemplateFamilyOptionAvailabilityV1 {
  title: string;
  selected: boolean;
}

export interface TemplateFamilySelectionPropertyV1 {
  group: TemplateVariantGroupV1;
  selectedOptionId: string | null;
  options: TemplateFamilySelectionOptionV1[];
  selectOption(optionId: string): TemplateFamilySessionMutationResultV1;
}

export interface TemplateFamilySelectionModelV1 {
  selectedVariantId: string | null;
  groupSelections: Record<string, string>;
  groups: TemplateFamilySelectionPropertyV1[];
  variants: TemplateFamilyVariantV1[];
  selectOption(groupId: string, optionId: string): TemplateFamilySessionMutationResultV1;
  selectVariant(variantId: string): TemplateFamilySessionMutationResultV1;
}

export function useTemplateFamilySelection(
  controlledSelections: Record<string, string> = {},
  sessionOverride?: TemplateFamilySessionV1,
): TemplateFamilySelectionModelV1 {
  const session = useResolvedTemplateFamilySession(sessionOverride);
  const snapshot = useTemplateFamilySessionSnapshot(session);
  const groupSelections = Object.keys(controlledSelections).length > 0
    ? controlledSelections
    : snapshot.groupSelections;
  const availability = useMemo(
    () => snapshot.family ? session.getOptionAvailability(groupSelections) : [],
    [groupSelections, session, snapshot.family],
  );
  const availabilityByOption = useMemo(
    () => new Map(availability.map((item) => [`${item.groupId}:${item.optionId}`, item])),
    [availability],
  );
  const groups = useMemo(() => snapshot.family?.variantGroups.map((group) => ({
    group,
    selectedOptionId: groupSelections[group.id] ?? null,
    options: group.options.map((option) => ({
      ...availabilityByOption.get(`${group.id}:${option.id}`)!,
      groupId: group.id,
      optionId: option.id,
      available: availabilityByOption.get(`${group.id}:${option.id}`)?.available ?? false,
      candidateVariantIds:
        availabilityByOption.get(`${group.id}:${option.id}`)?.candidateVariantIds ?? [],
      title: option.title,
      selected: groupSelections[group.id] === option.id,
    })),
    selectOption: (optionId: string) => session.selectOption(
      group.id,
      optionId,
      snapshot.operationRevision,
    ),
  })) ?? [], [
    availabilityByOption,
    groupSelections,
    session,
    snapshot.family,
    snapshot.operationRevision,
  ]);
  return useMemo(() => ({
    selectedVariantId: snapshot.selectedVariantId,
    groupSelections,
    groups,
    variants: snapshot.family?.variants ?? [],
    selectOption: (groupId: string, optionId: string) => session.selectOption(
      groupId,
      optionId,
      snapshot.operationRevision,
    ),
    selectVariant: (variantId: string) => session.selectVariant(
      variantId,
      snapshot.operationRevision,
    ),
  }), [
    groupSelections,
    groups,
    session,
    snapshot.family,
    snapshot.operationRevision,
    snapshot.selectedVariantId,
  ]);
}

export type TemplateFamilyEditorControlV1 =
  | {
      kind: "direct-variant-selector";
      ref: Extract<TemplateFamilyControlRefV1, { kind: "direct-variant-selector" }>;
      selection: TemplateFamilySelectionModelV1;
    }
  | {
      kind: "selection-property";
      ref: Extract<TemplateFamilyControlRefV1, { kind: "selection-property" }>;
      selection: TemplateFamilySelectionPropertyV1;
    }
  | {
      kind: "field";
      ref: Extract<TemplateFamilyControlRefV1, { kind: "field" }>;
      controller: TemplateFamilyFieldControllerV1;
    };

export function useTemplateFamilyEditorControls(
  sessionOverride?: TemplateFamilySessionV1,
): TemplateFamilyEditorControlV1[] {
  const session = useResolvedTemplateFamilySession(sessionOverride);
  const snapshot = useTemplateFamilySessionSnapshot(session);
  const fields = useTemplateFamilyEditableFields(session);
  const selection = useTemplateFamilySelection({}, session);
  return useMemo(() => {
    if (!snapshot.family) return [];
    const fieldsById = new Map(fields.map((field) => [field.field.id, field]));
    const groupsById = new Map(selection.groups.map((group) => [group.group.id, group]));
    const controls: TemplateFamilyEditorControlV1[] = [];
    for (const ref of getTemplateFamilyControlOrder(snapshot.family)) {
      if (ref.kind === "direct-variant-selector") {
        controls.push({ kind: ref.kind, ref, selection });
        continue;
      }
      if (ref.kind === "selection-property") {
        const property = groupsById.get(ref.groupId);
        if (property) controls.push({ kind: ref.kind, ref, selection: property });
        continue;
      }
      const controller = fieldsById.get(ref.fieldId);
      if (controller?.scope.variantIds.includes(snapshot.selectedVariantId ?? "")) {
        controls.push({ kind: ref.kind, ref, controller });
      }
    }
    return controls;
  }, [fields, selection, snapshot.family, snapshot.selectedVariantId]);
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
  visibleFields: TemplateFamilyFieldControllerV1[];
  controls: TemplateFamilyEditorControlV1[];
  diagnostics: TemplateFamilyDiagnosticSummaryV1;
}

export function useTemplateFamilyEditor(
  sessionOverride?: TemplateFamilySessionV1,
): TemplateFamilyEditorModelV1 {
  const session = useResolvedTemplateFamilySession(sessionOverride);
  const snapshot = useTemplateFamilySessionSnapshot(session);
  const fields = useTemplateFamilyEditableFields(session);
  const visibleFields = useTemplateFamilyVisibleFields(session);
  const controls = useTemplateFamilyEditorControls(session);
  const diagnostics = useTemplateFamilyDiagnosticSummary(session);
  return useMemo(() => ({
    snapshot,
    renderSession: session.renderSession,
    fields,
    visibleFields,
    controls,
    diagnostics,
  }), [controls, diagnostics, fields, session.renderSession, snapshot, visibleFields]);
}

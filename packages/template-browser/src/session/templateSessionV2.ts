import { evaluateFieldRenderEvidence, invalidateRuntimeFieldEvidence } from "./fieldRenderEvidence";
import { resolvePackageAssetSource } from "@sleinity/template-core/assets";
import { retainSessionAssetUrls, sessionAssetUrlLeases } from "./sessionAssetUrlLeases";
import { createStoredAssetHydration } from "./storedAssetHydration";
import { createSerializedSaveQueue } from "./serializedSaveQueue";
import {
  createResolvedRenderTree,
  createTemplateFieldContentStateV1,
  getOrderedHostEditableFieldsV2,
  materializeTemplateFieldContentV2,
  mutateTemplateFieldContentV2,
  parseTemplatePackageV2,
  validateTemplatePackageV2,
  reconcileTemplateFieldConfigurationV2,
  resolveTemplateFieldContentV2,
  type ColorInputV1,
  type EditableFieldBinding,
  type EditableFieldDefinitionV2,
  type FieldLayoutEvidenceV1,
  type FieldRenderValidationStatusV1,
  type FieldValidationIssueV2,
  type HostEditableFieldDescriptorV2,
  type ImageReplacementPlacementV1,
  type MaterializeTemplateFieldContentResultV2,
  type PackageDiagnostic,
  type PackageImageAsset,
  type ResolvedRenderTreeV1,
  type TemplateFieldCanonicalValueV1,
  type TemplateFieldContentMutationResultV2,
  type TemplateFieldContentStateV1,
  type TemplateFieldConfigurationV2,
  type TemplatePackageV1,
  type TemplatePackageV2,
} from "@sleinity/template-core";
import {
  applyTemplateReimportV2,
  planTemplateReimportV2,
  type ApplyTemplateReimportV2Options,
  type TemplateReimportPlanV2,
} from "../import/templateReimportV2";
import { createSavedAssetRecord } from "../persistence/assetRepository";
import { imageSourceDimensionsV2 } from "./imageSourceDimensionsV2";
import {
  createSavedTemplateSessionV2Record,
  getTemplateSessionRepositoryV2,
} from "../persistence/templateSessionRepositoryV2";
import type {
  SavedTemplateSessionRecordV2,
  TemplateSessionRepositoryV2,
} from "../persistence/types";
import { activeTemplateFieldIdsV2 } from "./activeFieldControllersV2";

export const TEMPLATE_SESSION_V2_SCHEMA_VERSION = "template-session-v2" as const;

export type TemplateSessionV2Status =
  | "idle"
  | "ready"
  | "blocked"
  | "disposed";

export type TemplateRuntimeReadinessStateV2 =
  | "not-required"
  | "pending"
  | "ready"
  | "blocked";

export interface TemplateSessionReadinessV2 {
  state: "idle" | "pending" | "ready" | "blocked";
  exportReady: boolean;
  deterministic: "ready" | "blocked";
  renderValidation: "not-required" | "pending" | "ready" | "blocked";
  assets: TemplateRuntimeReadinessStateV2;
  fonts: TemplateRuntimeReadinessStateV2;
  renderer: TemplateRuntimeReadinessStateV2;
  reasons: readonly string[];
  contentRevision: number;
  materializationRevision: string | null;
}

export interface TemplateSessionV2Error {
  code:
    | "package-invalid"
    | "content-invalid"
    | "materialization-failed"
    | "saved-session-not-found"
    | "saved-session-load-failed";
  message: string;
  diagnostics?: readonly PackageDiagnostic[];
}

export interface TemplateSessionFieldStateV2 {
  index: number;
  descriptor: HostEditableFieldDescriptorV2;
  label: string;
  value: TemplateFieldCanonicalValueV1 | EditableFieldDefinitionV2["defaultValue"];
  importedDefaultValue: EditableFieldDefinitionV2["defaultValue"];
  valueSource: "content-override" | "imported-default";
  selectedChoiceId?: string;
  deterministicIssues: readonly FieldValidationIssueV2[];
  warnings: readonly FieldValidationIssueV2[];
  blockingErrors: readonly FieldValidationIssueV2[];
  renderValidation: FieldRenderValidationStatusV1;
  contentRevision: number;
}

export interface TemplateSessionV2Snapshot {
  schemaVersion: typeof TEMPLATE_SESSION_V2_SCHEMA_VERSION;
  status: TemplateSessionV2Status;
  revision: number;
  operationRevision: number;
  savedSessionId: string | null;
  basePackage: TemplatePackageV2 | null;
  contentState: TemplateFieldContentStateV1 | null;
  sessionAssets: TemplatePackageV2["assets"];
  materialization: MaterializeTemplateFieldContentResultV2 | null;
  workingPackage: TemplatePackageV2 | null;
  /** One-way compatibility input for the existing renderer; never value authority. */
  rendererPackage: TemplatePackageV1 | null;
  resolvedTree: ResolvedRenderTreeV1 | null;
  fields: readonly TemplateSessionFieldStateV2[];
  readiness: TemplateSessionReadinessV2;
  error: TemplateSessionV2Error | null;
}

export interface TemplateSessionV2MutationResult {
  accepted: boolean;
  stale: boolean;
  contentRevision: number;
  warnings: readonly FieldValidationIssueV2[];
  blockingErrors: readonly FieldValidationIssueV2[];
  renderValidation: FieldRenderValidationStatusV1;
  readiness: TemplateSessionReadinessV2;
  coreResult?: TemplateFieldContentMutationResultV2;
}

interface TemplateFieldControllerBaseV2<
  Field extends HostEditableFieldDescriptorV2,
  Value,
> extends Omit<TemplateSessionFieldStateV2, "descriptor" | "value" | "importedDefaultValue"> {
  id: string;
  type: Field["type"];
  controlRole?: string;
  configuration: Field["configuration"];
  descriptor: Field;
  value: Value;
  importedDefaultValue: Field["defaultValue"];
  reset(): TemplateSessionV2MutationResult;
}

type DescriptorOf<Type extends EditableFieldDefinitionV2["type"]> = Extract<
  HostEditableFieldDescriptorV2,
  { type: Type }
>;

export type TextFieldControllerV2 = TemplateFieldControllerBaseV2<DescriptorOf<"text">, string> & {
  setValue(value: string): TemplateSessionV2MutationResult;
  selectChoice(choiceId: string): TemplateSessionV2MutationResult;
};
export type TextareaFieldControllerV2 = TemplateFieldControllerBaseV2<DescriptorOf<"textarea">, string> & {
  setValue(value: string): TemplateSessionV2MutationResult;
  selectChoice(choiceId: string): TemplateSessionV2MutationResult;
};
export type NumberFieldControllerV2 = TemplateFieldControllerBaseV2<DescriptorOf<"number">, number> & {
  setValue(value: number): TemplateSessionV2MutationResult;
  selectChoice(choiceId: string): TemplateSessionV2MutationResult;
};
export type DateFieldControllerV2 = TemplateFieldControllerBaseV2<DescriptorOf<"date">, string> & {
  setValue(value: string): TemplateSessionV2MutationResult;
  selectChoice(choiceId: string): TemplateSessionV2MutationResult;
};
export type ColorFieldControllerV2 = TemplateFieldControllerBaseV2<DescriptorOf<"color">, string> & {
  setValue(value: ColorInputV1): TemplateSessionV2MutationResult;
  selectChoice(choiceId: string): TemplateSessionV2MutationResult;
};
export type BooleanFieldControllerV2 = TemplateFieldControllerBaseV2<DescriptorOf<"boolean">, boolean> & {
  setValue(value: boolean): TemplateSessionV2MutationResult;
};

export interface TemplateSessionImageSourceV2 {
  assetId?: string;
  blob?: Blob;
  dataUrl?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  placement?: ImageReplacementPlacementV1;
}

export type ImageFieldControllerV2 = TemplateFieldControllerBaseV2<
  DescriptorOf<"image">,
  DescriptorOf<"image">["defaultValue"] | Extract<TemplateFieldCanonicalValueV1, object>
> & {
  replaceImage(source: TemplateSessionImageSourceV2): Promise<TemplateSessionV2MutationResult>;
  setPlacement(placement: ImageReplacementPlacementV1): TemplateSessionV2MutationResult;
};

export type TemplateFieldControllerV2 =
  | TextFieldControllerV2
  | TextareaFieldControllerV2
  | ImageFieldControllerV2
  | ColorFieldControllerV2
  | NumberFieldControllerV2
  | DateFieldControllerV2
  | BooleanFieldControllerV2;

export interface TemplateSessionRuntimeReadinessEvidenceV2 {
  contentRevision: number;
  materializationRevision: string;
  settlementRevision: string;
  fontRevision: string;
  publicationGeneration: number;
  fonts?: Exclude<TemplateRuntimeReadinessStateV2, "not-required">;
  renderer?: Exclude<TemplateRuntimeReadinessStateV2, "not-required">;
}

export interface TemplateSessionObjectUrlAdapterV2 {
  create(blob: Blob): string;
  revoke(url: string): void;
}

export interface TemplateSessionV2Options {
  repository?: TemplateSessionRepositoryV2;
  objectUrls?: TemplateSessionObjectUrlAdapterV2;
}

export interface TemplateSessionV2 {
  getSnapshot(): TemplateSessionV2Snapshot;
  getFieldControllers(): readonly TemplateFieldControllerV2[];
  subscribe(listener: () => void): () => void;
  load(source: unknown, contentState?: TemplateFieldContentStateV1): TemplateSessionV2Snapshot;
  loadSaved(id: string): Promise<TemplateSessionV2Snapshot>;
  /** Atomically replaces supplied field configurations/order, retaining content and assets. */
  configure(update: { fields?: readonly TemplateFieldConfigurationV2[]; editableFieldOrder?: readonly string[] }): TemplateSessionV2Snapshot;
  save(options?: { id?: string; name?: string; description?: string }): Promise<SavedTemplateSessionRecordV2>;
  planReimport(source: unknown): TemplateReimportPlanV2;
  applyReimport(plan: TemplateReimportPlanV2, options?: ApplyTemplateReimportV2Options): TemplateSessionV2Snapshot;
  publishFieldLayoutEvidence(evidence: FieldLayoutEvidenceV1): boolean;
  publishRuntimeReadiness(evidence: TemplateSessionRuntimeReadinessEvidenceV2): boolean;
  /** @internal Acquire the monotonic generation range for one mounted renderer publisher. */
  beginRuntimeEvidencePublication(): number;
  reset(): TemplateSessionV2Snapshot;
  dispose(): void;
}

function cloneValue<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  return Object.freeze(value);
}

function idleReadiness(): TemplateSessionReadinessV2 {
  return {
    state: "idle",
    exportReady: false,
    deterministic: "ready",
    renderValidation: "not-required",
    assets: "not-required",
    fonts: "not-required",
    renderer: "not-required",
    reasons: [],
    contentRevision: 0,
    materializationRevision: null,
  };
}

function emptySnapshot(): TemplateSessionV2Snapshot {
  return {
    schemaVersion: TEMPLATE_SESSION_V2_SCHEMA_VERSION,
    status: "idle",
    revision: 0,
    operationRevision: 0,
    savedSessionId: null,
    basePackage: null,
    contentState: null,
    sessionAssets: {},
    materialization: null,
    workingPackage: null,
    rendererPackage: null,
    resolvedTree: null,
    fields: [],
    readiness: idleReadiness(),
    error: null,
  };
}

/** Existing renderer bridge. This projection is derived and never persisted. */
export function projectTemplatePackageV2ToRendererV1(
  packageValue: TemplatePackageV2,
): TemplatePackageV1 {
  const editableFields: EditableFieldBinding[] = packageValue.editableFields.map((field) => ({
    id: field.id,
    type: field.type,
    nodeId: field.binding.nodeId,
    property: field.binding.kind === "image-content"
      ? "image.assetId"
      : field.binding.kind === "solid-fill-color"
        ? `appearance.fills.${field.binding.sourceIndex}.color`
        : field.binding.kind === "structural-visibility"
          ? "visible"
          : "text.characters",
    ...(field.label !== undefined ? { label: field.label } : {}),
    defaultValue: field.type === "image" ? field.defaultValue.assetId : field.defaultValue,
  }));
  const { editableFieldOrder: _order, ...rest } = cloneValue(packageValue);
  return {
    ...rest,
    schemaVersion: "1.0",
    editableFields,
  };
}

function defaultObjectUrls(): TemplateSessionObjectUrlAdapterV2 {
  return {
    create(blob) {
      if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
        throw new Error("This environment cannot create browser object URLs.");
      }
      return URL.createObjectURL(blob);
    },
    revoke(url) {
      if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(url);
      }
    },
  };
}

function referencedReplacementAssetIds(content: TemplateFieldContentStateV1): Set<string> {
  return new Set(Object.values(content.values).flatMap((entry) =>
    typeof entry.value === "object" && "assetId" in entry.value
      ? [entry.value.assetId]
      : []
  ));
}

export function createTemplateSessionV2(
  options: TemplateSessionV2Options = {},
): TemplateSessionV2 {
  const repository = options.repository ?? getTemplateSessionRepositoryV2();
  const objectUrls = options.objectUrls ?? defaultObjectUrls();
  const listeners = new Set<() => void>();
  const ownedUrls = new Map<string, string>();
  const sourceUrls = new Set<string>();
  const leasedUrls = new Set<string>();
  const fieldRenderValidation = new Map<string, FieldRenderValidationStatusV1>();
  let runtimeFonts: TemplateRuntimeReadinessStateV2 = "not-required";
  let runtimeRenderer: TemplateRuntimeReadinessStateV2 = "not-required";
  let currentSettlementRevision: string | null = null;
  let currentFontRevision: string | null = null;
  let currentPublicationGeneration: number | null = null;
  let publicationLeaseBase = 0;
  let snapshot = emptySnapshot();
  let disposed = false;
  const saveQueue = createSerializedSaveQueue();
  let recordGeneration = 0;
  let reservedSaveId: string | undefined;
  let controllerGeneration = 0;

  const assertActive = () => {
    if (disposed) throw new Error("TemplateSessionV2 has been disposed.");
  };
  const notify = () => listeners.forEach((listener) => listener());
  const publish = (patch: Partial<Omit<TemplateSessionV2Snapshot, "schemaVersion" | "revision">>) => {
    snapshot = deepFreeze({
      ...snapshot,
      ...patch,
      schemaVersion: TEMPLATE_SESSION_V2_SCHEMA_VERSION,
      revision: snapshot.revision + 1,
    });
    notify();
    return snapshot;
  };
  const retainUrl = (url: string) => {
    if (leasedUrls.has(url)) return;
    const lease = sessionAssetUrlLeases.get(url);
    if (lease) lease.count += 1;
    else sessionAssetUrlLeases.set(url, { count: 1, revoke: () => objectUrls.revoke(url) });
    leasedUrls.add(url);
  };
  const retainOwned = (id: string, url: string) => {
    retainUrl(url);
    ownedUrls.set(id, url);
  };
  const releaseUrl = (url: string) => {
    if (sourceUrls.has(url) || [...ownedUrls.values()].includes(url)) return;
    if (!leasedUrls.delete(url)) return;
    const lease = sessionAssetUrlLeases.get(url)!;
    if (--lease.count === 0) { sessionAssetUrlLeases.delete(url); lease.revoke(); }
  };
  const revokeOwned = (assetId?: string) => {
    for (const [id, url] of [...ownedUrls]) {
      if (assetId && assetId !== id) continue;
      ownedUrls.delete(id);
      releaseUrl(url);
    }
  };
  const revokeSources = () => {
    for (const url of [...sourceUrls]) { sourceUrls.delete(url); releaseUrl(url); }
  };
  const assetReadiness = (
    content: TemplateFieldContentStateV1,
    working: TemplatePackageV2 | null,
  ): { state: TemplateRuntimeReadinessStateV2; reasons: string[] } => {
    if (!working) return { state: "blocked", reasons: ["A materialized package is unavailable."] };
    let pending = false;
    const reasons: string[] = [];
    for (const assetId of referencedReplacementAssetIds(content)) {
      const asset = working.assets[assetId];
      if (!asset) {
        return { state: "blocked", reasons: [`Replacement image asset "${assetId}" is missing.`] };
      }
      if (!asset.deferred && !resolvePackageAssetSource(asset)) {
        return { state: "blocked", reasons: [`Replacement image asset "${assetId}" has no available source.`] };
      }
      if (asset.deferred) {
        pending = true;
        reasons.push(`Replacement image asset "${assetId}" is pending.`);
      }
    }
    return { state: pending ? "pending" : "ready", reasons };
  };
  const readiness = (
    content: TemplateFieldContentStateV1,
    materialization: MaterializeTemplateFieldContentResultV2,
  ): TemplateSessionReadinessV2 => {
    const reasons: string[] = [];
    const deterministic = materialization.valid ? "ready" : "blocked";
    if (!materialization.valid) reasons.push("Deterministic field validation or materialization is blocked.");
    let renderValidation: TemplateSessionReadinessV2["renderValidation"] = "not-required";
    for (const pending of materialization.pendingRenderValidation) {
      if (!pending.blocksExport) continue;
      const status = fieldRenderValidation.get(pending.fieldId);
      if (status?.state === "invalid" && status.contentRevision === content.revision) {
        renderValidation = "blocked";
        reasons.push(`Rendered line validation failed for field "${pending.fieldId}".`);
      } else if (status?.state === "inactive" && status.contentRevision === content.revision) {
        if (renderValidation === "not-required") renderValidation = "ready";
      } else if (status?.state !== "valid" || status.contentRevision !== content.revision) {
        if (renderValidation !== "blocked") renderValidation = "pending";
        reasons.push(`Rendered line validation is pending for field "${pending.fieldId}".`);
      } else if (renderValidation === "not-required") {
        renderValidation = "ready";
      }
    }
    const assets = assetReadiness(content, materialization.workingPackage);
    reasons.push(...assets.reasons);
    if (runtimeFonts === "pending") reasons.push("Font readiness is pending.");
    if (runtimeFonts === "blocked") reasons.push("Font readiness is blocked.");
    if (runtimeRenderer === "pending") reasons.push("Renderer settlement/readiness is pending.");
    if (runtimeRenderer === "blocked") reasons.push("Renderer settlement/readiness is blocked.");
    const blocked = deterministic === "blocked" || renderValidation === "blocked" ||
      assets.state === "blocked" || runtimeFonts === "blocked" || runtimeRenderer === "blocked";
    const pending = renderValidation === "pending" || assets.state === "pending" ||
      runtimeFonts === "pending" || runtimeRenderer === "pending";
    return {
      state: blocked ? "blocked" : pending ? "pending" : "ready",
      exportReady: !blocked && !pending,
      deterministic,
      renderValidation,
      assets: assets.state,
      fonts: runtimeFonts,
      renderer: runtimeRenderer,
      reasons,
      contentRevision: content.revision,
      materializationRevision: materialization.materializationRevision,
    };
  };
  const fieldStates = (
    packageValue: TemplatePackageV2,
    content: TemplateFieldContentStateV1,
    materialization: MaterializeTemplateFieldContentResultV2,
  ): TemplateSessionFieldStateV2[] => {
    const issuesByField = new Map<string, FieldValidationIssueV2[]>();
    for (const issue of materialization.fieldIssues) {
      const issues = issuesByField.get(issue.fieldId) ?? [];
      issues.push(issue);
      issuesByField.set(issue.fieldId, issues);
    }
    return getOrderedHostEditableFieldsV2(packageValue).map(({ index, field }) => {
      const definition = packageValue.editableFields.find((candidate) => candidate.id === field.id)!;
      const resolved = resolveTemplateFieldContentV2(definition, content);
      const issues = issuesByField.get(field.id) ?? [];
      const pending = materialization.pendingRenderValidation.find((item) => item.fieldId === field.id);
      const renderValidation = fieldRenderValidation.get(field.id) ?? (pending
        ? { state: "pending", contentRevision: content.revision, reason: "Current renderer evidence has not been published." }
        : { state: "not-required" });
      return {
        index,
        descriptor: field,
          label: field.label?.trim() || field.id.replace(/^[^:]+:/u, ""),
        value: cloneValue(resolved.value),
        importedDefaultValue: cloneValue(field.defaultValue),
        valueSource: resolved.valueSource,
        ...(resolved.selectedChoiceId !== undefined ? { selectedChoiceId: resolved.selectedChoiceId } : {}),
        deterministicIssues: issues,
        warnings: issues.filter((issue) => issue.severity === "warning"),
        blockingErrors: issues.filter((issue) => issue.severity === "error"),
        renderValidation,
        contentRevision: content.revision,
      };
    });
  };
  const materialize = (
    basePackage: TemplatePackageV2,
    content: TemplateFieldContentStateV1,
    sessionAssets: TemplatePackageV2["assets"],
  ) => {
    const materializationInput = {
      ...basePackage,
      assets: { ...basePackage.assets, ...sessionAssets },
    };
    const result = materializeTemplateFieldContentV2(materializationInput, content);
    let rendererPackage: TemplatePackageV1 | null = null;
    let resolvedTree: ResolvedRenderTreeV1 | null = null;
    if (result.workingPackage) {
      rendererPackage = projectTemplatePackageV2ToRendererV1(result.workingPackage);
      resolvedTree = createResolvedRenderTree(rendererPackage);
    }
    const nextReadiness = readiness(content, result);
    return {
      materialization: result,
      workingPackage: result.workingPackage,
      rendererPackage,
      resolvedTree,
      fields: fieldStates(materializationInput, content, result),
      readiness: nextReadiness,
      status: result.workingPackage ? "ready" as const : "blocked" as const,
      error: result.workingPackage
        ? null
        : {
            code: "materialization-failed" as const,
            message: result.fieldIssues[0]?.message ?? result.diagnostics[0]?.message ?? "V2 field materialization failed.",
            diagnostics: result.diagnostics,
          },
    };
  };
  const mutationResponse = (
    coreResult: TemplateFieldContentMutationResultV2,
    stale = false,
  ): TemplateSessionV2MutationResult => {
    const currentReadiness = snapshot.readiness;
    return {
      accepted: coreResult.accepted,
      stale,
      contentRevision: coreResult.contentRevision,
      warnings: coreResult.issues.filter((issue) => issue.severity === "warning"),
      blockingErrors: coreResult.issues.filter((issue) => issue.severity === "error"),
      renderValidation: coreResult.renderValidation,
      readiness: currentReadiness,
      coreResult,
    };
  };
  const staleMutationResult = (): TemplateSessionV2MutationResult => ({
    accepted: false,
    stale: true,
    contentRevision: snapshot.contentState?.revision ?? 0,
    warnings: [],
    blockingErrors: [],
    renderValidation: { state: "not-required" },
    readiness: snapshot.readiness,
  });
  const dispatch = (
    command: Parameters<typeof mutateTemplateFieldContentV2>[2],
    expectedControllerGeneration?: number,
  ) => {
    assertActive();
    if (expectedControllerGeneration !== undefined && expectedControllerGeneration !== controllerGeneration) {
      return staleMutationResult();
    }
    if (!snapshot.basePackage || !snapshot.contentState) {
      throw new Error("Load a TemplatePackageV2 before editing fields.");
    }
    const operationRevision = snapshot.operationRevision + 1;
    const packageValue = {
      ...cloneValue(snapshot.basePackage),
      assets: { ...cloneValue(snapshot.basePackage.assets), ...cloneValue(snapshot.sessionAssets) },
    };
    const result = mutateTemplateFieldContentV2(packageValue, snapshot.contentState, command);
    if (!result.accepted) return mutationResponse(result);
    let sessionAssets = snapshot.sessionAssets;
    if (command.kind === "reset") {
      const previous = snapshot.contentState.values[command.fieldId]?.value;
      const previousAssetId = previous && typeof previous === "object" && "assetId" in previous
        ? previous.assetId
        : null;
      if (previousAssetId && sessionAssets[previousAssetId] &&
          !referencedReplacementAssetIds(result.state).has(previousAssetId)) {
        sessionAssets = { ...sessionAssets };
        delete sessionAssets[previousAssetId];
        revokeOwned(previousAssetId);
      }
    }
    fieldRenderValidation.clear();
    runtimeRenderer = "pending";
    currentSettlementRevision = null;
    currentFontRevision = null;
    currentPublicationGeneration = null;
    const derived = materialize(snapshot.basePackage, result.state, sessionAssets);
    publish({
      operationRevision,
      contentState: result.state,
      sessionAssets,
      ...derived,
    });
    return mutationResponse(result);
  };
  const controllerFor = (state: TemplateSessionFieldStateV2): TemplateFieldControllerV2 => {
    const expectedControllerGeneration = controllerGeneration;
    const common = {
      ...state,
      id: state.descriptor.id,
      type: state.descriptor.type,
      ...(state.descriptor.controlRole !== undefined ? { controlRole: state.descriptor.controlRole } : {}),
      configuration: state.descriptor.configuration,
      reset: () => dispatch({ kind: "reset", fieldId: state.descriptor.id }, expectedControllerGeneration),
    };
    const selectChoice = (choiceId: string) => dispatch({ kind: "select-choice", fieldId: state.descriptor.id, choiceId }, expectedControllerGeneration);
    switch (state.descriptor.type) {
      case "text":
      case "textarea":
      case "number":
      case "date":
      case "color":
        return {
          ...common,
          setValue: (value: unknown) => dispatch({ kind: "set-value", fieldId: state.descriptor.id, value }, expectedControllerGeneration),
          selectChoice,
        } as TemplateFieldControllerV2;
      case "boolean":
        return {
          ...common,
          setValue: (value: boolean) => dispatch({ kind: "set-value", fieldId: state.descriptor.id, value }, expectedControllerGeneration),
        } as TemplateFieldControllerV2;
      case "image":
        return {
          ...common,
          replaceImage: (source: TemplateSessionImageSourceV2) => replaceImage(state.descriptor.id, source, expectedControllerGeneration),
          setPlacement: (placement: ImageReplacementPlacementV1) => {
            const latest = snapshot.contentState && snapshot.basePackage
              ? snapshot.basePackage.editableFields.find((field) => field.id === state.descriptor.id)
              : null;
            if (!latest || latest.type !== "image" || !snapshot.contentState) {
              throw new Error("The Image field is no longer available.");
            }
            const value = resolveTemplateFieldContentV2(latest, snapshot.contentState).value;
            if (!value || typeof value !== "object" || !("assetId" in value) || !value.assetId) {
              throw new Error("Replace the imported image before setting replacement placement.");
            }
            return dispatch({ kind: "set-image-replacement", fieldId: latest.id, assetId: value.assetId, placement }, expectedControllerGeneration);
          },
        } as TemplateFieldControllerV2;
    }
  };
  const staleImageResult = staleMutationResult;
  const replaceImage = async (
    fieldId: string,
    source: TemplateSessionImageSourceV2,
    expectedControllerGeneration?: number,
  ): Promise<TemplateSessionV2MutationResult> => {
    assertActive();
    if (expectedControllerGeneration !== undefined && expectedControllerGeneration !== controllerGeneration) {
      return staleImageResult();
    }
    if (!snapshot.basePackage || !snapshot.contentState) throw new Error("Load a template before replacing images.");
    const field = snapshot.basePackage.editableFields.find((candidate) => candidate.id === fieldId);
    if (!field || field.type !== "image") throw new Error(`Image field "${fieldId}" does not exist.`);
    if ((source.blob ? 1 : 0) + (source.dataUrl ? 1 : 0) !== 1) {
      throw new Error("Image replacement requires exactly one Blob or data URL source.");
    }
    const operationRevision = snapshot.operationRevision + 1;
    publish({ operationRevision });
    let asset: PackageImageAsset;
    let ownedUrl: string | null = null;
    if (source.blob) {
      const mimeType = source.mimeType ?? source.blob.type;
      if (!mimeType.startsWith("image/")) throw new Error("Image replacement Blob must use an image MIME type.");
      const saved = await createSavedAssetRecord(source.blob);
      const assetId = source.assetId ?? `field-image:${saved.hash}`;
      ownedUrl = objectUrls.create(source.blob);
      asset = {
        id: assetId,
        type: "image",
        source: "stored",
        mimeType,
        hash: saved.hash,
        stableUrl: ownedUrl,
        sizeBytes: saved.sizeBytes,
        width: source.width ?? 1,
        height: source.height ?? 1,
        deferred: false,
        nodeId: field.binding.nodeId,
      };
    } else {
      const match = source.dataUrl!.match(/^data:(image\/[A-Za-z0-9.+-]+)(?:;[^,]*)?,/i);
      if (!match) throw new Error("Image replacement data URL must contain an image MIME type.");
      asset = {
        id: source.assetId ?? `field-image:${crypto.randomUUID()}`,
        type: "image",
        source: "embedded",
        mimeType: source.mimeType ?? match[1].toLowerCase(),
        dataUrl: source.dataUrl,
        width: source.width ?? 1,
        height: source.height ?? 1,
        deferred: false,
        nodeId: field.binding.nodeId,
      };
    }
    try {
      Object.assign(asset, await imageSourceDimensionsV2(asset.stableUrl ?? asset.dataUrl!, source));
    } catch (error) {
      if (ownedUrl) objectUrls.revoke(ownedUrl);
      throw error;
    }
    if (disposed || snapshot.operationRevision !== operationRevision) {
      if (ownedUrl) objectUrls.revoke(ownedUrl);
      return staleImageResult();
    }
    const packageValue = {
      ...cloneValue(snapshot.basePackage),
      assets: { ...cloneValue(snapshot.basePackage.assets), ...cloneValue(snapshot.sessionAssets), [asset.id]: asset },
    };
    const result = mutateTemplateFieldContentV2(packageValue, snapshot.contentState, {
      kind: "set-image-replacement",
      fieldId,
      assetId: asset.id,
      ...(source.placement ? { placement: source.placement } : {}),
    });
    if (!result.accepted) {
      if (ownedUrl) objectUrls.revoke(ownedUrl);
      return mutationResponse(result);
    }
    const previous = snapshot.contentState.values[fieldId]?.value;
    const previousAssetId = previous && typeof previous === "object" && "assetId" in previous
      ? previous.assetId
      : null;
    const sessionAssets = { ...snapshot.sessionAssets, [asset.id]: asset };
    if (ownedUrl) { if (ownedUrls.get(asset.id) !== ownedUrl) revokeOwned(asset.id); retainOwned(asset.id, ownedUrl); }
    else revokeOwned(asset.id); // Accepted embedded data replaces this ID's Blob ownership.
    if (previousAssetId && previousAssetId !== asset.id && sessionAssets[previousAssetId] &&
        !referencedReplacementAssetIds(result.state).has(previousAssetId)) {
      delete sessionAssets[previousAssetId];
      revokeOwned(previousAssetId);
    }
    fieldRenderValidation.clear();
    runtimeRenderer = "pending";
    currentSettlementRevision = null;
    currentFontRevision = null;
    currentPublicationGeneration = null;
    const derived = materialize(snapshot.basePackage, result.state, sessionAssets);
    publish({ contentState: result.state, sessionAssets, ...derived });
    return mutationResponse(result);
  };
  const hydrateRecord = async (record: SavedTemplateSessionRecordV2, operationRevision: number) => {
    const basePackage = cloneValue(record.basePackage);
    const sessionAssets = cloneValue(record.sessionAssets);
    const replacementUrls = new Map<string, string>();
    const nextSourceUrls = new Set<string>();
    const hydration = createStoredAssetHydration({
      getManagedAsset: hash => repository.getManagedAsset(hash), objectUrls,
      isStale: () => disposed || snapshot.operationRevision !== operationRevision,
    });
    const release = hydration.release;
    try {
      const maps = [{ assets: basePackage.assets, source: true }, { assets: sessionAssets, source: false }];
      for (const carrier of maps) for (const asset of Object.values(carrier.assets)) {
        if (!asset.hash || asset.dataUrl || asset.data || asset.svgString) continue;
        // A persisted blob URL belongs to a previous session, not the restored binary.
        if (asset.stableUrl?.startsWith("blob:")) delete asset.stableUrl;
        let url = hydration.getCachedUrl(asset.hash);
        if (!url) {
          const result = await hydration.readUrl(asset.hash);
          if (result.status === "stale") return null;
          if (result.status === "missing") continue;
          url = result.url;
        }
        asset.source = "stored";
        asset.storageKey = `sha256:${asset.hash}`;
        asset.stableUrl = url;
        if (carrier.source) nextSourceUrls.add(url);
        else replacementUrls.set(asset.id, url);
        if (disposed || snapshot.operationRevision !== operationRevision) {
          release();
          return null;
        }
      }
    } catch (error) {
      release();
      throw error;
    }
    return { basePackage, sessionAssets, replacementUrls, nextSourceUrls, release, transfer: hydration.transfer };
  };

  return {
    getSnapshot: () => snapshot,
    getFieldControllers: () => {
      if (!snapshot.basePackage || !snapshot.contentState) return [];
      const activeIds = activeTemplateFieldIdsV2(snapshot.basePackage, snapshot.contentState);
      return snapshot.fields
        .filter((field) => activeIds.has(field.descriptor.id))
        .map(controllerFor);
    },
    subscribe(listener) {
      assertActive();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load(source, contentState) {
      assertActive();
      recordGeneration += 1;
      reservedSaveId = undefined;
      const operationRevision = snapshot.operationRevision + 1;
      const parsed = parseTemplatePackageV2(source);
      if (!parsed.package) {
        publish({
          operationRevision,
          status: "blocked",
          error: { code: "package-invalid", message: parsed.diagnostics[0]?.message ?? "Template source could not normalize to V2.", diagnostics: parsed.diagnostics },
        });
        return snapshot;
      }
      const content = contentState ?? createTemplateFieldContentStateV1(parsed.package);
      const retained = Object.values(parsed.package.assets).filter(asset => asset.stableUrl && sessionAssetUrlLeases.has(asset.stableUrl));
      const urls = new Set(retained.map(asset => asset.stableUrl!));
      for (const url of urls) sessionAssetUrlLeases.get(url)!.count += 1;
      controllerGeneration += 1;
      revokeSources();
      revokeOwned();
      for (const url of urls) { leasedUrls.add(url); sourceUrls.add(url); }
      fieldRenderValidation.clear();
      runtimeFonts = parsed.package.fontRequirements?.length ? "pending" : "not-required";
      runtimeRenderer = "pending";
      currentSettlementRevision = null;
      currentFontRevision = null;
      currentPublicationGeneration = null;
      const derived = materialize(parsed.package, content, {});
      publish({
        operationRevision,
        savedSessionId: null,
        basePackage: deepFreeze(cloneValue(parsed.package)),
        contentState: content,
        sessionAssets: {},
        ...derived,
      });
      return snapshot;
    },
    configure(update) {
      assertActive();
      if (!snapshot.basePackage || !snapshot.contentState) throw new Error("Load a template before configuring fields.");
      const basePackage = cloneValue(snapshot.basePackage);
      const seen = new Set<string>();
      for (const field of update.fields ?? []) {
        const index = basePackage.editableFields.findIndex((entry) => entry.id === field.id);
        if (seen.has(field.id) || index < 0 || basePackage.editableFields[index].type !== field.type) {
          throw new Error("Configuration must reference unique existing IDs with unchanged types.");
        }
        seen.add(field.id);
        const { label, controlRole, configuration } = field;
        basePackage.editableFields[index] = { ...basePackage.editableFields[index], label, controlRole, configuration: cloneValue(configuration) } as EditableFieldDefinitionV2;
      }
      if (update.editableFieldOrder) basePackage.editableFieldOrder = [...update.editableFieldOrder];
      const validation = validateTemplatePackageV2(basePackage);
      if (!validation.valid) throw new Error(validation.diagnostics.map((issue) => issue.message).join("\n"));
      const contentState = reconcileTemplateFieldConfigurationV2(basePackage, snapshot.contentState);
      controllerGeneration += 1;
      fieldRenderValidation.clear();
      runtimeFonts = basePackage.fontRequirements?.length ? "pending" : "not-required";
      runtimeRenderer = "pending";
      currentSettlementRevision = null;
      currentFontRevision = null;
      currentPublicationGeneration = null;
      const derived = materialize(basePackage, contentState, snapshot.sessionAssets);
      publish({ operationRevision: snapshot.operationRevision + 1, basePackage: deepFreeze(basePackage), contentState, ...derived });
      return snapshot;
    },
    async loadSaved(id) {
      assertActive();
      recordGeneration += 1;
      reservedSaveId = undefined;
      const operationRevision = snapshot.operationRevision + 1;
      publish({ operationRevision });
      let releaseHydrated: (() => void) | undefined;
      try {
        const record = await repository.getTemplateSessionV2(id);
        if (disposed || snapshot.operationRevision !== operationRevision) return snapshot;
        if (!record) {
          publish({ status: "blocked", error: { code: "saved-session-not-found", message: `Saved V2 template session "${id}" was not found.` } });
          return snapshot;
        }
        const hydrated = await hydrateRecord(record, operationRevision);
        if (!hydrated) return snapshot;
        releaseHydrated = hydrated.release;
        if (disposed || snapshot.operationRevision !== operationRevision) return snapshot;
        fieldRenderValidation.clear();
        runtimeFonts = hydrated.basePackage.fontRequirements?.length ? "pending" : "not-required";
        runtimeRenderer = "pending";
        currentSettlementRevision = null;
        currentFontRevision = null;
        currentPublicationGeneration = null;
        const derived = materialize(hydrated.basePackage, record.contentState, hydrated.sessionAssets);
        // Hold every incoming URL before releasing the previous accepted ownership.
        const incoming = new Set([...hydrated.nextSourceUrls, ...hydrated.replacementUrls.values()]);
        for (const url of incoming) {
          const lease = sessionAssetUrlLeases.get(url);
          if (lease) lease.count += 1;
          else sessionAssetUrlLeases.set(url, { count: 1, revoke: () => objectUrls.revoke(url) });
        }
        revokeSources();
        revokeOwned();
        controllerGeneration += 1;
        incoming.forEach(url => leasedUrls.add(url));
        hydrated.nextSourceUrls.forEach(url => sourceUrls.add(url));
        hydrated.replacementUrls.forEach((url, assetId) => ownedUrls.set(assetId, url));
        hydrated.transfer();
        releaseHydrated = undefined;
        publish({
          savedSessionId: record.id,
          basePackage: deepFreeze(hydrated.basePackage),
          contentState: deepFreeze(cloneValue(record.contentState)),
          sessionAssets: hydrated.sessionAssets,
          ...derived,
        });
      } catch (error) {
        if (!disposed && snapshot.operationRevision === operationRevision) {
          publish({ status: "blocked", error: { code: "saved-session-load-failed", message: error instanceof Error ? error.message : "Saved V2 template session failed to load." } });
        }
      } finally {
        releaseHydrated?.();
      }
      return snapshot;
    },
    async save(saveOptions = {}) {
      assertActive();
      if (!snapshot.basePackage || !snapshot.contentState) throw new Error("Load a V2 template before saving.");
      const operationRevision = snapshot.operationRevision;
      const contentRevision = snapshot.contentState.revision;
      const generation = recordGeneration;
      const existingId = saveOptions.id ?? reservedSaveId ?? snapshot.savedSessionId ?? `template-session-v2:${crypto.randomUUID()}`;
      reservedSaveId = existingId;
      const record = createSavedTemplateSessionV2Record({
        ...(existingId ? { id: existingId } : {}),
        name: saveOptions.name ?? snapshot.basePackage.name,
        ...(saveOptions.description !== undefined ? { description: saveOptions.description } : {}),
        basePackage: snapshot.basePackage,
        contentState: snapshot.contentState,
        sessionAssets: snapshot.sessionAssets,
        source: { type: "package-zip", figmaUrl: snapshot.basePackage.source?.url },
      });
      // Capture above, serialize writes below. Snapshot guards alone cannot stop
      // an older repository write from overwriting a newer one.
      const releaseSaveUrls = retainSessionAssetUrls(leasedUrls);
      const write = saveQueue.enqueue(() => {
        assertActive();
        if (generation !== recordGeneration) throw new Error("Save cancelled because another template was loaded or the session was reset.");
        return repository.saveTemplateSessionV2(record);
      }, releaseSaveUrls);
      const saved = await write;
      if (!disposed && snapshot.operationRevision === operationRevision && snapshot.contentState?.revision === contentRevision) {
        publish({ savedSessionId: saved.id });
      }
      return saved;
    },
    planReimport(source) {
      assertActive();
      if (!snapshot.basePackage || !snapshot.contentState) throw new Error("Load a V2 template before planning reimport.");
      return planTemplateReimportV2(snapshot.basePackage, snapshot.contentState, source);
    },
    applyReimport(plan, applyOptions) {
      assertActive();
      if (!snapshot.basePackage || !snapshot.contentState) throw new Error("Load a V2 template before applying reimport.");
      const applied = applyTemplateReimportV2(
        snapshot.basePackage,
        snapshot.contentState,
        plan,
        { ...applyOptions, sessionAssets: snapshot.sessionAssets },
      );
      const operationRevision = snapshot.operationRevision + 1;
      controllerGeneration += 1;
      fieldRenderValidation.clear();
      runtimeFonts = applied.packageValue.fontRequirements?.length ? "pending" : "not-required";
      runtimeRenderer = "pending";
      currentSettlementRevision = null;
      currentFontRevision = null;
      currentPublicationGeneration = null;
      const derived = materialize(applied.packageValue, applied.contentState, snapshot.sessionAssets);
      publish({
        operationRevision,
        basePackage: deepFreeze(applied.packageValue),
        contentState: deepFreeze(applied.contentState),
        ...derived,
      });
      return snapshot;
    },
    publishFieldLayoutEvidence(evidence) {
      assertActive();
      const materialization = snapshot.materialization;
      const field = snapshot.basePackage?.editableFields.find((candidate) => candidate.id === evidence.fieldId);
      if (
        !field || field.type !== "textarea" ||
        !snapshot.contentState ||
        evidence.packageIdentity !== snapshot.basePackage?.packageId ||
        evidence.contentRevision !== snapshot.contentState.revision ||
        evidence.materializationRevision !== materialization?.materializationRevision ||
        evidence.settlementRevision !== currentSettlementRevision ||
        evidence.fontRevision !== currentFontRevision ||
        evidence.publicationGeneration !== currentPublicationGeneration
      ) return false;
      const previousValidation = fieldRenderValidation.get(field.id);
      fieldRenderValidation.set(field.id, evaluateFieldRenderEvidence(field, evidence));
      if (JSON.stringify(previousValidation) === JSON.stringify(fieldRenderValidation.get(field.id))) return true;
      publish({
        fields: fieldStates(snapshot.basePackage!, snapshot.contentState, materialization!),
        readiness: readiness(snapshot.contentState, materialization!),
      });
      return true;
    },
    publishRuntimeReadiness(evidence) {
      assertActive();
      if (
        evidence.contentRevision !== snapshot.contentState?.revision ||
        evidence.materializationRevision !== snapshot.materialization?.materializationRevision ||
        !Number.isSafeInteger(evidence.publicationGeneration) ||
        evidence.publicationGeneration < publicationLeaseBase ||
        (currentPublicationGeneration !== null &&
          evidence.publicationGeneration < currentPublicationGeneration)
      ) return false;
      const nextFonts = evidence.fonts ?? runtimeFonts;
      const nextRenderer = evidence.renderer ?? runtimeRenderer;
      if (
        currentSettlementRevision === evidence.settlementRevision &&
        currentFontRevision === evidence.fontRevision &&
        currentPublicationGeneration === evidence.publicationGeneration &&
        runtimeFonts === nextFonts &&
        runtimeRenderer === nextRenderer
      ) return true;
      if (currentSettlementRevision !== evidence.settlementRevision ||
          currentFontRevision !== evidence.fontRevision ||
          currentPublicationGeneration !== evidence.publicationGeneration) {
        invalidateRuntimeFieldEvidence(fieldRenderValidation);
      }
      if (evidence.fonts) runtimeFonts = evidence.fonts;
      if (evidence.renderer) runtimeRenderer = evidence.renderer;
      currentSettlementRevision = evidence.settlementRevision;
      currentFontRevision = evidence.fontRevision;
      currentPublicationGeneration = evidence.publicationGeneration;
      publish({
        fields: fieldStates(snapshot.basePackage!, snapshot.contentState!, snapshot.materialization!),
        readiness: readiness(snapshot.contentState!, snapshot.materialization!),
      });
      return true;
    },
    beginRuntimeEvidencePublication() {
      assertActive();
      publicationLeaseBase += 1_000_000;
      invalidateRuntimeFieldEvidence(fieldRenderValidation);
      runtimeRenderer = snapshot.rendererPackage ? "pending" : "not-required";
      currentSettlementRevision = null;
      currentFontRevision = null;
      currentPublicationGeneration = null;
      if (snapshot.basePackage && snapshot.contentState && snapshot.materialization) {
        publish({
          fields: fieldStates(snapshot.basePackage, snapshot.contentState, snapshot.materialization),
          readiness: readiness(snapshot.contentState, snapshot.materialization),
        });
      }
      return publicationLeaseBase;
    },
    reset() {
      assertActive();
      recordGeneration += 1;
      reservedSaveId = undefined;
      revokeSources();
      revokeOwned();
      fieldRenderValidation.clear();
      runtimeFonts = "not-required";
      runtimeRenderer = "not-required";
      currentSettlementRevision = null;
      currentFontRevision = null;
      currentPublicationGeneration = null;
      controllerGeneration += 1;
      const empty = emptySnapshot();
      publish({
        status: empty.status,
        operationRevision: snapshot.operationRevision + 1,
        savedSessionId: empty.savedSessionId,
        basePackage: empty.basePackage,
        contentState: empty.contentState,
        sessionAssets: empty.sessionAssets,
        materialization: empty.materialization,
        workingPackage: empty.workingPackage,
        rendererPackage: empty.rendererPackage,
        resolvedTree: empty.resolvedTree,
        fields: empty.fields,
        readiness: empty.readiness,
        error: empty.error,
      });
      return snapshot;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controllerGeneration += 1;
      revokeSources();
      revokeOwned();
      fieldRenderValidation.clear();
      listeners.clear();
      snapshot = deepFreeze({ ...snapshot, status: "disposed", operationRevision: snapshot.operationRevision + 1, revision: snapshot.revision + 1 });
    },
  };
}

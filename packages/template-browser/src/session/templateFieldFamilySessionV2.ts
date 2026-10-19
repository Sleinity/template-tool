import { evaluateFieldRenderEvidence, invalidateRuntimeFieldEvidence } from "./fieldRenderEvidence";
import { retainSessionAssetUrls, sessionAssetUrlLeases as familyAssetUrlLeases } from "./sessionAssetUrlLeases";
import { createStoredAssetHydration } from "./storedAssetHydration";
import { createSerializedSaveQueue } from "./serializedSaveQueue";
import {
  createTemplateFieldContentStateV1,
  getOrderedHostEditableFieldsV2,
  mutateTemplateFieldContentV2,
  reconcileEditableFieldOrderV2,
  reconcileTemplateFieldConfigurationV2,
  resolveTemplateFieldContentV2,
  type EditableFieldDefinitionV2,
  type FieldLayoutEvidenceV1,
  type FieldRenderValidationStatusV1,
  type ImageReplacementPlacementV1,
  type PackageImageAsset,
  type TemplateFieldContentEntryV1,
  type TemplateFieldContentMutationV2,
  type TemplateFieldContentStateV1,
  type TemplatePackageV2,
} from "@sleinity/template-core";
import {
  createTemplateFieldFamilyContentStateV3,
  getTemplateFieldFamilyVariantSelectionV2,
  materializeTemplateFieldFamilyVariantV2,
  migrateTemplateFieldFamilyContentStateV2,
  resolveTemplateFieldFamilySelectionV2,
  resolveTemplateFieldFamilyVariantV2,
  type MaterializeTemplateFieldFamilyVariantResultV2,
  type TemplateFieldFamilyContentStateV2,
  type TemplateFieldFamilyContentStateV3,
  type TemplateFieldFamilyFieldV2,
  type TemplateFieldFamilyV2,
  type TemplateFieldFamilyVariantV2,
} from "@sleinity/template-core/family";
import { createSavedAssetRecord } from "../persistence/assetRepository";
import { waitForImageSource } from "../export/pngExport";
import { imageSourceDimensionsV2 } from "./imageSourceDimensionsV2";
import {
  applyTemplateReimportV2,
  planTemplateReimportV2,
  type ApplyTemplateReimportV2Options,
  type ApplyTemplateReimportV2Result,
  type TemplateReimportPlanV2,
} from "../import/templateReimportV2";
import {
  createSavedTemplateFieldFamilyV3Record,
  getTemplateFieldFamilyRepositoryV3,
} from "../persistence/templateSessionRepositoryV2";
import type {
  SavedTemplateFieldFamilyRecordV3,
  TemplateFieldFamilyRepositoryV3,
} from "../persistence/types";
import { activeTemplateFieldIdsV2 } from "./activeFieldControllersV2";
import type {
  ImageFieldControllerV2,
  TemplateFieldControllerV2,
  TemplateSessionFieldStateV2,
  TemplateSessionImageSourceV2,
  TemplateSessionObjectUrlAdapterV2,
  TemplateSessionReadinessV2,
  TemplateSessionRuntimeReadinessEvidenceV2,
  TemplateSessionV2MutationResult,
} from "./templateSessionV2";
import { projectTemplatePackageV2ToRendererV1 } from "./templateSessionV2";
import { createResolvedRenderTree, type ResolvedRenderTreeV1, type TemplatePackageV1 } from "@sleinity/template-core";

export const TEMPLATE_FIELD_FAMILY_SESSION_V2_SCHEMA_VERSION =
  "template-field-family-session-v2" as const;

export interface TemplateFieldFamilySessionV2Snapshot {
  schemaVersion: typeof TEMPLATE_FIELD_FAMILY_SESSION_V2_SCHEMA_VERSION;
  status: "idle" | "ready" | "blocked" | "disposed";
  revision: number;
  operationRevision: number;
  savedFamilyId: string | null;
  family: TemplateFieldFamilyV2 | null;
  contentState: TemplateFieldFamilyContentStateV3 | null;
  selectedVariantId: string | null;
  sessionAssets: TemplatePackageV2["assets"];
  familyMaterialization: MaterializeTemplateFieldFamilyVariantResultV2 | null;
  effectivePackage: TemplatePackageV2 | null;
  workingPackage: TemplatePackageV2 | null;
  rendererPackage: TemplatePackageV1 | null;
  resolvedTree: ResolvedRenderTreeV1 | null;
  fields: readonly TemplateSessionFieldStateV2[];
  readiness: TemplateSessionReadinessV2;
  error: { code: string; message: string } | null;
}

export interface TemplateFieldFamilySessionV2Options {
  repository?: TemplateFieldFamilyRepositoryV3;
  objectUrls?: TemplateSessionObjectUrlAdapterV2;
}

export interface TemplateFieldFamilySessionV2 {
  getSnapshot(): TemplateFieldFamilySessionV2Snapshot;
  getFieldControllers(): readonly TemplateFieldFamilyControllerV3[];
  subscribe(listener: () => void): () => void;
  load(
    family: TemplateFieldFamilyV2,
    options?: {
      contentState?: TemplateFieldFamilyContentStateV3 | TemplateFieldFamilyContentStateV2;
      selectedVariantId?: string;
      sessionAssets?: TemplatePackageV2["assets"];
    },
  ): TemplateFieldFamilySessionV2Snapshot;
  loadSaved(id: string): Promise<TemplateFieldFamilySessionV2Snapshot>;
  configure(update: {
    fields?: readonly TemplateFieldFamilyFieldV2[];
    editableFieldOrder?: readonly string[];
    variants?: readonly Pick<TemplateFieldFamilyVariantV2, "id" | "fieldOverrides" | "editableFieldOrder">[];
  }): TemplateFieldFamilySessionV2Snapshot;
  selectVariant(variantId: string): TemplateFieldFamilySessionV2Snapshot;
  /** Resolve navigation metadata to an existing variant without mutating content. */
  selectOption(groupId: string, optionId: string): TemplateFieldFamilySessionV2Snapshot;
  publishFieldLayoutEvidence(evidence: FieldLayoutEvidenceV1): boolean;
  publishRuntimeReadiness(evidence: TemplateSessionRuntimeReadinessEvidenceV2): boolean;
  /** @internal Acquire the monotonic generation range for one mounted renderer publisher. */
  beginRuntimeEvidencePublication(): number;
  planVariantReimport(source: unknown): TemplateReimportPlanV2;
  applyVariantReimport(
    plan: TemplateReimportPlanV2,
    options?: ApplyTemplateReimportV2Options,
  ): { snapshot: TemplateFieldFamilySessionV2Snapshot; archivedContent: ApplyTemplateReimportV2Result["archivedContent"] };
  save(options?: { name?: string; description?: string }): Promise<SavedTemplateFieldFamilyRecordV3>;
  reset(): TemplateFieldFamilySessionV2Snapshot;
  dispose(): void;
}

export type TemplateFieldFamilyImageControllerV3 = ImageFieldControllerV2 & {
  /** Set placement only for the currently selected variant. */
  setVariantPlacement(placement: ImageReplacementPlacementV1): TemplateSessionV2MutationResult;
  /** Remove the current variant override and inherit the shared placement. */
  resetVariantPlacement(): TemplateSessionV2MutationResult;
};

export type TemplateFieldFamilyControllerV3 =
  | Exclude<TemplateFieldControllerV2, ImageFieldControllerV2>
  | TemplateFieldFamilyImageControllerV3;

// Reconciliation is a content edit. Presentation and validation-only changes
// must not reinterpret a selection that is incompatible in the current design.
function choiceValuesKey(field: TemplateFieldFamilyFieldV2 | undefined): string | undefined {
  const choices = field && "choices" in field.configuration ? field.configuration.choices : undefined;
  return choices && JSON.stringify(choices.options
    .map(option => [option.id, option.value] as const)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
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

function objectUrlAdapter(): TemplateSessionObjectUrlAdapterV2 {
  return {
    create(blob) {
      if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
        throw new Error("This environment cannot create browser object URLs.");
      }
      return URL.createObjectURL(blob);
    },
    revoke(url) {
      URL.revokeObjectURL?.(url);
    },
  };
}

function emptyReadiness(): TemplateSessionReadinessV2 {
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

function emptySnapshot(): TemplateFieldFamilySessionV2Snapshot {
  return {
    schemaVersion: TEMPLATE_FIELD_FAMILY_SESSION_V2_SCHEMA_VERSION,
    status: "idle",
    revision: 0,
    operationRevision: 0,
    savedFamilyId: null,
    family: null,
    contentState: null,
    selectedVariantId: null,
    sessionAssets: {},
    familyMaterialization: null,
    effectivePackage: null,
    workingPackage: null,
    rendererPackage: null,
    resolvedTree: null,
    fields: [],
    readiness: emptyReadiness(),
    error: null,
  };
}

function familyPackageState(
  packageValue: TemplatePackageV2,
  content: TemplateFieldFamilyContentStateV3,
): TemplateFieldContentStateV1 {
  const ids = new Set(packageValue.editableFields.map((field) => field.id));
  return deepFreeze({
    ...createTemplateFieldContentStateV1(packageValue),
    revision: content.revision,
    values: Object.fromEntries(
      Object.entries(content.values)
        .filter(([fieldId]) => ids.has(fieldId))
        .map(([fieldId, entry]) => [fieldId, cloneValue(entry)]),
    ),
  });
}

function familyWithAssets(
  family: TemplateFieldFamilyV2,
  selectedVariantId: string,
  sessionAssets: TemplatePackageV2["assets"],
): TemplateFieldFamilyV2 {
  // Only the selected asset dictionary changes. Core materialization owns the
  // output copy; copying every nonselected package here is redundant.
  if (!Object.keys(sessionAssets).length) return family;
  return {
    ...family,
    variants: family.variants.map(variant => variant.id === selectedVariantId ? {
      ...variant,
      packageValue: { ...variant.packageValue, assets: { ...variant.packageValue.assets, ...sessionAssets } },
    } : variant),
  };
}

function clearVariantImagePlacementsForField(
  content: TemplateFieldFamilyContentStateV3,
  fieldId: string,
): TemplateFieldFamilyContentStateV3["variantImagePlacements"] {
  const placements = cloneValue(content.variantImagePlacements) as Record<
    string,
    Record<string, ImageReplacementPlacementV1>
  >;
  for (const [variantId, fields] of Object.entries(placements)) {
    delete fields[fieldId];
    if (Object.keys(fields).length === 0) delete placements[variantId];
  }
  return placements;
}

function normalizeFamilyContentForRuntime(
  content: TemplateFieldFamilyContentStateV3 | TemplateFieldFamilyContentStateV2,
): TemplateFieldFamilyContentStateV3 {
  return content.schemaVersion === "template-field-family-content-v2"
    ? migrateTemplateFieldFamilyContentStateV2(content)
    : deepFreeze(cloneValue(content));
}

// Candidate sessions retain source URLs while the accepted session is disposed.


/** Preserve source-node order and per-node failure attribution for shared URLs. */
function referencedFamilyMedia(resolvedTree: ResolvedRenderTreeV1 | null) {
  return Object.values(resolvedTree?.nodes ?? {}).flatMap((node) =>
    [node.image, node.vector].flatMap((asset) => asset?.source
      ? [{ source: asset.source, assetId: asset.assetId, nodeId: node.id }]
      : [])
  );
}

export function createTemplateFieldFamilySessionV2(
  options: TemplateFieldFamilySessionV2Options = {},
): TemplateFieldFamilySessionV2 {
  const repository = options.repository ?? getTemplateFieldFamilyRepositoryV3();
  const objectUrls = options.objectUrls ?? objectUrlAdapter();
  const listeners = new Set<() => void>();
  const ownedUrls = new Map<string, string>();
  const sourceUrls = new Set<string>();
  const leasedUrls = new Set<string>();
  const decodedSources = new Map<string, { state: "pending" | "ready" | "blocked"; reason?: string }>();
  const fieldRenderValidation = new Map<string, FieldRenderValidationStatusV1>();
  let snapshot = emptySnapshot();
  let disposed = false;
  const saveQueue = createSerializedSaveQueue();
  let recordGeneration = 0;
  let controllerGeneration = 0;
  let runtimeFonts: TemplateSessionReadinessV2["fonts"] = "not-required";
  let runtimeRenderer: TemplateSessionReadinessV2["renderer"] = "not-required";
  let currentSettlementRevision: string | null = null;
  let minimumPublicationGeneration = 0;
  let currentFontRevision: string | null = null;
  let currentPublicationGeneration: number | null = null;
  let publicationLeaseBase = 0;
  let runtimeLoadState: "active" | "loading" | "failed" = "active";

  const assertActive = () => {
    if (disposed) throw new Error("TemplateFieldFamilySessionV2 has been disposed.");
  };
  const publish = (patch: Partial<Omit<TemplateFieldFamilySessionV2Snapshot, "schemaVersion" | "revision">>) => {
    snapshot = deepFreeze({
      ...snapshot,
      ...patch,
      schemaVersion: TEMPLATE_FIELD_FAMILY_SESSION_V2_SCHEMA_VERSION,
      revision: snapshot.revision + 1,
    });
    listeners.forEach((listener) => listener());
    return snapshot;
  };
  const retainUrl = (url: string) => {
    if (leasedUrls.has(url)) return;
    const lease = familyAssetUrlLeases.get(url);
    if (lease) lease.count += 1;
    else familyAssetUrlLeases.set(url, { count: 1, revoke: () => objectUrls.revoke(url) });
    leasedUrls.add(url);
  };
  const releaseUrl = (url: string) => {
    if (sourceUrls.has(url) || [...ownedUrls.values()].includes(url)) return;
    if (!leasedUrls.delete(url)) return;
    const lease = familyAssetUrlLeases.get(url)!;
    if (--lease.count === 0) { familyAssetUrlLeases.delete(url); lease.revoke(); }
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
  const retainReferencedAssets = (
    content: TemplateFieldFamilyContentStateV3,
    assets: TemplatePackageV2["assets"],
  ): TemplatePackageV2["assets"] => {
    const referenced = new Set(Object.values(content.values).flatMap((entry) =>
      typeof entry.value === "object" ? [entry.value.assetId] : []));
    const retained = { ...assets };
    for (const assetId of Object.keys(retained)) {
      if (retained[assetId].type !== "image" || referenced.has(assetId)) continue;
      delete retained[assetId];
      revokeOwned(assetId);
    }
    return retained;
  };
  const invalidateRuntime = (packageValue?: TemplatePackageV2 | null) => {
    runtimeLoadState = "active";
    // Configuration may change without changing canonical content. Keep a
    // watermark so first-A evidence cannot return after configuration A/B/A.
    if (currentPublicationGeneration !== null) {
      minimumPublicationGeneration = Math.max(minimumPublicationGeneration, currentPublicationGeneration + 1);
    }
    fieldRenderValidation.clear();
    runtimeFonts = packageValue?.fontRequirements?.length ? "pending" : "not-required";
    runtimeRenderer = packageValue ? "pending" : "not-required";
    currentSettlementRevision = null;
    currentFontRevision = null;
    currentPublicationGeneration = null;
  };
  const projectReadiness = (
    result: MaterializeTemplateFieldFamilyVariantResultV2,
    content: TemplateFieldFamilyContentStateV3,
    selectedVariantId: string,
    workingPackage: TemplatePackageV2 | null,
    resolvedTree: ResolvedRenderTreeV1 | null,
    media: ReturnType<typeof referencedFamilyMedia>,
  ) => {
    const materialization = result.materialization;
    const deterministicBlocked = runtimeLoadState === "failed" || !result.valid || !workingPackage;
    const requiredLineFields = materialization?.pendingRenderValidation.filter((item) => item.blocksExport) ?? [];
    const invalidLines = requiredLineFields.some((item) => {
      const status = fieldRenderValidation.get(item.fieldId);
      return status?.state === "invalid" && status.contentRevision === content.revision;
    });
    const pendingLines = requiredLineFields.some((item) => {
      const status = fieldRenderValidation.get(item.fieldId);
      return !status || status.state === "not-required" || status.contentRevision !== content.revision ||
        (status.state !== "valid" && status.state !== "invalid" && status.state !== "inactive");
    });
    const pendingMedia = runtimeLoadState === "loading" || media.some((asset) => decodedSources.get(asset.source)?.state === "pending");
    const failedMedia = media.filter((asset) => decodedSources.get(asset.source)?.state === "blocked");
    const missingSourceNodes = Object.values(resolvedTree?.nodes ?? {}).filter((node) => (node.image?.missingAsset || node.vector?.missingAsset));
    const missingAsset = failedMedia.length > 0 || missingSourceNodes.length > 0 || workingPackage && Object.values(content.values).some((entry) =>
      typeof entry.value === "object" && "assetId" in entry.value && !workingPackage.assets[entry.value.assetId]
    );
    const reasons = [
      ...(deterministicBlocked ? ["The selected variant is invalid for shared canonical content."] : []),
      ...(pendingLines ? ["Rendered line validation is pending for the selected variant."] : []),
      ...(invalidLines ? ["Rendered line validation is invalid for the selected variant."] : []),
      ...(pendingMedia ? ["Required image or SVG decoding is pending."] : []),
      ...failedMedia.map((asset) => `Variant "${selectedVariantId}": asset "${asset.assetId ?? "unknown"}" at node "${asset.nodeId}" could not be decoded.`),
      ...missingSourceNodes.map((node) => `Variant "${selectedVariantId}": source asset "${node.image?.assetId ?? node.vector?.assetId ?? "unknown"}" for node "${node.id}" is unavailable.`),
      ...(missingAsset && !missingSourceNodes.length && !failedMedia.length ? ["A shared replacement image asset is missing."] : []),
    ];
    const readiness: TemplateSessionReadinessV2 = {
      state: deterministicBlocked || missingAsset || invalidLines ? "blocked" : pendingLines || pendingMedia ? "pending" : "ready",
      exportReady: !deterministicBlocked && !pendingLines && !invalidLines && !missingAsset && !pendingMedia,
      deterministic: deterministicBlocked ? "blocked" : "ready",
      renderValidation: invalidLines ? "blocked" : pendingLines ? "pending" : requiredLineFields.length ? "ready" : "not-required",
      assets: missingAsset ? "blocked" : pendingMedia ? "pending" : "ready",
      fonts: runtimeFonts,
      renderer: workingPackage ? runtimeRenderer : "blocked",
      reasons,
      contentRevision: content.revision,
      materializationRevision: materialization?.materializationRevision ?? null,
    };
    // Font/renderer evidence is intentionally not produced by Milestone 3.
    if (readiness.fonts === "blocked" || readiness.renderer === "blocked") {
      readiness.state = "blocked";
      readiness.exportReady = false;
    } else if (readiness.fonts === "pending" || readiness.renderer === "pending") {
      readiness.state = readiness.state === "blocked" ? "blocked" : "pending";
      readiness.exportReady = false;
    }
    return {
      readiness,
      status: workingPackage ? "ready" as const : "blocked" as const,
      error: workingPackage ? null : {
        code: "family-materialization-failed",
        message: result.issues[0]?.message ?? materialization?.fieldIssues[0]?.message ?? "The selected family variant cannot materialize shared content.",
      },
    };
  };
  const derive = (
    family: TemplateFieldFamilyV2,
    content: TemplateFieldFamilyContentStateV3,
    selectedVariantId: string,
    sessionAssets: TemplatePackageV2["assets"],
  ) => {
    const result = materializeTemplateFieldFamilyVariantV2(
      familyWithAssets(family, selectedVariantId, sessionAssets),
      selectedVariantId,
      content,
    );
    const effectivePackage = result.effectivePackage;
    const materialization = result.materialization;
    const workingPackage = materialization?.workingPackage ?? null;
    const rendererPackage = workingPackage
      ? projectTemplatePackageV2ToRendererV1(workingPackage)
      : null;
    const resolvedTree = rendererPackage ? createResolvedRenderTree(rendererPackage) : null;
    const fields: TemplateSessionFieldStateV2[] = [];
    if (effectivePackage) {
      const packageState = result.packageContentState ?? familyPackageState(effectivePackage, content);
      for (const { index, field } of getOrderedHostEditableFieldsV2(effectivePackage)) {
        const definition = effectivePackage.editableFields.find((candidate) => candidate.id === field.id)!;
        const resolved = resolveTemplateFieldContentV2(definition, packageState);
        const issues = materialization?.fieldIssues.filter((item) => item.fieldId === field.id) ?? [];
        const pending = materialization?.pendingRenderValidation.find((item) => item.fieldId === field.id);
        const publishedRenderValidation = fieldRenderValidation.get(field.id);
        fields.push({
          index,
          descriptor: field,
          label: field.label?.trim() || field.id.replace(/^[^:]+:/u, ""),
          value: cloneValue(resolved.value),
          importedDefaultValue: cloneValue(field.defaultValue),
          valueSource: resolved.valueSource,
          ...(resolved.selectedChoiceId ? { selectedChoiceId: resolved.selectedChoiceId } : {}),
          deterministicIssues: issues,
          warnings: issues.filter((item) => item.severity === "warning"),
          blockingErrors: issues.filter((item) => item.severity === "error"),
          renderValidation: publishedRenderValidation && publishedRenderValidation.state !== "not-required" &&
            publishedRenderValidation.contentRevision === content.revision
            ? publishedRenderValidation
            : pending
            ? { state: "pending", contentRevision: content.revision, reason: "Current variant requires renderer line evidence." }
            : { state: "not-required" },
          contentRevision: content.revision,
        });
      }
    }
    const media = referencedFamilyMedia(resolvedTree);
    for (const asset of media) {
      if (decodedSources.has(asset.source) || typeof Image === "undefined") continue;
      const entry: { state: "pending" | "ready" | "blocked"; reason?: string } = { state: "pending" };
      decodedSources.set(asset.source, entry);
      void waitForImageSource(asset.source, asset.assetId ?? asset.nodeId, 15000, true).then((failure) => {
        if (disposed || decodedSources.get(asset.source) !== entry) return;
        entry.state = failure ? "blocked" : "ready";
        entry.reason = failure?.message;
        // Decode authority belongs to this source entry. Project only the
        // currently accepted variant; never rematerialize captured or current data.
        if (snapshot.family && snapshot.contentState && snapshot.selectedVariantId && snapshot.familyMaterialization) {
          publish(projectReadiness(
            snapshot.familyMaterialization,
            snapshot.contentState,
            snapshot.selectedVariantId,
            snapshot.workingPackage,
            snapshot.resolvedTree,
            referencedFamilyMedia(snapshot.resolvedTree),
          ));
        }
      });
    }
    return {
      familyMaterialization: result,
      effectivePackage,
      workingPackage,
      rendererPackage,
      resolvedTree,
      fields,
      ...projectReadiness(result, content, selectedVariantId, workingPackage, resolvedTree, media),
    };
  };
  const response = (
    coreResult: ReturnType<typeof mutateTemplateFieldContentV2>,
    stale = false,
  ): TemplateSessionV2MutationResult => ({
    accepted: coreResult.accepted,
    stale,
    contentRevision: snapshot.contentState?.revision ?? coreResult.contentRevision,
    warnings: coreResult.issues.filter((item) => item.severity === "warning"),
    blockingErrors: coreResult.issues.filter((item) => item.severity === "error"),
    renderValidation: coreResult.renderValidation,
    readiness: snapshot.readiness,
    coreResult,
  });
  const staleResult = (): TemplateSessionV2MutationResult => ({
    accepted: false,
    stale: true,
    contentRevision: snapshot.contentState?.revision ?? 0,
    warnings: [],
    blockingErrors: [],
    renderValidation: { state: "not-required" },
    readiness: snapshot.readiness,
  });
  const publishRuntimeOnly = () => {
    if (!snapshot.contentState) return snapshot;
    const contentRevision = snapshot.contentState.revision;
    const requirements = snapshot.familyMaterialization?.materialization?.pendingRenderValidation ?? [];
    const required = requirements.filter((item) => item.blocksExport);
    const invalid = required.some((item) => {
      const status = fieldRenderValidation.get(item.fieldId);
      return status?.state === "invalid" && status.contentRevision === contentRevision;
    });
    const pending = required.some((item) => {
      const status = fieldRenderValidation.get(item.fieldId);
      return !status || status.state === "not-required" || status.contentRevision !== contentRevision ||
        (status.state !== "valid" && status.state !== "invalid" && status.state !== "inactive");
    });
    const deterministicBlocked = snapshot.readiness.deterministic === "blocked";
    const otherBlocked = runtimeLoadState === "failed" || snapshot.readiness.assets === "blocked" || runtimeFonts === "blocked" || runtimeRenderer === "blocked";
    const otherPending = runtimeLoadState === "loading" || snapshot.readiness.assets === "pending" || runtimeFonts === "pending" || runtimeRenderer === "pending";
    return publish({
      fields: snapshot.fields.map((item) => ({
        ...item,
        renderValidation: fieldRenderValidation.get(item.descriptor.id) ?? (
          requirements.some((requirement) => requirement.fieldId === item.descriptor.id)
            ? { state: "pending" as const, contentRevision, reason: "Current variant requires renderer line evidence." }
            : item.renderValidation
        ),
      })),
      readiness: {
        ...snapshot.readiness,
        state: deterministicBlocked || otherBlocked || invalid ? "blocked" : otherPending || pending ? "pending" : "ready",
        exportReady: !deterministicBlocked && !otherBlocked && !otherPending && !invalid && !pending,
        renderValidation: invalid ? "blocked" : pending ? "pending" : required.length ? "ready" : "not-required",
        fonts: runtimeFonts,
        renderer: runtimeRenderer,
        reasons: [
          ...snapshot.readiness.reasons.filter((reason) =>
            !reason.startsWith("Rendered line validation") &&
            !reason.startsWith("Font readiness") &&
            !reason.startsWith("Renderer settlement")),
          ...(invalid ? ["Rendered line validation is invalid for the selected variant."] : []),
          ...(pending ? ["Rendered line validation is pending for the selected variant."] : []),
          ...(runtimeFonts === "pending" ? ["Font readiness is pending."] : []),
          ...(runtimeFonts === "blocked" ? ["Font readiness is blocked."] : []),
          ...(runtimeRenderer === "pending" ? ["Renderer settlement/readiness is pending."] : []),
          ...(runtimeRenderer === "blocked" ? ["Renderer settlement/readiness is blocked."] : []),
        ],
      },
    });
  };
  const dispatch = (
    command: TemplateFieldContentMutationV2,
    expectedControllerGeneration?: number,
  ): TemplateSessionV2MutationResult => {
    assertActive();
    if (expectedControllerGeneration !== undefined && expectedControllerGeneration !== controllerGeneration) {
      return staleResult();
    }
    if (!snapshot.family || !snapshot.contentState || !snapshot.selectedVariantId || !snapshot.effectivePackage) {
      throw new Error("Load a V2 Template Field Family before editing.");
    }
    // A clean package-scoped input lets the Core reducer validate the changed
    // value even when another variant rule currently invalidates shared state.
    const scratch = deepFreeze({
      ...createTemplateFieldContentStateV1(snapshot.effectivePackage),
      revision: snapshot.contentState.revision,
    });
    const result = mutateTemplateFieldContentV2(snapshot.effectivePackage, scratch, command);
    if (!result.accepted) return response(result);
    const values = cloneValue(snapshot.contentState.values) as Record<string, TemplateFieldContentEntryV1>;
    if (command.kind === "reset") delete values[command.fieldId];
    else if (result.state.values[command.fieldId]) values[command.fieldId] = cloneValue(result.state.values[command.fieldId]);
    const variantImagePlacements = command.kind === "reset"
      ? clearVariantImagePlacementsForField(snapshot.contentState, command.fieldId)
      : snapshot.contentState.variantImagePlacements;
    const contentState = deepFreeze({
      ...snapshot.contentState,
      revision: result.contentRevision,
      values,
      variantImagePlacements,
    });
    const sessionAssets = retainReferencedAssets(contentState, snapshot.sessionAssets);
    invalidateRuntime(snapshot.effectivePackage);
    const derived = derive(snapshot.family, contentState, snapshot.selectedVariantId, sessionAssets);
    publish({
      operationRevision: snapshot.operationRevision + 1,
      contentState,
      sessionAssets,
      ...derived,
    });
    return response(result);
  };
  const replaceImage = async (
    fieldId: string,
    source: TemplateSessionImageSourceV2,
    expectedControllerGeneration?: number,
  ): Promise<TemplateSessionV2MutationResult> => {
    assertActive();
    if (expectedControllerGeneration !== undefined && expectedControllerGeneration !== controllerGeneration) {
      return staleResult();
    }
    const effectivePackage = snapshot.effectivePackage;
    const contentBeforeRead = snapshot.contentState;
    const familyBeforeRead = snapshot.family;
    const selectedVariantBeforeRead = snapshot.selectedVariantId;
    const field = effectivePackage?.editableFields.find((candidate) => candidate.id === fieldId);
    if (!effectivePackage || !field || field.type !== "image" || !contentBeforeRead || !familyBeforeRead || !selectedVariantBeforeRead) {
      throw new Error(`Image field "${fieldId}" is unavailable.`);
    }
    if ((source.blob ? 1 : 0) + (source.dataUrl ? 1 : 0) !== 1) {
      throw new Error("Image replacement requires exactly one Blob or data URL source.");
    }
    const operationRevision = snapshot.operationRevision + 1;
    publish({ operationRevision });
    let asset: PackageImageAsset;
    let url: string | null = null;
    if (source.blob) {
      const mimeType = source.mimeType ?? source.blob.type;
      if (!mimeType.startsWith("image/")) throw new Error("Image replacement Blob must use an image MIME type.");
      const saved = await createSavedAssetRecord(source.blob);
      url = objectUrls.create(source.blob);
      asset = {
        id: source.assetId ?? `family-field-image:${saved.hash}`,
        type: "image",
        source: "stored",
        mimeType,
        hash: saved.hash,
        stableUrl: url,
        sizeBytes: saved.sizeBytes,
        width: source.width ?? 1,
        height: source.height ?? 1,
        deferred: false,
        nodeId: field.binding.nodeId,
      };
    } else {
      const mimeType = source.mimeType ?? source.dataUrl!.match(/^data:(image\/[A-Za-z0-9.+-]+)/i)?.[1];
      if (!mimeType?.startsWith("image/")) throw new Error("Image replacement data URL must contain an image MIME type.");
      asset = {
        id: source.assetId ?? `family-field-image:${crypto.randomUUID()}`,
        type: "image",
        source: "embedded",
        mimeType,
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
      if (url) objectUrls.revoke(url);
      throw error;
    }
    if (disposed || snapshot.operationRevision !== operationRevision) {
      if (url) objectUrls.revoke(url);
      return {
        accepted: false,
        stale: true,
        contentRevision: snapshot.contentState?.revision ?? 0,
        warnings: [],
        blockingErrors: [],
        renderValidation: { state: "not-required" },
        readiness: snapshot.readiness,
      };
    }
    const existing = snapshot.sessionAssets[asset.id];
    if (url && existing?.type === "image" && existing.hash === asset.hash &&
        existing.mimeType === asset.mimeType && existing.width === asset.width && existing.height === asset.height &&
        ownedUrls.get(asset.id) === existing.stableUrl) {
      objectUrls.revoke(url);
      url = null;
      asset = existing;
    }
    let sessionAssets = { ...snapshot.sessionAssets, [asset.id]: asset };
    const effective: TemplatePackageV2 = {
      ...effectivePackage,
      assets: { ...effectivePackage.assets, ...sessionAssets },
    };
    const scratch = deepFreeze({
      ...createTemplateFieldContentStateV1(effective),
      revision: contentBeforeRead.revision,
    });
    const result = mutateTemplateFieldContentV2(effective, scratch, {
      kind: "set-image-replacement",
      fieldId,
      assetId: asset.id,
      ...(source.placement ? { placement: source.placement } : {}),
    });
    if (!result.accepted) {
      if (url) objectUrls.revoke(url);
      return response(result);
    }
    if (ownedUrls.has(asset.id) && ownedUrls.get(asset.id) !== asset.stableUrl) revokeOwned(asset.id);
    if (url) { retainUrl(url); ownedUrls.set(asset.id, url); }
    const values = cloneValue(contentBeforeRead.values) as Record<string, TemplateFieldContentEntryV1>;
    values[fieldId] = cloneValue(result.state.values[fieldId]);
    const contentState = deepFreeze({
      ...contentBeforeRead,
      revision: result.contentRevision,
      values,
      // Crop coordinates belong to the replaced asset. Never carry them to a
      // new shared asset, even when the next asset happens to share dimensions.
      variantImagePlacements: clearVariantImagePlacementsForField(contentBeforeRead, fieldId),
    });
    sessionAssets = retainReferencedAssets(contentState, sessionAssets);
    invalidateRuntime(effectivePackage);
    const derived = derive(familyBeforeRead, contentState, selectedVariantBeforeRead, sessionAssets);
    publish({ contentState, sessionAssets, ...derived });
    return response(result);
  };
  const setVariantPlacement = (
    fieldId: string,
    placement: ImageReplacementPlacementV1,
    expectedControllerGeneration?: number,
  ): TemplateSessionV2MutationResult => {
    assertActive();
    if (expectedControllerGeneration !== undefined && expectedControllerGeneration !== controllerGeneration) {
      return staleResult();
    }
    if (!snapshot.family || !snapshot.contentState || !snapshot.selectedVariantId || !snapshot.effectivePackage) {
      throw new Error("Load a V2 Template Field Family before editing.");
    }
    const sharedValue = snapshot.contentState.values[fieldId]?.value;
    const field = snapshot.effectivePackage.editableFields.find((candidate) => candidate.id === fieldId);
    if (!field || field.type !== "image") throw new Error(`Image field "${fieldId}" is unavailable.`);
    if (!sharedValue || typeof sharedValue !== "object" || !("assetId" in sharedValue)) {
      throw new Error("Replace the imported image before setting a variant placement.");
    }
    const scratch = deepFreeze({
      ...createTemplateFieldContentStateV1(snapshot.effectivePackage),
      revision: snapshot.contentState.revision,
    });
    const result = mutateTemplateFieldContentV2(snapshot.effectivePackage, scratch, {
      kind: "set-image-replacement",
      fieldId,
      assetId: sharedValue.assetId,
      placement,
    });
    if (!result.accepted) return response(result);
    const canonical = result.state.values[fieldId]?.value;
    if (!canonical || typeof canonical !== "object" || !("placement" in canonical)) {
      throw new Error("Core did not return a canonical Image placement.");
    }
    const variantImagePlacements = cloneValue(snapshot.contentState.variantImagePlacements) as Record<
      string,
      Record<string, ImageReplacementPlacementV1>
    >;
    variantImagePlacements[snapshot.selectedVariantId] = {
      ...(variantImagePlacements[snapshot.selectedVariantId] ?? {}),
      [fieldId]: cloneValue(canonical.placement),
    };
    const contentState = deepFreeze({
      ...snapshot.contentState,
      revision: result.contentRevision,
      variantImagePlacements,
    });
    invalidateRuntime(snapshot.effectivePackage);
    const derived = derive(snapshot.family, contentState, snapshot.selectedVariantId, snapshot.sessionAssets);
    publish({
      operationRevision: snapshot.operationRevision + 1,
      contentState,
      ...derived,
    });
    return response(result);
  };
  const resetVariantPlacement = (
    fieldId: string,
    expectedControllerGeneration?: number,
  ): TemplateSessionV2MutationResult => {
    assertActive();
    if (expectedControllerGeneration !== undefined && expectedControllerGeneration !== controllerGeneration) {
      return staleResult();
    }
    if (!snapshot.family || !snapshot.contentState || !snapshot.selectedVariantId || !snapshot.effectivePackage) {
      throw new Error("Load a V2 Template Field Family before editing.");
    }
    const field = snapshot.effectivePackage.editableFields.find((candidate) => candidate.id === fieldId);
    if (!field || field.type !== "image") throw new Error(`Image field "${fieldId}" is unavailable.`);
    const nextRevision = snapshot.contentState.revision + 1;
    if (!Number.isSafeInteger(nextRevision)) throw new Error("Content revision cannot advance safely.");
    const variantImagePlacements = cloneValue(snapshot.contentState.variantImagePlacements) as Record<
      string,
      Record<string, ImageReplacementPlacementV1>
    >;
    const selected = variantImagePlacements[snapshot.selectedVariantId];
    if (selected) {
      delete selected[fieldId];
      if (Object.keys(selected).length === 0) delete variantImagePlacements[snapshot.selectedVariantId];
    }
    const contentState = deepFreeze({
      ...snapshot.contentState,
      revision: nextRevision,
      variantImagePlacements,
    });
    invalidateRuntime(snapshot.effectivePackage);
    const derived = derive(snapshot.family, contentState, snapshot.selectedVariantId, snapshot.sessionAssets);
    publish({
      operationRevision: snapshot.operationRevision + 1,
      contentState,
      ...derived,
    });
    return {
      accepted: true,
      stale: false,
      contentRevision: nextRevision,
      warnings: [],
      blockingErrors: [],
      renderValidation: { state: "not-required" },
      readiness: snapshot.readiness,
    };
  };
  const controller = (state: TemplateSessionFieldStateV2): TemplateFieldFamilyControllerV3 => {
    const expectedControllerGeneration = controllerGeneration;
    const common = {
      ...state,
      id: state.descriptor.id,
      type: state.descriptor.type,
      ...(state.descriptor.controlRole ? { controlRole: state.descriptor.controlRole } : {}),
      configuration: state.descriptor.configuration,
      reset: () => dispatch({ kind: "reset", fieldId: state.descriptor.id }, expectedControllerGeneration),
    };
    if (state.descriptor.type === "image") {
      return {
        ...common,
        replaceImage: (source: TemplateSessionImageSourceV2) => replaceImage(state.descriptor.id, source, expectedControllerGeneration),
        setPlacement: (placement: ImageReplacementPlacementV1) => {
          const value = snapshot.contentState?.values[state.descriptor.id]?.value;
          if (!value || typeof value !== "object" || !("assetId" in value)) {
            throw new Error("Replace the imported image before setting placement.");
          }
          return dispatch({ kind: "set-image-replacement", fieldId: state.descriptor.id, assetId: value.assetId, placement }, expectedControllerGeneration);
        },
        setVariantPlacement: (placement: ImageReplacementPlacementV1) =>
          setVariantPlacement(state.descriptor.id, placement, expectedControllerGeneration),
        resetVariantPlacement: () =>
          resetVariantPlacement(state.descriptor.id, expectedControllerGeneration),
      } as TemplateFieldFamilyImageControllerV3;
    }
    if (state.descriptor.type === "boolean") {
      return { ...common, setValue: (value: boolean) => dispatch({ kind: "set-value", fieldId: state.descriptor.id, value }, expectedControllerGeneration) } as TemplateFieldFamilyControllerV3;
    }
    return {
      ...common,
      setValue: (value: unknown) => dispatch({ kind: "set-value", fieldId: state.descriptor.id, value }, expectedControllerGeneration),
      selectChoice: (choiceId: string) => dispatch({ kind: "select-choice", fieldId: state.descriptor.id, choiceId }, expectedControllerGeneration),
    } as TemplateFieldFamilyControllerV3;
  };

  return {
    getSnapshot: () => snapshot,
    getFieldControllers: () => {
      if (!snapshot.effectivePackage || !snapshot.contentState) return [];
      const activeIds = activeTemplateFieldIdsV2(
        snapshot.effectivePackage,
        familyPackageState(snapshot.effectivePackage, snapshot.contentState),
      );
      return snapshot.fields
        .filter((field) => activeIds.has(field.descriptor.id))
        .map(controller);
    },
    subscribe(listener) {
      assertActive();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load(family, loadOptions = {}) {
      assertActive();
      recordGeneration += 1;
      runtimeLoadState = "active";
      const selectedVariantId = loadOptions.selectedVariantId ?? family.variants[0]?.id;
      if (!selectedVariantId) throw new Error("A V2 Template Field Family requires at least one variant.");
      const contentState = loadOptions.contentState
        ? normalizeFamilyContentForRuntime(loadOptions.contentState)
        : createTemplateFieldFamilyContentStateV3(family);
      const sessionAssets = cloneValue(loadOptions.sessionAssets ?? {});
      const retainedSources = new Set(family.variants.flatMap((variant) => Object.values(variant.packageValue.assets).flatMap((asset) => asset.stableUrl && familyAssetUrlLeases.has(asset.stableUrl) ? [asset.stableUrl] : [])));
      const retainedReplacements = Object.values(sessionAssets).filter((asset) => asset.stableUrl && familyAssetUrlLeases.has(asset.stableUrl));
      const retained = new Set([...retainedSources, ...retainedReplacements.map((asset) => asset.stableUrl!)]);
      // Hold new ownership before releasing the previous accepted snapshot.
      for (const url of retained) familyAssetUrlLeases.get(url)!.count += 1;
      controllerGeneration += 1;
      revokeOwned();
      revokeSources();
      for (const url of retained) leasedUrls.add(url);
      for (const url of retainedSources) sourceUrls.add(url);
      for (const asset of retainedReplacements) ownedUrls.set(asset.id, asset.stableUrl!);
      const selectedPackage = family.variants.find((variant) => variant.id === selectedVariantId)?.packageValue;
      invalidateRuntime(selectedPackage);
      const derived = derive(family, contentState, selectedVariantId, sessionAssets);
      publish({
        operationRevision: snapshot.operationRevision + 1,
        savedFamilyId: null,
        family: deepFreeze(cloneValue(family)),
        contentState: deepFreeze(cloneValue(contentState)),
        selectedVariantId,
        sessionAssets,
        ...derived,
      });
      return snapshot;
    },
    configure(update) {
      assertActive();
      if (!snapshot.family || !snapshot.contentState || !snapshot.selectedVariantId) throw new Error("Load a family before configuring fields.");
      const family = cloneValue(snapshot.family);
      const fields = [...family.fields];
      const seen = new Set<string>();
      for (const field of update.fields ?? []) {
        const index = fields.findIndex((entry) => entry.id === field.id);
        if (seen.has(field.id) || index < 0 || fields[index].type !== field.type) throw new Error("Configuration requires unique existing field IDs and unchanged types.");
        seen.add(field.id);
        fields[index] = cloneValue({ id: field.id, type: field.type, label: field.label, controlRole: field.controlRole, configuration: field.configuration }) as TemplateFieldFamilyFieldV2;
      }
      family.fields = fields;
      if (update.editableFieldOrder) family.editableFieldOrder = [...update.editableFieldOrder];
      const variants = [...family.variants];
      const seenVariants = new Set<string>();
      for (const variant of update.variants ?? []) {
        const index = variants.findIndex((entry) => entry.id === variant.id);
        if (index < 0 || seenVariants.has(variant.id)) throw new Error("Configuration requires unique existing variant IDs.");
        seenVariants.add(variant.id);
        variants[index] = { ...variants[index], fieldOverrides: cloneValue(variant.fieldOverrides), editableFieldOrder: variant.editableFieldOrder && [...variant.editableFieldOrder] };
      }
      family.variants = variants;
      for (const variant of variants) {
        const result = resolveTemplateFieldFamilyVariantV2(family, variant.id);
        if (!result.valid) throw new Error(result.issues.map((issue) => issue.message).join("\n"));
      }
      const effective = resolveTemplateFieldFamilyVariantV2(family, snapshot.selectedVariantId).packageValue!;
      const values = cloneValue(snapshot.contentState.values) as Record<string, TemplateFieldContentEntryV1>;
      const commonChoiceChanges = new Set<string>();
      for (const field of update.fields ?? []) {
        const previous = snapshot.family.fields.find((entry) => entry.id === field.id)!;
        if (choiceValuesKey(previous) === choiceValuesKey(field)) continue;
        commonChoiceChanges.add(field.id);
        if (!values[field.id]?.selectedChoiceId) continue;
        const source = family.variants.find((variant) => variant.packageValue.editableFields.some((entry) => entry.id === field.id))!.packageValue;
        // Core's existing reconciliation owns option removal and canonical
        // normalization. Source bindings are only validation inputs here;
        // common choices do not depend on the selected variant's presence.
        const input = cloneValue(source);
        input.editableFields = input.editableFields.map((entry) => entry.id === field.id
          ? { ...entry, configuration: cloneValue(field.configuration) } as EditableFieldDefinitionV2
          : entry);
        const reconciled = reconcileTemplateFieldConfigurationV2(input, {
          ...createTemplateFieldContentStateV1(input), values: { [field.id]: values[field.id] },
        });
        values[field.id] = reconciled.values[field.id];
      }
      if (update.variants?.some((variant) => variant.id === snapshot.selectedVariantId)) {
        const previousFields = new Map(snapshot.effectivePackage?.editableFields.map(field => [field.id, field]));
        const variantChoiceChanges = new Set(effective.editableFields
          .filter(field => choiceValuesKey(previousFields.get(field.id)) !== choiceValuesKey(field))
          .map(field => field.id));
        if (variantChoiceChanges.size) {
          const reconciled = reconcileTemplateFieldConfigurationV2(effective, {
            ...createTemplateFieldContentStateV1(effective),
            values: Object.fromEntries(Object.entries(values).filter(([id]) =>
              !commonChoiceChanges.has(id) && variantChoiceChanges.has(id))),
          });
          Object.assign(values, reconciled.values);
        }
      }
      const changed = JSON.stringify(values) !== JSON.stringify(snapshot.contentState.values);
      if (changed && !Number.isSafeInteger(snapshot.contentState.revision + 1)) throw new Error("Content revision is exhausted.");
      const contentState = changed
        ? deepFreeze({ ...snapshot.contentState, revision: snapshot.contentState.revision + 1, values })
        : snapshot.contentState;
      controllerGeneration += 1;
      invalidateRuntime(effective);
      const derived = derive(family, contentState, snapshot.selectedVariantId, snapshot.sessionAssets);
      publish({ operationRevision: snapshot.operationRevision + 1, family: deepFreeze(family), contentState, ...derived });
      return snapshot;
    },
    async loadSaved(id) {
      assertActive();
      recordGeneration += 1;
      const operationRevision = snapshot.operationRevision + 1;
      invalidateRuntime(snapshot.effectivePackage);
      runtimeLoadState = "loading";
      publish({ operationRevision, readiness: { ...snapshot.readiness, state: "pending", exportReady: false, renderer: "pending" } });
      let record: Awaited<ReturnType<typeof repository.getTemplateFieldFamilyV3>>;
      try { record = await repository.getTemplateFieldFamilyV3(id); }
      catch (cause) {
        if (!disposed && snapshot.operationRevision === operationRevision) {
          runtimeLoadState = "failed";
          publish({ status: "blocked", error: { code: "family-assets-unavailable", message: cause instanceof Error ? cause.message : "Saved Family could not be read." }, readiness: { ...snapshot.readiness, state: "blocked", exportReady: false, renderer: "blocked" } });
        }
        throw cause;
      }
      if (disposed || snapshot.operationRevision !== operationRevision) return snapshot;
      if (!record) {
        runtimeLoadState = "failed";
        publish({ readiness: { ...snapshot.readiness, state: "blocked", exportReady: false, renderer: "blocked" }, status: "blocked", error: { code: "family-not-found", message: `Saved V2 Template Field Family "${id}" was not found.` } });
        return snapshot;
      }
      const family = cloneValue(record.family);
      const sessionAssets = cloneValue(record.sessionAssets);
      const replacementUrls = new Map<string, string>();
      const nextSourceUrls = new Set<string>();
      const stale = () => disposed || snapshot.operationRevision !== operationRevision;
      const hydration = createStoredAssetHydration({ getManagedAsset: hash => repository.getManagedAsset(hash), objectUrls, isStale: stale });
      try {
        const maps = [...family.variants.map((variant) => ({ assets: variant.packageValue.assets, source: true })), { assets: sessionAssets, source: false }];
        for (const carrier of maps) for (const asset of Object.values(carrier.assets)) {
          if (!asset.hash || asset.dataUrl || asset.data || asset.svgString) continue;
          // Persisted blob URLs are never valid authority in a new session.
          if (asset.stableUrl?.startsWith("blob:")) delete asset.stableUrl;
          let url = hydration.getCachedUrl(asset.hash);
          if (!url) {
            const result = await hydration.readUrl(asset.hash);
            if (result.status === "stale") return snapshot;
            if (result.status === "missing") continue; // Existing readiness reports the missing source.
            url = result.url;
          }
          asset.stableUrl = url;
          asset.source = "stored";
          asset.storageKey = `sha256:${asset.hash}`;
          if (carrier.source) nextSourceUrls.add(url);
          else replacementUrls.set(asset.id, url);
        }
      } catch (cause) {
        hydration.release();
        if (!stale()) { runtimeLoadState = "failed"; publish({ status: "blocked", error: { code: "family-assets-unavailable", message: cause instanceof Error ? cause.message : "Saved Family assets could not be read." }, readiness: { ...snapshot.readiness, assets: "blocked", state: "blocked", exportReady: false } }); }
        return snapshot;
      }
      if (stale()) { hydration.release(); return snapshot; }
      revokeOwned();
      revokeSources();
      hydration.getCreatedUrls().forEach((url) => retainUrl(url));
      replacementUrls.forEach((url, assetId) => ownedUrls.set(assetId, url));
      nextSourceUrls.forEach((url) => sourceUrls.add(url));
      hydration.transfer();
      controllerGeneration += 1;
      runtimeLoadState = "active";
      invalidateRuntime(family.variants.find((variant) => variant.id === record.selectedVariantId)?.packageValue);
      const derived = derive(family, record.contentState, record.selectedVariantId, sessionAssets);
      publish({
        savedFamilyId: record.id,
        family: deepFreeze(family),
        contentState: deepFreeze(cloneValue(record.contentState)),
        selectedVariantId: record.selectedVariantId,
        sessionAssets,
        ...derived,
      });
      return snapshot;
    },
    selectVariant(variantId) {
      assertActive();
      if (!snapshot.family || !snapshot.contentState) throw new Error("Load a family before selecting a variant.");
      if (!snapshot.family.variants.some((variant) => variant.id === variantId)) {
        throw new Error(`Template Field Family variant "${variantId}" does not exist.`);
      }
      controllerGeneration += 1;
      invalidateRuntime(snapshot.family.variants.find((variant) => variant.id === variantId)?.packageValue);
      const currentDerived = derive(snapshot.family, snapshot.contentState, variantId, snapshot.sessionAssets);
      publish({ operationRevision: snapshot.operationRevision + 1, selectedVariantId: variantId, ...currentDerived });
      return snapshot;
    },
    selectOption(groupId, optionId) {
      assertActive();
      if (!snapshot.family || !snapshot.contentState || !snapshot.selectedVariantId) {
        throw new Error("Load a family before selecting an option.");
      }
      const group = snapshot.family.variantGroups?.find((candidate) => candidate.id === groupId);
      if (!group || !group.options.some((option) => option.id === optionId)) {
        throw new Error("That Family selection option is unavailable.");
      }
      const current = getTemplateFieldFamilyVariantSelectionV2(snapshot.family, snapshot.selectedVariantId);
      const resolution = resolveTemplateFieldFamilySelectionV2(snapshot.family, {
        ...current,
        groupSelections: { ...current.groupSelections, [groupId]: optionId },
      });
      if (resolution.status !== "resolved") {
        throw new Error(resolution.status === "ambiguous"
          ? "That Family selection matches more than one variant."
          : resolution.status === "incomplete"
            ? "Choose a value for every Family selection property."
            : "That Family selection is unavailable.");
      }
      if (resolution.variantId === snapshot.selectedVariantId) return snapshot;
      controllerGeneration += 1;
      invalidateRuntime(snapshot.family.variants.find((variant) => variant.id === resolution.variantId)?.packageValue);
      const derived = derive(snapshot.family, snapshot.contentState, resolution.variantId, snapshot.sessionAssets);
      publish({ operationRevision: snapshot.operationRevision + 1, selectedVariantId: resolution.variantId, ...derived });
      return snapshot;
    },
    publishFieldLayoutEvidence(evidence) {
      assertActive();
      const field = snapshot.effectivePackage?.editableFields.find((candidate) => candidate.id === evidence.fieldId);
      if (
        runtimeLoadState !== "active" || !field || field.type !== "textarea" || !snapshot.family || !snapshot.contentState || !snapshot.selectedVariantId ||
        evidence.packageIdentity !== snapshot.effectivePackage?.packageId ||
        evidence.contentRevision !== snapshot.contentState.revision ||
        evidence.materializationRevision !== snapshot.familyMaterialization?.materialization?.materializationRevision ||
        evidence.settlementRevision !== currentSettlementRevision ||
        evidence.fontRevision !== currentFontRevision ||
        evidence.publicationGeneration !== currentPublicationGeneration
      ) return false;
      const previousValidation = fieldRenderValidation.get(field.id);
      fieldRenderValidation.set(field.id, evaluateFieldRenderEvidence(field, evidence));
      if (JSON.stringify(previousValidation) === JSON.stringify(fieldRenderValidation.get(field.id))) return true;
      publishRuntimeOnly();
      return true;
    },
    publishRuntimeReadiness(evidence) {
      assertActive();
      if (
        runtimeLoadState !== "active" || !snapshot.family || !snapshot.contentState || !snapshot.selectedVariantId ||
        evidence.contentRevision !== snapshot.contentState.revision ||
        evidence.materializationRevision !== snapshot.familyMaterialization?.materialization?.materializationRevision ||
        !Number.isSafeInteger(evidence.publicationGeneration) ||
        evidence.publicationGeneration < publicationLeaseBase ||
        evidence.publicationGeneration < minimumPublicationGeneration ||
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
      publishRuntimeOnly();
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
      publishRuntimeOnly();
      return publicationLeaseBase;
    },
    planVariantReimport(source) {
      assertActive();
      if (!snapshot.effectivePackage || !snapshot.contentState) {
        throw new Error("Load and select a family variant before planning reimport.");
      }
      return planTemplateReimportV2(
        snapshot.effectivePackage,
        snapshot.familyMaterialization?.packageContentState ??
          familyPackageState(snapshot.effectivePackage, snapshot.contentState),
        source,
      );
    },
    applyVariantReimport(plan, applyOptions) {
      assertActive();
      if (!snapshot.family || !snapshot.contentState || !snapshot.selectedVariantId || !snapshot.effectivePackage) {
        throw new Error("Load and select a family variant before applying reimport.");
      }
      const applied = applyTemplateReimportV2(
        snapshot.effectivePackage,
        snapshot.familyMaterialization?.packageContentState ??
          familyPackageState(snapshot.effectivePackage, snapshot.contentState),
        plan,
        { ...applyOptions, sessionAssets: snapshot.sessionAssets },
      );
      const family = cloneValue(snapshot.family);
      const variant = family.variants.find((candidate) => candidate.id === snapshot.selectedVariantId);
      if (!variant) throw new Error("The selected family variant changed after reimport planning.");
      variant.packageValue = applied.packageValue;
      const commonById = new Map(family.fields.map((field) => [field.id, field]));
      for (const field of applied.packageValue.editableFields) {
        if (!commonById.has(field.id)) {
          family.fields = [...family.fields, createTemplateFieldFamilyFieldV2(field)];
        }
      }
      const usedFieldIds = new Set(family.variants.flatMap((item) =>
        item.packageValue.editableFields.map((field) => field.id)
      ));
      family.fields = family.fields.filter((field) => usedFieldIds.has(field.id));
      family.editableFieldOrder = reconcileEditableFieldOrderV2(
        family.editableFieldOrder,
        family.fields,
      ).order;
      const values = cloneValue(snapshot.contentState.values) as Record<string, TemplateFieldContentEntryV1>;
      for (const fieldId of plan.retainedFieldIds) {
        const retainedField = applied.packageValue.editableFields.find(
          (field) => field.id === fieldId,
        );
        // The reimport input contains the selected variant's effective Image
        // placement. Never leak that overlay back into the shared Image value.
        const entry = retainedField?.type === "image"
          ? snapshot.contentState.values[fieldId]
          : applied.contentState.values[fieldId];
        if (entry) values[fieldId] = cloneValue(entry);
      }
      for (const fieldId of plan.removedFieldIds) {
        if (!usedFieldIds.has(fieldId)) delete values[fieldId];
      }
      const variantImagePlacements = cloneValue(
        snapshot.contentState.variantImagePlacements,
      ) as Record<string, Record<string, ImageReplacementPlacementV1>>;
      for (const fieldId of plan.removedFieldIds) {
        delete variantImagePlacements[snapshot.selectedVariantId]?.[fieldId];
        if (Object.keys(variantImagePlacements[snapshot.selectedVariantId] ?? {}).length === 0) {
          delete variantImagePlacements[snapshot.selectedVariantId];
        }
        if (!usedFieldIds.has(fieldId)) {
          for (const [variantId, placements] of Object.entries(variantImagePlacements)) {
            delete placements[fieldId];
            if (Object.keys(placements).length === 0) delete variantImagePlacements[variantId];
          }
        }
      }
      const contentState = deepFreeze({
        ...snapshot.contentState,
        revision: applied.contentState.revision,
        values,
        variantImagePlacements,
      });
      const sessionAssets = retainReferencedAssets(contentState, snapshot.sessionAssets);
      controllerGeneration += 1;
      invalidateRuntime(applied.packageValue);
      const currentDerived = derive(family, contentState, snapshot.selectedVariantId, sessionAssets);
      publish({
        operationRevision: snapshot.operationRevision + 1,
        family: deepFreeze(family),
        contentState,
        sessionAssets,
        ...currentDerived,
      });
      return { snapshot, archivedContent: applied.archivedContent };
    },
    async save(saveOptions = {}) {
      assertActive();
      if (!snapshot.family || !snapshot.contentState || !snapshot.selectedVariantId) throw new Error("Load a family before saving.");
      const generation = recordGeneration;
      const record = createSavedTemplateFieldFamilyV3Record({
        family: snapshot.family,
        contentState: snapshot.contentState,
        selectedVariantId: snapshot.selectedVariantId,
        sessionAssets: snapshot.sessionAssets,
        name: saveOptions.name,
        description: saveOptions.description,
      });
      const releaseSaveUrls = retainSessionAssetUrls(leasedUrls);
      const write = saveQueue.enqueue(() => {
        assertActive();
        if (generation !== recordGeneration) throw new Error("Save cancelled because another family was loaded or the session was reset.");
        return repository.saveTemplateFieldFamilyV3(record);
      }, releaseSaveUrls);
      const saved = await write;
      if (!disposed && generation === recordGeneration && snapshot.family?.id === saved.id) publish({ savedFamilyId: saved.id });
      return saved;
    },
    reset() {
      assertActive();
      runtimeLoadState = "active";
      recordGeneration += 1;
      revokeOwned();
      revokeSources();
      decodedSources.clear();
      controllerGeneration += 1;
      invalidateRuntime(null);
      const empty = emptySnapshot();
      publish({
        status: empty.status,
        operationRevision: snapshot.operationRevision + 1,
        savedFamilyId: null,
        family: null,
        contentState: null,
        selectedVariantId: null,
        sessionAssets: {},
        familyMaterialization: null,
        effectivePackage: null,
        workingPackage: null,
        rendererPackage: null,
        resolvedTree: null,
        fields: [],
        readiness: empty.readiness,
        error: null,
      });
      return snapshot;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controllerGeneration += 1;
      revokeOwned();
      revokeSources();
      listeners.clear();
      snapshot = deepFreeze({ ...snapshot, status: "disposed", revision: snapshot.revision + 1, operationRevision: snapshot.operationRevision + 1 });
    },
  };
}

/** Helper for authoring a common family field from an imported V2 definition. */
export function createTemplateFieldFamilyFieldV2(
  field: EditableFieldDefinitionV2,
): TemplateFieldFamilyFieldV2 {
  const { binding: _binding, defaultValue: _defaultValue, provenance: _provenance, ...common } = cloneValue(field);
  return common as TemplateFieldFamilyFieldV2;
}

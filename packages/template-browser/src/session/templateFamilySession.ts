import type { PackageImageAsset, TemplatePackageV1 } from "@sleinity/template-core";
import {
  TEMPLATE_FAMILY_CONTENT_SCHEMA_VERSION,
  materializeTemplateFamilyVariant,
  updateTemplateFamilyContentField,
  validateTemplateFamily,
  type TemplateFamilyContentStateV1,
  type TemplateFamilyContentValueV1,
  type TemplateFamilyImageValueV1,
  type TemplateFamilyMaterializationV1,
  type TemplateFamilyValidationReportV1,
  type TemplateFamilyV1,
  type TemplateFamilyVariantFieldBindingV1,
} from "@sleinity/template-core/family";
import {
  createLegacyTemplateFamilyRecord,
  createSavedTemplateFamilyDraftRecord,
  createSavedTemplateFamilyRecord,
  getTemplateFamilyRepository,
  getTemplateRepository,
} from "../persistence/templateRepository";
import type {
  SavedTemplateFamilyDraftRecord,
  SavedTemplateFamilyRecord,
  TemplateFamilyRepository,
  TemplateRepository,
} from "../persistence/types";
import {
  applyTemplateFamilyVariantReimport,
  planTemplateFamilyVariantReimport,
  type TemplateFamilyReimportPlanV1,
} from "../import/templateFamilyReimport";
import {
  createTemplateSession,
  type TemplateSessionImageReplacementInput,
  type TemplateSessionOptions,
  type TemplateSessionV1,
} from "./templateSession";

export const TEMPLATE_FAMILY_SESSION_SCHEMA_VERSION =
  "template-family-session-v1" as const;

export type TemplateFamilySessionStatus =
  | "idle"
  | "ready"
  | "blocked"
  | "disposed";

export interface TemplateFamilySessionErrorV1 {
  code:
    | "family-invalid"
    | "variant-not-found"
    | "materialization-failed"
    | "family-not-found"
    | "family-load-failed"
    | "draft-not-found";
  message: string;
}

export interface TemplateFamilySessionSnapshotV1 {
  schemaVersion: typeof TEMPLATE_FAMILY_SESSION_SCHEMA_VERSION;
  status: TemplateFamilySessionStatus;
  revision: number;
  operationRevision: number;
  familyRevision: number;
  contentRevision: number;
  selectionRevision: number;
  renderSessionRevision: number;
  savedFamilyId: string | null;
  savedDraftId: string | null;
  family: TemplateFamilyV1 | null;
  content: TemplateFamilyContentStateV1 | null;
  selectedVariantId: string | null;
  validation: TemplateFamilyValidationReportV1 | null;
  materialization: TemplateFamilyMaterializationV1 | null;
  sharedImageAssets: TemplatePackageV1["assets"];
  error: TemplateFamilySessionErrorV1 | null;
}

export interface TemplateFamilySessionLoadInputV1 {
  family: TemplateFamilyV1;
  content?: TemplateFamilyContentStateV1;
  selectedVariantId?: string;
  sharedImageAssets?: TemplatePackageV1["assets"];
  savedFamilyId?: string;
  savedDraftId?: string;
  expectedOperationRevision?: number;
}

export interface TemplateFamilySessionMutationResultV1 {
  applied: boolean;
  stale: boolean;
  snapshot: TemplateFamilySessionSnapshotV1;
}

export interface TemplateFamilySessionSaveOptionsV1 {
  name?: string;
  description?: string;
}

export interface TemplateFamilySessionOptionsV1
  extends Omit<TemplateSessionOptions, "repository"> {
  renderSession?: TemplateSessionV1;
  familyRepository?: TemplateFamilyRepository;
  templateRepository?: TemplateRepository;
}

export interface TemplateFamilySessionV1 {
  readonly renderSession: TemplateSessionV1;
  getSnapshot(): TemplateFamilySessionSnapshotV1;
  subscribe(listener: () => void): () => void;
  load(input: TemplateFamilySessionLoadInputV1): TemplateFamilySessionMutationResultV1;
  loadSavedFamily(id: string, draftId?: string): Promise<TemplateFamilySessionSnapshotV1>;
  loadLegacyTemplate(id: string, draftId?: string): Promise<TemplateFamilySessionSnapshotV1>;
  selectVariant(
    variantId: string,
    expectedOperationRevision?: number,
  ): TemplateFamilySessionMutationResultV1;
  setField(
    fieldId: string,
    value: TemplateFamilyContentValueV1,
    expectedOperationRevision?: number,
  ): TemplateFamilySessionMutationResultV1;
  replaceImage(
    fieldId: string,
    input: TemplateSessionImageReplacementInput,
    expectedOperationRevision?: number,
  ): TemplateFamilySessionMutationResultV1;
  resetField(
    fieldId: string,
    expectedOperationRevision?: number,
  ): TemplateFamilySessionMutationResultV1;
  setImageReplacementMode(
    fieldId: string,
    mode: "replacement-fill" | "replacement-fit",
    expectedOperationRevision?: number,
  ): TemplateFamilySessionMutationResultV1;
  replaceFamily(
    family: TemplateFamilyV1,
    expectedOperationRevision?: number,
  ): TemplateFamilySessionMutationResultV1;
  planVariantReimport(
    variantId: string,
    nextPackage: TemplatePackageV1,
  ): TemplateFamilyReimportPlanV1;
  applyVariantReimport(
    plan: TemplateFamilyReimportPlanV1,
    resolvedBindings?: readonly TemplateFamilyVariantFieldBindingV1[],
    expectedOperationRevision?: number,
  ): TemplateFamilySessionMutationResultV1;
  save(options?: TemplateFamilySessionSaveOptionsV1): Promise<SavedTemplateFamilyRecord>;
  saveDraft(name?: string): Promise<SavedTemplateFamilyDraftRecord>;
  reset(): TemplateFamilySessionSnapshotV1;
  dispose(): void;
}

function emptySnapshot(): TemplateFamilySessionSnapshotV1 {
  return {
    schemaVersion: TEMPLATE_FAMILY_SESSION_SCHEMA_VERSION,
    status: "idle",
    revision: 0,
    operationRevision: 0,
    familyRevision: 0,
    contentRevision: 0,
    selectionRevision: 0,
    renderSessionRevision: 0,
    savedFamilyId: null,
    savedDraftId: null,
    family: null,
    content: null,
    selectedVariantId: null,
    validation: null,
    materialization: null,
    sharedImageAssets: {},
    error: null,
  };
}

function defaultContent(family: TemplateFamilyV1): TemplateFamilyContentStateV1 {
  return {
    schemaVersion: TEMPLATE_FAMILY_CONTENT_SCHEMA_VERSION,
    familyId: family.id,
    revision: 0,
    values: Object.fromEntries(
      family.fields.map((field) => [field.id, structuredClone(field.defaultValue)]),
    ),
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function freezeFamily<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(freezeFamily);
  }
  return value;
}

function createSharedImageAsset(
  family: TemplateFamilyV1,
  fieldId: string,
  input: TemplateSessionImageReplacementInput,
): PackageImageAsset {
  const field = family.fields.find((candidate) => candidate.id === fieldId);
  const target = family.variants[0]?.bindings
    .find((binding) => binding.familyFieldId === fieldId)?.targets[0];
  if (!field || field.type !== "image" || !target) {
    throw new Error(`Shared image field "${fieldId}" was not found.`);
  }
  const id = input.assetId ?? `family-asset:${crypto.randomUUID()}`;
  return {
    id,
    type: "image",
    source: "embedded",
    deferred: false,
    nodeId: target.nodeId,
    mimeType: input.mimeType,
    dataUrl: input.dataUrl,
    width: input.width ?? 1,
    height: input.height ?? 1,
  };
}

export function createTemplateFamilySession(
  options: TemplateFamilySessionOptionsV1 = {},
): TemplateFamilySessionV1 {
  const familyRepository = options.familyRepository ?? getTemplateFamilyRepository();
  const templateRepository = options.templateRepository ?? getTemplateRepository();
  const renderSession = options.renderSession ?? createTemplateSession({
    assetStorage: options.assetStorage,
    fontRegistry: options.fontRegistry,
    repository: templateRepository,
  });
  let snapshot = emptySnapshot();
  let disposed = false;
  let suppressRenderNotification = false;
  const listeners = new Set<() => void>();

  const assertActive = () => {
    if (disposed) throw new Error("TemplateFamilySession has been disposed.");
  };
  const publish = (
    patch: Partial<Omit<TemplateFamilySessionSnapshotV1, "schemaVersion" | "revision">>,
  ) => {
    snapshot = {
      ...snapshot,
      ...patch,
      schemaVersion: TEMPLATE_FAMILY_SESSION_SCHEMA_VERSION,
      revision: snapshot.revision + 1,
    };
    listeners.forEach((listener) => listener());
    return snapshot;
  };
  const renderUnsubscribe = renderSession.subscribe(() => {
    if (disposed || suppressRenderNotification) return;
    publish({ renderSessionRevision: renderSession.getSnapshot().revision });
  });
  const staleResult = (): TemplateFamilySessionMutationResultV1 => ({
    applied: false,
    stale: true,
    snapshot,
  });
  const render = (input: {
    family: TemplateFamilyV1;
    content: TemplateFamilyContentStateV1;
    selectedVariantId: string;
    sharedImageAssets: TemplatePackageV1["assets"];
  }): {
    materialization: TemplateFamilyMaterializationV1 | null;
    error: TemplateFamilySessionErrorV1 | null;
  } => {
    try {
      const materialization = materializeTemplateFamilyVariant(
        input.family,
        input.selectedVariantId,
        input.content,
        {
          resolveImageAsset(value, target) {
            const asset = input.sharedImageAssets[value.assetRef];
            return asset?.type === "image"
              ? { ...structuredClone(asset), nodeId: target.nodeId }
              : null;
          },
        },
      );
      const materializationBlocker = materialization.issues.find(
        (issue) => issue.severity === "error",
      );
      if (materializationBlocker) {
        suppressRenderNotification = true;
        renderSession.reset();
        suppressRenderNotification = false;
        return {
          materialization,
          error: {
            code: "materialization-failed",
            message: materializationBlocker.message,
          },
        };
      }
      const variant = input.family.variants.find(
        (candidate) => candidate.id === input.selectedVariantId,
      );
      if (!variant) throw new Error("The selected family variant is missing.");
      suppressRenderNotification = true;
      const loaded = renderSession.loadTemplateState({
        importedPackage: variant.packageValue,
        packageValue: materialization.packageValue,
        source: {
          type: "package-zip",
          sourceName: variant.source.sourceName,
          figmaUrl: variant.source.figmaUrl,
        },
        expectedRevision: renderSession.getSnapshot().revision,
      });
      suppressRenderNotification = false;
      if (!loaded.applied) {
        return {
          materialization,
          error: {
            code: "materialization-failed",
            message: loaded.stale
              ? "The selected variant changed before it could be rendered."
              : "The selected variant could not be loaded into the render session.",
          },
        };
      }
      return { materialization, error: null };
    } catch (error) {
      suppressRenderNotification = false;
      return {
        materialization: null,
        error: {
          code: "materialization-failed",
          message: errorMessage(error, "The selected variant could not be materialized."),
        },
      };
    }
  };
  const publishFamily = (input: {
    family: TemplateFamilyV1;
    content: TemplateFamilyContentStateV1;
    selectedVariantId: string;
    sharedImageAssets: TemplatePackageV1["assets"];
    savedFamilyId?: string | null;
    savedDraftId?: string | null;
    selectionChanged?: boolean;
    familyChanged?: boolean;
    sharedAssetsChanged?: boolean;
  }): TemplateFamilySessionMutationResultV1 => {
    const validation = validateTemplateFamily(input.family, input.content);
    if (!validation.definitionValid) {
      publish({
        status: "blocked",
        operationRevision: snapshot.operationRevision + 1,
        familyRevision: snapshot.familyRevision + (input.familyChanged ? 1 : 0),
        family: input.familyChanged
          ? freezeFamily(structuredClone(input.family))
          : input.family,
        content: structuredClone(input.content),
        selectedVariantId: input.selectedVariantId,
        validation,
        materialization: null,
        sharedImageAssets: input.sharedAssetsChanged
          ? structuredClone(input.sharedImageAssets)
          : input.sharedImageAssets,
        savedFamilyId: input.savedFamilyId ?? snapshot.savedFamilyId,
        savedDraftId: input.savedDraftId ?? snapshot.savedDraftId,
        error: {
          code: "family-invalid",
          message: "Resolve the family definition blockers before rendering it.",
        },
      });
      return { applied: false, stale: false, snapshot };
    }
    const rendered = render(input);
    publish({
      status: rendered.error ? "blocked" : "ready",
      operationRevision: snapshot.operationRevision + 1,
      familyRevision: snapshot.familyRevision + (input.familyChanged ? 1 : 0),
      contentRevision: input.content.revision,
      selectionRevision: snapshot.selectionRevision + (input.selectionChanged ? 1 : 0),
      renderSessionRevision: renderSession.getSnapshot().revision,
      family: input.familyChanged
        ? freezeFamily(structuredClone(input.family))
        : input.family,
      content: structuredClone(input.content),
      selectedVariantId: input.selectedVariantId,
      validation,
      materialization: rendered.materialization,
      sharedImageAssets: input.sharedAssetsChanged
        ? structuredClone(input.sharedImageAssets)
        : input.sharedImageAssets,
      savedFamilyId: input.savedFamilyId ?? snapshot.savedFamilyId,
      savedDraftId: input.savedDraftId ?? snapshot.savedDraftId,
      error: rendered.error,
    });
    return { applied: !rendered.error, stale: false, snapshot };
  };
  const requireLoaded = () => {
    assertActive();
    if (!snapshot.family || !snapshot.content || !snapshot.selectedVariantId) {
      throw new Error("Load a Template Family before changing it.");
    }
    return {
      family: snapshot.family,
      content: snapshot.content,
      selectedVariantId: snapshot.selectedVariantId,
      sharedImageAssets: snapshot.sharedImageAssets,
    };
  };
  const checkExpected = (expected = snapshot.operationRevision) =>
    expected === snapshot.operationRevision;

  const api: TemplateFamilySessionV1 = {
    renderSession,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      assertActive();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    load(input) {
      assertActive();
      if (!checkExpected(input.expectedOperationRevision)) return staleResult();
      const family = structuredClone(input.family);
      const content = input.content ? structuredClone(input.content) : defaultContent(family);
      const selectedVariantId = input.selectedVariantId ?? family.variants[0]?.id;
      if (!selectedVariantId || !family.variants.some((item) => item.id === selectedVariantId)) {
        publish({
          status: "blocked",
          operationRevision: snapshot.operationRevision + 1,
          familyRevision: snapshot.familyRevision + 1,
          family,
          content,
          selectedVariantId: null,
          validation: validateTemplateFamily(family, content),
          error: { code: "variant-not-found", message: "Select an existing family variant." },
        });
        return { applied: false, stale: false, snapshot };
      }
      return publishFamily({
        family,
        content,
        selectedVariantId,
        sharedImageAssets: structuredClone(input.sharedImageAssets ?? {}),
        savedFamilyId: input.savedFamilyId ?? null,
        savedDraftId: input.savedDraftId ?? null,
        selectionChanged: true,
        familyChanged: true,
        sharedAssetsChanged: true,
      });
    },
    async loadSavedFamily(id, draftId) {
      assertActive();
      const captured = snapshot.operationRevision;
      try {
        const record = await familyRepository.getFamily(id);
        if (disposed || captured !== snapshot.operationRevision) return snapshot;
        if (!record) {
          publish({
            status: "blocked",
            operationRevision: snapshot.operationRevision + 1,
            error: { code: "family-not-found", message: `Saved family "${id}" was not found.` },
          });
          return snapshot;
        }
        const draft = draftId ? await familyRepository.getFamilyDraft(draftId) : null;
        if (disposed || captured !== snapshot.operationRevision) return snapshot;
        if (draftId && !draft) {
          publish({
            status: "blocked",
            operationRevision: snapshot.operationRevision + 1,
            error: { code: "draft-not-found", message: `Family draft "${draftId}" was not found.` },
          });
          return snapshot;
        }
        api.load({
          family: record.family,
          content: draft?.content,
          selectedVariantId: draft?.selectedVariantId,
          sharedImageAssets: { ...record.sharedImageAssets, ...draft?.sharedImageAssets },
          savedFamilyId: record.id,
          savedDraftId: draft?.id,
          expectedOperationRevision: captured,
        });
        return snapshot;
      } catch (error) {
        if (!disposed && captured === snapshot.operationRevision) {
          publish({
            status: "blocked",
            operationRevision: snapshot.operationRevision + 1,
            error: {
              code: "family-load-failed",
              message: errorMessage(error, "The saved family could not be loaded."),
            },
          });
        }
        return snapshot;
      }
    },
    async loadLegacyTemplate(id, draftId) {
      assertActive();
      const captured = snapshot.operationRevision;
      try {
        const template = await templateRepository.getTemplate(id);
        if (disposed || captured !== snapshot.operationRevision) return snapshot;
        if (!template) {
          publish({
            status: "blocked",
            operationRevision: snapshot.operationRevision + 1,
            error: { code: "family-not-found", message: `Saved template "${id}" was not found.` },
          });
          return snapshot;
        }
        const draft = draftId ? await templateRepository.getDraft(draftId) : null;
        if (disposed || captured !== snapshot.operationRevision) return snapshot;
        if (draftId && (!draft || draft.templateId !== template.id)) {
          publish({
            status: "blocked",
            operationRevision: snapshot.operationRevision + 1,
            error: { code: "draft-not-found", message: `Legacy draft "${draftId}" was not found.` },
          });
          return snapshot;
        }
        const converted = createLegacyTemplateFamilyRecord(
          draft ? { ...template, workingPackage: draft.workingPackage } : template,
        );
        api.load({
          family: converted.record.family,
          content: converted.content,
          sharedImageAssets: converted.record.sharedImageAssets,
          expectedOperationRevision: captured,
        });
        return snapshot;
      } catch (error) {
        if (!disposed && captured === snapshot.operationRevision) {
          publish({
            status: "blocked",
            operationRevision: snapshot.operationRevision + 1,
            error: {
              code: "family-load-failed",
              message: errorMessage(error, "The legacy template could not be loaded."),
            },
          });
        }
        return snapshot;
      }
    },
    selectVariant(variantId, expectedOperationRevision) {
      const current = requireLoaded();
      if (!checkExpected(expectedOperationRevision)) return staleResult();
      if (!current.family.variants.some((variant) => variant.id === variantId)) {
        return { applied: false, stale: false, snapshot };
      }
      if (variantId === current.selectedVariantId) {
        return { applied: false, stale: false, snapshot };
      }
      return publishFamily({ ...current, selectedVariantId: variantId, selectionChanged: true });
    },
    setField(fieldId, value, expectedOperationRevision) {
      const current = requireLoaded();
      if (!checkExpected(expectedOperationRevision)) return staleResult();
      const update = updateTemplateFamilyContentField(
        current.family,
        current.content,
        fieldId,
        value,
      );
      if (!update.applied) return { applied: false, stale: false, snapshot };
      return publishFamily({ ...current, content: update.content });
    },
    replaceImage(fieldId, input, expectedOperationRevision) {
      const current = requireLoaded();
      if (!checkExpected(expectedOperationRevision)) return staleResult();
      const asset = createSharedImageAsset(current.family, fieldId, input);
      const content = structuredClone(current.content);
      const value: TemplateFamilyImageValueV1 = {
        kind: "image",
        assetRef: asset.id,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        width: input.width,
        height: input.height,
        placementState: input.placementState ?? "replacement-fill",
      };
      content.revision += 1;
      content.values[fieldId] = value;
      return publishFamily({
        ...current,
        content,
        sharedImageAssets: { ...current.sharedImageAssets, [asset.id]: asset },
        sharedAssetsChanged: true,
      });
    },
    resetField(fieldId, expectedOperationRevision) {
      const current = requireLoaded();
      if (!checkExpected(expectedOperationRevision)) return staleResult();
      const field = current.family.fields.find((candidate) => candidate.id === fieldId);
      if (!field) throw new Error(`Shared family field "${fieldId}" was not found.`);
      const content = structuredClone(current.content);
      content.revision += 1;
      content.values[fieldId] = structuredClone(field.defaultValue);
      return publishFamily({ ...current, content });
    },
    setImageReplacementMode(fieldId, mode, expectedOperationRevision) {
      const current = requireLoaded();
      if (!checkExpected(expectedOperationRevision)) return staleResult();
      const value = current.content.values[fieldId];
      if (!value || typeof value !== "object" || value.kind !== "image") {
        return { applied: false, stale: false, snapshot };
      }
      const content = structuredClone(current.content);
      content.revision += 1;
      content.values[fieldId] = { ...value, placementState: mode };
      return publishFamily({ ...current, content });
    },
    replaceFamily(family, expectedOperationRevision) {
      const current = requireLoaded();
      if (!checkExpected(expectedOperationRevision)) return staleResult();
      if (family.id !== current.family.id) {
        throw new Error("A replacement family must preserve the family ID.");
      }
      const selectedVariantId = family.variants.some(
        (variant) => variant.id === current.selectedVariantId,
      ) ? current.selectedVariantId : family.variants[0]?.id;
      if (!selectedVariantId) return { applied: false, stale: false, snapshot };
      return publishFamily({
        ...current,
        family: structuredClone(family),
        selectedVariantId,
        selectionChanged: selectedVariantId !== current.selectedVariantId,
        familyChanged: true,
      });
    },
    planVariantReimport(variantId, nextPackage) {
      const current = requireLoaded();
      return planTemplateFamilyVariantReimport(
        current.family,
        variantId,
        nextPackage,
        snapshot.familyRevision,
      );
    },
    applyVariantReimport(plan, resolvedBindings, expectedOperationRevision) {
      const current = requireLoaded();
      if (!checkExpected(expectedOperationRevision)) return staleResult();
      const family = applyTemplateFamilyVariantReimport(
        current.family,
        plan,
        snapshot.familyRevision,
        resolvedBindings,
      );
      return publishFamily({
        ...current,
        family,
        familyChanged: true,
      });
    },
    async save(saveOptions = {}) {
      const current = requireLoaded();
      if (!snapshot.validation?.definitionValid) {
        throw new Error("Resolve family definition blockers before saving.");
      }
      const captured = snapshot.operationRevision;
      const existing = snapshot.savedFamilyId
        ? await familyRepository.getFamily(snapshot.savedFamilyId)
        : null;
      const record = existing
        ? {
            ...existing,
            name: saveOptions.name?.trim() || current.family.title,
            description: saveOptions.description?.trim(),
            family: structuredClone(current.family),
            validation: validateTemplateFamily(current.family),
            sharedImageAssets: structuredClone(current.sharedImageAssets),
          }
        : createSavedTemplateFamilyRecord({
            family: current.family,
            name: saveOptions.name,
            description: saveOptions.description,
            sharedImageAssets: current.sharedImageAssets,
          });
      const saved = await familyRepository.saveFamily(record);
      if (!disposed && captured === snapshot.operationRevision) publish({ savedFamilyId: saved.id });
      return saved;
    },
    async saveDraft(name) {
      const current = requireLoaded();
      const captured = snapshot.operationRevision;
      const existing = snapshot.savedDraftId
        ? await familyRepository.getFamilyDraft(snapshot.savedDraftId)
        : null;
      const record = existing
        ? {
            ...existing,
            name: name?.trim() || existing.name,
            content: structuredClone(current.content),
            validation: validateTemplateFamily(current.family, current.content),
            selectedVariantId: current.selectedVariantId,
            sharedImageAssets: structuredClone(current.sharedImageAssets),
          }
        : createSavedTemplateFamilyDraftRecord({
            family: current.family,
            content: current.content,
            selectedVariantId: current.selectedVariantId,
            name,
            sharedImageAssets: current.sharedImageAssets,
          });
      const saved = await familyRepository.saveFamilyDraft(record);
      if (!disposed && captured === snapshot.operationRevision) publish({ savedDraftId: saved.id });
      return saved;
    },
    reset() {
      assertActive();
      suppressRenderNotification = true;
      renderSession.reset();
      suppressRenderNotification = false;
      snapshot = {
        ...emptySnapshot(),
        revision: snapshot.revision + 1,
        operationRevision: snapshot.operationRevision + 1,
      };
      listeners.forEach((listener) => listener());
      return snapshot;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      renderUnsubscribe();
      renderSession.dispose();
      publish({
        status: "disposed",
        operationRevision: snapshot.operationRevision + 1,
        materialization: null,
      });
      listeners.clear();
    },
  };
  return api;
}

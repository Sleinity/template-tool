import type { AssetStorageAdapter } from "../assets";
import {
  clearTemplatePackageImageOverride,
  getEffectiveEditableFields,
  replaceTemplatePackageImage,
  restoreImportedPackageForEditing,
  setTemplatePackageImageReplacementMode,
  updateTemplatePackageField,
  type PackageEditorFieldWarning,
  type PackageFieldUpdateOptions,
} from "../editor/packageFieldBindings";
import type { ManagedFontRegistry } from "../fonts/fontRegistryTypes";
import type { ManagedFontCandidate } from "../fonts/fontRegistryTypes";
import {
  getManagedFontRegistry,
  linkRequirementToManagedFont,
  useFallbackForRequirement,
} from "../fonts/fontRegistry";
import { findManagedFontCandidates } from "../fonts/fontMatching";
import { uploadExactManagedFontForRequirement } from "../fonts/fontResolution";
import {
  runTemplatePackageImportPipeline,
  type PackageImportResult,
} from "../import/runTemplatePackageImportPipeline";
import {
  createFailedTemplatePackageValidation,
  createTemplateImportValidationReport,
  type TemplateImportValidationReportV1,
} from "../import/templateImportValidation";
import type {
  PackageDiagnostic,
  PackageDiagnosticCategory,
  TemplatePackageValidationResult,
} from "../packageDiagnostics";
import {
  createSavedTemplateRecord,
  getTemplateRepository,
} from "../persistence/templateRepository";
import type {
  SavedTemplateRecord,
  SavedTemplateSourceMetadata,
  TemplateRepository,
} from "../persistence/types";
import {
  createResolvedRenderTree,
  type ResolvedRenderTreeV1,
} from "../resolved";
import type {
  EditableFieldBinding,
  TemplatePackageV1,
} from "../types";
import { validateTemplatePackage } from "../validateTemplatePackage";

export const TEMPLATE_SESSION_SCHEMA_VERSION = "template-session-snapshot-v1" as const;

export type TemplateSessionStatus =
  | "idle"
  | "loading"
  | "ready"
  | "blocked"
  | "disposed";

export interface TemplateSessionErrorV1 {
  code: "import-failed" | "saved-template-not-found" | "saved-template-load-failed";
  message: string;
}

export interface TemplateSessionSnapshotV1 {
  schemaVersion: typeof TEMPLATE_SESSION_SCHEMA_VERSION;
  status: TemplateSessionStatus;
  revision: number;
  operationRevision: number;
  savedTemplateId: string | null;
  source: SavedTemplateSourceMetadata | null;
  basePackage: TemplatePackageV1 | null;
  workingPackage: TemplatePackageV1 | null;
  resolvedTree: ResolvedRenderTreeV1 | null;
  validation: TemplatePackageValidationResult | null;
  importValidation: TemplateImportValidationReportV1 | null;
  diagnostics: PackageDiagnostic[];
  editableFields: EditableFieldBinding[];
  error: TemplateSessionErrorV1 | null;
}

export interface TemplateSessionOptions {
  assetStorage?: AssetStorageAdapter;
  fontRegistry?: ManagedFontRegistry | null;
  repository?: TemplateRepository;
}

export interface TemplateSessionLoadZipInput {
  bytes: ArrayBuffer;
  sourceName?: string;
  figmaUrl?: string;
}

export interface TemplateSessionLoadStateInputV1 {
  importedPackage: TemplatePackageV1;
  packageValue: TemplatePackageV1;
  source?: SavedTemplateSourceMetadata | null;
  importValidation?: TemplateImportValidationReportV1 | null;
  expectedRevision?: number;
}

export interface TemplateSessionLoadStateResultV1 {
  applied: boolean;
  stale: boolean;
  snapshot: TemplateSessionSnapshotV1;
  importedPackageValidation: TemplatePackageValidationResult;
  packageValidation: TemplatePackageValidationResult;
  diagnostics: PackageDiagnostic[];
}

export interface TemplateSessionImageReplacementInput {
  dataUrl: string;
  assetId?: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  placementState?: "replacement-fill" | "replacement-fit";
}

export interface TemplateSessionSaveOptions {
  name?: string;
  description?: string;
}

export interface TemplateSessionMutationResult {
  applied: boolean;
  warning?: PackageEditorFieldWarning;
  snapshot: TemplateSessionSnapshotV1;
}

export interface TemplateSessionPackageUpdateResult {
  applied: boolean;
  stale: boolean;
  snapshot: TemplateSessionSnapshotV1;
  validation: TemplatePackageValidationResult;
  diagnostics: PackageDiagnostic[];
}

export interface TemplateSessionFontUploadInput {
  bytes: ArrayBuffer;
  mimeType: string;
  fileName?: string;
}

export interface TemplateSessionFontLinkOptions {
  allowReplacement?: boolean;
  confirmed?: boolean;
}

export interface TemplateSessionFontPreparationResult
  extends TemplateSessionPackageUpdateResult {}

export interface TemplateSessionV1 {
  getSnapshot(): TemplateSessionSnapshotV1;
  subscribe(listener: () => void): () => void;
  loadZip(input: TemplateSessionLoadZipInput): Promise<TemplateSessionSnapshotV1>;
  loadTemplateState(
    input: TemplateSessionLoadStateInputV1,
  ): TemplateSessionLoadStateResultV1;
  loadSavedTemplate(id: string): Promise<TemplateSessionSnapshotV1>;
  save(options?: TemplateSessionSaveOptions): Promise<SavedTemplateRecord>;
  setField(
    fieldId: string,
    value: unknown,
    options?: PackageFieldUpdateOptions,
  ): TemplateSessionMutationResult;
  replaceImage(
    fieldId: string,
    input: TemplateSessionImageReplacementInput,
  ): TemplateSessionMutationResult;
  resetField(fieldId: string): TemplateSessionMutationResult;
  setImageReplacementMode(
    fieldId: string,
    mode: "replacement-fill" | "replacement-fit",
  ): TemplateSessionMutationResult;
  replaceWorkingPackage(
    packageValue: TemplatePackageV1,
    expectedRevision?: number,
  ): TemplateSessionPackageUpdateResult;
  getManagedFontCandidates(
    requirementId: string,
  ): Promise<ManagedFontCandidate[]>;
  linkManagedFont(
    requirementId: string,
    managedFontId: string,
    options?: TemplateSessionFontLinkOptions,
  ): Promise<TemplateSessionFontPreparationResult>;
  uploadFont(
    requirementId: string,
    input: TemplateSessionFontUploadInput,
  ): Promise<TemplateSessionFontPreparationResult>;
  useFontFallback(
    requirementId: string,
    fallbackFamily?: string,
  ): TemplateSessionFontPreparationResult;
  restoreImportedState(): TemplateSessionSnapshotV1;
  reset(): TemplateSessionSnapshotV1;
  dispose(): void;
}

interface TemplateSessionDependencies {
  importZip(input: Parameters<typeof runTemplatePackageImportPipeline>[0]): Promise<PackageImportResult>;
  createResolvedTree(packageValue: TemplatePackageV1): ResolvedRenderTreeV1;
  validate(packageValue: TemplatePackageV1): TemplatePackageValidationResult;
}

const defaultDependencies: TemplateSessionDependencies = {
  importZip: runTemplatePackageImportPipeline,
  createResolvedTree: createResolvedRenderTree,
  validate: validateTemplatePackage,
};

function emptySnapshot(): TemplateSessionSnapshotV1 {
  return {
    schemaVersion: TEMPLATE_SESSION_SCHEMA_VERSION,
    status: "idle",
    revision: 0,
    operationRevision: 0,
    savedTemplateId: null,
    source: null,
    basePackage: null,
    workingPackage: null,
    resolvedTree: null,
    validation: null,
    importValidation: null,
    diagnostics: [],
    editableFields: [],
    error: null,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function importDiagnosticCategory(category: string): PackageDiagnosticCategory {
  if (category === "asset") return "asset";
  if (category === "field") return "field";
  if (category === "font") return "font";
  if (category === "motion") return "motion";
  if (category === "package") return "schema";
  return "parse";
}

function blockedImportDiagnostics(result: PackageImportResult): PackageDiagnostic[] {
  const layered = result.layeredDiagnostics?.diagnostics;
  if (!layered?.length) return result.diagnostics;
  return layered.map((item) => ({
    code: item.code,
    severity: item.severity,
    category: importDiagnosticCategory(item.category),
    message: item.message,
    path: item.path,
    nodeId: item.nodeId,
    details: {
      ...item.details,
      sourceCategory: item.category,
      sourceLayer: item.layer,
      sourceOrigin: item.origin,
      blocksImport: item.blocksImport,
      ...(item.fieldId ? { fieldId: item.fieldId } : {}),
      ...(item.assetId ? { assetId: item.assetId } : {}),
      ...(item.ref ? { ref: item.ref } : {}),
      ...(item.sourceNodeId ? { sourceNodeId: item.sourceNodeId } : {}),
      ...(item.suggestion ? { suggestion: item.suggestion } : {}),
      ...(item.relatedIds ? { relatedIds: item.relatedIds } : {}),
    },
  }));
}

function freezePackage(packageValue: TemplatePackageV1): TemplatePackageV1 {
  const freeze = (value: unknown): void => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  };
  freeze(packageValue);
  return packageValue;
}

function snapshotPayload(
  value: TemplateSessionSnapshotV1,
): Omit<TemplateSessionSnapshotV1, "schemaVersion" | "revision" | "operationRevision"> {
  const {
    schemaVersion: _schemaVersion,
    revision: _revision,
    operationRevision: _operationRevision,
    ...payload
  } = value;
  return payload;
}

export function createTemplateSession(
  options: TemplateSessionOptions = {},
): TemplateSessionV1 {
  return createTemplateSessionWithDependencies(options, defaultDependencies);
}

export function createTemplateSessionWithDependencies(
  options: TemplateSessionOptions,
  dependencies: TemplateSessionDependencies,
): TemplateSessionV1 {
  let snapshot = emptySnapshot();
  let operationRevision = 0;
  let disposed = false;
  const listeners = new Set<() => void>();
  const repository = options.repository ?? getTemplateRepository();
  const fontRegistry = Object.prototype.hasOwnProperty.call(options, "fontRegistry")
    ? options.fontRegistry ?? null
    : getManagedFontRegistry();

  const assertActive = () => {
    if (disposed) throw new Error("TemplateSession has been disposed.");
  };
  const publish = (
    next: Omit<TemplateSessionSnapshotV1, "schemaVersion" | "revision" | "operationRevision">,
  ) => {
    snapshot = {
      schemaVersion: TEMPLATE_SESSION_SCHEMA_VERSION,
      revision: snapshot.revision + 1,
      operationRevision,
      ...next,
    };
    listeners.forEach((listener) => listener());
    return snapshot;
  };
  const publishPackage = (input: {
    basePackage: TemplatePackageV1;
    workingPackage: TemplatePackageV1;
    validation?: TemplatePackageValidationResult;
    source: SavedTemplateSourceMetadata | null;
    savedTemplateId: string | null;
    diagnostics?: PackageDiagnostic[];
    importValidation?: TemplateImportValidationReportV1 | null;
  }) => {
    const workingPackage = input.workingPackage;
    const validation = input.validation ?? dependencies.validate(workingPackage);
    const ready = validation.valid;
    return publish({
      status: ready ? "ready" : "blocked",
      savedTemplateId: input.savedTemplateId,
      source: input.source,
      basePackage: input.basePackage,
      workingPackage,
      resolvedTree: ready ? dependencies.createResolvedTree(workingPackage) : null,
      validation,
      importValidation: input.importValidation ?? snapshot.importValidation,
      diagnostics: input.diagnostics ?? validation.diagnostics,
      editableFields: getEffectiveEditableFields(workingPackage),
      error: null,
    });
  };
  const fieldById = (fieldId: string) =>
    snapshot.editableFields.find((field) => field.id === fieldId) ?? null;
  const applyMutation = (
    fieldId: string,
    mutate: (packageValue: TemplatePackageV1, field: EditableFieldBinding) => {
      packageValue: TemplatePackageV1;
      warning?: PackageEditorFieldWarning;
      applied?: boolean;
    },
  ): TemplateSessionMutationResult => {
    assertActive();
    if (
      snapshot.status !== "ready" ||
      !snapshot.workingPackage ||
      !snapshot.basePackage
    ) {
      throw new Error("Load a valid TemplatePackage before editing fields.");
    }
    const field = fieldById(fieldId);
    if (!field) throw new Error(`Editable field "${fieldId}" was not found.`);
    const result = mutate(snapshot.workingPackage, field);
    const applied = result.packageValue !== snapshot.workingPackage && result.applied !== false;
    if (applied) {
      publishPackage({
        basePackage: snapshot.basePackage,
        workingPackage: result.packageValue,
        source: snapshot.source,
        savedTemplateId: snapshot.savedTemplateId,
      });
    }
    return { applied, warning: result.warning, snapshot };
  };
  const activeWorkingPackage = () => {
    assertActive();
    if (
      snapshot.status !== "ready" ||
      !snapshot.workingPackage ||
      !snapshot.basePackage
    ) {
      throw new Error("Load a valid TemplatePackage before changing setup.");
    }
    return snapshot.workingPackage;
  };
  const replaceWorkingPackage = (
    packageValue: TemplatePackageV1,
    expectedRevision = snapshot.revision,
  ): TemplateSessionPackageUpdateResult => {
    assertActive();
    const candidatePackage = structuredClone(packageValue);
    const validation = dependencies.validate(candidatePackage);
    if (expectedRevision !== snapshot.revision) {
      return {
        applied: false,
        stale: true,
        snapshot,
        validation,
        diagnostics: validation.diagnostics,
      };
    }
    activeWorkingPackage();
    if (!validation.valid) {
      return {
        applied: false,
        stale: false,
        snapshot,
        validation,
        diagnostics: validation.diagnostics,
      };
    }
    operationRevision += 1;
    publishPackage({
      basePackage: snapshot.basePackage as TemplatePackageV1,
      workingPackage: candidatePackage,
      validation,
      source: snapshot.source,
      savedTemplateId: snapshot.savedTemplateId,
      diagnostics: validation.diagnostics,
    });
    return {
      applied: true,
      stale: false,
      snapshot,
      validation,
      diagnostics: validation.diagnostics,
    };
  };
  const fontRequirement = (requirementId: string) => {
    const packageValue = activeWorkingPackage();
    const requirement = packageValue.fontRequirements?.find(
      (item) => item.id === requirementId,
    );
    if (!requirement) {
      throw new Error(`Font requirement "${requirementId}" was not found.`);
    }
    return { packageValue, requirement };
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      assertActive();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async loadZip(input) {
      assertActive();
      const candidateRevision = ++operationRevision;
      publish({
        status: "loading",
        savedTemplateId: null,
        source: null,
        basePackage: null,
        workingPackage: null,
        resolvedTree: null,
        validation: null,
        importValidation: null,
        diagnostics: [],
        editableFields: [],
        error: null,
      });
      try {
        const result = await dependencies.importZip({
          format: "zip",
          buffer: input.bytes,
          sourceName: input.sourceName ?? "template-package.zip",
          figmaUrl: input.figmaUrl,
          assetStorage: options.assetStorage,
          fontRegistry: options.fontRegistry,
        });
        if (disposed || candidateRevision !== operationRevision) return snapshot;
        const basePackage = result.loadedSource?.originalPackageValue ?? result.package;
        if (!basePackage || !result.package || !result.validation?.valid) {
          const diagnostics = blockedImportDiagnostics(result);
          const validation =
            result.validation ??
            createFailedTemplatePackageValidation(diagnostics);
          return publish({
            status: "blocked",
            savedTemplateId: null,
            source: result.sourceMetadata ?? null,
            basePackage: basePackage
              ? freezePackage(structuredClone(basePackage))
              : null,
            workingPackage: result.package,
            resolvedTree: null,
            validation,
            importValidation: createTemplateImportValidationReport({
              diagnostics,
              validation: result.validation,
              loadedSource: result.loadedSource,
              layeredDiagnostics: result.layeredDiagnostics,
            }),
            diagnostics,
            editableFields: result.package ? getEffectiveEditableFields(result.package) : [],
            error: null,
          });
        }
        return publishPackage({
          basePackage: freezePackage(structuredClone(basePackage)),
          workingPackage: result.package,
          validation: result.validation,
          source: result.sourceMetadata ?? null,
          savedTemplateId: null,
          diagnostics: result.diagnostics,
          importValidation: createTemplateImportValidationReport({
            diagnostics: result.diagnostics,
            validation: result.validation,
            loadedSource: result.loadedSource,
            layeredDiagnostics: result.layeredDiagnostics,
          }),
        });
      } catch (error) {
        if (disposed || candidateRevision !== operationRevision) return snapshot;
        const diagnostics: PackageDiagnostic[] = [
          {
            code: "import.failed",
            severity: "error",
            category: "parse",
            message: errorMessage(
              error,
              "The TemplatePackage ZIP could not be imported.",
            ),
          },
        ];
        return publish({
          status: "blocked",
          savedTemplateId: null,
          source: null,
          basePackage: null,
          workingPackage: null,
          resolvedTree: null,
          validation: createFailedTemplatePackageValidation(diagnostics),
          importValidation: createTemplateImportValidationReport({
            diagnostics,
          }),
          diagnostics,
          editableFields: [],
          error: {
            code: "import-failed",
            message: errorMessage(error, "The TemplatePackage ZIP could not be imported."),
          },
        });
      }
    },
    loadTemplateState(input) {
      assertActive();
      const expectedRevision = input.expectedRevision ?? snapshot.revision;
      const malformed = (
        !input.importedPackage ||
        typeof input.importedPackage !== "object" ||
        !input.packageValue ||
        typeof input.packageValue !== "object"
      );
      if (malformed) {
        const validation = createFailedTemplatePackageValidation([
          {
            code: "session.state.invalid",
            severity: "error",
            category: "schema",
            message:
              "Confirmed template state must contain imported and working packages.",
          },
        ]);
        return {
          applied: false,
          stale: false,
          snapshot,
          importedPackageValidation: validation,
          packageValidation: validation,
          diagnostics: validation.diagnostics,
        };
      }

      const importedPackage = structuredClone(input.importedPackage);
      const packageValue = structuredClone(input.packageValue);
      const importedPackageValidation = dependencies.validate(importedPackage);
      const packageValidation = dependencies.validate(packageValue);
      const identityDiagnostics: PackageDiagnostic[] =
        importedPackage.packageId === packageValue.packageId
          ? []
          : [{
              code: "session.state.package-identity-mismatch",
              severity: "error",
              category: "schema",
              message:
                "Imported and working packages must have the same package identity.",
              details: {
                importedPackageId: importedPackage.packageId,
                workingPackageId: packageValue.packageId,
              },
            }];
      const diagnostics = [
        ...importedPackageValidation.diagnostics.map((diagnostic) => ({
          ...diagnostic,
          details: {
            ...diagnostic.details,
            hydrationPackage: "imported",
          },
        })),
        ...packageValidation.diagnostics.map((diagnostic) => ({
          ...diagnostic,
          details: {
            ...diagnostic.details,
            hydrationPackage: "working",
          },
        })),
        ...identityDiagnostics,
      ];

      if (expectedRevision !== snapshot.revision) {
        return {
          applied: false,
          stale: true,
          snapshot,
          importedPackageValidation,
          packageValidation,
          diagnostics,
        };
      }
      if (
        !importedPackageValidation.valid ||
        !packageValidation.valid ||
        identityDiagnostics.length
      ) {
        return {
          applied: false,
          stale: false,
          snapshot,
          importedPackageValidation,
          packageValidation,
          diagnostics,
        };
      }

      operationRevision += 1;
      const source = input.source ? structuredClone(input.source) : null;
      const originalImportValidation =
        input.importValidation?.schemaVersion ===
            "template-import-validation-v1" &&
          input.importValidation.importable
          ? structuredClone(input.importValidation)
          : createTemplateImportValidationReport({
              diagnostics: packageValidation.diagnostics,
              validation: packageValidation,
            });
      publishPackage({
        basePackage: freezePackage(importedPackage),
        workingPackage: packageValue,
        validation: packageValidation,
        source,
        savedTemplateId: null,
        diagnostics: packageValidation.diagnostics,
        importValidation: originalImportValidation,
      });
      return {
        applied: true,
        stale: false,
        snapshot,
        importedPackageValidation,
        packageValidation,
        diagnostics,
      };
    },
    async loadSavedTemplate(id) {
      assertActive();
      const candidateRevision = ++operationRevision;
      publish({
        ...snapshotPayload(snapshot),
        status: "loading",
        error: null,
      });
      try {
        const record = await repository.getTemplate(id);
        if (disposed || candidateRevision !== operationRevision) return snapshot;
        if (!record) {
          return publish({
            ...snapshotPayload(snapshot),
            status: "blocked",
            error: {
              code: "saved-template-not-found",
              message: `Saved template "${id}" was not found.`,
            },
          });
        }
        return publishPackage({
          basePackage: freezePackage(structuredClone(record.originalPackage)),
          workingPackage: structuredClone(record.workingPackage),
          validation: record.validation,
          source: record.source,
          savedTemplateId: record.id,
          diagnostics: record.validation.diagnostics,
        });
      } catch (error) {
        if (disposed || candidateRevision !== operationRevision) return snapshot;
        return publish({
          ...snapshotPayload(snapshot),
          status: "blocked",
          error: {
            code: "saved-template-load-failed",
            message: errorMessage(error, "The saved template could not be loaded."),
          },
        });
      }
    },
    async save(saveOptions = {}) {
      assertActive();
      if (
        snapshot.status !== "ready" ||
        !snapshot.basePackage ||
        !snapshot.workingPackage ||
        !snapshot.validation?.valid
      ) {
        throw new Error("Only a valid ready TemplateSession can be saved.");
      }
      const capturedRevision = snapshot.revision;
      const record = snapshot.savedTemplateId
        ? await repository.updateTemplateSettings(snapshot.savedTemplateId, {
            name: saveOptions.name ?? snapshot.workingPackage.name,
            description: saveOptions.description,
            workingPackage: snapshot.workingPackage,
            validation: snapshot.validation,
          })
        : await repository.saveTemplate(createSavedTemplateRecord({
            name: saveOptions.name ?? snapshot.workingPackage.name,
            description: saveOptions.description,
            packageValue: snapshot.basePackage,
            workingPackageValue: snapshot.workingPackage,
            validation: snapshot.validation,
            source: snapshot.source ?? undefined,
          }));
      if (!disposed && snapshot.revision === capturedRevision) {
        publish({ ...snapshotPayload(snapshot), savedTemplateId: record.id });
      }
      return record;
    },
    setField(fieldId, value, fieldOptions = {}) {
      return applyMutation(fieldId, (packageValue, field) =>
        updateTemplatePackageField(packageValue, field, value, fieldOptions));
    },
    replaceImage(fieldId, input) {
      return applyMutation(fieldId, (packageValue, field) =>
        replaceTemplatePackageImage(packageValue, field, input.dataUrl, input));
    },
    resetField(fieldId) {
      return applyMutation(fieldId, (packageValue, field) =>
        field.property === "image.assetId"
          ? clearTemplatePackageImageOverride(packageValue, field)
          : updateTemplatePackageField(packageValue, field, field.defaultValue));
    },
    setImageReplacementMode(fieldId, mode) {
      return applyMutation(fieldId, (packageValue, field) =>
        setTemplatePackageImageReplacementMode(packageValue, field, mode));
    },
    replaceWorkingPackage,
    async getManagedFontCandidates(requirementId) {
      const { requirement } = fontRequirement(requirementId);
      if (!fontRegistry) return [];
      const fonts = await fontRegistry.listManagedFonts();
      return findManagedFontCandidates(requirement, fonts);
    },
    async linkManagedFont(requirementId, managedFontId, linkOptions = {}) {
      const capturedRevision = snapshot.revision;
      const { packageValue } = fontRequirement(requirementId);
      const font = await fontRegistry?.getManagedFont(managedFontId);
      if (!font) {
        throw new Error(`Managed font "${managedFontId}" was not found.`);
      }
      const nextPackage = await linkRequirementToManagedFont(
        packageValue,
        requirementId,
        font,
        {
          allowReplacement: linkOptions.allowReplacement,
          confirmed: linkOptions.confirmed ?? true,
          reason: "Confirmed in the reusable template setup wizard.",
          registry: null,
        },
      );
      return replaceWorkingPackage(nextPackage, capturedRevision);
    },
    async uploadFont(requirementId, input) {
      const capturedRevision = snapshot.revision;
      const { packageValue } = fontRequirement(requirementId);
      const prepared = await uploadExactManagedFontForRequirement(
        packageValue,
        requirementId,
        input.bytes,
        {
          mimeType: input.mimeType,
          fileName: input.fileName,
          provider: "user-upload",
          registry: fontRegistry,
          reason: "Uploaded in the reusable exact-font setup flow.",
        },
      );
      return replaceWorkingPackage(prepared.packageValue, capturedRevision);
    },
    useFontFallback(requirementId, fallbackFamily = "sans-serif") {
      const capturedRevision = snapshot.revision;
      const { packageValue } = fontRequirement(requirementId);
      return replaceWorkingPackage(
        useFallbackForRequirement(
          packageValue,
          requirementId,
          fallbackFamily,
        ),
        capturedRevision,
      );
    },
    restoreImportedState() {
      assertActive();
      if (
        snapshot.status !== "ready" ||
        !snapshot.basePackage ||
        !snapshot.workingPackage
      ) {
        throw new Error("Load a valid TemplatePackage before restoring it.");
      }
      return publishPackage({
        basePackage: snapshot.basePackage,
        workingPackage: restoreImportedPackageForEditing(
          snapshot.basePackage,
          snapshot.workingPackage,
        ),
        source: snapshot.source,
        savedTemplateId: snapshot.savedTemplateId,
      });
    },
    reset() {
      assertActive();
      operationRevision += 1;
      return publish({
        ...snapshotPayload(emptySnapshot()),
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      operationRevision += 1;
      publish({
        ...snapshotPayload(snapshot),
        status: "disposed",
        resolvedTree: null,
      });
      listeners.clear();
    },
  };
}

import { sdkVersion } from "../internal/sdkVersion";
import {
  createTemplateFamilyFromPackage,
  parseTemplateFamilyContentStateV1,
  parseTemplateFamilyV1,
  planTemplateFamilyFieldMatches,
  TEMPLATE_FAMILY_CONTENT_SCHEMA_VERSION,
  validateTemplateFamily,
  type TemplateFamilyContentStateV1,
  type TemplateFamilyFieldMatchPlanV1,
  type TemplateFamilyValidationReportV1,
  type TemplateFamilyV1,
  type TemplateFamilyVariantV1,
} from "@sleinity/template-core/family";
import type { TemplatePackageV1 } from "@sleinity/template-core";
import type { AssetStorageAdapter } from "../assets/assetReliability";
import type { ManagedFontRegistry } from "../fonts/fontRegistryTypes";
import {
  createTemplateFamilySession,
  type TemplateFamilySessionV1,
} from "../session/publicFamilySession";
import type { TemplateFamilySessionSnapshotV1 } from "../session/templateFamilySession";
import { runTemplatePackageImportPipeline } from "./runTemplatePackageImportPipeline";
import {
  createTemplateImportValidationReport,
  type TemplateImportValidationReportV1,
} from "./templateImportValidation";
import type { LoadedSourceDiagnosticReport } from "./layeredSourceDiagnostics";
import {
  createTemplatePackageDigest,
  type TemplatePackageDigestV1,
} from "./templateImportIntegrity";

export const TEMPLATE_FAMILY_IMPORT_WIZARD_SCHEMA_VERSION =
  "template-family-import-wizard-v1" as const;
export const TEMPLATE_FAMILY_IMPORT_CONFIRMATION_SCHEMA_VERSION =
  "template-family-import-confirmation-v1" as const;
export const TEMPLATE_FAMILY_DIGEST_SCHEMA_VERSION =
  "template-family-digest-v1" as const;
export const TEMPLATE_FAMILY_SDK_VERSION = sdkVersion;

export const TEMPLATE_FAMILY_IMPORT_STEPS = [
  "family-variants",
  "field-matches",
  "variant-groups",
  "common-rules",
  "variant-overrides",
  "validation-preview",
  "confirmation",
] as const;

export type TemplateFamilyImportStepId =
  (typeof TEMPLATE_FAMILY_IMPORT_STEPS)[number];

export interface TemplateFamilyDigestV1 {
  schemaVersion: typeof TEMPLATE_FAMILY_DIGEST_SCHEMA_VERSION;
  algorithm: "sha-256";
  value: string;
}

export interface TemplateFamilyVariantImportReportV1 {
  variantId: string;
  sourceName: string;
  importValidation: TemplateImportValidationReportV1;
  /** Live import evidence. Saved families recompute current package diagnostics. */
  layeredDiagnostics?: LoadedSourceDiagnosticReport;
  packageDigest: TemplatePackageDigestV1;
}

export interface TemplateFamilyVariantRenderValidationV1 {
  variantId: string;
  status: "not-run" | "ready" | "warning" | "blocked" | "stale";
  sessionRevision?: number;
  issues: Array<{
    code: string;
    severity: "info" | "warning" | "error";
    message: string;
  }>;
}

export interface TemplateFamilyImportConfirmationV1 {
  schemaVersion: typeof TEMPLATE_FAMILY_IMPORT_CONFIRMATION_SCHEMA_VERSION;
  sdkVersion: typeof TEMPLATE_FAMILY_SDK_VERSION;
  confirmedAt: string;
  family: TemplateFamilyV1;
  content: TemplateFamilyContentStateV1;
  sharedImageAssets: TemplatePackageV1["assets"];
  familyDigest: TemplateFamilyDigestV1;
  variantDigests: Record<string, TemplatePackageDigestV1>;
  validation: TemplateFamilyValidationReportV1;
}

export interface TemplateFamilyImportWizardSnapshotV1 {
  schemaVersion: typeof TEMPLATE_FAMILY_IMPORT_WIZARD_SCHEMA_VERSION;
  status: "active" | "completed" | "cancelled" | "disposed";
  revision: number;
  operationRevision: number;
  activeStep: TemplateFamilyImportStepId;
  family: TemplateFamilyV1 | null;
  content: TemplateFamilyContentStateV1 | null;
  validation: TemplateFamilyValidationReportV1 | null;
  matchPlans: Record<string, TemplateFamilyFieldMatchPlanV1>;
  variantImports: Record<string, TemplateFamilyVariantImportReportV1>;
  renderValidation: Record<string, TemplateFamilyVariantRenderValidationV1>;
  previewVariantId: string | null;
  busy: boolean;
  canContinue: boolean;
  error: { code: string; message: string } | null;
  completion: TemplateFamilyImportConfirmationV1 | null;
}

export interface TemplateFamilyConfirmationLoadResultV1 {
  applied: boolean;
  stale: boolean;
  integrityValid: boolean;
  snapshot: TemplateFamilySessionSnapshotV1;
}

export interface TemplateFamilyImportZipInputV1 {
  bytes: ArrayBuffer;
  sourceName: string;
  figmaUrl?: string;
  title?: string;
}

export interface TemplateFamilyImportWizardOptionsV1 {
  familySession?: TemplateFamilySessionV1;
  assetStorage?: AssetStorageAdapter;
  fontRegistry?: ManagedFontRegistry | null;
  idFactory?: (kind: "family" | "field" | "variant", seed: string) => string;
  now?: () => string;
  importPackage?: typeof runTemplatePackageImportPipeline;
}

export interface TemplateFamilyImportWizardV1 {
  readonly familySession: TemplateFamilySessionV1;
  getSnapshot(): TemplateFamilyImportWizardSnapshotV1;
  subscribe(listener: () => void): () => void;
  loadFamily(
    family: TemplateFamilyV1,
    content?: TemplateFamilyContentStateV1,
  ): TemplateFamilyImportWizardSnapshotV1;
  loadFirstZip(
    input: TemplateFamilyImportZipInputV1,
  ): Promise<TemplateFamilyImportWizardSnapshotV1>;
  addVariant(
    input: TemplateFamilyImportZipInputV1,
  ): Promise<TemplateFamilyImportWizardSnapshotV1>;
  replaceFamily(family: TemplateFamilyV1): TemplateFamilyImportWizardSnapshotV1;
  replaceContent(
    content: TemplateFamilyContentStateV1,
  ): TemplateFamilyImportWizardSnapshotV1;
  selectPreviewVariant(variantId: string): TemplateFamilyImportWizardSnapshotV1;
  publishRenderValidation(
    report: TemplateFamilyVariantRenderValidationV1,
  ): TemplateFamilyImportWizardSnapshotV1;
  next(): TemplateFamilyImportWizardSnapshotV1;
  back(): TemplateFamilyImportWizardSnapshotV1;
  confirm(): Promise<TemplateFamilyImportConfirmationV1>;
  cancel(): TemplateFamilyImportWizardSnapshotV1;
  dispose(): void;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
}

async function digestValue(value: unknown): Promise<TemplateFamilyDigestV1> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Template Family integrity requires the Web Crypto API.");
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(stableValue(value))),
  );
  return {
    schemaVersion: TEMPLATE_FAMILY_DIGEST_SCHEMA_VERSION,
    algorithm: "sha-256",
    value: Array.from(new Uint8Array(digest))
      .map((entry) => entry.toString(16).padStart(2, "0"))
      .join(""),
  };
}

export function createTemplateFamilyDigest(input: {
  family: TemplateFamilyV1;
  content: TemplateFamilyContentStateV1;
  sharedImageAssets?: TemplatePackageV1["assets"];
}): Promise<TemplateFamilyDigestV1> {
  return digestValue({
    family: input.family,
    content: input.content,
    sharedImageAssets: input.sharedImageAssets ?? {},
  });
}

export async function verifyTemplateFamilyImportConfirmation(
  confirmation: TemplateFamilyImportConfirmationV1,
): Promise<boolean> {
  try {
    if (
      confirmation.schemaVersion !== TEMPLATE_FAMILY_IMPORT_CONFIRMATION_SCHEMA_VERSION ||
      typeof confirmation.sdkVersion !== "string" || !confirmation.sdkVersion.trim()
    ) return false;
    const family = parseTemplateFamilyV1(confirmation.family);
    const content = parseTemplateFamilyContentStateV1(confirmation.content);
    const familyDigest = await createTemplateFamilyDigest({
      family,
      content,
      sharedImageAssets: confirmation.sharedImageAssets,
    });
    if (familyDigest.value !== confirmation.familyDigest.value) return false;
    for (const variant of family.variants) {
      const expected = confirmation.variantDigests[variant.id];
      if (!expected) return false;
      const actual = await createTemplatePackageDigest(variant.packageValue);
      if (actual.value !== expected.value) return false;
    }
    return validateTemplateFamily(family, content).definitionValid;
  } catch {
    return false;
  }
}

export async function loadTemplateFamilyImportConfirmation(
  session: TemplateFamilySessionV1,
  confirmation: TemplateFamilyImportConfirmationV1,
  expectedOperationRevision = session.getSnapshot().operationRevision,
): Promise<TemplateFamilyConfirmationLoadResultV1> {
  const integrityValid = await verifyTemplateFamilyImportConfirmation(confirmation);
  if (session.getSnapshot().operationRevision !== expectedOperationRevision) {
    return {
      applied: false,
      stale: true,
      integrityValid,
      snapshot: session.getSnapshot(),
    };
  }
  if (!integrityValid) {
    return {
      applied: false,
      stale: false,
      integrityValid: false,
      snapshot: session.getSnapshot(),
    };
  }
  const loaded = session.load({
    family: confirmation.family,
    content: confirmation.content,
    sharedImageAssets: confirmation.sharedImageAssets,
    expectedOperationRevision,
  });
  return {
    applied: loaded.applied,
    stale: loaded.stale,
    integrityValid: true,
    snapshot: loaded.snapshot,
  };
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(freeze);
  }
  return value;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function renderInputChanged(
  previousFamily: TemplateFamilyV1,
  nextFamily: TemplateFamilyV1,
  variantId: string,
): boolean {
  if (previousFamily.id !== nextFamily.id) return true;
  if (JSON.stringify(previousFamily.fields) !== JSON.stringify(nextFamily.fields)) return true;
  const previousVariant = previousFamily.variants.find((variant) => variant.id === variantId);
  const nextVariant = nextFamily.variants.find((variant) => variant.id === variantId);
  if (!previousVariant || !nextVariant) return true;
  return JSON.stringify({
    packageDigest: previousVariant.source.packageDigest,
    fontRequirements: previousVariant.packageValue.fontRequirements,
    bindings: previousVariant.bindings,
    ruleOverrides: previousVariant.ruleOverrides,
  }) !== JSON.stringify({
    packageDigest: nextVariant.source.packageDigest,
    fontRequirements: nextVariant.packageValue.fontRequirements,
    bindings: nextVariant.bindings,
    ruleOverrides: nextVariant.ruleOverrides,
  });
}

export function createTemplateFamilyImportWizard(
  options: TemplateFamilyImportWizardOptionsV1 = {},
): TemplateFamilyImportWizardV1 {
  const familySession = options.familySession ?? createTemplateFamilySession({
    assetStorage: options.assetStorage,
    ...(Object.prototype.hasOwnProperty.call(options, "fontRegistry")
      ? { fontRegistry: options.fontRegistry }
      : {}),
  });
  const listeners = new Set<() => void>();
  let disposed = false;
  let operationRevision = 0;
  const idFactory = options.idFactory ?? ((kind: string) =>
    `${kind}:${crypto.randomUUID()}`);
  const now = options.now ?? (() => new Date().toISOString());
  const runImport = options.importPackage ?? runTemplatePackageImportPipeline;
  let snapshot: TemplateFamilyImportWizardSnapshotV1 = {
    schemaVersion: TEMPLATE_FAMILY_IMPORT_WIZARD_SCHEMA_VERSION,
    status: "active",
    revision: 0,
    operationRevision,
    activeStep: "family-variants",
    family: null,
    content: null,
    validation: null,
    matchPlans: {},
    variantImports: {},
    renderValidation: {},
    previewVariantId: null,
    busy: false,
    canContinue: false,
    error: null,
    completion: null,
  };

  const assertActive = () => {
    if (disposed) throw new Error("TemplateFamilyImportWizard has been disposed.");
  };
  const stepCanContinue = (
    value: TemplateFamilyImportWizardSnapshotV1,
  ): boolean => {
    if (!value.family || !value.content || value.busy) return false;
    if (value.activeStep === "family-variants") return value.family.variants.length > 0;
    if (value.activeStep === "field-matches") {
      return value.validation?.issues.every((item) =>
        !item.code.startsWith("family.binding") &&
        item.code !== "family.field-unbound" &&
        item.code !== "family.variant-field-unbound"
      ) ?? false;
    }
    if (value.activeStep === "variant-groups") {
      return value.validation?.issues.every((item) =>
        !item.code.startsWith("family.group")
      ) ?? false;
    }
    if (
      value.activeStep === "common-rules" ||
      value.activeStep === "variant-overrides"
    ) return value.validation?.definitionValid ?? false;
    if (value.activeStep === "validation-preview") {
      return value.validation?.definitionValid === true &&
        value.family.variants.every((variant) => {
          const status = value.renderValidation[variant.id]?.status;
          return status === "ready" || status === "warning";
        });
    }
    return value.validation?.definitionValid ?? false;
  };
  const publish = (
    patch: Partial<Omit<TemplateFamilyImportWizardSnapshotV1, "schemaVersion" | "revision">>,
  ) => {
    const next = {
      ...snapshot,
      ...patch,
      schemaVersion: TEMPLATE_FAMILY_IMPORT_WIZARD_SCHEMA_VERSION,
      revision: snapshot.revision + 1,
      operationRevision,
    };
    next.canContinue = stepCanContinue(next);
    snapshot = next;
    listeners.forEach((listener) => listener());
    return snapshot;
  };
  const synchronizeFamilySession = (
    family: TemplateFamilyV1,
    content: TemplateFamilyContentStateV1,
    previewVariantId: string | null,
  ) => {
    const validation = validateTemplateFamily(family, content);
    if (!validation.definitionValid) return validation;
    const selected = previewVariantId && family.variants.some((item) => item.id === previewVariantId)
      ? previewVariantId
      : family.variants[0]?.id;
    if (!selected) return validation;
    familySession.load({ family, content, selectedVariantId: selected });
    return validation;
  };
  const importPackage = async (input: TemplateFamilyImportZipInputV1) => {
    const result = await runImport({
      format: "zip",
      buffer: input.bytes,
      sourceName: input.sourceName,
      figmaUrl: input.figmaUrl,
      assetStorage: options.assetStorage,
      ...(Object.prototype.hasOwnProperty.call(options, "fontRegistry")
        ? { fontRegistry: options.fontRegistry }
        : {}),
    });
    if (!result.package || !result.validation?.valid) {
      throw new Error(
        result.diagnostics.find((item) => item.severity === "error")?.message ??
          "The TemplatePackage ZIP is not importable.",
      );
    }
    return {
      packageValue: result.package,
      validation: createTemplateImportValidationReport({
        diagnostics: result.diagnostics,
        validation: result.validation,
        loadedSource: result.loadedSource,
        layeredDiagnostics: result.layeredDiagnostics,
      }),
      layeredDiagnostics: result.layeredDiagnostics,
      digest: await createTemplatePackageDigest(result.package),
    };
  };

  const api: TemplateFamilyImportWizardV1 = {
    familySession,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      assertActive();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    loadFamily(familyInput, contentInput) {
      assertActive();
      operationRevision += 1;
      const family = structuredClone(familyInput);
      const content = contentInput
        ? structuredClone(contentInput)
        : {
            schemaVersion: TEMPLATE_FAMILY_CONTENT_SCHEMA_VERSION,
            familyId: family.id,
            revision: 0,
            values: Object.fromEntries(
              family.fields.map((field) => [field.id, structuredClone(field.defaultValue)]),
            ),
          } satisfies TemplateFamilyContentStateV1;
      const validation = validateTemplateFamily(family, content);
      const previewVariantId = family.variants[0]?.id ?? null;
      if (validation.definitionValid && previewVariantId) {
        familySession.load({ family, content, selectedVariantId: previewVariantId });
      }
      return publish({
        status: "active",
        activeStep: "family-variants",
        family,
        content,
        validation,
        matchPlans: {},
        variantImports: {},
        renderValidation: Object.fromEntries(family.variants.map((variant) => [
          variant.id,
          { variantId: variant.id, status: "not-run", issues: [] },
        ])),
        previewVariantId,
        busy: false,
        error: null,
        completion: null,
      });
    },
    async loadFirstZip(input) {
      assertActive();
      const candidate = ++operationRevision;
      publish({ busy: true, error: null, completion: null });
      try {
        const imported = await importPackage(input);
        if (disposed || candidate !== operationRevision) return snapshot;
        const familyId = idFactory("family", input.sourceName);
        const variantId = idFactory("variant", input.sourceName);
        const created = createTemplateFamilyFromPackage({
          familyId,
          familyTitle: input.title?.trim() || imported.packageValue.name,
          variantId,
          variantTitle: input.title?.trim() || imported.packageValue.name,
          packageValue: imported.packageValue,
          source: {
            sourceName: input.sourceName,
            figmaUrl: input.figmaUrl,
            importedAt: now(),
            packageDigest: imported.digest.value,
          },
          idFactory: (kind, seed) => idFactory(kind === "field" ? "field" : kind as "family" | "variant", seed),
        });
        const validation = validateTemplateFamily(created.family, created.content);
        familySession.load({ family: created.family, content: created.content });
        return publish({
          status: "active",
          activeStep: "family-variants",
          family: created.family,
          content: created.content,
          validation,
          matchPlans: {},
          variantImports: {
            [variantId]: {
              variantId,
              sourceName: input.sourceName,
              importValidation: imported.validation,
              layeredDiagnostics: imported.layeredDiagnostics,
              packageDigest: imported.digest,
            },
          },
          renderValidation: {
            [variantId]: { variantId, status: "not-run", issues: [] },
          },
          previewVariantId: variantId,
          busy: false,
          error: null,
        });
      } catch (error) {
        if (disposed || candidate !== operationRevision) return snapshot;
        return publish({
          busy: false,
          error: { code: "family-import.failed", message: errorMessage(error, "The ZIP could not be imported.") },
        });
      }
    },
    async addVariant(input) {
      assertActive();
      if (!snapshot.family || !snapshot.content) {
        throw new Error("Import the first family ZIP before adding a variant.");
      }
      const candidate = ++operationRevision;
      publish({ busy: true, error: null });
      try {
        const imported = await importPackage(input);
        if (disposed || candidate !== operationRevision) return snapshot;
        const variantId = idFactory("variant", input.sourceName);
        const matchPlan = planTemplateFamilyFieldMatches(snapshot.family.fields, imported.packageValue);
        const variant: TemplateFamilyVariantV1 = {
          id: variantId,
          title: input.title?.trim() || imported.packageValue.name,
          packageValue: imported.packageValue,
          source: {
            type: "package-zip",
            sourceName: input.sourceName,
            figmaUrl: input.figmaUrl,
            importedAt: now(),
            packageDigest: imported.digest.value,
          },
          bindings: matchPlan.automaticBindings,
          ruleOverrides: {},
          groupAssignments: {},
        };
        const family = structuredClone(snapshot.family);
        family.variants.push(variant);
        const validation = validateTemplateFamily(family, snapshot.content);
        if (validation.definitionValid) {
          familySession.load({
            family,
            content: snapshot.content,
            selectedVariantId: snapshot.previewVariantId ?? family.variants[0]?.id,
          });
        }
        return publish({
          family,
          validation,
          matchPlans: { ...snapshot.matchPlans, [variantId]: matchPlan },
          variantImports: {
            ...snapshot.variantImports,
            [variantId]: {
              variantId,
              sourceName: input.sourceName,
              importValidation: imported.validation,
              layeredDiagnostics: imported.layeredDiagnostics,
              packageDigest: imported.digest,
            },
          },
          renderValidation: {
            ...snapshot.renderValidation,
            [variantId]: { variantId, status: "not-run", issues: [] },
          },
          busy: false,
          error: null,
        });
      } catch (error) {
        if (disposed || candidate !== operationRevision) return snapshot;
        return publish({
          busy: false,
          error: { code: "family-variant-import.failed", message: errorMessage(error, "The variant ZIP could not be imported.") },
        });
      }
    },
    replaceFamily(family) {
      assertActive();
      if (!snapshot.family || !snapshot.content) {
        throw new Error("Import the first family ZIP before editing it.");
      }
      operationRevision += 1;
      const validation = synchronizeFamilySession(family, snapshot.content, snapshot.previewVariantId);
      const renderValidation = Object.fromEntries(
        family.variants.map((variant) => {
          const current = snapshot.renderValidation[variant.id];
          if (!current) {
            return [variant.id, { variantId: variant.id, status: "not-run" as const, issues: [] }];
          }
          return [
            variant.id,
            renderInputChanged(snapshot.family!, family, variant.id)
              ? { ...current, status: "stale" as const }
              : current,
          ];
        }),
      );
      return publish({
        status: "active",
        family: structuredClone(family),
        validation,
        renderValidation,
        error: null,
        completion: null,
      });
    },
    replaceContent(content) {
      assertActive();
      if (!snapshot.family) throw new Error("Import the first family ZIP before editing content.");
      operationRevision += 1;
      const validation = synchronizeFamilySession(snapshot.family, content, snapshot.previewVariantId);
      return publish({
        content: structuredClone(content),
        validation,
        renderValidation: Object.fromEntries(
          snapshot.family.variants.map((variant) => {
            const current = snapshot.renderValidation[variant.id];
            return [variant.id, current
              ? { ...current, status: "stale" as const }
              : { variantId: variant.id, status: "not-run" as const, issues: [] }];
          }),
        ),
        error: null,
      });
    },
    selectPreviewVariant(variantId) {
      assertActive();
      if (!snapshot.family?.variants.some((variant) => variant.id === variantId)) {
        throw new Error(`Family variant "${variantId}" was not found.`);
      }
      operationRevision += 1;
      if (snapshot.validation?.definitionValid) familySession.selectVariant(variantId);
      return publish({ previewVariantId: variantId });
    },
    publishRenderValidation(report) {
      assertActive();
      if (!snapshot.family?.variants.some((variant) => variant.id === report.variantId)) {
        throw new Error(`Family variant "${report.variantId}" was not found.`);
      }
      const current = snapshot.renderValidation[report.variantId];
      if (
        current?.status === report.status &&
        current.sessionRevision === report.sessionRevision &&
        JSON.stringify(current.issues) === JSON.stringify(report.issues)
      ) return snapshot;
      return publish({
        renderValidation: { ...snapshot.renderValidation, [report.variantId]: structuredClone(report) },
      });
    },
    next() {
      assertActive();
      if (!snapshot.canContinue) return snapshot;
      const index = TEMPLATE_FAMILY_IMPORT_STEPS.indexOf(snapshot.activeStep);
      return publish({
        activeStep: TEMPLATE_FAMILY_IMPORT_STEPS[Math.min(index + 1, TEMPLATE_FAMILY_IMPORT_STEPS.length - 1)],
      });
    },
    back() {
      assertActive();
      const index = TEMPLATE_FAMILY_IMPORT_STEPS.indexOf(snapshot.activeStep);
      return publish({ activeStep: TEMPLATE_FAMILY_IMPORT_STEPS[Math.max(0, index - 1)] });
    },
    async confirm() {
      assertActive();
      if (
        snapshot.activeStep !== "confirmation" ||
        !snapshot.family ||
        !snapshot.content ||
        !snapshot.validation?.definitionValid ||
        !snapshot.canContinue
      ) {
        throw new Error("Complete family validation and every variant preview before confirmation.");
      }
      const candidate = ++operationRevision;
      publish({ busy: true, error: null });
      const family = structuredClone(snapshot.family);
      const content = structuredClone(snapshot.content);
      const sharedImageAssets = structuredClone(familySession.getSnapshot().sharedImageAssets);
      const familyDigest = await createTemplateFamilyDigest({ family, content, sharedImageAssets });
      const variantDigests = Object.fromEntries(
        await Promise.all(family.variants.map(async (variant) => [
          variant.id,
          await createTemplatePackageDigest(variant.packageValue),
        ])),
      );
      if (disposed || candidate !== operationRevision) {
        throw new Error("Family confirmation became stale while integrity was calculated.");
      }
      const confirmation: TemplateFamilyImportConfirmationV1 = {
        schemaVersion: TEMPLATE_FAMILY_IMPORT_CONFIRMATION_SCHEMA_VERSION,
        sdkVersion: TEMPLATE_FAMILY_SDK_VERSION,
        confirmedAt: now(),
        family,
        content,
        sharedImageAssets,
        familyDigest,
        variantDigests,
        validation: validateTemplateFamily(family, content),
      };
      freeze(confirmation);
      publish({ status: "completed", busy: false, completion: confirmation });
      return confirmation;
    },
    cancel() {
      assertActive();
      operationRevision += 1;
      return publish({ status: "cancelled", busy: false });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      operationRevision += 1;
      familySession.dispose();
      snapshot = { ...snapshot, status: "disposed", busy: false, operationRevision };
      listeners.forEach((listener) => listener());
      listeners.clear();
    },
  };
  return api;
}

import {
  editableFieldRuleKey,
  replacePackageEditableFieldRules,
} from "../../../packages/template-core/src/editor/packageFieldRules";
import {
  getPackageEditorFieldTargetStatuses,
  getPackageEditorFieldWarnings,
  type PackageEditorFieldWarning,
} from "../../../packages/template-core/src/editor/packageFieldBindings";
import type {
  EditableFieldBinding,
  PackageEditableFieldType,
  PackageFieldBehavior,
  PackageFieldConstraints,
  TemplatePackageFontRequirement,
  TemplatePackageV1,
} from "../../../packages/template-core/src/types";
import { fontUsesPlatformEmojiFallback } from "../../../packages/template-core/src/resolved/fontCharacterCoverage";
import {
  isExactFontRequirementResolved,
} from "../fonts/exactFontSetup";
import type { ResolvedProductRenderIdentityV1 } from "../render/productRenderIdentity";
import {
  createTemplateSession,
  type TemplateSessionOptions,
  type TemplateSessionSnapshotV1,
  type TemplateSessionV1,
} from "../session/templateSession";
import type {
  PackageDiagnostic,
  TemplatePackageValidationResult,
} from "../packageDiagnostics";
import type { TemplateImportValidationReportV1 } from "./templateImportValidation";
import {
  createTemplatePackageDigest,
  createTemplatePackageFingerprint,
  type TemplatePackageDigestV1,
} from "./templateImportIntegrity";

export const TEMPLATE_IMPORT_WIZARD_SCHEMA_VERSION =
  "template-import-wizard-snapshot-v1" as const;
export const TEMPLATE_IMPORT_CONFIRMATION_SCHEMA_VERSION =
  "template-import-confirmation-v1" as const;
export const TEMPLATE_SDK_VERSION = "0.4.0" as const;

export const TEMPLATE_IMPORT_WIZARD_STEPS = [
  "zip-import",
  "package-validation",
  "font-validation",
  "render-validation",
  "field-rules",
  "confirmation",
  "completed",
] as const;

export type TemplateImportWizardStepId =
  (typeof TEMPLATE_IMPORT_WIZARD_STEPS)[number];

export type TemplateImportStepStatus =
  | "idle"
  | "pending"
  | "running"
  | "ready"
  | "warning"
  | "blocked"
  | "error"
  | "confirmed";

export interface TemplateImportIssueV1 {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  fieldId?: string;
  requirementId?: string;
  details?: Record<string, unknown>;
}

export interface TemplateImportStepSnapshotV1 {
  id: TemplateImportWizardStepId;
  status: TemplateImportStepStatus;
  readiness: "not-ready" | "ready" | "stale";
  revision: number;
  blockers: TemplateImportIssueV1[];
  warnings: TemplateImportIssueV1[];
  diagnostics: TemplateImportIssueV1[];
  canContinue: boolean;
  canGoBack: boolean;
}

export interface TemplateImportPackageSummaryV1 {
  packageId: string;
  name: string;
  width: number;
  height: number;
  editableFieldCount: number;
  assetCount: number;
  requiredFontCount: number;
}

export interface TemplateImportFieldWarningV1 {
  code: string;
  message: string;
}

export interface TemplateImportFieldRuleV1 {
  ruleId: string;
  fieldId: string;
  label: string;
  type: PackageEditableFieldType;
  defaultValue: EditableFieldBinding["defaultValue"];
  constraints?: PackageFieldConstraints;
  behavior?: PackageFieldBehavior;
  enabled: boolean;
  order: number;
  helpText?: string;
  targetStatus: "ready" | "missing" | "unsupported";
  warnings: TemplateImportFieldWarningV1[];
  valid: boolean;
}

export interface TemplateImportFieldRulePatchV1 {
  label?: string;
  constraints?: PackageFieldConstraints;
  behavior?: PackageFieldBehavior;
  enabled?: boolean;
  helpText?: string;
}

export interface TemplateImportFontRequirementReportV1 {
  requirementId: string;
  family: string;
  style: string;
  weight: number;
  posture: TemplatePackageFontRequirement["cssStyle"];
  source:
    | "bundled"
    | "managed"
    | "host-adapter"
    | "uploaded"
    | "unresolved";
  status: "ready" | "warning" | "blocked" | "running";
  emojiFallback: boolean;
  fileName?: string;
  binaryHash?: string;
  diagnostics: TemplateImportIssueV1[];
}

export interface TemplateImportFontValidationReportV1 {
  schemaVersion: "template-import-font-validation-v1";
  status: "ready" | "warning" | "blocked" | "running";
  revision: number;
  requirements: TemplateImportFontRequirementReportV1[];
  blockers: TemplateImportIssueV1[];
  warnings: TemplateImportIssueV1[];
}

export interface TemplateImportRenderValidationReportV1 {
  schemaVersion: "template-import-render-validation-v1";
  status:
    | "not-run"
    | "running"
    | "ready"
    | "warning"
    | "blocked"
    | "error"
    | "stale";
  revision: number;
  renderIdentity: ResolvedProductRenderIdentityV1 | null;
  blockers: TemplateImportIssueV1[];
  warnings: TemplateImportIssueV1[];
  diagnostics: TemplateImportIssueV1[];
}

export interface TemplateImportWizardSnapshotV1 {
  schemaVersion: typeof TEMPLATE_IMPORT_WIZARD_SCHEMA_VERSION;
  status: "active" | "cancelled" | "completed" | "disposed";
  revision: number;
  sessionRevision: number;
  activeStep: TemplateImportWizardStepId;
  steps: Record<TemplateImportWizardStepId, TemplateImportStepSnapshotV1>;
  progress: {
    current: number;
    total: number;
    completed: number;
  };
  capabilities: {
    fontAdapter: boolean;
    persistenceAdapter: boolean;
  };
  sourceName: string | null;
  importedAt: string | null;
  packageSummary: TemplateImportPackageSummaryV1 | null;
  importValidation: TemplateImportValidationReportV1 | null;
  packageValidation: TemplatePackageValidationResult | null;
  fontValidation: TemplateImportFontValidationReportV1;
  renderValidation: TemplateImportRenderValidationReportV1;
  fieldRules: TemplateImportFieldRuleV1[];
  diagnostics: TemplateImportIssueV1[];
  busy: boolean;
  error: TemplateImportIssueV1 | null;
  completion: TemplateImportConfirmationV1 | null;
  persistenceReceipt: TemplateImportPersistenceReceiptV1 | null;
}

export interface TemplateFontAdapterRequestV1 {
  requirement: {
    id: string;
    family: string;
    style: string;
    weight: number;
    posture: TemplatePackageFontRequirement["cssStyle"];
    stretch?: string;
    axes?: TemplatePackageFontRequirement["axes"];
    characters: string;
  };
  sourceName: string | null;
}

export interface TemplateFontBinaryV1 {
  bytes: ArrayBuffer;
  mimeType: string;
  fileName?: string;
}

export interface TemplateFontAdapterV1 {
  resolveFont(
    request: TemplateFontAdapterRequestV1,
    context: { signal: AbortSignal },
  ): Promise<TemplateFontBinaryV1 | null>;
}

export interface TemplateImportPersistenceReceiptV1 {
  id?: string;
  metadata?: Record<string, unknown>;
}

export interface TemplateImportPersistenceAdapterV1 {
  persistConfirmedTemplate(
    confirmation: TemplateImportConfirmationV1,
    context: { signal: AbortSignal },
  ): Promise<TemplateImportPersistenceReceiptV1>;
}

export interface TemplateImportConfirmationV1 {
  schemaVersion: typeof TEMPLATE_IMPORT_CONFIRMATION_SCHEMA_VERSION;
  sdkVersion: typeof TEMPLATE_SDK_VERSION;
  packageFingerprint: string;
  /**
   * New confirmations include a SHA-256 content digest. It remains optional so
   * an otherwise valid SDK 0.3.0 confirmation can be inspected and reopened.
   */
  packageDigest?: TemplatePackageDigestV1;
  sourceName: string;
  importedAt: string;
  importedPackage: TemplatePackageV1;
  packageValue: TemplatePackageV1;
  editableFields: TemplateImportFieldRuleV1[];
  configuredFieldRules: TemplateImportFieldRuleV1[];
  importValidation: TemplateImportValidationReportV1;
  validation: TemplatePackageValidationResult;
  fontValidation: TemplateImportFontValidationReportV1;
  renderValidation: TemplateImportRenderValidationReportV1;
  renderIdentity: ResolvedProductRenderIdentityV1;
  diagnostics: TemplateImportIssueV1[];
  blockers: TemplateImportIssueV1[];
  warnings: TemplateImportIssueV1[];
}

export interface TemplateImportWizardOptionsV1 {
  session?: TemplateSessionV1;
  sessionOptions?: TemplateSessionOptions;
  fontAdapter?: TemplateFontAdapterV1;
  persistenceAdapter?: TemplateImportPersistenceAdapterV1;
  now?: () => Date;
}

export interface TemplateImportWizardControllerV1 {
  readonly session: TemplateSessionV1;
  getSnapshot(): TemplateImportWizardSnapshotV1;
  subscribe(listener: () => void): () => void;
  loadZip(input: {
    bytes: ArrayBuffer;
    sourceName?: string;
  }): Promise<TemplateImportWizardSnapshotV1>;
  next(): TemplateImportWizardSnapshotV1;
  back(): TemplateImportWizardSnapshotV1;
  updateFieldRule(
    ruleId: string,
    patch: TemplateImportFieldRulePatchV1,
  ): TemplateImportWizardSnapshotV1;
  reorderFieldRule(
    ruleId: string,
    nextIndex: number,
  ): TemplateImportWizardSnapshotV1;
  uploadFont(
    requirementId: string,
    input: TemplateFontBinaryV1,
  ): Promise<TemplateImportWizardSnapshotV1>;
  publishRenderValidation(input: {
    sessionRevision: number;
    identity: ResolvedProductRenderIdentityV1;
    diagnostics?: TemplateImportIssueV1[];
  }): TemplateImportWizardSnapshotV1;
  confirm(): Promise<TemplateImportConfirmationV1>;
  restart(): TemplateImportWizardSnapshotV1;
  cancel(): TemplateImportWizardSnapshotV1;
  dispose(): void;
}

interface FieldRuleDraft {
  field: EditableFieldBinding;
  view: TemplateImportFieldRuleV1;
}

function issueFromDiagnostic(
  diagnostic: PackageDiagnostic,
): TemplateImportIssueV1 {
  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    message: diagnostic.message,
    details: {
      category: diagnostic.category,
      path: diagnostic.path,
      nodeId: diagnostic.nodeId,
      ...diagnostic.details,
    },
  };
}

function warningIssue(warning: PackageEditorFieldWarning): TemplateImportIssueV1 {
  return {
    code: warning.code,
    severity: "warning",
    message: warning.message,
    fieldId: warning.fieldId,
  };
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function ruleId(field: EditableFieldBinding): string {
  return `field-rule:${stableHash(editableFieldRuleKey(field))}`;
}

function packageSummary(
  packageValue: TemplatePackageV1 | null,
): TemplateImportPackageSummaryV1 | null {
  if (!packageValue) return null;
  return {
    packageId: packageValue.packageId,
    name: packageValue.name,
    width: packageValue.canvas.width,
    height: packageValue.canvas.height,
    editableFieldCount: packageValue.editableFields.length,
    assetCount: Object.keys(packageValue.assets).length,
    requiredFontCount: packageValue.fontRequirements?.length ?? 0,
  };
}

function cloneIssue(issue: TemplateImportIssueV1): TemplateImportIssueV1 {
  return structuredClone(issue);
}

function freezeConfirmation(
  confirmation: TemplateImportConfirmationV1,
): TemplateImportConfirmationV1 {
  const freeze = (value: unknown): void => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  };
  freeze(confirmation);
  return confirmation;
}

function initialFontReport(): TemplateImportFontValidationReportV1 {
  return {
    schemaVersion: "template-import-font-validation-v1",
    status: "ready",
    revision: 0,
    requirements: [],
    blockers: [],
    warnings: [],
  };
}

function initialRenderReport(): TemplateImportRenderValidationReportV1 {
  return {
    schemaVersion: "template-import-render-validation-v1",
    status: "not-run",
    revision: 0,
    renderIdentity: null,
    blockers: [],
    warnings: [],
    diagnostics: [],
  };
}

export function createTemplateImportWizard(
  options: TemplateImportWizardOptionsV1 = {},
): TemplateImportWizardControllerV1 {
  const ownsSession = !options.session;
  const session = options.session ?? createTemplateSession(options.sessionOptions);
  const now = options.now ?? (() => new Date());
  const listeners = new Set<() => void>();
  let disposed = false;
  let wizardRevision = 0;
  let status: TemplateImportWizardSnapshotV1["status"] = "active";
  let activeStep: TemplateImportWizardStepId = "zip-import";
  let sourceName: string | null = null;
  let importedAt: string | null = null;
  let fieldDrafts: FieldRuleDraft[] = [];
  let fontSources = new Map<string, TemplateImportFontRequirementReportV1["source"]>();
  let fontBusy = new Set<string>();
  let fontErrors = new Map<string, TemplateImportIssueV1>();
  let renderValidation = initialRenderReport();
  let busy = false;
  let error: TemplateImportIssueV1 | null = null;
  let completion: TemplateImportConfirmationV1 | null = null;
  let persistenceReceipt: TemplateImportPersistenceReceiptV1 | null = null;
  let operationController = new AbortController();
  let lastSessionRevision = session.getSnapshot().revision;
  let snapshotDirty = true;
  let cachedSnapshot: TemplateImportWizardSnapshotV1 | null = null;

  const assertActive = () => {
    if (disposed) throw new Error("TemplateImportWizard has been disposed.");
  };
  const notify = () => {
    wizardRevision += 1;
    snapshotDirty = true;
    listeners.forEach((listener) => listener());
  };
  const abortPending = () => {
    operationController.abort();
    operationController = new AbortController();
  };
  const sessionSnapshot = () => session.getSnapshot();

  const initializeFieldDrafts = (snapshot: TemplateSessionSnapshotV1) => {
    if (!snapshot.workingPackage) {
      fieldDrafts = [];
      return;
    }
    const targetStatuses = getPackageEditorFieldTargetStatuses(
      snapshot.workingPackage,
    );
    const warnings = getPackageEditorFieldWarnings(snapshot.workingPackage);
    fieldDrafts = snapshot.editableFields.map((field, order) => {
      const target = targetStatuses.find(
        (candidate) =>
          editableFieldRuleKey(candidate.field) === editableFieldRuleKey(field),
      );
      const fieldWarnings = warnings.filter(
        (warning) =>
          warning.fieldId === field.id &&
          (warning.nodeId === undefined || warning.nodeId === field.nodeId),
      );
      return {
        field: structuredClone(field),
        view: {
          ruleId: ruleId(field),
          fieldId: field.id,
          label: field.label?.trim() || field.id,
          type: field.type,
          defaultValue: structuredClone(field.defaultValue),
          constraints: field.constraints
            ? structuredClone(field.constraints)
            : undefined,
          behavior: field.behavior
            ? structuredClone(field.behavior)
            : undefined,
          enabled: true,
          order,
          targetStatus: !target?.targetExists
            ? "missing"
            : !target.propertySupported
              ? "unsupported"
              : "ready",
          warnings: fieldWarnings.map((warning) => ({
            code: warning.code,
            message: warning.message,
          })),
          valid: Boolean(target?.targetExists && target.propertySupported),
        },
      };
    });
  };

  const buildFontReport = (): TemplateImportFontValidationReportV1 => {
    const current = sessionSnapshot();
    const packageValue = current.workingPackage;
    if (!packageValue) return initialFontReport();
    const requirements = (packageValue.fontRequirements ?? []).map(
      (requirement): TemplateImportFontRequirementReportV1 => {
        const resolved = isExactFontRequirementResolved(
          packageValue,
          requirement,
        );
        const adapterError = fontErrors.get(requirement.id);
        const asset = requirement.assetId
          ? packageValue.assets[requirement.assetId]
          : undefined;
        const emojiFallback = fontUsesPlatformEmojiFallback(
          requirement.family,
          requirement.characters,
        );
        const diagnostics = adapterError
          ? [adapterError]
          : resolved && emojiFallback
            ? [{
                code: "font.emoji-platform-fallback",
                severity: "info" as const,
                message:
                  "Emoji in this template will use the device emoji font.",
                requirementId: requirement.id,
              }]
            : !resolved
              ? [{
                  code: "font.exact-face-required",
                  severity: "error" as const,
                  message: `${requirement.family} ${requirement.weight} requires an exact font file.`,
                  requirementId: requirement.id,
                }]
              : [];
        return {
          requirementId: requirement.id,
          family: requirement.family,
          style: requirement.style,
          weight: requirement.weight,
          posture: requirement.cssStyle,
          source: resolved
            ? fontSources.get(requirement.id) ??
              (asset?.source === "embedded" ? "bundled" : "managed")
            : "unresolved",
          status: fontBusy.has(requirement.id)
            ? "running"
            : resolved
              ? emojiFallback
                ? "warning"
                : "ready"
              : "blocked",
          emojiFallback,
          fileName:
            typeof asset?.extensions?.fileName === "string"
              ? asset.extensions.fileName
              : undefined,
          binaryHash: requirement.resolution?.binaryHash,
          diagnostics,
        };
      },
    );
    const blockers = requirements.flatMap((requirement) =>
      requirement.status === "blocked"
        ? requirement.diagnostics.filter(
            (diagnostic) => diagnostic.severity === "error",
          )
        : [],
    );
    const warnings = requirements.flatMap((requirement) =>
      requirement.diagnostics.filter(
        (diagnostic) => diagnostic.severity !== "error",
      ),
    );
    return {
      schemaVersion: "template-import-font-validation-v1",
      status: requirements.some((requirement) => requirement.status === "running")
        ? "running"
        : blockers.length
          ? "blocked"
          : warnings.length
            ? "warning"
            : "ready",
      revision: current.revision,
      requirements,
      blockers,
      warnings,
    };
  };

  const applyFieldDrafts = () => {
    const current = sessionSnapshot();
    if (!current.workingPackage) return;
    const enabledFields = fieldDrafts
      .filter((draft) => draft.view.enabled)
      .map((draft) => ({
        ...structuredClone(draft.field),
        label: draft.view.label.trim() || undefined,
        constraints: draft.view.constraints
          ? structuredClone(draft.view.constraints)
          : undefined,
        behavior: draft.view.behavior
          ? structuredClone(draft.view.behavior)
          : undefined,
      }));
    const update = replacePackageEditableFieldRules(
      current.workingPackage,
      enabledFields,
    );
    const result = session.replaceWorkingPackage(
      update.packageValue,
      current.revision,
    );
    if (!result.applied) {
      error = {
        code: result.stale
          ? "field-rules.stale"
          : "field-rules.invalid",
        severity: "error",
        message:
          result.diagnostics[0]?.message ??
          "The field rules could not be applied.",
      };
    }
  };

  const fieldRuleBlockers = (): TemplateImportIssueV1[] =>
    fieldDrafts
      .filter((draft) => draft.view.enabled && !draft.view.valid)
      .map((draft) => ({
        code: "field-rule.target-unavailable",
        severity: "error" as const,
        message: `${draft.view.label} does not have a supported target.`,
        fieldId: draft.view.fieldId,
      }));

  const updateForSessionRevision = () => {
    const current = sessionSnapshot();
    if (current.revision === lastSessionRevision) return;
    lastSessionRevision = current.revision;
    if (
      renderValidation.renderIdentity &&
      renderValidation.revision !== current.revision
    ) {
      renderValidation = {
        ...initialRenderReport(),
        status: "stale",
        revision: current.revision,
      };
    }
  };

  const stepSnapshot = (
    id: TemplateImportWizardStepId,
    index: number,
    fontValidation: TemplateImportFontValidationReportV1,
  ): TemplateImportStepSnapshotV1 => {
    const current = sessionSnapshot();
    const diagnostics = current.diagnostics.map(issueFromDiagnostic);
    let stepStatus: TemplateImportStepStatus = "idle";
    let stepDiagnostics: TemplateImportIssueV1[] = [];
    let blockers: TemplateImportIssueV1[] = [];
    let warnings: TemplateImportIssueV1[] = [];
    let readiness: TemplateImportStepSnapshotV1["readiness"] = "not-ready";

    if (id === "zip-import") {
      stepStatus = current.status === "loading"
        ? "running"
        : sourceName
          ? "ready"
          : error
            ? "error"
            : "idle";
      readiness = sourceName ? "ready" : "not-ready";
      stepDiagnostics = error ? [error] : [];
      blockers = error ? [error] : [];
    } else if (id === "package-validation") {
      const report = current.importValidation;
      stepStatus = current.status === "loading"
        ? "running"
        : report?.status ?? "pending";
      readiness = report?.importable ? "ready" : "not-ready";
      stepDiagnostics = diagnostics;
      blockers = diagnostics.filter((item) => item.severity === "error");
      warnings = diagnostics.filter((item) => item.severity === "warning");
    } else if (id === "font-validation") {
      stepStatus = fontValidation.status;
      readiness = fontValidation.status === "ready" ||
        fontValidation.status === "warning"
        ? "ready"
        : "not-ready";
      blockers = fontValidation.blockers;
      warnings = fontValidation.warnings;
      stepDiagnostics = fontValidation.requirements.flatMap(
        (requirement) => requirement.diagnostics,
      );
    } else if (id === "render-validation") {
      stepStatus = renderValidation.status === "not-run" ||
        renderValidation.status === "stale"
        ? "pending"
        : renderValidation.status;
      readiness = renderValidation.status === "stale"
        ? "stale"
        : renderValidation.status === "ready" ||
            renderValidation.status === "warning"
          ? "ready"
          : "not-ready";
      blockers = renderValidation.blockers;
      warnings = renderValidation.warnings;
      stepDiagnostics = renderValidation.diagnostics;
    } else if (id === "field-rules") {
      warnings = fieldDrafts.flatMap((draft) =>
        draft.view.warnings.map((warning) => ({
          ...warning,
          severity: "warning" as const,
          fieldId: draft.view.fieldId,
        })),
      );
      blockers = fieldRuleBlockers();
      stepDiagnostics = [...blockers, ...warnings];
      stepStatus = blockers.length ? "blocked" : warnings.length ? "warning" : "ready";
      readiness = blockers.length ? "not-ready" : "ready";
    } else if (id === "confirmation") {
      const prerequisiteBlockers = [
        ...(current.importValidation?.importable ? [] : diagnostics.filter(
          (item) => item.severity === "error",
        )),
        ...fontValidation.blockers,
        ...renderValidation.blockers,
        ...fieldRuleBlockers(),
      ];
      blockers = prerequisiteBlockers;
      warnings = [
        ...fontValidation.warnings,
        ...renderValidation.warnings,
      ];
      stepDiagnostics = [...blockers, ...warnings];
      stepStatus = busy
        ? "running"
        : blockers.length
          ? "blocked"
          : warnings.length
            ? "warning"
            : current.validation?.valid
              ? "ready"
              : "pending";
      readiness = blockers.length || !current.validation?.valid
        ? "not-ready"
        : "ready";
    } else {
      stepStatus = completion ? "confirmed" : "idle";
      readiness = completion ? "ready" : "not-ready";
    }

    const canContinue =
      readiness === "ready" &&
      id !== "completed" &&
      !busy;
    return {
      id,
      status: stepStatus,
      readiness,
      revision: wizardRevision,
      blockers: blockers.map(cloneIssue),
      warnings: warnings.map(cloneIssue),
      diagnostics: stepDiagnostics.map(cloneIssue),
      canContinue,
      canGoBack: index > 0 && id !== "completed" && !busy,
    };
  };

  const getSnapshot = (): TemplateImportWizardSnapshotV1 => {
    if (!snapshotDirty && cachedSnapshot) return cachedSnapshot;
    updateForSessionRevision();
    const current = sessionSnapshot();
    const fontValidation = buildFontReport();
    const steps = Object.fromEntries(
      TEMPLATE_IMPORT_WIZARD_STEPS.map((id, index) => [
        id,
        stepSnapshot(id, index, fontValidation),
      ]),
    ) as TemplateImportWizardSnapshotV1["steps"];
    TEMPLATE_IMPORT_WIZARD_STEPS.forEach((id, index) => {
      if (index === 0) return;
      steps[id].canContinue =
        steps[id].canContinue &&
        steps[TEMPLATE_IMPORT_WIZARD_STEPS[index - 1]].readiness === "ready";
    });
    const activeIndex = TEMPLATE_IMPORT_WIZARD_STEPS.indexOf(activeStep);
    const completed = TEMPLATE_IMPORT_WIZARD_STEPS.filter(
      (id) => steps[id].readiness === "ready",
    ).length;
    const allDiagnostics = [
      ...current.diagnostics.map(issueFromDiagnostic),
      ...fontValidation.blockers,
      ...fontValidation.warnings,
      ...renderValidation.diagnostics,
    ];
    cachedSnapshot = {
      schemaVersion: TEMPLATE_IMPORT_WIZARD_SCHEMA_VERSION,
      status,
      revision: wizardRevision,
      sessionRevision: current.revision,
      activeStep,
      steps,
      progress: {
        current: activeIndex + 1,
        total: TEMPLATE_IMPORT_WIZARD_STEPS.length,
        completed,
      },
      capabilities: {
        fontAdapter: Boolean(options.fontAdapter),
        persistenceAdapter: Boolean(options.persistenceAdapter),
      },
      sourceName,
      importedAt,
      packageSummary: packageSummary(current.workingPackage),
      importValidation: current.importValidation,
      packageValidation: current.validation,
      fontValidation,
      renderValidation: structuredClone(renderValidation),
      fieldRules: fieldDrafts.map((draft) => structuredClone(draft.view)),
      diagnostics: allDiagnostics.map(cloneIssue),
      busy,
      error: error ? cloneIssue(error) : null,
      completion,
      persistenceReceipt,
    };
    snapshotDirty = false;
    return cachedSnapshot;
  };

  const sessionUnsubscribe = session.subscribe(() => {
    updateForSessionRevision();
    notify();
  });

  const controller: TemplateImportWizardControllerV1 = {
    session,
    getSnapshot,
    subscribe(listener) {
      assertActive();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async loadZip(input) {
      assertActive();
      abortPending();
      status = "active";
      busy = true;
      error = null;
      completion = null;
      persistenceReceipt = null;
      sourceName = input.sourceName ?? "template-package.zip";
      importedAt = null;
      fieldDrafts = [];
      fontSources = new Map();
      fontBusy = new Set();
      fontErrors = new Map();
      renderValidation = initialRenderReport();
      activeStep = "zip-import";
      notify();
      const operationSignal = operationController.signal;
      const result = await session.loadZip({
        bytes: input.bytes,
        sourceName,
      });
      if (operationSignal.aborted || disposed) return getSnapshot();
      busy = false;
      importedAt = result.status === "ready" ? now().toISOString() : null;
      initializeFieldDrafts(result);
      activeStep = "package-validation";
      notify();

      if (result.status === "ready" && options.fontAdapter) {
        const requirements = result.workingPackage?.fontRequirements ?? [];
        for (const requirement of requirements) {
          if (
            !result.workingPackage ||
            isExactFontRequirementResolved(result.workingPackage, requirement)
          ) {
            continue;
          }
          fontBusy.add(requirement.id);
          notify();
          try {
            const candidate = await options.fontAdapter.resolveFont(
              {
                requirement: {
                  id: requirement.id,
                  family: requirement.family,
                  style: requirement.style,
                  weight: requirement.weight,
                  posture: requirement.cssStyle,
                  stretch: requirement.stretch,
                  axes: requirement.axes,
                  characters: requirement.characters,
                },
                sourceName,
              },
              { signal: operationSignal },
            );
            if (operationSignal.aborted || disposed) return getSnapshot();
            if (candidate) {
              const prepared = await session.uploadFont(
                requirement.id,
                candidate,
              );
              if (prepared.applied) {
                fontSources.set(requirement.id, "host-adapter");
              }
            }
          } catch (adapterError) {
            if (!operationSignal.aborted) {
              fontErrors.set(requirement.id, {
                code: "font.adapter-failed",
                severity: "error",
                message:
                  adapterError instanceof Error
                    ? adapterError.message
                    : "The host font adapter failed.",
                requirementId: requirement.id,
              });
            }
          } finally {
            fontBusy.delete(requirement.id);
            notify();
          }
        }
      }
      return getSnapshot();
    },
    next() {
      assertActive();
      const current = getSnapshot();
      const step = current.steps[activeStep];
      if (!step.canContinue) return current;
      const index = TEMPLATE_IMPORT_WIZARD_STEPS.indexOf(activeStep);
      activeStep = TEMPLATE_IMPORT_WIZARD_STEPS[Math.min(
        TEMPLATE_IMPORT_WIZARD_STEPS.length - 1,
        index + 1,
      )];
      notify();
      return getSnapshot();
    },
    back() {
      assertActive();
      if (busy || activeStep === "completed") return getSnapshot();
      const index = TEMPLATE_IMPORT_WIZARD_STEPS.indexOf(activeStep);
      activeStep = TEMPLATE_IMPORT_WIZARD_STEPS[Math.max(0, index - 1)];
      notify();
      return getSnapshot();
    },
    updateFieldRule(nextRuleId, patch) {
      assertActive();
      const draft = fieldDrafts.find((item) => item.view.ruleId === nextRuleId);
      if (!draft) throw new Error(`Field rule "${nextRuleId}" was not found.`);
      if (Object.prototype.hasOwnProperty.call(patch, "label")) {
        draft.view.label = patch.label?.trim() || draft.view.fieldId;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "constraints")) {
        draft.view.constraints = patch.constraints
          ? structuredClone(patch.constraints)
          : undefined;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "behavior")) {
        draft.view.behavior = patch.behavior
          ? structuredClone(patch.behavior)
          : undefined;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "enabled")) {
        draft.view.enabled = patch.enabled ?? true;
      }
      if (Object.prototype.hasOwnProperty.call(patch, "helpText")) {
        draft.view.helpText = patch.helpText?.trim() || undefined;
      }
      applyFieldDrafts();
      renderValidation = {
        ...initialRenderReport(),
        status: "stale",
        revision: sessionSnapshot().revision,
      };
      notify();
      return getSnapshot();
    },
    reorderFieldRule(nextRuleId, nextIndex) {
      assertActive();
      const currentIndex = fieldDrafts.findIndex(
        (item) => item.view.ruleId === nextRuleId,
      );
      if (currentIndex < 0) {
        throw new Error(`Field rule "${nextRuleId}" was not found.`);
      }
      const bounded = Math.max(
        0,
        Math.min(fieldDrafts.length - 1, Math.trunc(nextIndex)),
      );
      const [draft] = fieldDrafts.splice(currentIndex, 1);
      fieldDrafts.splice(bounded, 0, draft);
      fieldDrafts.forEach((item, index) => {
        item.view.order = index;
      });
      applyFieldDrafts();
      renderValidation = {
        ...initialRenderReport(),
        status: "stale",
        revision: sessionSnapshot().revision,
      };
      notify();
      return getSnapshot();
    },
    async uploadFont(requirementId, input) {
      assertActive();
      fontBusy.add(requirementId);
      fontErrors.delete(requirementId);
      notify();
      try {
        const result = await session.uploadFont(requirementId, input);
        if (result.applied) fontSources.set(requirementId, "uploaded");
      } catch (fontError) {
        fontErrors.set(requirementId, {
          code: "font.upload-rejected",
          severity: "error",
          message:
            fontError instanceof Error
              ? fontError.message
              : "The uploaded font was rejected.",
          requirementId,
        });
      } finally {
        fontBusy.delete(requirementId);
        renderValidation = {
          ...initialRenderReport(),
          status: "stale",
          revision: sessionSnapshot().revision,
        };
        notify();
      }
      return getSnapshot();
    },
    publishRenderValidation(input) {
      assertActive();
      const current = sessionSnapshot();
      if (input.sessionRevision !== current.revision) return getSnapshot();
      const backendDiagnostics =
        current.resolvedTree?.backendDiagnostics.diagnostics ?? [];
      const diagnostics: TemplateImportIssueV1[] = [
        ...input.diagnostics ?? [],
        ...(current.resolvedTree?.warnings ?? []).map((warning) => ({
          code: warning.code,
          severity: "warning" as const,
          message: warning.message,
          details: { feature: warning.feature },
        })),
        ...backendDiagnostics.map((diagnostic) => ({
          code: `backend.${diagnostic.capabilityId.toLowerCase()}`,
          severity:
            current.resolvedTree?.nodes[diagnostic.nodeId]?.backendDecision
              .exportSafety === "blocked"
              ? "error" as const
              : "warning" as const,
          message: diagnostic.explanation,
          details: {
            capabilityId: diagnostic.capabilityId,
            supportLevel: diagnostic.supportLevel,
            runtimeOwner: diagnostic.runtimeOwner,
          },
        })),
      ];
      const blockers = diagnostics.filter(
        (diagnostic) => diagnostic.severity === "error",
      );
      const warnings = diagnostics.filter(
        (diagnostic) => diagnostic.severity === "warning",
      );
      const status = input.identity.readiness === "pending"
        ? "running"
        : input.identity.readiness === "unsupported" ||
            input.identity.exportSafety === "blocked" ||
            blockers.length
          ? "blocked"
          : warnings.length || input.identity.exportSafety === "warning"
            ? "warning"
            : "ready";
      const diagnosticIdentity = (items: TemplateImportIssueV1[]) =>
        JSON.stringify(
          items.map((item) => [
            item.code,
            item.severity,
            item.message,
            item.fieldId ?? "",
            item.requirementId ?? "",
          ]),
        );
      if (
        renderValidation.revision === current.revision &&
        renderValidation.renderIdentity?.identityId ===
          input.identity.identityId &&
        renderValidation.status === status &&
        diagnosticIdentity(renderValidation.diagnostics) ===
          diagnosticIdentity(diagnostics)
      ) {
        return getSnapshot();
      }
      renderValidation = {
        schemaVersion: "template-import-render-validation-v1",
        status,
        revision: current.revision,
        renderIdentity: structuredClone(input.identity),
        blockers,
        warnings,
        diagnostics,
      };
      notify();
      return getSnapshot();
    },
    async confirm() {
      assertActive();
      const current = getSnapshot();
      const confirmationStep = current.steps.confirmation;
      const sessionValue = sessionSnapshot();
      if (
        activeStep !== "confirmation" ||
        confirmationStep.readiness !== "ready" ||
        !sessionValue.basePackage ||
        !sessionValue.workingPackage ||
        !sessionValue.validation?.valid ||
        !sessionValue.importValidation ||
        !renderValidation.renderIdentity ||
        !sourceName ||
        !importedAt
      ) {
        throw new Error(
          "Template confirmation requires current package, font, field, and render validation.",
        );
      }
      const confirmedRevision = sessionValue.revision;
      const packageDigest = await createTemplatePackageDigest(
        sessionValue.workingPackage,
      );
      if (
        sessionSnapshot().revision !== confirmedRevision ||
        activeStep !== "confirmation"
      ) {
        throw new Error(
          "Template confirmation became stale while package integrity was calculated.",
        );
      }
      busy = true;
      error = null;
      notify();
      const blockers = confirmationStep.blockers.map(cloneIssue);
      const warnings = confirmationStep.warnings.map(cloneIssue);
      const nextConfirmation = freezeConfirmation({
        schemaVersion: TEMPLATE_IMPORT_CONFIRMATION_SCHEMA_VERSION,
        sdkVersion: TEMPLATE_SDK_VERSION,
        packageFingerprint: createTemplatePackageFingerprint(
          sessionValue.workingPackage,
        ),
        packageDigest,
        sourceName,
        importedAt,
        importedPackage: structuredClone(sessionValue.basePackage),
        packageValue: structuredClone(sessionValue.workingPackage),
        editableFields: fieldDrafts
          .filter((draft) => draft.view.enabled)
          .map((draft) => structuredClone(draft.view)),
        configuredFieldRules: fieldDrafts.map((draft) =>
          structuredClone(draft.view)),
        importValidation: structuredClone(sessionValue.importValidation),
        validation: structuredClone(sessionValue.validation),
        fontValidation: structuredClone(current.fontValidation),
        renderValidation: structuredClone(renderValidation),
        renderIdentity: structuredClone(renderValidation.renderIdentity),
        diagnostics: current.diagnostics.map(cloneIssue),
        blockers,
        warnings,
      });
      completion = nextConfirmation;
      const confirmationSignal = operationController.signal;
      try {
        persistenceReceipt = options.persistenceAdapter
          ? await options.persistenceAdapter.persistConfirmedTemplate(
              nextConfirmation,
              { signal: confirmationSignal },
            )
          : null;
        if (confirmationSignal.aborted || status === "cancelled") {
          throw new Error("Template confirmation was cancelled.");
        }
        status = "completed";
        activeStep = "completed";
        return nextConfirmation;
      } catch (persistenceError) {
        if (!confirmationSignal.aborted && status !== "cancelled") {
          error = {
            code: "persistence.confirmation-failed",
            severity: "error",
            message:
              persistenceError instanceof Error
                ? persistenceError.message
                : "The host could not persist the confirmed template.",
          };
          activeStep = "confirmation";
        }
        throw persistenceError;
      } finally {
        busy = false;
        notify();
      }
    },
    restart() {
      assertActive();
      abortPending();
      session.reset();
      status = "active";
      activeStep = "zip-import";
      sourceName = null;
      importedAt = null;
      fieldDrafts = [];
      fontSources = new Map();
      fontBusy = new Set();
      fontErrors = new Map();
      renderValidation = initialRenderReport();
      busy = false;
      error = null;
      completion = null;
      persistenceReceipt = null;
      notify();
      return getSnapshot();
    },
    cancel() {
      assertActive();
      abortPending();
      status = "cancelled";
      busy = false;
      error = null;
      notify();
      return getSnapshot();
    },
    dispose() {
      if (disposed) return;
      abortPending();
      disposed = true;
      status = "disposed";
      busy = false;
      sessionUnsubscribe();
      if (ownsSession) session.dispose();
      notify();
      listeners.clear();
    },
  };

  return controller;
}

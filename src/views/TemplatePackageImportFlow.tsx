import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Info,
  MoreHorizontal,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AppShell,
  Alert,
  Button,
  Input,
  Menu,
  MenuItem,
  PageContent,
  PageFooter,
  PageWorkspace,
  Status,
  Surface,
} from "../components/ui";
import {
  editableFieldSelectionKey,
  TemplatePackageFieldRulesEditor,
  validatePackageFieldConstraints,
} from "../template-package/editor";
import { getFigmaReferencePng } from "../template-package/enrichment/visualDiff";
import type {
  PackageDiagnostic,
  TemplatePackageValidationResult,
} from "@sleinity/template-core";
import {
  canImportPackageResult,
  createFieldConstraintSummaries,
  createImportSessionRevisionGuard,
  createSettingsPackageImportResult,
  createTemplateCreationGate,
  defaultPackageCreateMetadata,
  preserveImportedPackageBaseline,
  rebuildPackageImportResult,
  runTemplatePackageImportPipeline,
  type PackageImportResult,
  type TemplateCreationBlocker,
  type TemplatePackageCreateMetadata,
  analyzeAssetReliability,
  enrichTemplatePackage,
  requestFigmaEnrichment,
  prepareTemplatePackageFonts,
  validatePackageJpgExportReadiness,
  createPersistenceSubmissionController,
  type PersistenceSubmissionController,
  type PersistenceSubmissionState,
  type SavedTemplateRecord,
} from "@sleinity/template-browser";
import { FontPreparationStep } from "../template-package/fonts/FontPreparationStep";
import {
  collectTemplatePackageRenderWarnings,
  TemplateInspectionPreview,
  type ResolvedProductRenderIdentityV1,
} from "@sleinity/template-react";
import {
  createZipBundleReader,
  createResolvedRenderTree,
  getEffectiveEditableFields,
  getPackageEditorFieldWarnings,
  getPackageEditorFieldTargetStatuses,
  restoreImportedPackageForEditing,
  type FontReadinessReport,
  type EditableFieldBinding,
  type LoadedTemplatePackageSource,
  type TemplatePackageV1,
} from "@sleinity/template-core";
import {
  createTemplatePackageQualityReport,
  getDiagnosticCodeTitle,
  groupPackageQualityIssues,
  type DiagnosticUserAction,
  type PackageQualityIssue,
  TemplatePackageDiagnosticContext,
  TemplatePackageQualityPanel,
} from "../template-package/quality";
import {
  LoadedSourceDiagnosticsPanel,
  PackageFilesPanel,
} from "./import/PackageDiagnosisPanels";
import {
  CompactPackageSummary,
  PackageBlockingIssues,
  PackageTechnicalDetails,
  PackageValidationStatusHeader,
} from "./import/ValidateReadinessPanels";
import {
  FieldExportReadinessPanel,
  TemplateCreationReadinessPanel,
} from "./import/TemplateCreationReadinessPanels";

export {
  buildZipPackageImportResult,
  canImportPackageResult,
  createSettingsPackageImportResult,
  defaultPackageCreateMetadata,
} from "@sleinity/template-browser";
export type {
  PackageImportResult,
  TemplatePackageCreateMetadata,
} from "@sleinity/template-browser";
export {
  AssetDiagnosisPanel,
  EditableFieldsDiagnosisPanel,
  FontDiagnosisPanel,
  LoadedSourceDiagnosticsPanel,
  MotionDiagnosisPanel,
  NodeGraphDiagnosisPanel,
  PackageFilesPanel,
  PackageOverviewDiagnosisPanel,
  PreviewReferenceDiagnosisPanel,
  RenderReadinessDiagnosisPanel,
  TokenDiagnosisPanel,
} from "./import/PackageDiagnosisPanels";

export type TemplatePackageFlowMode = "import" | "settings";

interface TemplatePackageImportFlowProps {
  onCancel: () => void;
  mode?: TemplatePackageFlowMode;
  initialStep?: number;
  savedTemplate?: SavedTemplateRecord | null;
  onAddTemplate?: (
    packageValue: TemplatePackageV1,
    validation: TemplatePackageValidationResult,
    metadata: TemplatePackageCreateMetadata,
  ) => void | Promise<void>;
  onUpdateTemplate?: (
    packageValue: TemplatePackageV1,
    validation: TemplatePackageValidationResult,
    metadata: TemplatePackageCreateMetadata,
  ) => void | Promise<void>;
  onSaveChanges?: (
    packageValue: TemplatePackageV1,
    validation: TemplatePackageValidationResult,
  ) => void | Promise<void>;
  onDuplicateTemplate?: () => void | Promise<void>;
  onDeleteTemplate?: () => void | Promise<void>;
}

interface ZipDetectedFileSummary {
  sourceName: string;
  templateJson: boolean;
  assetsJson: boolean;
  motionJson: boolean;
  mcpJson: boolean;
  previewPng: boolean;
  assetCount: number;
  diagnosticsCount: number;
}

const steps = [
  "Package",
  "Fonts",
  "Validate",
  "Fields",
  "Add template",
] as const;
const nextStepActionLabels = [
  "Import template",
  "Check template",
  "Continue to fields",
  "Continue to template details",
] as const;
const readFileAsArrayBuffer = (
  file: File,
  onLoad: (buffer: ArrayBuffer) => void,
) => {
  const reader = new FileReader();
  reader.onload = () => {
    if (reader.result instanceof ArrayBuffer) onLoad(reader.result);
  };
  reader.readAsArrayBuffer(file);
};

function summarizeZipFiles(
  buffer: ArrayBuffer,
  sourceName: string,
): ZipDetectedFileSummary {
  const reader = createZipBundleReader(buffer, { sourceName });
  const bundle = reader.bundle;
  return {
    sourceName,
    templateJson: Boolean(bundle.index.required["template.json"]),
    assetsJson: Boolean(bundle.index.required["assets.json"]),
    motionJson: Boolean(bundle.index.optional["motion.json"]),
    mcpJson: Boolean(bundle.index.optional["mcp.json"]),
    previewPng: Boolean(bundle.index.optional["preview.png"]),
    assetCount: bundle.index.assets.length,
    diagnosticsCount: bundle.diagnostics.length,
  };
}

const summarizeValue = (value: unknown): string => {
  if (value === null) return "null";
  if (typeof value === "string") {
    if (/^data:image\//i.test(value)) {
      return `${value.slice(0, value.indexOf(",") + 1)}… [embedded image]`;
    }
    return value.length > 90 ? `${value.slice(0, 87)}…` : value;
  }
  return String(value);
};

const formatBytes = (value: number | undefined): string => {
  if (!value || value <= 0) return "0 KB";
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / 1024).toFixed(1)} KB`;
};

const motionLabel = (packageValue: TemplatePackageV1 | null) => {
  if (!packageValue?.motion) return "Static";
  const raw = packageValue.motion.raw;
  return raw && typeof raw === "object" && Object.keys(raw).length > 0
    ? "Motion included"
    : "Static";
};

export const PackageFontPreparationPanel = ({
  packageValue,
  onPackageChange,
}: {
  packageValue: TemplatePackageV1 | null;
  onPackageChange: (packageValue: TemplatePackageV1) => void;
}) => {
  if (!packageValue) {
    return (
      <div
        data-testid="font-preparation-empty"
        className="font-requirement-list rounded-lg border border-line-subtle bg-surface-secondary p-5"
      >
        <h3 className="ui-subsection-title">
          No template selected
        </h3>
        <p className="mt-2 text-sm leading-6 text-content-secondary">
          Import a template before adding or checking its fonts.
        </p>
      </div>
    );
  }

  if (!packageValue.fontRequirements?.length) {
    return (
      <div
        data-testid="font-preparation-empty"
        className="font-requirement-list rounded-lg border border-[var(--color-status-repaired-border)] bg-[var(--color-status-repaired-bg)] p-5"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2
            aria-hidden="true"
            size={18}
            className="mt-0.5 text-[var(--color-status-repaired-fg)]"
          />
          <div>
            <h3 className="ui-subsection-title">
              Fonts are ready
            </h3>
            <p className="mt-2 text-sm leading-6 text-content-secondary">
              No additional fonts are required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FontPreparationStep
      packageValue={packageValue}
      onPackageChange={onPackageChange}
    />
  );
};

export function canAdvancePackageWizard(
  stepIndex: number,
  hasSelectedPackage: boolean,
  result: PackageImportResult | null,
): boolean {
  if (stepIndex === 0) return hasSelectedPackage;
  if (stepIndex === 1 || stepIndex === 2 || stepIndex === 3) {
    return canImportPackageResult(result);
  }
  return true;
}

export function canNavigatePackageWizard(
  targetStep: number,
  hasSelectedPackage: boolean,
  result: PackageImportResult | null,
  mode: TemplatePackageFlowMode = "import",
): boolean {
  if (targetStep === 0) return true;
  if (mode === "settings") return canImportPackageResult(result);
  if (targetStep === 1) return hasSelectedPackage;
  return canImportPackageResult(result);
}

export const ZIP_ONLY_IMPORT_MESSAGE =
  "This importer accepts ZIP template packages. Export the template as a ZIP package and try again.";

export function validateTemplatePackageUploadName(
  fileName: string,
): string | null {
  return fileName.trim().toLowerCase().endsWith(".zip")
    ? null
    : ZIP_ONLY_IMPORT_MESSAGE;
}

const Metric = ({ label, value }: { label: string; value: string | number }) => (
  <div className="setup-metric">
    <div className="ui-metadata">{label}</div>
    <div className="setup-metric__value">{value}</div>
  </div>
);

const Panel = ({
  title,
  status,
  children,
}: {
  title: string;
  status?: ReactNode;
  children: ReactNode;
}) => (
  <Surface as="section" className="setup-panel">
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="ui-section-title">{title}</h2>
      {status}
    </div>
    {children}
  </Surface>
);

const DiagnosticList = ({ diagnostics }: { diagnostics: PackageDiagnostic[] }) => {
  if (diagnostics.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-status-repaired-fg)]">
        <CheckCircle2 aria-hidden="true" size={16} />
        No app validation issues found.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {diagnostics.map((item, index) => {
        const Icon =
          item.severity === "error"
            ? XCircle
            : item.severity === "warning"
              ? AlertTriangle
              : Info;
        return (
          <li
            key={`${item.code}-${item.path ?? ""}-${item.nodeId ?? ""}-${index}`}
            className={`rounded-lg border px-4 py-3 ${
              item.severity === "error"
                ? "border-[var(--color-status-blocked-border)] bg-[var(--color-status-blocked-bg)]"
                : item.severity === "warning"
                  ? "border-[var(--color-status-attention-border)] bg-[var(--color-status-attention-bg)]"
                  : "border-line-subtle bg-surface-secondary"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-content-primary">
              <Icon aria-hidden="true" size={15} />
              {getDiagnosticCodeTitle(item.code)}
            </div>
            <p className="mt-1 text-xs leading-5 text-content-secondary">{item.message}</p>
            <details className="mt-2 border-t border-current/10 pt-2">
              <summary className="cursor-pointer text-[11px] text-content-muted">
                Technical details
              </summary>
              <p className="mt-2 break-words font-mono text-[10px] text-content-muted">
                {[item.code, item.category, item.path, item.nodeId]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </details>
          </li>
        );
      })}
    </ul>
  );
};

const FieldList = ({ packageValue }: { packageValue: TemplatePackageV1 }) => {
  const fields = packageValue.editableFields;
  const targets = getPackageEditorFieldTargetStatuses(packageValue);
  if (fields.length === 0) {
    return <p className="text-sm text-content-muted">No editable fields were included.</p>;
  }
  return (
    <div className="space-y-2">
      {fields.map((field, index) => {
        const target = targets.find(
          (item) =>
            item.field.id === field.id &&
            item.field.nodeId === field.nodeId,
        );
        return (
          <div
            key={`${field.id}-${field.nodeId}-${index}`}
            className="rounded-lg border border-line-subtle bg-surface-secondary p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-content-primary">{field.label ?? field.id}</span>
              <span className="rounded-full bg-surface-hovered px-2.5 py-1 text-xs text-content-secondary">
                {field.type}
              </span>
            </div>
            <p className="mt-2 text-xs text-content-muted">
              {field.id} · {field.nodeId} · {summarizeValue(field.defaultValue)}
            </p>
            <p className="mt-2 text-xs text-content-muted">
              Target:{" "}
              {target?.targetExists
                ? `${target.targetNodeType ?? "node"} · ${target.propertySupported ? "editable" : "unsupported property"}`
                : "missing node"}
              {target?.assetId
                ? ` · asset ${target.assetExists ? "resolved" : "missing"}`
                : ""}
            </p>
            <p className="mt-2 text-xs leading-5 text-content-muted">
              {field.constraints ? (
                <>
                  {"required" in field.constraints &&
                  field.constraints.required
                    ? "Required · "
                    : ""}
                  {"maxCharacters" in field.constraints &&
                  field.constraints.maxCharacters !== undefined
                    ? `Max ${field.constraints.maxCharacters} characters · `
                    : ""}
                  {"maxWords" in field.constraints &&
                  field.constraints.maxWords !== undefined
                    ? `Max ${field.constraints.maxWords} words · `
                    : ""}
                  {"maxLines" in field.constraints &&
                  field.constraints.maxLines !== undefined
                    ? `Max ${field.constraints.maxLines} lines · `
                    : ""}
                  {"pattern" in field.constraints &&
                  field.constraints.pattern
                    ? `${field.constraints.pattern} · `
                    : ""}
                  {field.behavior?.onOverflow ?? "allow"}
                </>
              ) : (
                "No editing rules"
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export function TemplatePackageImportFlow({
  onCancel,
  mode = "import",
  initialStep,
  savedTemplate = null,
  onAddTemplate,
  onUpdateTemplate,
  onSaveChanges,
  onDuplicateTemplate,
  onDeleteTemplate,
}: TemplatePackageImportFlowProps) {
  const isSettings = mode === "settings" && Boolean(savedTemplate);
  const initialSettingsResult = useMemo(
    () =>
      isSettings && savedTemplate
        ? createSettingsPackageImportResult(savedTemplate)
        : null,
    [isSettings, savedTemplate],
  );
  const [stepIndex, setStepIndex] = useState(
    initialStep ?? (isSettings ? 3 : 0),
  );
  const setupContentRef = useRef<HTMLDivElement>(null);
  const [zipBuffer, setZipBuffer] = useState<ArrayBuffer | null>(null);
  const [zipSourceName, setZipSourceName] = useState("");
  const [zipDetectedSummary, setZipDetectedSummary] =
    useState<ZipDetectedFileSummary | null>(null);
  const [isPackageDragActive, setIsPackageDragActive] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState(
    savedTemplate?.source.figmaUrl ?? "",
  );
  const [showFigmaOverrideInput, setShowFigmaOverrideInput] = useState(false);
  const [figmaEnrichmentNotice, setFigmaEnrichmentNotice] = useState<string | null>(null);
  const [result, setResult] = useState<PackageImportResult | null>(
    initialSettingsResult,
  );
  const importedOriginalPackageRef = useRef<TemplatePackageV1 | null>(
    savedTemplate ? structuredClone(savedTemplate.originalPackage) : null,
  );
  const importRevisionRef = useRef(createImportSessionRevisionGuard());
  const [templateName, setTemplateName] = useState(
    savedTemplate?.name ?? "",
  );
  const [description, setDescription] = useState(
    savedTemplate?.description ??
      "Template generated from a Figma package.",
  );
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [addPackageNotice, setAddPackageNotice] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<PersistenceSubmissionState>({
    status: "idle",
    message: null,
  });
  const submissionControllerRef = useRef<PersistenceSubmissionController | null>(
    null,
  );
  if (!submissionControllerRef.current) {
    submissionControllerRef.current =
      createPersistenceSubmissionController(setSubmitState);
  }
  const submissionController = submissionControllerRef.current;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isRebuildingDiagnostics, setIsRebuildingDiagnostics] = useState(false);
  const [productRenderIdentity, setProductRenderIdentity] =
    useState<ResolvedProductRenderIdentityV1 | null>(null);
  const [fontReadiness, setFontReadiness] =
    useState<FontReadinessReport | null>(null);
  const [selectedQualityIssueId, setSelectedQualityIssueId] = useState<
    string | null
  >(null);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [fieldChangesPending, setFieldChangesPending] = useState(false);
  const settingsChangeRevisionRef = useRef(0);
  const [settingsSaveState, setSettingsSaveState] = useState<{
    status: "idle" | "saving" | "saved" | "failed";
    message: string | null;
  }>({ status: "idle", message: null });

  const selectPackageFile = (file: File) => {
    const unsupportedMessage = validateTemplatePackageUploadName(file.name);
    if (unsupportedMessage) {
      importRevisionRef.current.invalidate();
      importedOriginalPackageRef.current = null;
      setZipBuffer(null);
      setZipSourceName("");
      setZipDetectedSummary(null);
      setResult(null);
      setAddPackageNotice(unsupportedMessage);
      submissionController.reset();
      return;
    }
    readFileAsArrayBuffer(file, (buffer) => {
      importRevisionRef.current.invalidate();
      importedOriginalPackageRef.current = null;
      setZipBuffer(buffer);
      setZipSourceName(file.name);
      setZipDetectedSummary(summarizeZipFiles(buffer, file.name));
      setResult(null);
      setAddPackageNotice(null);
      setShowFigmaOverrideInput(false);
      setFigmaEnrichmentNotice(null);
      submissionController.reset();
      setIsEnriching(false);
      setIsRebuildingDiagnostics(false);
      setProductRenderIdentity(null);
      setFontReadiness(null);
      setSelectedFieldKey(null);
      setFieldChangesPending(false);
    });
  };

  const runValidation = async () => {
    const revision = importRevisionRef.current.next();
    setIsEnriching(false);
    setIsRebuildingDiagnostics(true);
    setAddPackageNotice(null);
    try {
      if (!isSettings && !zipBuffer) {
        setAddPackageNotice("Select a ZIP template package before continuing.");
        return null;
      }
      let nextResult =
        isSettings && savedTemplate
          ? result?.package
            ? rebuildPackageImportResult(result, structuredClone(result.package))
            : createSettingsPackageImportResult(savedTemplate, figmaUrl)
          : await runTemplatePackageImportPipeline({
              format: "zip",
              buffer: zipBuffer!,
              sourceName: zipSourceName || "template-package.zip",
              figmaUrl,
            });
      if (!importRevisionRef.current.isCurrent(revision)) return null;
      if (
        nextResult.package &&
        nextResult.validation?.valid &&
        nextResult.enrichment?.figmaReference
      ) {
        const enrichmentUrl = nextResult.enrichment.figmaReference.url;
        setIsEnriching(true);
        setFigmaEnrichmentNotice("Refreshing Figma enrichment…");
        try {
          const response = await requestFigmaEnrichment({
            figmaUrl: enrichmentUrl,
            packageRootNodeId: nextResult.package.rootNodeId,
            packageHash: nextResult.package.source?.packageContract,
            packageSummary: {
              name: nextResult.package.name,
              canvas: nextResult.package.canvas,
              nodeCount: Object.keys(nextResult.package.nodes).length,
              editableFields: nextResult.package.editableFields.map((field) => ({
                id: field.id,
                type: field.type,
                nodeId: field.nodeId,
                marker: `field:${field.type}:${field.id}`,
              })),
            },
            package: nextResult.package,
          });
          if (!importRevisionRef.current.isCurrent(revision)) return null;
          if (response.ok && response.package) {
            const enrichment = nextResult.enrichment
              ? {
                  ...nextResult.enrichment,
                  package: response.package,
                  metadataComparison:
                    response.package.verification?.metadata ??
                    nextResult.enrichment.metadataComparison,
                }
              : null;
            nextResult = rebuildPackageImportResult(
              nextResult,
              response.package,
              { enrichment },
            );
            setFigmaEnrichmentNotice("Figma enrichment completed.");
          } else if (!response.ok) {
            setFigmaEnrichmentNotice(
              "Figma enrichment is unavailable; using the complete ZIP package data.",
            );
          }
        } catch {
          // Live enrichment is optional; package validation remains authoritative.
          setFigmaEnrichmentNotice(
            "Figma enrichment failed; using the complete ZIP package data.",
          );
        } finally {
          if (importRevisionRef.current.isCurrent(revision)) {
            setIsEnriching(false);
          }
        }
      }
      if (!importRevisionRef.current.isCurrent(revision)) return null;
      if (!isSettings) {
        importedOriginalPackageRef.current = preserveImportedPackageBaseline(
          importedOriginalPackageRef.current,
          nextResult,
        );
      }
      setResult(nextResult);
      setProductRenderIdentity(null);
      setFontReadiness(null);
      setSelectedQualityIssueId(null);
      setSelectedFieldKey(null);
      if (nextResult.package && !templateName.trim()) {
        setTemplateName(
          defaultPackageCreateMetadata(nextResult.package).templateName,
        );
      }
      return nextResult;
    } finally {
      if (importRevisionRef.current.isCurrent(revision)) {
        setIsRebuildingDiagnostics(false);
      }
    }
  };

  const activePackage = result?.package ?? null;
  const bundledFigmaSource = result?.loadedSource?.figmaSource;
  const figmaReferencePng = useMemo(
    () => getFigmaReferencePng(activePackage),
    [activePackage],
  );
  const isValid = Boolean(result?.validation?.valid);
  const rendererWarnings = useMemo(
    () =>
      activePackage && isValid
        ? collectTemplatePackageRenderWarnings(activePackage, "static")
        : [],
    [activePackage, isValid],
  );
  const editorRendererWarnings = useMemo(
    () =>
      activePackage && isValid
        ? collectTemplatePackageRenderWarnings(activePackage, "editor")
        : [],
    [activePackage, isValid],
  );
  const resolvedTree = useMemo(
    () =>
      activePackage && isValid
        ? createResolvedRenderTree(activePackage)
        : null,
    [activePackage, isValid],
  );
  useEffect(() => {
    if (!resolvedTree) {
      setFontReadiness(null);
      return;
    }
    let cancelled = false;
    if (!activePackage) return;
    void prepareTemplatePackageFonts(
      activePackage,
      resolvedTree,
      document.fonts,
    ).then((report) => {
      if (!cancelled) setFontReadiness(report);
    });
    return () => {
      cancelled = true;
    };
  }, [activePackage, resolvedTree]);
  const editorFieldWarnings = useMemo(() => {
    if (!activePackage) return [];
    return getPackageEditorFieldWarnings(activePackage);
  }, [activePackage]);
  const fieldConstraintValidation = useMemo(
    () =>
      activePackage
        ? validatePackageFieldConstraints(activePackage)
        : null,
    [activePackage],
  );
  const assetReliability = useMemo(
    () => (activePackage ? analyzeAssetReliability(activePackage) : null),
    [activePackage],
  );
  const exportReadiness = useMemo(
    () =>
      activePackage
        ? validatePackageJpgExportReadiness(
            {
              format: "jpg",
              packageValue: activePackage,
              renderMode: "static",
            },
            fontReadiness ?? undefined,
          )
        : null,
    [activePackage, fontReadiness],
  );
  const qualityReport = useMemo(
    () =>
      activePackage && result?.validation
        ? createTemplatePackageQualityReport({
            packageValue: activePackage,
            validation: result.validation,
            loadedSourceDiagnostics: result.layeredDiagnostics,
            rendererWarnings: {
              static: rendererWarnings,
              editor: editorRendererWarnings,
            },
            resolvedTree,
            assetReliability,
            fontReadiness,
            fieldValidation: fieldConstraintValidation,
            editorWarnings: editorFieldWarnings,
            exportReadiness,
            sourceReferenceAvailable: Boolean(
              figmaReferencePng || activePackage.referencePreview,
            ),
            productRenderIdentity,
          })
        : null,
    [
      activePackage,
      assetReliability,
      editorFieldWarnings,
      editorRendererWarnings,
      exportReadiness,
      fieldConstraintValidation,
      fontReadiness,
      rendererWarnings,
      resolvedTree,
      result?.validation,
      result?.layeredDiagnostics,
      figmaReferencePng,
      productRenderIdentity,
    ],
  );
  const fieldConstraintSummaries = useMemo(
    () =>
      activePackage && fieldConstraintValidation
        ? createFieldConstraintSummaries(
            activePackage,
            fieldConstraintValidation,
          )
        : [],
    [activePackage, fieldConstraintValidation],
  );
  const creationGate = useMemo(
    () =>
      createTemplateCreationGate({
        canImport: canImportPackageResult(result),
        hasOriginalPackage: Boolean(importedOriginalPackageRef.current),
        templateName,
        isRebuildingDiagnostics,
        isSaving: submitState.status === "saving",
        qualityIssues: qualityReport?.issues,
      }),
    [
      isRebuildingDiagnostics,
      qualityReport?.issues,
      result,
      submitState.status,
      templateName,
    ],
  );
  const selectedQualityIssue = useMemo(
    () =>
      qualityReport?.issues.find(
        (issue) => issue.id === selectedQualityIssueId,
      ) ?? null,
    [qualityReport, selectedQualityIssueId],
  );
  const selectedQualityGroup = useMemo(
    () =>
      selectedQualityIssue && qualityReport
        ? groupPackageQualityIssues(qualityReport.issues).find((group) =>
            group.issues.some((issue) => issue.id === selectedQualityIssue.id),
          ) ?? null
        : null,
    [qualityReport, selectedQualityIssue],
  );
  const selectedField = useMemo(
    () =>
      (activePackage ? getEffectiveEditableFields(activePackage) : []).find(
        (field) => editableFieldSelectionKey(field) === selectedFieldKey,
      ) ?? null,
    [activePackage, selectedFieldKey],
  );
  const selectedFieldTarget = useMemo(
    () =>
      activePackage && selectedField
        ? getPackageEditorFieldTargetStatuses(activePackage).find(
            (target) =>
              editableFieldSelectionKey(target.field) === selectedFieldKey,
          ) ?? null
        : null,
    [activePackage, selectedField, selectedFieldKey],
  );
  const focusQualityIssue = useCallback((issue: PackageQualityIssue) => {
    setSelectedQualityIssueId(issue.id);
    window.requestAnimationFrame(() => {
      document
        .getElementById("package-quality-workspace")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);
  const focusCreationBlocker = useCallback(
    (blocker: TemplateCreationBlocker) => {
      if (blocker.code === "template-name-required") {
        document.getElementById("template-name-input")?.focus();
        return;
      }
      if (blocker.code === "original-package-missing") {
        setStepIndex(0);
        return;
      }
      const qualityIssue = qualityReport?.issues.find(
        (issue) =>
          issue.code === blocker.code &&
          issue.fieldId === blocker.fieldId &&
          issue.nodeId === blocker.nodeId,
      );
      setStepIndex(2);
      window.requestAnimationFrame(() => {
        if (qualityIssue) setSelectedQualityIssueId(qualityIssue.id);
        window.requestAnimationFrame(() => {
          document
            .getElementById("package-quality-workspace")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    },
    [qualityReport?.issues],
  );
  const focusFieldRule = useCallback((fieldId: string, nodeId: string) => {
    setSelectedFieldKey(`${fieldId}:${nodeId}`);
    setStepIndex(3);
    window.requestAnimationFrame(() => {
      const target = Array.from(
        document.querySelectorAll<HTMLDetailsElement>(
          "[data-package-field-rule-id]",
        ),
      ).find(
        (element) =>
          element.dataset.packageFieldRuleId === fieldId &&
          element.dataset.packageFieldRuleNodeId === nodeId,
      );
      if (!target) return;
      target.open = true;
      target.querySelector("summary")?.focus();
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const handleDiagnosticAction = useCallback(
    (action: DiagnosticUserAction, issue: PackageQualityIssue) => {
      if (action.kind === "load-font") {
        setStepIndex(1);
        return;
      }
      if (action.kind === "configure-field" && issue.fieldId && issue.nodeId) {
        focusFieldRule(issue.fieldId, issue.nodeId);
        return;
      }
      if (action.kind === "retry-validation" && !isRebuildingDiagnostics) {
        void runValidation();
      }
    },
    [focusFieldRule, isRebuildingDiagnostics, runValidation],
  );

  const goNext = async () => {
    if (stepIndex === 0) {
      try {
        const nextResult = await runValidation();
        if (canImportPackageResult(nextResult)) {
          setAddPackageNotice(null);
          setStepIndex(1);
        } else {
          setAddPackageNotice(
            "This template cannot be imported yet. Fix the blocked issue below, then retry the import.",
          );
        }
      } catch (error) {
        setAddPackageNotice(
          error instanceof Error
            ? `Import failed: ${error.message}`
            : "Import failed before diagnostics could be created.",
        );
      }
      return;
    }
    if (isSettings && stepIndex === 3 && fieldChangesPending) {
      if (!(await saveSettingsChanges())) return;
    }
    if (stepIndex < steps.length - 1) {
      setStepIndex((index) => index + 1);
    }
  };

  const canCreate = creationGate.canCreate;
  const hasImportInput = Boolean(zipBuffer);
  const nextDisabled =
    stepIndex === 0
      ? !hasImportInput
      : !canAdvancePackageWizard(stepIndex, hasImportInput, result) ||
        (stepIndex === 2 && qualityReport?.status === "blocked");

  const submitTemplate = async () => {
    if (
      !canCreate ||
      !result?.validation ||
      !templateName.trim() ||
      !importedOriginalPackageRef.current
    ) return;
    const packageValue = result.package!;
    const validation = result.validation;
    const previewRead =
      !isSettings && zipBuffer && result.loadedSource?.preview
        ? createZipBundleReader(zipBuffer, { sourceName: zipSourceName }).readBlob(
            result.loadedSource.preview.normalizedPath,
            "image/png",
          )
        : null;
    const metadata = {
      templateName: templateName.trim(),
      description: description.trim(),
      figmaUrl: figmaUrl.trim() || undefined,
      originalPackage: importedOriginalPackageRef.current,
      source: result.sourceMetadata,
      previewBlob: previewRead?.ok ? previewRead.value : undefined,
    };
    await submissionController.run(
      async () => {
        if (isSettings) {
          await onUpdateTemplate?.(packageValue, validation, metadata);
        } else {
          await onAddTemplate?.(packageValue, validation, metadata);
        }
      },
      isSettings
        ? "Template changes could not be saved. Your edits are still here."
        : "Template could not be created. Your package is still here.",
    );
  };

  const resetToImportedVersion = () => {
    if (!savedTemplate) return;
    importRevisionRef.current.invalidate();
    setIsEnriching(false);
    setIsRebuildingDiagnostics(false);
    const packageValue = restoreImportedPackageForEditing(
      savedTemplate.originalPackage,
      result?.package ?? savedTemplate.workingPackage,
    );
    setResult((current) =>
      current
        ? rebuildPackageImportResult(current, packageValue, {
            enrichment: enrichTemplatePackage(packageValue, {
              figmaUrl: savedTemplate.source.figmaUrl,
            }),
          })
        : createSettingsPackageImportResult(savedTemplate),
    );
    setSettingsNotice(
      "Imported package restored. Choose Save changes to keep this reset.",
    );
    settingsChangeRevisionRef.current += 1;
    setFieldChangesPending(true);
    setSettingsSaveState({ status: "idle", message: null });
  };

  const updateActivePackage = (packageValue: TemplatePackageV1) => {
    importRevisionRef.current.invalidate();
    setIsEnriching(false);
    setIsRebuildingDiagnostics(false);
    setResult((current) =>
      current ? rebuildPackageImportResult(current, packageValue) : current,
    );
    setFontReadiness(null);
    setProductRenderIdentity(null);
    setSelectedQualityIssueId(null);
  };

  const markSettingsChanged = () => {
    settingsChangeRevisionRef.current += 1;
    setFieldChangesPending(true);
    setSettingsSaveState({ status: "idle", message: null });
  };

  const saveSettingsChanges = async (): Promise<boolean> => {
    if (!isSettings || !fieldChangesPending) return true;
    if (!result?.package || !result.validation || !onSaveChanges) return false;
    if (settingsSaveState.status === "saving") return false;
    const revision = settingsChangeRevisionRef.current;
    setSettingsSaveState({ status: "saving", message: null });
    try {
      await onSaveChanges(result.package, result.validation);
      if (settingsChangeRevisionRef.current === revision) {
        setFieldChangesPending(false);
        setSettingsSaveState({ status: "saved", message: null });
      } else {
        setSettingsSaveState({ status: "idle", message: null });
      }
      return true;
    } catch (error) {
      setSettingsSaveState({
        status: "failed",
        message: error instanceof Error ? error.message : "Changes could not be saved.",
      });
      return false;
    }
  };

  const navigateSetupStep = async (index: number) => {
    if (index === stepIndex) return;
    if (isSettings && fieldChangesPending && !(await saveSettingsChanges())) return;
    setStepIndex(index);
  };

  const leaveSettings = async () => {
    if (isSettings && fieldChangesPending && !(await saveSettingsChanges())) return;
    onCancel();
  };

  useEffect(() => {
    if (setupContentRef.current) setupContentRef.current.scrollTop = 0;
  }, [stepIndex]);

  return (
    <AppShell
      navigation={
        <div className="setup-navigation">
          <Button
            variant="quiet"
            leadingIcon={<ArrowLeft aria-hidden="true" size={16} />}
            onClick={() => void leaveSettings()}
            disabled={submitState.status === "saving"}
          >
            Templates
          </Button>
          <ol className="setup-navigation__steps">
            {steps.map((step, index) => {
              const available = canNavigatePackageWizard(
                index,
                Boolean(zipBuffer),
                result,
                mode,
              );
              return (
                <li key={step}>
                  <button
                    type="button"
                    disabled={!available || submitState.status === "saving"}
                    onClick={() => void navigateSetupStep(index)}
                    className="setup-navigation__step"
                    aria-current={index === stepIndex ? "step" : undefined}
                    data-available={available || undefined}
                  >
                    <span className="setup-navigation__number">
                      {index < stepIndex ? (
                        <CheckCircle2 aria-label="Completed" size={16} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    {step}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="setup-navigation__safety">
            <ShieldCheck aria-hidden="true" size={18} />
            <p>
              Template files are checked before they are added.
            </p>
          </div>
        </div>
      }
      header={
        <div className="setup-header">
            <div>
              <p className="ui-metadata">{isSettings ? "Template settings" : "Template setup"}</p>
              <h1 className="setup-header__title">
                {isSettings && stepIndex === 4
                  ? "Template settings"
                  : steps[stepIndex]}
              </h1>
            </div>
            <div className="setup-header__actions">
              {activePackage?.name ? <span className="setup-header__context">{activePackage.name}</span> : null}
              {isSettings ? (
                <>
                <Button
                  variant="secondary"
                  onClick={() => void saveSettingsChanges()}
                  disabled={!fieldChangesPending || settingsSaveState.status === "saving"}
                  loading={settingsSaveState.status === "saving"}
                  loadingLabel="Saving changes"
                >
                  Save changes
                </Button>
                {settingsSaveState.status === "saved" ? (
                  <span className="ui-metadata" role="status">Saved</span>
                ) : null}
                {settingsSaveState.status === "failed" ? (
                  <span className="setup-header__save-error" role="alert">
                    {settingsSaveState.message}
                  </span>
                ) : null}
                <Menu
                  className="setup-header__management"
                  label={<MoreHorizontal aria-hidden="true" size={18} />}
                  accessibleLabel="Template actions"
                >
                  <MenuItem onClick={resetToImportedVersion}>
                    <RotateCcw aria-hidden="true" size={15} /> Restart from imported package
                  </MenuItem>
                  <MenuItem onClick={() => void onDuplicateTemplate?.()}>
                    <Copy aria-hidden="true" size={15} /> Duplicate template
                  </MenuItem>
                  <MenuItem
                    destructive
                    onClick={() => {
                      if (confirmDelete) void onDeleteTemplate?.();
                      else setConfirmDelete(true);
                    }}
                  >
                    <Trash2 aria-hidden="true" size={15} />
                    {confirmDelete ? "Confirm delete" : "Delete template"}
                  </MenuItem>
                </Menu>
                </>
              ) : null}
              <Button className="setup-header__mobile-back" variant="quiet" onClick={() => void leaveSettings()}>
                Templates
              </Button>
            </div>
        </div>
      }
      mainLabel={isSettings ? "Template settings" : "Template setup"}
    >
        <PageWorkspace data-testid="package-import-wizard" className="setup-flow">

          <PageContent ref={setupContentRef} className="setup-flow__content">
            {stepIndex === 0 ? (
              <div data-testid="package-step-add" className="space-y-5">
                {isSettings && savedTemplate ? (
                  <>
                    <Panel title="Imported package">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Metric label="Package" value={savedTemplate.workingPackage.name} />
                        <Metric
                          label="Canvas"
                          value={`${savedTemplate.workingPackage.canvas.width} × ${savedTemplate.workingPackage.canvas.height}`}
                        />
                        <Metric
                          label="Nodes"
                          value={Object.keys(savedTemplate.workingPackage.nodes).length}
                        />
                        <Metric
                          label="Editable fields"
                          value={savedTemplate.workingPackage.editableFields.length}
                        />
                      </div>
                      <p className="mt-4 text-sm leading-6 text-content-secondary">
                        This saved package is already loaded. Package replacement is
                        intentionally unavailable in this settings pass.
                      </p>
                    </Panel>
                  </>
                ) : (
                  <>
                    <div className="max-w-3xl">
                      <p className="ui-page-description">
                        Choose the template ZIP exported from Figma.
                      </p>
                    </div>
                    <Panel title="Package file">
                        <div
                          data-testid="zip-package-dropzone"
                          data-active={isPackageDragActive ? "true" : undefined}
                          className="setup-package-dropzone"
                          onDragEnter={(event) => {
                            event.preventDefault();
                            setIsPackageDragActive(true);
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "copy";
                            setIsPackageDragActive(true);
                          }}
                          onDragLeave={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                              setIsPackageDragActive(false);
                            }
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            setIsPackageDragActive(false);
                            const file = event.dataTransfer.files?.[0];
                            if (file) selectPackageFile(file);
                          }}
                        >
                          <span className="setup-package-dropzone__icon">
                            <Upload aria-hidden="true" size={20} />
                          </span>
                          <strong>Drop template ZIP here</strong>
                          <span>Or choose the exported template file below.</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line-subtle bg-surface-interactive px-4 py-3 text-sm font-medium text-content-primary transition hover:bg-surface-hovered hover:text-content-primary">
                            <Upload aria-hidden="true" size={16} />
                            Choose template ZIP
                            <input
                              data-testid="zip-package-input"
                              type="file"
                              accept=".zip,application/zip,application/x-zip-compressed"
                              className="sr-only"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) selectPackageFile(file);
                                event.currentTarget.value = "";
                              }}
                            />
                          </label>
                          {zipSourceName ? (
                            <span className="rounded-lg border border-line-subtle bg-surface-interactive px-4 py-3 text-sm text-content-secondary">
                              {zipSourceName}
                            </span>
                          ) : (
                            <span className="text-sm text-content-muted">
                              No file selected.
                            </span>
                          )}
                        </div>
                        <p className="ui-help-text mt-3">
                          Template Tool accepts exported ZIP files.
                        </p>
                        {zipDetectedSummary ? (
                          <div className="mt-4 grid gap-2 sm:grid-cols-3">
                            <Metric
                              label="template.json"
                              value={zipDetectedSummary.templateJson ? "Found" : "Missing"}
                            />
                            <Metric
                              label="assets.json"
                              value={zipDetectedSummary.assetsJson ? "Found" : "Missing"}
                            />
                            <Metric
                              label="motion.json"
                              value={zipDetectedSummary.motionJson ? "Found" : "Optional"}
                            />
                            <Metric
                              label="mcp.json"
                              value={zipDetectedSummary.mcpJson ? "Found" : "Optional"}
                            />
                            <Metric
                              label="preview.png"
                              value={zipDetectedSummary.previewPng ? "Found" : "Optional"}
                            />
                            <Metric
                              label="Assets"
                              value={zipDetectedSummary.assetCount}
                            />
                          </div>
                        ) : null}
                        {zipDetectedSummary?.diagnosticsCount ? (
                          <p className="mt-3 rounded-lg border border-[var(--color-status-attention-border)] bg-[var(--color-status-attention-bg)] px-4 py-3 text-xs leading-5 text-[var(--color-status-attention-fg)]">
                            {zipDetectedSummary.diagnosticsCount} ZIP index notice
                            {zipDetectedSummary.diagnosticsCount === 1 ? "" : "s"} will be reviewed during validation.
                          </p>
                        ) : null}
                        <p className="mt-4 text-xs leading-5 text-content-muted">
                          The ZIP is read only during this import session. Saved
                          templates store normalized package data and managed asset
                          records, not raw ZIP bytes.
                        </p>
                    </Panel>
                    {addPackageNotice ||
                    (result && !canImportPackageResult(result)) ? (
                      <div
                        data-testid="package-add-diagnostics"
                        className="space-y-4"
                      >
                        <div className="rounded-lg border border-[var(--color-status-attention-border)] bg-[var(--color-status-attention-bg)] p-5">
                          <h2 className="ui-section-title">
                            Package cannot continue yet
                          </h2>
                          <p className="mt-2 text-sm leading-6 text-[var(--color-status-attention-fg)]">
                            {addPackageNotice ??
                              "The template check found a blocking issue. Fix it before importing this template."}
                          </p>
                        </div>
                        {result?.layeredDiagnostics ? (
                          <LoadedSourceDiagnosticsPanel
                            report={result.layeredDiagnostics}
                          />
                        ) : result?.diagnostics.length ? (
                          <Panel title="App validation">
                            <DiagnosticList diagnostics={result.diagnostics} />
                          </Panel>
                        ) : null}
                      </div>
                    ) : null}
                    <details className="rounded-lg border border-line-subtle bg-surface-secondary p-5">
                      <summary className="cursor-pointer text-sm font-medium text-content-primary">
                        Advanced optional overrides
                      </summary>
                      <div className="mt-4 space-y-5">
                        {bundledFigmaSource?.valid && !showFigmaOverrideInput ? (
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-content-primary">
                                Figma source detected
                              </p>
                              <p className="mt-1 text-sm text-content-secondary">
                                {bundledFigmaSource.documentName ?? "Figma design"}
                              </p>
                              <p className="mt-1 text-xs text-content-muted">
                                Node {bundledFigmaSource.nodeId ?? "not specified"} · Source: mcp.json
                              </p>
                              <p className="mt-1 text-xs text-content-muted">
                                {bundledFigmaSource.rootMatch === false
                                  ? "The source node differs from the package root. ZIP data remains authoritative."
                                  : "The source node matches the package root."}
                              </p>
                            </div>
                            {figmaEnrichmentNotice ? (
                              <p className="text-xs leading-5 text-content-secondary" role="status">
                                {figmaEnrichmentNotice}
                              </p>
                            ) : null}
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={bundledFigmaSource.url}
                                target="_blank"
                                rel="noreferrer"
                                className="ui-button"
                                data-size="small"
                                data-variant="secondary"
                              >
                                <ExternalLink aria-hidden="true" size={15} />
                                <span>Open source</span>
                              </a>
                              <Button
                                type="button"
                                variant="quiet"
                                size="small"
                                onClick={() => setShowFigmaOverrideInput(true)}
                              >
                                Use a different link
                              </Button>
                            </div>
                          </div>
                        ) : (
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-content-primary">
                            Figma URL <span className="text-content-muted">Optional</span>
                          </span>
                          <input
                            aria-label="Optional Figma URL"
                            value={figmaUrl}
                            onChange={(event) => {
                              importRevisionRef.current.invalidate();
                              setFigmaUrl(event.target.value);
                              setResult(null);
                              submissionController.reset();
                              setIsEnriching(false);
                              setIsRebuildingDiagnostics(false);
                              setProductRenderIdentity(null);
                              setFontReadiness(null);
                              setFigmaEnrichmentNotice(null);
                            }}
                            placeholder="https://www.figma.com/design/...?...node-id=211-79"
                            className="w-full rounded-lg border border-line-subtle bg-surface-interactive px-4 py-3 text-sm text-content-primary outline-none transition placeholder:text-content-muted focus:border-line-strong focus:ring-2 focus:ring-[var(--color-focus-ring)]/20"
                          />
                          <span className="mt-2 block text-xs leading-5 text-content-muted">
                            ZIP packages should normally include MCP/Figma metadata. Use this only as provenance or a live-enrichment override.
                          </span>
                        </label>
                        )}
                      </div>
                    </details>
                  </>
                )}
              </div>
            ) : null}

            {stepIndex === 1 ? (
              <div
                data-testid="package-step-prepare-fonts"
                className="space-y-5"
              >
                <p className="ui-page-description">
                  Add any missing fonts, or choose a replacement before checking the template.
                </p>
                <PackageFontPreparationPanel
                  packageValue={activePackage}
                  onPackageChange={updateActivePackage}
                />
              </div>
            ) : null}

            {stepIndex === 2 ? (
              <div data-testid="package-step-validate" className="space-y-5">
                <PackageValidationStatusHeader
                  report={result?.layeredDiagnostics}
                  qualityReport={qualityReport}
                  onValidate={() => {
                    if (!isRebuildingDiagnostics) void runValidation();
                  }}
                />

                <PackageBlockingIssues
                  qualityReport={qualityReport}
                  onSelectIssue={focusQualityIssue}
                />

                {activePackage ? (
                  <CompactPackageSummary
                    packageValue={activePackage}
                    source={result?.loadedSource}
                    metadata={result?.sourceMetadata}
                  />
                ) : null}

                {qualityReport && activePackage ? (
                  <div
                    id="package-quality-workspace"
                    className="validate-quality-workspace scroll-mt-5"
                  >
                    <TemplatePackageQualityPanel
                      report={qualityReport}
                      selectedIssueId={selectedQualityIssueId}
                      onSelectIssue={(issue) =>
                        setSelectedQualityIssueId(issue?.id ?? null)
                      }
                    />
                    <TemplatePackageDiagnosticContext
                      packageValue={activePackage}
                      resolvedTree={resolvedTree}
                      productRenderIdentity={productRenderIdentity}
                      sourceReferencePng={figmaReferencePng}
                      onRenderIdentity={setProductRenderIdentity}
                      issue={selectedQualityIssue}
                      instances={selectedQualityGroup?.issues}
                      onSelectInstance={(issue) => setSelectedQualityIssueId(issue.id)}
                      onAction={handleDiagnosticAction}
                    />
                  </div>
                ) : null}

                {activePackage ? (
                  <PackageTechnicalDetails
                    packageValue={activePackage}
                    source={result?.loadedSource}
                    metadata={result?.sourceMetadata}
                    layeredDiagnostics={result?.layeredDiagnostics}
                    validation={result?.validation}
                    assetIngestionDiagnostics={
                      result?.assetIngestionDiagnostics
                    }
                    qualityReport={qualityReport}
                  />
                ) : null}
              </div>
            ) : null}

            {stepIndex === 3 && activePackage ? (
              <div data-testid="package-step-fields" className="setup-fields-layout">
                <div className="setup-fields-configuration space-y-5">
                  <div>
                    <h2 className="ui-subsection-title">Configure fields</h2>
                    <p className="ui-page-description">
                      Set editing rules and select a field to locate it in the template.
                    </p>
                  </div>
                  <section className="field-configuration-section" aria-labelledby="field-configuration-title">
                    <div className="flex items-center justify-between gap-3">
                      <h2 id="field-configuration-title" className="ui-section-title">
                        Template fields
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-content-muted">
                          {getEffectiveEditableFields(activePackage).length} fields
                        </span>
                      </div>
                    </div>
                    <TemplatePackageFieldRulesEditor
                      packageValue={activePackage}
                      onPackageChange={(packageValue) => {
                        markSettingsChanged();
                        updateActivePackage(packageValue);
                      }}
                      selectedFieldKey={selectedFieldKey}
                      onSelectField={(field) =>
                        setSelectedFieldKey(
                          field ? editableFieldSelectionKey(field) : null,
                        )
                      }
                    />
                  </section>
                </div>
                <section className="setup-fields-preview" aria-labelledby="fields-preview-title">
                  <div>
                    <h2 id="fields-preview-title" className="ui-section-title">Field preview</h2>
                    <p className="mt-1 text-sm text-content-muted">
                      {selectedField
                        ? selectedField.label ?? selectedField.id
                        : "Select a field to highlight its location."}
                    </p>
                  </div>
                  {selectedField &&
                  (!selectedFieldTarget?.targetExists ||
                    !selectedFieldTarget.propertySupported) ? (
                    <Alert tone="info" title="Preview unavailable for this field">
                      The field remains configurable, but it does not have a supported preview target.
                    </Alert>
                  ) : null}
                  <TemplateInspectionPreview
                    packageValue={activePackage}
                    targetNodeIds={
                      selectedFieldTarget?.targetExists &&
                      selectedFieldTarget.propertySupported &&
                      selectedField?.nodeId
                        ? [selectedField.nodeId]
                        : []
                    }
                    targetFitLabel="Fit selected field"
                  />
                </section>
              </div>
            ) : null}

            {stepIndex === 4 && activePackage ? (
              <div data-testid="package-step-create" className="setup-confirmation">
                <p className="ui-page-description">
                  {isSettings
                    ? "Update the reusable template metadata and field rules. The imported original remains unchanged."
                    : "Name the imported template before adding it to Templates."}
                </p>
                {settingsNotice ? (
                  <p className="rounded-lg border border-[var(--color-status-attention-border)] bg-[var(--color-status-attention-bg)] px-4 py-3 text-sm text-[var(--color-status-attention-fg)]">
                    {settingsNotice}
                  </p>
                ) : null}
                <TemplateCreationReadinessPanel
                  gate={creationGate}
                  onFocusBlocker={focusCreationBlocker}
                />
                <div className="setup-confirmation__grid setup-confirmation__grid--details-only">
                  <div className="setup-confirmation__details">
                    <Input
                      id="template-name-input"
                      label="Template name"
                      value={templateName}
                      onChange={(event) => setTemplateName(event.target.value)}
                      error={templateName.trim() ? undefined : "Enter a template name."}
                    />
                    <div className="setup-confirmation__facts">
                      <Metric label="Editable fields" value={getEffectiveEditableFields(activePackage).length} />
                      <Metric label="Readiness" value={creationGate.canCreate ? "Ready" : "Action required"} />
                    </div>
                    <FieldExportReadinessPanel
                      summaries={fieldConstraintSummaries}
                      onFocusField={focusFieldRule}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </PageContent>

          <PageFooter className="setup-flow__footer">
            <Button
              variant="secondary"
              onClick={() => void navigateSetupStep(Math.max(0, stepIndex - 1))}
              disabled={stepIndex === 0 || submitState.status === "saving"}
            >
              Back
            </Button>
            {stepIndex < steps.length - 1 ? (
              <div className="flex flex-wrap items-center justify-end gap-3">
                {stepIndex === 2 && qualityReport ? (
                  <p
                    className={`text-sm ${qualityReport.status === "blocked" ? "text-[var(--color-status-blocked-fg)]" : "text-content-muted"}`}
                    role={qualityReport.status === "blocked" ? "alert" : "status"}
                  >
                    {qualityReport.status === "blocked"
                      ? `Resolve ${qualityReport.summary.errors || 1} blocked ${qualityReport.summary.errors === 1 ? "issue" : "issues"} above to continue.`
                      : qualityReport.summary.warnings > 0
                        ? `Continue with ${qualityReport.summary.warnings} review ${qualityReport.summary.warnings === 1 ? "item" : "items"}.`
                        : "Validation complete."}
                  </p>
                ) : null}
                <Button
                  onClick={() => void goNext()}
                  disabled={nextDisabled || isEnriching || isRebuildingDiagnostics}
                  loading={isEnriching || isRebuildingDiagnostics}
                  loadingLabel={
                    stepIndex === 0
                      ? "Importing template"
                      : "Checking template"
                  }
                >
                  {nextStepActionLabels[stepIndex]}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {submitState.status === "failed" ? (
                  <p
                    data-testid="package-submit-error"
                    role="alert"
                    className="max-w-md text-right text-xs leading-5 text-[var(--color-status-blocked-fg)]"
                  >
                    {submitState.message}
                  </p>
                ) : null}
                <Button
                  onClick={() => void submitTemplate()}
                  aria-describedby="template-creation-status"
                  disabled={
                    !canCreate ||
                    !templateName.trim() ||
                    submitState.status === "saving"
                  }
                  loading={submitState.status === "saving"}
                  loadingLabel={isSettings ? "Updating" : "Adding template"}
                >
                  {isSettings ? "Update template" : "Add template"}
                </Button>
              </div>
            )}
          </PageFooter>
        </PageWorkspace>
    </AppShell>
  );
}

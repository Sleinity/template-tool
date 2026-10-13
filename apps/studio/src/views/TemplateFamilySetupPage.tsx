import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type DragEvent,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileArchive,
  Link2,
  MoreHorizontal,
  Upload,
} from "lucide-react";
import {
  createResolvedRenderTree,
  createZipBundleReader,
  getPackageEditorFieldWarnings,
  validateTemplatePackage,
  type FontReadinessReport,
  type PackageImageFieldConstraints,
  type PackageTextFieldConstraints,
} from "@sleinity/template-core";
import { resolvePackageAssetSource } from "@sleinity/template-core/assets";
import {
  getEffectiveEditableFields,
  validatePackageFieldConstraints,
} from "@sleinity/template-core/editor";
import {
  bindTemplateFamilyFieldTarget,
  createTemplateFamilyFieldForTarget,
  getTemplateFamilyFieldScope,
  getTemplateFamilyControlOrder,
  removeTemplateFamilyField,
  resolveTemplateFamilyFieldRule,
  setTemplateFamilyControlOrder,
  unbindTemplateFamilyFieldTarget,
  type TemplateFamilyContentStateV1,
  type TemplateFamilyControlRefV1,
  type TemplateFamilyFieldRuleOverrideV1,
  type TemplateFamilyFieldTargetV1,
  type TemplateFamilyFieldV1,
  type TemplateFamilyFieldScopeV1,
  type TemplateFamilyV1,
} from "@sleinity/template-core/family";
import type {
  SavedTemplateFamilyRecord,
} from "@sleinity/template-browser/persistence";
import {
  analyzeAssetReliability,
  resolvePackageAssetReference,
} from "@sleinity/template-browser/assets";
import { validatePackageJpgExportReadiness } from "@sleinity/template-browser/capture";
import {
  areExactFontRequirementsResolved,
} from "@sleinity/template-browser/fonts";
import type { TemplateFamilyImportConfirmationV1 } from "@sleinity/template-browser/importer";
import {
  applyTemplateFamilyVariantReimportState,
  createTemplatePackageDigest,
  planTemplateFamilyVariantReimport,
  runTemplatePackageImportPipeline,
  TEMPLATE_FAMILY_IMPORT_STEPS,
  type TemplateFamilyReimportAddedTargetResolutionV1,
} from "@sleinity/template-browser/importer";
import {
  TemplateFamilyImportPreview,
  TemplateFamilyImportWizardProvider,
  useTemplateFamilyImportWizard,
  useTemplateFamilyImportWizardSnapshot,
} from "@sleinity/template-react/importer";
import {
  collectTemplatePackageRenderWarnings,
  useTemplateSessionSnapshot,
  type ResolvedProductRenderIdentityV1,
} from "@sleinity/template-react";
import {
  groupPackageQualityIssues,
  type DiagnosticUserAction,
  type PackageQualityIssue,
} from "@sleinity/template-react/inspection";
import {
  AppShell,
  Alert,
  Button,
  CheckboxField,
  Disclosure,
  FilePickerButton,
  FilterChip,
  Input,
  Menu,
  MenuItem,
  PageContent,
  PageFooter,
  PageWorkspace,
  Select,
  SideDrawer,
  Status,
  Surface,
} from "../components/ui";
import { FamilyFontPreparationPanel } from "../components/template-family/FamilyFontPreparationPanel";
import { FamilyVariantPropertyTable } from "../components/template-family/FamilyVariantPropertyTable";
import {
  ContextPreviewFrame,
  type ContextPreviewItem,
} from "../components/template-family/ContextPreviewDock";
import { TemplateInspectionPreview } from "../components/template-package/TemplateInspectionPreview";
import { FieldRuleCardShell } from "../components/template-package/editor/FieldRuleCardShell";
import { FieldRuleConstraintControls } from "../components/template-package/editor/FieldRuleConstraintControls";
import { editableFieldTypeLabel } from "../components/template-package/editor/TemplatePackageFieldRulesEditor";
import { TemplatePackageQualityPanel } from "../components/template-package/quality/TemplatePackageQualityPanel";
import { TemplatePackageDiagnosticContext } from "../components/template-package/quality/TemplatePackageDiagnosticContext";
import { getFigmaReferencePng } from "../fidelity/visualDiff";
import {
  createTemplateFamilyVariantQualityReport,
  type FamilyDiagnosticOwnerStep,
} from "../quality/createTemplateFamilyVariantQualityReport";
import {
  useTemplateFamilySetupController,
} from "./template-family-setup/useTemplateFamilySetupController";

export interface TemplateFamilySetupPageProps {
  savedFamily?: SavedTemplateFamilyRecord | null;
  onCancel: () => void;
  onSave: (
    confirmation: TemplateFamilyImportConfirmationV1,
    previous?: SavedTemplateFamilyRecord | null,
    variantPreviewBlobs?: Readonly<Record<string, Blob | null>>,
  ) => Promise<void>;
}

const studioSteps = [
  { id: "variants", label: "Variants" },
  { id: "fonts", label: "Fonts" },
  { id: "fields", label: "Fields" },
  { id: "rules", label: "Field rules" },
  { id: "validate", label: "Validate" },
  { id: "review", label: "Review" },
] as const;

const studioToSdkStep = [0, 0, 1, 3, 5, 6] as const;

function targetKey(target: TemplateFamilyFieldTargetV1): string {
  return `${target.fieldId}:${target.nodeId}:${target.property}`;
}

function variantNameError(
  family: TemplateFamilyV1,
  variantId: string,
  value: string,
): string | undefined {
  const normalized = value.trim().toLocaleLowerCase();
  if (!normalized) return "Enter a variant name.";
  if (family.variants.some((variant) =>
    variant.id !== variantId && variant.title.trim().toLocaleLowerCase() === normalized
  )) {
    return "Variant names must be unique.";
  }
  return undefined;
}

function scopeLabel(
  scope: TemplateFamilyFieldScopeV1,
  family: TemplateFamilyV1,
): string {
  const titles = scope.variantIds.map(
    (variantId) =>
      family.variants.find((variant) => variant.id === variantId)?.title ?? variantId,
  );
  if (scope.kind === "family-wide") {
    return family.variants.length === 1 ? "This variant" : "All variants";
  }
  if (scope.kind === "variant-specific") return `${titles[0] ?? "Variant"} only`;
  if (scope.kind === "variant-subset") return titles.join(" + ");
  return "Not connected";
}

function scopeTone(
  scope: TemplateFamilyFieldScopeV1,
): "repaired" | "info" | "attention" | "blocked" {
  if (scope.kind === "family-wide") return "info";
  if (scope.kind === "variant-subset") return "info";
  if (scope.kind === "variant-specific") return "info";
  return "blocked";
}

function unboundTargets(
  family: TemplateFamilyV1,
  variantId: string,
): TemplateFamilyFieldTargetV1[] {
  const variant = family.variants.find((candidate) => candidate.id === variantId);
  if (!variant) return [];
  const bound = new Set(
    variant.bindings.flatMap((binding) => binding.targets.map(targetKey)),
  );
  return getEffectiveEditableFields(variant.packageValue)
    .map((field) => ({
      fieldId: field.id,
      nodeId: field.nodeId,
      property: field.property,
    }))
    .filter((target) => !bound.has(targetKey(target)));
}

function compatibleFamilyFields(
  family: TemplateFamilyV1,
  variantId: string,
  target: TemplateFamilyFieldTargetV1,
): TemplateFamilyFieldV1[] {
  const variant = family.variants.find((candidate) => candidate.id === variantId);
  if (!variant) return [];
  const packageField = getEffectiveEditableFields(variant.packageValue).find(
    (field) => targetKey({
      fieldId: field.id,
      nodeId: field.nodeId,
      property: field.property,
    }) === targetKey(target),
  );
  if (!packageField) return [];
  return family.fields.filter((field) =>
    field.type === packageField.type &&
    (packageField.property === "image.assetId"
      ? field.type === "image"
      : field.type !== "image"),
  );
}

function compatibleFamilyFieldsInPackage(
  family: TemplateFamilyV1,
  packageValue: TemplateFamilyV1["variants"][number]["packageValue"],
  target: TemplateFamilyFieldTargetV1,
): TemplateFamilyFieldV1[] {
  const packageField = getEffectiveEditableFields(packageValue).find(
    (field) => targetKey({
      fieldId: field.id,
      nodeId: field.nodeId,
      property: field.property,
    }) === targetKey(target),
  );
  if (!packageField) return [];
  return family.fields.filter((field) =>
    field.type === packageField.type &&
    (packageField.property === "image.assetId"
      ? field.type === "image"
      : field.type !== "image"),
  );
}

function familyFieldCounts(family: TemplateFamilyV1) {
  return family.fields.reduce(
    (counts, field) => {
      counts[getTemplateFamilyFieldScope(family, field.id).kind] += 1;
      return counts;
    },
    {
      "family-wide": 0,
      "variant-subset": 0,
      "variant-specific": 0,
      unbound: 0,
    },
  );
}

function ruleSummary(field: TemplateFamilyFieldV1): string {
  const constraints = field.rule.constraints;
  if (field.type === "text" || field.type === "textarea") {
    const text = constraints as PackageTextFieldConstraints | undefined;
    return [
      text?.maxCharacters ? `${text.maxCharacters} characters` : "No character limit",
      field.type === "textarea" && text?.maxLines ? `${text.maxLines} lines` : null,
    ].filter(Boolean).join(" · ");
  }
  if (field.type === "image") {
    const image = constraints as PackageImageFieldConstraints | undefined;
    return image?.replacementMode === "contain" ? "Fit inside frame" : "Fill frame";
  }
  return field.type;
}

function qualityIssueOwnerStep(
  issue: PackageQualityIssue,
): FamilyDiagnosticOwnerStep {
  const explicitOwner = issue.details?.ownerStep;
  if (
    explicitOwner === "variants" ||
    explicitOwner === "fonts" ||
    explicitOwner === "fields" ||
    explicitOwner === "options" ||
    explicitOwner === "rules" ||
    explicitOwner === "validate"
  ) return explicitOwner;
  if (issue.category === "fonts") return "fonts";
  if (issue.category === "fields") return "rules";
  if (
    issue.category === "import" ||
    issue.category === "package" ||
    issue.category === "node-graph" ||
    issue.category === "source" ||
    issue.category === "assets" ||
    issue.category === "motion"
  ) return "variants";
  return "validate";
}

function qualityIssueOwnerLabel(owner: FamilyDiagnosticOwnerStep): string {
  if (owner === "options") return "Variants";
  return studioSteps.find((step) => step.id === owner)?.label ?? "Validate";
}

function studioStepIndexForOwner(owner: FamilyDiagnosticOwnerStep): number {
  const studioOwner = owner === "options" ? "variants" : owner;
  return studioSteps.findIndex((step) => step.id === studioOwner);
}

function RuleControls({
  field,
  constraints,
  onChange,
}: {
  field: TemplateFamilyFieldV1;
  constraints: PackageTextFieldConstraints | PackageImageFieldConstraints | undefined;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <FieldRuleConstraintControls
      fieldType={field.type}
      constraints={constraints}
      onChange={onChange}
    />
  );
}

function FamilyFieldDefault({
  field,
  family,
}: {
  field: TemplateFamilyFieldV1;
  family: TemplateFamilyV1;
}) {
  const applicableVariant = family.variants.find((variant) =>
    variant.bindings.some((binding) =>
      binding.familyFieldId === field.id && binding.targets.length > 0,
    ),
  );
  const target = applicableVariant?.bindings
    .find((binding) => binding.familyFieldId === field.id)
    ?.targets[0];
  const packageField = target && applicableVariant
    ? getEffectiveEditableFields(applicableVariant.packageValue).find((candidate) =>
        candidate.id === target.fieldId &&
        candidate.nodeId === target.nodeId &&
        candidate.property === target.property,
      )
    : null;

  if (field.type === "image") {
    const reference = typeof packageField?.defaultValue === "string"
      ? packageField.defaultValue
      : null;
    const asset = applicableVariant && reference
      ? resolvePackageAssetReference(applicableVariant.packageValue, reference)?.asset
      : null;
    const source = resolvePackageAssetSource(asset ?? undefined);
    return (
      <div className="field-default-image">
        <div className="field-default-image__preview">
          {source ? <img src={source} alt="" /> : <span>Preview unavailable</span>}
        </div>
        <div className="min-w-0">
          <p className="ui-field__label">Template default</p>
          <p className="mt-1 truncate text-sm text-content-secondary">
            {asset?.id ?? reference ?? "Imported image"}
          </p>
          {asset?.width && asset?.height ? (
            <p className="mt-1 text-xs text-content-muted">{asset.width} × {asset.height}px</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="field-template-default">
      <p className="ui-field__label">Template default</p>
      <p className="mt-1 line-clamp-2 text-sm text-content-secondary">
        {field.defaultValue == null || field.defaultValue === ""
          ? "Empty"
          : String(field.defaultValue)}
      </p>
    </div>
  );
}

export function TemplateFamilySetupPage({
  savedFamily = null,
  onCancel,
  onSave,
}: TemplateFamilySetupPageProps) {
  const wizard = useTemplateFamilyImportWizard();
  const pendingVariantPreviewBlobsRef = useRef<Record<string, Blob | null>>({});
  const inspectedReimportPreviewBlobsRef = useRef<Record<string, Blob | null>>({});
  const snapshot = useTemplateFamilyImportWizardSnapshot(wizard);
  const renderSessionSnapshot = useTemplateSessionSnapshot(
    wizard.familySession.renderSession,
  );
  const {
    stepIndex, setStepIndex,
    maxVisitedStep, setMaxVisitedStep,
    pendingTemplateName, setPendingTemplateName,
    selectedVariantId, setSelectedVariantId,
    selectedFieldId, setSelectedFieldId,
    expandedRuleFieldId, setExpandedRuleFieldId,
    fieldFilter, setFieldFilter,
    fieldQuery, setFieldQuery,
    selectedPendingTarget, setSelectedPendingTarget,
    ruleFilter, setRuleFilter,
    openRuleDifferences, setOpenRuleDifferences,
    saving, setSaving,
    checkingAll, setCheckingAll,
    checkingVariantId, setCheckingVariantId,
    selectedQualityIssueId, setSelectedQualityIssueId,
    renderEvidence, setRenderEvidence,
    dragActive, setDragActive,
    confirmRemoveVariantId, setConfirmRemoveVariantId,
    variantDrawerOpen, setVariantDrawerOpen,
    draggedEditorControlKey, setDraggedEditorControlKey,
    editorControlDropIndex, setEditorControlDropIndex,
    reimportPlans, setReimportPlans,
    reimportAddedChoices, setReimportAddedChoices,
    reimportFieldChoices, setReimportFieldChoices,
    reimportOrphanRemovals, setReimportOrphanRemovals,
    contentRef,
    validationVisitStartedRef,
    savedFamilyBaselineRef,
  } = useTemplateFamilySetupController(savedFamily);

  useEffect(() => {
    if (!savedFamily || wizard.getSnapshot().family) return;
    wizard.loadFamily(savedFamily.family);
    setPendingTemplateName(savedFamily.family.title);
  }, [savedFamily, wizard]);

  useEffect(() => {
    const firstId = snapshot.family?.variants[0]?.id ?? null;
    if (!selectedVariantId || !snapshot.family?.variants.some((variant) => variant.id === selectedVariantId)) {
      setSelectedVariantId(firstId);
      if (firstId && snapshot.validation?.definitionValid) {
        wizard.selectPreviewVariant(firstId);
      }
    }
  }, [selectedVariantId, snapshot.family, snapshot.validation?.definitionValid, wizard]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [stepIndex]);

  const hasUnsavedChanges = Boolean(
    snapshot.family && (
      !savedFamily ||
      JSON.stringify(snapshot.family) !== savedFamilyBaselineRef.current ||
      pendingTemplateName !== savedFamily.family.title
    ),
  );

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    setSelectedQualityIssueId(null);
  }, [selectedVariantId]);

  const family = snapshot.family;
  const content = snapshot.content;
  const selectedVariant = family?.variants.find((variant) => variant.id === selectedVariantId) ?? family?.variants[0];
  const selectedField = family?.fields.find((field) => field.id === selectedFieldId) ?? null;
  const counts = family ? familyFieldCounts(family) : null;
  const fontsReady = family?.variants.every((variant) =>
    areExactFontRequirementsResolved(variant.packageValue),
  ) ?? false;
  const fieldBlockers = snapshot.validation?.issues.filter((issue) =>
    issue.code === "family.field-unbound" ||
    issue.code === "family.variant-field-unbound" ||
    issue.code.startsWith("family.binding") ||
    issue.code === "family.rule-override-inapplicable",
  ) ?? [];
  const groupBlockers = snapshot.validation?.issues.filter((issue) =>
    issue.code.startsWith("family.group"),
  ) ?? [];
  const variantNameBlockers = snapshot.validation?.issues.filter((issue) =>
    issue.code === "family.variant-title-missing" ||
    issue.code === "family.variant-title-duplicate",
  ) ?? [];
  const ruleBlockers = snapshot.validation?.issues.filter((issue) =>
    issue.code.includes("rule") && issue.severity === "error",
  ) ?? [];
  const allVariantsValidated = family?.variants.every((variant) => {
    const status = snapshot.renderValidation[variant.id]?.status;
    return status === "ready" || status === "warning";
  }) ?? false;
  const reviewReady = Boolean(
    allVariantsValidated &&
    pendingTemplateName.trim() &&
    variantNameBlockers.length === 0 &&
    snapshot.validation?.definitionValid,
  );
  const checkedVariantCount = family?.variants.filter((variant) => {
    const status = snapshot.renderValidation[variant.id]?.status;
    return status === "ready" || status === "warning";
  }).length ?? 0;
  const reviewBlockerCount = (snapshot.validation?.issues.filter((issue) => issue.severity === "error").length ?? 0) +
    Object.values(snapshot.renderValidation).filter((report) => report.status === "blocked").length;
  const reviewWarningCount = (snapshot.validation?.issues.filter((issue) => issue.severity === "warning").length ?? 0) +
    Object.values(snapshot.renderValidation).filter((report) => report.status === "warning").length;
  const familySessionSnapshot = wizard.familySession.getSnapshot();
  const selectedSessionIsCurrent = Boolean(
    selectedVariant &&
    familySessionSnapshot.selectedVariantId === selectedVariant.id &&
    familySessionSnapshot.materialization?.variantId === selectedVariant.id &&
    familySessionSnapshot.renderSessionRevision === renderSessionSnapshot.revision &&
    renderSessionSnapshot.workingPackage,
  );
  const selectedPackage = selectedSessionIsCurrent
    ? renderSessionSnapshot.workingPackage
    : selectedVariant?.packageValue ?? null;
  const selectedPackageValidation = useMemo(
    () => selectedPackage
      ? selectedSessionIsCurrent && renderSessionSnapshot.validation
        ? renderSessionSnapshot.validation
        : validateTemplatePackage(selectedPackage)
      : null,
    [renderSessionSnapshot.validation, selectedPackage, selectedSessionIsCurrent],
  );
  const selectedResolvedTree = useMemo(
    () => selectedPackage && selectedPackageValidation?.valid
      ? selectedSessionIsCurrent && renderSessionSnapshot.resolvedTree
        ? renderSessionSnapshot.resolvedTree
        : createResolvedRenderTree(selectedPackage)
      : null,
    [
      renderSessionSnapshot.resolvedTree,
      selectedPackage,
      selectedPackageValidation?.valid,
      selectedSessionIsCurrent,
    ],
  );
  const selectedFontReadiness: FontReadinessReport | null = selectedSessionIsCurrent
    ? renderSessionSnapshot.fontPreparation.report
    : null;
  const selectedRendererWarnings = useMemo(
    () => selectedPackage && selectedPackageValidation?.valid
      ? collectTemplatePackageRenderWarnings(selectedPackage, "static")
      : [],
    [selectedPackage, selectedPackageValidation?.valid],
  );
  const selectedEditorRendererWarnings = useMemo(
    () => selectedPackage && selectedPackageValidation?.valid
      ? collectTemplatePackageRenderWarnings(selectedPackage, "editor")
      : [],
    [selectedPackage, selectedPackageValidation?.valid],
  );
  const selectedAssetReliability = useMemo(
    () => selectedPackage ? analyzeAssetReliability(selectedPackage) : null,
    [selectedPackage],
  );
  const selectedFieldValidation = useMemo(
    () => selectedPackage ? validatePackageFieldConstraints(selectedPackage) : null,
    [selectedPackage],
  );
  const selectedEditorWarnings = useMemo(
    () => selectedPackage ? getPackageEditorFieldWarnings(selectedPackage) : [],
    [selectedPackage],
  );
  const selectedExportReadiness = useMemo(
    () => selectedPackage
      ? validatePackageJpgExportReadiness(
          {
            format: "jpg",
            packageValue: selectedPackage,
            renderMode: "static",
          },
          selectedFontReadiness ?? undefined,
        )
      : null,
    [selectedFontReadiness, selectedPackage],
  );
  const currentProductRenderIdentity = renderEvidence && selectedVariant &&
      renderEvidence.variantId === selectedVariant.id &&
      renderEvidence.sessionRevision === renderSessionSnapshot.revision
    ? renderEvidence.identity
    : null;
  const selectedRenderValidation = selectedVariant
    ? snapshot.renderValidation[selectedVariant.id]
    : null;
  const selectedVariantImport = selectedVariant
    ? snapshot.variantImports[selectedVariant.id]
    : null;
  const qualityReport = useMemo(
    () => family && selectedVariant && selectedPackage && selectedPackageValidation && snapshot.validation
      ? createTemplateFamilyVariantQualityReport({
          family,
          familyValidation: snapshot.validation,
          variantId: selectedVariant.id,
          packageValue: selectedPackage,
          validation: selectedPackageValidation,
          loadedSourceDiagnostics: selectedVariantImport?.layeredDiagnostics,
          rendererWarnings: {
            static: selectedRendererWarnings,
            editor: selectedEditorRendererWarnings,
          },
          resolvedTree: selectedResolvedTree,
          assetReliability: selectedAssetReliability,
          fontReadiness: selectedFontReadiness,
          fieldValidation: selectedFieldValidation,
          editorWarnings: selectedEditorWarnings,
          exportReadiness: selectedExportReadiness,
          sourceReferenceAvailable: Boolean(getFigmaReferencePng(selectedPackage)),
          productRenderIdentity: currentProductRenderIdentity,
          renderValidation: selectedRenderValidation,
        })
      : null,
    [
      currentProductRenderIdentity,
      family,
      selectedAssetReliability,
      selectedEditorRendererWarnings,
      selectedEditorWarnings,
      selectedExportReadiness,
      selectedFieldValidation,
      selectedFontReadiness,
      selectedPackage,
      selectedPackageValidation,
      selectedRenderValidation,
      selectedRendererWarnings,
      selectedResolvedTree,
      selectedVariant,
      selectedVariantImport?.layeredDiagnostics,
      snapshot.validation,
    ],
  );
  const selectedQualityIssue = useMemo(
    () => qualityReport?.issues.find((issue) => issue.id === selectedQualityIssueId) ?? null,
    [qualityReport?.issues, selectedQualityIssueId],
  );
  const selectedQualityGroup = useMemo(
    () => qualityReport
      ? groupPackageQualityIssues(qualityReport.issues).find((group) =>
          group.issues.some((issue) => issue.id === selectedQualityIssueId),
        ) ?? null
      : null,
    [qualityReport, selectedQualityIssueId],
  );

  const canContinue = [
    Boolean(family?.variants.length) &&
      !snapshot.busy &&
      groupBlockers.length === 0 &&
      variantNameBlockers.length === 0,
    Boolean(family?.variants.length) && fontsReady,
    Boolean(family) && fieldBlockers.length === 0,
    snapshot.validation?.definitionValid === true,
    allVariantsValidated,
    snapshot.validation?.definitionValid === true &&
      allVariantsValidated &&
      Boolean(pendingTemplateName.trim()) &&
      variantNameBlockers.length === 0,
  ][stepIndex];

  const moveSdkTo = (targetIndex: number): boolean => {
    let safety = 0;
    while (safety++ < TEMPLATE_FAMILY_IMPORT_STEPS.length + 2) {
      const current = TEMPLATE_FAMILY_IMPORT_STEPS.indexOf(wizard.getSnapshot().activeStep);
      if (current === targetIndex) return true;
      const before = wizard.getSnapshot().activeStep;
      if (current < targetIndex) wizard.next();
      else wizard.back();
      if (wizard.getSnapshot().activeStep === before) return false;
    }
    return false;
  };

  const navigateStep = (nextIndex: number) => {
    if (nextIndex > maxVisitedStep + 1 && !savedFamily) return;
    if (!savedFamily && nextIndex > stepIndex && !canContinue) return;
    if (!savedFamily && !moveSdkTo(studioToSdkStep[nextIndex])) return;
    if (savedFamily) moveSdkTo(studioToSdkStep[nextIndex]);
    setStepIndex(nextIndex);
    setMaxVisitedStep((current) => Math.max(current, nextIndex));
  };

  const loadZip = async (
    file: File,
    mode: "first" | "add-variant",
  ) => {
    const bytes = await file.arrayBuffer();
    const input = {
      bytes,
      sourceName: file.name,
      title: file.name.replace(/\.zip$/i, ""),
    };
    const beforeIds = new Set(wizard.getSnapshot().family?.variants.map((variant) => variant.id));
    const next = mode === "first"
      ? await wizard.loadFirstZip(input)
      : await wizard.addVariant(input);
    let nextFamily = next.family;
    if (mode === "first" && nextFamily) {
      nextFamily = { ...nextFamily, title: "Untitled template" };
      wizard.replaceFamily(nextFamily);
    }
    const added = nextFamily?.variants.find((variant) => !beforeIds.has(variant.id));
    const nextSelected = added?.id ?? nextFamily?.variants[0]?.id;
    if (nextSelected) {
      const reader = createZipBundleReader(bytes, { sourceName: file.name });
      const previewFile = reader.bundle.index.optional["preview.png"];
      const preview = previewFile
        ? reader.readBlob(previewFile.normalizedPath, "image/png")
        : null;
      pendingVariantPreviewBlobsRef.current[nextSelected] =
        preview?.ok && preview.value ? preview.value : null;
      setSelectedVariantId(nextSelected);
      if (next.validation?.definitionValid) wizard.selectPreviewVariant(nextSelected);
    }
    return nextSelected ?? null;
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void loadZip(file, family ? "add-variant" : "first");
  };

  const replaceFamily = (next: TemplateFamilyV1) => {
    wizard.replaceFamily(next);
  };

  const removeVariant = (variantId: string) => {
    if (!family || !content || family.variants.length <= 1) return;
    let nextFamily = structuredClone(family);
    let nextContent = structuredClone(content);
    nextFamily.variants = nextFamily.variants.filter((variant) => variant.id !== variantId);
    const controls: TemplateFamilyControlRefV1[] = getTemplateFamilyControlOrder(nextFamily).filter(
      (control) => control.kind !== "direct-variant-selector",
    );
    if (nextFamily.variantGroups.length === 0 && nextFamily.variants.length > 1) {
      controls.unshift({ kind: "direct-variant-selector" });
    }
    nextFamily = setTemplateFamilyControlOrder(nextFamily, controls);
    const orphanIds = nextFamily.fields
      .filter((field) => getTemplateFamilyFieldScope(nextFamily, field.id).kind === "unbound")
      .map((field) => field.id);
    for (const fieldId of orphanIds) {
      const removed = removeTemplateFamilyField(nextFamily, nextContent, fieldId);
      nextFamily = removed.family;
      nextContent = removed.content;
    }
    wizard.replaceFamily(nextFamily);
    wizard.replaceContent(nextContent);
    delete pendingVariantPreviewBlobsRef.current[variantId];
    delete inspectedReimportPreviewBlobsRef.current[variantId];
    setConfirmRemoveVariantId(null);
    setSelectedVariantId(nextFamily.variants[0]?.id ?? null);
  };

  const selectPreviewVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    if (snapshot.validation?.definitionValid) wizard.selectPreviewVariant(variantId);
  };

  const bindTarget = (
    variantId: string,
    familyFieldId: string,
    target: TemplateFamilyFieldTargetV1,
  ) => {
    if (!family) return;
    replaceFamily(bindTemplateFamilyFieldTarget(family, variantId, familyFieldId, target));
    setSelectedFieldId(familyFieldId);
  };

  const keepVariantSpecific = (
    variantId: string,
    target: TemplateFamilyFieldTargetV1,
  ) => {
    if (!family || !content) return;
    const created = createTemplateFamilyFieldForTarget({
      family,
      content,
      variantId,
      target,
      fieldId: `field:${crypto.randomUUID()}`,
    });
    wizard.replaceFamily(created.family);
    wizard.replaceContent(created.content);
    setSelectedFieldId(created.fieldId);
  };

  const updateCommonConstraint = (
    fieldId: string,
    key: string,
    value: unknown,
  ) => {
    if (!family) return;
    const next = structuredClone(family);
    const field = next.fields.find((candidate) => candidate.id === fieldId);
    if (!field) return;
    const constraints = { ...(field.rule.constraints ?? {}) } as Record<string, unknown>;
    if (value === undefined || value === "") delete constraints[key];
    else constraints[key] = value;
    field.rule.constraints = Object.keys(constraints).length ? constraints : undefined;
    replaceFamily(next);
  };

  const setOverrideMode = (
    variantId: string,
    fieldId: string,
    mode: "inherit" | "override" | "clear",
  ) => {
    if (!family) return;
    const next = structuredClone(family);
    const variant = next.variants.find((candidate) => candidate.id === variantId);
    if (!variant) return;
    if (mode === "inherit") delete variant.ruleOverrides[fieldId];
    else if (mode === "clear") variant.ruleOverrides[fieldId] = { constraints: null, behavior: null };
    else variant.ruleOverrides[fieldId] = variant.ruleOverrides[fieldId] ?? { constraints: {} };
    replaceFamily(next);
  };

  const updateOverrideConstraint = (
    variantId: string,
    fieldId: string,
    key: string,
    value: unknown,
  ) => {
    if (!family) return;
    const next = structuredClone(family);
    const variant = next.variants.find((candidate) => candidate.id === variantId);
    if (!variant) return;
    const override = variant.ruleOverrides[fieldId] ?? { constraints: {} };
    const constraints = override.constraints && typeof override.constraints === "object"
      ? { ...override.constraints } as Record<string, unknown>
      : {};
    if (value === undefined || value === "") constraints[key] = null;
    else constraints[key] = value;
    variant.ruleOverrides[fieldId] = { ...override, constraints };
    replaceFamily(next);
  };

  const applySuggestedOverrides = (variantId: string) => {
    if (!family) return;
    const suggestions = snapshot.matchPlans[variantId]?.suggestedRuleOverrides;
    if (!suggestions || Object.keys(suggestions).length === 0) return;
    const next = structuredClone(family);
    const variant = next.variants.find((candidate) => candidate.id === variantId);
    if (!variant) return;
    variant.ruleOverrides = { ...variant.ruleOverrides, ...structuredClone(suggestions) };
    replaceFamily(next);
  };

  const updateVariantName = (variantId: string, value: string) => {
    if (!family) return;
    const next = structuredClone(family);
    const variant = next.variants.find((candidate) => candidate.id === variantId);
    if (!variant) return;
    variant.title = value;
    replaceFamily(next);
  };

  const focusVariantsBlocker = () => {
    if (!family) return;
    const focusVisibleIssue = () => requestAnimationFrame(() => {
      const issue = contentRef.current?.querySelector<HTMLElement>(
        '[data-testid="family-step-variants"] [aria-invalid="true"]',
      );
      issue?.scrollIntoView({ block: "center", behavior: "smooth" });
      issue?.focus();
    });
    const nameIssue = variantNameBlockers[0];
    if (nameIssue?.variantId) {
      setSelectedVariantId(nameIssue.variantId);
      focusVisibleIssue();
      return;
    }
    if (groupBlockers.length) focusVisibleIssue();
  };

  const focusCurrentBlocker = () => {
    if (stepIndex === 0) {
      focusVariantsBlocker();
      return;
    }
    const selectors = [
      "",
      '[data-testid="family-step-fonts"] [aria-invalid="true"], [data-testid="family-step-fonts"] input[type="file"]',
      '[data-testid="family-step-fields"] [data-attention="true"] button',
      '[data-testid="family-step-rules"] [aria-invalid="true"], [data-testid="family-step-rules"] button',
      '[data-testid="family-step-validate"] button',
      '[data-testid="family-step-review"] [aria-invalid="true"]',
    ];
    requestAnimationFrame(() => {
      const issue = contentRef.current?.querySelector<HTMLElement>(selectors[stepIndex]);
      issue?.scrollIntoView({ block: "center", behavior: "smooth" });
      issue?.focus();
    });
  };

  const moveVariant = (variantId: string, nextIndex: number) => {
    if (!family) return;
    const currentIndex = family.variants.findIndex((variant) => variant.id === variantId);
    if (currentIndex < 0) return;
    const boundedIndex = Math.max(0, Math.min(family.variants.length - 1, nextIndex));
    if (boundedIndex === currentIndex) return;
    const next = structuredClone(family);
    const [variant] = next.variants.splice(currentIndex, 1);
    next.variants.splice(boundedIndex, 0, variant);
    replaceFamily(next);
  };

  const moveEditorControl = (currentIndex: number, nextIndex: number) => {
    if (!family) return;
    const controls = getTemplateFamilyControlOrder(family);
    if (
      currentIndex < 0 ||
      currentIndex >= controls.length ||
      nextIndex < 0 ||
      nextIndex >= controls.length ||
      currentIndex === nextIndex
    ) return;
    const [control] = controls.splice(currentIndex, 1);
    controls.splice(nextIndex, 0, control);
    const next = setTemplateFamilyControlOrder(family, controls);
    const fieldsById = new Map(next.fields.map((field) => [field.id, field]));
    next.fields = controls
      .filter((candidate): candidate is Extract<TemplateFamilyControlRefV1, { kind: "field" }> => candidate.kind === "field")
      .map((candidate) => fieldsById.get(candidate.fieldId))
      .filter((field): field is TemplateFamilyFieldV1 => Boolean(field));
    replaceFamily(next);
  };

  const editorControlKey = (control: TemplateFamilyControlRefV1) =>
    control.kind === "direct-variant-selector"
      ? control.kind
      : control.kind === "selection-property"
        ? `${control.kind}:${control.groupId}`
        : `${control.kind}:${control.fieldId}`;

  const moveEditorControlByKey = (key: string, nextIndex: number) => {
    if (!family) return;
    const currentIndex = getTemplateFamilyControlOrder(family)
      .findIndex((control) => editorControlKey(control) === key);
    moveEditorControl(currentIndex, nextIndex);
  };

  const inspectReimport = async (variantId: string, file: File) => {
    if (!family) return;
    const bytes = await file.arrayBuffer();
    const result = await runTemplatePackageImportPipeline({
      format: "zip",
      buffer: bytes,
      sourceName: file.name,
    });
    if (!result.package) throw new Error("The replacement ZIP is not importable.");
    const digest = await createTemplatePackageDigest(result.package);
    const plan = planTemplateFamilyVariantReimport(
      family,
      variantId,
      result.package,
      wizard.familySession.getSnapshot().familyRevision,
      {
        sourceName: file.name,
        importedAt: new Date().toISOString(),
        packageDigest: digest.value,
      },
    );
    setReimportPlans((current) => ({ ...current, [variantId]: plan }));
    setReimportAddedChoices((current) => ({
      ...current,
      [variantId]: Object.fromEntries(plan.addedTargets.map((target) => [targetKey(target), "new"])),
    }));
    setReimportFieldChoices((current) => ({ ...current, [variantId]: {} }));
    setReimportOrphanRemovals((current) => ({ ...current, [variantId]: [] }));
    const reader = createZipBundleReader(bytes, { sourceName: file.name });
    const previewFile = reader.bundle.index.optional["preview.png"];
    const preview = previewFile
      ? reader.readBlob(previewFile.normalizedPath, "image/png")
      : null;
    inspectedReimportPreviewBlobsRef.current[variantId] =
      preview?.ok && preview.value ? preview.value : null;
  };

  const applyReimport = (variantId: string) => {
    if (!family || !content) return;
    const plan = reimportPlans[variantId];
    if (!plan) return;
    const fieldChoices = reimportFieldChoices[variantId] ?? {};
    const removedFieldIds = reimportOrphanRemovals[variantId] ?? [];
    const resolvedBindings = plan.proposedBindings
      .filter((binding) => binding.targets.length > 0)
      .map((binding) => structuredClone(binding));
    for (const change of plan.fieldChanges.filter((candidate) => candidate.status === "unresolved")) {
      const selectedTargetKey = fieldChoices[change.familyFieldId];
      if (!selectedTargetKey || selectedTargetKey === "remove") continue;
      const selectedTarget = change.suggestedTargets.find((target) => targetKey(target) === selectedTargetKey);
      if (selectedTarget) {
        resolvedBindings.push({ familyFieldId: change.familyFieldId, targets: [selectedTarget] });
      }
    }
    const addedChoices = reimportAddedChoices[variantId] ?? {};
    const nextFields = getEffectiveEditableFields(plan.nextPackage);
    const remappedTargetKeys = new Set(
      Object.values(fieldChoices).filter((choice) => choice && choice !== "remove"),
    );
    const addedTargetResolutions: TemplateFamilyReimportAddedTargetResolutionV1[] = plan.addedTargets
      .filter((target) => !remappedTargetKeys.has(targetKey(target)))
      .map((target) => {
      const choice = addedChoices[targetKey(target)] ?? "new";
      if (choice !== "new") return { target, action: "bind-existing", familyFieldId: choice };
      const packageField = nextFields.find((field) => targetKey({
        fieldId: field.id,
        nodeId: field.nodeId,
        property: field.property,
      }) === targetKey(target));
      return {
        target,
        action: "create-variant-specific",
        fieldId: `field:${crypto.randomUUID()}`,
        key: packageField?.id,
        title: packageField?.label,
      };
    });
    const applied = applyTemplateFamilyVariantReimportState(
      family,
      content,
      plan,
      wizard.familySession.getSnapshot().familyRevision,
      {
        resolvedBindings,
        addedTargetResolutions,
        removeOrphanFamilyFieldIds: removedFieldIds,
      },
    );
    wizard.replaceFamily(applied.family);
    wizard.replaceContent(applied.content);
    pendingVariantPreviewBlobsRef.current[variantId] =
      inspectedReimportPreviewBlobsRef.current[variantId] ?? null;
    delete inspectedReimportPreviewBlobsRef.current[variantId];
    setReimportPlans((current) => {
      const next = { ...current };
      delete next[variantId];
      return next;
    });
  };

  const handlePreviewRenderIdentity = useCallback(
    (identity: ResolvedProductRenderIdentityV1) => {
      const variantId = wizard.getSnapshot().previewVariantId;
      if (!variantId) return;
      const sessionRevision = wizard.familySession.renderSession.getSnapshot().revision;
      setRenderEvidence((current) =>
        current?.variantId === variantId &&
        current.sessionRevision === sessionRevision &&
        current.identity.identityId === identity.identityId &&
        current.identity.readiness === identity.readiness &&
        current.identity.exportSafety === identity.exportSafety
          ? current
          : { variantId, sessionRevision, identity },
      );
    },
    [wizard],
  );

  const checkVariant = async (variantId: string) => {
    if (!snapshot.validation?.definitionValid) return;
    setCheckingVariantId(variantId);
    wizard.publishRenderValidation({
      variantId,
      status: "stale",
      issues: [],
    });
    await new Promise<void>((resolve) => {
      let completed = false;
      let timeout = 0;
      const finishCheck = () => {
        if (completed) return;
        completed = true;
        window.clearTimeout(timeout);
        unsubscribe();
        resolve();
      };
      const unsubscribe = wizard.subscribe(() => {
        const report = wizard.getSnapshot().renderValidation[variantId];
        const currentFamilySession = wizard.familySession.getSnapshot();
        const currentRevision = wizard.familySession.renderSession.getSnapshot().revision;
        if (
          currentFamilySession.selectedVariantId === variantId &&
          currentFamilySession.materialization?.variantId === variantId &&
          currentFamilySession.renderSessionRevision === currentRevision &&
          report?.sessionRevision === currentRevision &&
          (report.status === "ready" || report.status === "warning" || report.status === "blocked")
        ) finishCheck();
      });
      wizard.selectPreviewVariant(variantId);
      setSelectedVariantId(variantId);
      timeout = window.setTimeout(() => {
        const currentFamilySession = wizard.familySession.getSnapshot();
        if (
          currentFamilySession.selectedVariantId !== variantId ||
          currentFamilySession.materialization?.variantId !== variantId
        ) {
          finishCheck();
          return;
        }
        wizard.publishRenderValidation({
          variantId,
          status: "blocked",
          sessionRevision: currentFamilySession.renderSessionRevision,
          issues: [{
            code: "family-preview.validation-timeout",
            severity: "error",
            message: "The selected variant did not produce current renderer evidence in time.",
          }],
        });
        finishCheck();
      }, 8000);
    });
    setCheckingVariantId((current) => current === variantId ? null : current);
  };

  const checkSelectedVariant = async () => {
    if (!selectedVariant) return;
    await checkVariant(selectedVariant.id);
  };

  const checkAllVariants = async () => {
    if (!family || !snapshot.validation?.definitionValid) return;
    setCheckingAll(true);
    try {
      for (const variant of family.variants) await checkVariant(variant.id);
    } finally {
      setCheckingVariantId(null);
      setCheckingAll(false);
    }
  };

  useEffect(() => {
    if (stepIndex !== 4) {
      validationVisitStartedRef.current = false;
      return;
    }
    if (
      validationVisitStartedRef.current ||
      !family ||
      !snapshot.validation?.definitionValid
    ) return;

    const needsValidation = family.variants.some((variant) => {
      const status = wizard.getSnapshot().renderValidation[variant.id]?.status;
      return status !== "ready" && status !== "warning";
    });
    if (!needsValidation) {
      validationVisitStartedRef.current = true;
      return;
    }

    validationVisitStartedRef.current = true;
    void checkAllVariants().catch(() => {
      validationVisitStartedRef.current = false;
    });
  }, [family?.id, snapshot.renderValidation, snapshot.validation?.definitionValid, stepIndex]);

  const navigateToDiagnosticOwner = useCallback(
    (issue: PackageQualityIssue) => {
      const details = issue.details ?? {};
      const issueVariantId = typeof details.variantId === "string"
        ? details.variantId
        : selectedVariantId;
      if (issueVariantId && family?.variants.some((variant) => variant.id === issueVariantId)) {
        setSelectedVariantId(issueVariantId);
        if (snapshot.validation?.definitionValid) wizard.selectPreviewVariant(issueVariantId);
      }
      const familyFieldId = typeof details.familyFieldId === "string"
        ? details.familyFieldId
        : selectedVariant?.bindings.find((binding) =>
            binding.targets.some((target) =>
              target.fieldId === issue.fieldId &&
              (!issue.nodeId || target.nodeId === issue.nodeId),
            ),
          )?.familyFieldId;
      if (familyFieldId) setSelectedFieldId(familyFieldId);
      const owner = qualityIssueOwnerStep(issue);
      const ownerIndex = studioStepIndexForOwner(owner);
      if (ownerIndex >= 0) navigateStep(ownerIndex);
      return { owner, issueVariantId };
    },
    [family, navigateStep, selectedVariant, selectedVariantId, snapshot.validation?.definitionValid, wizard],
  );

  const handleDiagnosticAction = useCallback(
    (action: DiagnosticUserAction, issue: PackageQualityIssue) => {
      const owner = qualityIssueOwnerStep(issue);
      const issueVariantId = typeof issue.details?.variantId === "string"
        ? issue.details.variantId
        : selectedVariantId;
      if (owner === "validate" && action.kind === "retry-validation" && issueVariantId) {
        void checkVariant(issueVariantId);
        return;
      }
      navigateToDiagnosticOwner(issue);
    },
    [navigateToDiagnosticOwner, selectedVariantId],
  );

  const finish = async () => {
    const title = pendingTemplateName.trim();
    if (!family || !title) return;
    setSaving(true);
    try {
      if (family.title !== title) wizard.replaceFamily({ ...family, title });
      const confirmation = await wizard.confirm();
      await onSave(
        confirmation,
        savedFamily,
        pendingVariantPreviewBlobsRef.current,
      );
    } finally {
      setSaving(false);
    }
  };

  const pendingTargets = family?.variants.flatMap((variant) =>
    unboundTargets(family, variant.id).map((target) => ({ variant, target })),
  ) ?? [];
  const activePendingTarget = selectedPendingTarget
    ? pendingTargets.find((item) =>
        item.variant.id === selectedPendingTarget.variantId &&
        targetKey(item.target) === selectedPendingTarget.key,
      ) ?? null
    : null;
  const selectedTargetIds = selectedField && selectedVariant
    ? selectedVariant.bindings
        .find((binding) => binding.familyFieldId === selectedField.id)
        ?.targets.map((target) => target.nodeId) ?? []
    : activePendingTarget && activePendingTarget.variant.id === selectedVariant?.id
      ? [activePendingTarget.target.nodeId]
      : [];

  const normalizedFieldQuery = fieldQuery.trim().toLocaleLowerCase();
  const filteredFields = family?.fields.filter((field) => {
    const scope = getTemplateFamilyFieldScope(family, field.id);
    if (normalizedFieldQuery && ![
      field.title,
      field.key,
      editableFieldTypeLabel(field.type),
      scopeLabel(scope, family),
    ].some((value) => value.toLocaleLowerCase().includes(normalizedFieldQuery))) return false;
    if (fieldFilter === "shared") return scope.kind === "family-wide" || scope.kind === "variant-subset";
    if (fieldFilter === "specific") return scope.kind === "variant-specific";
    if (fieldFilter === "attention") {
      return scope.kind === "unbound" || fieldBlockers.some((issue) => issue.fieldId === field.id);
    }
    return true;
  }) ?? [];
  const filteredPendingTargets = pendingTargets.filter(({ variant, target }) => {
    if (fieldFilter !== "all" && fieldFilter !== "attention") return false;
    if (!normalizedFieldQuery) return true;
    return [variant.title, target.fieldId, target.property, target.nodeId]
      .some((value) => value.toLocaleLowerCase().includes(normalizedFieldQuery));
  });
  const fieldDecisionCount = pendingTargets.length + (family?.fields.filter((field) =>
    getTemplateFamilyFieldScope(family, field.id).kind === "unbound",
  ).length ?? 0);

  const filteredRuleFields = family?.fields.filter((field) => {
    const scope = getTemplateFamilyFieldScope(family, field.id);
    if (ruleFilter === "visible") return Boolean(selectedVariant && scope.variantIds.includes(selectedVariant.id));
    if (ruleFilter === "shared") return scope.kind === "family-wide" || scope.kind === "variant-subset";
    if (ruleFilter === "specific") return scope.kind === "variant-specific";
    if (ruleFilter === "attention") {
      return scope.kind === "unbound" || fieldBlockers.some((issue) => issue.fieldId === field.id);
    }
    return true;
  }) ?? [];

  const renderRuleCard = (
    field: TemplateFamilyFieldV1,
    control: TemplateFamilyControlRefV1,
    index: number,
    controlCount: number,
  ) => {
    if (!family) return null;
    const controlKey = editorControlKey(control);
    const scope = getTemplateFamilyFieldScope(family, field.id);
    const applicable = family.variants.filter((variant) => scope.variantIds.includes(variant.id));
    const expanded = expandedRuleFieldId === field.id;
    const applicableToSelection = Boolean(selectedVariant && scope.variantIds.includes(selectedVariant.id));
    const suggestionCount = applicable.filter((variant) =>
      Boolean(snapshot.matchPlans[variant.id]?.suggestedRuleOverrides[field.id]),
    ).length;
    const overrideCount = applicable.filter((variant) => variant.ruleOverrides[field.id]).length;
    const showDifferences = overrideCount > 0 || suggestionCount > 0 || openRuleDifferences.has(field.id);
    return (
      <FieldRuleCardShell
        key={field.id}
        fieldId={field.id}
        title={field.title}
        summary={ruleSummary(field)}
        typeLabel={editableFieldTypeLabel(field.type)}
        selected={selectedFieldId === field.id}
        expanded={expanded}
        statuses={[{ label: scopeLabel(scope, family), tone: scopeTone(scope) }]}
        onSelect={() => {
          setSelectedFieldId(field.id);
          setExpandedRuleFieldId((current) => current === field.id ? null : field.id);
        }}
        reorderLabel={`Drag ${field.title} to reorder`}
        onDragStart={(event) => {
          setDraggedEditorControlKey(controlKey);
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", controlKey);
        }}
        onDragEnd={() => {
          setDraggedEditorControlKey(null);
          setEditorControlDropIndex(null);
        }}
        dropBefore={editorControlDropIndex === index}
        onDragOver={(event) => {
          if (!draggedEditorControlKey) return;
          event.preventDefault();
          setEditorControlDropIndex(index);
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (draggedEditorControlKey) moveEditorControlByKey(draggedEditorControlKey, index);
          setDraggedEditorControlKey(null);
          setEditorControlDropIndex(null);
        }}
        reorderActions={(
          <Menu label={<MoreHorizontal size={16} />} accessibleLabel={`More actions for ${field.title}`}>
            {index > 0 ? <MenuItem onClick={() => moveEditorControl(index, index - 1)}>Move up</MenuItem> : null}
            {index < controlCount - 1 ? <MenuItem onClick={() => moveEditorControl(index, index + 1)}>Move down</MenuItem> : null}
            <MenuItem onClick={() => moveEditorControl(index, 0)}>Move to top</MenuItem>
            <MenuItem onClick={() => moveEditorControl(index, controlCount - 1)}>Move to bottom</MenuItem>
          </Menu>
        )}
        content={(
          <>
            <FamilyFieldDefault field={field} family={family} />
            {!applicableToSelection && applicable[0] ? (
              <Alert tone="info" title={`Not used in ${selectedVariant?.title ?? "this variant"}`}>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span>Its value and rules are retained for {applicable.map((variant) => variant.title).join(", ")}.</span>
                  <Button size="small" variant="secondary" onClick={() => selectPreviewVariant(applicable[0].id)}>
                    Preview in {applicable[0].title}
                  </Button>
                </div>
              </Alert>
            ) : null}
            <section className="family-rule-section">
              <div>
                <h3 className="ui-subsection-title">Common rule</h3>
                <p className="ui-help-text">Applies wherever this field is available.</p>
              </div>
              <RuleControls field={field} constraints={field.rule.constraints} onChange={(key, value) => updateCommonConstraint(field.id, key, value)} />
            </section>
            {suggestionCount ? (
              <Alert tone="info" title="Imported differences available">
                Review the variant differences below before adopting imported constraints.
              </Alert>
            ) : null}
            {applicable.length > 1 && showDifferences ? (
              <Disclosure summary={`Variant differences (${overrideCount})`} defaultOpen={openRuleDifferences.has(field.id)}>
                <div className="space-y-4">
                  {applicable.map((variant) => {
                    const override = variant.ruleOverrides[field.id];
                    const mode = override?.constraints === null ? "clear" : override ? "override" : "inherit";
                    const effective = resolveTemplateFamilyFieldRule(field.rule, override);
                    const suggestions = snapshot.matchPlans[variant.id]?.suggestedRuleOverrides[field.id];
                    return (
                      <div className="family-rule-override" key={variant.id}>
                        <div className="flex items-center justify-between gap-3">
                          <strong>{variant.title}</strong>
                          <Status tone={mode === "inherit" ? "neutral" : "info"}>
                            {mode === "inherit" ? "Inherits common" : mode === "clear" ? "Clears common" : "Variant override"}
                          </Status>
                        </div>
                        <Select label="Rule authority" value={mode} onChange={(event) => setOverrideMode(variant.id, field.id, event.target.value as "inherit" | "override" | "clear")}>
                          <option value="inherit">Inherit common rule</option>
                          <option value="override">Override for this variant</option>
                          <option value="clear">Clear common rule</option>
                        </Select>
                        {mode === "override" ? <RuleControls field={field} constraints={effective.rule.constraints} onChange={(key, value) => updateOverrideConstraint(variant.id, field.id, key, value)} /> : null}
                        {suggestions ? <Button size="small" variant="secondary" onClick={() => applySuggestedOverrides(variant.id)}>Use imported difference</Button> : null}
                      </div>
                    );
                  })}
                </div>
              </Disclosure>
            ) : applicable.length > 1 ? (
              <Button
                size="small"
                variant="secondary"
                onClick={() => setOpenRuleDifferences((current) => new Set(current).add(field.id))}
              >
                Add variant difference
              </Button>
            ) : null}
          </>
        )}
      />
    );
  };
  const selectedIssueDetails = selectedQualityIssue?.details ?? {};
  const diagnosticSupplementalDetails = [
    { label: "Variant", value: selectedVariant?.title },
    {
      label: "Field scope",
      value: typeof selectedIssueDetails.fieldScopeLabel === "string"
        ? selectedIssueDetails.fieldScopeLabel
        : null,
    },
    {
      label: "Applicable variants",
      value: Array.isArray(selectedIssueDetails.applicableVariantTitles)
        ? selectedIssueDetails.applicableVariantTitles.filter((value): value is string => typeof value === "string").join(", ")
        : null,
    },
    {
      label: "Family field",
      value: typeof selectedIssueDetails.familyFieldTitle === "string"
        ? selectedIssueDetails.familyFieldTitle
        : null,
    },
    {
      label: "Rule property",
      value: typeof selectedIssueDetails.rulePath === "string"
        ? selectedIssueDetails.rulePath
        : null,
    },
    {
      label: "Rule authority",
      value: typeof selectedIssueDetails.authority === "string"
        ? selectedIssueDetails.authority
        : null,
    },
  ];
  const selectedReimportPlan = selectedVariant ? reimportPlans[selectedVariant.id] : null;
  const selectedReimportFieldChoices = selectedVariant
    ? reimportFieldChoices[selectedVariant.id] ?? {}
    : {};
  const selectedReimportOrphanRemovals = selectedVariant
    ? reimportOrphanRemovals[selectedVariant.id] ?? []
    : [];
  const selectedReimportReady = selectedReimportPlan
    ? selectedReimportPlan.fieldChanges.every((change) =>
        change.status !== "unresolved" ||
        Boolean(selectedReimportFieldChoices[change.familyFieldId]) ||
        selectedReimportOrphanRemovals.includes(change.familyFieldId),
      )
    : false;
  const contextPreviewItems: ContextPreviewItem[] = family?.variants.map((variant) => ({
    id: variant.id,
    title: variant.title,
  })) ?? [];
  const validationPreviewItems: ContextPreviewItem[] = family?.variants.map((variant) => {
    const renderStatus = snapshot.renderValidation[variant.id]?.status ?? "not-run";
    const variantIssues = snapshot.validation?.variants.find((item) => item.variantId === variant.id)?.issues ?? [];
    const importStatus = snapshot.variantImports[variant.id]?.importValidation.status ??
      (validateTemplatePackage(variant.packageValue).valid ? "ready" : "blocked");
    const blocked = importStatus === "blocked" ||
      !areExactFontRequirementsResolved(variant.packageValue) ||
      variantIssues.some((issue) => issue.severity === "error") ||
      renderStatus === "blocked";
    const review = !blocked && (
      importStatus === "warning" ||
      variantIssues.some((issue) => issue.severity === "warning") ||
      renderStatus === "warning" ||
      renderStatus === "stale" ||
      renderStatus === "not-run"
    );
    return {
      id: variant.id,
      title: variant.title,
      status: {
        label: blocked
          ? "Blocked"
          : checkingVariantId === variant.id
            ? "Checking"
          : review
            ? renderStatus === "stale"
              ? "Stale"
              : renderStatus === "not-run"
                ? "Not checked"
                : "Needs attention"
            : "Ready",
        tone: blocked ? "blocked" : review || checkingVariantId === variant.id ? "attention" : "repaired",
      },
    };
  }) ?? [];

  const variantImportStatus = (variantId: string) => {
    const report = snapshot.variantImports[variantId]?.importValidation;
    return {
      label: report?.status === "blocked"
        ? "Blocked"
        : report?.status === "warning"
          ? "Needs attention"
          : "Ready",
      tone: report?.status === "blocked"
        ? "blocked" as const
        : report?.status === "warning"
          ? "attention" as const
          : "repaired" as const,
    };
  };

  const checkingVariantIndex = checkingVariantId && family
    ? family.variants.findIndex((variant) => variant.id === checkingVariantId)
    : -1;
  const checkingProgressLabel = checkingAll && checkingVariantIndex >= 0 && family
    ? `Checking ${checkingVariantIndex + 1} of ${family.variants.length} variants`
    : null;
  const currentBlockerMessage = !canContinue
    ? stepIndex === 0
      ? variantNameBlockers.length
        ? `${variantNameBlockers.length} variant ${variantNameBlockers.length === 1 ? "name needs" : "names need"} attention.`
        : groupBlockers[0]?.message ?? "Add an importable variant to continue."
      : stepIndex === 1
        ? "Resolve every exact font requirement to continue."
        : stepIndex === 2
          ? `${fieldDecisionCount || fieldBlockers.length} field ${fieldDecisionCount === 1 ? "decision is" : "decisions are"} required.`
          : stepIndex === 3
            ? `${ruleBlockers.length || 1} field rule ${ruleBlockers.length === 1 ? "needs" : "rules need"} attention.`
            : stepIndex === 4
              ? "Check every variant before review."
              : !pendingTemplateName.trim()
                ? "Enter a template name before saving."
                : "Resolve the remaining checklist items before saving."
    : null;

  const requestExit = () => {
    if (
      hasUnsavedChanges &&
      !window.confirm("Discard the unsaved changes to this template?")
    ) return;
    onCancel();
  };

  const renderInitialUpload = () => (
    <div
      className="setup-package-dropzone"
      data-mode="first"
      data-active={dragActive || undefined}
      onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setDragActive(true); }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragActive(false);
      }}
      onDrop={handleDrop}
    >
      <span className="setup-package-dropzone__icon"><Upload size={20} /></span>
      <strong>Drop a template ZIP</strong>
      <FilePickerButton
        accept=".zip,application/zip,application/x-zip-compressed"
        disabled={snapshot.busy}
        leadingIcon={<FileArchive size={16} />}
        onSelect={(file) => {
          if (file) void loadZip(file, "first");
        }}
      >
        Choose ZIP
      </FilePickerButton>
    </div>
  );

  return (
    <TemplateFamilyImportWizardProvider wizard={wizard}>
      <AppShell
        navigation={
          <div className="setup-navigation">
            <Button variant="quiet" leadingIcon={<ArrowLeft size={16} />} onClick={requestExit}>
              Templates
            </Button>
            <ol className="setup-navigation__steps">
              {studioSteps.map((step, index) => {
                const available = Boolean(family) && (savedFamily || index <= maxVisitedStep + 1);
                const blocked = index < stepIndex && index === 1 && !fontsReady;
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      className="setup-navigation__step"
                      aria-current={index === stepIndex ? "step" : undefined}
                      disabled={!available || snapshot.busy || saving}
                      onClick={() => navigateStep(index)}
                    >
                      <span className="setup-navigation__number">
                        {index < stepIndex && !blocked ? <CheckCircle2 size={16} /> : index + 1}
                      </span>
                      <span>{step.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        }
        header={
          <div className="setup-header">
            <div>
              <p className="ui-metadata">{savedFamily ? "Template settings" : "Template setup"}</p>
              <h1 className="setup-header__title">{studioSteps[stepIndex].label}</h1>
            </div>
            <div className="setup-header__actions">
              {savedFamily ? (
                <span className="setup-header__context">
                  {pendingTemplateName.trim() || savedFamily.family.title}
                </span>
              ) : null}
              {snapshot.busy ? <Status tone="attention">Importing…</Status> : null}
            </div>
          </div>
        }
        mainLabel={savedFamily ? "Template settings" : "Template setup"}
      >
        <PageWorkspace className="setup-flow family-setup-flow" data-testid="family-import-wizard">
          <PageContent ref={contentRef} className="setup-flow__content">
            {snapshot.error ? (
              <Alert tone="blocked" title="Template setup needs attention" className="mb-5">
                {snapshot.error.message}
              </Alert>
            ) : null}

            {stepIndex === 0 ? (
              <div className="space-y-5" data-testid="family-step-variants">
                <div className="max-w-3xl">
                  <p className="ui-page-description">
                    Add one ZIP for each design and define how people choose between them.
                  </p>
                </div>
                {!family ? renderInitialUpload() : (
                  <>
                    <FamilyVariantPropertyTable
                      family={family}
                      selectedVariantId={selectedVariant?.id ?? null}
                      busy={snapshot.busy}
                      statusForVariant={variantImportStatus}
                      onChange={replaceFamily}
                      onAddZip={(file) => void loadZip(file, "add-variant")}
                      onSelectVariant={setSelectedVariantId}
                      onPreview={(variantId) => {
                        selectPreviewVariant(variantId);
                        setVariantDrawerOpen(true);
                      }}
                      onMove={moveVariant}
                      onDelete={(variantId) => {
                        if (confirmRemoveVariantId === variantId) removeVariant(variantId);
                        else setConfirmRemoveVariantId(variantId);
                      }}
                    />
                    {variantNameBlockers.length ? (
                      <Alert tone="blocked" title="Variant names need attention">
                        Give every variant a unique name before continuing.
                      </Alert>
                    ) : null}
                    {groupBlockers.length ? (
                      <Alert tone="blocked" title="Variant selection needs attention">
                        {groupBlockers[0].message}
                      </Alert>
                    ) : null}

                    <SideDrawer
                      open={variantDrawerOpen && Boolean(selectedVariant)}
                      title={selectedVariant?.title ?? "Variant details"}
                      description="Preview, replace or inspect this ZIP-backed design."
                      onClose={() => setVariantDrawerOpen(false)}
                    >
                      {selectedVariant ? (
                        <>
                          <TemplateInspectionPreview packageValue={selectedVariant.packageValue} targetNodeIds={[]} targetFitLabel="Fit variant" />
                          {selectedReimportPlan ? (
                            <Alert
                              tone={selectedReimportReady ? "repaired" : "attention"}
                              title={selectedReimportReady ? "Replacement ready" : "Replacement needs decisions"}
                            >
                              <div className="family-reimport-review">
                                <p className="ui-supporting-copy">
                                  {selectedReimportPlan.addedTargets.length} added · {selectedReimportPlan.removedTargets.length} removed · {selectedReimportPlan.incompatibleTargets.length} incompatible
                                </p>
                                {selectedReimportPlan.fieldChanges.filter((change) => change.status === "unresolved").map((change) => {
                                  const field = family.fields.find((candidate) => candidate.id === change.familyFieldId);
                                  if (change.suggestedTargets.length > 0) {
                                    return (
                                      <Select
                                        key={change.familyFieldId}
                                        label={`Remap ${field?.title ?? "field"}`}
                                        value={selectedReimportFieldChoices[change.familyFieldId] ?? ""}
                                        onChange={(event) => {
                                          const value = event.target.value;
                                          setReimportFieldChoices((current) => ({
                                            ...current,
                                            [selectedVariant.id]: {
                                              ...(current[selectedVariant.id] ?? {}),
                                              [change.familyFieldId]: value,
                                            },
                                          }));
                                          setReimportOrphanRemovals((current) => ({
                                            ...current,
                                            [selectedVariant.id]: value === "remove"
                                              ? Array.from(new Set([...(current[selectedVariant.id] ?? []), change.familyFieldId]))
                                              : (current[selectedVariant.id] ?? []).filter((fieldId) => fieldId !== change.familyFieldId),
                                          }));
                                        }}
                                      >
                                        <option value="">Choose a compatible field</option>
                                        {change.suggestedTargets.map((target) => (
                                          <option key={targetKey(target)} value={targetKey(target)}>{target.fieldId}</option>
                                        ))}
                                        <option value="remove">Remove the field and its stored content</option>
                                      </Select>
                                    );
                                  }
                                  return (
                                    <CheckboxField
                                      key={change.familyFieldId}
                                      checked={selectedReimportOrphanRemovals.includes(change.familyFieldId)}
                                      onChange={(checked) => setReimportOrphanRemovals((current) => ({
                                        ...current,
                                        [selectedVariant.id]: checked
                                          ? [...(current[selectedVariant.id] ?? []), change.familyFieldId]
                                          : (current[selectedVariant.id] ?? []).filter((fieldId) => fieldId !== change.familyFieldId),
                                      }))}
                                      label={`Remove “${field?.title ?? "field"}” and its stored content`}
                                    />
                                  );
                                })}
                                {selectedReimportPlan.addedTargets
                                  .filter((target) => !Object.values(selectedReimportFieldChoices).includes(targetKey(target)))
                                  .map((target) => {
                                    const compatible = compatibleFamilyFieldsInPackage(family, selectedReimportPlan.nextPackage, target);
                                    return (
                                      <Select
                                        key={targetKey(target)}
                                        label={`New field: ${target.fieldId}`}
                                        helpText="Keep it in this variant or link it to a compatible field."
                                        value={reimportAddedChoices[selectedVariant.id]?.[targetKey(target)] ?? "new"}
                                        onChange={(event) => setReimportAddedChoices((current) => ({
                                          ...current,
                                          [selectedVariant.id]: {
                                            ...(current[selectedVariant.id] ?? {}),
                                            [targetKey(target)]: event.target.value,
                                          },
                                        }))}
                                      >
                                        <option value="new">Keep in {selectedVariant.title} only</option>
                                        {compatible.map((field) => <option key={field.id} value={field.id}>Link to {field.title}</option>)}
                                      </Select>
                                    );
                                  })}
                                <Button size="small" variant="secondary" disabled={!selectedReimportReady} onClick={() => applyReimport(selectedVariant.id)}>
                                  Apply reviewed replacement
                                </Button>
                              </div>
                            </Alert>
                          ) : null}
                          <Disclosure summary="Technical details">
                            <div className="family-technical-facts">
                              <span>Source</span><strong>{selectedVariant.source.sourceName ?? "Imported ZIP"}</strong>
                              <span>Canvas</span><strong>{selectedVariant.packageValue.canvas.width} × {selectedVariant.packageValue.canvas.height}</strong>
                              <span>Layers</span><strong>{Object.keys(selectedVariant.packageValue.nodes).length}</strong>
                              <span>Assets</span><strong>{Object.keys(selectedVariant.packageValue.assets).length}</strong>
                            </div>
                          </Disclosure>
                          <div className="family-variant-detail__actions">
                            <FilePickerButton
                              size="small"
                              accept=".zip,application/zip"
                              leadingIcon={<Upload size={15} />}
                              onSelect={(file) => {
                                if (file) void inspectReimport(selectedVariant.id, file);
                              }}
                            >
                              Replace ZIP
                            </FilePickerButton>
                            <Status tone={variantImportStatus(selectedVariant.id).tone}>
                              {variantImportStatus(selectedVariant.id).label}
                            </Status>
                          </div>
                        </>
                      ) : null}
                    </SideDrawer>
                  </>
                )}
              </div>
            ) : null}

            {stepIndex === 1 && family ? (
              <div className="space-y-5" data-testid="family-step-fonts">
                <p className="ui-page-description">Verify the exact fonts used by every variant.</p>
                <FamilyFontPreparationPanel family={family} onFamilyChange={replaceFamily} />
              </div>
            ) : null}

            {stepIndex === 2 && family && content ? (
              <div className="space-y-5" data-testid="family-step-fields">
                <p className="ui-page-description">Decide which fields share content across variants.</p>
                <div className="setup-fields-layout">
                  <div className="space-y-5">
                  <div className="family-step-heading">
                    <h2 className="ui-section-title">Field coverage</h2>
                    {fieldDecisionCount ? (
                      <Button size="small" variant="quiet" onClick={() => setFieldFilter("attention")}>
                        {fieldDecisionCount} {fieldDecisionCount === 1 ? "field needs" : "fields need"} decisions
                      </Button>
                    ) : null}
                  </div>
                  {family.fields.length + pendingTargets.length > 12 ? (
                    <Input
                      label="Search fields"
                      value={fieldQuery}
                      placeholder="Search names, types or variants"
                      onChange={(event) => setFieldQuery(event.target.value)}
                    />
                  ) : null}
                  <div className="field-rules-filters" aria-label="Field filters">
                    {(["all", "shared", "specific", "attention"] as const).map((filter) => (
                      <FilterChip
                        key={filter}
                        selected={fieldFilter === filter}
                        label={filter === "all" ? "All" : filter === "shared" ? "Shared" : filter === "specific" ? "Variant-specific" : "Needs attention"}
                        onClick={() => setFieldFilter(filter)}
                      />
                    ))}
                  </div>
                  <div className="family-field-list family-config-list">
                    {filteredFields.map((field) => {
                      const scope = getTemplateFamilyFieldScope(family, field.id);
                      return (
                        <Surface as="section" className="family-field-card family-config-list__row" data-selected={selectedFieldId === field.id || undefined} key={field.id}>
                          <button type="button" className="family-field-card__summary" onClick={() => {
                            setSelectedPendingTarget(null);
                            setSelectedFieldId(field.id);
                          }}>
                            <span>
                              <strong>{field.title}</strong>
                              <span className="block text-xs text-content-muted">{editableFieldTypeLabel(field.type)}</span>
                            </span>
                            <Status tone={scopeTone(scope)}>{scopeLabel(scope, family)}</Status>
                          </button>
                          {selectedFieldId === field.id ? <div className="family-field-coverage">
                            {family.variants.map((variant) => {
                              const binding = variant.bindings.find((candidate) => candidate.familyFieldId === field.id);
                              return (
                                <div className="family-field-coverage__row" key={variant.id}>
                                  <span>{variant.title}</span>
                                  {binding?.targets.length ? (
                                    <span className="family-field-coverage__targets">
                                      {binding.targets.map((target) => (
                                        <span key={targetKey(target)}>
                                          <Link2 size={13} /> {target.fieldId}
                                          <Button size="small" variant="quiet" aria-label={`Remove connection from ${variant.title}`} onClick={() => replaceFamily(unbindTemplateFamilyFieldTarget(family, variant.id, field.id, target))}>Remove this connection</Button>
                                        </span>
                                      ))}
                                    </span>
                                  ) : <span className="text-content-muted">Not used</span>}
                                </div>
                              );
                            })}
                          </div> : null}
                          {scope.kind === "unbound" ? (
                            <Button variant="destructive" size="small" onClick={() => {
                              const removed = removeTemplateFamilyField(family, content, field.id);
                              wizard.replaceFamily(removed.family);
                              wizard.replaceContent(removed.content);
                            }}>Remove unassigned field</Button>
                          ) : null}
                        </Surface>
                      );
                    })}
                    {filteredPendingTargets.map(({ variant, target }) => {
                      const pendingKey = targetKey(target);
                      const selected = selectedPendingTarget?.variantId === variant.id && selectedPendingTarget.key === pendingKey;
                      const compatible = compatibleFamilyFields(family, variant.id, target);
                      return (
                        <Surface
                          as="section"
                          className="family-field-card family-field-card--attention family-config-list__row"
                          data-selected={selected || undefined}
                          data-attention="true"
                          key={`${variant.id}:${pendingKey}`}
                        >
                          <button type="button" className="family-field-card__summary" onClick={() => {
                            setSelectedFieldId(null);
                            setSelectedPendingTarget({ variantId: variant.id, key: pendingKey });
                            selectPreviewVariant(variant.id);
                          }}>
                            <span>
                              <strong>{target.fieldId}</strong>
                              <span className="block text-xs text-content-muted">{variant.title}</span>
                            </span>
                            <Status tone="attention">Not connected</Status>
                          </button>
                          {selected ? (
                            <div className="family-unmatched-field">
                              <Select label="Use the same content as…" value="" onChange={(event) => {
                                if (event.target.value) {
                                  bindTarget(variant.id, event.target.value, target);
                                  setSelectedPendingTarget(null);
                                }
                              }}>
                                <option value="">Choose compatible field…</option>
                                {compatible.map((field) => <option key={field.id} value={field.id}>{field.title}</option>)}
                              </Select>
                              <Button variant="secondary" onClick={() => {
                                keepVariantSpecific(variant.id, target);
                                setSelectedPendingTarget(null);
                              }}>Keep only in {variant.title}</Button>
                              <Disclosure summary="Technical details">
                                <p className="ui-technical-detail">{target.property} · {target.nodeId}</p>
                              </Disclosure>
                            </div>
                          ) : null}
                        </Surface>
                      );
                    })}
                    {filteredFields.length === 0 && filteredPendingTargets.length === 0 ? (
                      <div className="field-rules-empty">
                        <p className="ui-subsection-title">No fields match this view</p>
                        <Button size="small" variant="quiet" onClick={() => {
                          setFieldFilter("all");
                          setFieldQuery("");
                        }}>Show all fields</Button>
                      </div>
                    ) : null}
                  </div>
                </div>
                <section className="setup-fields-preview">
                  <div className="mb-4">
                    <h2 className="ui-section-title">Field preview</h2>
                    <p className="mt-1 text-sm text-content-muted">
                      {selectedField
                        ? `${selectedField.title} in ${selectedVariant?.title ?? "selected variant"}`
                        : activePendingTarget
                          ? `${activePendingTarget.target.fieldId} in ${activePendingTarget.variant.title}`
                          : "Select a field to inspect its targets."}
                    </p>
                  </div>
                  {selectedField && selectedVariant && selectedTargetIds.length === 0 ? (
                    (() => {
                      const scope = getTemplateFamilyFieldScope(family, selectedField.id);
                      const firstVariant = family.variants.find((variant) => scope.variantIds.includes(variant.id));
                      return firstVariant ? (
                        <Alert tone="info" title={`Not used in ${selectedVariant.title}`}>
                          <Button size="small" variant="secondary" onClick={() => selectPreviewVariant(firstVariant.id)}>Preview in {firstVariant.title}</Button>
                        </Alert>
                      ) : null;
                    })()
                  ) : null}
                  {selectedVariant ? (
                    <ContextPreviewFrame
                      items={contextPreviewItems}
                      selectedId={selectedVariant.id}
                      onSelect={selectPreviewVariant}
                      label="Previewing"
                    >
                      <TemplateInspectionPreview packageValue={selectedVariant.packageValue} targetNodeIds={selectedTargetIds} targetFitLabel="Fit selected field" />
                    </ContextPreviewFrame>
                  ) : null}
                </section>
                </div>
              </div>
            ) : null}

            {stepIndex === 3 && family ? (
              <div className="space-y-5" data-testid="family-step-rules">
                  <p className="ui-page-description">Set editor order and input limits.</p>
                <div className="setup-fields-layout">
                  <div className="space-y-5">
                    <div className="family-section-heading">
                      <div>
                        <h2 className="ui-section-title">Editing rules</h2>
                        <p className="ui-supporting-copy">Fields stay in the same order people will edit them.</p>
                      </div>
                      <Status tone="neutral">{family.fields.length} fields</Status>
                    </div>
                    <div className="field-rules-filters" aria-label="Field rule filters">
                      {(["all", "visible", "shared", "specific", "attention"] as const).map((filter) => (
                        <FilterChip
                          key={filter}
                          selected={ruleFilter === filter}
                          label={filter === "all" ? "All" : filter === "visible" ? "Available here" : filter === "shared" ? "Shared" : filter === "specific" ? "Variant-specific" : "Needs attention"}
                          onClick={() => setRuleFilter(filter)}
                        />
                      ))}
                    </div>
                    <div className="field-rules-grid" role="list" aria-label="Editor control order">
                      {getTemplateFamilyControlOrder(family).map((control, index, controls) => {
                        const key = editorControlKey(control);
                        if (control.kind === "field") {
                          const field = filteredRuleFields.find((candidate) => candidate.id === control.fieldId);
                          return field ? renderRuleCard(field, control, index, controls.length) : null;
                        }
                        if (ruleFilter !== "all") return null;
                        const title = control.kind === "direct-variant-selector"
                          ? "Variant"
                          : family.variantGroups.find((group) => group.id === control.groupId)?.title ?? "Selection property";
                        return (
                          <FieldRuleCardShell
                            key={key}
                            fieldId={key}
                            title={title}
                            summary="Selection control"
                            typeLabel="Selector"
                            selected={false}
                            expanded={false}
                            configurable={false}
                            selectable={false}
                            onSelect={() => undefined}
                            reorderLabel={`Drag ${title} to reorder`}
                            onDragStart={(event) => {
                              setDraggedEditorControlKey(key);
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", key);
                            }}
                            onDragEnd={() => {
                              setDraggedEditorControlKey(null);
                              setEditorControlDropIndex(null);
                            }}
                            dropBefore={editorControlDropIndex === index}
                            onDragOver={(event) => {
                              if (!draggedEditorControlKey) return;
                              event.preventDefault();
                              setEditorControlDropIndex(index);
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              if (draggedEditorControlKey) moveEditorControlByKey(draggedEditorControlKey, index);
                              setDraggedEditorControlKey(null);
                              setEditorControlDropIndex(null);
                            }}
                            reorderActions={(
                              <Menu label={<MoreHorizontal size={16} />} accessibleLabel={`More actions for ${title}`}>
                                {index > 0 ? <MenuItem onClick={() => moveEditorControl(index, index - 1)}>Move up</MenuItem> : null}
                                {index < controls.length - 1 ? <MenuItem onClick={() => moveEditorControl(index, index + 1)}>Move down</MenuItem> : null}
                                <MenuItem onClick={() => moveEditorControl(index, 0)}>Move to top</MenuItem>
                                <MenuItem onClick={() => moveEditorControl(index, controls.length - 1)}>Move to bottom</MenuItem>
                              </Menu>
                            )}
                          />
                        );
                      })}
                      {filteredRuleFields.length === 0 && ruleFilter !== "all" ? (
                        <div className="field-rules-empty">
                          <p className="ui-subsection-title">No fields match this filter</p>
                          <p className="ui-supporting-copy">Choose another filter to continue configuring rules.</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <section className="setup-fields-preview">
                    <div>
                      <h2 className="ui-section-title">Rule preview</h2>
                      <p className="ui-supporting-copy">
                        {selectedField ? `${selectedField.title} in ${selectedVariant?.title ?? "the selected variant"}` : "Select a field to locate it."}
                      </p>
                    </div>
                    {selectedVariant ? (
                      <ContextPreviewFrame
                        items={contextPreviewItems}
                        selectedId={selectedVariant.id}
                        onSelect={selectPreviewVariant}
                        label="Previewing"
                      >
                        <TemplateInspectionPreview packageValue={selectedVariant.packageValue} targetNodeIds={selectedTargetIds} targetFitLabel="Fit selected field" />
                      </ContextPreviewFrame>
                    ) : null}
                  </section>
                </div>
              </div>
            ) : null}

            {stepIndex === 4 && family ? (
              <div className="space-y-5" data-testid="family-step-validate">
                <div className="family-step-heading">
                  <div>
                    <p className="ui-page-description">Check every variant before saving.</p>
                    {checkingProgressLabel ? <p className="ui-supporting-copy" role="status">{checkingProgressLabel}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={allVariantsValidated ? "secondary" : "primary"}
                      disabled={checkingAll || Boolean(checkingVariantId) || !snapshot.validation?.definitionValid}
                      loading={checkingAll}
                      loadingLabel="Checking variants"
                      onClick={() => void checkAllVariants()}
                    >
                      {allVariantsValidated ? "Check again" : "Check all variants"}
                    </Button>
                    <Button
                      variant={allVariantsValidated ? "quiet" : "secondary"}
                      disabled={checkingAll || Boolean(checkingVariantId) || !snapshot.validation?.definitionValid || !selectedVariant}
                      loading={checkingVariantId === selectedVariant?.id && !checkingAll}
                      loadingLabel="Checking selected variant"
                      onClick={() => void checkSelectedVariant()}
                    >
                      Check this variant
                    </Button>
                  </div>
                </div>

                {qualityReport && selectedVariant && selectedPackage && selectedPackageValidation ? (
                  <div id="family-quality-workspace" className="validate-quality-workspace scroll-mt-5">
                    <TemplatePackageQualityPanel
                      report={qualityReport}
                      selectedIssueId={selectedQualityIssueId}
                      onSelectIssue={(issue) => setSelectedQualityIssueId(issue?.id ?? null)}
                    />
                    <TemplatePackageDiagnosticContext
                      packageValue={selectedPackage}
                      resolvedTree={selectedResolvedTree}
                      productRenderIdentity={currentProductRenderIdentity}
                      sourceReferencePng={getFigmaReferencePng(selectedPackage)}
                      issue={selectedQualityIssue}
                      instances={selectedQualityGroup?.issues}
                      onSelectInstance={(issue) => setSelectedQualityIssueId(issue.id)}
                      onAction={handleDiagnosticAction}
                      supplementalDetails={diagnosticSupplementalDetails}
                      customAction={selectedQualityIssue && qualityIssueOwnerStep(selectedQualityIssue) !== "validate" ? {
                        label: `Open ${qualityIssueOwnerLabel(qualityIssueOwnerStep(selectedQualityIssue))}`,
                        onClick: () => navigateToDiagnosticOwner(selectedQualityIssue),
                      } : undefined}
                      preview={(
                        <ContextPreviewFrame
                          items={validationPreviewItems}
                          selectedId={selectedVariant.id}
                          onSelect={selectPreviewVariant}
                          label="Validating"
                        >
                          <TemplateFamilyImportPreview
                            wizard={wizard}
                            className="family-import-preview family-import-preview--diagnostics"
                            onRenderIdentity={handlePreviewRenderIdentity}
                          />
                        </ContextPreviewFrame>
                      )}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {stepIndex === 5 && family && counts ? (
              <div className="space-y-5" data-testid="family-step-review">
                <p className="ui-page-description">Name and save the template.</p>
                <div className="family-review-layout">
                  <div className="setup-confirmation">
                    <Input
                      label="Template name"
                      value={pendingTemplateName}
                      required
                      autoFocus={!pendingTemplateName}
                      error={pendingTemplateName.trim() ? undefined : "Enter a template name."}
                      onChange={(event) => {
                        const value = event.target.value;
                        setPendingTemplateName(value);
                        if (value.trim()) replaceFamily({ ...family, title: value });
                      }}
                    />
                    <div className="family-review-status">
                      <Status tone={reviewReady ? "repaired" : "blocked"}>{reviewReady ? "Ready" : "Blocked"}</Status>
                      <span>{reviewReady ? "Ready to save" : "Complete the checklist before saving"}</span>
                    </div>

                    <div className="family-review-summary-list">
                    <section className="family-review-section">
                      <h2 className="ui-section-title">Variants</h2>
                      <p className="family-review-summary">
                        <strong>{family.variants.length}</strong> {family.variants.length === 1 ? "variant" : "variants"}
                        {family.variantGroups.length
                          ? ` using ${family.variantGroups.length} selection ${family.variantGroups.length === 1 ? "property" : "properties"}`
                          : " selected directly"}.
                      </p>
                      <div className="family-review-variant-list">
                        {family.variants.map((variant) => (
                          <div key={variant.id}>
                            <strong>{variant.title}</strong>
                            <span>
                              {family.variantGroups.length
                                ? family.variantGroups.map((group) => {
                                    const optionId = variant.groupAssignments[group.id];
                                    const option = group.options.find((candidate) => candidate.id === optionId);
                                    return `${group.title}: ${option?.title ?? "Not assigned"}`;
                                  }).join(" · ")
                                : "Selected directly"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="family-review-section">
                      <h2 className="ui-section-title">Editing</h2>
                      <p className="family-review-summary">
                        <strong>{family.fields.length}</strong> editable fields · {counts["family-wide"]} shared across all
                        {counts["variant-subset"] ? ` · ${counts["variant-subset"]} shared across some` : ""}
                        {counts["variant-specific"] ? ` · ${counts["variant-specific"]} variant-specific` : ""}
                      </p>
                    </section>

                    <section className="family-review-section">
                      <h2 className="ui-section-title">Readiness</h2>
                      <p className="family-review-summary">
                        Fonts {fontsReady ? "ready" : "need attention"} · {checkedVariantCount} of {family.variants.length} variants checked
                        {reviewBlockerCount ? ` · ${reviewBlockerCount} blocked` : ""}
                        {reviewWarningCount ? ` · ${reviewWarningCount} need attention` : ""}
                      </p>
                    </section>
                    </div>

                    <div className="family-review-checklist" aria-label="Template checklist">
                      {variantNameBlockers.length || groupBlockers.length ? (
                        <Button variant="secondary" onClick={() => navigateStep(0)}>Resolve variant organization</Button>
                      ) : null}
                      {!fontsReady ? <Button variant="secondary" onClick={() => navigateStep(1)}>Prepare required fonts</Button> : null}
                      {fieldBlockers.length ? <Button variant="secondary" onClick={() => navigateStep(2)}>Resolve field connections</Button> : null}
                      {ruleBlockers.length ? <Button variant="secondary" onClick={() => navigateStep(3)}>Resolve field rules</Button> : null}
                      {!allVariantsValidated || reviewWarningCount ? (
                        <Button variant="secondary" onClick={() => navigateStep(4)}>
                          {allVariantsValidated ? "Review validation warnings" : "Check every variant"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {selectedVariant ? (
                    <section className="family-review-preview">
                      <ContextPreviewFrame
                        items={validationPreviewItems}
                        selectedId={selectedVariant.id}
                        onSelect={selectPreviewVariant}
                        label="Previewing"
                      >
                        <TemplateFamilyImportPreview
                          wizard={wizard}
                          className="family-import-preview family-import-preview--review"
                          onRenderIdentity={handlePreviewRenderIdentity}
                        />
                      </ContextPreviewFrame>
                    </section>
                  ) : null}
                </div>
              </div>
            ) : null}
          </PageContent>

          <PageFooter className="setup-flow__footer">
            {stepIndex > 0 ? (
              <Button variant="secondary" disabled={snapshot.busy || saving} onClick={() => navigateStep(stepIndex - 1)}>Back</Button>
            ) : <span aria-hidden="true" />}
            <div className="flex items-center gap-3">
              {currentBlockerMessage ? (
                <span className="max-w-md text-right text-sm text-content-muted" role="status">
                  {currentBlockerMessage}
                </span>
              ) : null}
              {stepIndex === studioSteps.length - 1 ? (
                <Button disabled={!canContinue || saving} loading={saving} loadingLabel="Saving template" onClick={() => void finish()}>{savedFamily ? "Save changes" : "Add template"}</Button>
              ) : (
                <Button
                  disabled={snapshot.busy || (!savedFamily && !family)}
                  onClick={() => {
                    if (!savedFamily && !canContinue) {
                      focusCurrentBlocker();
                      return;
                    }
                    navigateStep(stepIndex + 1);
                  }}
                >
                  {stepIndex === 0 ? "Continue to fonts" : stepIndex === 1 ? "Continue to fields" : stepIndex === 2 ? "Continue to field rules" : stepIndex === 3 ? "Validate template" : "Review template"}
                </Button>
              )}
            </div>
          </PageFooter>
        </PageWorkspace>
      </AppShell>
    </TemplateFamilyImportWizardProvider>
  );
}

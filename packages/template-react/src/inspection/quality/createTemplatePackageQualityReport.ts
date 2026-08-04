import type { AssetReliabilityReport } from "@sleinity/template-browser/assets";
import type { LoadedSourceDiagnosticReport } from "@sleinity/template-browser";
import type {
  FieldConstraintValidation,
  PackageEditorFieldWarning,
} from "@sleinity/template-core/editor";
import type { PackageExportReadinessResult } from "@sleinity/template-browser/capture";
import type { TemplatePackageValidationResult } from "@sleinity/template-core";
import type { TemplatePackageRenderWarning } from "../../render/packageRenderUtils";
import type {
  FontReadinessReport,
  ResolvedRenderTreeV1,
} from "@sleinity/template-core";
import type {
  PackageMetadataDifference,
  TemplateNode,
  TemplatePackageV1,
} from "@sleinity/template-core";
import type { ResolvedProductRenderIdentityV1 } from "../../render/productRenderIdentity";
import type {
  PackageQualityCategory,
  PackageQualityGate,
  PackageQualityHealth,
  PackageQualityIssue,
  PackageQualityLayer,
  PackageQualityOrigin,
  PackageQualityReport,
  PackageQualitySeverity,
  PackageQualitySupplementalDiagnostic,
} from "./types";
import { adaptLoadedSourceDiagnostics } from "./loadedSourceDiagnosticAdapter";
import {
  getDiagnosticAudience,
  getDiagnosticPresentationState,
  getPackageQualityRootCause,
} from "./diagnosticPresentation";

export interface CreateTemplatePackageQualityReportOptions {
  packageValue: TemplatePackageV1;
  validation: TemplatePackageValidationResult;
  loadedSourceDiagnostics?: LoadedSourceDiagnosticReport | null;
  supplementalDiagnostics?: PackageQualitySupplementalDiagnostic[];
  rendererWarnings?: {
    static: TemplatePackageRenderWarning[];
    editor: TemplatePackageRenderWarning[];
  };
  resolvedTree?: ResolvedRenderTreeV1 | null;
  assetReliability?: AssetReliabilityReport | null;
  fontReadiness?: FontReadinessReport | null;
  fieldValidation?: FieldConstraintValidation | null;
  editorWarnings?: PackageEditorFieldWarning[];
  exportReadiness?: PackageExportReadinessResult | null;
  sourceReferenceAvailable?: boolean;
  productRenderIdentity?: ResolvedProductRenderIdentityV1 | null;
}

interface IssueInput
  extends Omit<
    PackageQualityIssue,
    | "id"
    | "fingerprint"
    | "origins"
    | "blocksImport"
    | "layerPath"
    | "nodeName"
  > {
  origin: PackageQualityOrigin;
  blocksImport?: boolean;
  nodeName?: string;
  layerPath?: string;
  priority?: number;
}

const severityOrder: Record<PackageQualitySeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function issueId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `quality-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function getTemplatePackageLayerPath(
  packageValue: TemplatePackageV1,
  nodeId: string | undefined,
): string | undefined {
  if (!nodeId || !packageValue.nodes[nodeId]) return undefined;
  const names: string[] = [];
  const visited = new Set<string>();
  let currentId: string | null | undefined = nodeId;
  while (currentId && packageValue.nodes[currentId] && !visited.has(currentId)) {
    visited.add(currentId);
    const node: TemplateNode = packageValue.nodes[currentId];
    names.unshift(node.name || node.id);
    currentId = node.parentId;
  }
  return names.join(" / ");
}

function categoryForAppDiagnostic(
  category: string,
): PackageQualityCategory {
  if (category === "asset") return "assets";
  if (category === "font") return "fonts";
  if (category === "field") return "fields";
  if (category === "motion") return "motion";
  if (category === "graph" || category === "layout") return "node-graph";
  if (category === "schema" || category === "parse") return "package";
  if (category === "version") return "source";
  return "import";
}

function suggestedFix(code: string): string | undefined {
  if (code.startsWith("schema.") || code.startsWith("version.")) {
    return "Export the template again with the current Template Tool exporter.";
  }
  if (code.startsWith("graph.")) {
    return "Export the template again. If the problem remains, inspect the affected layer in Figma.";
  }
  if (code.includes("missing") && code.includes("asset")) {
    return "Add the missing media to the template and export it again.";
  }
  if (code.includes("font")) {
    return "Add the exact font, choose a verified replacement, approve a deterministic fallback, or retry font loading.";
  }
  if (code.includes("field")) {
    return "Open Fields and reconnect or reconfigure the affected field.";
  }
  if (
    code.includes("unsupported") ||
    code.includes("fallback") ||
    code.includes("approx")
  ) {
    return "Inspect the affected layer. Use a simpler or flattened visual when exact preview support is required.";
  }
  if (code.includes("mismatch") || code.includes("conflict")) {
    return "Export the affected layer again and compare it with the current design.";
  }
  return undefined;
}

function whyItMatters(
  category: PackageQualityCategory,
  severity: PackageQualitySeverity,
): string {
  if (category === "import") {
    return severity === "error"
      ? "The template cannot be opened until this file-format issue is fixed."
      : "The template can be imported, but it may not match the original design.";
  }
  if (category === "package" || category === "node-graph") {
    return severity === "error"
      ? "The template cannot open correctly until this structure is fixed."
      : "The template remains usable, but its layout may differ from the original design.";
  }
  if (category === "renderer") {
    return "The preview may differ from the original design.";
  }
  if (category === "assets") {
    return "Images or graphics may be missing from the preview or export.";
  }
  if (category === "fonts") {
    return "Text may wrap, resize, or look different from the original design.";
  }
  if (category === "fields") {
    return "The affected content may not edit correctly or may exceed its limits.";
  }
  if (category === "export") {
    return "The exported image may be incomplete or look different from the preview.";
  }
  if (category === "source") {
    return "The template may differ from the design it was exported from.";
  }
  if (category === "preview") {
    return "Visual comparison is unavailable, but the template can still be used.";
  }
  return "The motion preview may skip or approximate part of the animation.";
}

function isLargeMediaPerformanceDiagnostic(code: string): boolean {
  return /large.*asset|asset.*large/i.test(code);
}

function supplementalIssue(
  diagnostic: PackageQualitySupplementalDiagnostic,
): IssueInput {
  return {
    origin: diagnostic.origin ?? "app",
    code: diagnostic.code,
    severity: diagnostic.severity,
    category: diagnostic.category,
    layer: diagnostic.layer ?? "runtime",
    message: diagnostic.message,
    whyItMatters: whyItMatters(
      diagnostic.category,
      diagnostic.severity,
    ),
    suggestedFix:
      diagnostic.suggestion ?? suggestedFix(diagnostic.code),
    blocks: [],
    blocksImport: false,
    path: diagnostic.path,
    file: diagnostic.file,
    nodeId: diagnostic.nodeId,
    sourceNodeId: diagnostic.sourceNodeId,
    fieldId: diagnostic.fieldId,
    assetId: diagnostic.assetId,
    ref: diagnostic.ref,
    relatedIds: diagnostic.relatedIds,
    details: diagnostic.details,
    priority: 50,
  };
}

export function createPackageQualityIssueFingerprint(
  input: Pick<
    IssueInput,
    | "code"
    | "path"
    | "file"
    | "nodeId"
    | "sourceNodeId"
    | "fieldId"
    | "assetId"
    | "ref"
  >,
): string {
  return [
    input.code.toLowerCase(),
    input.path ?? "",
    input.file ?? "",
    input.nodeId ?? "",
    input.sourceNodeId ?? "",
    input.fieldId ?? "",
    input.assetId ?? "",
    input.ref ?? "",
  ].join("|");
}

function enrichIssue(
  packageValue: TemplatePackageV1,
  input: IssueInput,
): PackageQualityIssue {
  const node = input.nodeId ? packageValue.nodes[input.nodeId] : undefined;
  const fingerprint = createPackageQualityIssueFingerprint(input);
  const { origin, priority: _priority, ...issueInput } = input;
  const originBoundary = input.originBoundary ?? (
    origin === "normalization" || origin === "loader" || origin === "raw-source"
      ? "normalization"
      : origin === "plugin" || origin === "figma" || origin === "mcp"
        ? "source-exporter"
        : origin === "resolved-tree" || origin === "backend-decision" || origin === "renderer"
          ? "resolved"
          : origin === "font" || origin === "asset" || origin === "asset-reliability" || origin === "asset-registry"
            ? "dependency"
            : origin === "visual-diff"
              ? "regression-evidence"
              : "canonical"
  );
  const impacts = input.impacts ?? (
    input.category === "fields" ? ["editing"]
      : input.category === "export" ? ["export"]
        : input.category === "assets" || input.category === "fonts" ? ["visual", "export"]
          : ["visual"]
  );
  return {
    ...issueInput,
    id: issueId(fingerprint),
    fingerprint,
    origins: [origin],
    blocksImport:
      input.blocksImport ?? input.blocks.includes("import"),
    nodeName: input.nodeName ?? node?.name,
    layerPath:
      input.layerPath ??
      getTemplatePackageLayerPath(packageValue, input.nodeId),
    rootCauseId: input.rootCauseId ?? getPackageQualityRootCause({
      ...issueInput,
      id: "pending",
      fingerprint,
      origins: [origin],
      blocksImport: input.blocksImport ?? input.blocks.includes("import"),
    } as PackageQualityIssue),
    originBoundary,
    affectedSurfaces: input.affectedSurfaces ?? ["validate", "fields", "editor", "preview", "png-export"],
    impacts,
    recommendedAction: input.recommendedAction ?? input.suggestedFix ?? "Review the affected region and preserve this evidence if a renderer fix is needed.",
  };
}

function issuesDescribeSameProblem(
  left: PackageQualityIssue,
  right: PackageQualityIssue,
): boolean {
  if (getPackageQualityRootCause(left) !== getPackageQualityRootCause(right)) {
    return false;
  }
  const locations: Array<keyof Pick<
    PackageQualityIssue,
    | "path"
    | "file"
    | "nodeId"
    | "sourceNodeId"
    | "fieldId"
    | "assetId"
    | "ref"
  >> = [
    "path",
    "file",
    "nodeId",
    "sourceNodeId",
    "fieldId",
    "assetId",
    "ref",
  ];
  let sharedLocation = false;
  let leftHasLocation = false;
  let rightHasLocation = false;
  for (const key of locations) {
    const leftValue = left[key];
    const rightValue = right[key];
    leftHasLocation ||= Boolean(leftValue);
    rightHasLocation ||= Boolean(rightValue);
    if (leftValue && rightValue) {
      if (leftValue !== rightValue) return false;
      sharedLocation = true;
    }
  }
  return (
    sharedLocation ||
    !leftHasLocation ||
    !rightHasLocation ||
    left.category === "export" ||
    right.category === "export"
  );
}

function mergeIssues(
  packageValue: TemplatePackageV1,
  inputs: IssueInput[],
): PackageQualityIssue[] {
  const backendCoverage = new Set<string>();
  inputs.forEach((input) => {
    if (input.origin !== "backend-decision" || !input.nodeId) return;
    const sourceDiagnosticCodes = input.details?.sourceDiagnosticCodes;
    if (!Array.isArray(sourceDiagnosticCodes)) return;
    sourceDiagnosticCodes.forEach((code) => {
      if (typeof code === "string") backendCoverage.add(`${input.nodeId}:${code.toLowerCase()}`);
    });
  });
  const merged = new Map<
    string,
    { issue: PackageQualityIssue; priority: number }
  >();
  inputs.forEach((input) => {
    const coveredByBackend = input.origin !== "backend-decision" &&
      Boolean(input.nodeId) &&
      backendCoverage.has(`${input.nodeId}:${input.code.toLowerCase()}`);
    const issue = enrichIssue(
      packageValue,
      coveredByBackend && !input.blocksImport
        ? { ...input, audience: "technical-trace" }
        : input,
    );
    const existingEntry =
      merged.get(issue.fingerprint) ??
      Array.from(merged.values()).find(({ issue: existingIssue }) =>
        issuesDescribeSameProblem(existingIssue, issue),
      );
    if (!existingEntry) {
      merged.set(issue.fingerprint, {
        issue,
        priority: input.priority ?? 0,
      });
      return;
    }
    const existing = existingEntry.issue;
    existing.origins = Array.from(
      new Set([...existing.origins, ...issue.origins]),
    );
    existing.blocks = Array.from(new Set([...existing.blocks, ...issue.blocks]));
    existing.modes = Array.from(
      new Set([...(existing.modes ?? []), ...(issue.modes ?? [])]),
    );
    existing.relatedIds = Array.from(
      new Set([...(existing.relatedIds ?? []), ...(issue.relatedIds ?? [])]),
    );
    existing.blocksImport = existing.blocksImport || issue.blocksImport;
    if (severityOrder[issue.severity] < severityOrder[existing.severity]) {
      existing.severity = issue.severity;
    }
    const nextPriority = input.priority ?? 0;
    if (nextPriority > existingEntry.priority) {
      existing.category = issue.category;
      existing.layer = issue.layer;
      existing.message = issue.message;
      existing.whyItMatters = issue.whyItMatters;
      existing.suggestedFix = issue.suggestedFix ?? existing.suggestedFix;
      existingEntry.priority = nextPriority;
    } else if (!existing.suggestedFix && issue.suggestedFix) {
      existing.suggestedFix = issue.suggestedFix;
    }
    existing.path ??= issue.path;
    existing.file ??= issue.file;
    existing.nodeId ??= issue.nodeId;
    existing.sourceNodeId ??= issue.sourceNodeId;
    existing.nodeName ??= issue.nodeName;
    existing.layerPath ??= issue.layerPath;
    existing.assetId ??= issue.assetId;
    existing.fieldId ??= issue.fieldId;
    existing.ref ??= issue.ref;
    if (issue.details || existing.details) {
      existing.details = { ...issue.details, ...existing.details };
    }
  });
  return Array.from(merged.values(), ({ issue }) => issue).sort(
    (left, right) =>
      severityOrder[left.severity] - severityOrder[right.severity] ||
      left.category.localeCompare(right.category) ||
      (left.layerPath ?? left.code).localeCompare(
        right.layerPath ?? right.code,
      ),
  );
}

function health(
  issues: PackageQualityIssue[],
  category: PackageQualityCategory | PackageQualityCategory[],
  gate?: PackageQualityGate,
): PackageQualityHealth {
  const categories = Array.isArray(category) ? category : [category];
  const relevant = issues.filter(
    (issue) =>
      categories.includes(issue.category) && getDiagnosticAudience(issue) === "user",
  );
  if (
    relevant.some((issue) =>
      gate
        ? issue.blocks.includes(gate)
        : getDiagnosticPresentationState(issue) === "blocked",
    )
  ) {
    return "blocked";
  }
  return relevant.some(
    (issue) => getDiagnosticPresentationState(issue) === "review",
  )
    ? "review"
    : "ready";
}

export function derivePackageQualityOverallStatus(
  capabilityHealth: PackageQualityReport["health"],
): PackageQualityHealth {
  const values = Object.values(capabilityHealth);
  if (values.some((value) => value === "blocked")) return "blocked";
  if (values.some((value) => value === "review")) return "review";
  return "ready";
}

function metadataDifferenceIssue(
  difference: PackageMetadataDifference,
): IssueInput {
  return {
    origin: "figma",
    code: `figma.${difference.code}`,
    severity: "warning",
    category: "source",
    message: difference.message,
    whyItMatters: whyItMatters("source", "warning"),
    suggestedFix:
      "Re-export the package from the current Figma node or confirm that the difference is intentional.",
    blocks: [],
    nodeId: difference.nodeId,
    details: {
      packageValue: difference.packageValue,
      figmaValue: difference.figmaValue,
    },
  };
}

export function createTemplatePackageQualityReport({
  packageValue,
  validation,
  loadedSourceDiagnostics,
  supplementalDiagnostics = [],
  rendererWarnings,
  resolvedTree,
  assetReliability,
  fontReadiness,
  fieldValidation,
  editorWarnings = [],
  exportReadiness,
  sourceReferenceAvailable = false,
  productRenderIdentity = null,
}: CreateTemplatePackageQualityReportOptions): PackageQualityReport {
  const normalizedExternalAssetRefs = new Set(
    loadedSourceDiagnostics?.diagnostics.flatMap((diagnostic) => {
      if (diagnostic.code !== "EXTERNAL_ASSET_COMPAT_NORMALIZED") return [];
      const assetId = diagnostic.details?.assetId;
      return typeof assetId === "string" ? [assetId] : [];
    }) ?? [],
  );
  const inputs: IssueInput[] = loadedSourceDiagnostics
    ? adaptLoadedSourceDiagnostics(loadedSourceDiagnostics.diagnostics).map(
        (issue) => ({
          ...issue,
          severity: isLargeMediaPerformanceDiagnostic(issue.code) ? "info" : issue.severity,
          whyItMatters: isLargeMediaPerformanceDiagnostic(issue.code)
            ? "The asset is available for import and export; only preview startup performance may be affected."
            : issue.whyItMatters,
          audience:
            issue.code === "ASSET_REF_UNRESOLVED" &&
            normalizedExternalAssetRefs.has(issue.ref ?? issue.assetId ?? "")
              ? "technical-trace"
              : issue.audience,
          priority: 100,
        }),
      )
    : [];

  if (!loadedSourceDiagnostics) validation.diagnostics.forEach((diagnostic) => {
    const category = categoryForAppDiagnostic(diagnostic.category);
    const severity = diagnostic.severity;
    inputs.push({
      origin: "app",
      code: diagnostic.code,
      severity,
      category,
      message: diagnostic.message,
      whyItMatters: whyItMatters(category, severity),
      suggestedFix: suggestedFix(diagnostic.code),
      blocks: severity === "error" ? ["import"] : [],
      path: diagnostic.path,
      nodeId: diagnostic.nodeId,
    });
  });

  supplementalDiagnostics.forEach((diagnostic) => {
    inputs.push(supplementalIssue(diagnostic));
  });

  const inventoryOnlyPluginCodes = new Set([
    "SVG_ASSET_EMBEDDED",
    "IMAGE_ASSET_EMBEDDED",
    "FONT_FACE_REQUIRED",
    "FONT_BINARY_NOT_INCLUDED",
  ]);
  validation.pluginDiagnostics.forEach((diagnostic) => {
    if (
      diagnostic.severity === "info" &&
      inventoryOnlyPluginCodes.has(diagnostic.code)
    ) {
      return;
    }
    const severity = isLargeMediaPerformanceDiagnostic(diagnostic.code)
      ? "info"
      : diagnostic.severity === "error"
        ? "warning"
        : diagnostic.severity;
    const category: PackageQualityCategory = /^(ASSET_|IMAGE_|SVG_|LARGE_ASSET)/i.test(
      diagnostic.code,
    )
      ? "assets"
      : /^FONT_/i.test(diagnostic.code)
        ? "fonts"
        : /^MOTION_/i.test(diagnostic.code)
          ? "motion"
          : /^PREVIEW_/i.test(diagnostic.code)
            ? "preview"
            : "source";
    inputs.push({
      origin: "plugin",
      code: diagnostic.code,
      severity,
      category,
      message: diagnostic.message,
      whyItMatters: whyItMatters(category, severity),
      suggestedFix: suggestedFix(diagnostic.code),
      blocks: [],
      nodeId: diagnostic.nodeId,
      nodeName: diagnostic.nodeName,
      details: {
        parentId: diagnostic.parentId,
        parentName: diagnostic.parentName,
        parentLayoutMode: diagnostic.parentLayoutMode,
        affectedAxis: diagnostic.affectedAxis,
        rawFigmaValue: diagnostic.rawFigmaValue,
        normalizedValue: diagnostic.normalizedValue,
        ...diagnostic.details,
      },
    });
  });

  if (packageValue.editableFields.length === 0) {
    inputs.push({
      origin: "field",
      code: "field.none-exported",
      severity: "info",
      category: "fields",
      message:
        "This package contains no manually marked editable fields and will behave as a static template.",
      whyItMatters:
        "The template can render and export, but users will not receive content controls in the editor.",
      suggestedFix:
        "If editing is intended, add field:type:id markers to the relevant Figma layers and export the package again.",
      blocks: [],
    });
  }

  (
    [
      ["static", rendererWarnings?.static ?? []],
      ["editor", rendererWarnings?.editor ?? []],
    ] as const
  ).forEach(([mode, warnings]) => {
    warnings.forEach((warning) => {
      const isSafeContainment = warning.code === "editor-live-resize-contained";
      inputs.push({
        origin: "renderer",
        code: warning.code,
        severity: isSafeContainment ? "info" : "warning",
        category: "renderer",
        message: warning.message,
        whyItMatters: isSafeContainment
          ? "The imported layout remains intact; deterministic containment protects surrounding flow during editing."
          : whyItMatters("renderer", "warning"),
        suggestedFix: suggestedFix(warning.code),
        blocks: [],
        modes: [mode],
        nodeId: warning.nodeId,
      });
    });
  });

  if (!loadedSourceDiagnostics) resolvedTree?.warnings.forEach((warning) => {
    inputs.push({
      origin: "resolved-tree",
      code: warning.code,
      severity: "warning",
      category:
        warning.feature === "font"
          ? "fonts"
          : warning.feature === "image"
            ? "assets"
            : "renderer",
      message: warning.message,
      whyItMatters: whyItMatters(
        warning.feature === "font"
          ? "fonts"
          : warning.feature === "image"
            ? "assets"
            : "renderer",
        "warning",
      ),
      suggestedFix: suggestedFix(warning.code),
      blocks: [],
      nodeId: warning.nodeId,
      details: { feature: warning.feature },
    });
  });

  resolvedTree?.backendDiagnostics.diagnostics.forEach((diagnostic) => {
    const decision = resolvedTree.nodes[diagnostic.nodeId]?.backendDecision;
    inputs.push({
      origin: "backend-decision",
      code: `backend.${diagnostic.capabilityId.toLowerCase()}`,
      severity: decision?.exportSafety === "blocked" ? "error" : diagnostic.severity,
      category: "renderer",
      layer: "runtime",
      message: diagnostic.explanation,
      whyItMatters: diagnostic.visualImpact === "high"
        ? "The selected renderer owner may prevent a faithful or complete export."
        : "The selected renderer owner may differ from fully source-native rendering in this region.",
      suggestedFix: diagnostic.userAction ?? undefined,
      blocks: decision?.exportSafety === "blocked" ? ["export"] : [],
      nodeId: diagnostic.nodeId,
      capabilityId: diagnostic.capabilityId,
      regionId: diagnostic.regionId,
      backendOwner: diagnostic.runtimeOwner,
      supportLevel: diagnostic.supportLevel,
      confidence: diagnostic.confidence,
      visualImpact: diagnostic.visualImpact,
      userRepairable: diagnostic.userRepairable,
      rootCauseId: `${diagnostic.capabilityId}:${diagnostic.fallback.reasonCodes.join("+") || diagnostic.supportLevel}`,
      originBoundary: diagnostic.classifications.includes("layout-stabilization-issue")
        ? "settlement"
        : diagnostic.classifications.includes("measurement-variance")
          ? "browser-measurement"
          : diagnostic.classifications.includes("source-exporter-issue")
            ? "source-exporter"
            : "resolved",
      impacts: ["visual", "editing", "persistence", "export"],
      recommendedAction: diagnostic.userAction ?? "Review this capability region and export a bounded issue packet if its appearance differs from the source.",
      audience: diagnostic.audience,
      resolution: diagnostic.userRepairable ? "repair-available" : "none",
      context: { type: "visual-target", nodeIds: [diagnostic.nodeId] },
      presentation: {
        userTitle: diagnostic.supportLevel === "unsupported"
          ? "Unsupported renderer capability"
          : diagnostic.disposition === "established-compatibility-owner"
            ? "Established compatibility owner"
            : "Fallback rendering in use",
        userSummary: diagnostic.explanation,
        userImpact: diagnostic.visualImpact === "high"
          ? "This region may differ in preview or export."
          : "Review this region when exact source fidelity is required.",
        developerNote: `${diagnostic.capabilityId} uses ${diagnostic.runtimeOwner} on ${diagnostic.selectedBackend}.`,
        technicalMessage: diagnostic.explanation,
      },
      details: {
        classifications: diagnostic.classifications,
        selectedBackend: diagnostic.selectedBackend,
        runtimeOwner: diagnostic.runtimeOwner,
        disposition: diagnostic.disposition,
        fallback: diagnostic.fallback,
        supportLevel: diagnostic.supportLevel,
        confidence: diagnostic.confidence,
        visualImpact: diagnostic.visualImpact,
        sourceDiagnosticCodes: diagnostic.sourceDiagnosticCodes,
        projectionId: resolvedTree.backendDiagnostics.projectionId,
        decisionRevision: resolvedTree.backendDiagnostics.sourceDecisionRevision,
        diagnosticOwner: resolvedTree.backendDiagnostics.schemaVersion,
        decisionId: decision?.decisionId,
        editability: decision?.editability,
        exportSafety: decision?.exportSafety,
        revisions: decision?.revisions,
      },
      priority: 75,
    });
  });

  if (!loadedSourceDiagnostics) assetReliability?.diagnostics.forEach((diagnostic) => {
    const severity = isLargeMediaPerformanceDiagnostic(diagnostic.code) ? "info" : diagnostic.severity;
    const entry = diagnostic.assetId
      ? assetReliability.entries.find((item) => item.id === diagnostic.assetId)
      : undefined;
    inputs.push({
      origin: "asset",
      code: diagnostic.code,
      severity,
      category: "assets",
      message: diagnostic.message,
      whyItMatters: isLargeMediaPerformanceDiagnostic(diagnostic.code)
        ? "The asset is available and export-safe; only preview startup performance may be affected."
        : whyItMatters("assets", severity),
      suggestedFix: suggestedFix(diagnostic.code),
      blocks: severity === "error" ? ["export"] : [],
      assetId: diagnostic.assetId,
      nodeId: entry?.usedBy[0],
      details: entry
        ? {
            sourceUsed: entry.sourceUsed,
            sizeKb: entry.sizeKb,
            usedBy: entry.usedBy,
          }
        : undefined,
    });
  });

  fontReadiness?.required
    .filter((font) => font.status !== "loaded")
    .forEach((font) => {
      const exportReady = font.deterministicForExport;
      inputs.push({
        origin: "font",
        code: exportReady ? "font.approved-fallback" : `font.${font.status}`,
        severity: exportReady ? "warning" : "error",
        category: "fonts",
        message: exportReady
          ? `${font.family} ${font.weight} ${font.style} uses a verified, approved fallback.`
          : `${font.family} ${font.weight} ${font.style} is unresolved for deterministic export.`,
        whyItMatters: whyItMatters("fonts", exportReady ? "warning" : "error"),
        suggestedFix: suggestedFix("font.missing"),
        blocks: exportReady ? [] : ["export"],
        nodeId: font.usedBy[0],
        details: {
          family: font.family,
          weight: font.weight,
          style: font.style,
          usedBy: font.usedBy,
          fallbackFamily: font.fallbackFamily,
          source: font.source,
          verified: font.verified,
          deterministicForExport: font.deterministicForExport,
        },
      });
    });

  fontReadiness?.required
    .filter(
      (font) =>
        font.status === "loaded" &&
        font.glyphCoverage === "fallback-likely",
    )
    .forEach((font) => {
      inputs.push({
        origin: "font",
        code: "font.glyph-fallback-likely",
        severity: "info",
        category: "fonts",
        message: `${font.family} is loaded, but emoji or symbol characters may come from a platform fallback face.`,
        whyItMatters:
          "Color emoji and symbol rendering can differ between operating systems even when the declared text face is available.",
        suggestedFix:
          "For deterministic non-editable output, export this text as an outlined SVG fallback.",
        blocks: [],
        nodeId: font.usedBy[0],
        details: {
          family: font.family,
          characters: font.characters,
          usedBy: font.usedBy,
        },
      });
    });

  if (!loadedSourceDiagnostics) fieldValidation?.issues.forEach((issue) => {
    inputs.push({
      origin: "field",
      code: issue.code,
      severity: issue.severity,
      category: "fields",
      message: issue.message,
      whyItMatters: whyItMatters("fields", issue.severity),
      suggestedFix: suggestedFix(issue.code),
      blocks: issue.blocksExport ? ["export"] : [],
      fieldId: issue.fieldId,
      nodeId: issue.nodeId,
    });
  });
  editorWarnings.forEach((warning) => {
    inputs.push({
      origin: "field",
      code: warning.code,
      severity: "warning",
      category: "fields",
      message: warning.message,
      whyItMatters: whyItMatters("fields", "warning"),
      suggestedFix: suggestedFix(warning.code),
      blocks: [],
      fieldId: warning.fieldId,
      nodeId: warning.nodeId,
    });
  });

  exportReadiness?.issues.forEach((issue) => {
    const nodeId = packageValue.nodes[issue.assetId]
      ? issue.assetId
      : undefined;
    const assetId = packageValue.assets[issue.assetId]
      ? issue.assetId
      : undefined;
    const fieldId = packageValue.editableFields.some(
      (field) => field.id === issue.assetId,
    )
      ? issue.assetId
      : undefined;
    inputs.push({
      origin: "export",
      code: issue.code,
      severity: issue.severity,
      category: "export",
      message: issue.message,
      whyItMatters: whyItMatters("export", issue.severity),
      suggestedFix: suggestedFix(issue.code),
      blocks: issue.severity === "error" ? ["export"] : [],
      nodeId,
      assetId,
      fieldId,
    });
  });

  packageValue.verification?.metadata?.differences.forEach((difference) => {
    inputs.push(metadataDifferenceIssue(difference));
  });

  const issues = mergeIssues(packageValue, inputs);
  const importHealth: PackageQualityHealth = loadedSourceDiagnostics?.canImport === false
    ? "blocked"
    : health(issues, ["import", "package", "node-graph", "source"], "import");
  const reportHealth = {
    import: importHealth,
    fidelity: health(issues, ["renderer", "preview"]),
    assets: health(issues, ["assets", "fonts"]),
    editability: health(issues, "fields", "create"),
    export:
      exportReadiness?.status === "blocked"
        ? "blocked"
        : health(issues, "export", "export"),
  } satisfies PackageQualityReport["health"];
  const status = derivePackageQualityOverallStatus(reportHealth);
  const decisions = resolvedTree?.nodeOrder.map((nodeId) => resolvedTree.nodes[nodeId].backendDecision) ?? [];
  const semanticCapabilityFamilies = Array.from(new Set(decisions.flatMap((decision) =>
    decision.selectedBackend === "compatibility" || decision.selectedBackend === "unsupported"
      ? []
      : decision.owners.map((owner) => owner.family),
  ))).sort();
  const compatibilityRegionCount = decisions.filter((decision) =>
    decision.disposition === "established-compatibility-owner",
  ).length;
  const reviewFallbackRegionCount = decisions.filter((decision) => decision.fallback.active).length;
  const preservedOnlyRegionCount = decisions.filter((decision) => decision.supportLevel === "preserved-only").length;
  const unsupportedCapabilities = Array.from(new Set(decisions.flatMap((decision) =>
    decision.supportLevel === "unsupported" ? decision.requiredCapabilities : [],
  ))).sort();

  return {
    status,
    health: reportHealth,
    summary: {
      errors: issues.filter(
        (issue) =>
          getDiagnosticAudience(issue) === "user" &&
          getDiagnosticPresentationState(issue) === "blocked",
      ).length,
      warnings: issues.filter(
        (issue) =>
          getDiagnosticAudience(issue) === "user" &&
          getDiagnosticPresentationState(issue) === "review",
      ).length,
      info: issues.filter(
        (issue) =>
          getDiagnosticAudience(issue) === "user" &&
          getDiagnosticPresentationState(issue) === "information",
      ).length,
      importBlockers: issues.filter((issue) => issue.blocksImport).length,
      exportBlockers: issues.filter((issue) =>
        issue.blocks.includes("export"),
      ).length,
    },
    renderingHealth: {
      schemaVersion: "rendering-health-projection-v1",
      readiness: {
        import: reportHealth.import,
        dependencies: reportHealth.assets,
        editing: reportHealth.editability,
        preview: reportHealth.fidelity,
        export: reportHealth.export,
      },
      semanticCapabilityFamilies,
      compatibilityRegionCount,
      reviewFallbackRegionCount,
      preservedOnlyRegionCount,
      unsupportedCapabilities,
      sourceReference: {
        availability: sourceReferenceAvailable ? "available" : "missing",
        comparison: "not-run-in-product",
      },
      productRenderIdentity,
    },
    issues,
  };
}

import type { PackageDiagnostic } from "../packageDiagnostics";
import type { TemplatePackageV1 } from "../types";
import { analyzeAssetReliability } from "../assets";
import { validatePackageFieldConstraints } from "../editor/fieldConstraints";
import { getPackageMotionSummary } from "../motion";
import { createResolvedRenderTree } from "../resolved";
import type { LoadedTemplatePackageSource } from "./loadTemplatePackageBundleSource";
import type {
  TemplatePackageBundleDiagnostic,
  TemplatePackageBundleDiagnosticCategory,
  TemplatePackageBundleDiagnosticSeverity,
} from "./types";

export type LoadedSourceDiagnosticLayerId =
  | "package-structure"
  | "json-parsing"
  | "source-contract"
  | "canvas-root"
  | "node-graph"
  | "geometry-bounds"
  | "asset-references"
  | "editable-fields"
  | "font-requirements"
  | "motion-links"
  | "mcp-links"
  | "preview-reference"
  | "render-readiness";

export interface LoadedSourceLayeredDiagnostic
  extends TemplatePackageBundleDiagnostic {
  layer: LoadedSourceDiagnosticLayerId;
  origin:
    | "loader"
    | "raw-source"
    | "normalization"
    | "package-validation"
    | "asset-registry"
    | "asset-reliability"
    | "field-validation"
    | "font-requirements"
    | "motion"
    | "mcp"
    | "preview"
    | "renderer";
  blocksImport: boolean;
}

export interface LoadedSourceDiagnosticLayerSummary {
  id: LoadedSourceDiagnosticLayerId;
  label: string;
  status: "ready" | "warning" | "blocked";
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface LoadedSourceDiagnosticReport {
  canImport: boolean;
  status: "ready" | "warning" | "blocked";
  diagnostics: LoadedSourceLayeredDiagnostic[];
  blockingDiagnostics: LoadedSourceLayeredDiagnostic[];
  warningDiagnostics: LoadedSourceLayeredDiagnostic[];
  infoDiagnostics: LoadedSourceLayeredDiagnostic[];
  layers: LoadedSourceDiagnosticLayerSummary[];
}

export interface LoadedSourceDiagnosticReportOptions {
  supplementalDiagnostics?: TemplatePackageBundleDiagnostic[];
  packageValue?: TemplatePackageV1 | null;
  packageDiagnostics?: PackageDiagnostic[];
}

const layerLabels: Record<LoadedSourceDiagnosticLayerId, string> = {
  "package-structure": "Package structure",
  "json-parsing": "JSON parsing",
  "source-contract": "Source metadata",
  "canvas-root": "Canvas and root",
  "node-graph": "Node graph",
  "geometry-bounds": "Geometry and bounds",
  "asset-references": "Assets",
  "editable-fields": "Editable fields",
  "font-requirements": "Fonts",
  "motion-links": "Motion",
  "mcp-links": "MCP/Figma",
  "preview-reference": "Reference preview",
  "render-readiness": "Preview status",
};

const layerOrder = Object.keys(layerLabels) as LoadedSourceDiagnosticLayerId[];

const requiredFileCodes = new Set([
  "bundle.required-file-missing",
  "TEMPLATE_JSON_READ_ERROR",
  "TEMPLATE_JSON_PARSE_ERROR",
  "ASSETS_JSON_MISSING",
  "ASSETS_JSON_PARSE_ERROR",
  "ASSET_MANIFEST_INVALID",
]);

const parsingCodes = new Set([
  "TEMPLATE_JSON_PARSE_ERROR",
  "ASSETS_JSON_PARSE_ERROR",
  "MOTION_JSON_PARSE_ERROR",
  "MCP_JSON_PARSE_ERROR",
  "parse.invalid-json",
  "parse.invalid-root",
  "parse.clone-failed",
]);

function packageLayer(diagnostic: PackageDiagnostic): LoadedSourceDiagnosticLayerId {
  if (
    diagnostic.code.includes("root") ||
    diagnostic.code.includes("canvas") ||
    diagnostic.code === "graph.missing-root"
  ) {
    return "canvas-root";
  }
  if (diagnostic.category === "graph") return "node-graph";
  if (diagnostic.category === "layout") return "geometry-bounds";
  if (diagnostic.category === "asset") return "asset-references";
  if (diagnostic.category === "field") return "editable-fields";
  if (diagnostic.category === "font") return "font-requirements";
  if (diagnostic.category === "motion") return "motion-links";
  if (diagnostic.category === "schema" || diagnostic.category === "version") {
    return "source-contract";
  }
  if (diagnostic.category === "parse") return "json-parsing";
  return "package-structure";
}

function bundleLayer(
  diagnostic: TemplatePackageBundleDiagnostic,
): LoadedSourceDiagnosticLayerId {
  if (parsingCodes.has(diagnostic.code) || /JSON_.*PARSE|PARSE_ERROR/.test(diagnostic.code)) {
    return "json-parsing";
  }
  if (diagnostic.category === "asset" || diagnostic.category === "manifest") {
    return "asset-references";
  }
  if (diagnostic.category === "motion") return "motion-links";
  if (diagnostic.category === "mcp") return "mcp-links";
  if (diagnostic.category === "preview") return "preview-reference";
  if (diagnostic.category === "field") return "editable-fields";
  if (diagnostic.category === "font") return "font-requirements";
  if (diagnostic.category === "render") return "render-readiness";
  if (diagnostic.category === "source") return "source-contract";
  if (diagnostic.category === "package") return "package-structure";
  return "package-structure";
}

function shouldBlockBundleDiagnostic(
  diagnostic: TemplatePackageBundleDiagnostic,
): boolean {
  if (diagnostic.severity !== "error") return false;
  if (requiredFileCodes.has(diagnostic.code)) return true;
  if (diagnostic.category === "zip") return true;
  if (diagnostic.category === "package") return true;
  return false;
}

function shouldBlockPackageDiagnostic(diagnostic: PackageDiagnostic): boolean {
  if (diagnostic.severity !== "error") return false;
  if (["asset", "field", "font", "motion"].includes(diagnostic.category)) {
    return false;
  }
  return true;
}

function severityForBundleDiagnostic(
  diagnostic: TemplatePackageBundleDiagnostic,
  blocksImport: boolean,
): TemplatePackageBundleDiagnosticSeverity {
  if (blocksImport) return diagnostic.severity;
  if (diagnostic.severity === "error") return "warning";
  return diagnostic.severity;
}

function toLayeredBundleDiagnostic(
  diagnostic: TemplatePackageBundleDiagnostic,
  origin: LoadedSourceLayeredDiagnostic["origin"] = "loader",
): LoadedSourceLayeredDiagnostic {
  const blocksImport = shouldBlockBundleDiagnostic(diagnostic);
  const validationStage = diagnostic.details?.validationStage;
  const resolvedOrigin =
    validationStage === "raw-source"
      ? "raw-source"
      : validationStage === "normalization"
        ? "normalization"
        : origin;
  return {
    ...diagnostic,
    severity: severityForBundleDiagnostic(diagnostic, blocksImport),
    layer: bundleLayer(diagnostic),
    origin: resolvedOrigin,
    blocksImport,
  };
}

function packageCategory(
  diagnostic: PackageDiagnostic,
): TemplatePackageBundleDiagnosticCategory {
  if (diagnostic.category === "parse") return "package";
  if (diagnostic.category === "schema") return "package";
  if (diagnostic.category === "version") return "source";
  if (diagnostic.category === "graph") return "package";
  if (diagnostic.category === "layout") return "package";
  return diagnostic.category;
}

function toLayeredPackageDiagnostic(
  diagnostic: PackageDiagnostic,
): LoadedSourceLayeredDiagnostic {
  const blocksImport = shouldBlockPackageDiagnostic(diagnostic);
  return {
    code: diagnostic.code,
    severity: blocksImport ? diagnostic.severity : diagnostic.severity === "error" ? "warning" : diagnostic.severity,
    category: packageCategory(diagnostic),
    message: diagnostic.message,
    path: diagnostic.path,
    nodeId: diagnostic.nodeId,
    details: diagnostic.details,
    layer: packageLayer(diagnostic),
    origin: "package-validation",
    blocksImport,
    suggestion: blocksImport
      ? "Fix the package structure before importing."
      : "This can be reviewed after import; the template can still be placeholder-rendered.",
  };
}

function makeDiagnostic(input: {
  code: string;
  severity: TemplatePackageBundleDiagnosticSeverity;
  category: TemplatePackageBundleDiagnosticCategory;
  layer: LoadedSourceDiagnosticLayerId;
  origin: LoadedSourceLayeredDiagnostic["origin"];
  message: string;
  blocksImport?: boolean;
  path?: string;
  nodeId?: string;
  fieldId?: string;
  assetId?: string;
  ref?: string;
  suggestion?: string;
  relatedIds?: string[];
  details?: Record<string, unknown>;
}): LoadedSourceLayeredDiagnostic {
  return {
    code: input.code,
    severity: input.severity,
    category: input.category,
    layer: input.layer,
    origin: input.origin,
    message: input.message,
    blocksImport: input.blocksImport ?? false,
    path: input.path,
    nodeId: input.nodeId,
    fieldId: input.fieldId,
    assetId: input.assetId,
    ref: input.ref,
    suggestion: input.suggestion,
    relatedIds: input.relatedIds,
    details: input.details,
  };
}

function optionalSourceDiagnostics(
  source: LoadedTemplatePackageSource,
): LoadedSourceLayeredDiagnostic[] {
  if (source.sourceKind !== "package-zip") return [];
  const diagnostics: LoadedSourceLayeredDiagnostic[] = [];
  const motionExpected = Boolean(
    source.packageValue?.motion ||
      source.compatibility.sourceExtras?.hasMotion === true,
  );
  if (!source.motionData && motionExpected) {
    diagnostics.push(
      makeDiagnostic({
        code: "MOTION_FILE_MISSING",
        severity: "warning",
        category: "motion",
        layer: "motion-links",
        origin: "motion",
        message: "No motion.json file is attached; the package can import as a static template.",
        path: "motion.json",
        suggestion: "Add motion.json to the ZIP when animation playback is expected.",
      }),
    );
  } else if (!source.motionData && !source.packageValue?.motion) {
    diagnostics.push(
      makeDiagnostic({
        code: "STATIC_TEMPLATE",
        severity: "info",
        category: "motion",
        layer: "motion-links",
        origin: "normalization",
        message: "This is a static template. No motion file is required.",
        path: "motion.json",
      }),
    );
  }
  if (!source.mcp) {
    diagnostics.push(
      makeDiagnostic({
        code: "MCP_FILE_MISSING",
        severity: "warning",
        category: "mcp",
        layer: "mcp-links",
        origin: "mcp",
        message: "No mcp.json metadata is attached; live Figma comparison may be limited.",
        path: "mcp.json",
        suggestion: "Include mcp.json or a Figma URL when source freshness checks are needed.",
      }),
    );
  }
  if (!source.preview) {
    diagnostics.push(
      makeDiagnostic({
        code: "PREVIEW_FILE_MISSING",
        severity: "warning",
        category: "preview",
        layer: "preview-reference",
        origin: "preview",
        message: "No preview.png reference image is attached.",
        path: "preview.png",
        suggestion: "Include preview.png when visual diff or review should use an exported reference.",
      }),
    );
  }
  return diagnostics;
}

function packageReadinessDiagnostics(
  source: LoadedTemplatePackageSource,
  packageValueOverride?: TemplatePackageV1 | null,
): LoadedSourceLayeredDiagnostic[] {
  const packageValue = packageValueOverride ?? source.packageValue;
  if (!packageValue) return [];
  const diagnostics: LoadedSourceLayeredDiagnostic[] = [];

  analyzeAssetReliability(packageValue).diagnostics.forEach((diagnostic) => {
    diagnostics.push(
      makeDiagnostic({
        code: diagnostic.code,
        severity: diagnostic.severity === "error" ? "warning" : diagnostic.severity,
        category: "asset",
        layer: "asset-references",
        origin: "asset-reliability",
        message: diagnostic.message,
        assetId: diagnostic.assetId,
        suggestion:
          diagnostic.code === "asset-missing"
            ? "Keep the node, but use a placeholder until the asset can be resolved or uploaded."
            : "Review this asset before export if visual fidelity matters.",
      }),
    );
  });

  validatePackageFieldConstraints(packageValue).issues.forEach((issue) => {
    diagnostics.push(
      makeDiagnostic({
        code: issue.code,
        severity: issue.severity,
        category: "field",
        layer: "editable-fields",
        origin: "field-validation",
        message: issue.message,
        nodeId: issue.nodeId,
        fieldId: issue.fieldId,
        suggestion: "Adjust the field value or editing constraints in the template setup.",
      }),
    );
  });

  packageValue.fontRequirements?.forEach((font) => {
    diagnostics.push(
      makeDiagnostic({
        code: "FONT_FACE_REQUIRED",
        severity: "info",
        category: "font",
        layer: "font-requirements",
        origin: "font-requirements",
        message: `${font.family} ${font.weight} ${font.cssStyle} is required by this package.`,
        ref: font.id,
        relatedIds: font.usedBy,
        suggestion: "Ensure this exact face is loaded before visual diff or export.",
      }),
    );
    if (!font.assetId && !font.resolution?.managedFontId) {
      diagnostics.push(
        makeDiagnostic({
          code: "FONT_SOURCE_REQUIRES_RESOLUTION",
          severity: "info",
          category: "font",
          layer: "font-requirements",
          origin: "font-requirements",
          message: `${font.family} ${font.weight} ${font.cssStyle} was exported without a bundled font binary; runtime font resolution will verify availability.`,
          ref: font.id,
          relatedIds: font.usedBy,
          suggestion: "Resolve this face from the application, managed fonts, a replacement, or an approved fallback before export.",
        }),
      );
    }
  });

  const motion = packageValue.motion?.linking;
  motion?.missingNodeIds.forEach((nodeId) => {
    diagnostics.push(
      makeDiagnostic({
        code: "MOTION_NODE_MISSING",
        severity: "warning",
        category: "motion",
        layer: "motion-links",
        origin: "motion",
        message: `Motion references node ${nodeId}, but that node is not present in the package.`,
        nodeId,
        suggestion: "Re-export the package and motion file from the same Figma selection.",
      }),
    );
  });
  if (packageValue.motion) {
    getPackageMotionSummary(packageValue).diagnostics.forEach((diagnostic) => {
      if (diagnostic.code === "motion.node-unmatched") return;
      diagnostics.push(
        makeDiagnostic({
          code: diagnostic.code.toUpperCase().replace(/[.-]/g, "_"),
          severity: diagnostic.severity === "error" ? "warning" : diagnostic.severity,
          category: "motion",
          layer: "motion-links",
          origin: "motion",
          message: diagnostic.message,
          nodeId: diagnostic.nodeId,
          ref: diagnostic.field,
          suggestion:
            diagnostic.code === "motion.field-unsupported"
              ? "The raw motion data is preserved; this channel can be added to the preview runtime later."
              : "Review the motion JSON if animation playback is expected.",
        }),
      );
    });
  }
  if (source.motionData && !packageValue.motion) {
    diagnostics.push(
      makeDiagnostic({
        code: "MOTION_FILE_UNLINKED",
        severity: "warning",
        category: "motion",
        layer: "motion-links",
        origin: "motion",
        message: "motion.json is present but no package motion metadata was attached.",
        path: "motion.json",
        suggestion: "Attach or normalize motion metadata before enabling animation playback.",
      }),
    );
  }

  if (source.mcp && packageValue.source?.rootNodeId) {
    const mcp = source.mcp as { nodeId?: unknown; rootNodeId?: unknown };
    const mcpNodeId =
      typeof mcp.nodeId === "string"
        ? mcp.nodeId
        : typeof mcp.rootNodeId === "string"
          ? mcp.rootNodeId
          : null;
    if (mcpNodeId && mcpNodeId !== packageValue.source.rootNodeId) {
      diagnostics.push(
        makeDiagnostic({
          code: "MCP_NODE_MISMATCH",
          severity: "warning",
          category: "mcp",
          layer: "mcp-links",
          origin: "mcp",
          message: `mcp.json points at ${mcpNodeId}, but package source root is ${packageValue.source.rootNodeId}.`,
          nodeId: packageValue.source.rootNodeId,
          relatedIds: [mcpNodeId],
          suggestion: "Re-export MCP metadata and template.json from the same Figma node.",
        }),
      );
    }
  }

  const renderTree = createResolvedRenderTree(packageValue);
  renderTree.warnings.forEach((warning) => {
    diagnostics.push(
      makeDiagnostic({
        code: warning.code,
        severity: "warning",
        category: "render",
        layer: "render-readiness",
        origin: "renderer",
        message: warning.message,
        nodeId: warning.nodeId,
        suggestion: "Renderer can continue, but this feature may be approximate.",
      }),
    );
  });
  renderTree.fidelityDiagnostics.forEach((diagnostic) => {
    diagnostics.push(
      makeDiagnostic({
        code: diagnostic.code,
        severity: diagnostic.severity,
        category: "render",
        layer: "render-readiness",
        origin: "renderer",
        message: diagnostic.message,
        nodeId: diagnostic.nodeId,
        suggestion: "Use this as a renderer-fidelity follow-up, not an import blocker.",
      }),
    );
  });
  if (renderTree.summary.fallbackRenderedNodeCount > 0) {
    diagnostics.push(
      makeDiagnostic({
        code: "RENDER_FALLBACK_NODES",
        severity: "warning",
        category: "render",
        layer: "render-readiness",
        origin: "renderer",
        message: `${renderTree.summary.fallbackRenderedNodeCount} node(s) require fallback rendering.`,
        suggestion: "Inspect the affected renderer warnings and add semantic support over time.",
      }),
    );
  }
  return diagnostics;
}

function diagnosticKey(diagnostic: LoadedSourceLayeredDiagnostic): string {
  return [
    diagnostic.layer,
    diagnostic.origin,
    diagnostic.severity,
    diagnostic.code,
    diagnostic.path ?? "",
    diagnostic.nodeId ?? "",
    diagnostic.fieldId ?? "",
    diagnostic.assetId ?? "",
    diagnostic.ref ?? "",
    diagnostic.message,
  ].join("|");
}

function dedupe(
  diagnostics: LoadedSourceLayeredDiagnostic[],
): LoadedSourceLayeredDiagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = diagnosticKey(diagnostic);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function schemaCausePath(path: string | undefined): string {
  if (!path) return "/";
  const paint = path.match(/^(.*\/appearance\/(?:fills|strokes)\/\d+)/);
  return paint?.[1] ?? path;
}

function coalescePackageDiagnostics(
  diagnostics: PackageDiagnostic[],
): PackageDiagnostic[] {
  const output: PackageDiagnostic[] = [];
  const schemaGroups = new Map<string, PackageDiagnostic[]>();
  diagnostics.forEach((diagnostic) => {
    if (diagnostic.category !== "schema") {
      output.push(diagnostic);
      return;
    }
    const key = schemaCausePath(diagnostic.path);
    schemaGroups.set(key, [...(schemaGroups.get(key) ?? []), diagnostic]);
  });
  schemaGroups.forEach((group, path) => {
    if (group.length === 1) {
      output.push(group[0]);
      return;
    }
    output.push({
      ...group[0],
      code: "schema.source-shape-invalid",
      path,
      message: `Canonical package validation found one unsupported value at ${path}.`,
      details: {
        rawSchemaFailures: group.map((item) => ({
          code: item.code,
          message: item.message,
          path: item.path,
        })),
      },
    });
  });
  return output;
}

function summarize(
  diagnostics: LoadedSourceLayeredDiagnostic[],
): LoadedSourceDiagnosticLayerSummary[] {
  return layerOrder.map((id) => {
    const items = diagnostics.filter((diagnostic) => diagnostic.layer === id);
    const errorCount = items.filter((item) => item.severity === "error").length;
    const warningCount = items.filter((item) => item.severity === "warning").length;
    const infoCount = items.filter((item) => item.severity === "info").length;
    const blocked = items.some((item) => item.blocksImport);
    return {
      id,
      label: layerLabels[id],
      status: blocked ? "blocked" : warningCount > 0 ? "warning" : "ready",
      errorCount,
      warningCount,
      infoCount,
    };
  });
}

export function createLoadedSourceDiagnosticReport(
  source: LoadedTemplatePackageSource,
  options: LoadedSourceDiagnosticReportOptions = {},
): LoadedSourceDiagnosticReport {
  const diagnostics = dedupe([
    ...source.diagnostics.map((item) => toLayeredBundleDiagnostic(item)),
    ...(options.supplementalDiagnostics ?? []).map((item) =>
      toLayeredBundleDiagnostic(item, item.category === "asset" ? "asset-reliability" : "loader"),
    ),
    ...coalescePackageDiagnostics(
      options.packageDiagnostics ?? source.packageDiagnostics,
    ).map(
      toLayeredPackageDiagnostic,
    ),
    ...optionalSourceDiagnostics(source),
    ...packageReadinessDiagnostics(source, options.packageValue),
  ]);
  const blockingDiagnostics = diagnostics.filter((item) => item.blocksImport);
  const warningDiagnostics = diagnostics.filter((item) => item.severity === "warning");
  const infoDiagnostics = diagnostics.filter((item) => item.severity === "info");
  const canImport = blockingDiagnostics.length === 0;
  return {
    canImport,
    status: !canImport ? "blocked" : warningDiagnostics.length > 0 ? "warning" : "ready",
    diagnostics,
    blockingDiagnostics,
    warningDiagnostics,
    infoDiagnostics,
    layers: summarize(diagnostics),
  };
}

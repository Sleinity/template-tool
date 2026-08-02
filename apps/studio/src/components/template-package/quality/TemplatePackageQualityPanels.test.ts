import figmaPluginV041 from "../../../../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import { analyzeAssetReliability } from "@sleinity/template-browser/assets";
import type {
  LoadedSourceDiagnosticReport,
  LoadedSourceLayeredDiagnostic,
} from "@sleinity/template-browser/importer";
import {
  getPackageEditorFieldWarnings,
  validatePackageFieldConstraints,
} from "@sleinity/template-core/editor";
import { validatePackageJpgExportReadiness } from "@sleinity/template-browser/capture";
import {
  createBackendDiagnosticProjection,
  createResolvedRenderTree,
  validateTemplatePackage,
  type TemplatePackageV1,
} from "@sleinity/template-core";
import {
  createTemplatePackageQualityReport,
  derivePackageQualityOverallStatus,
  getTemplatePackageLayerPath,
} from "@sleinity/template-react/inspection";
import { TemplatePackageQualityPanel } from "./TemplatePackageQualityPanel";
import { TemplatePackageDiagnosticContext } from "./TemplatePackageDiagnosticContext";
import {
  diagnosticPresentationLabels,
  getDiagnosticAudience,
  getDiagnosticFriendlyTarget,
  getDiagnosticPresentation,
  getDiagnosticPresentationState,
  getPackageQualityIssueTitle,
  serializePackageQualityTechnicalDetails,
} from "@sleinity/template-react/inspection";
import {
  filterPackageQualityIssues,
  getPackageQualityTechnicalTrace,
  getPackageQualityTechnicalOptions,
  getPackageQualityValidationHistory,
  getPreferredPackageQualitySelection,
  groupPackageQualityIssues,
  packageQualityIssueMatchesSearch,
  summarizePackageQualityCategories,
  visiblePackageQualitySelection,
} from "@sleinity/template-react/inspection";
import type { PackageQualityIssue } from "@sleinity/template-react/inspection";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const packageValue = structuredClone(
  figmaPluginV041 as unknown as TemplatePackageV1,
);
const targetNode = Object.values(packageValue.nodes).find(
  (node) => node.parentId !== null,
);
if (!targetNode) throw new Error("Fixture needs a child node.");

packageValue.diagnostics = [
  {
    severity: "info",
    code: "PLUGIN_CONTEXT",
    message: "Exporter recorded useful context.",
    nodeId: targetNode.id,
  },
  {
    severity: "info",
    code: "PLUGIN_CONTEXT",
    message: "Exporter recorded useful context.",
    nodeId: targetNode.id,
  },
];

const validation = validateTemplatePackage(packageValue);
const sharedRendererWarning = {
  code: "shared-renderer-warning",
  message: "The same renderer limitation affects both modes.",
  nodeId: targetNode.id,
};
const reportTree = createResolvedRenderTree(packageValue);
const reportTarget = reportTree.nodes[targetNode.id];
reportTarget.backendDecision = {
  ...reportTarget.backendDecision,
  selectedBackend: "compatibility",
  runtimeOwner: "legacy-dom-css",
  disposition: "degraded-fallback",
  supportLevel: "approximated",
  fallback: {
    active: true,
    backend: "compatibility",
    reasonCodes: ["test-visible-fallback"],
    description: "A test-only degraded fallback requires review.",
  },
};
reportTree.backendDiagnostics = createBackendDiagnosticProjection(
  reportTree.nodes,
  [],
  reportTree.backendDecisionRevision,
);
const report = createTemplatePackageQualityReport({
  packageValue,
  validation,
  rendererWarnings: {
    static: [sharedRendererWarning],
    editor: [sharedRendererWarning],
  },
  resolvedTree: reportTree,
  assetReliability: analyzeAssetReliability(packageValue),
  fieldValidation: validatePackageFieldConstraints(packageValue),
  editorWarnings: getPackageEditorFieldWarnings(packageValue),
  exportReadiness: validatePackageJpgExportReadiness({
    format: "jpg",
    packageValue,
    renderMode: "static",
  }),
});

assert(
  report.renderingHealth.schemaVersion === "rendering-health-projection-v1" &&
    report.renderingHealth.sourceReference.comparison === "not-run-in-product" &&
    report.renderingHealth.semanticCapabilityFamilies.length > 0,
  "Validate should project semantic renderer health without running a product visual comparison.",
);
assert(
  report.issues.every((issue) => Boolean(issue.rootCauseId && issue.originBoundary && issue.affectedSurfaces?.length && issue.recommendedAction)),
  "Material quality findings should publish one bounded root cause, origin, surface set, and action.",
);

const pluginIssues = report.issues.filter(
  (issue) => issue.code === "PLUGIN_CONTEXT",
);
assert(
  pluginIssues.length === 1 && pluginIssues[0].severity === "info",
  "Duplicate plugin information should be deduplicated and remain informational.",
);
assert(
  pluginIssues[0].layerPath?.includes(targetNode.name),
  "Node-scoped issues should include the computed layer path.",
);

const rendererIssue = report.issues.find(
  (issue) => issue.code === sharedRendererWarning.code,
);
assert(
  rendererIssue?.modes?.includes("static") &&
    rendererIssue.modes.includes("editor"),
  "Equivalent static and editor renderer warnings should merge and retain both modes.",
);
const backendIssues = report.issues.filter((issue) =>
  issue.origins.includes("backend-decision"),
);
assert(
  backendIssues.length > 0 && backendIssues.every((issue) =>
    Boolean(issue.capabilityId && issue.regionId && issue.backendOwner && issue.supportLevel),
  ),
  "Resolved backend diagnostics must retain capability, region, owner and support metadata in the shared quality report.",
);
const backendGroups = groupPackageQualityIssues(backendIssues);
assert(
  backendGroups.length <= backendIssues.length &&
    backendGroups.every((group) => Boolean(group.primaryIssue.capabilityId)),
  "Import Inspector grouping must aggregate backend evidence by capability while retaining affected regions as instances.",
);
const coveredTree = structuredClone(reportTree);
const coveredBackendDiagnostic = coveredTree.backendDiagnostics.diagnostics[0];
if (!coveredBackendDiagnostic) throw new Error("Quality panel fixture requires a backend diagnostic.");
coveredBackendDiagnostic.sourceDiagnosticCodes.push("backend-covered-warning");
const coveredReport = createTemplatePackageQualityReport({
  packageValue,
  validation,
  rendererWarnings: {
    static: [{
      code: "backend-covered-warning",
      message: "Raw renderer detail covered by the backend projection.",
      nodeId: coveredBackendDiagnostic.nodeId,
    }],
    editor: [],
  },
  resolvedTree: coveredTree,
});
const backendCoveredIssues = coveredReport.issues.filter((candidate) =>
  candidate.code === "backend-covered-warning" &&
  candidate.nodeId === coveredBackendDiagnostic.nodeId,
);
assert(
  backendCoveredIssues.length > 0 &&
    backendCoveredIssues.every((issue) => getDiagnosticAudience(issue) === "technical-trace"),
  "Raw renderer diagnostics covered by a backend projection must remain in technical evidence without duplicating its user-facing card.",
);
const userBackendIssues = backendIssues.filter((issue) =>
  getDiagnosticAudience(issue) === "user",
);
const backendOptions = getPackageQualityTechnicalOptions(userBackendIssues);
assert(
  userBackendIssues.length > 0 && backendOptions.capabilities.length > 0 && backendOptions.regions.length > 0 &&
    filterPackageQualityIssues(userBackendIssues, {
      query: "",
      severity: "all",
      area: "all",
      technical: `capability:${backendOptions.capabilities[0]}`,
    }).length > 0,
  "Capability and region metadata must be available to the Inspector technical filters.",
);
assert(
  report.health.import === "ready",
  "Plugin information and renderer warnings must not block package import.",
);
assert(
  getTemplatePackageLayerPath(packageValue, targetNode.id)?.startsWith(
    packageValue.nodes[packageValue.rootNodeId].name,
  ),
  "Layer paths should run from the package root to the affected node.",
);

const inventoryPackage = structuredClone(packageValue);
inventoryPackage.editableFields = [];
inventoryPackage.diagnostics = [
  {
    severity: "info",
    code: "SVG_ASSET_EMBEDDED",
    message: "SVG was embedded successfully.",
  },
  {
    severity: "info",
    code: "FONT_FACE_REQUIRED",
    message: "Font requirement recorded.",
  },
  {
    severity: "info",
    code: "FONT_BINARY_NOT_INCLUDED",
    message: "Font metadata only.",
  },
];
const inventoryReport = createTemplatePackageQualityReport({
  packageValue: inventoryPackage,
  validation: validateTemplatePackage(inventoryPackage),
});
assert(
  !inventoryReport.issues.some((issue) =>
    [
      "SVG_ASSET_EMBEDDED",
      "FONT_FACE_REQUIRED",
      "FONT_BINARY_NOT_INCLUDED",
    ].includes(issue.code),
  ),
  "Successful asset and font inventory facts should not inflate the quality issue list.",
);
assert(
  inventoryReport.issues.some(
    (issue) =>
      issue.code === "field.none-exported" && issue.severity === "info",
  ),
  "A package without field markers should receive a non-blocking editability notice.",
);

function layeredDiagnostic(
  input: Partial<LoadedSourceLayeredDiagnostic> &
    Pick<LoadedSourceLayeredDiagnostic, "code" | "layer">,
): LoadedSourceLayeredDiagnostic {
  return {
    severity: "warning",
    category: "package",
    origin: "loader",
    message: input.code,
    blocksImport: false,
    ...input,
  };
}

function layeredReport(
  diagnostics: LoadedSourceLayeredDiagnostic[],
): LoadedSourceDiagnosticReport {
  const blockingDiagnostics = diagnostics.filter(
    (diagnostic) => diagnostic.blocksImport,
  );
  const warningDiagnostics = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "warning",
  );
  const infoDiagnostics = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "info",
  );
  const canImport = blockingDiagnostics.length === 0;
  return {
    canImport,
    status: canImport
      ? warningDiagnostics.length > 0
        ? "warning"
        : "ready"
      : "blocked",
    diagnostics,
    blockingDiagnostics,
    warningDiagnostics,
    infoDiagnostics,
    layers: [],
  };
}

const reconciledAssetReport = createTemplatePackageQualityReport({
  packageValue,
  validation,
  loadedSourceDiagnostics: layeredReport([
    layeredDiagnostic({
      code: "EXTERNAL_ASSET_COMPAT_NORMALIZED",
      layer: "package-structure",
      severity: "info",
      details: { assetId: "asset:image:source" },
    }),
    layeredDiagnostic({
      code: "ASSET_REF_UNRESOLVED",
      layer: "asset-references",
      ref: "asset:image:source",
    }),
  ]),
});
assert(
  reconciledAssetReport.issues.some((issue) =>
    issue.code === "ASSET_REF_UNRESOLVED" && getDiagnosticAudience(issue) === "technical-trace",
  ) &&
    !filterPackageQualityIssues(reconciledAssetReport.issues, {
      query: "",
      severity: "all",
      area: "all",
      technical: "all",
    }).some((issue) => issue.code === "ASSET_REF_UNRESOLVED"),
  "A source asset reference already normalized to a ZIP-backed asset must not remain as a user-facing missing-media warning.",
);

const blockingLayeredReport = layeredReport([
  layeredDiagnostic({
    code: "PACKAGE_FILE_MISSING",
    layer: "package-structure",
    severity: "error",
    message: "template.json is missing.",
    path: "template.json",
    blocksImport: true,
    suggestion: "Add template.json to the package.",
  }),
]);
const blockedQualityReport = createTemplatePackageQualityReport({
  packageValue,
  validation,
  loadedSourceDiagnostics: blockingLayeredReport,
});
const blockingQualityIssue = blockedQualityReport.issues.find(
  (issue) => issue.code === "PACKAGE_FILE_MISSING",
);
assert(
  blockedQualityReport.health.import === "blocked" &&
    blockedQualityReport.status === "blocked" &&
    blockingQualityIssue?.blocksImport === true &&
    blockingQualityIssue.blocks.includes("import"),
  "The layered canImport gate and blocking context should be authoritative for Quality import health.",
);

const optionalWarningsReport = layeredReport([
  layeredDiagnostic({
    code: "MOTION_FILE_MISSING",
    layer: "motion-links",
    category: "motion",
    path: "motion.json",
  }),
  layeredDiagnostic({
    code: "MCP_FILE_MISSING",
    layer: "mcp-links",
    category: "mcp",
    path: "mcp.json",
  }),
  layeredDiagnostic({
    code: "PREVIEW_FILE_MISSING",
    layer: "preview-reference",
    category: "preview",
    path: "preview.png",
  }),
]);
const warningQualityReport = createTemplatePackageQualityReport({
  packageValue,
  validation,
  loadedSourceDiagnostics: optionalWarningsReport,
});
assert(
  warningQualityReport.health.import === "review" &&
    warningQualityReport.summary.importBlockers === 0,
  "Optional source warnings should produce ready-with-warnings import health without blocking.",
);

const informationalCautionReport = createTemplatePackageQualityReport({
  packageValue,
  validation,
  loadedSourceDiagnostics: layeredReport([
    layeredDiagnostic({
      code: "LARGE_ASSET",
      layer: "asset-references",
      severity: "warning",
      message: "A readable bundled asset is larger than the preview recommendation.",
      assetId: Object.keys(packageValue.assets)[0],
    }),
  ]),
  rendererWarnings: {
    static: [],
    editor: [{
      code: "editor-live-resize-contained",
      message: "Editor containment protects following flow content.",
      nodeId: targetNode.id,
    }],
  },
  resolvedTree: createResolvedRenderTree(packageValue),
});
assert(
  informationalCautionReport.status === "ready" &&
    informationalCautionReport.health.assets === "ready" &&
    informationalCautionReport.health.fidelity === "ready" &&
    informationalCautionReport.issues.filter((issue) =>
      issue.code === "LARGE_ASSET" || issue.code === "editor-live-resize-contained"
    ).every((issue) => getDiagnosticPresentationState(issue) === "information"),
  "Readable large media and deterministic editor containment must remain visible as Information without changing readiness.",
);

const runtimeSupplementReport = createTemplatePackageQualityReport({
  packageValue,
  validation,
  loadedSourceDiagnostics: layeredReport([]),
  supplementalDiagnostics: [
    {
      code: "runtime.asset-load-failed",
      severity: "error",
      category: "assets",
      message: "A managed image failed to load at runtime.",
      origin: "asset",
      assetId: "asset:runtime",
    },
  ],
});
assert(
  runtimeSupplementReport.health.import === "ready" &&
    runtimeSupplementReport.issues.some(
      (issue) =>
        issue.code === "runtime.asset-load-failed" &&
        !issue.blocksImport,
    ),
  "Runtime-only diagnostics should remain visible without changing layered import eligibility.",
);

const convergedRendererReport = createTemplatePackageQualityReport({
  packageValue,
  validation,
  loadedSourceDiagnostics: layeredReport([
    layeredDiagnostic({
      code: sharedRendererWarning.code,
      layer: "render-readiness",
      category: "render",
      origin: "renderer",
      message: "Canonical layered renderer warning.",
      path: `/nodes/${targetNode.id}`,
      nodeId: targetNode.id,
      suggestion: "Use the exported fallback for this layer.",
      details: { canonical: true },
    }),
  ]),
  rendererWarnings: {
    static: [sharedRendererWarning],
    editor: [sharedRendererWarning],
  },
});
const convergedRendererIssues = convergedRendererReport.issues.filter(
  (issue) => issue.code === sharedRendererWarning.code,
);
assert(
  convergedRendererIssues.length === 1 &&
    convergedRendererIssues[0].origins.includes("renderer") &&
    convergedRendererIssues[0].modes?.includes("static") &&
    convergedRendererIssues[0].modes?.includes("editor") &&
    convergedRendererIssues[0].suggestedFix ===
      "Use the exported fallback for this layer." &&
    convergedRendererIssues[0].details?.canonical === true,
  "Canonical layered issues should merge runtime duplicates and retain the richest context.",
);

const stableDiagnostic = layeredDiagnostic({
  code: "NODE_CHILD_MISSING",
  layer: "node-graph",
  nodeId: targetNode.id,
  path: `/nodes/${targetNode.id}/children/0`,
  message: "First wording.",
});
const stableIdA = createTemplatePackageQualityReport({
  packageValue,
  validation,
  loadedSourceDiagnostics: layeredReport([stableDiagnostic]),
}).issues[0].id;
const stableIdB = createTemplatePackageQualityReport({
  packageValue,
  validation,
  loadedSourceDiagnostics: layeredReport([
    { ...stableDiagnostic, message: "Reworded without changing location." },
  ]),
}).issues[0].id;
assert(
  stableIdA === stableIdB,
  "Quality issue IDs should remain stable when message wording changes but code and location do not.",
);

const categoryCases = [
  ["package-structure", "package"],
  ["node-graph", "node-graph"],
  ["asset-references", "assets"],
  ["editable-fields", "fields"],
  ["font-requirements", "fonts"],
  ["motion-links", "motion"],
  ["mcp-links", "source"],
  ["preview-reference", "preview"],
  ["render-readiness", "renderer"],
] as const;
const categoryReport = createTemplatePackageQualityReport({
  packageValue,
  validation,
  loadedSourceDiagnostics: layeredReport(
    categoryCases.map(([layer], index) =>
      layeredDiagnostic({
        code: `CATEGORY_${index}`,
        layer,
      }),
    ),
  ),
});
assert(
  categoryCases.every(([, expected], index) =>
    categoryReport.issues.some(
      (issue) => issue.code === `CATEGORY_${index}` && issue.category === expected,
    ),
  ),
  "Layered package, graph, asset, field, font, motion, MCP, preview, and renderer diagnostics should map to their Quality categories.",
);

function qualityIssue(
  input: Partial<PackageQualityIssue> & Pick<PackageQualityIssue, "id" | "code">,
): PackageQualityIssue {
  return {
    fingerprint: input.id,
    severity: "warning",
    category: "renderer",
    origins: ["renderer"],
    message: input.code,
    whyItMatters: "Fixture issue.",
    blocks: [],
    blocksImport: false,
    ...input,
  };
}

const searchableIssue = qualityIssue({
  id: "searchable",
  code: "RENDER_FEATURE_APPROXIMATE",
  category: "assets",
  layer: "asset-references",
  origins: ["asset-registry"],
  message: "Product image reference could not be hydrated.",
  path: "assets/product.png",
  nodeId: "node:search",
  nodeName: "Product photo",
  fieldId: "productImage",
  assetId: "asset:product",
  ref: "asset://product",
  sourceNodeId: "figma:search",
  suggestedFix: "Restore the packaged image file.",
  relatedIds: ["node:related"],
});
[
  "render_feature",
  "could not be hydrated",
  "assets",
  "asset-references",
  "asset-registry",
  "product.png",
  "node:search",
  "product photo",
  "productimage",
  "asset:product",
  "asset://product",
  "figma:search",
  "restore the packaged",
  "node:related",
].forEach((query) => {
  assert(
    packageQualityIssueMatchesSearch(searchableIssue, query),
    `Quality search should match ${query}.`,
  );
});

const semanticFilterIssues = [
  qualityIssue({
    id: "blocker",
    code: "BLOCKING_WARNING",
    severity: "warning",
    blocksImport: true,
    blocks: ["import"],
  }),
  qualityIssue({
    id: "runtime-error",
    code: "RUNTIME_ERROR",
    severity: "error",
    blocksImport: false,
  }),
  qualityIssue({
    id: "info",
    code: "INVENTORY_INFO",
    severity: "info",
  }),
  qualityIssue({
    id: "repaired",
    code: "EXTERNAL_ASSET_COMPAT_NORMALIZED",
    severity: "info",
  }),
];
const exportBlockingIssue = qualityIssue({
  id: "export-blocker",
  code: "EXPORT_ASSET_MISSING",
  category: "export",
  blocks: ["export"],
});
const baseFilters = {
  query: "",
  area: "all" as const,
  technical: "all",
};
assert(
  filterPackageQualityIssues(semanticFilterIssues, {
    ...baseFilters,
    severity: "blockers",
  }).map((issue) => issue.id).join(",") === "blocker",
  "The blocked filter should include only issues that stop a workflow capability.",
);
assert(
  filterPackageQualityIssues(semanticFilterIssues, {
    ...baseFilters,
    severity: "unresolved",
  }).map((issue) => issue.id).join(",") === "blocker,runtime-error",
  "The default list should include Blocked and Review diagnostics while hiding repairs and information.",
);
assert(
  getDiagnosticPresentationState(semanticFilterIssues[0]) === "blocked" &&
    getDiagnosticPresentationState(semanticFilterIssues[1]) === "review" &&
    getDiagnosticPresentationState(semanticFilterIssues[2]) === "information" &&
    getDiagnosticPresentationState(semanticFilterIssues[3]) === "repaired" &&
    getDiagnosticPresentationState(exportBlockingIssue) === "blocked" &&
    diagnosticPresentationLabels.review === "Review",
  "Internal severities should map to the four canonical user-facing states.",
);
assert(
  getPreferredPackageQualitySelection(semanticFilterIssues)?.id === "blocker" &&
    getPreferredPackageQualitySelection(semanticFilterIssues.slice(1))?.id === "runtime-error",
  "Initial selection should prefer the first Blocked issue and then the first Review issue.",
);
assert(
  derivePackageQualityOverallStatus({
    import: "ready",
    fidelity: "ready",
    assets: "ready",
    editability: "ready",
    export: "blocked",
  }) === "blocked" &&
    derivePackageQualityOverallStatus({
      import: "ready",
      fidelity: "review",
      assets: "ready",
      editability: "ready",
      export: "ready",
    }) === "review",
  "Overall readiness should use the highest unresolved capability state instead of import status alone.",
);
assert(
  getPackageQualityIssueTitle(
    qualityIssue({ id: "font-title", code: "FONT_BINARY_MISSING", category: "fonts" }),
  ) === "A required font is missing" &&
    serializePackageQualityTechnicalDetails(semanticFilterIssues[0]).includes(
      '"code": "BLOCKING_WARNING"',
    ),
  "Diagnostics should expose plain-language titles while retaining codes in copied technical details.",
);

const repairedSizeIssue = qualityIssue({
  id: "size-repair",
  code: "ASSET_BYTESIZE_MISMATCH",
  category: "assets",
  assetId: "asset:image:product",
  details: { declaredBytes: 1441383, actualBytes: 1441382, differenceBytes: -1 },
});
assert(
  getDiagnosticPresentationState(repairedSizeIssue) === "repaired" &&
    getDiagnosticAudience(repairedSizeIssue) === "validation-history" &&
    getDiagnosticPresentation(repairedSizeIssue).userImpact?.includes("Nothing visible") &&
    getPackageQualityValidationHistory([repairedSizeIssue]).length === 1,
  "A deterministic one-byte metadata correction should be recorded as a non-visual repair.",
);
assert(
  getDiagnosticFriendlyTarget(
    qualityIssue({
      id: "friendly-field-marker",
      code: "LARGE_ASSET",
      nodeName: "field:image:product",
    }),
  ) === "Product image",
  "Friendly field and layer labels should take precedence over raw marker IDs.",
);
assert(
  getDiagnosticFriendlyTarget(
    qualityIssue({
      id: "friendly-vector-asset",
      code: "ASSET_REF_UNRESOLVED",
      category: "assets",
      assetId: "asset:svg:b6f7b1c0",
    }),
  ) === "Vector asset",
  "Default Inspector labels must not expose opaque asset identifiers.",
);
const unsupportedPaintPresentation = getDiagnosticPresentation(
  qualityIssue({
    id: "unsupported-paint",
    code: "UNSUPPORTED_PAINT_PRESERVED",
    category: "package",
  }),
);
assert(
  unsupportedPaintPresentation.userTitle === "A source paint is preserved but not rendered" &&
    unsupportedPaintPresentation.userImpact?.includes("package remains available"),
  "Preserved-only paints should use a specific non-blocking user explanation instead of a generic package-failure warning.",
);
const traceIssue = qualityIssue({
  id: "trace",
  code: "RESOLVED_AUTO_LAYOUT_APPLIED",
  severity: "info",
  message: "Resolved Auto Layout was applied.",
});
assert(
  getDiagnosticAudience(traceIssue) === "technical-trace" &&
    getPackageQualityTechnicalTrace([traceIssue]).length === 1 &&
    filterPackageQualityIssues([traceIssue], { ...baseFilters, severity: "all" }).length === 0,
  "Successful internal transformations should stay in technical trace data and out of the main list.",
);

const repeatedIssues = [
  qualityIssue({
    id: "motion-a",
    code: "MOTION_EASING_UNSUPPORTED",
    category: "motion",
    layer: "motion-links",
    nodeId: "node:a",
  }),
  qualityIssue({
    id: "motion-b",
    code: "MOTION_EASING_UNSUPPORTED",
    category: "motion",
    layer: "motion-links",
    nodeId: "node:b",
  }),
  qualityIssue({
    id: "font-a",
    code: "FONT_BINARY_MISSING",
    category: "fonts",
    layer: "font-requirements",
    nodeId: "text:a",
  }),
  qualityIssue({
    id: "font-b",
    code: "FONT_BINARY_MISSING",
    category: "fonts",
    layer: "font-requirements",
    nodeId: "text:b",
  }),
];
const repeatedGroups = groupPackageQualityIssues(repeatedIssues);
assert(
  repeatedGroups.length === 2 &&
    repeatedGroups.every((group) => group.issues.length === 2) &&
    repeatedGroups.flatMap((group) => group.issues).length === 4,
  "Repeated motion and font warnings should group by meaningful problem while preserving every instance.",
);
const missingMotionGroups = groupPackageQualityIssues([
  qualityIssue({ id: "motion-file", code: "MOTION_FILE_MISSING", category: "motion", layer: "motion-links" }),
  qualityIssue({ id: "motion-version", code: "MOTION_VERSION_MISSING", category: "motion", layer: "motion-links" }),
  qualityIssue({ id: "motion-nodes", code: "MOTION_NODES_MISSING", category: "motion", layer: "motion-links" }),
]);
assert(
  missingMotionGroups.length === 1 && missingMotionGroups[0].issues.length === 3,
  "Missing optional motion metadata should appear as one user-facing problem while retaining its three technical diagnostics.",
);
const missingAssetGroups = groupPackageQualityIssues([
  qualityIssue({ id: "asset-a", code: "asset-missing", category: "assets" }),
  qualityIssue({ id: "asset-b", code: "resolved-asset-ref-missing", category: "assets" }),
]);
assert(
  missingAssetGroups.length === 1 && missingAssetGroups[0].issues.length === 2,
  "Related missing-media diagnostics should group under one user-facing root cause.",
);
assert(
  summarizePackageQualityCategories(repeatedIssues).some(
    (summary) => summary.category === "motion" && summary.count === 2,
  ) &&
    summarizePackageQualityCategories(repeatedIssues).some(
      (summary) => summary.category === "fonts" && summary.count === 2,
    ),
  "Category summaries should report correct non-empty issue counts.",
);
assert(
  visiblePackageQualitySelection("motion-a", repeatedIssues) === "motion-a" &&
    visiblePackageQualitySelection("motion-a", repeatedIssues.slice(2)) === null,
  "A selected issue should clear predictably when filters hide it.",
);

const groupedPanelReport = {
  ...warningQualityReport,
  issues: repeatedIssues,
  summary: {
    errors: 0,
    warnings: repeatedIssues.length,
    info: 0,
    importBlockers: 0,
    exportBlockers: 0,
  },
};
const groupedPanelMarkup = renderToStaticMarkup(
  createElement(TemplatePackageQualityPanel, {
    report: groupedPanelReport,
    selectedIssueId: "motion-a",
    onSelectIssue: () => undefined,
  }),
);
assert(
  groupedPanelMarkup.includes("2 affected") &&
    groupedPanelMarkup.includes("Expand Motion easing is approximated instances"),
  "Grouped issues should expose their affected count and expandable instances without an inline detail card.",
);

const infoOnlyReport = {
  ...inventoryReport,
  status: "ready" as const,
  issues: [semanticFilterIssues[2]],
  summary: {
    errors: 0,
    warnings: 0,
    info: 1,
    importBlockers: 0,
    exportBlockers: 0,
  },
};
const infoOnlyMarkup = renderToStaticMarkup(
  createElement(TemplatePackageQualityPanel, { report: infoOnlyReport }),
);
assert(
  infoOnlyMarkup.includes("Validation complete") &&
    !infoOnlyMarkup.includes("Needs action"),
  "An internal-info-only report should render the completed state without obsolete terminology.",
);

if (!rendererIssue) {
  throw new Error("Quality panel fixture requires a renderer issue.");
}
const selectedPanelMarkup = renderToStaticMarkup(
  createElement(TemplatePackageQualityPanel, {
    report,
    selectedIssueId: rendererIssue.id,
    onSelectIssue: () => undefined,
  }),
);
assert(
  !selectedPanelMarkup.includes('data-testid="selected-quality-issue"') &&
    !selectedPanelMarkup.includes("Copy affected layer details"),
  "The issue list should not duplicate selected diagnostic details or copy actions inline.",
);
assert(
  selectedPanelMarkup.includes("Diagnostic status filters") &&
    selectedPanelMarkup.includes("Review") &&
    selectedPanelMarkup.includes("Repaired") &&
    selectedPanelMarkup.includes("Information"),
  "The quality panel should expose the canonical status filters without Needs action terminology.",
);

const contextMarkup = renderToStaticMarkup(
  createElement(TemplatePackageDiagnosticContext, {
    packageValue,
    issue: rendererIssue,
    instances: [rendererIssue],
  }),
);
assert(
  contextMarkup.includes('data-testid="quality-context-panel"') &&
    contextMarkup.includes("Impact") &&
    contextMarkup.includes("Fit template") &&
    contextMarkup.includes("Fit affected layer") &&
    contextMarkup.includes("Issue technical details") &&
    contextMarkup.match(/Copy technical details/g)?.length === 1,
  "Selected diagnostic details should render once in the contextual panel with preview navigation and secondary technical details.",
);
const backendContextIssue = backendIssues[0];
const backendContextMarkup = renderToStaticMarkup(
  createElement(TemplatePackageDiagnosticContext, {
    packageValue,
    issue: backendContextIssue,
    instances: [backendContextIssue],
  }),
);
assert(
  backendContextMarkup.indexOf("Issue technical details") <
    backendContextMarkup.indexOf(backendContextIssue.capabilityId ?? "missing-capability") &&
    serializePackageQualityTechnicalDetails(backendContextIssue).includes('"revisions"'),
  "Backend names and revision telemetry must stay behind the expanded technical-details disclosure.",
);
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type {
  DiagnosticAudience,
  DiagnosticContext,
  DiagnosticPresentation,
  DiagnosticResolution,
  DiagnosticSeverity,
  PackageQualityIssue,
} from "./types";

export type DiagnosticPresentationState = DiagnosticSeverity;

export const diagnosticPresentationLabels: Record<
  DiagnosticPresentationState,
  string
> = {
  blocked: "Blocked",
  review: "Review",
  repaired: "Repaired",
  information: "Information",
};

const automaticRepairPattern =
  /(repaired|normalized|compat.normalized|auto.?fix|extracted|hydrated|inferred|recovered)/i;
const deterministicMetadataRepairPattern =
  /(asset.*bytesize.*mismatch|asset.*size.*mismatch|ASSET_BYTESIZE_MISMATCH)/i;
const technicalTracePattern =
  /(metadata.*attached|tokens.*attached|renderer.*hints.*attached|source.*shape.*normaliz|resolved.*auto.*layout|resolved.*text.*alignment|resolved.*text.*vertical|resolved.*svg.*viewbox|resolved.*image.*render.*mode|runtime.*stored|intermediate.*stored|bundle.*source.*metadata)/i;
const userRelevantInformationPattern =
  /(glyph|character|font.*fallback|motion.*preserv|preview.*differ|flatten|not.*editable|editability|reference.*preview|performance|large.*asset|asset.*large|live.*resize|containment)/i;

export function getDiagnosticPresentationState(
  issue: PackageQualityIssue,
): DiagnosticPresentationState {
  if (issue.blocksImport || issue.blocks.length > 0) return "blocked";
  if (
    deterministicMetadataRepairPattern.test(issue.code) ||
    automaticRepairPattern.test(issue.code)
  ) {
    return "repaired";
  }
  if (issue.severity === "warning" || issue.severity === "error") return "review";
  return "information";
}

const titleRules: Array<[RegExp, string]> = [
  [/asset.*missing|missing.*asset/i, "Media file is missing"],
  [/asset.*unresolved|unresolved.*asset/i, "Media file could not be connected"],
  [/glyph.*fallback|fallback.*glyph/i, "Some characters may use a fallback font"],
  [/font.*missing|binary.*missing|font.*unresolved|font.*unknown/i, "A required font is missing"],
  [/field.*missing|missing.*field|field.*target/i, "Field is not connected"],
  [/text.*trunc|text.*overflow/i, "Text may be clipped"],
  [/resize.*contain|live.*resize/i, "Editing may clip nearby content"],
  [/fallback.*node|renderer.*fallback/i, "Some layers use a fallback"],
  [/large.*asset|asset.*large/i, "Large media may slow preview loading"],
  [/bytesize.*mismatch|asset.*size.*mismatch/i, "Media size metadata was corrected"],
  [/video.*paint.*fallback.*normalized/i, "Video paint uses a static image fallback"],
  [/video.*paint.*without.*fallback/i, "Video has no static image fallback"],
  [/motion.*easing.*unsupported/i, "Motion easing is approximated"],
  [/motion.*node.*missing|motion.*unmatched/i, "Motion target is missing"],
  [/stroke.*inclusion.*missing/i, "Stroke placement may differ"],
  [/transform.*bounds.*approxim/i, "Layer bounds are approximated"],
  [/preview.*missing|missing.*preview/i, "Reference image is unavailable"],
  [/unsupported.*paint.*preserved/i, "A source paint is preserved but not rendered"],
  [/schema|contract.*unsupported/i, "Template format is not supported"],
  [/root.*missing/i, "Template canvas is missing"],
  [/cycle|parent.*mismatch|child.*missing/i, "Layer structure is inconsistent"],
  [/normalized|repaired|recovered/i, "Compatibility issue was repaired"],
];

function sentenceCase(value: string): string {
  const words = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._:/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return words ? `${words[0].toUpperCase()}${words.slice(1)}` : "Template issue";
}

export function getDiagnosticCodeTitle(code: string): string {
  const matched = titleRules.find(([pattern]) => pattern.test(code));
  return matched?.[1] ?? sentenceCase(code);
}

export function getPackageQualityIssueTitle(issue: PackageQualityIssue): string {
  return issue.presentation?.userTitle ?? getDiagnosticCodeTitle(issue.code);
}

export function getDiagnosticAudience(
  issue: PackageQualityIssue,
): DiagnosticAudience {
  if (issue.audience) return issue.audience;
  const state = getDiagnosticPresentationState(issue);
  if (state === "repaired") return "validation-history";
  if (technicalTracePattern.test(`${issue.code} ${issue.message}`)) {
    return "technical-trace";
  }
  if (
    state === "information" &&
    !userRelevantInformationPattern.test(`${issue.code} ${issue.message}`)
  ) {
    return "technical-trace";
  }
  return "user";
}

export function getDiagnosticResolution(
  issue: PackageQualityIssue,
): DiagnosticResolution {
  if (issue.resolution) return issue.resolution;
  const state = getDiagnosticPresentationState(issue);
  if (state === "repaired") return "auto-repaired";
  if (state === "blocked") return "user-action-required";
  if (issue.fieldId || issue.category === "fonts") return "repair-available";
  return "none";
}

export function getDiagnosticContext(issue: PackageQualityIssue): DiagnosticContext {
  if (issue.context) return issue.context;
  if (issue.fieldId) return { type: "field", fieldId: issue.fieldId };
  if (issue.assetId) return { type: "asset", assetId: issue.assetId };
  if (issue.category === "fonts") {
    return { type: "font", fontKey: issue.ref ?? issue.code };
  }
  if (issue.nodeId) return { type: "visual-target", nodeIds: [issue.nodeId] };
  if (issue.file || issue.path || issue.category === "package" || issue.category === "source") {
    return { type: "package", sourcePath: issue.file ?? issue.path };
  }
  return { type: "none" };
}

function detailNumber(issue: PackageQualityIssue, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = issue.details?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function formatBytes(value: number | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value < 1024) return `${value} bytes`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function isDeveloperSuggestion(value: string | undefined): boolean {
  return Boolean(
    value &&
      /(add .*support|runtime later|follow-up|over time|renderer|implementation|developer)/i.test(value),
  );
}

export function getDiagnosticPresentation(
  issue: PackageQualityIssue,
): DiagnosticPresentation {
  if (issue.presentation) return issue.presentation;
  const codeAndMessage = `${issue.code} ${issue.message}`;
  let userTitle = getDiagnosticCodeTitle(issue.code);
  let userSummary = issue.message;
  let userImpact = issue.whyItMatters;

  if (deterministicMetadataRepairPattern.test(codeAndMessage)) {
    const declared = formatBytes(
      detailNumber(issue, ["declaredByteSize", "declaredBytes"]),
    );
    const actual = formatBytes(
      detailNumber(issue, ["actualByteSize", "actualBytes"]),
    );
    userTitle = "Media size metadata was corrected";
    userSummary = declared && actual
      ? `The package declared ${declared}; the readable file contains ${actual}. The file value is now used.`
      : "The declared file size differed from the readable ZIP entry. The file value is now used.";
    userImpact = "Nothing visible is affected. Import, preview, and export remain supported.";
  } else if (/video.*paint.*fallback.*normalized/i.test(codeAndMessage)) {
    userTitle = "Video paint uses a static image fallback";
    userSummary = "The source video paint was preserved as Figma metadata and removed from the static render fills.";
    userImpact = "Static preview and PNG export use the bundled image fallback and remain supported.";
  } else if (/video.*paint.*without.*fallback/i.test(codeAndMessage)) {
    userTitle = "Video has no static image fallback";
    userSummary = "The source video paint is preserved, but this node does not include an image that can represent it in a static template.";
    userImpact = "The affected node may be empty in static preview and PNG export.";
  } else if (/external.*asset.*compat.*normalized/i.test(codeAndMessage)) {
    userTitle = "Bundled media was connected";
    userSummary = "The exporter reference was connected to the matching file in the ZIP package.";
    userImpact = "The media remains available for preview, editing, persistence, and export.";
  } else if (/static.*motion.*state.*normalized/i.test(codeAndMessage)) {
    userTitle = "Static template confirmed";
    userSummary = "The exporter explicitly declared that this template has no motion file.";
    userImpact = "Static preview and PNG export remain supported. No motion repair is needed.";
  } else if (/glyph.*fallback|font\.glyph-fallback-likely/i.test(codeAndMessage)) {
    userTitle = "Some characters may use a fallback font";
    userSummary = "The required font is loaded, but some emoji or symbol glyphs may come from the platform fallback face.";
    userImpact = "Text layout is supported, though these characters may look slightly different in preview and export.";
  } else if (/motion.*field.*unsupported|motion.*channel.*unsupported/i.test(codeAndMessage)) {
    userTitle = "A motion effect is not shown in preview";
    userSummary = "One animation property is preserved in the template but is not rendered in the in-app motion preview.";
    userImpact = "Static preview and PNG export are unaffected. The original motion data remains intact.";
  } else if (/large.*asset|asset.*large/i.test(codeAndMessage)) {
    const actual = formatBytes(detailNumber(issue, ["actualByteSize", "byteSize", "size"]));
    const threshold = formatBytes(detailNumber(issue, ["recommendedByteSize", "threshold", "maxByteSize"]));
    userTitle = "Large media may slow preview loading";
    userSummary = actual
      ? `This media file is ${actual}${threshold ? `; the recommended maximum is ${threshold}` : ""}.`
      : "This media file is larger than the recommended preview threshold.";
    userImpact = "Import and export remain supported, but preview loading may be slower.";
  } else if (/text.*trunc|text.*overflow/i.test(codeAndMessage)) {
    userTitle = "Text may be clipped in preview";
    userSummary = "The imported text box and clipping settings are preserved, but preview truncation may not exactly match the source design.";
    userImpact = "Preview fidelity may differ. The field remains editable and static export remains available.";
  } else if (/editor-live-resize-contained/i.test(codeAndMessage)) {
    userTitle = "Editing containment is active";
    userSummary = "This resizable area uses deterministic containment to keep positioned children from overlapping following content.";
    userImpact = "The imported layout, preview, and export remain unchanged; no overflow is currently observed.";
  } else if (/resize.*contain|live.*resize|editor.*clip/i.test(codeAndMessage)) {
    userTitle = "Editing may clip nearby content";
    userSummary = "This resizable area contains positioned layers that cannot always reflow while content is edited.";
    userImpact = "The imported layout stays intact; only live editing and resized content may clip.";
  } else if (/fallback.*node|renderer.*fallback/i.test(codeAndMessage)) {
    userTitle = "Some layers use a visual fallback";
    userSummary = "The preview uses a preserved fallback for layers the renderer cannot model directly.";
    userImpact = "The template remains visible, but those layers may have limited editability or preview fidelity.";
  } else if (/unsupported.*paint.*preserved/i.test(codeAndMessage)) {
    userTitle = "A source paint is preserved but not rendered";
    userSummary = "The package keeps this source paint as technical metadata, but the current renderer does not draw it.";
    userImpact = "Only the affected layer may differ. The package remains available for import and supported export paths.";
  }

  const userAction = issue.fieldId
    ? { kind: "configure-field" as const, label: "Configure field" }
    : issue.category === "fonts" && getDiagnosticPresentationState(issue) !== "information"
      ? { kind: "load-font" as const, label: "Add or replace font" }
      : getDiagnosticPresentationState(issue) === "blocked"
        ? { kind: "retry-validation" as const, label: "Retry validation" }
        : undefined;

  if (
    getDiagnosticPresentationState(issue) === "repaired" &&
    !userImpact
  ) {
    userImpact = "The package was corrected automatically. No action is required.";
  }

  return {
    userTitle,
    userSummary,
    userImpact,
    userAction,
    developerNote: isDeveloperSuggestion(issue.suggestedFix)
      ? issue.suggestedFix
      : undefined,
    technicalMessage: issue.message,
  };
}

export function getDiagnosticFriendlyTarget(issue: PackageQualityIssue): string | undefined {
  const friendlyFieldMarker = (value: string): string | undefined => {
    const fieldMarker = /^field:([^:]+):(.+)$/i.exec(value);
    if (!fieldMarker) return undefined;
    const fieldType = fieldMarker[1].toLowerCase();
    const label = sentenceCase(fieldMarker[2]);
    return fieldType === "image" ? `${label} image` : `${label} field`;
  };
  if (issue.nodeName) return friendlyFieldMarker(issue.nodeName) ?? issue.nodeName;
  if (issue.fieldId) return `${sentenceCase(issue.fieldId)} field`;
  const assetReference = issue.assetId ?? (/^asset:/i.test(issue.ref ?? "") ? issue.ref : undefined);
  if (assetReference) {
    const fieldMarker = friendlyFieldMarker(assetReference);
    if (fieldMarker) return fieldMarker;
    if (issue.file) {
      const parts = issue.file.split("/").filter(Boolean);
      return parts[parts.length - 1];
    }
    const assetKind = /^asset:([^:]+)/i.exec(assetReference)?.[1]?.toLowerCase();
    if (assetKind === "svg" || assetKind === "vector") return "Vector asset";
    if (assetKind === "image") return "Image asset";
    if (assetKind === "font") return "Font asset";
    return "Media asset";
  }
  if (issue.file) return issue.file;
  if (issue.layerPath) {
    const parts = issue.layerPath.split("/").filter(Boolean);
    return parts[parts.length - 1];
  }
  return undefined;
}

export function getPackageQualityRootCause(issue: PackageQualityIssue): string {
  const code = issue.code.toLowerCase();
  if (code.includes("asset") && /(missing|unavailable|unresolved)/.test(code)) {
    return "missing-media";
  }
  if (code.includes("font") && /(missing|fallback|unavailable|unresolved)/.test(code)) {
    return "font-unavailable";
  }
  if (issue.category === "fields" && /(missing|target|unresolved)/.test(code)) {
    return "field-unresolved";
  }
  if (issue.category === "motion" && code.includes("easing")) return "motion-easing";
  if (
    issue.category === "motion" &&
    /(file.*missing|version.*missing|nodes?.*missing|target.*missing)/.test(code)
  ) {
    return "motion-metadata-missing";
  }
  return code;
}

export function serializePackageQualityTechnicalDetails(
  issue: PackageQualityIssue,
): string {
  return JSON.stringify(
    {
      id: issue.id,
      code: issue.code,
      severity: issue.severity,
      presentationState: getDiagnosticPresentationState(issue),
      audience: getDiagnosticAudience(issue),
      resolution: getDiagnosticResolution(issue),
      context: getDiagnosticContext(issue),
      presentation: getDiagnosticPresentation(issue),
      category: issue.category,
      layer: issue.layer,
      origins: issue.origins,
      message: issue.message,
      consequence: issue.whyItMatters,
      suggestedAction: issue.suggestedFix,
      affected: {
        file: issue.file,
        path: issue.path,
        nodeId: issue.nodeId,
        sourceNodeId: issue.sourceNodeId,
        nodeName: issue.nodeName,
        layerPath: issue.layerPath,
        fieldId: issue.fieldId,
        assetId: issue.assetId,
        ref: issue.ref,
        relatedIds: issue.relatedIds,
      },
      provenance: issue.details,
    },
    null,
    2,
  );
}

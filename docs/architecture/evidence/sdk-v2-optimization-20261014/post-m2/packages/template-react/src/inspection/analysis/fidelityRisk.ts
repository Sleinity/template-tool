import type {
  FidelityRiskCause,
  FidelityRiskItem,
  FidelityRiskLevel,
  FidelityRiskReport,
  RendererFeatureCoverageReport,
} from "./types";

const highRisk = new Set([
  "true-figma-masks",
  "blend-modes",
  "blur",
  "shadows",
  "mixed-text-styles",
  "missing-font-metadata",
  "missing-image-assets",
  "missing-asset-references",
  "gradients",
  "transformed-bounds",
  "boolean-vector-without-svg",
  "unsupported-image-modes",
]);

const mediumRisk = new Set([
  "nested-auto-layout",
  "sizing-hug",
  "sizing-fill",
  "stretch-constraints",
  "scale-constraints",
  "min-max-dimensions",
  "wrapping-auto-layout",
  "image-mode-crop",
  "image-mode-tile",
  "image-transform",
  "strokes",
  "stroke-in-layout",
  "rotation",
  "nested-transforms",
  "text-alignment",
  "paragraph-spacing",
  "multiple-fills",
  "vector-complex-features",
  "large-embedded-assets",
]);

function riskLevel(featureKey: string): FidelityRiskLevel {
  if (highRisk.has(featureKey)) return "high";
  if (mediumRisk.has(featureKey)) return "medium";
  return "low";
}

function cause(
  featureKey: string,
  status: string,
): FidelityRiskCause {
  if (featureKey.includes("missing-font") || featureKey.includes("missing-asset")) {
    return "missing asset/font issue";
  }
  if (featureKey === "constraint-metadata-mismatch" || featureKey === "transformed-bounds") {
    return "plugin export gap";
  }
  if (
    ["true-figma-masks", "blend-modes", "blur", "mixed-text-styles"].includes(
      featureKey,
    )
  ) {
    return "unsupported Figma feature";
  }
  if (status === "partial" || status === "unsupported") {
    return "renderer limitation";
  }
  return "unknown";
}

export function analyzeFidelityRisk(
  coverage: RendererFeatureCoverageReport,
): FidelityRiskReport {
  const items: FidelityRiskItem[] = coverage.items.map((feature) => {
    const level = riskLevel(feature.key);
    return {
      featureKey: feature.key,
      featureName: feature.name,
      level,
      reason:
        level === "low"
          ? `${feature.explanation} This is covered by the renderer's established behavior.`
          : feature.explanation,
      likelyCause: cause(feature.key, feature.status),
      affectedNodes: feature.affectedNodes,
    };
  });
  const order: Record<FidelityRiskLevel, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  items.sort(
    (a, b) =>
      order[a.level] - order[b.level] ||
      a.featureName.localeCompare(b.featureName),
  );
  return {
    items,
    summary: {
      low: items.filter((item) => item.level === "low").length,
      medium: items.filter((item) => item.level === "medium").length,
      high: items.filter((item) => item.level === "high").length,
    },
    blocking: false,
  };
}

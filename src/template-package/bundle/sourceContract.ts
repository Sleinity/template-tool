import type { TemplatePackageBundleDiagnostic } from "./types";

type JsonRecord = Record<string, unknown>;

export interface BundleSourceContractResult {
  readable: boolean;
  diagnostics: TemplatePackageBundleDiagnostic[];
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function diagnostic(
  code: string,
  severity: TemplatePackageBundleDiagnostic["severity"],
  message: string,
  path: string,
  details?: Record<string, unknown>,
): TemplatePackageBundleDiagnostic {
  return {
    code,
    severity,
    category: "source",
    message,
    path,
    details: { validationStage: "raw-source", ...details },
  };
}

/**
 * Checks that exporter data is safe enough to adapt. This is deliberately not
 * the TemplatePackageV1 contract; strict canonical validation runs after the
 * known source variants have been normalized.
 */
export function validateTemplatePackageBundleSource(
  value: unknown,
): BundleSourceContractResult {
  if (!isRecord(value)) {
    return {
      readable: false,
      diagnostics: [
        diagnostic(
          "SOURCE_TEMPLATE_NOT_OBJECT",
          "error",
          "template.json must contain a JSON object.",
          "/",
        ),
      ],
    };
  }

  const diagnostics: TemplatePackageBundleDiagnostic[] = [];
  if (!isRecord(value.nodes)) {
    diagnostics.push(
      diagnostic(
        "SOURCE_NODES_NOT_OBJECT",
        "error",
        "template.json nodes must be an object before the package can be normalized.",
        "/nodes",
      ),
    );
  } else {
    for (const [nodeId, rawNode] of Object.entries(value.nodes)) {
      if (!isRecord(rawNode)) continue;
      const appearance = isRecord(rawNode.appearance) ? rawNode.appearance : null;
      const fills = Array.isArray(appearance?.fills) ? appearance.fills : [];
      fills.forEach((paint, index) => {
        if (!isRecord(paint) || paint.type !== "VIDEO") return;
        const hasImageFallback =
          fills.some(
            (candidate) => isRecord(candidate) && candidate.type === "IMAGE",
          ) ||
          (isRecord(rawNode.image) &&
            typeof rawNode.image.assetId === "string" &&
            rawNode.image.assetId.length > 0);
        diagnostics.push(
          diagnostic(
            hasImageFallback
              ? "SOURCE_VIDEO_PAINT_ADAPTABLE"
              : "SOURCE_VIDEO_PAINT_WITHOUT_FALLBACK",
            "info",
            hasImageFallback
              ? "A Figma video paint has a supported static image fallback."
              : "A Figma video paint has no static fallback; the node may be incomplete in static rendering.",
            `/nodes/${nodeId}/appearance/fills/${index}`,
            { nodeId, hasImageFallback },
          ),
        );
      });
    }
  }

  return {
    readable: !diagnostics.some((item) => item.severity === "error"),
    diagnostics,
  };
}

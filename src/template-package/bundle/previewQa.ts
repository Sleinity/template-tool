import type { PackagePreviewReference } from "./previewReference";
import type { TemplatePackageBundleDiagnostic } from "./types";

export type PreviewQaComparisonStatus =
  | "ready"
  | "skipped"
  | "warning"
  | "error";

export interface PreviewQaDimensions {
  width: number;
  height: number;
}

export interface PreviewQaComparisonResult {
  status: PreviewQaComparisonStatus;
  code: string;
  message: string;
  preview?: PreviewQaDimensions;
  rendered?: PreviewQaDimensions;
  diagnostics: TemplatePackageBundleDiagnostic[];
}

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function diagnostic(
  code: string,
  severity: TemplatePackageBundleDiagnostic["severity"],
  message: string,
  details?: Record<string, unknown>,
): TemplatePackageBundleDiagnostic {
  return {
    code,
    severity,
    category: "preview",
    message,
    path: "preview.png",
    details,
  };
}

export function comparePreviewReferenceDimensions(
  preview: PackagePreviewReference | null | undefined,
  rendered: PreviewQaDimensions | null | undefined,
): PreviewQaComparisonResult {
  if (!preview) {
    return {
      status: "skipped",
      code: "PREVIEW_COMPARISON_SKIPPED",
      message: "No preview.png reference is available for QA comparison.",
      diagnostics: [
        diagnostic(
          "PREVIEW_COMPARISON_SKIPPED",
          "info",
          "Preview comparison was skipped because preview.png is missing.",
        ),
      ],
    };
  }

  if (!finitePositive(preview.width) || !finitePositive(preview.height)) {
    return {
      status: "skipped",
      code: "PREVIEW_COMPARISON_UNAVAILABLE",
      message: "Preview comparison is unavailable because preview dimensions are unknown.",
      diagnostics: [
        diagnostic(
          "PREVIEW_COMPARISON_UNAVAILABLE",
          "warning",
          "Preview comparison needs readable preview.png dimensions.",
        ),
      ],
    };
  }

  const previewDimensions = {
    width: preview.width,
    height: preview.height,
  };

  if (!rendered || !finitePositive(rendered.width) || !finitePositive(rendered.height)) {
    return {
      status: "skipped",
      code: "PREVIEW_RENDER_TARGET_MISSING",
      message: "Preview comparison is ready, but no rendered target dimensions were provided.",
      preview: previewDimensions,
      diagnostics: [
        diagnostic(
          "PREVIEW_RENDER_TARGET_MISSING",
          "info",
          "Provide a rendered PNG target to compare against preview.png.",
        ),
      ],
    };
  }

  if (
    Math.round(previewDimensions.width) !== Math.round(rendered.width) ||
    Math.round(previewDimensions.height) !== Math.round(rendered.height)
  ) {
    return {
      status: "warning",
      code: "PREVIEW_DIMENSION_MISMATCH",
      message: `preview.png is ${previewDimensions.width} × ${previewDimensions.height}, while the render target is ${rendered.width} × ${rendered.height}.`,
      preview: previewDimensions,
      rendered,
      diagnostics: [
        diagnostic(
          "PREVIEW_DIMENSION_MISMATCH",
          "warning",
          "preview.png dimensions do not match the rendered target dimensions.",
          { preview: previewDimensions, rendered },
        ),
      ],
    };
  }

  return {
    status: "ready",
    code: "PREVIEW_DIMENSIONS_MATCH",
    message: "preview.png dimensions match the rendered target dimensions.",
    preview: previewDimensions,
    rendered,
    diagnostics: [],
  };
}

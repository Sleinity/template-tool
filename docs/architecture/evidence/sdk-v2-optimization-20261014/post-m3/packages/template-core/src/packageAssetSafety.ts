import type { PackageAsset } from "./types";

const supportedImageMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const supportedFontMimeTypes = new Set([
  "font/ttf",
  "font/otf",
  "font/woff",
  "font/woff2",
  "application/font-woff",
  "application/vnd.ms-fontobject",
]);

const base64DataUrlPattern =
  /^data:([^;,]+)(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/]*={0,2})$/i;

export interface PackageAssetSafetyIssue {
  code: string;
  severity: "warning" | "error";
  message: string;
  assetId: string;
}

function isSafeSvgMarkup(value: string): boolean {
  return (
    /^\s*<svg(?:\s|>)/i.test(value) &&
    !/<(?:script|foreignObject)\b/i.test(value) &&
    !/\bon[a-z]+\s*=/i.test(value) &&
    !/(?:javascript|data:text\/html)\s*:/i.test(value)
  );
}

export function inspectPackageAssetSafety(
  asset: PackageAsset,
): PackageAssetSafetyIssue[] {
  const issues: PackageAssetSafetyIssue[] = [];
  const embeddedData = asset.dataUrl ?? asset.data;

  if (embeddedData) {
    const match = embeddedData.match(base64DataUrlPattern);
    const mimeType = match?.[1]?.toLowerCase();
    const payload = match?.[2] ?? "";
    const supportedMimeTypes =
      asset.type === "font" ? supportedFontMimeTypes : supportedImageMimeTypes;
    if (
      !match ||
      !mimeType ||
      !supportedMimeTypes.has(mimeType) ||
      payload.length === 0 ||
      payload.length % 4 === 1
    ) {
      issues.push({
        code: "asset.unsafe-data-url",
        severity: "error",
        message:
          `Embedded ${asset.type === "font" ? "font" : "image"} data must use a supported Base64 data URL.`,
        assetId: asset.id,
      });
    } else if (
      asset.mimeType &&
      asset.mimeType.toLowerCase() !== mimeType
    ) {
      issues.push({
        code: "asset.mime-type-mismatch",
        severity: "warning",
        message: `Asset MIME type "${asset.mimeType}" does not match data URL MIME type "${mimeType}".`,
        assetId: asset.id,
      });
    }
  }

  if (
    asset.source === "remote" &&
    (!asset.url || !/^https?:\/\//i.test(asset.url))
  ) {
    issues.push({
      code: "asset.unsafe-remote-url",
      severity: "error",
      message: "Remote package assets must use an HTTP or HTTPS URL.",
      assetId: asset.id,
    });
  }

  if (
    asset.stableUrl &&
    !/^(?:blob:|https?:\/\/|data:(?:image\/(?:png|jpe?g|webp|gif|svg\+xml)|font\/(?:ttf|otf|woff2?)|application\/font-woff)(?:;[^,]*)?,)/i.test(
      asset.stableUrl,
    )
  ) {
    issues.push({
      code: "asset.unsafe-stable-url",
      severity: "error",
      message:
        "Managed asset URLs must use blob, HTTP(S), or a supported image data URL.",
      assetId: asset.id,
    });
  }

  if (asset.svgString && !isSafeSvgMarkup(asset.svgString)) {
    issues.push({
      code: "asset.unsafe-svg",
      severity: "error",
      message:
        "Embedded SVG contains unsupported active content or is not valid SVG markup.",
      assetId: asset.id,
    });
  }

  return issues;
}

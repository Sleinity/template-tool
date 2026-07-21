import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import type { TemplatePackageV1 } from "../types";
import { validatePackageJpgExportReadiness } from "./packageExportReadiness";
import type { FontReadinessReport } from "../resolved";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const packageValue =
  figmaPluginV041 as unknown as TemplatePackageV1;
const ready = validatePackageJpgExportReadiness({
  format: "jpg",
  packageValue,
  renderMode: "static",
});
assert(ready.ready, "The valid plugin fixture should be JPG-export ready.");

const missingFontReport: FontReadinessReport = {
  reliable: false,
  exportReady: false,
  required: [
    {
      family: "Unavailable Sans",
      weight: 700,
      style: "normal",
      usedBy: ["headline"],
      status: "missing",
      source: "unresolved",
      verified: false,
      deterministicForExport: false,
    },
  ],
  missing: [
    {
      family: "Unavailable Sans",
      weight: 700,
      style: "normal",
      usedBy: ["headline"],
      status: "missing",
      source: "unresolved",
      verified: false,
      deterministicForExport: false,
    },
  ],
  fallback: [],
  unknown: [],
  groups: [],
  unverified: [],
};
const fontBlocker = validatePackageJpgExportReadiness(
  {
    format: "jpg",
    packageValue,
    renderMode: "static",
  },
  missingFontReport,
);
assert(
  fontBlocker.status === "blocked" &&
    fontBlocker.issues.some(
      (item) => item.code === "font.export-unresolved",
    ),
  "Unresolved required fonts should block deterministic export readiness.",
);

const approvedFallbackReport: FontReadinessReport = {
  ...missingFontReport,
  exportReady: true,
  required: [
    {
      ...missingFontReport.required[0],
      status: "fallback",
      source: "fallback",
      verified: true,
      deterministicForExport: true,
      fallbackFamily: "Arial",
    },
  ],
  missing: [],
  fallback: [],
};
const approvedFallback = validatePackageJpgExportReadiness(
  { format: "png", packageValue, renderMode: "static" },
  approvedFallbackReport,
);
assert(
  approvedFallback.ready &&
    approvedFallback.status === "warning" &&
    approvedFallback.issues.some(
      (item) => item.code === "font.export-approved-fallback",
    ),
  "A verified approved fallback should remain export-ready with a warning.",
);

const unsafePackage = structuredClone(packageValue);
const imageAsset = Object.values(unsafePackage.assets).find(
  (asset) => asset.type === "image",
);
if (!imageAsset) throw new Error("Fixture requires an image asset.");
imageAsset.dataUrl = "data:text/html;base64,PHNjcmlwdD4=";
const unsafe = validatePackageJpgExportReadiness({
  format: "jpg",
  packageValue: unsafePackage,
  renderMode: "static",
});
assert(
  !unsafe.ready &&
    unsafe.issues.some((item) => item.code === "asset.unsafe-data-url"),
  "Unsafe Package data URLs must block export readiness.",
);

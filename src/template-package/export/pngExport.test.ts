import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import type { FontReadinessReport } from "../resolved";
import type { TemplatePackageV1 } from "../types";
import {
  exportTemplatePackagePng,
  PackagePngExportError,
  sanitizePngExportFilename,
} from "./pngExport";
import type { PackageExportReadinessResult } from "./packageExportReadiness";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const packageValue =
  figmaPluginV041 as unknown as TemplatePackageV1;

const fontReadiness: FontReadinessReport = {
  reliable: true,
  exportReady: true,
  required: [],
  missing: [],
  fallback: [],
  unknown: [],
  groups: [],
  unverified: [],
};

const readyReadiness: PackageExportReadinessResult = {
  ready: true,
  status: "ready",
  issues: [],
  assetReliability: {
    totalAssets: 0,
    storedAssets: 0,
    embeddedAssets: 0,
    remoteAssets: 0,
    missingAssets: 0,
    duplicateAssets: 0,
    totalWeightBytes: 0,
    totalWeightKb: 0,
    largestAssets: [],
    entries: [],
    diagnostics: [],
  },
  fontReadiness,
  assets: { status: "ready", blockerCodes: [], warningCodes: [] },
  fonts: { status: "ready", blockerCodes: [], warningCodes: [] },
  fields: { status: "ready", blockerCodes: [], warningCodes: [] },
  renderer: { status: "ready", blockerCodes: [], warningCodes: [] },
  blockers: [],
  warnings: [],
};

assert(
  sanitizePngExportFilename(
    " Summer / Sale: 2026? ",
    new Date("2026-07-06T12:00:00.000Z"),
  ) === "summer-sale-2026-2026-07-06.png",
  "PNG filenames should be lower-case, dated, and filesystem-safe.",
);

const order: string[] = [];
let downloadedFilename = "";
let capturedPackageName = "";
const result = await exportTemplatePackagePng(
  {
    packageValue,
    node: {} as HTMLElement,
    renderMode: "static",
    templateName: "Fixture Export",
    now: new Date("2026-07-06T12:00:00.000Z"),
    onProgress: (message) => order.push(message),
  },
  {
    checkReadiness: async () => {
      order.push("readiness");
      return readyReadiness;
    },
    waitForAssets: async () => {
      order.push("assets");
      return [];
    },
    capture: async (_node, exportedPackage) => {
      order.push("capture");
      capturedPackageName = exportedPackage.name;
      return {
        pngDataUrl: "data:image/png;base64,ZmFrZQ==",
        fontReadiness,
      };
    },
    download: (filename) => {
      order.push("download");
      downloadedFilename = filename;
    },
  },
);
assert(
  result.filename === "fixture-export-2026-07-06.png" &&
    downloadedFilename === result.filename,
  "PNG export should download using the sanitized filename.",
);
assert(
  capturedPackageName === packageValue.name,
  "PNG export should capture the current working package value.",
);
assert(
  order.indexOf("readiness") < order.indexOf("assets") &&
    order.indexOf("assets") < order.indexOf("capture") &&
    order.indexOf("capture") < order.indexOf("download"),
  "PNG export should check readiness, wait for assets, capture, then download.",
);

let silentDownloadCount = 0;
const silentResult = await exportTemplatePackagePng(
  {
    packageValue,
    node: {} as HTMLElement,
    renderMode: "editor",
    download: false,
  },
  {
    checkReadiness: async () => readyReadiness,
    waitForAssets: async () => [],
    capture: async () => ({
      pngDataUrl: "data:image/png;base64,c2lsZW50",
      fontReadiness,
    }),
    download: () => {
      silentDownloadCount += 1;
    },
  },
);
assert(
  silentDownloadCount === 0 &&
    silentResult.pngDataUrl === "data:image/png;base64,c2lsZW50",
  "Silent PNG capture should return the current result without initiating a download.",
);

const blockedReadiness: PackageExportReadinessResult = {
  ...readyReadiness,
  ready: false,
  status: "blocked",
  issues: [
    {
      code: "asset.missing",
      severity: "error",
      message: "A required asset is missing.",
      assetId: "asset:image:missing",
    },
  ],
};
let blockedError: unknown = null;
try {
  await exportTemplatePackagePng(
    {
      packageValue,
      node: {} as HTMLElement,
      renderMode: "static",
    },
    {
      checkReadiness: async () => blockedReadiness,
      waitForAssets: async () => [],
      capture: async () => ({
        pngDataUrl: "data:image/png;base64,ZmFrZQ==",
        fontReadiness,
      }),
      download: () => undefined,
    },
  );
} catch (error) {
  blockedError = error;
}
assert(
  blockedError instanceof PackagePngExportError &&
    blockedError.diagnostics.some((item) => item.code === "asset.missing"),
  "Blocked readiness should surface export diagnostics.",
);

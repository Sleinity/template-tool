import {
  isExactFontRequirementResolved,
  managedFontExactlyMatchesRequirement,
} from "../fonts/exactFontSetup";
import { getManagedFontRegistry } from "../fonts/fontRegistry";
import type { ManagedFontRegistry } from "../fonts/fontRegistryTypes";
import {
  validateTemplatePackage,
  type TemplatePackageValidationResult,
  type TemplatePackageV1,
} from "@sleinity/template-core";
import {
  validatePackageEditableFieldRules,
  type PackageFieldRulesValidationReportV1,
} from "@sleinity/template-core/editor";
import type {
  TemplateSessionLoadStateResultV1,
  TemplateSessionV1,
} from "../session/templateSession";
import {
  createTemplatePackageDigest,
  createTemplatePackageFingerprint,
  TEMPLATE_PACKAGE_DIGEST_SCHEMA_VERSION,
} from "./templateImportIntegrity";
import {
  TEMPLATE_IMPORT_CONFIRMATION_SCHEMA_VERSION,
  TEMPLATE_SDK_VERSION,
  type TemplateImportConfirmationV1,
} from "./templateImportWizard";

export const TEMPLATE_RUNTIME_SUPPORT_REPORT_SCHEMA_VERSION =
  "template-runtime-support-report-v1" as const;
export const TEMPLATE_IMPORT_COMPATIBILITY_REPORT_SCHEMA_VERSION =
  "template-import-compatibility-report-v1" as const;

export type TemplateCompatibilityStatus = "ready" | "warning" | "blocked";

export type TemplateRuntimeCapabilityId =
  | "array-buffer"
  | "blob"
  | "file"
  | "text-decoder"
  | "structured-clone"
  | "crypto-subtle"
  | "dynamic-code"
  | "dom"
  | "svg"
  | "image-decode"
  | "font-face"
  | "font-face-set"
  | "indexeddb"
  | "object-url"
  | "data-url-image"
  | "blob-url-image"
  | "inline-style"
  | "canvas"
  | "png-capture";

export interface TemplateCompatibilityIssueV1 {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  capabilityId?: TemplateRuntimeCapabilityId;
  requirementId?: string;
  details?: Record<string, unknown>;
}

export interface TemplateRuntimeCapabilityV1 {
  id: TemplateRuntimeCapabilityId;
  required: boolean;
  available: boolean;
  status: TemplateCompatibilityStatus;
  message: string;
}

export interface TemplateRuntimeSupportRequirementsV1 {
  persistence?: "indexeddb" | "injected" | "none";
  managedFonts?: boolean;
  renderValidation?: boolean;
  pngCapture?: boolean;
}

export interface TemplateRuntimeSupportReportV1 {
  schemaVersion: typeof TEMPLATE_RUNTIME_SUPPORT_REPORT_SCHEMA_VERSION;
  status: TemplateCompatibilityStatus;
  supported: boolean;
  requirements: Required<TemplateRuntimeSupportRequirementsV1>;
  capabilities: TemplateRuntimeCapabilityV1[];
  issues: TemplateCompatibilityIssueV1[];
}

export interface TemplateImportFontCompatibilityV1 {
  requirementId: string;
  status: TemplateCompatibilityStatus;
  managedFontId?: string;
  binaryHash?: string;
  localBinaryAvailable: boolean;
  message: string;
}

export interface TemplateImportConfirmationCompatibilityReportV1 {
  schemaVersion: typeof TEMPLATE_IMPORT_COMPATIBILITY_REPORT_SCHEMA_VERSION;
  status: TemplateCompatibilityStatus;
  loadable: boolean;
  producerSdkVersion: string | null;
  consumerSdkVersion: typeof TEMPLATE_SDK_VERSION;
  confirmationSchemaVersion: string | null;
  packageIdentityMatches: boolean;
  importedPackageValidation: TemplatePackageValidationResult | null;
  packageValidation: TemplatePackageValidationResult | null;
  fieldValidation: PackageFieldRulesValidationReportV1 | null;
  fingerprint: {
    expected: string | null;
    actual: string | null;
    matches: boolean;
  };
  digest: {
    status: "verified" | "legacy-missing" | "mismatch" | "unsupported";
    expected: string | null;
    actual: string | null;
  };
  fonts: TemplateImportFontCompatibilityV1[];
  issues: TemplateCompatibilityIssueV1[];
}

export interface TemplateImportConfirmationInspectionOptionsV1 {
  fontRegistry?: ManagedFontRegistry | null;
}

export interface TemplateImportConfirmationLoadOptionsV1
  extends TemplateImportConfirmationInspectionOptionsV1 {
  expectedRevision?: number;
}

export interface TemplateImportConfirmationLoadResultV1 {
  applied: boolean;
  stale: boolean;
  inspection: TemplateImportConfirmationCompatibilityReportV1;
  sessionResult: TemplateSessionLoadStateResultV1 | null;
}

function reportStatus(
  values: readonly TemplateCompatibilityStatus[],
): TemplateCompatibilityStatus {
  if (values.includes("blocked")) return "blocked";
  if (values.includes("warning")) return "warning";
  return "ready";
}

function capability(
  id: TemplateRuntimeCapabilityId,
  required: boolean,
  available: boolean,
  availableMessage: string,
  unavailableMessage: string,
): TemplateRuntimeCapabilityV1 {
  return {
    id,
    required,
    available,
    status: available || !required ? "ready" : "blocked",
    message: available ? availableMessage : unavailableMessage,
  };
}

function capabilityIssues(
  capabilities: readonly TemplateRuntimeCapabilityV1[],
): TemplateCompatibilityIssueV1[] {
  return capabilities
    .filter((item) => !item.available && item.required)
    .map((item) => ({
      code: `runtime.${item.id}.unavailable`,
      severity: "error" as const,
      message: item.message,
      capabilityId: item.id,
    }));
}

const onePixelGif = new Uint8Array([
  71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255, 255,
  33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1,
  0, 59,
]);
const onePixelGifDataUrl =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

async function probeImageSource(source: string): Promise<boolean> {
  if (typeof Image === "undefined") return false;
  return await new Promise<boolean>((resolve) => {
    const image = new Image();
    const timeout = globalThis.setTimeout(() => resolve(false), 1500);
    image.onload = () => {
      globalThis.clearTimeout(timeout);
      resolve(true);
    };
    image.onerror = () => {
      globalThis.clearTimeout(timeout);
      resolve(false);
    };
    image.src = source;
  });
}

async function probeIndexedDb(): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  const databaseName = `__sleinity_template_runtime_probe__${Date.now()}`;
  try {
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (value: boolean) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const timeout = globalThis.setTimeout(() => finish(false), 2000);
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("probe");
      };
      request.onerror = () => {
        globalThis.clearTimeout(timeout);
        finish(false);
      };
      request.onblocked = () => {
        globalThis.clearTimeout(timeout);
        finish(false);
      };
      request.onsuccess = () => {
        request.result.close();
        const deletion = indexedDB.deleteDatabase(databaseName);
        deletion.onerror = deletion.onblocked = () => {
          globalThis.clearTimeout(timeout);
          finish(false);
        };
        deletion.onsuccess = () => {
          globalThis.clearTimeout(timeout);
          finish(true);
        };
      };
    });
  } catch {
    return false;
  }
}

function probeInlineStyle(): boolean {
  if (typeof document === "undefined" || typeof getComputedStyle === "undefined") {
    return false;
  }
  const element = document.createElement("div");
  element.style.position = "fixed";
  element.style.left = "7px";
  element.style.visibility = "hidden";
  document.body?.append(element);
  const applied = getComputedStyle(element).left === "7px";
  element.remove();
  return applied;
}

function probeCanvas(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/png").startsWith("data:image/png");
  } catch {
    return false;
  }
}

function probeDynamicCode(): boolean {
  try {
    return Function("return true")() === true;
  } catch {
    return false;
  }
}

export async function inspectTemplateRuntimeSupport(
  requested: TemplateRuntimeSupportRequirementsV1 = {},
): Promise<TemplateRuntimeSupportReportV1> {
  const requirements: Required<TemplateRuntimeSupportRequirementsV1> = {
    persistence: requested.persistence ?? "indexeddb",
    managedFonts: requested.managedFonts ?? true,
    renderValidation: requested.renderValidation ?? true,
    pngCapture: requested.pngCapture ?? false,
  };
  const needsDom =
    requirements.renderValidation ||
    requirements.managedFonts ||
    requirements.pngCapture;
  const needsImages = requirements.renderValidation || requirements.pngCapture;
  const needsObjectUrls =
    requirements.managedFonts ||
    requirements.renderValidation ||
    requirements.pngCapture;

  const hasDom = typeof document !== "undefined";
  const hasObjectUrl =
    typeof URL !== "undefined" &&
    typeof URL.createObjectURL === "function" &&
    typeof URL.revokeObjectURL === "function";
  const dataUrlImage = needsImages
    ? await probeImageSource(onePixelGifDataUrl)
    : true;
  let blobUrlImage = !needsImages;
  if (needsImages && typeof Blob !== "undefined" && hasObjectUrl) {
    const url = URL.createObjectURL(
      new Blob([onePixelGif], { type: "image/gif" }),
    );
    try {
      blobUrlImage = await probeImageSource(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const indexedDbAvailable =
    requirements.persistence === "indexeddb" ? await probeIndexedDb() : true;
  const canvasAvailable = needsImages ? probeCanvas() : true;
  const inlineStyleAvailable = needsDom ? probeInlineStyle() : true;

  const capabilities: TemplateRuntimeCapabilityV1[] = [
    capability(
      "array-buffer",
      true,
      typeof ArrayBuffer !== "undefined",
      "ArrayBuffer is available.",
      "ArrayBuffer is required for TemplatePackage ZIP bytes.",
    ),
    capability(
      "blob",
      needsDom,
      typeof Blob !== "undefined",
      "Blob is available.",
      "Blob is required for browser assets, fonts, and capture.",
    ),
    capability(
      "file",
      false,
      typeof File !== "undefined",
      "File is available for the default picker.",
      "File is unavailable; headless hosts may still supply ArrayBuffer bytes.",
    ),
    capability(
      "text-decoder",
      true,
      typeof TextDecoder !== "undefined",
      "TextDecoder is available.",
      "TextDecoder is required for package parsing.",
    ),
    capability(
      "structured-clone",
      true,
      typeof structuredClone === "function",
      "structuredClone is available.",
      "structuredClone is required for isolated session state.",
    ),
    capability(
      "crypto-subtle",
      true,
      Boolean(globalThis.crypto?.subtle),
      "Web Crypto SHA-256 is available.",
      "Web Crypto SubtleCrypto is required for content identity and managed assets.",
    ),
    capability(
      "dynamic-code",
      true,
      probeDynamicCode(),
      "Runtime schema compilation is permitted.",
      "Dynamic code evaluation is blocked; the current canonical validator requires CSP script-src 'unsafe-eval'.",
    ),
    capability(
      "dom",
      needsDom,
      hasDom,
      "The DOM is available.",
      "A DOM is required for render validation, managed fonts, and capture.",
    ),
    capability(
      "svg",
      requirements.renderValidation,
      hasDom && typeof document.createElementNS === "function",
      "SVG creation is available.",
      "SVG support is required for faithful browser rendering.",
    ),
    capability(
      "image-decode",
      needsImages,
      typeof Image !== "undefined",
      "Browser image decoding is available.",
      "Browser image decoding is required for rendering and capture.",
    ),
    capability(
      "font-face",
      requirements.managedFonts,
      typeof FontFace !== "undefined",
      "FontFace is available.",
      "FontFace is required for exact managed-font activation.",
    ),
    capability(
      "font-face-set",
      requirements.managedFonts,
      Boolean(hasDom && document.fonts),
      "document.fonts is available.",
      "document.fonts is required for exact font readiness.",
    ),
    capability(
      "indexeddb",
      requirements.persistence === "indexeddb",
      indexedDbAvailable,
      requirements.persistence === "indexeddb"
        ? "IndexedDB can be opened and cleaned up."
        : "IndexedDB is not required by the selected persistence mode.",
      "IndexedDB is unavailable or blocked for the default persistence adapters.",
    ),
    capability(
      "object-url",
      needsObjectUrls,
      hasObjectUrl,
      "Blob object URLs are available.",
      "Blob object URLs are required for managed browser assets and fonts.",
    ),
    capability(
      "data-url-image",
      needsImages,
      dataUrlImage,
      "A local data URL image decoded successfully.",
      "A data URL image was blocked or could not be decoded; inspect the host CSP.",
    ),
    capability(
      "blob-url-image",
      needsImages,
      blobUrlImage,
      "A local blob URL image decoded successfully.",
      "A blob URL image was blocked or could not be decoded; inspect the host CSP.",
    ),
    capability(
      "inline-style",
      needsDom,
      inlineStyleAvailable,
      "Element styles are applied in the host document.",
      "Inline element styles are blocked or unavailable; inspect the host CSP.",
    ),
    capability(
      "canvas",
      needsImages,
      canvasAvailable,
      "Canvas PNG serialization is available.",
      "Canvas PNG serialization is unavailable.",
    ),
  ];
  const captureDependenciesReady = [
    dataUrlImage,
    blobUrlImage,
    inlineStyleAvailable,
    canvasAvailable,
    hasDom,
  ].every(Boolean);
  capabilities.push(
    capability(
      "png-capture",
      requirements.pngCapture,
      !requirements.pngCapture || captureDependenciesReady,
      requirements.pngCapture
        ? "The local capture prerequisites are available."
        : "PNG capture was not requested.",
      "One or more PNG capture prerequisites are unavailable.",
    ),
  );
  const issues = capabilityIssues(capabilities);
  const status = reportStatus(capabilities.map((item) => item.status));
  return {
    schemaVersion: TEMPLATE_RUNTIME_SUPPORT_REPORT_SCHEMA_VERSION,
    status,
    supported: status !== "blocked",
    requirements,
    capabilities,
    issues,
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function semverParts(value: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/u.exec(value);
  return match
    ? [Number(match[1]), Number(match[2]), Number(match[3])]
    : null;
}

function compareSemver(left: string, right: string): number | null {
  const leftParts = semverParts(left);
  const rightParts = semverParts(right);
  if (!leftParts || !rightParts) return null;
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] < rightParts[index] ? -1 : 1;
    }
  }
  return 0;
}

function validationIssues(
  side: "imported" | "working",
  validation: TemplatePackageValidationResult,
): TemplateCompatibilityIssueV1[] {
  if (validation.valid) return [];
  return [{
    code: `confirmation.${side}-package-invalid`,
    severity: "error",
    message: `The ${side} package no longer passes canonical validation.`,
    details: {
      diagnostics: validation.diagnostics,
    },
  }];
}

async function inspectFonts(
  packageValue: TemplatePackageV1,
  registry: ManagedFontRegistry | null,
): Promise<{
  fonts: TemplateImportFontCompatibilityV1[];
  issues: TemplateCompatibilityIssueV1[];
}> {
  const fonts: TemplateImportFontCompatibilityV1[] = [];
  const issues: TemplateCompatibilityIssueV1[] = [];
  for (const requirement of packageValue.fontRequirements ?? []) {
    const resolution = requirement.resolution;
    const asset = requirement.assetId
      ? packageValue.assets[requirement.assetId]
      : undefined;
    if (!isExactFontRequirementResolved(packageValue, requirement)) {
      const message =
        `Font requirement "${requirement.family}" is not an exact confirmed face.`;
      fonts.push({
        requirementId: requirement.id,
        status: "blocked",
        managedFontId: resolution?.managedFontId,
        binaryHash: resolution?.binaryHash,
        localBinaryAvailable: false,
        message,
      });
      issues.push({
        code: "confirmation.font-resolution-invalid",
        severity: "error",
        message,
        requirementId: requirement.id,
      });
      continue;
    }
    if (
      asset?.source === "embedded" &&
      Boolean(asset.data || asset.dataUrl)
    ) {
      fonts.push({
        requirementId: requirement.id,
        status: "ready",
        managedFontId: resolution?.managedFontId,
        binaryHash: resolution?.binaryHash,
        localBinaryAvailable: true,
        message: "The exact font binary is embedded in the package.",
      });
      continue;
    }
    const managedFontId = resolution?.managedFontId;
    const binaryHash = resolution?.binaryHash;
    if (!registry || !managedFontId || !binaryHash) {
      const message =
        `The exact font metadata is valid, but its browser-local binary is unavailable.`;
      fonts.push({
        requirementId: requirement.id,
        status: "warning",
        managedFontId,
        binaryHash,
        localBinaryAvailable: false,
        message,
      });
      issues.push({
        code: "confirmation.font-binary-unavailable",
        severity: "warning",
        message,
        requirementId: requirement.id,
      });
      continue;
    }
    try {
      const [font, blob] = await Promise.all([
        registry.getManagedFont(managedFontId),
        registry.getFontBlob(binaryHash),
      ]);
      const available =
        Boolean(blob) &&
        font?.assetHash === binaryHash &&
        managedFontExactlyMatchesRequirement(requirement, font);
      const message = available
        ? "The exact browser-local managed font is available."
        : "The recorded exact font binary is missing or no longer verifies.";
      fonts.push({
        requirementId: requirement.id,
        status: available ? "ready" : "warning",
        managedFontId,
        binaryHash,
        localBinaryAvailable: available,
        message,
      });
      if (!available) {
        issues.push({
          code: "confirmation.font-binary-unavailable",
          severity: "warning",
          message,
          requirementId: requirement.id,
        });
      }
    } catch (error) {
      const message =
        "The managed-font registry could not verify the recorded exact font.";
      fonts.push({
        requirementId: requirement.id,
        status: "warning",
        managedFontId,
        binaryHash,
        localBinaryAvailable: false,
        message,
      });
      issues.push({
        code: "confirmation.font-registry-unavailable",
        severity: "warning",
        message,
        requirementId: requirement.id,
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
  return { fonts, issues };
}

export async function inspectTemplateImportConfirmation(
  confirmationValue: unknown,
  options: TemplateImportConfirmationInspectionOptionsV1 = {},
): Promise<TemplateImportConfirmationCompatibilityReportV1> {
  const issues: TemplateCompatibilityIssueV1[] = [];
  const confirmation = record(confirmationValue);
  const confirmationSchemaVersion =
    typeof confirmation?.schemaVersion === "string"
      ? confirmation.schemaVersion
      : null;
  const producerSdkVersion =
    typeof confirmation?.sdkVersion === "string"
      ? confirmation.sdkVersion
      : null;
  if (
    confirmationSchemaVersion !== TEMPLATE_IMPORT_CONFIRMATION_SCHEMA_VERSION
  ) {
    issues.push({
      code: "confirmation.schema-unsupported",
      severity: "error",
      message: "The template confirmation schema is unsupported.",
      details: {
        received: confirmationSchemaVersion,
        supported: TEMPLATE_IMPORT_CONFIRMATION_SCHEMA_VERSION,
      },
    });
  }
  const versionComparison = producerSdkVersion
    ? compareSemver(producerSdkVersion, TEMPLATE_SDK_VERSION)
    : null;
  if (!producerSdkVersion || versionComparison === null) {
    issues.push({
      code: "confirmation.sdk-version-invalid",
      severity: "warning",
      message: "The producing SDK version is missing or invalid.",
    });
  } else if (versionComparison > 0) {
    issues.push({
      code: "confirmation.sdk-version-newer",
      severity: "warning",
      message:
        "The confirmation was produced by a newer SDK; supported schemas are revalidated before loading.",
      details: {
        producerSdkVersion,
        consumerSdkVersion: TEMPLATE_SDK_VERSION,
      },
    });
  }

  const importedPackageRecord = record(confirmation?.importedPackage);
  const packageRecord = record(confirmation?.packageValue);
  let importedPackageValidation: TemplatePackageValidationResult | null = null;
  let packageValidation: TemplatePackageValidationResult | null = null;
  let importedPackage: TemplatePackageV1 | null = null;
  let packageValue: TemplatePackageV1 | null = null;
  if (!importedPackageRecord || !packageRecord) {
    issues.push({
      code: "confirmation.packages-missing",
      severity: "error",
      message:
        "A confirmation must contain both the imported baseline and working package.",
    });
  } else {
    importedPackage = importedPackageRecord as unknown as TemplatePackageV1;
    packageValue = packageRecord as unknown as TemplatePackageV1;
    importedPackageValidation = validateTemplatePackage(importedPackage);
    packageValidation = validateTemplatePackage(packageValue);
    issues.push(...validationIssues("imported", importedPackageValidation));
    issues.push(...validationIssues("working", packageValidation));
  }

  const packageIdentityMatches =
    Boolean(importedPackage && packageValue) &&
    importedPackage?.packageId === packageValue?.packageId;
  if (importedPackage && packageValue && !packageIdentityMatches) {
    issues.push({
      code: "confirmation.package-identity-mismatch",
      severity: "error",
      message:
        "The imported baseline and working package have different package identities.",
      details: {
        importedPackageId: importedPackage.packageId,
        workingPackageId: packageValue.packageId,
      },
    });
  }

  const expectedFingerprint =
    typeof confirmation?.packageFingerprint === "string"
      ? confirmation.packageFingerprint
      : null;
  const actualFingerprint = packageValue
    ? createTemplatePackageFingerprint(packageValue)
    : null;
  const fingerprintMatches =
    Boolean(expectedFingerprint && actualFingerprint) &&
    expectedFingerprint === actualFingerprint;
  if (!fingerprintMatches) {
    issues.push({
      code: "confirmation.fingerprint-mismatch",
      severity: "error",
      message: "The working package fingerprint does not match its confirmation.",
      details: {
        expected: expectedFingerprint,
        actual: actualFingerprint,
      },
    });
  }

  const digestRecord = record(confirmation?.packageDigest);
  let digestStatus:
    | "verified"
    | "legacy-missing"
    | "mismatch"
    | "unsupported" = "legacy-missing";
  let expectedDigest: string | null = null;
  let actualDigest: string | null = null;
  if (!digestRecord) {
    const producerComparedToDigestContract = producerSdkVersion
      ? compareSemver(producerSdkVersion, "0.4.0")
      : null;
    const digestRequired =
      producerComparedToDigestContract !== null &&
      producerComparedToDigestContract >= 0;
    issues.push({
      code: digestRequired
        ? "confirmation.digest-required"
        : "confirmation.digest-missing",
      severity: digestRequired ? "error" : "warning",
      message: digestRequired
        ? "This SDK version requires a SHA-256 package digest, but the confirmation does not contain one."
        : "This legacy confirmation has no SHA-256 package digest; its package is still freshly validated.",
    });
  } else if (
    digestRecord.schemaVersion !== TEMPLATE_PACKAGE_DIGEST_SCHEMA_VERSION ||
    digestRecord.algorithm !== "sha-256" ||
    typeof digestRecord.value !== "string"
  ) {
    digestStatus = "unsupported";
    issues.push({
      code: "confirmation.digest-unsupported",
      severity: "error",
      message: "The confirmation uses an unsupported package digest contract.",
    });
  } else if (packageValue) {
    expectedDigest = digestRecord.value;
    try {
      actualDigest = (await createTemplatePackageDigest(packageValue)).value;
      digestStatus = expectedDigest === actualDigest ? "verified" : "mismatch";
    } catch (error) {
      digestStatus = "unsupported";
      issues.push({
        code: "confirmation.digest-unavailable",
        severity: "error",
        message: "The package SHA-256 digest could not be verified in this runtime.",
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
    if (digestStatus === "mismatch") {
      issues.push({
        code: "confirmation.digest-mismatch",
        severity: "error",
        message: "The working package SHA-256 digest does not match its confirmation.",
        details: {
          expected: expectedDigest,
          actual: actualDigest,
        },
      });
    }
  }

  const registry = Object.prototype.hasOwnProperty.call(options, "fontRegistry")
    ? options.fontRegistry ?? null
    : getManagedFontRegistry();
  const fontInspection = packageValue
    ? await inspectFonts(packageValue, registry)
    : { fonts: [], issues: [] };
  issues.push(...fontInspection.issues);

  const fieldValidation = packageValue
    ? validatePackageEditableFieldRules(packageValue.editableFields ?? [])
    : null;
  for (const blocker of fieldValidation?.blockers ?? []) {
    issues.push({
      code: `confirmation.${blocker.code}`,
      severity: "error",
      message: blocker.message,
      details: {
        fieldId: blocker.fieldId,
        property: blocker.property,
      },
    });
  }
  for (const warning of fieldValidation?.warnings ?? []) {
    issues.push({
      code: `confirmation.${warning.code}`,
      severity: "warning",
      message: warning.message,
      details: {
        fieldId: warning.fieldId,
        property: warning.property,
      },
    });
  }

  const status = reportStatus(
    issues.map((issue) =>
      issue.severity === "error"
        ? "blocked"
        : issue.severity === "warning"
          ? "warning"
          : "ready"),
  );
  return {
    schemaVersion: TEMPLATE_IMPORT_COMPATIBILITY_REPORT_SCHEMA_VERSION,
    status,
    loadable: status !== "blocked",
    producerSdkVersion,
    consumerSdkVersion: TEMPLATE_SDK_VERSION,
    confirmationSchemaVersion,
    packageIdentityMatches,
    importedPackageValidation,
    packageValidation,
    fieldValidation,
    fingerprint: {
      expected: expectedFingerprint,
      actual: actualFingerprint,
      matches: fingerprintMatches,
    },
    digest: {
      status: digestStatus,
      expected: expectedDigest,
      actual: actualDigest,
    },
    fonts: fontInspection.fonts,
    issues,
  };
}

export async function loadTemplateImportConfirmation(
  session: TemplateSessionV1,
  confirmationValue: unknown,
  options: TemplateImportConfirmationLoadOptionsV1 = {},
): Promise<TemplateImportConfirmationLoadResultV1> {
  const expectedRevision =
    options.expectedRevision ?? session.getSnapshot().revision;
  const inspection = await inspectTemplateImportConfirmation(
    confirmationValue,
    options,
  );
  if (!inspection.loadable) {
    return {
      applied: false,
      stale: false,
      inspection,
      sessionResult: null,
    };
  }
  const confirmation = confirmationValue as TemplateImportConfirmationV1;
  const sessionResult = session.loadTemplateState({
    importedPackage: confirmation.importedPackage,
    packageValue: confirmation.packageValue,
    source: {
      type: "package-zip",
      sourceName: confirmation.sourceName,
    },
    expectedRevision,
  });
  return {
    applied: sessionResult.applied,
    stale: sessionResult.stale,
    inspection,
    sessionResult,
  };
}

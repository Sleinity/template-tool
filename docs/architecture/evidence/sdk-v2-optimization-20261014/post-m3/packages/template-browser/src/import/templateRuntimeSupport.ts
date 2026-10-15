/** Runtime probes shared by V2 hosts; no confirmation/session imports. */
export const TEMPLATE_RUNTIME_SUPPORT_REPORT_SCHEMA_VERSION =
  "template-runtime-support-report-v1" as const;

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
  const cssManagedFontActivationAvailable = Boolean(
    hasDom &&
    document.head &&
    document.body &&
    typeof document.createElement === "function" &&
    typeof requestAnimationFrame === "function",
  );

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
      typeof FontFace !== "undefined" || cssManagedFontActivationAvailable,
      typeof FontFace !== "undefined"
        ? "FontFace is available."
        : "Exact CSS font activation and metric verification are available.",
      "FontFace or exact CSS font activation is required for managed fonts.",
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


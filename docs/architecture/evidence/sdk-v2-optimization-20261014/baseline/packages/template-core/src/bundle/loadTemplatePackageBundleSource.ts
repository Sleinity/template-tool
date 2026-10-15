import {
  parseTemplatePackage,
  type ParseTemplatePackageResult,
} from "../parseTemplatePackage";
import type {
  PackageDiagnostic,
  TemplatePackageValidationResult,
} from "../packageDiagnostics";
import { linkPackageMotionValue } from "../motion";
import type {
  EditableFieldBinding,
  RendererHint,
  TemplateNode,
  TemplatePackageFontRequirement,
  TemplatePackageV1,
} from "../types";
import { validateTemplatePackage } from "../validateTemplatePackage";
import {
  loadBundleAssetRegistry,
  type BundleAssetRegistryResult,
} from "./assetManifestAdapter";
import {
  BundleAssetRegistry,
  type BundleAssetResolution,
  type TemplateAssetBridge,
} from "./assetRegistry";
import {
  normalizeTemplatePackageBundleTemplate,
  type BundledFigmaSource,
  type BundleTemplateCompatibilityData,
} from "./normalizeTemplatePackageBundle";
import { validateTemplatePackageBundleSource } from "./sourceContract";
import {
  createPackagePreviewReference,
  type PackagePreviewReference,
} from "./previewReference";
import type {
  TemplatePackageBundle,
  TemplatePackageBundleDiagnostic,
  TemplatePackageBundleFile,
} from "./types";
import type { ZipBundleReader } from "./zipBundleReader";

export interface LoadedTemplatePackageSourceFileReference {
  role:
    | "template"
    | "asset-manifest"
    | "motion"
    | "mcp"
    | "preview"
    | "asset";
  exists: boolean;
  path: string;
  normalizedPath: string;
  byteSize?: number;
}

export interface LoadedTemplatePackageSourceFiles {
  template: LoadedTemplatePackageSourceFileReference;
  assetManifest?: LoadedTemplatePackageSourceFileReference;
  motion?: LoadedTemplatePackageSourceFileReference;
  mcp?: LoadedTemplatePackageSourceFileReference;
  preview?: LoadedTemplatePackageSourceFileReference;
  assets: LoadedTemplatePackageSourceFileReference[];
}

export interface LoadedTemplatePackageSource {
  sourceKind: "package-zip";
  sourceName: string;
  bundle?: TemplatePackageBundle;
  reader?: ZipBundleReader;
  packageFileIndex?: TemplatePackageBundle["index"] | null;
  sourceFiles: LoadedTemplatePackageSourceFiles;
  packageValue: TemplatePackageV1 | null;
  originalPackageValue: TemplatePackageV1 | null;
  rawTemplateJson: unknown | null;
  normalizedTemplateJson: unknown | null;
  parseResult: ParseTemplatePackageResult | null;
  validation: TemplatePackageValidationResult | null;
  packageDiagnostics: PackageDiagnostic[];
  assetRegistry: BundleAssetRegistry;
  assetManifest: BundleAssetRegistryResult["manifest"];
  assetResolutions: BundleAssetResolution[];
  nodes: Record<string, TemplateNode>;
  rootNode: TemplateNode | null;
  editableFields: EditableFieldBinding[];
  fonts: TemplatePackageFontRequirement[];
  tokens?: unknown;
  renderHints?: unknown;
  rendererHints: Record<string, RendererHint>;
  motionData?: unknown;
  mcp?: unknown;
  figmaSource?: BundledFigmaSource;
  preview?: PackagePreviewReference;
  compatibility: BundleTemplateCompatibilityData;
  diagnostics: TemplatePackageBundleDiagnostic[];
  valid: boolean;
}

function diagnostic(
  code: string,
  severity: TemplatePackageBundleDiagnostic["severity"],
  category: TemplatePackageBundleDiagnostic["category"],
  message: string,
  input: {
    path?: string;
    ref?: string;
    assetId?: string;
    sourceNodeId?: string;
    details?: Record<string, unknown>;
  } = {},
): TemplatePackageBundleDiagnostic {
  return { code, severity, category, message, ...input };
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function sourceFileReference(
  file: TemplatePackageBundleFile,
  role: LoadedTemplatePackageSourceFileReference["role"] =
    file.role === "unknown" ? "asset" : file.role,
): LoadedTemplatePackageSourceFileReference {
  return {
    role,
    exists: true,
    path: file.path,
    normalizedPath: file.normalizedPath,
    byteSize: file.uncompressedSize,
  };
}

function zipSourceFiles(
  bundle: TemplatePackageBundle,
  motionPath = "motion.json",
): LoadedTemplatePackageSourceFiles {
  const template = bundle.index.required["template.json"];
  const motionFile =
    motionPath === "motion.json"
      ? bundle.index.optional["motion.json"]
      : bundle.index.files[motionPath];
  return {
    template: template
      ? sourceFileReference(template)
      : {
          role: "template",
          exists: false,
          path: "template.json",
          normalizedPath: "template.json",
        },
    assetManifest: bundle.index.required["assets.json"]
      ? sourceFileReference(bundle.index.required["assets.json"])
      : undefined,
    motion: motionFile
      ? sourceFileReference(motionFile, "motion")
      : undefined,
    mcp: bundle.index.optional["mcp.json"]
      ? sourceFileReference(bundle.index.optional["mcp.json"])
      : undefined,
    preview: bundle.index.optional["preview.png"]
      ? sourceFileReference(bundle.index.optional["preview.png"])
      : undefined,
    assets: bundle.index.assets.map((file) => sourceFileReference(file)),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseJsonText(
  text: string,
  path: string,
  errorCode: string,
  category: TemplatePackageBundleDiagnostic["category"],
): {
  value: unknown | null;
  diagnostics: TemplatePackageBundleDiagnostic[];
} {
  try {
    return { value: JSON.parse(text), diagnostics: [] };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown JSON parse error.";
    return {
      value: null,
      diagnostics: [
        diagnostic(
          errorCode,
          category === "package" ? "error" : "warning",
          category,
          `${path} is not valid JSON: ${message}`,
          { path },
        ),
      ],
    };
  }
}

function readRequiredJson(
  reader: ZipBundleReader,
  path: string,
  readErrorCode: string,
  parseErrorCode: string,
  category: TemplatePackageBundleDiagnostic["category"],
): {
  value: unknown | null;
  diagnostics: TemplatePackageBundleDiagnostic[];
} {
  const text = reader.readText(path);
  if (!text.ok || text.value === undefined) {
    return {
      value: null,
      diagnostics: [
        diagnostic(
          readErrorCode,
          "error",
          category,
          `${path} could not be read from the ZIP bundle.`,
          { path, details: { diagnostics: text.diagnostics } },
        ),
      ],
    };
  }
  const parsed = parseJsonText(text.value, path, parseErrorCode, category);
  return {
    value: parsed.value,
    diagnostics: [...text.diagnostics, ...parsed.diagnostics],
  };
}

function readOptionalJson(
  reader: ZipBundleReader,
  path: string,
  readErrorCode: string,
  parseErrorCode: string,
  category: "motion" | "mcp",
): {
  value: unknown | undefined;
  diagnostics: TemplatePackageBundleDiagnostic[];
} {
  const file =
    path === "motion.json" || path === "mcp.json"
      ? reader.bundle.index.optional[path]
      : reader.bundle.index.files[path];
  if (!file) return { value: undefined, diagnostics: [] };

  const text = reader.readText(path);
  if (!text.ok || text.value === undefined) {
    return {
      value: undefined,
      diagnostics: [
        diagnostic(
          readErrorCode,
          "warning",
          category,
          `${path} is present but could not be read from the ZIP bundle.`,
          { path, details: { diagnostics: text.diagnostics } },
        ),
      ],
    };
  }

  const parsed = parseJsonText(text.value, path, parseErrorCode, category);
  return {
    value: parsed.value ?? undefined,
    diagnostics: [...text.diagnostics, ...parsed.diagnostics],
  };
}

function referencedMotionFile(rawTemplateJson: unknown): string | null {
  if (!isRecord(rawTemplateJson)) return null;
  if (isRecord(rawTemplateJson.motion)) {
    const file = rawTemplateJson.motion.file;
    if (typeof file === "string" && file.length > 0) return file;
  }
  if (isRecord(rawTemplateJson.source)) {
    const file = rawTemplateJson.source.motionFile;
    if (typeof file === "string" && file.length > 0) return file;
    if (rawTemplateJson.source.hasMotion === true) return "motion.json";
  }
  return null;
}

function collectTemplateAssetRefs(packageValue: TemplatePackageV1): string[] {
  const refs = new Set<string>();
  Object.keys(packageValue.assets).forEach((assetId) => refs.add(assetId));
  Object.values(packageValue.nodes).forEach((node) => {
    if (node.image?.assetId) refs.add(node.image.assetId);
    if (node.vector?.assetId) refs.add(node.vector.assetId);
    node.appearance.fills.forEach((fill) => {
      if (fill.type === "IMAGE" && fill.assetId) refs.add(fill.assetId);
    });
    node.appearance.strokes.forEach((stroke) => {
      const paint = "paint" in stroke ? stroke.paint : stroke;
      if (paint.type === "IMAGE" && paint.assetId) refs.add(paint.assetId);
    });
  });
  packageValue.editableFields.forEach((field) => {
    if (field.type !== "image") return;
    if (typeof field.defaultValue === "string" && field.defaultValue.length > 0) {
      refs.add(field.defaultValue);
    }
    if (field.assetRef) refs.add(field.assetRef);
    if (field.typedRef) refs.add(field.typedRef);
  });
  if (packageValue.referencePreview?.assetId) refs.add(packageValue.referencePreview.assetId);
  return Array.from(refs);
}

function accessors(
  packageValue: TemplatePackageV1 | null,
  compatibility: BundleTemplateCompatibilityData,
): Pick<
  LoadedTemplatePackageSource,
  | "nodes"
  | "rootNode"
  | "editableFields"
  | "fonts"
  | "tokens"
  | "renderHints"
  | "rendererHints"
> {
  return {
    nodes: packageValue?.nodes ?? {},
    rootNode: packageValue ? packageValue.nodes[packageValue.rootNodeId] ?? null : null,
    editableFields: packageValue?.editableFields ?? [],
    fonts: packageValue?.fontRequirements ?? [],
    tokens: compatibility.tokens,
    renderHints: compatibility.renderHints,
    rendererHints: packageValue?.rendererHints ?? {},
  };
}

export function loadTemplatePackageBundleSource(
  reader: ZipBundleReader,
): LoadedTemplatePackageSource {
  const diagnostics: TemplatePackageBundleDiagnostic[] = [...reader.bundle.diagnostics];
  const sourceName = reader.bundle.sourceName ?? "template-package.zip";

  const template = readRequiredJson(
    reader,
    "template.json",
    "TEMPLATE_JSON_READ_ERROR",
    "TEMPLATE_JSON_PARSE_ERROR",
    "package",
  );
  diagnostics.push(...template.diagnostics);

  const missingAssetManifestIsEmpty = (() => {
    if (!isRecord(template.value) || !isRecord(template.value.assets)) return false;
    if (Object.keys(template.value.assets).length > 0 || reader.bundle.index.assets.length > 0) {
      return false;
    }
    const nodes = isRecord(template.value.nodes) ? Object.values(template.value.nodes) : [];
    const paintAssetId = (paint: unknown): string | null => {
      if (!isRecord(paint)) return null;
      const value = isRecord(paint.paint) ? paint.paint : paint;
      return value.type === "IMAGE" && typeof value.assetId === "string" && value.assetId.length > 0
        ? value.assetId
        : null;
    };
    const hasNodeReference = nodes.some((value) => {
      if (!isRecord(value)) return false;
      const image = isRecord(value.image) ? value.image : null;
      const vector = isRecord(value.vector) ? value.vector : null;
      const appearance = isRecord(value.appearance) ? value.appearance : null;
      const paints = [
        ...(Array.isArray(appearance?.fills) ? appearance.fills : []),
        ...(Array.isArray(appearance?.strokes) ? appearance.strokes : []),
      ];
      return Boolean(
        (typeof image?.assetId === "string" && image.assetId.length > 0) ||
        (typeof vector?.assetId === "string" && vector.assetId.length > 0) ||
        paints.some((paint) => paintAssetId(paint)),
      );
    });
    if (hasNodeReference) return false;
    const fields = Array.isArray(template.value.editableFields)
      ? template.value.editableFields
      : [];
    if (fields.some((field) => {
      if (!isRecord(field) || field.type !== "image") return false;
      return [field.defaultValue, field.assetRef, field.typedRef].some(
        (reference) => typeof reference === "string" && reference.length > 0,
      );
    })) return false;
    const referencePreview = isRecord(template.value.referencePreview)
      ? template.value.referencePreview
      : null;
    return !(typeof referencePreview?.assetId === "string" && referencePreview.assetId.length > 0);
  })();

  if (missingAssetManifestIsEmpty) {
    for (let index = diagnostics.length - 1; index >= 0; index -= 1) {
      const item = diagnostics[index];
      if (item.code === "bundle.required-file-missing" && item.path === "assets.json") {
        diagnostics.splice(index, 1, {
          ...item,
          code: "bundle.asset-manifest-omitted-empty",
          severity: "info",
          message: "assets.json is omitted and template.json has no asset declarations or references; source normalization will use an empty registry.",
          details: {
            normalizationApplied: true,
            validationStage: "source-normalization",
            visualImpact: "none",
          },
        });
      }
    }
  }

  const motionPath = referencedMotionFile(template.value) ?? "motion.json";
  const motion = readOptionalJson(
    reader,
    motionPath,
    "MOTION_JSON_READ_ERROR",
    "MOTION_JSON_PARSE_ERROR",
    "motion",
  );
  diagnostics.push(...motion.diagnostics);

  const mcp = readOptionalJson(
    reader,
    "mcp.json",
    "MCP_JSON_READ_ERROR",
    "MCP_JSON_PARSE_ERROR",
    "mcp",
  );
  diagnostics.push(...mcp.diagnostics);

  const referencedMotion = referencedMotionFile(template.value);
  if (referencedMotion && !reader.bundle.index.files[referencedMotion]) {
    diagnostics.push(
      diagnostic(
        "MOTION_FILE_REFERENCED_BUT_MISSING",
        "warning",
        "motion",
        `template.json references ${referencedMotion}, but that file is missing from the ZIP bundle.`,
        { path: referencedMotion },
      ),
    );
  }

  const assetRegistryResult = loadBundleAssetRegistry(reader, {
    allowMissingEmpty: missingAssetManifestIsEmpty,
  });
  diagnostics.push(...assetRegistryResult.diagnostics);

  const previewResult = createPackagePreviewReference(reader);
  diagnostics.push(...previewResult.diagnostics);

  let normalizedTemplateJson: unknown | null = null;
  let parseResult: ParseTemplatePackageResult | null = null;
  let packageValue: TemplatePackageV1 | null = null;
  let originalPackageValue: TemplatePackageV1 | null = null;
  let validation: TemplatePackageValidationResult | null = null;
  let packageDiagnostics: PackageDiagnostic[] = [];
  let compatibility: BundleTemplateCompatibilityData = {};
  let assetResolutions: BundleAssetResolution[] = [];

  if (template.value !== null) {
    const sourceContract = validateTemplatePackageBundleSource(template.value);
    diagnostics.push(...sourceContract.diagnostics);
    const normalization = normalizeTemplatePackageBundleTemplate(template.value, {
      motionData: motion.value,
      mcpData: mcp.value,
    });
    normalizedTemplateJson = normalization.normalizedTemplateJson;
    compatibility = normalization.compatibility;
    diagnostics.push(...normalization.diagnostics);

    parseResult = parseTemplatePackage(normalizedTemplateJson);
    packageValue = parseResult.package;
    validation = parseResult.validation;
    packageDiagnostics = parseResult.diagnostics;
    if (packageValue) originalPackageValue = cloneValue(packageValue);

    if (packageValue && motion.value !== undefined) {
      const linkedMotion = linkPackageMotionValue(
        packageValue,
        motion.value,
        motionPath,
      );
      packageValue = linkedMotion.packageValue;
      validation = validateTemplatePackage(packageValue);
      packageDiagnostics = validation.diagnostics;
      parseResult = {
        ...parseResult,
        package: packageValue,
        validation,
        diagnostics: packageDiagnostics,
      };
      originalPackageValue = cloneValue(packageValue);
    }

    if (packageValue) {
      const bridge = packageValue.assets as unknown as TemplateAssetBridge;
      assetResolutions = collectTemplateAssetRefs(packageValue).map((ref) =>
        assetRegistryResult.registry.resolve(ref, bridge),
      );
      assetResolutions.forEach((resolution) => {
        diagnostics.push(...resolution.diagnostics);
      });
    }
  }

  const valid =
    packageValue !== null &&
    !diagnostics.some((item) => item.severity === "error") &&
    (validation?.valid ?? false);

  return {
    sourceKind: "package-zip",
    sourceName,
    bundle: reader.bundle,
    reader,
    packageFileIndex: reader.bundle.index,
    sourceFiles: zipSourceFiles(reader.bundle, motionPath),
    packageValue,
    originalPackageValue,
    rawTemplateJson: template.value,
    normalizedTemplateJson,
    parseResult,
    validation,
    packageDiagnostics,
    assetRegistry: assetRegistryResult.registry,
    assetManifest: assetRegistryResult.manifest,
    assetResolutions,
    ...accessors(packageValue, compatibility),
    motionData: motion.value,
    mcp: mcp.value,
    figmaSource: compatibility.figmaSource,
    preview: previewResult.preview ?? undefined,
    compatibility,
    diagnostics,
    valid,
  };
}

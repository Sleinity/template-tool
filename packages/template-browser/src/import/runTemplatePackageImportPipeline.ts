import {
  createIndexedDbAssetStore,
  type ResolvedPackageAsset,
  type AssetStorageAdapter,
} from "../assets";
import {
  createZipBundleReader,
  loadTemplatePackageBundleSource,
  packageWithEffectiveEditableFields,
  validateTemplatePackage,
  type LoadedTemplatePackageSource,
  type PackageDiagnostic,
  type TemplatePackageBundleDiagnostic,
  type TemplatePackageDiagnostic,
  type TemplatePackageValidationResult,
  type TemplatePackageV1,
} from "@sleinity/template-core";
import {
  createLoadedSourceDiagnosticReport,
  type LoadedSourceDiagnosticReport,
} from "./layeredSourceDiagnostics";
import { ingestLoadedSourceBundleAssets } from "./bundleAssetIngestion";
import {
  enrichTemplatePackage,
  type TemplatePackageEnrichmentResult,
} from "../enrichment/enrichTemplatePackage";
import { autoLinkManagedFonts } from "../fonts/fontRegistry";
import type { ManagedFontRegistry } from "../fonts/fontRegistryTypes";
import type {
  SavedTemplateRecord,
  SavedTemplateSourceMetadata,
} from "../persistence/types";

export interface TemplatePackageCreateMetadata {
  templateName: string;
  description: string;
  figmaUrl?: string;
  originalPackage?: TemplatePackageV1;
  source?: SavedTemplateSourceMetadata;
  /** Import-session only. Persisted through the managed asset repository. */
  previewBlob?: Blob;
}

export interface PackageImportResult {
  package: TemplatePackageV1 | null;
  validation: TemplatePackageValidationResult | null;
  diagnostics: PackageDiagnostic[];
  pluginDiagnostics: TemplatePackageDiagnostic[];
  enrichment: TemplatePackageEnrichmentResult | null;
  loadedSource?: LoadedTemplatePackageSource;
  layeredDiagnostics?: LoadedSourceDiagnosticReport;
  assetIngestionDiagnostics?: TemplatePackageBundleDiagnostic[];
  assetResolutions?: ResolvedPackageAsset[];
  sourceMetadata?: SavedTemplateSourceMetadata;
}

export interface RebuildPackageImportResultOptions {
  enrichment?: TemplatePackageEnrichmentResult | null;
}

export interface ImportSessionRevisionGuard {
  next(): number;
  invalidate(): number;
  isCurrent(revision: number): boolean;
  current(): number;
}

export interface TemplatePackageImportPipelineInput {
  format: "zip";
  buffer: ArrayBuffer;
  sourceName: string;
  figmaUrl?: string;
  assetStorage?: AssetStorageAdapter;
  fontRegistry?: ManagedFontRegistry | null;
}

export function createImportSessionRevisionGuard(): ImportSessionRevisionGuard {
  let revision = 0;
  return {
    next: () => ++revision,
    invalidate: () => ++revision,
    isCurrent: (candidate) => candidate === revision,
    current: () => revision,
  };
}

export function rebuildPackageImportResult(
  current: PackageImportResult,
  packageValue: TemplatePackageV1,
  options: RebuildPackageImportResultOptions = {},
): PackageImportResult {
  const validation = validateTemplatePackage(packageValue);
  const enrichment = Object.prototype.hasOwnProperty.call(options, "enrichment")
    ? (options.enrichment ?? null)
    : current.enrichment
      ? { ...current.enrichment, package: packageValue }
      : null;
  const layeredDiagnostics = current.loadedSource
    ? createLoadedSourceDiagnosticReport(current.loadedSource, {
        supplementalDiagnostics: current.assetIngestionDiagnostics ?? [],
        packageValue,
        packageDiagnostics: validation.diagnostics,
      })
    : undefined;

  return {
    ...current,
    package: packageValue,
    validation,
    diagnostics: validation.diagnostics,
    pluginDiagnostics: validation.pluginDiagnostics,
    enrichment,
    layeredDiagnostics,
  };
}

export function preserveImportedPackageBaseline(
  currentBaseline: TemplatePackageV1 | null,
  result: PackageImportResult,
): TemplatePackageV1 | null {
  if (currentBaseline || !result.package || !canImportPackageResult(result)) {
    return currentBaseline;
  }
  return structuredClone(
    result.loadedSource?.originalPackageValue ?? result.package,
  );
}

function packageFilesFromLoadedSource(
  loadedSource: LoadedTemplatePackageSource,
): NonNullable<SavedTemplateSourceMetadata["packageFiles"]> {
  return {
    templateJson: loadedSource.sourceFiles.template.exists,
    assetsJson: Boolean(loadedSource.sourceFiles.assetManifest?.exists),
    motionJson: Boolean(loadedSource.sourceFiles.motion?.exists),
    mcpJson: Boolean(loadedSource.sourceFiles.mcp?.exists),
    previewPng: Boolean(loadedSource.sourceFiles.preview?.exists),
    assetCount: loadedSource.sourceFiles.assets.length,
  };
}

export async function buildZipPackageImportResult(
  buffer: ArrayBuffer,
  sourceName: string,
  figmaUrl = "",
  assetStorage: AssetStorageAdapter | undefined = createIndexedDbAssetStore(),
  fontRegistry?: ManagedFontRegistry | null,
): Promise<PackageImportResult> {
  const reader = createZipBundleReader(buffer, { sourceName });
  const loadedSource = loadTemplatePackageBundleSource(reader);
  const assetIngestion =
    loadedSource.packageValue && loadedSource.valid
      ? await ingestLoadedSourceBundleAssets(
          loadedSource,
          assetStorage,
        )
      : null;
  const packageValue = assetIngestion?.packageValue ?? loadedSource.packageValue;
  const linkedPackage = packageValue
    ? await autoLinkManagedFonts(packageValue, fontRegistry)
    : null;
  const finalPackage = linkedPackage ?? packageValue;
  const bundledFigmaUrl =
    loadedSource.figmaSource?.valid && loadedSource.figmaSource.url
      ? loadedSource.figmaSource.url
      : "";
  const effectiveFigmaUrl = figmaUrl.trim() || bundledFigmaUrl;
  const validation = finalPackage
    ? validateTemplatePackage(finalPackage)
    : loadedSource.validation;
  const enrichment =
    finalPackage && validation?.valid
      ? enrichTemplatePackage(finalPackage, { figmaUrl: effectiveFigmaUrl })
      : null;
  const resultPackage = enrichment?.package ?? finalPackage;
  const resultValidation = enrichment?.package
    ? validateTemplatePackage(enrichment.package)
    : validation;
  const layeredDiagnostics = createLoadedSourceDiagnosticReport(loadedSource, {
    supplementalDiagnostics: assetIngestion?.diagnostics ?? [],
    packageValue: resultPackage,
    packageDiagnostics:
      resultValidation?.diagnostics ?? loadedSource.packageDiagnostics,
  });

  return {
    package: resultPackage,
    validation: resultValidation,
    diagnostics:
      resultValidation?.diagnostics ?? loadedSource.packageDiagnostics,
    pluginDiagnostics: resultValidation?.pluginDiagnostics ?? [],
    enrichment,
    loadedSource,
    layeredDiagnostics,
    assetIngestionDiagnostics: assetIngestion?.diagnostics ?? [],
    assetResolutions: assetIngestion?.resolvedAssets ?? [],
    sourceMetadata: {
      type: "package-zip",
      figmaUrl: effectiveFigmaUrl || undefined,
      sourceName,
      packageFiles: packageFilesFromLoadedSource(loadedSource),
    },
  };
}

export async function runTemplatePackageImportPipeline(
  input: TemplatePackageImportPipelineInput,
): Promise<PackageImportResult> {
  return buildZipPackageImportResult(
    input.buffer,
    input.sourceName,
    input.figmaUrl,
    input.assetStorage,
    input.fontRegistry,
  );
}

export function defaultPackageCreateMetadata(
  packageValue: TemplatePackageV1,
): TemplatePackageCreateMetadata {
  return {
    templateName: packageValue.name,
    description: "Template generated from a Figma package.",
  };
}

export function createSettingsPackageImportResult(
  savedTemplate: SavedTemplateRecord,
  figmaUrl = savedTemplate.source.figmaUrl,
): PackageImportResult {
  const packageValue = packageWithEffectiveEditableFields(
    structuredClone(savedTemplate.workingPackage),
  );
  const validation = validateTemplatePackage(packageValue);
  return {
    package: packageValue,
    validation,
    diagnostics: validation.diagnostics,
    pluginDiagnostics: validation.pluginDiagnostics,
    enrichment: enrichTemplatePackage(packageValue, {
      figmaUrl,
    }),
  };
}

export function canImportPackageResult(
  result: PackageImportResult | null,
): boolean {
  if (!result?.package) return false;
  if (result.layeredDiagnostics) return result.layeredDiagnostics.canImport;
  return Boolean(result.validation?.valid);
}

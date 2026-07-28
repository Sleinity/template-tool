import {
  loadTemplatePackageBundleSource,
  type LoadedTemplatePackageSource,
} from "./bundle/loadTemplatePackageBundleSource";
import { createZipBundleReader } from "./bundle/zipBundleReader";
import type { TemplatePackageValidationResult } from "./packageDiagnostics";
import type { TemplatePackageV1 } from "./types";

export interface TemplatePackageImportResultV1 {
  schemaVersion: "template-package-import-result-v1";
  source: LoadedTemplatePackageSource;
  basePackage: TemplatePackageV1 | null;
  workingPackage: TemplatePackageV1 | null;
  validation: TemplatePackageValidationResult | null;
  importable: boolean;
}

/**
 * Framework-neutral ZIP import. Asset storage, managed-font linking, optional
 * Figma enrichment, and persistence are intentionally browser-runtime steps.
 */
export function importTemplatePackage(
  bytes: ArrayBuffer,
  sourceName = "template-package.zip",
): TemplatePackageImportResultV1 {
  const source = loadTemplatePackageBundleSource(
    createZipBundleReader(bytes, { sourceName }),
  );
  const imported = source.originalPackageValue ?? source.packageValue;
  return {
    schemaVersion: "template-package-import-result-v1",
    source,
    basePackage: imported ? structuredClone(imported) : null,
    workingPackage: source.packageValue
      ? structuredClone(source.packageValue)
      : null,
    validation: source.validation,
    importable: source.valid && Boolean(source.packageValue && source.validation?.valid),
  };
}

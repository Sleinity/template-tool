import {
  diagnostic,
  type PackageDiagnostic,
  type TemplatePackageValidationResult,
} from "./packageDiagnostics";
import {
  migrateTemplatePackage,
  UnsupportedTemplatePackageVersionError,
} from "./migrateTemplatePackage";
import type { TemplatePackageV1 } from "./types";
import { validateTemplatePackage } from "./validateTemplatePackage";

export interface ParseTemplatePackageResult {
  package: TemplatePackageV1 | null;
  validation: TemplatePackageValidationResult | null;
  diagnostics: PackageDiagnostic[];
}

export function parseTemplatePackage(source: string | unknown): ParseTemplatePackageResult {
  let parsed: unknown;
  try {
    parsed = typeof source === "string" ? JSON.parse(source) : source;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON parse error.";
    const diagnostics = [
      diagnostic("parse.invalid-json", "error", "parse", `Template package document is invalid JSON: ${message}`, {
        path: "/",
      }),
    ];
    return { package: null, validation: null, diagnostics };
  }

  let migrated: unknown;
  try {
    migrated = migrateTemplatePackage(parsed);
  } catch (error) {
    if (error instanceof UnsupportedTemplatePackageVersionError) {
      const diagnostics = [
        diagnostic(
          "version.unsupported",
          "error",
          "version",
          `Schema version "${String(error.schemaVersion)}" is not supported.`,
          { path: "/schemaVersion" },
        ),
      ];
      return { package: null, validation: null, diagnostics };
    }
    const message = error instanceof Error ? error.message : "The package could not be cloned.";
    const diagnostics = [
      diagnostic("parse.clone-failed", "error", "parse", message, { path: "/" }),
    ];
    return { package: null, validation: null, diagnostics };
  }

  const validation = validateTemplatePackage(migrated);
  return {
    package: validation.schemaValid ? (migrated as TemplatePackageV1) : null,
    validation,
    diagnostics: validation.diagnostics,
  };
}

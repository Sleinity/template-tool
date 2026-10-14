import {
  diagnostic,
  type PackageDiagnostic,
  type TemplatePackageValidationResult,
} from "./packageDiagnostics";
import { normalizeTemplatePackageV1ToV2 } from "./normalizeTemplatePackageV2";
import type { TemplatePackageV1, TemplatePackageV2 } from "./types";
import { validateTemplatePackageV2 } from "./validateTemplatePackageV2";

export interface ParseTemplatePackageV2Result {
  package: TemplatePackageV2 | null;
  validation: TemplatePackageValidationResult | null;
  diagnostics: PackageDiagnostic[];
  sourceVersion: "1.0" | "2.0" | "2.1" | "2.2" | null;
}

function cloneValue<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
}

export function parseTemplatePackageV2(source: string | unknown): ParseTemplatePackageV2Result {
  let parsed: unknown;
  try {
    parsed = typeof source === "string" ? JSON.parse(source) : source;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON parse error.";
    const diagnostics = [diagnostic(
      "parse.invalid-json",
      "error",
      "parse",
      `Template package document is invalid JSON: ${message}`,
      { path: "/" },
    )];
    return { package: null, validation: null, diagnostics, sourceVersion: null };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    const diagnostics = [diagnostic("parse.invalid-root", "error", "parse", "Template package document must be an object.", { path: "/" })];
    return { package: null, validation: null, diagnostics, sourceVersion: null };
  }
  const schemaVersion = (parsed as { schemaVersion?: unknown }).schemaVersion;
  if (schemaVersion === "1.0") {
    const normalized = normalizeTemplatePackageV1ToV2(parsed as TemplatePackageV1);
    if (!normalized.package) {
      return {
        package: null,
        validation: null,
        diagnostics: normalized.diagnostics,
        sourceVersion: "1.0",
      };
    }
    const validation = validateTemplatePackageV2(normalized.package);
    return {
      package: validation.schemaValid ? normalized.package : null,
      validation,
      diagnostics: [...normalized.diagnostics, ...validation.diagnostics],
      sourceVersion: "1.0",
    };
  }
  if (schemaVersion === "2.2") {
    const packageValue = cloneValue(parsed) as TemplatePackageV2;
    const validation = validateTemplatePackageV2(packageValue);
    return {
      package: validation.schemaValid ? packageValue : null,
      validation,
      diagnostics: validation.diagnostics,
      sourceVersion: "2.2",
    };
  }
  const diagnostics = [diagnostic(
    "version.unsupported",
    "error",
    "version",
    `Schema version "${String(schemaVersion)}" is not supported by the V2 source boundary.`,
    { path: "/schemaVersion" },
  )];
  return {
    package: null,
    validation: null,
    diagnostics,
    sourceVersion: schemaVersion === "2.0" || schemaVersion === "2.1" ? schemaVersion : null,
  };
}

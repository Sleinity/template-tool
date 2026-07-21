import type { TemplatePackageV1 } from "./types";

export class UnsupportedTemplatePackageVersionError extends Error {
  constructor(public readonly schemaVersion: unknown) {
    super(`Unsupported Template Package schema version: ${String(schemaVersion)}`);
    this.name = "UnsupportedTemplatePackageVersionError";
  }
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry)) as T;
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]),
    ) as T;
  }

  return value;
}

export function migrateTemplatePackage(input: unknown): unknown {
  const copy = cloneValue(input);
  if (copy === null || typeof copy !== "object" || Array.isArray(copy)) {
    return copy;
  }

  const schemaVersion = (copy as { schemaVersion?: unknown }).schemaVersion;
  if (schemaVersion !== "1.0") {
    throw new UnsupportedTemplatePackageVersionError(schemaVersion);
  }

  // v1 is already canonical. Future migrations should return a new object.
  return copy as TemplatePackageV1;
}

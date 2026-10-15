import { createRuntimeFontFamily } from "./fontIdentity";
import {
  MANAGED_FONT_SCHEMA_VERSION,
  type ManagedFontRecord,
  type ManagedFontRegistrationInput,
} from "./fontRegistryTypes";

export function normalizeManagedFontRecord(
  record: ManagedFontRecord,
): ManagedFontRecord {
  const faceIndex = record.faceIndex ?? 0;
  return {
    ...record,
    schemaVersion: MANAGED_FONT_SCHEMA_VERSION,
    family: record.typographicFamily ?? record.family,
    typographicFamily: record.typographicFamily ?? record.family,
    legacyFamily: record.legacyFamily ?? record.family,
    subfamily:
      record.typographicSubfamily ??
      record.legacySubfamily ??
      record.subfamily,
    faceIndex,
    stretch: record.stretch ?? "normal",
    runtimeFamily:
      record.runtimeFamily ?? createRuntimeFontFamily(record.assetHash, faceIndex),
    variableAxes: record.variableAxes ?? [],
    unicodeCoverage: record.unicodeCoverage ?? { ranges: [], codePointCount: 0 },
    rawNameRecords: record.rawNameRecords ?? [],
    license: record.license ?? {
      name: null,
      url: null,
      version: null,
      redistributionStatus: "unknown",
    },
  };
}

export function createManagedFontRecord(
  id: string,
  assetHash: string,
  input: ManagedFontRegistrationInput,
  now: string,
): ManagedFontRecord {
  const faceIndex = input.faceIndex ?? 0;
  return normalizeManagedFontRecord({
    id,
    schemaVersion: MANAGED_FONT_SCHEMA_VERSION,
    family: input.typographicFamily ?? input.family,
    typographicFamily: input.typographicFamily ?? input.family,
    legacyFamily: input.legacyFamily ?? input.family,
    subfamily:
      input.typographicSubfamily ?? input.legacySubfamily ?? input.subfamily,
    typographicSubfamily: input.typographicSubfamily,
    legacySubfamily: input.legacySubfamily,
    style: input.style,
    weight: input.weight,
    stretch: input.stretch ?? "normal",
    postScriptName: input.postScriptName,
    fullName: input.fullName,
    source: input.source,
    assetId: `asset:font:${assetHash.slice(0, 12)}:${faceIndex}`,
    assetHash,
    mimeType: input.mimeType,
    fileName: input.fileName,
    faceIndex,
    runtimeFamily:
      input.runtimeFamily ?? createRuntimeFontFamily(assetHash, faceIndex),
    variableAxes: input.variableAxes ?? [],
    unicodeCoverage: input.unicodeCoverage ?? { ranges: [], codePointCount: 0 },
    rawNameRecords: input.rawNameRecords ?? [],
    license: input.license,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
    usageCount: 0,
    aliases: input.aliases ?? [],
    trustedForFamilies: input.trustedForFamilies ?? [],
    notes: input.notes,
  });
}

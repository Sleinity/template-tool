import type { TemplatePackageFontRequirement } from "@sleinity/template-core";
import {
  CANONICAL_FONT_FACE_VERSION,
  createCanonicalFontRequest,
  type CanonicalFontFaceV1,
  type FontUnicodeCoverage,
  type FontVariationAxis,
  type OpenTypeNameRecordEvidence,
} from "./fontIdentity";
import { matchCanonicalFontFace } from "./fontMatching";

export interface FontBinaryMetadata extends CanonicalFontFaceV1 {
  variableWeightRange?: { min: number; max: number };
}

export interface InspectedFontBinary {
  binaryHash: string;
  faces: FontBinaryMetadata[];
  parseDurationMs: number;
}

interface TableRecord {
  offset: number;
  length: number;
}

const inspectionCache = new Map<string, InspectedFontBinary>();

function readTag(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

function decodeUtf16Be(bytes: Uint8Array): string {
  let value = "";
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    value += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
  }
  return value.replace(/\0/g, "").trim();
}

function decodeName(bytes: Uint8Array, platformId: number): string {
  if (platformId === 0 || platformId === 3) return decodeUtf16Be(bytes);
  return new TextDecoder("latin1").decode(bytes).replace(/\0/g, "").trim();
}

function fixed16_16(view: DataView, offset: number): number {
  return view.getInt32(offset) / 65536;
}

function tableDirectory(
  view: DataView,
  faceOffset: number,
): Map<string, TableRecord> | null {
  if (faceOffset < 0 || faceOffset + 12 > view.byteLength) return null;
  const tableCount = view.getUint16(faceOffset + 4);
  const tables = new Map<string, TableRecord>();
  for (let index = 0; index < tableCount; index += 1) {
    const entryOffset = faceOffset + 12 + index * 16;
    if (entryOffset + 16 > view.byteLength) return null;
    const tag = readTag(view, entryOffset);
    const offset = view.getUint32(entryOffset + 8);
    const length = view.getUint32(entryOffset + 12);
    if (offset + length <= view.byteLength) tables.set(tag, { offset, length });
  }
  return tables;
}

function faceOffsets(view: DataView): number[] {
  if (view.byteLength < 12) return [];
  if (readTag(view, 0) !== "ttcf") return [0];
  const count = view.getUint32(8);
  if (count < 1 || count > 1024 || 12 + count * 4 > view.byteLength) return [];
  return Array.from({ length: count }, (_, index) => view.getUint32(12 + index * 4));
}

function readNames(
  source: ArrayBuffer,
  view: DataView,
  table: TableRecord | undefined,
): { records: OpenTypeNameRecordEvidence[]; preferred: Map<number, string> } {
  const records: OpenTypeNameRecordEvidence[] = [];
  const preferred = new Map<number, string>();
  const priorities = new Map<number, number>();
  if (!table || table.offset + 6 > view.byteLength) return { records, preferred };
  const count = view.getUint16(table.offset + 2);
  const stringsOffset = table.offset + view.getUint16(table.offset + 4);
  for (let index = 0; index < count; index += 1) {
    const record = table.offset + 6 + index * 12;
    if (record + 12 > view.byteLength) break;
    const platformId = view.getUint16(record);
    const encodingId = view.getUint16(record + 2);
    const languageId = view.getUint16(record + 4);
    const nameId = view.getUint16(record + 6);
    const length = view.getUint16(record + 8);
    const offset = stringsOffset + view.getUint16(record + 10);
    if (offset + length > view.byteLength) continue;
    const value = decodeName(new Uint8Array(source, offset, length), platformId);
    if (!value) continue;
    records.push({ platformId, encodingId, languageId, nameId, value });
    const priority =
      languageId === 0x0409 ? 4 : languageId === 0 || languageId === 0xffff ? 3 :
        platformId === 3 ? 2 : platformId === 0 ? 1 : 0;
    if (!priorities.has(nameId) || priority > (priorities.get(nameId) ?? -1)) {
      priorities.set(nameId, priority);
      preferred.set(nameId, value);
    }
  }
  return { records, preferred };
}

const widthClasses: Record<number, string> = {
  1: "ultra-condensed",
  2: "extra-condensed",
  3: "condensed",
  4: "semi-condensed",
  5: "normal",
  6: "semi-expanded",
  7: "expanded",
  8: "extra-expanded",
  9: "ultra-expanded",
};

function variationAxes(
  view: DataView,
  table: TableRecord | undefined,
  names: Map<number, string>,
): FontVariationAxis[] {
  if (!table || table.offset + 16 > view.byteLength) return [];
  const axesOffset = view.getUint16(table.offset + 4);
  const axisCount = view.getUint16(table.offset + 8);
  const axisSize = view.getUint16(table.offset + 10);
  const axes: FontVariationAxis[] = [];
  for (let index = 0; index < axisCount; index += 1) {
    const axis = table.offset + axesOffset + index * axisSize;
    if (axis + 20 > view.byteLength) break;
    axes.push({
      tag: readTag(view, axis),
      min: fixed16_16(view, axis + 4),
      default: fixed16_16(view, axis + 8),
      max: fixed16_16(view, axis + 12),
      name: names.get(view.getUint16(axis + 18)) ?? null,
    });
  }
  return axes;
}

function mergeCoverageRanges(
  ranges: Array<{ start: number; end: number }>,
): FontUnicodeCoverage {
  const sorted = ranges
    .filter((range) => range.start >= 0 && range.end >= range.start && range.start <= 0x10ffff)
    .map((range) => ({ start: range.start, end: Math.min(0x10ffff, range.end) }))
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const merged: Array<{ start: number; end: number }> = [];
  for (const range of sorted) {
    const previous = merged.length ? merged[merged.length - 1] : undefined;
    if (previous && range.start <= previous.end + 1) previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  return {
    ranges: merged,
    codePointCount: merged.reduce((total, range) => total + range.end - range.start + 1, 0),
  };
}

function unicodeCoverage(
  view: DataView,
  table: TableRecord | undefined,
): FontUnicodeCoverage {
  if (!table || table.offset + 4 > view.byteLength) return { ranges: [], codePointCount: 0 };
  const subtableCount = view.getUint16(table.offset + 2);
  const ranges: Array<{ start: number; end: number }> = [];
  const visited = new Set<number>();
  for (let index = 0; index < subtableCount; index += 1) {
    const record = table.offset + 4 + index * 8;
    if (record + 8 > view.byteLength) break;
    const subtable = table.offset + view.getUint32(record + 4);
    if (visited.has(subtable) || subtable + 2 > view.byteLength) continue;
    visited.add(subtable);
    const format = view.getUint16(subtable);
    if (format === 12 && subtable + 16 <= view.byteLength) {
      const groups = view.getUint32(subtable + 12);
      for (let group = 0; group < groups; group += 1) {
        const offset = subtable + 16 + group * 12;
        if (offset + 12 > view.byteLength) break;
        ranges.push({ start: view.getUint32(offset), end: view.getUint32(offset + 4) });
      }
    } else if (format === 4 && subtable + 16 <= view.byteLength) {
      const segmentCount = view.getUint16(subtable + 6) / 2;
      const endCodes = subtable + 14;
      const startCodes = endCodes + segmentCount * 2 + 2;
      for (let segment = 0; segment < segmentCount; segment += 1) {
        const start = view.getUint16(startCodes + segment * 2);
        const end = view.getUint16(endCodes + segment * 2);
        if (start <= end && start !== 0xffff) ranges.push({ start, end });
      }
    }
  }
  return mergeCoverageRanges(ranges);
}

function parseFace(
  source: ArrayBuffer,
  binaryHash: string,
  collectionFaceIndex: number,
  faceOffset: number,
): FontBinaryMetadata | null {
  const view = new DataView(source);
  const tables = tableDirectory(view, faceOffset);
  if (!tables) return null;
  const { records, preferred: names } = readNames(source, view, tables.get("name"));
  const os2 = tables.get("OS/2");
  const weight = os2 && os2.offset + 8 <= view.byteLength
    ? view.getUint16(os2.offset + 4)
    : null;
  const widthClass = os2 && os2.offset + 8 <= view.byteLength
    ? view.getUint16(os2.offset + 6)
    : 5;
  const fsSelection = os2 && os2.offset + 64 <= view.byteLength
    ? view.getUint16(os2.offset + 62)
    : 0;
  const typographicFamily = names.get(16) ?? null;
  const legacyFamily = names.get(1) ?? null;
  const typographicSubfamily = names.get(17) ?? null;
  const legacySubfamily = names.get(2) ?? null;
  const family = typographicFamily ?? legacyFamily;
  const subfamily = typographicSubfamily ?? legacySubfamily;
  const rawStyle = `${typographicSubfamily ?? ""} ${legacySubfamily ?? ""}`;
  const style = fsSelection & 0x0200
    ? "oblique"
    : fsSelection & 0x0001 || /italic/i.test(rawStyle)
      ? "italic"
      : /oblique/i.test(rawStyle)
        ? "oblique"
        : "normal";
  const axes = variationAxes(view, tables.get("fvar"), names);
  const weightAxis = axes.find((axis) => axis.tag === "wght");
  return {
    version: CANONICAL_FONT_FACE_VERSION,
    assetId: null,
    binaryHash,
    collectionFaceIndex,
    typographicFamily,
    legacyFamily,
    typographicSubfamily,
    legacySubfamily,
    family,
    subfamily,
    fullName: names.get(4) ?? null,
    postScriptName: names.get(6) ?? null,
    weight,
    style,
    stretch: widthClasses[widthClass] ?? "normal",
    variableAxes: axes,
    variableWeightRange: weightAxis ? { min: weightAxis.min, max: weightAxis.max } : undefined,
    unicodeCoverage: unicodeCoverage(view, tables.get("cmap")),
    source: "binary",
    license: {
      name: names.get(13) ?? null,
      url: names.get(14) ?? null,
      version: names.get(5) ?? null,
      redistributionStatus: "unknown",
    },
    rawNameRecords: records,
  };
}

function emptyHash(): string {
  return "unhashed";
}

export function parseOpenTypeFontFaces(
  source: ArrayBuffer,
  binaryHash = emptyHash(),
): FontBinaryMetadata[] {
  try {
    const view = new DataView(source);
    return faceOffsets(view)
      .map((offset, index) => parseFace(source, binaryHash, index, offset))
      .filter((face): face is FontBinaryMetadata => Boolean(face));
  } catch {
    return [];
  }
}

export function parseOpenTypeFontMetadata(
  source: ArrayBuffer,
  faceIndex = 0,
): FontBinaryMetadata | null {
  return parseOpenTypeFontFaces(source)[faceIndex] ?? null;
}

async function sha256(source: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", source);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function inspectOpenTypeFontBinary(
  source: ArrayBuffer,
): Promise<InspectedFontBinary> {
  const started = performance.now();
  const binaryHash = await sha256(source);
  const cached = inspectionCache.get(binaryHash);
  if (cached) return cached;
  const faces = parseOpenTypeFontFaces(source, binaryHash);
  const result = { binaryHash, faces, parseDurationMs: performance.now() - started };
  inspectionCache.set(binaryHash, result);
  return result;
}

export function fontMetadataMatchesRequirement(
  metadata: FontBinaryMetadata,
  requirement: TemplatePackageFontRequirement,
): { matches: boolean; reason?: string } {
  const result = matchCanonicalFontFace(
    createCanonicalFontRequest(requirement),
    metadata,
  );
  return {
    matches: result.classification === "exact" || result.classification === "compatible",
    reason: result.classification === "exact" || result.classification === "compatible"
      ? undefined
      : result.reasons.join(" ") || "The font face does not match the request.",
  };
}

export function clearFontInspectionCacheForTests(): void {
  inspectionCache.clear();
}

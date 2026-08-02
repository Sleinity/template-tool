import { MEASUREMENT_SNAPSHOT_VERSION, type MeasurementPublicationResultV1, type MeasurementRecordV1, type MeasurementSnapshotV1, type RevisionVectorV1 } from "./types";

const revisionKeys: Array<keyof RevisionVectorV1> = ["package", "scene", "overrides", "fonts", "assets", "container", "epoch"];

function isSerializable(value: unknown, seen = new Set<object>()): boolean {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return typeof value !== "number" || Number.isFinite(value as number);
  if (typeof value !== "object" || seen.has(value as object)) return false;
  if (typeof Node !== "undefined" && value instanceof Node) return false;
  seen.add(value as object);
  if (Array.isArray(value)) return value.every((child) => isSerializable(child, seen));
  return Object.values(value as Record<string, unknown>).every((child) => isSerializable(child, seen));
}

export function validateMeasurementSnapshot(snapshot: MeasurementSnapshotV1): string[] {
  const issues: string[] = [];
  if (snapshot.schemaVersion !== MEASUREMENT_SNAPSHOT_VERSION) issues.push("measurement snapshot version is invalid");
  if (!snapshot.fixture.id || !/^[a-f0-9]{64}$/.test(snapshot.fixture.zipSha256)) issues.push("fixture identity or ZIP hash is invalid");
  if (new Set(snapshot.records.map((record) => record.id)).size !== snapshot.records.length) issues.push("measurement record IDs must be unique");
  for (const record of snapshot.records) {
    if (!record.nodeId || !record.property) issues.push(`measurement ${record.id} has no node/property identity`);
    if (!isSerializable(record.value)) issues.push(`measurement ${record.id} contains non-serializable or non-finite data`);
  }
  for (const key of revisionKeys) if (!Number.isInteger(snapshot.revision[key]) || snapshot.revision[key] < 0) issues.push(`revision ${key} must be a non-negative integer`);
  return issues;
}

export function createMeasurementSnapshot(input: Omit<MeasurementSnapshotV1, "schemaVersion" | "records"> & { records: MeasurementRecordV1[] }): MeasurementSnapshotV1 {
  const snapshot: MeasurementSnapshotV1 = {
    ...structuredClone(input),
    schemaVersion: MEASUREMENT_SNAPSHOT_VERSION,
    records: structuredClone(input.records).sort((left, right) => left.id.localeCompare(right.id)),
  };
  const issues = validateMeasurementSnapshot(snapshot);
  if (issues.length) throw new Error(`Invalid measurement snapshot: ${issues.join("; ")}`);
  return snapshot;
}

export function compareRevision(current: RevisionVectorV1, incoming: RevisionVectorV1): { current: boolean; staleKeys: Array<keyof RevisionVectorV1>; futureKeys: Array<keyof RevisionVectorV1> } {
  const staleKeys = revisionKeys.filter((key) => incoming[key] < current[key]);
  const futureKeys = revisionKeys.filter((key) => incoming[key] > current[key]);
  return { current: !staleKeys.length && !futureKeys.length, staleKeys, futureKeys };
}

export function publishMeasurementSnapshot(snapshot: MeasurementSnapshotV1, currentRevision: RevisionVectorV1): MeasurementPublicationResultV1 {
  const issues = validateMeasurementSnapshot(snapshot);
  if (issues.length) return { accepted: false, reason: issues.join("; "), snapshot: null };
  const comparison = compareRevision(currentRevision, snapshot.revision);
  if (comparison.staleKeys.length) return { accepted: false, reason: `stale measurement revision: ${comparison.staleKeys.join(", ")}`, snapshot: null };
  if (comparison.futureKeys.length) return { accepted: false, reason: `measurement revision is from an unrecognized future state: ${comparison.futureKeys.join(", ")}`, snapshot: null };
  return { accepted: true, reason: "measurement revision matches current settlement input", snapshot: structuredClone(snapshot) };
}

export function measurementMap(snapshot: MeasurementSnapshotV1): Map<string, MeasurementRecordV1[]> {
  const result = new Map<string, MeasurementRecordV1[]>();
  for (const record of snapshot.records) result.set(record.nodeId, [...(result.get(record.nodeId) ?? []), record]);
  return result;
}

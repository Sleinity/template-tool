import { createTemplateFieldContentStateV1 } from "@sleinity/template-core";
import { createTemplateFieldFamilyContentStateV3 } from "@sleinity/template-core/family";
import { createTemplateSessionV2, createTemplateFieldFamilySessionV2 } from "@sleinity/template-browser/session";
import { getTemplateRecoveryRepository, type TemplateRecoveryRepository, type TemplateRecoveryLease, getTemplateSessionRepositoryV2, getTemplateFieldFamilyRepositoryV3, createSavedTemplateSessionV2Record, createSavedTemplateFieldFamilyV3Record, type IncompatibleSavedWorkRecord, type SavedTemplateSessionRecordV2, type SavedTemplateFieldFamilyRecordV3, type TemplateSessionRepositoryV2, type TemplateFieldFamilyRepositoryV3 } from "@sleinity/template-browser/persistence";
import type { ReactTemplateFieldSessionV2 } from "@sleinity/template-react";
import { normalizeStudioFamilyTextLimits, normalizeStudioTextField } from "../field-rules/studioTextLimits";

export type StudioAnnotation = { role?: "template" | "draft"; templateId?: string; conversion?: { templateId: string; draftId: string; complete: boolean }; convertedFrom?: string };
export type StudioRecord = (SavedTemplateSessionRecordV2 | SavedTemplateFieldFamilyRecordV3) & { studio?: StudioAnnotation };
export type StudioRecordKind = "single" | "family";
export type StudioEntityLocator = { kind: StudioRecordKind; id: string };
export type StudioEntityResolution =
  | { status: "found"; locator: StudioEntityLocator; record: StudioRecord; canonical: boolean }
  | { status: "missing" }
  | { status: "ambiguous" };
export const isFamilyRecord = (record: StudioRecord): record is SavedTemplateFieldFamilyRecordV3 & { studio?: StudioAnnotation } => "family" in record;
export const studioLocator = (record: StudioRecord): StudioEntityLocator => ({ kind: isFamilyRecord(record) ? "family" : "single", id: record.id });
export const studioEntityKey = (locator: StudioEntityLocator): string => `${locator.kind}:${locator.id}`;
export function parseStudioEntityKey(value: string): StudioEntityLocator | null {
  const match = value.match(/^(single|family):(.*)$/s);
  return match && match[2] ? { kind: match[1] as StudioRecordKind, id: match[2] } : null;
}
const id = () => `studio-${crypto.randomUUID()}`;

export function createStudioRecords(single: TemplateSessionRepositoryV2 = getTemplateSessionRepositoryV2(), family: TemplateFieldFamilyRepositoryV3 = getTemplateFieldFamilyRepositoryV3(), recovery: TemplateRecoveryRepository = getTemplateRecoveryRepository()) {
  const save = async (record: StudioRecord): Promise<StudioRecord> => isFamilyRecord(record) ? family.saveTemplateFieldFamilyV3(record) : single.saveTemplateSessionV2(record);
  const get = async (locator: StudioEntityLocator): Promise<StudioRecord | null> => locator.kind === "family"
    ? family.getTemplateFieldFamilyV3(locator.id)
    : single.getTemplateSessionV2(locator.id);
  const resolve = async (entity: string): Promise<StudioEntityResolution> => {
    const locator = parseStudioEntityKey(entity);
    if (locator) {
      const record = await get(locator);
      return record ? { status: "found", locator, record, canonical: true } : { status: "missing" };
    }
    const [singleRecord, familyRecord] = await Promise.all([
      single.getTemplateSessionV2(entity), family.getTemplateFieldFamilyV3(entity),
    ]);
    if (singleRecord && familyRecord) return { status: "ambiguous" };
    const record = singleRecord ?? familyRecord;
    if (!record) return { status: "missing" };
    return { status: "found", locator: studioLocator(record), record, canonical: false };
  };
  const rawList = async (): Promise<StudioRecord[]> => (await Promise.all([single.listTemplateSessionsV2(), family.listTemplateFieldFamiliesV3()])).flat();
  const migrationDiagnostics: string[] = [];
  const migrateRecovery = async () => {
    const records = await rawList();
    const groups = new Map<string, StudioRecord[]>();
    migrationDiagnostics.length = 0;
    for (const record of records) {
      if (record.studio?.role !== "draft") continue;
      const templateId = record.studio.templateId;
      const kind = studioLocator(record).kind;
      if (!templateId || !records.some(candidate => candidate.id === templateId && studioLocator(candidate).kind === kind && candidate.studio?.role === "template")) {
        migrationDiagnostics.push(`Unlinked recovery retained internally: ${kind}:${record.id}`); continue;
      }
      const key = studioEntityKey({ kind, id: templateId });
      groups.set(key, [...groups.get(key) ?? [], record]);
    }
    for (const drafts of groups.values()) {
      drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id));
      const retained = drafts[0];
      await recovery.adopt({ kind: studioLocator(retained).kind, templateId: retained.studio!.templateId! }, retained, [retained.id]);
      // Recovery owns the binaries before legacy owners are removed. Retrying adopt never overwrites a newer lifecycle.
      for (const draft of drafts) await removeRecord(draft);
    }
  };
  const list = async () => { await migrateRecovery(); return (await rawList()).filter(record => record.studio?.role !== "draft"); };
  const listIncompatible = async (): Promise<IncompatibleSavedWorkRecord[]> => (await Promise.all([
    single.listIncompatibleTemplateSessionsV2(), family.listIncompatibleTemplateFieldFamiliesV3(),
  ])).flat();
  const removeIncompatible = async (record: IncompatibleSavedWorkRecord) => record.kind === "family"
    ? family.deleteIncompatibleTemplateFieldFamilyV3(record.id)
    : single.deleteIncompatibleTemplateSessionV2(record.id);
  const getManagedAsset = (locator: StudioEntityLocator, hash: string) => locator.kind === "family" ? family.getManagedAsset(hash) : single.getManagedAsset(hash);
  const removeRecord = async (record: StudioRecord) => isFamilyRecord(record) ? family.deleteTemplateFieldFamilyV3(record.id) : single.deleteTemplateSessionV2(record.id);
  const remove = async (record: StudioRecord) => {
    await removeRecord(record);
  };
  function openSession(record: StudioRecord, lease?: TemplateRecoveryLease): ReactTemplateFieldSessionV2 {
    // Bind storage identity independently of SDK source/family identity. Never persist renderer evidence.
    const preserve = (next: StudioRecord): StudioRecord => ({ ...next, id: record.id, name: record.name, description: record.description, createdAt: record.createdAt, studio: record.studio, ...(!isFamilyRecord(record) && !isFamilyRecord(next) ? { source: record.source } : {}) });
    return isFamilyRecord(record) ? createTemplateFieldFamilySessionV2({ repository: {
      listTemplateFieldFamiliesV3: () => family.listTemplateFieldFamiliesV3(), getTemplateFieldFamilyV3: (key) => lease ? Promise.resolve(record as SavedTemplateFieldFamilyRecordV3) : family.getTemplateFieldFamilyV3(key),
      deleteTemplateFieldFamilyV3: (key) => family.deleteTemplateFieldFamilyV3(key), getManagedAsset: async (key) => lease ? await recovery.getManagedAsset(key) ?? family.getManagedAsset(key) : family.getManagedAsset(key),
      listIncompatibleTemplateFieldFamiliesV3: () => family.listIncompatibleTemplateFieldFamiliesV3(), deleteIncompatibleTemplateFieldFamilyV3: (key) => family.deleteIncompatibleTemplateFieldFamilyV3(key),
      saveTemplateFieldFamilyV3: (next) => (lease ? recovery.save(lease, preserve(next)) : family.saveTemplateFieldFamilyV3(preserve(next) as SavedTemplateFieldFamilyRecordV3)) as Promise<SavedTemplateFieldFamilyRecordV3>,
    } }) : createTemplateSessionV2({ repository: {
      listTemplateSessionsV2: () => single.listTemplateSessionsV2(), getTemplateSessionV2: (key) => lease ? Promise.resolve(record as SavedTemplateSessionRecordV2) : single.getTemplateSessionV2(key),
      deleteTemplateSessionV2: (key) => single.deleteTemplateSessionV2(key), getManagedAsset: async (key) => lease ? await recovery.getManagedAsset(key) ?? single.getManagedAsset(key) : single.getManagedAsset(key),
      listIncompatibleTemplateSessionsV2: () => single.listIncompatibleTemplateSessionsV2(), deleteIncompatibleTemplateSessionV2: (key) => single.deleteIncompatibleTemplateSessionV2(key),
      saveTemplateSessionV2: (next) => (lease ? recovery.save(lease, preserve(next)) : single.saveTemplateSessionV2(preserve(next) as SavedTemplateSessionRecordV2)) as Promise<SavedTemplateSessionRecordV2>,
    } });
  }
  function capture(session: ReactTemplateFieldSessionV2, metadata: { name: string; description?: string }, previous?: StudioRecord): StudioRecord {
    const snapshot = session.getSnapshot();
    if (!snapshot.contentState) throw new Error("Canonical content is unavailable.");
    const record = "family" in snapshot && snapshot.family && snapshot.selectedVariantId
      ? createSavedTemplateFieldFamilyV3Record({ ...metadata, family: normalizeStudioFamilyTextLimits(snapshot.family), contentState: snapshot.contentState, selectedVariantId: snapshot.selectedVariantId, sessionAssets: snapshot.sessionAssets })
      : "basePackage" in snapshot && snapshot.basePackage
        ? createSavedTemplateSessionV2Record({ ...metadata, source: previous && !isFamilyRecord(previous) ? previous.source : undefined, basePackage: { ...snapshot.basePackage, editableFields: snapshot.basePackage.editableFields.map(normalizeStudioTextField) }, contentState: snapshot.contentState, sessionAssets: snapshot.sessionAssets }) : null;
    if (!record) throw new Error("Configuration is unavailable.");
    return { ...record, id: previous?.id ?? id(), createdAt: previous?.createdAt ?? record.createdAt, studio: previous?.studio };
  }
  function fresh(record: StudioRecord, recordId: string, studio: StudioAnnotation): StudioRecord {
    const now = new Date().toISOString();
    return { ...structuredClone(record), id: recordId, createdAt: now, updatedAt: now, studio, sessionAssets: {}, ...(isFamilyRecord(record) ? { selectedVariantId: record.family.variants[0].id } : {}), contentState: isFamilyRecord(record) ? createTemplateFieldFamilyContentStateV3(record.family) : createTemplateFieldContentStateV1(record.basePackage) } as StudioRecord;
  }
  const beginOutput = async (template: StudioRecord, mode: "fresh" | "resume") => {
    if (template.studio?.role !== "template") throw new Error("Choose a saved template.");
    const result = await recovery.begin({ kind: studioLocator(template).kind, templateId: template.id }, mode);
    const record = result.payload as StudioRecord | null ?? fresh(template, id(), { role: "draft", templateId: template.id });
    return { record, lease: result.lease };
  };
  async function saveTemplate(session: ReactTemplateFieldSessionV2, metadata: { name: string; description?: string }, previous?: StudioRecord) {
    // A saved single promoted to Family is explicitly a new product entity.
    const promoted = previous && !isFamilyRecord(previous) && "family" in session.getSnapshot();
    const record = capture(session, metadata, promoted ? undefined : previous);
    return save({ ...record, studio: { ...record.studio, role: "template" } });
  }
  async function convert(original: StudioRecord) {
    const originalLocator = studioLocator(original);
    let source = await get(originalLocator);
    if (!source || source.studio?.role) throw new Error("Choose unconverted existing work.");
    if (!source.studio?.conversion) source = await save({ ...source, studio: { ...source.studio, conversion: { templateId: id(), draftId: id(), complete: false } } });
    const conversion = source.studio!.conversion!;
    if (conversion.complete) return;
    // Target IDs are durable before either write. Retry never replaces an already-created output.
    if (!await get({ kind: originalLocator.kind, id: conversion.templateId })) await save(fresh(source, conversion.templateId, { role: "template", convertedFrom: source.id }));
    await recovery.adopt({ kind: originalLocator.kind, templateId: conversion.templateId }, { ...structuredClone(source), id: conversion.draftId, studio: { role: "draft", templateId: conversion.templateId, convertedFrom: source.id } } as StudioRecord, [conversion.draftId]);
    await save({ ...source, studio: { ...source.studio, conversion: { ...conversion, complete: true } } });
  }
  return { list, listIncompatible, get, resolve, getManagedAsset, save, remove, removeIncompatible, openSession, capture, beginOutput, recovery, migrateRecovery, migrationDiagnostics, saveTemplate, convert };
}
export const studioRecords = createStudioRecords();

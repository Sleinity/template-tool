import type {
  TemplatePackageValidationResult,
  TemplatePackageV1,
} from "@sleinity/template-core";
import {
  TEMPLATE_FAMILY_CONTENT_SCHEMA_VERSION,
  validateTemplateFamily,
  wrapLegacyTemplatePackageAsFamily,
  type TemplateFamilyContentStateV1,
  type TemplateFamilyV1,
} from "@sleinity/template-core/family";
import { IndexedDbTemplateRepository } from "./indexedDbTemplateRepository";
import { InMemoryTemplateRepository } from "./inMemoryTemplateRepository";
import {
  SAVED_OUTPUT_DRAFT_SCHEMA_VERSION,
  SAVED_TEMPLATE_FAMILY_DRAFT_SCHEMA_VERSION,
  SAVED_TEMPLATE_FAMILY_SCHEMA_VERSION,
  SAVED_TEMPLATE_SCHEMA_VERSION,
  type SavedTemplateRecord,
  type SavedOutputDraftRecord,
  type SavedTemplateFamilyDraftRecord,
  type SavedTemplateFamilyRecord,
  type TemplateFamilyRepository,
  type TemplateRepository,
} from "./types";

let repository: TemplateRepository | null = null;
let familyRepository: TemplateFamilyRepository | null = null;

export function getTemplateRepository(): TemplateRepository {
  if (!repository) {
    repository =
      typeof indexedDB === "undefined"
        ? new InMemoryTemplateRepository()
        : new IndexedDbTemplateRepository();
  }
  return repository;
}

export function getTemplateFamilyRepository(): TemplateFamilyRepository {
  if (familyRepository) return familyRepository;
  const current = getTemplateRepository();
  if ("listFamilies" in current) {
    familyRepository = current as TemplateRepository & TemplateFamilyRepository;
  } else {
    familyRepository = new InMemoryTemplateRepository();
  }
  return familyRepository;
}

export function createSavedOutputDraftRecord(
  template: SavedTemplateRecord,
): SavedOutputDraftRecord {
  const now = new Date().toISOString();
  return {
    schemaVersion: SAVED_OUTPUT_DRAFT_SCHEMA_VERSION,
    id: `draft:${crypto.randomUUID()}`,
    templateId: template.id,
    templateName: template.name,
    name: `${template.name} Draft`,
    basePackage: structuredClone(template.workingPackage),
    workingPackage: structuredClone(template.workingPackage),
    validation: structuredClone(template.validation),
    createdAt: now,
    updatedAt: now,
    assetReferences: [],
    fontReferences: [],
  };
}

export function createSavedTemplateRecord(input: {
  name: string;
  description?: string;
  packageValue: TemplatePackageV1;
  workingPackageValue?: TemplatePackageV1;
  validation: TemplatePackageValidationResult;
  figmaUrl?: string;
  source?: SavedTemplateRecord["source"];
  previewAssetHash?: string;
}): SavedTemplateRecord {
  const now = new Date().toISOString();
  return {
    schemaVersion: SAVED_TEMPLATE_SCHEMA_VERSION,
    id: `template:${crypto.randomUUID()}`,
    name: input.name.trim() || input.packageValue.name,
    description: input.description,
    originalPackage: structuredClone(input.packageValue),
    workingPackage: structuredClone(
      input.workingPackageValue ?? input.packageValue,
    ),
    createdAt: now,
    updatedAt: now,
    source: {
      type: "package-zip",
      figmaUrl: input.figmaUrl ?? input.source?.figmaUrl,
      sourceName: input.source?.sourceName,
      packageFiles: input.source?.packageFiles,
    },
    validation: structuredClone(input.validation),
    assetReferences: [],
    fontReferences: [],
    previewAssetHash: input.previewAssetHash,
  };
}

export function createSavedTemplateFamilyRecord(input: {
  family: TemplateFamilyV1;
  name?: string;
  description?: string;
  sharedImageAssets?: TemplatePackageV1["assets"];
  variantPreviewAssetHashes?: Record<string, string>;
  migratedFromTemplateId?: string;
}): SavedTemplateFamilyRecord {
  const now = new Date().toISOString();
  const family = structuredClone(input.family);
  return {
    schemaVersion: SAVED_TEMPLATE_FAMILY_SCHEMA_VERSION,
    id: family.id,
    name: input.name?.trim() || family.title,
    description: input.description?.trim() || undefined,
    family,
    validation: validateTemplateFamily(family),
    sharedImageAssets: structuredClone(input.sharedImageAssets ?? {}),
    createdAt: now,
    updatedAt: now,
    assetReferences: [],
    fontReferences: [],
    variantPreviewAssetHashes: input.variantPreviewAssetHashes
      ? structuredClone(input.variantPreviewAssetHashes)
      : undefined,
    migratedFromTemplateId: input.migratedFromTemplateId,
  };
}

export function createSavedTemplateFamilyDraftRecord(input: {
  family: TemplateFamilyV1;
  content?: TemplateFamilyContentStateV1;
  selectedVariantId?: string;
  name?: string;
  sharedImageAssets?: TemplatePackageV1["assets"];
}): SavedTemplateFamilyDraftRecord {
  const now = new Date().toISOString();
  const content = input.content
    ? structuredClone(input.content)
    : {
        schemaVersion: TEMPLATE_FAMILY_CONTENT_SCHEMA_VERSION,
        familyId: input.family.id,
        revision: 0,
        values: Object.fromEntries(
          input.family.fields.map((field) => [field.id, field.defaultValue]),
        ),
      } satisfies TemplateFamilyContentStateV1;
  return {
    schemaVersion: SAVED_TEMPLATE_FAMILY_DRAFT_SCHEMA_VERSION,
    id: `family-draft:${crypto.randomUUID()}`,
    familyId: input.family.id,
    familyName: input.family.title,
    name: input.name?.trim() || `${input.family.title} Draft`,
    content,
    validation: validateTemplateFamily(input.family, content),
    selectedVariantId:
      input.selectedVariantId ?? input.family.variants[0]?.id ?? "",
    sharedImageAssets: structuredClone(input.sharedImageAssets ?? {}),
    createdAt: now,
    updatedAt: now,
    assetReferences: [],
    fontReferences: [],
  };
}

function collectLegacySharedImageAssets(
  content: TemplateFamilyContentStateV1,
  ...packages: TemplatePackageV1[]
): TemplatePackageV1["assets"] {
  const assets: TemplatePackageV1["assets"] = {};
  for (const value of Object.values(content.values)) {
    if (!value || typeof value !== "object" || value.kind !== "image") continue;
    const asset = packages
      .map((packageValue) => packageValue.assets[value.assetRef])
      .find((candidate) => candidate?.type === "image");
    if (asset) assets[asset.id] = structuredClone(asset);
  }
  return assets;
}

export function createLegacyTemplateFamilyRecord(
  template: SavedTemplateRecord,
): { record: SavedTemplateFamilyRecord; content: TemplateFamilyContentStateV1 } {
  const converted = wrapLegacyTemplatePackageAsFamily({
    templateId: template.id,
    title: template.name,
    sourcePackage: template.originalPackage,
    workingPackage: template.workingPackage,
    source: {
      sourceName: template.source.sourceName,
      figmaUrl: template.source.figmaUrl,
    },
  });
  const record = createSavedTemplateFamilyRecord({
    family: converted.family,
    name: template.name,
    description: template.description,
    sharedImageAssets: collectLegacySharedImageAssets(
      converted.content,
      template.workingPackage,
      template.originalPackage,
    ),
    migratedFromTemplateId: template.id,
  });
  record.createdAt = template.createdAt;
  record.updatedAt = template.updatedAt;
  return { record, content: converted.content };
}

export function createLegacyTemplateFamilyDraftRecord(
  template: SavedTemplateRecord,
  draft: SavedOutputDraftRecord,
): SavedTemplateFamilyDraftRecord {
  if (draft.templateId !== template.id) {
    throw new Error("The legacy draft does not belong to the supplied template.");
  }
  const converted = wrapLegacyTemplatePackageAsFamily({
    templateId: template.id,
    title: template.name,
    sourcePackage: template.originalPackage,
    workingPackage: draft.workingPackage,
    source: {
      sourceName: template.source.sourceName,
      figmaUrl: template.source.figmaUrl,
    },
  });
  const record = createSavedTemplateFamilyDraftRecord({
    family: converted.family,
    content: converted.content,
    selectedVariantId: converted.family.variants[0]?.id,
    name: draft.name,
    sharedImageAssets: collectLegacySharedImageAssets(
      converted.content,
      draft.workingPackage,
      template.workingPackage,
      template.originalPackage,
    ),
  });
  record.id = draft.id;
  record.createdAt = draft.createdAt;
  record.updatedAt = draft.updatedAt;
  record.migratedFromDraftId = draft.id;
  return record;
}

export async function listTemplateFamiliesIncludingLegacy(
  families: import("./publicRepositories").TemplateFamilyRepository = getTemplateFamilyRepository(),
  templates: import("./publicRepositories").TemplateRepository = getTemplateRepository(),
): Promise<SavedTemplateFamilyRecord[]> {
  const familyRecords = await families.listFamilies();
  const migratedLegacyIds = new Set(
    familyRecords.map((record) => record.migratedFromTemplateId).filter(Boolean),
  );
  const familyIds = new Set(familyRecords.map((record) => record.id));
  const legacyRecords = (await templates.listTemplates())
    .filter((template) =>
      !migratedLegacyIds.has(template.id) && !familyIds.has(template.id))
    .map((template) => createLegacyTemplateFamilyRecord(template).record);
  return [...familyRecords, ...legacyRecords]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function listTemplateFamilyDraftsIncludingLegacy(
  families: TemplateFamilyRepository = getTemplateFamilyRepository(),
  templates: TemplateRepository = getTemplateRepository(),
): Promise<SavedTemplateFamilyDraftRecord[]> {
  const [familyDrafts, legacyDrafts, legacyTemplates] = await Promise.all([
    families.listFamilyDrafts(),
    templates.listDrafts(),
    templates.listTemplates(),
  ]);
  const migratedLegacyIds = new Set(
    familyDrafts.map((record) => record.migratedFromDraftId).filter(Boolean),
  );
  const occupiedIds = new Set(familyDrafts.map((record) => record.id));
  const templatesById = new Map(legacyTemplates.map((record) => [record.id, record]));
  const projected = legacyDrafts.flatMap((draft) => {
    if (migratedLegacyIds.has(draft.id) || occupiedIds.has(draft.id)) return [];
    const template = templatesById.get(draft.templateId);
    return template ? [createLegacyTemplateFamilyDraftRecord(template, draft)] : [];
  });
  return [...familyDrafts, ...projected]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function setTemplateRepositoryForTests(
  next: TemplateRepository | null,
): void {
  repository = next;
  familyRepository = null;
}

export function setTemplateFamilyRepositoryForTests(
  next: TemplateFamilyRepository | null,
): void {
  familyRepository = next;
}

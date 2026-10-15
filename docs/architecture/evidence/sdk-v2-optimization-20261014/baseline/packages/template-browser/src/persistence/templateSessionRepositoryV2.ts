import { defaultPlatformMemoryStorage } from "./platformMemory";
import {
  validateTemplatePackageV2,
  type TemplateFieldContentStateV1,
  type TemplatePackageV2,
} from "@sleinity/template-core";
import type {
  TemplateFieldFamilyContentStateV3,
  TemplateFieldFamilyV2,
} from "@sleinity/template-core/family";
import {
  IndexedDbTemplateSessionRepositoryV2,
  InMemoryTemplateSessionRepositoryV2,
} from "./v2SessionRepositories";
import {
  SAVED_TEMPLATE_FIELD_FAMILY_V3_SCHEMA_VERSION,
  SAVED_TEMPLATE_SESSION_V2_SCHEMA_VERSION,
  type SavedTemplateFieldFamilyRecordV3,
  type SavedTemplateSessionRecordV2,
  type TemplateFieldFamilyRepositoryV3,
  type TemplateSessionRepositoryV2,
} from "./types";

let sessionRepository: TemplateSessionRepositoryV2 | null = null;
let familyRepository: TemplateFieldFamilyRepositoryV3 | null = null;

function defaultRepository(): TemplateSessionRepositoryV2 & TemplateFieldFamilyRepositoryV3 {
  return typeof indexedDB === "undefined"
    ? new InMemoryTemplateSessionRepositoryV2(defaultPlatformMemoryStorage)
    : new IndexedDbTemplateSessionRepositoryV2();
}

export function getTemplateSessionRepositoryV2(): TemplateSessionRepositoryV2 {
  if (!sessionRepository) {
    const current = defaultRepository();
    sessionRepository = current;
    familyRepository ??= current;
  }
  return sessionRepository;
}

export function getTemplateFieldFamilyRepositoryV3(): TemplateFieldFamilyRepositoryV3 {
  if (!familyRepository) {
    const current = defaultRepository();
    familyRepository = current;
    sessionRepository ??= current;
  }
  return familyRepository;
}

export function createSavedTemplateSessionV2Record(input: {
  id?: string;
  name: string;
  description?: string;
  basePackage: TemplatePackageV2;
  contentState: TemplateFieldContentStateV1;
  sessionAssets?: TemplatePackageV2["assets"];
  source?: SavedTemplateSessionRecordV2["source"];
}): SavedTemplateSessionRecordV2 {
  const now = new Date().toISOString();
  return {
    schemaVersion: SAVED_TEMPLATE_SESSION_V2_SCHEMA_VERSION,
    id: input.id ?? `template-session-v2:${crypto.randomUUID()}`,
    name: input.name.trim() || input.basePackage.name,
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    basePackage: structuredClone(input.basePackage),
    contentState: structuredClone(input.contentState),
    sessionAssets: structuredClone(input.sessionAssets ?? {}),
    createdAt: now,
    updatedAt: now,
    source: structuredClone(input.source ?? { type: "package-zip" }),
    validation: validateTemplatePackageV2(input.basePackage),
    assetReferences: [],
    fontReferences: [],
  };
}

export function createSavedTemplateFieldFamilyV3Record(input: {
  name?: string;
  description?: string;
  family: TemplateFieldFamilyV2;
  contentState: TemplateFieldFamilyContentStateV3;
  selectedVariantId: string;
  sessionAssets?: TemplatePackageV2["assets"];
}): SavedTemplateFieldFamilyRecordV3 {
  const now = new Date().toISOString();
  return {
    schemaVersion: SAVED_TEMPLATE_FIELD_FAMILY_V3_SCHEMA_VERSION,
    id: input.family.id,
    name: input.name?.trim() || input.family.title,
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    family: structuredClone(input.family),
    contentState: structuredClone(input.contentState),
    selectedVariantId: input.selectedVariantId,
    sessionAssets: structuredClone(input.sessionAssets ?? {}),
    createdAt: now,
    updatedAt: now,
    assetReferences: [],
    fontReferences: [],
  };
}

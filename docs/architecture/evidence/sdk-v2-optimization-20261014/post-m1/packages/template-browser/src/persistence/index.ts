/** Current V2 records, native repositories and template-scoped recovery. */
export { SAVED_TEMPLATE_SESSION_V2_SCHEMA_VERSION, SAVED_TEMPLATE_FIELD_FAMILY_V3_SCHEMA_VERSION, type SavedTemplateSourceMetadata, type SavedTemplateSessionRecordV2, type SavedTemplateFieldFamilyRecordV3, type TemplateSessionRepositoryV2, type TemplateFieldFamilyRepositoryV3, type SavedAssetRecord, type IncompatibleSavedWorkRecord } from "./types";
export { createSavedAssetRecord, collectSavedAssets, collectSavedAssetMap, stripRuntimeAssetUrls } from "./assetRepository";
export { normalizeSavedTemplateSessionV2Record, normalizeSavedTemplateFieldFamilyV3Record, validateCurrentSavedTemplateSessionV2Record, validateCurrentSavedTemplateFieldFamilyV3Record } from "./savedRecordValidationV2";
export * from "./persistenceSubmission";
export * from "../storage/indexedDb";
export * from "./templateSessionRepositoryV2";
export * from "./v2SessionRepositories";
export * from "./templateRecovery";
export * from "./semanticRendererMvpMigration";

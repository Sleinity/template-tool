/** Historical test adapter only. Never an SDK build entry. */
/** Browser-only runtime services. Studio panels and React renderers are not exported. */
export * from "../src/assets";
export * from "../src/persistence";
export * from "../src/export/index";
export * from "../src/fonts/fontBinaryMetadata";
export * from "../src/fonts/fontIdentity";
export * from "../src/fonts/fontMatching";
export * from "../src/fonts/exactFontSetup";
export * from "../src/fonts/fontRegistry";
export * from "../src/fonts/fontRegistryTypes";
export * from "../src/fonts/indexedDbFontRegistry";
export * from "../src/fonts/inMemoryFontRegistry";
export * from "../src/fonts/managedFontAssets";
export * from "../src/fonts/managedFontRecord";
export * from "../src/fonts/runtimeFontSignature";
export * from "../src/enrichment/captureTemplatePackagePreview";
export * from "../src/editor/textMeasurement";
export * from "../src/import/index";
export * from "../src/session/index";
export * from "../src/enrichment";
export {
  createTextFitResult,
  type FieldTextFitResult,
  type TextFitMeasurement,
} from "../src/internal/core";
export { measureTextFieldFit } from "../src/editor/textMeasurement";

export * from "./legacyImporter";
export * from "../src/persistence/types";
export * from "./legacy/persistence/templateRepository";
export * from "./legacy/persistence/inMemoryTemplateRepository";
export * from "./legacy/persistence/indexedDbTemplateRepository";
export * from "./legacy/persistence/savedRecordValidation";
export * from "../src/persistence/draftAutosaveCoordinator";
export * from "./legacy/session/templateSession";
export { TEMPLATE_FAMILY_SESSION_SCHEMA_VERSION, type TemplateFamilySessionStatus, type TemplateFamilySessionErrorV1, type TemplateFamilySessionSnapshotV1, type TemplateFamilySessionLoadInputV1, type TemplateFamilySessionMutationResultV1, type TemplateFamilySessionSaveOptionsV1 } from "./legacy/session/templateFamilySession";
export * from "./legacy/session/publicFamilySession";

export * from "./legacyAssetHydration";

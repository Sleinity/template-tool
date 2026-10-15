/** Historical test adapter only. Never an SDK build entry. */
/**
 * Supported framework-neutral SDK surface.
 *
 * These exports deliberately exclude persistence, font registration, browser
 * measurement, React components, and Studio UI. Package/source/validation
 * contracts are physically owned here; later families remain compatibility
 * bridges during the behavior-preserving migration.
 */
export * from "../src/types/index";
export * from "../src/packageDiagnostics";
export * from "../src/packageAssetSafety";
export * from "../src/fieldValuesV2";
export * from "../src/fieldValidationV2";
export * from "../src/fieldSemanticKernelV2";
export * from "../src/templateFieldContentV2";
export * from "../src/materializeTemplateFieldContentV2";
export * from "../src/migrateTemplatePackage";
export * from "../src/normalizeTemplatePackageV2";
export * from "../src/parseTemplatePackage";
export * from "../src/parseTemplatePackageV2";
export * from "../src/migrateTemplatePackageV2_1";
export * from "../src/validateTemplatePackage";
export * from "../src/validateTemplatePackageV2";
export * from "../src/validateTemplateFieldContentStateV1";
export * from "../src/bundle/types";
export * from "../src/bundle/zipBundleReader";
export * from "../src/bundle/sourceContract";
export * from "../src/bundle/normalizeTemplatePackageBundle";
export * from "../src/bundle/loadTemplatePackageBundleSource";
export * from "./importTemplatePackage";
export * from "../src/scene/index";
export * from "../src/resolved/index";
export * from "../src/editor/packageEditorSession";
export * from "../src/editor/packageFieldRules";
export {
  clearTemplatePackageImageOverride,
  getEffectiveEditableFields,
  getPackageEditorFieldTargetStatuses,
  getPackageEditorFieldWarnings,
  getPackageFieldOverrideValue,
  getPackageFieldValue,
  packageWithEffectiveEditableFields,
  replaceTemplatePackageImage,
  restoreImportedPackageForEditing,
  setTemplatePackageImageReplacementMode,
  updateTemplatePackageField,
  type PackageEditorFieldTargetStatus,
  type PackageEditorFieldWarning,
  type PackageFieldUpdateOptions,
  type PackageFieldUpdateResult,
  type PackageImageActivePlacementState,
} from "../src/editor/packageFieldBindings";

export * from "../src/editor/packageFieldBindings";
export * from "../src/editor/packageEditorSession";
export * from "../src/editor/packageFieldRules";
export * from "../src/editor/packageFieldRuleValidation";
export * from "../src/family/index";

export { loadHistoricalTemplatePackageBundleSource as loadTemplatePackageBundleSource } from "../src/bundle/loadTemplatePackageBundleSource";

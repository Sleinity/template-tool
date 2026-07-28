/**
 * Supported framework-neutral SDK surface.
 *
 * These exports deliberately exclude persistence, font registration, browser
 * measurement, React components, and Studio UI. Package/source/validation
 * contracts are physically owned here; later families remain compatibility
 * bridges during the behavior-preserving migration.
 */
export * from "./types";
export * from "./packageDiagnostics";
export * from "./packageAssetSafety";
export * from "./migrateTemplatePackage";
export * from "./parseTemplatePackage";
export * from "./validateTemplatePackage";
export * from "./bundle/types";
export * from "./bundle/zipBundleReader";
export * from "./bundle/sourceContract";
export * from "./bundle/normalizeTemplatePackageBundle";
export * from "./bundle/loadTemplatePackageBundleSource";
export * from "./importTemplatePackage";
export * from "../../../src/template-package/scene";
export * from "./resolved";
export * from "./editor/packageEditorSession";
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
} from "./editor/packageFieldBindings";

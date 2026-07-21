/**
 * Supported framework-neutral SDK surface.
 *
 * These exports deliberately exclude persistence, font registration, browser
 * measurement, React components, and Studio UI. The implementation is bundled
 * from the proven renderer source during this behavior-preserving extraction.
 */
export * from "../../../src/template-package/types";
export * from "../../../src/template-package/packageDiagnostics";
export * from "../../../src/template-package/packageAssetSafety";
export * from "../../../src/template-package/migrateTemplatePackage";
export * from "../../../src/template-package/parseTemplatePackage";
export * from "../../../src/template-package/validateTemplatePackage";
export * from "../../../src/template-package/bundle/types";
export * from "../../../src/template-package/bundle/zipBundleReader";
export * from "../../../src/template-package/bundle/sourceContract";
export * from "../../../src/template-package/bundle/normalizeTemplatePackageBundle";
export * from "../../../src/template-package/bundle/loadTemplatePackageBundleSource";
export * from "./importTemplatePackage";
export * from "../../../src/template-package/scene";
export * from "../../../src/template-package/resolved";
export * from "../../../src/template-package/backend-decision";
export * from "../../../src/template-package/editor/packageEditorSession";
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
} from "../../../src/template-package/editor/packageFieldBindings";

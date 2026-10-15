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
export * from "./fieldValuesV2";
export * from "./fieldValidationV2";
export * from "./fieldSemanticKernelV2";
export * from "./templateFieldContentV2";
export * from "./materializeTemplateFieldContentV2";
export * from "./normalizeTemplatePackageV2";
export * from "./parseTemplatePackage";
export * from "./parseTemplatePackageV2";
export * from "./validateTemplatePackage";
export * from "./validateTemplatePackageV2";
export * from "./validateTemplateFieldContentStateV1";
export * from "./bundle/types";
export * from "./bundle/zipBundleReader";
export * from "./bundle/sourceContract";
export * from "./bundle/normalizeTemplatePackageBundle";
export { loadTemplatePackageBundleSource, type LoadedTemplatePackageSource, type LoadedTemplatePackageSourceFileReference, type LoadedTemplatePackageSourceFiles } from "./bundle/loadTemplatePackageBundleSource";
export * from "./scene";
export * from "./resolved";
export { getEffectiveEditableFields, getPackageEditorFieldTargetStatuses, getPackageEditorFieldWarnings, getPackageFieldValue, getPackageFieldOverrideValue, type PackageEditorFieldTargetStatus, type PackageEditorFieldWarning } from "./editor/packageFieldBindings";

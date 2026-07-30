/**
 * Build-time bridge for core-owned implementation details that are deliberately
 * not part of the public template-core contract. Browser production modules
 * import this package-local seam; package builds must inline it so no internal
 * source path reaches declarations or archives.
 */
export {
  fontUsesPlatformEmojiFallback,
  textFaceCoverageCharacters,
} from "../../../template-core/src/resolved/fontCharacterCoverage";
export {
  createTextFitResult,
  validatePackageFieldConstraints,
  type FieldConstraintIssue,
  type FieldConstraintValidation,
  type FieldTextFitResult,
  type TextFitMeasurement,
} from "../../../template-core/src/editor/fieldConstraints";
export { getPackageMotionSummary } from "../../../template-core/src/motion/packageMotion";
export {
  parseFigmaUrl,
  type FigmaUrlParseResult,
  type ParsedFigmaUrl,
} from "../../../template-core/src/enrichment/parseFigmaUrl";
export {
  canonicalPackageAssetId,
  resolvePackageAssetReference,
  type ResolvedPackageAsset,
  type ResolvedPackageAssetStatus,
} from "../../../template-core/src/assets/packageAssetResolution";
export type {
  BundleAssetManifestEntry,
  TemplateAssetBridge,
} from "../../../template-core/src/bundle/assetRegistry";

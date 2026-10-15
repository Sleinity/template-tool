/** Supported portable font requirement and character-coverage contract. */
export {
  collectResolvedFontRequirements,
  collectTemplatePackageFontRequirements,
  checkResolvedFontReadiness,
  type FontFaceSetLike,
  type FontReadinessEntry,
  type FontReadinessReport,
  type FontRequirement,
} from "./resolved/fontReadiness";
export * from "./resolved/fontCharacterCoverage";

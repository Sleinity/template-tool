/** Historical test adapter only. */
/** Recommended headless template-import workflow contract. */
export * from "../src/import/templateImportValidation";
export * from "../src/import/layeredSourceDiagnostics";
export * from "../src/import/templateImportIntegrity";
export * from "./legacy/import/templateImportWizard";
export * from "../src/import/templateCreationGate";
export * from "./legacy/import/templateFamilyReimport";
export * from "../src/import/templateReimportV2";
export * from "./legacy/import/templateFamilyImportWizard";
export * from "./legacy/import/runTemplatePackageImportPipeline";
export {
  runTemplatePackageImportPipelineV2,
  type TemplatePackageImportPipelineInputV2,
  type TemplatePackageImportResultV2,
  type TemplatePackageImportFailureV2,
} from "../src/import/runTemplatePackageImportPipelineV2";
export {
  formatRequiredFontFace,
  type ExactFontSetupErrorCode,
} from "../src/fonts/exactFontSetup";

export { appendTemplateSourcesV2, mutateTemplateFamilyV2, createTemplateFieldFamilyFromSourcesV2, type TemplateImportSourceV2, type TemplateFamilyMutationV2 } from "../src/import/templateSourceAssemblyV2";

export * from "./legacy/import/templateImportCompatibility";

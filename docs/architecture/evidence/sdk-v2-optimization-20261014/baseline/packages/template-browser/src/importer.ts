/** Recommended headless template-import workflow contract. */
export * from "./import/templateImportValidation";
export * from "./import/layeredSourceDiagnostics";
export * from "./import/templateImportIntegrity";
export * from "./import/templateImportWizard";
export * from "./import/templateCreationGate";
export * from "./import/templateFamilyReimport";
export * from "./import/templateReimportV2";
export * from "./import/templateFamilyImportWizard";
export * from "./import/runTemplatePackageImportPipeline";
export {
  runTemplatePackageImportPipelineV2,
  type TemplatePackageImportPipelineInputV2,
  type TemplatePackageImportResultV2,
  type TemplatePackageImportFailureV2,
} from "./import/runTemplatePackageImportPipelineV2";
export {
  formatRequiredFontFace,
  type ExactFontSetupErrorCode,
} from "./fonts/exactFontSetup";

export { appendTemplateSourcesV2, mutateTemplateFamilyV2, createTemplateFieldFamilyFromSourcesV2, type TemplateImportSourceV2, type TemplateFamilyMutationV2 } from "./import/templateSourceAssemblyV2";

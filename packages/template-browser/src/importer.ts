/** V2 ZIP import, authoring and read-only source diagnostics. */
export * from "./import/templateImportValidation";
export * from "./import/layeredSourceDiagnostics";
export * from "./import/templateReimportV2";
export { runTemplatePackageImportPipelineV2, type TemplatePackageImportPipelineInputV2, type TemplatePackageImportResultV2, type TemplatePackageImportFailureV2 } from "./import/runTemplatePackageImportPipelineV2";
export { appendTemplateSourcesV2, mutateTemplateFamilyV2, createTemplateFieldFamilyFromSourcesV2, type TemplateImportSourceV2, type TemplateFamilyMutationV2 } from "./import/templateSourceAssemblyV2";
export { formatRequiredFontFace, type ExactFontSetupErrorCode } from "./fonts/exactFontSetup";

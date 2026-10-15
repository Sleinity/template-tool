import type { TemplatePackageValidationResult } from "../packageDiagnostics";
import type { TemplatePackageV1 } from "../types";

export interface TemplatePackageEditorSession {
  savedTemplateId?: string;
  draftId?: string;
  originalPackage: TemplatePackageV1;
  workingPackage: TemplatePackageV1;
  validation: TemplatePackageValidationResult;
  templateName?: string;
  description?: string;
}

export function canOpenTemplatePackageEditor(
  packageValue: TemplatePackageV1 | null,
  validation: TemplatePackageValidationResult | null,
): packageValue is TemplatePackageV1 {
  return Boolean(packageValue && validation?.valid);
}

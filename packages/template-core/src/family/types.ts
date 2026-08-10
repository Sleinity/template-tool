import type {
  EditableFieldBinding,
  PackageEditableFieldType,
  PackageEditableValue,
  PackageFieldBehavior,
  PackageImageAsset,
  PackageImageFieldConstraints,
  PackageTextFieldConstraints,
  TemplatePackageV1,
} from "../types";

export const TEMPLATE_FAMILY_SCHEMA_VERSION = "template-family-v1" as const;
export const TEMPLATE_FAMILY_CONTENT_SCHEMA_VERSION =
  "template-family-content-v1" as const;
export const TEMPLATE_FAMILY_VALIDATION_SCHEMA_VERSION =
  "template-family-validation-v1" as const;

export type TemplateFamilyIdKind =
  | "family"
  | "field"
  | "variant"
  | "group"
  | "option";

export type TemplateFamilyIdFactoryV1 = (
  kind: TemplateFamilyIdKind,
  seed: string,
) => string;

export interface TemplateFamilyFieldRuleV1 {
  constraints?: PackageTextFieldConstraints | PackageImageFieldConstraints;
  behavior?: PackageFieldBehavior;
}

type NullablePatch<T> = {
  [Key in keyof T]?: T[Key] | null;
};

export type TemplateFamilyConstraintOverrideV1 =
  | NullablePatch<PackageTextFieldConstraints>
  | NullablePatch<PackageImageFieldConstraints>;

export interface TemplateFamilyFieldRuleOverrideV1 {
  constraints?: TemplateFamilyConstraintOverrideV1 | null;
  behavior?: NullablePatch<PackageFieldBehavior> | null;
}

export type TemplateFamilyRuleAuthorityV1 =
  | "family"
  | "variant"
  | "cleared";

export interface TemplateFamilyRuleProvenanceV1 {
  constraints: Record<string, TemplateFamilyRuleAuthorityV1>;
  behavior: Record<string, TemplateFamilyRuleAuthorityV1>;
}

export interface ResolvedTemplateFamilyFieldRuleV1 {
  rule: TemplateFamilyFieldRuleV1;
  provenance: TemplateFamilyRuleProvenanceV1;
}

export interface TemplateFamilyFieldV1 {
  id: string;
  key: string;
  title: string;
  type: PackageEditableFieldType;
  defaultValue: TemplateFamilyContentValueV1;
  rule: TemplateFamilyFieldRuleV1;
}

export interface TemplateFamilyFieldTargetV1 {
  fieldId: string;
  nodeId: string;
  property: string;
}

export interface TemplateFamilyVariantFieldBindingV1 {
  familyFieldId: string;
  targets: TemplateFamilyFieldTargetV1[];
}

export interface TemplateFamilyVariantSourceV1 {
  type: "package-zip";
  sourceName?: string;
  figmaUrl?: string;
  importedAt?: string;
  packageDigest?: string;
}

export interface TemplateFamilyVariantV1 {
  id: string;
  title: string;
  packageValue: TemplatePackageV1;
  source: TemplateFamilyVariantSourceV1;
  bindings: TemplateFamilyVariantFieldBindingV1[];
  ruleOverrides: Record<string, TemplateFamilyFieldRuleOverrideV1>;
  groupAssignments: Record<string, string>;
}

export interface TemplateVariantGroupOptionV1 {
  id: string;
  title: string;
}

export interface TemplateVariantGroupV1 {
  id: string;
  title: string;
  options: TemplateVariantGroupOptionV1[];
}

export interface TemplateFamilyV1 {
  schemaVersion: typeof TEMPLATE_FAMILY_SCHEMA_VERSION;
  id: string;
  title: string;
  fields: TemplateFamilyFieldV1[];
  variants: TemplateFamilyVariantV1[];
  variantGroups: TemplateVariantGroupV1[];
}

export interface TemplateFamilyImageValueV1 {
  kind: "image";
  assetRef: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  placementState?: "replacement-fill" | "replacement-fit";
}

export type TemplateFamilyContentValueV1 =
  | PackageEditableValue
  | TemplateFamilyImageValueV1;

export interface TemplateFamilyContentStateV1 {
  schemaVersion: typeof TEMPLATE_FAMILY_CONTENT_SCHEMA_VERSION;
  familyId: string;
  revision: number;
  values: Record<string, TemplateFamilyContentValueV1>;
}

export interface TemplateFamilyContentMutationIssueV1 {
  code:
    | "family.content-family-mismatch"
    | "family.content-field-missing"
    | "family.content-type-invalid";
  message: string;
  fieldId?: string;
}

export interface TemplateFamilyContentMutationResultV1 {
  applied: boolean;
  content: TemplateFamilyContentStateV1;
  issue?: TemplateFamilyContentMutationIssueV1;
}

export interface TemplateFamilyIssueV1 {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  familyId: string;
  fieldId?: string;
  variantId?: string;
  groupId?: string;
  optionId?: string;
  target?: TemplateFamilyFieldTargetV1;
  rulePath?: string;
  authority?: TemplateFamilyRuleAuthorityV1;
  details?: Record<string, unknown>;
}

export interface TemplateFamilyVariantValidationV1 {
  variantId: string;
  status: "ready" | "warning" | "blocked";
  issues: TemplateFamilyIssueV1[];
}

export interface TemplateFamilyFieldValidationV1 {
  fieldId: string;
  status: "ready" | "warning" | "blocked";
  issues: TemplateFamilyIssueV1[];
}

export interface TemplateFamilyValidationReportV1 {
  schemaVersion: typeof TEMPLATE_FAMILY_VALIDATION_SCHEMA_VERSION;
  familyId: string;
  status: "ready" | "warning" | "blocked";
  definitionValid: boolean;
  contentValid: boolean;
  issues: TemplateFamilyIssueV1[];
  fields: TemplateFamilyFieldValidationV1[];
  variants: TemplateFamilyVariantValidationV1[];
  effectiveRules: Record<
    string,
    Record<string, ResolvedTemplateFamilyFieldRuleV1>
  >;
}

export interface TemplateFamilyVariantSelectionV1 {
  variantId?: string;
  groupSelections: Record<string, string>;
}

export type TemplateFamilyVariantResolutionV1 =
  | { status: "resolved"; variantId: string }
  | { status: "incomplete"; missingGroupIds: string[] }
  | { status: "no-match"; candidateVariantIds: string[] }
  | { status: "ambiguous"; candidateVariantIds: string[] };

export interface TemplateFamilyOptionAvailabilityV1 {
  groupId: string;
  optionId: string;
  available: boolean;
  candidateVariantIds: string[];
}

export type TemplateFamilyFieldMatchConfidenceV1 =
  | "exact"
  | "suggested"
  | "incompatible";

export interface TemplateFamilyFieldMatchCandidateV1 {
  familyFieldId: string;
  target: TemplateFamilyFieldTargetV1;
  confidence: TemplateFamilyFieldMatchConfidenceV1;
  reason: string;
}

export interface TemplateFamilyRuleDifferenceV1 {
  familyFieldId: string;
  target: TemplateFamilyFieldTargetV1;
  rulePath: `constraints.${string}` | `behavior.${string}`;
  familyValue: unknown;
  importedValue: unknown;
}

export interface TemplateFamilyFieldMatchPlanV1 {
  candidates: TemplateFamilyFieldMatchCandidateV1[];
  automaticBindings: TemplateFamilyVariantFieldBindingV1[];
  unmatchedFamilyFieldIds: string[];
  unmatchedTargets: TemplateFamilyFieldTargetV1[];
  ruleDifferences: TemplateFamilyRuleDifferenceV1[];
  suggestedRuleOverrides: Record<string, TemplateFamilyFieldRuleOverrideV1>;
}

export interface TemplateFamilyMaterializationIssueV1 {
  code: string;
  severity: "warning" | "error";
  message: string;
  fieldId?: string;
  variantId: string;
  target?: TemplateFamilyFieldTargetV1;
}

export interface TemplateFamilyMaterializationV1 {
  familyId: string;
  variantId: string;
  contentRevision: number;
  packageValue: TemplatePackageV1;
  effectiveFields: EditableFieldBinding[];
  resolvedRules: Record<string, ResolvedTemplateFamilyFieldRuleV1>;
  issues: TemplateFamilyMaterializationIssueV1[];
}

export interface TemplateFamilyMaterializeOptionsV1 {
  resolveImageAsset?: (
    value: TemplateFamilyImageValueV1,
    target: TemplateFamilyFieldTargetV1,
    packageValue: TemplatePackageV1,
  ) => PackageImageAsset | null;
}

export interface CreateTemplateFamilyFromPackageOptionsV1 {
  familyId: string;
  familyTitle: string;
  variantId: string;
  variantTitle: string;
  packageValue: TemplatePackageV1;
  source?: Partial<TemplateFamilyVariantSourceV1>;
  idFactory: TemplateFamilyIdFactoryV1;
}

export interface WrapLegacyTemplatePackageOptionsV1 {
  templateId: string;
  title: string;
  sourcePackage: TemplatePackageV1;
  workingPackage?: TemplatePackageV1;
  source?: Partial<TemplateFamilyVariantSourceV1>;
}

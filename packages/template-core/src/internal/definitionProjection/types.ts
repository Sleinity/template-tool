import type { TemplateFieldConfigurationV2, TemplateFieldContentStateV1, TemplatePackageV2 } from '../../types';
import type { TemplateFieldFamilyV2, TemplateFieldFamilyContentStateV3, TemplateFieldFamilyVariantV2 } from '../../family/fieldRulesV2';
export type DeepReadonly<T> = 0 extends (1 & T) ? T : T extends object ? {
    readonly [K in keyof T]: DeepReadonly<T[K]>;
} : T;
declare const definitionBrand: unique symbol;
declare const instanceBrand: unique symbol;
export type VariantProjection = DeepReadonly<{
    id: string;
    label?: string;
    sourcePackage: TemplatePackageV2;
    fieldOverrides?: TemplateFieldFamilyVariantV2['fieldOverrides'];
    editableFieldOrder?: readonly string[];
    groupAssignments?: Readonly<Record<string, string>>;
}>;
export type DefinitionProjection = DeepReadonly<{
    readonly [definitionBrand]: true;
    origin: 'single' | 'family';
    id: string;
    title: string;
    fields: readonly TemplateFieldConfigurationV2[];
    editableFieldOrder: readonly string[];
    variants: readonly VariantProjection[];
    variantGroups?: TemplateFieldFamilyV2['variantGroups'];
    editorControlOrder?: TemplateFieldFamilyV2['editorControlOrder'];
}>;
export type InstanceProjection = DeepReadonly<{
    readonly [instanceBrand]: true;
    definitionId: string;
    selectedVariantId: string;
    contentRevision: number;
    values: TemplateFieldContentStateV1['values'];
    sessionAssets: TemplatePackageV2['assets'];
    variantImagePlacements: TemplateFieldFamilyContentStateV3['variantImagePlacements'];
}>;
export type Projection = Readonly<{
    definition: DefinitionProjection;
    instance: InstanceProjection;
}>;
export type ProjectionInput = {
    kind: 'single';
    packageValue: TemplatePackageV2;
    content: TemplateFieldContentStateV1;
    sessionAssets: TemplatePackageV2['assets'];
} | {
    kind: 'family';
    family: TemplateFieldFamilyV2;
    content: TemplateFieldFamilyContentStateV3;
    selectedVariantId: string;
    sessionAssets: TemplatePackageV2['assets'];
};

import { materializeTemplateFieldContentV2, type MaterializeTemplateFieldContentResultV2 } from '../../materializeTemplateFieldContentV2';
import { materializeTemplateFieldFamilyVariantV2, type MaterializeTemplateFieldFamilyVariantResultV2 } from '../../family/fieldRulesV2';
import { reconstructProjection } from './project';
import type { Projection } from './types';
export type ProjectionMaterialization = {
    origin: 'single';
    result: MaterializeTemplateFieldContentResultV2;
} | {
    origin: 'family';
    result: MaterializeTemplateFieldFamilyVariantResultV2;
};
export function materializeProjection(projection: Projection): ProjectionMaterialization {
    const input = reconstructProjection(projection);
    if (input.kind === 'single')
        return { origin: 'single', result: materializeTemplateFieldContentV2({
                ...input.packageValue, assets: { ...input.packageValue.assets, ...input.sessionAssets },
            }, input.content) };
    const family = Object.keys(input.sessionAssets).length ? {
        ...input.family,
        variants: input.family.variants.map(variant => variant.id === input.selectedVariantId ? {
            ...variant, packageValue: { ...variant.packageValue, assets: { ...variant.packageValue.assets, ...input.sessionAssets } },
        } : variant),
    } : input.family;
    return { origin: 'family', result: materializeTemplateFieldFamilyVariantV2(family, input.selectedVariantId, input.content) };
}

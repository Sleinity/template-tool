import { assert, equal, projectionPackage } from './definitionProjection.fixtures';
import { projectDefinitionInstance, reconstructProjection, sourceFields, ProjectionContractError } from '../src/internal/definitionProjection/project';
import { materializeProjection } from '../src/internal/definitionProjection/materialize';
import type { ProjectionInput } from '../src/internal/definitionProjection/types';
import { createTemplateFieldContentStateV1, reconcileTemplateFieldConfigurationV2, setTemplateFieldValueV2, selectTemplateFieldChoiceV2 } from '../src/templateFieldContentV2';
import { materializeTemplateFieldContentV2 as materialize } from '../src/materializeTemplateFieldContentV2';
import { createTemplateFieldFamilyContentStateV3, materializeTemplateFieldFamilyVariantV2, resolveTemplateFieldFamilySelectionV2, type TemplateFieldFamilyV2 } from '../src/family/fieldRulesV2';
function check(input: ProjectionInput) {
    const before = structuredClone(input);
    const projection = projectDefinitionInstance(input);
    equal(reconstructProjection(projection), input, 'roundtrip');
    // Check the public read-only view independently of private reconstruction.
    const expectedFields = input.kind === 'single' ? input.packageValue.editableFields.map(field => {
        const { binding, defaultValue, provenance, ...semantic } = field;
        return semantic;
    }) : input.family.fields;
    equal(projection.definition.fields, expectedFields, 'semantic fields');
    equal(projection.definition.origin, input.kind, 'origin');
    equal(projection.definition.id, input.kind === 'single' ? input.packageValue.packageId : input.family.id, 'definition id');
    equal(projection.definition.title, input.kind === 'single' ? input.packageValue.name : input.family.title, 'title');
    equal(projection.definition.editableFieldOrder, input.kind === 'single' ? input.packageValue.editableFieldOrder : input.family.editableFieldOrder, 'order');
    equal(projection.definition.variants.length, input.kind === 'single' ? 1 : input.family.variants.length, 'variant count');
    for (const key of ['variantGroups', 'editorControlOrder'] as const) {
        assert(Object.prototype.hasOwnProperty.call(projection.definition, key) === (input.kind === 'family' && Object.prototype.hasOwnProperty.call(input.family, key)), `Presence of ${key}`);
        equal(projection.definition[key], input.kind === 'family' ? input.family[key] : undefined, key);
    }
    projection.definition.variants.forEach((variant, index) => {
        if (input.kind === 'single') {
            equal(variant, { id: input.packageValue.packageId, sourcePackage: input.packageValue }, 'single variant view');
        } else {
            const { packageValue, ...metadata } = input.family.variants[index];
            equal(variant, { ...metadata, sourcePackage: packageValue }, 'family variant view');
        }
    });
    equal(projection.instance, {
        definitionId: projection.definition.id,
        selectedVariantId: input.kind === 'single' ? input.packageValue.packageId : input.selectedVariantId,
        contentRevision: input.content.revision,
        values: input.content.values,
        sessionAssets: input.sessionAssets,
        variantImagePlacements: input.kind === 'single' ? {} : input.content.variantImagePlacements,
    }, 'instance view');
    assert(Object.isFrozen(projection.definition.variants[0].sourcePackage.nodes), 'Deep immutable source');
    assert(!('authority' in projection.definition) && !('authority' in projection.instance), 'Authority is private');
    for (const variant of projection.definition.variants) {
        const fields = sourceFields(projection.definition, variant.id);
        fields.forEach((field, index) => {
            equal(field.binding, variant.sourcePackage.editableFields[index].binding, 'binding');
            equal(field.defaultValue, variant.sourcePackage.editableFields[index].defaultValue, 'default');
            const { label, controlRole, configuration, ...sourceOnly } = variant.sourcePackage.editableFields[index];
            equal(field, sourceOnly, 'Source accessor identity, binding, defaults and optional provenance');
        });
    }
    const projected = materializeProjection(projection);
    if (input.kind === 'single') {
        equal(projected.result, materialize({ ...input.packageValue, assets: { ...input.packageValue.assets, ...input.sessionAssets } }, input.content), 'single materialization');
    }
    else {
        const family = structuredClone(input.family);
        const variant = family.variants.find(v => v.id === input.selectedVariantId)!;
        variant.packageValue.assets = { ...variant.packageValue.assets, ...input.sessionAssets };
        equal(projected.result, materializeTemplateFieldFamilyVariantV2(family, input.selectedVariantId, input.content), 'family materialization');
    }
    equal(input, before, 'input unchanged');
    return projection;
}
const pkg = projectionPackage();
pkg.source = { application: 'Projection evidence', exportedAt: undefined };
pkg.diagnostics = [{ code: 'source-note', severity: 'info', message: 'Preserved', details: { nested: [null, { absent: undefined }] } }];
pkg.editableFields[0].provenance = { sourceContract: 'template-package-v2', source: 'descriptor', sourceField: { arbitrary: [1, 'x', null] }, normalization: [] };
const visibility = pkg.editableFields.find(f => f.type === 'boolean')!;
visibility.binding.additionalNodeIds = ['58:58'];
let content = createTemplateFieldContentStateV1(pkg);
check({ kind: 'single', packageValue: pkg, content, sessionAssets: {} });
const mutations: [
    string,
    string | number | boolean
][] = [['text:title', 'Hello'], ['textarea:body', 'One\nTwo'], ['number:amount', 42], ['date:date', '2026-12-01'], ['color:color', '#112233'], ['boolean:visible', false]];
for (const [fieldId, value] of mutations) {
    const restored = reconstructProjection(check({ kind: 'single', packageValue: pkg, content, sessionAssets: {} }));
    assert(restored.kind === 'single', 'Single reconstruction');
    const direct = setTemplateFieldValueV2(pkg, content, fieldId, value);
    equal(setTemplateFieldValueV2(restored.packageValue, restored.content, fieldId, value), direct, 'mutation');
    assert(direct.accepted, `Accepted ${fieldId}`);
    content = direct.state;
}
content = selectTemplateFieldChoiceV2(pkg, content, 'text:title', 'primary').state;
for (const change of ['replace', 'remove', 'duplicate'] as const) {
    const changed = structuredClone(pkg);
    const field = changed.editableFields.find(f => f.type === 'text')!;
    field.configuration.choices = change === 'remove' ? undefined : { mode: 'suggested', options: [{ id: 'primary', value: 'New' }, { id: 'same', value: change === 'duplicate' ? 'New' : 'Other' }] };
    const input = { kind: 'single' as const, packageValue: changed, content, sessionAssets: {} };
    const restored = reconstructProjection(check(input));
    assert(restored.kind === 'single', 'Single reconstruction');
    const reconcile = (p: typeof changed, c: typeof content) => { try {
        return { state: reconcileTemplateFieldConfigurationV2(p, c) };
    }
    catch (error) {
        return { error: (error as Error).message };
    } };
    equal(reconcile(restored.packageValue, restored.content), reconcile(changed, content), 'choice reconciliation');
}
const blocked = { ...content, values: { ...content.values, 'number:amount': { value: 999 } } };
check({ kind: 'single', packageValue: pkg, content: blocked, sessionAssets: {} });
const family: TemplateFieldFamilyV2 = {
    schemaVersion: 'template-field-family-v2', id: 'projection-family', title: 'Projection',
    fields: pkg.editableFields.map(({ id, type, label, controlRole, configuration }) => ({ id, type, label, controlRole, configuration })) as TemplateFieldFamilyV2['fields'],
    editableFieldOrder: [...pkg.editableFieldOrder].reverse(),
    variants: [
        { id: 'a', label: undefined, packageValue: pkg, groupAssignments: { size: 'square' } },
        { id: 'b', packageValue: { ...structuredClone(pkg), packageId: 'b', editableFields: pkg.editableFields.filter(f => f.id !== 'text:title'), editableFieldOrder: pkg.editableFieldOrder.filter(id => id !== 'text:title') }, groupAssignments: { size: 'portrait' }, fieldOverrides: { 'textarea:body': { type: 'textarea', label: null, controlRole: null, configuration: { maxLines: 1, warningAtLines: null } } } },
    ],
    variantGroups: [{ id: 'size', title: 'Size', options: [{ id: 'square', title: 'Square' }, { id: 'portrait', title: 'Portrait' }] }],
};
let familyContent = { ...createTemplateFieldFamilyContentStateV3(family), values: content.values, revision: content.revision };
const image = pkg.editableFields.find(f => f.type === 'image')!;
assert(image.defaultValue.assetId, 'Image fixture');
for (const mode of ['fill', 'fit', 'crop'] as const) {
    const placement = mode === 'crop' ? { mode, crop: { schemaVersion: 'normalized-image-crop-v1' as const, coordinateSpace: 'normalized-slot-to-normalized-source' as const, transform: [[0.8, 0, 0.1], [0, 0.9, 0.05]] as [
                [
                    number,
                    number,
                    number
                ],
                [
                    number,
                    number,
                    number
                ]
            ] } } : { mode };
    familyContent = { ...familyContent, values: { ...familyContent.values, 'image:hero': { value: { assetId: image.defaultValue.assetId, placement: { mode: 'fill' } } } }, variantImagePlacements: { b: { 'image:hero': placement } } };
    for (const selectedVariantId of ['a', 'b'])
        check({ kind: 'family', family, content: familyContent, selectedVariantId, sessionAssets: { [image.defaultValue.assetId]: { ...pkg.assets[image.defaultValue.assetId], width: 543 } } });
}
for (const groupSelections of ([{}, { size: 'square' }, { size: 'missing' }] as Record<string, string>[])) {
    const restored = reconstructProjection(check({ kind: 'family', family, content: familyContent, selectedVariantId: 'a', sessionAssets: {} }));
    assert(restored.kind === 'family', 'Family reconstruction');
    equal(resolveTemplateFieldFamilySelectionV2(restored.family, { groupSelections }), resolveTemplateFieldFamilySelectionV2(family, { groupSelections }), 'selector');
}
const ambiguous = structuredClone(family);
ambiguous.variants[1].groupAssignments = { size: 'square' };
const ambiguousRestored = reconstructProjection(check({ kind: 'family', family: ambiguous, content: familyContent, selectedVariantId: 'a', sessionAssets: {} }));
assert(ambiguousRestored.kind === 'family', 'Family reconstruction');
equal(resolveTemplateFieldFamilySelectionV2(ambiguousRestored.family, { groupSelections: { size: 'square' } }), resolveTemplateFieldFamilySelectionV2(ambiguous, { groupSelections: { size: 'square' } }), 'ambiguous selector');
const mutable = structuredClone(pkg);
const projection = check({ kind: 'single', packageValue: mutable, content, sessionAssets: {} });
mutable.name = 'Changed outside';
assert(projection.definition.title !== mutable.name, 'Detached snapshot');
const detached = reconstructProjection(projection);
if (detached.kind === 'single')
    detached.packageValue.name = 'Changed reconstruction';
assert(projection.definition.title !== 'Changed reconstruction', 'Detached reconstruction');
for (const action of [
    () => projectDefinitionInstance({ kind: 'single', packageValue: pkg, content: { ...content, packageId: 'wrong' }, sessionAssets: {} }),
    () => reconstructProjection({ definition: projection.definition, instance: projectDefinitionInstance({ kind: 'single', packageValue: pkg, content, sessionAssets: {} }).instance }),
]) {
    let failed = false;
    try {
        action();
    }
    catch (error) {
        failed = error instanceof ProjectionContractError;
    }
    assert(failed, 'Explicit projection mismatch');
}
console.log('Definition projection Core equivalence passed.');
// Additional boundaries: one-variant Family remains a Family, and explicit
// clears/order/atomic collections remain distinct from omitted overrides.
const configured = structuredClone(family);
configured.variants = [configured.variants[0]];
delete configured.variantGroups;
delete configured.variants[0].groupAssignments;
configured.editorControlOrder = configured.editableFieldOrder.map(fieldId => ({ kind: 'field', fieldId }));
configured.variants[0].editableFieldOrder = [...pkg.editableFieldOrder];
configured.variants[0].fieldOverrides = {
    'text:title': { type: 'text', configuration: { choices: { mode: 'suggested', options: [{ id: 'local', value: 'Local' }] } } },
    'textarea:body': { type: 'textarea', configuration: { maxLines: null, warningAtLines: 2 } },
};
check({ kind: 'family', family: configured, content: createTemplateFieldFamilyContentStateV3(configured), selectedVariantId: 'a', sessionAssets: {} });
const warningOnly = structuredClone(pkg);
const body = warningOnly.editableFields.find(f => f.type === 'textarea')!;
delete body.configuration.maxLines;
body.configuration.warningAtLines = 1;
check({ kind: 'single', packageValue: warningOnly, content, sessionAssets: {} });
const singularCrop = { mode: 'crop' as const, crop: { schemaVersion: 'normalized-image-crop-v1' as const, coordinateSpace: 'normalized-slot-to-normalized-source' as const, transform: [[0, 0, 0], [0, 0, 0]] as [
            [
                number,
                number,
                number
            ],
            [
                number,
                number,
                number
            ]
        ] } };
check({ kind: 'single', packageValue: pkg, content: { ...content, values: { ...content.values, 'image:hero': { value: { assetId: image.defaultValue.assetId, placement: singularCrop } } } }, sessionAssets: {} });
check({ kind: 'family', family, content: { ...familyContent, variantImagePlacements: { b: { 'image:hero': singularCrop } } }, selectedVariantId: 'b', sessionAssets: {} });
const malformed = { ...pkg, editableFields: null };
let malformedError: unknown;
try {
    projectDefinitionInstance({ kind: 'single', packageValue: malformed as unknown as typeof pkg, content, sessionAssets: {} });
}
catch (error) {
    malformedError = error;
}
assert(malformedError instanceof ProjectionContractError, 'Malformed structure gets an explicit contract error');
// Compile-time guards must reject caller-created or writable projections.
if (false) {
    // @ts-expect-error constructor brand is private
    const forged: typeof projection.definition = { origin: 'single', id: 'x', title: 'x', fields: [], editableFieldOrder: [], variants: [] };
    // @ts-expect-error nested source data is read-only
    projection.definition.variants[0].sourcePackage.name = 'write';
    void forged;
}

for (const invalid of [[], 'invalid', 1, null]) {
    for (const key of ['sessionAssets', 'values', 'variantImagePlacements'] as const) {
        const input: unknown = {
            kind: 'family', family, selectedVariantId: 'a',
            content: { ...familyContent, ...(key !== 'sessionAssets' ? { [key]: invalid } : {}) },
            sessionAssets: key === 'sessionAssets' ? invalid : {},
        };
        let error: unknown;
        try { projectDefinitionInstance(input as ProjectionInput); } catch (caught) { error = caught; }
        assert(error instanceof ProjectionContractError, `Reject malformed ${key}`);
    }
}
for (const malformed of [{ sessionAssets: { bad: [] } }, { content: { ...content, values: { bad: 'invalid' } } }]) {
    let error: unknown;
    try { projectDefinitionInstance({ kind: 'single', packageValue: pkg, content, sessionAssets: {}, ...malformed } as unknown as ProjectionInput); } catch (caught) { error = caught; }
    assert(error instanceof ProjectionContractError, 'Reject malformed record entries');
}

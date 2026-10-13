import type { EditableFieldDefinitionV2, TemplateFieldConfigurationV2 } from '../../types';
import type { DeepReadonly, DefinitionProjection, InstanceProjection, Projection, ProjectionInput } from './types';
/** Private authority is never exposed through the read-only architectural views. */
const definitions = new WeakMap<DefinitionProjection, ProjectionInput>();
const instances = new WeakMap<InstanceProjection, DefinitionProjection>();
export class ProjectionContractError extends Error {
    constructor(message: string) { super(message); this.name = 'ProjectionContractError'; }
}
function freeze<T>(value: T): T {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.values(value).forEach(freeze);
        Object.freeze(value);
    }
    return value;
}
// Reject data that structuredClone would silently reinterpret or omit. Canonical
// records are plain data; undefined own properties and array order are retained.
function assertPlainData(value: unknown, ancestors = new Set<object>()): void {
    if (value === null || typeof value !== 'object') {
        if (['function', 'symbol', 'bigint'].includes(typeof value))
            throw new ProjectionContractError('Unsupported non-canonical data.');
        return;
    }
    if (ancestors.has(value))
        throw new ProjectionContractError('Cyclic canonical data is unsupported.');
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) {
        throw new ProjectionContractError('Canonical data must use plain objects.');
    }
    ancestors.add(value);
    for (const key of Reflect.ownKeys(value)) {
        if (Array.isArray(value) && key === 'length')
            continue;
        const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
        if (typeof key === 'symbol' || !descriptor.enumerable || !('value' in descriptor))
            throw new ProjectionContractError('Unsupported canonical property descriptor.');
        assertPlainData(descriptor.value, ancestors);
    }
    ancestors.delete(value);
}
function optional<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Pick<T, K> {
    return Object.fromEntries(keys.filter(key => Object.prototype.hasOwnProperty.call(source, key)).map(key => [key, source[key]])) as Pick<T, K>;
}
export function projectDefinitionInstance(input: ProjectionInput): Projection {
    try {
        return projectChecked(input);
    }
    catch (error) {
        if (error instanceof ProjectionContractError)
            throw error;
        throw new ProjectionContractError(`Unsupported projection structure: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function record(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function recordMap(value: unknown): value is Record<string, Record<string, unknown>> {
    return record(value) && Object.values(value).every(record);
}
function projectChecked(input: ProjectionInput): Projection {
    assertPlainData(input);
    if (!input || (input.kind !== 'single' && input.kind !== 'family'))
        throw new ProjectionContractError('Unknown projection input.');
    if (!recordMap(input.sessionAssets) || !record(input.content) || !recordMap(input.content.values) || !Number.isSafeInteger(input.content.revision) || input.content.revision < 0)
        throw new ProjectionContractError('Unsupported instance envelope.');
    if (input.kind === 'single') {
        if (input.packageValue?.schemaVersion !== '2.2' || input.content.schemaVersion !== 'template-field-content-v1' || input.content.packageSchemaVersion !== '2.2' || input.content.packageId !== input.packageValue.packageId)
            throw new ProjectionContractError('Single definition/content mismatch.');
    }
    else if (input.family?.schemaVersion !== 'template-field-family-v2' || input.content.schemaVersion !== 'template-field-family-content-v3' || input.content.familyId !== input.family.id || !record(input.content.variantImagePlacements) || !Object.values(input.content.variantImagePlacements).every(recordMap) || !input.family.variants.some(v => v.id === input.selectedVariantId)) {
        throw new ProjectionContractError('Family definition/content/selection mismatch.');
    }
    const packages = input.kind === 'single' ? [input.packageValue] : input.family.variants.map(v => v.packageValue);
    if (packages.some(pkg => pkg.schemaVersion !== '2.2' || !Array.isArray(pkg.editableFields) || !Array.isArray(pkg.editableFieldOrder)))
        throw new ProjectionContractError('Unsupported source package structure.');
    if (input.kind === 'family' && (!Array.isArray(input.family.fields) || !Array.isArray(input.family.editableFieldOrder)))
        throw new ProjectionContractError('Unsupported Family structure.');
    const snapshot = freeze(structuredClone(input));
    const single = snapshot.kind === 'single';
    const fields = single ? snapshot.packageValue.editableFields.map(field => optional(field, ['id', 'type', 'label', 'controlRole', 'configuration']) as TemplateFieldConfigurationV2) : snapshot.family.fields;
    const variants = single ? [{ id: snapshot.packageValue.packageId, sourcePackage: snapshot.packageValue }] : snapshot.family.variants.map(variant => ({
        id: variant.id, sourcePackage: variant.packageValue,
        ...optional(variant, ['label', 'fieldOverrides', 'editableFieldOrder', 'groupAssignments']),
    }));
    const definition = freeze({
        origin: snapshot.kind,
        id: single ? snapshot.packageValue.packageId : snapshot.family.id,
        title: single ? snapshot.packageValue.name : snapshot.family.title,
        fields, editableFieldOrder: single ? snapshot.packageValue.editableFieldOrder : snapshot.family.editableFieldOrder,
        variants,
        ...(!single ? optional(snapshot.family, ['variantGroups', 'editorControlOrder']) : {}),
    }) as unknown as DefinitionProjection;
    const instance = freeze({
        definitionId: definition.id,
        selectedVariantId: single ? snapshot.packageValue.packageId : snapshot.selectedVariantId,
        contentRevision: snapshot.content.revision,
        values: snapshot.content.values,
        sessionAssets: snapshot.sessionAssets,
        variantImagePlacements: single ? {} : snapshot.content.variantImagePlacements,
    }) as unknown as InstanceProjection;
    definitions.set(definition, snapshot);
    instances.set(instance, definition);
    return Object.freeze({ definition, instance });
}
/** Returns a detached exact input for existing mutation/reconciliation APIs. */
export function reconstructProjection(projection: Projection): ProjectionInput {
    const authority = definitions.get(projection.definition);
    if (!authority || instances.get(projection.instance) !== projection.definition)
        throw new ProjectionContractError('Unrecognized or mismatched projection pair.');
    return structuredClone(authority);
}
type SourceField<F = EditableFieldDefinitionV2> = F extends EditableFieldDefinitionV2 ? Pick<F, 'id' | 'type' | 'binding' | 'defaultValue' | 'provenance'> : never;
export function sourceFields(definition: DefinitionProjection, variantId: string): readonly DeepReadonly<SourceField>[] {
    if (!definitions.has(definition))
        throw new ProjectionContractError('Unrecognized definition.');
    const variant = definition.variants.find(v => v.id === variantId);
    if (!variant)
        throw new ProjectionContractError('Unknown variant.');
    return freeze(variant.sourcePackage.editableFields.map(field => optional(field, ['id', 'type', 'binding', 'defaultValue', 'provenance']))) as readonly DeepReadonly<SourceField>[];
}

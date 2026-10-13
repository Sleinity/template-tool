import { assert, equal, projectionPackage } from '../../template-core/test/definitionProjection.fixtures';
import { projectDefinitionInstance, reconstructProjection } from '../../template-core/src/internal/definitionProjection/project';
import { materializeProjection } from '../../template-core/src/internal/definitionProjection/materialize';
import { createTemplateFieldContentStateV1, parseTemplatePackageV2 } from '@sleinity/template-core';
import { createTemplateFieldFamilyContentStateV3, type TemplateFieldFamilyV2 } from '@sleinity/template-core/family';
import { createTemplateSessionV2 } from '../src/session/templateSessionV2';
import { createTemplateFieldFamilySessionV2 } from '../src/session/templateFieldFamilySessionV2';
import { InMemoryTemplateSessionRepositoryV2 } from '../src/persistence/v2SessionRepositories';
import { buildZipPackageImportResult } from '../src/import/runTemplatePackageImportPipeline';
const pkg = projectionPackage();
pkg.editableFields.find(field => field.type === 'image')!.configuration.replacementPlacement = 'crop';
const family: TemplateFieldFamilyV2 = {
    schemaVersion: 'template-field-family-v2', id: 'integration-family', title: 'Integration',
    fields: pkg.editableFields.map(({ id, type, label, controlRole, configuration }) => ({ id, type, label, controlRole, configuration })) as TemplateFieldFamilyV2['fields'],
    editableFieldOrder: pkg.editableFieldOrder,
    variants: [{ id: 'a', packageValue: pkg }, { id: 'b', packageValue: { ...structuredClone(pkg), packageId: 'second-package' }, fieldOverrides: { 'image:hero': { type: 'image', configuration: { replacementPlacement: 'fit' } } } }],
};
const imageField = pkg.editableFields.find(field => field.type === 'image')!;
assert(imageField.defaultValue.assetId, 'Image source for persistence equivalence');
const imageValues = { 'image:hero': { value: { assetId: imageField.defaultValue.assetId, placement: {
  mode: 'crop' as const,
  crop: { schemaVersion: 'normalized-image-crop-v1' as const, coordinateSpace: 'normalized-slot-to-normalized-source' as const, transform: [[0.8, 0, 0.1], [0, 0.8, 0.1]] as [[number, number, number], [number, number, number]] },
} } } };
for (const kind of ['single', 'family'] as const) {
    const projection = projectDefinitionInstance(kind === 'single'
        ? { kind, packageValue: pkg, content: { ...createTemplateFieldContentStateV1(pkg), values: imageValues }, sessionAssets: {} }
        : { kind, family, content: { ...createTemplateFieldFamilyContentStateV3(family), values: imageValues, variantImagePlacements: { b: { 'image:hero': { mode: 'fit' } } } }, selectedVariantId: 'a', sessionAssets: {} });
    const restored = reconstructProjection(projection);
    const sessions = [0, 1].map(() => kind === 'single'
        ? createTemplateSessionV2({ repository: new InMemoryTemplateSessionRepositoryV2() })
        : createTemplateFieldFamilySessionV2({ repository: new InMemoryTemplateSessionRepositoryV2() }));
    const [original, roundtrip] = sessions;
    if (restored.kind === 'single' && !('selectVariant' in original) && !('selectVariant' in roundtrip)) {
        original.load(pkg, restored.content);
        roundtrip.load(restored.packageValue, restored.content);
    }
    else if (restored.kind === 'family' && 'selectVariant' in original && 'selectVariant' in roundtrip) {
        original.load(family, { contentState: restored.content, selectedVariantId: 'a' });
        roundtrip.load(restored.family, { contentState: restored.content, selectedVariantId: restored.selectedVariantId, sessionAssets: restored.sessionAssets });
    }
    else
        throw new Error('Session kind mismatch');
    function comparable(session: typeof original) {
        const snapshot = session.getSnapshot();
        return { content: snapshot.contentState, readiness: snapshot.readiness, renderer: snapshot.rendererPackage, tree: snapshot.resolvedTree, fields: snapshot.fields, materialization: 'familyMaterialization' in snapshot ? snapshot.familyMaterialization : snapshot.materialization };
    }
    equal(comparable(original), comparable(roundtrip), `${kind} load`);
    const snapshot = original.getSnapshot();
    equal(materializeProjection(projection).result, 'familyMaterialization' in snapshot ? snapshot.familyMaterialization : snapshot.materialization, `${kind} bridge vs Browser`);
    const publishCurrentEvidence = (session: typeof original) => {
        const current = session.getSnapshot();
        const materialization = 'familyMaterialization' in current ? current.familyMaterialization!.materialization! : current.materialization!;
        const packageValue = 'effectivePackage' in current ? current.effectivePackage! : current.basePackage!;
        const generation = session.beginRuntimeEvidencePublication();
        const runtime = { contentRevision: current.contentState!.revision, materializationRevision: materialization.materializationRevision!, publicationGeneration: generation, settlementRevision: 'projection-settlement', fontRevision: 'projection-font' };
        assert(session.publishRuntimeReadiness({ ...runtime, fonts: 'pending', renderer: 'pending' }), 'Pending readiness accepted');
        assert(session.publishRuntimeReadiness({ ...runtime, fonts: 'ready', renderer: 'ready' }), 'Ready publication accepted');
        const evidence = { ...runtime, schemaVersion: 'field-layout-evidence-v1' as const, packageIdentity: packageValue.packageId, fieldId: 'textarea:body', participation: 'active' as const, measuredVisualLines: 2, reliability: 'reliable' as const };
        assert(!session.publishFieldLayoutEvidence({ ...evidence, contentRevision: -1 }), 'Stale content rejected');
        assert(!session.publishFieldLayoutEvidence({ ...evidence, publicationGeneration: generation - 1 }), 'Stale generation rejected');
        assert(session.publishFieldLayoutEvidence(evidence), 'Current line evidence accepted');
        return evidence;
    };
    const delayed = sessions.map(publishCurrentEvidence);
    equal(comparable(original), comparable(roundtrip), `${kind} published evidence`);
    for (const session of sessions) {
        const field = session.getFieldControllers().find(f => f.id === 'text:title');
        assert(field?.type === 'text', 'Text controller');
        assert(field.selectChoice('primary').accepted, 'Choice accepted');
    }
    equal(comparable(original), comparable(roundtrip), `${kind} mutation`);
    sessions.forEach((session, index) => assert(!session.publishFieldLayoutEvidence(delayed[index]), 'Old evidence rejected after edit'));
    if ('selectVariant' in original && 'selectVariant' in roundtrip) {
        const fresh = sessions.map(publishCurrentEvidence);
        const revisions = sessions.map(session => session.getSnapshot().contentState!.revision);
        original.selectVariant('b');
        roundtrip.selectVariant('b');
        sessions.forEach((session, index) => {
            equal(session.getSnapshot().contentState!.revision, revisions[index], 'Switch preserves content revision');
            assert(!session.publishFieldLayoutEvidence(fresh[index]), 'Previously current evidence rejected by variant switch alone');
        });
        equal(comparable(original), comparable(roundtrip), 'Variant selection');
    }
    const records = await Promise.all(sessions.map(session => session.save()));
    await Promise.all(sessions.map((session, index) => session.loadSaved(records[index].id)));
    equal(comparable(original), comparable(roundtrip), `${kind} restored save`);
    const replacement = structuredClone(pkg);
    replacement.name = 'Reimported';
    for (const session of sessions) {
        if ('selectVariant' in session)
            session.applyVariantReimport(session.planVariantReimport(replacement));
        else
            session.applyReimport(session.planReimport(replacement));
    }
    equal(comparable(original), comparable(roundtrip), `${kind} reimport`);
    for (const session of sessions) {
        const state = session.getSnapshot();
        const input = 'family' in state
            ? { kind: 'family' as const, family: state.family!, content: state.contentState!, selectedVariantId: state.selectedVariantId!, sessionAssets: state.sessionAssets }
            : { kind: 'single' as const, packageValue: state.basePackage!, content: state.contentState!, sessionAssets: state.sessionAssets };
        const reprojected = projectDefinitionInstance(input);
        equal(reconstructProjection(reprojected), input, 'Reimported authority roundtrip');
        equal(reprojected.instance.values, state.contentState!.values, 'Reimported values and Choice identity');
        equal(materializeProjection(reprojected).result, 'familyMaterialization' in state ? state.familyMaterialization : state.materialization, 'Reimported materialization');
    }
    sessions.forEach(session => session.dispose());
}
// The ordinary test runner supplies the hash-identified current export. Use the
// existing public importer, retain ownership until comparisons finish, then release.
const lifecycle = globalThis as typeof globalThis & {
    __templatePackageLifecycleZip?: Uint8Array;
    __templatePackageLifecycleZipName?: string;
};
if (lifecycle.__templatePackageLifecycleZip) {
    const bytes = lifecycle.__templatePackageLifecycleZip;
    const result = await buildZipPackageImportResult(bytes.slice().buffer as ArrayBuffer, lifecycle.__templatePackageLifecycleZipName ?? 'current.zip');
    try {
        assert(result.package, 'Current ZIP package');
        const parsed = parseTemplatePackageV2(result.package);
        assert(parsed.package, 'Current ZIP V2 package');
        const content = createTemplateFieldContentStateV1(parsed.package);
        const input = { kind: 'single' as const, packageValue: parsed.package, content, sessionAssets: {} };
        equal(reconstructProjection(projectDefinitionInstance(input)), input, 'Current ZIP roundtrip');
        const session = createTemplateSessionV2();
        try {
            session.load(parsed.package, content);
            equal(materializeProjection(projectDefinitionInstance(input)).result, session.getSnapshot().materialization, 'Current ZIP materialization');
        }
        finally {
            session.dispose();
        }
    }
    finally {
        result.dispose?.();
    }
}
// Exercise the separately registered latest exporter fixture as well as the
// lifecycle fixture. Portable mode intentionally has no external ZIP dependency.
if (!(globalThis as typeof globalThis & {
    __templateToolPortableTests?: boolean;
}).__templateToolPortableTests) {
    const { readFile } = await import('node:fs/promises');
    const { createHash } = await import('node:crypto');
    const manifest = JSON.parse(await readFile('fidelity/fixtures.json', 'utf8'));
    const entry = manifest.fixtures.find((item: {
        id: string;
    }) => item.id === 'exporter-061-deal-of-the-week-post');
    assert(entry, 'Latest export fixture registered');
    const bytes = await readFile(entry.sourcePath.replace('${TEMPLATE_PACKAGE_FIXTURE_DIR}', process.env.TEMPLATE_PACKAGE_FIXTURE_DIR ?? manifest.defaultFixtureDirectory));
    assert(createHash('sha256').update(bytes).digest('hex') === entry.zipSha256, 'Latest export exact fixture bytes');
    const imported = await buildZipPackageImportResult(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), entry.filename, '', undefined, null);
    try {
        const parsed = parseTemplatePackageV2(imported.package);
        assert(parsed.package && parsed.validation?.valid, 'Latest export valid V2');
        const input = { kind: 'single' as const, packageValue: parsed.package, content: createTemplateFieldContentStateV1(parsed.package), sessionAssets: {} };
        const projection = projectDefinitionInstance(input);
        equal(reconstructProjection(projection), input, 'Latest export roundtrip');
        const current = createTemplateSessionV2();
        try {
            current.load(input.packageValue, input.content);
            equal(materializeProjection(projection).result, current.getSnapshot().materialization, 'Latest export materialization');
        }
        finally {
            current.dispose();
        }
    }
    finally {
        imported.dispose?.();
    }
}
console.log('Definition projection Browser integration equivalence passed.');

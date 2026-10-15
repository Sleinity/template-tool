/** Controlled decode order, never renderer/source certification. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import fixture from '../../../src/template-package/fixtures/figma-plugin-v0.4.1.json';
import { normalizeTemplatePackageV1ToV2, type TemplatePackageV1 } from '@sleinity/template-core';
import { TEMPLATE_FIELD_FAMILY_SCHEMA_VERSION } from '@sleinity/template-core/family';
import { createTemplateFieldFamilyFieldV2, createTemplateFieldFamilySessionV2 } from '../src/session/templateFieldFamilySessionV2';
import { InMemoryTemplateSessionRepositoryV2 } from '../src/persistence/v2SessionRepositories';

const g = globalThis as any, baseline = Boolean(g.__f7NativeBaseline);
const OriginalImage = g.Image, setTimer = g.setTimeout, clearTimer = g.clearTimeout;
const images: ControlledImage[] = [], timers = new Map<number, () => void>(); let timerId = 900000, lastImage: ControlledImage;
class ControlledImage {
  onload?: () => void; onerror?: () => void; naturalWidth = 4; naturalHeight = 3; complete = false; crossOrigin = '';
  source = ''; timer = 0; settled = false; rejected = false;
  constructor() { images.push(this); lastImage = this; }
  set src(value: string) { this.source = value; }
  get src() { return this.source; }
  decode() { return this.rejected ? Promise.reject(Error('Controlled decoder failure')) : Promise.resolve(); }
  finish(mode = 'success') {
    assert(!this.settled); this.settled = true;
    if (mode === 'timeout') { const fire = timers.get(this.timer); assert(fire); fire(); }
    else if (mode === 'load-failure') this.onerror?.();
    else { this.complete = true; this.rejected = mode === 'decode-failure'; this.onload?.(); }
  }
}
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const another = new PNG({ width: 2, height: 2 }); another.data.fill(255);
const pngB = 'data:image/png;base64,' + PNG.sync.write(another).toString('base64');
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const retained = ['family', 'familyMaterialization', 'effectivePackage', 'workingPackage', 'rendererPackage', 'resolvedTree', 'contentState', 'sessionAssets', 'fields'] as const;
const transcript: any[] = [];
function family(distinct = false) {
  const a = normalizeTemplatePackageV1ToV2(structuredClone(fixture as unknown as TemplatePackageV1)).package!;
  a.fontRequirements = [];
  a.editableFields = [
    { id: 'text:title', type: 'text', binding: { kind: 'text-characters', nodeId: '58:57' }, defaultValue: 'Hi', configuration: { maxCharacters: 20 } },
    { id: 'textarea:body', type: 'textarea', binding: { kind: 'text-characters', nodeId: '58:60' }, defaultValue: 'Body', configuration: { maxCharacters: 100, maxLines: 2 } },
    { id: 'image:hero', type: 'image', binding: { kind: 'image-content', nodeId: '58:61' }, defaultValue: { assetId: a.nodes['58:61'].image!.assetId, placement: { mode: 'imported' } }, configuration: { replacementPlacement: 'crop' } },
  ];
  a.editableFieldOrder = a.editableFields.map(f => f.id);
  for (const asset of Object.values(a.assets)) if (asset.type === 'image') { asset.stableUrl = png; asset.dataUrl = png; }
  const b = structuredClone(a); b.packageId += ':b';
  if (distinct) for (const asset of Object.values(b.assets)) if (asset.type === 'image') { asset.stableUrl = pngB; asset.dataUrl = pngB; }
  return { schemaVersion: TEMPLATE_FIELD_FAMILY_SCHEMA_VERSION, id: 'controlled-family', title: 'Controlled media', fields: a.editableFields.map(createTemplateFieldFamilyFieldV2), editableFieldOrder: a.editableFieldOrder, variants: [{ id: 'a', packageValue: a }, { id: 'b', packageValue: b }] };
}
function record(label: string, session: ReturnType<typeof createTemplateFieldFamilySessionV2>) {
  const s = session.getSnapshot();
  transcript.push({ label, revision: s.revision, operationRevision: s.operationRevision, contentRevision: s.contentState?.revision,
    selectedVariantId: s.selectedVariantId, status: s.status, error: s.error, readiness: s.readiness,
    semanticHash: hash(retained.map(k => s[k])) });
}
async function finish(label: string, session: ReturnType<typeof createTemplateFieldFamilySessionV2>, image: ControlledImage, mode = 'success', accepted = true) {
  const before = session.getSnapshot(); let notifications = 0;
  const stop = before.status !== 'disposed' ? session.subscribe(() => notifications++) : () => {};
  g.__f7NativeCounts = {};
  image.finish(mode); await flush(); const after = session.getSnapshot(); stop();
  assert.equal(after.revision, before.revision + Number(accepted)); assert.equal(notifications, Number(accepted));
  assert.equal(after.operationRevision, before.operationRevision); assert.equal(after.contentState, before.contentState);
  if (!baseline && accepted) { for (const key of retained) assert.equal(after[key], before[key], `${label}: ${key} identity`); assert.deepEqual(g.__f7NativeCounts, {}, `${label}: completion did semantic work`); }
  record(label, session);
}
function currentImages(start: number) { return images.slice(start).filter(i => !i.settled); }
async function drain(label: string, session: ReturnType<typeof createTemplateFieldFamilySessionV2>, start: number, accepted = true) {
  let i = 0; for (const image of currentImages(start)) await finish(`${label}/${i++}`, session, image, 'success', accepted);
}
function runtime(session: ReturnType<typeof createTemplateFieldFamilySessionV2>, generation = 1000001, fonts: 'pending' | 'ready' | 'blocked' = 'ready') {
  const s = session.getSnapshot();
  return { contentRevision: s.contentState!.revision, materializationRevision: s.readiness.materializationRevision!, settlementRevision: 'controlled-settlement', fontRevision: 'controlled-font', publicationGeneration: generation, fonts, renderer: 'ready' as const };
}
try {
  g.Image = ControlledImage;
  g.setTimeout = (callback: () => void, delay: number, ...args: any[]) => { if (delay !== 15000) return setTimer(callback, delay, ...args); const id = ++timerId; timers.set(id, callback); lastImage.timer = id; return id; };
  g.clearTimeout = (id: number) => timers.delete(id) || clearTimer(id);
  for (const mode of ['success', 'load-failure', 'decode-failure', 'timeout']) {
    const start = images.length, s = createTemplateFieldFamilySessionV2(); s.load(family());
    assert(s.getSnapshot().workingPackage, 'Controlled fixture must materialize: ' + JSON.stringify(s.getSnapshot().familyMaterialization)); assert(currentImages(start).length > 0);
    await finish(mode, s, currentImages(start)[0], mode);
    assert.equal(s.getSnapshot().readiness.assets, mode === 'success' ? 'ready' : 'blocked');
    assert.equal(s.getSnapshot().readiness.exportReady, false, 'Pending font/line evidence cannot be bypassed'); s.dispose();
  }
  for (const [shared, failure] of [[true, false], [true, true], [false, false]]) {
    const f = family(), start = images.length, s = createTemplateFieldFamilySessionV2();
    for (const variant of f.variants) {
      const pkg = variant.packageValue, hero = structuredClone(pkg.nodes['58:61']); hero.id = 'probe:extra-media'; hero.children = [];
      if (!shared) { const asset = structuredClone(pkg.assets[hero.image!.assetId]); asset.id += ':extra'; (asset as any).dataUrl = pngB; asset.stableUrl = pngB; pkg.assets[asset.id] = asset; hero.image!.assetId = asset.id; }
      pkg.nodes[hero.id] = hero; pkg.nodes[hero.parentId!].children.push(hero.id);
    }
    s.load(f); assert.equal(currentImages(start).length, shared ? 1 : 2, JSON.stringify(s.getSnapshot().familyMaterialization)); if (failure) await finish('shared-node-failure', s, currentImages(start)[0], 'load-failure');
    else await drain(shared ? 'shared-nodes' : 'independent-nodes', s, start); s.dispose();
  }
  for (const action of ['aba-shared', 'aba-distinct', 'unrelated-completion', 'reload', 'reset', 'reset-reload', 'dispose', 'reimport']) {
    const start = images.length, s = createTemplateFieldFamilySessionV2(); const f = family(action !== 'aba-shared'); s.load(f);
    const first = currentImages(start)[0];
    if (action.startsWith('aba')) { s.selectVariant('b'); s.selectVariant('a'); }
    if (action === 'unrelated-completion') s.selectVariant('b');
    if (action === 'reload') s.load(f, { selectedVariantId: 'b' });
    if (action === 'reset') s.reset();
    if (action === 'reset-reload') { s.reset(); s.load(f); }
    if (action === 'dispose') s.dispose();
    if (action === 'reimport') { const plan = s.planVariantReimport(family(true).variants[1].packageValue); assert(plan.canApply); s.applyVariantReimport(plan); }
    await finish(action, s, first, 'success', !['reset', 'reset-reload', 'dispose'].includes(action));
    await drain(action + '-rest', s, start, !['reset', 'dispose'].includes(action));
    s.dispose();
  }
  for (const state of ['pending', 'invalid', 'inactive', 'valid']) {
    const start = images.length, s = createTemplateFieldFamilySessionV2(); s.load(family());
    const base = s.beginRuntimeEvidencePublication(), evidence = runtime(s, base + 1);
    assert(s.publishRuntimeReadiness(evidence));
    if (state !== 'pending') assert(s.publishFieldLayoutEvidence({ ...evidence, fieldId: 'textarea:body', packageIdentity: s.getSnapshot().effectivePackage!.packageId, reliability: 'reliable', measuredVisualLines: state === 'invalid' ? 3 : 1, participation: state === 'inactive' ? 'structurally-excluded' : 'active' } as any));
    await drain('line-' + state, s, start);
    assert.equal(s.getSnapshot().readiness.renderValidation, state === 'valid' || state === 'inactive' ? 'ready' : state === 'invalid' ? 'blocked' : 'pending');
    assert(!s.publishRuntimeReadiness({ ...evidence, publicationGeneration: base - 1 }));
    s.publishRuntimeReadiness({ ...evidence, fonts: 'blocked' }); record('font-blocked-' + state, s);
    s.dispose();
  }
  for (const fonts of ['pending', 'blocked'] as const) {
    const start = images.length, s = createTemplateFieldFamilySessionV2(); s.load(family());
    const base = s.beginRuntimeEvidencePublication(); assert(s.publishRuntimeReadiness(runtime(s, base + 1, fonts)));
    await drain('interleaved-font-' + fonts, s, start);
    assert.equal(s.getSnapshot().readiness.fonts, fonts); assert(!s.getSnapshot().readiness.exportReady); s.dispose();
  }
  {
    const start = images.length, s = createTemplateFieldFamilySessionV2(); const f = family();
    f.fields[0].configuration = { maxCharacters: 1 }; s.load(f); await drain('invalid-shared', s, start); record('invalid-shared', s); assert.equal(s.getSnapshot().readiness.deterministic, 'blocked'); s.dispose();
  }
  {
    const start = images.length, s = createTemplateFieldFamilySessionV2(); const f = family();
    delete f.variants[0].packageValue.assets[f.variants[0].packageValue.nodes['58:61'].image!.assetId]; s.load(f); await drain('missing-source', s, start); record('missing-source', s); assert(!s.getSnapshot().readiness.exportReady); s.dispose();
  }
  {
    const start = images.length, repository = new InMemoryTemplateSessionRepositoryV2(), s = createTemplateFieldFamilySessionV2({ repository }); s.load(family());
    const before = await s.save({ id: 'controlled-save', name: 'Controlled' }); assert(before);
    await drain('save-pending', s, start);
    const r = createTemplateFieldFamilySessionV2({ repository }), restoreStart = images.length; await r.loadSaved(before.id);
    await drain('restore', r, restoreStart); record('restored', r); s.dispose(); r.dispose();
  }
  {
    const start = images.length, s = createTemplateFieldFamilySessionV2(); s.load(family());
    for (const suffix of ['one', 'two']) {
      const image = s.getFieldControllers().find(f => f.type === 'image') as any;
      assert((await image.replaceImage({ dataUrl: suffix === 'one' ? png : pngB, assetId: 'same-id', width: 1, height: 1 })).accepted);
    }
    const image = s.getFieldControllers().find(f => f.type === 'image') as any;
    assert(image.setPlacement({ mode: 'crop', crop: { schemaVersion: 'normalized-image-crop-v1', coordinateSpace: 'normalized-slot-to-normalized-source', transform: [[0.7, 0, 0.15], [0, 0.7, 0.15]] } }).accepted);
    assert(image.reset().accepted); await drain('replacement-crop-reset', s, start); assert.deepEqual(s.getSnapshot().sessionAssets, {}); s.dispose();
  }
  g.__f7NativeTranscript = transcript;
  console.log(`Family media readiness ${baseline ? 'baseline' : 'candidate'}: ${transcript.length} controlled outcomes pass.`);
} finally { g.Image = OriginalImage; g.setTimeout = setTimer; g.clearTimeout = clearTimer; }

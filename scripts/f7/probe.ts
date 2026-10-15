/** Test-only observation. Never supplies renderer readiness. */
const w = window as any;
const params = new URLSearchParams(location.search);
const detailed = params.get('profile') === 'detailed';
const events: any[] = [];
let stage = 'setup', cause = 'operation', stop: (() => void) | undefined;
let session: any;
const identity = () => {
  const s = session?.getSnapshot();
  return s ? { sessionRevision: s.revision, contentRevision: s.contentState?.revision,
    selectedVariantId: s.selectedVariantId ?? null, materializationRevision: s.readiness.materializationRevision,
    treeRevision: s.resolvedTree?.primitiveTreeRevision ?? null,
    backendRevision: s.resolvedTree?.backendDecisionRevision ?? null,
    assetIds: Object.keys(s.sessionAssets).sort(), readiness: s.readiness } : null;
};
const event = (kind: string, detail: any = {}) => {
  events.push({ kind, at: performance.now(), stage, cause, ...detail });
};
const observer = new PerformanceObserver(list => {
  for (const item of list.getEntries()) event('long-task', { start: item.startTime, duration: item.duration });
});
observer.observe({ type: 'longtask', buffered: false });
if (detailed) for (const kind of ['load', 'error']) document.addEventListener(kind, e => {
  if (e.target instanceof HTMLImageElement) event(`dom-media-${kind}`, { source: e.target.currentSrc || e.target.src,
    nodeId: e.target.closest('[data-package-node-id]')?.getAttribute('data-package-node-id'), identity: identity() });
}, true);
w.__f7 = {
  get cause() { return cause; },
  detailed, events, initialIndex: Number(params.get('initial') ?? 0), diagnostic: params.get('diagnostic'),
  event,
  span(kind: string, start: number, detail: any = {}) { event(kind, { start, duration: performance.now() - start, ...detail }); },
  withCause(next: string, action: () => any) { const previous = cause; cause = next; try { return action(); } finally { cause = previous; } },
  attach(next: any) {
    session = next;
    let previous = session.getSnapshot();
    stop = session.subscribe(() => {
      const current = session.getSnapshot();
      event('publication', { identity: identity(), ...(detailed ? { stableSemanticReferences: ['familyMaterialization', 'effectivePackage', 'workingPackage', 'rendererPackage', 'resolvedTree', 'contentState', 'sessionAssets', 'fields'].every(key => previous[key] === current[key]) } : {}) });
      previous = current;
    });
    event('session-created');
  },
  identity,
  stage(name: string) { stage = name; event('stage-start', { identity: identity() }); },
  async settle() {
    const deadline = performance.now() + 35000;
    while (!session.getSnapshot().readiness.exportReady) {
      if (performance.now() > deadline) throw Error(`Readiness timeout: ${JSON.stringify(identity())}`);
      await new Promise(requestAnimationFrame);
    }
    event('export-ready-observed', { identity: identity() });
    await document.fonts.ready;
    let previous = '', stable = 0;
    while (stable < 3) {
      if (performance.now() > deadline) throw Error('DOM geometry did not stabilize');
      await new Promise(requestAnimationFrame);
      const canvas = document.querySelector('[data-template-package-canvas]');
      const geometry = [...(canvas?.querySelectorAll('[data-package-node-id]') ?? [])].map(node => {
        const r = node.getBoundingClientRect(); return [node.getAttribute('data-package-node-id'), r.x, r.y, r.width, r.height];
      });
      const current = JSON.stringify(geometry);
      stable = current === previous && geometry.length > 0 ? stable + 1 : 0; previous = current;
    }
    const canvas = document.querySelector('[data-template-package-canvas]')!;
    event('preview-stable-observed', { identity: identity(), renderer: Object.fromEntries([...canvas.attributes].filter(a => /identity|revision|settlement|generation|readiness/.test(a.name)).map(a => [a.name, a.value])) });
    return identity();
  },
  select(index: number) { return w.editorProbe.selectIndex(index); },
  async replace() {
    const field = session.getFieldControllers().find((f: any) => f.type === 'image');
    if (!field) throw Error('Image diagnostic requires an image field');
    w.__f7.replacementFieldId = field.id;
    const file = new File([await (await fetch('/inputs/diagnostic.png')).blob()], 'replacement.png', { type: 'image/png' });
    const result = await field.replaceImage({ blob: file });
    if (!result.accepted) throw Error(JSON.stringify(result));
    event('image-replaced', { identity: identity() });
  },
  resetImage() { const result = session.getFieldControllers().find((f: any) => f.id === w.__f7.replacementFieldId).reset(); if (!result.accepted) throw Error(JSON.stringify(result)); event('image-reset', { identity: identity() }); },
  async saveTemplate() { const { studioRecords } = await import('../../apps/studio/src/workspace/studioRecords'); return studioRecords.saveTemplate(session, { name: 'F7 production Family smoke' }); },
  dispose() { event('dispose-start', { identity: identity() }); w.editorProbe.dispose(); stop?.(); observer.disconnect(); event('disposed', { identity: identity() }); },
};
await import('../editor-performance/harness');
w.__f7.ready = true;

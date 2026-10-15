import assert from 'node:assert/strict';

// All transforms are build-local. Guard exact anchors so source drift fails closed.
export function mediaInstrumentation(profile) {
  const detailed = profile === 'detailed';
  function replace(code, before, after) { assert(code.includes(before), `F7 instrumentation anchor: ${before.slice(0, 90)}`); return code.replace(before, after); }
  return { name: `f7-${profile}`, enforce: 'pre', transform(code, id) {
    const path = id.split('?')[0];
    if (path.endsWith('/editor-performance/harness.tsx')) {
      code = replace(code, '    const first = packages[0];', `
    if (window.__f7.diagnostic) {
      const pkg = packages[window.__f7.initialIndex];
      const asset = Object.values(pkg.assets).find(asset => asset.type === 'image');
      if (!asset) throw Error('Diagnostic image missing');
      pkg.assets = { ...pkg.assets, [asset.id]: { ...asset, stableUrl: window.__f7.diagnostic === 'failure' ? 'data:image/png;base64,aW52YWxpZA==' : location.origin + '/inputs/slow.png' } };
    }
    const first = packages[0];`);
      code = replace(code, '    session = studioRecords.openSession(seed);', `    window.__f7.event('import-font-setup-complete');
    session = studioRecords.openSession(seed);
    window.__f7.attach(session);
    window.__f7.event('load-start');`);
      code = replace(code, '(session as any).load(seed.family)', '(session as any).load(seed.family, {selectedVariantId:seed.family.variants[window.__f7.initialIndex].id})');
      code = replace(code, '    const record = studioRecords.capture(session, seed);', `    window.__f7.event('load-returned', {identity:window.__f7.identity()});
    const record = studioRecords.capture(session, seed);`);
      code = replace(code, '    root.render(<StrictMode>', `    window.__f7.event('mount-requested');
    root.render(<StrictMode>`);
      code = replace(code, '    window.editorProbe.acceptances = [];', `    window.editorProbe.acceptances = [];`);
      return { code, map: null };
    }
    if (!detailed) return null;
    if (path.endsWith('/templateFieldFamilySessionV2.ts')) {
      code = replace(code, '  const derive = (', '  const measuredDerive = (');
      code = replace(code, '  const response = (', `  function derive(...args: Parameters<typeof measuredDerive>) {
    const start = performance.now();
    try { return measuredDerive(...args); }
    finally { window.__f7.span('family-derive', start, {selectedVariantId:args[2], contentRevision:args[1].revision, assetIds:Object.keys(args[3]).sort()}); }
  }
  const response = (`);
      code = replace(code, '        if (disposed || decodedSources.get(asset.source) !== entry) return;', `        window.__f7.event('media-completion', {source:asset.source,assetId:asset.assetId,nodeId:asset.nodeId,disposed,entryCurrent:decodedSources.get(asset.source)===entry,failure:failure?.message??null,identity:window.__f7.identity()});
        if (disposed || decodedSources.get(asset.source) !== entry) return;`);
      if (code.includes('          publish(derive(snapshot.family, snapshot.contentState, snapshot.selectedVariantId, snapshot.sessionAssets));')) {
        code = replace(code, '          publish(derive(snapshot.family, snapshot.contentState, snapshot.selectedVariantId, snapshot.sessionAssets));', `          window.__f7.withCause('media-completion', () => publish(derive(snapshot.family!, snapshot.contentState!, snapshot.selectedVariantId!, snapshot.sessionAssets)));`);
      } else {
        assert(code.includes('          publish(projectReadiness('), 'Readiness-only completion anchor');
        code = code.replace(/          publish\(projectReadiness\(([\s\S]*?)\n          \)\);/, `          window.__f7.withCause('media-completion', () => publish(projectReadiness($1\n          )));`);
        code = replace(code, '  const projectReadiness = (', '  const measuredProjectReadiness = (');
        code = replace(code, '  const measuredDerive = (', `  function projectReadiness(...args: Parameters<typeof measuredProjectReadiness>) {const start=performance.now();try{return measuredProjectReadiness(...args);}finally{window.__f7.span('family-readiness',start);}}\n  const measuredDerive = (`);
      }
      return { code, map: null };
    }
    const names = path.endsWith('/materializeTemplateFieldContentV2.ts') ? ['materializeTemplateFieldContentV2'] : path.endsWith('/createResolvedRenderTree.ts') ? ['createResolvedRenderTree'] : path.endsWith('/fieldRulesV2.ts') ? ['materializeTemplateFieldFamilyVariantV2'] : path.endsWith('/templateSessionV2.ts') ? ['projectTemplatePackageV2ToRendererV1'] : [];
    for (const name of names) {
      code = replace(code, `export function ${name}(`, `function f7_${name}(`);
      code += `\nexport function ${name}(...args: Parameters<typeof f7_${name}>) {const start=performance.now();try{return f7_${name}(...args);}finally{window.__f7.span('${name}',start);}}\n`;
    }
    if (names.length) return { code, map: null };
    if (path.endsWith('/DraftEditor.tsx')) {
      const marker = code.indexOf('export function DraftEditor('), end = code.indexOf(') {', marker);
      assert(marker >= 0 && end > marker, 'DraftEditor hook insertion');
      code = code.slice(0, end + 3) + `\n__f7Commit(() => {window.__f7.event('react-commit',{identity:window.__f7.identity()});});\n` + code.slice(end + 3);
      return { code: `import {useLayoutEffect as __f7Commit} from 'react';\n` + code, map: null };
    }
    return null;
  } };
}

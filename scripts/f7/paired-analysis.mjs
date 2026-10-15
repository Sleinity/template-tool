/** Independent per-case five-pair latency and work analysis. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { quantile, pairedMedianInterval } from '../text-geometry/pairedTimingAnalysis.mjs';
const stats = values => ({ count: values.length, median: quantile(values, .5), p95: quantile(values, .95), min: Math.min(...values), max: Math.max(...values) });
function tailInterval(pairs) {
  const differences = [];
  function sample(rows) {
    if (rows.length === 5) { differences.push(quantile(rows.map(r => r.current), .95) - quantile(rows.map(r => r.before), .95)); return; }
    for (const pair of pairs) sample([...rows, pair]);
  }
  sample([]); assert.equal(differences.length, 3125); return [quantile(differences, .025), quantile(differences, .975)];
}
export function analyzePaired(p, focusedCases = null) {
  const allCases = ['single-0/0', 'single-1/0', 'single-2/0', 'family-cold-0/0', 'family-cold-1/0', 'family-cold-2/0', ...Array.from({length:6}, (_, i) => `family-switch/${i}`)];
  const expectedCases = focusedCases ?? allCases;
  assert(expectedCases.length && new Set(expectedCases).size === expectedCases.length && expectedCases.every(c => allCases.includes(c)));
  assert.equal(p.schemaVersion, 'f7-readiness-paired-v1'); assert.equal(p.trials, 5); assert.deepEqual(p.failures, []);
  assert.equal(p.rows.length, expectedCases.length * 10); assert.equal(p.warmups.length, expectedCases.length * 2); assert(p.warmups.every(r => r.trial === -1));
  assert.deepEqual(p.changed, ['packages/template-browser/src/session/templateFieldFamilySessionV2.ts']);
  const seen = new Set();
  const metrics = p.rows.map(row => {
    const key = `${row.scenario}/${row.step}/${row.profile}/${row.trial}`; assert(!seen.has(key)); seen.add(key);
    assert(row.trial >= 0 && row.trial < 5); assert(['before', 'current'].includes(row.profile));
    assert(row.state.readiness.exportReady && row.state.treeRevision && row.state.backendRevision);
    const events = row.events, start = events.find(e => e.kind === 'load-start') ?? events.find(e => e.kind === 'stage-start');
    const stable = events.find(e => e.kind === 'preview-stable-observed'), observed = events.find(e => e.kind === 'export-ready-observed'); assert(start && stable && observed);
    const ready = events.filter(e => e.kind === 'publication' && e.identity.readiness.exportReady && e.identity.selectedVariantId === row.state.selectedVariantId && e.at <= stable.at).at(-1) ?? observed;
    const mount = events.find(e => e.kind === 'mount-requested'), pngStart = events.find(e => e.kind === 'png-start'), pngEnd = events.find(e => e.kind === 'png-complete');
    assert.equal(Boolean(row.png), Boolean(pngStart && pngEnd));
    const media = events.filter(e => e.kind === 'media-completion' && !e.disposed && e.entryCurrent);
    const completions = events.filter(e => e.kind === 'publication' && e.cause === 'media-completion');
    const semanticCalls = events.filter(e => e.cause === 'media-completion' && ['family-derive', 'materializeTemplateFieldFamilyVariantV2', 'materializeTemplateFieldContentV2', 'projectTemplatePackageV2ToRendererV1', 'createResolvedRenderTree'].includes(e.kind));
    if (p.observation === 'detailed') {
      assert.equal(completions.length, media.length);
      if (row.profile === 'current') { assert.equal(semanticCalls.length, 0); assert(completions.every(e => e.stableSemanticReferences)); }
      for (const event of media) {
        // Fast readiness callbacks can share the browser clock's timestamp.
        // Recorded event order, rather than >= time, identifies this publication.
        const pub = events.slice(events.indexOf(event) + 1).find(e => e.kind === 'publication' && e.cause === 'media-completion'); assert(pub);
        for (const key of ['contentRevision', 'selectedVariantId', 'materializationRevision', 'treeRevision', 'backendRevision']) assert.equal(pub.identity[key], event.identity[key]);
        assert.equal(pub.identity.sessionRevision, event.identity.sessionRevision + 1);
      }
    }
    return { scenario: row.scenario, step: row.step, stage: row.stage, fixtureId: row.fixtureId, profile: row.profile, trial: row.trial,
      readyMs: ready.at - start.at, previewMs: stable.at - start.at, mountMs: mount ? mount.at - start.at : null,
      nativeLoadMs: events.find(e => e.kind === 'load-returned') ? events.find(e => e.kind === 'load-returned').at - start.at : null,
      pngMs: pngEnd ? pngEnd.at - pngStart.at : null, mediaCompletions: media.length, semanticCalls: semanticCalls.length,
      derivations: events.filter(e => e.kind === 'family-derive').length,
      mediaWorkMs: events.filter(e => e.cause === 'media-completion' && ['family-derive', 'family-readiness'].includes(e.kind)).reduce((n, e) => n + e.duration, 0),
      commits: events.filter(e => e.kind === 'react-commit').length,
      publications: events.filter(e => e.kind === 'publication').length,
      stableCompletionReferences: completions.every(e => e.stableSemanticReferences),
      longTasks: events.filter(e => e.kind === 'long-task').map(e => ({ start: e.start, duration: e.duration })),
      state: row.state, png: row.png };
  });
  const groups = [...new Set(metrics.map(r => `${r.scenario}/${r.step}`))]; assert.deepEqual([...groups].sort(), [...expectedCases].sort());
  const cases = groups.map(key => {
    const rows = metrics.filter(r => `${r.scenario}/${r.step}` === key); assert.equal(rows.length, 10);
    const pairs = Array.from({ length: 5 }, (_, trial) => {
      const before = rows.filter(r => r.trial === trial && r.profile === 'before'), current = rows.filter(r => r.trial === trial && r.profile === 'current'); assert.equal(before.length, 1); assert.equal(current.length, 1);
      const a = before[0], b = current[0];
      for (const field of ['contentRevision', 'selectedVariantId', 'treeRevision', 'backendRevision', 'assetIds']) assert.deepEqual(a.state[field], b.state[field], `${key}: final semantic identity`);
      const readiness = s => { const r = { ...s.readiness }; delete r.materializationRevision; return r; };
      assert.deepEqual(readiness(a.state), readiness(b.state));
      if (a.png) assert.deepEqual(a.png, b.png, `${key}: PNG bytes or dimensions changed`);
      return { trial, before: a, current: b };
    });
    const measurements = {};
    for (const name of ['readyMs', 'previewMs', 'pngMs', 'mountMs', 'nativeLoadMs']) {
      if (pairs[0].before[name] === null) continue;
      const values = pairs.map(pair => ({ before: pair.before[name], current: pair.current[name] }));
      const delta = values.map(pair => pair.current - pair.before), medianInterval = pairedMedianInterval(delta), p95Interval = tailInterval(values);
      const before = stats(values.map(v => v.before)), current = stats(values.map(v => v.current));
      measurements[name] = { before, current, pairedDeltas: delta, medianInterval, p95Interval,
        medianImprovement: medianInterval[1] < 0, confirmedMedianIncrease: medianInterval[0] > 0, confirmedTailIncrease: p95Interval[0] > 0,
        descriptiveTailIncrease: current.p95 > before.p95 };
    }
    return { key, fixtureId: rows[0].fixtureId, stage: rows[0].stage, measurements, pairs };
  });
  const flags = cases.flatMap(c => ['readyMs', 'previewMs', 'pngMs'].flatMap(metric => {
    const m = c.measurements[metric]; return m && (m.confirmedMedianIncrease || m.descriptiveTailIncrease) ? [{ case: c.key, metric, medianInterval: m.medianInterval, p95Interval: m.p95Interval, descriptiveTailIncrease: m.descriptiveTailIncrease, confirmedMedianIncrease: m.confirmedMedianIncrease, confirmedTailIncrease: m.confirmedTailIncrease }] : [];
  }));
  const coverBenefit = cases.filter(c => c.fixtureId === 'exporter-061-cover' && ['family-cold-1/0', 'family-switch/1'].includes(c.key)).filter(c => c.measurements.readyMs.medianImprovement || c.measurements.previewMs.medianImprovement).map(c => c.key);
  if (p.observation === 'detailed') { assert.equal(p.diagnostics.length, 4); assert(p.diagnostics.every(d => d.status === 'pass')); assert.equal(p.smoke.status, 'pass'); }
  return { schemaVersion: 'f7-readiness-analysis-v1', observation: p.observation, checkpoints: p.checkpoints, environment: p.environment, fixtures: p.fixtures, fonts: p.fonts,
    measuredSteps: p.rows.length, warmupsExcluded: p.warmups.length, coverage: focusedCases ? 'focused-repeat' : 'full', cases, flags, coverBenefit,
    limitation: 'Five finite paired trials per case. Detailed work and minimally instrumented timing are separate. Tail intervals enumerate paired resamples; descriptive p95 alone is not confirmed regression. No pooled independence or SDK cold-start claim.' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output] = process.argv.slice(2); assert(input && output);
  const bytes = await readFile(input), packet = JSON.parse((input.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString());
  const analysis = analyzePaired(packet, process.argv[4]?.split(',') ?? null); await writeFile(output, JSON.stringify(analysis, null, 2) + '\n');
  console.log(JSON.stringify({ mode: analysis.observation, coverBenefit: analysis.coverBenefit, flags: analysis.flags.map(f => [f.case, f.metric, f.medianInterval, f.p95Interval]) }));
}

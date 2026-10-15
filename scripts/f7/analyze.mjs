/** Characterization and observation-overhead analysis, never a speedup verdict. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { quantile, pairedMedianInterval } from '../text-geometry/pairedTimingAnalysis.mjs';

const distribution = values => ({ count: values.length, median: quantile(values, .5), p95: quantile(values, .95), min: Math.min(...values), max: Math.max(...values) });
export async function readProfile(path) { const bytes = await readFile(path); return JSON.parse((path.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString()); }
export function analyze(packet) {
  assert.equal(packet.schemaVersion, 'f7-production-profile-v1'); assert.equal(packet.mode, 'production'); assert.equal(packet.trials, 5);
  assert.deepEqual(packet.failures, []); assert.equal(packet.rows.length, 120); assert.equal(packet.warmups.length, 24);
  assert(packet.warmups.every(row => row.trial === -1));
  assert.equal(packet.diagnostics.length, 4); assert(packet.diagnostics.every(d => d.status === 'pass')); assert.equal(packet.smoke.status, 'pass');
  assert.deepEqual(packet.diagnostics.map(d => d.mode).sort(), ['disposal', 'failure', 'rapid-switch', 'replacement-reset']);
  const keys = new Set();
  const metrics = packet.rows.map(row => {
    assert(row.trial >= 0 && row.trial < 5); assert(['minimal', 'detailed'].includes(row.profile));
    const key = `${row.scenario}/${row.trial}/${row.profile}/${row.step}`; assert(!keys.has(key), 'Duplicate trial row'); keys.add(key);
    const events = row.events, start = events.find(e => e.kind === 'load-start') ?? events.find(e => e.kind === 'stage-start');
    const stable = events.find(e => e.kind === 'preview-stable-observed'); assert(start && stable);
    assert(row.state.readiness.exportReady); assert(row.state.treeRevision && row.state.backendRevision);
    const ready = events.find(e => e.kind === 'export-ready-observed'); assert(ready);
    const finalReady = events.filter(e => e.kind === 'publication' && e.identity.readiness.exportReady && e.identity.selectedVariantId === row.state.selectedVariantId && e.at <= stable.at).at(-1) ?? ready;
    const media = events.filter(e => e.kind === 'media-completion' && !e.disposed && e.entryCurrent);
    const derives = events.filter(e => e.kind === 'family-derive');
    const mediaDerives = derives.filter(e => e.cause === 'media-completion');
    const mount = events.find(e => e.kind === 'mount-requested');
    let unchangedMediaPublications = 0;
    for (const completion of media) {
      const publication = events.find(e => e.kind === 'publication' && e.cause === 'media-completion' && e.at >= completion.at);
      assert(publication, 'A current media completion must retain its publication evidence');
      const before = completion.identity, after = publication.identity;
      assert.equal(before.contentRevision, after.contentRevision); assert.equal(before.selectedVariantId, after.selectedVariantId);
      if (before.materializationRevision === after.materializationRevision && before.treeRevision === after.treeRevision && before.backendRevision === after.backendRevision) unchangedMediaPublications++;
    }
    if (row.profile === 'detailed' && row.scenario.startsWith('family')) assert.equal(mediaDerives.length, media.length);
    const pngStart = events.find(e => e.kind === 'png-start'), pngEnd = events.find(e => e.kind === 'png-complete');
    assert.equal(Boolean(row.png), Boolean(pngStart && pngEnd));
    const contextEvents = packet.rows.filter(r => r.scenario === row.scenario && r.trial === row.trial && r.profile === row.profile).flatMap(r => r.events);
    const tasks = contextEvents.filter(e => e.kind === 'long-task' && e.start < finalReady.at && e.start + e.duration > start.at);
    return { scenario: row.scenario, stage: row.stage, fixtureId: row.fixtureId, step: row.step, trial: row.trial, profile: row.profile,
      setupMs: events.find(e => e.kind === 'import-font-setup-complete')?.at - events.find(e => e.kind === 'stage-start')?.at || null,
      synchronousLoadMs: events.find(e => e.kind === 'load-returned')?.at - start.at || null,
      finalReadyMs: finalReady.at - start.at, readyObservedMs: ready.at - start.at, stablePreviewMs: stable.at - start.at,
      pngMs: pngEnd ? pngEnd.at - pngStart.at : null, publications: events.filter(e => e.kind === 'publication').length,
      mediaCompletions: media.length, derivations: derives.length, mediaDerivations: mediaDerives.length, unchangedMediaPublications,
      mediaDerivationMs: mediaDerives.reduce((sum, e) => sum + e.duration, 0),
      mediaDerivationsBeforeMount: mount ? mediaDerives.filter(e => e.at <= mount.at).length : null,
      mediaDerivationMsBeforeMount: mount ? mediaDerives.filter(e => e.at <= mount.at).reduce((sum, e) => sum + e.duration, 0) : null,
      mediaDerivationsBeforeReady: mediaDerives.filter(e => e.at <= finalReady.at).length,
      mediaDerivationIntervals: mediaDerives.map(e => ({ start: e.start, end: e.at, duration: e.duration })),
      materializations: events.filter(e => e.kind === 'materializeTemplateFieldContentV2').length,
      trees: events.filter(e => e.kind === 'createResolvedRenderTree').length, commits: events.filter(e => e.kind === 'react-commit').length,
      readinessLongTasks: tasks.map(e => ({ start: e.start, duration: e.duration })),
      mediaDerivationsOverlappingLongTasks: mediaDerives.filter(e => tasks.some(t => e.start < t.start + t.duration && e.at > t.start)).length,
      measuredWindowMs: { start: start.at, ready: finalReady.at, stable: stable.at },
    };
  });
  const groups = [...new Set(metrics.map(r => `${r.scenario}/${r.step}`))]; assert.equal(groups.length, 12);
  const cases = groups.map(key => {
    const rows = metrics.filter(r => `${r.scenario}/${r.step}` === key), minimal = rows.filter(r => r.profile === 'minimal'), detailed = rows.filter(r => r.profile === 'detailed');
    assert.equal(rows.length, 10); assert.equal(minimal.length, 5); assert.equal(detailed.length, 5);
    for (let i = 0; i < 5; i++) { assert.equal(minimal.filter(r => r.trial === i).length, 1); assert.equal(detailed.filter(r => r.trial === i).length, 1); }
    const deltas = minimal.map(row => detailed.find(d => d.trial === row.trial).finalReadyMs - row.finalReadyMs);
    const png = minimal.filter(r => r.pngMs !== null).map(r => r.pngMs);
    return { key, fixtureId: rows[0].fixtureId, stage: rows[0].stage,
      minimal: { finalReadyMs: distribution(minimal.map(r => r.finalReadyMs)), stablePreviewMs: distribution(minimal.map(r => r.stablePreviewMs)), pngMs: png.length ? distribution(png) : null,
        readinessLongTaskCounts: minimal.map(r => r.readinessLongTasks.length) },
      detailed: { mediaCompletions: detailed.map(r => r.mediaCompletions), derivations: detailed.map(r => r.derivations), unchangedMediaPublications: detailed.map(r => r.unchangedMediaPublications),
        mediaDerivationMs: distribution(detailed.map(r => r.mediaDerivationMs)), commits: detailed.map(r => r.commits),
        mediaDerivationsBeforeMount: detailed.map(r => r.mediaDerivationsBeforeMount), mediaDerivationMsBeforeMount: detailed.map(r => r.mediaDerivationMsBeforeMount), mediaDerivationsBeforeReady: detailed.map(r => r.mediaDerivationsBeforeReady),
        readinessLongTaskCounts: detailed.map(r => r.readinessLongTasks.length), mediaDerivationsOverlappingLongTasks: detailed.map(r => r.mediaDerivationsOverlappingLongTasks) },
      observationOverhead: { pairedReadyDeltasMs: deltas, pairedMedianIntervalMs: pairedMedianInterval(deltas), interpretation: 'Detailed-minus-minimal observation overhead and run variability; never implementation improvement.' } };
  });
  const cover = metrics.filter(r => r.profile === 'detailed' && r.scenario.startsWith('family') && r.fixtureId === 'exporter-061-cover' && (r.stage === 'cold-open' || r.stage === 'cold-switch-1'));
  const hasRepeatedWork = cover.length === 10 && cover.every(r => r.mediaDerivations === 15 && r.unchangedMediaPublications === 15);
  const recurringContention = cover.filter(r => r.mediaDerivationsOverlappingLongTasks > 0).length;
  const preMountWork = cover.filter(r => r.scenario === 'family-cold-1');
  const recurringPreMountWork = preMountWork.length === 5 && preMountWork.every(r => r.mediaDerivationsBeforeMount >= 14) && cover.every(r => r.mediaDerivationsBeforeReady === 15);
  return { schemaVersion: 'f7-production-analysis-v1', candidateId: packet.candidateId, environment: packet.environment, measuredRows: metrics.length, matchedPairs: metrics.length / 2,
    warmupRowsExcluded: packet.warmups.length, cases, metrics, diagnostics: packet.diagnostics.map(d => ({ mode: d.mode, status: d.status })), smoke: packet.smoke,
    decision: { repeatedCoverWork: hasRepeatedWork, coverObservations: cover.length, observationsWithMediaWorkInsideLongTasks: recurringContention, recurringPreMountWork,
      recommendation: hasRepeatedWork && recurringPreMountWork ? 'Propose a separate bounded F7 ownership and implementation plan: 14–15 unchanged derivations repeatedly execute before the editor mount request, and all 15 precede readiness. No implementation or speedup is authorized by this packet.' : 'Defer implementation: repeated counts alone do not meet the production latency attribution gate.',
      caveat: 'The trace establishes synchronous work in the mount/readiness sequence, not the eventual counterfactual saving. Media derivations do not overlap recorded >50 ms long tasks in this run. Cold/warm differences include decoding and renderer/font settlement; a separate ownership plan and minimally instrumented before/after pairs remain mandatory.' },
    limitations: ['Five finite paired observations per case; p95 of five trials is descriptive, not a reliable tail distribution.', 'Fresh contexts are decode/session cold; browser process and OS caches are not cold-start certification.', 'Detailed and minimal runs use the identical production runtime; differences measure observation overhead and variability.', 'Native ready publication, observed stable DOM and PNG completion are separate overlapping intervals.', 'Full application smoke uses a Family seeded through public import/font/Family/save APIs; it is not a manual picker or full setup-wizard review.'] };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output] = process.argv.slice(2); assert(input && output, 'Supply profile JSON and analysis output');
  const result = analyze(await readProfile(input));
  await writeFile(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ measuredRows: result.measuredRows, cases: result.cases.length, decision: result.decision }));
}

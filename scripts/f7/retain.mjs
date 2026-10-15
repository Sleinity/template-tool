/** Retain original paired packets and analyses without modifying measurements. */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { analyzePaired } from './paired-analysis.mjs';
const output = 'docs/architecture/evidence/f7-readiness-20261015';
const hash = b => createHash('sha256').update(b).digest('hex');
const runs = [
  ['minimal', null], ['minimal-repeat', null], ['counters', null], ['counters-balanced', null],
  ['control-repeat', ['single-1/0']],
  ['warm-repeat', Array.from({ length: 6 }, (_, i) => `family-switch/${i}`)],
  ['final-warm-repeat', Array.from({ length: 6 }, (_, i) => `family-switch/${i}`)],
];
const retained = [];
for (const [name, cases] of runs) {
  const bytes = readFileSync(`/tmp/f7-readiness-${name}/profile.json`);
  const packet = JSON.parse(bytes), analysis = analyzePaired(packet, cases);
  const directory = `${output}/${name}`; mkdirSync(directory, { recursive: true });
  writeFileSync(`${directory}/profile.json.gz`, gzipSync(bytes, { level: 9 }));
  writeFileSync(`${directory}/analysis.json`, JSON.stringify(analysis, null, 2) + '\n');
  retained.push({ name, packetSha256: hash(bytes), measuredSteps: analysis.measuredSteps, analysis });
}
const first = retained.find(r => r.name === 'minimal').analysis;
assert(first.coverBenefit.length > 0);
const repeats = retained.filter(r => ['minimal-repeat', 'control-repeat', 'warm-repeat'].includes(r.name));
const repeated = first.flags.filter(f => f.confirmedMedianIncrease || f.confirmedTailIncrease).filter(f => repeats.some(r => r.analysis.flags.some(g => g.case === f.case && g.metric === f.metric && (g.confirmedMedianIncrease || g.confirmedTailIncrease))));
assert.deepEqual(repeated, []);
const second = repeats.find(r => r.name === 'minimal-repeat');
assert(!retained.find(r => r.name === 'final-warm-repeat').analysis.flags.some(f => f.confirmedMedianIncrease || f.confirmedTailIncrease));
for (const f of second.analysis.flags.filter(f => f.confirmedMedianIncrease || f.confirmedTailIncrease)) {
  const focused = repeats.find(r => ['control-repeat', 'warm-repeat'].includes(r.name) && r.analysis.cases.some(c => c.key === f.case));
  assert(focused, 'New repeat flag requires independent focused coverage');
  assert(!focused.analysis.flags.some(g => g.case === f.case && g.metric === f.metric && (g.confirmedMedianIncrease || g.confirmedTailIncrease)));
}
copyFileSync('/tmp/f7-native-accepted-20261015/differential.json', `${output}/native-differential.json`);
for (const f of ['now-hiring', 'cover', 'carrousel']) copyFileSync(`/tmp/f7-source-review-${f}.png`, `${output}/review-${f}.png`);
const overhead = retained.find(r => r.name === 'counters-balanced').analysis.cases.map(c => {
  const minimal = first.cases.find(m => m.key === c.key);
  return { case: c.key, metrics: Object.fromEntries(['readyMs', 'previewMs', 'pngMs'].filter(k => c.measurements[k]).map(k => [k, Object.fromEntries(['before', 'current'].map(v => [v, c.measurements[k][v].median - minimal.measurements[k][v].median]))])) };
});
writeFileSync(`${output}/performance-decision.json`, JSON.stringify({ decision: 'accept-runtime-timing',
  baseline: first.checkpoints.before.identitySha256, candidate: first.checkpoints.current.identitySha256,
  coverBenefit: first.coverBenefit, repeatedConfirmedRegressions: repeated,
  retained: retained.map(({ name, packetSha256, measuredSteps }) => ({ name, packetSha256, measuredSteps })),
  instrumentationOverhead: { method: 'Balanced detailed minus minimal per-case medians, separate passes; descriptive and confounded by run order, not an isolated causal overhead estimate.', milliseconds: overhead,
    warmTiming: 'Confirmed warm increases persist in detailed tracing; an additional independent minimal five-pair Family sequence has no confirmed increases. Counter-pass timings are not production timing acceptance inputs.' },
  limitations: ['Five trials per case/run; finite local-environment evidence.', 'Every flag remains in the analyses, including descriptive tails and detailed warm-case flags.', 'Before/current packets retain original baseline candidateId; explicit checkpoint identities distinguish the changed runtime.', 'No universal latency, PNG speedup or transfer-size claim.'],
}, null, 2) + '\n');
console.log('Retained seven original packets; native differential and primary minimal timing acceptance verified.');

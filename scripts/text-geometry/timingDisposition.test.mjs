import assert from 'node:assert/strict';
import {timingDisposition} from './timingDisposition.mjs';
const original = {repeatableHandlerIncreases: 1, cases: [{scenario: 'family', workload: 'multiline', repeatableHandlerIncrease: true}]};
const replication = {originalFlagRetained: true, priorDecision: original, replicationPass: true, cases: ['burst', 'continuous', 'multiline'].map(workload => ({workload, pairs: Array(5).fill({}), medianIntervalMs: [0, .3], p95IntervalMs: [-.1, .3], paintIntervalMs: [-1.4, .5], repeatableIncrease: false}))};
assert.equal(timingDisposition({cases: [], repeatableHandlerIncreases: 0}).status, 'pass');
assert.equal(timingDisposition(original, replication).status, 'qualified');
assert.equal(original.repeatableHandlerIncreases, 1);
assert.throws(() => timingDisposition(original));
for (const mutate of [r => r.originalFlagRetained = false, r => r.replicationPass = false, r => r.priorDecision.cases[0].workload = 'burst', r => r.cases.pop(), r => r.cases[0].pairs.pop(), r => r.cases[0].medianIntervalMs = [.1, .3]]) {
  const bad = structuredClone(replication); mutate(bad);
  assert.throws(() => timingDisposition(original, bad));
}
assert.throws(() => timingDisposition({repeatableHandlerIncreases: 1, cases: [{scenario: 'exporter-061-cover', workload: 'continuous', repeatableHandlerIncrease: true}]}, replication));
console.log('Timing disposition preserves flags and rejects incomplete/confirmed/mismatched repetition.');

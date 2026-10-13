/** Test-only disposition. Retain an original flag even when replication does not confirm it. */
import assert from 'node:assert/strict';
export function timingDisposition(original, replication) {
  const flagged = original.cases.filter(item => item.repeatableHandlerIncrease);
  assert.equal(original.repeatableHandlerIncreases, flagged.length);
  if (!flagged.length) return {status: 'pass', originalFlags: 0, qualification: null};
  assert.deepEqual(flagged.map(item => [item.scenario, item.workload]), [['family', 'multiline']]);
  assert(replication, 'A retained timing flag requires separately verified repetition');
  assert.equal(replication.originalFlagRetained, true);
  assert.deepEqual(replication.priorDecision, original, 'Never replace or discard the original analysis');
  assert.equal(replication.replicationPass, true, 'A confirmed increase blocks completion');
  assert.deepEqual(replication.cases.map(item => item.workload), ['burst', 'continuous', 'multiline']);
  for (const item of replication.cases) {
    assert.equal(item.pairs.length, 5);
    for (const key of ['medianIntervalMs', 'p95IntervalMs', 'paintIntervalMs']) {
      assert.equal(item[key].length, 2);
      assert(item[key].every(Number.isFinite));
      assert(item[key][0] <= 0 && item[key][1] >= item[key][0], 'No positive lower endpoint may be waived');
    }
    assert.equal(item.repeatableIncrease, false);
  }
  return {
    status: 'qualified', originalFlags: 1,
    qualification: 'Original Family multiline handler flag retained. An independent five-pair repetition under identical sources/environment did not confirm it. This is finite workload evidence, not proof of zero overhead or an unconditional timing pass.',
  };
}

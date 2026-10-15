/** Frame-level regression: identical accepted content must not paint intermediate geometry. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodePacket } from './packets.mjs';
import { assertWorkloadCoverage } from './workloadCoverage.mjs';
const path = process.argv[2], historical = process.argv.includes('--expect-jitter');
const record = decodePacket(JSON.parse(readFileSync(path)));
assert.deepEqual(record.failures, []);
assertWorkloadCoverage(record);
const rows = record.rows.filter(row => row.nodeId === '987:6765' || row.nodeId === '987:6769')
  .filter(row => !process.argv.includes('--current-only') || row.version === 'current');
assert(rows.length > 0, 'Require actual Now Hiring frames, including Family when selected');
const results = rows.map(row => {
  const groups = new Map();
  for (const frame of row.trace.frames) {
    assert(Number.isInteger(frame.canonicalRevision), 'Every frame needs its accepted content revision');
    const node = frame.nodeEvidence[row.nodeId];
    if (!historical) assert.deepEqual(node.animations, [], "Template geometry must not acquire application transitions");
    const text = node?.text;
    const key = JSON.stringify([frame.canonicalRevision, text]);
    const group = groups.get(key) ?? { revision: frame.canonicalRevision, text, frames: 0, bounds: new Set() };
    group.frames++;
    // All nodes, including dependent image/sibling geometry. Fixed viewport and
    // exact fonts mean there is no external constraint change in this workload.
    group.bounds.add(JSON.stringify(frame.nodes));
    groups.set(key, group);
  }
  const changes = [...groups.values()].filter(group => group.bounds.size > 1);
  if (historical) assert(changes.length > 0, `Retained ${row.workload} must reproduce extra movement`);
  else assert.equal(changes.length, 0, `${row.scenario}/${row.trial}/${row.workload}: extra geometry for identical accepted input`);
  assert(row.state.readiness.exportReady, 'Final current evidence must allow export');
  return { scenario: row.scenario, trial: row.trial, version: row.version, workload: row.workload,
    acceptedStates: [...groups.values()].map(group => ({ ...group, bounds: [...group.bounds].map(JSON.parse) })) };
});
console.log(JSON.stringify({ path, historical, results }, null, 2));

/** Exercise integrity rejection against a completed real profiling packet. */
import assert from 'node:assert/strict';
import { analyze, readProfile } from './analyze.mjs';
const packet = await readProfile(process.argv[2]);
const result = analyze(packet);
assert.equal(result.matchedPairs, 60);
const corruptions = [
  p => p.rows.pop(),
  p => { p.rows[1] = structuredClone(p.rows[0]); },
  p => { p.rows[0].trial = -1; },
  p => { p.rows[0].state.readiness.exportReady = false; },
  p => { p.rows[0].events = p.rows[0].events.filter(e => e.kind !== 'preview-stable-observed'); },
  p => { p.diagnostics[1] = structuredClone(p.diagnostics[0]); },
  p => { p.smoke.status = 'failed'; },
  p => {
    const row = p.rows.find(r => r.profile === 'detailed' && r.scenario === 'family-cold-1');
    row.events.find(e => e.kind === 'publication' && e.cause === 'media-completion').identity.contentRevision++;
  },
];
for (const corrupt of corruptions) { const changed = structuredClone(packet); corrupt(changed); assert.throws(() => analyze(changed)); }
console.log(`F7 evidence: complete five-pair analysis passes; ${corruptions.length} incomplete/stale/corrupt variants rejected.`);

import assert from 'node:assert/strict';
import { captureCompleteness, comparisonCaptureStatus } from './capture-integrity.mjs';
import { requireExactFont } from './fonts.mjs';
assert.deepEqual(captureCompleteness(['validate', 'editor'], { validate: [{}, {}] }, 2), {
  complete: false, missing: [{ surface: 'editor', expected: 2, actual: 0 }],
});
assert.equal(captureCompleteness(['editor'], { editor: [{}] }, 2).complete, false);
assert.equal(captureCompleteness(['editor'], { editor: [{}, {}] }, 2).complete, true);
assert.equal(comparisonCaptureStatus(undefined, 2, true), 'capture-missing', 'Stale files cannot replace current-run captures');
assert.equal(comparisonCaptureStatus([{}], 2, true), 'capture-incomplete');
assert.equal(comparisonCaptureStatus([{}, {}], 2, false), 'capture-missing');
assert.equal(comparisonCaptureStatus([{}, {}], 2, true), null);
assert.throws(() => requireExactFont({ fonts: [] }, 'Missing', 400, 'normal'), /No verified exact font binary/);
console.log('Capture integrity tests passed.');
const { captureRunIssues } = await import('./capture-integrity.mjs');
const completeRun = { expectedRepeat: 2, summaries: [{ fixtureId: 'sample', repeatability: { editor: { repeatCount: 2, stable: true } } }] };
assert.deepEqual(captureRunIssues(completeRun, ['sample'], ['editor']), []);
assert.ok(captureRunIssues(completeRun, ['sample'], ['png-export']).length);
assert.ok(captureRunIssues(completeRun, ['absent'], ['editor']).length);
assert.ok(captureRunIssues({ ...completeRun, expectedRepeat: 3 }, ['sample'], ['editor']).length);
assert.ok(captureRunIssues({ ...completeRun, summaries: [{ ...completeRun.summaries[0], error: 'capture failed' }] }, ['sample'], ['editor']).length);
assert.ok(captureRunIssues({ summaries: [{ fixtureId: 'sample', repeatability: { editor: { repeatCount: 2, stable: false } } }] }, ['sample'], ['editor']).length);

const { loadExactFontManifest } = await import('./fonts.mjs');
const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');
const directory = mkdtempSync(join(tmpdir(), 'fidelity-font-failure-'));
const previous = process.env.FUNNEL_DISPLAY_FIDELITY_FONT_PATH;
try {
  process.env.FUNNEL_DISPLAY_FIDELITY_FONT_PATH = join(directory, 'font.ttf');
  const requirement = [{ family: 'Funnel Display', weight: 400, style: 'normal' }];
  assert.throws(() => loadExactFontManifest(requirement), /Exact font file is missing/);
  writeFileSync(process.env.FUNNEL_DISPLAY_FIDELITY_FONT_PATH, 'not the verified font');
  assert.throws(() => loadExactFontManifest(requirement), /Exact font identity mismatch/);
} finally {
  if (previous === undefined) delete process.env.FUNNEL_DISPLAY_FIDELITY_FONT_PATH;
  else process.env.FUNNEL_DISPLAY_FIDELITY_FONT_PATH = previous;
  rmSync(directory, { recursive: true, force: true });
}

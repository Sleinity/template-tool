/** Current-run browser regressions; preserve fixed historical evidence paths. */
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
const output = resolve(process.argv[2] || '/tmp/f7-browser-guards');
mkdirSync(output, { recursive: true });
const checks = [
  ['session-react', 'scripts/repository/verify-session-contract-browser.mjs', [], 'fidelity/evidence/session-contract/browser.json'],
  ['image-ownership', 'scripts/repository/verify-image-replacement-ownership-browser.mjs', [], 'fidelity/evidence/image-replacement-ownership/browser.json'],
  ['font-reactivation', 'scripts/repository/verify-font-reactivation.mjs', [], 'fidelity/evidence/prerelease-20260929/font-reactivation.json'],
  ['output-lifecycle', 'scripts/editor-performance/verify.mjs', ['--output', resolve(output, 'output-lifecycle')]],
  ['font-routing', 'scripts/runtime-routing/font-evidence.mjs', ['--run-id', 'f7-readiness-fonts-20261015']],
  ['text-trim', 'scripts/runtime-routing/text-trim.mjs', ['--run-id', 'f7-readiness-text-20261015']],
];
const results = [];
for (const [id, script, args, fixed] of checks) {
  const previous = fixed && existsSync(fixed) ? readFileSync(fixed) : null;
  let result;
  try {
    result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env: process.env, maxBuffer: 32 * 1024 * 1024 });
    writeFileSync(resolve(output, `${id}.txt`), `${result.stdout || ''}\n${result.stderr || ''}`);
    if (fixed && existsSync(fixed)) writeFileSync(resolve(output, `${id}.json`), readFileSync(fixed));
  } finally {
    if (fixed) {
      if (previous) { mkdirSync(dirname(fixed), { recursive: true }); writeFileSync(fixed, previous); }
      else rmSync(fixed, { force: true });
    }
  }
  results.push({ id, script, args, exitCode: result.status, error: result.error?.message || null, historicalEvidenceRestored: Boolean(fixed) });
  writeFileSync(resolve(output, 'verification.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(`${id}: ${result.status}`);
}
if (results.some(item => item.exitCode !== 0)) process.exitCode = 1;

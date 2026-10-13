/** Compare two captured runs without promoting either to approved references. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { compareGeometry } from "../fidelity/core.mjs";
const [before, after, output] = process.argv.slice(2);
if (!before || !after || !output) throw new Error("Usage: node scripts/repository/verify-sdk-hardening-regression.mjs <before-run> <after-run> <report.json>");
const run = id => JSON.parse(readFileSync(`fidelity/candidates/${id}/run.json`));
const left = run(before), right = run(after);
assert.deepEqual(left.selectedFixtures, right.selectedFixtures);
assert.deepEqual(left.selectedSurfaces, right.selectedSurfaces);
const results = [];
for (const fixture of left.selectedFixtures) for (const surface of left.selectedSurfaces) {
  const path = id => `fidelity/candidates/${id}/${fixture}/${surface}/`;
  const byteIdentical = readFileSync(path(before) + "capture-1.png").equals(readFileSync(path(after) + "capture-1.png"));
  const geometry = compareGeometry(JSON.parse(readFileSync(path(before) + "structure-1.json")), JSON.parse(readFileSync(path(after) + "structure-1.json")));
  results.push({ fixture, surface, byteIdentical, geometry });
}
writeFileSync(output, JSON.stringify({ before, after, results }, null, 2) + "\n");
assert(results.length > 0 && results.every(result => result.byteIdentical && result.geometry.equal), "Before/after pixels or geometry changed; inspect the retained report.");
console.log(`${results.length} surfaces: byte-identical PNGs and matching geometry; no reference promotion.`);

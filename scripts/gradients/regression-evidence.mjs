#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  compareGeometry,
  loadManifest,
  normalizeStructuralSnapshot,
  parseArguments,
  repoRoot,
  stableStringify,
} from "../fidelity/core.mjs";
import { comparePng } from "../fidelity/image.mjs";

const args = parseArguments(process.argv.slice(2));
const currentRun = String(args["current-run"] || "milestone-7-3a-all-regression");
const previousRun = String(args["previous-run"] || "milestone-7-2-all-final");
const output = resolve(args.output || join(repoRoot, "fidelity/evidence/milestone-7-3a-gradients/regression.json"));
const surfaces = ["validate", "fields", "editor", "png-export"];
const manifest = loadManifest();
const results = [];

for (const fixture of manifest.fixtures) {
  for (const surface of surfaces) {
    const previousDirectory = join(repoRoot, "fidelity/candidates", previousRun, fixture.id, surface);
    const currentDirectory = join(repoRoot, "fidelity/candidates", currentRun, fixture.id, surface);
    const previousPng = join(previousDirectory, "capture-1.png");
    const currentPng = join(currentDirectory, "capture-1.png");
    const previousStructure = join(previousDirectory, "structure-1.json");
    const currentStructure = join(currentDirectory, "structure-1.json");
    if (![previousPng, currentPng, previousStructure, currentStructure].every(existsSync)) continue;
    const pixel = comparePng(previousPng, currentPng, { threshold: 0.1, allowedChangedPixelPercentage: 0 });
    delete pixel.differenceImage;
    const geometry = compareGeometry(
      normalizeStructuralSnapshot(JSON.parse(readFileSync(previousStructure, "utf8"))),
      normalizeStructuralSnapshot(JSON.parse(readFileSync(currentStructure, "utf8"))),
    );
    results.push({ fixtureId: fixture.id, surface, pixel, geometry });
  }
}

if (results.length === 0) throw new Error(`No comparable outputs found for ${previousRun} and ${currentRun}.`);
mkdirSync(resolve(output, ".."), { recursive: true });
writeFileSync(output, stableStringify({
  schemaVersion: "linear-gradient-regression-evidence-v1",
  previousRun,
  currentRun,
  comparisons: results,
  summary: {
    count: results.length,
    pixelExact: results.filter((item) => item.pixel.exact).length,
    geometryEqual: results.filter((item) => item.geometry.equal).length,
    changed: results.filter((item) => !item.pixel.exact || !item.geometry.equal).map((item) => `${item.fixtureId}/${item.surface}`),
  },
}));
console.log(`[gradient-regression] comparisons=${results.length} pixelExact=${results.filter((item) => item.pixel.exact).length} geometryEqual=${results.filter((item) => item.geometry.equal).length}`);
console.log(`[gradient-regression] output=${output}`);
if (results.some((item) => !item.pixel.exact || !item.geometry.equal)) process.exitCode = 1;


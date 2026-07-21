#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadManifest, parseArguments, repoRoot, selectFixtures, stableStringify, verifyFixture } from "../fidelity/core.mjs";
import { resolveSceneModel } from "../scene-graph/model.mjs";

const [command = "baseline", ...rest] = process.argv.slice(2);
const args = parseArguments(rest);
const manifest = loadManifest();
const fixtures = selectFixtures(manifest, args.fixture);
const runId = String(args["run-id"] || `appearance-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const outputRoot = resolve(String(args.output || join(repoRoot, "fidelity", "appearance-contracts", "candidates")), runId);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

if (!["baseline", "report"].includes(command)) throw new Error(`Unknown appearance command ${command}.`);
const records = [];
for (const fixture of fixtures) {
  const verified = verifyFixture(manifest, fixture);
  const first = await resolveSceneModel(verified);
  const second = await resolveSceneModel(verified);
  const firstText = stableStringify(first.appearance);
  const secondText = stableStringify(second.appearance);
  const deterministic = firstText === secondText;
  const directory = join(outputRoot, fixture.id);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "appearance.json"), firstText);
  writeFileSync(join(directory, "source-sufficiency.json"), stableStringify(first.appearance.sourceSufficiency));
  writeFileSync(join(directory, "backend-requirements.json"), stableStringify(first.appearance.backendRequirements));
  writeFileSync(join(directory, "validation.json"), stableStringify(first.appearanceValidation));
  const record = {
    fixtureId: fixture.id,
    zipSha256: fixture.zipSha256,
    appearanceSha256: sha256(firstText),
    deterministic,
    valid: first.appearanceValidation.valid,
    counts: Object.fromEntries(["media", "geometry", "paints", "strokes", "masks", "effects", "compositing"].map((family) => [family, first.appearance[family].length])),
    performance: { appearanceMs: first.performance.appearanceMs, serializedAppearanceBytes: first.performance.serializedAppearanceBytes },
  };
  records.push(record);
  console.log(`[appearance] fixture=${fixture.id} valid=${record.valid} deterministic=${deterministic} bytes=${record.performance.serializedAppearanceBytes}`);
}
mkdirSync(outputRoot, { recursive: true });
writeFileSync(join(outputRoot, "run.json"), stableStringify({ schemaVersion: "appearance-contract-run-v1", runId, command, fixtures: records }));
if (records.some((record) => !record.valid || !record.deterministic)) process.exitCode = 1;

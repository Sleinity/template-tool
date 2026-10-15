import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { captureRunIssues } from "./capture-integrity.mjs";
import { repoRoot, surfaces } from "./core.mjs";

export const sdkGateProfilePath = join(repoRoot, "fidelity", "gates", "sdk-061.json");

export function loadSdkGateProfile(path = sdkGateProfilePath) {
  const profile = JSON.parse(readFileSync(path, "utf8"));
  if (profile.schemaVersion !== "sdk-fidelity-gate-v1" || profile.id !== "sdk-061" ||
      profile.exporterVersion !== "0.6.1" || profile.minimumRepeats !== 2 ||
      !Array.isArray(profile.fixtures) || profile.fixtures.length !== 3 ||
      JSON.stringify(profile.surfaces) !== JSON.stringify(surfaces)) {
    throw new Error("SDK 0.6.1 gate profile has an invalid contract.");
  }
  return profile;
}

export function selectSdkGateFixtures(manifest, profile = loadSdkGateProfile()) {
  const ids = new Set();
  return profile.fixtures.map(record => {
    if (ids.has(record.id)) throw new Error(`SDK gate has duplicate fixture ${record.id}.`);
    ids.add(record.id);
    const fixture = manifest.fixtures.find(item => item.id === record.id);
    if (!fixture) throw new Error(`SDK gate fixture ${record.id} is missing from the registry.`);
    if (fixture.exporterVersion !== profile.exporterVersion || fixture.zipSha256 !== record.zipSha256 ||
        fixture.templateJsonSha256 !== record.templateJsonSha256 ||
        fixture.embeddedPreview?.sha256 !== record.embeddedPreviewSha256) {
      throw new Error(`SDK gate fixture ${record.id} identity differs from the tracked profile.`);
    }
    return fixture;
  });
}

export function gateFixtureSelection(manifest, args) {
  if (!args.gate) return null;
  if (args.gate !== "sdk-061") throw new Error(`Unknown fidelity gate ${args.gate}.`);
  if (args.fixture || args.surface || args._?.length) throw new Error("SDK gate selection cannot be narrowed with fixture or surface options.");
  return selectSdkGateFixtures(manifest);
}

export function assertSdkGateCaptureRun(run, fixtures, expectedRunId) {
  const ids = fixtures.map(item => item.id);
  const issues = [];
  if (run.runId !== expectedRunId) issues.push("run identity differs");
  if (run.gate !== "sdk-061") issues.push("gate identity missing");
  if (JSON.stringify(run.selectedFixtures) !== JSON.stringify(ids)) issues.push("fixture selection differs");
  if (JSON.stringify(run.selectedSurfaces) !== JSON.stringify(surfaces)) issues.push("surface selection differs");
  if ((run.expectedRepeat ?? 0) < 2) issues.push("fewer than two captures per surface");
  if (run.summaries?.length !== ids.length || new Set(run.summaries?.map(item => item.fixtureId)).size !== ids.length) issues.push("capture summary records are missing or duplicated");
  for (const fixture of fixtures) {
    if (run.fixtures?.find(item => item.id === fixture.id)?.zipSha256 !== fixture.zipSha256) issues.push(`${fixture.id}: ZIP identity differs`);
  }
  issues.push(...captureRunIssues(run, ids, surfaces));
  if (issues.length) throw new Error(`SDK gate capture ${expectedRunId} incomplete: ${issues.join("; ")}`);
}

export function readSdkGateCaptureRun(fidelityRoot, runId, fixtures) {
  const path = join(fidelityRoot, runId, "run.json");
  if (!existsSync(path)) throw new Error(`SDK gate capture run missing: ${path}`);
  const run = JSON.parse(readFileSync(path, "utf8"));
  assertSdkGateCaptureRun(run, fixtures, runId);
  for (const fixture of fixtures) for (const surface of surfaces) for (let repeat = 1; repeat <= run.expectedRepeat; repeat++) {
    for (const file of [`capture-${repeat}.png`, `structure-${repeat}.json`]) {
      if (!existsSync(join(fidelityRoot, runId, fixture.id, surface, file))) throw new Error(`SDK gate capture artifact missing: ${fixture.id}/${surface}/${file}`);
    }
  }
  const environmentPath = join(fidelityRoot, runId, "environment.json");
  if (!existsSync(environmentPath)) throw new Error(`SDK gate environment missing: ${environmentPath}`);
  return { run, environment: JSON.parse(readFileSync(environmentPath, "utf8")) };
}

#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadManifest, parseArguments, repoRoot, sha256, stableStringify, surfaces } from "./core.mjs";
import { selectSdkGateFixtures } from "./gate-profile.mjs";
import { trackedSdkGateDispositionPath, validateSdkGateDisposition } from "./gate-disposition.mjs";

const args = parseArguments(process.argv.slice(2));
const runId = String(args["run-id"] || "");
if (!runId) throw new Error("--run-id is required to bind dispositions to one capture run.");
let priorReview = null;
let archivePath = null;
if (existsSync(trackedSdkGateDispositionPath)) {
  if (!args.replace || typeof args.reason !== "string" || args.reason.trim().length < 20) {
    throw new Error("Tracked dispositions already exist. To start a new run, pass --replace --reason with at least 20 characters; the prior review is archived.");
  }
  priorReview = JSON.parse(readFileSync(trackedSdkGateDispositionPath, "utf8"));
  archivePath = join(repoRoot, "fidelity", "gates", "archive", `sdk-061-dispositions-${priorReview.runId}.json`);
  if (existsSync(archivePath)) throw new Error(`Prior review archive already exists: ${archivePath}`);
}
const fixtures = selectSdkGateFixtures(loadManifest());
const fidelityRoot = join(repoRoot, "fidelity", "candidates", runId);
const run = JSON.parse(readFileSync(join(fidelityRoot, "run.json"), "utf8"));
if (run.runId !== runId || run.gate !== "sdk-061" || JSON.stringify(run.selectedFixtures) !== JSON.stringify(fixtures.map(item => item.id))) throw new Error("Capture run does not match the SDK gate profile.");
const environment = JSON.parse(readFileSync(join(fidelityRoot, "environment.json"), "utf8"));
const rendererComparisonPath = join(fidelityRoot, "comparison.json");
const renderer = existsSync(rendererComparisonPath) ? JSON.parse(readFileSync(rendererComparisonPath, "utf8")) : null;
const scenePath = join(repoRoot, "fidelity", "scene-graph", "candidates", runId, "comparison.json");
const settlementPath = join(repoRoot, "fidelity", "settlement", "candidates", runId, "reference-comparison.json");
const scene = existsSync(scenePath) ? JSON.parse(readFileSync(scenePath, "utf8")) : null;
const settlement = existsSync(settlementPath) ? JSON.parse(readFileSync(settlementPath, "utf8")) : null;
for (const [name, result] of [["renderer", renderer], ["scene", scene], ["settlement", settlement]]) if (result && result.runId !== runId) throw new Error(`${name} comparison belongs to a different run.`);
const record = {
  schemaVersion: "sdk-061-dispositions-v1", gate: "sdk-061", runId,
  environmentSha256: sha256(JSON.stringify(environment)),
  regenerate: `node scripts/fidelity/sdk-gate.mjs --run-id <new-unique-run-id>`,
  fixtures: fixtures.map(fixture => {
    const summary = run.summaries.find(item => item.fixtureId === fixture.id);
    const blocked = Boolean(summary?.error);
    const surfacesRecord = Object.fromEntries(surfaces.map(surface => {
      const comparison = renderer?.comparisons?.find(item => item.fixtureId === fixture.id && item.surface === surface);
      const imagePath = join(fidelityRoot, fixture.id, surface, "capture-1.png");
      return [surface, {
        capture: blocked ? "blocked" : summary?.repeatability?.[surface]?.stable ? "complete-stable" : "incomplete-or-unstable",
        comparison: comparison?.status ?? "not-compared",
        candidatePngSha256: existsSync(imagePath) ? sha256(readFileSync(imagePath)) : null,
        sourceReview: "pending",
        cause: summary?.error ?? (comparison?.status === "unapproved" ? "Approved reference missing." : comparison?.status === "fail" ? "Current candidate differs from approved reference." : "Source/output comparison remains to be reviewed."),
        reviewerRationale: "No individual source-fidelity approval has been recorded for this surface.",
        evidence: `fidelity/candidates/${runId}/${fixture.id}/${surface}`,
        regenerate: `node scripts/fidelity/cli.mjs compare --fixture ${fixture.id} --font-profile source-authoritative --run-id <new-unique-run-id>`,
      }];
    }));
    const sceneComparison = scene?.comparisons?.find(item => item.fixtureId === fixture.id);
    return {
      id: fixture.id, zipSha256: fixture.zipSha256, templateJsonSha256: fixture.templateJsonSha256, embeddedPreviewSha256: fixture.embeddedPreview.sha256,
      surfaces: surfacesRecord,
      scene: { comparison: sceneComparison?.status ?? "not-compared", sourceReview: "pending", cause: blocked ? summary.error : sceneComparison?.status === "unapproved" ? "Approved scene reference missing." : "Scene evidence pending review.", reviewerRationale: "No individual scene source review has been recorded.", regenerate: `node scripts/scene-graph/cli.mjs compare --fixture ${fixture.id} --run-id <new-unique-run-id>` },
      settlement: Object.fromEntries(surfaces.map(surface => {
        const compared = settlement?.comparisons?.find(item => item.fixtureId === fixture.id && item.surface === surface);
        return [surface, { comparison: compared ? compared.equal ? "pass" : "fail-or-unapproved" : "not-compared", sourceReview: "pending", cause: blocked ? summary.error : compared?.equal === false ? "Settlement reference differs or is missing." : "Settlement evidence pending review.", reviewerRationale: "No individual settlement source review has been recorded.", regenerate: `node scripts/settlement/cli.mjs compare --fixture ${fixture.id} --fidelity-run ${runId} --run-id <new-unique-run-id>` }];
      })),
    };
  }),
};
validateSdkGateDisposition(record, fixtures, runId, record.environmentSha256);
if (priorReview) {
  mkdirSync(join(repoRoot, "fidelity", "gates", "archive"), { recursive: true });
  writeFileSync(archivePath, stableStringify({ ...priorReview, supersededBy: runId, supersessionReason: args.reason.trim() }));
}
writeFileSync(trackedSdkGateDispositionPath, stableStringify(record));
console.log(`[sdk-061] tracked dispositions=${trackedSdkGateDispositionPath}`);

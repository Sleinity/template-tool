#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { loadManifest, parseArguments, repoRoot, sha256, stableStringify, surfaces, verifyFixture } from "../fidelity/core.mjs";
import { readSdkGateCaptureRun, selectSdkGateFixtures } from "../fidelity/gate-profile.mjs";
import { observationFromStructure } from "./core.mjs";
import { resolveSettlementModel } from "./model.mjs";

const options = parseArguments(process.argv.slice(2));
const runId = String(options["fidelity-run"] || "");
assert.ok(runId, "Pass the exact --fidelity-run to bind source evidence.");
// Match the settlement CLI's explicit environment policy. Raw fidelity
// environments do not carry an observational profile property.
const profile = String(options.profile || "chromium-headless");
assert.equal(profile, "chromium-headless", "This gate uses the headless SDK capture profile.");
const manifest = loadManifest();
const fixtures = selectSdkGateFixtures(manifest);
const root = join(repoRoot, "fidelity", "candidates");
const capture = readSdkGateCaptureRun(root, runId, fixtures);
const rows = [];
for (const fixture of fixtures) {
  const verified = verifyFixture(manifest, fixture);
  const entries = unzipSync(new Uint8Array(verified.bytes));
  assert.equal(sha256(entries["template.json"]), fixture.templateJsonSha256);
  const raw = JSON.parse(Buffer.from(entries["template.json"]).toString("utf8"));
  for (const surface of surfaces) {
    const first = JSON.parse(readFileSync(join(root, runId, fixture.id, surface, "structure-1.json"), "utf8"));
    const observation = observationFromStructure(fixture, first, { profile, fidelityRun: runId });
    const model = await resolveSettlementModel(verified, observation);
    assert.equal(model.settled.readiness, "ready", `${fixture.id}/${surface} must have current settled evidence.`);
    assert.deepEqual(model.settled.unresolvedDependencies, []);
    for (const declared of raw.maskRelationships ?? []) {
      const source = raw.nodes[declared.maskSourceId];
      assert.equal(source.mask.isMask, true);
      assert.equal(source.mask.maskType, "ALPHA");
      const authoritative = model.maskResolution.relationships.find((item) => item.maskSourceId === declared.maskSourceId);
      assert.equal(authoritative.capability, "exact-opaque-rectangular-alpha");
      // Compare before the harness's existing four-decimal snapshot normalization.
      const evidence = model.maskEvidence[declared.maskSourceId].relationships[0];
      assert.deepEqual(evidence.maskBounds, source.bounds.relative);
      assert.deepEqual(evidence.affectedSiblingIds, declared.affectedSiblingIds);
      assert.deepEqual(evidence.affected, authoritative.affected);
      assert.deepEqual(evidence.provenance.raw, declared);
      assert.equal(evidence.maskRevision, authoritative.maskRevision);
      assert.equal(first.nodes.find((node) => node.id === declared.maskSourceId).dataAttributes["data-package-node-id"], undefined, "Mask-input RGB must remain unpainted.");
      for (const affectedId of declared.affectedSiblingIds) {
        const attrs = first.nodes.find((node) => node.id === affectedId).dataAttributes;
        assert.equal(attrs["data-package-mask-revision"], evidence.maskRevision);
        assert.equal(attrs["data-package-mask-relationship"], evidence.relationshipId);
        assert.equal(attrs["data-package-mask-capability"], evidence.capability);
        assert.equal(attrs["data-package-mask-render-strategy"], evidence.renderStrategy);
      }
    }
    const second = JSON.parse(readFileSync(join(root, runId, fixture.id, surface, "structure-2.json"), "utf8"));
    const repeat = await resolveSettlementModel(verified, observationFromStructure(fixture, second, { profile, fidelityRun: runId }));
    assert.deepEqual(repeat.settled, model.settled);
    assert.deepEqual(repeat.dependencies, model.dependencies);
    rows.push({ fixtureId: fixture.id, surface, zipSha256: fixture.zipSha256, templateJsonSha256: fixture.templateJsonSha256,
      readiness: model.settled.readiness, maskRelations: model.maskResolution.relationships.length,
      settlementMs: [model.performance.settlementMs, repeat.performance.settlementMs] });
  }
  if (raw.maskRelationships?.length) {
    for (const scenario of [
      { id: "source-width", type: "mask-state", target: "source", property: "width", value: raw.nodes[raw.maskRelationships[0].maskSourceId].bounds.relative.width - 10 },
      { id: "affected-width", type: "mask-state", target: "affected", property: "width", value: raw.nodes[raw.maskRelationships[0].affectedSiblingIds[0]].bounds.relative.width + 10 },
      { id: "partial-alpha", type: "mask-state", target: "source", property: "opacity", value: 0.5 },
    ]) {
      const changed = await resolveSettlementModel(verified, null, scenario);
      const sourceId = raw.maskRelationships[0].maskSourceId;
      assert.equal(changed.settled.nodes[sourceId].mask.status, scenario.property === "opacity" ? "unresolved" : "resolved");
      assert.ok(changed.settled.invalidation.affectedNodeIds.includes(sourceId));
      assert.ok(changed.settled.invalidation.exportReadinessInvalidated);
    }
  }
}
const output = join(repoRoot, "fidelity", "evidence", "observational-mask-settlement", runId);
mkdirSync(output, { recursive: true });
writeFileSync(join(output, "report.json"), stableStringify({ schemaVersion: "observational-mask-evidence-v1", fidelityRun: runId,
  environmentProfile: profile, environmentSha256: sha256(JSON.stringify(capture.environment)), review: "Automated source/recorded-browser telemetry; scenarios are synthetic contract evidence.", rows }));
console.log(`[mask-settlement] run=${runId} source/browser rows=${rows.length} all-ready=true exact-authority=true report=${output}/report.json`);

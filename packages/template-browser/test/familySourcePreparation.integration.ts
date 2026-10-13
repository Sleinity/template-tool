import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { runTemplatePackageImportPipelineV2 } from "../src/import/runTemplatePackageImportPipelineV2";
import { appendTemplateSourcesV2, createTemplateFieldFamilyFromSourcesV2, type TemplateImportSourceV2 } from "../src/import/templateSourceAssemblyV2";
import { baselineAppendTemplateSourcesV2, baselineCreateTemplateFieldFamilyFromSourcesV2 } from "./familyAuthoringBaseline";

type Work = Record<string, number>;
const instrumentation = globalThis as typeof globalThis & { __familyPreparationWork?: Work };

// Sorted object keys, explicit undefined and ordered arrays: JSON alone loses
// optional-property presence. This is test evidence, not a persistence schema.
function structural(value: unknown): unknown {
  if (value === undefined) return ["undefined"];
  if (value === null || typeof value !== "object") return [typeof value, value];
  if (Array.isArray(value)) return ["array", value.map(structural)];
  return ["object", Object.keys(value).sort().map(key => [key, structural((value as Record<string, unknown>)[key])])];
}

function fixedIdentity<T>(operation: () => T): T {
  const original = crypto.randomUUID;
  // Each independently invoked authority gets the same Family ID. No source or
  // variant identity is normalized in the result comparison.
  crypto.randomUUID = () => "00000000-0000-4000-8000-000000000001";
  try { return operation(); } finally { crypto.randomUUID = original; }
}

export async function verifyFamilyPreparationFixture(buffer: ArrayBuffer, filename: string, fixtureId: string) {
  const imported = await runTemplatePackageImportPipelineV2({ format: "zip", buffer, sourceName: filename, sourceId: fixtureId, fontRegistry: null });
  assert.equal(imported.status, "ready"); assert(imported.package);
  const rows: unknown[] = [];
  try {
    for (const designs of [1, 5, 20]) {
      const sources: TemplateImportSourceV2[] = Array.from({ length: designs }, (_, index) => ({
        id: `${fixtureId}-synthetic-${index}`, name: filename, packageValue: imported.package!,
      }));
      const previous = [{ ...sources[0], id: `${fixtureId}-accepted-1` }, { ...sources[0], id: `${fixtureId}-accepted-2` }];
      for (const scenario of ["initial", "fresh-batch", "promotion", "append"] as const) {
        const accepted = scenario === "promotion"
          ? fixedIdentity(() => baselineAppendTemplateSourcesV2(null, [], previous.slice(0, 1), "Accepted"))
          : scenario === "append" ? fixedIdentity(() => baselineAppendTemplateSourcesV2(null, [], previous, "Accepted")) : null;
        const acceptedSnapshot = accepted?.getSnapshot();
        try {
          for (let trial = 0; trial < 8; trial++) {
            const pair: Record<string, { ms: number; work: Work; result: unknown; hash: string }> = {};
            for (const path of trial % 2 ? ["current", "baseline"] : ["baseline", "current"]) {
              const create = path === "baseline" ? baselineCreateTemplateFieldFamilyFromSourcesV2 : createTemplateFieldFamilyFromSourcesV2;
              const append = path === "baseline" ? baselineAppendTemplateSourcesV2 : appendTemplateSourcesV2;
              instrumentation.__familyPreparationWork = {};
              const started = performance.now();
              const candidate = fixedIdentity(() => scenario === "initial"
                ? create(sources.map(source => source.packageValue as NonNullable<typeof imported.package>), "Measured Family")
                : append(accepted, previous, sources, "Measured Family"));
              const ms = performance.now() - started;
              const work = instrumentation.__familyPreparationWork;
              instrumentation.__familyPreparationWork = undefined;
              let result: unknown = candidate;
              if ("getSnapshot" in candidate) {
                const snapshot = candidate.getSnapshot();
                const keys = ["status", "family", "basePackage", "contentState", "sessionAssets", "workingPackage", "rendererPackage", "resolvedTree", "fields", "readiness", "error"] as const;
                result = Object.fromEntries(keys.filter(key => key in snapshot).map(key => [key, (snapshot as unknown as Record<string, unknown>)[key]]));
                candidate.dispose();
              }
              pair[path] = { ms, work, result, hash: createHash("sha256").update(JSON.stringify(structural(result))).digest("hex") };
              assert.equal(accepted?.getSnapshot(), acceptedSnapshot, "Candidate preparation must not publish into the accepted session");
            }
            assert.deepEqual(pair.current.result, pair.baseline.result, `${fixtureId}/${designs}/${scenario}: complete authority output`);
            assert.equal(pair.current.hash, pair.baseline.hash);
            if (trial) rows.push({ fixtureId, designs, scenario, trial, syntheticRepetition: true,
              baseline: { ms: pair.baseline.ms, work: pair.baseline.work },
              current: { ms: pair.current.ms, work: pair.current.work }, outputSha256: pair.current.hash });
          }
        } finally { accepted?.dispose(); }
      }
    }
    return rows;
  } finally { instrumentation.__familyPreparationWork = undefined; imported.dispose(); }
}

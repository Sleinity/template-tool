import { stableStringify, surfaces } from "./core.mjs";

function exactPairs(comparisons, fixtures, withSurfaces, label) {
  const expected = new Set(fixtures.flatMap(fixture => withSurfaces ? surfaces.map(surface => `${fixture.id}/${surface}`) : [fixture.id]));
  const seen = new Set();
  for (const item of comparisons ?? []) {
    const key = withSurfaces ? `${item.fixtureId}/${item.surface}` : item.fixtureId;
    if (seen.has(key)) throw new Error(`${label} has duplicate record ${key}.`);
    if (!expected.has(key)) throw new Error(`${label} has unselected record ${key}.`);
    seen.add(key);
  }
  for (const key of expected) if (!seen.has(key)) throw new Error(`${label} is missing ${key}.`);
}

export function validateSdkGateComparisons({ runId, fixtures, renderer, scene, settlement }) {
  if (!renderer || !scene || !settlement) throw new Error("SDK gate comparison evidence is incomplete.");
  for (const [label, result] of [["renderer", renderer], ["scene", scene], ["settlement", settlement]]) {
    if (result.runId !== runId || result.gate !== "sdk-061") throw new Error(`${label} comparison belongs to another run or gate.`);
  }
  if (scene.sourceFidelityRun !== runId || settlement.sourceFidelityRun !== runId) throw new Error("Scene or settlement evidence is not bound to the fidelity capture run.");
  exactPairs(renderer.comparisons, fixtures, true, "Renderer");
  exactPairs(scene.comparisons, fixtures, false, "Scene");
  exactPairs(settlement.comparisons, fixtures, true, "Settlement");
  return true;
}

export function validateSdkGateEnvironments({ fidelity, scene, settlement }) {
  if (!fidelity || !scene || !settlement) throw new Error("SDK gate environment evidence is incomplete.");
  if (stableStringify(scene) !== stableStringify(fidelity) || stableStringify(settlement.source) !== stableStringify(fidelity)) {
    throw new Error("Scene or settlement environment differs from the fidelity capture environment.");
  }
  return true;
}

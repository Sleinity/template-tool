import type { MeasurementSnapshotV1, SettlementComparisonV1, SettlementDifferenceCategory, SettledSceneGraphV1 } from "./types";

type Rect = { x: number; y: number; width: number; height: number };
const maximumDelta = (left: Rect, right: Rect): number => Math.max(...(["x", "y", "width", "height"] as const).map((key) => Math.abs(left[key] - right[key])));

export function compareSettlementToMeasurements(
  settled: SettledSceneGraphV1,
  measurements: MeasurementSnapshotV1,
  tolerances: Partial<{ geometry: number; text: number }> = {},
): SettlementComparisonV1 {
  if (settled.fixture.id !== measurements.fixture.id || settled.fixture.zipSha256 !== measurements.fixture.zipSha256) throw new Error("Settlement comparison fixture identity/hash mismatch.");
  const tolerance = { geometry: tolerances.geometry ?? 0.25, text: tolerances.text ?? 0.5 };
  const measuredBounds = new Map(measurements.records.filter((item) => item.property === "bounds" && item.valid).map((item) => [item.nodeId, item.value as Rect]));
  const results: SettlementComparisonV1["nodeResults"] = [];
  for (const nodeId of settled.nodeOrder) {
    const node = settled.nodes[nodeId];
    const measured = measuredBounds.get(nodeId);
    let category: SettlementDifferenceCategory;
    let properties: string[] = [];
    let delta = 0;
    let note = "";
    if (!measured) {
      category = node.unresolved.length ? "measurement-gap" : "contract-gap";
      properties = ["bounds"];
      note = "No observational DOM bounds record exists for this scene node.";
    } else {
      delta = maximumDelta(node.bounds, measured);
      properties = (["x", "y", "width", "height"] as const).filter((key) => Math.abs(node.bounds[key] - measured[key]) > tolerance.geometry);
      if (delta === 0) { category = "exact"; note = "Settled bounds match the current DOM observation exactly."; }
      else if (!properties.length) { category = "within-tolerance"; note = "Difference is within the fixed geometry tolerance."; }
      else if (node.boundsAuthority === "measurement") { category = "current-runtime-compatibility"; note = "Current DOM geometry is an explicit observational input; differing derived state is a compatibility dependency."; }
      else { category = "likely-future-renderer-bug"; note = "Pure settlement prediction differs from observed DOM geometry beyond tolerance."; }
    }
    if (node.mask.status === "unresolved" || node.effects.status === "unresolved") {
      if (category === "exact" || category === "within-tolerance") note += " Unsupported mask/effect semantics remain explicit placeholders.";
    }
    results.push({ nodeId, category, properties, maximumDelta: Number(delta.toFixed(6)), note });
  }
  const categories: SettlementDifferenceCategory[] = ["exact", "within-tolerance", "contract-gap", "dependency-gap", "measurement-gap", "current-runtime-compatibility", "environment-variance", "unsupported-preserved", "likely-future-renderer-bug"];
  const summary = Object.fromEntries(categories.map((category) => [category, results.filter((item) => item.category === category).length])) as Record<SettlementDifferenceCategory, number>;
  return {
    schemaVersion: "settlement-comparison-v1",
    fixture: { ...settled.fixture },
    surface: settled.surface,
    tolerances: tolerance,
    nodeResults: results,
    summary,
    equivalentWithinTolerance: results.every((item) => item.category === "exact" || item.category === "within-tolerance"),
  };
}

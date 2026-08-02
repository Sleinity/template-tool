import type { AppearanceContractProjectionV1, AppearanceContractValidationIssue } from "./types";

export function validateAppearanceContractProjection(value: AppearanceContractProjectionV1): { valid: boolean; issues: AppearanceContractValidationIssue[] } {
  const issues: AppearanceContractValidationIssue[] = [];
  if (value.schemaVersion !== "appearance-contract-projection-v1") issues.push({ code: "appearance.invalid-version", path: "schemaVersion", message: "Unsupported appearance contract version." });
  if (!value.nodeOrder.includes(value.rootNodeId)) issues.push({ code: "appearance.missing-root", path: "rootNodeId", message: "Root must be present in nodeOrder." });
  const ids = new Set(value.nodeOrder);
  for (const [family, entries] of Object.entries({ media: value.media, geometry: value.geometry, paints: value.paints, strokes: value.strokes, masks: value.masks, effects: value.effects, compositing: value.compositing })) {
    for (const [index, entry] of entries.entries()) {
      if (!ids.has(entry.nodeId)) issues.push({ code: "appearance.unknown-node", path: `${family}.${index}.nodeId`, message: `Unknown node ${entry.nodeId}.` });
    }
  }
  for (const [index, stack] of value.paints.entries()) if (stack.paints.some((paint, sourceIndex) => paint.sourceIndex !== sourceIndex)) issues.push({ code: "appearance.paint-order", path: `paints.${index}`, message: "Paint sourceIndex must preserve source order." });
  for (const [index, stack] of value.effects.entries()) if (stack.effects.some((effect, sourceIndex) => effect.sourceIndex !== sourceIndex)) issues.push({ code: "appearance.effect-order", path: `effects.${index}`, message: "Effect sourceIndex must preserve source order." });
  return { valid: issues.length === 0, issues };
}

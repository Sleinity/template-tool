import { maskClipInsets } from "../../masks/packageMaskRelationships";
import type { SettlementInputV1, SettledNodeV1 } from "./types";

const same = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) &&
    left.length === right.length && left.every((value, index) => same(value, right[index]));
  const a = left as Record<string, unknown>;
  const b = right as Record<string, unknown>;
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((key) => Object.prototype.hasOwnProperty.call(b, key) && same(a[key], b[key]));
};
const sameRect = (left: { x: number; y: number; width: number; height: number }, right: typeof left): boolean =>
  (["x", "y", "width", "height"] as const).every((key) => left[key] === right[key]);

/** Projects existing mask authority; never selects a new capability or visual owner. */
export function settleMaskEvidence(input: SettlementInputV1): Map<string, SettledNodeV1["mask"]> {
  const result = new Map<string, SettledNodeV1["mask"]>();
  const declarations = input.scene.maskRelationships ?? [];
  const resolutions = input.maskResolution?.relationships ?? [];
  for (const nodeId of input.scene.nodeOrder) {
    const node = input.scene.nodes[nodeId];
    if (node.relationships.maskRelationship.isMask || node.relationships.maskRelationship.relationshipId) {
      result.set(nodeId, { status: "unresolved", dependencyKeys: [`node:${nodeId}:bounds`, `node:${nodeId}:mask-range`] });
    }
  }
  for (const declaration of declarations) {
    const source = input.scene.nodes[declaration.maskSourceId];
    const parent = input.scene.nodes[declaration.parentId];
    const matches = resolutions.filter((entry) => entry.relationshipId === declaration.relationshipId);
    const resolution = matches.length === 1 ? matches[0] : null;
    const members = [declaration.maskSourceId, ...declaration.affectedSiblingIds];
    const overlapping = declarations.some((other) => other !== declaration &&
      (other.maskSourceId === declaration.maskSourceId || other.affectedSiblingIds.some((id) => declaration.affectedSiblingIds.includes(id))));
    const dependencies = [...new Set([
      `node:${declaration.maskSourceId}:mask-range`, `node:${declaration.parentId}:semantic`,
      ...members.map((id) => `node:${id}:bounds`),
    ])].sort();
    let lastIndex = parent?.identity.children.indexOf(declaration.maskSourceId) ?? -1;
    const scopeValid = Boolean(source && parent && source.identity.parentId === declaration.parentId &&
      source.relationships.maskRelationship.isMask && source.relationships.maskRelationship.maskedSiblingRange === "source-declared" &&
      source.relationships.maskRelationship.relationshipId === declaration.relationshipId &&
      same(source.relationships.maskRelationship.affectedSiblingIds, declaration.affectedSiblingIds) &&
      lastIndex >= 0 && declaration.affectedSiblingIds.length &&
      declaration.affectedSiblingIds.every((id) => {
        const index = parent.identity.children.indexOf(id);
        const valid = input.scene.nodes[id]?.identity.parentId === declaration.parentId && index > lastIndex;
        lastIndex = index;
        return valid;
      }));
    const current = !overlapping && scopeValid && resolution &&
      declaration.status === "valid" && resolution.status === "valid" &&
      declaration.confidence === "high" &&
      declaration.capability === "exact-opaque-rectangular-alpha" && resolution.capability === declaration.capability &&
      declaration.renderStrategy === "css-clip-path" && resolution.renderStrategy === declaration.renderStrategy &&
      declaration.maskType === "ALPHA" && resolution.maskType === declaration.maskType &&
      declaration.scopeTerminationReason === "end_of_siblings" &&
      resolution.source.scopeTerminationReason === declaration.scopeTerminationReason &&
      resolution.maskRevision === declaration.maskRevision &&
      resolution.maskSourceId === declaration.maskSourceId && resolution.parentId === declaration.parentId &&
      same(resolution.source, declaration.provenance.raw) &&
      same(resolution.affected.map((entry) => entry.nodeId), declaration.affectedSiblingIds) &&
      resolution.maskBounds && sameRect(resolution.maskBounds, source.geometry.relativeBounds.value) &&
      resolution.affected.every((entry) => entry.clipInsets &&
        same(entry.clipInsets, maskClipInsets(resolution.maskBounds!, input.scene.nodes[entry.nodeId].geometry.relativeBounds.value)));
    for (const nodeId of members) {
      if (!input.scene.nodes[nodeId]) continue;
      const previous = result.get(nodeId);
      if (!current || previous?.relationships?.length) {
        result.set(nodeId, { status: "unresolved", dependencyKeys: dependencies });
        continue;
      }
      result.set(nodeId, {
        status: "resolved", dependencyKeys: dependencies,
        relationships: [{
          relationshipId: declaration.relationshipId, maskRevision: resolution.maskRevision,
          role: nodeId === declaration.maskSourceId ? "source" : "affected",
          maskSourceId: declaration.maskSourceId, parentId: declaration.parentId,
          affectedSiblingIds: [...declaration.affectedSiblingIds],
          capability: "exact-opaque-rectangular-alpha", renderStrategy: "css-clip-path",
          maskBounds: { ...resolution.maskBounds! },
          affected: resolution.affected.map((entry) => ({ nodeId: entry.nodeId, clipInsets: { ...entry.clipInsets! } })),
          provenance: structuredClone(declaration.provenance),
        }],
      });
    }
  }
  return result;
}

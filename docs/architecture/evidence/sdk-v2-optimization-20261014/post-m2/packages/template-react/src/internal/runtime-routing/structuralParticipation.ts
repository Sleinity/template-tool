import type { CanonicalSceneGraphV1 } from "@sleinity/template-core";

export type StructuralParticipationStateV1 =
  | "active"
  | "excluded-self"
  | "excluded-ancestor";

export interface StructuralParticipationNodeV1 {
  nodeId: string;
  state: StructuralParticipationStateV1;
  exclusionRootId: string | null;
}

export interface StructuralParticipationV1 {
  nodes: Record<string, StructuralParticipationNodeV1>;
  activeNodeIds: string[];
  excludedNodeIds: string[];
  exclusionRootIds: string[];
}

/**
 * Resolves structural visibility once from canonical scene topology. Hidden
 * ancestors exclude their complete subtree without rewriting descendant state.
 */
export function resolveStructuralParticipation(
  scene: CanonicalSceneGraphV1,
): StructuralParticipationV1 {
  const nodes: Record<string, StructuralParticipationNodeV1> = {};
  const exclusionRoots = new Set<string>();
  const visit = (nodeId: string, ancestorExclusionRootId: string | null): void => {
    const node = scene.nodes[nodeId];
    if (!node) return;
    const excludedSelf = ancestorExclusionRootId === null && !node.appearance.visible.value;
    const exclusionRootId = ancestorExclusionRootId ?? (excludedSelf ? nodeId : null);
    if (excludedSelf) exclusionRoots.add(nodeId);
    nodes[nodeId] = {
      nodeId,
      state: excludedSelf
        ? "excluded-self"
        : exclusionRootId
          ? "excluded-ancestor"
          : "active",
      exclusionRootId,
    };
    for (const childId of node.identity.children) visit(childId, exclusionRootId);
  };
  visit(scene.rootNodeId, null);

  // Strict scene validation normally makes every node reachable. Retain a
  // deterministic inactive classification if malformed callers bypass it.
  for (const nodeId of scene.nodeOrder) {
    if (nodes[nodeId]) continue;
    nodes[nodeId] = {
      nodeId,
      state: "excluded-ancestor",
      exclusionRootId: scene.rootNodeId,
    };
  }

  return {
    nodes,
    activeNodeIds: scene.nodeOrder.filter((nodeId) => nodes[nodeId]?.state === "active"),
    excludedNodeIds: scene.nodeOrder.filter((nodeId) => nodes[nodeId]?.state !== "active"),
    exclusionRootIds: scene.nodeOrder.filter((nodeId) => exclusionRoots.has(nodeId)),
  };
}

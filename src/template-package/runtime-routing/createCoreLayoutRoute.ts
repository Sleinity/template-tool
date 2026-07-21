import type { CanonicalSceneGraphV1, CanonicalSceneNodeV1 } from "../scene";
import type { CoreLayoutRouteV1 } from "./types";
import { resolveVerticalTextTrimMode } from "./verticalTextTrim";

const supportedAlignment = new Set(["MIN", "CENTER", "MAX", "STRETCH"]);

function isIdentityMatrix(value: number[][] | null): boolean {
  if (!value) return true;
  const flat = value.flat();
  if (flat.length === 6) return flat.every((entry, index) => Math.abs(entry - [1, 0, 0, 1, 0, 0][index]) < 0.000001);
  if (flat.length === 9) return flat.every((entry, index) => Math.abs(entry - [1, 0, 0, 0, 1, 0, 0, 0, 1][index]) < 0.000001);
  return false;
}

function directReasons(node: CanonicalSceneNodeV1): string[] {
  const reasons: string[] = [];
  if (node.layout.autoLayout.wrap.value) reasons.push("layout-wrap-unsupported");
  if (node.layout.autoLayout.mode.value !== "NONE") {
    if (!supportedAlignment.has(node.layout.autoLayout.primaryAlignment.value)) reasons.push("primary-alignment-unsupported");
    if (!supportedAlignment.has(node.layout.autoLayout.counterAlignment.value)) reasons.push("counter-alignment-unsupported");
  }
  if (node.transform.rotation.value !== 0 || !isIdentityMatrix(node.transform.relativeTransform.value) || !isIdentityMatrix(node.transform.transform.value)) reasons.push("non-identity-transform");
  if (node.relationships.maskRelationship.isMask || node.relationships.maskRelationship.maskedSiblingRange) reasons.push("mask-semantics-unresolved");
  if (node.layout.positioning.value === "ABSOLUTE") reasons.push("absolute-compatibility-boundary");
  if (node.text) {
    const trim = resolveVerticalTextTrimMode(node.text.leadingTrim.value);
    if (trim === "unsupported") reasons.push("text-vertical-trim-unsupported");
    if (trim === "cap-height-to-baseline" && node.text.styleRanges.length > 0) {
      reasons.push("text-trim-rich-runs-unsupported");
    }
  }
  return reasons;
}

export function createCoreLayoutRoute(scene: CanonicalSceneGraphV1): CoreLayoutRouteV1 {
  const reasons = new Map(scene.nodeOrder.map((nodeId) => [nodeId, directReasons(scene.nodes[nodeId])]));
  const circularDependencies: CoreLayoutRouteV1["circularDependencies"] = [];
  for (const nodeId of scene.nodeOrder) {
    const node = scene.nodes[nodeId];
    const parent = node.identity.parentId ? scene.nodes[node.identity.parentId] : null;
    if (!parent) continue;
    const circularHorizontal = node.layout.sizing.horizontal.mode.value === "FILL" && parent.layout.sizing.horizontal.mode.value === "HUG";
    const circularVertical = node.layout.sizing.vertical.mode.value === "FILL" && parent.layout.sizing.vertical.mode.value === "HUG";
    for (const axis of ["horizontal", "vertical"] as const) {
      const circular = axis === "horizontal" ? circularHorizontal : circularVertical;
      if (!circular) continue;
      const mainAxis = parent.layout.autoLayout.mode.value === (axis === "horizontal" ? "HORIZONTAL" : "VERTICAL");
      circularDependencies.push({
        nodeId,
        parentId: parent.identity.id,
        axis,
        classification: mainAxis ? "fill-inside-hug-main-axis" : "fill-inside-hug-cross-axis",
        reasonCode: "circular-fill-inside-hug-axis",
        fallbackChain: [nodeId, parent.identity.id],
      });
    }
    if (circularHorizontal || circularVertical) reasons.get(nodeId)!.push("circular-fill-inside-hug-axis");
  }
  const unsafe = new Set([...reasons].filter(([, values]) => values.some((value) => value !== "absolute-compatibility-boundary")).map(([nodeId]) => nodeId));

  for (const nodeId of [...scene.nodeOrder].reverse()) {
    const node = scene.nodes[nodeId];
    if (!node || !node.identity.parentId || !unsafe.has(nodeId) || node.layout.positioning.value === "ABSOLUTE") continue;
    unsafe.add(node.identity.parentId);
    const parentReasons = reasons.get(node.identity.parentId)!;
    if (!parentReasons.includes("unsafe-flow-descendant")) parentReasons.push("unsafe-flow-descendant");
  }

  const routed = new Set<string>();
  const boundaries = new Map<string, string[]>();
  const visit = (nodeId: string, parentRouted: boolean, blockedByBoundary: boolean): void => {
    const node = scene.nodes[nodeId];
    if (!node) return;
    const absoluteBoundary = node.layout.positioning.value === "ABSOLUTE" && nodeId !== scene.rootNodeId;
    const canRoute = !blockedByBoundary && !unsafe.has(nodeId) && !absoluteBoundary && (parentRouted || nodeId === scene.rootNodeId);
    if (canRoute) routed.add(nodeId);
    else if (parentRouted || (node.layout.autoLayout.mode.value !== "NONE" && !unsafe.has(nodeId))) boundaries.set(nodeId, reasons.get(nodeId)?.length ? reasons.get(nodeId)! : ["compatibility-parent-boundary"]);
    const blocksDescendants = blockedByBoundary || unsafe.has(nodeId) || absoluteBoundary;
    for (const childId of node.identity.children) visit(childId, canRoute, blocksDescendants);
  };
  visit(scene.rootNodeId, false, false);

  const nodes = Object.fromEntries(scene.nodeOrder.map((nodeId) => {
    const isRouted = routed.has(nodeId);
    const reasonCodes = reasons.get(nodeId) ?? [];
    return [nodeId, {
      nodeId,
      ownership: isRouted ? "settled-authoritative" as const : unsafe.has(nodeId) ? "unsupported" as const : "compatibility-authoritative" as const,
      routed: isRouted,
      boundaryRootId: boundaries.has(nodeId) ? nodeId : null,
      reasonCodes,
    }];
  }));
  return {
    schemaVersion: "core-layout-route-v1",
    sceneVersion: scene.schemaVersion,
    rootNodeId: scene.rootNodeId,
    nodes,
    routedNodeIds: scene.nodeOrder.filter((id) => routed.has(id)),
    compatibilityNodeIds: scene.nodeOrder.filter((id) => !routed.has(id)),
    fallbackBoundaries: [...boundaries].map(([nodeId, reasonCodes]) => ({ nodeId, reasonCodes: [...reasonCodes].sort() })).sort((a, b) => a.nodeId.localeCompare(b.nodeId)),
    circularDependencies: circularDependencies.sort((a, b) => `${a.parentId}:${a.nodeId}:${a.axis}`.localeCompare(`${b.parentId}:${b.nodeId}:${b.axis}`)),
  };
}

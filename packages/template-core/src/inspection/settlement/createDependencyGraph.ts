import type { CanonicalSceneGraphV1 } from "../../scene/types";
import {
  DEPENDENCY_GRAPH_VERSION,
  type DependencyEdgeKind,
  type DependencyEdgeV1,
  type DependencyGraphV1,
  type DependencyVertexV1,
} from "./types";

const nodeKey = (nodeId: string, property: string): string => `node:${nodeId}:${property}`;
const fontKey = (fontId: string): string => `font:${fontId}:state`;
const assetKey = (assetId: string): string => `asset:${assetId}:state`;

export function dependencyKey(nodeId: string, property: string): string {
  return nodeKey(nodeId, property);
}

export function createDependencyGraph(
  scene: CanonicalSceneGraphV1,
  fixture: { id: string; zipSha256: string },
): DependencyGraphV1 {
  const vertices = new Map<string, DependencyVertexV1>();
  const edges = new Map<string, DependencyEdgeV1>();
  const nodePrefixes = [...scene.nodeOrder].sort((left, right) => right.length - left.length);
  const identity = (key: string): { nodeId: string | null; property: string } => {
    const nodeId = key.startsWith("node:") ? nodePrefixes.find((id) => key.startsWith(`node:${id}:`)) ?? null : null;
    return { nodeId, property: nodeId ? key.slice(`node:${nodeId}:`.length) : key.split(":").slice(1).join(":") };
  };
  const addVertex = (key: string, nodeId: string | null, property: string, kind: DependencyVertexV1["kind"]): void => {
    if (!vertices.has(key)) vertices.set(key, { key, nodeId, property, kind });
  };
  const addEdge = (from: string, to: string, kind: DependencyEdgeKind, reason: string): void => {
    const source = identity(from);
    const target = identity(to);
    addVertex(from, source.nodeId, source.property, from.includes(":measure.") ? "measurement" : "semantic");
    addVertex(to, target.nodeId, target.property, to.includes(":diagnostic") ? "diagnostic" : to === "graph:export-readiness" ? "export" : "derived");
    const key = `${from}|${to}|${kind}`;
    if (!edges.has(key)) edges.set(key, { from, to, kind, reason });
  };

  addVertex("graph:scene-revision", null, "scene-revision", "semantic");
  addVertex("graph:container", null, "container", "measurement");
  addVertex("graph:export-readiness", null, "export-readiness", "export");

  for (const font of scene.fonts) addVertex(fontKey(font.id), null, `font.${font.id}.state`, "readiness");
  for (const assetId of Object.keys(scene.assets)) addVertex(assetKey(assetId), null, `asset.${assetId}.state`, "readiness");

  for (const nodeId of scene.nodeOrder) {
    const node = scene.nodes[nodeId];
    if (!node) continue;
    const semantic = nodeKey(nodeId, "semantic");
    const bounds = nodeKey(nodeId, "bounds");
    const measuredBounds = nodeKey(nodeId, "measure.bounds");
    const diagnostics = nodeKey(nodeId, "diagnostic");
    const clipMaskEffect = nodeKey(nodeId, "clip-mask-effect");
    [semantic, bounds, measuredBounds, diagnostics, clipMaskEffect].forEach((key) => addVertex(key, nodeId, identity(key).property, key.includes("measure") ? "measurement" : key.includes("diagnostic") ? "diagnostic" : "derived"));
    addEdge("graph:scene-revision", semantic, "semantic-input", "A scene revision may alter any semantic property.");
    addEdge(semantic, bounds, "semantic-input", "Canonical geometry, sizing, transforms and visibility feed settled bounds.");
    addEdge(measuredBounds, bounds, "measurement-input", "Observed DOM bounds supplement semantic geometry.");
    addEdge(bounds, diagnostics, "diagnostic", "Geometry changes invalidate node diagnostics.");
    addEdge(bounds, clipMaskEffect, "clip-mask-effect", "Clip, mask and effect extents depend on final geometry.");
    addEdge(diagnostics, "graph:export-readiness", "export-readiness", "Renderer diagnostics participate in export readiness.");

    if (node.text) {
      const characters = nodeKey(nodeId, "text.characters");
      const textStyle = nodeKey(nodeId, "text.style");
      const textMeasurement = nodeKey(nodeId, "measure.text");
      addEdge(characters, textMeasurement, "measurement-input", "Text characters affect line breaking and rendered height.");
      addEdge(textStyle, textMeasurement, "measurement-input", "Font, size, line-height and spacing affect rendered text geometry.");
      addEdge(textMeasurement, bounds, "measurement-input", "HUG text bounds consume rendered measurement.");
      for (const font of scene.fonts.filter((entry) => entry.usedBy.includes(nodeId))) {
        addEdge(fontKey(font.id), textMeasurement, "measurement-input", "Font activation changes text metrics.");
      }
    }

    if (node.media) {
      const slot = nodeKey(nodeId, "media.slot");
      const placement = nodeKey(nodeId, "media.placement");
      addEdge(bounds, slot, "media-placement", "Final node geometry defines the image slot.");
      addEdge(slot, placement, "media-placement", "Placement and crop depend on slot dimensions.");
      addEdge(nodeKey(nodeId, "media.mode-crop-focal"), placement, "media-placement", "Fit mode, crop transform and focal position determine placement.");
      const assetId = node.media.assetId.value;
      if (assetId) addEdge(assetKey(assetId), placement, "media-placement", "Decoded intrinsic asset dimensions determine scale and crop.");
      addEdge(placement, clipMaskEffect, "clip-mask-effect", "Image placement feeds clipping, masks and effects.");
    }

    const parent = node.identity.parentId ? scene.nodes[node.identity.parentId] : null;
    if (parent) {
      const parentBounds = nodeKey(parent.identity.id, "bounds");
      addEdge(parentBounds, bounds, "ancestor-layout", "Parent content box and constraints affect child geometry.");
      if (node.layout.sizing.horizontal.mode.value === "FILL" || node.layout.sizing.vertical.mode.value === "FILL") {
        addEdge(parentBounds, bounds, "ancestor-layout", "FILL consumes parent remaining space.");
      }
      if (parent.layout.sizing.horizontal.mode.value === "HUG" || parent.layout.sizing.vertical.mode.value === "HUG") {
        addEdge(bounds, parentBounds, "ancestor-layout", "HUG parent geometry depends on participating children.");
      }
      if (parent.layout.autoLayout.mode.value !== "NONE") {
        for (const siblingId of parent.identity.children.filter((id) => id !== nodeId)) {
          addEdge(bounds, nodeKey(siblingId, "bounds"), "sibling-layout", "Auto Layout siblings share ordered space allocation.");
        }
      }
      if (node.layout.positioning.value === "ABSOLUTE") {
        addEdge(parentBounds, bounds, "constraint", "Absolute child constraints resolve against parent bounds.");
      }
    }
  }

  for (const relationship of scene.maskRelationships ?? []) {
    const range = nodeKey(relationship.maskSourceId, "mask-range");
    const source = nodeKey(relationship.maskSourceId, "semantic");
    for (const property of ["mask", "appearance.fills", "appearance.strokes", "appearance.effects", "appearance.opacity", "appearance.visible", "appearance.blendMode", "geometry.cornerRadius", "transform"]) {
      addEdge(nodeKey(relationship.maskSourceId, property), source, "semantic-input", "Mask input changes require current canonical mask authority.");
    }
    for (const property of ["children", "maskRelationships"]) {
      addEdge(nodeKey(relationship.parentId, property), nodeKey(relationship.parentId, "semantic"), "semantic-input", "Mask scope changes invalidate parent declaration evidence.");
    }
    addEdge(source, range, "clip-mask-effect", "Current mask declaration, paint and transform authority define the declared range.");
    addEdge(nodeKey(relationship.parentId, "semantic"), range, "clip-mask-effect", "Parent child order and scope termination define mask membership.");
    for (const nodeId of [relationship.maskSourceId, ...relationship.affectedSiblingIds]) {
      addEdge(nodeKey(nodeId, "bounds"), range, "clip-mask-effect", "Mask source and affected bounds determine exact canonical clip insets.");
      addEdge(range, nodeKey(nodeId, "clip-mask-effect"), "clip-mask-effect", "Declared mask evidence invalidates source/affected clipping.");
      addEdge(nodeKey(nodeId, "clip-mask-effect"), nodeKey(nodeId, "diagnostic"), "diagnostic", "Mask clipping changes invalidate source/affected diagnostics.");
    }
    addEdge(range, "graph:export-readiness", "export-readiness", "Unresolved mask evidence blocks observational export readiness.");
  }

  return {
    schemaVersion: DEPENDENCY_GRAPH_VERSION,
    fixture: { ...fixture },
    sceneVersion: scene.schemaVersion,
    vertices: [...vertices.values()].sort((a, b) => a.key.localeCompare(b.key)),
    edges: [...edges.values()].sort((a, b) => `${a.from}|${a.to}|${a.kind}`.localeCompare(`${b.from}|${b.to}|${b.kind}`)),
    nodeOrder: [...scene.nodeOrder],
    fullTreeFallbacks: [
      { source: "scene-revision", reason: "The current runtime recreates the full resolved tree after workingPackage changes." },
      { source: "unknown-property", reason: "Unmapped future properties must fail safe without silently retaining stale derived state." },
    ],
  };
}

import {
  CANONICAL_SCENE_GRAPH_CONTRACT,
  CANONICAL_SCENE_GRAPH_VERSION,
  type CanonicalSceneGraphV1,
  type SceneValidationIssue,
  type SceneValidationResult,
} from "./types";

const finiteRect = (rect: { x: number; y: number; width: number; height: number }): boolean =>
  [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width >= 0 && rect.height >= 0;

export function validateCanonicalSceneGraph(graph: CanonicalSceneGraphV1): SceneValidationResult {
  const issues: SceneValidationIssue[] = [];
  const add = (code: string, path: string, message: string, severity: SceneValidationIssue["severity"] = "error"): void => {
    issues.push({ code, path, message, severity });
  };
  if (graph.schemaVersion !== CANONICAL_SCENE_GRAPH_VERSION) add("scene.version", "schemaVersion", "Unsupported canonical scene graph version.");
  if (graph.contract !== CANONICAL_SCENE_GRAPH_CONTRACT) add("scene.contract", "contract", "Unexpected canonical scene graph contract.");
  if (!graph.nodes[graph.rootNodeId]) add("scene.root.missing", "rootNodeId", `Root node ${graph.rootNodeId} does not exist.`);
  if (graph.sourcePackage.rootNodeId !== graph.rootNodeId) add("scene.root.source-mismatch", "sourcePackage.rootNodeId", "Source and scene root IDs differ.");
  if (!Number.isFinite(graph.canvas.width) || graph.canvas.width <= 0 || !Number.isFinite(graph.canvas.height) || graph.canvas.height <= 0) add("scene.canvas.invalid", "canvas", "Canvas dimensions must be positive finite numbers.");
  const orderSet = new Set<string>();
  for (const [index, id] of graph.nodeOrder.entries()) {
    if (orderSet.has(id)) add("scene.order.duplicate", `nodeOrder.${index}`, `Node ${id} occurs more than once.`);
    orderSet.add(id);
    if (!graph.nodes[id]) add("scene.order.missing-node", `nodeOrder.${index}`, `Node ${id} is ordered but absent.`);
  }
  for (const [id, node] of Object.entries(graph.nodes)) {
    const path = `nodes.${id}`;
    if (node.identity.id !== id || node.identity.sourceNodeId !== id) add("scene.node.identity", `${path}.identity`, "Record key, node ID, and source node ID must match.");
    if (!orderSet.has(id)) add("scene.node.unordered", path, `Node ${id} is absent from nodeOrder.`);
    if (id === graph.rootNodeId && node.identity.parentId !== null) add("scene.root.parent", `${path}.identity.parentId`, "Root parent must be null.");
    if (node.identity.parentId && !graph.nodes[node.identity.parentId]) add("scene.parent.missing", `${path}.identity.parentId`, `Parent ${node.identity.parentId} does not exist.`);
    if (node.identity.children.length !== node.identity.childOrder.length || node.identity.children.some((child, childIndex) => child !== node.identity.childOrder[childIndex])) add("scene.children.order", `${path}.identity.childOrder`, "children and childOrder must preserve identical source order.");
    for (const childId of node.identity.children) {
      const child = graph.nodes[childId];
      if (!child) add("scene.child.missing", `${path}.identity.children`, `Child ${childId} does not exist.`);
      else if (child.identity.parentId !== id) add("scene.child.parent-mismatch", `${path}.identity.children`, `Child ${childId} points to parent ${child.identity.parentId}.`);
    }
    if (!finiteRect(node.geometry.absoluteBounds.value)) add("scene.bounds.absolute", `${path}.geometry.absoluteBounds`, "Absolute bounds must be finite and non-negative in size.");
    if (!finiteRect(node.geometry.relativeBounds.value)) add("scene.bounds.relative", `${path}.geometry.relativeBounds`, "Relative bounds must be finite and non-negative in size.");
    for (const axis of ["horizontal", "vertical"] as const) {
      const sizing = node.layout.sizing[axis];
      if (!["FIXED", "HUG", "FILL"].includes(sizing.mode.value)) add("scene.sizing.mode", `${path}.layout.sizing.${axis}.mode`, "Unknown sizing mode.");
      if (sizing.min.value !== null && sizing.max.value !== null && sizing.min.value > sizing.max.value) add("scene.sizing.range", `${path}.layout.sizing.${axis}`, "Minimum exceeds maximum.", "warning");
    }
    for (const assetId of node.relationships.assetIds) {
      if (!graph.assets[assetId]) add("scene.asset.missing", `${path}.relationships.assetIds`, `Asset ${assetId} does not exist.`, "warning");
    }
    for (const fieldId of node.relationships.editableFieldIds) {
      if (!graph.editableFields.some((field) => field.id === fieldId && field.nodeId === id)) add("scene.field.missing", `${path}.relationships.editableFieldIds`, `Field ${fieldId} is missing or targets a different node.`);
    }
    if (node.media?.assetId.value && !graph.assets[node.media.assetId.value]) add("scene.media.asset-missing", `${path}.media.assetId`, `Media asset ${node.media.assetId.value} is not registered.`, "warning");
    if (node.relationships.maskRelationship.maskedSiblingRange === "unresolved") add("scene.mask.range-unresolved", `${path}.relationships.maskRelationship`, "Mask range semantics are preserved but unresolved.", "warning");
    if (!node.provenance.canonicalPath) add("scene.provenance.missing", `${path}.provenance`, "Canonical source path is required.");
  }
  for (const field of graph.editableFields) {
    if (!graph.nodes[field.nodeId]) add("scene.field.target-missing", `editableFields.${field.id}.nodeId`, `Field target ${field.nodeId} does not exist.`);
  }
  try {
    const serialized = JSON.stringify(graph);
    const parsed = JSON.parse(serialized) as CanonicalSceneGraphV1;
    if (parsed.schemaVersion !== graph.schemaVersion || parsed.nodeOrder.length !== graph.nodeOrder.length) add("scene.serialization.roundtrip", "graph", "JSON serialization round trip changed the graph.");
  } catch (error) {
    add("scene.serialization.failed", "graph", `Graph is not JSON serializable: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { valid: !issues.some((issue) => issue.severity === "error"), issues };
}

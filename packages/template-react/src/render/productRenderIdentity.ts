import { packageRuntimeFontSignature } from "@sleinity/template-browser";
import type { ResolvedRenderTreeV1 } from "@sleinity/template-core";
import type { CoreLayoutRuntimeState } from "../internal/runtime-routing";
import type { TemplatePackageV1 } from "@sleinity/template-core";
import type { TemplateImportConfirmationV1 } from "@sleinity/template-browser/importer";

export type ResolvedProductRenderIdentityV1 =
  TemplateImportConfirmationV1["renderIdentity"];

function stableHash(value: unknown): string {
  const input = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function aggregateExportSafety(tree: ResolvedRenderTreeV1): ResolvedProductRenderIdentityV1["exportSafety"] {
  return tree.nodeOrder.reduce<ResolvedProductRenderIdentityV1["exportSafety"]>((current, nodeId) => {
    const next = tree.nodes[nodeId].backendDecision.exportSafety;
    if (current === "blocked" || next === "blocked") return "blocked";
    if (current === "warning" || next === "warning") return "warning";
    if (current === "unknown" || next === "unknown") return "unknown";
    return "safe";
  }, "safe");
}

export function createResolvedProductRenderIdentity(input: {
  packageValue: TemplatePackageV1;
  resolvedTree: ResolvedRenderTreeV1;
  runtime: CoreLayoutRuntimeState;
}): ResolvedProductRenderIdentityV1 {
  const { packageValue, resolvedTree, runtime } = input;
  const packageRevision = stableHash({
    packageId: packageValue.packageId,
    version: packageValue.schemaVersion,
    rootNodeId: packageValue.rootNodeId,
    canvas: packageValue.canvas,
    nodeOrder: resolvedTree.nodeOrder,
    nodes: resolvedTree.nodeOrder.map((nodeId) => packageValue.nodes[nodeId]),
    fields: packageValue.editableFields,
    fonts: packageValue.fontRequirements,
    assetMetadata: Object.values(packageValue.assets).map((asset) => ({
      id: asset.id,
      type: asset.type,
      source: asset.source,
      hash: asset.hash,
      width: asset.width,
      height: asset.height,
      sizeBytes: asset.sizeBytes,
    })),
  });
  const resolvedRevision = stableHash(resolvedTree.nodeOrder.map((nodeId) => ({
    nodeId,
    decision: resolvedTree.nodes[nodeId].backendDecision.decisionId,
    source: resolvedTree.nodes[nodeId].backendDecision.revisions.source,
    resolved: resolvedTree.nodes[nodeId].backendDecision.revisions.resolved,
  })));
  const fontRevision = stableHash(packageRuntimeFontSignature(packageValue));
  const assetRevision = stableHash(Object.values(resolvedTree.assetRefs)
    .map((asset) => ({
      assetId: asset.assetId,
      kind: asset.kind,
      source: asset.source,
      renderable: asset.renderable,
      hash: asset.hash ?? null,
      nodeIds: asset.nodeIds,
      fieldIds: asset.fieldIds,
    }))
    .sort((left, right) => left.assetId.localeCompare(right.assetId)));
  const placementRevision = stableHash(resolvedTree.nodeOrder.flatMap((nodeId) => {
    const image = resolvedTree.nodes[nodeId].image;
    return image ? [{
      nodeId,
      assetId: image.assetId,
      activePlacementState: image.activePlacementState,
      placementRevision: image.placementRevision,
      scaleMode: image.scaleMode,
    }] : [];
  }));
  const settlementRevision = stableHash({
    semanticRevision: runtime.revision,
    route: runtime.settled.nodeOrder.map((nodeId) => ({
      nodeId,
      ownership: runtime.route.nodes[nodeId].ownership,
      boundaryRootId: runtime.route.nodes[nodeId].boundaryRootId,
      reasonCodes: runtime.route.nodes[nodeId].reasonCodes,
    })),
  });
  const exportSafety = aggregateExportSafety(resolvedTree);
  const readiness: ResolvedProductRenderIdentityV1["readiness"] = runtime.settled.readiness === "ready"
    ? "ready"
    : runtime.settled.readiness === "unsupported"
      ? "unsupported"
      : "pending";
  const base = {
    packageId: packageValue.packageId,
    packageRevision,
    canonicalRevision: runtime.canonicalRevision,
    resolvedRevision,
    backendDecisionRevision: resolvedTree.backendDecisionRevision,
    settlementRevision,
    fontRevision,
    assetRevision,
    placementRevision,
    exportSafety,
    readiness,
  };
  return {
    schemaVersion: "resolved-product-render-identity-v1",
    identityId: `product-render:${stableHash(base)}`,
    ...base,
  };
}

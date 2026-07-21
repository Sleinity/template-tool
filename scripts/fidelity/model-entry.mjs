import { runTemplatePackageImportPipeline } from "../../src/template-package/import/runTemplatePackageImportPipeline";
import { createResolvedRenderTree } from "../../src/template-package/resolved/createResolvedRenderTree";

export async function resolveFixtureModel(bytes, sourceName) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const buffer = array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength);
  const assetStorage = {
    async put(hash) {
      return {
        storageKey: `fidelity-model:${hash}`,
        stableUrl: `blob:fidelity-model/${hash}`,
      };
    },
  };
  const result = await runTemplatePackageImportPipeline({ format: "zip", buffer, sourceName, assetStorage });
  if (!result.package || !result.validation?.valid) {
    throw new Error(`Fixture model import failed: ${result.validation?.diagnostics?.map((item) => item.message).join("; ") || "no canonical package"}`);
  }
  const packageValue = result.package;
  const tree = createResolvedRenderTree(packageValue);
  return {
    package: {
      packageId: packageValue.packageId,
      schemaVersion: packageValue.schemaVersion,
      rootNodeId: packageValue.rootNodeId,
      canvas: packageValue.canvas,
      fontRequirements: packageValue.fontRequirements ?? [],
      editableFieldCount: packageValue.editableFields.length,
      source: packageValue.source ?? null,
    },
    tree: {
      schemaVersion: tree.schemaVersion,
      contract: tree.contract,
      rootNodeId: tree.rootNodeId,
      canvas: tree.canvas,
      primitiveCanvas: tree.primitiveCanvas,
      primitiveTreeRevision: tree.primitiveTreeRevision,
      nodeOrder: tree.nodeOrder,
      nodes: Object.fromEntries(tree.nodeOrder.map((id) => {
        const node = tree.nodes[id];
        return [id, {
          id: node.id,
          name: node.name,
          type: node.type,
          parentId: node.parentId,
          children: node.children,
          stackingIndex: node.stackingIndex,
          bounds: node.bounds,
          exportedBounds: node.exportedBounds,
          sourcePositioning: node.sourcePositioning,
          renderPositioning: node.renderPositioning,
          layout: node.layout,
          appearance: node.appearance,
          primitiveAppearance: node.primitiveAppearance,
          text: node.text ?? null,
          image: node.image ? { ...node.image, source: node.image.source ? "<resolved>" : null } : null,
          vector: node.vector ? { ...node.vector, source: node.vector.source ? "<resolved>" : null } : null,
          transform: node.transform,
          assetRefs: node.assetRefs,
          fieldMarkers: node.fieldMarkers,
          fidelityDiagnostics: node.fidelityDiagnostics,
          renderStrategy: node.renderStrategy,
          fallbackReason: node.fallbackReason ?? null,
        }];
      })),
      assetRefs: tree.assetRefs,
      motionLinks: tree.motionLinks,
      fidelityDiagnostics: tree.fidelityDiagnostics,
      warnings: tree.warnings,
      summary: tree.summary,
    },
    importDiagnostics: result.layeredDiagnostics ?? result.diagnostics,
  };
}

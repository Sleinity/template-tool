import type {
  PackageMetadataComparison,
  PackageRect,
  TemplatePackageV1,
} from "@sleinity/template-core";

export interface FigmaMcpNodeMetadata {
  id: string;
  name: string;
  type?: string;
  parentId?: string | null;
  children?: string[];
  bounds?: PackageRect;
  dataName?: string;
  fontFaces?: Array<{
    family: string;
    postScriptName?: string | null;
    weight: number;
    style: string;
  }>;
}

export interface FigmaMcpMetadata {
  rootNodeId?: string;
  rootName?: string;
  canvas?: {
    width: number;
    height: number;
  };
  nodes: Record<string, FigmaMcpNodeMetadata> | FigmaMcpNodeMetadata[];
}

function normalizedNodes(
  metadata: FigmaMcpMetadata,
): Record<string, FigmaMcpNodeMetadata> {
  if (!Array.isArray(metadata.nodes)) return metadata.nodes;
  return Object.fromEntries(metadata.nodes.map((node) => [node.id, node]));
}

function boundsDiffer(
  packageBounds: PackageRect,
  figmaBounds: PackageRect | undefined,
): boolean {
  if (!figmaBounds) return false;
  return (["x", "y", "width", "height"] as const).some(
    (key) => Math.abs(packageBounds[key] - figmaBounds[key]) > 1,
  );
}

export function comparePackageToFigmaMetadata(
  packageValue: TemplatePackageV1,
  metadata?: FigmaMcpMetadata | null,
): PackageMetadataComparison {
  if (!metadata) {
    return {
      status: "not_checked",
      matchedNodeCount: 0,
      packageNodeCount: Object.keys(packageValue.nodes).length,
      figmaNodeCount: 0,
      differences: [],
    };
  }

  const figmaNodes = normalizedNodes(metadata);
  const differences: PackageMetadataComparison["differences"] = [];
  let matchedNodeCount = 0;

  Object.values(packageValue.nodes).forEach((node) => {
    const figmaNode = figmaNodes[node.id];
    if (!figmaNode) {
      differences.push({
        code: "missing-in-figma",
        nodeId: node.id,
        packageValue: node.name,
        message: `Package node ${node.id} is missing from live Figma metadata.`,
      });
      return;
    }
    matchedNodeCount += 1;
    if (node.name !== figmaNode.name) {
      differences.push({
        code: "name-changed",
        nodeId: node.id,
        packageValue: node.name,
        figmaValue: figmaNode.name,
        message: `Node ${node.id} has a different live Figma name.`,
      });
    }
    if (
      figmaNode.parentId !== undefined &&
      node.parentId !== figmaNode.parentId
    ) {
      differences.push({
        code: "parent-changed",
        nodeId: node.id,
        packageValue: node.parentId,
        figmaValue: figmaNode.parentId,
        message: `Node ${node.id} has a different live Figma parent.`,
      });
    }
    if (
      figmaNode.children &&
      node.children.join("|") !== figmaNode.children.join("|")
    ) {
      differences.push({
        code: "children-changed",
        nodeId: node.id,
        packageValue: node.children,
        figmaValue: figmaNode.children,
        message: `Node ${node.id} has different live Figma children or order.`,
      });
    }
    if (boundsDiffer(node.bounds.absolute, figmaNode.bounds)) {
      differences.push({
        code: "bounds-changed",
        nodeId: node.id,
        packageValue: node.bounds.absolute,
        figmaValue: figmaNode.bounds,
        message: `Node ${node.id} has different live Figma bounds.`,
      });
    }
  });

  Object.values(figmaNodes).forEach((node) => {
    if (!packageValue.nodes[node.id]) {
      differences.push({
        code: "missing-in-package",
        nodeId: node.id,
        figmaValue: node.name,
        message: `Live Figma node ${node.id} is missing from the package.`,
      });
    }
  });

  packageValue.editableFields.forEach((field) => {
    const liveName =
      figmaNodes[field.nodeId]?.dataName ?? figmaNodes[field.nodeId]?.name;
    if (liveName && liveName !== `field:${field.type}:${field.id}`) {
      differences.push({
        code: "field-marker-changed",
        nodeId: field.nodeId,
        packageValue: `field:${field.type}:${field.id}`,
        figmaValue: liveName,
        message: `Editable field marker for ${field.id} differs in live Figma metadata.`,
      });
    }
  });

  packageValue.fontRequirements?.forEach((requirement) => {
    requirement.usedBy.forEach((nodeId) => {
      const liveFaces = figmaNodes[nodeId]?.fontFaces;
      if (!liveFaces?.length) return;
      const matches = liveFaces.some(
        (face) =>
          face.family.toLowerCase() === requirement.family.toLowerCase() &&
          face.weight === requirement.weight &&
          face.style === requirement.cssStyle,
      );
      if (!matches) {
        differences.push({
          code: "font-changed",
          nodeId,
          packageValue: {
            family: requirement.family,
            weight: requirement.weight,
            style: requirement.cssStyle,
            postScriptName: requirement.postScriptName,
          },
          figmaValue: liveFaces,
          message: `Font face on node ${nodeId} differs from the exported package requirement.`,
        });
      }
    });
  });

  return {
    status: differences.length > 0 ? "changed" : "matched",
    matchedNodeCount,
    packageNodeCount: Object.keys(packageValue.nodes).length,
    figmaNodeCount: Object.keys(figmaNodes).length,
    differences,
  };
}

import type {
  PackageLayoutMode,
  PackagePositioningMode,
  PackageSizingMode,
  TemplateNode,
} from "../types";

export interface PackageNodeLayoutRole {
  positioning: PackagePositioningMode;
  parentIsAutoLayout: boolean;
  parentMainAxis: "horizontal" | "vertical" | null;
  isAbsolute: boolean;
  mainAxisSizing: PackageSizingMode | null;
  counterAxisSizing: PackageSizingMode | null;
}

export function getPackageNodePositioning(
  node: TemplateNode,
): PackagePositioningMode {
  return typeof node.positioning === "string"
    ? node.positioning
    : node.positioning.mode;
}

export function resolvePackageNodeLayoutRole(
  node: TemplateNode,
  parentLayoutMode: PackageLayoutMode,
  isRoot = false,
): PackageNodeLayoutRole {
  const parentMainAxis =
    parentLayoutMode === "HORIZONTAL"
      ? "horizontal"
      : parentLayoutMode === "VERTICAL"
        ? "vertical"
        : null;
  const parentIsAutoLayout = parentMainAxis !== null;
  const positioning = getPackageNodePositioning(node);

  return {
    positioning,
    parentIsAutoLayout,
    parentMainAxis,
    isAbsolute: !isRoot && (positioning === "ABSOLUTE" || !parentIsAutoLayout),
    mainAxisSizing: parentMainAxis ? node.sizing[parentMainAxis].mode : null,
    counterAxisSizing:
      parentMainAxis === "horizontal"
        ? node.sizing.vertical.mode
        : parentMainAxis === "vertical"
          ? node.sizing.horizontal.mode
          : null,
  };
}

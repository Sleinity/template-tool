import type {
  PackageLayoutMode,
  TemplateNode,
} from "../types";
import { isEditorLiveResizableConstraintContainer } from "./packageConstraintLayout";

export interface PackageClippingModel {
  normalizedAppearanceClip: boolean | null;
  normalizedLayoutClip: boolean;
  normalizedClip: boolean;
  rawClip: boolean | null;
  rawClipValue: unknown;
  usesRawEditorFallback: boolean;
  usesLiveContainment: boolean;
  clipsContent: boolean;
  isMask: boolean;
  maskType: string | null;
  shouldBreakMaskChain: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function figmaMetadata(node: TemplateNode): Record<string, unknown> | null {
  return isRecord(node.extensions?.figma)
    ? node.extensions.figma
    : null;
}

export function resolvePackageClipping(
  node: TemplateNode,
  parentLayoutMode: PackageLayoutMode,
  isRoot: boolean,
  mode: "static" | "editor",
): PackageClippingModel {
  const figma = figmaMetadata(node);
  const normalizedAppearanceClip =
    typeof node.appearance.clipContent === "boolean"
      ? node.appearance.clipContent
      : null;
  const normalizedLayoutClip = node.layout.clipContent;
  const normalizedClip =
    normalizedAppearanceClip === true || normalizedLayoutClip;
  const rawClipValue = figma?.clipsContent;
  const rawClip =
    typeof rawClipValue === "boolean" ? rawClipValue : null;
  const usesRawEditorFallback =
    mode === "editor" && !normalizedClip && rawClip === true;
  const usesLiveContainment =
    mode === "editor" &&
    isEditorLiveResizableConstraintContainer(
      node,
      parentLayoutMode,
      isRoot,
    );

  return {
    normalizedAppearanceClip,
    normalizedLayoutClip,
    normalizedClip,
    rawClip,
    rawClipValue,
    usesRawEditorFallback,
    usesLiveContainment,
    clipsContent:
      normalizedClip ||
      usesRawEditorFallback ||
      usesLiveContainment,
    isMask: node.mask ? node.mask.isMask === true : figma?.isMask === true,
    maskType:
      typeof node.mask?.maskType === "string"
        ? node.mask.maskType.toUpperCase()
        : typeof figma?.maskType === "string"
          ? figma.maskType.toUpperCase()
        : null,
    shouldBreakMaskChain: figma?.shouldBreakMaskChain === true,
  };
}

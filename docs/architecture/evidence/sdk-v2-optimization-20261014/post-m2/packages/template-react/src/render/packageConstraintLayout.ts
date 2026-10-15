import type { CSSProperties } from "react";
import type {
  PackageAxisSizing,
  PackageLayoutMode,
  PackageRect,
  PackageSizingMode,
  TemplateNode,
} from "@sleinity/template-core";
import { resolvePackageNodeLayoutRole } from "./packageLayoutModel";

export type PackageHorizontalConstraint =
  | "LEFT"
  | "RIGHT"
  | "LEFT_RIGHT"
  | "CENTER"
  | "SCALE";

export type PackageVerticalConstraint =
  | "TOP"
  | "BOTTOM"
  | "TOP_BOTTOM"
  | "CENTER"
  | "SCALE";

export interface PackageConstraintAxisResult<T extends string> {
  raw: string | null;
  normalized: T | null;
  effective: T | null;
  supported: boolean;
  sizingIntent: PackageSizingMode;
  stretchIntentSource:
    | "normalized-fill"
    | "figma-layout-grow"
    | "figma-layout-align"
    | "figma-axis-sizing"
    | null;
  overriddenBySizingIntent: boolean;
  stretchSuppressedByHug: boolean;
  exportedStartOffset: number | null;
  exportedEndOffset: number | null;
}

export interface PackageAbsoluteConstraintResolution {
  horizontal: PackageConstraintAxisResult<PackageHorizontalConstraint>;
  vertical: PackageConstraintAxisResult<PackageVerticalConstraint>;
  style: CSSProperties;
  usedFallback: boolean;
}

interface PackageConstraintContext {
  parentLayoutMode?: PackageLayoutMode;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function rawConstraints(node: TemplateNode): Record<string, unknown> | null {
  const figma = isRecord(node.extensions?.figma)
    ? node.extensions.figma
    : null;
  return figma && isRecord(figma.constraints) ? figma.constraints : null;
}

function rawConstraintValue(
  node: TemplateNode,
  axis: "horizontal" | "vertical",
): string | null {
  const value = rawConstraints(node)?.[axis];
  return typeof value === "string" ? value.toUpperCase() : null;
}

function rawFigmaValue(node: TemplateNode, key: string): unknown {
  const figma = isRecord(node.extensions?.figma)
    ? node.extensions.figma
    : null;
  return figma?.[key];
}

export function normalizePackageHorizontalConstraint(
  raw: string | null,
): Pick<
  PackageConstraintAxisResult<PackageHorizontalConstraint>,
  "raw" | "normalized" | "supported"
> {
  if (!raw) return { raw, normalized: null, supported: false };
  const aliases: Record<string, PackageHorizontalConstraint> = {
    MIN: "LEFT",
    LEFT: "LEFT",
    MAX: "RIGHT",
    RIGHT: "RIGHT",
    STRETCH: "LEFT_RIGHT",
    LEFT_RIGHT: "LEFT_RIGHT",
    LEFT_AND_RIGHT: "LEFT_RIGHT",
    CENTER: "CENTER",
    SCALE: "SCALE",
  };
  const normalized = aliases[raw] ?? null;
  return { raw, normalized, supported: normalized !== null };
}

export function normalizePackageVerticalConstraint(
  raw: string | null,
): Pick<
  PackageConstraintAxisResult<PackageVerticalConstraint>,
  "raw" | "normalized" | "supported"
> {
  if (!raw) return { raw, normalized: null, supported: false };
  const aliases: Record<string, PackageVerticalConstraint> = {
    MIN: "TOP",
    TOP: "TOP",
    MAX: "BOTTOM",
    BOTTOM: "BOTTOM",
    STRETCH: "TOP_BOTTOM",
    TOP_BOTTOM: "TOP_BOTTOM",
    TOP_AND_BOTTOM: "TOP_BOTTOM",
    CENTER: "CENTER",
    SCALE: "SCALE",
  };
  const normalized = aliases[raw] ?? null;
  return { raw, normalized, supported: normalized !== null };
}

function normalizedRawSizingIntent(
  value: unknown,
): "FILL" | null {
  return typeof value === "string" &&
    ["FILL", "STRETCH"].includes(value.toUpperCase())
    ? "FILL"
    : null;
}

function stretchIntentSource(
  node: TemplateNode,
  axis: "horizontal" | "vertical",
  parentLayoutMode: PackageLayoutMode | undefined,
): PackageConstraintAxisResult<string>["stretchIntentSource"] {
  if (node.sizing[axis].mode === "FILL") return "normalized-fill";

  const rawAxisSizing = rawFigmaValue(
    node,
    axis === "horizontal" ? "layoutSizingHorizontal" : "layoutSizingVertical",
  );
  if (normalizedRawSizingIntent(rawAxisSizing)) return "figma-axis-sizing";

  const parentMainAxis =
    parentLayoutMode === "HORIZONTAL"
      ? "horizontal"
      : parentLayoutMode === "VERTICAL"
        ? "vertical"
        : null;
  if (
    parentMainAxis === axis &&
    typeof rawFigmaValue(node, "layoutGrow") === "number" &&
    Number(rawFigmaValue(node, "layoutGrow")) > 0
  ) {
    return "figma-layout-grow";
  }
  if (
    parentMainAxis &&
    parentMainAxis !== axis &&
    String(rawFigmaValue(node, "layoutAlign")).toUpperCase() === "STRETCH"
  ) {
    return "figma-layout-align";
  }
  return null;
}

function resolveAxisResult<T extends string>(
  normalizedResult: Pick<
    PackageConstraintAxisResult<T>,
    "raw" | "normalized" | "supported"
  >,
  sizing: PackageAxisSizing,
  stretchConstraint: T,
  hugFallbackConstraint: T,
  stretchSource: PackageConstraintAxisResult<T>["stretchIntentSource"],
  startOffset: number,
  endOffset: number,
): PackageConstraintAxisResult<T> {
  const hasSafeOffsets =
    Number.isFinite(startOffset) && Number.isFinite(endOffset);
  const requestedConstraint =
    stretchSource && hasSafeOffsets
      ? stretchConstraint
      : normalizedResult.normalized;
  const stretchSuppressedByHug =
    sizing.mode === "HUG" && requestedConstraint === stretchConstraint;
  const effective = stretchSuppressedByHug
    ? hugFallbackConstraint
    : requestedConstraint;
  return {
    ...normalizedResult,
    effective,
    sizingIntent: sizing.mode,
    stretchIntentSource: stretchSource,
    overriddenBySizingIntent:
      !stretchSuppressedByHug &&
      Boolean(stretchSource) &&
      effective === stretchConstraint &&
      normalizedResult.normalized !== null &&
      normalizedResult.normalized !== stretchConstraint,
    stretchSuppressedByHug,
    exportedStartOffset: Number.isFinite(startOffset) ? startOffset : null,
    exportedEndOffset: Number.isFinite(endOffset) ? endOffset : null,
  };
}

function percentage(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${(value / total) * 100}%`;
}

function applyCenterTranslation(
  style: CSSProperties,
  axis: "horizontal" | "vertical",
): void {
  const current =
    typeof style.translate === "string"
      ? style.translate.trim().split(/\s+/)
      : [];
  const horizontal = current[0] ?? "0";
  const vertical = current[1] ?? "0";
  style.translate =
    axis === "horizontal"
      ? `-50% ${vertical}`
      : `${horizontal} -50%`;
}

function applyHorizontalConstraint(
  style: CSSProperties,
  constraint: PackageHorizontalConstraint,
  child: PackageRect,
  parent: PackageRect,
  sizing: PackageAxisSizing,
): void {
  const right = parent.width - child.x - child.width;
  if (constraint === "LEFT") {
    style.left = child.x;
    style.right = undefined;
    if (sizing.mode !== "HUG") style.width = child.width;
  } else if (constraint === "RIGHT") {
    style.left = undefined;
    style.right = right;
    if (sizing.mode !== "HUG") style.width = child.width;
  } else if (constraint === "LEFT_RIGHT") {
    style.left = child.x;
    style.right = right;
    style.width = undefined;
  } else if (constraint === "CENTER") {
    const centerOffset =
      child.x + child.width / 2 - parent.width / 2;
    style.left = `calc(50% + ${centerOffset}px)`;
    style.right = undefined;
    if (sizing.mode !== "HUG") style.width = child.width;
    applyCenterTranslation(style, "horizontal");
  } else {
    style.left = percentage(child.x, parent.width);
    style.right = undefined;
    style.width = percentage(child.width, parent.width);
  }
}

function applyVerticalConstraint(
  style: CSSProperties,
  constraint: PackageVerticalConstraint,
  child: PackageRect,
  parent: PackageRect,
  sizing: PackageAxisSizing,
): void {
  const bottom = parent.height - child.y - child.height;
  if (constraint === "TOP") {
    style.top = child.y;
    style.bottom = undefined;
    if (sizing.mode !== "HUG") style.height = child.height;
  } else if (constraint === "BOTTOM") {
    style.top = undefined;
    style.bottom = bottom;
    if (sizing.mode !== "HUG") style.height = child.height;
  } else if (constraint === "TOP_BOTTOM") {
    style.top = child.y;
    style.bottom = bottom;
    style.height = undefined;
  } else if (constraint === "CENTER") {
    const centerOffset =
      child.y + child.height / 2 - parent.height / 2;
    style.top = `calc(50% + ${centerOffset}px)`;
    style.bottom = undefined;
    if (sizing.mode !== "HUG") style.height = child.height;
    applyCenterTranslation(style, "vertical");
  } else {
    style.top = percentage(child.y, parent.height);
    style.bottom = undefined;
    style.height = percentage(child.height, parent.height);
  }
}

export function isEditorLiveResizableConstraintContainer(
  node: TemplateNode,
  parentLayoutMode: PackageLayoutMode,
  isRoot = false,
): boolean {
  const role = resolvePackageNodeLayoutRole(
    node,
    parentLayoutMode,
    isRoot,
  );
  return (
    !role.isAbsolute &&
    role.parentIsAutoLayout &&
    role.mainAxisSizing === "FILL" &&
    node.children.length > 0
  );
}

export function isEditorLiveResizableNoneContainer(
  node: TemplateNode,
  parentLayoutMode: PackageLayoutMode,
  isRoot = false,
): boolean {
  return (
    node.layout.mode === "NONE" &&
    isEditorLiveResizableConstraintContainer(
      node,
      parentLayoutMode,
      isRoot,
    )
  );
}

export function resolvePackageAbsoluteConstraints(
  node: TemplateNode,
  parentBounds: PackageRect,
  context: PackageConstraintContext = {},
): PackageAbsoluteConstraintResolution {
  const bounds = node.bounds.relative;
  const horizontalBase = normalizePackageHorizontalConstraint(
    rawConstraintValue(node, "horizontal"),
  );
  const verticalBase = normalizePackageVerticalConstraint(
    rawConstraintValue(node, "vertical"),
  );
  const horizontal = resolveAxisResult(
    horizontalBase,
    node.sizing.horizontal,
    "LEFT_RIGHT",
    "LEFT",
    stretchIntentSource(
      node,
      "horizontal",
      context.parentLayoutMode,
    ),
    bounds.x,
    parentBounds.width - bounds.x - bounds.width,
  );
  const vertical = resolveAxisResult(
    verticalBase,
    node.sizing.vertical,
    "TOP_BOTTOM",
    "TOP",
    stretchIntentSource(
      node,
      "vertical",
      context.parentLayoutMode,
    ),
    bounds.y,
    parentBounds.height - bounds.y - bounds.height,
  );
  const style: CSSProperties = {};

  if (horizontal.effective) {
    applyHorizontalConstraint(
      style,
      horizontal.effective,
      bounds,
      parentBounds,
      node.sizing.horizontal,
    );
  }
  if (vertical.effective) {
    applyVerticalConstraint(
      style,
      vertical.effective,
      bounds,
      parentBounds,
      node.sizing.vertical,
    );
  }

  return {
    horizontal,
    vertical,
    style,
    usedFallback:
      horizontal.effective === null || vertical.effective === null,
  };
}

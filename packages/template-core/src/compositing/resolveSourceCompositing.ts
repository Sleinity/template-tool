import type { TemplateNode, TemplatePackageV1 } from "../types";
import { resolveLinearGradientGeometry } from "../primitives/linearGradient";
import type { ResolvedLinearGradientGeometryV1 } from "../primitives/types";

type GroupMode = "PASS_THROUGH" | "NORMAL" | "OVERLAY";
type PaintMode = "NORMAL" | "DARKEN" | "MULTIPLY" | "SCREEN" | "OVERLAY" | "LIGHTEN";

export interface ResolvedCompositingPaintV1 {
  sourceIndex: number;
  color: { r: number; g: number; b: number };
  blendMode: PaintMode;
  sourceOpacity: number;
  renderedOpacity: number;
}

export type ResolvedSourceCompositingV1 =
  | {
      schemaVersion: "resolved-source-compositing-v1";
      kind: "mixed-image-gradient";
      bounds: TemplateNode["bounds"]["relative"];
      imageAssetId: string;
      solidSourceIndex: 0;
      imageSourceIndex: 1;
      gradientSourceIndex: 2;
      gradient: ResolvedLinearGradientGeometryV1;
      revision: string;
    }
  | {
      schemaVersion: "resolved-source-compositing-v1";
      kind: "group";
      mode: GroupMode;
      opacity: number;
      bounds: TemplateNode["bounds"]["relative"];
      childIds: string[];
      revision: string;
    }
  | {
      schemaVersion: "resolved-source-compositing-v1";
      kind: "paint-stack";
      groupMode: GroupMode;
      groupOpacity: number;
      bounds: TemplateNode["bounds"]["relative"];
      paints: ResolvedCompositingPaintV1[];
      revision: string;
    };

function hash(value: unknown): string {
  const input = JSON.stringify(value);
  let result = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    result ^= input.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
}

function unit(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function axisAligned(node: TemplateNode): boolean {
  const figma = node.extensions?.figma as Record<string, unknown> | undefined;
  if (figma?.rotation !== undefined && figma.rotation !== 0) return false;
  const matrix = figma?.relativeTransform;
  if (matrix === undefined) return true;
  return Array.isArray(matrix) && matrix.length === 2 &&
    Array.isArray(matrix[0]) && Array.isArray(matrix[1]) &&
    matrix[0][0] === 1 && matrix[0][1] === 0 &&
    matrix[1][0] === 0 && matrix[1][1] === 1;
}

function ordinaryNode(node: TemplateNode): boolean {
  return node.appearance.visible !== false && node.mask?.isMask !== true &&
    !node.image && !node.vector && node.appearance.strokes.length === 0 &&
    node.appearance.effects.length === 0 && !node.appearance.clipContent &&
    !node.layout.clipContent && axisAligned(node);
}

function paintStack(node: TemplateNode): ResolvedCompositingPaintV1[] | null {
  const corners = node.appearance.cornerRadii;
  if (node.type !== "RECTANGLE" || !ordinaryNode(node) || node.children.length !== 0 ||
      node.appearance.opacity !== 1 ||
      (node.appearance.blendMode ?? "PASS_THROUGH").toUpperCase() !== "PASS_THROUGH" ||
      node.appearance.cornerRadius !== 0 ||
      (corners && Object.values(corners).some((radius) => radius !== 0)) ||
      node.appearance.fills.length < 1 || node.appearance.fills.length > 2) return null;
  const result: ResolvedCompositingPaintV1[] = [];
  for (const [sourceIndex, paint] of node.appearance.fills.entries()) {
    const mode = (paint.blendMode ?? "NORMAL").toUpperCase();
    if (paint.type !== "SOLID" || paint.visible === false || !unit(paint.opacity) ||
        !unit(paint.color.r) || !unit(paint.color.g) || !unit(paint.color.b) ||
        paint.color.a !== 1 ||
        !(["NORMAL", "DARKEN", "MULTIPLY", "SCREEN", "OVERLAY", "LIGHTEN"] as string[]).includes(mode) ||
        (sourceIndex > 0 && mode !== "NORMAL")) return null;
    result.push({
      sourceIndex,
      color: { r: paint.color.r, g: paint.color.g, b: paint.color.b },
      blendMode: mode as PaintMode,
      sourceOpacity: paint.opacity,
      renderedOpacity: paint.opacity,
    });
  }
  // Ordinary NORMAL fills already have the established primitive owner.
  return result.some((paint) => paint.blendMode !== "NORMAL") ? result : null;
}

function nonOverlapping(nodes: TemplateNode[]): boolean {
  return nodes.every((node, index) => nodes.slice(index + 1).every((other) => {
    const a = node.bounds.relative;
    const b = other.bounds.relative;
    return a.x + a.width <= b.x || b.x + b.width <= a.x ||
      a.y + a.height <= b.y || b.y + b.height <= a.y;
  }));
}

function distributeOpacity(paints: ResolvedCompositingPaintV1[], groupOpacity: number): void {
  // A PASS_THROUGH group cannot itself acquire CSS opacity: that would isolate
  // child blends from the backdrop. For non-overlapping children, distribute
  // the group's post-composition opacity through each ordered paint instead.
  let laterTransparency = 1;
  let sourceLaterTransparency = 1;
  for (let index = paints.length - 1; index >= 0; index -= 1) {
    const paint = paints[index];
    const targetCoefficient = groupOpacity * paint.sourceOpacity * sourceLaterTransparency;
    paint.renderedOpacity = laterTransparency === 0 ? 0 : targetCoefficient / laterTransparency;
    sourceLaterTransparency *= 1 - paint.sourceOpacity;
    laterTransparency *= 1 - paint.renderedOpacity;
  }
}

function mixedImageGradient(node: TemplateNode, rootId: string):
  Extract<ResolvedSourceCompositingV1, { kind: "mixed-image-gradient" }> | null {
  const [solid, image, gradient] = node.appearance.fills;
  const corners = node.appearance.cornerRadii;
  if (node.parentId !== rootId || node.type !== "FRAME" || !axisAligned(node) ||
      node.appearance.visible === false || node.appearance.opacity !== 1 ||
      (node.appearance.blendMode ?? "PASS_THROUGH").toUpperCase() !== "PASS_THROUGH" ||
      node.appearance.cornerRadius !== 0 ||
      (corners && Object.values(corners).some((radius) => radius !== 0)) ||
      node.appearance.strokes.length !== 0 || node.appearance.effects.length !== 0 ||
      node.appearance.clipContent || node.layout.clipContent || node.mask?.isMask === true ||
      node.vector || !node.image?.assetId || node.image.scaleMode !== "FILL" ||
      node.appearance.fills.length !== 3 ||
      solid?.type !== "SOLID" || solid.visible === false || solid.opacity !== 1 ||
      solid.color.a !== 1 || (solid.blendMode ?? "NORMAL").toUpperCase() !== "NORMAL" ||
      image?.type !== "IMAGE" || image.visible === false || image.opacity !== 1 ||
      (image.blendMode ?? "NORMAL").toUpperCase() !== "NORMAL" ||
      gradient?.type !== "GRADIENT_LINEAR" || gradient.visible === false ||
      (gradient.blendMode ?? "NORMAL").toUpperCase() !== "DARKEN") return null;
  const geometry = resolveLinearGradientGeometry(gradient, 2, node.bounds.relative, {
    allowDarkenBlend: true,
  });
  if (geometry.capability !== "source-certified-linear-gradient") return null;
  const entry = {
    schemaVersion: "resolved-source-compositing-v1" as const,
    kind: "mixed-image-gradient" as const,
    bounds: structuredClone(node.bounds.relative),
    imageAssetId: node.image.assetId,
    solidSourceIndex: 0 as const,
    imageSourceIndex: 1 as const,
    gradientSourceIndex: 2 as const,
    gradient: geometry,
  };
  return { ...entry, revision: `compositing-v1:${hash({ entry, fills: node.appearance.fills, image: node.image })}` };
}

export function resolveSourceCompositing(
  packageValue: TemplatePackageV1,
): Record<string, ResolvedSourceCompositingV1> {
  const result: Record<string, ResolvedSourceCompositingV1> = {};
  const root = packageValue.nodes[packageValue.rootNodeId];
  // This is the currently source-certified, opaque-backdrop 0.6.1 subset.
  // Transparent canvases and older producer opacity contracts retain their
  // existing compatibility boundary.
  const canvasBackground = packageValue.canvas.background;
  const backdropPaint = root?.appearance.fills[0];
  if (packageValue.source?.type !== "figma" || packageValue.source.pluginVersion !== "0.6.1" ||
      !canvasBackground || typeof canvasBackground === "string" || canvasBackground.a !== 1 ||
      !root || root.type !== "FRAME") return result;
  // A complete source-indexed SOLID/IMAGE/DARKEN-gradient fill stack may
  // own its direct frame even when the root itself has no paint.
  if (!packageValue.maskRelationships?.length &&
      (!packageValue.motion || (packageValue.motion.linking.matchedNodeIds.length === 0 &&
        JSON.stringify(packageValue.motion.raw) === "{}")) &&
      root.appearance.opacity === 1 && root.appearance.visible !== false &&
      root.appearance.strokes.length === 0 && root.appearance.effects.length === 0 &&
      root.mask?.isMask !== true && axisAligned(root)) {
    for (const childId of root.children) {
      const child = packageValue.nodes[childId];
      if (!child) continue;
      const mixed = mixedImageGradient(child, root.id);
      if (mixed) result[child.id] = mixed;
    }
  }
  if (
      root.appearance.opacity !== 1 || !axisAligned(root) ||
      root.appearance.visible === false || root.mask?.isMask === true ||
      root.appearance.strokes.length !== 0 || root.appearance.effects.length !== 0 ||
      root.appearance.fills.length !== 1 || !backdropPaint ||
      backdropPaint.visible === false || backdropPaint.opacity !== 1 ||
      (backdropPaint.blendMode ?? "NORMAL").toUpperCase() !== "NORMAL" ||
      !(backdropPaint.type === "IMAGE" && root.image ||
        backdropPaint.type === "SOLID" && backdropPaint.color.a === 1) ||
      (root.appearance.blendMode ?? "PASS_THROUGH").toUpperCase() !== "PASS_THROUGH" ||
      (packageValue.motion && (packageValue.motion.linking.matchedNodeIds.length > 0 ||
        JSON.stringify(packageValue.motion.raw) !== "{}")) ||
      packageValue.maskRelationships?.length) return result;
  for (const childId of root.children) {
    const child = packageValue.nodes[childId];
    if (!child) continue;
    const directPaints = paintStack(child);
    if (directPaints && child.parentId === root.id) {
      const entry = {
        schemaVersion: "resolved-source-compositing-v1" as const,
        kind: "paint-stack" as const,
        groupMode: "PASS_THROUGH" as const,
        groupOpacity: 1,
        bounds: structuredClone(child.bounds.relative),
        paints: directPaints,
      };
      result[child.id] = { ...entry, revision: `compositing-v1:${hash({ entry, rootOrder: root.children })}` };
      continue;
    }
    if (child.parentId !== root.id || child.type !== "GROUP" || !ordinaryNode(child) || child.appearance.fills.length !== 0 ||
        !unit(child.appearance.opacity) || child.children.length === 0) continue;
    const mode = (child.appearance.blendMode ?? "PASS_THROUGH").toUpperCase();
    if (!["PASS_THROUGH", "NORMAL", "OVERLAY"].includes(mode)) continue;
    const rows = child.children.map((id) => packageValue.nodes[id]);
    if (rows.some((row) => !row || row.parentId !== child.id) ||
        !nonOverlapping(rows as TemplateNode[])) continue;
    const stacks = rows.map((row) => paintStack(row));
    if (stacks.some((stack) => !stack)) continue;
    const groupMode = mode as GroupMode;
    const groupEntry = {
      schemaVersion: "resolved-source-compositing-v1" as const,
      kind: "group" as const,
      mode: groupMode,
      opacity: child.appearance.opacity,
      bounds: structuredClone(child.bounds.relative),
      childIds: [...child.children],
    };
    result[child.id] = { ...groupEntry, revision: `compositing-v1:${hash({ groupEntry, rootOrder: root.children })}` };
    for (const [index, row] of rows.entries()) {
      const paints = stacks[index]!;
      if (groupMode === "PASS_THROUGH") distributeOpacity(paints, child.appearance.opacity);
      const entry = {
        schemaVersion: "resolved-source-compositing-v1" as const,
        kind: "paint-stack" as const,
        groupMode,
        groupOpacity: child.appearance.opacity,
        bounds: structuredClone(row.bounds.relative),
        paints,
      };
      result[row.id] = { ...entry, revision: `compositing-v1:${hash({ entry, group: groupEntry, rootOrder: root.children })}` };
    }
  }
  return result;
}

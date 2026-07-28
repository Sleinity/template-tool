import type { PackagePaint, PackageStroke, TemplateNode } from "../types";

export type PackageStrokeAlignment = "INSIDE" | "CENTER" | "OUTSIDE";
export type PackageStrokeStrategy =
  | "border"
  | "inset-shadow"
  | "centered-shadow"
  | "outer-shadow"
  | "none";

export interface PackageStrokeLayer {
  paint: Extract<PackagePaint, { type: "SOLID" }>;
  weight: number;
  alignment: PackageStrokeAlignment | null;
  strategy: PackageStrokeStrategy;
}

export interface PackageStrokeModel {
  paint: Extract<PackagePaint, { type: "SOLID" }> | null;
  weight: number;
  alignment: PackageStrokeAlignment | null;
  rawAlignment: string | null;
  includedInLayout: boolean | null;
  rawIncludedInLayout: unknown;
  strategy: PackageStrokeStrategy;
  layers: PackageStrokeLayer[];
  visibleStrokeCount: number;
  visibleSolidStrokeCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function figmaMetadata(node: TemplateNode): Record<string, unknown> | null {
  return isRecord(node.extensions?.figma) ? node.extensions.figma : null;
}

function strokePaint(stroke: PackagePaint | PackageStroke): PackagePaint {
  return "paint" in stroke ? stroke.paint : stroke;
}

function strokeWeight(
  stroke: PackagePaint | PackageStroke,
  fallback: number,
): number {
  const value = "paint" in stroke ? stroke.weight : fallback;
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function normalizeAlignment(value: unknown): PackageStrokeAlignment | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  return ["INSIDE", "CENTER", "OUTSIDE"].includes(normalized)
    ? (normalized as PackageStrokeAlignment)
    : null;
}

function resolveStrategy(
  mode: "static" | "editor",
  includedInLayout: boolean | null,
  alignment: PackageStrokeAlignment | null,
): PackageStrokeStrategy {
  if (mode === "static" || includedInLayout === null || !alignment) return "border";
  if (alignment === "INSIDE") return includedInLayout ? "border" : "inset-shadow";
  return alignment === "CENTER" ? "centered-shadow" : "outer-shadow";
}

export function resolvePackageStrokeModel(
  node: TemplateNode,
  mode: "static" | "editor",
): PackageStrokeModel {
  const visibleStrokes = node.appearance.strokes.filter(
    (stroke) => strokePaint(stroke).visible !== false,
  );
  const solidStrokes = visibleStrokes.filter(
    (
      stroke,
    ): stroke is
      | Extract<PackagePaint, { type: "SOLID" }>
      | (PackageStroke & { paint: Extract<PackagePaint, { type: "SOLID" }> }) =>
      strokePaint(stroke).type === "SOLID",
  );
  const selected = solidStrokes[0];
  const paint = selected
    ? (strokePaint(selected) as Extract<PackagePaint, { type: "SOLID" }>)
    : null;
  const figma = figmaMetadata(node);
  const rawAlignment =
    (selected && "paint" in selected ? selected.align : null) ??
    node.appearance.strokeAlign ??
    (typeof figma?.strokeAlign === "string" ? figma.strokeAlign : null);
  const alignment = normalizeAlignment(rawAlignment);
  const rawIncludedInLayout = figma?.strokesIncludedInLayout;
  const includedInLayout =
    typeof rawIncludedInLayout === "boolean" ? rawIncludedInLayout : null;
  const weight = selected
    ? strokeWeight(selected, node.appearance.strokeWeight ?? 1)
    : 0;
  const strategy =
    paint && weight > 0 ? resolveStrategy(mode, includedInLayout, alignment) : "none";
  const layers = solidStrokes
    .map((stroke): PackageStrokeLayer | null => {
      const layerPaint = strokePaint(stroke) as Extract<PackagePaint, { type: "SOLID" }>;
      const layerWeight = strokeWeight(stroke, node.appearance.strokeWeight ?? 1);
      if (layerWeight <= 0) return null;
      const rawLayerAlignment = ("paint" in stroke ? stroke.align : null) ?? rawAlignment;
      const layerAlignment = normalizeAlignment(rawLayerAlignment);
      return {
        paint: layerPaint,
        weight: layerWeight,
        alignment: layerAlignment,
        strategy: resolveStrategy(mode, includedInLayout, layerAlignment),
      };
    })
    .filter((layer): layer is PackageStrokeLayer => layer !== null);

  return {
    paint,
    weight,
    alignment,
    rawAlignment: typeof rawAlignment === "string" ? rawAlignment.toUpperCase() : null,
    includedInLayout,
    rawIncludedInLayout,
    strategy,
    layers,
    visibleStrokeCount: visibleStrokes.length,
    visibleSolidStrokeCount: solidStrokes.length,
  };
}

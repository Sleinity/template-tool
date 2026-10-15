export interface PackageColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface PackageSolidPaintSourceV1 {
  schemaVersion: "solid-paint-source-v1";
  sourceIndex: number;
  pairing: "source-index";
  canonicalPath: string;
  rawFigmaPath: string | null;
  sourceContract: "figma-plugin-api-solid-paint-rgb-opacity";
  exporterCompatibility:
    | "plugin-0.6.0-mirrored-color-alpha"
    | "raw-figma-solid-paint";
  opacityDisposition:
    | "raw-paint-opacity"
    | "mirrored-compatibility-alias"
    | "ambiguous-independent-values";
  serializedColorAlpha: number;
  serializedPaintOpacity: number;
  sourcePaintOpacity: number | null;
  canonicalColorAlpha: number;
  canonicalPaintOpacity: number;
  effectiveOpacity: number | null;
  effectiveOpacityRule: "paint-opacity-once" | "preserve-separate-values";
  equalityTolerance: number;
  confidenceBasis:
    | "raw-figma-solid-paint"
    | "raw-figma-solid-paint-conflict"
    | "figma-contract-plus-affected-exporter-equal-values"
    | "affected-exporter-differing-values";
  normalizationRevision: "solid-paint-opacity-normalization-v1";
  conflicts: string[];
}

export interface PackageSolidPaint {
  type: "SOLID";
  color: PackageColor;
  opacity?: number;
  visible?: boolean;
  blendMode?: string;
  solidPaintSource?: PackageSolidPaintSourceV1;
}

export interface PackageGradientStop {
  position: number;
  color: PackageColor;
}

export interface PackageLinearGradientSourceV1 {
  schemaVersion: "linear-gradient-source-v1";
  sourceIndex: number;
  pairing: "source-index";
  canonicalPath: string;
  rawFigmaPath: string;
  stopsSource:
    | "canonical-gradientStops"
    | "canonical-stops"
    | "figma-raw-gradientStops"
    | "figma-raw-stops"
    | "missing";
  transformSource:
    | "canonical-gradientTransform"
    | "canonical-transform"
    | "figma-raw-gradientTransform"
    | "figma-raw-transform"
    | "missing";
  normalizationRevision: "linear-gradient-normalization-v1";
  conflicts: string[];
}

export interface PackageGradientPaint {
  type: "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND";
  stops?: PackageGradientStop[];
  gradientStops?: PackageGradientStop[];
  opacity?: number;
  visible?: boolean;
  transform?: number[][];
  gradientTransform?: number[][];
  blendMode?: string;
  linearGradientSource?: PackageLinearGradientSourceV1;
}

export interface PackageImagePaint {
  type: "IMAGE";
  assetId?: string;
  scaleMode?: "FILL" | "FIT" | "CROP" | "TILE";
  opacity?: number;
  visible?: boolean;
  blendMode?: string;
}

export type PackagePaint =
  | PackageSolidPaint
  | PackageGradientPaint
  | PackageImagePaint;

export interface PackageStroke {
  paint: PackagePaint;
  weight: number;
  align?: "INSIDE" | "OUTSIDE" | "CENTER";
}

export interface PackageShadowEffect {
  type: "DROP_SHADOW" | "INNER_SHADOW";
  color: PackageColor;
  offset: { x: number; y: number };
  radius: number;
  spread?: number;
  visible?: boolean;
}

export interface PackageBlurEffect {
  type: "LAYER_BLUR" | "BACKGROUND_BLUR";
  radius: number;
  visible?: boolean;
}

export type PackageEffect = PackageShadowEffect | PackageBlurEffect;

export type PackageBorderRadius =
  | number
  | {
      topLeft: number;
      topRight: number;
      bottomRight: number;
      bottomLeft: number;
    };

export type PackageCornerRadii =
  | [number, number, number, number]
  | {
      topLeft: number;
      topRight: number;
      bottomRight: number;
      bottomLeft: number;
    };

export interface PackageAppearance {
  visible?: boolean;
  opacity: number;
  blendMode?: string;
  fills: PackagePaint[];
  strokes: Array<PackagePaint | PackageStroke>;
  strokeWeight?: number | null;
  strokeAlign?: string | null;
  effects: PackageEffect[];
  cornerRadius?: number | null;
  cornerRadii?: PackageCornerRadii | null;
  clipContent?: boolean;
  borderRadius?: PackageBorderRadius | null;
}

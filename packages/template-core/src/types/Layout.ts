export type PackageSizingMode = "FIXED" | "HUG" | "FILL";
export type PackagePositioningMode = "ROOT" | "FLOW" | "ABSOLUTE";
export type PackageLayoutMode = "NONE" | "HORIZONTAL" | "VERTICAL";

export interface PackageRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PackageBounds {
  absolute: PackageRect;
  relative: PackageRect;
}

export interface PackageAxisSizing {
  mode: PackageSizingMode;
  value?: number | null;
  min?: number | null;
  max?: number | null;
}

export interface PackageSizing {
  horizontal: PackageAxisSizing;
  vertical: PackageAxisSizing;
}

export interface PackagePadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type PackagePrimaryAlignment =
  | "MIN"
  | "CENTER"
  | "MAX"
  | "SPACE_BETWEEN";

export type PackageCounterAlignment =
  | "MIN"
  | "CENTER"
  | "MAX"
  | "STRETCH"
  | "BASELINE";

export interface PackageAutoLayout {
  mode: PackageLayoutMode;
  wrap: boolean;
  gap: number;
  rowGap?: number;
  columnGap?: number;
  padding: PackagePadding;
  primaryAlignment: PackagePrimaryAlignment;
  counterAlignment: PackageCounterAlignment;
  clipContent: boolean;
}

export interface PackagePositioningWithConstraints {
  mode: PackagePositioningMode;
  constraints?: {
    horizontal?: string;
    vertical?: string;
  };
}

export type PackagePositioning =
  | PackagePositioningMode
  | PackagePositioningWithConstraints;

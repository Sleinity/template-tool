export type PackageFontCssStyle = "normal" | "italic" | "oblique";
export type PackageFontResolutionMatch =
  | "exact"
  | "compatible"
  | "replacement"
  | "alias"
  | "manual"
  | "fallback";

export interface PackageFontAxisValue {
  tag: string;
  value: number;
}

export interface PackageFontResolutionHistoryEntry {
  match: PackageFontResolutionMatch;
  managedFontId?: string;
  binaryHash?: string;
  changedAt: string;
  reason: string;
}

export interface PackageFontResolution {
  managedFontId?: string;
  match: PackageFontResolutionMatch;
  classification?: "exact" | "compatible" | "replacement" | "missing";
  confirmed: boolean;
  fallbackFamily?: string;
  requestId?: string;
  faceIndex?: number;
  binaryHash?: string;
  runtimeFamily?: string;
  effectiveFamily?: string;
  effectiveWeight?: number;
  effectiveStyle?: PackageFontCssStyle;
  effectiveStretch?: string;
  effectiveAxes?: PackageFontAxisValue[];
  history?: PackageFontResolutionHistoryEntry[];
}

export interface FontStyleRange {
  start: number;
  end: number;
  family: string;
  style: string;
  cssStyle: PackageFontCssStyle;
  weight: number;
  postScriptName: string | null;
}

export interface TemplatePackageFontRequirement {
  id: string;
  family: string;
  style: string;
  cssStyle: PackageFontCssStyle;
  weight: number;
  postScriptName: string | null;
  usedBy: string[];
  characters: string;
  editable: boolean;
  mixedStyle: boolean;
  source: string;
  availableInFigma: boolean;
  stretch?: string;
  axes?: PackageFontAxisValue[];
  /**
   * Optional app-managed font binary. Exporters may omit this and provide
   * metadata only; the app can then resolve the face from its managed registry.
   */
  assetId?: string;
  /**
   * App-owned resolution metadata. Exported requirement fields remain intact.
   */
  resolution?: PackageFontResolution;
}

export interface PackageOutlinedTextFallback {
  type: "outlined-svg";
  assetId: string;
}

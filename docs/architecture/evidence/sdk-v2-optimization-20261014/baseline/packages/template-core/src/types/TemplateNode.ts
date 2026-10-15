import type { PackageAppearance } from "./Appearance";
import type {
  PackageAutoLayout,
  PackageBounds,
  PackagePositioning,
  PackageRect,
  PackageSizing,
} from "./Layout";
import type { PackageColor } from "./Appearance";
import type {
  FontStyleRange,
  PackageOutlinedTextFallback,
} from "./Fonts";

export type TemplateNodeType =
  | "FRAME"
  | "GROUP"
  | "RECTANGLE"
  | "TEXT"
  | "IMAGE"
  | "VECTOR"
  | "BOOLEAN_OPERATION"
  | "ELLIPSE"
  | "LINE"
  | "POLYGON"
  | "STAR"
  | "COMPONENT"
  | "INSTANCE";

export interface PackageTextMeasurement {
  value: number | null;
  unit: string;
}

export interface PackageTextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight?: number;
  fontStyle?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlignHorizontal?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  textAlignVertical?: "TOP" | "CENTER" | "BOTTOM";
  textAutoResize?: "NONE" | "WIDTH_AND_HEIGHT" | "HEIGHT" | "TRUNCATE";
}

export interface PackageTextPayloadV0 {
  content: string;
  style: PackageTextStyle;
}

export interface PackageTextPayload {
  characters: string;
  fontFamily: string | null;
  fontPostScriptName?: string | null;
  fontStyle?: string | null;
  fontWeight?: number | null;
  fontSize: number | null;
  lineHeight?: PackageTextMeasurement | null;
  letterSpacing?: PackageTextMeasurement | null;
  textAlignHorizontal?: string | null;
  textAlignVertical?: string | null;
  textAutoResize?: string | null;
  leadingTrim?: "NONE" | "CAP_HEIGHT" | string | null;
  paragraphSpacing?: number | null;
  textDecoration?: string | null;
  textCase?: string | null;
  styleRanges?: FontStyleRange[];
}

export interface PackageImagePayload {
  assetId: string | null;
  deferred?: boolean;
  hash?: string;
  scaleMode?: string;
  imageTransform?: number[][];
  objectPosition?: {
    x: number;
    y: number;
  };
  /**
   * Imported scaleMode/imageTransform remain immutable source intent. This
   * separate state records which authority currently owns placement after an
   * editor replacement. Older packages omit it and resolve as imported-source.
   */
  activePlacement?: {
    state:
      | "imported-source"
      | "replacement-fill"
      | "replacement-fit"
      | "editor-crop";
    revision: number;
  };
}

export interface PackageVectorPayload {
  assetId?: string | null;
  deferred?: boolean;
  format?: string;
  renderMode?:
    | "SVG_ASSET"
    | "FLATTENED_SVG"
    | "SEMANTIC_SHAPE"
    | "UNSUPPORTED";
  assetKind?: "DIRECT_SVG" | "FLATTENED_SVG" | null;
  fit?: string;
  pathData?: string;
  viewBox?: string | PackageRect | null;
  preserveAspectRatio?: string;
  contentBounds?: PackageRect | null;
  paints?: {
    fills: PackageVectorPaintSnapshot[];
    strokes: PackageVectorPaintSnapshot[];
  };
  features?: {
    hasBooleanOperation?: boolean;
    hasGradients?: boolean;
    hasImages?: boolean;
    hasEffects?: boolean;
    hasBlendModes?: boolean;
    hasMasks?: boolean;
    hasMultipleFills?: boolean;
    hasMultipleStrokes?: boolean;
  };
}

export interface PackageVectorPaintSnapshot {
  type: string;
  opacity?: number;
  visible?: boolean;
  hasGradient?: boolean;
  color?: PackageColor;
  strokeWeight?: number;
  strokeAlign?: string;
}

export interface PackageShapePayload {
  type: "RECTANGLE" | "ELLIPSE" | "LINE" | "POLYGON" | "STAR" | string;
  cornerRadius?: number | null;
}

/**
 * Exported node-level mask intent. `isMask` is the sole classifier; a
 * `maskType` string on an ordinary node is preserved evidence, not authority.
 */
export interface PackageNodeMask {
  isMask: boolean;
  maskType?: string;
}

export interface TemplateNodeBase {
  id: string;
  name: string;
  type: TemplateNodeType;
  parentId: string | null;
  children: string[];
  bounds: PackageBounds;
  positioning: PackagePositioning;
  layout: PackageAutoLayout;
  sizing: PackageSizing;
  appearance: PackageAppearance;
  image?: PackageImagePayload;
  vector?: PackageVectorPayload;
  shape?: PackageShapePayload;
  mask?: PackageNodeMask;
  extensions?: Record<string, unknown>;
}

export interface FrameTemplateNode extends TemplateNodeBase {
  type: "FRAME";
}

export interface GroupTemplateNode extends TemplateNodeBase {
  type: "GROUP";
}

export interface RectangleTemplateNode extends TemplateNodeBase {
  type: "RECTANGLE";
}

export interface TextTemplateNode extends TemplateNodeBase {
  type: "TEXT";
  text: PackageTextPayload | PackageTextPayloadV0;
  textFallback?: PackageOutlinedTextFallback;
}

export interface ImageTemplateNode extends TemplateNodeBase {
  type: "IMAGE";
  image: PackageImagePayload;
}

export interface VectorTemplateNode extends TemplateNodeBase {
  type: "VECTOR";
  vector: PackageVectorPayload;
}

export interface BooleanOperationTemplateNode extends TemplateNodeBase {
  type: "BOOLEAN_OPERATION";
  vector: PackageVectorPayload;
}

export interface ShapeTemplateNode extends TemplateNodeBase {
  type: "ELLIPSE" | "LINE" | "POLYGON" | "STAR";
  shape?: PackageShapePayload;
}

export interface ComponentTemplateNode extends TemplateNodeBase {
  type: "COMPONENT";
}

export interface InstanceTemplateNode extends TemplateNodeBase {
  type: "INSTANCE";
}

export type TemplateNode =
  | FrameTemplateNode
  | GroupTemplateNode
  | RectangleTemplateNode
  | TextTemplateNode
  | ImageTemplateNode
  | VectorTemplateNode
  | BooleanOperationTemplateNode
  | ShapeTemplateNode
  | ComponentTemplateNode
  | InstanceTemplateNode;

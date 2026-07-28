import type {
  EditableFieldBinding,
  PackageEffect,
  PackageLayoutMode,
  PackagePadding,
  PackagePaint,
  PackagePositioningMode,
  PackageRect,
  PackageSizingMode,
  TemplateNodeType,
  RendererHint,
} from "../types";
import type {
  PrimitiveAppearanceV1,
  PrimitiveCanvasAuthorityV1,
} from "../primitives";
import type {
  ResolvedBackendAvailabilityV1,
  ResolvedBackendDecisionV1,
  ResolvedBackendDiagnosticProjectionV1,
} from "../backend-decision/types";

export type ResolvedTemplateGraphContract = "resolved-template-graph-v1";

export interface ResolvedSourcePackageSummary {
  packageId: string;
  name: string;
  rootNodeId: string;
  sourceType?: string;
  pluginVersion?: string;
}

export interface ResolvedAssetRef {
  assetId: string;
  kind: "image" | "svg" | "vector" | "font" | "video" | "unknown";
  source: "stored" | "remote" | "embedded" | "missing";
  renderable: boolean;
  nodeIds: string[];
  fieldIds: string[];
  mimeType?: string;
  hash?: string;
  storageKey?: string;
  stableUrl?: string;
}

export interface ResolvedEditableFieldTarget {
  fieldId: string;
  type: EditableFieldBinding["type"];
  nodeId: string;
  property: string;
  targetExists: boolean;
  targetNodeType?: TemplateNodeType;
  propertySupported: boolean;
  assetId?: string | null;
  assetExists?: boolean;
}

export interface ResolvedMotionLinks {
  status:
    | "none"
    | "unchecked"
    | "pass"
    | "warning"
    | "fail"
    | "pass-with-warnings"
    | "static-only";
  matchedNodeIds: string[];
  missingNodeIds: string[];
  extraPackageNodeIds: string[];
}

export interface ResolvedRenderWarning {
  code: string;
  message: string;
  nodeId?: string;
  feature:
    | "layout"
    | "appearance"
    | "text"
    | "image"
    | "vector"
    | "font"
    | "fallback";
}

export interface ResolvedFidelityDiagnostic {
  code: string;
  message: string;
  nodeId: string;
  severity: "info" | "warning";
}

export interface ResolvedAxisSizing {
  mode: PackageSizingMode;
  value: number | null;
  min: number | null;
  max: number | null;
}

export interface ResolvedRenderLayout {
  mode: PackageLayoutMode;
  display: "block" | "flex";
  direction: "row" | "column" | null;
  wrap: boolean;
  gap: number;
  rowGap: number | null;
  columnGap: number | null;
  padding: PackagePadding;
  justifyContent:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between";
  alignItems:
    | "flex-start"
    | "center"
    | "flex-end"
    | "stretch"
    | "baseline";
  clipContent: boolean;
  horizontal: ResolvedAxisSizing;
  vertical: ResolvedAxisSizing;
  roles: {
    containerPrimaryAxis: PackageSizingMode | null;
    containerCounterAxis: PackageSizingMode | null;
    childHorizontal: PackageSizingMode;
    childVertical: PackageSizingMode;
    childGrow: number | null;
    childAlign: string | null;
  };
}

export interface ResolvedSolidFill {
  kind: "solid";
  sourceIndex: number;
  color: string;
  source: PackagePaint;
  paintRole?: "ordinary-visible" | "mask-input" | "effect-input" | "unsupported-compositing-input";
  paintRevision?: string;
}

export interface ResolvedImageFill {
  kind: "image";
  sourceIndex: number;
  assetId: string | null;
  source: PackagePaint;
  paintRole?: "ordinary-visible" | "mask-input" | "effect-input" | "unsupported-compositing-input";
  paintRevision?: string;
}

export interface ResolvedUnsupportedFill {
  kind: "unsupported";
  sourceIndex: number;
  paintType: string;
  source: PackagePaint;
  paintRole?: "ordinary-visible" | "mask-input" | "effect-input" | "unsupported-compositing-input";
  paintRevision?: string;
}

export interface ResolvedLinearGradientFill {
  kind: "linear-gradient";
  sourceIndex: number;
  geometryRevision: string;
  source: PackagePaint;
  paintRole?: "ordinary-visible" | "mask-input" | "effect-input" | "unsupported-compositing-input";
  paintRevision?: string;
}

export type ResolvedFill =
  | ResolvedSolidFill
  | ResolvedImageFill
  | ResolvedLinearGradientFill
  | ResolvedUnsupportedFill;

export interface ResolvedStroke {
  color: string;
  weight: number;
  alignment: "INSIDE" | "CENTER" | "OUTSIDE" | null;
}

export interface ResolvedEffect {
  type: string;
  cssBoxShadow?: string;
  cssFilter?: string;
  cssBackdropFilter?: string;
  supported: boolean;
  source: PackageEffect;
}

export interface ResolvedRenderAppearance {
  visible: boolean;
  opacity: number;
  fills: ResolvedFill[];
  backgroundColor: string | null;
  strokes: ResolvedStroke[];
  effects: ResolvedEffect[];
  borderRadius: string | number | null;
  clipContent: boolean;
  overflow: "hidden" | "visible";
}

export interface ResolvedRenderText {
  characters: string;
  fontFamily: string | null;
  fontPostScriptName: string | null;
  runtimeFontFamily?: string;
  fontBinaryHash?: string;
  fontFaceIndex?: number;
  fontClassification?: "exact" | "compatible" | "replacement" | "fallback" | "missing";
  cssFontFamily: string;
  fontStatus: "specified" | "missing" | "fallback";
  fallbackFamily: string;
  fontStyle: "normal" | "italic" | "oblique";
  fontWeight: number;
  fontSizePx: number;
  lineHeightPx: number;
  letterSpacingPx: number;
  alignHorizontal: "left" | "center" | "right" | "justify";
  alignVertical: "top" | "center" | "bottom";
  autoResize: "none" | "width" | "height" | "widthAndHeight" | "truncate";
  leadingTrim: "none" | "cap-height";
  paragraphSpacingPx: number;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration: "none" | "underline" | "line-through";
  overflow: "visible" | "hidden";
  whiteSpace: "pre-wrap";
}

export interface ResolvedRenderImage {
  assetId: string | null;
  source: string | null;
  scaleMode: string;
  objectFit: "cover" | "contain" | "fill";
  objectPosition: string;
  focalPoint: { x: number; y: number };
  cropZoom: number;
  cropAxis: "width" | "height" | null;
  imageTransform: number[][] | null;
  activePlacementState:
    | "imported-source"
    | "replacement-fill"
    | "replacement-fit"
    | "editor-crop";
  placementRevision: number;
  placement: ResolvedImagePlacementIntentV1;
  cropMode:
    | "figmaImageTransform"
    | "objectPosition"
    | "objectFitOnly"
    | "unknown";
  propertySources: {
    assetId: "override" | "node" | "paint" | "hint" | "missing";
    scaleMode: "replacement-policy" | "node" | "paint" | "hint" | "asset" | "default";
    crop: "replacement-policy" | "node" | "hint" | "default";
  };
  replacementMode:
    | "cover"
    | "contain"
    | "preserve-original-crop"
    | "user-crop"
    | null;
  clipStrategy: "slot";
  renderMode:
    | "figma-image-transform"
    | "object-fit-cover"
    | "object-fit-contain"
    | "object-fit-fill"
    | "tile"
    | "fallback";
  transformMatrix: [number, number, number, number, number, number] | null;
  assetWidth: number | null;
  assetHeight: number | null;
  missingAsset: boolean;
}

export type ResolvedImageFitMode =
  | "FILL"
  | "FIT"
  | "CROP"
  | "STRETCH"
  | "TILE"
  | "UNKNOWN";

export interface ResolvedImagePlacementIntentV1 {
  schemaVersion: "resolved-image-placement-v1";
  fitMode: ResolvedImageFitMode;
  focalPoint: { x: number; y: number };
  coordinateSpace: "normalized-node-to-normalized-source";
  transformOrigin: "source-top-left";
  sourceTransform: number[][] | null;
  activeCropTransform: number[][] | null;
  transformApplicability:
    | "active-crop"
    | "compatibility-legacy-fill-transform"
    | "preserved-inapplicable"
    | "missing"
    | "invalid";
  clipping: "slot";
  sampling: {
    backend: "browser-native";
    interpolation: "browser-default";
  };
  compatibilityCropZoom: number;
  compatibilityCropAxis: "width" | "height" | null;
}

export interface ResolvedImagePlacementGeometryV1 {
  schemaVersion: "resolved-image-placement-geometry-v1";
  strategy:
    | "cover"
    | "contain"
    | "stretch"
    | "crop-transform"
    | "compatibility-legacy-fill-transform"
    | "tile"
    | "fallback-cover";
  slot: { x: 0; y: 0; width: number; height: number };
  intrinsic: { width: number; height: number };
  destinationBounds: PackageRect;
  visibleSourceRect: {
    normalized: PackageRect;
    pixels: PackageRect;
  };
  visibleSourcePolygon: Array<{ x: number; y: number }>;
  cropPercent: { top: number; right: number; bottom: number; left: number };
  scale: { x: number; y: number };
  rotationDegrees: number;
  preservesAspectRatio: boolean;
  cssTransform: [number, number, number, number, number, number] | null;
  fallbackReason: string | null;
}

export interface ResolvedRenderVector {
  assetId: string | null;
  source: string | null;
  renderMode:
    | "SVG_ASSET"
    | "FLATTENED_SVG"
    | "SEMANTIC_SHAPE"
    | "UNSUPPORTED";
  renderModeSource:
    | "explicit"
    | "asset-evidence"
    | "shape-evidence"
    | "flattened-evidence"
    | "unsupported-fallback";
  semanticShape: string | null;
  viewBox: string | null;
  preserveAspectRatio: string;
  contentBounds: PackageRect | null;
  fill: string | null;
  stroke: ResolvedStroke | null;
  flattened: boolean;
  usesSvgString: boolean;
  missingAsset: boolean;
}

export interface ResolvedRenderTransform {
  hasTransform: boolean;
  hasRotation: boolean;
  hasScale: boolean;
  isMirrored: boolean;
  rotation: number;
  scaleX: number;
  scaleY: number;
  transformOrigin: string;
  usesMatrix: boolean;
  rawMatrixPresent: boolean;
  matrixValid: boolean;
  hasUnsupportedSkew: boolean;
  linearMatrix: [number, number, number, number] | null;
  matrixTranslation: { x: number; y: number } | null;
  hasLocalGeometry: boolean;
  relativeBoundsInconsistent: boolean;
}

export interface ResolvedRenderNode {
  id: string;
  sourceNodeId: string;
  name: string;
  type: TemplateNodeType;
  parentId: string | null;
  children: string[];
  childOrder: string[];
  stackingIndex: number;
  bounds: {
    absolute: PackageRect;
    relative: PackageRect;
  };
  exportedBounds: {
    absolute: PackageRect;
    relative: PackageRect;
  };
  sourcePositioning: PackagePositioningMode;
  renderPositioning: PackagePositioningMode;
  layout: ResolvedRenderLayout;
  appearance: ResolvedRenderAppearance;
  primitiveAppearance: PrimitiveAppearanceV1;
  backendDecision: ResolvedBackendDecisionV1;
  text?: ResolvedRenderText;
  image?: ResolvedRenderImage;
  vector?: ResolvedRenderVector;
  transform: ResolvedRenderTransform;
  assetRefs: string[];
  editableFields: EditableFieldBinding[];
  fieldTargetIds: string[];
  fieldMarkers: string[];
  fidelityDiagnostics: ResolvedFidelityDiagnostic[];
  renderStrategy: "semantic" | "asset" | "fallback";
  renderHint: RendererHint | null;
  fallbackReason?: string;
}

export interface ResolvedRenderTreeSummary {
  nodeCount: number;
  textNodeCount: number;
  imageNodeCount: number;
  vectorNodeCount: number;
  fallbackRenderedNodeCount: number;
  unsupportedFeatureCount: number;
  missingFonts: string[];
}

export interface ResolvedRenderTreeV1 {
  schemaVersion: "resolved-render-tree-v1";
  contract: ResolvedTemplateGraphContract;
  sourcePackageId: string;
  sourcePackage: ResolvedSourcePackageSummary;
  rootNodeId: string;
  canvas: {
    width: number;
    height: number;
    background: string;
  };
  primitiveCanvas: PrimitiveCanvasAuthorityV1;
  primitiveTreeRevision: string;
  backendAvailability: ResolvedBackendAvailabilityV1;
  backendDecisionRevision: string;
  backendDiagnostics: ResolvedBackendDiagnosticProjectionV1;
  nodes: Record<string, ResolvedRenderNode>;
  maskRelationships?: Array<{
    relationshipId: string;
    maskRevision: string;
    maskSourceId: string;
    parentId: string;
    affected: Array<{
      nodeId: string;
      clipInsets: { top: number; right: number; bottom: number; left: number } | null;
    }>;
    maskType: string;
    status: "valid" | "invalid";
    capability: string;
    renderStrategy: "css-clip-path" | "compatibility-unmasked";
    paintRole: "mask-input";
    maskBounds: PackageRect | null;
    sourceEvidence: {
      relativeTransform: unknown;
      nodeOpacity: number | null;
      paintIndices: number[];
      paintOpacities: Array<number | null>;
      paintAlphas: Array<number | null>;
      confidence: "high" | "unresolved";
    };
  }>;
  nodeOrder: string[];
  assetRefs: Record<string, ResolvedAssetRef>;
  editableFields: EditableFieldBinding[];
  editableFieldTargets: Record<string, ResolvedEditableFieldTarget>;
  motionLinks: ResolvedMotionLinks;
  renderHints: Record<string, RendererHint>;
  fidelityDiagnostics: ResolvedFidelityDiagnostic[];
  warnings: ResolvedRenderWarning[];
  summary: ResolvedRenderTreeSummary;
}

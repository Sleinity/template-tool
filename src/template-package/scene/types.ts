import type {
  EditableFieldBinding,
  PackageAsset,
  PackageEffect,
  PackageFontResolutionMatch,
  PackageJsonValue,
  PackageLayoutMode,
  PackagePaint,
  PackagePositioningMode,
  PackageRect,
  PackageSizingMode,
  PackageStroke,
  PackageTextPayload,
  PackageTextPayloadV0,
  PackageVectorPayload,
  RendererHint,
  TemplateNodeType,
  TemplatePackageDiagnostic,
  TemplatePackageFontRequirement,
  TemplatePackageV1,
} from "../types";

export const CANONICAL_SCENE_GRAPH_VERSION = "canonical-scene-graph-v1" as const;
export const CANONICAL_SCENE_GRAPH_CONTRACT = "template-package-canonical-scene" as const;

export type SceneSupportLevel =
  | "native"
  | "emulated"
  | "approximated"
  | "raster-fallback"
  | "preserved-only"
  | "unsupported"
  | "unknown";

export type SceneConfidence = "high" | "medium" | "low" | "unresolved";
export type ScenePropertyAuthority =
  | "canonical-package"
  | "user-working-package"
  | "normalized-source"
  | "figma-extension"
  | "enrichment"
  | "derived"
  | "fallback"
  | "unresolved";

export interface SceneProvenanceRecord {
  stage:
    | "raw-source"
    | "normalization"
    | "canonical"
    | "enrichment"
    | "user-override"
    | "scene-transform"
    | "fallback";
  sourcePath: string;
  value: unknown;
  note?: string;
}

export interface ScenePropertyCandidate<T = unknown> {
  authority: ScenePropertyAuthority;
  sourcePath: string;
  value: T | null;
  selected: boolean;
  reason: string;
}

export interface SceneProperty<T> {
  value: T;
  authority: ScenePropertyAuthority;
  confidence: SceneConfidence;
  candidates: ScenePropertyCandidate[];
  provenance: SceneProvenanceRecord[];
  conflict: boolean;
  ambiguity: string | null;
  fallback: string | null;
}

export interface SceneAxisSizing {
  mode: SceneProperty<PackageSizingMode>;
  value: SceneProperty<number | null>;
  min: SceneProperty<number | null>;
  max: SceneProperty<number | null>;
}

export interface SceneLayoutSection {
  positioning: SceneProperty<PackagePositioningMode>;
  autoLayout: {
    mode: SceneProperty<PackageLayoutMode>;
    wrap: SceneProperty<boolean>;
    gap: SceneProperty<number>;
    rowGap: SceneProperty<number | null>;
    columnGap: SceneProperty<number | null>;
    padding: SceneProperty<{ top: number; right: number; bottom: number; left: number }>;
    primaryAlignment: SceneProperty<string>;
    counterAlignment: SceneProperty<string>;
  };
  sizing: {
    horizontal: SceneAxisSizing;
    vertical: SceneAxisSizing;
  };
  constraints: {
    horizontal: SceneProperty<string | null>;
    vertical: SceneProperty<string | null>;
  };
  rawParticipation: {
    layoutGrow: number | null;
    layoutAlign: string | null;
    layoutSizingHorizontal: string | null;
    layoutSizingVertical: string | null;
    primaryAxisSizingMode: string | null;
    counterAxisSizingMode: string | null;
  };
}

export interface SceneTransformSection {
  relativeTransform: SceneProperty<number[][] | null>;
  transform: SceneProperty<number[][] | null>;
  rotation: SceneProperty<number>;
  transformOrigin: SceneProperty<string | null>;
  opacity: SceneProperty<number>;
}

export interface SceneGeometrySection {
  absoluteBounds: SceneProperty<PackageRect>;
  relativeBounds: SceneProperty<PackageRect>;
  shape: {
    kind: string | null;
    cornerRadius: number | null;
    cornerRadii: unknown;
    cornerSmoothing: unknown;
    arcData: unknown;
    polygonPointCount: unknown;
    starInnerRadius: unknown;
  };
  vector: PackageVectorPayload | null;
}

export interface SceneTextSection {
  rawPayload: PackageTextPayload | PackageTextPayloadV0;
  characters: SceneProperty<string>;
  fontFamily: SceneProperty<string | null>;
  fontPostScriptName: SceneProperty<string | null>;
  fontStyle: SceneProperty<string | null>;
  fontWeight: SceneProperty<number | null>;
  fontSize: SceneProperty<number | null>;
  lineHeight: SceneProperty<{ value: number | null; unit: string } | null>;
  letterSpacing: SceneProperty<{ value: number | null; unit: string } | null>;
  horizontalAlignment: SceneProperty<string | null>;
  verticalAlignment: SceneProperty<string | null>;
  autoResize: SceneProperty<string | null>;
  leadingTrim: SceneProperty<string | null>;
  paragraphSpacing: SceneProperty<number | null>;
  decoration: SceneProperty<string | null>;
  textCase: SceneProperty<string | null>;
  styleRanges: unknown[];
  browserMeasurementRequired: boolean;
  measurementInputs: string[];
}

export interface SceneMediaSection {
  kind: "image";
  assetId: SceneProperty<string | null>;
  scaleMode: SceneProperty<string>;
  imageTransform: SceneProperty<number[][] | null>;
  focalPosition: SceneProperty<{ x: number; y: number }>;
  activePlacementState: SceneProperty<
    "imported-source" | "replacement-fill" | "replacement-fit" | "editor-crop"
  >;
  placementRevision: SceneProperty<number>;
  replacementMode: SceneProperty<string | null>;
  intrinsicSize: { width: number | null; height: number | null };
  slotBoundsSource: "node-relative-bounds";
  preserveAspectRatio: boolean;
  adjustments: unknown;
}

export interface SceneAppearanceSection {
  visible: SceneProperty<boolean>;
  opacity: SceneProperty<number>;
  blendMode: SceneProperty<string | null>;
  fills: Array<PackagePaint & {
    sourceIndex: number;
    paintRole?: "ordinary-visible" | "mask-input" | "effect-input" | "unsupported-compositing-input";
    paintRevision?: string;
  }>;
  strokes: Array<(PackagePaint | PackageStroke) & { sourceIndex: number }>;
  strokeWeight: number | null;
  strokeAlign: string | null;
  effects: Array<PackageEffect & { sourceIndex: number }>;
  cornerRadius: unknown;
  clipping: {
    clipsContent: SceneProperty<boolean>;
    isMask: SceneProperty<boolean>;
    maskType: SceneProperty<string | null>;
    shouldBreakMaskChain: SceneProperty<boolean>;
  };
}

export interface SceneRelationshipSection {
  assetIds: string[];
  editableFieldIds: string[];
  maskRelationship: {
    isMask: boolean;
    maskType: string | null;
    shouldBreakMaskChain: boolean;
    maskedSiblingRange: "source-declared" | "unresolved" | null;
    relationshipId?: string;
    affectedSiblingIds?: string[];
    capability?: string;
    paintRole?: "mask-input";
  };
  component: {
    componentId: string | null;
    componentSetId: string | null;
    mainComponentId: string | null;
    variantProperties: unknown;
    componentProperties: unknown;
  };
  variables: unknown;
  styles: unknown;
}

export interface SceneCapabilityRecord {
  capabilityId: string;
  family: string;
  support: SceneSupportLevel;
  strategy: string;
  fallback: string | null;
  diagnosticAudience: Array<"user" | "exporter" | "renderer">;
  confidence: SceneConfidence;
}

export interface SceneNodeProvenance {
  canonicalPath: string;
  rawFigmaExtension: Record<string, unknown> | null;
  rendererHint: RendererHint | null;
  packageDiagnostics: TemplatePackageDiagnostic[];
  mappedRawFigmaKeys: string[];
  unmappedRawFigmaKeys: string[];
}

export interface CanonicalSceneNodeV1 {
  identity: {
    id: string;
    sourceNodeId: string;
    name: string;
    type: TemplateNodeType;
    parentId: string | null;
    children: string[];
    childOrder: string[];
    stackingIndex: number;
  };
  layout: SceneLayoutSection;
  transform: SceneTransformSection;
  geometry: SceneGeometrySection;
  text: SceneTextSection | null;
  media: SceneMediaSection | null;
  appearance: SceneAppearanceSection;
  relationships: SceneRelationshipSection;
  capabilities: SceneCapabilityRecord[];
  provenance: SceneNodeProvenance;
}

export interface CanonicalSceneAssetV1 {
  id: string;
  type: PackageAsset["type"];
  source: PackageAsset["source"];
  mimeType: string | null;
  width: number | null;
  height: number | null;
  hash: string | null;
  storageKey: string | null;
  stableUrl: string | null;
  usedBy: string[];
  raw: PackageAsset;
}

export interface CanonicalSceneFontV1 {
  id: string;
  family: string;
  style: string;
  cssStyle: string;
  weight: number;
  postScriptName: string | null;
  usedBy: string[];
  assetId: string | null;
  resolution: {
    match: PackageFontResolutionMatch | null;
    confirmed: boolean | null;
    managedFontId: string | null;
    fallbackFamily: string | null;
  };
  raw: TemplatePackageFontRequirement;
}

export interface SceneTransformationDiagnostic {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  nodeId?: string;
  sourcePath?: string;
}

export interface SceneUnmappedProperty {
  nodeId: string;
  sourcePath: string;
  key: string;
  value: unknown;
  preservationPath: string;
}

export interface CanonicalSceneGraphV1 {
  schemaVersion: typeof CANONICAL_SCENE_GRAPH_VERSION;
  contract: typeof CANONICAL_SCENE_GRAPH_CONTRACT;
  sourcePackage: {
    packageId: string;
    packageSchemaVersion: "1.0";
    name: string;
    rootNodeId: string;
    sourceType: string | null;
    pluginVersion: string | null;
  };
  rootNodeId: string;
  canvas: {
    width: number;
    height: number;
    background: unknown;
    coordinateSpace: string | null;
  };
  nodeOrder: string[];
  nodes: Record<string, CanonicalSceneNodeV1>;
  maskRelationships?: Array<{
    relationshipId: string;
    maskRevision: string;
    maskSourceId: string;
    parentId: string;
    affectedSiblingIds: string[];
    maskType: string;
    scopeTerminationReason: string;
    status: "valid" | "invalid";
    capability: string;
    renderStrategy: string;
    paintRole: "mask-input";
    confidence: SceneConfidence;
    sourceReferences: {
      nodePath: string;
      geometryPath: string;
      transformPath: string;
      opacityPath: string;
      paintPaths: string[];
    };
    provenance: { sourcePath: string; raw: unknown };
  }>;
  assets: Record<string, CanonicalSceneAssetV1>;
  editableFields: EditableFieldBinding[];
  fonts: CanonicalSceneFontV1[];
  motion: {
    format: string;
    raw: PackageJsonValue;
    linking: unknown;
  } | null;
  rendererHints: Record<string, RendererHint>;
  capabilities: SceneCapabilityRecord[];
  sourceDiagnostics: TemplatePackageDiagnostic[];
  transformationDiagnostics: SceneTransformationDiagnostic[];
  unmappedProperties: SceneUnmappedProperty[];
  compatibility: {
    runtimeUse: "disabled-observational";
    currentResolvedContract: "resolved-template-graph-v1";
    rendererAuthority: "unchanged";
  };
}

export interface CanonicalSceneGraphResult {
  graph: CanonicalSceneGraphV1;
  diagnostics: SceneTransformationDiagnostic[];
  unmappedProperties: SceneUnmappedProperty[];
}

export interface CanonicalSceneTransformationContext {
  basePackage?: TemplatePackageV1 | null;
  normalizationProvenance?: unknown;
  enrichmentProvenance?: unknown;
}

export interface SceneValidationIssue {
  code: string;
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface SceneValidationResult {
  valid: boolean;
  issues: SceneValidationIssue[];
}

export type SceneEquivalenceCategory =
  | "mapped"
  | "inferred"
  | "conflicting"
  | "missing"
  | "raw-figma-dependency"
  | "renderer-only"
  | "diagnostics-only"
  | "scene-not-resolved"
  | "resolved-not-derivable"
  | "unsupported-preserved"
  | "provenance-gap"
  | "migration-blocker";

export interface SceneEquivalenceItem {
  category: SceneEquivalenceCategory;
  property: string;
  nodeId?: string;
  packagePath?: string;
  scenePath?: string;
  resolvedPath?: string;
  message: string;
}

export interface SceneEquivalenceReport {
  schemaVersion: "scene-equivalence-report-v1";
  fixtureId: string | null;
  fixtureZipSha256: string | null;
  packageId: string;
  sceneVersion: typeof CANONICAL_SCENE_GRAPH_VERSION;
  resolvedVersion: "resolved-render-tree-v1";
  pixelEquivalenceClaimed: false;
  items: SceneEquivalenceItem[];
  summary: Record<SceneEquivalenceCategory, number>;
  migrationBlockers: string[];
  timings: { sceneTransformMs: number; equivalenceMs: number };
  sizes: { sceneBytes: number; resolvedBytes: number; packageBytes: number };
}

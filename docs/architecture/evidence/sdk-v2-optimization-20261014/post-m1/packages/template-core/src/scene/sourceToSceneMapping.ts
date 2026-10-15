export interface SourceToSceneMappingEntry {
  id: string;
  family: string;
  rawSourcePaths: string[];
  canonicalPath: string;
  scenePath: string;
  currentResolvedPath: string | null;
  currentRuntimeConsumers: string[];
  authorityId: string;
  strategy: "direct" | "precedence" | "preserve" | "derive" | "unresolved";
  notes: string;
}

export const FIGMA_KEYS_MAPPED_TO_SCENE = new Set([
  "constraints", "layoutGrow", "layoutAlign", "layoutSizingHorizontal", "layoutSizingVertical",
  "primaryAxisSizingMode", "counterAxisSizingMode", "minWidth", "maxWidth", "minHeight", "maxHeight",
  "counterAxisSpacing", "relativeTransform", "transform", "rotation", "transformOrigin", "clipsContent",
  "isMask", "maskType", "shouldBreakMaskChain", "leadingTrim", "styledTextSegments",
  "characterStyleOverrides", "styleOverrideTable", "textStyleRanges", "filters", "imageFilters",
  "strokeAlign", "strokeWeight", "strokeTopWeight", "strokeRightWeight", "strokeBottomWeight",
  "strokeLeftWeight", "cornerSmoothing", "arcData", "polygonPointCount", "starInnerRadius",
  "blendMode", "componentId", "componentSetId", "mainComponentId", "variantProperties",
  "componentProperties", "boundVariables", "resolvedVariableModes", "styles", "styleId",
  "layoutPositioning", "nodeType", "itemSpacing", "layoutMode", "textStyleRangesDeferred",
  "unsupportedPaints", "rawFills",
]);

const map = (
  id: string,
  family: string,
  rawSourcePaths: string[],
  canonicalPath: string,
  scenePath: string,
  currentResolvedPath: string | null,
  currentRuntimeConsumers: string[],
  authorityId: string,
  strategy: SourceToSceneMappingEntry["strategy"],
  notes: string,
): SourceToSceneMappingEntry => ({ id, family, rawSourcePaths, canonicalPath, scenePath, currentResolvedPath, currentRuntimeConsumers, authorityId, strategy, notes });

export const SOURCE_TO_SCENE_MAPPING: SourceToSceneMappingEntry[] = [
  map("MAP-001", "identity", ["template.json.nodes.*.{id,name,type,parentId,children}"], "nodes.*", "nodes.*.identity", "nodes.*.{id,name,type,parentId,children,childOrder}", ["TemplatePackageRenderer"], "AUTH-031", "direct", "IDs and child order are never regenerated"),
  map("MAP-002", "layout", ["nodes.*.layout", "nodes.*.extensions.figma.{primaryAxisSizingMode,counterAxisSizingMode}"], "nodes.*.layout", "nodes.*.layout.autoLayout", "nodes.*.layout", ["createResolvedRenderTree", "TemplatePackageRenderer", "packageRenderUtils"], "AUTH-026", "precedence", "Canonical layout wins; raw roles remain provenance"),
  map("MAP-003", "sizing", ["nodes.*.sizing", "nodes.*.extensions.figma.{layoutSizingHorizontal,layoutSizingVertical,minWidth,maxWidth,minHeight,maxHeight,layoutGrow,layoutAlign}"], "nodes.*.sizing", "nodes.*.layout.sizing/rawParticipation", "nodes.*.layout.{horizontal,vertical,roles}", ["packageConstraintLayout", "packageRenderUtils", "TemplatePackageRenderer"], "AUTH-010", "precedence", "Raw participation remains a compatibility input"),
  map("MAP-004", "constraints", ["nodes.*.positioning.constraints", "nodes.*.extensions.figma.constraints"], "nodes.*.positioning", "nodes.*.layout.constraints", null, ["packageConstraintLayout", "packageRenderUtils"], "AUTH-018", "precedence", "Canonical positioning constraints win when present"),
  map("MAP-005", "bounds", ["nodes.*.bounds"], "nodes.*.bounds", "nodes.*.geometry.{absoluteBounds,relativeBounds}", "nodes.*.bounds", ["createResolvedRenderTree", "TemplatePackageRenderer", "previewViewport"], "AUTH-004", "direct", "Exporter snapshot remains available as fallback"),
  map("MAP-006", "transform", ["nodes.*.extensions.figma.{relativeTransform,transform,rotation,transformOrigin}"], "nodes.*.extensions.figma", "nodes.*.transform", "nodes.*.transform", ["packageTransformLayout", "packageMotion"], "AUTH-030", "preserve", "Scene records semantic candidates without CSS decomposition"),
  map("MAP-007", "text", ["nodes.*.text", "fontRequirements"], "nodes.*.text", "nodes.*.text", "nodes.*.text", ["createResolvedRenderTree", "packageTextLayout", "TemplatePackageRenderer"], "AUTH-001", "direct", "Browser measurement is declared as a future input, not performed"),
  map("MAP-008", "mixed-text", ["nodes.*.text.styleRanges", "nodes.*.extensions.figma.{styledTextSegments,characterStyleOverrides,styleOverrideTable,textStyleRanges}"], "nodes.*.text/style ranges", "nodes.*.text.styleRanges and provenance", null, ["createResolvedRenderTree", "TemplatePackageRenderer"], "AUTH-028", "preserve", "Full run semantics are not claimed"),
  map("MAP-009", "fonts", ["fontRequirements", "assets.*[type=font]"], "fontRequirements", "fonts", "nodes.*.text font status", ["prepareTemplatePackageFonts", "TemplatePackageRenderer", "pngExport"], "AUTH-007", "direct", "Browser readiness remains outside the scene"),
  map("MAP-010", "images", ["nodes.*.image", "nodes.*.appearance.fills[type=IMAGE]", "rendererHints.*[kind=image]", "assets.*"], "node/image/paint/asset/hint", "nodes.*.media", "nodes.*.image", ["createResolvedRenderTree", "TemplatePackageRenderer"], "AUTH-011", "precedence", "Node then paint then hint then asset then aspect-preserving fallback"),
  map("MAP-011", "image replacement", ["nodes.*.image.activePlacement", "editableFields.*.constraints.{replacementMode,scaleMode}"], "nodes.*.image source intent plus revisioned active placement", "nodes.*.media.{activePlacementState,placementRevision,replacementMode}", "nodes.*.image.{activePlacementState,placementRevision,replacementMode}", ["packageFieldBindings", "createResolvedRenderTree"], "AUTH-014", "precedence", "Imported intent remains immutable; revisioned replacement Fill/Fit owns active placement after upload"),
  map("MAP-012", "fills", ["nodes.*.appearance.fills", "nodes.*.extensions.figma.rawFills"], "nodes.*.appearance.fills", "nodes.*.appearance.fills", "nodes.*.{appearance.fills,primitiveAppearance.paints}", ["createResolvedRenderTree", "resolvePrimitiveAppearance", "TemplatePackageRenderer", "packageVectorRender"], "AUTH-019", "precedence", "Source-indexed gradients hydrate stops/transform; affected mirrored SOLID opacity aliases normalize with versioned provenance; all ordered paints survive"),
  map("MAP-013", "strokes", ["nodes.*.appearance.strokes", "nodes.*.appearance.{strokeWeight,strokeAlign}", "nodes.*.extensions.figma.stroke*"], "nodes.*.appearance", "nodes.*.appearance.strokes", "nodes.*.appearance.strokes", ["packageStrokeLayout", "TemplatePackageRenderer"], "AUTH-020", "preserve", "Scene avoids selecting a DOM border strategy"),
  map("MAP-014", "effects", ["nodes.*.appearance.effects"], "nodes.*.appearance.effects", "nodes.*.appearance.effects", "nodes.*.appearance.effects", ["createResolvedRenderTree", "TemplatePackageRenderer"], "AUTH-021", "direct", "Ordered source effects survive"),
  map("MAP-015", "blend", ["nodes.*.appearance.blendMode", "paints.*.blendMode", "nodes.*.extensions.figma.blendMode"], "appearance/paint metadata", "nodes.*.appearance.blendMode/fills/strokes", null, [], "AUTH-022", "preserve", "No runtime support is claimed"),
  map("MAP-016", "clipping", ["nodes.*.layout.clipContent", "nodes.*.appearance.clipContent", "nodes.*.extensions.figma.clipsContent"], "layout/appearance clip", "nodes.*.appearance.clipping.clipsContent", "nodes.*.appearance.clipContent", ["packageClipping", "TemplatePackageRenderer"], "AUTH-033", "precedence", "Canonical true wins; raw true remains compatibility evidence"),
  map("MAP-017", "masks", ["nodes.*.extensions.figma.{isMask,maskType,shouldBreakMaskChain}", "node order"], "extensions.figma", "nodes.*.appearance.clipping and relationships.maskRelationship", null, ["packageClipping"], "AUTH-016", "preserve", "Masked sibling ranges remain unresolved and explicit"),
  map("MAP-018", "vectors", ["nodes.*.vector", "nodes.*.shape", "assets.*[svg/vector]"], "node vector/shape", "nodes.*.geometry.vector", "nodes.*.vector", ["packageVectorRender", "TemplatePackageRenderer"], "AUTH-034", "direct", "Backend strategy is separate from semantic geometry"),
  map("MAP-019", "fields", ["editableFields"], "editableFields", "editableFields and nodes.*.relationships.editableFieldIds", "editableFieldTargets", ["packageFieldBindings", "fieldConstraints", "TemplatePackageFieldEditor"], "AUTH-031", "direct", "Field order and raw constraints are preserved"),
  map("MAP-020", "motion", ["motion.json", "TemplatePackageV1.motion"], "motion", "motion", "motionLinks", ["packageMotion", "TemplatePackageRenderer"], "AUTH-032", "preserve", "Scene does not evaluate time"),
  map("MAP-021", "components", ["node type", "extensions.figma.{componentId,componentSetId,mainComponentId,variantProperties,componentProperties}"], "node/extensions", "nodes.*.relationships.component", null, ["TemplatePackageRenderer generic hierarchy"], "AUTH-024", "preserve", "Flattened values render; live component semantics are unresolved"),
  map("MAP-022", "variables", ["extensions.figma.{boundVariables,resolvedVariableModes}", "tokens"], "extensions/tokens/literals", "nodes.*.relationships.variables", null, [], "AUTH-023", "preserve", "No evaluator or precedence beyond literal canonical values"),
  map("MAP-023", "styles", ["extensions.figma.{styles,styleId}", "literal text/paint/effects"], "extensions plus literals", "nodes.*.relationships.styles", null, [], "AUTH-023", "preserve", "Identity is distinct from selected literal values"),
  map("MAP-024", "diagnostics", ["diagnostics", "normalization/enrichment diagnostics"], "diagnostics", "sourceDiagnostics and node provenance", "warnings/fidelityDiagnostics", ["quality", "debug", "analysis"], "AUTH-035", "preserve", "Audiences remain separate"),
  map("MAP-025", "enrichment", ["rendererHints", "verification", "source.figmaMcp"], "validated enriched package", "rendererHints and provenance", "renderHints", ["createResolvedRenderTree", "TemplatePackageRenderer"], "AUTH-011", "preserve", "Optional and offline at render time"),
  map("MAP-026", "unsupported source", ["extensions.figma.*", "unknown asset extensions"], "preserved extensions", "provenance and unmappedProperties", null, ["diagnostics only"], "AUTH-022", "preserve", "Nothing is silently dropped"),
  map("MAP-027", "normalization provenance", ["extensions.figma.{layoutPositioning,nodeType,itemSpacing,layoutMode,textStyleRangesDeferred,unsupportedPaints}"], "normalized canonical fields plus preserved extension", "node semantic sections plus provenance.rawFigmaExtension", null, ["normalization diagnostics", "compatibility helpers"], "AUTH-027", "preserve", "Known exporter values are explicitly mapped even when current fixtures require only provenance preservation"),
];

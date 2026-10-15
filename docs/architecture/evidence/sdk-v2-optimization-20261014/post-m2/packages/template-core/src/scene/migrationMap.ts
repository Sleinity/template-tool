export interface SceneMigrationEntry {
  id: string;
  property: string;
  currentLocations: string[];
  currentPixelAuthority: string;
  sceneDestination: string;
  compatibilityPlan: string;
  retirementGate: string;
  milestone: 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

const migration = (id: string, property: string, currentLocations: string[], currentPixelAuthority: string, sceneDestination: string, compatibilityPlan: string, retirementGate: string, milestone: SceneMigrationEntry["milestone"]): SceneMigrationEntry => ({ id, property, currentLocations, currentPixelAuthority, sceneDestination, compatibilityPlan, retirementGate, milestone });

export const SCENE_MIGRATION_MAP: SceneMigrationEntry[] = [
  migration("MIG-001", "FIXED/HUG/FILL", ["normalizeTemplatePackageBundle", "createResolvedRenderTree.resolveLayout", "TemplatePackageRenderer.axisSize", "packageConstraintLayout", "browser flex"], "Renderer mode plus browser layout", "node.layout.sizing", "Observe only in M2; M3 settles measurements; M4 routes layout", "All fixture surfaces, edit/clear/resize/export, unchanged approved references", 4),
  migration("MIG-002", "Auto Layout direction/participation", ["createResolvedRenderTree.resolveLayout", "packageLayoutModel", "packageRenderUtils", "TemplatePackageRenderer.buildNodeStyle"], "Renderer layout role", "node.layout.autoLayout and positioning", "Keep helpers; compare semantic candidates", "Static/editor intent and browser geometry explainable from scene plus measurements", 4),
  migration("MIG-003", "Constraints", ["extensions.figma.constraints", "packageConstraintLayout", "packageRenderUtils warnings", "TemplatePackageRenderer"], "Editor constraint helper", "node.layout.constraints", "Retain raw constraints as provenance", "Constraint fixture matrix and settled results pass", 4),
  migration("MIG-004", "Text style and height", ["createResolvedRenderTree.resolveText", "packageTextLayout", "TemplatePackageRenderer", "useCapHeightTextHeight", "fieldConstraints.measureTextFieldFit"], "Mounted DOM plus cap-height hook", "node.text plus future measurement inputs", "No runtime routing in M2", "Exact/fallback/delayed fonts and line-box settlement pass", 4),
  migration("MIG-005", "Font readiness", ["font registry", "prepareTemplatePackageFonts", "renderer HUG hook", "field fit", "PNG capture"], "Export readiness and browser FontFaceSet", "graph.fonts plus future measurement record", "Preserve existing preparation path", "One versioned readiness result feeds every surface", 3),
  migration("MIG-006", "Image fit/crop/focal/replacement", ["packageFieldBindings", "createResolvedRenderTree.resolveImage", "TemplatePackageRenderer background branch", "TemplatePackageRenderer img branch"], "Resolved image with renderer fallback", "node.media", "Compare scene precedence with resolved output", "Source/edit/resize/export matrix for all modes", 5),
  migration("MIG-007", "Clip and masks", ["createResolvedRenderTree.resolveAppearance", "packageClipping", "TemplatePackageRenderer"], "Rectangular CSS clipping; no true mask", "node.appearance.clipping and relationships.maskRelationship", "Keep unsupported mask data explicit", "Authoritative mask fixtures and backend evidence", 5),
  migration("MIG-008", "Strokes", ["createResolvedRenderTree.resolveAppearance", "packageStrokeLayout", "TemplatePackageRenderer"], "Mode-specific renderer stroke model", "node.appearance.strokes", "Scene retains ordered semantics; no DOM strategy", "Alignment/dash/cap/join fixture matrix", 5),
  migration("MIG-009", "Gradients/multiple fills", ["canonical appearance", "createResolvedRenderTree.resolveFill", "renderer first-solid fallback"], "First visible solid or no output", "node.appearance.fills", "Preserve order, raw transforms, and unsupported status", "Gradient-heavy fixtures and reviewed backend", 5),
  migration("MIG-010", "Effects/blend/compositing", ["createResolvedRenderTree.resolveEffect", "TemplatePackageRenderer aggregation", "raw blend metadata"], "CSS effects; blend incomplete", "node.appearance.effects/blendMode", "Do not select Canvas in M2", "Effects/blend fixtures prove backend and group semantics", 6),
  migration("MIG-011", "Transforms and motion", ["packageTransformLayout", "createResolvedRenderTree.resolveTransform", "packageMotion", "TemplatePackageRenderer"], "Renderer CSS transform plus motion concatenation", "node.transform plus graph.motion", "Keep raw matrices and do not evaluate time", "Nested transform/edit/export fixture matrix", 4),
  migration("MIG-012", "Editable fields/defaults", ["packageFieldBindings", "fieldConstraints", "createResolvedRenderTree.collectEditableFieldTargets", "TemplatePackageFieldEditor"], "Mutated workingPackage", "graph.editableFields and node relationships", "Preserve current clear semantics and ambiguity", "Explicit imported-default decision and edit/clear tests", 3),
  migration("MIG-013", "Export readiness", ["validateTemplatePackage", "packageExportReadiness", "prepareTemplatePackageFonts", "waitForTemplatePackageAssets", "captureTemplatePackagePreview"], "Export sequence around separate DOM/tree", "future settled readiness", "Scene is observational only", "ADR 0010 acceptance evidence", 3),
  migration("MIG-014", "Components/instances/variables/styles", ["canonical node/extensions", "generic resolved node", "generic renderer"], "Flattened literals/hierarchy", "node.relationships", "Preserve without claiming evaluation", "Design-system fixture matrix", 7),
  migration("MIG-015", "Vector strategy", ["createResolvedRenderTree.resolveVector", "packageVectorRender", "TemplatePackageRenderer.renderVectorContent"], "Resolved asset or renderer helper", "node.geometry.vector and capabilities", "No backend routing in M2", "Vector-heavy fixtures and semantic/asset equivalence", 5),
  migration("MIG-016", "Diagnostics", ["resolved warnings", "collectTemplatePackageRenderWarnings", "featureCoverage", "packageLayoutDebug", "field constraints"], "Multiple audience-specific reports", "source/transformation diagnostics plus capability records", "Do not merge user/exporter/telemetry streams", "Each derived/fallback choice has provenance and correct audience", 3),
];

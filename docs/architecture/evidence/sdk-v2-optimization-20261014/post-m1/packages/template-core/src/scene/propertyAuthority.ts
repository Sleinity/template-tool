import type { SceneConfidence, ScenePropertyAuthority } from "./types";

export interface PropertyAuthorityEntry {
  id: string;
  property: string;
  rawSourceAuthority: string;
  canonicalAuthority: string;
  currentRuntimeAuthority: string;
  futureMeasurementAuthority: string | null;
  userOverridePrecedence: string;
  enrichmentPrecedence: string;
  exportAuthority: string;
  safeFallback: string;
  confidence: SceneConfidence;
  provenanceRequirement: string;
  ambiguity: string | null;
  sceneAuthority: ScenePropertyAuthority;
}

const entry = (
  id: string,
  property: string,
  canonicalAuthority: string,
  currentRuntimeAuthority: string,
  safeFallback: string,
  confidence: SceneConfidence,
  ambiguity: string | null = null,
  futureMeasurementAuthority: string | null = null,
): PropertyAuthorityEntry => ({
  id,
  property,
  rawSourceAuthority: "Exact ZIP source plus preserved normalization provenance",
  canonicalAuthority,
  currentRuntimeAuthority,
  futureMeasurementAuthority,
  userOverridePrecedence: "A validated mutation in workingPackage wins for its bound editable property until cleared",
  enrichmentPrecedence: "Optional enrichment may fill an absent semantic value but must not replace explicit canonical or user data",
  exportAuthority: "Current workingPackage plus hidden editor-mode DOM; scene graph remains observational",
  safeFallback,
  confidence,
  provenanceRequirement: "Retain raw, normalized, enrichment, override, selected authority, conflict, and fallback evidence",
  ambiguity,
  sceneAuthority: "canonical-package",
});

export const PROPERTY_AUTHORITY_MATRIX: PropertyAuthorityEntry[] = [
  entry("AUTH-001", "text.characters", "TemplateNode.text characters in workingPackage", "ResolvedRenderText with canonical-node fallback", "Imported canonical characters", "high", "Editable-field default may disagree with imported node value"),
  entry("AUTH-002", "text.imported-default", "basePackage node value and field default are both preserved", "restore/clear binding logic", "basePackage node value", "medium", "Text clear currently restores field.defaultValue"),
  entry("AUTH-003", "text.user-override", "workingPackage node value", "Recreated resolved tree and mounted DOM", "Imported/default value", "high"),
  entry("AUTH-004", "text.box-width", "Node horizontal sizing and bounds", "Resolved layout, constraints, and browser layout", "Exported relative bounds", "medium", "Static and editor modes differ", "Settled browser width in Milestone 3"),
  entry("AUTH-005", "text.hug-height", "Vertical HUG intent and text semantics", "Cap-height hook and browser Range/canvas metrics", "Browser content height then exported snapshot", "medium", "Measured height is DOM-local", "Versioned measurement input in Milestone 3"),
  entry("AUTH-006", "text.fixed-height", "Vertical FIXED sizing", "Renderer fixed CSS height", "Exported height", "high"),
  entry("AUTH-007", "font.metrics", "Font requirement and linked asset", "Loaded browser face or recorded fallback", "Approved fallback or export block", "medium", "Delayed exact-face activation remains unverified", "Font readiness and measured metrics in Milestone 3"),
  entry("AUTH-008", "layout.container-width", "Canonical sizing/bounds", "Resolved roles plus constraints/browser layout", "Exported bounds", "medium", "Raw Figma sizing can supplement canonical intent", "Settled browser width in Milestone 3"),
  entry("AUTH-009", "layout.container-height", "Canonical sizing/bounds", "Resolved roles plus HUG/browser layout", "Exported bounds", "medium", "Descendant invalidation is implicit", "Settled browser height in Milestone 3"),
  entry("AUTH-010", "layout.fill-remaining-space", "FILL sizing intent", "Browser flex and raw grow/stretch compatibility", "Snapshot bounds", "medium", "Canonical and raw Figma participation are duplicated", "Settled allocation in Milestone 3"),
  entry("AUTH-011", "image.fit-mode", "Node image, image paint, field replacement policy, hint, asset", "Resolved image model then renderer fallback branch", "Aspect-preserving FILL", "high", "Precedence is formalized but current helpers remain until migration"),
  entry("AUTH-012", "image.crop", "Node imageTransform/objectPosition", "Resolved crop/focal/zoom and DOM background/img placement", "Aspect-preserving cover", "medium", "Full affine sampler fidelity is incomplete"),
  entry("AUTH-013", "image.focal-position", "Explicit objectPosition then transform-derived focal point", "Resolved object position", "Centered 0.5/0.5", "medium"),
  entry("AUTH-014", "image.replacement-mode", "Editable field constraints", "Binding mutation plus image resolver", "preserve-original-crop", "high", "Browser upload path is not fully verified"),
  entry("AUTH-015", "image.intrinsic-size", "Canonical asset width/height", "Resolved asset plus decoded browser image", "Unknown with diagnostic", "medium", "Decoded dimensions are not published", "Decoded asset measurement in Milestone 3"),
  entry("AUTH-016", "mask.bounds", "Raw mask node and sibling order", "Rectangular clipping compatibility only", "Preserve mask metadata without inventing true masking", "low", "No canonical masked-sibling range exists"),
  entry("AUTH-017", "canvas.root-bounds", "Package canvas and root node bounds", "Canvas owns renderer/export dimensions", "Package canvas", "high", "Mismatch diagnostic policy remains incomplete"),
  entry("AUTH-018", "layout.constraints", "Canonical positioning constraints plus extensions.figma.constraints", "Editor constraint helper", "Snapshot-and-clip", "medium", "Static mode does not use the live path", "Settled constraint result in Milestone 3"),
  entry("AUTH-019", "appearance.gradients", "Canonical ordered paint array", "No gradient renderer", "Preserve and diagnose", "high", "Backend support deferred"),
  entry("AUTH-020", "appearance.strokes", "Canonical strokes plus alignment metadata", "Resolved editor model and mode-specific renderer model", "First solid stroke with diagnostic", "medium", "Stroke strategy is resolved twice"),
  entry("AUTH-021", "appearance.effects", "Canonical ordered effect array", "Resolved CSS-compatible effects and renderer aggregation", "Preserve unsupported effect", "medium", "Compositing fidelity incomplete"),
  entry("AUTH-022", "appearance.blend-mode", "Canonical layer/paint blend metadata", "No explicit complete runtime model", "NORMAL while preserving source", "low", "Layer, paint, and group blend semantics are incomplete"),
  entry("AUTH-023", "design.variables", "Preserved source token/extension data and resolved literals", "No live evaluator", "Preserve source and literal", "low", "Collections, aliases, and modes unresolved"),
  entry("AUTH-024", "design.component-overrides", "Preserved instance/component metadata and flattened values", "Generic hierarchy renderer", "Render flattened canonical children", "low", "Override propagation unresolved"),
  entry("AUTH-025", "export.geometry", "Current workingPackage", "Hidden editor DOM at package canvas dimensions", "Block on readiness error", "medium", "Readiness and capture recreate separate resolved objects", "One settled graph under Proposed ADR 0010"),
  entry("AUTH-026", "layout.auto-layout-direction", "Canonical layout.mode", "Resolved direction and renderer branch", "NONE/block", "high"),
  entry("AUTH-027", "layout.auto-layout-participation", "Canonical positioning/sizing with raw Figma compatibility", "Mode-specific layout-role and constraint helpers", "Snapshot bounds", "medium", "Multiple helpers infer participation"),
  entry("AUTH-028", "text.line-wrapping", "Characters, width, white-space intent, font", "Browser line breaking", "pre-wrap within canonical box", "medium", "Field diagnostics count lines separately", "Published line boxes in Milestone 3"),
  entry("AUTH-029", "text.overflow", "Text auto-resize, clipping, and field behavior", "Renderer CSS plus field policy", "Preserve content and clip only when explicit", "medium", "No single general truncation contract"),
  entry("AUTH-030", "transform.matrix", "Raw relativeTransform/transform plus canonical bounds", "Transform helper and motion concatenation", "Identity with preserved matrix and warning", "medium", "Skew and inconsistent local geometry use fallbacks"),
  entry("AUTH-031", "field.target", "Canonical editableFields registry", "Binding support checks and resolved field targets", "Preserve field and diagnose missing target", "high"),
  entry("AUTH-032", "motion.base-transform", "Canonical node transform plus motion raw/linking", "Motion evaluator and renderer time", "Canonical static transform", "medium", "Animated export is unsupported"),
  entry("AUTH-033", "appearance.clip-content", "Canonical layout/appearance flags", "Clipping helper can use raw editor fallback and live containment", "Canonical flag", "medium", "Live containment is a renderer-only behavior"),
  entry("AUTH-034", "geometry.vector", "Canonical vector payload/asset", "Resolved vector strategy then renderer helper fallback", "Preserve vector and use explicit asset when safe", "medium", "Semantic and asset branches duplicate fit logic"),
  entry("AUTH-035", "export.readiness", "Validation, assets, fields, fonts", "Export readiness sequence and DOM asset decode", "Block with audience-specific diagnostic", "medium", "No settled readiness token", "Settled readiness in Milestone 3"),
];

export function propertyAuthorityById(id: string): PropertyAuthorityEntry | undefined {
  return PROPERTY_AUTHORITY_MATRIX.find((item) => item.id === id);
}

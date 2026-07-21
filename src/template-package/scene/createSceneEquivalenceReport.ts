import { createResolvedRenderTree } from "../resolved/createResolvedRenderTree";
import type { TemplatePackageV1 } from "../types";
import { createCanonicalSceneGraph } from "./createCanonicalSceneGraph";
import type { CanonicalSceneGraphV1, SceneEquivalenceCategory, SceneEquivalenceItem, SceneEquivalenceReport } from "./types";

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createSceneEquivalenceReport(
  packageValue: TemplatePackageV1,
  options: { fixtureId?: string | null; fixtureZipSha256?: string | null; scene?: CanonicalSceneGraphV1 } = {},
): SceneEquivalenceReport {
  const start = now();
  const sceneStart = now();
  const scene = options.scene ?? createCanonicalSceneGraph(packageValue).graph;
  const sceneTransformMs = now() - sceneStart;
  const resolved = createResolvedRenderTree(packageValue);
  const items: SceneEquivalenceItem[] = [];
  const push = (category: SceneEquivalenceCategory, property: string, message: string, nodeId?: string, packagePath?: string, scenePath?: string, resolvedPath?: string): void => {
    items.push({ category, property, message, nodeId, packagePath, scenePath, resolvedPath });
  };

  if (same(scene.nodeOrder, resolved.nodeOrder)) push("mapped", "nodeOrder", "Package source order is preserved in both projections.");
  else push("conflicting", "nodeOrder", "Scene and resolved node order differ.");
  for (const nodeId of scene.nodeOrder) {
    const source = packageValue.nodes[nodeId];
    const semantic = scene.nodes[nodeId];
    const render = resolved.nodes[nodeId];
    if (!source || !semantic) {
      push("missing", "node", "Package or scene node is absent.", nodeId);
      continue;
    }
    if (!render) {
      push("scene-not-resolved", "node", "Scene preserves a node absent from ResolvedRenderTreeV1.", nodeId);
      continue;
    }
    for (const [propertyName, packageValueAtPath, sceneValue, resolvedValue] of [
      ["identity.type", source.type, semantic.identity.type, render.type],
      ["identity.parentId", source.parentId, semantic.identity.parentId, render.parentId],
      ["identity.children", source.children, semantic.identity.children, render.children],
      ["geometry.relativeBounds", source.bounds.relative, semantic.geometry.relativeBounds.value, render.bounds.relative],
      ["geometry.absoluteBounds", source.bounds.absolute, semantic.geometry.absoluteBounds.value, render.bounds.absolute],
      ["layout.mode", source.layout.mode, semantic.layout.autoLayout.mode.value, render.layout.mode],
      ["layout.horizontalSizing", source.sizing.horizontal.mode, semantic.layout.sizing.horizontal.mode.value, render.layout.horizontal.mode],
      ["layout.verticalSizing", source.sizing.vertical.mode, semantic.layout.sizing.vertical.mode.value, render.layout.vertical.mode],
    ] as Array<[string, unknown, unknown, unknown]>) {
      const category: SceneEquivalenceCategory = same(packageValueAtPath, sceneValue) && same(sceneValue, resolvedValue) ? "mapped" : same(packageValueAtPath, sceneValue) ? "inferred" : "conflicting";
      push(category, propertyName, category === "mapped" ? "Package, scene, and resolved values agree." : "Projection values require compatibility or derivation review.", nodeId);
    }
    if (semantic.text) {
      if (render.text && semantic.text.characters.value === render.text.characters) push("mapped", "text.characters", "Text characters agree.", nodeId);
      else push("conflicting", "text.characters", "Text characters do not agree across projections.", nodeId);
      if (semantic.text.browserMeasurementRequired) push("renderer-only", "text.measurement", "Final HUG text geometry requires browser measurement and is intentionally absent from the scene.", nodeId);
      if (semantic.text.styleRanges.length && !render.text) push("scene-not-resolved", "text.styleRanges", "Style runs are preserved without a resolved text projection.", nodeId);
    }
    if (semantic.media) {
      if (render.image?.assetId === semantic.media.assetId.value) push("mapped", "image.assetId", "Scene and resolved asset IDs agree.", nodeId);
      else push("conflicting", "image.assetId", "Scene and resolved image asset selection differ.", nodeId);
      if (semantic.media.scaleMode.value === render.image?.scaleMode) push("mapped", "image.scaleMode", "Scene and resolved image modes agree.", nodeId);
      else push("inferred", "image.scaleMode", "Resolved mode applies current replacement/compatibility inference.", nodeId);
    }
    if (semantic.appearance.fills.some((paint) => paint.type.startsWith("GRADIENT"))) {
      const routedLinear = render.appearance.fills.some((paint) => paint.kind === "linear-gradient") &&
        render.primitiveAppearance.ownership === "primitive-authoritative";
      push(
        routedLinear ? "mapped" : "unsupported-preserved",
        "appearance.gradients",
        routedLinear
          ? "Canonical linear-gradient semantics and resolved primitive geometry share source-indexed authority."
          : "Gradient semantics are preserved with explicit compatibility or unsupported ownership.",
        nodeId,
      );
    }
    if (semantic.relationships.maskRelationship.isMask || semantic.relationships.maskRelationship.maskType) push("migration-blocker", "mask.range", "True mask and masked-sibling range semantics are not represented by ResolvedRenderTreeV1.", nodeId);
    if (semantic.relationships.component.componentId || source.type === "COMPONENT" || source.type === "INSTANCE") push("scene-not-resolved", "component.relationship", "Component/instance identity is preserved but not evaluated in the resolved tree.", nodeId);
    for (const rawKey of semantic.provenance.mappedRawFigmaKeys) push("raw-figma-dependency", rawKey, "Current semantics still depend on preserved extensions.figma data.", nodeId, `nodes.${nodeId}.extensions.figma.${rawKey}`, `nodes.${nodeId}.provenance.rawFigmaExtension.${rawKey}`);
    for (const rawKey of semantic.provenance.unmappedRawFigmaKeys) push("provenance-gap", rawKey, "Raw value is preserved but has no accepted semantic mapping.", nodeId);
    for (const diagnostic of render.fidelityDiagnostics) push("diagnostics-only", diagnostic.code, diagnostic.message, nodeId);
  }
  for (const warning of resolved.warnings) push("diagnostics-only", warning.code, warning.message, warning.nodeId);
  push("renderer-only", "browser.layout", "Final DOM flex/constraint geometry is not derivable without browser measurements.");
  push("renderer-only", "font.readiness", "FontFaceSet activation and fallback selection are runtime inputs.");
  push("renderer-only", "asset.decode", "Decoded intrinsic image readiness is a runtime input.");
  push("renderer-only", "export.capture", "PNG pixels come from a separately mounted editor DOM; scene graph is not used.");
  const categories: SceneEquivalenceCategory[] = ["mapped", "inferred", "conflicting", "missing", "raw-figma-dependency", "renderer-only", "diagnostics-only", "scene-not-resolved", "resolved-not-derivable", "unsupported-preserved", "provenance-gap", "migration-blocker"];
  const summary = Object.fromEntries(categories.map((category) => [category, items.filter((item) => item.category === category).length])) as Record<SceneEquivalenceCategory, number>;
  const migrationBlockers = [...new Set(items.filter((item) => item.category === "migration-blocker" || item.category === "resolved-not-derivable").map((item) => item.property))];
  return {
    schemaVersion: "scene-equivalence-report-v1",
    fixtureId: options.fixtureId ?? null,
    fixtureZipSha256: options.fixtureZipSha256 ?? null,
    packageId: packageValue.packageId,
    sceneVersion: scene.schemaVersion,
    resolvedVersion: resolved.schemaVersion,
    pixelEquivalenceClaimed: false,
    items,
    summary,
    migrationBlockers,
    timings: { sceneTransformMs, equivalenceMs: now() - start },
    sizes: { sceneBytes: bytes(scene), resolvedBytes: bytes(resolved), packageBytes: bytes(packageValue) },
  };
}

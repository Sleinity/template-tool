import type { CanonicalSceneGraphV1, CanonicalSceneNodeV1 } from "../../scene";
import { createAppearanceBackendRequirements } from "./backendRequirements";
import { assessAppearanceSourceData } from "./sourceDataSufficiency";
import type { AppearanceContractProjectionV1, AppearanceContractSourceV1 } from "./types";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function source(node: CanonicalSceneNodeV1, paths: string[], confidence: AppearanceContractSourceV1["confidence"] = "high"): AppearanceContractSourceV1 {
  return {
    nodeId: node.identity.id,
    sourcePaths: paths,
    rawFigmaKeys: Object.keys(node.provenance.rawFigmaExtension ?? {}).sort(),
    confidence,
  };
}

function maskAncestors(scene: CanonicalSceneGraphV1, node: CanonicalSceneNodeV1): string[] {
  const result: string[] = [];
  let parentId = node.identity.parentId;
  while (parentId) {
    const parent = scene.nodes[parentId];
    if (!parent) break;
    if (parent.relationships.maskRelationship.isMask) result.unshift(parentId);
    parentId = parent.identity.parentId;
  }
  return result;
}

export function createAppearanceContractProjection(scene: CanonicalSceneGraphV1): AppearanceContractProjectionV1 {
  const sourceSufficiency = assessAppearanceSourceData(scene);
  const nodes = scene.nodeOrder.map((id) => scene.nodes[id]);
  return {
    schemaVersion: "appearance-contract-projection-v1",
    sourceSceneVersion: scene.schemaVersion,
    packageId: scene.sourcePackage.packageId,
    rootNodeId: scene.rootNodeId,
    nodeOrder: [...scene.nodeOrder],
    media: nodes.filter((node) => node.media).map((node) => ({
      schemaVersion: "media-placement-v1",
      ...source(node, [`${node.provenance.canonicalPath}.image`, `${node.provenance.canonicalPath}.appearance.fills`], node.media!.assetId.confidence),
      assetId: node.media!.assetId.value,
      slotBounds: clone(node.geometry.relativeBounds.value),
      intrinsicSize: clone(node.media!.intrinsicSize),
      fitMode: node.media!.scaleMode.value,
      imageTransform: clone(node.media!.imageTransform.value),
      focalPosition: clone(node.media!.focalPosition.value),
      activePlacementState: node.media!.activePlacementState.value,
      placementRevision: node.media!.placementRevision.value,
      replacementMode: node.media!.replacementMode.value,
      preserveAspectRatio: node.media!.preserveAspectRatio,
      adjustments: clone(node.media!.adjustments),
    })),
    geometry: nodes.filter((node) => !["FRAME", "GROUP", "TEXT"].includes(node.identity.type)).map((node) => ({
      schemaVersion: "geometry-shape-v1",
      ...source(node, [`${node.provenance.canonicalPath}.bounds`, `${node.provenance.canonicalPath}.shape`, `${node.provenance.canonicalPath}.vector`]),
      nodeType: node.identity.type,
      bounds: clone(node.geometry.relativeBounds.value),
      shapeKind: node.geometry.shape.kind,
      vector: clone(node.geometry.vector),
      cornerRadius: node.geometry.shape.cornerRadius,
      cornerRadii: clone(node.geometry.shape.cornerRadii),
      cornerSmoothing: clone(node.geometry.shape.cornerSmoothing),
      arcData: clone(node.geometry.shape.arcData),
      polygonPointCount: clone(node.geometry.shape.polygonPointCount),
      starInnerRadius: clone(node.geometry.shape.starInnerRadius),
    })),
    paints: nodes.filter((node) => node.appearance.fills.length).map((node) => ({
      schemaVersion: "paint-stack-v1",
      ...source(node, [`${node.provenance.canonicalPath}.appearance.fills`]),
      paints: clone(node.appearance.fills),
      orderIsAuthoritative: true,
    })),
    strokes: nodes.filter((node) => node.appearance.strokes.length).map((node) => ({
      schemaVersion: "stroke-stack-v1",
      ...source(node, [`${node.provenance.canonicalPath}.appearance.strokes`], "medium"),
      strokes: clone(node.appearance.strokes),
      defaultWeight: node.appearance.strokeWeight,
      defaultAlignment: node.appearance.strokeAlign,
      rawDashCapJoinEvidence: clone(node.provenance.rawFigmaExtension ? {
        strokeDashes: node.provenance.rawFigmaExtension.strokeDashes ?? null,
        strokeCap: node.provenance.rawFigmaExtension.strokeCap ?? null,
        strokeJoin: node.provenance.rawFigmaExtension.strokeJoin ?? null,
      } : null),
      orderIsAuthoritative: true,
    })),
    masks: nodes.filter((node) => node.relationships.maskRelationship.isMask || node.appearance.clipping.clipsContent.value).map((node) => ({
      schemaVersion: "mask-graph-v1",
      ...source(node, [`${node.provenance.canonicalPath}.appearance.clipContent`, `${node.provenance.canonicalPath}.extensions.figma.isMask`], node.relationships.maskRelationship.isMask ? "unresolved" : "high"),
      parentId: node.identity.parentId,
      childOrder: [...node.identity.childOrder],
      isMask: node.relationships.maskRelationship.isMask,
      maskType: node.relationships.maskRelationship.maskType,
      shouldBreakMaskChain: node.relationships.maskRelationship.shouldBreakMaskChain,
      maskedSiblingRange: node.relationships.maskRelationship.maskedSiblingRange,
      clipContent: node.appearance.clipping.clipsContent.value,
      nestedMaskAncestorIds: maskAncestors(scene, node),
    })),
    effects: nodes.filter((node) => node.appearance.effects.length).map((node) => ({
      schemaVersion: "effect-stack-v1",
      ...source(node, [`${node.provenance.canonicalPath}.appearance.effects`]),
      effects: clone(node.appearance.effects),
      orderIsAuthoritative: true,
    })),
    compositing: nodes.filter((node) => node.appearance.opacity.value !== 1 || Boolean(node.appearance.blendMode.value)).map((node) => {
      const blendMode = node.appearance.blendMode.value;
      return {
        schemaVersion: "compositing-group-v1",
        ...source(node, [`${node.provenance.canonicalPath}.appearance.opacity`, `${node.provenance.canonicalPath}.appearance.blendMode`], blendMode ? "medium" : "high"),
        opacity: node.appearance.opacity.value,
        blendMode,
        visible: node.appearance.visible.value,
        childOrder: [...node.identity.childOrder],
        isolation: blendMode === "PASS_THROUGH" ? "pass-through" : blendMode ? "isolated" : "unresolved",
        requiresOffscreenCompositing: blendMode && blendMode !== "NORMAL" && blendMode !== "PASS_THROUGH" ? "unresolved" : false,
      };
    }),
    sourceSufficiency,
    backendRequirements: createAppearanceBackendRequirements(sourceSufficiency),
    compatibility: { runtimeUse: "disabled-observational", rendererAuthority: "unchanged", pixelEquivalenceClaimed: false },
  };
}

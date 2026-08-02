import type { CanonicalSceneGraphV1 } from "../../scene";
import type { AppearanceSourceSufficiencyRecordV1 } from "./types";

const families: AppearanceSourceSufficiencyRecordV1["family"][] = [
  "media", "geometry", "paints", "strokes", "masks", "effects", "compositing", "design-systems",
];

export function assessAppearanceSourceData(scene: CanonicalSceneGraphV1): AppearanceSourceSufficiencyRecordV1[] {
  return families.map((family) => {
    const nodes = scene.nodeOrder.map((id) => scene.nodes[id]);
    const evidence = nodes.filter((node) => {
      if (family === "media") return Boolean(node.media);
      if (family === "geometry") return node.identity.type !== "FRAME" && node.identity.type !== "GROUP" && node.identity.type !== "TEXT";
      if (family === "paints") return node.appearance.fills.length > 0;
      if (family === "strokes") return node.appearance.strokes.length > 0;
      if (family === "masks") return node.relationships.maskRelationship.isMask || node.appearance.clipping.clipsContent.value;
      if (family === "effects") return node.appearance.effects.length > 0;
      if (family === "compositing") return node.appearance.opacity.value !== 1 || Boolean(node.appearance.blendMode.value);
      return Boolean(node.relationships.component.componentId || node.relationships.component.mainComponentId || node.relationships.variables || node.relationships.styles);
    });
    const rawKeys = [...new Set(evidence.flatMap((node) => Object.keys(node.provenance.rawFigmaExtension ?? {})))].sort();
    const canonicalPaths = evidence.map((node) => node.provenance.canonicalPath).sort();
    const gaps: string[] = [];
    let level: AppearanceSourceSufficiencyRecordV1["level"] = evidence.length ? "sufficient" : "absent";
    if (family === "masks" && evidence.some((node) => node.relationships.maskRelationship.isMask)) {
      level = "partial";
      gaps.push("Masked sibling ranges are unresolved in CanonicalSceneGraphV1.");
    }
    if (family === "strokes" && evidence.length && !rawKeys.some((key) => /dash|cap|join/i.test(key))) {
      level = "partial";
      gaps.push("Dashes, caps, and joins require preserved raw exporter evidence.");
    }
    if (family === "design-systems" && evidence.length) {
      level = "preserved-only";
      gaps.push("Components, variables, and styles are evidence records, not expanded render semantics.");
    }
    if (!evidence.length) gaps.push(`No ${family} evidence reaches this scene projection.`);
    return {
      family,
      level,
      evidenceNodeIds: evidence.map((node) => node.identity.id),
      canonicalPaths,
      rawExtensionKeys: rawKeys,
      gaps,
    };
  });
}

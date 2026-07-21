import { collectTemplatePackageRenderWarnings } from "../render";
import type {
  PackageAsset,
  PackagePaint,
  TemplateNode,
  TemplatePackageV1,
} from "../types";
import type {
  AnalysisNodeReference,
  FeatureSupportStatus,
  RendererFeatureCoverageItem,
  RendererFeatureCoverageReport,
} from "./types";

type NodePredicate = (node: TemplateNode) => boolean;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function figma(node: TemplateNode | undefined): Record<string, unknown> {
  if (!node) return {};
  return isRecord(node.extensions?.figma) ? node.extensions.figma : {};
}

function positioning(node: TemplateNode): string {
  return typeof node.positioning === "string"
    ? node.positioning
    : node.positioning.mode;
}

function constraints(node: TemplateNode): Record<string, unknown> {
  const value = figma(node).constraints;
  return isRecord(value) ? value : {};
}

function paints(node: TemplateNode): PackagePaint[] {
  return [
    ...node.appearance.fills,
    ...node.appearance.strokes.map((stroke) =>
      "paint" in stroke ? stroke.paint : stroke,
    ),
  ];
}

function effectTypes(node: TemplateNode): string[] {
  return node.appearance.effects.map((effect) => effect.type);
}

function nodeRefs(nodes: TemplateNode[]): AnalysisNodeReference[] {
  return nodes.map((node) => ({ id: node.id, name: node.name }));
}

function assetBytes(asset: PackageAsset): number {
  const value = asset.dataUrl ?? asset.data ?? asset.svgString ?? "";
  const comma = value.indexOf(",");
  const payload = comma >= 0 ? value.slice(comma + 1) : value;
  return Math.round(payload.length * 0.75);
}

function assetReferences(node: TemplateNode): string[] {
  const ids = [
    node.image?.assetId,
    node.vector?.assetId,
    ...node.appearance.fills.map((paint) =>
      paint.type === "IMAGE" ? paint.assetId : undefined,
    ),
  ];
  return ids.filter((id): id is string => Boolean(id));
}

function rawConstraint(node: TemplateNode, axis: string): string | null {
  const value = constraints(node)[axis];
  return typeof value === "string" ? value.toUpperCase() : null;
}

function transformBasis(node: TemplateNode): [number, number, number, number] | null {
  const transform = figma(node).relativeTransform;
  if (!Array.isArray(transform) || transform.length < 2) return null;
  const first = transform[0];
  const second = transform[1];
  if (!Array.isArray(first) || !Array.isArray(second)) return null;
  const [a, c] = first;
  const [b, d] = second;
  return [a, b, c, d].every((value) => typeof value === "number")
    ? [a as number, b as number, c as number, d as number]
    : null;
}

function hasScale(node: TemplateNode): boolean {
  const basis = transformBasis(node);
  if (!basis) return false;
  const [a, b, c, d] = basis;
  return (
    Math.abs(Math.hypot(a, b) - 1) > 0.0001 ||
    Math.abs(Math.hypot(c, d) - 1) > 0.0001
  );
}

function hasReflection(node: TemplateNode): boolean {
  const basis = transformBasis(node);
  return basis ? basis[0] * basis[3] - basis[1] * basis[2] < 0 : false;
}

function normalizeConstraint(raw: string | null, axis: "horizontal" | "vertical") {
  if (!raw) return null;
  const aliases =
    axis === "horizontal"
      ? {
          MIN: "LEFT",
          LEFT: "LEFT",
          MAX: "RIGHT",
          RIGHT: "RIGHT",
          STRETCH: "LEFT_RIGHT",
          LEFT_RIGHT: "LEFT_RIGHT",
          LEFT_AND_RIGHT: "LEFT_RIGHT",
          CENTER: "CENTER",
          SCALE: "SCALE",
        }
      : {
          MIN: "TOP",
          TOP: "TOP",
          MAX: "BOTTOM",
          BOTTOM: "BOTTOM",
          STRETCH: "TOP_BOTTOM",
          TOP_BOTTOM: "TOP_BOTTOM",
          TOP_AND_BOTTOM: "TOP_BOTTOM",
          CENTER: "CENTER",
          SCALE: "SCALE",
        };
  return aliases[raw as keyof typeof aliases] ?? null;
}

function packagedConstraint(
  node: TemplateNode,
  axis: "horizontal" | "vertical",
): string | null {
  if (typeof node.positioning === "string") return null;
  const value = node.positioning.constraints?.[axis];
  return typeof value === "string" ? value.toUpperCase() : null;
}

export function analyzeRendererFeatureCoverage(
  packageValue: TemplatePackageV1,
): RendererFeatureCoverageReport {
  const nodes = Object.values(packageValue.nodes);
  const rendererWarnings = collectTemplatePackageRenderWarnings(
    packageValue,
    "editor",
  );
  const packageDiagnostics = packageValue.diagnostics ?? [];
  const items: RendererFeatureCoverageItem[] = [];
  const warningCodes = new Set(rendererWarnings.map((warning) => warning.code));
  const strokeSupport: FeatureSupportStatus = [
    "unsupported-stroke-paint",
    "multiple-strokes-approximated",
    "unsupported-stroke-alignment",
  ].some((code) => warningCodes.has(code))
    ? "partial"
    : "supported";
  const nestedTransformSupport: FeatureSupportStatus = [
    "unsupported-transform-matrix",
    "transformed-bounds-approximation",
    "transformed-relative-bounds-inconsistent",
    "transformed-constraint-snapshot-fallback",
  ].some((code) => warningCodes.has(code))
    ? "partial"
    : "supported";

  const add = (
    key: string,
    category: string,
    name: string,
    status: FeatureSupportStatus,
    predicate: NodePredicate,
    explanation: string,
  ) => {
    const affected = nodes.filter(predicate);
    if (affected.length === 0) return;
    const ids = new Set(affected.map((node) => node.id));
    const relatedDiagnostics = [
      ...rendererWarnings
        .filter((warning) => warning.nodeId && ids.has(warning.nodeId))
        .map((warning) => warning.code),
      ...packageDiagnostics
        .filter((diagnostic) => diagnostic.nodeId && ids.has(diagnostic.nodeId))
        .map((diagnostic) => diagnostic.code),
    ].filter((code, index, all) => all.indexOf(code) === index);
    items.push({
      key,
      category,
      name,
      status,
      affectedNodes: nodeRefs(affected),
      explanation,
      relatedDiagnostics,
    });
  };

  add("auto-layout-vertical", "Layout", "Vertical Auto Layout", "supported",
    (node) => node.layout.mode === "VERTICAL",
    "Rendered with column flex layout, padding, gaps, alignment, and child order.");
  add("auto-layout-horizontal", "Layout", "Horizontal Auto Layout", "supported",
    (node) => node.layout.mode === "HORIZONTAL",
    "Rendered with row flex layout, padding, gaps, alignment, and child order.");
  add("nested-auto-layout", "Layout", "Nested Auto Layout", "supported",
    (node) => node.layout.mode !== "NONE" && Boolean(node.parentId && packageValue.nodes[node.parentId]?.layout.mode !== "NONE"),
    "Nested Auto Layout containers participate in their parent layout and lay out their own children independently.");
  add("none-child-in-auto-layout", "Layout", "layout.mode NONE child in Auto Layout", "supported",
    (node) => node.layout.mode === "NONE" && Boolean(node.parentId && packageValue.nodes[node.parentId]?.layout.mode !== "NONE") && positioning(node) === "FLOW",
    "The parent controls FLOW participation while the child keeps snapshot positioning for its own children.");
  (["HUG", "FILL", "FIXED"] as const).forEach((mode) =>
    add(`sizing-${mode.toLowerCase()}`, "Layout", `${mode} sizing`, "supported",
      (node) => node.sizing.horizontal.mode === mode || node.sizing.vertical.mode === mode,
      `${mode} sizing is modeled in editor layout and snapshot bounds remain authoritative in static mode.`));
  add("stretch-constraints", "Layout", "STRETCH constraints", "supported",
    (node) => rawConstraint(node, "horizontal") === "STRETCH" || rawConstraint(node, "vertical") === "STRETCH",
    "STRETCH is normalized to opposite-edge constraints and resolved against live parent size.");
  add("scale-constraints", "Layout", "SCALE constraints", "partial",
    (node) => rawConstraint(node, "horizontal") === "SCALE" || rawConstraint(node, "vertical") === "SCALE",
    "Fixed snapshot geometry scales proportionally; HUG/FILL and transformed combinations remain ambiguous.");
  add("min-max-dimensions", "Layout", "Min/max dimensions", "supported",
    (node) => [node.sizing.horizontal.min, node.sizing.horizontal.max, node.sizing.vertical.min, node.sizing.vertical.max, figma(node).minWidth, figma(node).maxWidth, figma(node).minHeight, figma(node).maxHeight].some((value) => typeof value === "number"),
    "Normalized limits are applied in editor mode with raw Figma metadata as a safe fallback.");
  add("wrapping-auto-layout", "Layout", "Wrapping Auto Layout", "partial",
    (node) => node.layout.wrap,
    "CSS flex wrapping, rowGap, and columnGap are supported; Figma line distribution edge cases may differ.");
  add("layout-padding", "Layout", "Auto Layout padding", "supported",
    (node) => Object.values(node.layout.padding).some((value) => value !== 0),
    "Per-edge padding is applied to Auto Layout containers.");
  add("layout-gap", "Layout", "Gap / rowGap / columnGap", "supported",
    (node) => node.layout.gap !== 0 || node.layout.rowGap !== undefined || node.layout.columnGap !== undefined,
    "Primary and counter-axis gaps are preserved.");
  add("layout-alignment", "Layout", "Primary/counter alignment", "supported",
    (node) => node.layout.primaryAlignment !== "MIN" || node.layout.counterAlignment !== "MIN",
    "Common primary and counter-axis alignment values map to CSS flex alignment.");

  add("flow-positioning", "Positioning", "FLOW children", "supported",
    (node) => positioning(node) === "FLOW",
    "FLOW children participate in parent document or Auto Layout flow.");
  add("absolute-positioning", "Positioning", "ABSOLUTE children", "supported",
    (node) => positioning(node) === "ABSOLUTE",
    "Absolute nodes use snapshot coordinates and editor constraint resolution.");
  add("root-positioning", "Positioning", "ROOT node", "supported",
    (node) => positioning(node) === "ROOT",
    "The root establishes the package canvas coordinate system.");
  (["MIN", "MAX", "CENTER"] as const).forEach((constraint) =>
    add(`constraint-${constraint.toLowerCase()}`, "Positioning", `${constraint} constraints`, "supported",
      (node) => rawConstraint(node, "horizontal") === constraint || rawConstraint(node, "vertical") === constraint,
      `${constraint} anchors are normalized by axis and resolved from exported offsets.`));
  add("constraint-alias-normalization", "Positioning", "Raw Figma constraint normalization", "supported",
    (node) => ["MIN", "MAX", "STRETCH"].includes(rawConstraint(node, "horizontal") ?? "") || ["MIN", "MAX", "STRETCH"].includes(rawConstraint(node, "vertical") ?? ""),
    "Figma MIN, MAX, and STRETCH aliases are normalized by axis before editor constraint math.");
  add("constraint-metadata-mismatch", "Positioning", "Raw/normalized constraint mismatch", "unknown",
    (node) =>
      (packagedConstraint(node, "horizontal") !== null &&
        normalizeConstraint(rawConstraint(node, "horizontal"), "horizontal") !==
          normalizeConstraint(packagedConstraint(node, "horizontal"), "horizontal")) ||
      (packagedConstraint(node, "vertical") !== null &&
        normalizeConstraint(rawConstraint(node, "vertical"), "vertical") !==
          normalizeConstraint(packagedConstraint(node, "vertical"), "vertical")),
    "Raw Figma constraints and packaged positioning metadata disagree.");

  add("solid-fills", "Appearance", "Solid fills", "supported",
    (node) => paints(node).some((paint) => paint.type === "SOLID"),
    "The first visible solid fill is rendered for normal shapes and text.");
  add("multiple-fills", "Appearance", "Multiple fills", "partial",
    (node) => node.appearance.fills.length > 1,
    "The package preserves multiple fills, but the semantic renderer does not composite every fill layer.");
  add("strokes", "Appearance", "Strokes", strokeSupport,
    (node) => node.appearance.strokes.length > 0,
    "Solid strokes are approximated with borders or shadows according to alignment.");
  add("stroke-alignment", "Appearance", "Stroke alignment", strokeSupport,
    (node) => Boolean(node.appearance.strokeAlign || figma(node).strokeAlign),
    "Solid inside, center, and outside strokes retain visual alignment while layout inclusion is modeled separately.");
  add("stroke-in-layout", "Appearance", "Stroke inclusion in layout", "partial",
    (node) => typeof figma(node).strokesIncludedInLayout === "boolean",
    "Stroke inclusion is modeled when metadata is available, but browser border geometry can differ from Figma.");
  add("opacity", "Appearance", "Opacity", "supported",
    (node) => node.appearance.opacity !== 1,
    "Node opacity is applied to the complete rendered layer.");
  add("border-radius", "Appearance", "Border radius", "supported",
    (node) => Boolean(node.appearance.cornerRadius || node.appearance.cornerRadii || node.appearance.borderRadius),
    "Uniform and per-corner radii are applied to package nodes.");
  add("shadows", "Appearance", "Shadow effects", "unsupported",
    (node) => effectTypes(node).some((type) => type.includes("SHADOW")),
    "Package effects are preserved but not rendered by the semantic renderer.");
  add("blur", "Appearance", "Blur effects", "unsupported",
    (node) => effectTypes(node).some((type) => type.includes("BLUR")),
    "Layer and background blur are not rendered.");
  add("effects", "Appearance", "Layer effects", "unsupported",
    (node) => node.appearance.effects.length > 0,
    "Effect metadata is preserved for diagnostics, but the semantic renderer does not reproduce it.");
  add("blend-modes", "Appearance", "Blend modes", "partial",
    (node) => Boolean(node.appearance.blendMode && !["NORMAL", "PASS_THROUGH"].includes(node.appearance.blendMode)),
    "Browser compositing can differ from Figma for non-standard blend modes.");
  add("gradients", "Appearance", "Gradient paints", "unsupported",
    (node) => paints(node).some((paint) => paint.type.startsWith("GRADIENT_")),
    "Semantic gradient paints are preserved but not rendered; gradients embedded inside SVG assets remain intact.");

  add("clips-content", "Clipping", "clipsContent frame clipping", "supported",
    (node) => Boolean(node.appearance.clipContent || node.layout.clipContent || figma(node).clipsContent),
    "Children clip against current parent bounds, including live editor dimensions.");
  add("rounded-clipping", "Clipping", "Border-radius clipping", "supported",
    (node) => Boolean((node.appearance.clipContent || node.layout.clipContent) && (node.appearance.cornerRadius || node.appearance.cornerRadii)),
    "Rounded clipping is applied through the node overflow and radius.");
  add("nested-clipping", "Clipping", "Nested clipping", "supported",
    (node) => Boolean((node.appearance.clipContent || node.layout.clipContent) && node.parentId && (packageValue.nodes[node.parentId]?.appearance.clipContent || packageValue.nodes[node.parentId]?.layout.clipContent)),
    "Each clipping ancestor establishes its own clipping boundary.");
  add("true-figma-masks", "Clipping", "True Figma masks", "unsupported",
    (node) => Boolean(figma(node).isMask || figma(node).maskType),
    "Arbitrary mask-chain compositing is not modeled; ordinary frame clipping remains supported.");
  add("vector-image-masks", "Clipping", "Vector or image masks", "unsupported",
    (node) =>
      Boolean(
        (figma(node).isMask || figma(node).maskType) &&
          (node.type === "VECTOR" ||
            node.type === "BOOLEAN_OPERATION" ||
            node.type === "IMAGE"),
      ) || Boolean(node.vector?.features?.hasMasks),
    "Vector and image mask compositing requires Figma mask-chain semantics that are not modeled.");

  add("image-assets", "Images", "Image assets", "supported",
    (node) => Boolean(node.image?.assetId),
    "Embedded and safe remote image sources render through package asset references.");
  (["FILL", "FIT", "CROP", "TILE"] as const).forEach((mode) =>
    add(`image-mode-${mode.toLowerCase()}`, "Images", `${mode} image mode`, mode === "CROP" || mode === "TILE" ? "partial" : "supported",
      (node) => node.image?.scaleMode?.toUpperCase() === mode,
      mode === "CROP"
        ? "Crop displays as cover, but imageTransform crop geometry is not fully modeled."
        : mode === "TILE"
          ? "Basic repeat is supported, while Figma tile scaling details may differ."
          : `${mode} maps directly to browser image sizing.`));
  add("image-transform", "Images", "Image crop/transform metadata", "partial",
    (node) => Boolean(node.image?.imageTransform?.length),
    "Valid affine crop transforms render directly; unusual matrices can still differ from Figma image-paint sampling.");
  add("missing-image-assets", "Images", "Missing image assets", "unsupported",
    (node) => Boolean(node.image?.assetId && !packageValue.assets[node.image.assetId]),
    "A referenced image asset is absent, so the visual cannot render.");
  add("unsupported-image-modes", "Images", "Unsupported image fill modes", "unsupported",
    (node) =>
      Boolean(
        node.image?.scaleMode &&
          !["FILL", "FIT", "CROP", "TILE", "STRETCH"].includes(
            node.image.scaleMode.toUpperCase(),
          ),
      ),
    "The renderer must fall back to cover because the package image mode is unknown.");

  add("svg-vector-assets", "Vectors / SVG", "SVG vector assets", "supported",
    (node) => Boolean(node.vector?.assetId && packageValue.assets[node.vector.assetId] && ["svg", "vector"].includes(packageValue.assets[node.vector.assetId].type)),
    "Embedded SVG is the visual source of truth and renders inside package node bounds.");
  add("vector-viewbox", "Vectors / SVG", "Vector viewBox", "supported",
    (node) => Boolean(node.vector?.viewBox || (node.vector?.assetId && packageValue.assets[node.vector.assetId]?.viewBox)),
    "The SVG viewBox controls internal vector geometry.");
  add("vector-preserve-aspect", "Vectors / SVG", "preserveAspectRatio", "supported",
    (node) => Boolean(node.vector?.preserveAspectRatio),
    "The SVG's preserveAspectRatio semantics are retained by image rendering.");
  add("vector-content-bounds", "Vectors / SVG", "Vector contentBounds", "supported",
    (node) => Boolean(node.vector?.contentBounds),
    "Valid content bounds position and size SVG geometry inside the package node viewport.");
  add("vector-complex-features", "Vectors / SVG", "Complex vector features", "partial",
    (node) => Boolean(node.vector?.features && Object.values(node.vector.features).some(Boolean)),
    "Complete SVG assets preserve visual geometry, but internal path editing and reconstruction are intentionally unsupported.");
  add("boolean-vector-without-svg", "Vectors / SVG", "Boolean vector without SVG fallback", "unsupported",
    (node) =>
      Boolean(
        (node.type === "BOOLEAN_OPERATION" ||
          node.vector?.features?.hasBooleanOperation) &&
          (!node.vector?.assetId ||
            !packageValue.assets[node.vector.assetId]?.svgString),
      ),
    "Boolean geometry has no complete SVG fallback, so faithful visual reconstruction is unavailable.");
  add("vector-path-editing", "Vectors / SVG", "Structural vector path editing", "unsupported",
    (node) => Boolean(node.vector && (figma(node).hasVectorNetwork || node.vector.features?.hasBooleanOperation)),
    "Structural path editing is unavailable, while complete SVG assets remain the source of truth for visual rendering.");

  add("text-font-family", "Text", "Font family", "supported",
    (node) => node.type === "TEXT" && Boolean("characters" in node.text ? node.text.fontFamily : node.text.style.fontFamily),
    "Exported font-family values are applied; actual fidelity still depends on font availability.");
  add("text-font-weight-style", "Text", "Font weight/style", "supported",
    (node) => node.type === "TEXT" && Boolean("characters" in node.text ? node.text.fontWeight || node.text.fontStyle : node.text.style.fontWeight || node.text.style.fontStyle),
    "Numeric weight and style metadata map to CSS typography.");
  add("text-size-spacing", "Text", "Font size, line height, and letter spacing", "supported",
    (node) => node.type === "TEXT" && Boolean("characters" in node.text ? node.text.fontSize || node.text.lineHeight || node.text.letterSpacing : node.text.style.fontSize),
    "Core text metrics are converted to CSS values.");
  add("text-alignment", "Text", "Text alignment", "supported",
    (node) => node.type === "TEXT" && Boolean("characters" in node.text && (node.text.textAlignHorizontal || node.text.textAlignVertical)),
    "Horizontal and vertical text alignment are rendered.");
  add("paragraph-spacing", "Text", "Paragraph spacing", "partial",
    (node) => node.type === "TEXT" && "characters" in node.text && Boolean(node.text.paragraphSpacing),
    "Newline-separated paragraphs receive spacing, but Figma paragraph range behavior can differ.");
  add("text-auto-resize", "Text", "Text auto-resize", "supported",
    (node) => node.type === "TEXT" && "characters" in node.text && Boolean(node.text.textAutoResize),
    "Text sizing participates in FIXED/HUG/FILL layout rules.");
  add("text-wrapping", "Text", "Text wrapping", "supported",
    (node) =>
      node.type === "TEXT" &&
      (node.sizing.horizontal.mode !== "HUG" ||
        ("characters" in node.text &&
          ["HEIGHT", "NONE", "TRUNCATE"].includes(
            node.text.textAutoResize ?? "",
          ))),
    "Text wraps within non-HUG width constraints using browser line layout.");
  add("mixed-text-styles", "Text", "Mixed text style ranges", "unsupported",
    (node) => Boolean(figma(node).styleRanges || figma(node).styledTextSegments || figma(node).mixedTextStyles),
    "Per-range text styling is not rendered.");
  add("missing-font-metadata", "Text", "Missing font metadata", "unknown",
    (node) => node.type === "TEXT" && "characters" in node.text && !node.text.fontFamily,
    "The package does not identify a font family, so browser fallback is likely.");

  add("rotation", "Transforms", "Rotation", "supported",
    (node) => typeof figma(node).rotation === "number" && figma(node).rotation !== 0,
    "Simple rotation is applied around the exported transform origin.");
  add("scale-transform", "Transforms", "Scale transform", "supported",
    hasScale,
    "Simple scale and reflection matrices are decomposed into CSS transforms.");
  add("mirrored-transform", "Transforms", "Flipped / mirrored transform", "supported",
    hasReflection,
    "Negative transform determinants are preserved as reflected CSS transforms.");
  add("nested-transforms", "Transforms", "Nested transforms", nestedTransformSupport,
    (node) => Boolean(figma(node).relativeTransform && node.parentId && figma(packageValue.nodes[node.parentId]).relativeTransform),
    "Nested CSS transforms are supported, but Figma coordinate-space edge cases can differ.");
  add("transformed-bounds", "Transforms", "Transformed bounds inconsistency", "partial",
    (node) => Boolean(figma(node).relativeBoundsInconsistent),
    "Constraint math may retain snapshot geometry when transformed bounds cannot be reconciled.");

  const missingAssetNodes = nodes.filter((node) =>
    assetReferences(node).some((id) => !packageValue.assets[id]),
  );
  if (missingAssetNodes.length > 0 && !items.some((item) => item.key === "missing-image-assets")) {
    items.push({
      key: "missing-asset-references",
      category: "Assets",
      name: "Missing asset references",
      status: "unsupported",
      affectedNodes: nodeRefs(missingAssetNodes),
      explanation: "One or more referenced assets are absent from the package.",
      relatedDiagnostics: ["asset.missing-reference"],
    });
  }
  const svgAssetNodes = nodes.filter((node) => {
    const asset = node.vector?.assetId
      ? packageValue.assets[node.vector.assetId]
      : undefined;
    return Boolean(asset && (asset.svgString || asset.dataUrl?.startsWith("data:image/svg+xml")));
  });
  if (svgAssetNodes.length > 0) {
    items.push({
      key: "svg-assets",
      category: "Assets",
      name: "SVG assets",
      status: "supported",
      affectedNodes: nodeRefs(svgAssetNodes),
      explanation: "Embedded SVG sources render through vector asset references.",
      relatedDiagnostics: [],
    });
  }
  const unknownAssetNodes = nodes.filter((node) =>
    assetReferences(node).some((id) => {
      const asset = packageValue.assets[id];
      return Boolean(
        asset &&
          !["image", "svg", "vector"].includes(
            (asset as PackageAsset & { type: string }).type,
          ),
      );
    }),
  );
  if (unknownAssetNodes.length > 0) {
    items.push({
      key: "unknown-asset-types",
      category: "Assets",
      name: "Unknown asset types",
      status: "unknown",
      affectedNodes: nodeRefs(unknownAssetNodes),
      explanation:
        "The package references an asset kind without an established renderer contract.",
      relatedDiagnostics: [],
    });
  }
  const rasterNodes = nodes.filter((node) => {
    const asset = node.image?.assetId
      ? packageValue.assets[node.image.assetId]
      : undefined;
    return asset?.type === "image";
  });
  if (rasterNodes.length > 0) {
    items.push({
      key: "raster-assets",
      category: "Assets",
      name: "Raster image assets",
      status: "supported",
      affectedNodes: nodeRefs(rasterNodes),
      explanation: "Supported image MIME types render from embedded or safe remote sources.",
      relatedDiagnostics: [],
    });
  }
  const largeAssetNodeIds = new Set(
    Object.values(packageValue.assets)
      .filter((asset) => assetBytes(asset) > 2 * 1024 * 1024)
      .map((asset) => asset.nodeId)
      .filter((id): id is string => Boolean(id)),
  );
  const largeAssetNodes = nodes.filter((node) => largeAssetNodeIds.has(node.id));
  if (largeAssetNodes.length > 0) {
    items.push({
      key: "large-embedded-assets",
      category: "Assets",
      name: "Large embedded assets",
      status: "partial",
      affectedNodes: nodeRefs(largeAssetNodes),
      explanation: "Rendering is supported, but parsing, persistence, and capture may be slower.",
      relatedDiagnostics: ["LARGE_EMBEDDED_ASSET"],
    });
  }

  items.sort((a, b) =>
    a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
  );
  return {
    items,
    summary: {
      supported: items.filter((item) => item.status === "supported").length,
      partial: items.filter((item) => item.status === "partial").length,
      unsupported: items.filter((item) => item.status === "unsupported").length,
      unknown: items.filter((item) => item.status === "unknown").length,
    },
    blocking: false,
  };
}

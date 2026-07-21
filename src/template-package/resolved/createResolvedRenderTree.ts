import type {
  EditableFieldBinding,
  PackageAsset,
  PackageEffect,
  PackagePaint,
  PackagePositioningMode,
  PackageSizingMode,
  PackageTextPayload,
  TemplatePackageFontRequirement,
  TemplateNode,
  TemplatePackageV1,
} from "../types";
import { resolvePackageAssetReference } from "../assets/packageAssetResolution";
import {
  canvasBackgroundToCss,
  getFirstVisibleSolidPaint,
  normalizedColorToCss,
  resolvePackageAssetSource,
  resolvePackageAxisLimits,
} from "../render/packageRenderUtils";
import { getPackageNodePositioning } from "../render/packageLayoutModel";
import { resolvePackageStrokeModel } from "../render/packageStrokeLayout";
import { resolvePackageTransform } from "../render/packageTransformLayout";
import { resolvePackageVectorRenderModel } from "../render/packageVectorRender";
import type {
  ResolvedEffect,
  ResolvedFidelityDiagnostic,
  ResolvedFill,
  ResolvedRenderAppearance,
  ResolvedRenderImage,
  ResolvedRenderLayout,
  ResolvedRenderNode,
  ResolvedRenderText,
  ResolvedRenderTransform,
  ResolvedRenderTreeV1,
  ResolvedRenderVector,
  ResolvedRenderWarning,
  ResolvedAssetRef,
  ResolvedEditableFieldTarget,
  ResolvedMotionLinks,
} from "./types";
import { invertNormalizedImageTransform } from "./imagePlacement";
import { resolvePackageMaskRelationships, stableMaskContractHash } from "../masks/packageMaskRelationships";
import {
  collectPrimitiveAncestorClipChain,
  hasPrimitiveMaskRelationship,
  primitiveTreeRevision,
  resolvePrimitiveAppearance,
  resolvePrimitiveCanvasAuthority,
} from "../primitives";
import {
  backendDecisionRevision,
  createBackendDiagnosticProjection,
  resolveBackendDecision,
  resolvedBackendAvailability,
} from "../backend-decision";

const justifyMap: ResolvedRenderLayout["justifyContent"][] = [
  "flex-start",
  "center",
  "flex-end",
  "space-between",
];
const alignMap: ResolvedRenderLayout["alignItems"][] = [
  "flex-start",
  "center",
  "flex-end",
  "stretch",
  "baseline",
];

function clampOpacity(value: number | undefined): number {
  return Math.min(1, Math.max(0, value ?? 1));
}

function finite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function figmaMetadata(node: TemplateNode): Record<string, unknown> | null {
  return isRecord(node.extensions?.figma)
    ? node.extensions.figma
    : null;
}

function sourcePluginVersion(packageValue: TemplatePackageV1): string | undefined {
  return typeof packageValue.source?.pluginVersion === "string"
    ? packageValue.source.pluginVersion
    : undefined;
}

function packageSourceType(packageValue: TemplatePackageV1): string | undefined {
  return typeof packageValue.source?.type === "string"
    ? packageValue.source.type
    : undefined;
}

function positioningMode(node: TemplateNode): PackagePositioningMode {
  return getPackageNodePositioning(node);
}

function renderPositioning(
  node: TemplateNode,
  packageValue: TemplatePackageV1,
): PackagePositioningMode {
  if (node.id === packageValue.rootNodeId) return "ROOT";
  const parent = node.parentId ? packageValue.nodes[node.parentId] : null;
  if (
    positioningMode(node) === "ABSOLUTE" ||
    !parent ||
    parent.layout.mode === "NONE"
  ) {
    return "ABSOLUTE";
  }
  return "FLOW";
}

function siblingStackingIndex(
  node: TemplateNode,
  packageValue: TemplatePackageV1,
): number {
  if (!node.parentId) return 0;
  const parent = packageValue.nodes[node.parentId];
  if (!parent) return 0;
  const index = parent.children.indexOf(node.id);
  return index >= 0 ? index : 0;
}

function nodeAssetRefs(node: TemplateNode): string[] {
  const refs = [
    node.image?.assetId ?? null,
    node.vector?.assetId ?? null,
    ...node.appearance.fills.map((paint) =>
      paint.type === "IMAGE" ? paint.assetId ?? null : null,
    ),
  ].filter((value): value is string => Boolean(value));
  return [...new Set(refs)];
}

function collectNodeOrder(packageValue: TemplatePackageV1): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  const visit = (nodeId: string): void => {
    if (visited.has(nodeId)) return;
    const node = packageValue.nodes[nodeId];
    if (!node) return;
    visited.add(nodeId);
    order.push(nodeId);
    for (const childId of node.children) visit(childId);
  };
  visit(packageValue.rootNodeId);
  for (const nodeId of Object.keys(packageValue.nodes)) visit(nodeId);
  return order;
}

function collectGraphWarnings(
  packageValue: TemplatePackageV1,
): ResolvedRenderWarning[] {
  const warnings: ResolvedRenderWarning[] = [];
  for (const node of Object.values(packageValue.nodes)) {
    for (const childId of node.children) {
      if (!packageValue.nodes[childId]) {
        warnings.push({
          code: "resolved-child-node-missing",
          message: `Child node "${childId}" is referenced by "${node.id}" but is not present in the package graph.`,
          nodeId: node.id,
          feature: "layout",
        });
      }
    }
    if (node.parentId && !packageValue.nodes[node.parentId]) {
      warnings.push({
        code: "resolved-parent-node-missing",
        message: `Parent node "${node.parentId}" for "${node.id}" is not present in the package graph.`,
        nodeId: node.id,
        feature: "layout",
      });
    }
  }
  return warnings;
}

function resolvedAssetSource(asset: PackageAsset | undefined): ResolvedAssetRef["source"] {
  if (!asset) return "missing";
  if (asset.storageKey || asset.stableUrl || asset.source === "stored") {
    return "stored";
  }
  if (asset.url || asset.source === "remote") return "remote";
  if (asset.dataUrl || asset.data || asset.svgString || asset.source === "embedded") {
    return "embedded";
  }
  return "missing";
}

function collectAssetRefs(
  packageValue: TemplatePackageV1,
  nodes: Record<string, ResolvedRenderNode>,
  warnings: ResolvedRenderWarning[],
): Record<string, ResolvedAssetRef> {
  const nodeUsage = new Map<string, Set<string>>();
  for (const node of Object.values(nodes)) {
    for (const reference of node.assetRefs) {
      const assetId =
        resolvePackageAssetReference(packageValue, reference)?.canonicalId ??
        reference;
      if (!nodeUsage.has(assetId)) nodeUsage.set(assetId, new Set());
      nodeUsage.get(assetId)?.add(node.id);
    }
  }

  const fieldUsage = new Map<string, Set<string>>();
  for (const field of packageValue.editableFields) {
    const node = packageValue.nodes[field.nodeId];
    const refs = node ? nodeAssetRefs(node) : [];
    if (
      field.type === "image" &&
      typeof field.defaultValue === "string" &&
      field.defaultValue
    ) {
      refs.push(field.defaultValue);
    }
    if (field.type === "image") {
      if (field.assetRef) refs.push(field.assetRef);
      if (field.typedRef) refs.push(field.typedRef);
    }
    for (const reference of refs) {
      const assetId =
        resolvePackageAssetReference(packageValue, reference)?.canonicalId ??
        reference;
      if (!fieldUsage.has(assetId)) fieldUsage.set(assetId, new Set());
      fieldUsage.get(assetId)?.add(field.id);
    }
  }

  const ids = new Set([
    ...Object.keys(packageValue.assets),
    ...nodeUsage.keys(),
    ...fieldUsage.keys(),
  ]);
  const refs: Record<string, ResolvedAssetRef> = {};
  for (const assetId of ids) {
    const asset = packageValue.assets[assetId];
    const source = resolvedAssetSource(asset);
    refs[assetId] = {
      assetId,
      kind: asset?.type ?? "unknown",
      source,
      renderable: source !== "missing",
      nodeIds: [...(nodeUsage.get(assetId) ?? [])],
      fieldIds: [...(fieldUsage.get(assetId) ?? [])],
      mimeType: asset?.mimeType,
      hash: asset?.hash,
      storageKey: asset?.storageKey,
      stableUrl: asset?.stableUrl,
    };
    if (!asset) {
      warnings.push({
        code: "resolved-asset-ref-missing",
        message: `Asset reference "${assetId}" is used by the runtime graph but is missing from package assets.`,
        nodeId: refs[assetId].nodeIds[0],
        feature: "fallback",
      });
    }
  }
  return refs;
}

function collectEditableFieldTargets(
  packageValue: TemplatePackageV1,
): Record<string, ResolvedEditableFieldTarget> {
  return Object.fromEntries(
    packageValue.editableFields.map((field: EditableFieldBinding) => {
      const node = packageValue.nodes[field.nodeId];
      const assetReference =
        field.property === "image.assetId"
          ? node?.image?.assetId ??
            field.assetRef ??
            field.typedRef ??
            (typeof field.defaultValue === "string" ? field.defaultValue : null)
          : undefined;
      const assetId =
        assetReference === undefined
          ? undefined
          : resolvePackageAssetReference(packageValue, assetReference)?.canonicalId ?? null;
      const propertySupported =
        field.property === "text.characters"
          ? node?.type === "TEXT"
          : field.property === "image.assetId"
            ? Boolean(node)
            : field.property === "visible"
              ? Boolean(node)
              : field.property === "appearance.fills" ||
                  /^appearance\.fills\.\d+\.color$/.test(field.property)
                ? Boolean(node?.appearance.fills.some((paint) => paint.type === "SOLID"))
                : false;
      return [
        field.id,
        {
        fieldId: field.id,
        type: field.type,
        nodeId: field.nodeId,
        property: field.property,
        targetExists: Boolean(node),
        targetNodeType: node?.type,
        propertySupported,
        assetId,
        assetExists:
          assetId === undefined
            ? undefined
            : assetId === null
              ? false
              : Boolean(packageValue.assets[assetId]),
      },
      ];
    }),
  );
}

function collectMotionLinks(packageValue: TemplatePackageV1): ResolvedMotionLinks {
  const linking = packageValue.motion?.linking;
  if (!linking) {
    return {
      status: "none",
      matchedNodeIds: [],
      missingNodeIds: [],
      extraPackageNodeIds: [],
    };
  }
  return {
    status: linking.status,
    matchedNodeIds: [...linking.matchedNodeIds],
    missingNodeIds: [...linking.missingNodeIds],
    extraPackageNodeIds: [
      ...(linking.extraPackageNodeIds ?? linking.extraTemplateNodeIds ?? []),
    ],
  };
}

function borderRadius(node: TemplateNode): string | number | null {
  const value =
    node.appearance.cornerRadius ?? node.appearance.borderRadius ?? null;
  if (typeof value === "number") return value;
  const radii =
    node.appearance.cornerRadii ??
    (value && typeof value === "object" ? value : null);
  if (Array.isArray(radii)) {
    return radii.map((radius) => `${radius}px`).join(" ");
  }
  if (radii) {
    return `${radii.topLeft}px ${radii.topRight}px ${radii.bottomRight}px ${radii.bottomLeft}px`;
  }
  if (node.shape?.type === "ELLIPSE") return "50%";
  if (
    node.shape?.type === "RECTANGLE" &&
    typeof node.shape.cornerRadius === "number"
  ) {
    return node.shape.cornerRadius;
  }
  return null;
}

function resolveFill(
  paint: PackagePaint,
  sourceIndex: number,
  node: TemplateNode,
  warnings: ResolvedRenderWarning[],
  primitiveAppearance: ReturnType<typeof resolvePrimitiveAppearance>,
): ResolvedFill {
  if (paint.type === "SOLID") {
    return {
      kind: "solid",
      sourceIndex,
      color: normalizedColorToCss(paint.color, paint.opacity ?? 1),
      source: paint,
    };
  }
  if (paint.type === "IMAGE") {
    return {
      kind: "image",
      sourceIndex,
      assetId: paint.assetId ?? node.image?.assetId ?? null,
      source: paint,
    };
  }
  const routedGradient = primitiveAppearance.paints.layers.find(
    (layer) => layer.sourceIndex === sourceIndex,
  )?.linearGradient;
  if (paint.type === "GRADIENT_LINEAR" &&
      routedGradient?.capability === "source-certified-linear-gradient" &&
      primitiveAppearance.ownership === "primitive-authoritative") {
    return {
      kind: "linear-gradient",
      sourceIndex,
      geometryRevision: routedGradient.geometryRevision,
      source: paint,
    };
  }
  warnings.push({
    code: "resolved-unsupported-fill",
    message: paint.type === "GRADIENT_LINEAR"
      ? `${paint.type} is preserved with compatibility ownership (${routedGradient?.fallbackReason ?? primitiveAppearance.fallbackReasons[0] ?? "unsupported-linear-gradient"}).`
      : `${paint.type} is preserved but has no supported runtime paint owner.`,
    nodeId: node.id,
    feature: "appearance",
  });
  return { kind: "unsupported", sourceIndex, paintType: paint.type, source: paint };
}

function resolveEffect(
  effect: PackageEffect,
  node: TemplateNode,
  warnings: ResolvedRenderWarning[],
): ResolvedEffect {
  if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
    const color = normalizedColorToCss(effect.color);
    const inset = effect.type === "INNER_SHADOW" ? "inset " : "";
    return {
      type: effect.type,
      cssBoxShadow: `${inset}${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${effect.spread ?? 0}px ${color}`,
      supported: true,
      source: effect,
    };
  }
  if (effect.type === "LAYER_BLUR") {
    return {
      type: effect.type,
      cssFilter: `blur(${effect.radius}px)`,
      supported: true,
      source: effect,
    };
  }
  if (effect.type === "BACKGROUND_BLUR") {
    return {
      type: effect.type,
      cssBackdropFilter: `blur(${effect.radius}px)`,
      supported: true,
      source: effect,
    };
  }
  warnings.push({
    code: "resolved-unsupported-effect",
    message: `Effect "${String((effect as { type?: unknown }).type)}" is unsupported.`,
    nodeId: node.id,
    feature: "appearance",
  });
  return {
    type: String((effect as { type?: unknown }).type ?? "UNKNOWN"),
    supported: false,
    source: effect,
  };
}

function resolveLayout(
  node: TemplateNode,
): ResolvedRenderLayout {
  const horizontal = resolvePackageAxisLimits(node, "horizontal");
  const vertical = resolvePackageAxisLimits(node, "vertical");
  const primaryIndex = ["MIN", "CENTER", "MAX", "SPACE_BETWEEN"].indexOf(
    node.layout.primaryAlignment,
  );
  const counterIndex = ["MIN", "CENTER", "MAX", "STRETCH", "BASELINE"].indexOf(
    node.layout.counterAlignment,
  );
  const figma = figmaMetadata(node);
  const sizingRole = (value: unknown): PackageSizingMode | null => {
    if (value === "AUTO" || value === "HUG") return "HUG";
    if (value === "FIXED" || value === "FILL") return value;
    return null;
  };
  return {
    mode: node.layout.mode,
    display: node.layout.mode === "NONE" ? "block" : "flex",
    direction:
      node.layout.mode === "NONE"
        ? null
        : node.layout.mode === "HORIZONTAL"
          ? "row"
          : "column",
    wrap: node.layout.wrap,
    gap: node.layout.gap,
    rowGap: node.layout.rowGap ?? null,
    columnGap: node.layout.columnGap ?? null,
    padding: { ...node.layout.padding },
    justifyContent: justifyMap[primaryIndex] ?? "flex-start",
    alignItems: alignMap[counterIndex] ?? "flex-start",
    clipContent:
      node.layout.clipContent || node.appearance.clipContent === true,
    horizontal: {
      mode: node.sizing.horizontal.mode,
      value: node.sizing.horizontal.value ?? null,
      min: horizontal.min ?? null,
      max: horizontal.max ?? null,
    },
    vertical: {
      mode: node.sizing.vertical.mode,
      value: node.sizing.vertical.value ?? null,
      min: vertical.min ?? null,
      max: vertical.max ?? null,
    },
    roles: {
      containerPrimaryAxis: sizingRole(figma?.primaryAxisSizingMode),
      containerCounterAxis: sizingRole(figma?.counterAxisSizingMode),
      childHorizontal:
        sizingRole(figma?.layoutSizingHorizontal) ?? node.sizing.horizontal.mode,
      childVertical:
        sizingRole(figma?.layoutSizingVertical) ?? node.sizing.vertical.mode,
      childGrow:
        typeof figma?.layoutGrow === "number" && Number.isFinite(figma.layoutGrow)
          ? figma.layoutGrow
          : null,
      childAlign:
        typeof figma?.layoutAlign === "string" ? figma.layoutAlign : null,
    },
  };
}

function resolveAppearance(
  node: TemplateNode,
  warnings: ResolvedRenderWarning[],
  packageValue: TemplatePackageV1,
  maskRelationships: ReturnType<typeof resolvePackageMaskRelationships>["relationships"],
  primitiveAppearance: ReturnType<typeof resolvePrimitiveAppearance>,
): ResolvedRenderAppearance {
  const maskRelationship = maskRelationships.find((relationship) => relationship.maskSourceId === node.id);
  const fills = node.appearance.fills
    .map((paint, sourceIndex) => ({ paint, sourceIndex }))
    .filter(({ paint }) => paint.visible !== false)
    .map(({ paint, sourceIndex }) => ({
      ...resolveFill(paint, sourceIndex, node, warnings, primitiveAppearance),
      ...(packageValue.maskRelationships ? {
        paintRole: maskRelationship
          ? "mask-input" as const
          : paint.blendMode && !["NORMAL", "PASS_THROUGH"].includes(paint.blendMode.toUpperCase())
            ? "unsupported-compositing-input" as const
            : "ordinary-visible" as const,
        paintRevision: `paint-v1:${stableMaskContractHash({ packageId: packageValue.packageId, nodeId: node.id, sourceIndex, paint })}`,
      } : {}),
    }));
  const solid = getFirstVisibleSolidPaint(node.appearance.fills);
  const strokeModel = resolvePackageStrokeModel(node, "editor");
  const strokes = strokeModel.layers.map((layer) => ({
    color: normalizedColorToCss(
      layer.paint.color,
      layer.paint.opacity ?? 1,
    ),
    weight: layer.weight,
    alignment: layer.alignment,
  }));
  const effects = node.appearance.effects
    .filter((effect) => effect.visible !== false)
    .map((effect) => resolveEffect(effect, node, warnings));
  const clipContent =
    node.layout.clipContent || node.appearance.clipContent === true;
  return {
    visible: node.appearance.visible !== false,
    opacity: clampOpacity(node.appearance.opacity),
    fills,
    backgroundColor:
      solid && !node.vector
        ? normalizedColorToCss(solid.color, solid.opacity ?? 1)
        : null,
    strokes,
    effects,
    borderRadius: borderRadius(node),
    clipContent,
    overflow: clipContent ? "hidden" : "visible",
  };
}

function fontStyle(value: string | null | undefined): ResolvedRenderText["fontStyle"] {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("italic")) return "italic";
  if (normalized.includes("oblique")) return "oblique";
  return "normal";
}

function fontWeight(value: number | null | undefined, style?: string | null): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = style?.toLowerCase().replace(/[\s_-]/g, "") ?? "";
  if (normalized.includes("semibold")) return 600;
  if (normalized.includes("demibold")) return 600;
  if (normalized.includes("extrabold") || normalized.includes("ultrabold")) {
    return 800;
  }
  if (normalized.includes("black") || normalized.includes("heavy")) return 900;
  if (normalized.includes("bold")) return 700;
  if (normalized.includes("medium")) return 500;
  if (normalized.includes("extralight") || normalized.includes("ultralight")) {
    return 200;
  }
  if (normalized.includes("light")) return 300;
  return 400;
}

function cssFontFamily(
  family: string | null | undefined,
  fallbackFamily = "system-ui, sans-serif",
): string {
  const normalized = family?.trim();
  if (!normalized) return fallbackFamily;
  const quoted = normalized.includes(",")
    ? normalized
    : `"${normalized.replace(/"/g, '\\"')}"`;
  return `${quoted}, ${fallbackFamily}`;
}

function fontRequirementForNode(
  packageValue: TemplatePackageV1,
  nodeId: string,
  family: string | null | undefined,
  weight: number,
  style: ResolvedRenderText["fontStyle"],
): TemplatePackageFontRequirement | null {
  const normalizedFamily = family?.trim().toLowerCase();
  if (!normalizedFamily) return null;
  return (
    packageValue.fontRequirements?.find(
      (requirement) =>
        requirement.usedBy.includes(nodeId) &&
        requirement.family.trim().toLowerCase() === normalizedFamily &&
        requirement.weight === weight &&
        requirement.cssStyle === style,
    ) ??
    packageValue.fontRequirements?.find(
      (requirement) =>
        requirement.usedBy.includes(nodeId) &&
        requirement.family.trim().toLowerCase() === normalizedFamily,
    ) ??
    null
  );
}

function fontFallbackStatus(
  requirement: TemplatePackageFontRequirement | null,
): Pick<
  ResolvedRenderText,
  "fontStatus" | "fallbackFamily"
> {
  if (!requirement) {
    return { fontStatus: "specified", fallbackFamily: "system-ui, sans-serif" };
  }
  const resolution = requirement.resolution;
  if (resolution?.match === "fallback") {
    return {
      fontStatus: "fallback",
      fallbackFamily: resolution.fallbackFamily ?? "system-ui, sans-serif",
    };
  }
  if (!requirement.assetId && !resolution?.managedFontId) {
    return { fontStatus: "missing", fallbackFamily: "system-ui, sans-serif" };
  }
  return { fontStatus: "specified", fallbackFamily: "system-ui, sans-serif" };
}

function resolvedFontIdentity(
  resolution: TemplatePackageFontRequirement["resolution"],
): Partial<
  Pick<
    ResolvedRenderText,
    | "runtimeFontFamily"
    | "fontBinaryHash"
    | "fontFaceIndex"
    | "fontClassification"
  >
> {
  if (!resolution?.runtimeFamily || !resolution.binaryHash) return {};
  return {
    runtimeFontFamily: resolution.runtimeFamily,
    fontBinaryHash: resolution.binaryHash,
    fontFaceIndex: resolution.faceIndex ?? 0,
    fontClassification:
      resolution.classification ??
      (resolution.match === "alias" || resolution.match === "manual"
        ? "replacement"
        : resolution.match),
  };
}

function measurementPx(
  measurement: PackageTextPayload["lineHeight"],
  fontSizePx: number,
  fallback: number,
): number {
  if (!measurement || measurement.value === null) return fallback;
  const unit = measurement.unit.toUpperCase();
  if (unit === "AUTO") return fallback;
  if (unit.includes("PERCENT")) {
    return (fontSizePx * measurement.value) / 100;
  }
  return measurement.value;
}

function resolveText(
  node: Extract<TemplateNode, { type: "TEXT" }>,
  packageValue: TemplatePackageV1,
  warnings: ResolvedRenderWarning[],
  missingFonts: Set<string>,
  diagnostics: ResolvedFidelityDiagnostic[],
): ResolvedRenderText {
  if ("content" in node.text) {
    const style = node.text.style;
    const resolvedWeight = fontWeight(style.fontWeight, style.fontStyle);
    const resolvedStyle = fontStyle(style.fontStyle);
    const requirement = fontRequirementForNode(
      packageValue,
      node.id,
      style.fontFamily,
      resolvedWeight,
      resolvedStyle,
    );
    const fallbackStatus = fontFallbackStatus(requirement);
    const fontResolution = requirement?.resolution;
    if (!style.fontFamily.trim()) {
      missingFonts.add("Unspecified font");
      warnings.push({
        code: "resolved-missing-font-family",
        message: "Text has no usable font family and will use the browser fallback.",
        nodeId: node.id,
        feature: "font",
      });
    }
    const verticalAlignment =
      style.textAlignVertical?.toLowerCase() === "center"
        ? "center"
        : style.textAlignVertical?.toLowerCase() === "bottom"
          ? "bottom"
          : "top";
    diagnostics.push({
      code: "resolved-text-vertical-alignment",
      message: `Applied ${verticalAlignment} text-box alignment.`,
      nodeId: node.id,
      severity: "info",
    });
    return {
      characters: node.text.content,
      fontFamily: style.fontFamily || null,
      fontPostScriptName: requirement?.postScriptName ?? null,
      ...resolvedFontIdentity(fontResolution),
      cssFontFamily: cssFontFamily(
        fontResolution?.runtimeFamily ?? style.fontFamily,
        fallbackStatus.fallbackFamily,
      ),
      ...fallbackStatus,
      fontStyle: resolvedStyle,
      fontWeight: resolvedWeight,
      fontSizePx: style.fontSize,
      lineHeightPx: style.lineHeight ?? style.fontSize * 1.2,
      letterSpacingPx: style.letterSpacing ?? 0,
      alignHorizontal:
        style.textAlignHorizontal?.toLowerCase() === "center"
          ? "center"
          : style.textAlignHorizontal?.toLowerCase() === "right"
            ? "right"
            : "left",
      alignVertical: verticalAlignment,
      autoResize:
        style.textAutoResize === "WIDTH_AND_HEIGHT"
          ? "widthAndHeight"
          : style.textAutoResize === "HEIGHT"
            ? "height"
            : style.textAutoResize === "TRUNCATE"
              ? "truncate"
              : "none",
      leadingTrim: "none",
      paragraphSpacingPx: 0,
      textTransform: "none",
      textDecoration: "none",
      overflow:
        style.textAutoResize === "TRUNCATE" ||
        node.layout.clipContent ||
        node.appearance.clipContent === true
          ? "hidden"
          : "visible",
      whiteSpace: "pre-wrap",
    };
  }

  const text = node.text;
  const fontSizePx = finite(text.fontSize, 16);
  const resolvedStyle = fontStyle(text.fontStyle);
  const resolvedWeight = fontWeight(text.fontWeight, text.fontStyle);
  const requirement = fontRequirementForNode(
    packageValue,
    node.id,
    text.fontFamily,
    resolvedWeight,
    resolvedStyle,
  );
  const fallbackStatus = fontFallbackStatus(requirement);
  const fontResolution = requirement?.resolution;
  if (!text.fontFamily?.trim()) {
    missingFonts.add("Unspecified font");
    warnings.push({
      code: "resolved-missing-font-family",
      message: "Text has no usable font family and will use the browser fallback.",
      nodeId: node.id,
      feature: "font",
    });
  }
  if (fallbackStatus.fontStatus !== "specified") {
    const code =
      fallbackStatus.fontStatus === "fallback"
        ? "resolved-font-fallback"
        : "resolved-font-missing";
    const message =
      fallbackStatus.fontStatus === "fallback"
        ? `${text.fontFamily} ${resolvedWeight} ${resolvedStyle} resolved to a fallback font.`
        : `${text.fontFamily} ${resolvedWeight} ${resolvedStyle} has no managed font asset attached.`;
    missingFonts.add(`${text.fontFamily ?? "Unspecified font"} ${resolvedWeight} ${resolvedStyle}`);
    warnings.push({
      code,
      message,
      nodeId: node.id,
      feature: "font",
    });
    diagnostics.push({
      code,
      message,
      nodeId: node.id,
      severity: "warning",
    });
  }
  const horizontal = text.textAlignHorizontal?.toUpperCase();
  const vertical = text.textAlignVertical?.toUpperCase();
  const autoResize = text.textAutoResize?.toUpperCase();
  const textCase = text.textCase?.toUpperCase();
  const decoration = text.textDecoration?.toUpperCase();
  const figma = figmaMetadata(node);
  const leadingTrim = (
    text.leadingTrim ??
    (typeof figma?.leadingTrim === "string" ? figma.leadingTrim : null)
  )?.toUpperCase();
  if (
    figma &&
    [
      "styledTextSegments",
      "characterStyleOverrides",
      "styleOverrideTable",
      "textStyleRanges",
    ].some((key) => {
      const value = figma[key];
      return Array.isArray(value)
        ? value.length > 0
        : isRecord(value) && Object.keys(value).length > 0;
    })
  ) {
    warnings.push({
      code: "resolved-unsupported-mixed-text-styles",
      message:
        "Mixed text style ranges are preserved in source metadata but rendered with the node-level text style.",
      nodeId: node.id,
      feature: "text",
    });
  }
  if (finite(text.paragraphSpacing, 0) > 0) {
    warnings.push({
      code: "resolved-paragraph-spacing-approximation",
      message:
        "Paragraph spacing is applied between explicit line breaks; Figma paragraph range semantics are approximated.",
      nodeId: node.id,
      feature: "text",
    });
  }
  diagnostics.push({
    code: "resolved-text-vertical-alignment",
    message: `Applied ${vertical === "CENTER" ? "center" : vertical === "BOTTOM" ? "bottom" : "top"} text-box alignment.`,
    nodeId: node.id,
    severity: "info",
  });
  return {
    characters: text.characters,
    fontFamily: text.fontFamily,
    fontPostScriptName: text.fontPostScriptName ?? requirement?.postScriptName ?? null,
    ...resolvedFontIdentity(fontResolution),
    cssFontFamily: cssFontFamily(
      fontResolution?.runtimeFamily ?? text.fontFamily,
      fallbackStatus.fallbackFamily,
    ),
    ...fallbackStatus,
    fontStyle: resolvedStyle,
    fontWeight: resolvedWeight,
    fontSizePx,
    lineHeightPx: measurementPx(
      text.lineHeight,
      fontSizePx,
      fontSizePx * 1.2,
    ),
    letterSpacingPx: measurementPx(text.letterSpacing, fontSizePx, 0),
    alignHorizontal:
      horizontal === "CENTER"
        ? "center"
        : horizontal === "RIGHT"
          ? "right"
          : horizontal === "JUSTIFIED" || horizontal === "JUSTIFY"
            ? "justify"
            : "left",
    alignVertical:
      vertical === "CENTER"
        ? "center"
        : vertical === "BOTTOM"
          ? "bottom"
          : "top",
    autoResize:
      autoResize === "WIDTH_AND_HEIGHT"
        ? "widthAndHeight"
        : autoResize === "HEIGHT"
          ? "height"
          : autoResize === "TRUNCATE"
            ? "truncate"
            : "none",
    leadingTrim: leadingTrim === "CAP_HEIGHT" ? "cap-height" : "none",
    paragraphSpacingPx: Math.max(0, finite(text.paragraphSpacing, 0)),
    textTransform:
      textCase === "UPPER"
        ? "uppercase"
        : textCase === "LOWER"
          ? "lowercase"
          : textCase === "TITLE"
            ? "capitalize"
            : "none",
    textDecoration:
      decoration === "UNDERLINE"
        ? "underline"
        : decoration === "STRIKETHROUGH" ||
            decoration === "STRIKE_THROUGH"
          ? "line-through"
          : "none",
    overflow:
      autoResize === "TRUNCATE" ||
      node.layout.clipContent ||
      node.appearance.clipContent === true
        ? "hidden"
        : "visible",
    whiteSpace: "pre-wrap",
  };
}

function imageFit(scaleMode: string): ResolvedRenderImage["objectFit"] {
  if (scaleMode === "FIT") return "contain";
  if (scaleMode === "STRETCH") return "fill";
  return "cover";
}

function imageRenderMode(
  scaleMode: string,
  asset: PackageAsset | undefined,
  hasActiveCropTransform: boolean,
): ResolvedRenderImage["renderMode"] {
  if (scaleMode === "FIT") return "object-fit-contain";
  if (scaleMode === "STRETCH") return "object-fit-fill";
  if (scaleMode === "TILE" && asset?.width && asset.height) return "tile";
  if (scaleMode === "CROP" && hasActiveCropTransform) return "figma-image-transform";
  if (scaleMode === "FILL" || scaleMode === "CROP") return "object-fit-cover";
  return "fallback";
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function assetForFlattenMarker(
  node: TemplateNode,
  packageValue: TemplatePackageV1,
): PackageAsset | undefined {
  const directIds = [
    node.vector?.assetId,
    node.image?.assetId,
    ...node.appearance.fills.map((paint) =>
      paint.type === "IMAGE" ? paint.assetId : undefined,
    ),
  ].filter((value): value is string => Boolean(value));
  for (const id of directIds) {
    const asset = resolvePackageAssetReference(packageValue, id)?.asset;
    if (asset) return asset;
  }
  return Object.values(packageValue.assets).find(
    (asset) => asset.nodeId === node.id,
  );
}

function resolveImage(
  node: TemplateNode,
  packageValue: TemplatePackageV1,
  warnings: ResolvedRenderWarning[],
  diagnostics: ResolvedFidelityDiagnostic[],
  overrideAsset?: PackageAsset,
): ResolvedRenderImage | undefined {
  const imagePaint = node.appearance.fills.find(
    (paint) => paint.type === "IMAGE",
  );
  const candidateHint = packageValue.rendererHints?.[node.id];
  const imageHint =
    candidateHint?.kind === "image" ? candidateHint : null;
  const assetIdSource: ResolvedRenderImage["propertySources"]["assetId"] =
    overrideAsset
      ? "override"
      : node.image?.assetId
        ? "node"
        : imagePaint?.type === "IMAGE" && imagePaint.assetId
          ? "paint"
          : imageHint?.assetId
            ? "hint"
            : "missing";
  const assetId =
    overrideAsset?.id ??
    node.image?.assetId ??
    (imagePaint?.type === "IMAGE" ? imagePaint.assetId : undefined) ??
    imageHint?.assetId ??
    null;
  if (!assetId && !imagePaint && !node.image && !overrideAsset) return undefined;
  const assetResolution = resolvePackageAssetReference(packageValue, assetId);
  const asset = assetResolution?.asset;
  const canonicalAssetId = assetResolution?.canonicalId ?? assetId;
  const source = resolvePackageAssetSource(asset ?? overrideAsset);
  if (!source) {
    warnings.push({
      code: "resolved-image-asset-missing",
      message: assetId
        ? `Image asset "${assetId}" has no renderable source.`
        : "Image content has no asset reference.",
      nodeId: node.id,
      feature: "image",
    });
  }
  const imageField = packageValue.editableFields.find(
    (field) => field.nodeId === node.id && field.property === "image.assetId",
  );
  const defaultAssetId =
    imageField && typeof imageField.defaultValue === "string"
      ? resolvePackageAssetReference(packageValue, imageField.defaultValue)?.canonicalId ??
        imageField.defaultValue
      : null;
  const isReplacement = Boolean(
    imageField && canonicalAssetId && defaultAssetId && canonicalAssetId !== defaultAssetId,
  );
  const explicitPlacement = node.image?.activePlacement;
  const legacyReplacementMode =
    isReplacement && imageField?.constraints && "replacementMode" in imageField.constraints
      ? imageField.constraints.replacementMode
      : null;
  let activePlacementState: ResolvedRenderImage["activePlacementState"] =
    explicitPlacement?.state ?? (isReplacement
      ? legacyReplacementMode === "contain"
        ? "replacement-fit"
        : "replacement-fill"
      : "imported-source");
  if (activePlacementState === "imported-source" && isReplacement) {
    activePlacementState = "replacement-fill";
    warnings.push({
      code: "resolved-image-placement-state-conflict",
      message: "A replacement asset claimed imported-source placement; deterministic replacement Fill is used.",
      nodeId: node.id,
      feature: "image",
    });
  }
  if (activePlacementState === "editor-crop") {
    warnings.push({
      code: "resolved-editor-crop-reserved",
      message: "Editor-authored crop is reserved and not implemented; deterministic replacement Fill is used.",
      nodeId: node.id,
      feature: "image",
    });
  }
  const placementRevision = explicitPlacement?.revision ?? 0;
  const replacementMode = activePlacementState === "replacement-fit"
    ? "contain"
    : activePlacementState === "replacement-fill" || activePlacementState === "editor-crop"
      ? "cover"
      : null;
  const sourceScaleMode =
    node.image?.scaleMode ??
    (imagePaint?.type === "IMAGE" ? imagePaint.scaleMode : undefined) ??
    imageHint?.figmaScaleMode ??
    asset?.scaleMode ??
    "FILL";
  const scaleMode = (
    activePlacementState === "replacement-fit"
      ? "FIT"
      : activePlacementState === "replacement-fill" || activePlacementState === "editor-crop"
        ? "FILL"
        : sourceScaleMode
  ).toUpperCase();
  const scaleModeSource: ResolvedRenderImage["propertySources"]["scaleMode"] =
    activePlacementState !== "imported-source"
      ? "replacement-policy"
      : node.image?.scaleMode
        ? "node"
        : imagePaint?.type === "IMAGE" && imagePaint.scaleMode
          ? "paint"
          : imageHint?.figmaScaleMode
            ? "hint"
            : asset?.scaleMode
              ? "asset"
              : "default";
  const imageTransform =
    node.image?.imageTransform ?? imageHint?.imageTransform ?? null;
  const explicitPosition = node.image?.objectPosition;
  const activeCropTransform = scaleMode === "CROP" ? imageTransform : null;
  const transformMatrix = invertNormalizedImageTransform(activeCropTransform);
  const renderMode = imageRenderMode(scaleMode, asset, Boolean(transformMatrix));
  if (scaleMode === "CROP" && imageTransform && !transformMatrix) {
    warnings.push({
      code: "resolved-invalid-image-transform",
      message:
        "Figma imageTransform is malformed, so image rendering falls back to scaleMode.",
      nodeId: node.id,
      feature: "image",
    });
  }
  if (scaleMode === "CROP" && !transformMatrix) {
    warnings.push({
      code: "resolved-crop-object-fit-fallback",
      message:
        "CROP has no usable imageTransform; object-fit cover is used as a positional fallback.",
      nodeId: node.id,
      feature: "image",
    });
  }
  if (scaleMode === "TILE" && renderMode !== "tile") {
    warnings.push({
      code: "resolved-tile-metadata-missing",
      message:
        "TILE rendering needs intrinsic asset dimensions; cover fallback is used.",
      nodeId: node.id,
      feature: "image",
    });
  }
  const figma = figmaMetadata(node);
  if (figma?.filters || figma?.imageFilters) {
    warnings.push({
      code: "resolved-unsupported-image-filters",
      message:
        "Figma image filters are present but are not reproduced by the semantic renderer.",
      nodeId: node.id,
      feature: "image",
    });
  }
  diagnostics.push({
    code: "resolved-image-render-mode",
    message: `Applied image render mode ${renderMode}.`,
    nodeId: node.id,
    severity: renderMode === "fallback" ? "warning" : "info",
  });
  const focalPoint = explicitPosition
    ? { x: clampUnit(explicitPosition.x), y: clampUnit(explicitPosition.y) }
    : { x: 0.5, y: 0.5 };
  const fitMode = (["FILL", "FIT", "CROP", "STRETCH", "TILE"] as const).find(
    (candidate) => candidate === scaleMode,
  ) ?? "UNKNOWN";
  const compatibilityCrop = { zoom: 1, axis: null as "width" | "height" | null };
  return {
    assetId: canonicalAssetId,
    source,
    scaleMode,
    objectFit: imageFit(scaleMode),
    objectPosition: `${focalPoint.x * 100}% ${focalPoint.y * 100}%`,
    focalPoint,
    cropZoom: compatibilityCrop.zoom,
    cropAxis: compatibilityCrop.axis,
    imageTransform,
    activePlacementState,
    placementRevision,
    placement: {
      schemaVersion: "resolved-image-placement-v1",
      fitMode,
      focalPoint,
      coordinateSpace: "normalized-node-to-normalized-source",
      transformOrigin: "source-top-left",
      sourceTransform: imageTransform,
      activeCropTransform: transformMatrix ? activeCropTransform : null,
      transformApplicability: scaleMode === "CROP"
        ? transformMatrix
          ? "active-crop"
          : imageTransform
            ? "invalid"
            : "missing"
        : imageTransform
          ? "preserved-inapplicable"
          : "missing",
      clipping: "slot",
      sampling: {
        backend: "browser-native",
        interpolation: "browser-default",
      },
      compatibilityCropZoom: compatibilityCrop.zoom,
      compatibilityCropAxis: compatibilityCrop.axis,
    },
    cropMode: explicitPosition
      ? "objectPosition"
      : scaleMode === "CROP" && transformMatrix
        ? "figmaImageTransform"
        : scaleMode === "CROP"
          ? "unknown"
          : "objectFitOnly",
    propertySources: {
      assetId: assetIdSource,
      scaleMode: scaleModeSource,
      crop:
        activePlacementState !== "imported-source"
          ? "replacement-policy"
          : explicitPosition || (scaleMode === "CROP" && imageTransform)
            ? "node"
            : imageHint?.cropMode
              ? "hint"
              : "default",
    },
    replacementMode,
    clipStrategy: "slot",
    renderMode,
    transformMatrix,
    assetWidth: asset?.width ?? null,
    assetHeight: asset?.height ?? null,
    missingAsset: !source,
  };
}

function resolveVector(
  node: TemplateNode,
  packageValue: TemplatePackageV1,
  warnings: ResolvedRenderWarning[],
  diagnostics: ResolvedFidelityDiagnostic[],
  flattenedAsset?: PackageAsset,
): ResolvedRenderVector | undefined {
  if (!node.vector && !node.shape && !flattenedAsset) return undefined;
  const model = node.vector
    ? resolvePackageVectorRenderModel(node, packageValue)
    : null;
  const flattenedSource = resolvePackageAssetSource(flattenedAsset);
  const explicitRenderMode = node.vector?.renderMode;
  const renderMode = flattenedAsset
    ? "FLATTENED_SVG"
    : explicitRenderMode ??
      (node.shape ? "SEMANTIC_SHAPE" : model?.source ? "SVG_ASSET" : "UNSUPPORTED");
  const renderModeSource: ResolvedRenderVector["renderModeSource"] = flattenedAsset
    ? "flattened-evidence"
    : explicitRenderMode
      ? "explicit"
      : node.shape
        ? "shape-evidence"
        : model?.source
          ? "asset-evidence"
          : "unsupported-fallback";
  const assetReference = flattenedAsset?.id ?? node.vector?.assetId ?? null;
  const assetResolution = resolvePackageAssetReference(
    packageValue,
    assetReference,
  );
  const assetId = assetResolution?.canonicalId ?? assetReference;
  const source = flattenedSource ?? model?.source ?? null;
  const isAssetMode =
    renderMode === "SVG_ASSET" || renderMode === "FLATTENED_SVG";
  if (isAssetMode && !source) {
    warnings.push({
      code: "resolved-vector-asset-missing",
      message: `Vector node expects ${renderMode} rendering but has no renderable asset.`,
      nodeId: node.id,
      feature: "vector",
    });
  }
  if (model?.viewBox) {
    diagnostics.push({
      code: "resolved-svg-viewbox-applied",
      message: `Applied SVG viewBox ${model.viewBox} with ${model.preserveAspectRatio ?? "xMidYMid meet"}.`,
      nodeId: node.id,
      severity: "info",
    });
  }
  const solidFill = getFirstVisibleSolidPaint(node.appearance.fills);
  const stroke = resolvePackageStrokeModel(node, "editor").layers[0];
  return {
    assetId,
    source,
    renderMode,
    renderModeSource,
    semanticShape: node.shape?.type ?? null,
    viewBox: model?.viewBox ?? null,
    preserveAspectRatio:
      model?.preserveAspectRatio ??
      node.vector?.preserveAspectRatio ??
      "xMidYMid meet",
    contentBounds: model?.contentBounds ?? node.vector?.contentBounds ?? null,
    fill: solidFill
      ? normalizedColorToCss(solidFill.color, solidFill.opacity ?? 1)
      : null,
    stroke: stroke
      ? {
          color: normalizedColorToCss(
            stroke.paint.color,
            stroke.paint.opacity ?? 1,
          ),
          weight: stroke.weight,
          alignment: stroke.alignment,
        }
      : null,
    flattened: Boolean(flattenedAsset),
    usesSvgString: model?.usesSvgString ?? Boolean(flattenedAsset?.svgString),
    missingAsset: isAssetMode && !source,
  };
}

function resolveTransform(node: TemplateNode): ResolvedRenderTransform {
  const transform = resolvePackageTransform(node);
  return {
    hasTransform: transform.hasTransform,
    hasRotation: transform.hasRotation,
    hasScale: transform.hasScale,
    isMirrored: transform.isMirrored,
    rotation: transform.rotation,
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
    transformOrigin: transform.transformOrigin,
    usesMatrix: transform.usesMatrix,
    rawMatrixPresent: transform.rawMatrixPresent,
    matrixValid: transform.matrixValid,
    hasUnsupportedSkew: transform.hasUnsupportedSkew,
    linearMatrix: transform.linearMatrix,
    matrixTranslation: transform.matrixTranslation,
    hasLocalGeometry: transform.hasLocalGeometry,
    relativeBoundsInconsistent: transform.relativeBoundsInconsistent,
  };
}

function resolveNode(
  node: TemplateNode,
  packageValue: TemplatePackageV1,
  warnings: ResolvedRenderWarning[],
  missingFonts: Set<string>,
  maskRelationships: ReturnType<typeof resolvePackageMaskRelationships>["relationships"],
): Omit<ResolvedRenderNode, "backendDecision"> {
  const diagnostics: ResolvedFidelityDiagnostic[] = [];
  const fields = packageValue.editableFields.filter(
    (field) => field.nodeId === node.id,
  );
  if (node.layout.mode !== "NONE") {
    diagnostics.push({
      code: "resolved-auto-layout-applied",
      message: `Applied ${node.layout.mode.toLowerCase()} Auto Layout with ${node.layout.gap}px gap and ${node.layout.primaryAlignment}/${node.layout.counterAlignment} alignment.`,
      nodeId: node.id,
      severity: "info",
    });
  }
  if (
    node.layout.mode === "NONE" &&
    node.children.length > 0 &&
    (node.sizing.horizontal.mode === "HUG" ||
      node.sizing.vertical.mode === "HUG")
  ) {
    diagnostics.push({
      code: "resolved-layout-bounds-fallback",
      message:
        "layout.mode NONE with HUG container sizing uses package bounds as its child-coordinate fallback.",
      nodeId: node.id,
      severity: "warning",
    });
  }
  const flattenMarker = /^flatten:/i.test(node.name.trim());
  const flattenAsset = flattenMarker
    ? assetForFlattenMarker(node, packageValue)
    : undefined;
  if (flattenMarker && !flattenAsset) {
    warnings.push({
      code: "resolved-flatten-asset-missing",
      message: 'A "flatten:*" node has no flattened asset and uses semantic fallback rendering.',
      nodeId: node.id,
      feature: "fallback",
    });
  }
  const vector = resolveVector(
    node,
    packageValue,
    warnings,
    diagnostics,
    flattenAsset &&
      (flattenAsset.type === "svg" || flattenAsset.type === "vector")
      ? flattenAsset
      : undefined,
  );
  const image = resolveImage(
    node,
    packageValue,
    warnings,
    diagnostics,
    flattenAsset?.type === "image" ? flattenAsset : undefined,
  );
  const fallbackReason =
    flattenMarker && !flattenAsset
      ? "flattened asset missing"
      : vector?.missingAsset
        ? "vector asset missing"
        : image?.missingAsset
          ? "image asset missing"
          : vector?.renderMode === "UNSUPPORTED"
            ? "unsupported vector render mode"
            : undefined;
  const primitiveAppearance = resolvePrimitiveAppearance(node, {
    packageId: packageValue.packageId,
    rootNodeId: packageValue.rootNodeId,
    maskInput: node.mask?.isMask === true,
    hasMaskRelationship: hasPrimitiveMaskRelationship(packageValue, node.id),
    ancestorClipChain: collectPrimitiveAncestorClipChain(packageValue, node),
  });
  const orderedSolidStack = primitiveAppearance.paints.orderedSolidStack;
  const orderedNormalPaintStack = primitiveAppearance.paints.orderedNormalPaintStack;
  if (orderedSolidStack) {
    diagnostics.push({
      code: orderedSolidStack.capability === "source-certified-ordered-solid-stack"
        ? "resolved-ordered-solid-stack-supported"
        : orderedSolidStack.fallbackReasons[0] ?? "resolved-ordered-solid-stack-compatibility",
      message: orderedSolidStack.capability === "source-certified-ordered-solid-stack"
        ? `Ordered SOLID stack uses one revisioned SVG owner for ${orderedSolidStack.visiblePaintIndices.length} visible paint(s).`
        : `Ordered SOLID stack remains compatibility-owned: ${orderedSolidStack.fallbackReasons.join(", ") || "unsupported source data"}.`,
      nodeId: node.id,
      severity: orderedSolidStack.capability === "source-certified-ordered-solid-stack" ? "info" : "warning",
    });
  } else if (node.appearance.fills.length >= 2) {
    diagnostics.push(orderedNormalPaintStack?.capability === "source-certified-solid-linear-normal-stack"
      ? {
          code: "resolved-ordered-solid-linear-stack-supported",
          message: "Ordered SOLID plus linear-gradient stack uses one revisioned SVG owner and shared primitive clip.",
          nodeId: node.id,
          severity: "info",
        }
      : {
          code: primitiveAppearance.fallbackReasons[0] ?? "resolved-multiple-paint-compatibility",
          message: `Multiple-paint node remains compatibility-owned: ${primitiveAppearance.fallbackReasons.join(", ") || "unsupported paint combination"}.`,
          nodeId: node.id,
          severity: "warning",
        });
  }
  for (const paint of primitiveAppearance.paints.layers) {
    if (!paint.linearGradient) continue;
    diagnostics.push({
      code: paint.linearGradient.capability === "source-certified-linear-gradient"
        ? "resolved-linear-gradient-supported"
        : paint.linearGradient.fallbackReason ?? "resolved-linear-gradient-unsupported",
      message: paint.linearGradient.capability === "source-certified-linear-gradient"
        ? "Source-certified linear gradient uses one revisioned SVG primitive owner."
        : `Linear gradient remains compatibility-owned: ${paint.linearGradient.fallbackReason ?? "unsupported canonical data"}.`,
      nodeId: node.id,
      severity: paint.linearGradient.capability === "source-certified-linear-gradient" ? "info" : "warning",
    });
  }
  return {
    id: node.id,
    sourceNodeId: node.id,
    name: node.name,
    type: node.type,
    parentId: node.parentId,
    children: [...node.children],
    childOrder: [...node.children],
    stackingIndex: siblingStackingIndex(node, packageValue),
    bounds: {
      absolute: { ...node.bounds.absolute },
      relative: { ...node.bounds.relative },
    },
    exportedBounds: {
      absolute: { ...node.bounds.absolute },
      relative: { ...node.bounds.relative },
    },
    sourcePositioning: positioningMode(node),
    renderPositioning: renderPositioning(node, packageValue),
    layout: resolveLayout(node),
    appearance: resolveAppearance(node, warnings, packageValue, maskRelationships, primitiveAppearance),
    primitiveAppearance,
    text:
      node.type === "TEXT"
        ? resolveText(node, packageValue, warnings, missingFonts, diagnostics)
        : undefined,
    image,
    vector,
    transform: resolveTransform(node),
    assetRefs: nodeAssetRefs(node),
    editableFields: fields.map((field) => ({ ...field })),
    fieldTargetIds: fields.map((field) => field.id),
    fieldMarkers: fields.map(
      (field) => `field:${field.type}:${field.id}`,
    ),
    fidelityDiagnostics: diagnostics,
    renderStrategy: fallbackReason
      ? "fallback"
      : flattenAsset || vector?.source || image?.source
        ? "asset"
        : "semantic",
    renderHint: packageValue.rendererHints?.[node.id] ?? null,
    fallbackReason,
  };
}

export function createResolvedRenderTree(
  packageValue: TemplatePackageV1,
): ResolvedRenderTreeV1 {
  const warnings: ResolvedRenderWarning[] = [
    ...collectGraphWarnings(packageValue),
  ];
  const missingFonts = new Set<string>();
  const maskResolution = resolvePackageMaskRelationships(packageValue);
  const currentPrimitiveTreeRevision = primitiveTreeRevision(packageValue);
  for (const relationship of maskResolution.relationships) {
    if (relationship.renderStrategy !== "css-clip-path") {
      warnings.push({
        code: `resolved-mask-${relationship.capability}`,
        message: `Mask relationship ${relationship.relationshipId} is preserved with explicit unmasked compatibility fallback (${relationship.capability}).`,
        nodeId: relationship.maskSourceId,
        feature: "appearance",
      });
    }
  }
  const unresolvedNodes = Object.fromEntries(
    Object.values(packageValue.nodes).map((node) => [
      node.id,
      resolveNode(node, packageValue, warnings, missingFonts, maskResolution.relationships),
    ]),
  );
  const sourceDecisionRevision = `${packageValue.packageId}:${currentPrimitiveTreeRevision}`;
  const nodes = Object.fromEntries(
    Object.values(unresolvedNodes).map((node) => {
      const affectedMask = maskResolution.relationships.find((relationship) =>
        relationship.affected.some((entry) => entry.nodeId === node.id),
      );
      const sourceMask = maskResolution.relationships.find(
        (relationship) => relationship.maskSourceId === node.id,
      );
      const maskRelationship = affectedMask ?? sourceMask;
      return [node.id, {
        ...node,
        backendDecision: resolveBackendDecision(node, {
          packageId: packageValue.packageId,
          sourceRevision: sourceDecisionRevision,
          maskOwner: maskRelationship
            ? maskRelationship.renderStrategy === "css-clip-path"
              ? "css-clip"
              : "compatibility"
            : null,
          maskCapability: maskRelationship?.capability ?? null,
        }),
      }];
    }),
  ) as Record<string, ResolvedRenderNode>;
  const assetRefs = collectAssetRefs(packageValue, nodes, warnings);
  const uniqueWarnings = warnings.filter(
    (warning, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.code === warning.code &&
          candidate.nodeId === warning.nodeId &&
          candidate.message === warning.message,
      ) === index,
  );
  const values = Object.values(nodes);
  const fidelityDiagnostics = values.flatMap(
    (node) => node.fidelityDiagnostics,
  );
  const decisionRevision = backendDecisionRevision(
    values.map((node) => node.backendDecision),
  );
  const backendDiagnostics = createBackendDiagnosticProjection(
    nodes,
    uniqueWarnings,
    decisionRevision,
  );
  return {
    schemaVersion: "resolved-render-tree-v1",
    contract: "resolved-template-graph-v1",
    sourcePackageId: packageValue.packageId,
    sourcePackage: {
      packageId: packageValue.packageId,
      name: packageValue.name,
      rootNodeId: packageValue.rootNodeId,
      sourceType: packageSourceType(packageValue),
      pluginVersion: sourcePluginVersion(packageValue),
    },
    rootNodeId: packageValue.rootNodeId,
    canvas: {
      width: packageValue.canvas.width,
      height: packageValue.canvas.height,
      background: canvasBackgroundToCss(packageValue.canvas.background),
    },
    primitiveCanvas: resolvePrimitiveCanvasAuthority(packageValue),
    primitiveTreeRevision: currentPrimitiveTreeRevision,
    backendAvailability: resolvedBackendAvailability,
    backendDecisionRevision: decisionRevision,
    backendDiagnostics,
    nodes,
    ...(packageValue.maskRelationships ? {
      maskRelationships: maskResolution.relationships.map((relationship) => ({
        relationshipId: relationship.relationshipId,
        maskRevision: relationship.maskRevision,
        maskSourceId: relationship.maskSourceId,
        parentId: relationship.parentId,
        affected: relationship.affected.map((entry) => ({
          nodeId: entry.nodeId,
          clipInsets: entry.clipInsets ? { ...entry.clipInsets } : null,
        })),
        maskType: relationship.maskType,
        status: relationship.status,
        capability: relationship.capability,
        renderStrategy: relationship.renderStrategy,
        paintRole: relationship.paintRole,
        maskBounds: relationship.maskBounds ? { ...relationship.maskBounds } : null,
        sourceEvidence: {
          relativeTransform: structuredClone((packageValue.nodes[relationship.maskSourceId]?.extensions?.figma as Record<string, unknown> | undefined)?.relativeTransform ?? null),
          nodeOpacity: packageValue.nodes[relationship.maskSourceId]?.appearance.opacity ?? null,
          paintIndices: (packageValue.nodes[relationship.maskSourceId]?.appearance.fills ?? []).map((_, index) => index),
          paintOpacities: (packageValue.nodes[relationship.maskSourceId]?.appearance.fills ?? []).map((paint) => paint.opacity ?? null),
          paintAlphas: (packageValue.nodes[relationship.maskSourceId]?.appearance.fills ?? []).map((paint) => paint.type === "SOLID" ? paint.color.a : null),
          confidence: relationship.capability === "exact-opaque-rectangular-alpha" ? "high" : "unresolved",
        },
      })),
    } : {}),
    nodeOrder: collectNodeOrder(packageValue),
    assetRefs,
    editableFields: packageValue.editableFields.map((field) => ({
      ...field,
    })),
    editableFieldTargets: collectEditableFieldTargets(packageValue),
    motionLinks: collectMotionLinks(packageValue),
    renderHints: { ...(packageValue.rendererHints ?? {}) },
    fidelityDiagnostics,
    warnings: uniqueWarnings,
    summary: {
      nodeCount: values.length,
      textNodeCount: values.filter((node) => Boolean(node.text)).length,
      imageNodeCount: values.filter((node) => Boolean(node.image)).length,
      vectorNodeCount: values.filter((node) => Boolean(node.vector)).length,
      fallbackRenderedNodeCount: values.filter(
        (node) => node.renderStrategy === "fallback",
      ).length,
      unsupportedFeatureCount: uniqueWarnings.filter(
        (warning) =>
          warning.code.includes("unsupported") ||
          warning.code.includes("missing"),
      ).length,
      missingFonts: [...missingFonts],
    },
  };
}

import type {
  PackageLayoutMode,
  PackageSizingMode,
  TemplateNode,
  TemplatePackageV1,
} from "../types";
import { resolvePackageAssetReference } from "../assets/packageAssetResolution";
import {
  isEditorLiveResizableConstraintContainer,
  resolvePackageAbsoluteConstraints,
} from "./packageConstraintLayout";
import { resolvePackageClipping } from "./packageClipping";
import { resolvePackageNodeLayoutRole } from "./packageLayoutModel";
import { resolvePackageStrokeModel } from "./packageStrokeLayout";
import { collectPackageTextCompatibilityIssues } from "./packageTextLayout";
import {
  resolvePackageTransform,
  resolveTransformedConstraintStyle,
} from "./packageTransformLayout";
import { collectPackageVectorCompatibilityIssues } from "./packageVectorRender";
import {
  collectPrimitiveAncestorClipChain,
  hasPrimitiveMaskRelationship,
  resolvePrimitiveAppearance,
} from "../primitives";
import {
  canvasBackgroundToCss,
  getFirstVisibleSolidPaint,
  normalizedColorToCss,
  resolvePackageAssetSource,
  resolvePackageAxisLimits,
} from "../../../packages/template-core/src/models/packageRenderValues";

export {
  canvasBackgroundToCss,
  getFirstVisibleSolidPaint,
  normalizedColorToCss,
  resolvePackageAssetSource,
  resolvePackageAxisLimits,
  type PackageAxisLimits,
} from "../../../packages/template-core/src/models/packageRenderValues";

export interface TemplatePackageRenderWarning {
  code: string;
  message: string;
  nodeId?: string;
}

export interface PackageLayoutGaps {
  gap: number;
  rowGap: number | undefined;
  columnGap: number | undefined;
  counterGapSource: "normalized" | "figma" | "gap-fallback" | null;
}

function deduplicateWarnings(
  warnings: TemplatePackageRenderWarning[],
): TemplatePackageRenderWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.code}:${warning.nodeId ?? ""}:${warning.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function figmaMetadata(node: TemplateNode): Record<string, unknown> | null {
  return isRecord(node.extensions?.figma)
    ? node.extensions.figma
    : null;
}

function finiteNonNegative(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
    ? value
    : undefined;
}

export function resolvePackageLayoutGaps(
  node: TemplateNode,
  mode: "static" | "editor",
): PackageLayoutGaps {
  const { gap, rowGap, columnGap } = node.layout;
  if (mode !== "editor" || !node.layout.wrap) {
    return {
      gap,
      rowGap,
      columnGap,
      counterGapSource: null,
    };
  }

  const figma = figmaMetadata(node);
  const rawCounterGap = finiteNonNegative(figma?.counterAxisSpacing);
  const isHorizontal = node.layout.mode === "HORIZONTAL";
  const normalizedCounterGap = isHorizontal ? rowGap : columnGap;
  const counterGap =
    normalizedCounterGap ?? rawCounterGap ?? gap;
  const counterGapSource =
    normalizedCounterGap !== undefined
      ? "normalized"
      : rawCounterGap !== undefined
        ? "figma"
        : "gap-fallback";

  return {
    gap,
    rowGap: isHorizontal ? counterGap : rowGap ?? gap,
    columnGap: isHorizontal ? columnGap ?? gap : counterGap,
    counterGapSource,
  };
}

function normalizeRawFigmaSizing(value: unknown): PackageSizingMode | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  if (normalized === "AUTO") return "HUG";
  return ["FIXED", "HUG", "FILL"].includes(normalized)
    ? (normalized as PackageSizingMode)
    : null;
}

function rawConstraintForAxis(
  figma: Record<string, unknown> | null,
  axis: "horizontal" | "vertical",
): string | null {
  const constraints =
    figma && isRecord(figma.constraints) ? figma.constraints : null;
  const value = constraints?.[axis];
  return typeof value === "string" ? value.toUpperCase() : null;
}

function hasOppositeEdgeConstraint(
  raw: string | null,
  axis: "horizontal" | "vertical",
): boolean {
  const stretchValues =
    axis === "horizontal"
      ? ["STRETCH", "LEFT_RIGHT", "LEFT_AND_RIGHT"]
      : ["STRETCH", "TOP_BOTTOM", "TOP_AND_BOTTOM"];
  return raw !== null && stretchValues.includes(raw);
}

function rawUpperString(
  figma: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = figma?.[key];
  return typeof value === "string" ? value.toUpperCase() : null;
}

export function collectTemplatePackageRenderWarnings(
  packageValue: TemplatePackageV1,
  mode: "static" | "editor" = "static",
): TemplatePackageRenderWarning[] {
  const warnings: TemplatePackageRenderWarning[] = [];

  Object.values(packageValue.nodes).forEach((node: TemplateNode) => {
    const primitiveAppearance = resolvePrimitiveAppearance(node, {
      packageId: packageValue.packageId,
      rootNodeId: packageValue.rootNodeId,
      maskInput: node.mask?.isMask === true,
      hasMaskRelationship: hasPrimitiveMaskRelationship(packageValue, node.id),
      ancestorClipChain: collectPrimitiveAncestorClipChain(packageValue, node),
    });
    if (
      node.appearance.fills.length >= 2 &&
      primitiveAppearance.paints.orderedSolidStack?.capability !==
        "source-certified-ordered-solid-stack" &&
      primitiveAppearance.paints.orderedNormalPaintStack?.capability !==
        "source-certified-solid-linear-normal-stack"
    ) {
      warnings.push({
        code: primitiveAppearance.fallbackReasons[0] ?? "multiple-paint-compatibility-fallback",
        message: `This multiple-paint node uses compatibility rendering: ${primitiveAppearance.fallbackReasons.join(", ") || "unsupported paint combination"}.`,
        nodeId: node.id,
      });
    }
    if (node.type === "TEXT" && node.textFallback) {
      const asset = resolvePackageAssetReference(
        packageValue,
        node.textFallback.assetId,
      )?.asset;
      const editable = packageValue.editableFields.some(
        (field) => field.nodeId === node.id,
      );
      if (!asset || !["svg", "vector"].includes(asset.type)) {
        warnings.push({
          code: "outlined-text-fallback-missing",
          message:
            "This text node declares an outlined SVG fallback, but its vector asset is missing.",
          nodeId: node.id,
        });
      } else if (editable) {
        warnings.push({
          code: "outlined-text-fallback-editable",
          message:
            "Outlined SVG fallback is ignored for editable text so live editing remains possible.",
          nodeId: node.id,
        });
      }
    }
    node.appearance.fills.forEach((paint, sourceIndex) => {
      if (paint.type.startsWith("GRADIENT_")) {
        const gradient = primitiveAppearance.paints.layers.find(
          (layer) => layer.sourceIndex === sourceIndex,
        )?.linearGradient;
        if (!(paint.type === "GRADIENT_LINEAR" &&
            primitiveAppearance.ownership === "primitive-authoritative" &&
            gradient?.capability === "source-certified-linear-gradient")) {
          warnings.push({
            code: paint.type === "GRADIENT_LINEAR"
              ? gradient?.fallbackReason ?? "unsupported-linear-gradient"
              : "unsupported-gradient-family",
            message: paint.type === "GRADIENT_LINEAR"
              ? `Linear gradient uses compatibility rendering: ${gradient?.fallbackReason ?? primitiveAppearance.fallbackReasons[0] ?? "missing canonical information"}.`
              : `${paint.type} remains unsupported.`,
            nodeId: node.id,
          });
        }
      }
      if (paint.type === "IMAGE" && !node.image?.assetId) {
        warnings.push({
          code: "image-fill-without-node-asset",
          message: "An IMAGE fill has no node image asset reference.",
          nodeId: node.id,
        });
      }
    });

    node.appearance.effects
      .filter(
        (effect) =>
          ![
            "DROP_SHADOW",
            "INNER_SHADOW",
            "LAYER_BLUR",
            "BACKGROUND_BLUR",
          ].includes(effect.type),
      )
      .forEach((effect) => {
        warnings.push({
          code: "unsupported-effect",
          message: `Layer effect "${effect.type}" is not supported by the semantic renderer.`,
          nodeId: node.id,
        });
      });

    if (
      node.image?.assetId &&
      !resolvePackageAssetSource(
        resolvePackageAssetReference(packageValue, node.image.assetId)?.asset,
      )
    ) {
      warnings.push({
        code: "missing-image-source",
        message: `Image asset "${node.image.assetId}" has no renderable source.`,
        nodeId: node.id,
      });
    }
    if (
      node.image?.scaleMode &&
      !["FILL", "FIT", "CROP", "TILE", "STRETCH"].includes(
        node.image.scaleMode.toUpperCase(),
      )
    ) {
      warnings.push({
        code: "unsupported-image-scale-mode",
        message: `Image scale mode "${node.image.scaleMode}" is unsupported; the renderer falls back to cover.`,
        nodeId: node.id,
      });
    }
    if (
      Array.isArray(node.image?.imageTransform) &&
      node.image.imageTransform.length > 0 &&
      !(
        node.image.imageTransform.length >= 2 &&
        node.image.imageTransform.slice(0, 2).every(
          (row) =>
            Array.isArray(row) &&
            row.length >= 3 &&
            row.slice(0, 3).every(
              (value) =>
                typeof value === "number" && Number.isFinite(value),
            ),
        )
      )
    ) {
      warnings.push({
        code: "invalid-image-transform",
        message:
          "Figma imageTransform metadata is malformed; scaleMode fallback is used.",
        nodeId: node.id,
      });
    }

    collectPackageVectorCompatibilityIssues(node, packageValue).forEach(
      (issue) => {
        warnings.push({ ...issue, nodeId: node.id });
      },
    );

    const parentLayoutMode: PackageLayoutMode = node.parentId
      ? packageValue.nodes[node.parentId]?.layout.mode ?? "NONE"
      : "NONE";
    const parentNode = node.parentId
      ? packageValue.nodes[node.parentId]
      : undefined;
    const nodeRole = resolvePackageNodeLayoutRole(
      node,
      parentLayoutMode,
      node.id === packageValue.rootNodeId,
    );
    const figma = figmaMetadata(node);
    const rawSizing = {
      horizontal: normalizeRawFigmaSizing(
        figma?.layoutSizingHorizontal,
      ),
      vertical: normalizeRawFigmaSizing(
        figma?.layoutSizingVertical,
      ),
    };
    const axisLimits = {
      horizontal: resolvePackageAxisLimits(node, "horizontal"),
      vertical: resolvePackageAxisLimits(node, "vertical"),
    };
    const layoutGaps = resolvePackageLayoutGaps(node, mode);
    const rawLayoutMode = rawUpperString(figma, "layoutMode");
    const rawPrimaryAlignment = rawUpperString(
      figma,
      "primaryAxisAlignItems",
    );
    const rawCounterAlignment = rawUpperString(
      figma,
      "counterAxisAlignItems",
    );
    const rawCounterContentAlignment = rawUpperString(
      figma,
      "counterAxisAlignContent",
    );
    const clipping = resolvePackageClipping(
      node,
      parentLayoutMode,
      node.id === packageValue.rootNodeId,
      mode,
    );
    const transform = resolvePackageTransform(node);
    collectPackageTextCompatibilityIssues(node).forEach((issue) => {
      warnings.push({
        ...issue,
        nodeId: node.id,
      });
    });
    if (!transform.matrixValid) {
      warnings.push({
        code: "unsupported-transform-matrix",
        message:
          "Transform matrix metadata is malformed; the renderer falls back to any valid rotation or scale metadata.",
        nodeId: node.id,
      });
    }
    if (
      transform.hasTransform &&
      !transform.hasLocalGeometry
    ) {
      warnings.push({
        code: "transformed-bounds-approximation",
        message:
          "This transformed node has no exported unrotated/local dimensions; CSS transforms use the normalized snapshot box as an approximation.",
        nodeId: node.id,
      });
    }
    if (transform.relativeBoundsInconsistent) {
      warnings.push({
        code: "transformed-relative-bounds-inconsistent",
        message:
          "Raw Figma metadata reports relative bounds inconsistent with parent-space bounds; transformed placement may be approximate.",
        nodeId: node.id,
      });
    }

    if (
      rawLayoutMode &&
      !["NONE", "HORIZONTAL", "VERTICAL"].includes(rawLayoutMode)
    ) {
      warnings.push({
        code: "unsupported-auto-layout-mode",
        message: `Raw Figma layout mode "${rawLayoutMode}" is not supported by the semantic renderer.`,
        nodeId: node.id,
      });
    }
    if (mode === "editor" && node.layout.wrap) {
      if (node.layout.mode === "NONE") {
        warnings.push({
          code: "wrap-without-auto-layout",
          message:
            "Wrapping is enabled on a layout.mode NONE node and cannot affect its snapshot-positioned children.",
          nodeId: node.id,
        });
      } else {
        const mainAxis =
          node.layout.mode === "HORIZONTAL"
            ? "horizontal"
            : "vertical";
        const mainLimits = axisLimits[mainAxis];
        const mainAxisBounded =
          node.sizing[mainAxis].mode !== "HUG" ||
          mainLimits.max !== undefined;
        if (!mainAxisBounded) {
          warnings.push({
            code: "wrap-unbounded-main-axis",
            message: `This ${node.layout.mode.toLowerCase()} wrapping container is HUG on its main axis without a maximum dimension, so no reliable wrap threshold exists.`,
            nodeId: node.id,
          });
        }

        const fillChildren = node.children
          .map((childId) => packageValue.nodes[childId])
          .filter(
            (child): child is TemplateNode =>
              Boolean(child) &&
              (typeof child.positioning === "string"
                ? child.positioning
                : child.positioning.mode) !== "ABSOLUTE" &&
              child.sizing[mainAxis].mode === "FILL",
          );
        if (fillChildren.length > 0) {
          warnings.push({
            code: "wrap-fill-child-approximation",
            message: `${fillChildren.length} wrapped FLOW child${fillChildren.length === 1 ? "" : "ren"} use FILL on the main axis; CSS flex line distribution may differ from Figma.`,
            nodeId: node.id,
          });
        }
      }

      if (layoutGaps.counterGapSource === "gap-fallback") {
        warnings.push({
          code: "wrap-counter-gap-fallback",
          message:
            "No normalized or raw counter-axis spacing was exported; editor mode uses the primary gap between wrapped lines.",
          nodeId: node.id,
        });
      }
    }
    if (
      rawPrimaryAlignment &&
      !["MIN", "CENTER", "MAX", "SPACE_BETWEEN"].includes(
        rawPrimaryAlignment,
      )
    ) {
      warnings.push({
        code: "unsupported-auto-layout-primary-alignment",
        message: `Raw Figma primary-axis alignment "${rawPrimaryAlignment}" is not supported.`,
        nodeId: node.id,
      });
    }
    if (
      rawCounterAlignment &&
      !["MIN", "CENTER", "MAX", "STRETCH", "BASELINE"].includes(
        rawCounterAlignment,
      )
    ) {
      warnings.push({
        code: "unsupported-auto-layout-counter-alignment",
        message: `Raw Figma counter-axis alignment "${rawCounterAlignment}" is not supported.`,
        nodeId: node.id,
      });
    }
    if (
      rawCounterContentAlignment &&
      rawCounterContentAlignment !== "AUTO"
    ) {
      warnings.push({
        code: "unsupported-auto-layout-counter-content-alignment",
        message: `Raw Figma wrapped-line alignment "${rawCounterContentAlignment}" is not modeled yet.`,
        nodeId: node.id,
      });
    }
    if (figma?.itemReverseZIndex === true) {
      warnings.push({
        code: "unsupported-auto-layout-reverse-z-index",
        message:
          "Figma itemReverseZIndex is present, but renderer stacking still follows package child order.",
        nodeId: node.id,
      });
    }
    if (
      clipping.normalizedAppearanceClip !== null &&
      clipping.normalizedAppearanceClip !==
        clipping.normalizedLayoutClip
    ) {
      warnings.push({
        code: "normalized-clipping-mismatch",
        message:
          "appearance.clipContent and layout.clipContent disagree; clipping is enabled when either normalized value is true.",
        nodeId: node.id,
      });
    }
    if (
      clipping.rawClipValue !== undefined &&
      clipping.rawClip === null
    ) {
      warnings.push({
        code: "invalid-figma-clips-content",
        message:
          "Raw Figma clipsContent is present but is not boolean and cannot be used.",
        nodeId: node.id,
      });
    }
    if (
      clipping.rawClip !== null &&
      clipping.rawClip !== clipping.normalizedClip
    ) {
      warnings.push({
        code: "figma-clipping-normalization-mismatch",
        message: `Normalized clipping is ${clipping.normalizedClip ? "enabled" : "disabled"}, while raw Figma clipsContent is ${clipping.rawClip ? "enabled" : "disabled"}.${clipping.usesRawEditorFallback ? " Editor mode uses the raw Figma clipping value." : ""}`,
        nodeId: node.id,
      });
    }
    if (clipping.isMask) {
      warnings.push({
        code: "unsupported-figma-mask",
        message: `This node uses a true Figma${clipping.maskType ? ` ${clipping.maskType}` : ""} mask. Mask-chain compositing is unsupported; only ordinary frame clipping is rendered when clipsContent is enabled.`,
        nodeId: node.id,
      });
    }
    if (clipping.shouldBreakMaskChain) {
      warnings.push({
        code: "unsupported-mask-chain-break",
        message:
          "Figma shouldBreakMaskChain is present, but mask-chain grouping is not modeled.",
        nodeId: node.id,
      });
    }
    const stroke = resolvePackageStrokeModel(node, mode);
    if (
      stroke.visibleStrokeCount > 0 &&
      stroke.visibleSolidStrokeCount === 0
    ) {
      warnings.push({
        code: "unsupported-stroke-paint",
        message:
          "This node has visible non-solid strokes that the semantic renderer cannot render yet.",
        nodeId: node.id,
      });
    }
    if (
      stroke.visibleStrokeCount > 1 &&
      stroke.visibleSolidStrokeCount !== stroke.visibleStrokeCount
    ) {
      warnings.push({
        code: "multiple-strokes-approximated",
        message:
          "This node combines solid and unsupported non-solid strokes; only solid stroke layers are rendered.",
        nodeId: node.id,
      });
    }
    if (
      stroke.visibleStrokeCount > 0 &&
      stroke.rawAlignment &&
      !stroke.alignment
    ) {
      warnings.push({
        code: "unsupported-stroke-alignment",
        message: `Stroke alignment "${stroke.rawAlignment}" is unsupported; the renderer falls back to a CSS border.`,
        nodeId: node.id,
      });
    }
    if (
      mode === "editor" &&
      stroke.visibleStrokeCount > 0 &&
      stroke.rawIncludedInLayout !== undefined &&
      typeof stroke.rawIncludedInLayout !== "boolean"
    ) {
      warnings.push({
        code: "invalid-stroke-inclusion-metadata",
        message:
          "Figma strokesIncludedInLayout is present but is not boolean; editor mode keeps the compatibility border fallback.",
        nodeId: node.id,
      });
    }
    if (
      mode === "editor" &&
      stroke.visibleStrokeCount > 0 &&
      stroke.includedInLayout === null
    ) {
      warnings.push({
        code: "stroke-inclusion-metadata-missing",
        message:
          "No strokesIncludedInLayout value was exported; editor mode keeps the compatibility border fallback, which may affect Auto Layout sizing.",
        nodeId: node.id,
      });
    }
    if (
      mode === "static" &&
      stroke.paint &&
      (stroke.alignment === "CENTER" ||
        stroke.alignment === "OUTSIDE")
    ) {
      warnings.push({
        code: "static-stroke-alignment-approximated",
        message: `Static mode preserves its snapshot border contract, so this ${stroke.alignment} stroke is rendered as an inside CSS border.`,
        nodeId: node.id,
      });
    }
    if (
      mode === "static" &&
      stroke.paint &&
      stroke.includedInLayout === false
    ) {
      warnings.push({
        code: "static-stroke-inclusion-approximated",
        message:
          "Static mode preserves its snapshot border contract even though Figma marks this stroke as excluded from layout.",
        nodeId: node.id,
      });
    }
    if (
      mode === "editor" &&
      node.layout.mode === "NONE" &&
      node.type !== "TEXT" &&
      node.children.length > 0 &&
      (node.sizing.horizontal.mode === "HUG" ||
        node.sizing.vertical.mode === "HUG")
    ) {
      warnings.push({
        code: "editor-hug-none-snapshot-fallback",
        message:
          "This HUG layout.mode NONE container has snapshot-positioned children that cannot contribute intrinsic CSS size; editor mode retains its exported HUG-axis bounds.",
        nodeId: node.id,
      });
    }

    for (const axis of ["horizontal", "vertical"] as const) {
      const limits = axisLimits[axis];
      for (const [limit, rawValue] of [
        ["min", limits.rawMin],
        ["max", limits.rawMax],
      ] as const) {
        if (
          rawValue !== undefined &&
          rawValue !== null &&
          finiteNonNegative(rawValue) === undefined
        ) {
          warnings.push({
            code: "invalid-figma-min-max",
            message: `Raw Figma ${axis} ${limit} dimension is not a finite, non-negative number and cannot be applied.`,
            nodeId: node.id,
          });
        }
      }
      if (limits.conflict) {
        warnings.push({
          code: "figma-min-max-conflict",
          message: `Resolved ${axis} minimum exceeds its maximum; conflicting raw fallback values are ignored.`,
          nodeId: node.id,
        });
      }
      if (
        rawSizing[axis] &&
        rawSizing[axis] !== node.sizing[axis].mode &&
        !(
          nodeRole.isAbsolute &&
          rawSizing[axis] === "FILL" &&
          node.sizing[axis].mode === "FIXED"
        )
      ) {
        warnings.push({
          code: `figma-${axis}-sizing-mismatch`,
          message: `Normalized ${axis} sizing ${node.sizing[axis].mode} differs from raw Figma ${rawSizing[axis]}.`,
          nodeId: node.id,
        });
      }
      if (
        nodeRole.isAbsolute &&
        rawSizing[axis] === "FILL" &&
        node.sizing[axis].mode === "FIXED"
      ) {
        warnings.push({
          code: "absolute-raw-fill-normalized-fixed",
          message: `This ABSOLUTE node reports raw Figma FILL on the ${axis} axis but is normalized as FIXED.`,
          nodeId: node.id,
        });
      }
      if (
        nodeRole.isAbsolute &&
        node.sizing[axis].mode === "FILL" &&
        !hasOppositeEdgeConstraint(
          rawConstraintForAxis(figma, axis),
          axis,
        )
      ) {
        warnings.push({
          code: "absolute-fill-without-opposite-edge",
          message: `This ABSOLUTE ${axis} FILL child lacks an opposite-edge stretch constraint; editor mode derives the missing edge from snapshot bounds.`,
          nodeId: node.id,
        });
      }
    }

    const parentMainAxis =
      parentLayoutMode === "HORIZONTAL"
        ? "horizontal"
        : parentLayoutMode === "VERTICAL"
          ? "vertical"
          : null;
    if (
      parentMainAxis &&
      !nodeRole.isAbsolute &&
      typeof figma?.layoutGrow === "number" &&
      figma.layoutGrow > 0 &&
      node.sizing[parentMainAxis].mode === "FIXED"
    ) {
      warnings.push({
        code: "figma-layout-grow-fixed-conflict",
        message: `Raw Figma layoutGrow is ${figma.layoutGrow}, but normalized ${parentMainAxis} sizing is FIXED.`,
        nodeId: node.id,
      });
    }
    if (
      parentMainAxis &&
      !nodeRole.isAbsolute &&
      typeof figma?.layoutGrow === "number" &&
      figma.layoutGrow > 0 &&
      node.sizing[parentMainAxis].mode === "HUG"
    ) {
      warnings.push({
        code: "figma-layout-grow-hug-conflict",
        message: `Raw Figma layoutGrow is ${figma.layoutGrow}, but normalized ${parentMainAxis} sizing is HUG; editor mode preserves HUG sizing.`,
        nodeId: node.id,
      });
    }
    const parentCounterAxis =
      parentMainAxis === "horizontal"
        ? "vertical"
        : parentMainAxis === "vertical"
          ? "horizontal"
          : null;
    if (
      parentCounterAxis &&
      !nodeRole.isAbsolute &&
      String(figma?.layoutAlign).toUpperCase() === "STRETCH" &&
      node.sizing[parentCounterAxis].mode === "FIXED"
    ) {
      warnings.push({
        code: "figma-layout-align-fixed-conflict",
        message: `Raw Figma layoutAlign is STRETCH, but normalized ${parentCounterAxis} sizing is FIXED.`,
        nodeId: node.id,
      });
    }
    if (
      parentCounterAxis &&
      !nodeRole.isAbsolute &&
      String(figma?.layoutAlign).toUpperCase() === "STRETCH" &&
      node.sizing[parentCounterAxis].mode === "HUG"
    ) {
      warnings.push({
        code: "figma-layout-align-hug-conflict",
        message: `Raw Figma layoutAlign is STRETCH, but normalized ${parentCounterAxis} sizing is HUG; editor mode preserves content-driven HUG sizing.`,
        nodeId: node.id,
      });
    }

    if (mode === "editor" && parentNode && nodeRole.isAbsolute) {
      const resolution = resolvePackageAbsoluteConstraints(
        node,
        parentNode.bounds.relative,
        { parentLayoutMode },
      );
      const transformedConstraints =
        resolveTransformedConstraintStyle(transform, resolution);
      transformedConstraints.fallbackAxes.forEach((axis) => {
        warnings.push({
          code: "transformed-constraint-snapshot-fallback",
          message: `The transformed ${axis} axis uses ${resolution[axis].effective} constraints. Editor mode retains snapshot geometry instead of applying axis-aligned resize math.`,
          nodeId: node.id,
        });
      });
      for (const [axis, result] of [
        ["horizontal", resolution.horizontal],
        ["vertical", resolution.vertical],
      ] as const) {
        if (result.stretchSuppressedByHug) {
          warnings.push({
            code: "hug-stretch-constraint-conflict",
            message: `The ${axis} STRETCH constraint conflicts with normalized HUG sizing; editor mode preserves live HUG size and the exported start-edge offset.`,
            nodeId: node.id,
          });
        }
        if (result.overriddenBySizingIntent) {
          warnings.push({
            code:
              result.raw === "SCALE" &&
              node.sizing[axis].mode === "FILL"
                ? "scale-fill-constraint-conflict"
                : "constraint-sizing-conflict",
            message:
              result.raw === "SCALE" &&
              node.sizing[axis].mode === "FILL"
                ? `The ${axis} SCALE constraint conflicts with normalized FILL sizing; editor mode prioritizes FILL and stretches between exported edge offsets.`
                : `The ${axis} constraint "${result.raw}" conflicts with ${result.sizingIntent}/stretch sizing; editor mode uses live stretch sizing from ${result.stretchIntentSource}.`,
            nodeId: node.id,
          });
        }
        if (
          (result.effective === "LEFT_RIGHT" ||
            result.effective === "TOP_BOTTOM") &&
          (result.exportedStartOffset === null ||
            result.exportedEndOffset === null)
        ) {
          warnings.push({
            code: "invalid-stretch-edge-offsets",
            message: `The ${axis} STRETCH constraint could not derive safe exported edge offsets; snapshot geometry is retained and contained.`,
            nodeId: node.id,
          });
        }
        const limits = axisLimits[axis];
        if (
          (result.effective === "LEFT_RIGHT" ||
            result.effective === "TOP_BOTTOM") &&
          limits.max !== undefined
        ) {
          warnings.push({
            code: "absolute-stretch-max-ambiguous",
            message: `This ABSOLUTE ${axis} stretch also has a maximum dimension; CSS clamps the live size but cannot preserve both exported edge offsets after the clamp.`,
            nodeId: node.id,
          });
        }
        if (
          result.effective === "SCALE" &&
          node.sizing[axis].mode === "HUG"
        ) {
          warnings.push({
            code: "absolute-scale-hug-ambiguous",
            message: `This ABSOLUTE ${axis} axis combines SCALE with HUG sizing; editor mode scales snapshot geometry because content-driven scaling is ambiguous.`,
            nodeId: node.id,
          });
        }
      }
    }
    if (
      mode === "editor" &&
      isEditorLiveResizableConstraintContainer(
        node,
        parentLayoutMode,
        node.id === packageValue.rootNodeId,
      )
    ) {
      if (
        !node.appearance.clipContent &&
        !node.layout.clipContent
      ) {
        warnings.push({
          code: "editor-live-resize-contained",
          message:
            "Editor mode clips this resizable FILL container so unresolved snapshot-positioned children cannot overlap following FLOW siblings.",
          nodeId: node.id,
        });
      }

      let missingConstraintCount = 0;
      const visited = new Set<string>();
      const inspectConstraintSubtree = (parent: TemplateNode) => {
        if (visited.has(parent.id)) return;
        visited.add(parent.id);
        parent.children
          .map((childId) => packageValue.nodes[childId])
          .filter((child): child is TemplateNode => Boolean(child))
          .forEach((child) => {
            const childRole = resolvePackageNodeLayoutRole(
              child,
              parent.layout.mode,
            );
            if (childRole.isAbsolute) {
              const resolution = resolvePackageAbsoluteConstraints(
                child,
                parent.bounds.relative,
                { parentLayoutMode: parent.layout.mode },
              );
              for (const [axis, result] of [
                ["horizontal", resolution.horizontal],
                ["vertical", resolution.vertical],
              ] as const) {
                if (!result.raw) {
                  missingConstraintCount += 1;
                } else if (!result.supported) {
                  warnings.push({
                    code: "unsupported-figma-constraint",
                    message: `The ${axis} constraint "${result.raw}" is unsupported; snapshot geometry is retained and contained.`,
                    nodeId: child.id,
                  });
                }
              }

              const bounds = child.bounds.relative;
              const exceedsSnapshotParent =
                bounds.x < 0 ||
                bounds.y < 0 ||
                bounds.x + bounds.width > parent.bounds.relative.width ||
                bounds.y + bounds.height > parent.bounds.relative.height;
              if (
                exceedsSnapshotParent &&
                !resolution.horizontal.overriddenBySizingIntent &&
                !resolution.vertical.overriddenBySizingIntent
              ) {
                warnings.push({
                  code: "absolute-child-exceeds-live-parent",
                  message:
                    "An absolute child already exceeds its parent snapshot and may remain larger than a resized live parent.",
                  nodeId: child.id,
                });
              }
            }
            inspectConstraintSubtree(child);
          });
      };
      inspectConstraintSubtree(node);
      if (missingConstraintCount > 0) {
        warnings.push({
          code: "missing-absolute-constraints",
          message: `${missingConstraintCount} absolute child axis${missingConstraintCount === 1 ? "" : "es"} lack Figma constraints; snapshot geometry is retained inside the clipped live container.`,
          nodeId: node.id,
        });
      }
    }
  });

  return deduplicateWarnings(warnings);
}

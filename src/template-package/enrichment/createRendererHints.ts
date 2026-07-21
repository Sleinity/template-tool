import type {
  PackageTextPayload,
  RendererHint,
  TemplateNode,
  TemplatePackageV1,
} from "../types";

function numericMeasurement(
  measurement: PackageTextPayload["lineHeight"],
  fontSize: number,
  fallback: number,
): number {
  if (!measurement || measurement.value === null) return fallback;
  const unit = measurement.unit.toUpperCase();
  if (unit.includes("PERCENT")) {
    return (fontSize * measurement.value) / 100;
  }
  return measurement.value;
}

function textHint(
  node: Extract<TemplateNode, { type: "TEXT" }>,
  packageValue: TemplatePackageV1,
): RendererHint {
  const field = packageValue.editableFields.find(
    (candidate) => candidate.nodeId === node.id,
  );
  if ("content" in node.text) {
    return {
      kind: "text",
      valueSource: field ? "editableField" : "static",
      fieldId: field?.id,
      fontFamily: node.text.style.fontFamily,
      fontWeight: node.text.style.fontWeight ?? 400,
      fontSize: node.text.style.fontSize,
      lineHeightPx:
        node.text.style.lineHeight ?? node.text.style.fontSize * 1.2,
      letterSpacingPx: node.text.style.letterSpacing ?? 0,
      alignHorizontal:
        node.text.style.textAlignHorizontal?.toLowerCase() === "center"
          ? "center"
          : node.text.style.textAlignHorizontal?.toLowerCase() === "right"
            ? "right"
            : "left",
      alignVertical:
        node.text.style.textAlignVertical?.toLowerCase() === "center"
          ? "center"
          : node.text.style.textAlignVertical?.toLowerCase() === "bottom"
            ? "bottom"
            : "top",
      autoResize:
        node.text.style.textAutoResize === "WIDTH_AND_HEIGHT"
          ? "widthAndHeight"
          : node.text.style.textAutoResize === "HEIGHT"
            ? "height"
            : "none",
    };
  }

  const fontSize = node.text.fontSize ?? 16;
  const letterSpacing = numericMeasurement(
    node.text.letterSpacing,
    fontSize,
    0,
  );
  return {
    kind: "text",
    valueSource: field ? "editableField" : "static",
    fieldId: field?.id,
    fontFamily: node.text.fontFamily ?? "sans-serif",
    fontWeight: node.text.fontWeight ?? 400,
    fontSize,
    lineHeightPx: numericMeasurement(
      node.text.lineHeight,
      fontSize,
      fontSize * 1.2,
    ),
    letterSpacingPx: letterSpacing,
    alignHorizontal:
      node.text.textAlignHorizontal?.toUpperCase() === "CENTER"
        ? "center"
        : node.text.textAlignHorizontal?.toUpperCase() === "RIGHT"
          ? "right"
          : "left",
    alignVertical:
      node.text.textAlignVertical?.toUpperCase() === "CENTER"
        ? "center"
        : node.text.textAlignVertical?.toUpperCase() === "BOTTOM"
          ? "bottom"
          : "top",
    autoResize:
      node.text.textAutoResize?.toUpperCase() === "WIDTH_AND_HEIGHT"
        ? "widthAndHeight"
        : node.text.textAutoResize?.toUpperCase() === "HEIGHT"
          ? "height"
          : "none",
  };
}

function imageFit(scaleMode: string | undefined): "cover" | "contain" | "fill" {
  if (scaleMode === "FIT") return "contain";
  if (scaleMode === "STRETCH") return "fill";
  return "cover";
}

export function createRendererHints(
  packageValue: TemplatePackageV1,
): Record<string, RendererHint> {
  const hints: Record<string, RendererHint> = {};

  Object.values(packageValue.nodes).forEach((node) => {
    if (node.type === "TEXT") {
      hints[node.id] = textHint(node, packageValue);
      return;
    }
    if (node.image?.assetId) {
      const scaleMode =
        node.image.scaleMode ??
        packageValue.assets[node.image.assetId]?.scaleMode;
      hints[node.id] = {
        kind: "image",
        assetId: node.image.assetId,
        objectFit: imageFit(scaleMode),
        figmaScaleMode: scaleMode,
        imageTransform: node.image.imageTransform,
        cropMode: node.image.imageTransform
          ? "figmaImageTransform"
          : "objectFitOnly",
      };
      return;
    }
    if (node.vector?.assetId) {
      hints[node.id] = {
        kind: "svg",
        assetId: node.vector.assetId,
        viewBox:
          typeof node.vector.viewBox === "object" && node.vector.viewBox
            ? node.vector.viewBox
            : undefined,
        preserveAspectRatio: node.vector.preserveAspectRatio,
      };
      return;
    }
    if (
      ["FRAME", "GROUP", "COMPONENT", "INSTANCE", "RECTANGLE"].includes(
        node.type,
      )
    ) {
      hints[node.id] = {
        kind: "frame",
        display: node.positioning === "ABSOLUTE" ? "absolute" : "flow",
        layoutMode: node.layout.mode.toLowerCase() as
          | "none"
          | "horizontal"
          | "vertical",
        clipContent:
          node.appearance.clipContent ?? node.layout.clipContent,
        background: node.appearance.fills[0],
      };
    }
  });

  return hints;
}

import type { CSSProperties } from "react";
import type {
  PackageTextPayloadV0,
  PackageTextPayload,
  TemplateNode,
} from "../types";

export interface PackageTextStyleModel {
  content: string;
  style: CSSProperties;
  paragraphSpacing: number;
}

export interface PackageTextCompatibilityIssue {
  code: string;
  message: string;
}

function normalizedUpper(value: unknown): string | null {
  return typeof value === "string" ? value.toUpperCase() : null;
}

function cssFontStyle(value: string | null | undefined): CSSProperties["fontStyle"] {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("italic")) return "italic";
  if (normalized.includes("oblique")) return "oblique";
  return "normal";
}

function inferredFontWeight(
  style: string | null | undefined,
): number | undefined {
  const normalized = style?.toLowerCase().replace(/[\s_-]/g, "") ?? "";
  if (normalized.includes("thin")) return 100;
  if (normalized.includes("extralight") || normalized.includes("ultralight")) {
    return 200;
  }
  if (normalized.includes("light")) return 300;
  if (normalized.includes("medium")) return 500;
  if (normalized.includes("semibold") || normalized.includes("demibold")) {
    return 600;
  }
  if (normalized.includes("extrabold") || normalized.includes("ultrabold")) {
    return 800;
  }
  if (normalized.includes("black") || normalized.includes("heavy")) return 900;
  if (normalized.includes("bold")) return 700;
  if (normalized.includes("regular") || normalized.includes("normal")) return 400;
  return undefined;
}

function lineHeightValue(
  measurement: PackageTextPayload["lineHeight"],
): CSSProperties["lineHeight"] {
  if (!measurement) return undefined;
  const unit = normalizedUpper(measurement.unit);
  if (unit === "AUTO") return "normal";
  if (measurement.value === null) return undefined;
  if (unit === "PERCENT" || unit === "PERCENTAGE") {
    return `${measurement.value}%`;
  }
  if (unit === "PIXELS" || unit === "PIXEL" || unit === "PX") {
    return `${measurement.value}px`;
  }
  return undefined;
}

function textAlignValue(
  value: string | null | undefined,
): CSSProperties["textAlign"] {
  const normalized = normalizedUpper(value);
  if (normalized === "LEFT") return "left";
  if (normalized === "CENTER") return "center";
  if (normalized === "RIGHT") return "right";
  if (normalized === "JUSTIFIED" || normalized === "JUSTIFY") {
    return "justify";
  }
  return undefined;
}

function letterSpacingValue(
  measurement: PackageTextPayload["letterSpacing"],
): CSSProperties["letterSpacing"] {
  if (!measurement || measurement.value === null) return undefined;
  const unit = normalizedUpper(measurement.unit);
  if (unit === "PERCENT" || unit === "PERCENTAGE") {
    return `${measurement.value / 100}em`;
  }
  if (unit === "PIXELS" || unit === "PIXEL" || unit === "PX") {
    return `${measurement.value}px`;
  }
  return undefined;
}

function textTransformValue(
  value: string | null | undefined,
): CSSProperties["textTransform"] {
  const normalized = normalizedUpper(value);
  if (!normalized || normalized === "ORIGINAL" || normalized === "NONE") {
    return "none";
  }
  if (normalized === "UPPER") return "uppercase";
  if (normalized === "LOWER") return "lowercase";
  if (normalized === "TITLE") return "capitalize";
  return undefined;
}

function textDecorationValue(
  value: string | null | undefined,
): CSSProperties["textDecorationLine"] {
  const normalized = normalizedUpper(value);
  if (!normalized || normalized === "NONE") return "none";
  if (normalized === "UNDERLINE") return "underline";
  if (
    normalized === "STRIKETHROUGH" ||
    normalized === "STRIKE_THROUGH"
  ) {
    return "line-through";
  }
  return undefined;
}

export function resolvePackageTextStyle(
  text: PackageTextPayload | PackageTextPayloadV0,
): PackageTextStyleModel {
  if ("characters" in text) {
    return {
      content: text.characters,
      paragraphSpacing:
        typeof text.paragraphSpacing === "number" &&
        Number.isFinite(text.paragraphSpacing) &&
        text.paragraphSpacing > 0
          ? text.paragraphSpacing
          : 0,
      style: {
        fontFamily: text.fontFamily ?? undefined,
        fontStyle: cssFontStyle(text.fontStyle),
        fontWeight:
          text.fontWeight ??
          inferredFontWeight(text.fontStyle),
        fontSize: text.fontSize ?? undefined,
        lineHeight: lineHeightValue(text.lineHeight),
        letterSpacing: letterSpacingValue(text.letterSpacing),
        textAlign: textAlignValue(text.textAlignHorizontal),
        textTransform: textTransformValue(text.textCase),
        textDecorationLine: textDecorationValue(text.textDecoration),
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
        wordWrap: "break-word",
      },
    };
  }

  return {
    content: text.content,
    paragraphSpacing: 0,
    style: {
      fontFamily: text.style.fontFamily,
      fontStyle: text.style.fontStyle,
      fontWeight: text.style.fontWeight,
      fontSize: text.style.fontSize,
      lineHeight: text.style.lineHeight
        ? `${text.style.lineHeight}px`
        : undefined,
      letterSpacing: text.style.letterSpacing,
      textAlign: text.style.textAlignHorizontal?.toLowerCase() as CSSProperties["textAlign"],
      whiteSpace: "pre-wrap",
      overflowWrap: "break-word",
      wordWrap: "break-word",
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function collectPackageTextCompatibilityIssues(
  node: TemplateNode,
): PackageTextCompatibilityIssue[] {
  if (node.type !== "TEXT" || !("characters" in node.text)) return [];

  const issues: PackageTextCompatibilityIssue[] = [];
  const text = node.text;
  const figma = isRecord(node.extensions?.figma)
    ? node.extensions.figma
    : null;
  const lineHeightUnit = normalizedUpper(text.lineHeight?.unit);
  const letterSpacingUnit = normalizedUpper(text.letterSpacing?.unit);
  const textCase = normalizedUpper(text.textCase);
  const textDecoration = normalizedUpper(text.textDecoration);
  const autoResize = normalizedUpper(text.textAutoResize);

  if (
    lineHeightUnit &&
    !["AUTO", "PERCENT", "PERCENTAGE", "PIXELS", "PIXEL", "PX"].includes(
      lineHeightUnit,
    )
  ) {
    issues.push({
      code: "unsupported-text-line-height-unit",
      message: `Text line-height unit "${lineHeightUnit}" is unsupported.`,
    });
  }
  if (
    letterSpacingUnit &&
    !["PERCENT", "PERCENTAGE", "PIXELS", "PIXEL", "PX"].includes(
      letterSpacingUnit,
    )
  ) {
    issues.push({
      code: "unsupported-text-letter-spacing-unit",
      message: `Text letter-spacing unit "${letterSpacingUnit}" is unsupported.`,
    });
  }
  if (
    textCase &&
    !["ORIGINAL", "NONE", "UPPER", "LOWER", "TITLE"].includes(textCase)
  ) {
    issues.push({
      code: "unsupported-text-case",
      message: `Figma text case "${textCase}" is unsupported.`,
    });
  }
  if (
    textDecoration &&
    !["NONE", "UNDERLINE", "STRIKETHROUGH", "STRIKE_THROUGH"].includes(
      textDecoration,
    )
  ) {
    issues.push({
      code: "unsupported-text-decoration",
      message: `Figma text decoration "${textDecoration}" is unsupported.`,
    });
  }
  if (
    text.fontWeight === null &&
    inferredFontWeight(text.fontStyle) === undefined
  ) {
    issues.push({
      code: "text-font-weight-unresolved",
      message:
        "No numeric font weight was exported and the Figma face name does not imply one.",
    });
  }
  if (autoResize === "WIDTH_AND_HEIGHT") {
    if (
      node.sizing.horizontal.mode !== "HUG" ||
      node.sizing.vertical.mode !== "HUG"
    ) {
      issues.push({
        code: "text-auto-resize-sizing-mismatch",
        message:
          "textAutoResize WIDTH_AND_HEIGHT does not match normalized HUG sizing on both axes; normalized sizing remains authoritative.",
      });
    }
  } else if (autoResize === "HEIGHT") {
    if (node.sizing.vertical.mode !== "HUG") {
      issues.push({
        code: "text-auto-resize-sizing-mismatch",
        message:
          "textAutoResize HEIGHT does not match normalized vertical HUG sizing; normalized sizing remains authoritative.",
      });
    }
  } else if (
    autoResize &&
    !["NONE", "WIDTH_AND_HEIGHT", "HEIGHT", "TRUNCATE"].includes(autoResize)
  ) {
    issues.push({
      code: "unsupported-text-auto-resize",
      message: `Figma textAutoResize "${autoResize}" is unsupported.`,
    });
  }
  if (autoResize === "TRUNCATE") {
    issues.push({
      code: "text-truncation-approximated",
      message:
        "Figma text truncation is not fully modeled; the normalized text box and clipping behavior remain authoritative.",
    });
  }

  const hasMixedStyleEvidence =
    figma?.hasMixedTextStyles === true ||
    (Array.isArray(figma?.textStyleRanges) &&
      figma.textStyleRanges.length > 1) ||
    (Array.isArray(figma?.styledTextSegments) &&
      figma.styledTextSegments.length > 1) ||
    (Array.isArray(figma?.characterStyleOverrides) &&
      figma.characterStyleOverrides.length > 0);
  if (hasMixedStyleEvidence) {
    issues.push({
      code: "unsupported-mixed-text-styles",
      message:
        "Mixed text style ranges are present, but this renderer applies one text style to the full node.",
    });
  }

  for (const [key, label] of [
    ["paragraphIndent", "paragraph indentation"],
    ["listSpacing", "list spacing"],
    ["hangingPunctuation", "hanging punctuation"],
  ] as const) {
    const value = figma?.[key];
    if (
      value !== undefined &&
      value !== null &&
      value !== false &&
      value !== 0
    ) {
      issues.push({
        code: `unsupported-text-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
        message: `Figma ${label} is present but is not modeled.`,
      });
    }
  }

  return issues;
}

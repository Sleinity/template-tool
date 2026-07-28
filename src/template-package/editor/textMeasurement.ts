import type { EditableFieldBinding } from "../types";
import {
  createTextFitResult,
  type FieldTextFitResult,
} from "../../../packages/template-core/src/editor/fieldConstraints";

export type TextLineMeasure = (value: string) => number | null;

function renderedNode(
  root: ParentNode | null | undefined,
  field: EditableFieldBinding,
): HTMLElement | null {
  if (!root || typeof CSS === "undefined") return null;
  return root.querySelector<HTMLElement>(
    `[data-package-node-id="${CSS.escape(field.nodeId)}"]`,
  );
}

export function measureRenderedTextLines(
  root: ParentNode | null | undefined,
  field: EditableFieldBinding,
  value: string,
): number | null {
  if (typeof document === "undefined") return null;
  const source = renderedNode(root, field);
  if (!source || source.clientWidth <= 0) return null;
  const computed = getComputedStyle(source);
  const mirror = document.createElement("div");
  Object.assign(mirror.style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${source.clientWidth}px`,
    height: "auto",
    minHeight: "0",
    maxHeight: "none",
    boxSizing: computed.boxSizing,
    padding: computed.padding,
    border: "0",
    margin: "0",
    visibility: "hidden",
    pointerEvents: "none",
    overflow: "visible",
    display: "block",
    fontFamily: computed.fontFamily,
    fontStyle: computed.fontStyle,
    fontWeight: computed.fontWeight,
    fontSize: computed.fontSize,
    fontVariant: computed.fontVariant,
    lineHeight: computed.lineHeight,
    letterSpacing: computed.letterSpacing,
    textTransform: computed.textTransform,
    textAlign: computed.textAlign,
    textIndent: computed.textIndent,
    whiteSpace: computed.whiteSpace,
    wordBreak: computed.wordBreak,
    overflowWrap: computed.overflowWrap,
  });
  mirror.textContent = value || "\u200b";
  document.body.appendChild(mirror);
  try {
    const range = document.createRange();
    range.selectNodeContents(mirror);
    const tops = Array.from(range.getClientRects())
      .filter((rect) => rect.height > 0)
      .map((rect) => rect.top)
      .sort((left, right) => left - right)
      .filter((top, index, values) => index === 0 || Math.abs(top - values[index - 1]) > 0.5);
    if (tops.length > 0) return tops.length;
    const lineHeight = Number.parseFloat(computed.lineHeight);
    return Number.isFinite(lineHeight) && lineHeight > 0
      ? Math.max(1, Math.ceil(mirror.scrollHeight / lineHeight))
      : Math.max(1, value.split(/\r?\n/).length);
  } finally {
    mirror.remove();
  }
}

export function createRenderedTextLineMeasure(
  root: ParentNode | null | undefined,
  field: EditableFieldBinding,
): TextLineMeasure {
  return (value) => measureRenderedTextLines(root, field, value);
}

export function measureTextFieldFit(
  field: EditableFieldBinding,
  root: ParentNode,
  fontReliable: boolean,
): FieldTextFitResult | null {
  if (!["text", "textarea", "number", "date"].includes(field.type)) return null;
  if (typeof CSS === "undefined" || typeof document === "undefined") return null;
  const element = root.querySelector<HTMLElement>(
    `[data-package-node-id="${CSS.escape(field.nodeId)}"]`,
  );
  if (!element) return null;
  const computed = getComputedStyle(element);
  const lineHeightPx = Number.parseFloat(computed.lineHeight);
  const range = document.createRange();
  range.selectNodeContents(element);
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 || rect.height > 0,
  );
  const visualOverflowPx = {
    x: Math.max(0, element.scrollWidth - element.clientWidth),
    y: element.dataset.packageHugTextMeasured !== undefined
      ? 0
      : Math.max(0, element.scrollHeight - element.clientHeight),
  };
  const measuredLines = rects.length > 0
    ? Math.max(
        1,
        rects
          .map((rect) => rect.top)
          .sort((left, right) => left - right)
          .filter(
            (top, index, values) =>
              index === 0 || Math.abs(top - values[index - 1]) > 0.5,
          ).length,
      )
    : undefined;
  range.detach();
  return createTextFitResult(
    field,
    {
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      lineHeightPx: Number.isFinite(lineHeightPx) ? lineHeightPx : 0,
      measuredLines,
      visualOverflowPx,
    },
    fontReliable,
  );
}

/** Mounted-node inputs only. This is neither a settlement nor publication identity. */
const typography = [
  "fontFamily", "fontStyle", "fontWeight", "fontSize", "lineHeight", "letterSpacing",
  "wordSpacing", "fontVariant", "fontFeatureSettings", "fontVariationSettings",
  "fontKerning", "fontStretch", "textTransform", "textIndent", "whiteSpace",
  "wordBreak", "overflowWrap", "direction", "writingMode", "tabSize",
] as const;
const boxProperties = [
  ...typography, "display", "boxSizing", "width", "minWidth", "maxWidth",
  "height", "minHeight", "maxHeight", "paddingTop", "paddingRight",
  "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth",
  "borderBottomWidth", "borderLeftWidth", "overflowX", "overflowY",
] as const;
const pick = (style: CSSStyleDeclaration, names: readonly string[]) => names.map(name => style[name as keyof CSSStyleDeclaration]);

export function textMeasurementInputKey(inputs: unknown): string {
  // Canonical/resolved data preserve complete runs, property presence and order.
  return JSON.stringify(inputs);
}

export function readMountedTextMeasurementInputs(box: HTMLElement, paint: HTMLElement): string | null {
  if (!box.isConnected || !paint.isConnected) return null;
  const canvas = box.closest<HTMLElement>("[data-template-package-canvas]");
  if (!canvas) return null;
  const bounds = canvas.getBoundingClientRect(), canvasStyle = getComputedStyle(canvas);
  const width = Number.parseFloat(canvasStyle.width), height = Number.parseFloat(canvasStyle.height);
  if (![width, height, bounds.width, bounds.height].every(value => Number.isFinite(value) && value > 0)) return null;
  const boxStyle = getComputedStyle(box);
  const transforms: string[] = [];
  for (let element: HTMLElement | null = box; element; element = element.parentElement) {
    const computed = element === box ? boxStyle : element === canvas ? canvasStyle : getComputedStyle(element);
    transforms.push(computed.transform, computed.zoom);
    if (element === canvas) break;
  }
  return JSON.stringify({
    text: paint.textContent,
    constraints: [box.clientWidth, box.clientHeight],
    box: pick(boxStyle, boxProperties),
    runs: [paint, ...paint.querySelectorAll<HTMLElement>("*")].map(element => ({
      tag: element.tagName, text: element.textContent, style: pick(getComputedStyle(element), typography),
    })),
    scale: [bounds.width / width, bounds.height / height],
    transforms,
  });
}

export function canReuseTextMeasurement(previousKey: string, currentKey: string, previousInputs: string | null, currentInputs: string | null): boolean {
  return previousKey === currentKey && previousInputs !== null && currentInputs !== null && previousInputs === currentInputs;
}

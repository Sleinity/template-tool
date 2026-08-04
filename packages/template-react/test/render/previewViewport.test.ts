import {
  expandPreviewBounds,
  fitPreviewBounds,
  preservePreviewCenterOnResize,
  previewVisibleCenter,
  resolveInspectionTargetBounds,
  unionPreviewBounds,
  zoomPreviewAtPoint,
} from "../../src/render/previewViewport";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function near(left: number, right: number, tolerance = 0.001): boolean {
  return Math.abs(left - right) <= tolerance;
}

const viewport = { width: 800, height: 600 };
const template = { x: 0, y: 0, width: 1920, height: 1080 };
const templateFit = fitPreviewBounds(viewport, template, { safePadding: 24 });
assert(
  near(templateFit.translateX + 960 * templateFit.scale, 400) &&
    near(templateFit.translateY + 540 * templateFit.scale, 300),
  "Fit template should centre the root bounds in the full viewport.",
);
assert(
  templateFit.translateX >= 24 - 0.001 &&
    templateFit.translateY >= 24 - 0.001 &&
    templateFit.translateX + template.width * templateFit.scale <= 776.001 &&
    templateFit.translateY + template.height * templateFit.scale <= 576.001,
  "Fit template should contain the full root inside safe viewport padding.",
);

for (const [name, bounds, host] of [
  ["wide", { x: 0, y: 0, width: 2400, height: 400 }, { width: 720, height: 480 }],
  ["tall", { x: 0, y: 0, width: 400, height: 2400 }, { width: 720, height: 480 }],
  ["square", { x: 0, y: 0, width: 900, height: 900 }, { width: 480, height: 720 }],
  ["small", { x: 0, y: 0, width: 24, height: 16 }, { width: 320, height: 240 }],
] as const) {
  const fit = fitPreviewBounds(host, bounds, { safePadding: 26 });
  const left = fit.translateX;
  const top = fit.translateY;
  const right = host.width - (fit.translateX + bounds.width * fit.scale);
  const bottom = host.height - (fit.translateY + bounds.height * fit.scale);
  assert(
    Math.min(left, right, top, bottom) >= 26 - 0.001 &&
      near(
        (bounds.width * fit.scale) / (bounds.height * fit.scale),
        bounds.width / bounds.height,
      ),
    `${name} templates should remain centred, proportional, and fully visible after fitting.`,
  );
}

const target = { x: 1500, y: 760, width: 180, height: 120 };
const paddedTarget = expandPreviewBounds(target, 0.18, 24);
const targetFit = fitPreviewBounds(viewport, paddedTarget, { safePadding: 24 });
assert(
  near(
    targetFit.translateX + (paddedTarget.x + paddedTarget.width / 2) * targetFit.scale,
    viewport.width / 2,
  ) &&
    near(
      targetFit.translateY + (paddedTarget.y + paddedTarget.height / 2) * targetFit.scale,
      viewport.height / 2,
    ),
  "Fit target should centre a target near the template edge with contextual padding.",
);

const tinyTargetFit = fitPreviewBounds(
  viewport,
  expandPreviewBounds({ x: 20, y: 20, width: 1, height: 1 }),
  { maximumScale: 4 },
);
assert(
  tinyTargetFit.scale === 4,
  "Tiny targets should respect the maximum inspection zoom.",
);

const largeTarget = expandPreviewBounds({ x: -100, y: -80, width: 2200, height: 1300 });
const largeTargetFit = fitPreviewBounds(viewport, largeTarget, { safePadding: 24 });
assert(
  largeTarget.width * largeTargetFit.scale <= viewport.width - 48 + 0.001 &&
    largeTarget.height * largeTargetFit.scale <= viewport.height - 48 + 0.001,
  "Large and out-of-root targets should remain fully visible.",
);

const templateCentre = { x: template.width / 2, y: template.height / 2 };
const zoomedTemplate = zoomPreviewAtPoint(
  viewport,
  templateFit,
  templateCentre,
  1.25,
);
assert(
  near(zoomedTemplate.translateX + templateCentre.x * zoomedTemplate.scale, 400) &&
    near(zoomedTemplate.translateY + templateCentre.y * zoomedTemplate.scale, 300),
  "Zoom should retain the template centre instead of anchoring to the upper-left.",
);

const targetCentre = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
const zoomedTarget = zoomPreviewAtPoint(viewport, targetFit, targetCentre, 1.25);
assert(
  near(zoomedTarget.translateX + targetCentre.x * zoomedTarget.scale, 400) &&
    near(zoomedTarget.translateY + targetCentre.y * zoomedTarget.scale, 300),
  "Zoom should retain the selected target centre while leaving target mode.",
);

const resized = preservePreviewCenterOnResize(
  viewport,
  { width: 620, height: 720 },
  zoomedTarget,
);
assert(
  near(previewVisibleCenter(viewport, zoomedTarget).x, previewVisibleCenter({ width: 620, height: 720 }, resized).x) &&
    near(previewVisibleCenter(viewport, zoomedTarget).y, previewVisibleCenter({ width: 620, height: 720 }, resized).y),
  "Manual viewport resize should preserve the visible template-coordinate centre.",
);

const union = unionPreviewBounds([
  { x: 10, y: 20, width: 50, height: 40 },
  { x: 100, y: 5, width: 30, height: 80 },
]);
assert(
  union?.x === 10 && union.y === 5 && union.width === 120 && union.height === 80,
  "Multiple affected targets should fit using their authoritative union bounds.",
);
const semanticTextTarget = resolveInspectionTargetBounds(
  { left: 140, top: 80, width: 600, height: 240 },
  { left: 100, top: 40 },
  { x: 2, y: 2 },
  { trimAuthority: "authoritative", trimmedBox: "300,93.125" },
);
assert(
  semanticTextTarget.x === 20 && semanticTextTarget.y === 20 &&
    semanticTextTarget.width === 300 && semanticTextTarget.height === 93.125,
  "Inspection outlines must select the semantic Figma trimmed box instead of the browser line or wrapper height.",
);

import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import {
  createSavedTemplateRecord,
  InMemoryTemplateRepository,
} from "../persistence";
import { validateTemplatePackage } from "../validateTemplatePackage";
import type { TemplatePackageV1 } from "../types";
import {
  evaluatePackageMotion,
  getPackageMotionSummary,
  linkPackageMotionJson,
  linkPackageMotionValue,
  normalizePackageMotionFieldName,
  packageMotionTransformToCss,
} from "./packageMotion";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${String(expected)}, received ${String(actual)}.`);
  }
}

function assertNear(actual: number, expected: number, message: string): void {
  if (Math.abs(actual - expected) > 0.01) {
    throw new Error(`${message} Expected ${expected}, received ${actual}.`);
  }
}

const fixturePackage = figmaPluginV041 as unknown as TemplatePackageV1;
const targetNodeId = fixturePackage.rootNodeId;
const targetNode = fixturePackage.nodes[targetNodeId];

assertEqual(
  normalizePackageMotionFieldName("motionTranslationY@-1:-1"),
  "translateY",
  "Figma Motion suffixed fields should normalize to runtime fields.",
);
assertEqual(
  normalizePackageMotionFieldName("motionOpacity@-1:-1"),
  "opacity",
  "Opacity fields should normalize to the runtime opacity channel.",
);
assertEqual(
  normalizePackageMotionFieldName("motionRotation@-1:-1"),
  "rotation",
  "Rotation fields should normalize to the runtime rotation channel.",
);

const validMotionJson = JSON.stringify({
  version: 1,
  playbackStyle: "loop",
  nodes: [
    {
      node: targetNodeId,
      timelineDurationMs: 3000,
      fields: [
        {
          field: "motionTranslationX@-1:-1",
          keyframes: [
            { timeMs: 0, value: targetNode.bounds.relative.x },
            { timeMs: 1000, value: targetNode.bounds.relative.x + 120 },
          ],
        },
        {
          field: "motionScaleX@-1:-1",
          keyframes: [
            { timeMs: 0, value: 1 },
            { timeMs: 1000, value: 1.2 },
          ],
        },
      ],
    },
  ],
});

const validMotionObject = {
  version: 1,
  playbackStyle: "loop",
  nodes: [
    {
      node: targetNodeId,
      timelineDurationMs: 4000,
      fields: [
        {
          field: "motionTranslationY@-1:-1",
          keyframes: [
            { timeMs: 1000, value: targetNode.bounds.relative.y + 40 },
            { timeMs: 0, value: targetNode.bounds.relative.y },
          ],
        },
      ],
    },
  ],
};

const linked = linkPackageMotionJson(
  fixturePackage,
  validMotionJson,
  "fixture-motion.json",
);

assert(linked.packageValue.motion, "Valid Motion JSON should attach to package.");
assertEqual(
  linked.packageValue.motion?.sourceName,
  "fixture-motion.json",
  "Linked motion should preserve the source file name.",
);
assertEqual(
  linked.summary.matchedNodeIds[0],
  targetNodeId,
  "Motion linker should match package node IDs.",
);
assertEqual(
  validateTemplatePackage(linked.packageValue).valid,
  true,
  "Package with linked motion should remain schema-valid.",
);

const linkedFromObject = linkPackageMotionValue(
  fixturePackage,
  validMotionObject,
  "fixture-motion-object.json",
);
assert(
  linkedFromObject.packageValue.motion,
  "Already parsed Motion JSON should attach to the package without file-wrapper metadata.",
);
assert(
  !linkedFromObject.diagnostics.some(
    (item) =>
      item.code === "motion.version-missing" ||
      item.code === "motion.nodes-missing",
  ),
  "Object-based linking should validate the actual Motion JSON object.",
);
assertEqual(
  linkedFromObject.summary.animatedNodeCount,
  1,
  "Object-based Motion JSON should link animated nodes by package node ID.",
);
assertEqual(
  linkedFromObject.summary.durationMs,
  4000,
  "Motion summary should read duration from timelineDurationMs.",
);
assert(
  linkedFromObject.diagnostics.some(
    (item) => item.code === "motion.keyframes-out-of-order",
  ),
  "Out-of-order keyframes should warn without blocking linked motion.",
);

const transformAtHalfway = evaluatePackageMotion(linked.packageValue, 500);
assertEqual(
  Math.round(transformAtHalfway[targetNodeId].translateX ?? -1),
  60,
  "Motion translation should resolve relative to the package node base position.",
);
assertEqual(
  Number((transformAtHalfway[targetNodeId].scaleX ?? 0).toFixed(2)),
  1.1,
  "Motion scale should interpolate between keyframes.",
);

const unmatched = linkPackageMotionJson(
  fixturePackage,
  JSON.stringify({
    version: 1,
    playbackStyle: "loop",
    nodes: [{ node: "missing:node", fields: [] }],
  }),
);
assert(
  unmatched.diagnostics.some((item) => item.code === "motion.node-unmatched"),
  "Unmatched motion nodes should produce a warning.",
);

const unsupported = linkPackageMotionValue(fixturePackage, {
  version: 1,
  playbackStyle: "loop",
  nodes: [
    {
      node: targetNodeId,
      timelineDurationMs: 1000,
      fields: [
        {
          field: "motionBlurRadius",
          keyframes: [{ timeMs: 0, value: 1 }],
        },
      ],
    },
  ],
});
assert(
  unsupported.diagnostics.some((item) => item.code === "motion.field-unsupported") &&
    (unsupported.packageValue.motion?.raw as { nodes?: unknown[] }).nodes !== undefined,
  "Unsupported motion fields should warn while preserving the raw motion data.",
);

const fidelityMotion = linkPackageMotionValue(fixturePackage, {
  version: 1,
  playbackStyle: "once",
  nodes: [
    {
      node: targetNodeId,
      timelineDurationMs: 1000,
      fields: [
        {
          field: "motionOpacity",
          keyframes: [
            { timeMs: 0, value: 0 },
            { timeMs: 1000, value: 1 },
          ],
        },
        {
          field: "motionRotation",
          keyframes: [
            { timeMs: 0, value: 0 },
            { timeMs: 1000, value: 90 },
          ],
        },
        {
          field: "motionScale",
          keyframes: [
            { timeMs: 0, value: 1 },
            { timeMs: 1000, value: 2 },
          ],
        },
      ],
    },
  ],
});
const fidelityStart = evaluatePackageMotion(fidelityMotion.packageValue, 0);
const fidelityMiddle = evaluatePackageMotion(fidelityMotion.packageValue, 500);
const fidelityEnd = evaluatePackageMotion(fidelityMotion.packageValue, 1000);
const fidelityAfterEnd = evaluatePackageMotion(fidelityMotion.packageValue, 2000);
assertNear(
  fidelityStart[targetNodeId].opacity ?? -1,
  0,
  "Initial opacity keyframe should resolve at frame 0.",
);
assertNear(
  fidelityMiddle[targetNodeId].opacity ?? -1,
  0.5,
  "Opacity should interpolate linearly by default.",
);
assertNear(
  fidelityMiddle[targetNodeId].rotation ?? -1,
  45,
  "Rotation should interpolate predictably.",
);
assertNear(
  fidelityMiddle[targetNodeId].scaleX ?? -1,
  1.5,
  "Uniform scale should drive scaleX.",
);
assertNear(
  fidelityMiddle[targetNodeId].scaleY ?? -1,
  1.5,
  "Uniform scale should drive scaleY.",
);
assertNear(
  fidelityEnd[targetNodeId].opacity ?? -1,
  1,
  "Final opacity keyframe should resolve exactly.",
);
assertNear(
  fidelityAfterEnd[targetNodeId].rotation ?? -1,
  90,
  "Playback style once should clamp after the final frame.",
);
assert(
  packageMotionTransformToCss(fidelityMiddle[targetNodeId])?.includes(
    "rotate(45deg)",
  ),
  "Motion transform CSS should include rotation.",
);

const holdMotion = linkPackageMotionValue(fixturePackage, {
  version: 1,
  playbackStyle: "loop",
  nodes: [
    {
      node: targetNodeId,
      timelineDurationMs: 1000,
      fields: [
        {
          field: "motionTranslationX",
          keyframes: [
            {
              timeMs: 0,
              value: targetNode.bounds.relative.x,
              easingToNext: { hold: true },
            },
            { timeMs: 1000, value: targetNode.bounds.relative.x + 100 },
          ],
        },
      ],
    },
  ],
});
assertNear(
  evaluatePackageMotion(holdMotion.packageValue, 500)[targetNodeId]
    .translateX ?? -1,
  0,
  "Hold easing should preserve the current value until the next keyframe.",
);

const bezierMotion = linkPackageMotionValue(fixturePackage, {
  version: 1,
  playbackStyle: "loop",
  nodes: [
    {
      node: targetNodeId,
      timelineDurationMs: 1000,
      fields: [
        {
          field: "motionOpacity",
          keyframes: [
            {
              timeMs: 0,
              value: 0,
              easingToNext: { p1: { x: 0, y: 0 }, p2: { x: 1, y: 1 } },
            },
            { timeMs: 1000, value: 1 },
          ],
        },
      ],
    },
  ],
});
assertNear(
  evaluatePackageMotion(bezierMotion.packageValue, 500)[targetNodeId].opacity ??
    -1,
  0.5,
  "Supported bezier easing should evaluate consistently.",
);

const exportedEasingSource = {
  version: 1,
  playbackStyle: "loop",
  nodes: [
    {
      node: targetNodeId,
      timelineDurationMs: 1000,
      fields: [
        {
          field: "motionOpacity",
          keyframes: [
            {
              timeMs: 0,
              value: 0,
              easingToNext: {
                bezierValues: {
                  p1x: 0,
                  p1y: 0.49555495381355286,
                  p2x: 0,
                  p2y: 1,
                },
              },
            },
            { timeMs: 500, value: 1 },
            {
              timeMs: 750,
              value: 0.5,
              easingToNext: {
                springValues: { mass: 1, stiffness: 100, damping: 15 },
              },
            },
            {
              timeMs: 900,
              value: 0.75,
              easingToNext: {
                springValues: { mass: 1, stiffness: 100, damping: 15 },
              },
            },
            { timeMs: 1000, value: 1 },
          ],
        },
      ],
    },
  ],
};
const exportedEasingBefore = JSON.stringify(exportedEasingSource);
const exportedEasingMotion = linkPackageMotionValue(
  fixturePackage,
  exportedEasingSource,
  "motion.json",
);
const exportedEasingWarnings = exportedEasingMotion.diagnostics.filter(
  (item) => item.code === "motion.easing-unsupported",
);
assert(
  !exportedEasingWarnings.some((item) =>
    item.message.toLowerCase().includes("bezier"),
  ) && exportedEasingWarnings.length === 1,
  "Exporter bezierValues should be supported while identical spring easing warnings are deduplicated.",
);
assert(
  exportedEasingWarnings[0]?.message.includes("Spring easing") &&
    exportedEasingMotion.packageValue.motion?.linking.status === "pass" &&
    !validateTemplatePackage(
      exportedEasingMotion.packageValue,
    ).diagnostics.some(
      (item) => item.code === "motion.stale-linking-diagnostics",
    ),
  "Fidelity-only easing warnings should not make fresh node linking appear stale.",
);
assert(
  JSON.stringify(exportedEasingSource) === exportedEasingBefore &&
    JSON.stringify(exportedEasingMotion.packageValue.motion?.raw) ===
      exportedEasingBefore,
  "Motion linking should preserve the raw exported easing payload without mutating its input.",
);
assert(
  (evaluatePackageMotion(exportedEasingMotion.packageValue, 250)[targetNodeId]
    .opacity ?? 0) > 0.5,
  "The realistic bezierValues easing shape should affect interpolation instead of falling back to linear.",
);

assert(
  Object.keys(evaluatePackageMotion({ ...fixturePackage, motion: undefined }, 500))
    .length === 0,
  "Static packages without motion should produce no runtime transforms.",
);

const summary = getPackageMotionSummary(linked.packageValue);
assertEqual(summary.animatedNodeCount, 1, "Motion summary should count animated nodes.");
assertEqual(summary.durationMs, 3000, "Motion summary should use timeline duration.");

const repository = new InMemoryTemplateRepository();
const validation = validateTemplatePackage(linked.packageValue);
const record = createSavedTemplateRecord({
  name: "Motion persistence fixture",
  packageValue: linked.packageValue,
  validation,
});
await repository.saveTemplate(record);
const saved = await repository.getTemplate(record.id);
assertEqual(
  saved?.workingPackage.motion?.sourceName,
  "fixture-motion.json",
  "Saved templates should preserve linked motion metadata.",
);

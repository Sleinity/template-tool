import type {
  PackageJsonValue,
  PackageMotion,
  TemplateNode,
  TemplatePackageV1,
} from "../types";

export type PackageMotionSeverity = "info" | "warning" | "error";
export type PackageMotionRuntimeField =
  | "opacity"
  | "rotation"
  | "scale"
  | "scaleX"
  | "scaleY"
  | "translateX"
  | "translateY";

export interface PackageMotionDiagnostic {
  code: string;
  severity: PackageMotionSeverity;
  message: string;
  nodeId?: string;
  field?: string;
}

export interface PackageMotionSummary {
  durationMs: number;
  playbackStyle: string;
  animatedNodeCount: number;
  matchedNodeIds: string[];
  missingNodeIds: string[];
  unsupportedFields: string[];
  diagnostics: PackageMotionDiagnostic[];
}

export interface PackageMotionLinkResult {
  packageValue: TemplatePackageV1;
  motion: PackageMotion | null;
  summary: PackageMotionSummary;
  diagnostics: PackageMotionDiagnostic[];
}

export interface PackageMotionNodeTransform {
  translateX?: number;
  translateY?: number;
  rotation?: number;
  opacity?: number;
  scaleX?: number;
  scaleY?: number;
}

export type PackageMotionEvaluationMode = "playback" | "clamped";

interface MotionNodeRecord {
  node: string;
  timelineDurationMs?: number;
  fields?: MotionFieldRecord[];
}

interface MotionFieldRecord {
  field: string;
  keyframes?: MotionKeyframeRecord[];
}

interface MotionKeyframeRecord {
  timeMs: number;
  value: number;
  easingToNext?: unknown;
}

const SUPPORTED_MOTION_FIELDS: Record<string, PackageMotionRuntimeField> = {
  motionOpacity: "opacity",
  motionRotation: "rotation",
  motionRotationZ: "rotation",
  motionScale: "scale",
  motionScaleX: "scaleX",
  motionScaleY: "scaleY",
  motionTranslationX: "translateX",
  motionTranslationY: "translateY",
  opacity: "opacity",
  rotation: "rotation",
  scale: "scale",
  scaleX: "scaleX",
  scaleY: "scaleY",
  x: "translateX",
  y: "translateY",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function asJsonValue(value: unknown): PackageJsonValue {
  return value as PackageJsonValue;
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function motionNodes(raw: PackageJsonValue | null | undefined): MotionNodeRecord[] {
  if (!isRecord(raw) || !Array.isArray(raw.nodes)) return [];
  return (raw.nodes as unknown[]).filter(isRecord).map((node) => {
    const fields = Array.isArray(node.fields)
      ? (node.fields as unknown[]).filter(isRecord).map((field) => ({
          field: typeof field.field === "string" ? field.field : "",
          keyframes: Array.isArray(field.keyframes)
            ? (field.keyframes as unknown[])
                .filter(isRecord)
                .map((keyframe) => ({
                  timeMs:
                    typeof keyframe.timeMs === "number"
                      ? keyframe.timeMs
                      : Number.NaN,
                  value:
                    typeof keyframe.value === "number"
                      ? keyframe.value
                      : Number.NaN,
                  easingToNext: keyframe.easingToNext,
                }))
            : undefined,
        }))
      : undefined;
    return {
      node: typeof node.node === "string" ? node.node : "",
      timelineDurationMs:
        typeof node.timelineDurationMs === "number"
          ? node.timelineDurationMs
          : undefined,
      fields,
    };
  });
}

function playbackStyle(raw: PackageJsonValue | null | undefined): string {
  return isRecord(raw) && typeof raw.playbackStyle === "string"
    ? raw.playbackStyle
    : "loop";
}

function easingKind(easing: unknown): string | null {
  if (!isRecord(easing)) return null;
  const raw =
    typeof easing.type === "string"
      ? easing.type
      : typeof easing.kind === "string"
        ? easing.kind
        : typeof easing.name === "string"
          ? easing.name
          : null;
  return raw ? raw.toLowerCase() : null;
}

function isHoldEasing(easing: unknown): boolean {
  return (
    isRecord(easing) &&
    (easing.hold === true || easingKind(easing) === "hold")
  );
}

function isLinearEasing(easing: unknown): boolean {
  const kind = easingKind(easing);
  return kind === "linear" || kind === "none";
}

function bezierPoints(easing: unknown): {
  p1x: number;
  p1y: number;
  p2x: number;
  p2y: number;
} | null {
  if (!isRecord(easing)) return null;
  const bezierValues = isRecord(easing.bezierValues)
    ? easing.bezierValues
    : null;
  const bezierP1x = finiteNumber(bezierValues?.p1x);
  const bezierP1y = finiteNumber(bezierValues?.p1y);
  const bezierP2x = finiteNumber(bezierValues?.p2x);
  const bezierP2y = finiteNumber(bezierValues?.p2y);
  if (
    bezierP1x !== null &&
    bezierP1y !== null &&
    bezierP2x !== null &&
    bezierP2y !== null
  ) {
    return {
      p1x: bezierP1x,
      p1y: bezierP1y,
      p2x: bezierP2x,
      p2y: bezierP2y,
    };
  }
  const p1 = isRecord(easing.p1) ? easing.p1 : null;
  const p2 = isRecord(easing.p2) ? easing.p2 : null;
  const p1x = finiteNumber(p1?.x);
  const p1y = finiteNumber(p1?.y);
  const p2x = finiteNumber(p2?.x);
  const p2y = finiteNumber(p2?.y);
  if (p1x !== null && p1y !== null && p2x !== null && p2y !== null) {
    return { p1x, p1y, p2x, p2y };
  }

  const x1 = finiteNumber(easing.x1);
  const y1 = finiteNumber(easing.y1);
  const x2 = finiteNumber(easing.x2);
  const y2 = finiteNumber(easing.y2);
  if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
    return { p1x: x1, p1y: y1, p2x: x2, p2y: y2 };
  }

  if (
    Array.isArray(easing.bezier) &&
    easing.bezier.length === 4 &&
    easing.bezier.every((value) => finiteNumber(value) !== null)
  ) {
    const [bezierX1, bezierY1, bezierX2, bezierY2] =
      easing.bezier as number[];
    return {
      p1x: bezierX1,
      p1y: bezierY1,
      p2x: bezierX2,
      p2y: bezierY2,
    };
  }
  return null;
}

export function normalizePackageMotionFieldName(
  fieldName: string,
): PackageMotionRuntimeField | null {
  const baseName = fieldName.split("@")[0];
  return SUPPORTED_MOTION_FIELDS[baseName] ?? null;
}

function validateEasing(
  easing: unknown,
  diagnostics: PackageMotionDiagnostic[],
  context: { nodeId: string; field: string },
  warnedUnsupportedEasings: Set<string>,
): void {
  if (easing === undefined || easing === null) return;
  if (!isRecord(easing)) {
    const key = `non-object:${typeof easing}:${String(easing)}`;
    if (warnedUnsupportedEasings.has(key)) return;
    warnedUnsupportedEasings.add(key);
    diagnostics.push({
      code: "motion.easing-unsupported",
      severity: "warning",
      message: "Motion easing is not an object and will be rendered linearly.",
      nodeId: context.nodeId,
      field: context.field,
    });
    return;
  }
  if (isHoldEasing(easing) || isLinearEasing(easing) || bezierPoints(easing)) return;
  const key = JSON.stringify(easing);
  if (warnedUnsupportedEasings.has(key)) return;
  warnedUnsupportedEasings.add(key);
  const spring = isRecord(easing.springValues);
  diagnostics.push({
    code: "motion.easing-unsupported",
    severity: "warning",
    message: spring
      ? "Spring easing is not supported yet and will be rendered linearly; the raw spring values are preserved."
      : "Motion easing is not supported yet and will be rendered linearly; the raw easing value is preserved.",
    nodeId: context.nodeId,
    field: context.field,
  });
}

function inspectPackageMotion(
  raw: PackageJsonValue | null | undefined,
  packageValue: TemplatePackageV1,
): PackageMotionSummary {
  const diagnostics: PackageMotionDiagnostic[] = [];
  const matchedNodeIds = new Set<string>();
  const missingNodeIds = new Set<string>();
  const unsupportedFields = new Set<string>();
  const warnedUnsupportedEasings = new Set<string>();
  let durationMs = 0;

  if (!isRecord(raw)) {
    diagnostics.push({
      code: "motion.invalid-json",
      severity: "error",
      message: "Motion JSON must be a JSON object.",
    });
    return {
      durationMs,
      playbackStyle: "loop",
      animatedNodeCount: 0,
      matchedNodeIds: [],
      missingNodeIds: [],
      unsupportedFields: [],
      diagnostics,
    };
  }

  if (finiteNumber(raw.version) === null) {
    diagnostics.push({
      code: "motion.version-missing",
      severity: "warning",
      message: "Motion JSON is missing a numeric version.",
    });
  }
  if (!Array.isArray(raw.nodes)) {
    diagnostics.push({
      code: "motion.nodes-missing",
      severity: "error",
      message: "Motion JSON must include a nodes array.",
    });
  }

  const style = playbackStyle(raw);
  if (!["loop", "once"].includes(style)) {
    diagnostics.push({
      code: "motion.playback-unsupported",
      severity: "warning",
      message: `Playback style "${style}" is not supported yet. Preview will loop the animation.`,
    });
  }

  motionNodes(raw).forEach((motionNode) => {
    if (!motionNode.node) {
      diagnostics.push({
        code: "motion.node-id-missing",
        severity: "warning",
        message: "A motion node is missing its node id.",
      });
      return;
    }
    if (packageValue.nodes[motionNode.node]) matchedNodeIds.add(motionNode.node);
    else {
      missingNodeIds.add(motionNode.node);
      diagnostics.push({
        code: "motion.node-unmatched",
        severity: "warning",
        message: `Motion node ${motionNode.node} does not match any package node.`,
        nodeId: motionNode.node,
      });
    }
    const nodeDuration = finiteNumber(motionNode.timelineDurationMs);
    if (nodeDuration !== null && nodeDuration >= 0) {
      durationMs = Math.max(durationMs, nodeDuration);
    }
    if (!Array.isArray(motionNode.fields)) {
      diagnostics.push({
        code: "motion.fields-missing",
        severity: "warning",
        message: `Motion node ${motionNode.node} has no fields array.`,
        nodeId: motionNode.node,
      });
      return;
    }
    motionNode.fields.forEach((field) => {
      const normalized = normalizePackageMotionFieldName(field.field);
      if (!normalized) {
        unsupportedFields.add(field.field || "unknown");
        diagnostics.push({
          code: "motion.field-unsupported",
          severity: "warning",
          message: `Motion field "${field.field || "unknown"}" is not supported by the preview renderer.`,
          nodeId: motionNode.node,
          field: field.field,
        });
      }
      if (!Array.isArray(field.keyframes) || field.keyframes.length === 0) {
        diagnostics.push({
          code: "motion.keyframes-missing",
          severity: "warning",
          message: `Motion field "${field.field || "unknown"}" has no keyframes.`,
          nodeId: motionNode.node,
          field: field.field,
        });
        return;
      }
      let previousTimeMs: number | null = null;
      field.keyframes.forEach((keyframe) => {
        const keyframeTimeMs = finiteNumber(keyframe.timeMs);
        const keyframeValue = finiteNumber(keyframe.value);
        if (keyframeTimeMs === null || keyframeValue === null) {
          diagnostics.push({
            code: "motion.keyframe-invalid",
            severity: "warning",
            message: `Motion field "${field.field || "unknown"}" has an invalid keyframe.`,
            nodeId: motionNode.node,
            field: field.field,
          });
          return;
        }
        if (previousTimeMs !== null && keyframeTimeMs < previousTimeMs) {
          diagnostics.push({
            code: "motion.keyframes-out-of-order",
            severity: "warning",
            message: `Motion field "${field.field || "unknown"}" keyframes are not ordered by time.`,
            nodeId: motionNode.node,
            field: field.field,
          });
        }
        if (previousTimeMs === null && keyframeTimeMs > 0) {
          diagnostics.push({
            code: "motion.initial-keyframe-missing",
            severity: "warning",
            message: `Motion field "${field.field || "unknown"}" starts after 0ms; the first keyframe will be held initially.`,
            nodeId: motionNode.node,
            field: field.field,
          });
        }
        if (
          nodeDuration !== null &&
          keyframeTimeMs > nodeDuration
        ) {
          diagnostics.push({
            code: "motion.timeline-duration-mismatch",
            severity: "warning",
            message: `Motion field "${field.field || "unknown"}" has a keyframe beyond the node timeline duration.`,
            nodeId: motionNode.node,
            field: field.field,
          });
        }
        previousTimeMs = keyframeTimeMs;
        durationMs = Math.max(durationMs, keyframeTimeMs);
        validateEasing(keyframe.easingToNext, diagnostics, {
          nodeId: motionNode.node,
          field: field.field,
        }, warnedUnsupportedEasings);
      });
    });
  });

  return {
    durationMs,
    playbackStyle: style,
    animatedNodeCount: matchedNodeIds.size,
    matchedNodeIds: [...matchedNodeIds],
    missingNodeIds: [...missingNodeIds],
    unsupportedFields: [...unsupportedFields],
    diagnostics,
  };
}

export function getPackageMotionSummary(
  packageValue: TemplatePackageV1,
): PackageMotionSummary {
  if (!packageValue.motion) {
    return {
      durationMs: 0,
      playbackStyle: "loop",
      animatedNodeCount: 0,
      matchedNodeIds: [],
      missingNodeIds: [],
      unsupportedFields: [],
      diagnostics: [],
    };
  }
  return inspectPackageMotion(packageValue.motion?.raw, packageValue);
}

function linkPackageMotionRaw(
  packageValue: TemplatePackageV1,
  raw: PackageJsonValue,
  sourceName?: string,
  diagnostics: PackageMotionDiagnostic[] = [],
): PackageMotionLinkResult {
  const summary = inspectPackageMotion(raw, packageValue);
  const allDiagnostics = [...diagnostics, ...summary.diagnostics];
  const hasErrors = allDiagnostics.some((item) => item.severity === "error");
  const hasMissingNodes = summary.missingNodeIds.length > 0;
  const motion: PackageMotion = {
    format: "figma-motion-v1",
    raw,
    linkedAt: new Date().toISOString(),
    linking: {
      status: hasErrors
        ? "fail"
        : hasMissingNodes
          ? "warning"
          : "pass",
      matchedNodeIds: summary.matchedNodeIds,
      missingNodeIds: summary.missingNodeIds,
      extraPackageNodeIds: Object.keys(packageValue.nodes).filter(
        (nodeId) => !summary.matchedNodeIds.includes(nodeId),
      ),
    },
  };
  if (sourceName) motion.sourceName = sourceName;
  const nextPackage = structuredClone(packageValue);
  nextPackage.motion = motion;
  return {
    packageValue: nextPackage,
    motion,
    summary,
    diagnostics: allDiagnostics,
  };
}

export function linkPackageMotionValue(
  packageValue: TemplatePackageV1,
  source: unknown,
  sourceName?: string,
): PackageMotionLinkResult {
  const raw = asJsonValue(cloneValue(source));
  return linkPackageMotionRaw(packageValue, raw, sourceName);
}

export function linkPackageMotionJson(
  packageValue: TemplatePackageV1,
  source: string,
  sourceName?: string,
): PackageMotionLinkResult {
  const diagnostics: PackageMotionDiagnostic[] = [];
  let raw: PackageJsonValue | null = null;
  try {
    raw = asJsonValue(JSON.parse(source));
  } catch {
    diagnostics.push({
      code: "motion.parse-failed",
      severity: "error",
      message: "Motion JSON could not be parsed.",
    });
  }

  if (!raw) {
    const summary: PackageMotionSummary = {
      durationMs: 0,
      playbackStyle: "loop",
      animatedNodeCount: 0,
      matchedNodeIds: [],
      missingNodeIds: [],
      unsupportedFields: [],
      diagnostics,
    };
    return {
      packageValue,
      motion: null,
      summary,
      diagnostics,
    };
  }

  return linkPackageMotionRaw(packageValue, raw, sourceName, diagnostics);
}

export function removePackageMotion(
  packageValue: TemplatePackageV1,
): TemplatePackageV1 {
  const nextPackage = structuredClone(packageValue);
  delete nextPackage.motion;
  return nextPackage;
}

function easingValue(easing: unknown, linearProgress: number): number {
  if (!isRecord(easing)) return linearProgress;
  if (isHoldEasing(easing)) return 0;
  if (isLinearEasing(easing)) return linearProgress;
  const points = bezierPoints(easing);
  if (!points) {
    return linearProgress;
  }
  let low = 0;
  let high = 1;
  let t = linearProgress;
  for (let index = 0; index < 10; index += 1) {
    t = (low + high) / 2;
    const x = cubicBezier(t, 0, points.p1x, points.p2x, 1);
    if (x < linearProgress) low = t;
    else high = t;
  }
  return cubicBezier(t, 0, points.p1y, points.p2y, 1);
}

function cubicBezier(
  t: number,
  start: number,
  p1: number,
  p2: number,
  end: number,
): number {
  const inverse = 1 - t;
  return (
    inverse ** 3 * start +
    3 * inverse ** 2 * t * p1 +
    3 * inverse * t ** 2 * p2 +
    t ** 3 * end
  );
}

function evaluateKeyframes(
  keyframes: MotionKeyframeRecord[] | undefined,
  timeMs: number,
): number | null {
  const validKeyframes = (keyframes ?? [])
    .filter(
      (keyframe) =>
        finiteNumber(keyframe.timeMs) !== null &&
        finiteNumber(keyframe.value) !== null,
    )
    .sort((left, right) => left.timeMs - right.timeMs);
  if (validKeyframes.length === 0) return null;
  if (timeMs <= validKeyframes[0].timeMs) return validKeyframes[0].value;
  const last = validKeyframes[validKeyframes.length - 1];
  if (timeMs >= last.timeMs) return last.value;
  for (let index = 0; index < validKeyframes.length - 1; index += 1) {
    const current = validKeyframes[index];
    const next = validKeyframes[index + 1];
    if (timeMs >= current.timeMs && timeMs <= next.timeMs) {
      const span = next.timeMs - current.timeMs;
      const progress = span <= 0 ? 1 : (timeMs - current.timeMs) / span;
      const easedProgress = easingValue(current.easingToNext, progress);
      return current.value + (next.value - current.value) * easedProgress;
    }
  }
  return last.value;
}

function durationForMotion(motion: PackageMotion | undefined): number {
  let durationMs = 0;
  motionNodes(motion?.raw).forEach((node) => {
    const nodeDuration = finiteNumber(node.timelineDurationMs);
    if (nodeDuration !== null && nodeDuration >= 0) {
      durationMs = Math.max(durationMs, nodeDuration);
    }
    (node.fields ?? []).forEach((field) => {
      (field.keyframes ?? []).forEach((keyframe) => {
        if (finiteNumber(keyframe.timeMs) !== null) {
          durationMs = Math.max(durationMs, keyframe.timeMs);
        }
      });
    });
  });
  return durationMs;
}

export function getPackageMotionFinalFrameTimeMs(
  packageValue: TemplatePackageV1,
): number | null {
  const motion = packageValue.motion;
  if (!motion || !isRecord(motion.raw)) return null;
  const summary = getPackageMotionSummary(packageValue);
  if (summary.diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return null;
  }
  let finalTimeMs = 0;
  let hasSupportedKeyframe = false;
  motionNodes(motion.raw).forEach((node) => {
    if (!packageValue.nodes[node.node]) return;
    const nodeDuration = finiteNumber(node.timelineDurationMs);
    if (nodeDuration !== null && nodeDuration >= 0) {
      finalTimeMs = Math.max(finalTimeMs, nodeDuration);
    }
    (node.fields ?? []).forEach((field) => {
      if (!normalizePackageMotionFieldName(field.field)) return;
      (field.keyframes ?? []).forEach((keyframe) => {
        const timeMs = finiteNumber(keyframe.timeMs);
        const value = finiteNumber(keyframe.value);
        if (timeMs === null || value === null) return;
        hasSupportedKeyframe = true;
        finalTimeMs = Math.max(finalTimeMs, timeMs);
      });
    });
  });
  return hasSupportedKeyframe ? finalTimeMs : null;
}

function nodeBaseOffset(node: TemplateNode, field: PackageMotionRuntimeField): number {
  if (field === "translateX") return node.bounds.relative.x;
  if (field === "translateY") return node.bounds.relative.y;
  return 0;
}

function nodeBaseRotation(node: TemplateNode): number {
  const figma = isRecord(node.extensions?.figma)
    ? node.extensions.figma
    : null;
  const rotation = finiteNumber(figma?.rotation);
  if (rotation !== null) return rotation;
  const matrix = figma?.relativeTransform ?? figma?.transform;
  if (
    Array.isArray(matrix) &&
    matrix.length === 2 &&
    matrix.every((row) => Array.isArray(row) && row.length >= 2)
  ) {
    const row0 = matrix[0] as unknown[];
    const row1 = matrix[1] as unknown[];
    const a = finiteNumber(row0[0]);
    const b = finiteNumber(row1[0]);
    if (a !== null && b !== null) return Math.atan2(b, a) * (180 / Math.PI);
  }
  return 0;
}

export function evaluatePackageMotion(
  packageValue: TemplatePackageV1,
  timeMs: number,
  options: { mode?: PackageMotionEvaluationMode } = {},
): Record<string, PackageMotionNodeTransform> {
  const motion = packageValue.motion;
  if (!motion || !isRecord(motion.raw)) return {};
  const durationMs = durationForMotion(motion);
  const style = playbackStyle(motion.raw);
  const effectiveTime =
    options.mode === "clamped" || style === "once" || durationMs <= 0
      ? Math.max(0, Math.min(timeMs, durationMs))
      : ((timeMs % durationMs) + durationMs) % durationMs;
  const transforms: Record<string, PackageMotionNodeTransform> = {};

  motionNodes(motion.raw).forEach((motionNode) => {
    const packageNode = packageValue.nodes[motionNode.node];
    if (!packageNode) return;
    (motionNode.fields ?? []).forEach((field) => {
      const normalized = normalizePackageMotionFieldName(field.field);
      if (!normalized) return;
      const value = evaluateKeyframes(field.keyframes, effectiveTime);
      if (value === null) return;
      const nodeTransform = transforms[motionNode.node] ?? {};
      if (normalized === "opacity") {
        nodeTransform.opacity = clamp(value, 0, 1);
      } else if (normalized === "rotation") {
        nodeTransform.rotation = value - nodeBaseRotation(packageNode);
      } else if (normalized === "scale") {
        nodeTransform.scaleX = value;
        nodeTransform.scaleY = value;
      } else {
        nodeTransform[normalized] = value - nodeBaseOffset(packageNode, normalized);
      }
      transforms[motionNode.node] = nodeTransform;
    });
  });

  return transforms;
}

export function packageMotionTransformToCss(
  motionTransform: PackageMotionNodeTransform | undefined,
): string | null {
  if (!motionTransform) return null;
  const translateX = motionTransform.translateX ?? 0;
  const translateY = motionTransform.translateY ?? 0;
  const rotation = motionTransform.rotation ?? 0;
  const scaleX = motionTransform.scaleX ?? 1;
  const scaleY = motionTransform.scaleY ?? 1;
  const transformParts: string[] = [];
  if (translateX !== 0 || translateY !== 0) {
    transformParts.push(`translate(${translateX}px, ${translateY}px)`);
  }
  if (rotation !== 0) {
    transformParts.push(`rotate(${rotation}deg)`);
  }
  if (scaleX !== 1 || scaleY !== 1) {
    transformParts.push(`scale(${scaleX}, ${scaleY})`);
  }
  return transformParts.length ? transformParts.join(" ") : null;
}

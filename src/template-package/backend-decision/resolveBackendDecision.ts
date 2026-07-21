import type { ResolvedRenderNode } from "../resolved/types";
import type {
  BackendSupportLevel,
  RendererBackendKind,
  ResolvedBackendDisposition,
  ResolvedBackendDecisionV1,
  ResolvedBackendOwnerV1,
} from "./types";
import type { ResolvedBackendAvailabilityV1 } from "./types";

export const resolvedBackendAvailability: ResolvedBackendAvailabilityV1 = {
  schemaVersion: "resolved-backend-availability-v1",
  backends: [
    {
      backend: "canvas-offscreen",
      availability: "unavailable",
      capabilityBoundary: ["effects", "advanced-compositing", "complex-masks", "raster-fallback"],
      reason: "ADR 0012 remains Proposed; no source fixture currently requires an offscreen owner.",
    },
    {
      backend: "webgl",
      availability: "unavailable",
      capabilityBoundary: ["shader-paints", "advanced-compositing"],
      reason: "No source-certified capability currently authorizes a WebGL runtime owner.",
    },
  ],
};

type DecisionNode = Omit<ResolvedRenderNode, "backendDecision">;

const primitiveNodeTypes = new Set(["FRAME", "RECTANGLE"]);

function isBackendFallbackDiagnostic(code: string): boolean {
  if (/^(resolved-font-|font\.)/i.test(code)) return false;
  if (/^(asset-|resolved-(?:image|vector)-asset-missing)/i.test(code)) return false;
  return /(unsupported|fallback|preserv|missing|invalid|singular|malformed|conflict|stale|unresolved|overflow|clip)/i.test(code);
}

function stableHash(value: unknown): string {
  const input = typeof value === "string" ? value : JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function owner(
  value: ResolvedBackendOwnerV1,
): ResolvedBackendOwnerV1 {
  return value;
}

function selectedBackend(owners: ResolvedBackendOwnerV1[]): RendererBackendKind {
  const backends = new Set(owners.map((candidate) => candidate.backend));
  if (backends.has("unsupported")) return "unsupported";
  if (backends.has("raster-fallback")) return "raster-fallback";
  if (backends.has("compatibility")) return "compatibility";
  if (backends.has("dom-css") && backends.has("svg")) return "dom-svg";
  return owners[0]?.backend ?? "compatibility";
}

function primitiveOwners(node: DecisionNode): ResolvedBackendOwnerV1[] {
  const appearance = node.primitiveAppearance;
  if (appearance.ownership !== "primitive-authoritative") return [];
  const stack = appearance.paints.orderedSolidStack;
  const orderedNormalPaintStack = appearance.paints.orderedNormalPaintStack;
  const gradient = appearance.paints.layers.find(
    (paint) => paint.linearGradient?.capability === "source-certified-linear-gradient",
  )?.linearGradient;
  if (stack?.capability === "source-certified-ordered-solid-stack") {
    return [owner({
      family: "paint",
      capabilityId: "PNT-ORDERED-SOLID-NORMAL",
      backend: "svg",
      runtimeOwner: "ordered-solid-svg",
      supportLevel: "native",
      reason: "The resolved ordered-SOLID contract selects one SVG stack and shared clip owner.",
    })];
  }
  if (orderedNormalPaintStack?.capability === "source-certified-solid-linear-normal-stack") {
    return [owner({
      family: "paint",
      capabilityId: "PNT-ORDERED-SOLID-LINEAR-NORMAL",
      backend: "svg",
      runtimeOwner: "ordered-normal-paint-svg",
      supportLevel: "native",
      reason: "The source-certified ordered SOLID plus linear-gradient contract selects one SVG stack and shared clip owner.",
    })];
  }
  if (gradient) {
    return [owner({
      family: "paint",
      capabilityId: "PNT-GRADIENT-LINEAR-CERTIFIED",
      backend: "svg",
      runtimeOwner: "linear-gradient-svg",
      supportLevel: "native",
      reason: "The source-certified resolved linear-gradient contract selects one SVG owner.",
    })];
  }
  return [owner({
    family: appearance.backend === "svg" ? "geometry" : "paint",
    capabilityId: appearance.backend === "svg" ? "GEO-PRIMITIVE-SVG" : "PNT-PRIMITIVE-CSS",
    backend: appearance.backend === "svg" ? "svg" : "dom-css",
    runtimeOwner: appearance.backend === "svg" ? "primitive-svg" : "primitive-dom-css",
    supportLevel: "native",
    reason: "PrimitiveAppearanceV1 is authoritative for the eligible source-certified primitive.",
  })];
}

export interface ResolveBackendDecisionOptions {
  packageId: string;
  sourceRevision: string;
  maskOwner?: "css-clip" | "compatibility" | null;
  maskCapability?: string | null;
}

export function resolveBackendDecision(
  node: DecisionNode,
  options: ResolveBackendDecisionOptions,
): ResolvedBackendDecisionV1 {
  const owners: ResolvedBackendOwnerV1[] = [];
  owners.push(owner({
    family: "layout",
    capabilityId: "LAY-CORE-OR-COMPATIBILITY",
    backend: "dom-css",
    runtimeOwner: "core-layout",
    supportLevel: "emulated",
    reason: "Core layout routing remains capability-selected at runtime with coherent compatibility boundaries.",
  }));
  if (node.text) {
    owners.push(owner({
      family: "text",
      capabilityId: "TXT-DOM-CSS",
      backend: "dom-css",
      runtimeOwner: "text-dom",
      supportLevel: "emulated",
      reason: "Resolved text, exact-font evidence, measurement, trim, and editing select the established DOM/CSS text owner.",
    }));
  }
  owners.push(...primitiveOwners(node));
  if (node.primitiveAppearance.ownership !== "primitive-authoritative") {
    const compatibilityFills = node.text
      ? []
      : node.image
      ? node.appearance.fills.filter((fill) => fill.kind !== "image")
      : node.appearance.fills;
    if (compatibilityFills.length > 0) {
      const hasUnsupportedFill = compatibilityFills.some((fill) => fill.kind === "unsupported");
      owners.push(owner({
        family: "paint",
        capabilityId: hasUnsupportedFill ? "PNT-UNSUPPORTED-PRESERVED" : "PNT-LEGACY-COMPATIBILITY",
        backend: "compatibility",
        runtimeOwner: hasUnsupportedFill ? "unsupported-preservation" : "legacy-dom-css",
        supportLevel: hasUnsupportedFill ? "preserved-only" : "approximated",
        reason: hasUnsupportedFill
          ? "Unsupported source paints remain preserved while the compatibility renderer owns visible output."
          : "The existing compatibility paint helpers remain the coherent owner outside a certified primitive route.",
      }));
    }
    if (node.appearance.strokes.length > 0) {
      owners.push(owner({
        family: "stroke",
        capabilityId: "STR-LEGACY-COMPATIBILITY",
        backend: "compatibility",
        runtimeOwner: "legacy-dom-css",
        supportLevel: "approximated",
        reason: "The existing compatibility stroke helper remains selected outside the certified primitive-stroke subset.",
      }));
    }
  }
  if (node.appearance.effects.length > 0) {
    const everyEffectSupported = node.appearance.effects.every((effect) => effect.supported);
    owners.push(owner({
      family: "effects",
      capabilityId: everyEffectSupported ? "FX-LEGACY-CSS" : "FX-UNSUPPORTED-PRESERVED",
      backend: "compatibility",
      runtimeOwner: everyEffectSupported ? "legacy-dom-css" : "unsupported-preservation",
      supportLevel: everyEffectSupported ? "approximated" : "preserved-only",
      reason: everyEffectSupported
        ? "The existing CSS compatibility effect mapping remains selected; no new effects authority is introduced."
        : "Unsupported effect source data remains preserved without authorizing a new backend.",
    }));
  }
  if (node.appearance.opacity !== 1) {
    owners.push(owner({
      family: "compositing",
      capabilityId: "CMP-NODE-OPACITY-COMPATIBILITY",
      backend: "compatibility",
      runtimeOwner: "legacy-dom-css",
      supportLevel: "approximated",
      reason: "Node opacity remains compatibility-owned; Phase 11 does not transfer general compositing authority.",
    }));
  }
  if (node.image) {
    owners.push(owner({
      family: "media",
      capabilityId: `MED-${node.image.scaleMode || "UNKNOWN"}`,
      backend: node.image.renderMode === "fallback" ? "compatibility" : "dom-css",
      runtimeOwner: "media-dom",
      supportLevel: node.image.renderMode === "fallback" ? "approximated" : "native",
      reason: node.image.renderMode === "fallback"
        ? "Resolved media intent selected its explicit deterministic compatibility fallback."
        : "Resolved media intent and placement select browser-native DOM image sampling.",
    }));
  }
  if (node.vector) {
    const assetOwned = (node.vector.renderMode === "SVG_ASSET" ||
      node.vector.renderMode === "FLATTENED_SVG") && !node.vector.missingAsset;
    const semanticShape = node.vector.renderMode === "SEMANTIC_SHAPE";
    const unsupported = node.vector.renderMode === "UNSUPPORTED";
    owners.push(owner({
      family: "vector",
      capabilityId: `VEC-${node.vector.renderMode}`,
      backend: assetOwned ? "svg" : semanticShape ? "dom-css" : unsupported ? "unsupported" : "compatibility",
      runtimeOwner: assetOwned ? "vector-svg" : unsupported ? "unsupported-preservation" : "legacy-dom-css",
      supportLevel: assetOwned || semanticShape ? "emulated" : unsupported ? "unsupported" : "approximated",
      reason: assetOwned
        ? "Resolved vector mode selects the existing SVG or SVG-asset owner."
        : semanticShape
          ? "The existing semantic-shape compatibility owner remains selected."
          : unsupported
            ? "The vector source explicitly remains unsupported and is preserved for diagnosis."
        : "The existing compatibility vector helper owns the preserved source semantics.",
    }));
  }
  if (options.maskOwner) {
    owners.push(owner({
      family: "mask",
      capabilityId: options.maskCapability ?? "MASK-UNKNOWN",
      backend: options.maskOwner === "css-clip" ? "dom-css" : "compatibility",
      runtimeOwner: options.maskOwner === "css-clip" ? "mask-css-clip" : "unsupported-preservation",
      supportLevel: options.maskOwner === "css-clip" ? "emulated" : "preserved-only",
      reason: options.maskOwner === "css-clip"
        ? "The exact opaque rectangular alpha relation selects one resolved CSS clip owner."
        : "The mask relation is preserved without approximating unsupported mask semantics.",
    }));
  }
  if (node.renderStrategy === "fallback") {
    owners.push(owner({
      family: "fallback",
      capabilityId: "FALLBACK-PLACEHOLDER",
      backend: "compatibility",
      runtimeOwner: "fallback-placeholder",
      supportLevel: "approximated",
      reason: node.fallbackReason ?? "The resolved node selected the existing compatibility placeholder.",
    }));
  }
  if (owners.length === 1) {
    owners.push(owner({
      family: node.text ? "text" : "geometry",
      capabilityId: node.text ? "TXT-LEGACY-DOM" : "GEO-LEGACY-DOM",
      backend: "compatibility",
      runtimeOwner: "legacy-dom-css",
      supportLevel: node.text ? "emulated" : "approximated",
      reason: "The existing compatibility DOM/CSS renderer remains the coherent visual owner.",
    }));
  }

  const primitiveFallbackReasons = !primitiveNodeTypes.has(node.type) || node.image || node.vector || options.maskOwner
    ? []
    : node.primitiveAppearance.fallbackReasons;
  const fallbackReasons = Array.from(new Set([
    ...primitiveFallbackReasons,
    ...(node.fallbackReason ? [node.fallbackReason] : []),
    ...node.fidelityDiagnostics
      .filter((diagnostic) => diagnostic.severity === "warning" && isBackendFallbackDiagnostic(diagnostic.code))
      .map((diagnostic) => diagnostic.code),
  ])).sort();
  const source = `${options.packageId}:${options.sourceRevision}:${node.primitiveAppearance.sourceRevision}`;
  const resolvedInput = {
    nodeId: node.id,
    owners,
    fallbackReasons,
    renderStrategy: node.renderStrategy,
    image: node.image ? {
      mode: node.image.renderMode,
      state: node.image.activePlacementState,
      revision: node.image.placementRevision,
    } : null,
    vector: node.vector ? {
      mode: node.vector.renderMode,
      modeSource: node.vector.renderModeSource,
      assetId: node.vector.assetId,
      missing: node.vector.missingAsset,
    } : null,
    primitive: {
      ownership: node.primitiveAppearance.ownership,
      backend: node.primitiveAppearance.backend,
      geometry: node.primitiveAppearance.geometryRevision,
      paint: node.primitiveAppearance.paints.layers.map((layer) => layer.paintRevision),
      stroke: node.primitiveAppearance.strokes.layers.map((layer) => layer.strokeRevision),
    },
  };
  const resolved = stableHash(resolvedInput);
  const backend = selectedBackend(owners);
  const primary = [...owners].reverse().find((candidate) =>
    candidate.family !== "layout" && candidate.runtimeOwner !== "legacy-dom-css"
  ) ?? [...owners].reverse().find((candidate) => candidate.family !== "layout") ?? owners[0];
  const support: BackendSupportLevel = primary?.supportLevel ?? "unknown-pending-audit";
  const disposition: ResolvedBackendDisposition = owners.some((candidate) => candidate.backend === "unsupported" || candidate.supportLevel === "unsupported")
    ? "unsupported"
    : owners.some((candidate) => candidate.supportLevel === "preserved-only" || candidate.runtimeOwner === "unsupported-preservation")
      ? "preserved-only"
      : node.renderStrategy === "fallback" || Boolean(node.image?.missingAsset) || Boolean(node.vector?.missingAsset) ||
          owners.some((candidate) => candidate.backend === "raster-fallback" || candidate.runtimeOwner === "fallback-placeholder") ||
          fallbackReasons.length > 0
        ? "degraded-fallback"
        : backend === "compatibility"
          ? "established-compatibility-owner"
          : "semantic-owner";
  const fallbackActive = disposition === "degraded-fallback" || disposition === "preserved-only" || disposition === "unsupported";
  return {
    schemaVersion: "resolved-backend-decision-v1",
    decisionId: `backend:${node.id}:${resolved}`,
    nodeId: node.id,
    scope: fallbackActive && node.children.length > 0 ? "subtree-boundary" : "node",
    selectedBackend: backend,
    runtimeOwner: primary.runtimeOwner,
    disposition,
    owners,
    requiredCapabilities: owners.map((candidate) => candidate.capabilityId),
    supportLevel: support,
    fallback: {
      active: fallbackActive,
      backend: fallbackActive ? "compatibility" : null,
      reasonCodes: fallbackReasons,
      description: fallbackActive
        ? fallbackReasons.join(", ") || (disposition === "preserved-only"
          ? "Source semantics are preserved without a complete visual owner."
          : disposition === "unsupported"
            ? "The source capability is unsupported."
            : "The preferred owner could not safely own this region.")
        : null,
    },
    reason: primary.reason,
    editability: node.editableFields.length > 0 ? "editable" : node.children.length > 0 ? "indirect" : "read-only",
    exportSafety: node.renderStrategy === "fallback" || node.image?.missingAsset || node.vector?.missingAsset
      ? "warning"
      : support === "unsupported"
        ? "blocked"
        : "safe",
    confidence: support === "native" || support === "emulated"
      ? "high"
      : support === "approximated"
        ? "medium"
        : support === "preserved-only"
          ? "low"
          : "unresolved",
    revisions: {
      source,
      resolved,
      geometry: node.primitiveAppearance.geometryRevision,
      asset: node.image?.assetId ?? node.vector?.assetId ?? null,
      placement: node.image ? `${node.image.activePlacementState}:${node.image.placementRevision}` : null,
      settlement: null,
    },
    unavailableBackendIds: resolvedBackendAvailability.backends.map((backend) => backend.backend),
  };
}

export function backendDecisionOwns(
  decision: ResolvedBackendDecisionV1 | undefined,
  runtimeOwner: ResolvedBackendOwnerV1["runtimeOwner"],
): boolean {
  return Boolean(decision?.owners.some((candidate) => candidate.runtimeOwner === runtimeOwner));
}

export function backendDecisionRevision(
  decisions: ResolvedBackendDecisionV1[],
): string {
  return stableHash(decisions.map((decision) => ({
    nodeId: decision.nodeId,
    resolved: decision.revisions.resolved,
  })));
}

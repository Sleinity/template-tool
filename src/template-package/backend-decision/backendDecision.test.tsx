import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import imageOverlayBadges from "../fixtures/image-overlay-badges.json";
import { TemplatePackageRenderer } from "../render/TemplatePackageRenderer";
import { createResolvedRenderTree } from "../resolved";
import type { TemplatePackageV1 } from "../types";
import { createBackendDiagnosticProjection } from "./createDiagnosticProjection";
import { backendDecisionOwns } from "./resolveBackendDecision";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const packageValue = structuredClone(imageOverlayBadges) as unknown as TemplatePackageV1;
const tree = createResolvedRenderTree(packageValue);
const repeated = createResolvedRenderTree(packageValue);
const restored = createResolvedRenderTree(
  JSON.parse(JSON.stringify(packageValue)) as TemplatePackageV1,
);

assert(
  tree.backendDecisionRevision === repeated.backendDecisionRevision,
  "Backend decisions must serialize deterministically for identical package bytes and state.",
);
assert(
  tree.backendDecisionRevision === restored.backendDecisionRevision,
  "Persistence restoration must reproduce backend identity without network or enrichment state.",
);
assert(
  Object.values(tree.nodes).every(
    (node) => node.backendDecision.schemaVersion === "resolved-backend-decision-v1",
  ),
  "Every resolved node must publish one versioned backend decision.",
);
assert(
  tree.backendAvailability.backends.some(
    (backend) => backend.backend === "canvas-offscreen" && backend.availability === "unavailable",
  ) && Object.values(tree.nodes).every((node) =>
    node.backendDecision.unavailableBackendIds.includes("canvas-offscreen"),
  ),
  "The deferred Canvas/offscreen boundary must be explicit rather than inferred from absence.",
);

const imageNode = Object.values(tree.nodes).find((node) => Boolean(node.image));
assert(imageNode, "The backend-decision fixture must include an image node.");
assert(
  backendDecisionOwns(imageNode.backendDecision, "media-dom") &&
    imageNode.backendDecision.selectedBackend === "dom-css" &&
    !backendDecisionOwns(imageNode.backendDecision, "legacy-dom-css"),
  "Resolved media must register its existing browser-native DOM owner.",
);
assert(
  imageNode.backendDecision.revisions.placement ===
    `${imageNode.image?.activePlacementState}:${imageNode.image?.placementRevision}`,
  "Backend identity must bind to active media-placement state and revision.",
);

const changed = structuredClone(packageValue);
const changedImage = changed.nodes[imageNode.id].image;
assert(changedImage, "The source image node must retain image semantics.");
changedImage.activePlacement = {
  state: "replacement-fit",
  revision: 7,
};
const changedTree = createResolvedRenderTree(changed);
assert(
  changedTree.nodes[imageNode.id].backendDecision.revisions.resolved !==
    imageNode.backendDecision.revisions.resolved,
  "Changing active placement authority must issue a new backend-decision revision.",
);

assert(
  tree.backendDiagnostics.schemaVersion === "resolved-backend-diagnostic-projection-v1" &&
    tree.backendDiagnostics.sourceDecisionRevision === tree.backendDecisionRevision,
  "The shared diagnostic projection must be revision-bound to backend decisions.",
);
const textNode = tree.nodes.badge;
assert(
  backendDecisionOwns(textNode.backendDecision, "text-dom") &&
    textNode.backendDecision.disposition === "semantic-owner" &&
    !textNode.backendDecision.fallback.active &&
    !textNode.backendDecision.fallback.reasonCodes.includes("unsupported-primitive-kind"),
  "Ordinary text must select its explicit DOM/CSS owner without inheriting primitive fallback reasons.",
);
const fontFallbackTextNode = structuredClone(textNode);
fontFallbackTextNode.fidelityDiagnostics = [{
  code: "resolved-font-fallback",
  message: "The requested face is unavailable and a fallback face is active.",
  nodeId: fontFallbackTextNode.id,
  severity: "warning",
}];
assert(
  createBackendDiagnosticProjection(
    { [fontFallbackTextNode.id]: fontFallbackTextNode },
    [],
    "font-root-cause-deduplication",
  ).diagnostics.length === 0,
  "Font dependency failures must remain owned by the dedicated font diagnostic instead of creating a derivative backend Review.",
);

const mixedPaintNode = structuredClone(imageNode);
mixedPaintNode.fidelityDiagnostics = [{
  code: "ordered-solid-stack-mixed-paint-types",
  message: "Multiple-paint node remains compatibility-owned: ordered-solid-stack-mixed-paint-types.",
  nodeId: mixedPaintNode.id,
  severity: "warning",
}];
mixedPaintNode.backendDecision = {
  ...mixedPaintNode.backendDecision,
  selectedBackend: "compatibility",
  runtimeOwner: "legacy-dom-css",
  supportLevel: "approximated",
  disposition: "degraded-fallback",
  fallback: {
    active: true,
    backend: "compatibility",
    reasonCodes: ["ordered-solid-stack-mixed-paint-types"],
    description: "ordered-solid-stack-mixed-paint-types",
  },
};
const mixedPaintProjection = createBackendDiagnosticProjection(
  { [mixedPaintNode.id]: mixedPaintNode },
  [],
  "mixed-paint-review",
);
const mixedPaintDiagnostic = mixedPaintProjection.diagnostics[0];
assert(
  mixedPaintProjection.groups.length > 0 && mixedPaintProjection.groups.every((group) =>
    group.kind === "capability" || group.kind === "region"
  ),
  "Material backend diagnostics must publish capability and regional grouping records.",
);
assert(
  mixedPaintDiagnostic.classifications.includes("unsupported-renderer-capability") &&
    !mixedPaintDiagnostic.classifications.includes("layout-stabilization-issue") &&
    !mixedPaintDiagnostic.classifications.includes("user-actionable-issue") &&
    !mixedPaintDiagnostic.userRepairable &&
    mixedPaintDiagnostic.audience === "user",
  "A paint-fill compatibility boundary must remain visible without being misclassified as layout work or a user-repairable issue.",
);

const markup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, { packageValue, resolvedTree: tree }),
);
assert(
  markup.includes("background-image:") && markup.includes('data-package-image-render-mode="object-fit-cover"'),
  "The renderer must consume the resolved media owner without changing its established DOM/CSS output.",
);
const disabledMediaTree = structuredClone(tree);
disabledMediaTree.nodes[imageNode.id].backendDecision.owners =
  disabledMediaTree.nodes[imageNode.id].backendDecision.owners.filter(
    (candidate) => candidate.runtimeOwner !== "media-dom",
  );
const disabledMediaMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue,
    resolvedTree: disabledMediaTree,
  }),
);
assert(
  !disabledMediaMarkup.includes(imageNode.image?.source ?? "missing-source"),
  "Renderer media activation must be gated by the central resolved backend decision.",
);

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import simpleFixedPoster from "../fixtures/simple-fixed-poster.json";
import { TemplatePackageRenderer } from "../render/TemplatePackageRenderer";
import { createResolvedRenderTree } from "../resolved/createResolvedRenderTree";
import { createCanonicalSceneGraph } from "../scene/createCanonicalSceneGraph";
import type { TemplateNode, TemplatePackageV1 } from "../types";
import { validateTemplatePackage } from "../validateTemplatePackage";
import { maskClipInsets, resolvePackageMaskRelationships } from "./packageMaskRelationships";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function packageWithMask(): TemplatePackageV1 {
  const packageValue = structuredClone(simpleFixedPoster) as unknown as TemplatePackageV1;
  const root = packageValue.nodes.root;
  const mask: TemplateNode = {
    id: "mask",
    name: "Opaque alpha mask source",
    type: "RECTANGLE",
    parentId: "root",
    children: [],
    bounds: {
      absolute: { x: 0, y: 0, width: 1080, height: 1080 },
      relative: { x: 0, y: 0, width: 1080, height: 1080 },
    },
    positioning: { mode: "ABSOLUTE" },
    layout: {
      mode: "NONE",
      wrap: false,
      gap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      primaryAlignment: "MIN",
      counterAlignment: "MIN",
      clipContent: false,
    },
    sizing: {
      horizontal: { mode: "FIXED", value: 1080 },
      vertical: { mode: "FIXED", value: 1080 },
    },
    appearance: {
      opacity: 1,
      fills: [{ type: "SOLID", color: { r: 0.933, g: 0.907, b: 0.887, a: 1 }, opacity: 1, visible: true }],
      strokes: [],
      effects: [],
      cornerRadius: 0,
      blendMode: "PASS_THROUGH",
    },
    shape: { type: "RECTANGLE", cornerRadius: 0 },
    mask: { isMask: true, maskType: "ALPHA" },
    extensions: { figma: { relativeTransform: [[1, 0, 0], [0, 1, 0]] } },
  };
  root.children = [mask.id, "headline"];
  packageValue.nodes.mask = mask;
  const headline = packageValue.nodes.headline;
  headline.bounds.absolute = { x: 80, y: 1000, width: 920, height: 200 };
  headline.bounds.relative = { x: 80, y: 1000, width: 920, height: 200 };
  headline.sizing.vertical = { mode: "FIXED", value: 200 };
  headline.mask = { isMask: false, maskType: "ALPHA" };
  packageValue.maskRelationships = [{
    maskSourceId: "mask",
    affectedSiblingIds: ["headline"],
    parentId: "root",
    scopeTerminationReason: "end_of_siblings",
  }];
  return packageValue;
}

const packageValue = packageWithMask();
const validation = validateTemplatePackage(packageValue);
assert(validation.valid, `Source-declared mask package must validate: ${JSON.stringify(validation.diagnostics)}`);
const resolution = resolvePackageMaskRelationships(packageValue);
assert(resolution.issues.length === 0, "Valid source-declared relationship must have no validation issues.");
const relationship = resolution.relationships[0];
assert(relationship.capability === "exact-opaque-rectangular-alpha", "Opaque rectangular ALPHA source must select the narrow exact capability.");
assert(relationship.renderStrategy === "css-clip-path", "Exact mask subset must have one CSS clip-path owner.");
assert(JSON.stringify(relationship.affected[0].clipInsets) === JSON.stringify({ top: 0, right: 0, bottom: 120, left: 0 }), "Mask clipping must be derived in the affected node coordinate space.");
assert(JSON.stringify(maskClipInsets({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 20, width: 5, height: 5 })) === "null", "Disjoint geometry must not fabricate a clip.");

const scene = createCanonicalSceneGraph(packageValue).graph;
assert(scene.nodes.mask.relationships.maskRelationship.maskedSiblingRange === "source-declared", "Canonical scene must retain the declared sibling range.");
assert(scene.nodes.mask.relationships.maskRelationship.paintRole === "mask-input", "Canonical scene must classify the source solid as mask input.");
assert(scene.maskRelationships?.[0].provenance.sourcePath === "maskRelationships.0", "Canonical scene must retain relationship provenance.");

const resolvedTree = createResolvedRenderTree(packageValue);
assert(resolvedTree.maskRelationships?.[0].capability === "exact-opaque-rectangular-alpha", "Resolved graph must publish exact capability evidence.");
const markup = renderToStaticMarkup(createElement(TemplatePackageRenderer, { packageValue, resolvedTree }));
assert(!markup.includes('data-package-node-id="mask"'), "Mask source must not remain an ordinary visible DOM sibling.");
assert(markup.includes('data-package-node-id="headline"'), "isMask=false must remain ordinary affected content even when maskType is present.");
assert(markup.includes("clip-path:inset(0px 0px 120px 0px)"), "Renderer must apply the source-derived clip exactly once.");
assert(markup.includes('data-package-mask-paint-role="mask-input"'), "Developer telemetry must expose the singular mask-input paint role.");

const changedAfterResolution = packageWithMask();
const changedPaint = changedAfterResolution.nodes.mask.appearance.fills[0];
if (changedPaint.type === "SOLID") changedPaint.opacity = 0.5;
const staleMarkup = renderToStaticMarkup(createElement(TemplatePackageRenderer, { packageValue: changedAfterResolution, resolvedTree }));
assert(staleMarkup.includes('data-package-mask-tree-status="recomputed-stale"') && staleMarkup.includes('data-package-mask-fallback="unsupported-source-paint"') && !staleMarkup.includes("clip-path:inset("), "A stale mask revision must be rejected and recomputed from the current package before publication.");

const invalid = packageWithMask();
invalid.maskRelationships![0].parentId = "headline";
const invalidValidation = validateTemplatePackage(invalid);
assert(!invalidValidation.valid && invalidValidation.diagnostics.some((item) => item.code === "mask.cross-parent-source"), "Cross-parent mask scopes must fail semantic validation.");

const unsupported = packageWithMask();
unsupported.nodes.mask.mask = { isMask: true, maskType: "LUMINANCE" };
const unsupportedRelationship = resolvePackageMaskRelationships(unsupported).relationships[0];
assert(unsupportedRelationship.status === "valid" && unsupportedRelationship.capability === "unsupported-mask-type" && unsupportedRelationship.renderStrategy === "compatibility-unmasked", "Unsupported mask types must preserve scope and select explicit unmasked compatibility fallback.");

const transformed = packageWithMask();
transformed.nodes.mask.extensions = { figma: { relativeTransform: [[1, 0.1, 0], [0, 1, 0]] } };
assert(resolvePackageMaskRelationships(transformed).relationships[0].capability === "unsupported-source-transform", "Skewed mask sources must not enter the exact geometric subset.");

const translucent = packageWithMask();
const translucentPaint = translucent.nodes.mask.appearance.fills[0];
if (translucentPaint.type === "SOLID") translucentPaint.opacity = 0.5;
assert(resolvePackageMaskRelationships(translucent).relationships[0].capability === "unsupported-source-paint", "Partial-alpha mask paints must remain compatibility-owned until a compositing backend is proven.");

const sequential = packageWithMask();
const secondMask = structuredClone(sequential.nodes.mask);
secondMask.id = "mask-2";
secondMask.name = "Second independent mask";
secondMask.bounds.absolute.y = 1200;
secondMask.bounds.relative.y = 1200;
secondMask.extensions = { figma: { relativeTransform: [[1, 0, 0], [0, 1, 1200]] } };
const secondAffected = structuredClone(sequential.nodes.headline);
secondAffected.id = "second-affected";
secondAffected.name = "Second affected sibling";
secondAffected.bounds.absolute.y = 1200;
secondAffected.bounds.relative.y = 1200;
secondAffected.parentId = "root";
sequential.nodes[secondMask.id] = secondMask;
sequential.nodes[secondAffected.id] = secondAffected;
sequential.nodes.root.children.push(secondMask.id, secondAffected.id);
sequential.maskRelationships!.push({ maskSourceId: secondMask.id, affectedSiblingIds: [secondAffected.id], parentId: "root", scopeTerminationReason: "end_of_siblings" });
const sequentialResolution = resolvePackageMaskRelationships(sequential);
assert(sequentialResolution.relationships.length === 2 && sequentialResolution.relationships.every((entry) => entry.capability === "exact-opaque-rectangular-alpha"), "Multiple sequential source-declared masks must retain independent scopes and owners.");

const legacy = structuredClone(simpleFixedPoster) as unknown as TemplatePackageV1;
(legacy.nodes.headline.extensions ??= {}).figma = { isMask: true, maskType: "ALPHA" };
assert(resolvePackageMaskRelationships(legacy).relationships.length === 0, "Older extension-only packages must not infer source-certified sibling scopes.");

const namedLikeMask = structuredClone(simpleFixedPoster) as unknown as TemplatePackageV1;
namedLikeMask.nodes.headline.name = "alpha-mask-source";
assert(resolvePackageMaskRelationships(namedLikeMask).relationships.length === 0, "Node names must never classify a mask relationship.");

const orphan = packageWithMask();
delete orphan.maskRelationships;
assert(resolvePackageMaskRelationships(orphan).issues.some((issue) => issue.code === "mask.missing-relationship" && issue.severity === "warning"), "A canonical active mask without a declared range must remain an explicit compatibility warning.");

const selfMask = packageWithMask();
selfMask.maskRelationships![0].affectedSiblingIds = ["mask"];
assert(resolvePackageMaskRelationships(selfMask).issues.some((issue) => issue.code === "mask.self-mask"), "Self-mask relationships must be rejected explicitly.");

console.log("Source-certified mask relationship tests passed.");

import type {
  EditableFieldBinding,
  PackageAsset,
  PackagePaint,
  PackagePositioningMode,
  PackageTextPayload,
  PackageTextPayloadV0,
  TemplateNode,
  TemplatePackageV1,
} from "../types";
import {
  CANONICAL_SCENE_GRAPH_CONTRACT,
  CANONICAL_SCENE_GRAPH_VERSION,
  type CanonicalSceneGraphResult,
  type CanonicalSceneTransformationContext,
  type CanonicalSceneGraphV1,
  type CanonicalSceneNodeV1,
  type SceneCapabilityRecord,
  type SceneConfidence,
  type SceneMediaSection,
  type SceneProperty,
  type ScenePropertyAuthority,
  type ScenePropertyCandidate,
  type SceneProvenanceRecord,
  type SceneTextSection,
  type SceneUnmappedProperty,
} from "./types";
import { FIGMA_KEYS_MAPPED_TO_SCENE } from "./sourceToSceneMapping";
import {
  findMaskRelationshipForSource,
  resolvePackageMaskRelationships,
  stableMaskContractHash,
} from "../masks/packageMaskRelationships";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function finite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function positioning(node: TemplateNode): PackagePositioningMode {
  return typeof node.positioning === "string" ? node.positioning : node.positioning.mode;
}

function canonicalConstraint(node: TemplateNode, axis: "horizontal" | "vertical"): string | null {
  if (typeof node.positioning === "string") return null;
  const value = node.positioning.constraints?.[axis];
  return typeof value === "string" ? value.toUpperCase() : null;
}

function figma(node: TemplateNode): Record<string, unknown> | null {
  return isRecord(node.extensions?.figma) ? node.extensions.figma : null;
}

function recordsEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function property<T>({
  value,
  authority = "canonical-package",
  confidence = "high",
  sourcePath,
  candidates = [],
  ambiguity = null,
  fallback = null,
}: {
  value: T;
  authority?: ScenePropertyAuthority;
  confidence?: SceneConfidence;
  sourcePath: string;
  candidates?: ScenePropertyCandidate[];
  ambiguity?: string | null;
  fallback?: string | null;
}): SceneProperty<T> {
  const selected: ScenePropertyCandidate<T> = {
    authority,
    sourcePath,
    value,
    selected: true,
    reason: "Selected by the Milestone 2 property-authority contract",
  };
  const all = [selected, ...candidates.filter((candidate) => candidate.sourcePath !== sourcePath || !recordsEqual(candidate.value, value))];
  const conflict = all.some((candidate) => candidate.value !== null && !recordsEqual(candidate.value, value));
  const provenance: SceneProvenanceRecord[] = all.map((candidate) => ({
    stage:
      candidate.authority === "figma-extension"
        ? "raw-source"
        : candidate.authority === "enrichment"
          ? "enrichment"
          : candidate.authority === "user-working-package"
            ? "user-override"
            : candidate.authority === "fallback"
              ? "fallback"
              : "canonical",
    sourcePath: candidate.sourcePath,
    value: clone(candidate.value),
    note: candidate.reason,
  }));
  return { value: clone(value), authority, confidence, candidates: clone(all), provenance, conflict, ambiguity, fallback };
}

function candidate(authority: ScenePropertyAuthority, sourcePath: string, value: unknown, reason: string): ScenePropertyCandidate {
  return { authority, sourcePath, value: clone(value), selected: false, reason };
}

function collectNodeOrder(packageValue: TemplatePackageV1): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  const visit = (nodeId: string): void => {
    if (seen.has(nodeId)) return;
    seen.add(nodeId);
    const node = packageValue.nodes[nodeId];
    if (!node) return;
    order.push(nodeId);
    node.children.forEach(visit);
  };
  visit(packageValue.rootNodeId);
  Object.keys(packageValue.nodes).forEach(visit);
  return order;
}

function nodeAssetIds(node: TemplateNode): string[] {
  const ids = [
    node.image?.assetId,
    node.vector?.assetId,
    ...node.appearance.fills.map((paint) => paint.type === "IMAGE" ? paint.assetId : null),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
  return [...new Set(ids)];
}

function textSection(
  node: Extract<TemplateNode, { type: "TEXT" }>,
  baseNode: TemplateNode | null,
): SceneTextSection {
  const raw = clone(node.text);
  const detailed = "characters" in node.text;
  const text: PackageTextPayload | null = "characters" in node.text ? node.text : null;
  const legacy: PackageTextPayloadV0 | null = "content" in node.text ? node.text : null;
  const figmaData = figma(node);
  const characters = text?.characters ?? legacy?.content ?? "";
  const baseCharacters =
    baseNode?.type === "TEXT"
      ? "characters" in baseNode.text
        ? baseNode.text.characters
        : baseNode.text.content
      : null;
  const charactersEdited = baseCharacters !== null && baseCharacters !== characters;
  const family = text?.fontFamily ?? legacy?.style.fontFamily ?? null;
  const fontSize = text?.fontSize ?? legacy?.style.fontSize ?? null;
  const lineHeight = text?.lineHeight ?? (legacy?.style.lineHeight !== undefined ? { value: legacy.style.lineHeight, unit: "PIXELS" } : null);
  const letterSpacing = text?.letterSpacing ?? (legacy?.style.letterSpacing !== undefined ? { value: legacy.style.letterSpacing, unit: "PIXELS" } : null);
  const styleRanges = [
    ...(text?.styleRanges ?? []),
    ...(Array.isArray(figmaData?.styledTextSegments) ? figmaData.styledTextSegments : []),
    ...(Array.isArray(figmaData?.textStyleRanges) ? figmaData.textStyleRanges : []),
  ];
  const leadingTrimCandidate = nullableString(figmaData?.leadingTrim);
  return {
    rawPayload: raw as PackageTextPayload | PackageTextPayloadV0,
    characters: property({
      value: characters,
      sourcePath: `nodes.${node.id}.text.${detailed ? "characters" : "content"}`,
      authority: charactersEdited ? "user-working-package" : "canonical-package",
      candidates: charactersEdited
        ? [candidate("canonical-package", `basePackage.nodes.${node.id}.text`, baseCharacters, "Imported baseline before user edit")]
        : [],
    }),
    fontFamily: property({ value: family, sourcePath: `nodes.${node.id}.text.${detailed ? "fontFamily" : "style.fontFamily"}`, confidence: family ? "high" : "low", fallback: family ? null : "system fallback must remain diagnosed" }),
    fontPostScriptName: property({ value: text?.fontPostScriptName ?? null, sourcePath: `nodes.${node.id}.text.fontPostScriptName`, confidence: text?.fontPostScriptName ? "high" : "medium" }),
    fontStyle: property({ value: text?.fontStyle ?? legacy?.style.fontStyle ?? null, sourcePath: `nodes.${node.id}.text.${detailed ? "fontStyle" : "style.fontStyle"}` }),
    fontWeight: property({ value: text?.fontWeight ?? legacy?.style.fontWeight ?? null, sourcePath: `nodes.${node.id}.text.${detailed ? "fontWeight" : "style.fontWeight"}`, confidence: text?.fontWeight ?? legacy?.style.fontWeight ? "high" : "medium", fallback: "Infer from style name, then 400" }),
    fontSize: property({ value: fontSize, sourcePath: `nodes.${node.id}.text.${detailed ? "fontSize" : "style.fontSize"}` }),
    lineHeight: property({ value: clone(lineHeight), sourcePath: `nodes.${node.id}.text.${detailed ? "lineHeight" : "style.lineHeight"}`, confidence: lineHeight ? "high" : "medium", fallback: "1.2 times font size" }),
    letterSpacing: property({ value: clone(letterSpacing), sourcePath: `nodes.${node.id}.text.${detailed ? "letterSpacing" : "style.letterSpacing"}`, fallback: "0" }),
    horizontalAlignment: property({ value: text?.textAlignHorizontal ?? legacy?.style.textAlignHorizontal ?? null, sourcePath: `nodes.${node.id}.text.textAlignHorizontal`, fallback: "LEFT" }),
    verticalAlignment: property({ value: text?.textAlignVertical ?? legacy?.style.textAlignVertical ?? null, sourcePath: `nodes.${node.id}.text.textAlignVertical`, fallback: "TOP" }),
    autoResize: property({ value: text?.textAutoResize ?? legacy?.style.textAutoResize ?? null, sourcePath: `nodes.${node.id}.text.textAutoResize`, fallback: "NONE" }),
    leadingTrim: property({
      value: text?.leadingTrim ?? leadingTrimCandidate,
      sourcePath: text?.leadingTrim !== undefined ? `nodes.${node.id}.text.leadingTrim` : `nodes.${node.id}.extensions.figma.leadingTrim`,
      authority: text?.leadingTrim !== undefined ? "canonical-package" : leadingTrimCandidate ? "figma-extension" : "fallback",
      candidates: text?.leadingTrim !== undefined && leadingTrimCandidate ? [candidate("figma-extension", `nodes.${node.id}.extensions.figma.leadingTrim`, leadingTrimCandidate, "Preserved compatibility value")] : [],
      fallback: "NONE",
    }),
    paragraphSpacing: property({ value: text?.paragraphSpacing ?? null, sourcePath: `nodes.${node.id}.text.paragraphSpacing`, fallback: "0" }),
    decoration: property({ value: text?.textDecoration ?? null, sourcePath: `nodes.${node.id}.text.textDecoration`, fallback: "NONE" }),
    textCase: property({ value: text?.textCase ?? null, sourcePath: `nodes.${node.id}.text.textCase`, fallback: "ORIGINAL" }),
    styleRanges: clone(styleRanges),
    browserMeasurementRequired: node.sizing.vertical.mode === "HUG" || text?.textAutoResize === "HEIGHT" || text?.textAutoResize === "WIDTH_AND_HEIGHT",
    measurementInputs: ["available width", "characters", "font face", "font metrics", "font size", "line height", "letter spacing", "style ranges"],
  };
}

function imagePaint(node: TemplateNode): Extract<PackagePaint, { type: "IMAGE" }> | undefined {
  return node.appearance.fills.find((paint): paint is Extract<PackagePaint, { type: "IMAGE" }> => paint.type === "IMAGE");
}

function imageField(node: TemplateNode, packageValue: TemplatePackageV1): EditableFieldBinding | undefined {
  return packageValue.editableFields.find((field) => field.nodeId === node.id && field.property === "image.assetId");
}

function mediaSection(
  node: TemplateNode,
  packageValue: TemplatePackageV1,
  baseNode: TemplateNode | null,
): SceneMediaSection | null {
  const paint = imagePaint(node);
  const hint = packageValue.rendererHints?.[node.id];
  const imageHint = hint?.kind === "image" ? hint : null;
  const field = imageField(node, packageValue);
  const nodeAssetId = node.image?.assetId ?? null;
  const paintAssetId = paint?.assetId ?? null;
  const hintAssetId = imageHint?.assetId ?? null;
  const selectedAssetId = nodeAssetId ?? paintAssetId ?? hintAssetId;
  const baseAssetId = baseNode?.image?.assetId ?? (baseNode ? imagePaint(baseNode)?.assetId : null) ?? null;
  const assetEdited = baseAssetId !== null && selectedAssetId !== baseAssetId;
  if (!node.image && !paint && !imageHint) return null;
  const asset = selectedAssetId ? packageValue.assets[selectedAssetId] : undefined;
  const defaultAssetId = typeof field?.defaultValue === "string" ? field.defaultValue : null;
  const isReplacement = Boolean(selectedAssetId && defaultAssetId && selectedAssetId !== defaultAssetId);
  const fieldConstraints = field?.constraints && "replacementMode" in field.constraints ? field.constraints : null;
  const explicitPlacement = node.image?.activePlacement;
  let activePlacementState = explicitPlacement?.state ?? (isReplacement
    ? fieldConstraints?.replacementMode === "contain"
      ? "replacement-fit"
      : "replacement-fill"
    : "imported-source");
  if (activePlacementState === "imported-source" && isReplacement) {
    activePlacementState = "replacement-fill";
  }
  const replacementMode = activePlacementState === "replacement-fit"
    ? "contain"
    : activePlacementState === "replacement-fill" || activePlacementState === "editor-crop"
      ? "cover"
      : null;
  const rawScaleMode = node.image?.scaleMode ?? paint?.scaleMode ?? imageHint?.figmaScaleMode ?? asset?.scaleMode ?? "FILL";
  const selectedScaleMode = activePlacementState === "replacement-fit"
    ? "FIT"
    : activePlacementState === "replacement-fill" || activePlacementState === "editor-crop"
      ? "FILL"
      : rawScaleMode.toUpperCase();
  const transform = node.image?.imageTransform ?? imageHint?.imageTransform ?? null;
  const explicitPosition = node.image?.objectPosition;
  const focal = explicitPosition ? { x: Math.max(0, Math.min(1, explicitPosition.x)), y: Math.max(0, Math.min(1, explicitPosition.y)) } : { x: 0.5, y: 0.5 };
  return {
    kind: "image",
    assetId: property({
      value: selectedAssetId,
      sourcePath: nodeAssetId ? `nodes.${node.id}.image.assetId` : paintAssetId ? `nodes.${node.id}.appearance.fills[image].assetId` : `rendererHints.${node.id}.assetId`,
      authority: assetEdited ? "user-working-package" : nodeAssetId || paintAssetId ? "canonical-package" : hintAssetId ? "enrichment" : "fallback",
      candidates: [
        ...(assetEdited ? [candidate("canonical-package", `basePackage.nodes.${node.id}.image.assetId`, baseAssetId, "Imported baseline before user replacement")] : []),
        ...(paintAssetId ? [candidate("canonical-package", `nodes.${node.id}.appearance.fills[image].assetId`, paintAssetId, "Image-paint candidate")] : []),
        ...(hintAssetId ? [candidate("enrichment", `rendererHints.${node.id}.assetId`, hintAssetId, "Optional renderer-hint candidate")] : []),
      ],
      confidence: selectedAssetId ? "high" : "low",
      fallback: "Preserve missing reference and diagnose",
    }),
    scaleMode: property({
      value: selectedScaleMode,
      sourcePath: replacementMode === "contain" || replacementMode === "cover" ? `editableFields.${field?.id}.constraints.replacementMode` : node.image?.scaleMode ? `nodes.${node.id}.image.scaleMode` : paint?.scaleMode ? `nodes.${node.id}.appearance.fills[image].scaleMode` : imageHint?.figmaScaleMode ? `rendererHints.${node.id}.figmaScaleMode` : asset?.scaleMode ? `assets.${asset.id}.scaleMode` : "scene.fallback.image.scaleMode",
      authority: replacementMode === "contain" || replacementMode === "cover" ? "user-working-package" : node.image?.scaleMode || paint?.scaleMode || asset?.scaleMode ? "canonical-package" : imageHint?.figmaScaleMode ? "enrichment" : "fallback",
      candidates: [
        ...(node.image?.scaleMode ? [candidate("canonical-package", `nodes.${node.id}.image.scaleMode`, node.image.scaleMode, "Explicit node image mode")] : []),
        ...(paint?.scaleMode ? [candidate("canonical-package", `nodes.${node.id}.appearance.fills[image].scaleMode`, paint.scaleMode, "Image-paint mode")] : []),
        ...(imageHint?.figmaScaleMode ? [candidate("enrichment", `rendererHints.${node.id}.figmaScaleMode`, imageHint.figmaScaleMode, "Optional hint mode")] : []),
        ...(asset?.scaleMode ? [candidate("canonical-package", `assets.${asset.id}.scaleMode`, asset.scaleMode, "Asset metadata mode")] : []),
      ],
      confidence: "high",
      fallback: "FILL with aspect ratio preserved",
    }),
    imageTransform: property({ value: clone(transform), sourcePath: node.image?.imageTransform ? `nodes.${node.id}.image.imageTransform` : `rendererHints.${node.id}.imageTransform`, authority: node.image?.imageTransform ? "canonical-package" : imageHint?.imageTransform ? "enrichment" : "fallback", fallback: "No affine transform; use semantic fit/focal" }),
    focalPosition: property({ value: focal, sourcePath: explicitPosition ? `nodes.${node.id}.image.objectPosition` : "scene.fallback.image.focalPosition", authority: explicitPosition ? "canonical-package" : "fallback", confidence: explicitPosition ? "high" : transform ? "medium" : "high", ambiguity: transform && !explicitPosition ? "Current resolver derives a focal point from imageTransform; the scene preserves the transform and centers until a sampler contract is accepted" : null, fallback: "center 0.5/0.5" }),
    activePlacementState: property({
      value: activePlacementState,
      sourcePath: explicitPlacement
        ? `nodes.${node.id}.image.activePlacement.state`
        : isReplacement
          ? `editableFields.${field?.id ?? "missing"}.constraints.replacementMode`
          : `nodes.${node.id}.image.activePlacement`,
      authority: activePlacementState === "imported-source" ? "canonical-package" : "user-working-package",
      confidence: explicitPlacement || !isReplacement ? "high" : "medium",
      ambiguity: !explicitPlacement && isReplacement ? "Legacy replacement state inferred as Fill/Fit; save the package to persist explicit authority" : null,
      fallback: "imported-source",
    }),
    placementRevision: property({
      value: explicitPlacement?.revision ?? 0,
      sourcePath: `nodes.${node.id}.image.activePlacement.revision`,
      authority: explicitPlacement ? "user-working-package" : "canonical-package",
      fallback: "0 for imported packages without active replacement state",
    }),
    replacementMode: property({ value: replacementMode, sourcePath: explicitPlacement ? `nodes.${node.id}.image.activePlacement.state` : `editableFields.${field?.id ?? "missing"}.constraints.replacementMode`, authority: replacementMode ? "user-working-package" : "canonical-package", fallback: "null for imported source" }),
    intrinsicSize: { width: nullableNumber(asset?.width), height: nullableNumber(asset?.height) },
    slotBoundsSource: "node-relative-bounds",
    preserveAspectRatio: selectedScaleMode !== "STRETCH",
    adjustments: clone(figma(node)?.filters ?? figma(node)?.imageFilters ?? null),
  };
}

function capabilitiesForNode(node: TemplateNode, text: SceneTextSection | null, media: SceneMediaSection | null): SceneCapabilityRecord[] {
  const result: SceneCapabilityRecord[] = [];
  const add = (capabilityId: string, family: string, support: SceneCapabilityRecord["support"], strategy: string, fallback: string | null, confidence: SceneConfidence): void => {
    result.push({ capabilityId, family, support, strategy, fallback, diagnosticAudience: ["renderer"], confidence });
  };
  if (node.layout.mode === "VERTICAL") add("LAY-001", "layout", "emulated", "semantic vertical Auto Layout", "exported bounds", "high");
  if (node.layout.mode === "HORIZONTAL") add("LAY-002", "layout", "emulated", "semantic horizontal Auto Layout", "exported bounds", "high");
  if (node.layout.wrap) add("LAY-003", "layout", "emulated", "semantic wrapping intent", "no-wrap/snapshot", "medium");
  for (const axis of ["horizontal", "vertical"] as const) add(`LAY-${node.sizing[axis].mode === "FIXED" ? "007" : node.sizing[axis].mode === "HUG" ? "008" : "009"}`, "layout", "emulated", `${axis} ${node.sizing[axis].mode}`, "exported bounds", node.sizing[axis].mode === "HUG" ? "medium" : "high");
  if (text) add(text.styleRanges.length ? "TXT-002" : "TXT-001", "text", text.styleRanges.length ? "approximated" : "emulated", text.styleRanges.length ? "preserve runs; current renderer may use node style" : "semantic text", "preserve characters", text.styleRanges.length ? "medium" : "high");
  if (media) add(media.scaleMode.value === "FIT" ? "MED-002" : media.scaleMode.value === "CROP" ? "MED-003" : media.scaleMode.value === "TILE" ? "MED-004" : media.scaleMode.value === "STRETCH" ? "MED-005" : "MED-001", "media", media.scaleMode.value === "CROP" || media.scaleMode.value === "TILE" ? "approximated" : "emulated", `semantic ${media.scaleMode.value}`, "aspect-preserving FILL", media.scaleMode.value === "CROP" ? "medium" : "high");
  for (const paint of node.appearance.fills) {
    if (paint.type === "SOLID") add("PNT-001", "paint", "native", "ordered solid paint", null, "high");
    else if (paint.type.startsWith("GRADIENT")) add(`PNT-${paint.type === "GRADIENT_LINEAR" ? "003" : paint.type === "GRADIENT_RADIAL" ? "004" : paint.type === "GRADIENT_ANGULAR" ? "005" : "006"}`, "paint", "preserved-only", "preserve gradient semantics", "diagnose or future backend", "high");
  }
  if (node.appearance.strokes.length) add("STR-001", "stroke", "approximated", "ordered stroke semantics", "first solid stroke", "medium");
  if (node.appearance.effects.length) add("FX-001", "effects", "approximated", "ordered effect semantics", "preserve unsupported effect", "medium");
  if (node.appearance.blendMode || node.appearance.fills.some((paint) => paint.blendMode)) add("CMP-001", "compositing", "preserved-only", "preserve blend intent", "NORMAL", "low");
  const raw = figma(node);
  if (node.mask?.isMask === true) add("MSK-001", "masks", "emulated", "source-declared opaque rectangular ALPHA mask", "explicit unmasked compatibility fallback", "high");
  else if (raw?.isMask || raw?.maskType || node.mask?.maskType) add("MSK-002", "masks", "preserved-only", "preserve mask identity", "rectangular clip or no mask", "high");
  if (node.type === "COMPONENT") add("DS-001", "design-system", "preserved-only", "preserve component identity", "flattened hierarchy", "medium");
  if (node.type === "INSTANCE") add("DS-002", "design-system", "preserved-only", "preserve instance identity", "flattened hierarchy", "medium");
  return result;
}

function transformNode(
  node: TemplateNode,
  packageValue: TemplatePackageV1,
  order: string[],
  context: CanonicalSceneTransformationContext,
): { node: CanonicalSceneNodeV1; unmapped: SceneUnmappedProperty[] } {
  const maskResolution = resolvePackageMaskRelationships(packageValue);
  const declaredMask = findMaskRelationshipForSource(maskResolution.relationships, node.id);
  const raw = figma(node);
  const preservedMaskIdentity = node.mask
    ? node.mask.isMask === true
    : raw?.isMask === true;
  const parent = node.parentId ? packageValue.nodes[node.parentId] : null;
  const stackingIndex = parent ? Math.max(0, parent.children.indexOf(node.id)) : 0;
  const rawConstraints = isRecord(raw?.constraints) ? raw.constraints : null;
  const horizontalConstraint = canonicalConstraint(node, "horizontal") ?? nullableString(rawConstraints?.horizontal)?.toUpperCase() ?? null;
  const verticalConstraint = canonicalConstraint(node, "vertical") ?? nullableString(rawConstraints?.vertical)?.toUpperCase() ?? null;
  const fields = packageValue.editableFields.filter((field) => field.nodeId === node.id);
  const baseNode = context.basePackage?.nodes[node.id] ?? null;
  const text = node.type === "TEXT" ? textSection(node, baseNode) : null;
  const media = mediaSection(node, packageValue, baseNode);
  const mappedKeys = raw ? Object.keys(raw).filter((key) => FIGMA_KEYS_MAPPED_TO_SCENE.has(key)).sort() : [];
  const unmappedKeys = raw ? Object.keys(raw).filter((key) => !FIGMA_KEYS_MAPPED_TO_SCENE.has(key)).sort() : [];
  const unmapped = unmappedKeys.map((key): SceneUnmappedProperty => ({ nodeId: node.id, sourcePath: `nodes.${node.id}.extensions.figma.${key}`, key, value: clone(raw?.[key]), preservationPath: `nodes.${node.id}.provenance.rawFigmaExtension.${key}` }));
  const rawHorizontalConstraint = nullableString(rawConstraints?.horizontal)?.toUpperCase() ?? null;
  const rawVerticalConstraint = nullableString(rawConstraints?.vertical)?.toUpperCase() ?? null;
  const clipValue = node.layout.clipContent || node.appearance.clipContent === true;
  const rawClip = raw?.clipsContent === true;
  const absoluteBounds = clone(node.bounds.absolute);
  const relativeBounds = clone(node.bounds.relative);
  const result: CanonicalSceneNodeV1 = {
    identity: { id: node.id, sourceNodeId: node.id, name: node.name, type: node.type, parentId: node.parentId, children: [...node.children], childOrder: [...node.children], stackingIndex },
    layout: {
      positioning: property({ value: positioning(node), sourcePath: `nodes.${node.id}.positioning` }),
      autoLayout: {
        mode: property({ value: node.layout.mode, sourcePath: `nodes.${node.id}.layout.mode` }),
        wrap: property({ value: node.layout.wrap, sourcePath: `nodes.${node.id}.layout.wrap` }),
        gap: property({ value: node.layout.gap, sourcePath: `nodes.${node.id}.layout.gap` }),
        rowGap: property({ value: node.layout.rowGap ?? null, sourcePath: `nodes.${node.id}.layout.rowGap`, candidates: raw?.counterAxisSpacing !== undefined ? [candidate("figma-extension", `nodes.${node.id}.extensions.figma.counterAxisSpacing`, raw.counterAxisSpacing, "Raw counter-axis gap")]: [], fallback: "layout.gap" }),
        columnGap: property({ value: node.layout.columnGap ?? null, sourcePath: `nodes.${node.id}.layout.columnGap`, candidates: raw?.counterAxisSpacing !== undefined ? [candidate("figma-extension", `nodes.${node.id}.extensions.figma.counterAxisSpacing`, raw.counterAxisSpacing, "Raw counter-axis gap")]: [], fallback: "layout.gap" }),
        padding: property({ value: clone(node.layout.padding), sourcePath: `nodes.${node.id}.layout.padding` }),
        primaryAlignment: property({ value: node.layout.primaryAlignment, sourcePath: `nodes.${node.id}.layout.primaryAlignment` }),
        counterAlignment: property({ value: node.layout.counterAlignment, sourcePath: `nodes.${node.id}.layout.counterAlignment` }),
      },
      sizing: {
        horizontal: {
          mode: property({ value: node.sizing.horizontal.mode, sourcePath: `nodes.${node.id}.sizing.horizontal.mode`, candidates: raw?.layoutSizingHorizontal !== undefined ? [candidate("figma-extension", `nodes.${node.id}.extensions.figma.layoutSizingHorizontal`, raw.layoutSizingHorizontal, "Raw participation sizing")]: [], ambiguity: raw?.layoutSizingHorizontal && raw.layoutSizingHorizontal !== node.sizing.horizontal.mode ? "Raw Figma participation differs from normalized sizing" : null }),
          value: property({ value: node.sizing.horizontal.value ?? null, sourcePath: `nodes.${node.id}.sizing.horizontal.value` }),
          min: property({ value: node.sizing.horizontal.min ?? nullableNumber(raw?.minWidth), sourcePath: node.sizing.horizontal.min !== undefined && node.sizing.horizontal.min !== null ? `nodes.${node.id}.sizing.horizontal.min` : `nodes.${node.id}.extensions.figma.minWidth`, authority: node.sizing.horizontal.min !== undefined && node.sizing.horizontal.min !== null ? "canonical-package" : raw?.minWidth !== undefined ? "figma-extension" : "fallback", fallback: "no minimum" }),
          max: property({ value: node.sizing.horizontal.max ?? nullableNumber(raw?.maxWidth), sourcePath: node.sizing.horizontal.max !== undefined && node.sizing.horizontal.max !== null ? `nodes.${node.id}.sizing.horizontal.max` : `nodes.${node.id}.extensions.figma.maxWidth`, authority: node.sizing.horizontal.max !== undefined && node.sizing.horizontal.max !== null ? "canonical-package" : raw?.maxWidth !== undefined ? "figma-extension" : "fallback", fallback: "no maximum" }),
        },
        vertical: {
          mode: property({ value: node.sizing.vertical.mode, sourcePath: `nodes.${node.id}.sizing.vertical.mode`, candidates: raw?.layoutSizingVertical !== undefined ? [candidate("figma-extension", `nodes.${node.id}.extensions.figma.layoutSizingVertical`, raw.layoutSizingVertical, "Raw participation sizing")]: [], ambiguity: raw?.layoutSizingVertical && raw.layoutSizingVertical !== node.sizing.vertical.mode ? "Raw Figma participation differs from normalized sizing" : null }),
          value: property({ value: node.sizing.vertical.value ?? null, sourcePath: `nodes.${node.id}.sizing.vertical.value` }),
          min: property({ value: node.sizing.vertical.min ?? nullableNumber(raw?.minHeight), sourcePath: node.sizing.vertical.min !== undefined && node.sizing.vertical.min !== null ? `nodes.${node.id}.sizing.vertical.min` : `nodes.${node.id}.extensions.figma.minHeight`, authority: node.sizing.vertical.min !== undefined && node.sizing.vertical.min !== null ? "canonical-package" : raw?.minHeight !== undefined ? "figma-extension" : "fallback", fallback: "no minimum" }),
          max: property({ value: node.sizing.vertical.max ?? nullableNumber(raw?.maxHeight), sourcePath: node.sizing.vertical.max !== undefined && node.sizing.vertical.max !== null ? `nodes.${node.id}.sizing.vertical.max` : `nodes.${node.id}.extensions.figma.maxHeight`, authority: node.sizing.vertical.max !== undefined && node.sizing.vertical.max !== null ? "canonical-package" : raw?.maxHeight !== undefined ? "figma-extension" : "fallback", fallback: "no maximum" }),
        },
      },
      constraints: {
        horizontal: property({ value: horizontalConstraint, sourcePath: canonicalConstraint(node, "horizontal") ? `nodes.${node.id}.positioning.constraints.horizontal` : `nodes.${node.id}.extensions.figma.constraints.horizontal`, authority: canonicalConstraint(node, "horizontal") ? "canonical-package" : rawHorizontalConstraint ? "figma-extension" : "fallback", candidates: canonicalConstraint(node, "horizontal") && rawHorizontalConstraint ? [candidate("figma-extension", `nodes.${node.id}.extensions.figma.constraints.horizontal`, rawHorizontalConstraint, "Raw compatibility constraint")]: [], fallback: "snapshot bounds" }),
        vertical: property({ value: verticalConstraint, sourcePath: canonicalConstraint(node, "vertical") ? `nodes.${node.id}.positioning.constraints.vertical` : `nodes.${node.id}.extensions.figma.constraints.vertical`, authority: canonicalConstraint(node, "vertical") ? "canonical-package" : rawVerticalConstraint ? "figma-extension" : "fallback", candidates: canonicalConstraint(node, "vertical") && rawVerticalConstraint ? [candidate("figma-extension", `nodes.${node.id}.extensions.figma.constraints.vertical`, rawVerticalConstraint, "Raw compatibility constraint")]: [], fallback: "snapshot bounds" }),
      },
      rawParticipation: {
        layoutGrow: nullableNumber(raw?.layoutGrow), layoutAlign: nullableString(raw?.layoutAlign), layoutSizingHorizontal: nullableString(raw?.layoutSizingHorizontal), layoutSizingVertical: nullableString(raw?.layoutSizingVertical), primaryAxisSizingMode: nullableString(raw?.primaryAxisSizingMode), counterAxisSizingMode: nullableString(raw?.counterAxisSizingMode),
      },
    },
    transform: {
      relativeTransform: property({ value: Array.isArray(raw?.relativeTransform) ? clone(raw.relativeTransform as number[][]) : null, sourcePath: `nodes.${node.id}.extensions.figma.relativeTransform`, authority: raw?.relativeTransform ? "figma-extension" : "fallback", fallback: "identity" }),
      transform: property({ value: Array.isArray(raw?.transform) ? clone(raw.transform as number[][]) : null, sourcePath: `nodes.${node.id}.extensions.figma.transform`, authority: raw?.transform ? "figma-extension" : "fallback", fallback: "identity" }),
      rotation: property({ value: finite(raw?.rotation, 0), sourcePath: `nodes.${node.id}.extensions.figma.rotation`, authority: typeof raw?.rotation === "number" ? "figma-extension" : "fallback", fallback: "0" }),
      transformOrigin: property({ value: nullableString(raw?.transformOrigin), sourcePath: `nodes.${node.id}.extensions.figma.transformOrigin`, authority: raw?.transformOrigin ? "figma-extension" : "fallback", fallback: "center" }),
      opacity: property({ value: finite(node.appearance.opacity, 1), sourcePath: `nodes.${node.id}.appearance.opacity`, fallback: "1" }),
    },
    geometry: {
      absoluteBounds: property({ value: absoluteBounds, sourcePath: `nodes.${node.id}.bounds.absolute` }),
      relativeBounds: property({ value: relativeBounds, sourcePath: `nodes.${node.id}.bounds.relative` }),
      shape: { kind: node.shape?.type ?? (["RECTANGLE", "ELLIPSE", "LINE", "POLYGON", "STAR"].includes(node.type) ? node.type : null), cornerRadius: node.shape?.cornerRadius ?? node.appearance.cornerRadius ?? null, cornerRadii: clone(node.appearance.cornerRadii ?? null), cornerSmoothing: clone(raw?.cornerSmoothing ?? null), arcData: clone(raw?.arcData ?? null), polygonPointCount: clone(raw?.polygonPointCount ?? null), starInnerRadius: clone(raw?.starInnerRadius ?? null) },
      vector: clone(node.vector ?? null),
    },
    text,
    media,
    appearance: {
      visible: property({ value: node.appearance.visible !== false, sourcePath: `nodes.${node.id}.appearance.visible`, fallback: "true" }),
      opacity: property({ value: finite(node.appearance.opacity, 1), sourcePath: `nodes.${node.id}.appearance.opacity`, fallback: "1" }),
      blendMode: property({ value: node.appearance.blendMode ?? nullableString(raw?.blendMode), sourcePath: node.appearance.blendMode ? `nodes.${node.id}.appearance.blendMode` : `nodes.${node.id}.extensions.figma.blendMode`, authority: node.appearance.blendMode ? "canonical-package" : raw?.blendMode ? "figma-extension" : "fallback", fallback: "NORMAL" }),
      fills: node.appearance.fills.map((paint, sourceIndex) => ({
        ...clone(paint),
        sourceIndex,
        ...(packageValue.maskRelationships ? {
          paintRole: declaredMask
            ? "mask-input" as const
            : paint.blendMode && !["NORMAL", "PASS_THROUGH"].includes(paint.blendMode.toUpperCase())
              ? "unsupported-compositing-input" as const
              : "ordinary-visible" as const,
          paintRevision: `paint-v1:${stableMaskContractHash({ packageId: packageValue.packageId, nodeId: node.id, sourceIndex, paint })}`,
        } : {}),
      })),
      strokes: node.appearance.strokes.map((stroke, sourceIndex) => ({ ...clone(stroke), sourceIndex })),
      strokeWeight: node.appearance.strokeWeight ?? nullableNumber(raw?.strokeWeight),
      strokeAlign: node.appearance.strokeAlign ?? nullableString(raw?.strokeAlign),
      effects: node.appearance.effects.map((effect, sourceIndex) => ({ ...clone(effect), sourceIndex })),
      cornerRadius: clone(node.appearance.cornerRadii ?? node.appearance.cornerRadius ?? node.appearance.borderRadius ?? null),
      clipping: {
        clipsContent: property({ value: clipValue, sourcePath: node.layout.clipContent ? `nodes.${node.id}.layout.clipContent` : node.appearance.clipContent === true ? `nodes.${node.id}.appearance.clipContent` : rawClip ? `nodes.${node.id}.extensions.figma.clipsContent` : "scene.fallback.clip", authority: clipValue ? "canonical-package" : rawClip ? "figma-extension" : "fallback", candidates: raw?.clipsContent !== undefined ? [candidate("figma-extension", `nodes.${node.id}.extensions.figma.clipsContent`, raw.clipsContent, "Raw clipping compatibility")]: [], fallback: "false" }),
        isMask: property({ value: preservedMaskIdentity, sourcePath: node.mask ? `nodes.${node.id}.mask.isMask` : `nodes.${node.id}.extensions.figma.isMask`, authority: node.mask ? "canonical-package" : raw?.isMask !== undefined ? "figma-extension" : "fallback", candidates: node.mask && raw?.isMask !== undefined ? [candidate("figma-extension", `nodes.${node.id}.extensions.figma.isMask`, raw.isMask, "Raw compatibility mask marker")] : [], fallback: "false" }),
        maskType: property({ value: nullableString(node.mask?.maskType ?? raw?.maskType)?.toUpperCase() ?? null, sourcePath: node.mask?.maskType ? `nodes.${node.id}.mask.maskType` : `nodes.${node.id}.extensions.figma.maskType`, authority: node.mask?.maskType ? "canonical-package" : raw?.maskType ? "figma-extension" : "fallback", fallback: "No mask" }),
        shouldBreakMaskChain: property({ value: raw?.shouldBreakMaskChain === true, sourcePath: `nodes.${node.id}.extensions.figma.shouldBreakMaskChain`, authority: raw?.shouldBreakMaskChain !== undefined ? "figma-extension" : "fallback", fallback: "false" }),
      },
    },
    relationships: {
      assetIds: nodeAssetIds(node), editableFieldIds: fields.map((field) => field.id),
      maskRelationship: {
        isMask: preservedMaskIdentity,
        maskType: nullableString(node.mask?.maskType ?? raw?.maskType)?.toUpperCase() ?? null,
        shouldBreakMaskChain: raw?.shouldBreakMaskChain === true,
        maskedSiblingRange: declaredMask ? "source-declared" : raw?.isMask || raw?.maskType || node.mask?.isMask ? "unresolved" : null,
        ...(declaredMask ? {
          relationshipId: declaredMask.relationshipId,
          affectedSiblingIds: declaredMask.affected.map((entry) => entry.nodeId),
          capability: declaredMask.capability,
          paintRole: declaredMask.paintRole,
        } : {}),
      },
      component: { componentId: nullableString(raw?.componentId), componentSetId: nullableString(raw?.componentSetId), mainComponentId: nullableString(raw?.mainComponentId), variantProperties: clone(raw?.variantProperties ?? null), componentProperties: clone(raw?.componentProperties ?? null) },
      variables: clone(raw?.boundVariables ?? raw?.resolvedVariableModes ?? null),
      styles: clone(raw?.styles ?? raw?.styleId ?? null),
    },
    capabilities: [],
    provenance: { canonicalPath: `nodes.${node.id}`, rawFigmaExtension: clone(raw), rendererHint: clone(packageValue.rendererHints?.[node.id] ?? null), packageDiagnostics: clone((packageValue.diagnostics ?? []).filter((diagnostic) => diagnostic.nodeId === node.id)), mappedRawFigmaKeys: mappedKeys, unmappedRawFigmaKeys: unmappedKeys },
  };
  result.capabilities = capabilitiesForNode(node, text, media);
  if (!order.includes(node.id)) throw new Error(`Internal scene transform order error for ${node.id}`);
  return { node: result, unmapped };
}

function transformAsset(asset: PackageAsset, packageValue: TemplatePackageV1): CanonicalSceneGraphV1["assets"][string] {
  const usedBy = Object.values(packageValue.nodes).filter((node) => nodeAssetIds(node).includes(asset.id)).map((node) => node.id);
  return { id: asset.id, type: asset.type, source: asset.source, mimeType: asset.mimeType ?? null, width: nullableNumber(asset.width), height: nullableNumber(asset.height), hash: asset.hash ?? null, storageKey: asset.storageKey ?? null, stableUrl: asset.stableUrl ?? null, usedBy, raw: clone(asset) };
}

export function createCanonicalSceneGraph(
  packageValue: TemplatePackageV1,
  context: CanonicalSceneTransformationContext = {},
): CanonicalSceneGraphResult {
  const order = collectNodeOrder(packageValue);
  const transformed = order.filter((id) => Boolean(packageValue.nodes[id])).map((id) => transformNode(packageValue.nodes[id], packageValue, order, context));
  const nodes = Object.fromEntries(transformed.map(({ node }) => [node.identity.id, node]));
  const unmappedProperties = transformed.flatMap(({ unmapped }) => unmapped);
  const capabilities = [...new Map(Object.values(nodes).flatMap((node) => node.capabilities).map((capability) => [`${capability.capabilityId}:${capability.strategy}`, capability])).values()];
  const maskResolution = resolvePackageMaskRelationships(packageValue);
  const transformationDiagnostics = [
    { code: "scene-runtime-routing-disabled", severity: "info" as const, message: "Canonical scene graph was created observationally; runtime renderer authority is unchanged." },
    ...(!context.basePackage ? [{ code: "scene-user-override-baseline-unavailable", severity: "info" as const, message: "No basePackage context was supplied, so workingPackage values are authoritative but imported-versus-user provenance cannot be distinguished." }] : []),
    ...(unmappedProperties.length ? [{ code: "scene-unmapped-source-properties-preserved", severity: "warning" as const, message: `${unmappedProperties.length} raw Figma properties are not semantically mapped and remain preserved in node provenance.` }] : []),
  ];
  const graph: CanonicalSceneGraphV1 = {
    schemaVersion: CANONICAL_SCENE_GRAPH_VERSION,
    contract: CANONICAL_SCENE_GRAPH_CONTRACT,
    sourcePackage: { packageId: packageValue.packageId, packageSchemaVersion: packageValue.schemaVersion, name: packageValue.name, rootNodeId: packageValue.rootNodeId, sourceType: packageValue.source?.type ?? null, pluginVersion: packageValue.source?.pluginVersion ?? null },
    rootNodeId: packageValue.rootNodeId,
    canvas: { width: packageValue.canvas.width, height: packageValue.canvas.height, background: clone(packageValue.canvas.background ?? null), coordinateSpace: packageValue.canvas.coordinateSpace ?? null },
    nodeOrder: order,
    nodes,
    ...(packageValue.maskRelationships ? {
      maskRelationships: maskResolution.relationships.map((relationship) => ({
        relationshipId: relationship.relationshipId,
        maskRevision: relationship.maskRevision,
        maskSourceId: relationship.maskSourceId,
        parentId: relationship.parentId,
        affectedSiblingIds: relationship.affected.map((entry) => entry.nodeId),
        maskType: relationship.maskType,
        scopeTerminationReason: relationship.source.scopeTerminationReason,
        status: relationship.status,
        capability: relationship.capability,
        renderStrategy: relationship.renderStrategy,
        paintRole: relationship.paintRole,
        confidence: relationship.capability === "exact-opaque-rectangular-alpha" ? "high" as const : "unresolved" as const,
        sourceReferences: {
          nodePath: `nodes.${relationship.maskSourceId}`,
          geometryPath: `nodes.${relationship.maskSourceId}.bounds.relative`,
          transformPath: `nodes.${relationship.maskSourceId}.extensions.figma.relativeTransform`,
          opacityPath: `nodes.${relationship.maskSourceId}.appearance.opacity`,
          paintPaths: (packageValue.nodes[relationship.maskSourceId]?.appearance.fills ?? []).map((_, index) => `nodes.${relationship.maskSourceId}.appearance.fills.${index}`),
        },
        provenance: {
          sourcePath: `maskRelationships.${relationship.relationshipIndex}`,
          raw: clone(relationship.source),
        },
      })),
    } : {}),
    assets: Object.fromEntries(Object.keys(packageValue.assets).map((id) => [id, transformAsset(packageValue.assets[id], packageValue)])),
    editableFields: clone(packageValue.editableFields),
    fonts: (packageValue.fontRequirements ?? []).map((font) => ({ id: font.id, family: font.family, style: font.style, cssStyle: font.cssStyle, weight: font.weight, postScriptName: font.postScriptName, usedBy: [...font.usedBy], assetId: font.assetId ?? null, resolution: { match: font.resolution?.match ?? null, confirmed: font.resolution?.confirmed ?? null, managedFontId: font.resolution?.managedFontId ?? null, fallbackFamily: font.resolution?.fallbackFamily ?? null }, raw: clone(font) })),
    motion: packageValue.motion ? { format: packageValue.motion.format, raw: clone(packageValue.motion.raw), linking: clone(packageValue.motion.linking) } : null,
    rendererHints: clone(packageValue.rendererHints ?? {}),
    capabilities,
    sourceDiagnostics: clone(packageValue.diagnostics ?? []),
    transformationDiagnostics,
    unmappedProperties,
    compatibility: { runtimeUse: "disabled-observational", currentResolvedContract: "resolved-template-graph-v1", rendererAuthority: "unchanged" },
  };
  return { graph, diagnostics: transformationDiagnostics, unmappedProperties };
}

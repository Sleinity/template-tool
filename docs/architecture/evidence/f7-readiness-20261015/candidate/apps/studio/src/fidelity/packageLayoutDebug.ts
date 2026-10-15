import type {
  EditableFieldBinding,
  PackageLayoutMode,
  PackageSizingMode,
  TemplateNode,
  TemplatePackageV1,
} from "@sleinity/template-core";
import {
  resolvePackageNodeLayoutRole,
  type PackageNodeLayoutRole,
} from "@sleinity/template-react/renderer-internal";
import { resolvePackageAbsoluteConstraints } from "@sleinity/template-react/renderer-internal";

export type PackageLayoutDebugSeverity = "info" | "warning";

export interface PackageLayoutDebugFlag {
  code: string;
  severity: PackageLayoutDebugSeverity;
  message: string;
  nodeId: string;
}

export interface PackageNodeDomMeasurement {
  nodeId: string;
  available: boolean;
  offsetWidth: number | null;
  offsetHeight: number | null;
  offsetLeft?: number | null;
  offsetTop?: number | null;
  clientWidth: number | null;
  clientHeight: number | null;
  scrollWidth: number | null;
  scrollHeight: number | null;
  rect: {
    width: number;
    height: number;
    top: number;
    left: number;
  } | null;
  inline: {
    width: string;
    height: string;
    top: string;
    left: string;
    right?: string;
    bottom?: string;
    translate?: string;
  } | null;
  computed: {
    display: string;
    position: string;
    flexDirection: string;
    flexGrow: string;
    flexShrink: string;
    flexBasis: string;
    width: string;
    height: string;
    minWidth: string;
    minHeight: string;
    maxWidth: string;
    maxHeight: string;
    overflow: string;
    alignSelf: string;
    top: string;
    left: string;
    gap: string;
    rowGap: string;
    columnGap: string;
    paddingTop: string;
    paddingRight: string;
    paddingBottom: string;
    paddingLeft: string;
    right?: string;
    bottom?: string;
    translate?: string;
  } | null;
  rendering?: {
    liveResizeContainment: string | null;
    constraintHorizontal: string | null;
    constraintVertical: string | null;
    constraintHorizontalRaw: string | null;
    constraintVerticalRaw: string | null;
    constraintHorizontalNormalized?: string | null;
    constraintVerticalNormalized?: string | null;
    constraintStretchActive?: string | null;
    constraintSizingOverride: string | null;
    constraintHorizontalOffsets: string | null;
    constraintVerticalOffsets: string | null;
    constraintResolution: string | null;
    constraintFallback: string | null;
    autoLayoutContainer: string | null;
    textTrimMode?: string | null;
    textTrimAuthority?: string | null;
    textBrowserLineBox?: string | null;
    textTrimmedBox?: string | null;
    textGlyphPaintBounds?: string | null;
  };
}

export interface PackageLayoutExpectedBehavior {
  flexGrow: number | null;
  flexShrink: number | null;
  flexBasis: string | null;
  minWidth: string | number | null;
  minHeight: string | number | null;
  position: "relative" | "absolute";
}

export interface PackageAbsoluteConstraintDiagnostic {
  active: boolean;
  renderMode: "static" | "editor";
  parentSnapshotSize: {
    width: number;
    height: number;
  };
  parentLiveSize: {
    width: number | null;
    height: number | null;
  };
  childSnapshotBounds: TemplateNode["bounds"]["relative"];
  childLive: {
    x: number | null;
    y: number | null;
    width: number | null;
    height: number | null;
  };
  constraints: {
    horizontal: {
      raw: string | null;
      normalized: string | null;
      effective: string | null;
    };
    vertical: {
      raw: string | null;
      normalized: string | null;
      effective: string | null;
    };
  };
  exportedOffsets: {
    left: number | null;
    right: number | null;
    top: number | null;
    bottom: number | null;
  };
  centerUsesTranslate: {
    horizontal: boolean;
    vertical: boolean;
  };
  usesLiveHugSize: {
    horizontal: boolean;
    vertical: boolean;
  };
  usesFillStretchSizing: {
    horizontal: boolean;
    vertical: boolean;
  };
  usesConstraintDrivenStretch: {
    horizontal: boolean;
    vertical: boolean;
  };
  stretchActive: {
    horizontal: boolean;
    vertical: boolean;
  };
  stretchSuppressedByHug: {
    horizontal: boolean;
    vertical: boolean;
  };
}

export interface PackageLayoutNodeDiagnostic {
  identity: {
    id: string;
    name: string;
    type: string;
    parentId: string | null;
    positioning: string;
  };
  normalized: {
    layoutMode: PackageLayoutMode;
    layoutDirection: "horizontal" | "vertical" | null;
    gap: number;
    rowGap: number | undefined;
    columnGap: number | undefined;
    sizing: TemplateNode["sizing"];
    bounds: TemplateNode["bounds"]["relative"];
  };
  figma: Record<string, unknown> | null;
  renderer: PackageNodeLayoutRole & {
    expected: PackageLayoutExpectedBehavior;
  };
  absoluteConstraint: PackageAbsoluteConstraintDiagnostic | null;
  measurement: PackageNodeDomMeasurement | null;
  flags: PackageLayoutDebugFlag[];
}

export interface PackageLayoutSiblingDiagnostic
  extends PackageLayoutNodeDiagnostic {
  shouldYieldSpace: boolean;
}

export interface PackageLayoutParentSummary {
  parent: {
    id: string;
    name: string;
    layoutMode: PackageLayoutMode;
    mainAxis: "horizontal" | "vertical";
    mainAxisSizing: PackageSizingMode;
  };
  flowChildCount: number;
  measuredFlowChildCount: number;
  totalMeasuredFlowChildrenMainSize: number | null;
  parentMeasuredMainSize: number | null;
  mainAxisPadding: number;
  measuredGapTotal: number;
  remainingSpace: number | null;
  flowChildrenExceedParent: boolean | null;
  fillCandidates: string[];
  nonShrinkingCandidates: string[];
  flags: PackageLayoutDebugFlag[];
}

export interface PackageLayoutChainEntry
  extends PackageLayoutNodeDiagnostic {
  depth: number;
  siblings: PackageLayoutSiblingDiagnostic[];
  parentSummary: PackageLayoutParentSummary | null;
}

export interface PackageLayoutDebugReport {
  field: Pick<
    EditableFieldBinding,
    "id" | "type" | "nodeId" | "property"
  > | null;
  renderMode: "static" | "editor";
  entries: PackageLayoutChainEntry[];
  flags: PackageLayoutDebugFlag[];
}

const figmaLayoutKeys = [
  "layoutMode",
  "primaryAxisSizingMode",
  "counterAxisSizingMode",
  "layoutGrow",
  "layoutAlign",
  "layoutSizingHorizontal",
  "layoutSizingVertical",
  "layoutPositioning",
  "constraints",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "itemSpacing",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "primaryAxisAlignItems",
  "counterAxisAlignItems",
  "clipContent",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function positioningValue(node: TemplateNode): string {
  return typeof node.positioning === "string"
    ? node.positioning
    : node.positioning.mode;
}

function pickFigmaLayoutData(node: TemplateNode): Record<string, unknown> | null {
  const figma = isRecord(node.extensions?.figma)
    ? node.extensions.figma
    : null;
  if (!figma) return null;

  const picked: Record<string, unknown> = {};
  for (const key of figmaLayoutKeys) {
    if (key in figma) picked[key] = figma[key];
  }
  return Object.keys(picked).length > 0 ? picked : null;
}

export function collectPackageLayoutChain(
  packageValue: TemplatePackageV1,
  targetNodeId: string,
): TemplateNode[] {
  const chain: TemplateNode[] = [];
  const visited = new Set<string>();
  let current = packageValue.nodes[targetNodeId];

  while (current && !visited.has(current.id)) {
    chain.push(current);
    visited.add(current.id);
    if (!current.parentId) break;
    current = packageValue.nodes[current.parentId];
  }

  return chain;
}

export function collectPackageLayoutDebugNodeIds(
  packageValue: TemplatePackageV1,
  targetNodeId: string,
): string[] {
  const ids = new Set<string>();
  for (const node of collectPackageLayoutChain(packageValue, targetNodeId)) {
    ids.add(node.id);
    if (!node.parentId) continue;
    const parent = packageValue.nodes[node.parentId];
    if (!parent) continue;
    ids.add(parent.id);
    for (const childId of parent.children) ids.add(childId);
  }
  return [...ids];
}

function expectedFlexValue(
  sizing: PackageSizingMode | null,
  parentIsAutoLayout: boolean,
  renderMode: "static" | "editor",
): Pick<PackageLayoutExpectedBehavior, "flexGrow" | "flexShrink" | "flexBasis"> {
  if (!parentIsAutoLayout || sizing === null) {
    return { flexGrow: null, flexShrink: null, flexBasis: null };
  }
  if (sizing === "FILL") {
    return { flexGrow: 1, flexShrink: 1, flexBasis: "0px" };
  }
  if (renderMode === "editor") {
    return { flexGrow: 0, flexShrink: 0, flexBasis: "auto" };
  }
  return { flexGrow: null, flexShrink: null, flexBasis: null };
}

function expectedBehavior(
  node: TemplateNode,
  role: PackageNodeLayoutRole,
  renderMode: "static" | "editor",
): PackageLayoutExpectedBehavior {
  const flex = expectedFlexValue(
    role.mainAxisSizing,
    role.parentIsAutoLayout && !role.isAbsolute,
    renderMode,
  );
  return {
    ...flex,
    minWidth:
      node.sizing.horizontal.min ??
      (node.sizing.horizontal.mode === "FILL" ||
      (renderMode === "editor" &&
        role.parentIsAutoLayout &&
        node.sizing.horizontal.mode === "HUG")
        ? 0
        : null),
    minHeight:
      node.sizing.vertical.min ??
      (node.sizing.vertical.mode === "FILL" ||
      (renderMode === "editor" &&
        role.parentIsAutoLayout &&
        node.sizing.vertical.mode === "HUG")
        ? 0
        : null),
    position: role.isAbsolute ? "absolute" : "relative",
  };
}

function unavailableMeasurement(nodeId: string): PackageNodeDomMeasurement {
  return {
    nodeId,
    available: false,
    offsetWidth: null,
    offsetHeight: null,
    clientWidth: null,
    clientHeight: null,
    scrollWidth: null,
    scrollHeight: null,
    rect: null,
    inline: null,
    computed: null,
  };
}

export function measurePackageLayoutChain(
  nodeIds: string[],
  scope?: ParentNode | null,
): Record<string, PackageNodeDomMeasurement> {
  if (
    !scope ||
    typeof scope.querySelectorAll !== "function" ||
    typeof getComputedStyle !== "function"
  ) {
    return Object.fromEntries(
      nodeIds.map((nodeId) => [nodeId, unavailableMeasurement(nodeId)]),
    );
  }
  const wanted = new Set(nodeIds);
  const elements = Array.from(
    scope.querySelectorAll<HTMLElement>("[data-package-node-id]"),
  );
  const byId = new Map(
    elements
      .map((element) => [
        element.dataset.packageNodeId,
        element,
      ] as const)
      .filter(
        (item): item is readonly [string, HTMLElement] =>
          Boolean(item[0]) && wanted.has(item[0] as string),
      ),
  );

  return Object.fromEntries(
    nodeIds.map((nodeId) => {
      const element = byId.get(nodeId);
      if (!element) return [nodeId, unavailableMeasurement(nodeId)];
      const rect = element.getBoundingClientRect();
      const computed = getComputedStyle(element);
      return [
        nodeId,
        {
          nodeId,
          available: true,
          offsetWidth: element.offsetWidth,
          offsetHeight: element.offsetHeight,
          offsetLeft: element.offsetLeft,
          offsetTop: element.offsetTop,
          clientWidth: element.clientWidth,
          clientHeight: element.clientHeight,
          scrollWidth: element.scrollWidth,
          scrollHeight: element.scrollHeight,
          rect: {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
          },
          inline: {
            width: element.style.width,
            height: element.style.height,
            top: element.style.top,
            left: element.style.left,
            right: element.style.right,
            bottom: element.style.bottom,
            translate: element.style.translate,
          },
          computed: {
            display: computed.display,
            position: computed.position,
            flexDirection: computed.flexDirection,
            flexGrow: computed.flexGrow,
            flexShrink: computed.flexShrink,
            flexBasis: computed.flexBasis,
            width: computed.width,
            height: computed.height,
            minWidth: computed.minWidth,
            minHeight: computed.minHeight,
            maxWidth: computed.maxWidth,
            maxHeight: computed.maxHeight,
            overflow: computed.overflow,
            alignSelf: computed.alignSelf,
            top: computed.top,
            left: computed.left,
            right: computed.right,
            bottom: computed.bottom,
            translate: computed.translate,
            gap: computed.gap,
            rowGap: computed.rowGap,
            columnGap: computed.columnGap,
            paddingTop: computed.paddingTop,
            paddingRight: computed.paddingRight,
            paddingBottom: computed.paddingBottom,
            paddingLeft: computed.paddingLeft,
          },
          rendering: {
            liveResizeContainment:
              element.dataset.packageLiveResizeContainment ?? null,
            constraintHorizontal:
              element.dataset.packageConstraintHorizontal ?? null,
            constraintVertical:
              element.dataset.packageConstraintVertical ?? null,
            constraintHorizontalRaw:
              element.dataset.packageConstraintHorizontalRaw ?? null,
            constraintVerticalRaw:
              element.dataset.packageConstraintVerticalRaw ?? null,
            constraintHorizontalNormalized:
              element.dataset.packageConstraintHorizontalNormalized ?? null,
            constraintVerticalNormalized:
              element.dataset.packageConstraintVerticalNormalized ?? null,
            constraintStretchActive:
              element.dataset.packageConstraintStretchActive ?? null,
            constraintSizingOverride:
              element.dataset.packageConstraintSizingOverride ?? null,
            constraintHorizontalOffsets:
              element.dataset.packageConstraintHorizontalOffsets ?? null,
            constraintVerticalOffsets:
              element.dataset.packageConstraintVerticalOffsets ?? null,
            constraintResolution:
              element.dataset.packageConstraintResolution ?? null,
            constraintFallback:
              element.dataset.packageConstraintFallback ?? null,
            autoLayoutContainer:
              element.dataset.packageAutoLayoutContainer ?? null,
            textTrimMode: element.dataset.packageTextTrimMode ?? null,
            textTrimAuthority: element.dataset.packageTextTrimAuthority ?? null,
            textBrowserLineBox: element.dataset.packageTextBrowserLineBox ?? null,
            textTrimmedBox: element.dataset.packageTextTrimmedBox ?? null,
            textGlyphPaintBounds: element.dataset.packageTextGlyphPaintBounds ?? null,
          },
        } satisfies PackageNodeDomMeasurement,
      ];
    }),
  );
}

function numericCssValue(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function recognizedFigmaSizing(value: unknown): PackageSizingMode | null {
  if (value === "AUTO") return "HUG";
  if (value === "FIXED") return "FIXED";
  return null;
}

function flag(
  code: string,
  message: string,
  nodeId: string,
  severity: PackageLayoutDebugSeverity = "warning",
): PackageLayoutDebugFlag {
  return { code, severity, message, nodeId };
}

export function detectPackageLayoutSuspiciousFlags(
  entry: Omit<PackageLayoutNodeDiagnostic, "flags">,
): PackageLayoutDebugFlag[] {
  const flags: PackageLayoutDebugFlag[] = [];
  const { measurement, renderer, normalized, figma, identity } = entry;
  const measured = measurement?.available ? measurement : null;
  const computed = measured?.computed;

  if (
    computed &&
    normalized.layoutMode !== "NONE" &&
    normalized.gap > 0
  ) {
    const computedGap = numericCssValue(computed.gap);
    if (
      computedGap === null ||
      Math.abs(computedGap - normalized.gap) > 0.5
    ) {
      flags.push(
        flag(
          "auto-layout-gap-mismatch",
          `Normalized gap is ${normalized.gap}px, but computed CSS gap is ${computed.gap || "unavailable"}.`,
          identity.id,
        ),
      );
    }
  }

  if (
    measured &&
    measured.scrollHeight !== null &&
    measured.clientHeight !== null &&
    measured.scrollHeight > measured.clientHeight + 1
  ) {
    const semanticTrim = measured.rendering?.textTrimAuthority === "authoritative";
    flags.push(semanticTrim
      ? flag(
          computed?.overflow === "hidden"
            ? "text-content-clipped"
            : "text-glyph-overhang",
          computed?.overflow === "hidden"
            ? "Glyph paint exceeds the semantic trimmed box and is clipped by an explicit overflow policy."
            : "Glyph paint extends outside the semantic cap-to-baseline layout box without being clipped.",
          identity.id,
          computed?.overflow === "hidden" ? "warning" : "info",
        )
      : flag(
          "vertical-overflow",
          `Content is ${measured.scrollHeight - measured.clientHeight}px taller than the client box.`,
          identity.id,
        ));
  }
  if (
    measured?.rendering?.textTrimAuthority === "authoritative" &&
    measured.rendering.textBrowserLineBox &&
    measured.rendering.textTrimmedBox &&
    measured.rendering.textBrowserLineBox !== measured.rendering.textTrimmedBox
  ) {
    flags.push(flag(
      "text-line-box-variance",
      "The browser line box differs from the canonical Figma trimmed text box; the trimmed box owns layout and selection geometry.",
      identity.id,
      "info",
    ));
  }
  if (
    measured &&
    measured.scrollWidth !== null &&
    measured.clientWidth !== null &&
    measured.scrollWidth > measured.clientWidth + 1
  ) {
    flags.push(
      flag(
        "horizontal-overflow",
        `Content is ${measured.scrollWidth - measured.clientWidth}px wider than the client box.`,
        identity.id,
      ),
    );
  }
  if (
    computed &&
    renderer.parentIsAutoLayout &&
    renderer.positioning === "FLOW" &&
    computed.position === "absolute"
  ) {
    flags.push(
      flag(
        "flow-child-is-absolute",
        "A FLOW child inside Auto Layout is computed as position:absolute.",
        identity.id,
      ),
    );
  }
  if (
    computed &&
    renderer.parentIsAutoLayout &&
    renderer.positioning === "FLOW" &&
    ((measured.inline?.top && measured.inline.top !== "auto") ||
      (measured.inline?.left && measured.inline.left !== "auto"))
  ) {
    flags.push(
      flag(
        "flow-child-has-offset",
        "A FLOW child inside Auto Layout has an inline top or left offset.",
        identity.id,
      ),
    );
  }
  if (
    computed &&
    renderer.positioning === "ABSOLUTE" &&
    computed.position !== "absolute"
  ) {
    flags.push(
      flag(
        "absolute-child-in-flow",
        "An ABSOLUTE package child is not computed as position:absolute.",
        identity.id,
      ),
    );
  }
  if (
    computed &&
    renderer.mainAxisSizing === "FILL" &&
    numericCssValue(computed.flexGrow) === 0
  ) {
    flags.push(
      flag(
        "fill-without-grow",
        "A main-axis FILL child has computed flex-grow: 0.",
        identity.id,
      ),
    );
  }
  if (
    computed &&
    renderer.mainAxisSizing === "FILL" &&
    numericCssValue(computed.flexShrink) === 0
  ) {
    flags.push(
      flag(
        "fill-without-shrink",
        "A main-axis FILL child has computed flex-shrink: 0.",
        identity.id,
      ),
    );
  }
  if (
    measured?.inline &&
    renderer.parentIsAutoLayout &&
    renderer.mainAxisSizing === "HUG"
  ) {
    const mainSize =
      renderer.parentMainAxis === "horizontal"
        ? measured.inline.width
        : measured.inline.height;
    if (/^-?\d+(?:\.\d+)?px$/.test(mainSize)) {
      flags.push(
        flag(
          "hug-appears-fixed",
          "A main-axis HUG child has a fixed inline pixel size.",
          identity.id,
        ),
      );
    }
  }

  const figmaLayoutMode = figma?.layoutMode;
  if (
    typeof figmaLayoutMode === "string" &&
    ["NONE", "HORIZONTAL", "VERTICAL"].includes(figmaLayoutMode) &&
    figmaLayoutMode !== normalized.layoutMode
  ) {
    flags.push(
      flag(
        "layout-mode-mismatch",
        `Normalized layout ${normalized.layoutMode} differs from Figma layout ${figmaLayoutMode}.`,
        identity.id,
      ),
    );
  }

  if (figma) {
    const childHorizontal = recognizedFigmaSizing(figma.layoutSizingHorizontal);
    const childVertical = recognizedFigmaSizing(figma.layoutSizingVertical);
    if (
      childHorizontal &&
      childHorizontal !== normalized.sizing.horizontal.mode
    ) {
      flags.push(
        flag(
          "child-horizontal-sizing-mismatch",
          `Normalized horizontal child sizing ${normalized.sizing.horizontal.mode} differs from Figma ${childHorizontal}.`,
          identity.id,
        ),
      );
    }
    if (childVertical && childVertical !== normalized.sizing.vertical.mode) {
      flags.push(
        flag(
          "child-vertical-sizing-mismatch",
          `Normalized vertical child sizing ${normalized.sizing.vertical.mode} differs from Figma ${childVertical}.`,
          identity.id,
        ),
      );
    }
  }

  if (
    computed?.overflow === "hidden" &&
    flags.some(
      (item) =>
        item.code === "vertical-overflow" ||
        item.code === "horizontal-overflow",
    )
  ) {
    flags.push(
      flag(
        "overflow-clipped",
        "This ancestor hides overflow while its content exceeds the client box.",
        identity.id,
      ),
    );
  }
  if (
    normalized.layoutMode === "NONE" &&
    (normalized.sizing.horizontal.mode === "FIXED" ||
      normalized.sizing.vertical.mode === "FIXED") &&
    flags.some(
      (item) =>
        item.code === "vertical-overflow" ||
        item.code === "horizontal-overflow",
    )
  ) {
    flags.push(
      flag(
        "fixed-none-wrapper-overflow",
        "A layout NONE wrapper has fixed sizing while descendants overflow.",
        identity.id,
      ),
    );
  }

  return flags;
}

function mainAxisSize(
  measurement: PackageNodeDomMeasurement | null,
  axis: "horizontal" | "vertical",
): number | null {
  if (!measurement?.available) return null;
  return axis === "horizontal"
    ? measurement.offsetWidth
    : measurement.offsetHeight;
}

function rectsOverlap(
  first: NonNullable<PackageNodeDomMeasurement["rect"]>,
  second: NonNullable<PackageNodeDomMeasurement["rect"]>,
): boolean {
  const tolerance = 0.5;
  return (
    first.left < second.left + second.width - tolerance &&
    first.left + first.width > second.left + tolerance &&
    first.top < second.top + second.height - tolerance &&
    first.top + first.height > second.top + tolerance
  );
}

function exceedsParentBounds(
  child: NonNullable<PackageNodeDomMeasurement["rect"]>,
  parent: NonNullable<PackageNodeDomMeasurement["rect"]>,
): boolean {
  const tolerance = 1;
  return (
    child.left < parent.left - tolerance ||
    child.top < parent.top - tolerance ||
    child.left + child.width > parent.left + parent.width + tolerance ||
    child.top + child.height > parent.top + parent.height + tolerance
  );
}

function computedMainAxisMinimum(
  diagnostic: PackageLayoutNodeDiagnostic,
): string | null {
  const computed = diagnostic.measurement?.computed;
  if (!computed) return null;
  return diagnostic.renderer.parentMainAxis === "horizontal"
    ? computed.minWidth
    : computed.minHeight;
}

function diagnosticOwnMainAxisSizing(
  diagnostic: PackageLayoutNodeDiagnostic,
): PackageSizingMode | null {
  if (diagnostic.normalized.layoutMode === "HORIZONTAL") {
    return diagnostic.normalized.sizing.horizontal.mode;
  }
  if (diagnostic.normalized.layoutMode === "VERTICAL") {
    return diagnostic.normalized.sizing.vertical.mode;
  }
  return null;
}

function detectSiblingSuspiciousFlags(
  sibling: PackageLayoutNodeDiagnostic,
  inspected: PackageLayoutNodeDiagnostic,
  parent: PackageLayoutNodeDiagnostic,
): PackageLayoutDebugFlag[] {
  const flags = [...sibling.flags];
  const computed = sibling.measurement?.computed;
  const mainAxis = sibling.renderer.parentMainAxis;

  if (
    sibling.renderer.mainAxisSizing === "FILL" &&
    numericCssValue(computed?.flexShrink) === 0
  ) {
    flags.push(
      flag(
        "fill-sibling-without-shrink",
        "This FILL sibling cannot yield space because its computed flex-shrink is 0.",
        sibling.identity.id,
      ),
    );
  }

  if (sibling.renderer.mainAxisSizing === "FILL" && mainAxis) {
    const minimum = computedMainAxisMinimum(sibling);
    const numericMinimum = numericCssValue(minimum ?? undefined);
    if (
      minimum &&
      ((numericMinimum !== null && numericMinimum > 0) ||
        ["auto", "min-content", "max-content", "fit-content"].includes(
          minimum,
        ))
    ) {
      flags.push(
        flag(
          "fill-sibling-minimum-may-block-shrink",
          `This FILL sibling has computed main-axis minimum ${minimum}, which may prevent it from yielding space.`,
          sibling.identity.id,
        ),
      );
    }

    const inspectedMeasured = mainAxisSize(inspected.measurement, mainAxis);
    const siblingMeasured = mainAxisSize(sibling.measurement, mainAxis);
    const inspectedExported =
      inspected.normalized.bounds[
        mainAxis === "horizontal" ? "width" : "height"
      ];
    const siblingExported =
      sibling.normalized.bounds[
        mainAxis === "horizontal" ? "width" : "height"
      ];
    if (
      inspectedMeasured !== null &&
      siblingMeasured !== null &&
      inspectedMeasured > inspectedExported + 1 &&
      Math.abs(siblingMeasured - siblingExported) <= 1
    ) {
      flags.push(
        flag(
          "fill-sibling-did-not-yield",
          "The inspected branch grew, but this FILL sibling remains at its exported main-axis size.",
          sibling.identity.id,
        ),
      );
    }
  }

  if (
    sibling.renderer.mainAxisSizing !== "FILL" &&
    sibling.renderer.parentIsAutoLayout &&
    !sibling.renderer.isAbsolute &&
    numericCssValue(computed?.flexShrink) !== null &&
    (numericCssValue(computed?.flexShrink) ?? 0) > 0 &&
    mainAxisSize(sibling.measurement, sibling.renderer.parentMainAxis ?? "vertical") !==
      null &&
    (mainAxisSize(
      sibling.measurement,
      sibling.renderer.parentMainAxis ?? "vertical",
    ) ?? 0) <
      sibling.normalized.bounds[
        sibling.renderer.parentMainAxis === "horizontal" ? "width" : "height"
      ] -
        1
  ) {
    flags.push(
      flag(
        "non-fill-sibling-shrunk",
        `This ${sibling.renderer.mainAxisSizing ?? "non-FILL"} sibling measured smaller than its exported main-axis bounds while flex-shrink was nonzero.`,
        sibling.identity.id,
      ),
    );
  }

  const siblingRect = sibling.measurement?.rect;
  const inspectedRect = inspected.measurement?.rect;
  if (
    siblingRect &&
    inspectedRect &&
    !sibling.renderer.isAbsolute &&
    !inspected.renderer.isAbsolute &&
    rectsOverlap(siblingRect, inspectedRect)
  ) {
    flags.push(
      flag(
        "flow-sibling-overlap",
        "This FLOW sibling overlaps the inspected branch in measured layout.",
        sibling.identity.id,
      ),
    );
  }

  const parentRect = parent.measurement?.rect;
  if (
    siblingRect &&
    parentRect &&
    diagnosticOwnMainAxisSizing(parent) === "FIXED" &&
    exceedsParentBounds(siblingRect, parentRect)
  ) {
    flags.push(
      flag(
        "sibling-exceeds-fixed-parent",
        "This sibling extends outside the measured bounds of its fixed parent.",
        sibling.identity.id,
      ),
    );
  }

  return flags.filter(
    (item, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.code === item.code &&
          candidate.nodeId === item.nodeId &&
          candidate.message === item.message,
      ) === index,
  );
}

function relativeLivePosition(
  child: PackageNodeDomMeasurement | null,
  parent: PackageNodeDomMeasurement | null,
): { x: number | null; y: number | null } {
  if (
    child?.available &&
    parent?.available &&
    child.rect &&
    parent.rect &&
    parent.offsetWidth &&
    parent.offsetHeight
  ) {
    const scaleX = parent.rect.width / parent.offsetWidth;
    const scaleY = parent.rect.height / parent.offsetHeight;
    return {
      x:
        scaleX === 0
          ? child.offsetLeft ?? null
          : (child.rect.left - parent.rect.left) / scaleX,
      y:
        scaleY === 0
          ? child.offsetTop ?? null
          : (child.rect.top - parent.rect.top) / scaleY,
    };
  }
  return {
    x: child?.offsetLeft ?? null,
    y: child?.offsetTop ?? null,
  };
}

function buildAbsoluteConstraintDiagnostic(
  node: TemplateNode,
  parent: TemplateNode | undefined,
  role: PackageNodeLayoutRole,
  measurements: Record<string, PackageNodeDomMeasurement>,
  renderMode: "static" | "editor",
): PackageAbsoluteConstraintDiagnostic | null {
  if (!parent || !role.isAbsolute) return null;
  const resolution = resolvePackageAbsoluteConstraints(
    node,
    parent.bounds.relative,
    { parentLayoutMode: parent.layout.mode },
  );
  const measurement = measurements[node.id] ?? null;
  const parentMeasurement = measurements[parent.id] ?? null;
  const livePosition = relativeLivePosition(
    measurement,
    parentMeasurement,
  );
  const translate =
    measurement?.computed?.translate ??
    (typeof resolution.style.translate === "string"
      ? resolution.style.translate
      : "");
  const horizontalUsesLiveHug =
    renderMode === "editor" &&
    node.sizing.horizontal.mode === "HUG" &&
    !["LEFT_RIGHT", "SCALE"].includes(
      resolution.horizontal.effective ?? "",
    );
  const verticalUsesLiveHug =
    renderMode === "editor" &&
    node.sizing.vertical.mode === "HUG" &&
    !["TOP_BOTTOM", "SCALE"].includes(
      resolution.vertical.effective ?? "",
    );

  return {
    active: renderMode === "editor",
    renderMode,
    parentSnapshotSize: {
      width: parent.bounds.relative.width,
      height: parent.bounds.relative.height,
    },
    parentLiveSize: {
      width: parentMeasurement?.offsetWidth ?? null,
      height: parentMeasurement?.offsetHeight ?? null,
    },
    childSnapshotBounds: node.bounds.relative,
    childLive: {
      x: livePosition.x,
      y: livePosition.y,
      width: measurement?.offsetWidth ?? null,
      height: measurement?.offsetHeight ?? null,
    },
    constraints: {
      horizontal: {
        raw: resolution.horizontal.raw,
        normalized: resolution.horizontal.normalized,
        effective:
          renderMode === "editor"
            ? resolution.horizontal.effective
            : null,
      },
      vertical: {
        raw: resolution.vertical.raw,
        normalized: resolution.vertical.normalized,
        effective:
          renderMode === "editor"
            ? resolution.vertical.effective
            : null,
      },
    },
    exportedOffsets: {
      left: resolution.horizontal.exportedStartOffset,
      right: resolution.horizontal.exportedEndOffset,
      top: resolution.vertical.exportedStartOffset,
      bottom: resolution.vertical.exportedEndOffset,
    },
    centerUsesTranslate: {
      horizontal:
        renderMode === "editor" &&
        resolution.horizontal.effective === "CENTER" &&
        translate.includes("-50%"),
      vertical:
        renderMode === "editor" &&
        resolution.vertical.effective === "CENTER" &&
        translate.split(/\s+/).slice(1).includes("-50%"),
    },
    usesLiveHugSize: {
      horizontal: horizontalUsesLiveHug,
      vertical: verticalUsesLiveHug,
    },
    usesFillStretchSizing: {
      horizontal:
        renderMode === "editor" &&
        node.sizing.horizontal.mode === "FILL" &&
        resolution.horizontal.effective === "LEFT_RIGHT",
      vertical:
        renderMode === "editor" &&
        node.sizing.vertical.mode === "FILL" &&
        resolution.vertical.effective === "TOP_BOTTOM",
    },
    usesConstraintDrivenStretch: {
      horizontal:
        renderMode === "editor" &&
        resolution.horizontal.normalized === "LEFT_RIGHT" &&
        resolution.horizontal.effective === "LEFT_RIGHT",
      vertical:
        renderMode === "editor" &&
        resolution.vertical.normalized === "TOP_BOTTOM" &&
        resolution.vertical.effective === "TOP_BOTTOM",
    },
    stretchActive: {
      horizontal:
        renderMode === "editor" &&
        resolution.horizontal.effective === "LEFT_RIGHT",
      vertical:
        renderMode === "editor" &&
        resolution.vertical.effective === "TOP_BOTTOM",
    },
    stretchSuppressedByHug: {
      horizontal:
        renderMode === "editor" &&
        resolution.horizontal.stretchSuppressedByHug,
      vertical:
        renderMode === "editor" &&
        resolution.vertical.stretchSuppressedByHug,
    },
  };
}

function buildNodeDiagnostic(
  packageValue: TemplatePackageV1,
  node: TemplateNode,
  measurements: Record<string, PackageNodeDomMeasurement>,
  renderMode: "static" | "editor",
): PackageLayoutNodeDiagnostic {
  const parent = node.parentId
    ? packageValue.nodes[node.parentId]
    : undefined;
  const parentLayoutMode = parent?.layout.mode ?? "NONE";
  const isRoot = node.id === packageValue.rootNodeId;
  const rendererRole = resolvePackageNodeLayoutRole(
    node,
    parentLayoutMode,
    isRoot,
  );
  const diagnostic: Omit<PackageLayoutNodeDiagnostic, "flags"> = {
    identity: {
      id: node.id,
      name: node.name,
      type: node.type,
      parentId: node.parentId,
      positioning: positioningValue(node),
    },
    normalized: {
      layoutMode: node.layout.mode,
      layoutDirection:
        node.layout.mode === "HORIZONTAL"
          ? "horizontal"
          : node.layout.mode === "VERTICAL"
            ? "vertical"
            : null,
      gap: node.layout.gap,
      rowGap: node.layout.rowGap,
      columnGap: node.layout.columnGap,
      sizing: node.sizing,
      bounds: node.bounds.relative,
    },
    figma: pickFigmaLayoutData(node),
    renderer: {
      ...rendererRole,
      expected: expectedBehavior(node, rendererRole, renderMode),
    },
    absoluteConstraint: buildAbsoluteConstraintDiagnostic(
      node,
      parent,
      rendererRole,
      measurements,
      renderMode,
    ),
    measurement: measurements[node.id] ?? null,
  };
  return {
    ...diagnostic,
    flags: detectPackageLayoutSuspiciousFlags(diagnostic),
  };
}

function parentMainAxisSizing(
  parent: TemplateNode,
): PackageSizingMode | null {
  if (parent.layout.mode === "HORIZONTAL") {
    return parent.sizing.horizontal.mode;
  }
  if (parent.layout.mode === "VERTICAL") {
    return parent.sizing.vertical.mode;
  }
  return null;
}

function buildParentSummary(
  parent: TemplateNode,
  parentDiagnostic: PackageLayoutNodeDiagnostic,
  childDiagnostics: PackageLayoutNodeDiagnostic[],
): PackageLayoutParentSummary | null {
  if (parent.layout.mode === "NONE") return null;
  const mainAxis =
    parent.layout.mode === "HORIZONTAL" ? "horizontal" : "vertical";
  const flowChildren = childDiagnostics.filter(
    (child) => !child.renderer.isAbsolute,
  );
  const childSizes = flowChildren.map((child) =>
    mainAxisSize(child.measurement, mainAxis),
  );
  const measuredSizes = childSizes.filter(
    (size): size is number => size !== null,
  );
  const totalMeasured =
    measuredSizes.length === flowChildren.length
      ? measuredSizes.reduce((sum, size) => sum + size, 0)
      : null;
  const parentMeasured = parentDiagnostic.measurement?.available
    ? mainAxis === "horizontal"
      ? parentDiagnostic.measurement.clientWidth
      : parentDiagnostic.measurement.clientHeight
    : null;
  const mainAxisPadding =
    mainAxis === "horizontal"
      ? parent.layout.padding.left + parent.layout.padding.right
      : parent.layout.padding.top + parent.layout.padding.bottom;
  const measuredGapTotal =
    Math.max(0, flowChildren.length - 1) * parent.layout.gap;
  const remainingSpace =
    parentMeasured !== null && totalMeasured !== null
      ? parentMeasured -
        mainAxisPadding -
        measuredGapTotal -
        totalMeasured
      : null;
  const fillCandidates = flowChildren
    .filter((child) => child.renderer.mainAxisSizing === "FILL")
    .map((child) => child.identity.id);
  const nonShrinkingCandidates = flowChildren
    .filter((child) => child.renderer.mainAxisSizing !== "FILL")
    .map((child) => child.identity.id);
  const flags: PackageLayoutDebugFlag[] = [];
  if (
    remainingSpace !== null &&
    remainingSpace < -1 &&
    parentMainAxisSizing(parent) === "FIXED"
  ) {
    flags.push(
      flag(
        "flow-children-exceed-fixed-parent",
        `FLOW children exceed the fixed parent main axis by ${Math.abs(remainingSpace)}px.`,
        parent.id,
      ),
    );
    if (fillCandidates.length === 0) {
      flags.push(
        flag(
          "no-fill-candidate",
          "The overflowing fixed parent has no FILL child available to yield space.",
          parent.id,
        ),
      );
    }
  }

  return {
    parent: {
      id: parent.id,
      name: parent.name,
      layoutMode: parent.layout.mode,
      mainAxis,
      mainAxisSizing: parentMainAxisSizing(parent) ?? "FIXED",
    },
    flowChildCount: flowChildren.length,
    measuredFlowChildCount: measuredSizes.length,
    totalMeasuredFlowChildrenMainSize: totalMeasured,
    parentMeasuredMainSize: parentMeasured,
    mainAxisPadding,
    measuredGapTotal,
    remainingSpace,
    flowChildrenExceedParent:
      remainingSpace === null ? null : remainingSpace < -1,
    fillCandidates,
    nonShrinkingCandidates,
    flags,
  };
}

export function buildPackageLayoutDebugReport(
  packageValue: TemplatePackageV1,
  field: EditableFieldBinding | null,
  measurements: Record<string, PackageNodeDomMeasurement> = {},
  renderMode: "static" | "editor" = "editor",
): PackageLayoutDebugReport {
  if (!field) {
    return { field: null, renderMode, entries: [], flags: [] };
  }
  const chain = collectPackageLayoutChain(packageValue, field.nodeId);
  const entries = chain.map((node, depth) => {
    const parent = node.parentId ? packageValue.nodes[node.parentId] : undefined;
    const nodeDiagnostic = buildNodeDiagnostic(
      packageValue,
      node,
      measurements,
      renderMode,
    );
    if (!parent) {
      return {
        ...nodeDiagnostic,
        depth,
        siblings: [],
        parentSummary: null,
      };
    }
    const parentDiagnostic = buildNodeDiagnostic(
      packageValue,
      parent,
      measurements,
      renderMode,
    );
    const childDiagnostics = parent.children
      .map((childId) => packageValue.nodes[childId])
      .filter((child): child is TemplateNode => Boolean(child))
      .map((child) =>
        buildNodeDiagnostic(
          packageValue,
          child,
          measurements,
          renderMode,
        ),
      );
    const siblings = childDiagnostics
      .filter((child) => child.identity.id !== node.id)
      .map((sibling) => ({
        ...sibling,
        shouldYieldSpace:
          sibling.renderer.parentIsAutoLayout &&
          !sibling.renderer.isAbsolute &&
          sibling.renderer.mainAxisSizing === "FILL",
        flags: detectSiblingSuspiciousFlags(
          sibling,
          nodeDiagnostic,
          parentDiagnostic,
        ),
      }));
    return {
      ...nodeDiagnostic,
      depth,
      siblings,
      parentSummary: buildParentSummary(
        parent,
        parentDiagnostic,
        childDiagnostics,
      ),
    };
  });
  const flags = entries
    .flatMap((entry) => [
      ...entry.flags,
      ...entry.siblings.flatMap((sibling) => sibling.flags),
      ...(entry.parentSummary?.flags ?? []),
    ])
    .filter(
      (item, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.code === item.code &&
            candidate.nodeId === item.nodeId &&
            candidate.message === item.message,
        ) === index,
    );
  return {
    field: {
      id: field.id,
      type: field.type,
      nodeId: field.nodeId,
      property: field.property,
    },
    renderMode,
    entries,
    flags,
  };
}

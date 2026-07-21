import editorParentReflow from "../fixtures/editor-parent-reflow.json";
import type {
  EditableFieldBinding,
  TemplatePackageV1,
} from "../types";
import {
  buildPackageLayoutDebugReport,
  collectPackageLayoutChain,
  collectPackageLayoutDebugNodeIds,
  detectPackageLayoutSuspiciousFlags,
  measurePackageLayoutChain,
  type PackageNodeDomMeasurement,
} from "./packageLayoutDebug";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const packageValue =
  editorParentReflow as unknown as TemplatePackageV1;
const headlineField = packageValue.editableFields.find(
  (field) => field.nodeId === "headline",
);

assert(headlineField, "The fixture should include an editable headline field.");

const chain = collectPackageLayoutChain(packageValue, "headline");
assert(
  chain.map((node) => node.id).join(">") ===
    "headline>headline-area>footer>root",
  "Layout chain collection should walk from the target node through the root.",
);

const initialReport = buildPackageLayoutDebugReport(
  packageValue,
  headlineField ?? null,
  {},
  "editor",
);
assert(
  initialReport.entries.length === 4,
  "The debug report should include every ancestor.",
);
assert(
  initialReport.entries.every((entry) => entry.figma === null),
  "Missing extensions.figma data should be handled without crashing.",
);
const footerEntry = initialReport.entries.find(
  (entry) => entry.identity.id === "footer",
);
assert(
  footerEntry?.siblings.some(
    (sibling) => sibling.identity.id === "hero",
  ) &&
    footerEntry.siblings.some(
      (sibling) => sibling.identity.id === "overlay",
    ),
  "Each chain entry should include its direct siblings.",
);
assert(
  footerEntry?.parentSummary?.fillCandidates.includes("hero"),
  "The parent summary should identify main-axis FILL candidates.",
);
assert(
  initialReport.entries.find((entry) => entry.identity.id === "root")
    ?.siblings.length === 0,
  "A node without a parent should safely report no siblings.",
);
assert(
  collectPackageLayoutDebugNodeIds(packageValue, "headline").includes("hero"),
  "Measurement collection should include siblings outside the ancestor chain.",
);

const unavailable = measurePackageLayoutChain(
  ["headline", "footer"],
  null,
);
assert(
  !unavailable.headline.available && !unavailable.footer.available,
  "DOM-unavailable measurement should return safe unavailable records.",
);

const headlineEntry = initialReport.entries[0];
const overflowingMeasurement: PackageNodeDomMeasurement = {
  nodeId: "headline",
  available: true,
  offsetWidth: 300,
  offsetHeight: 80,
  clientWidth: 300,
  clientHeight: 80,
  scrollWidth: 300,
  scrollHeight: 128,
  rect: { width: 300, height: 80, top: 0, left: 0 },
  inline: { width: "fit-content", height: "fit-content", top: "", left: "" },
  computed: {
    display: "flex",
    position: "relative",
    flexDirection: "column",
    flexGrow: "0",
    flexShrink: "0",
    flexBasis: "auto",
    width: "300px",
    height: "80px",
    minWidth: "0px",
    minHeight: "0px",
    maxWidth: "none",
    maxHeight: "none",
    overflow: "visible",
    alignSelf: "auto",
    top: "auto",
    left: "auto",
    gap: "normal",
    rowGap: "normal",
    columnGap: "normal",
    paddingTop: "0px",
    paddingRight: "0px",
    paddingBottom: "0px",
    paddingLeft: "0px",
  },
};
const { flags: _existingFlags, ...entryWithoutFlags } = headlineEntry;
const overflowFlags = detectPackageLayoutSuspiciousFlags({
  ...entryWithoutFlags,
  measurement: overflowingMeasurement,
});
assert(
  overflowFlags.some((item) => item.code === "vertical-overflow"),
  "Scroll height exceeding client height should be flagged.",
);
const semanticTrimFlags = detectPackageLayoutSuspiciousFlags({
  ...entryWithoutFlags,
  measurement: {
    ...overflowingMeasurement,
    rendering: {
      liveResizeContainment: null,
      constraintHorizontal: null,
      constraintVertical: null,
      constraintHorizontalRaw: null,
      constraintVerticalRaw: null,
      constraintSizingOverride: null,
      constraintHorizontalOffsets: null,
      constraintVerticalOffsets: null,
      constraintResolution: null,
      constraintFallback: null,
      autoLayoutContainer: null,
      textTrimMode: "cap-height-to-baseline",
      textTrimAuthority: "authoritative",
      textBrowserLineBox: "300,128",
      textTrimmedBox: "300,80",
      textGlyphPaintBounds: "0,92",
    },
  },
});
assert(
  semanticTrimFlags.some((item) => item.code === "text-glyph-overhang" && item.severity === "info") &&
    semanticTrimFlags.some((item) => item.code === "text-line-box-variance") &&
    !semanticTrimFlags.some((item) => item.code === "vertical-overflow"),
  "Semantic trim must distinguish valid glyph overhang and line-box variance from actual clipping.",
);

const gapMismatchFlags = detectPackageLayoutSuspiciousFlags({
  ...entryWithoutFlags,
  normalized: {
    ...entryWithoutFlags.normalized,
    layoutMode: "VERTICAL",
    layoutDirection: "vertical",
    gap: 24,
  },
  measurement: overflowingMeasurement,
});
assert(
  gapMismatchFlags.some(
    (item) => item.code === "auto-layout-gap-mismatch",
  ),
  "A normalized Auto Layout gap missing from computed CSS should be flagged.",
);

function measuredNode(
  nodeId: string,
  width: number,
  height: number,
  top: number,
  options: {
    flexGrow?: string;
    flexShrink?: string;
    flexBasis?: string;
    minHeight?: string;
  } = {},
): PackageNodeDomMeasurement {
  return {
    nodeId,
    available: true,
    offsetWidth: width,
    offsetHeight: height,
    clientWidth: width,
    clientHeight: height,
    scrollWidth: width,
    scrollHeight: height,
    rect: { width, height, top, left: 0 },
    inline: { width: "", height: "", top: "", left: "" },
    computed: {
      display: "flex",
      position: "relative",
      flexDirection: "column",
      flexGrow: options.flexGrow ?? "0",
      flexShrink: options.flexShrink ?? "0",
      flexBasis: options.flexBasis ?? "auto",
      width: `${width}px`,
      height: `${height}px`,
      minWidth: "0px",
      minHeight: options.minHeight ?? "0px",
      maxWidth: "none",
      maxHeight: "none",
      overflow: "visible",
      alignSelf: "auto",
      top: "0px",
      left: "0px",
      gap: "0px",
      rowGap: "0px",
      columnGap: "0px",
      paddingTop: "0px",
      paddingRight: "0px",
      paddingBottom: "0px",
      paddingLeft: "0px",
    },
  };
}

const siblingReport = buildPackageLayoutDebugReport(
  packageValue,
  headlineField ?? null,
  {
    root: measuredNode("root", 600, 800, 0),
    footer: measuredNode("footer", 600, 220, 650),
    hero: measuredNode("hero", 600, 680, 0, {
      flexGrow: "1",
      flexShrink: "0",
      flexBasis: "0px",
      minHeight: "120px",
    }),
    overlay: measuredNode("overlay", 80, 80, 40),
  },
  "editor",
);
const measuredFooterEntry = siblingReport.entries.find(
  (entry) => entry.identity.id === "footer",
);
const measuredHero = measuredFooterEntry?.siblings.find(
  (sibling) => sibling.identity.id === "hero",
);
assert(
  measuredHero?.flags.some(
    (item) => item.code === "fill-sibling-without-shrink",
  ),
  "A FILL sibling with flex-shrink 0 should be flagged.",
);
assert(
  measuredHero?.flags.some(
    (item) => item.code === "fill-sibling-minimum-may-block-shrink",
  ),
  "A nonzero FILL sibling minimum should be flagged.",
);
assert(
  measuredHero?.flags.some(
    (item) => item.code === "flow-sibling-overlap",
  ),
  "Measured overlap between FLOW siblings should be flagged.",
);
assert(
  measuredFooterEntry?.parentSummary?.flowChildrenExceedParent === true &&
    measuredFooterEntry.parentSummary.remainingSpace === -100,
  "The parent summary should expose an overcommitted fixed layout budget.",
);

const absolutePackage = structuredClone(packageValue);
const absoluteNode = absolutePackage.nodes.overlay;
absoluteNode.bounds.relative = {
  x: 260,
  y: 680,
  width: 80,
  height: 80,
};
absoluteNode.sizing.horizontal = {
  mode: "HUG",
  value: null,
  min: null,
  max: null,
};
absoluteNode.sizing.vertical = {
  mode: "FIXED",
  value: 80,
  min: null,
  max: null,
};
absoluteNode.extensions = {
  figma: {
    constraints: {
      horizontal: "CENTER",
      vertical: "STRETCH",
    },
  },
};
const absoluteMeasurement = measuredNode(
  "overlay",
  120,
  620,
  40,
);
absoluteMeasurement.rect = {
  width: 120,
  height: 620,
  top: 40,
  left: 240,
};
absoluteMeasurement.offsetLeft = 300;
absoluteMeasurement.offsetTop = 40;
if (absoluteMeasurement.inline) {
  absoluteMeasurement.inline.translate = "-50% 0";
}
if (absoluteMeasurement.computed) {
  absoluteMeasurement.computed.translate = "-50% 0";
}
const absoluteField = {
  id: "overlay-debug",
  type: "boolean",
  nodeId: "overlay",
  property: "visible",
  defaultValue: true,
} satisfies EditableFieldBinding;
const absoluteReport = buildPackageLayoutDebugReport(
  absolutePackage,
  absoluteField,
  {
    root: measuredNode("root", 600, 700, 0),
    overlay: absoluteMeasurement,
  },
  "editor",
);
const absoluteDiagnostic = absoluteReport.entries[0].absoluteConstraint;
assert(
  absoluteDiagnostic?.parentSnapshotSize.height === 800 &&
    absoluteDiagnostic.parentLiveSize.height === 700,
  "Absolute diagnostics should compare parent snapshot and live sizes.",
);
assert(
  absoluteDiagnostic?.exportedOffsets.left === 260 &&
    absoluteDiagnostic.exportedOffsets.right === 260 &&
    absoluteDiagnostic.exportedOffsets.bottom === 40,
  "Absolute diagnostics should expose every exported edge offset.",
);
assert(
  absoluteDiagnostic?.constraints.horizontal.effective === "CENTER" &&
    absoluteDiagnostic.constraints.vertical.raw === "STRETCH" &&
    absoluteDiagnostic.constraints.vertical.normalized === "TOP_BOTTOM" &&
    absoluteDiagnostic.constraints.vertical.effective === "TOP_BOTTOM" &&
    absoluteDiagnostic.stretchActive.vertical === true &&
    absoluteDiagnostic.usesConstraintDrivenStretch.vertical === true &&
    absoluteDiagnostic.centerUsesTranslate.horizontal === true,
  "Absolute diagnostics should preserve raw STRETCH, expose normalized TOP_BOTTOM, and report CENTER translation.",
);
assert(
  absoluteDiagnostic?.usesLiveHugSize.horizontal === true &&
    absoluteDiagnostic.usesFillStretchSizing.vertical === false &&
    absoluteDiagnostic.childLive.width === 120 &&
    absoluteDiagnostic.childLive.height === 620,
  "Absolute diagnostics should distinguish constraint-driven FIXED stretching from FILL sizing.",
);

const hugStretchPackage = structuredClone(absolutePackage);
hugStretchPackage.nodes.overlay.sizing.vertical = {
  mode: "HUG",
  value: null,
  min: null,
  max: null,
};
const hugStretchReport = buildPackageLayoutDebugReport(
  hugStretchPackage,
  absoluteField,
  {
    root: measuredNode("root", 600, 700, 0),
    overlay: absoluteMeasurement,
  },
  "editor",
);
assert(
  hugStretchReport.entries[0].absoluteConstraint?.constraints.vertical
    .normalized === "TOP_BOTTOM" &&
    hugStretchReport.entries[0].absoluteConstraint?.constraints.vertical
      .effective === "TOP" &&
    hugStretchReport.entries[0].absoluteConstraint
      ?.stretchSuppressedByHug.vertical === true &&
    hugStretchReport.entries[0].absoluteConstraint?.stretchActive.vertical ===
      false,
  "The debugger should expose when normalized HUG suppresses an explicit stretch constraint.",
);

const staticAbsoluteReport = buildPackageLayoutDebugReport(
  absolutePackage,
  absoluteField,
  {},
  "static",
);
assert(
  staticAbsoluteReport.entries[0].absoluteConstraint?.active === false &&
    staticAbsoluteReport.entries[0].absoluteConstraint?.constraints.vertical
      .effective === null,
  "Static debug reports should clearly show that live constraint resolution is inactive.",
);

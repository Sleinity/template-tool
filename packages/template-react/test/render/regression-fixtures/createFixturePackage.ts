import type {
  PackageAppearance,
  PackageAutoLayout,
  PackageAxisSizing,
  PackageColor,
  PackageRect,
  TemplateNode,
  TemplatePackageV1,
} from "@sleinity/template-core";

const transparent: PackageColor = { r: 0, g: 0, b: 0, a: 0 };

export function appearance(
  overrides: Partial<PackageAppearance> = {},
): PackageAppearance {
  return {
    visible: true,
    opacity: 1,
    fills: [],
    strokes: [],
    effects: [],
    cornerRadius: 0,
    clipContent: false,
    ...overrides,
  };
}

export function layout(
  overrides: Partial<PackageAutoLayout> = {},
): PackageAutoLayout {
  return {
    mode: "NONE",
    wrap: false,
    gap: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    primaryAlignment: "MIN",
    counterAlignment: "MIN",
    clipContent: false,
    ...overrides,
  };
}

export function axis(
  mode: PackageAxisSizing["mode"],
  value: number | null = null,
  min: number | null = null,
  max: number | null = null,
): PackageAxisSizing {
  return { mode, value, min, max };
}

function bounds(rect: PackageRect) {
  return {
    absolute: { ...rect },
    relative: { ...rect },
  };
}

export function createRendererFixturePackage(): TemplatePackageV1 {
  const nodes: Record<string, TemplateNode> = {
    root: {
      id: "root",
      name: "Root",
      type: "FRAME",
      parentId: null,
      children: ["subject", "sibling", "absolute"],
      bounds: bounds({ x: 0, y: 0, width: 400, height: 400 }),
      positioning: "ROOT",
      layout: layout({
        mode: "VERTICAL",
        gap: 16,
        padding: { top: 20, right: 20, bottom: 20, left: 20 },
        counterAlignment: "STRETCH",
        clipContent: false,
      }),
      sizing: {
        horizontal: axis("FIXED", 400),
        vertical: axis("FIXED", 400),
      },
      appearance: appearance({
        fills: [
          {
            type: "SOLID",
            color: { r: 1, g: 1, b: 1, a: 1 },
          },
        ],
      }),
    },
    subject: {
      id: "subject",
      name: "Subject",
      type: "FRAME",
      parentId: "root",
      children: ["text"],
      bounds: bounds({ x: 20, y: 20, width: 200, height: 80 }),
      positioning: "FLOW",
      layout: layout({
        mode: "HORIZONTAL",
        gap: 8,
        padding: { top: 12, right: 16, bottom: 12, left: 16 },
        primaryAlignment: "MIN",
        counterAlignment: "CENTER",
      }),
      sizing: {
        horizontal: axis("HUG"),
        vertical: axis("HUG"),
      },
      appearance: appearance({
        fills: [
          {
            type: "SOLID",
            color: { r: 0.9, g: 0.9, b: 0.9, a: 1 },
          },
        ],
        cornerRadius: 12,
      }),
    },
    text: {
      id: "text",
      name: "Text",
      type: "TEXT",
      parentId: "subject",
      children: [],
      bounds: bounds({ x: 16, y: 12, width: 120, height: 32 }),
      positioning: "FLOW",
      layout: layout(),
      sizing: {
        horizontal: axis("HUG"),
        vertical: axis("HUG"),
      },
      appearance: appearance({
        fills: [
          {
            type: "SOLID",
            color: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
          },
        ],
      }),
      text: {
        characters: "Fixture text",
        fontFamily: "Rethink Sans",
        fontStyle: "Regular",
        fontWeight: 400,
        fontSize: 24,
        lineHeight: { value: 120, unit: "PERCENT" },
        letterSpacing: { value: 0, unit: "PERCENT" },
        textAlignHorizontal: "LEFT",
        textAlignVertical: "TOP",
        textAutoResize: "WIDTH_AND_HEIGHT",
        paragraphSpacing: 0,
        textDecoration: "NONE",
        textCase: "ORIGINAL",
      },
    },
    sibling: {
      id: "sibling",
      name: "Sibling",
      type: "RECTANGLE",
      parentId: "root",
      children: [],
      bounds: bounds({ x: 20, y: 116, width: 200, height: 80 }),
      positioning: "FLOW",
      layout: layout(),
      sizing: {
        horizontal: axis("FILL"),
        vertical: axis("FILL"),
      },
      appearance: appearance({
        fills: [
          {
            type: "SOLID",
            color: { r: 0.7, g: 0.8, b: 1, a: 1 },
          },
        ],
      }),
    },
    absolute: {
      id: "absolute",
      name: "Absolute",
      type: "RECTANGLE",
      parentId: "root",
      children: [],
      bounds: bounds({ x: 260, y: 260, width: 80, height: 60 }),
      positioning: "ABSOLUTE",
      layout: layout(),
      sizing: {
        horizontal: axis("FIXED", 80),
        vertical: axis("FIXED", 60),
      },
      appearance: appearance({
        fills: [
          {
            type: "SOLID",
            color: { r: 1, g: 0.5, b: 0.5, a: 1 },
          },
        ],
      }),
      extensions: {
        figma: {
          constraints: { horizontal: "LEFT", vertical: "TOP" },
        },
      },
    },
  };

  return {
    schemaVersion: "1.0",
    packageId: "renderer-regression-fixture",
    name: "Renderer Regression Fixture",
    canvas: {
      width: 400,
      height: 400,
      background: transparent,
      coordinateSpace: "figma",
    },
    rootNodeId: "root",
    nodes,
    editableFields: [],
    assets: {},
  };
}

export function cloneFixturePackage(
  packageValue: TemplatePackageV1,
): TemplatePackageV1 {
  return structuredClone(packageValue);
}

export function setFigmaMetadata(
  packageValue: TemplatePackageV1,
  nodeId: string,
  metadata: Record<string, unknown>,
): void {
  const node = packageValue.nodes[nodeId];
  const current = node.extensions?.figma;
  node.extensions = {
    ...node.extensions,
    figma: {
      ...(current && typeof current === "object" && !Array.isArray(current)
        ? current
        : {}),
      ...metadata,
    },
  };
}

export function makeLiveConstraintContainer(
  packageValue: TemplatePackageV1,
): void {
  const root = packageValue.nodes.root;
  const subject = packageValue.nodes.subject;
  root.children = ["subject", "sibling"];
  subject.children = ["absolute"];
  subject.sizing.horizontal = axis("FILL");
  subject.sizing.vertical = axis("FILL");
  subject.layout.mode = "NONE";
  subject.bounds.relative = {
    x: 0,
    y: 0,
    width: 400,
    height: 300,
  };
  subject.bounds.absolute = { ...subject.bounds.relative };
  packageValue.nodes.absolute.parentId = "subject";
  packageValue.nodes.absolute.bounds.relative = {
    x: 40,
    y: 30,
    width: 80,
    height: 60,
  };
}

import { strToU8, zipSync } from "fflate";

function appearance(color) {
  return {
    visible: true,
    opacity: 1,
    fills: color ? [{ type: "SOLID", color }] : [],
    strokes: [],
    effects: [],
    cornerRadius: 0,
    clipContent: false,
  };
}

function layout() {
  return {
    mode: "NONE",
    wrap: false,
    gap: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    primaryAlignment: "MIN",
    counterAlignment: "MIN",
    clipContent: false,
  };
}

function fixed(value) {
  return { mode: "FIXED", value, min: null, max: null };
}

function bounds(x, y, width, height) {
  return {
    absolute: { x, y, width, height },
    relative: { x, y, width, height },
  };
}

export async function createCompactLifecycleFixture() {
  const packageValue = {
    schemaVersion: "1.0",
    packageId: "sdk-session-browser-smoke",
    name: "SDK Session Browser Smoke",
    canvas: {
      width: 480,
      height: 240,
      background: { r: 1, g: 1, b: 1, a: 1 },
      coordinateSpace: "figma",
    },
    rootNodeId: "root",
    nodes: {
      root: {
        id: "root",
        name: "Root",
        type: "FRAME",
        parentId: null,
        children: ["headline"],
        bounds: bounds(0, 0, 480, 240),
        positioning: "ROOT",
        layout: layout(),
        sizing: { horizontal: fixed(480), vertical: fixed(240) },
        appearance: appearance({ r: 0.95, g: 0.96, b: 0.98, a: 1 }),
      },
      headline: {
        id: "headline",
        name: "Headline",
        type: "TEXT",
        parentId: "root",
        children: [],
        bounds: bounds(40, 80, 400, 64),
        positioning: "ABSOLUTE",
        layout: layout(),
        sizing: { horizontal: fixed(400), vertical: fixed(64) },
        appearance: appearance({ r: 0.08, g: 0.1, b: 0.16, a: 1 }),
        text: {
          characters: "Portable SDK session ☀️",
          fontFamily: "Rethink Sans",
          fontStyle: "SemiBold",
          fontWeight: 600,
          fontSize: 32,
          lineHeight: { value: 40, unit: "PIXELS" },
          letterSpacing: { value: 0, unit: "PIXELS" },
          textAlignHorizontal: "LEFT",
          textAlignVertical: "TOP",
          textAutoResize: "NONE",
          paragraphSpacing: 0,
          textDecoration: "NONE",
          textCase: "ORIGINAL",
        },
      },
    },
    editableFields: [{
      id: "headline",
      type: "text",
      nodeId: "headline",
      property: "text.characters",
      label: "Headline",
      defaultValue: "Portable SDK session ☀️",
    }],
    assets: {},
  };
  return {
    bytes: zipSync({
      "template.json": strToU8(JSON.stringify(packageValue)),
      "assets.json": strToU8(JSON.stringify({ version: 1, assets: [] })),
    }, { level: 0 }),
    sourceName: "compact-sdk-session-fixture.zip",
  };
}

import type { TemplatePackageV1 } from "@sleinity/template-core";

export const RUNTIME_ROUTING_HARNESS_KEY = "__templatePackageRuntimeRoutingHarness";

export interface RuntimeRoutingHarnessApi {
  getPackage(): TemplatePackageV1;
  replacePackage(packageValue: TemplatePackageV1): void;
  resizeRoot(width: number, height: number): void;
  setTextFontFamily(family: string): void;
}

declare global {
  interface Window {
    __templatePackageRuntimeRoutingHarness?: RuntimeRoutingHarnessApi;
  }
}

function finiteDimension(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
  return value;
}

export function createRuntimeRoutingHarnessApi(
  getPackage: () => TemplatePackageV1,
  replacePackage: (packageValue: TemplatePackageV1) => void,
): RuntimeRoutingHarnessApi {
  return {
    getPackage: () => structuredClone(getPackage()),
    replacePackage: (packageValue) => replacePackage(structuredClone(packageValue)),
    resizeRoot(width, height) {
      const nextWidth = finiteDimension(width, "Root width");
      const nextHeight = finiteDimension(height, "Root height");
      const packageValue = structuredClone(getPackage());
      const root = packageValue.nodes[packageValue.rootNodeId];
      if (!root) throw new Error(`Root node ${packageValue.rootNodeId} is missing.`);
      packageValue.canvas.width = nextWidth;
      packageValue.canvas.height = nextHeight;
      root.bounds.relative = { ...root.bounds.relative, width: nextWidth, height: nextHeight };
      root.bounds.absolute = { ...root.bounds.absolute, width: nextWidth, height: nextHeight };
      root.sizing.horizontal = { ...root.sizing.horizontal, mode: "FIXED", value: nextWidth };
      root.sizing.vertical = { ...root.sizing.vertical, mode: "FIXED", value: nextHeight };
      replacePackage(packageValue);
    },
    setTextFontFamily(family) {
      if (!family.trim()) throw new Error("Font family must not be empty.");
      const packageValue = structuredClone(getPackage());
      for (const node of Object.values(packageValue.nodes)) {
        if (node.type !== "TEXT") continue;
        if ("characters" in node.text) node.text.fontFamily = family;
        else node.text.style.fontFamily = family;
      }
      packageValue.fontRequirements = (packageValue.fontRequirements ?? []).map((requirement) => ({
        ...requirement,
        family,
        resolution: undefined,
      }));
      replacePackage(packageValue);
    },
  };
}

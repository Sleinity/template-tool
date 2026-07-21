import baseFixture from "./editor-parent-reflow.json";
import type { TemplateNode, TemplatePackageV1 } from "../types";

export function createNowHiringResponsiveReflowFixture(): TemplatePackageV1 {
  const packageValue = structuredClone(
    baseFixture,
  ) as unknown as TemplatePackageV1;
  packageValue.packageId = "fixture.now-hiring-responsive-reflow";
  packageValue.name = "Now Hiring Responsive Reflow";
  packageValue.canvas = { width: 1000, height: 1350, background: "#ffffff" };

  const root = packageValue.nodes.root;
  root.children = ["hero", "footer"];
  root.bounds.absolute = { x: 0, y: 0, width: 1000, height: 1350 };
  root.bounds.relative = { x: 0, y: 0, width: 1000, height: 1350 };
  root.sizing.horizontal = { mode: "FIXED", value: 1000, min: null, max: null };
  root.sizing.vertical = { mode: "FIXED", value: 1350, min: null, max: null };

  const hero = packageValue.nodes.hero;
  hero.type = "FRAME";
  hero.children = ["product-image"];
  hero.bounds.absolute = { x: 0, y: 0, width: 1000, height: 910 };
  hero.bounds.relative = { x: 0, y: 0, width: 1000, height: 910 };
  hero.layout.mode = "VERTICAL";
  hero.layout.padding = { top: 20, right: 20, bottom: 20, left: 20 };
  hero.sizing.horizontal = { mode: "FILL", value: null, min: 0, max: null };
  hero.sizing.vertical = { mode: "FILL", value: null, min: 0, max: null };
  hero.extensions = {
    figma: {
      primaryAxisSizingMode: "FIXED",
      counterAxisSizingMode: "FIXED",
      layoutSizingHorizontal: "FILL",
      layoutSizingVertical: "FILL",
    },
  };

  const productImage = structuredClone(hero) as TemplateNode;
  productImage.id = "product-image";
  productImage.name = "Product image";
  productImage.type = "RECTANGLE";
  productImage.parentId = "hero";
  productImage.children = [];
  productImage.bounds.absolute = { x: 20, y: 20, width: 960, height: 870 };
  productImage.bounds.relative = { x: 0, y: 0, width: 960, height: 870 };
  productImage.layout.mode = "NONE";
  productImage.layout.padding = { top: 0, right: 0, bottom: 0, left: 0 };
  productImage.appearance.fills = [];
  productImage.image = {
    assetId: "asset:image:product",
    deferred: false,
    scaleMode: "FILL",
    imageTransform: [
      [0.4816223084926605, 0, 0.25918886065483093],
      [0, 1, 0],
    ],
  };
  productImage.extensions = {
    figma: {
      layoutSizingHorizontal: "FILL",
      layoutSizingVertical: "FILL",
    },
  };
  packageValue.nodes[productImage.id] = productImage;

  const footer = packageValue.nodes.footer;
  footer.children = ["headline", "subtext"];
  footer.bounds.absolute = { x: 0, y: 910, width: 1000, height: 440 };
  footer.bounds.relative = { x: 0, y: 910, width: 1000, height: 440 };
  footer.layout.padding = { top: 40, right: 40, bottom: 40, left: 40 };
  footer.layout.gap = 80;
  footer.sizing.horizontal = { mode: "FILL", value: null, min: null, max: null };
  footer.sizing.vertical = { mode: "HUG", value: null, min: null, max: null };
  footer.extensions = {
    figma: {
      primaryAxisSizingMode: "AUTO",
      counterAxisSizingMode: "FIXED",
      layoutSizingHorizontal: "FILL",
      layoutSizingVertical: "HUG",
    },
  };

  const headline = packageValue.nodes.headline;
  headline.parentId = "footer";
  headline.bounds.absolute = { x: 40, y: 950, width: 920, height: 193 };
  headline.bounds.relative = { x: 0, y: 0, width: 920, height: 193 };
  headline.sizing.horizontal = { mode: "FILL", value: null, min: null, max: null };
  headline.sizing.vertical = { mode: "HUG", value: null, min: null, max: null };
  if (headline.type === "TEXT" && "characters" in headline.text) {
    headline.text.characters = "WE'RE SEEKING AN OFFICER TO LEAD THE TEAM";
    headline.text.fontSize = 48;
    headline.text.lineHeight = { value: 52.8, unit: "PIXELS" };
    headline.text.textAutoResize = "HEIGHT";
    headline.text.leadingTrim = "CAP_HEIGHT";
  }
  headline.extensions = {
    figma: {
      layoutSizingHorizontal: "FILL",
      layoutSizingVertical: "HUG",
    },
  };

  const subtext = structuredClone(headline);
  subtext.id = "subtext";
  subtext.name = "field:textarea:subtext";
  subtext.bounds.absolute = { x: 40, y: 1223, width: 920, height: 87 };
  subtext.bounds.relative = { x: 0, y: 273, width: 920, height: 87 };
  if (subtext.type === "TEXT" && "characters" in subtext.text) {
    subtext.text.characters = "APPLY NOW AT CAREERS@ACME.COM";
  }
  packageValue.nodes.subtext = subtext;
  delete packageValue.nodes["headline-area"];
  delete packageValue.nodes.overlay;

  packageValue.assets = {
    "asset:image:product": {
      id: "asset:image:product",
      type: "image",
      source: "embedded",
      deferred: false,
      mimeType: "image/png",
      dataUrl: "data:image/png;base64,AA==",
      width: 1125,
      height: 750,
    },
  };
  packageValue.editableFields = [
    {
      id: "product",
      type: "image",
      nodeId: "product-image",
      property: "image.assetId",
      defaultValue: "asset:image:product",
      label: "Product",
      constraints: { replacementMode: "preserve-original-crop" },
    },
    {
      id: "text",
      type: "textarea",
      nodeId: "headline",
      property: "text.characters",
      defaultValue: "WE'RE SEEKING AN OFFICER TO LEAD THE TEAM",
      label: "Text",
    },
    {
      id: "subtext",
      type: "textarea",
      nodeId: "subtext",
      property: "text.characters",
      defaultValue: "APPLY NOW AT CAREERS@ACME.COM",
      label: "Subtext",
    },
  ];
  return packageValue;
}

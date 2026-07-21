import { templatePackageFixtures } from "./fixtures";
import { parseTemplatePackage } from "./parseTemplatePackage";
import { validateTemplatePackage } from "./validateTemplatePackage";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

for (const fixture of templatePackageFixtures) {
  const before = JSON.stringify(fixture.input);
  const validation = validateTemplatePackage(fixture.input);
  assert(
    validation.valid === fixture.expectedValid,
    `${fixture.name}: expected valid=${fixture.expectedValid}, received ${validation.valid}. ${JSON.stringify(validation.diagnostics)}`,
  );

  const parsed = parseTemplatePackage(fixture.input);
  assert(
    parsed.validation?.valid === fixture.expectedValid,
    `${fixture.name}: parser and validator results differ.`,
  );
  assert(JSON.stringify(fixture.input) === before, `${fixture.name}: validation mutated its input.`);
}

const missingAsset = templatePackageFixtures.find((fixture) => fixture.name === "missing asset");
assert(
  Boolean(
    missingAsset &&
      validateTemplatePackage(missingAsset.input).diagnostics.some(
        (item) => item.code === "asset.missing-reference",
      ),
  ),
  "Missing-asset fixture should report asset.missing-reference.",
);

const invalidGraph = templatePackageFixtures.find(
  (fixture) => fixture.name === "invalid parent/child reference",
);
assert(
  Boolean(
    invalidGraph &&
      validateTemplatePackage(invalidGraph.input).diagnostics.some((item) =>
        ["graph.child-parent-mismatch", "graph.invalid-parent"].includes(item.code),
      ),
  ),
  "Invalid parent/child fixture should report graph diagnostics.",
);

const figmaPluginFixture = templatePackageFixtures.find(
  (fixture) => fixture.name === "Figma plugin v0.4.0 export",
);
const figmaPluginValidation = figmaPluginFixture
  ? validateTemplatePackage(figmaPluginFixture.input)
  : null;
assert(
  Boolean(figmaPluginValidation?.valid),
  "The representative Figma plugin v0.4.0 package should validate.",
);
assert(
  Boolean(
    figmaPluginValidation?.pluginDiagnostics.some(
      (item) => item.code === "image-embedded" && item.severity === "info",
    ),
  ),
  "Plugin diagnostics should be preserved separately from app diagnostics.",
);
assert(
  !figmaPluginValidation?.diagnostics.some(
    (item) => item.code === "motion.no-node-references",
  ),
  "An unchecked motion skeleton should not produce a missing-motion warning.",
);

const figmaPluginV041Fixture = templatePackageFixtures.find(
  (fixture) => fixture.name === "Figma plugin v0.4.1 export",
);
const figmaPluginV041Validation = figmaPluginV041Fixture
  ? validateTemplatePackage(figmaPluginV041Fixture.input)
  : null;
assert(
  Boolean(figmaPluginV041Validation?.valid),
  "The attached Figma plugin v0.4.1 package should validate.",
);
assert(
  figmaPluginV041Validation?.diagnostics.length === 0,
  "The v0.4.1 fixture should have no app validation diagnostics.",
);
assert(
  figmaPluginV041Validation?.pluginDiagnostics.length === 3,
  "The v0.4.1 fixture should retain its three plugin diagnostics.",
);

if (figmaPluginV041Fixture) {
  const updatedPluginContractPackage = structuredClone(
    figmaPluginV041Fixture.input,
  ) as any;
  updatedPluginContractPackage.source.packageContract =
    "template-package-v1";
  updatedPluginContractPackage.diagnostics.push({
    severity: "info",
    code: "CONSTRAINT_SIZING_CONFLICT",
    message: "Absolute FIXED sizing is resolved from STRETCH constraints.",
    nodeId: "58:150",
    nodeName: "Overlay",
    parentId: "54:59",
    parentName: "Root",
    parentLayoutMode: "VERTICAL",
    affectedAxis: "vertical",
    rawFigmaValue: "STRETCH",
    normalizedValue: "TOP_BOTTOM",
  });
  const updatedPluginContractValidation = validateTemplatePackage(
    updatedPluginContractPackage,
  );
  assert(
    updatedPluginContractValidation.valid &&
      updatedPluginContractValidation.diagnostics.length === 0,
    "The updated plugin packageContract and diagnostic context should validate.",
  );
  assert(
    updatedPluginContractValidation.pluginDiagnostics.some(
      (item) =>
        item.code === "CONSTRAINT_SIZING_CONFLICT" &&
        item.parentId === "54:59" &&
        item.affectedAxis === "vertical",
    ),
    "Plugin diagnostic context should be retained separately from app validation.",
  );

  const zipDescriptorPackage = structuredClone(
    figmaPluginV041Fixture.input,
  ) as any;
  const imageNode = Object.values(zipDescriptorPackage.nodes).find(
    (node: any) => typeof node.image?.assetId === "string",
  ) as any;
  const typedRef = imageNode?.image?.assetId;
  if (!imageNode || typeof typedRef !== "string") {
    throw new Error("The v0.4.1 fixture should expose an image node.");
  }
  const imageField = {
    id: "product",
    type: "image",
    nodeId: imageNode.id,
    property: "image.assetId",
    label: "Product",
    defaultValue: "asset_product_image_001",
    assetRef: "asset_product_image_001",
    typedRef,
    refType: "asset",
    constraints: { aspectRatio: 0.714, scaleMode: "FILL" },
  };
  zipDescriptorPackage.editableFields.push(imageField);
  zipDescriptorPackage.diagnostics.push({
    severity: "warning",
    code: "LARGE_ASSET",
    message: "Asset is larger than the recommended threshold.",
    nodeId: imageField.nodeId,
    assetId: typedRef,
    details: { byteSize: 1441382, threshold: 1000000 },
  });
  const zipDescriptorValidation = validateTemplatePackage(
    zipDescriptorPackage,
  );
  assert(
    zipDescriptorValidation.valid &&
      !zipDescriptorValidation.diagnostics.some(
        (item) =>
          item.path?.startsWith("/editableFields") ||
          item.path === "/diagnostics/0",
      ),
    `Known ZIP editable-field refs, image constraints, and diagnostic asset locations should validate. ${JSON.stringify(zipDescriptorValidation.diagnostics)}`,
  );
  assert(
    zipDescriptorValidation.pluginDiagnostics.some(
      (item) => item.code === "LARGE_ASSET" && item.assetId === typedRef,
    ),
    "Exporter diagnostics with asset IDs should remain separate from app validation diagnostics.",
  );

  const aliasedAssetPackage = structuredClone(zipDescriptorPackage);
  const aliasedAsset = Object.values(aliasedAssetPackage.assets).find(
    (asset: any) => asset.type === "image",
  ) as any;
  const aliasedImageNode = Object.values(aliasedAssetPackage.nodes).find(
    (node: any) => typeof node.image?.assetId === "string",
  ) as any;
  if (!aliasedAsset || !aliasedImageNode) {
    throw new Error("Alias validation fixture requires an image asset and node.");
  }
  aliasedAsset.extensions = {
    ...(aliasedAsset.extensions ?? {}),
    bundleSource: {
      ...(aliasedAsset.extensions?.bundleSource ?? {}),
      aliases: ["asset://validation-alias"],
    },
  };
  aliasedImageNode.image.assetId = "asset://validation-alias";
  assert(
    !validateTemplatePackage(aliasedAssetPackage).diagnostics.some(
      (item) => item.code === "asset.missing-reference",
    ),
    "Canonical asset aliases accepted by the runtime resolver should not become false missing-media blockers.",
  );

  for (const pattern of ["free", "number", "date"] as const) {
    const configuredPackage = structuredClone(zipDescriptorPackage);
    configuredPackage.editableFields[0].constraints = {
      maxCharacters: 10,
      maxLines: 1,
      pattern,
    };
    const configuredValidation = validateTemplatePackage(configuredPackage);
    assert(
      configuredValidation.schemaValid &&
        !configuredValidation.diagnostics.some((item) =>
          item.path?.startsWith("/editableFields/0/constraints"),
        ),
      `${pattern} field settings should satisfy the strict canonical editable-field schema.`,
    );
  }

  const unknownDescriptorField = structuredClone(zipDescriptorPackage);
  unknownDescriptorField.editableFields[0].unknownContractField = true;
  assert(
    validateTemplatePackage(unknownDescriptorField).diagnostics.some(
      (item) =>
        item.code === "schema.additionalProperties" &&
        item.path === "/editableFields/0",
    ),
    "Unknown editable-field contract data should remain schema-invalid.",
  );

  const missingImageAssetPackage = structuredClone(figmaPluginV041Fixture.input) as any;
  delete missingImageAssetPackage.assets["asset:image:21b94426"];
  assert(
    validateTemplatePackage(missingImageAssetPackage).diagnostics.some(
      (item) => item.code === "asset.missing-reference",
    ),
    "Image payloads on non-IMAGE nodes must still validate their asset references.",
  );

  const packageWithSvgAsset = structuredClone(figmaPluginV041Fixture.input) as any;
  packageWithSvgAsset.assets["asset:svg:fixture"] = {
    id: "asset:svg:fixture",
    type: "svg",
    source: "embedded",
    deferred: false,
    nodeId: "58:60",
    svgString: "<svg viewBox=\"0 0 10 10\"></svg>",
    width: 10,
    height: 10,
    viewBox: "0 0 10 10",
    hash: "fixture-svg",
  };
  assert(
    validateTemplatePackage(packageWithSvgAsset).valid,
    "Embedded SVG assets should validate when svgString is present.",
  );

  const packageWithV050Vector = structuredClone(
    figmaPluginV041Fixture.input,
  ) as any;
  const v050VectorNode = packageWithV050Vector.nodes["58:57"];
  v050VectorNode.type = "VECTOR";
  v050VectorNode.vector = {
    assetId: "asset:svg:v050",
    deferred: false,
    format: "svg",
    renderMode: "SVG_ASSET",
    assetKind: "DIRECT_SVG",
    fit: "FIGMA_BOUNDS",
    viewBox: { x: 0, y: 0, width: 126, height: 32 },
    preserveAspectRatio: "xMidYMid meet",
    contentBounds: { x: 0, y: 0, width: 126, height: 32 },
    paints: {
      fills: [
        {
          type: "SOLID",
          opacity: 1,
          visible: true,
          hasGradient: false,
          color: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
        },
      ],
      strokes: [],
    },
    features: {
      hasBooleanOperation: false,
      hasGradients: false,
      hasImages: false,
      hasEffects: false,
      hasBlendModes: false,
      hasMasks: false,
      hasMultipleFills: false,
      hasMultipleStrokes: false,
    },
  };
  v050VectorNode.extensions.figma.isVectorLike = true;
  v050VectorNode.extensions.figma.hasVectorNetwork = true;
  packageWithV050Vector.assets["asset:svg:v050"] = {
    id: "asset:svg:v050",
    type: "vector",
    source: "embedded",
    deferred: false,
    nodeId: "58:57",
    mimeType: "image/svg+xml",
    svgString:
      '<svg viewBox="0 0 126 32" xmlns="http://www.w3.org/2000/svg"></svg>',
    viewBox: "0 0 126 32",
    width: 126,
    height: 32,
  };
  packageWithV050Vector.nodes["58:87"].vector = {
    assetId: null,
    deferred: false,
    format: "svg",
    renderMode: "SEMANTIC_SHAPE",
    assetKind: null,
    fit: "FIGMA_BOUNDS",
    viewBox: null,
    preserveAspectRatio: "xMidYMid meet",
    contentBounds: { x: 0, y: 0, width: 760, height: 1064 },
    paints: { fills: [], strokes: [] },
    features: {
      hasBooleanOperation: false,
      hasGradients: false,
      hasImages: true,
      hasEffects: false,
      hasBlendModes: false,
      hasMasks: false,
      hasMultipleFills: false,
      hasMultipleStrokes: false,
    },
  };
  packageWithV050Vector.nodes["58:87"].shape = {
    type: "RECTANGLE",
    cornerRadius: 0,
  };
  const v050VectorValidation = validateTemplatePackage(
    packageWithV050Vector,
  );
  assert(
    v050VectorValidation.valid,
    `The Figma plugin v0.5.0 SVG and semantic-shape vector contract should validate. ${JSON.stringify(v050VectorValidation.diagnostics)}`,
  );

  const packageWithPluginWarning = structuredClone(figmaPluginV041Fixture.input) as any;
  packageWithPluginWarning.diagnostics.push({
    severity: "warning",
    code: "PLUGIN_WARNING_FIXTURE",
    message: "Exporter warning for separation testing.",
  });
  const pluginWarningValidation = validateTemplatePackage(packageWithPluginWarning);
  assert(
    pluginWarningValidation.valid && pluginWarningValidation.diagnostics.length === 0,
    "Plugin warnings must remain separate and must not invalidate the package.",
  );

  const packageWithFontRequirements = structuredClone(
    figmaPluginV041Fixture.input,
  ) as any;
  const textNode = Object.values(packageWithFontRequirements.nodes).find(
    (node: any) => node.type === "TEXT",
  ) as any;
  textNode.text.fontPostScriptName = "RethinkSans-SemiBold";
  textNode.text.styleRanges = [
    {
      start: 0,
      end: textNode.text.characters.length,
      family: "Rethink Sans",
      style: "SemiBold",
      cssStyle: "normal",
      weight: 600,
      postScriptName: "RethinkSans-SemiBold",
    },
  ];
  packageWithFontRequirements.fontRequirements = [
    {
      id: "font:rethink-sans:600:normal",
      family: "Rethink Sans",
      style: "SemiBold",
      cssStyle: "normal",
      weight: 600,
      postScriptName: "RethinkSans-SemiBold",
      usedBy: [textNode.id],
      characters: textNode.text.characters,
      editable: true,
      mixedStyle: false,
      source: "figma",
      availableInFigma: true,
    },
  ];
  const fontValidation = validateTemplatePackage(
    packageWithFontRequirements,
  );
  assert(
    fontValidation.valid,
    `The v0.5.0 font requirement contract should validate. ${JSON.stringify(fontValidation.diagnostics)}`,
  );

  packageWithFontRequirements.fontRequirements[0].usedBy = ["missing"];
  assert(
    validateTemplatePackage(packageWithFontRequirements).diagnostics.some(
      (item) => item.code === "font.missing-node",
    ),
    "Font requirements should reject missing usedBy nodes.",
  );
}

assert(parseTemplatePackage("{").package === null, "Malformed JSON should not produce a package.");

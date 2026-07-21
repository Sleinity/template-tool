import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { strToU8, zipSync } from "fflate";
import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import {
  analyzeAssetReliability,
  resolvePackageAssetReference,
  type AssetStorageAdapter,
} from "../assets";
import {
  replaceTemplatePackageImage,
  updateTemplatePackageField,
} from "../editor";
import { validatePackageJpgExportReadiness } from "../export";
import {
  canImportPackageResult,
  runTemplatePackageImportPipeline,
} from "../import";
import { linkPackageMotionValue } from "../motion";
import {
  createInMemoryTemplateRepositoryStorage,
  createSavedTemplateRecord,
  InMemoryTemplateRepository,
  stripRuntimeAssetUrls,
} from "../persistence";
import { TemplatePackageRenderer } from "../render";
import {
  checkResolvedFontReadiness,
  collectTemplatePackageFontRequirements,
  createResolvedRenderTree,
} from "../resolved";
import type { TemplatePackageV1 } from "../types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function createCompactLifecycleZip(): Uint8Array {
  const base = structuredClone(
    figmaPluginV041 as unknown as TemplatePackageV1,
  );
  const imageNode = Object.values(base.nodes).find(
    (node) => typeof node.image?.assetId === "string",
  );
  assert(imageNode?.image?.assetId, "Lifecycle fallback needs an image node.");
  base.editableFields.push({
    id: "product",
    type: "image",
    nodeId: imageNode.id,
    property: "image.assetId",
    label: "Product",
    defaultValue: imageNode.image.assetId,
    constraints: { aspectRatio: 0.714, scaleMode: "FILL" },
  });
  const svgId = "asset:svg:lifecycle";
  base.assets[svgId] = {
    id: svgId,
    type: "svg",
    source: "embedded",
    mimeType: "image/svg+xml",
    svgString:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8"/></svg>',
  };
  const motionPackage = linkPackageMotionValue(base, {
    version: 1,
    playbackStyle: "loop",
    nodes: [
      {
        node: imageNode.id,
        timelineDurationMs: 1000,
        fields: [
          {
            field: "motionOpacity",
            keyframes: [
              { timeMs: 0, value: 0 },
              { timeMs: 1000, value: 1 },
            ],
          },
        ],
      },
    ],
  }).packageValue;
  const manifestAssets = Object.values(motionPackage.assets).map((asset) => ({
    id: asset.id,
    type: asset.type,
    path: `assets/${asset.id.split(":").join("_")}.${
      asset.type === "svg" ? "svg" : "png"
    }`,
    mimeType: asset.type === "svg" ? "image/svg+xml" : "image/png",
    aliases: [asset.id],
  }));
  const entries: Record<string, Uint8Array> = {
    "template.json": strToU8(JSON.stringify(motionPackage)),
    "assets.json": strToU8(
      JSON.stringify({ version: 1, assets: manifestAssets }),
    ),
    "motion.json": strToU8(JSON.stringify(motionPackage.motion?.raw)),
  };
  manifestAssets.forEach((asset) => {
    entries[asset.path] =
      asset.type === "svg"
        ? strToU8(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8"/></svg>',
          )
        : Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  });
  return zipSync(entries, { level: 0 });
}

async function lifecycleZip(): Promise<{
  bytes: Uint8Array;
  sourceName: string;
  fixtureMode: "realistic" | "fallback";
  strict: boolean;
  identity?: {
    sha256: string;
    sizeBytes: number;
    sourcePath: string;
  };
}> {
  const injected = globalThis as typeof globalThis & {
    __templatePackageLifecycleZip?: Uint8Array;
    __templatePackageLifecycleZipName?: string;
    __templatePackageLifecycleFixtureMode?: "realistic" | "fallback";
    __templatePackageLifecycleFixtureStrict?: boolean;
    __templatePackageLifecycleZipIdentity?: {
      sha256: string;
      sizeBytes: number;
      sourcePath: string;
    };
  };
  if (injected.__templatePackageLifecycleZip) {
    return {
      bytes: injected.__templatePackageLifecycleZip,
      sourceName:
        injected.__templatePackageLifecycleZipName ?? "template-package.zip",
      fixtureMode: "realistic",
      strict: injected.__templatePackageLifecycleFixtureStrict === true,
      identity: injected.__templatePackageLifecycleZipIdentity,
    };
  }
  assert(
    injected.__templatePackageLifecycleFixtureStrict !== true,
    "Strict realistic-ZIP mode must never enter the compact fixture path.",
  );
  return {
    bytes: createCompactLifecycleZip(),
    sourceName: "compact-lifecycle-fixture.zip",
    fixtureMode: "fallback",
    strict: false,
  };
}

const runtimeUrls: string[] = [];
const assetStorage: AssetStorageAdapter = {
  async put(hash, bytes, mimeType) {
    const url = URL.createObjectURL(
      new Blob([Uint8Array.from(bytes).buffer], { type: mimeType }),
    );
    runtimeUrls.push(url);
    return { storageKey: `sha256:${hash}`, stableUrl: url };
  },
};

const fixture = await lifecycleZip();
assert(
  fixture.fixtureMode !== "realistic" ||
    (fixture.identity?.sizeBytes === fixture.bytes.byteLength &&
      fixture.identity.sha256.length === 64),
  "A realistic lifecycle fixture should include its verified size and SHA-256 identity.",
);
console.log(
  `[lifecycle] assertions=full source=${fixture.fixtureMode} strict=${String(fixture.strict)} file=${fixture.sourceName}`,
);
const imported = await runTemplatePackageImportPipeline({
  format: "zip",
  buffer: exactBuffer(fixture.bytes),
  sourceName: fixture.sourceName,
  assetStorage,
});
assert(
  imported.package &&
    imported.validation &&
    imported.layeredDiagnostics?.canImport === true &&
    canImportPackageResult(imported),
  "The ZIP lifecycle fixture should pass the layered product import gate.",
);
const importedPackage = imported.package;
const importedSnapshot = JSON.stringify(
  stripRuntimeAssetUrls(importedPackage),
);
const importedAssets = Object.values(importedPackage.assets);
const assetReliability = analyzeAssetReliability(importedPackage);
const assetFreePackage =
  importedAssets.length === 0 &&
  Object.values(importedPackage.nodes).every((node) =>
    !node.image?.assetId &&
    !node.vector?.assetId &&
    node.appearance.fills.every(
      (fill) => fill.type !== "IMAGE" || !fill.assetId,
    ) &&
    node.appearance.strokes.every((stroke) => {
      const paint = "paint" in stroke ? stroke.paint : stroke;
      return paint.type !== "IMAGE" || !paint.assetId;
    }),
  ) &&
  importedPackage.editableFields.every(
    (field) =>
      field.type !== "image" ||
      ![field.defaultValue, field.assetRef, field.typedRef].some(
        (reference) => typeof reference === "string" && reference.length > 0,
      ),
  ) &&
  !importedPackage.referencePreview?.assetId &&
  Array.isArray(imported.loadedSource?.assetManifest?.assets) &&
  imported.loadedSource.assetManifest.assets.length === 0;
assert(
  (assetFreePackage ||
    (importedAssets.length > 0 &&
      importedAssets.every((asset) => asset.source === "stored"))) &&
    assetReliability.missingAssets === 0,
  "A lifecycle ZIP should either be dependency-free with explicit empty asset authority or persist every declared asset as managed storage.",
);
const mismatch = imported.loadedSource?.diagnostics.find(
  (diagnostic) => diagnostic.code === "ASSET_BYTESIZE_MISMATCH",
);
if (mismatch) {
  assert(
    mismatch.severity === "info" &&
    typeof mismatch.details?.differenceBytes === "number" &&
    imported.assetResolutions?.some(
      (resolution) =>
        resolution.actualByteSize === mismatch.details?.actualBytes &&
        resolution.declaredByteSize === mismatch.details?.declaredBytes &&
        resolution.status === "renderable" &&
        Boolean(resolution.managedStorageKey),
    ) &&
    analyzeAssetReliability(importedPackage).missingAssets === 0,
    "A readable manifest byte mismatch should remain visible without making the asset unavailable.",
  );
}
importedAssets.forEach((importedAsset) => {
  const bundleSource = importedAsset.extensions?.bundleSource as
    | { manifestId?: string; aliases?: string[] }
    | undefined;
  const assetReferences = [
    importedAsset.id,
    bundleSource?.manifestId,
    bundleSource?.manifestId ? `asset://${bundleSource.manifestId}` : undefined,
    ...(bundleSource?.aliases ?? []),
  ].filter((value): value is string => Boolean(value));
  assert(
    assetReferences.every(
      (reference) =>
        resolvePackageAssetReference(importedPackage, reference)?.canonicalId ===
        importedAsset.id,
    ),
    "Manifest, typed, URI, and alias references should converge on one runtime asset identity.",
  );
  assert(
    (importedAsset.usedBy?.length ?? 0) ===
      new Set(importedAsset.usedBy ?? []).size,
    "Managed asset usage should not contain duplicate ingestion records.",
  );
});
const importedImage = importedAssets.find((asset) => asset.type === "image");
if (importedImage) {
  assert(
    (importedImage.usedBy?.length ?? 0) >= 1,
    "A managed image used by the lifecycle fixture should preserve its node usage.",
  );
}

const backing = createInMemoryTemplateRepositoryStorage();
const importingRepository = new InMemoryTemplateRepository(backing);
const saved = await importingRepository.saveTemplate(
  createSavedTemplateRecord({
    name: importedPackage.name,
    packageValue: importedPackage,
    validation: imported.validation,
    source: imported.sourceMetadata,
  }),
);
const reloadedRepository = new InMemoryTemplateRepository(backing);
const reopened = await reloadedRepository.getTemplate(saved.id);
assert(
  reopened?.source.type === "package-zip" &&
    reopened.source.sourceName === fixture.sourceName &&
    analyzeAssetReliability(reopened.workingPackage).missingAssets === 0,
  "A recreated repository should reopen the ZIP template with managed assets hydrated.",
);

const initialGraph = createResolvedRenderTree(reopened.workingPackage);
assert(
  initialGraph.rootNodeId === reopened.workingPackage.rootNodeId &&
    Object.values(initialGraph.assetRefs).filter((asset) => asset.renderable)
      .length >= importedAssets.length &&
    initialGraph.motionLinks.missingNodeIds.length === 0,
  "Reloaded templates should rebuild a renderable graph with stable motion links.",
);
assert(
  !initialGraph.warnings.some(
    (warning) => warning.code === "resolved-asset-ref-missing",
  ),
  "Supported field and node aliases should not reappear as missing resolved-graph assets.",
);
const fixtureFontRequirements = collectTemplatePackageFontRequirements(
  reopened.workingPackage,
  initialGraph,
);
const fixtureFontManifest = fixtureFontRequirements.map((requirement) => ({
  family: requirement.family,
  weight: requirement.weight,
  style: requirement.style,
}));
const fontReadiness = await checkResolvedFontReadiness(
  initialGraph,
  {
    ready: Promise.resolve(),
    check: () => true,
    load: async () => [{}],
  },
  fixtureFontManifest,
  fixtureFontRequirements,
);
assert(
  fontReadiness.reliable && fontReadiness.exportReady,
  "An exact application-provided face should be verified independently of bundled font metadata.",
);
const finalFrameMarkup = renderToStaticMarkup(
  createElement(TemplatePackageRenderer, {
    packageValue: reopened.workingPackage,
    motionRenderMode: "final-frame",
  }),
);
assert(
  finalFrameMarkup.includes('data-package-motion-render-mode="final-frame"') &&
    finalFrameMarkup.includes(
      `data-package-node-id="${reopened.workingPackage.rootNodeId}"`,
    ),
  "The persisted ZIP template should render through the deterministic final-frame path.",
);

const nodeIds = Object.keys(reopened.workingPackage.nodes).sort().join("|");
const fieldIdentity = reopened.workingPackage.editableFields
  .map((field) => `${field.id}:${field.nodeId}`)
  .sort()
  .join("|");
const motionSnapshot = JSON.stringify(reopened.workingPackage.motion);
const textField = reopened.workingPackage.editableFields.find(
  (field) => field.type === "text" || field.type === "textarea",
);
const imageField = reopened.workingPackage.editableFields.find(
  (field) => field.type === "image",
);
const textUpdate = textField
  ? updateTemplatePackageField(
      reopened.workingPackage,
      textField,
      "Lifecycle smoke edit",
    )
  : { packageValue: reopened.workingPackage, applied: true };
assert(
  textUpdate.applied !== false,
  "A declared text field should remain editable after reload.",
);
const imageUpdate = imageField
  ? replaceTemplatePackageImage(
      textUpdate.packageValue,
      imageField,
      "data:image/png;base64,iVBORw0KGgo=",
      {
        assetId: "asset:image:user:lifecycle",
        mimeType: "image/png",
        sizeBytes: 8,
        width: 714,
        height: 1000,
      },
    )
  : { packageValue: textUpdate.packageValue, applied: true };
assert(
  imageUpdate.applied !== false &&
    Object.keys(imageUpdate.packageValue.nodes).sort().join("|") === nodeIds &&
    imageUpdate.packageValue.editableFields
      .map((field) => `${field.id}:${field.nodeId}`)
      .sort()
      .join("|") === fieldIdentity &&
    JSON.stringify(imageUpdate.packageValue.motion) === motionSnapshot,
  "Text/image edits should preserve node identity, field identity, and motion links.",
);

await reloadedRepository.updateWorkingPackage(
  saved.id,
  imageUpdate.packageValue,
);
const postEditRepository = new InMemoryTemplateRepository(backing);
const postEdit = await postEditRepository.getTemplate(saved.id);
assert(
  postEdit &&
    JSON.stringify(stripRuntimeAssetUrls(postEdit.originalPackage)) ===
      importedSnapshot &&
    (!imageField ||
      postEdit.workingPackage.nodes[imageField.nodeId].image?.assetId ===
        "asset:image:user:lifecycle") &&
    JSON.stringify(postEdit.workingPackage.motion) === motionSnapshot,
  "Post-reload edits should persist without mutating the imported original or motion data.",
);
const postEditGraph = createResolvedRenderTree(postEdit.workingPackage);
const exportReadiness = validatePackageJpgExportReadiness({
  format: "png",
  packageValue: postEdit.workingPackage,
  renderMode: "editor",
}, fontReadiness);
assert(
  (!textField ||
    (postEditGraph.editableFieldTargets[textField.id]?.targetExists &&
      postEditGraph.editableFieldTargets[textField.id]?.propertySupported)) &&
    (!imageField ||
      (postEditGraph.editableFieldTargets[imageField.id]?.targetExists &&
        postEditGraph.editableFieldTargets[imageField.id]?.propertySupported)) &&
    postEditGraph.motionLinks.missingNodeIds.length === 0 &&
    exportReadiness.ready,
  "Edited ZIP templates should rebuild field targets and remain ready for PNG capture.",
);

runtimeUrls.forEach((url) => URL.revokeObjectURL(url));

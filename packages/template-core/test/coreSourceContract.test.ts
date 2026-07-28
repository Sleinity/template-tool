import { strToU8, zipSync } from "fflate";
import simpleFixedPoster from "../../../src/template-package/fixtures/simple-fixed-poster.json";
import {
  importTemplatePackage,
  normalizeTemplatePackageBundleTemplate,
  parseTemplatePackage,
  validateTemplatePackage,
  validateTemplatePackageBundleSource,
  type TemplatePackageV1,
} from "../src";
import { loadTemplatePackageZipBundle } from "../src/bundle/loadTemplatePackageBundle";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const packageValue = structuredClone(simpleFixedPoster) as unknown as TemplatePackageV1;
const validation = validateTemplatePackage(packageValue);
assert(validation.valid, "The package-owned validator must accept the canonical fixture.");
assert(
  parseTemplatePackage("{").diagnostics.some((item) => item.code === "parse.invalid-json"),
  "The package-owned parser must preserve invalid-JSON diagnostics.",
);

const looseSource = structuredClone(packageValue) as any;
delete looseSource.fontRequirements;
const normalized = normalizeTemplatePackageBundleTemplate(looseSource);
assert(
  (normalized.normalizedTemplateJson as any).fontRequirements?.length > 0 &&
    normalized.diagnostics.some((item) => item.code === "FONT_REQUIREMENTS_INFERRED"),
  "Source normalization must preserve the existing inferred-font contract.",
);
assert(
  validateTemplatePackage(normalized.normalizedTemplateJson).valid,
  "Loose-source normalization must still feed the strict canonical validator.",
);

const videoSource = structuredClone(packageValue) as any;
videoSource.nodes[videoSource.rootNodeId].appearance.fills = [{
  type: "VIDEO",
  visible: true,
  opacity: 1,
  blendMode: "NORMAL",
}];
assert(
  validateTemplatePackageBundleSource(videoSource).diagnostics.some(
    (item) => item.code === "SOURCE_VIDEO_PAINT_WITHOUT_FALLBACK",
  ),
  "The loose source contract must retain unsupported-video diagnostics.",
);

const motionPackage = structuredClone(packageValue) as any;
motionPackage.source = { ...(motionPackage.source ?? {}), motionFile: "motion.json" };
const pngHeader = new Uint8Array(24);
pngHeader.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
const pngView = new DataView(pngHeader.buffer);
pngView.setUint32(16, 64, false);
pngView.setUint32(20, 32, false);
const zipBytes = zipSync({
  "template.json": strToU8(JSON.stringify(motionPackage)),
  "assets.json": strToU8(JSON.stringify({ version: 1, assets: [] })),
  "motion.json": strToU8(JSON.stringify({
    version: 1,
    playbackStyle: "loop",
    nodes: [{
      node: motionPackage.rootNodeId,
      timelineDurationMs: 1000,
      fields: [{
        field: "motionOpacity",
        keyframes: [{ timeMs: 0, value: 1 }, { timeMs: 1000, value: 0.5 }],
      }],
    }],
  })),
  "preview.png": pngHeader,
}, { level: 0 });

const originalFetch = globalThis.fetch;
let networkAccessed = false;
globalThis.fetch = (() => {
  networkAccessed = true;
  throw new Error("template-core must not access the network");
}) as typeof fetch;
try {
  const imported = importTemplatePackage(
    zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength),
    "core-contract.zip",
  );
  assert(imported.importable, "The package-owned ZIP importer must accept canonical bytes.");
  assert(
    imported.workingPackage?.motion?.sourceName === "motion.json",
    "The package-owned source loader must retain motion-file linking.",
  );
  assert(
    imported.source.preview?.width === 64 && imported.source.preview.height === 32,
    "The package-owned source loader must retain preview-header metadata.",
  );
  assert(!networkAccessed, "Core ZIP import must not perform network access.");
} finally {
  globalThis.fetch = originalFetch;
}

const unsafeZip = zipSync({
  "../template.json": strToU8(JSON.stringify(packageValue)),
  "assets.json": strToU8(JSON.stringify({ version: 1, assets: [] })),
}, { level: 0 });
assert(
  loadTemplatePackageZipBundle(unsafeZip).diagnostics.some(
    (item) => item.code === "bundle.path-unsafe",
  ),
  "The package-owned ZIP boundary must reject traversal paths.",
);

assert(
  typeof document === "undefined" && typeof window === "undefined",
  "The core source-contract suite must execute without DOM globals.",
);

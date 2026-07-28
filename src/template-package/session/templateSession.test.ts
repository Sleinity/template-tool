import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import { InMemoryTemplateRepository } from "../persistence/inMemoryTemplateRepository";
import { createResolvedRenderTree } from "../resolved";
import type { EditableFieldBinding, TemplatePackageV1 } from "../types";
import { validateTemplatePackage } from "../validateTemplatePackage";
import type { PackageImportResult } from "../import/runTemplatePackageImportPipeline";
import { createTemplateSessionWithDependencies } from "./templateSession";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

const importedPackage = structuredClone(
  figmaPluginV041 as unknown as TemplatePackageV1,
);
const imageField: EditableFieldBinding = {
  id: "hero-image",
  nodeId: "58:61",
  type: "image",
  property: "image.assetId",
  label: "Hero image",
  defaultValue: importedPackage.nodes["58:61"].image?.assetId ?? "",
  constraints: {
    replacementMode: "cover",
  },
};
importedPackage.editableFields.push(imageField);
const importedValidation = validateTemplatePackage(importedPackage);
assert(importedValidation.valid, "The TemplateSession test package must remain valid.");

function successfulImport(
  packageValue = importedPackage,
  sourceName = "session-test.zip",
): PackageImportResult {
  const validation = validateTemplatePackage(packageValue);
  return {
    package: structuredClone(packageValue),
    validation,
    diagnostics: validation.diagnostics,
    pluginDiagnostics: validation.pluginDiagnostics,
    enrichment: null,
    sourceMetadata: {
      type: "package-zip",
      sourceName,
    },
    loadedSource: {
      sourceType: "template-package-zip",
      sourceName,
      formatVersion: "1.0",
      sourceFiles: {
        template: { path: "template.json", exists: true },
        assets: [],
      },
      rawTemplateJson: packageValue,
      normalizedTemplateJson: packageValue,
      originalPackageValue: structuredClone(packageValue),
      packageValue: structuredClone(packageValue),
      validation,
      packageDiagnostics: validation.diagnostics,
      diagnostics: [],
      valid: validation.valid,
      figmaSource: null,
    },
  } as unknown as PackageImportResult;
}

const dependencies = {
  importZip: async () => successfulImport(),
  createResolvedTree: createResolvedRenderTree,
  validate: validateTemplatePackage,
};
const repository = new InMemoryTemplateRepository();
const session = createTemplateSessionWithDependencies({ repository }, dependencies);
let publicationCount = 0;
const unsubscribe = session.subscribe(() => {
  publicationCount += 1;
});

assert(session.getSnapshot().status === "idle", "A new TemplateSession should be idle.");
await session.loadZip({ bytes: new ArrayBuffer(0), sourceName: "session-test.zip" });
assert(
  session.getSnapshot().status === "ready" &&
    session.getSnapshot().workingPackage !== session.getSnapshot().basePackage &&
    Object.isFrozen(session.getSnapshot().basePackage) &&
    session.getSnapshot().resolvedTree !== null &&
    session.getSnapshot().editableFields.length === 2,
  "A valid ZIP import should publish separate base/working packages, fields, and a resolved tree.",
);

const headline = session.getSnapshot().editableFields.find((field) => field.id === "headline")!;
const edited = session.setField(headline.id, "Session edit");
assert(
  edited.applied &&
    session.getSnapshot().workingPackage?.nodes[headline.nodeId].type === "TEXT" &&
    session.getSnapshot().revision > edited.snapshot.operationRevision,
  "A field edit should publish a newer resolved session snapshot.",
);
session.resetField(headline.id);
const resetHeadline = session.getSnapshot().workingPackage?.nodes[headline.nodeId];
assert(
  resetHeadline?.type === "TEXT" &&
    "characters" in resetHeadline.text &&
    resetHeadline.text.characters === headline.defaultValue,
  "Resetting a text field should restore its imported default.",
);

const replacement = session.replaceImage("hero-image", {
  dataUrl: "data:image/png;base64,AA==",
  mimeType: "image/png",
  sizeBytes: 1,
  width: 10,
  height: 10,
  assetId: "asset:image:user:session-test",
});
assert(
  replacement.applied &&
    session.getSnapshot().workingPackage?.nodes["58:61"].image?.assetId ===
      "asset:image:user:session-test",
  "Image replacement should update the working package through the existing field authority.",
);
assert(
  session.setImageReplacementMode("hero-image", "replacement-fit").applied &&
    session.getSnapshot().workingPackage?.nodes["58:61"].image?.activePlacement?.state ===
      "replacement-fit",
  "The session should expose the existing revisioned replacement Fill/Fit authority.",
);
session.resetField("hero-image");
assert(
  session.getSnapshot().workingPackage?.nodes["58:61"].image?.assetId ===
    imageField.defaultValue,
  "Resetting an image should restore imported asset authority.",
);

session.setField(headline.id, "Saved session value");
const saved = await session.save({ name: "SDK session" });
assert(
  session.getSnapshot().savedTemplateId === saved.id,
  "Saving should publish the repository identity without replacing session content.",
);
session.setField(headline.id, "Unsaved value");
await session.loadSavedTemplate(saved.id);
const restoredHeadline = session.getSnapshot().workingPackage?.nodes[headline.nodeId];
assert(
  restoredHeadline?.type === "TEXT" &&
    "characters" in restoredHeadline.text &&
    restoredHeadline.text.characters === "Saved session value",
  "Loading from an injected repository should restore the persisted offline working package.",
);
session.setField(headline.id, "Temporary edit");
session.restoreImportedState();
const importedHeadline = session.getSnapshot().workingPackage?.nodes[headline.nodeId];
assert(
  importedHeadline?.type === "TEXT" &&
    "characters" in importedHeadline.text &&
    importedHeadline.text.characters === headline.defaultValue,
  "Full restore should return to the immutable imported baseline.",
);

const slow = deferred<PackageImportResult>();
const fast = deferred<PackageImportResult>();
const staleSession = createTemplateSessionWithDependencies({}, {
  ...dependencies,
  importZip: (input) => input.sourceName === "slow.zip" ? slow.promise : fast.promise,
});
const slowLoad = staleSession.loadZip({ bytes: new ArrayBuffer(0), sourceName: "slow.zip" });
const fastLoad = staleSession.loadZip({ bytes: new ArrayBuffer(0), sourceName: "fast.zip" });
const fastPackage = structuredClone(importedPackage);
fastPackage.name = "Newest package";
fast.resolve(successfulImport(fastPackage, "fast.zip"));
await fastLoad;
slow.resolve(successfulImport(importedPackage, "slow.zip"));
await slowLoad;
assert(
  staleSession.getSnapshot().workingPackage?.name === "Newest package" &&
    staleSession.getSnapshot().source?.sourceName === "fast.zip",
  "An older asynchronous import must never overwrite a newer session revision.",
);

const failedSession = createTemplateSessionWithDependencies({}, {
  ...dependencies,
  importZip: async () => {
    throw new Error("Broken ZIP");
  },
});
await failedSession.loadZip({ bytes: new ArrayBuffer(0) });
assert(
  failedSession.getSnapshot().status === "blocked" &&
    failedSession.getSnapshot().error?.message === "Broken ZIP" &&
    failedSession.getSnapshot().diagnostics.some(
      (diagnostic) => diagnostic.code === "import.failed",
    ),
  "Import failures should become typed blocked state with structured diagnostics rather than rejected session promises.",
);

const sourceDiagnosticSession = createTemplateSessionWithDependencies({}, {
  ...dependencies,
  importZip: async () => ({
    package: null,
    validation: null,
    diagnostics: [],
    pluginDiagnostics: [],
    enrichment: null,
    layeredDiagnostics: {
      canImport: false,
      status: "blocked",
      diagnostics: [
        {
          code: "bundle.required-file-missing",
          severity: "error",
          category: "zip",
          message: "template.json is missing.",
          path: "template.json",
          layer: "package-structure",
          origin: "loader",
          blocksImport: true,
        },
      ],
      blockingDiagnostics: [],
      warningDiagnostics: [],
      infoDiagnostics: [],
      layers: [],
    },
  }),
});
await sourceDiagnosticSession.loadZip({ bytes: new ArrayBuffer(0) });
const sourceDiagnostic = sourceDiagnosticSession.getSnapshot().diagnostics[0];
assert(
  sourceDiagnosticSession.getSnapshot().status === "blocked" &&
    sourceDiagnostic?.code === "bundle.required-file-missing" &&
    sourceDiagnostic.category === "parse" &&
    sourceDiagnostic.details?.sourceLayer === "package-structure",
  "Blocked ZIP imports should project ordered source diagnostics through the session snapshot.",
);

const publicationsBeforeDispose = publicationCount;
session.dispose();
assert(
  session.getSnapshot().status === "disposed" &&
    publicationCount === publicationsBeforeDispose + 1,
  "Disposal should publish one terminal state before releasing listeners.",
);
unsubscribe();
let disposedMutationRejected = false;
try {
  session.setField(headline.id, "Rejected");
} catch {
  disposedMutationRejected = true;
}
assert(disposedMutationRejected, "Disposed sessions must reject further mutations.");

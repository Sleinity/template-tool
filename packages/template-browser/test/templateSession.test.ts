import figmaPluginV041 from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import { InMemoryTemplateRepository } from "../src/persistence/inMemoryTemplateRepository";
import { createResolvedRenderTree } from "../../../src/template-package/resolved";
import type { EditableFieldBinding, TemplatePackageV1 } from "../../../src/template-package/types";
import { validateTemplatePackage } from "../../../src/template-package/validateTemplatePackage";
import type { PackageImportResult } from "../src/import/runTemplatePackageImportPipeline";
import type {
  ManagedFontRecord,
  ManagedFontRegistry,
} from "../src/fonts/fontRegistryTypes";
import { createTemplateSessionWithDependencies } from "../src/session/templateSession";

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

const setupRevision = session.getSnapshot().revision;
const setupPackage = structuredClone(session.getSnapshot().workingPackage!);
setupPackage.name = "Configured package";
const setupUpdate = session.replaceWorkingPackage(setupPackage, setupRevision);
assert(
  setupUpdate.applied &&
    !setupUpdate.stale &&
    session.getSnapshot().workingPackage?.name === "Configured package" &&
    session.getSnapshot().revision > setupRevision,
  "A valid setup-package update should validate, rebuild, and publish a new session revision.",
);
const staleSetupPackage = structuredClone(setupPackage);
staleSetupPackage.name = "Stale package";
const staleSetup = session.replaceWorkingPackage(
  staleSetupPackage,
  setupRevision,
);
assert(
  !staleSetup.applied &&
    staleSetup.stale &&
    session.getSnapshot().workingPackage?.name === "Configured package",
  "A setup-package update from an older session revision must be rejected.",
);
const invalidSetupPackage = structuredClone(setupPackage);
delete invalidSetupPackage.nodes[invalidSetupPackage.rootNodeId];
const invalidSetup = session.replaceWorkingPackage(invalidSetupPackage);
assert(
  !invalidSetup.applied &&
    !invalidSetup.stale &&
    !invalidSetup.validation.valid &&
    session.getSnapshot().status === "ready",
  "An invalid setup-package update must return validation evidence without replacing the ready package.",
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

const hydrationSession = createTemplateSessionWithDependencies({}, dependencies);
const hydrationBaseline = structuredClone(importedPackage);
const hydrationWorking = structuredClone(importedPackage);
const hydratedText = hydrationWorking.nodes[headline.nodeId];
assert(
  hydratedText.type === "TEXT",
  "The hydration fixture headline must remain text.",
);
hydratedText.text.characters = "Host-preprocessed value";
const hydration = hydrationSession.loadTemplateState({
  importedPackage: hydrationBaseline,
  packageValue: hydrationWorking,
  source: {
    type: "package-zip",
    sourceName: "confirmed-template.zip",
  },
});
assert(
  hydration.applied &&
    !hydration.stale &&
    hydration.snapshot.status === "ready" &&
    hydration.snapshot.source?.sourceName === "confirmed-template.zip" &&
    hydration.snapshot.resolvedTree !== null &&
    hydration.snapshot.editableFields.length === 2,
  "A fresh session should validate and activate host-stored confirmed state.",
);
hydrationWorking.name = "Mutated outside the session";
assert(
  hydrationSession.getSnapshot().workingPackage?.name !==
    "Mutated outside the session",
  "Hydration must clone host-owned state before publication.",
);
hydrationSession.resetField(headline.id);
const hydratedReset =
  hydrationSession.getSnapshot().workingPackage?.nodes[headline.nodeId];
assert(
  hydratedReset?.type === "TEXT" &&
    hydratedReset.text.characters === headline.defaultValue,
  "A hydrated session must retain the imported baseline for field reset.",
);
const beforeRepeatedHydration = hydrationSession.getSnapshot().revision;
const repeatedHydration = hydrationSession.loadTemplateState({
  importedPackage: hydrationBaseline,
  packageValue: hydrationBaseline,
});
assert(
  repeatedHydration.applied &&
    repeatedHydration.snapshot.revision > beforeRepeatedHydration,
  "Repeated valid hydration should publish a new session revision.",
);
const staleHydration = hydrationSession.loadTemplateState({
  importedPackage: hydrationBaseline,
  packageValue: hydrationBaseline,
  expectedRevision: beforeRepeatedHydration,
});
assert(
  !staleHydration.applied &&
    staleHydration.stale &&
    hydrationSession.getSnapshot() === repeatedHydration.snapshot,
  "Hydration targeting an older session revision must be rejected atomically.",
);
const mismatchedWorking = structuredClone(hydrationBaseline);
mismatchedWorking.packageId = "different-package";
const mismatchedHydration = hydrationSession.loadTemplateState({
  importedPackage: hydrationBaseline,
  packageValue: mismatchedWorking,
});
assert(
  !mismatchedHydration.applied &&
    !mismatchedHydration.stale &&
    mismatchedHydration.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "session.state.package-identity-mismatch",
    ) &&
    hydrationSession.getSnapshot() === repeatedHydration.snapshot,
  "Mismatched host state must not partially replace the active session.",
);
const invalidHydrationPackage = structuredClone(hydrationBaseline);
delete invalidHydrationPackage.nodes[invalidHydrationPackage.rootNodeId];
const invalidHydration = hydrationSession.loadTemplateState({
  importedPackage: hydrationBaseline,
  packageValue: invalidHydrationPackage,
});
assert(
  !invalidHydration.applied &&
    !invalidHydration.packageValidation.valid &&
    hydrationSession.getSnapshot() === repeatedHydration.snapshot,
  "Invalid host state must return fresh validation without replacing the session.",
);
hydrationSession.restoreImportedState();
assert(
  hydrationSession.getSnapshot().workingPackage?.name ===
    hydrationBaseline.name,
  "Full restore must remain available after direct host-state hydration.",
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

const hydrationRace = deferred<PackageImportResult>();
const hydrationRaceSession = createTemplateSessionWithDependencies({}, {
  ...dependencies,
  importZip: async () => hydrationRace.promise,
});
const pendingHydrationRace = hydrationRaceSession.loadZip({
  bytes: new ArrayBuffer(0),
  sourceName: "older-import.zip",
});
const hydratedDuringImport = hydrationRaceSession.loadTemplateState({
  importedPackage: hydrationBaseline,
  packageValue: hydrationBaseline,
  expectedRevision: hydrationRaceSession.getSnapshot().revision,
});
hydrationRace.resolve(successfulImport(importedPackage, "older-import.zip"));
await pendingHydrationRace;
assert(
  hydratedDuringImport.applied &&
    hydrationRaceSession.getSnapshot().workingPackage?.name ===
      hydrationBaseline.name &&
    hydrationRaceSession.getSnapshot().source === null,
  "A pending older import must not overwrite newer directly hydrated state.",
);
hydrationRaceSession.dispose();

{
  const fontPackage = structuredClone(importedPackage);
  fontPackage.fontRequirements = [{
    id: "font:managed-test:400:normal",
    family: "Managed Test",
    style: "Regular",
    cssStyle: "normal",
    weight: 400,
    postScriptName: "ManagedTest-Regular",
    usedBy: [headline.nodeId],
    characters: "Managed font",
    editable: true,
    mixedStyle: false,
    source: "session-test",
    availableInFigma: false,
  }];
  const pendingFont = deferred<ManagedFontRecord | null>();
  const managedFont: ManagedFontRecord = {
    id: "managed-font:test:0",
    schemaVersion: "2.0",
    family: "Managed Test",
    typographicFamily: "Managed Test",
    legacyFamily: "Managed Test",
    subfamily: "Regular",
    style: "normal",
    weight: 400,
    postScriptName: "ManagedTest-Regular",
    fullName: "Managed Test Regular",
    source: "uploaded",
    assetId: "asset:font:test",
    assetHash: "a".repeat(64),
    mimeType: "font/ttf",
    fileName: "managed-test.ttf",
    faceIndex: 0,
    runtimeFamily: "__template_font_test_0_static",
    createdAt: "2026-07-29T00:00:00.000Z",
    updatedAt: "2026-07-29T00:00:00.000Z",
    lastUsedAt: "2026-07-29T00:00:00.000Z",
    usageCount: 0,
    aliases: [],
    trustedForFamilies: [],
  };
  const fontRegistry: ManagedFontRegistry = {
    listManagedFonts: async () => [managedFont],
    getManagedFont: async () => pendingFont.promise,
    registerUploadedFont: async () => managedFont,
    getMapping: async () => null,
    linkRequirementToManagedFont: async () => undefined,
    unlinkRequirement: async () => undefined,
    deleteManagedFont: async () => undefined,
    getFontBlob: async () => null,
  };
  const fontSession = createTemplateSessionWithDependencies(
    { fontRegistry },
    {
      ...dependencies,
      importZip: async () => successfulImport(fontPackage, "font-session.zip"),
    },
  );
  await fontSession.loadZip({
    bytes: new ArrayBuffer(0),
    sourceName: "font-session.zip",
  });
  const fontLink = fontSession.linkManagedFont(
    "font:managed-test:400:normal",
    managedFont.id,
  );
  fontSession.setField("headline", "Newer field edit");
  pendingFont.resolve(managedFont);
  const staleFont = await fontLink;
  assert(
    staleFont.stale &&
      !staleFont.applied &&
      !fontSession.getSnapshot().workingPackage?.fontRequirements?.[0]
        ?.resolution,
    "Font preparation that completes after a newer session revision must not overwrite current state.",
  );
  fontSession.dispose();
}

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
hydrationSession.dispose();
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

// Save invocation order is a repository contract, not just a snapshot guard.
{
  const storage = new InMemoryTemplateRepository();
  const write = storage.saveTemplate.bind(storage);
  const entered = deferred<void>(); const release = deferred<void>();
  let writes = 0;
  storage.saveTemplate = async record => { writes++; if (writes === 1) { entered.resolve(); await release.promise; } return write(record); };
  const owned = createTemplateSessionWithDependencies({ repository: storage }, dependencies);
  await owned.loadZip({ bytes: new ArrayBuffer(0) });
  const first = owned.save({ name: "First" }); await entered.promise;
  const changedField = importedPackage.editableFields[0];
  owned.setField(changedField.id, "Captured newer text");
  const second = owned.save({ name: "Second" });
  assert(writes === 1, "Overlapping saves must not enter storage concurrently.");
  release.resolve();
  const [a, b] = await Promise.all([first, second]);
  assert(a.id === b.id && (await storage.getTemplate(a.id))?.name === "Second", "First-save identity is reserved and later invocation wins.");
  assert((await storage.getTemplate(a.id))?.workingPackage.nodes[changedField.nodeId].text?.characters === "Captured newer text", "Later captured edits survive an earlier write completing late.");
  owned.dispose();
}
for (const end of ["reset", "dispose"] as const) {
  const storage = new InMemoryTemplateRepository();
  const entered = deferred<void>(); const release = deferred<void>();
  let writes = 0;
  storage.saveTemplate = async record => { writes++; entered.resolve(); await release.promise; return record; };
  const owned = createTemplateSessionWithDependencies({ repository: storage }, dependencies);
  await owned.loadZip({ bytes: new ArrayBuffer(0) });
  const active = owned.save(); await entered.promise;
  const queued = owned.save().then(() => false, () => true);
  owned[end](); release.resolve(); await active;
  assert(await queued && writes === 1, `${end} cancels queued writes and prevents stale publication.`);
  assert(owned.getSnapshot().savedTemplateId === null, "Completion cannot attach an old identity after reset/disposal.");
  owned.dispose();
}
{
  const storage = new InMemoryTemplateRepository();
  const original = storage.saveTemplate.bind(storage); let calls = 0;
  storage.saveTemplate = async record => { if (++calls === 1) throw new Error("Expected storage failure"); return original(record); };
  const owned = createTemplateSessionWithDependencies({ repository: storage }, dependencies);
  await owned.loadZip({ bytes: new ArrayBuffer(0) });
  const failed = owned.save().then(() => false, () => true);
  const retry = owned.save();
  assert(await failed && (await retry).id === owned.getSnapshot().savedTemplateId, "Failed saves do not poison the queue.");
  owned.dispose();
}
for (const end of ["reset", "dispose"] as const) {
  const pending = deferred<PackageImportResult>(); let released = 0;
  const owned = createTemplateSessionWithDependencies({}, { ...dependencies, importZip: () => pending.promise });
  const load = owned.loadZip({ bytes: new ArrayBuffer(0) }); owned[end]();
  pending.resolve({ ...successfulImport(), dispose: () => { released++; } }); await load;
  assert(released === 1, "An import completed after cancellation releases its resources.");
  owned.dispose();
}
{
  let released = 0;
  const owned = createTemplateSessionWithDependencies({}, { ...dependencies, importZip: async () => ({ ...successfulImport(), dispose: () => { released++; } }) });
  await owned.loadZip({ bytes: new ArrayBuffer(0) });
  assert(released === 0, "Accepted import resources remain alive while the session owns them.");
  await owned.loadZip({ bytes: new ArrayBuffer(0) });
  assert(Number(released) === 1, "Replacing a source releases the previous import.");
  owned.dispose(); owned.dispose();
  assert(Number(released) === 2, "Disposal releases the accepted import exactly once.");
}
{
  const { sessionAssetUrlLeases } = await import("../src/session/sessionAssetUrlLeases");
  const storage = new InMemoryTemplateRepository();
  const entered = deferred<void>(); const release = deferred<void>(); let revocations = 0;
  storage.saveTemplate = async record => { entered.resolve(); await release.promise; return record; };
  const result = successfulImport();
  const asset = Object.values(result.package!.assets)[0];
  asset.stableUrl = "blob:legacy-save-resource";
  sessionAssetUrlLeases.set(asset.stableUrl, { count: 1, revoke: () => { revocations++; } });
  result.dispose = () => {
    const lease = sessionAssetUrlLeases.get(asset.stableUrl!)!;
    if (--lease.count === 0) { sessionAssetUrlLeases.delete(asset.stableUrl!); lease.revoke(); }
  };
  const owned = createTemplateSessionWithDependencies({ repository: storage }, { ...dependencies, importZip: async () => result });
  await owned.loadZip({ bytes: new ArrayBuffer(0) });
  const saving = owned.save(); await entered.promise; owned.dispose();
  assert(revocations === 0, "An active repository write pins the imported asset beyond session disposal.");
  release.resolve(); await saving;
  assert(Number(revocations) === 1, "Completing the final write releases its last resource lease.");
}

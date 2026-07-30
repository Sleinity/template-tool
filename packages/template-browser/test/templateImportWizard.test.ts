import figmaPluginV041 from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import { createResolvedRenderTree } from "../../../src/template-package/resolved";
import type { ResolvedProductRenderIdentityV1 } from "../src/runtime/renderIdentity";
import type { TemplatePackageV1 } from "../../../src/template-package/types";
import { validateTemplatePackage } from "../../../src/template-package/validateTemplatePackage";
import type { PackageImportResult } from "../src/import/runTemplatePackageImportPipeline";
import { createTemplateSessionWithDependencies } from "../src/session/templateSession";
import {
  createTemplateImportWizard,
  type TemplateImportConfirmationV1,
} from "../src/import/templateImportWizard";
import {
  inspectTemplateImportConfirmation,
  inspectTemplateRuntimeSupport,
  loadTemplateImportConfirmation,
} from "../src/import/templateImportCompatibility";
import {
  createTemplatePackageDigest,
  createTemplatePackageFingerprint,
} from "../src/import/templateImportIntegrity";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function readyImport(packageValue: TemplatePackageV1): PackageImportResult {
  const validation = validateTemplatePackage(packageValue);
  return {
    package: structuredClone(packageValue),
    validation,
    diagnostics: validation.diagnostics,
    pluginDiagnostics: validation.pluginDiagnostics,
    enrichment: null,
    sourceMetadata: {
      type: "package-zip",
      sourceName: "wizard.zip",
    },
    loadedSource: {
      sourceType: "template-package-zip",
      sourceName: "wizard.zip",
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
      valid: true,
      figmaSource: null,
    },
  } as unknown as PackageImportResult;
}

const packageValue = structuredClone(
  figmaPluginV041 as unknown as TemplatePackageV1,
);
packageValue.fontRequirements = [];
const session = createTemplateSessionWithDependencies(
  {},
  {
    importZip: async () => readyImport(packageValue),
    createResolvedTree: createResolvedRenderTree,
    validate: validateTemplatePackage,
  },
);
let persisted: TemplateImportConfirmationV1 | null = null;
const wizard = createTemplateImportWizard({
  session,
  now: () => new Date("2026-07-30T10:00:00.000Z"),
  persistenceAdapter: {
    async persistConfirmedTemplate(confirmation) {
      persisted = confirmation;
      return { id: "host-template-1" };
    },
  },
});

const initialA = wizard.getSnapshot();
const initialB = wizard.getSnapshot();
assert(
  initialA === initialB &&
    initialA.activeStep === "zip-import" &&
    initialA.steps["zip-import"].status === "idle",
  "Wizard snapshots should be referentially stable until publication.",
);

await wizard.loadZip({
  bytes: new ArrayBuffer(0),
  sourceName: "wizard.zip",
});
assert(
  wizard.getSnapshot().activeStep === "package-validation" &&
    wizard.getSnapshot().importValidation?.importable === true &&
    wizard.getSnapshot().packageSummary?.name === packageValue.name,
  "A valid ZIP should publish package evidence and enter package validation.",
);

wizard.next();
assert(
  wizard.getSnapshot().activeStep === "font-validation" &&
    wizard.getSnapshot().fontValidation.status === "ready",
  "A package without font requirements should pass font validation.",
);
wizard.next();
assert(
  wizard.getSnapshot().activeStep === "render-validation",
  "The headless controller should expose the fixed render-validation step.",
);

function readyIdentity(revision: number): ResolvedProductRenderIdentityV1 {
  return {
    schemaVersion: "resolved-product-render-identity-v1",
    identityId: `wizard-render:${revision}`,
    packageId: packageValue.packageId,
    packageRevision: `package:${revision}`,
    canonicalRevision: `canonical:${revision}`,
    resolvedRevision: `resolved:${revision}`,
    backendDecisionRevision: `backend:${revision}`,
    settlementRevision: `settlement:${revision}`,
    fontRevision: `font:${revision}`,
    assetRevision: `asset:${revision}`,
    placementRevision: `placement:${revision}`,
    exportSafety: "safe",
    readiness: "ready",
  };
}

wizard.publishRenderValidation({
  sessionRevision: wizard.getSnapshot().sessionRevision,
  identity: readyIdentity(wizard.getSnapshot().sessionRevision),
});
assert(
  wizard.getSnapshot().renderValidation.status === "warning" ||
    wizard.getSnapshot().renderValidation.status === "ready",
  "The current render identity should produce a structured render report.",
);
wizard.next();
assert(
  wizard.getSnapshot().activeStep === "field-rules",
  "A current render report should allow field-rule configuration.",
);

const firstRule = wizard.getSnapshot().fieldRules[0];
assert(firstRule, "The fixture should expose at least one editable field.");
wizard.updateFieldRule(firstRule.ruleId, {
  label: "Customer headline",
  helpText: "Shown on the main banner.",
});
assert(
  wizard.getSnapshot().renderValidation.status === "stale" &&
    wizard.getSnapshot().fieldRules[0].label === "Customer headline" &&
    wizard.getSnapshot().fieldRules[0].helpText ===
      "Shown on the main banner.",
  "Field-rule edits should remain sanitized and invalidate render validation.",
);

wizard.publishRenderValidation({
  sessionRevision: wizard.getSnapshot().sessionRevision,
  identity: readyIdentity(wizard.getSnapshot().sessionRevision),
});
wizard.next();
assert(
  wizard.getSnapshot().activeStep === "confirmation",
  "Current field and render validation should enable confirmation.",
);
const confirmation = await wizard.confirm();
assert(
  persisted === confirmation &&
    confirmation.sdkVersion === "0.4.1" &&
    confirmation.packageFingerprint.startsWith("fnv1a:") &&
    confirmation.packageDigest?.algorithm === "sha-256" &&
    confirmation.packageDigest.value.length === 64 &&
    confirmation.sourceName === "wizard.zip" &&
    confirmation.importedAt === "2026-07-30T10:00:00.000Z" &&
    confirmation.configuredFieldRules[0].helpText ===
      "Shown on the main banner." &&
    wizard.getSnapshot().status === "completed" &&
    wizard.getSnapshot().persistenceReceipt?.id === "host-template-1",
  "Confirmation should be immutable, host-neutral, fingerprinted, and persistence-aware.",
);

const currentInspection = await inspectTemplateImportConfirmation(
  confirmation,
  { fontRegistry: null },
);
assert(
  currentInspection.status === "ready" &&
    currentInspection.loadable &&
    currentInspection.digest.status === "verified" &&
    currentInspection.fingerprint.matches,
  "A current confirmation should pass fresh compatibility inspection.",
);

const reopenedSession = createTemplateSessionWithDependencies(
  {},
  {
    importZip: async () => readyImport(packageValue),
    createResolvedTree: createResolvedRenderTree,
    validate: validateTemplatePackage,
  },
);
const reopened = await loadTemplateImportConfirmation(
  reopenedSession,
  confirmation,
  { fontRegistry: null },
);
assert(
  reopened.applied &&
    !reopened.stale &&
    reopenedSession.getSnapshot().workingPackage?.packageId ===
      confirmation.packageValue.packageId &&
    reopenedSession.getSnapshot().importValidation?.importable === true,
  "A compatible confirmation should reopen through fresh session validation.",
);
const firstReopenedRevision = reopenedSession.getSnapshot().revision;
const reopenedAgain = await loadTemplateImportConfirmation(
  reopenedSession,
  confirmation,
  { fontRegistry: null },
);
assert(
  reopenedAgain.applied &&
    reopenedSession.getSnapshot().revision > firstReopenedRevision,
  "Repeated compatible reopening should publish a fresh session revision.",
);

const legacyConfirmation = structuredClone(confirmation) as Record<
  string,
  unknown
>;
delete legacyConfirmation.packageDigest;
legacyConfirmation.sdkVersion = "0.3.0";
const legacyInspection = await inspectTemplateImportConfirmation(
  legacyConfirmation,
  { fontRegistry: null },
);
assert(
  legacyInspection.loadable &&
    legacyInspection.status === "warning" &&
    legacyInspection.digest.status === "legacy-missing" &&
    legacyInspection.issues.some(
      (issue) => issue.code === "confirmation.digest-missing",
    ),
  "A valid 0.3.0 confirmation should remain loadable with a digest warning.",
);
const missingCurrentDigest = structuredClone(confirmation) as Record<
  string,
  unknown
>;
delete missingCurrentDigest.packageDigest;
const missingCurrentDigestInspection = await inspectTemplateImportConfirmation(
  missingCurrentDigest,
  { fontRegistry: null },
);
assert(
  !missingCurrentDigestInspection.loadable &&
    missingCurrentDigestInspection.issues.some(
      (issue) => issue.code === "confirmation.digest-required",
    ),
  "A 0.4.1 confirmation missing its required digest should be rejected.",
);

const beforeRejectedHydration = reopenedSession.getSnapshot();
const tamperedConfirmation = structuredClone(confirmation);
tamperedConfirmation.packageValue.name = "Tampered confirmation";
const rejectedHydration = await loadTemplateImportConfirmation(
  reopenedSession,
  tamperedConfirmation,
  { fontRegistry: null },
);
assert(
  !rejectedHydration.applied &&
    !rejectedHydration.stale &&
    rejectedHydration.inspection.status === "blocked" &&
    reopenedSession.getSnapshot() === beforeRejectedHydration &&
    rejectedHydration.inspection.issues.some(
      (issue) =>
        issue.code === "confirmation.fingerprint-mismatch" ||
        issue.code === "confirmation.digest-mismatch",
    ),
  "Tampered confirmation state should be rejected without replacing the active session.",
);

const mismatchedIdentity = structuredClone(confirmation);
mismatchedIdentity.importedPackage.packageId = "different-package";
const mismatchedInspection = await inspectTemplateImportConfirmation(
  mismatchedIdentity,
  { fontRegistry: null },
);
assert(
  !mismatchedInspection.loadable &&
    mismatchedInspection.issues.some(
      (issue) => issue.code === "confirmation.package-identity-mismatch",
    ),
  "Package identity mismatches should block reopening.",
);

const futureSchema = structuredClone(confirmation) as Record<string, unknown>;
futureSchema.schemaVersion = "template-import-confirmation-v2";
const futureInspection = await inspectTemplateImportConfirmation(futureSchema, {
  fontRegistry: null,
});
assert(
  !futureInspection.loadable &&
    futureInspection.issues.some(
      (issue) => issue.code === "confirmation.schema-unsupported",
    ),
  "Unsupported future confirmation schemas should be rejected.",
);

const localFontConfirmation = structuredClone(confirmation);
for (const candidatePackage of [
  localFontConfirmation.importedPackage,
  localFontConfirmation.packageValue,
]) {
  const textNodeId = Object.values(candidatePackage.nodes).find(
    (node) => node.type === "TEXT",
  )?.id;
  assert(textNodeId, "The fixture should contain a text node for font evidence.");
  candidatePackage.fontRequirements = [{
    id: "font:local-only",
    family: "Local Only",
    style: "Regular",
    cssStyle: "normal",
    weight: 400,
    postScriptName: "LocalOnly-Regular",
    usedBy: [textNodeId],
    characters: "A",
    editable: false,
    mixedStyle: false,
    source: "test",
    availableInFigma: false,
    assetId: "asset:font:local-only",
    resolution: {
      managedFontId: "managed-font:local-only:0",
      match: "exact",
      classification: "exact",
      confirmed: true,
      requestId: "font:local-only",
      faceIndex: 0,
      binaryHash: "local-only-binary-hash",
      runtimeFamily: "__template_font_local_only_0_static",
      effectiveFamily: "Local Only",
      effectiveWeight: 400,
      effectiveStyle: "normal",
      effectiveStretch: "normal",
    },
  }];
  candidatePackage.assets["asset:font:local-only"] = {
    id: "asset:font:local-only",
    type: "font",
    source: "stored",
    mimeType: "font/ttf",
    hash: "local-only-binary-hash",
    storageKey: "sha256:local-only-binary-hash",
    usedBy: [textNodeId],
    extensions: {
      managedFontId: "managed-font:local-only:0",
      fontFaceIdentity: {
        binaryHash: "local-only-binary-hash",
        faceIndex: 0,
        runtimeFamily: "__template_font_local_only_0_static",
        typographicFamily: "Local Only",
        postScriptName: "LocalOnly-Regular",
        weight: 400,
        style: "normal",
        stretch: "normal",
        classification: "exact",
      },
    },
  };
}
localFontConfirmation.packageFingerprint = createTemplatePackageFingerprint(
  localFontConfirmation.packageValue,
);
localFontConfirmation.packageDigest = await createTemplatePackageDigest(
  localFontConfirmation.packageValue,
);
const localFontInspection = await inspectTemplateImportConfirmation(
  localFontConfirmation,
  { fontRegistry: null },
);
assert(
  localFontInspection.loadable &&
    localFontInspection.status === "warning" &&
    localFontInspection.fonts[0]?.localBinaryAvailable === false &&
    localFontInspection.issues.some(
      (issue) => issue.code === "confirmation.font-binary-unavailable",
    ),
  "A valid confirmation should remain reopenable while clearly reporting missing browser-local font authority.",
);

const portableRuntime = await inspectTemplateRuntimeSupport({
  persistence: "none",
  managedFonts: false,
  renderValidation: false,
  pngCapture: false,
});
assert(
  portableRuntime.status === "ready" && portableRuntime.supported,
  "A DOM-free import-only environment should pass the selected runtime requirements.",
);
const browserRuntime = await inspectTemplateRuntimeSupport();
assert(
  browserRuntime.status === "blocked" &&
    browserRuntime.issues.some((issue) => issue.code === "runtime.dom.unavailable"),
  "The complete browser workflow should report structured blockers in a DOM-free environment.",
);
const indexedDbRuntime = await inspectTemplateRuntimeSupport({
  persistence: "indexeddb",
  managedFonts: false,
  renderValidation: false,
});
assert(
  indexedDbRuntime.status === "blocked" &&
    indexedDbRuntime.issues.some(
      (issue) => issue.code === "runtime.indexeddb.unavailable",
    ),
  "Default persistence should report missing IndexedDB with a stable code.",
);
const managedFontRuntime = await inspectTemplateRuntimeSupport({
  persistence: "none",
  managedFonts: true,
  renderValidation: false,
});
assert(
  managedFontRuntime.status === "blocked" &&
    managedFontRuntime.issues.some(
      (issue) => issue.code === "runtime.font-face.unavailable",
    ) &&
    managedFontRuntime.issues.some(
      (issue) => issue.code === "runtime.font-face-set.unavailable",
    ),
  "Managed-font workflows should report missing font activation capabilities.",
);
const captureRuntime = await inspectTemplateRuntimeSupport({
  persistence: "none",
  managedFonts: false,
  renderValidation: false,
  pngCapture: true,
});
assert(
  captureRuntime.status === "blocked" &&
    captureRuntime.issues.some(
      (issue) => issue.code === "runtime.png-capture.unavailable",
    ),
  "Requested PNG capture should report missing browser capture capabilities.",
);

wizard.restart();
assert(
  wizard.getSnapshot().activeStep === "zip-import" &&
    wizard.getSnapshot().completion === null &&
    wizard.getSnapshot().sourceName === null,
  "Restart should clear the complete previous attempt.",
);
wizard.cancel();
assert(
  wizard.getSnapshot().status === "cancelled",
  "Cancel should terminate pending work without host navigation.",
);

const blockedSession = createTemplateSessionWithDependencies(
  {},
  {
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
            code: "bundle.corrupt",
            severity: "error",
            category: "zip",
            message: "The ZIP is corrupt.",
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
    createResolvedTree: createResolvedRenderTree,
    validate: validateTemplatePackage,
  },
);
const blockedWizard = createTemplateImportWizard({ session: blockedSession });
await blockedWizard.loadZip({
  bytes: new ArrayBuffer(0),
  sourceName: "corrupt.zip",
});
assert(
  blockedSession.getSnapshot().validation !== null &&
    blockedSession.getSnapshot().importValidation?.status === "blocked" &&
    blockedWizard.getSnapshot().steps["package-validation"].status ===
      "blocked" &&
    blockedWizard.getSnapshot().steps["package-validation"].canContinue ===
      false,
  "Every blocked ZIP should expose structured phase and compatibility validation.",
);

const retrySession = createTemplateSessionWithDependencies(
  {},
  {
    importZip: async () => readyImport(packageValue),
    createResolvedTree: createResolvedRenderTree,
    validate: validateTemplatePackage,
  },
);
let persistenceAttempts = 0;
const retryWizard = createTemplateImportWizard({
  session: retrySession,
  persistenceAdapter: {
    async persistConfirmedTemplate() {
      persistenceAttempts += 1;
      if (persistenceAttempts === 1) {
        throw new Error("Temporary host storage failure.");
      }
      return { id: "retried-template" };
    },
  },
});
await retryWizard.loadZip({
  bytes: new ArrayBuffer(0),
  sourceName: "retry.zip",
});
retryWizard.next();
retryWizard.next();
retryWizard.publishRenderValidation({
  sessionRevision: retryWizard.getSnapshot().sessionRevision,
  identity: readyIdentity(retryWizard.getSnapshot().sessionRevision),
});
retryWizard.next();
retryWizard.next();
let firstPersistenceFailed = false;
try {
  await retryWizard.confirm();
} catch {
  firstPersistenceFailed = true;
}
assert(
  firstPersistenceFailed &&
    retryWizard.getSnapshot().activeStep === "confirmation" &&
    retryWizard.getSnapshot().completion !== null &&
    retryWizard.getSnapshot().error?.code ===
      "persistence.confirmation-failed",
  "A persistence failure should preserve the immutable confirmation for retry.",
);
await retryWizard.confirm();
assert(
  persistenceAttempts === 2 &&
    retryWizard.getSnapshot().status === "completed" &&
    retryWizard.getSnapshot().persistenceReceipt?.id ===
      "retried-template",
  "A failed host persistence operation should be retryable.",
);

retryWizard.dispose();
retrySession.dispose();
blockedWizard.dispose();
wizard.dispose();
session.dispose();

import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import { createResolvedRenderTree } from "../resolved";
import type { ResolvedProductRenderIdentityV1 } from "../render/productRenderIdentity";
import type { TemplatePackageV1 } from "../types";
import { validateTemplatePackage } from "../validateTemplatePackage";
import type { PackageImportResult } from "./runTemplatePackageImportPipeline";
import { createTemplateSessionWithDependencies } from "../session/templateSession";
import {
  createTemplateImportWizard,
  type TemplateImportConfirmationV1,
} from "./templateImportWizard";

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
    confirmation.sdkVersion === "0.3.0" &&
    confirmation.packageFingerprint.startsWith("fnv1a:") &&
    confirmation.sourceName === "wizard.zip" &&
    confirmation.importedAt === "2026-07-30T10:00:00.000Z" &&
    confirmation.configuredFieldRules[0].helpText ===
      "Shown on the main banner." &&
    wizard.getSnapshot().status === "completed" &&
    wizard.getSnapshot().persistenceReceipt?.id === "host-template-1",
  "Confirmation should be immutable, host-neutral, fingerprinted, and persistence-aware.",
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

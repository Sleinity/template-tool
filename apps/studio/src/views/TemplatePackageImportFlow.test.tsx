import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import importFlowSource from "./TemplatePackageImportFlow.tsx?raw";
import diagnosticContextSource from "../components/template-package/quality/TemplatePackageDiagnosticContext.tsx?raw";
import figmaPluginV041 from "../../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import { analyzeAssetReliability } from "@sleinity/template-browser/assets";
import { createSavedTemplateRecord } from "@sleinity/template-browser/persistence";
import { linkPackageMotionValue } from "@sleinity/template-core/motion";
import { validateTemplatePackage, type TemplatePackageV1 } from "@sleinity/template-core";
import {
  AssetDiagnosisPanel,
  buildZipPackageImportResult,
  canAdvancePackageWizard,
  canImportPackageResult,
  canNavigatePackageWizard,
  createSettingsPackageImportResult,
  defaultPackageCreateMetadata,
  EditableFieldsDiagnosisPanel,
  FontDiagnosisPanel,
  MotionDiagnosisPanel,
  PackageFilesPanel,
  PackageFontPreparationPanel,
  PackageOverviewDiagnosisPanel,
  PreviewReferenceDiagnosisPanel,
  TemplatePackageImportFlow,
  validateTemplatePackageUploadName,
  ZIP_ONLY_IMPORT_MESSAGE,
} from "./TemplatePackageImportFlow";
import {
  createImportSessionRevisionGuard,
  preserveImportedPackageBaseline,
  rebuildPackageImportResult,
  runTemplatePackageImportPipeline,
} from "@sleinity/template-browser/importer";
import type {
  LoadedSourceDiagnosticReport,
  LoadedSourceLayeredDiagnostic,
} from "@sleinity/template-browser/importer";
import type {
  PackageQualityIssue,
  PackageQualityReport,
} from "@sleinity/template-react/inspection";
import {
  CompactPackageSummary,
  PackageBlockingIssues,
  PackageTechnicalDetails,
  PackageValidationStatusHeader,
} from "./import/ValidateReadinessPanels";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function pngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.set([0, 0, 0, 13], 8);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}

async function buildZipResultForPackage(
  packageValue: TemplatePackageV1,
  sourceName = "template-package-test.zip",
) {
  const fixture = createStoredZip([
    { path: "template.json", data: JSON.stringify(packageValue) },
    { path: "assets.json", data: JSON.stringify({ assets: [] }) },
  ]);
  return buildZipPackageImportResult(
    Uint8Array.from(fixture).buffer,
    sourceName,
  );
}

const initialMarkup = renderToStaticMarkup(
  createElement(TemplatePackageImportFlow, {
    onCancel: () => undefined,
    onAddTemplate: () => undefined,
  }),
);

assert(
  initialMarkup.includes('data-testid="package-import-wizard"') &&
    initialMarkup.includes('data-testid="package-step-add"') &&
    initialMarkup.includes("Package") &&
    initialMarkup.includes("Fonts") &&
    initialMarkup.includes("Validate") &&
    initialMarkup.includes("Fields") &&
    initialMarkup.includes("Add template"),
  "The package wizard should start at Package and expose all five steps.",
);
assert(
  initialMarkup.includes("Choose template ZIP") &&
    initialMarkup.includes('data-testid="zip-package-dropzone"') &&
    initialMarkup.includes("Drop template ZIP here") &&
    initialMarkup.includes('data-testid="zip-package-input"') &&
    initialMarkup.includes("Template Tool accepts exported ZIP files") &&
    initialMarkup.includes("Template files are checked before they are added"),
  "Package should expose a ZIP drop target and file input with clear safety and source guidance.",
);
assert(
  initialMarkup.includes("Advanced optional overrides") &&
    initialMarkup.includes("Use this only as provenance") &&
    !initialMarkup.includes("Add JSON Package") &&
    !initialMarkup.includes("Upload JSON Package") &&
    !initialMarkup.includes("Template Package JSON import") &&
    !initialMarkup.includes("Attach Motion JSON") &&
    !initialMarkup.includes("Replace Motion JSON") &&
    !initialMarkup.includes("textarea"),
  "Retired JSON, pasted source, and manual Motion JSON controls should be absent from new imports.",
);

for (const unsupportedName of [
  "template.json",
  "template.jsx",
  "template.tsx",
  "template.rtf",
  "template.txt",
]) {
  assert(
    validateTemplatePackageUploadName(unsupportedName) ===
      ZIP_ONLY_IMPORT_MESSAGE,
    `${unsupportedName} should receive the visible ZIP-only importer response.`,
  );
}
assert(
  validateTemplatePackageUploadName("template-package.ZIP") === null,
  "ZIP package filenames should be accepted case-insensitively.",
);

const invalidZipFixture = createStoredZip([
  { path: "template.json", data: "{" },
  { path: "assets.json", data: JSON.stringify({ assets: [] }) },
]);
const invalidResult = await buildZipPackageImportResult(
  Uint8Array.from(invalidZipFixture).buffer,
  "invalid-template-package.zip",
);
assert(
  invalidResult.validation?.valid !== true &&
    invalidResult.layeredDiagnostics?.canImport === false &&
    !canImportPackageResult(invalidResult) &&
    !canAdvancePackageWizard(2, true, invalidResult) &&
    !canAdvancePackageWizard(3, true, invalidResult),
  "Invalid required ZIP JSON should remain blocked.",
);

const packageValue =
  figmaPluginV041 as unknown as TemplatePackageV1;
const validResult = await buildZipResultForPackage(packageValue);
assert(
  validResult.validation?.valid === true &&
    canAdvancePackageWizard(0, true, null) &&
    !canAdvancePackageWizard(1, true, validResult) &&
    canAdvancePackageWizard(1, true, validResult, true) &&
    canAdvancePackageWizard(2, true, validResult) &&
    canAdvancePackageWizard(3, true, validResult),
  "A selected package with a valid canonical result should progress through Validate and Review.",
);
assert(
  validResult.enrichment?.metadataComparison.status === "not_checked" &&
    validResult.validation?.valid === true,
  "Package-only import should remain valid when no live Figma URL or provider is used.",
);
assert(
  validResult.sourceMetadata?.type === "package-zip" &&
    validResult.loadedSource?.sourceKind === "package-zip",
  "Canonical imports should expose ZIP source metadata.",
);
assert(
  validResult.layeredDiagnostics?.canImport === true &&
    canImportPackageResult(validResult),
  "Valid ZIP packages should pass through the layered import gate.",
);
assert(
  validResult.package?.editableFields.length ===
    packageValue.editableFields.length,
  "Review should receive the validated editable fields.",
);

const importedBaseline = preserveImportedPackageBaseline(null, validResult);
assert(
  importedBaseline !== null &&
    importedBaseline !== validResult.package &&
    importedBaseline.name === packageValue.name,
  "The first successful import should establish an immutable cloned baseline.",
);
const renamedWorkingPackage = structuredClone(validResult.package!);
renamedWorkingPackage.name = "Edited working package";
const renamedResult = rebuildPackageImportResult(
  validResult,
  renamedWorkingPackage,
);
const preservedBaseline = preserveImportedPackageBaseline(
  importedBaseline,
  renamedResult,
);
assert(
  preservedBaseline === importedBaseline &&
    preservedBaseline?.name === packageValue.name &&
    renamedResult.package?.name === "Edited working package",
  "Repeated validation and working-package mutations must not replace the imported baseline.",
);

const newlyBlockedPackage = structuredClone(validResult.package!);
newlyBlockedPackage.rootNodeId = "missing-after-edit";
const newlyBlockedResult = rebuildPackageImportResult(
  validResult,
  newlyBlockedPackage,
);
assert(
  newlyBlockedResult.validation?.valid === false &&
    newlyBlockedResult.layeredDiagnostics?.canImport === false &&
    !canImportPackageResult(newlyBlockedResult),
  "A package mutation that introduces a structural blocker should rebuild the layered import gate.",
);
const repairedResult = rebuildPackageImportResult(
  newlyBlockedResult,
  structuredClone(validResult.package!),
);
assert(
  repairedResult.validation?.valid === true &&
    repairedResult.layeredDiagnostics?.canImport === true &&
    canImportPackageResult(repairedResult),
  "Repairing a package mutation should rebuild validation and restore layered import readiness.",
);

const revisionGuard = createImportSessionRevisionGuard();
const olderRevision = revisionGuard.next();
const newerRevision = revisionGuard.next();
assert(
  !revisionGuard.isCurrent(olderRevision) &&
    revisionGuard.isCurrent(newerRevision),
  "An older asynchronous import result must not be allowed to overwrite a newer package revision.",
);

const noFontPackage = structuredClone(packageValue);
delete noFontPackage.fontRequirements;
const noFontMarkup = renderToStaticMarkup(
  createElement(PackageFontPreparationPanel, {
    packageValue: noFontPackage,
    onPackageChange: () => undefined,
  }),
);
assert(
  noFontMarkup.includes('data-testid="font-preparation-empty"') &&
    noFontMarkup.includes("Fonts are ready") &&
    noFontMarkup.includes("font-requirement-list"),
  "Prepare Fonts should show a clear empty state when no fonts are required.",
);
const missingPackageFontMarkup = renderToStaticMarkup(
  createElement(PackageFontPreparationPanel, {
    packageValue: null,
    onPackageChange: () => undefined,
  }),
);
assert(
  missingPackageFontMarkup.includes("No template selected") &&
    !canAdvancePackageWizard(1, true, null),
  "Prepare Fonts should explain missing package state while keeping Next blocked until import succeeds.",
);
const noFontResult = await buildZipResultForPackage(
  noFontPackage,
  "no-font-package.zip",
);
assert(
  !canAdvancePackageWizard(1, true, noFontResult) &&
    canAdvancePackageWizard(1, true, noFontResult, true) &&
    Boolean(noFontResult.package?.fontRequirements?.length),
  "ZIP import should infer font requirements and keep progression blocked until their exact faces are ready.",
);
const inferredFontMarkup = renderToStaticMarkup(
  createElement(PackageFontPreparationPanel, {
    packageValue: noFontResult.package,
    onPackageChange: () => undefined,
  }),
);
assert(
  !inferredFontMarkup.includes("No additional fonts are required.") &&
    inferredFontMarkup.includes("font-requirement-list"),
  "Prepare Fonts should show inferred text faces instead of a false ready state.",
);

const missingFontPackage = structuredClone(noFontPackage);
missingFontPackage.fontRequirements = [
  {
    id: "font:test-serif:400:normal",
    family: "Test Serif",
    style: "Regular",
    cssStyle: "normal",
    weight: 400,
    postScriptName: "TestSerif-Regular",
    usedBy: [missingFontPackage.rootNodeId],
    characters: "Test",
    editable: false,
    mixedStyle: false,
    source: "figma",
    availableInFigma: true,
  },
];
const missingFontMarkup = renderToStaticMarkup(
  createElement(PackageFontPreparationPanel, {
    packageValue: missingFontPackage,
    onPackageChange: () => undefined,
  }),
);
assert(
  missingFontMarkup.includes("Test Serif") &&
    missingFontMarkup.includes("Font required") &&
    missingFontMarkup.includes("Test Serif — Regular (400)") &&
    missingFontMarkup.includes("font-requirement-row") &&
    missingFontMarkup.includes("ui-subsection-title"),
  "Prepare Fonts should show required or missing font faces when present.",
);

assert(
  diagnosticContextSource.includes("Affected preview") &&
    !diagnosticContextSource.includes("Affected Preview") &&
    diagnosticContextSource.includes('className="ui-section-title"') &&
    importFlowSource.includes('className="ui-subsection-title">Configure fields') &&
    !importFlowSource.includes('className="mx-auto max-w-4xl space-y-5"'),
  "Setup screens should use sentence-case semantic headings and keep Fonts aligned to the shared content edge.",
);
assert(
  importFlowSource.includes("TemplateInspectionPreview") &&
    importFlowSource.includes('targetFitLabel="Fit selected field"') &&
    diagnosticContextSource.includes("TemplateInspectionPreview") &&
    diagnosticContextSource.includes('targetFitLabel="Fit affected layer"') &&
    !diagnosticContextSource.includes("diagnosticZoom") &&
    !diagnosticContextSource.includes("diagnosticFit"),
  "Fields and Validate should delegate fitting and zoom to the shared authoritative inspection preview.",
);

const warningOnlyPackage = structuredClone(packageValue);
warningOnlyPackage.editableFields = [
  {
    id: "missingFieldTarget",
    type: "text",
    nodeId: "missing-node",
    property: "text.characters",
    defaultValue: "Still editable later",
  },
];
const warningOnlyResult = await buildZipResultForPackage(
  warningOnlyPackage,
  "warning-only-package.zip",
);
assert(
  warningOnlyResult.validation?.valid === false &&
    warningOnlyResult.layeredDiagnostics?.canImport === true &&
    canImportPackageResult(warningOnlyResult) &&
    canAdvancePackageWizard(2, true, warningOnlyResult),
  "Package validation errors that are non-blocking in layered diagnostics should allow import with warnings.",
);

const blockingPackage = structuredClone(packageValue);
blockingPackage.rootNodeId = "missing-root-node";
const blockingResult = await buildZipResultForPackage(
  blockingPackage,
  "blocking-package.zip",
);
assert(
  blockingResult.validation?.valid === false &&
    blockingResult.layeredDiagnostics?.canImport === false &&
    !canImportPackageResult(blockingResult) &&
    !canAdvancePackageWizard(2, true, blockingResult),
  "Structural package errors should block through the layered import gate.",
);
assert(
  defaultPackageCreateMetadata(packageValue).templateName ===
    packageValue.name,
  "Add Template should default the template name from package.name.",
);

assert(
  canNavigatePackageWizard(0, false, null) &&
    !canNavigatePackageWizard(1, false, null) &&
    !canNavigatePackageWizard(2, true, null) &&
    !canNavigatePackageWizard(4, true, validResult) &&
    canNavigatePackageWizard(4, true, validResult, "import", true),
  "Fresh imports should expose later steps only after exact required fonts are ready.",
);

const savedTemplate = createSavedTemplateRecord({
  name: "Saved settings fixture",
  description: "Settings test",
  packageValue,
  validation: validResult.validation!,
});
const settingsResult = createSettingsPackageImportResult(savedTemplate);
const settingsOverrideResult = createSettingsPackageImportResult(
  savedTemplate,
  "https://www.figma.com/design/test/settings?node-id=1-2",
);
assert(
  settingsOverrideResult.package?.packageId === packageValue.packageId &&
    settingsOverrideResult.validation?.valid === true,
  "Settings revalidation should rebuild from the saved working package without ZIP session bytes.",
);
assert(
  [0, 1, 2, 3, 4].every((step) =>
    canNavigatePackageWizard(step, false, settingsResult, "settings"),
  ),
  "Saved-template settings should allow direct navigation to every wizard step.",
);

const settingsMarkup = renderToStaticMarkup(
  createElement(TemplatePackageImportFlow, {
    mode: "settings",
    initialStep: 2,
    savedTemplate,
    onCancel: () => undefined,
    onUpdateTemplate: () => undefined,
    onSaveChanges: () => undefined,
    onDuplicateTemplate: () => undefined,
    onDeleteTemplate: () => undefined,
  }),
);
assert(
  settingsMarkup.includes("Rendering health") &&
    settingsMarkup.includes("Visual comparison is not run in the product") &&
    !settingsMarkup.includes("Motion JSON") &&
    !settingsMarkup.includes("Replace Motion JSON") &&
    !settingsMarkup.includes("Remove Motion") &&
    !settingsMarkup.includes("Rethink Sans") &&
    settingsMarkup.includes("Restart from imported package") &&
    settingsMarkup.includes("Duplicate template") &&
    settingsMarkup.includes("Delete template") &&
    settingsMarkup.includes('aria-label="Template actions"') &&
    settingsMarkup.includes("Save changes") &&
    settingsMarkup.indexOf("Save changes") < settingsMarkup.indexOf('aria-label="Template actions"') &&
    importFlowSource.includes("settingsChangeRevisionRef") &&
    importFlowSource.includes('status: "failed"') &&
    importFlowSource.includes('role="alert"') &&
    importFlowSource.includes("await onSaveChanges") &&
    !settingsMarkup.includes("setup-navigation__actions"),
  "Saved-template settings should open the Validate fidelity workbench while management remains available outside routine step navigation.",
);

const reviewMotionNodeId =
  Object.values(packageValue.nodes).find((node) => node.parentId !== null)?.id ??
  packageValue.rootNodeId;
const reviewMotionPackage = linkPackageMotionValue(structuredClone(packageValue), {
  version: 1,
  playbackStyle: "loop",
  nodes: [
    {
      node: reviewMotionNodeId,
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
const reviewMotionTemplate = createSavedTemplateRecord({
  name: "Review final-frame fixture",
  packageValue: reviewMotionPackage,
  validation: validateTemplatePackage(reviewMotionPackage),
});
const reviewMotionMarkup = renderToStaticMarkup(
  createElement(TemplatePackageImportFlow, {
    mode: "settings",
    savedTemplate: reviewMotionTemplate,
    onCancel: () => undefined,
    onUpdateTemplate: () => undefined,
    onDuplicateTemplate: () => undefined,
    onDeleteTemplate: () => undefined,
  }),
);
assert(
  reviewMotionMarkup.includes("Field preview") &&
    reviewMotionMarkup.includes('data-package-motion-render-mode="final-frame"'),
  "The Fields preview should render motion packages at their deterministic final frame.",
);

function writeUint16(bytes: number[], value: number): void {
  bytes.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(bytes: number[], value: number): void {
  bytes.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function append(bytes: number[], chunk: Uint8Array): void {
  for (const value of chunk) bytes.push(value);
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function createStoredZip(
  entries: Array<{ path: string; data?: string | Uint8Array }>,
): Uint8Array {
  const bytes: number[] = [];
  const centralDirectory: number[] = [];

  for (const entry of entries) {
    const pathBytes = encode(entry.path);
    const dataBytes =
      typeof entry.data === "string"
        ? encode(entry.data)
        : entry.data ?? new Uint8Array();
    const localHeaderOffset = bytes.length;

    writeUint32(bytes, 0x04034b50);
    writeUint16(bytes, 20);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint16(bytes, 0);
    writeUint32(bytes, 0);
    writeUint32(bytes, dataBytes.length);
    writeUint32(bytes, dataBytes.length);
    writeUint16(bytes, pathBytes.length);
    writeUint16(bytes, 0);
    append(bytes, pathBytes);
    append(bytes, dataBytes);

    writeUint32(centralDirectory, 0x02014b50);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, 0);
    writeUint32(centralDirectory, dataBytes.length);
    writeUint32(centralDirectory, dataBytes.length);
    writeUint16(centralDirectory, pathBytes.length);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, 0);
    writeUint32(centralDirectory, localHeaderOffset);
    append(centralDirectory, pathBytes);
  }

  const centralDirectoryOffset = bytes.length;
  bytes.push(...centralDirectory);
  writeUint32(bytes, 0x06054b50);
  writeUint16(bytes, 0);
  writeUint16(bytes, 0);
  writeUint16(bytes, entries.length);
  writeUint16(bytes, entries.length);
  writeUint32(bytes, centralDirectory.length);
  writeUint32(bytes, centralDirectoryOffset);
  writeUint16(bytes, 0);

  return new Uint8Array(bytes);
}

const zipFixture = createStoredZip([
  { path: "template.json", data: JSON.stringify(packageValue) },
  { path: "assets.json", data: JSON.stringify({ assets: [] }) },
  {
    path: "preview.png",
    data: pngHeader(packageValue.canvas.width, packageValue.canvas.height),
  },
]);
const zipResult = await buildZipPackageImportResult(
  Uint8Array.from(zipFixture).buffer,
  "template-package-fixture.zip",
);
const bundledFigmaZipFixture = createStoredZip([
  { path: "template.json", data: JSON.stringify(packageValue) },
  { path: "assets.json", data: JSON.stringify({ assets: [] }) },
  {
    path: "mcp.json",
    data: JSON.stringify({
      url: `https://www.figma.com/design/bundled-key/Bundled-source?node-id=${packageValue.rootNodeId.replace(/:/g, "-")}`,
      nodeId: packageValue.rootNodeId,
    }),
  },
]);
const bundledFigmaResult = await buildZipPackageImportResult(
  Uint8Array.from(bundledFigmaZipFixture).buffer,
  "template-package-with-mcp.zip",
);
assert(
  bundledFigmaResult.loadedSource?.figmaSource?.valid === true &&
    bundledFigmaResult.loadedSource.figmaSource.rootMatch === true &&
    bundledFigmaResult.sourceMetadata?.figmaUrl?.includes("bundled-key") &&
    bundledFigmaResult.enrichment?.figmaReference?.fileKey === "bundled-key",
  "A valid bundled mcp.json URL should become the detected Figma source without manual input.",
);
const overrideFigmaResult = await buildZipPackageImportResult(
  Uint8Array.from(bundledFigmaZipFixture).buffer,
  "template-package-with-mcp.zip",
  `https://www.figma.com/design/override-key/Override?node-id=${packageValue.rootNodeId.replace(/:/g, "-")}`,
);
assert(
  overrideFigmaResult.sourceMetadata?.figmaUrl?.includes("override-key") &&
    overrideFigmaResult.enrichment?.figmaReference?.fileKey === "override-key",
  "An explicit user Figma override should take precedence over bundled mcp.json metadata.",
);
const noFontZipFixture = createStoredZip([
  { path: "template.json", data: JSON.stringify(noFontPackage) },
  { path: "assets.json", data: JSON.stringify({ assets: [] }) },
]);
const noFontZipResult = await buildZipPackageImportResult(
  Uint8Array.from(noFontZipFixture).buffer,
  "template-package-no-fonts.zip",
);
const pipelineZipResult = await runTemplatePackageImportPipeline({
  format: "zip",
  buffer: Uint8Array.from(zipFixture).buffer,
  sourceName: "template-package-fixture.zip",
});
const realisticZipPackage = structuredClone(packageValue) as any;
const realisticImageNode = Object.values(realisticZipPackage.nodes).find(
  (node: any) => typeof node.image?.assetId === "string",
) as any;
const realisticTypedRef = realisticImageNode?.image?.assetId;
if (!realisticImageNode || typeof realisticTypedRef !== "string") {
  throw new Error("The ZIP compatibility fixture requires an image node.");
}
realisticZipPackage.editableFields.push({
  id: "product",
  type: "image",
  nodeId: realisticImageNode.id,
  property: "image.assetId",
  label: "Product",
  defaultValue: "asset_product_image_001",
  assetRef: "asset_product_image_001",
  typedRef: realisticTypedRef,
  refType: "asset",
  constraints: { aspectRatio: 0.714, scaleMode: "FILL" },
});
realisticZipPackage.diagnostics.push({
  severity: "warning",
  code: "LARGE_ASSET",
  message: "Asset is larger than the recommended threshold.",
  assetId: realisticTypedRef,
});
const realisticZipFixture = createStoredZip([
  { path: "template.json", data: JSON.stringify(realisticZipPackage) },
  {
    path: "assets.json",
    data: JSON.stringify({
      version: 1,
      assets: [
        {
          id: "asset_product_image_001",
          type: "image",
          path: "assets/product.png",
          mimeType: "image/png",
          byteSize: 4,
          aliases: [realisticTypedRef],
        },
      ],
    }),
  },
  { path: "assets/product.png", data: new Uint8Array([1, 2, 3]) },
]);
const realisticZipResult = await runTemplatePackageImportPipeline({
  format: "zip",
  buffer: Uint8Array.from(realisticZipFixture).buffer,
  sourceName: "realistic-template-package.zip",
});
assert(
  zipResult.validation?.valid === true &&
    zipResult.sourceMetadata?.type === "package-zip" &&
    zipResult.sourceMetadata.packageFiles?.templateJson === true &&
    zipResult.sourceMetadata.packageFiles.assetsJson === true &&
    zipResult.sourceMetadata.packageFiles.previewPng === true &&
    zipResult.loadedSource?.sourceKind === "package-zip",
  "ZIP import should validate and expose package file metadata for review and persistence.",
);
assert(
  canAdvancePackageWizard(0, true, null) &&
    canAdvancePackageWizard(
      1,
      true,
      noFontZipResult,
      true,
    ) &&
    canAdvancePackageWizard(
      2,
      true,
      noFontZipResult,
    ),
  "ZIP import with no font blockers should proceed through Add Package, Prepare Fonts, and Validate.",
);
assert(
  pipelineZipResult.sourceMetadata?.type === "package-zip" &&
    pipelineZipResult.layeredDiagnostics?.canImport === true,
  "The extracted import pipeline should produce the same ZIP review result shape.",
);
assert(
  realisticZipResult.layeredDiagnostics?.canImport === true &&
    canImportPackageResult(realisticZipResult) &&
    realisticZipResult.validation?.schemaValid === true &&
    realisticZipResult.layeredDiagnostics.infoDiagnostics.some(
      (item) =>
        item.code === "ASSET_BYTESIZE_MISMATCH" && item.severity === "info",
    ),
  "Known ZIP field metadata should pass the Add Package gate while readable asset-size differences remain repaired metadata.",
);
assert(
  zipResult.layeredDiagnostics?.canImport === true &&
    zipResult.layeredDiagnostics.warningDiagnostics.some(
      (item) => item.code === "MOTION_FILE_MISSING",
    ) &&
    zipResult.layeredDiagnostics.warningDiagnostics.some(
      (item) => item.code === "MCP_FILE_MISSING",
    ) &&
    canImportPackageResult(zipResult),
  "A package that declares motion should report its missing file while optional MCP metadata remains non-blocking.",
);

const diagnosisPackage = structuredClone(packageValue);
diagnosisPackage.motion = {
  format: "figma-motion-v1",
  sourceName: "motion.json",
  raw: {
    version: 1,
    playbackStyle: "loop",
    nodes: [
      {
        node: diagnosisPackage.rootNodeId,
        timelineDurationMs: 4000,
        fields: [
          {
            field: "motionTranslationY",
            keyframes: [
              { timeMs: 0, value: 0 },
              { timeMs: 4000, value: 120 },
            ],
          },
        ],
      },
    ],
  },
  linking: {
    status: "pass",
    matchedNodeIds: [diagnosisPackage.rootNodeId],
    missingNodeIds: [],
    extraPackageNodeIds: [],
  },
};
const diagnosisAssetReliability = analyzeAssetReliability(diagnosisPackage);
const diagnosisMarkup = renderToStaticMarkup(
  createElement(
    "div",
    null,
    createElement(PackageFilesPanel, {
      source: zipResult.loadedSource,
    }),
    createElement(PackageOverviewDiagnosisPanel, {
      packageValue: diagnosisPackage,
      source: zipResult.loadedSource,
      metadata: zipResult.sourceMetadata,
      enrichment: zipResult.enrichment,
    }),
    createElement(AssetDiagnosisPanel, {
      source: zipResult.loadedSource,
      assetReliability: diagnosisAssetReliability,
    }),
    createElement(EditableFieldsDiagnosisPanel, {
      packageValue: diagnosisPackage,
    }),
    createElement(FontDiagnosisPanel, {
      packageValue: diagnosisPackage,
      fontReadiness: null,
    }),
    createElement(MotionDiagnosisPanel, {
      packageValue: diagnosisPackage,
      source: zipResult.loadedSource,
    }),
    createElement(PreviewReferenceDiagnosisPanel, {
      packageValue: diagnosisPackage,
      source: zipResult.loadedSource,
    }),
  ),
);
assert(
  diagnosisMarkup.includes("Package files") &&
    diagnosisMarkup.includes("template.json") &&
    diagnosisMarkup.includes("assets.json") &&
    diagnosisMarkup.includes("Source file") &&
    diagnosisMarkup.includes("Package"),
  "Diagnose panels should show package files and source label.",
);
assert(
  diagnosisMarkup.includes("Assets recovered") &&
    diagnosisMarkup.includes("Manifest assets") &&
    diagnosisMarkup.includes("Package assets"),
  "Diagnose panels should show asset resolution status.",
);
assert(
  diagnosisMarkup.includes("Editable fields recovered") &&
    diagnosisMarkup.includes("Target found"),
  "Diagnose panels should list editable fields and target status.",
);
assert(
  diagnosisMarkup.includes("Fonts recovered") &&
    diagnosisMarkup.includes("Required faces"),
  "Diagnose panels should surface font readiness context.",
);
assert(
  diagnosisMarkup.includes("Motion recovered") &&
    diagnosisMarkup.includes("Animated nodes") &&
    diagnosisMarkup.includes("Keyframes"),
  "Diagnose panels should show motion summary when motion exists.",
);
assert(
  diagnosisMarkup.includes("Preview reference") &&
    diagnosisMarkup.includes("preview.png") &&
    diagnosisMarkup.includes("QA hook") &&
    diagnosisMarkup.includes("Ready"),
  "Diagnose panels should show preview reference metadata and QA hook status.",
);

function layeredReadinessReport(
  status: "ready" | "warning" | "blocked",
): LoadedSourceDiagnosticReport {
  const diagnostic: LoadedSourceLayeredDiagnostic = {
    code:
      status === "blocked"
        ? "PACKAGE_FILE_MISSING"
        : "PREVIEW_FILE_MISSING",
    severity: status === "blocked" ? "error" : "warning",
    category: status === "blocked" ? "package" : "preview",
    message:
      status === "blocked"
        ? "template.json is missing."
        : "preview.png is optional.",
    layer:
      status === "blocked" ? "package-structure" : "preview-reference",
    origin: status === "blocked" ? "loader" : "preview",
    blocksImport: status === "blocked",
    path: status === "blocked" ? "template.json" : "preview.png",
  };
  const diagnostics = status === "ready" ? [] : [diagnostic];
  return {
    canImport: status !== "blocked",
    status,
    diagnostics,
    blockingDiagnostics: status === "blocked" ? diagnostics : [],
    warningDiagnostics: status === "warning" ? diagnostics : [],
    infoDiagnostics: [],
    layers: [],
  };
}

const readinessMarkup = renderToStaticMarkup(
  createElement(
    "div",
    null,
    createElement(PackageValidationStatusHeader, {
      report: layeredReadinessReport("ready"),
      onValidate: () => undefined,
    }),
    createElement(PackageValidationStatusHeader, {
      report: layeredReadinessReport("warning"),
      onValidate: () => undefined,
    }),
    createElement(PackageValidationStatusHeader, {
      report: layeredReadinessReport("blocked"),
      onValidate: () => undefined,
    }),
  ),
);
assert(
  readinessMarkup.includes("Review recommended") &&
    readinessMarkup.includes("Blocked") &&
    readinessMarkup.includes("Check again") &&
    !readinessMarkup.includes("Blockers") &&
    !readinessMarkup.includes("Information"),
  "Validate readiness should present canonical states without duplicating Package Quality counts.",
);

const blockingIssue: PackageQualityIssue = {
  id: "quality-blocker",
  fingerprint: "PACKAGE_FILE_MISSING|template.json",
  code: "PACKAGE_FILE_MISSING",
  severity: "error",
  category: "package",
  origins: ["loader"],
  message: "template.json is missing.",
  whyItMatters: "The package cannot load.",
  suggestedFix: "Add template.json.",
  blocks: ["import"],
  blocksImport: true,
  layer: "package-structure",
  path: "template.json",
};
const blockingQualityReport: PackageQualityReport = {
  status: "blocked",
  health: {
    import: "blocked",
    fidelity: "ready",
    assets: "ready",
    editability: "ready",
    export: "ready",
  },
  summary: {
    errors: 1,
    warnings: 0,
    info: 0,
    importBlockers: 1,
    exportBlockers: 0,
  },
  renderingHealth: {
    schemaVersion: "rendering-health-projection-v1",
    readiness: { import: "blocked", dependencies: "ready", editing: "ready", preview: "ready", export: "ready" },
    semanticCapabilityFamilies: [],
    compatibilityRegionCount: 0,
    reviewFallbackRegionCount: 0,
    preservedOnlyRegionCount: 0,
    unsupportedCapabilities: [],
    sourceReference: { availability: "missing", comparison: "not-run-in-product" },
    productRenderIdentity: null,
  },
  issues: [blockingIssue],
};
const contradictoryReadinessMarkup = renderToStaticMarkup(
  createElement(PackageValidationStatusHeader, {
    report: layeredReadinessReport("ready"),
    qualityReport: {
      ...blockingQualityReport,
      health: {
        import: "ready",
        fidelity: "ready",
        assets: "ready",
        editability: "ready",
        export: "blocked",
      },
    },
    onValidate: () => undefined,
  }),
);
assert(
  contradictoryReadinessMarkup.includes("Blocked") &&
    !contradictoryReadinessMarkup.includes("You can add and use this template"),
  "Validate should prefer combined capability health over an import-only ready result.",
);
const blockingIssuesMarkup = renderToStaticMarkup(
  createElement(PackageBlockingIssues, {
    qualityReport: blockingQualityReport,
    onSelectIssue: () => undefined,
  }),
);
const technicalBlockedIssue: PackageQualityIssue = {
  ...blockingIssue,
  id: "technical-blocker",
  fingerprint: "technical-blocker",
  code: "resolved-font-missing",
  audience: "technical-trace",
  presentation: {
    userTitle: "Duplicate technical font detail",
    userSummary: "The user-facing font blocker already owns this cause.",
  },
};
const userOnlyBlockingMarkup = renderToStaticMarkup(
  createElement(PackageBlockingIssues, {
    qualityReport: {
      ...blockingQualityReport,
      issues: [blockingIssue, technicalBlockedIssue],
    },
    onSelectIssue: () => undefined,
  }),
);
assert(
  blockingIssuesMarkup.includes("Blocked capabilities") &&
    blockingIssuesMarkup.includes("Package file missing") &&
    !userOnlyBlockingMarkup.includes("Duplicate technical font detail") &&
    !renderToStaticMarkup(
      createElement(PackageBlockingIssues, {
        qualityReport: { ...blockingQualityReport, issues: [] },
        onSelectIssue: () => undefined,
      }),
    ),
  "The blocker shortcut should render blocked capabilities and disappear when no blocked issues remain.",
);

const compactValidateMarkup = renderToStaticMarkup(
  createElement(
    "div",
    null,
    createElement(CompactPackageSummary, {
      packageValue: diagnosisPackage,
      source: zipResult.loadedSource,
      metadata: zipResult.sourceMetadata,
    }),
    createElement(PackageTechnicalDetails, {
      packageValue: diagnosisPackage,
      source: zipResult.loadedSource,
      metadata: zipResult.sourceMetadata,
      layeredDiagnostics: zipResult.layeredDiagnostics,
      validation: zipResult.validation,
      assetIngestionDiagnostics: zipResult.assetIngestionDiagnostics,
    }),
  ),
);
assert(
  compactValidateMarkup.includes("Template summary") &&
    compactValidateMarkup.includes("ZIP package") &&
    compactValidateMarkup.includes("Template size") &&
    compactValidateMarkup.includes("Layers") &&
    compactValidateMarkup.includes("Media") &&
    compactValidateMarkup.includes("Fields") &&
    compactValidateMarkup.includes("Motion preview") &&
    compactValidateMarkup.includes("Reference image") &&
    !compactValidateMarkup.includes("Package file inventory"),
  "The compact summary should expose high-value package facts while file inventory remains technical.",
);
assert(
  compactValidateMarkup.includes('data-testid="package-technical-details"') &&
    compactValidateMarkup.includes("Package technical report") &&
    compactValidateMarkup.includes("Diagnostic sources") &&
    compactValidateMarkup.includes("Copy package technical report") &&
    !compactValidateMarkup.includes("<details open"),
  "Raw validation and source data should remain available in one collapsed technical section.",
);

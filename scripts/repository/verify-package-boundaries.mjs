import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { loadSdkEntryPointInventory } from "./sdk-entry-points.mjs";

const root = process.cwd();
const violations = [];
const sdkEntryInventory = await loadSdkEntryPointInventory(root);

async function read(relative) {
  return readFile(path.join(root, relative), "utf8");
}

async function exists(relative) {
  return stat(path.join(root, relative)).then(
    () => true,
    () => false,
  );
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const resolved = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(resolved)));
    else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) files.push(resolved);
  }
  return files;
}

const coreEntry = await read("packages/template-core/src/index.ts");
for (const forbidden of [
  /from\s+["']react(?:-dom)?["']/,
  /from\s+["'][^"']*\/persistence(?:\/|["'])/,
  /from\s+["'][^"']*TemplatePackageRenderer["']/,
  /from\s+["'][^"']*TemplatePackageQualityPanel["']/,
]) {
  if (forbidden.test(coreEntry)) {
    violations.push(`template-core public entry contains forbidden dependency: ${forbidden}`);
  }
}

const migratedCoreEntryPaths = [
  "types",
  "packageDiagnostics",
  "packageAssetSafety",
  "migrateTemplatePackage",
  "parseTemplatePackage",
  "validateTemplatePackage",
  "bundle/types",
  "bundle/zipBundleReader",
  "bundle/sourceContract",
  "bundle/normalizeTemplatePackageBundle",
  "bundle/loadTemplatePackageBundleSource",
  "scene",
  "resolved",
  "editor/packageEditorSession",
  "editor/packageFieldBindings",
  "editor/packageFieldRules",
];
for (const migratedPath of migratedCoreEntryPaths) {
  if (coreEntry.includes(`../../../src/template-package/${migratedPath}`)) {
    violations.push(`template-core still bridges migrated owner ${migratedPath} to root source`);
  }
}

const requiredCoreOwners = [
  "packages/template-core/src/types/index.ts",
  "packages/template-core/src/schema/template-package-v1.schema.json",
  "packages/template-core/src/packageDiagnostics.ts",
  "packages/template-core/src/packageAssetSafety.ts",
  "packages/template-core/src/migrateTemplatePackage.ts",
  "packages/template-core/src/parseTemplatePackage.ts",
  "packages/template-core/src/validateTemplatePackage.ts",
  "packages/template-core/src/bundle/assetManifestAdapter.ts",
  "packages/template-core/src/bundle/assetRegistry.ts",
  "packages/template-core/src/bundle/loadTemplatePackageBundle.ts",
  "packages/template-core/src/bundle/loadTemplatePackageBundleSource.ts",
  "packages/template-core/src/bundle/normalizeTemplatePackageBundle.ts",
  "packages/template-core/src/bundle/previewReference.ts",
  "packages/template-core/src/bundle/sourceContract.ts",
  "packages/template-core/src/bundle/types.ts",
  "packages/template-core/src/bundle/zipBundleReader.ts",
  "packages/template-core/src/bundle/zipReader.ts",
  "packages/template-core/src/assets/packageAssetResolution.ts",
  "packages/template-core/src/masks/packageMaskRelationships.ts",
  "packages/template-core/src/motion/packageMotion.ts",
  "packages/template-core/src/enrichment/parseFigmaUrl.ts",
  "packages/template-core/src/models/packageRenderValues.ts",
  "packages/template-core/src/models/packageLayoutModel.ts",
  "packages/template-core/src/models/packageStrokeModel.ts",
  "packages/template-core/src/models/packageTransformModel.ts",
  "packages/template-core/src/models/packageVectorModel.ts",
  "packages/template-core/src/backend-decision/types.ts",
  "packages/template-core/src/backend-decision/inputContracts.ts",
  "packages/template-core/src/backend-decision/resolveBackendDecision.ts",
  "packages/template-core/src/backend-decision/createDiagnosticProjection.ts",
  "packages/template-core/src/backend-decision/index.ts",
  "packages/template-core/src/primitives/types.ts",
  "packages/template-core/src/primitives/linearGradient.ts",
  "packages/template-core/src/primitives/resolvePrimitiveAppearance.ts",
  "packages/template-core/src/primitives/index.ts",
  "packages/template-core/src/resolved/types.ts",
  "packages/template-core/src/resolved/imagePlacement.ts",
  "packages/template-core/src/resolved/fontCharacterCoverage.ts",
  "packages/template-core/src/resolved/fontReadiness.ts",
  "packages/template-core/src/resolved/createResolvedRenderTree.ts",
  "packages/template-core/src/resolved/index.ts",
  "packages/template-core/src/publicBackendDecision.ts",
  "packages/template-core/src/publicBackendDiagnosticProjection.ts",
  "packages/template-core/src/editor/packageEditorSession.ts",
  "packages/template-core/src/editor/packageFieldBindings.ts",
  "packages/template-core/src/editor/packageFieldRules.ts",
  "packages/template-core/src/editor/fieldConstraints.ts",
  "packages/template-core/src/renderer-internal.ts",
  "packages/template-core/src/scene/types.ts",
  "packages/template-core/src/scene/createCanonicalSceneGraph.ts",
  "packages/template-core/src/scene/validateCanonicalSceneGraph.ts",
  "packages/template-core/src/scene/serializeCanonicalSceneGraph.ts",
  "packages/template-core/src/scene/createSceneEquivalenceReport.ts",
  "packages/template-core/src/scene/propertyAuthority.ts",
  "packages/template-core/src/scene/sourceToSceneMapping.ts",
  "packages/template-core/src/scene/migrationMap.ts",
  "packages/template-core/src/scene/index.ts",
  "packages/template-core/src/inspection.ts",
  "packages/template-core/src/inspection/qualityTypes.ts",
  "packages/template-core/src/inspection/previewQa.ts",
  "packages/template-core/src/inspection/appearance/createAppearanceContractProjection.ts",
  "packages/template-core/src/inspection/settlement/settleSceneGraph.ts",
];
for (const owner of requiredCoreOwners) {
  if (!(await exists(owner))) violations.push(`template-core must physically own ${owner}`);
}

const legacyCoreForwarders = {
  "src/template-package/types/index.ts": "../../../packages/template-core/src/types",
  "src/template-package/packageDiagnostics.ts": "../../packages/template-core/src/packageDiagnostics",
  "src/template-package/packageAssetSafety.ts": "../../packages/template-core/src/packageAssetSafety",
  "src/template-package/migrateTemplatePackage.ts": "../../packages/template-core/src/migrateTemplatePackage",
  "src/template-package/parseTemplatePackage.ts": "../../packages/template-core/src/parseTemplatePackage",
  "src/template-package/validateTemplatePackage.ts": "../../packages/template-core/src/validateTemplatePackage",
  "src/template-package/bundle/assetManifestAdapter.ts": "../../../packages/template-core/src/bundle/assetManifestAdapter",
  "src/template-package/bundle/assetRegistry.ts": "../../../packages/template-core/src/bundle/assetRegistry",
  "src/template-package/bundle/loadTemplatePackageBundle.ts": "../../../packages/template-core/src/bundle/loadTemplatePackageBundle",
  "src/template-package/bundle/loadTemplatePackageBundleSource.ts": "../../../packages/template-core/src/bundle/loadTemplatePackageBundleSource",
  "src/template-package/bundle/normalizeTemplatePackageBundle.ts": "../../../packages/template-core/src/bundle/normalizeTemplatePackageBundle",
  "src/template-package/bundle/previewReference.ts": "../../../packages/template-core/src/bundle/previewReference",
  "src/template-package/bundle/sourceContract.ts": "../../../packages/template-core/src/bundle/sourceContract",
  "src/template-package/bundle/types.ts": "../../../packages/template-core/src/bundle/types",
  "src/template-package/bundle/zipBundleReader.ts": "../../../packages/template-core/src/bundle/zipBundleReader",
  "src/template-package/bundle/zipReader.ts": "../../../packages/template-core/src/bundle/zipReader",
  "src/template-package/assets/packageAssetResolution.ts": "../../../packages/template-core/src/assets/packageAssetResolution",
  "src/template-package/masks/packageMaskRelationships.ts": "../../../packages/template-core/src/masks/packageMaskRelationships",
  "src/template-package/motion/index.ts": "../../../packages/template-core/src/motion",
  "src/template-package/motion/packageMotion.ts": "../../../packages/template-core/src/motion/packageMotion",
  "src/template-package/enrichment/parseFigmaUrl.ts": "../../../packages/template-core/src/enrichment/parseFigmaUrl",
  "src/template-package/backend-decision/types.ts": "../../../packages/template-core/src/backend-decision/types",
  "src/template-package/backend-decision/inputContracts.ts": "../../../packages/template-core/src/backend-decision/inputContracts",
  "src/template-package/backend-decision/resolveBackendDecision.ts": "../../../packages/template-core/src/backend-decision/resolveBackendDecision",
  "src/template-package/backend-decision/createDiagnosticProjection.ts": "../../../packages/template-core/src/backend-decision/createDiagnosticProjection",
  "src/template-package/backend-decision/index.ts": "../../../packages/template-core/src/backend-decision",
  "src/template-package/primitives/types.ts": "../../../packages/template-core/src/primitives/types",
  "src/template-package/primitives/linearGradient.ts": "../../../packages/template-core/src/primitives/linearGradient",
  "src/template-package/primitives/resolvePrimitiveAppearance.ts": "../../../packages/template-core/src/primitives/resolvePrimitiveAppearance",
  "src/template-package/primitives/index.ts": "../../../packages/template-core/src/primitives",
  "src/template-package/resolved/types.ts": "../../../packages/template-core/src/resolved/types",
  "src/template-package/resolved/imagePlacement.ts": "../../../packages/template-core/src/resolved/imagePlacement",
  "src/template-package/resolved/fontReadiness.ts": "../../../packages/template-core/src/resolved/fontReadiness",
  "src/template-package/resolved/createResolvedRenderTree.ts": "../../../packages/template-core/src/resolved/createResolvedRenderTree",
  "src/template-package/resolved/index.ts": "../../../packages/template-core/src/resolved",
  "src/template-package/publicBackendDecision.ts": "../../packages/template-core/src/publicBackendDecision",
  "src/template-package/publicBackendDiagnosticProjection.ts": "../../packages/template-core/src/publicBackendDiagnosticProjection",
  "src/template-package/editor/packageEditorSession.ts": "../../../packages/template-core/src/editor/packageEditorSession",
  "src/template-package/editor/packageFieldBindings.ts": "../../../packages/template-core/src/editor/packageFieldBindings",
  "src/template-package/editor/fieldConstraints.ts": "../../../packages/template-core/src/editor/fieldConstraints",
  "src/template-package/scene/types.ts": "../../../packages/template-core/src/scene/types",
  "src/template-package/scene/createCanonicalSceneGraph.ts": "../../../packages/template-core/src/scene/createCanonicalSceneGraph",
  "src/template-package/scene/validateCanonicalSceneGraph.ts": "../../../packages/template-core/src/scene/validateCanonicalSceneGraph",
  "src/template-package/scene/serializeCanonicalSceneGraph.ts": "../../../packages/template-core/src/scene/serializeCanonicalSceneGraph",
  "src/template-package/scene/createSceneEquivalenceReport.ts": "../../../packages/template-core/src/scene/createSceneEquivalenceReport",
  "src/template-package/scene/propertyAuthority.ts": "../../../packages/template-core/src/scene/propertyAuthority",
  "src/template-package/scene/sourceToSceneMapping.ts": "../../../packages/template-core/src/scene/sourceToSceneMapping",
  "src/template-package/scene/migrationMap.ts": "../../../packages/template-core/src/scene/migrationMap",
  "src/template-package/scene/index.ts": "../../../packages/template-core/src/scene",
  "src/template-package/bundle/previewQa.ts": "../../../packages/template-core/src/inspection/previewQa",
  "src/template-package/appearance-contracts/index.ts": "../../../packages/template-core/src/inspection/appearance",
  "src/template-package/appearance-contracts/backendRequirements.ts": "../../../packages/template-core/src/inspection/appearance/backendRequirements",
  "src/template-package/appearance-contracts/createAppearanceContractProjection.ts": "../../../packages/template-core/src/inspection/appearance/createAppearanceContractProjection",
  "src/template-package/appearance-contracts/serializeAppearanceContractProjection.ts": "../../../packages/template-core/src/inspection/appearance/serializeAppearanceContractProjection",
  "src/template-package/appearance-contracts/sourceDataSufficiency.ts": "../../../packages/template-core/src/inspection/appearance/sourceDataSufficiency",
  "src/template-package/appearance-contracts/types.ts": "../../../packages/template-core/src/inspection/appearance/types",
  "src/template-package/appearance-contracts/validateAppearanceContractProjection.ts": "../../../packages/template-core/src/inspection/appearance/validateAppearanceContractProjection",
  "src/template-package/settlement/index.ts": "../../../packages/template-core/src/inspection/settlement",
  "src/template-package/settlement/compareSettlement.ts": "../../../packages/template-core/src/inspection/settlement/compareSettlement",
  "src/template-package/settlement/createDependencyGraph.ts": "../../../packages/template-core/src/inspection/settlement/createDependencyGraph",
  "src/template-package/settlement/environmentProfiles.ts": "../../../packages/template-core/src/inspection/settlement/environmentProfiles",
  "src/template-package/settlement/invalidateDependencyGraph.ts": "../../../packages/template-core/src/inspection/settlement/invalidateDependencyGraph",
  "src/template-package/settlement/measurement.ts": "../../../packages/template-core/src/inspection/settlement/measurement",
  "src/template-package/settlement/measurementInventory.ts": "../../../packages/template-core/src/inspection/settlement/measurementInventory",
  "src/template-package/settlement/serializeSettlement.ts": "../../../packages/template-core/src/inspection/settlement/serializeSettlement",
  "src/template-package/settlement/settleSceneGraph.ts": "../../../packages/template-core/src/inspection/settlement/settleSceneGraph",
  "src/template-package/settlement/types.ts": "../../../packages/template-core/src/inspection/settlement/types",
};
for (const [forwarder, target] of Object.entries(legacyCoreForwarders)) {
  if (!(await exists(forwarder))) {
    violations.push(`Missing temporary core compatibility forwarder: ${forwarder}`);
    continue;
  }
  const source = await read(forwarder);
  const executable = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .trim();
  if (executable !== `export * from "${target}";`) {
    violations.push(`${forwarder} must be a behavior-free re-export of ${target}`);
  }
}

for (const retiredOwner of [
  "src/template-package/schema/template-package-v1.schema.json",
  "src/template-package/types/Appearance.ts",
  "src/template-package/types/Assets.ts",
  "src/template-package/types/EditableFieldBinding.ts",
  "src/template-package/types/Enrichment.ts",
  "src/template-package/types/Fonts.ts",
  "src/template-package/types/Layout.ts",
  "src/template-package/types/PackageMotion.ts",
  "src/template-package/types/TemplateNode.ts",
  "src/template-package/types/TemplatePackage.ts",
  "src/template-package/editor/fieldLabels.ts",
]) {
  if (await exists(retiredOwner)) violations.push(`Duplicate portable-core owner remains: ${retiredOwner}`);
}

for (const file of await sourceFiles(path.join(root, "packages", "template-core", "src"))) {
  if (file === path.join(root, "packages", "template-core", "src", "index.ts")) continue;
  const source = await readFile(file, "utf8");
  for (const forbidden of [
    /src[\\/]template-package/,
    /from\s+["']react(?:-dom)?["']/,
    /\b(?:document|window)\s*(?:\.|\[)/,
    /\b(?:indexedDB|localStorage|FontFace)\b/,
    /\bfetch\s*\(/,
    /apps[\\/]studio/,
  ]) {
    if (
      file.endsWith("inspection/settlement/measurementInventory.ts") &&
      String(forbidden).includes("document|window")
    ) {
      continue;
    }
    if (forbidden.test(source)) {
      violations.push(`${path.relative(root, file)} crosses the portable-core boundary: ${forbidden}`);
    }
  }
}

if (coreEntry.includes("fontCharacterCoverage")) {
  violations.push(
    "The emoji fallback coverage classifier must remain an internal core contract",
  );
}
for (const file of [
  "packages/template-browser/src/fonts/fontMatching.ts",
  "packages/template-core/src/resolved/fontReadiness.ts",
  "packages/template-browser/src/import/templateImportWizard.ts",
]) {
  if (!(await read(file)).includes("fontUsesPlatformEmojiFallback") &&
      file !== "packages/template-browser/src/fonts/fontMatching.ts") {
    violations.push(`${file} must consume the shared emoji fallback classifier`);
  }
  if (
    file === "packages/template-browser/src/fonts/fontMatching.ts" &&
    !(await read(file)).includes("textFaceCoverageCharacters")
  ) {
    violations.push(`${file} must consume shared text-face coverage authority`);
  }
}

const resolvedTreeSource = await read("packages/template-core/src/resolved/createResolvedRenderTree.ts");
if (/from\s+["'][^"']*\/render(?:\/|["'])/.test(resolvedTreeSource)) {
  violations.push("Resolved-tree creation must not import renderer-owned helpers");
}

const coreEditorSource = (
  await Promise.all(
    (await sourceFiles(path.join(root, "packages", "template-core", "src", "editor")))
      .map((file) => readFile(file, "utf8")),
  )
).join("\n");
for (const forbidden of [
  /\b(?:ParentNode|HTMLElement|CSSStyleDeclaration)\b/,
  /\b(?:document|window|CSS)\s*(?:\.|\[)/,
  /\b(?:indexedDB|localStorage|FontFace)\b/,
  /\bfetch\s*\(/,
]) {
  if (forbidden.test(coreEditorSource)) {
    violations.push(`template-core editor contract contains browser-owned behavior: ${forbidden}`);
  }
}

for (const file of await sourceFiles(path.join(root, "packages", "template-core", "src", "backend-decision"))) {
  if (/\.test\.[cm]?[jt]sx?$/.test(file)) continue;
  const source = await readFile(file, "utf8");
  if (/from\s+["'][^"']*\/resolved(?:\/|["'])/.test(source)) {
    violations.push(`${path.relative(root, file)} must depend on narrow backend inputs, not resolved types`);
  }
}

const legacyReactForwarders = {
  "src/template-package/render/index.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/render/TemplatePackageRenderer.tsx": "@sleinity/template-react/renderer-internal",
  "src/template-package/render/productRenderIdentity.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/render/ScaledTemplatePackagePreview.tsx": "@sleinity/template-react/renderer-internal",
  "src/template-package/render/TemplateInspectionPreview.tsx": "@sleinity/template-react/renderer-internal",
  "src/template-package/render/TemplateInspectionViewport.tsx": "@sleinity/template-react/renderer-internal",
  "src/template-package/render/packageClipping.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/render/packageConstraintLayout.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/render/packageLayoutModel.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/render/packageRenderUtils.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/render/packageStrokeLayout.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/render/packageTextLayout.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/render/packageTransformLayout.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/render/packageVectorRender.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/render/previewViewport.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/runtime-routing/index.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/runtime-routing/types.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/runtime-routing/propertyOwnership.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/runtime-routing/createCoreLayoutRoute.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/runtime-routing/settleCoreLayout.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/runtime-routing/useCoreLayoutRuntime.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/runtime-routing/verticalTextTrim.ts": "@sleinity/template-react/renderer-internal",
  "src/template-package/analysis/types.ts": "../../../packages/template-react/src/inspection/analysis/types",
  "src/template-package/analysis/featureCoverage.ts": "../../../packages/template-react/src/inspection/analysis/featureCoverage",
  "src/template-package/analysis/fidelityRisk.ts": "../../../packages/template-react/src/inspection/analysis/fidelityRisk",
  "src/template-package/analysis/index.ts": "../../../packages/template-react/src/inspection/analysis",
  "src/template-package/quality/types.ts": "../../../packages/template-react/src/inspection/quality/types",
  "src/template-package/quality/createTemplatePackageQualityReport.ts": "../../../packages/template-react/src/inspection/quality/createTemplatePackageQualityReport",
  "src/template-package/quality/diagnosticPresentation.ts": "../../../packages/template-react/src/inspection/quality/diagnosticPresentation",
  "src/template-package/quality/loadedSourceDiagnosticAdapter.ts": "../../../packages/template-react/src/inspection/quality/loadedSourceDiagnosticAdapter",
  "src/template-package/quality/qualityWorkspace.ts": "../../../packages/template-react/src/inspection/quality/qualityWorkspace",
  "src/template-package/quality/index.ts": "../../../packages/template-react/src/inspection/quality",
};
for (const [compatibilityPath, target] of Object.entries(legacyReactForwarders)) {
  const source = (await read(compatibilityPath)).trim();
  if (source !== `export * from "${target}";`) {
    violations.push(`${compatibilityPath} must remain a behavior-free React-owner forwarder`);
  }
}

const reactEntry = await read("packages/template-react/src/index.ts");
const reactImporterEntry = await read("packages/template-react/src/importer.tsx");
const reactEditorEntry = await read("packages/template-react/src/editor.tsx");
const reactInspectionEntry = await read("packages/template-react/src/inspection.ts");
for (const owner of [
  "packages/template-react/src/render/TemplatePackageRenderer.tsx",
  "packages/template-react/src/render/TemplateInspectionViewport.tsx",
  "packages/template-react/src/render/TemplateInspectionPreview.tsx",
  "packages/template-react/src/render/ScaledTemplatePackagePreview.tsx",
  "packages/template-react/src/render/packageRenderUtils.ts",
  "packages/template-react/src/render/previewViewport.ts",
  "packages/template-react/src/render/productRenderIdentity.ts",
  "packages/template-react/src/internal/runtime-routing/useCoreLayoutRuntime.ts",
  "packages/template-react/src/internal/runtime-routing/settleCoreLayout.ts",
  "packages/template-react/src/inspection/analysis/featureCoverage.ts",
  "packages/template-react/src/inspection/quality/createTemplatePackageQualityReport.ts",
]) {
  if (!(await exists(owner))) {
    violations.push(`template-react must physically own ${owner}`);
  }
}
for (const file of await sourceFiles(path.join(root, "packages", "template-react", "src"))) {
  const source = await readFile(file, "utf8");
  for (const forbidden of [
    /src[\\/]template-package/,
    /packages[\\/]template-(?:core|browser)[\\/]src/,
    /apps[\\/]studio/,
  ]) {
    if (forbidden.test(source)) {
      violations.push(`${path.relative(root, file)} crosses React package ownership: ${forbidden}`);
    }
  }
}
for (const file of await sourceFiles(path.join(root, "packages", "template-browser", "src"))) {
  if ((await readFile(file, "utf8")).includes("@sleinity/template-react")) {
    violations.push(`${path.relative(root, file)} creates a browser-to-React dependency`);
  }
}

const coreManifest = JSON.parse(await read("packages/template-core/package.json"));
for (const entry of ["./editor", "./assets", "./fonts", "./motion", "./inspection"]) {
  if (!coreManifest.exports?.[entry]) {
    violations.push(`template-core is missing curated entry ${entry}`);
  }
}
if (
  JSON.stringify(coreManifest.sdkInternalExports) !==
    JSON.stringify(["./renderer-internal"]) ||
  !coreManifest.exports?.["./renderer-internal"]
) {
  violations.push("template-core must declare exactly one renderer-internal sibling entry");
}
const reactManifest = JSON.parse(await read("packages/template-react/package.json"));
if (!reactManifest.exports?.["./inspection"] || !reactInspectionEntry.includes("inspection/quality")) {
  violations.push("template-react must expose the supported advanced inspection entry");
}
if (
  JSON.stringify(reactManifest.sdkInternalExports) !==
    JSON.stringify(["./renderer-internal"]) ||
  !reactManifest.exports?.["./renderer-internal"]
) {
  violations.push("template-react must declare exactly one repository renderer-internal entry");
}
for (const searchRoot of ["apps/studio", "examples", "packages/template-browser/src"]) {
  for (const file of await sourceFiles(path.join(root, searchRoot))) {
    const relativeFile = path.relative(root, file);
    const source = await readFile(file, "utf8");
    for (const internalEntry of [
      "@sleinity/template-core/renderer-internal",
      "@sleinity/template-react/renderer-internal",
    ]) {
      if (
        source.includes(internalEntry) &&
        relativeFile !== "apps/studio/vite.config.ts" &&
        relativeFile !== "apps/studio/src/fidelity/packageLayoutDebug.ts"
      ) {
        violations.push(`${relativeFile} must not consume SDK internal entry ${internalEntry}`);
      }
    }
  }
}
const browserManifest = JSON.parse(await read("packages/template-browser/package.json"));
for (const entry of ["./assets", "./fonts", "./persistence", "./capture", "./enrichment"]) {
  if (!browserManifest.exports?.[entry]) {
    violations.push(`template-browser is missing curated entry ${entry}`);
  }
}

for (const searchRoot of ["apps/studio/src", "apps/studio/server"]) {
  for (const file of await sourceFiles(path.join(root, searchRoot))) {
    const relativeFile = path.relative(root, file);
    if (/\.test\.[cm]?[jt]sx?$/.test(relativeFile)) continue;
    const source = await readFile(file, "utf8");
    for (const forbidden of [
      /src[\\/]template-package/,
      /packages[\\/]template-(?:core|browser|react)[\\/]src/,
      /@sleinity\/template-(?:core|react)\/renderer-internal/,
    ]) {
      if (
        relativeFile === "apps/studio/src/fidelity/packageLayoutDebug.ts" &&
        forbidden.test("@sleinity/template-react/renderer-internal")
      ) {
        continue;
      }
      if (forbidden.test(source)) {
        violations.push(`${relativeFile} bypasses the supported Studio package boundary: ${forbidden}`);
      }
    }
  }
}
for (const studioFidelityOwner of [
  "apps/studio/src/fidelity/packageLayoutDebug.ts",
  "apps/studio/src/fidelity/TemplatePackageLayoutDebugger.tsx",
  "apps/studio/src/fidelity/TemplatePackageStressReports.tsx",
  "apps/studio/src/fidelity/fidelityIssuePacket.ts",
  "apps/studio/src/fidelity/visualDiff.ts",
  "apps/studio/src/fidelity/runtimeRoutingDevHarness.ts",
]) {
  if (!(await exists(studioFidelityOwner))) {
    violations.push(`Studio must physically own fidelity-only module ${studioFidelityOwner}`);
  }
}
const studioViteConfig = await read("apps/studio/vite.config.ts");
if (
  !studioViteConfig.includes("sdk-entry-points.json") ||
  !studioViteConfig.includes("sdkSourceAliases")
) {
  violations.push(
    "Studio Vite must derive every workspace SDK alias from config/sdk-entry-points.json",
  );
}
const packageManifestsByName = new Map([
  [coreManifest.name, coreManifest],
  [browserManifest.name, browserManifest],
  [reactManifest.name, reactManifest],
]);
for (const packageValue of sdkEntryInventory.packages) {
  const manifest = packageManifestsByName.get(packageValue.name);
  if (!manifest) {
    violations.push(`SDK entry inventory has no runtime manifest for ${packageValue.name}`);
    continue;
  }
  const expectedPaths = packageValue.entries.map((entry) => entry.path).sort();
  const actualPaths = Object.keys(manifest.exports ?? {}).sort();
  if (JSON.stringify(expectedPaths) !== JSON.stringify(actualPaths)) {
    violations.push(`${packageValue.name} exports differ from the checked SDK entry inventory`);
  }
  const expectedInternal = packageValue.entries
    .filter((entry) => entry.classification === "sdk-internal")
    .map((entry) => entry.path)
    .sort();
  const actualInternal = [...(manifest.sdkInternalExports ?? [])].sort();
  if (JSON.stringify(expectedInternal) !== JSON.stringify(actualInternal)) {
    violations.push(`${packageValue.name} internal exports differ from the checked SDK entry inventory`);
  }
}
for (const studioOnly of ["TemplatePackageQualityPanel", "TemplatePackageFieldEditor", "TemplatePackageImportFlow", "TemplateOverviewPage"]) {
  if (reactEntry.includes(studioOnly)) {
    violations.push(`template-react exports Studio-only UI: ${studioOnly}`);
  }
}
if (!reactEntry.includes("TemplateInspectionViewport")) {
  violations.push("template-react must export the composable inspection viewport");
}
for (const studioOnly of [
  "TemplatePackageImportFlow",
  "TemplatePackageFieldRulesEditor",
  "components/ui",
  "lucide-react",
  "apps/studio",
]) {
  if (reactImporterEntry.includes(studioOnly)) {
    violations.push(`template-react importer contains Studio-only dependency: ${studioOnly}`);
  }
}
for (const requiredImporterContract of [
  "TemplateImportWizard",
  "useTemplateImportWizard",
  "TemplateImportWizardProvider",
  "useTemplateImportWizardSnapshot",
  "TemplateImportWizardPreview",
  "TemplateImportWizardHandle",
  "TemplateImporterWizard",
  "TemplateImporterCompletionV1",
  "TemplateSessionV1",
]) {
  if (!reactImporterEntry.includes(requiredImporterContract)) {
    violations.push(`template-react importer is missing ${requiredImporterContract}`);
  }
}

for (const requiredEditorContract of [
  "TemplateSessionViewport",
  "TemplateSessionViewportHandle",
  "useTemplateSessionEditableFields",
  "useTemplateSessionEditableField",
  "useTemplateSessionDiagnosticSummary",
]) {
  if (!reactEditorEntry.includes(requiredEditorContract)) {
    violations.push(`template-react editor is missing ${requiredEditorContract}`);
  }
}
for (const forbiddenEditorDependency of [
  "apps/studio",
  "lucide-react",
  "TemplatePackageFieldEditor",
]) {
  if (reactEditorEntry.includes(forbiddenEditorDependency)) {
    violations.push(`template-react editor contains Studio-only dependency: ${forbiddenEditorDependency}`);
  }
}

for (const packageName of [
  "template-core",
  "template-browser",
  "template-react",
]) {
  for (const file of await sourceFiles(
    path.join(root, "packages", packageName, "src"),
  )) {
    const source = await readFile(file, "utf8");
    if (/apps[\\/]studio/.test(source)) {
      violations.push(
        `${path.relative(root, file)} must not import or reference apps/studio`,
      );
    }
  }
}

const requiredStudioOwners = [
  "apps/studio/index.html",
  "apps/studio/vite.config.ts",
  "apps/studio/tsconfig.json",
  "apps/studio/src/main.tsx",
  "apps/studio/src/App.tsx",
  "apps/studio/src/views",
  "apps/studio/src/routing",
  "apps/studio/src/assets",
  "apps/studio/server/figma-enrichment/vitePlugin.ts",
  "apps/studio/src/components/ui",
  "apps/studio/src/components/template-package/TemplateInspectionPreview.tsx",
  "apps/studio/src/components/template-package/editor/TemplatePackageFieldEditor.tsx",
  "apps/studio/src/components/template-package/editor/TemplatePackageFieldRulesEditor.tsx",
  "apps/studio/src/components/template-package/editor/TemplatePackageDiagnosticsPanel.tsx",
  "apps/studio/src/components/template-package/editor/fieldLabels.ts",
  "apps/studio/src/components/template-package/fonts/FontPreparationStep.tsx",
  "apps/studio/src/components/template-package/quality/TemplatePackageQualityPanel.tsx",
  "apps/studio/src/components/template-package/quality/TemplatePackageDiagnosticContext.tsx",
  "apps/studio/src/fidelity/TemplatePackageStressReports.tsx",
  "apps/studio/src/fidelity/TemplatePackageLayoutDebugger.tsx",
  "apps/studio/src/fidelity/fidelityIssuePacket.ts",
  "apps/studio/src/fidelity/visualDiff.ts",
  "apps/studio/src/fidelity/runtimeRoutingDevHarness.ts",
];
for (const owner of requiredStudioOwners) {
  if (!(await exists(owner))) {
    violations.push(`Studio must own ${owner}`);
  }
}

for (const retired of [
  "apps/studio/server/font-resolution/openFontApi.ts",
  "apps/studio/server/font-resolution/openFontApi.test.ts",
  "apps/studio/src/components/template-package/fonts/FontResolutionPanel.tsx",
]) {
  if (await exists(retired)) {
    violations.push(`Retired open-font owner remains: ${retired}`);
  }
}

for (const activeFontUi of [
  "apps/studio/src/components/template-package/fonts/FontPreparationStep.tsx",
  "packages/template-react/src/importer.tsx",
]) {
  const source = await read(activeFontUi);
  for (const retiredLabel of [
    "Add open font",
    "Available fonts",
    "Use replacement",
    "Link font",
    "resolve-open-font",
    "Emoji in this template will use the device emoji font.",
  ]) {
    if (source.includes(retiredLabel)) {
      violations.push(`${activeFontUi} exposes retired font setup text: ${retiredLabel}`);
    }
  }
}

const fontResolutionSource = await read(
  "packages/template-browser/src/fonts/fontResolution.ts",
);
if (
  fontResolutionSource.includes("resolve-open-font") ||
  fontResolutionSource.includes("requestTrustedOpenFont")
) {
  violations.push("Browser font resolution still contains open-font network behavior");
}

const requiredBrowserOwnerDirectories = [
  "assets",
  "editor",
  "enrichment",
  "export",
  "fonts",
  "import",
  "persistence",
  "runtime",
  "session",
  "storage",
];
for (const ownerDirectory of requiredBrowserOwnerDirectories) {
  if (!(await exists(`packages/template-browser/src/${ownerDirectory}`))) {
    violations.push(
      `template-browser must physically own its ${ownerDirectory} runtime family`,
    );
  }
}

const browserSourceDirectory = path.join(
  root,
  "packages",
  "template-browser",
  "src",
);
const browserTypeScriptConfig = JSON.parse(
  await read("packages/template-browser/tsconfig.json"),
);
if (
  browserTypeScriptConfig.compilerOptions?.paths?.[
    "@sleinity/template-core"
  ]?.[0] !== "../template-core/src/index.ts"
) {
  violations.push(
    "template-browser must resolve workspace core types from source so concurrent prepack builds cannot race core dist cleanup",
  );
}
const browserCoreBridge = path.join(
  browserSourceDirectory,
  "internal",
  "core.ts",
);
for (const file of await sourceFiles(browserSourceDirectory)) {
  const source = await readFile(file, "utf8");
  const relative = path.relative(root, file);
  for (const forbidden of [
    /src[\\/]template-package/,
    /apps[\\/]studio/,
    /from\s+["']react(?:-dom)?["']/,
    /from\s+["'][^"']*\/render(?:\/|["'])/,
  ]) {
    if (forbidden.test(source)) {
      violations.push(`${relative} crosses the browser package boundary: ${forbidden}`);
    }
  }
  if (file !== browserCoreBridge && /template-core[\\/]src/.test(source)) {
    violations.push(
      `${relative} must use the package-local core bridge or @sleinity/template-core`,
    );
  }
  if (
    file.includes(`${path.sep}fonts${path.sep}`) &&
    /from\s+["'][^"']*persistence/.test(source)
  ) {
    violations.push(
      `${relative} recreates the forbidden font-to-persistence dependency`,
    );
  }
}

const permittedCoreBridgeImports = new Set([
  "../../../template-core/src/assets/packageAssetResolution",
  "../../../template-core/src/bundle/assetRegistry",
  "../../../template-core/src/editor/fieldConstraints",
  "../../../template-core/src/enrichment/parseFigmaUrl",
  "../../../template-core/src/motion/packageMotion",
  "../../../template-core/src/resolved/fontCharacterCoverage",
]);
const coreBridgeSource = await read("packages/template-browser/src/internal/core.ts");
for (const match of coreBridgeSource.matchAll(/from\s+["']([^"']+)["']/g)) {
  if (!permittedCoreBridgeImports.has(match[1])) {
    violations.push(
      `template-browser internal core bridge imports an unapproved private path: ${match[1]}`,
    );
  }
}

const legacyBrowserForwarderRoots = [
  "src/template-package/assets",
  "src/template-package/fonts",
  "src/template-package/persistence",
  "src/template-package/import",
  "src/template-package/session",
  "src/template-package/export",
  "src/template-package/enrichment",
];
const browserForwarderExceptions = new Set([
  "src/template-package/assets/packageAssetResolution.ts",
  "src/template-package/enrichment/parseFigmaUrl.ts",
  "src/template-package/enrichment/visualDiff.ts",
]);
for (const directory of legacyBrowserForwarderRoots) {
  for (const file of await sourceFiles(path.join(root, directory))) {
    const relative = path.relative(root, file);
    if (
      /\.test\.[cm]?[jt]sx?$/.test(file) ||
      browserForwarderExceptions.has(relative)
    ) {
      continue;
    }
    const executable = (await readFile(file, "utf8"))
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
      .trim();
    if (
      !/^export \* from ["'][^"']*packages\/template-browser\/src\/[^"']+["'];$/.test(
        executable,
      )
    ) {
      violations.push(
        `${relative} must be a behavior-free template-browser compatibility forwarder`,
      );
    }
  }
}
for (const forwarder of [
  "src/template-package/bundle/bundleAssetIngestion.ts",
  "src/template-package/bundle/layeredSourceDiagnostics.ts",
  "src/template-package/editor/textMeasurement.ts",
]) {
  const executable = (await read(forwarder))
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .trim();
  if (
    !/^export \* from ["'][^"']*packages\/template-browser\/src\/[^"']+["'];$/.test(
      executable,
    )
  ) {
    violations.push(`${forwarder} must be a behavior-free browser forwarder`);
  }
}

const studioDistDirectory = path.join(root, "apps", "studio", "dist");
if (await exists("apps/studio/dist")) {
  for (const file of await sourceFiles(studioDistDirectory)) {
    const source = await readFile(file, "utf8");
    for (const forbidden of [
      "__templatePackageFontSetupHarness",
      "resolve-open-font",
      "Add open font",
      "Available fonts",
      "Use replacement",
      "Link font",
    ]) {
      if (source.includes(forbidden)) {
        violations.push(
          `Studio production output ${path.relative(root, file)} contains retired/development-only font behavior: ${forbidden}`,
        );
      }
    }
  }
}

const retiredRootStudioOwners = [
  "index.html",
  "vite.config.ts",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "postcss.config.js",
  "tailwind.config.js",
  "server",
  "src/App.tsx",
  "src/main.tsx",
  "src/views",
  "src/routing",
  "src/assets",
  "src/components/EditorLayout.tsx",
  "src/styles.css",
  "src/fonts.css",
  "src/vite-env.d.ts",
  "src/components/ui",
  "src/template-package/editor/TemplatePackageFieldEditor.tsx",
  "src/template-package/editor/TemplatePackageFieldRulesEditor.tsx",
  "src/template-package/editor/TemplatePackageDiagnosticsPanel.tsx",
  "src/template-package/fonts/FontPreparationStep.tsx",
  "src/template-package/fonts/FontResolutionPanel.tsx",
  "src/template-package/quality/TemplatePackageQualityPanel.tsx",
  "src/template-package/quality/TemplatePackageDiagnosticContext.tsx",
  "src/template-package/analysis/TemplatePackageStressReports.tsx",
  "src/template-package/debug/TemplatePackageLayoutDebugger.tsx",
  "src/template-package/quality/fidelityIssuePacket.ts",
  "src/template-package/enrichment/visualDiff.ts",
  "src/template-package/runtime-routing/devHarness.ts",
];
for (const retired of retiredRootStudioOwners) {
  if (await exists(retired)) {
    violations.push(`Duplicate root Studio owner remains: ${retired}`);
  }
}

for (const retained of [
  "src/template-package",
  "src/test-suite.ts",
]) {
  if (!(await exists(retained))) {
    violations.push(`Milestone 1A compatibility owner is missing: ${retained}`);
  }
}

for (const file of await sourceFiles(path.join(root, "src", "template-package"))) {
  if (/\.test\.[cm]?[jt]sx?$/.test(file)) continue;
  const source = await readFile(file, "utf8");
  if (/components[\\/]ui|apps[\\/]studio/.test(source)) {
    violations.push(
      `${path.relative(root, file)} must not depend on Studio UI or apps/studio`,
    );
  }
}

const coreBundlePath = path.join(root, "packages/template-core/dist/index.js");
try {
  await stat(coreBundlePath);
  const coreBundle = await readFile(coreBundlePath, "utf8");
  for (const forbidden of ["from\"react\"", "from'react'", "indexedDB", "localStorage", "document.createElement", "window.addEventListener"]) {
    if (coreBundle.includes(forbidden)) {
      violations.push(`template-core bundle contains browser/UI runtime token: ${forbidden}`);
    }
  }
} catch {
  violations.push("template-core must be built before boundary verification");
}

const coreDeclarationPath = path.join(root, "packages/template-core/dist/index.d.ts");
try {
  const declaration = await readFile(coreDeclarationPath);
  const declarationHash = createHash("sha256").update(declaration).digest("hex");
  if (declaration.byteLength !== 87431 || declarationHash !== "7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033") {
    violations.push(
      `template-core public declaration drifted from the protected SDK 0.3.0 baseline: ${declaration.byteLength} bytes / ${declarationHash}`,
    );
  }
} catch {
  violations.push("template-core must build dist/index.d.ts before declaration verification");
}

for (const entryPoint of ["session", "importer", "compatibility"]) {
  if (!(await exists(`packages/template-browser/src/${entryPoint}.ts`))) {
    violations.push(`template-browser is missing curated ${entryPoint} source`);
  }
  for (const extension of ["js", "d.ts"]) {
    const fileName = `${entryPoint}.${extension}`;
    const browserBundlePath = path.join(
      root,
      "packages/template-browser/dist",
      fileName,
    );
    try {
      const source = await readFile(browserBundlePath, "utf8");
      for (const forbidden of [
        "apps/studio",
        "components/ui",
        "lucide-react",
        'from "react"',
        "from 'react'",
      ]) {
        if (source.includes(forbidden)) {
          violations.push(
            `template-browser ${fileName} contains forbidden dependency: ${forbidden}`,
          );
        }
      }
    } catch {
      violations.push(
        `template-browser must build curated ${fileName} before boundary verification`,
      );
    }
  }
}

for (const fileName of [
  "index.js",
  "index.d.ts",
  "importer.js",
  "importer.d.ts",
  "importer.css",
]) {
  const reactBundlePath = path.join(root, "packages/template-react/dist", fileName);
  try {
    const source = await readFile(reactBundlePath, "utf8");
    for (const forbidden of ["apps/studio", "components/ui", "lucide-react"]) {
      if (source.includes(forbidden)) {
        violations.push(`template-react ${fileName} contains Studio dependency: ${forbidden}`);
      }
    }
    if (source.includes("__templatePackageFontSetupHarness")) {
      violations.push(
        `template-react ${fileName} contains the development-only Studio font harness`,
      );
    }
  } catch {
    violations.push(`template-react must build ${fileName} before boundary verification`);
  }
}

if (violations.length) {
  console.error(violations.map((item) => `- ${item}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("SDK package boundaries are clean.");
}

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const violations = [];

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
  "resolved",
  "editor/packageEditorSession",
  "editor/packageFieldBindings",
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
  "packages/template-core/src/resolved/fontReadiness.ts",
  "packages/template-core/src/resolved/createResolvedRenderTree.ts",
  "packages/template-core/src/resolved/index.ts",
  "packages/template-core/src/publicBackendDecision.ts",
  "packages/template-core/src/publicBackendDiagnosticProjection.ts",
  "packages/template-core/src/editor/packageEditorSession.ts",
  "packages/template-core/src/editor/packageFieldBindings.ts",
  "packages/template-core/src/editor/fieldConstraints.ts",
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
    if (forbidden.test(source)) {
      violations.push(`${path.relative(root, file)} crosses the portable-core boundary: ${forbidden}`);
    }
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

for (const [compatibilityPath, target] of Object.entries({
  "src/template-package/render/packageLayoutModel.ts": "../../../packages/template-core/src/models/packageLayoutModel",
  "src/template-package/render/packageStrokeLayout.ts": "../../../packages/template-core/src/models/packageStrokeModel",
})) {
  const source = (await read(compatibilityPath)).trim();
  if (source !== `export * from "${target}";`) {
    violations.push(`${compatibilityPath} must remain a behavior-free core-model forwarder`);
  }
}

for (const [compatibilityPath, forbiddenDefinition] of [
  ["src/template-package/render/packageRenderUtils.ts", /export function (?:normalizedColorToCss|canvasBackgroundToCss|getFirstVisibleSolidPaint|resolvePackageAssetSource|resolvePackageAxisLimits)\b/],
  ["src/template-package/render/packageTransformLayout.ts", /(?:export\s+)?function resolvePackageTransform\b/],
  ["src/template-package/render/packageVectorRender.ts", /function (?:svgStringSource|fallbackAssetSource|formatViewBox|validContentBounds)\b/],
]) {
  if (forbiddenDefinition.test(await read(compatibilityPath))) {
    violations.push(`${compatibilityPath} duplicates its core-owned portable model`);
  }
}

const reactEntry = await read("packages/template-react/src/index.ts");
for (const studioOnly of ["TemplatePackageQualityPanel", "TemplatePackageFieldEditor", "TemplatePackageImportFlow", "TemplateOverviewPage"]) {
  if (reactEntry.includes(studioOnly)) {
    violations.push(`template-react exports Studio-only UI: ${studioOnly}`);
  }
}
if (!reactEntry.includes("TemplateInspectionViewport")) {
  violations.push("template-react must export the composable inspection viewport");
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
  "apps/studio/server/font-resolution/openFontApi.ts",
  "apps/studio/src/components/ui",
  "apps/studio/src/components/template-package/TemplateInspectionPreview.tsx",
  "apps/studio/src/components/template-package/editor/TemplatePackageFieldEditor.tsx",
  "apps/studio/src/components/template-package/editor/TemplatePackageFieldRulesEditor.tsx",
  "apps/studio/src/components/template-package/editor/TemplatePackageDiagnosticsPanel.tsx",
  "apps/studio/src/components/template-package/editor/fieldLabels.ts",
  "apps/studio/src/components/template-package/fonts/FontPreparationStep.tsx",
  "apps/studio/src/components/template-package/fonts/FontResolutionPanel.tsx",
  "apps/studio/src/components/template-package/quality/TemplatePackageQualityPanel.tsx",
  "apps/studio/src/components/template-package/quality/TemplatePackageDiagnosticContext.tsx",
];
for (const owner of requiredStudioOwners) {
  if (!(await exists(owner))) {
    violations.push(`Studio must own ${owner}`);
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
  if (declaration.byteLength !== 86272 || declarationHash !== "e44413972edbaaf6de093dc800de5863b5317357322a9f1517effbb619fb84c8") {
    violations.push(
      `template-core public declaration drifted from Milestone 2A: ${declaration.byteLength} bytes / ${declarationHash}`,
    );
  }
} catch {
  violations.push("template-core must build dist/index.d.ts before declaration verification");
}

for (const fileName of ["index.js", "index.d.ts"]) {
  const reactBundlePath = path.join(root, "packages/template-react/dist", fileName);
  try {
    const source = await readFile(reactBundlePath, "utf8");
    for (const forbidden of ["apps/studio", "components/ui", "lucide-react"]) {
      if (source.includes(forbidden)) {
        violations.push(`template-react ${fileName} contains Studio dependency: ${forbidden}`);
      }
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

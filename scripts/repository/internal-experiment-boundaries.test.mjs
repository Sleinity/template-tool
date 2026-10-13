import assert from "node:assert/strict";
import { internalExperimentViolations as check } from "./internal-experiment-boundaries.mjs";

for (const statement of [
  'import { compileZipSource } from "./internal/compilerResult";',
  'export * from "./internal/compilerResult/types";',
  'export { compileZipSource } from "./internal/compilerResult";',
  'await import("./internal/compilerResult");',
  'require("./internal/compilerResult/compile");',
  'import "./internal/compilerResult";',
]) assert.equal(check("packages/template-browser/src/index.ts", statement).length, 1, statement);
assert.equal(check("packages/template-browser/src/internal/compilerResult/compile.ts",
  'import { project } from "../../../template-core/src/internal/definitionProjection";').length, 1);
assert.equal(check("packages/template-core/src/internal/definitionProjection/project.ts",
  'export * from "../../../template-browser/src/internal/compilerResult";').length, 1);
assert.deepEqual(check("packages/template-browser/src/internal/compilerResult/index.ts",
  'export * from "./compile";'), []);
assert.deepEqual(check("src/example.test.ts", 'import "../compilerResult";'), []);
assert.deepEqual(check("packages/template-browser/src/index.ts", 'export * from "./importer";'), []);
const facade = "packages/template-browser/src/import/runTemplatePackageImportPipelineV2.ts";
assert.deepEqual(check(facade, 'import { compileZipSource } from "../internal/compilerResult/compile";'), []);
assert.equal(check(facade, 'export { compileZipSource } from "../internal/compilerResult/compile";').length, 1);
assert.equal(check(facade, 'export * from "../internal/compilerResult";').length, 1);
assert.equal(check(facade, 'export type { CompiledSingleResult } from "../internal/compilerResult";').length, 1);
assert.equal(check(facade, 'import "../internal/definitionProjection";').length, 1);
assert.equal(check("apps/studio/src/setup/setupSources.ts", 'import "../internal/compilerResult";').length, 1);
console.log("Internal architecture experiments stay private; only the V2 import facade may delegate.");

const preparation = 'import { prepareInitialFamilyV2 } from "./familySourcePreparationV2";';
assert.deepEqual(check("packages/template-browser/src/import/templateSourceAssemblyV2.ts", preparation), []);
assert.deepEqual(check("packages/template-browser/test/familySourcePreparation.test.ts", preparation), []);
for (const consumer of ["packages/template-browser/src/index.ts", "apps/studio/src/setup/setupSources.ts", "packages/template-react/src/index.ts", "packages/template-browser/src/internal/compilerResult/compose.ts"]) {
  for (const statement of [preparation, 'export type { X } from "./familySourcePreparationV2";', 'await import("./familySourcePreparationV2");'])
    assert.equal(check(consumer, statement).length, 1);
}
assert.equal(check("packages/template-browser/src/import/templateSourceAssemblyV2.ts", 'export { prepareInitialFamilyV2 } from "./familySourcePreparationV2";').length, 1);
console.log("Family preparation is private to the existing authoring operations.");

for (const consumer of ["packages/template-browser/src/index.ts", "apps/studio/src/setup/setupSources.ts", "packages/template-react/src/fieldSessionV2.tsx", "packages/template-browser/src/internal/compilerResult/compile.ts", "packages/template-core/src/internal/definitionProjection/project.ts"]) {
  for (const statement of ['import { adaptSingleSession } from "../internal/sessionContract/adapt";', 'export * from "./internal/sessionContract/types";', 'await import("./sessionContract/adapt");'])
    assert.equal(check(consumer, statement).length, 1, `${consumer}: ${statement}`);
}
assert.deepEqual(check("packages/template-browser/test/sessionContract.test.ts", 'import "../src/internal/sessionContract/adapt";'), []);
assert.deepEqual(check("packages/template-browser/src/internal/sessionContract/adapt.ts", 'import type { X } from "./types";'), []);
for (const name of ["compilerResult", "definitionProjection"]) assert.equal(check("packages/template-browser/src/internal/sessionContract/adapt.ts", `import "../${name}/types";`).length, 1);
console.log("Internal session views remain isolated, borrowed and test-only.");

const readerFacade = "packages/template-browser/src/session-internal.ts";
const reactReader = "packages/template-react/src/internal/useFieldSessionSnapshotV2.ts";
assert.deepEqual(check(readerFacade, 'import { adaptSingleSession } from "./internal/sessionContract/adapt";'), []);
assert.equal(check(readerFacade, 'export * from "./internal/sessionContract/adapt";').length, 1);
assert.deepEqual(check(reactReader, 'import { createSingleSessionSnapshotReader } from "@sleinity/template-browser/session-internal";'), []);
for (const consumer of ["packages/template-browser/src/session.ts", "packages/template-browser/src/index.ts", "packages/template-react/src/index.ts", "apps/studio/src/App.tsx", "examples/host/src/index.ts", "packages/template-browser/src/internal/compilerResult/compile.ts"]) {
  for (const statement of ['import { X } from "@sleinity/template-browser/session-internal";', 'export * from "./session-internal";', 'await import("@sleinity/template-browser/session-internal");', 'require("./session-internal");'])
    assert.equal(check(consumer, statement).length, 1, `${consumer}: ${statement}`);
}
assert.equal(check("packages/template-react/src/editor.tsx", 'export * from "./internal/useFieldSessionSnapshotV2";').length, 1);
assert.equal(check("packages/template-react/src/session.tsx", 'import { useFieldSessionSnapshotV2 } from "./internal/useFieldSessionSnapshotV2";').length, 1);
assert.deepEqual(check("packages/template-react/src/fieldSessionV2.tsx", 'import { useFieldSessionSnapshotV2 } from "./internal/useFieldSessionSnapshotV2";'), []);
console.log("Only the private React snapshot bridge consumes the restricted Browser reader.");

for (const consumer of ["packages/template-browser/src/index.ts", "packages/template-react/src/fieldSessionV2.tsx", "apps/studio/src/App.tsx", "packages/template-browser/src/internal/sessionContract/adapt.ts", "packages/template-browser/src/internal/compilerResult/compile.ts", "packages/template-core/src/internal/definitionProjection/project.ts"]) {
  for (const statement of ['import { createSerializedSaveQueue } from "./serializedSaveQueue";', 'export * from "./serializedSaveQueue";', 'await import("./serializedSaveQueue");', 'require("./serializedSaveQueue");', 'import "./serializedSaveQueue";', 'import "./serializedSaveQueue.ts";', 'export * from "./serializedSaveQueue.js";'])
    assert.equal(check(consumer, statement).length, 1, `${consumer}: ${statement}`);
}
for (const consumer of ["packages/template-browser/src/session/templateSessionV2.ts", "packages/template-browser/src/session/templateFieldFamilySessionV2.ts"]) {
  assert.deepEqual(check(consumer, 'import { createSerializedSaveQueue } from "./serializedSaveQueue";'), []);
  assert.equal(check(consumer, 'export type { Queue } from "./serializedSaveQueue";').length, 1);
}
assert.deepEqual(check("packages/template-browser/test/serializedSaveQueue.test.ts", 'import "../src/session/serializedSaveQueue";'), []);
console.log("Only the native single/Family sessions consume the private save queue.");

for (const consumer of ["packages/template-browser/src/index.ts", "packages/template-react/src/fieldSessionV2.tsx", "apps/studio/src/App.tsx", "packages/template-browser/src/internal/sessionContract/adapt.ts", "packages/template-browser/src/internal/compilerResult/compile.ts", "packages/template-core/src/internal/definitionProjection/project.ts"]) {
  for (const statement of ['import { createStoredAssetHydration } from "./storedAssetHydration";', 'export * from "./storedAssetHydration";', 'await import("./storedAssetHydration");', 'require("./storedAssetHydration");', 'import "./storedAssetHydration.ts";', 'export * from "./storedAssetHydration.js";'])
    assert.equal(check(consumer, statement).length, 1, `${consumer}: ${statement}`);
}
for (const consumer of ["packages/template-browser/src/session/templateSessionV2.ts", "packages/template-browser/src/session/templateFieldFamilySessionV2.ts"]) {
  assert.deepEqual(check(consumer, 'import { createStoredAssetHydration } from "./storedAssetHydration";'), []);
  assert.equal(check(consumer, 'export * from "./storedAssetHydration";').length, 1);
}
assert.deepEqual(check("packages/template-browser/test/storedAssetHydrationScope.test.ts", 'import "../src/session/storedAssetHydration";'), []);
console.log("Only native V2 sessions consume private asset hydration.");

for (const consumer of ["packages/template-browser/src/index.ts", "packages/template-react/src/fieldSessionV2.tsx", "apps/studio/src/App.tsx", "packages/template-browser/src/internal/sessionContract/adapt.ts", "packages/template-browser/src/internal/compilerResult/compile.ts", "packages/template-core/src/internal/definitionProjection/project.ts"]) {
  for (const statement of ['import { evaluateFieldRenderEvidence } from "./fieldRenderEvidence";', 'export * from "./fieldRenderEvidence";', 'await import("./fieldRenderEvidence");', 'require("./fieldRenderEvidence");', 'import "./fieldRenderEvidence.ts";', 'export * from "./fieldRenderEvidence.js";', 'export type { X } from "./fieldRenderEvidence";'])
    assert.equal(check(consumer, statement).length, 1, `${consumer}: ${statement}`);
}
for (const consumer of ["packages/template-browser/src/session/templateSessionV2.ts", "packages/template-browser/src/session/templateFieldFamilySessionV2.ts"]) {
  assert.deepEqual(check(consumer, 'import { evaluateFieldRenderEvidence } from "./fieldRenderEvidence";'), []);
  assert.equal(check(consumer, 'export * from "./fieldRenderEvidence";').length, 1);
}
assert.deepEqual(check("packages/template-browser/test/fieldRenderEvidence.test.ts", 'import "../src/session/fieldRenderEvidence";'), []);
console.log("Only native V2 sessions consume private accepted-evidence evaluation.");

assert.deepEqual(check("packages/template-react/src/render/TemplatePackageRenderer.tsx", 'import { canReuseTextMeasurement } from "../internal/runtime-routing/textMeasurementInputs";'), []);
assert.notDeepEqual(check("apps/studio/src/Forbidden.ts", 'import { canReuseTextMeasurement } from "../textMeasurementInputs";'), []);
assert.notDeepEqual(check("packages/template-react/src/index.ts", 'export * from "./internal/runtime-routing/textMeasurementInputs";'), []);
for (const consumer of ["apps/studio/src/Forbidden.ts", "packages/template-react/src/index.ts", "packages/template-browser/src/internal/sessionContract/adapt.ts"]) {
  for (const statement of ['import "./textMeasurementInputs.ts";', 'export * from "./textMeasurementInputs.js";', 'await import("./textMeasurementInputs");', 'require("./textMeasurementInputs");'])
    assert.equal(check(consumer, statement).length, 1, `${consumer}: ${statement}`);
}
assert.equal(check("packages/template-react/src/render/TemplatePackageRenderer.tsx", 'export type { X } from "../internal/runtime-routing/textMeasurementInputs.ts";').length, 1);

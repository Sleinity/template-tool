import { runTemplatePackageImportPipeline } from "../../src/template-package/import/runTemplatePackageImportPipeline";
import { createCanonicalSceneGraph } from "../../src/template-package/scene/createCanonicalSceneGraph";
import { createSceneEquivalenceReport } from "../../src/template-package/scene/createSceneEquivalenceReport";
import { PROPERTY_AUTHORITY_MATRIX } from "../../src/template-package/scene/propertyAuthority";
import { SCENE_MIGRATION_MAP } from "../../src/template-package/scene/migrationMap";
import { SOURCE_TO_SCENE_MAPPING } from "../../src/template-package/scene/sourceToSceneMapping";
import { validateCanonicalSceneGraph } from "../../src/template-package/scene/validateCanonicalSceneGraph";
import { createAppearanceContractProjection } from "../../src/template-package/appearance-contracts/createAppearanceContractProjection";
import { serializeAppearanceContractProjection } from "../../src/template-package/appearance-contracts/serializeAppearanceContractProjection";
import { validateAppearanceContractProjection } from "../../src/template-package/appearance-contracts/validateAppearanceContractProjection";

const clock = () => typeof performance !== "undefined" ? performance.now() : Date.now();

export async function resolveFixtureScene(bytes, sourceName, fixtureIdentity) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const buffer = array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength);
  const importStart = clock();
  const result = await runTemplatePackageImportPipeline({ format: "zip", buffer, sourceName });
  const importMs = clock() - importStart;
  if (!result.package || !result.validation?.valid) {
    throw new Error(`Fixture scene import failed: ${result.validation?.diagnostics?.map((item) => item.message).join("; ") || "no canonical package"}`);
  }
  const transformStart = clock();
  const transformed = createCanonicalSceneGraph(result.package, { basePackage: result.package });
  const transformMs = clock() - transformStart;
  const validationStart = clock();
  const validation = validateCanonicalSceneGraph(transformed.graph);
  const validationMs = clock() - validationStart;
  const equivalenceStart = clock();
  const equivalence = createSceneEquivalenceReport(result.package, {
    fixtureId: fixtureIdentity.id,
    fixtureZipSha256: fixtureIdentity.zipSha256,
    scene: transformed.graph,
  });
  const equivalenceMs = clock() - equivalenceStart;
  const appearanceStart = clock();
  const appearance = createAppearanceContractProjection(transformed.graph);
  const appearanceValidation = validateAppearanceContractProjection(appearance);
  const appearanceMs = clock() - appearanceStart;
  return {
    graph: transformed.graph,
    validation,
    equivalence,
    appearance,
    appearanceValidation,
    packageSummary: {
      packageId: result.package.packageId,
      schemaVersion: result.package.schemaVersion,
      rootNodeId: result.package.rootNodeId,
      nodeCount: Object.keys(result.package.nodes).length,
      assetCount: Object.keys(result.package.assets).length,
      editableFieldCount: result.package.editableFields.length,
    },
    registries: {
      propertyAuthority: PROPERTY_AUTHORITY_MATRIX,
      sourceToSceneMapping: SOURCE_TO_SCENE_MAPPING,
      migrationMap: SCENE_MIGRATION_MAP,
    },
    importDiagnostics: result.layeredDiagnostics ?? result.diagnostics,
    performance: {
      importMs,
      transformMs,
      validationMs,
      equivalenceMs,
      appearanceMs,
      inputPackageBytes: new TextEncoder().encode(JSON.stringify(result.package)).byteLength,
      serializedSceneBytes: new TextEncoder().encode(JSON.stringify(transformed.graph)).byteLength,
      serializedAppearanceBytes: new TextEncoder().encode(serializeAppearanceContractProjection(appearance)).byteLength,
      approximateHeapUsedBytes: typeof process !== "undefined" ? process.memoryUsage().heapUsed : null,
    },
  };
}

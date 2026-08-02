import { createNowHiringResponsiveReflowFixture } from "../../../src/template-package/fixtures/nowHiringResponsiveReflow";
import { createResolvedRenderTree } from "../src/resolved/createResolvedRenderTree";
import { createCanonicalSceneGraph } from "../src/scene/createCanonicalSceneGraph";
import { createSceneEquivalenceReport } from "../src/scene/createSceneEquivalenceReport";
import { SCENE_MIGRATION_MAP } from "../src/scene/migrationMap";
import { PROPERTY_AUTHORITY_MATRIX } from "../src/scene/propertyAuthority";
import { serializeCanonicalSceneGraph } from "../src/scene/serializeCanonicalSceneGraph";
import { SOURCE_TO_SCENE_MAPPING } from "../src/scene/sourceToSceneMapping";
import { validateCanonicalSceneGraph } from "../src/scene/validateCanonicalSceneGraph";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function unique(values: string[], label: string): void {
  assert(new Set(values).size === values.length, `${label} IDs must be unique`);
}

const packageValue = createNowHiringResponsiveReflowFixture();
const before = JSON.stringify(packageValue);
const first = createCanonicalSceneGraph(packageValue);
const second = createCanonicalSceneGraph(packageValue);
assert(JSON.stringify(packageValue) === before, "scene transformation must not mutate workingPackage");
assert(serializeCanonicalSceneGraph(first.graph) === serializeCanonicalSceneGraph(second.graph), "scene transformation must be deterministic and idempotent for the same input");
assert(first.graph.compatibility.runtimeUse === "disabled-observational", "scene graph must remain observational in Milestone 2");
assert(first.graph.nodeOrder[0] === packageValue.rootNodeId, "root must lead deterministic scene order");
assert(first.graph.nodeOrder.join(",") === createResolvedRenderTree(packageValue).nodeOrder.join(","), "scene and current resolved graph must preserve source order for the fixture");
assert(first.graph.nodes.headline.text?.characters.value === "WE'RE SEEKING AN OFFICER TO LEAD THE TEAM", "scene must preserve imported text characters");
assert(first.graph.nodes["product-image"].media?.scaleMode.value === "FILL", "scene must preserve image scale intent");
assert(first.graph.nodes["product-image"].media?.preserveAspectRatio === true, "FILL must preserve aspect ratio");
assert(first.graph.nodes.headline.text?.browserMeasurementRequired === true, "HUG text must declare browser measurement as a future input");
assert(first.graph.nodes.hero.layout.sizing.horizontal.mode.value === "FILL", "canonical sizing must be selected");
assert(first.graph.nodes.hero.layout.sizing.horizontal.mode.provenance.some((item) => item.sourcePath.includes("sizing.horizontal.mode")), "selected property authority must retain provenance");
assert(validateCanonicalSceneGraph(first.graph).valid, "valid fixture must produce a valid scene graph");
assert(JSON.stringify(JSON.parse(serializeCanonicalSceneGraph(first.graph))) === JSON.stringify(JSON.parse(serializeCanonicalSceneGraph(second.graph))), "scene JSON must round trip stably");

const invalid = structuredClone(first.graph);
delete invalid.nodes.headline;
assert(!validateCanonicalSceneGraph(invalid).valid, "missing child/field targets must fail validation");
const invalidBounds = structuredClone(first.graph);
invalidBounds.nodes.hero.geometry.relativeBounds.value.width = Number.NaN;
assert(!validateCanonicalSceneGraph(invalidBounds).valid, "non-finite geometry must fail validation");

const updated = structuredClone(packageValue);
const headline = updated.nodes.headline;
assert(headline.type === "TEXT", "headline fixture node must remain text");
if ("characters" in headline.text) headline.text.characters = "UPDATED USER VALUE";
const updatedScene = createCanonicalSceneGraph(updated, { basePackage: packageValue }).graph;
assert(updatedScene.nodes.headline.text?.characters.value === "UPDATED USER VALUE", "workingPackage user value must flow through the same transformer");
assert(updatedScene.nodes.headline.text?.characters.authority === "user-working-package", "basePackage context must identify user text override authority");
assert(updatedScene.nodes.headline.text?.characters.candidates.some((item) => item.sourcePath.startsWith("basePackage")), "user override provenance must retain the imported candidate");
assert(String(first.graph.nodes.headline.text?.characters.value) !== String(updatedScene.nodes.headline.text?.characters.value), "scene transformation must observe edits without mutating the prior graph");

const equivalence = createSceneEquivalenceReport(packageValue, { fixtureId: "source-level-now-hiring" });
assert(equivalence.pixelEquivalenceClaimed === false, "equivalence tooling must never claim pixel equivalence");
assert(equivalence.summary.mapped > 0, "equivalence report must record mapped properties");
assert(equivalence.summary["renderer-only"] > 0, "equivalence report must disclose browser-only state");
assert(equivalence.fixtureId === "source-level-now-hiring", "equivalence report must bind fixture identity");

unique(PROPERTY_AUTHORITY_MATRIX.map((item) => item.id), "property authority");
unique(SOURCE_TO_SCENE_MAPPING.map((item) => item.id), "source mapping");
unique(SCENE_MIGRATION_MAP.map((item) => item.id), "migration");
assert(PROPERTY_AUTHORITY_MATRIX.length >= 30, "property-authority matrix must cover the required families");
assert(SOURCE_TO_SCENE_MAPPING.some((item) => item.family === "masks"), "source map must cover masks");
assert(SCENE_MIGRATION_MAP.some((item) => item.property === "Export readiness"), "migration map must cover export readiness");

console.log("Canonical scene graph contract tests passed.");

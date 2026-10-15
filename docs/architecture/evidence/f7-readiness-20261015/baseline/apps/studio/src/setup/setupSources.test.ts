import fixture from "../../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import { normalizeTemplatePackageV1ToV2, type TemplatePackageV1 } from "@sleinity/template-core";
import { appendSetupSources, mutateSetupFamily, studioVariantDisplayLabels, type SetupSource } from "./setupSources";
import { projectStudioDiagnosticEvidence } from "./studioDiagnosticProjection";

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function source(id: string): SetupSource {
  const normalized = normalizeTemplatePackageV1ToV2(structuredClone(fixture) as unknown as TemplatePackageV1);
  assert(normalized.package, "Source must normalize");
  const packageValue = normalized.package;
  packageValue.packageId = `setup-${id}`;
  packageValue.name = id;
  packageValue.fontRequirements = [];
  packageValue.editableFields = [
    { id: "text:title", type: "text", label: "Title", binding: { kind: "text-characters", nodeId: "58:57" }, defaultValue: "Title", configuration: {} },
    { id: "textarea:body", type: "textarea", binding: { kind: "text-characters", nodeId: "58:60" }, defaultValue: "Body", configuration: {} },
  ];
  packageValue.editableFieldOrder = ["text:title", "textarea:body"];
  return { id, name: `${id}.json`, packageValue };
}

const first = source("first");
const projected = projectStudioDiagnosticEvidence([
  { id: "sdk-evidence", title: "Existing field issue", message: "Supplied by SDK", owner: "fields", area: "fields", severity: "blocked" },
], { query: "field", area: "all", severity: "all" });
assert(projected.findings.length === 1 && projected.findings[0].severity === "blocked" && projected.groups[0].findings[0].id === "sdk-evidence", "Studio diagnostics may group and filter existing evidence without changing its identity or severity.");
const single = appendSetupSources(null, [], [first], "Template");
assert(!("selectVariant" in single), "Single design remains a single V2 session");
const title = single.getSnapshot().basePackage!.editableFields[0];
assert(title.type === "text", "Title is a text field");
single.configure({ fields: [{ ...title, label: "Accepted title", configuration: { maxCharacters: 80 } }], editableFieldOrder: ["textarea:body", "text:title"] });
const acceptedSingle = single.getSnapshot();
const second = source("second");
const family = appendSetupSources(single, [first], [second], "Template");
assert("selectVariant" in family, "Second design creates a family");
assert(single.getSnapshot() === acceptedSingle, "Candidate creation must not mutate accepted session");
const initial = family.getSnapshot().family!;
assert(initial.editableFieldOrder.join() === "textarea:body,text:title", "Promotion preserves accepted field order");
assert(initial.fields.find((field) => field.id === "text:title")?.label === "Accepted title", "Promotion preserves accepted labels");
assert(initial.variants[0].id === first.id, "Promotion retains source identity");
family.configure({ variants: [{ id: second.id, editableFieldOrder: ["text:title", "textarea:body"], fieldOverrides: {
  "text:title": { type: "text", configuration: { maxCharacters: 40 } },
} }] });
const acceptedFamily = family.getSnapshot();
const third = source("third");
const extended = appendSetupSources(family, [first, second], [third], "Template");
assert("selectVariant" in extended, "Extended session remains family");
assert(JSON.stringify(extended.getSnapshot().family!.variants.slice(0, 2)) === JSON.stringify(acceptedFamily.family!.variants), "Adding a source retains accepted packages, overrides and order exactly");
assert(JSON.stringify(extended.getSnapshot().family!.fields) === JSON.stringify(acceptedFamily.family!.fields), "Adding matching fields does not regenerate common configuration");
const duplicateLabels = studioVariantDisplayLabels(
  [
    { ...extended.getSnapshot().family!.variants[0], label: "Campaign" },
    { ...extended.getSnapshot().family!.variants[1], label: "Campaign" },
    { ...extended.getSnapshot().family!.variants[2], label: "Campaign" },
  ],
  [
    { id: first.id, name: "campaign-square.json" },
    { id: second.id, name: "campaign-portrait.json" },
    { id: third.id, name: "campaign-portrait.json" },
  ],
);
assert(new Set(Object.values(duplicateLabels)).size === 3, "Duplicate canonical labels receive distinct presentation labels");
assert(Object.values(duplicateLabels).every((label) => label.startsWith("Campaign · ")), "Presentation disambiguation preserves the canonical label");
assert(extended.getSnapshot().family!.variants.every((variant) => variant.label !== duplicateLabels[variant.id]), "Presentation labels never rewrite canonical Family labels");
const conflicting = source("conflict");
assert(conflicting.packageValue.schemaVersion === "2.2", "Setup source uses the current package contract");
conflicting.packageValue.editableFields[0] = { id: "number:title", type: "number", binding: { kind: "text-characters", nodeId: "58:57" }, defaultValue: 1, configuration: {} };
conflicting.packageValue.editableFieldOrder[0] = "number:title";
const mixedType = appendSetupSources(family, [first, second], [conflicting], "Template");
const mixedTypeSnapshot = mixedType.getSnapshot();
assert("family" in mixedTypeSnapshot && mixedTypeSnapshot.family?.fields.some((field) => field.id === "number:title"), "Different field types may share one source name through type-qualified IDs.");
assert(family.getSnapshot() === acceptedFamily, "Candidate assembly leaves the accepted family unchanged");
const renamed = mutateSetupFamily(extended, [first, second, third], { type: "rename", variantId: second.id, label: "Second design" });
const renamedSnapshot = renamed.session.getSnapshot();
assert("family" in renamedSnapshot && renamedSnapshot.family, "Rename retains Family session");
assert(renamedSnapshot.family.variants.find((variant) => variant.id === second.id)?.label === "Second design", "Rename changes only the candidate label");
const extendedSnapshot = extended.getSnapshot();
assert("family" in extendedSnapshot && extendedSnapshot.family, "Extended session remains a Family");
assert(extendedSnapshot.family.variants.find((variant) => variant.id === second.id)?.label !== "Second design", "Rename does not mutate the accepted session");
const moved = mutateSetupFamily(renamed.session, renamed.sources, { type: "move", variantId: third.id, targetIndex: 0 });
const movedSnapshot = moved.session.getSnapshot();
assert("family" in movedSnapshot && movedSnapshot.family, "Reorder retains Family session");
assert(movedSnapshot.family.variants[0].id === third.id && moved.sources[0].id === third.id, "Reorder keeps source and Family order aligned");
const removed = mutateSetupFamily(moved.session, moved.sources, { type: "remove", variantId: second.id });
const removedSnapshot = removed.session.getSnapshot();
assert("family" in removedSnapshot && removedSnapshot.family, "Remove retains Family session");
assert(!removedSnapshot.family.variants.some((variant) => variant.id === second.id), "Remove drops only the selected variant");
assert(removedSnapshot.family.editableFieldOrder.join() === "textarea:body,text:title", "Family mutation preserves common field ordering");
assert(removedSnapshot.family.fields.find((field) => field.id === "text:title")?.label === "Accepted title", "Family mutation preserves accepted rules and labels");
const replacement = source("replacement");
const replaced = mutateSetupFamily(removed.session, removed.sources, { type: "replace", variantId: first.id, source: { ...replacement, id: first.id } });
const replacedSnapshot = replaced.session.getSnapshot();
assert("family" in replacedSnapshot && replacedSnapshot.family, "Replace retains Family session");
assert(replacedSnapshot.family.variants.some((variant) => variant.id === first.id && variant.packageValue.name === "replacement"), "Replace preserves variant identity while changing its source");
single.dispose(); family.dispose(); mixedType.dispose(); extended.dispose(); renamed.session.dispose(); moved.session.dispose(); removed.session.dispose(); replaced.session.dispose();

// Inspection is deliberately outside canonical content and persistence.
{
  const { createSetupInspection } = await import("./setupInspection");
  const { createSetupQualityReport } = await import("./setupQualityReport");
  const { validateTemplatePackageV2 } = await import("@sleinity/template-core");
  const a = source("inspection-a"); const b = source("inspection-b");
  const initial = appendSetupSources(null, [], [a], "Inspection");
  const session = appendSetupSources(initial, [a], [b], "Inspection");
  assert("selectVariant" in session, "Inspection fixture is a Family.");
  const content = JSON.stringify(session.getSnapshot().contentState);
  const intentional = session.getSnapshot().selectedVariantId!;
  const inspection = createSetupInspection(session);
  const token = inspection.inspect(b.id);
  assert(inspection.intentional() === intentional && session.getSnapshot().selectedVariantId === b.id, "Inspection does not replace intentional selection.");
  inspection.restore();
  assert(session.getSnapshot().selectedVariantId === intentional, "Completion, cancellation and navigation restore intentional selection.");
  inspection.inspect(b.id);
  inspection.select(a.id);
  assert(inspection.generation() !== token && inspection.intentional() === a.id, "Explicit selection supersedes older inspection work.");
  inspection.restore();
  assert(JSON.stringify(session.getSnapshot().contentState) === content, "Traversal preserves canonical values, image placement and content revision.");
  const snapshot = session.getSnapshot();
  const validation = validateTemplatePackageV2(snapshot.effectivePackage!);
  const before = JSON.stringify(snapshot);
  const projection = createSetupQualityReport(snapshot, validation)!;
  assert(projection.evidenceStates.fidelity === "Pending", "An unmounted renderer cannot produce Ready preview health from an empty issue list.");
  assert(JSON.stringify(session.getSnapshot()) === before, "Diagnostic projection cannot mutate SDK validity, readiness or content.");
  const saved = await session.save();
  assert(saved.selectedVariantId === a.id && JSON.stringify(session.getSnapshot().contentState) === content, "Save after inspection retains intentional selection and canonical content.");
  session.dispose(); initial.dispose();
}

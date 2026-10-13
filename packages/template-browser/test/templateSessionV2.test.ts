import fixture from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import {
  normalizeTemplatePackageV1ToV2,
  type EditableFieldDefinitionV2,
  type TemplatePackageV1,
  type TemplatePackageV2,
} from "@sleinity/template-core";
import {
  applyTemplateFieldFamilySelectionMutationV2,
  getTemplateFieldFamilyOptionAvailabilityV2,
  getTemplateFieldFamilyVariantSelectionV2,
  migrateTemplateFieldFamilyContentStateV2,
  resolveTemplateFieldFamilyEditorControlsV2,
  resolveTemplateFieldFamilySelectionV2,
  resolveTemplateFieldFamilyVariantV2,
  TEMPLATE_FIELD_FAMILY_SCHEMA_VERSION,
  type TemplateFieldFamilyV2,
} from "@sleinity/template-core/family";
import {
  createInMemoryTemplateSessionRepositoryV2Storage,
  InMemoryTemplateSessionRepositoryV2,
} from "../src/persistence/v2SessionRepositories";
import {
  normalizeSavedTemplateSessionV2Record,
  validateCurrentSavedTemplateFieldFamilyV2Record,
  validateCurrentSavedTemplateFieldFamilyV3Record,
  validateCurrentSavedTemplateSessionV2Record,
} from "../src/persistence/savedRecordValidationV2";
import {
  createTemplateFieldFamilyFieldV2,
  createTemplateFieldFamilySessionV2,
  type TemplateFieldFamilyImageControllerV3,
} from "../src/session/templateFieldFamilySessionV2";
import {
  createTemplateSessionV2,
  type BooleanFieldControllerV2,
  type ColorFieldControllerV2,
  type DateFieldControllerV2,
  type ImageFieldControllerV2,
  type NumberFieldControllerV2,
  type TextareaFieldControllerV2,
  type TextFieldControllerV2,
} from "../src/session/templateSessionV2";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function v2Package(): TemplatePackageV2 {
  const normalized = normalizeTemplatePackageV1ToV2(
    structuredClone(fixture as unknown as TemplatePackageV1),
  );
  assert(normalized.package, "Browser V2 fixture should normalize.");
  const packageValue = normalized.package;
  packageValue.fontRequirements = [];
  packageValue.nodes[packageValue.rootNodeId].appearance.fills.push({
    type: "SOLID",
    color: { r: 0, g: 0, b: 0, a: 1 },
    opacity: 1,
    visible: true,
    blendMode: "NORMAL",
  });
  packageValue.editableFields = [
    {
      id: "text:title",
      type: "text",
      label: "Headline",
      controlRole: "campaign-title",
      binding: { kind: "text-characters", nodeId: "58:57" },
      defaultValue: "Hi",
      configuration: {
        maxCharacters: 20,
        warningAtCharacters: 5,
        choices: { mode: "suggested", options: [{ id: "primary", value: "Hi" }] },
      },
    },
    {
      id: "textarea:body",
      type: "textarea",
      binding: { kind: "text-characters", nodeId: "58:60" },
      defaultValue: "Body",
      configuration: { maxCharacters: 100, maxLines: 2, warningAtLines: 2 },
    },
    {
      id: "image:hero",
      type: "image",
      binding: { kind: "image-content", nodeId: "58:61" },
      defaultValue: {
        assetId: packageValue.nodes["58:61"].image?.assetId ?? null,
        placement: { mode: "imported" },
      },
      configuration: { replacementPlacement: "fill" },
    },
    {
      id: "number:amount",
      type: "number",
      binding: { kind: "text-characters", nodeId: "58:76" },
      defaultValue: 10,
      configuration: { min: 0, max: 100, step: 1 },
    },
    {
      id: "date:date",
      type: "date",
      binding: { kind: "text-characters", nodeId: "58:79" },
      defaultValue: "2026-11-04",
      configuration: {},
    },
    {
      id: "boolean:visible",
      type: "boolean",
      binding: { kind: "structural-visibility", nodeId: "58:39" },
      defaultValue: true,
      configuration: {},
    },
    {
      id: "color:color",
      type: "color",
      binding: { kind: "solid-fill-color", nodeId: packageValue.rootNodeId, sourceIndex: 1 },
      defaultValue: "#000000",
      configuration: {},
    },
  ];
  packageValue.editableFieldOrder = ["text:title", "textarea:body", "image:hero", "number:amount", "date:date", "boolean:visible", "color:color"];
  return packageValue;
}

// Boolean container controls stay available while descendant content controls
// follow structural participation without losing canonical content.
{
  const current = createTemplateSessionV2();
  const packageValue = v2Package();
  const visibilityDefinition = packageValue.editableFields.find((field) => field.id === "boolean:visible");
  assert(visibilityDefinition?.type === "boolean", "Boolean controller fixture is required.");
  visibilityDefinition.binding.additionalNodeIds = ["58:58"];
  current.load(packageValue);
  const title = current.getFieldControllers().find((field) => field.id === "text:title") as TextFieldControllerV2;
  assert(title.setValue("Keep me").accepted, "Nested content should be editable before its Boolean container is hidden.");
  const visibility = current.getFieldControllers().find((field) => field.id === "boolean:visible") as BooleanFieldControllerV2;
  assert(visibility.setValue(false).accepted, "The Boolean container should accept structural exclusion.");
  assert(
    current.getFieldControllers().some((field) => field.id === "boolean:visible") &&
      !current.getFieldControllers().some((field) => field.id === "text:title") &&
      !current.getFieldControllers().some((field) => field.id === "textarea:body") &&
      current.getFieldControllers().some((field) => field.id === "image:hero") &&
      current.getFieldControllers().some((field) => field.id === "number:amount") &&
      current.getFieldControllers().some((field) => field.id === "date:date") &&
      current.getFieldControllers().some((field) => field.id === "color:color") &&
      current.getSnapshot().fields.some((field) => field.descriptor.id === "text:title") &&
      current.getSnapshot().contentState?.values["text:title"]?.value === "Keep me",
    "A multi-target hidden subtree should omit only descendant editor controllers, retain sibling controls, and preserve complete field state and canonical content.",
  );
  const hiddenVisibility = current.getFieldControllers().find((field) => field.id === "boolean:visible") as BooleanFieldControllerV2;
  assert(hiddenVisibility.setValue(true).accepted, "The controlling Boolean must remain available to restore its subtree.");
  assert(
    current.getFieldControllers().find((field) => field.id === "text:title")?.value === "Keep me",
    "Restoring a Boolean container should return descendant controls in their retained state.",
  );
  current.dispose();
}

// Milestone 7: public authoring transactions retain canonical content/assets,
// reject malformed configuration atomically, and invalidate configuration ABA.
{
  const repository = new InMemoryTemplateSessionRepositoryV2(createInMemoryTemplateSessionRepositoryV2Storage());
  const author = createTemplateSessionV2({ repository });
  author.load(v2Package());
  const title = author.getFieldControllers().find((field) => field.type === "text") as TextFieldControllerV2;
  title.selectChoice("primary");
  const before = author.getSnapshot();
  const field = before.basePackage!.editableFields.find((entry) => entry.id === "text:title")!;
  assert(field.type === "text", "Authoring fixture text field is required.");
  author.configure({ fields: [{ ...field, label: undefined, controlRole: "unknown-host-role", configuration: { maxCharacters: 30, choices: { mode: "suggested", options: [{ id: "primary", label: "Renamed", value: "New" }] } } }], editableFieldOrder: [...before.basePackage!.editableFieldOrder].reverse() });
  assert(author.getSnapshot().contentState!.values["text:title"].value === "New" && author.getSnapshot().contentState!.values["text:title"].selectedChoiceId === "primary", "Selected option identity must reconcile to its new canonical value, never renderer output.");
  assert(author.getSnapshot().contentState!.revision === before.contentState!.revision + 1, "Configuration reconciliation is one monotonic content transaction.");
  assert(author.getFieldControllers().find((entry) => entry.id === "text:title")!.label === "title", "Cleared label must use the source field name.");
  assert(author.getFieldControllers()[0].id === "color:color", "Atomic editor ordering must drive host enumeration.");
  const accepted = author.getSnapshot();
  let rejected = false;
  try { author.configure({ editableFieldOrder: ["text:title", "text:title"] }); } catch { rejected = true; }
  assert(rejected && author.getSnapshot() === accepted, "Malformed order must reject without altering session state.");
  rejected = false;
  try { author.configure({ fields: [{ ...field, configuration: { choices: { mode: "restricted", options: [{ id: "same", value: "A" }, { id: "same", value: "B" }] } } }] }); } catch { rejected = true; }
  assert(rejected && author.getSnapshot() === accepted, "Duplicate option IDs must reject atomically through Core schema validation.");
  author.configure({ fields: [{ ...field, configuration: { maxCharacters: 2 } }] });
  const corrective = author.getFieldControllers().find((entry) => entry.id === "text:title") as TextFieldControllerV2;
  assert(corrective.setValue("OK").accepted, "Configuration-invalid current content must remain correctable through the ordinary reducer.");
  author.configure({ fields: [{ ...field, controlRole: "unknown-host-role", configuration: { maxCharacters: 30 } }] });
  const hero = author.getFieldControllers().find((entry) => entry.type === "image") as ImageFieldControllerV2;
  assert((await hero.replaceImage({ dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", width: 1, height: 1 })).accepted, "Authoring test image should replace.");
  const assets = JSON.stringify(author.getSnapshot().sessionAssets);
  const generationA = author.getSnapshot();
  author.configure({ editableFieldOrder: [...before.basePackage!.editableFieldOrder] });
  author.configure({ editableFieldOrder: [...generationA.basePackage!.editableFieldOrder] });
  assert(JSON.stringify(author.getSnapshot().sessionAssets) === assets, "Configuration must not revoke or lose replacement assets.");
  const materializedBeforeLease = author.getSnapshot().materialization;
  author.beginRuntimeEvidencePublication();
  assert(author.getSnapshot().readiness.renderer === "pending" && author.getSnapshot().materialization === materializedBeforeLease, "A new mounted publisher immediately publishes pending readiness without rematerializing.");
  assert(!author.publishRuntimeReadiness({ contentRevision: generationA.contentState!.revision, materializationRevision: generationA.materialization!.materializationRevision!, settlementRevision: "old", fontRevision: "old", publicationGeneration: 1, fonts: "ready", renderer: "ready" }), "Configuration A/B/A rejects delayed first-A evidence.");
  const saved = await author.save();
  const legacySaved = structuredClone(saved) as any;
  const legacyIds = Object.fromEntries(legacySaved.basePackage.editableFields.map((entry: any) => [entry.id, entry.id.replace(/^[^:]+:/u, "")]));
  legacySaved.basePackage.schemaVersion = "2.0";
  legacySaved.basePackage.editableFields.forEach((entry: any) => { entry.id = legacyIds[entry.id]; });
  legacySaved.basePackage.editableFieldOrder = legacySaved.basePackage.editableFieldOrder.map((id: string) => legacyIds[id]);
  legacySaved.contentState.packageSchemaVersion = "2.0";
  legacySaved.contentState.values = Object.fromEntries(Object.entries(legacySaved.contentState.values).map(([id, value]) => [legacyIds[id], value]));
  let legacyRejected = false;
  try { normalizeSavedTemplateSessionV2Record(legacySaved); } catch { legacyRejected = true; }
  assert(legacyRejected, "Saved schema 2.0 sessions should require reimport instead of silent migration.");
  const restored = createTemplateSessionV2({ repository });
  await restored.loadSaved(saved.id);
  assert(JSON.stringify(restored.getSnapshot().basePackage!.editableFields) === JSON.stringify(author.getSnapshot().basePackage!.editableFields), "All authored rules/labels/roles/choices must round-trip.");
  const reimport = restored.planReimport(v2Package());
  restored.applyReimport(reimport);
  assert(restored.getFieldControllers().find((entry) => entry.id === "text:title")!.controlRole === "unknown-host-role", "Review-first reimport preserves an opaque role.");
  author.dispose(); restored.dispose();
}

const storage = createInMemoryTemplateSessionRepositoryV2Storage();
const repository = new InMemoryTemplateSessionRepositoryV2(storage);
const revoked: string[] = [];
let urlId = 0;
const objectUrls = {
  create: () => `blob:test-${++urlId}`,
  revoke: (url: string) => revoked.push(url),
};
const normalizationSession = createTemplateSessionV2({ repository, objectUrls });
normalizationSession.load(structuredClone(fixture as unknown as TemplatePackageV1));
assert(normalizationSession.getSnapshot().basePackage?.schemaVersion === "2.2", "The Browser source boundary should normalize V1 input once into the current V2 session.");
normalizationSession.dispose();
const session = createTemplateSessionV2({ repository, objectUrls });
session.load(v2Package());
let fields = session.getFieldControllers();
assert(fields.map((field) => field.id).join("|") === "text:title|textarea:body|image:hero|number:amount|date:date|boolean:visible|color:color", "Browser controllers should follow canonical field order.");
assert(fields[0].label === "Headline" && fields[1].label === "body" && fields[0].controlRole === "campaign-title", "Controllers should expose label fallback and opaque controlRole.");
assert(!("binding" in fields[0].descriptor), "Ordinary host descriptors must omit renderer bindings.");

const text = fields.find((field): field is TextFieldControllerV2 => field.type === "text")!;
const warning = text.setValue("Summer");
assert(warning.accepted && warning.warnings.length === 1, "Text warnings should remain non-blocking in Browser.");
const beforeRejected = session.getSnapshot().contentState!.revision;
assert(!text.setValue("This value is far too long").accepted && session.getSnapshot().contentState!.revision === beforeRejected, "Rejected deterministic edits must not advance canonical state.");
assert(text.reset().accepted && text.setValue("").accepted, "Text reset should restore its imported default and remain distinct from explicit empty content.");

fields = session.getFieldControllers();
const textarea = fields.find((field): field is TextareaFieldControllerV2 => field.type === "textarea")!;
const pending = textarea.setValue("One paragraph that may wrap");
assert(pending.accepted && pending.renderValidation.state === "pending" && session.getSnapshot().readiness.renderValidation === "pending", "maxLines should commit immediately and withhold export while evidence is pending.");
assert(session.publishRuntimeReadiness({
  contentRevision: session.getSnapshot().contentState!.revision,
  materializationRevision: session.getSnapshot().materialization!.materializationRevision!,
  settlementRevision: "settled-1",
  fontRevision: "font-1",
  publicationGeneration: 1,
  fonts: "ready",
  renderer: "ready",
}), "Current renderer/font readiness identity should publish.");
const staleEvidenceAccepted = session.publishFieldLayoutEvidence({
  schemaVersion: "field-layout-evidence-v1",
  fieldId: "textarea:body",
  packageIdentity: session.getSnapshot().basePackage!.packageId,
  contentRevision: pending.contentRevision - 1,
  materializationRevision: session.getSnapshot().materialization!.materializationRevision!,
  settlementRevision: "settled-1",
  fontRevision: "font-1",
  publicationGeneration: 1,
  participation: "active",
  measuredVisualLines: 1,
  reliability: "reliable",
});
assert(!staleEvidenceAccepted, "Stale layout evidence must never publish.");
assert(session.publishFieldLayoutEvidence({
  schemaVersion: "field-layout-evidence-v1",
  fieldId: "textarea:body",
  packageIdentity: session.getSnapshot().basePackage!.packageId,
  contentRevision: session.getSnapshot().contentState!.revision,
  materializationRevision: session.getSnapshot().materialization!.materializationRevision!,
  settlementRevision: "settled-1",
  fontRevision: "font-1",
  publicationGeneration: 1,
  participation: "active",
  measuredVisualLines: 3,
  reliability: "reliable",
}), "Current reliable line evidence should publish.");
assert(session.getSnapshot().readiness.renderValidation === "blocked", "Over-limit visual lines must block export without rejecting content.");
assert(session.publishRuntimeReadiness({
  contentRevision: session.getSnapshot().contentState!.revision,
  materializationRevision: session.getSnapshot().materialization!.materializationRevision!,
  settlementRevision: "settled-hidden",
  fontRevision: "font-1",
  publicationGeneration: 2,
  fonts: "ready",
  renderer: "ready",
}), "A structural visibility revision should establish new current runtime identity.");
assert(session.publishFieldLayoutEvidence({
  schemaVersion: "field-layout-evidence-v1",
  fieldId: "textarea:body",
  packageIdentity: session.getSnapshot().basePackage!.packageId,
  contentRevision: session.getSnapshot().contentState!.revision,
  materializationRevision: session.getSnapshot().materialization!.materializationRevision!,
  settlementRevision: "settled-hidden",
  fontRevision: "font-1",
  publicationGeneration: 2,
  participation: "structurally-excluded",
  reliability: "reliable",
}), "A structurally excluded Textarea should publish inactive evidence without a fabricated line count.");
assert(
  session.getSnapshot().fields.find((field) => field.descriptor.id === "textarea:body")?.renderValidation.state === "inactive" &&
    session.getSnapshot().readiness.renderValidation === "ready",
  "Inactive line rules should not block export readiness while canonical/configuration validation remains intact.",
);
assert(textarea.reset().accepted && textarea.setValue("Persisted body").accepted, "Textarea reset should use the same canonical mutation lifecycle.");

fields = session.getFieldControllers();
const number = fields.find((field): field is NumberFieldControllerV2 => field.type === "number")!;
const date = fields.find((field): field is DateFieldControllerV2 => field.type === "date")!;
const boolean = fields.find((field): field is BooleanFieldControllerV2 => field.type === "boolean")!;
const color = fields.find((field): field is ColorFieldControllerV2 => field.type === "color")!;
assert(number.setValue(1).accepted && number.reset().accepted && number.setValue(0).accepted, "Number reset should preserve explicit zero as a later override.");
assert(date.setValue("2027-01-01").accepted && date.reset().accepted && date.setValue("2028-02-29").accepted, "Date reset should return to the imported calendar default.");
assert(boolean.setValue(true).accepted && boolean.reset().accepted && boolean.setValue(false).accepted, "Boolean reset should preserve explicit false as a later override.");
assert(color.setValue("#fff").accepted && color.reset().accepted && color.setValue("#F64").accepted, "Color reset should restore imported RGB before a new canonical value.");

assert(boolean.setValue(true).accepted, "The first true state should commit for ABA readiness evidence.");
const firstTrueIdentity = {
  contentRevision: session.getSnapshot().contentState!.revision,
  materializationRevision: session.getSnapshot().materialization!.materializationRevision!,
};
assert(boolean.setValue(false).accepted && boolean.setValue(true).accepted, "A rapid true/false/true sequence should remain editable.");
const laterTrueIdentity = {
  contentRevision: session.getSnapshot().contentState!.revision,
  materializationRevision: session.getSnapshot().materialization!.materializationRevision!,
};
assert(
  firstTrueIdentity.contentRevision < laterTrueIdentity.contentRevision &&
    firstTrueIdentity.materializationRevision !== laterTrueIdentity.materializationRevision &&
    !session.publishRuntimeReadiness({
      ...firstTrueIdentity,
      settlementRevision: "first-true-delayed",
      fontRevision: "font-aba",
      publicationGeneration: 2,
      fonts: "ready",
      renderer: "ready",
    }),
  "Delayed settlement/readiness from the first true state must not publish into a later semantically equal true state.",
);
assert(session.publishRuntimeReadiness({
  ...laterTrueIdentity,
  settlementRevision: "later-true-current",
  fontRevision: "font-aba",
  publicationGeneration: 4,
  fonts: "ready",
  renderer: "ready",
}), "The later true state should accept readiness only for its current monotonic content/materialization identity.");
assert(!session.publishRuntimeReadiness({
  ...laterTrueIdentity,
  settlementRevision: "first-true-delayed",
  fontRevision: "font-aba",
  publicationGeneration: 3,
  fonts: "ready",
  renderer: "ready",
}), "A delayed renderer publication must not regress the current publication generation after a true/false/true ABA transition.");
const currentAbaSnapshot = session.getSnapshot();
assert(!session.publishFieldLayoutEvidence({
  schemaVersion: "field-layout-evidence-v1",
  fieldId: "textarea:body",
  packageIdentity: currentAbaSnapshot.basePackage!.packageId,
  contentRevision: currentAbaSnapshot.contentState!.revision,
  materializationRevision: currentAbaSnapshot.materialization!.materializationRevision!,
  settlementRevision: "later-true-current",
  fontRevision: "font-aba",
  publicationGeneration: 3,
  participation: "active",
  measuredVisualLines: 1,
  reliability: "reliable",
}), "A delayed line observation from an older renderer generation must be rejected even when semantic identities match.");
assert(session.publishFieldLayoutEvidence({
  schemaVersion: "field-layout-evidence-v1",
  fieldId: "textarea:body",
  packageIdentity: currentAbaSnapshot.basePackage!.packageId,
  contentRevision: currentAbaSnapshot.contentState!.revision,
  materializationRevision: currentAbaSnapshot.materialization!.materializationRevision!,
  settlementRevision: "later-true-current",
  fontRevision: "font-aba",
  publicationGeneration: 4,
  participation: "active",
  measuredVisualLines: 1,
  reliability: "reliable",
}), "The current renderer generation should publish line evidence after the ABA transition.");
assert(boolean.setValue(false).accepted, "The persisted Boolean fixture should finish in its explicit false state.");

fields = session.getFieldControllers();
let image = fields.find((field): field is ImageFieldControllerV2 => field.type === "image")!;
const imageResult = await image.replaceImage({
  dataUrl: "data:image/png;base64,iVBORw0KGgo=",
  width: 2,
  height: 3,
});
assert(imageResult.accepted && session.getSnapshot().workingPackage?.nodes["58:61"].image?.scaleMode === "FILL", "Image replacement should apply the configured Fill policy through canonical placement and one-way materialization.");
assert(!image.setPlacement({ mode: "fit" }).accepted, "Fill policy must reject a later Fit mutation.");
const imageDescriptor = session.getSnapshot().basePackage!.editableFields.find((field) => field.id === "image:hero")!;
assert(imageDescriptor.type === "image", "Image policy test requires the Image descriptor.");
session.configure({ fields: [{ ...imageDescriptor, configuration: { replacementPlacement: "crop" } }] });
image = session.getFieldControllers().find((field): field is ImageFieldControllerV2 => field.type === "image")!;
const singleCropPlacement = {
  mode: "crop" as const,
  crop: {
    schemaVersion: "normalized-image-crop-v1" as const,
    coordinateSpace: "normalized-slot-to-normalized-source" as const,
    transform: [[0.7, 0, 0.15], [0, 0.7, 0.15]] as [[number, number, number], [number, number, number]],
  },
};
assert(image.setPlacement(singleCropPlacement).accepted, "A host-provided canonical Crop should use the ordinary Image controller mutation path.");
assert(
  session.getSnapshot().resolvedTree?.nodes["58:61"].image?.activePlacementState === "editor-crop" &&
    session.getSnapshot().resolvedTree?.nodes["58:61"].image?.scaleMode === "CROP" &&
    session.getSnapshot().resolvedTree?.nodes["58:61"].image?.cropMode === "editorCropTransform",
  "Canonical Crop should feed the existing affine image renderer rather than a replacement Fill fallback.",
);

const blobRace = image.replaceImage({ blob: new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }) });
session.getFieldControllers().find((field) => field.id === "image:hero")!.reset();
assert((await blobRace).stale, "A replacement completing after Reset must be rejected as stale.");
assert(session.getSnapshot().fields.find((field) => field.descriptor.id === "image:hero")?.valueSource === "imported-default", "Image Reset should restore imported authority.");
assert((await session.getFieldControllers().find((field): field is ImageFieldControllerV2 => field.type === "image")!.replaceImage({
  dataUrl: "data:image/png;base64,iVBORw0KGgo=",
  width: 4,
  height: 5,
  placement: { mode: "fill" },
})).accepted, "Image replacement should remain persistable after a stale read is rejected.");

const saved = await session.save({ name: "Seven typed fields" });
const savedRevision = session.getSnapshot().contentState!.revision;
session.dispose();
const reloaded = createTemplateSessionV2({ repository, objectUrls });
await reloaded.loadSaved(saved.id);
assert(reloaded.getSnapshot().contentState?.revision === savedRevision, "Offline reload should restore the canonical content revision.");
assert(reloaded.getFieldControllers().find((field) => field.type === "number")?.value === 0, "Persistence should restore explicit numeric zero.");
assert(reloaded.getFieldControllers().find((field) => field.type === "boolean")?.value === false, "Persistence should restore explicit Boolean false.");
assert(reloaded.getSnapshot().fields.find((field) => field.descriptor.type === "text")?.value === "", "Persistence should restore explicit empty Text even while its ancestor Boolean hides the editor control.");
const reloadedImage = reloaded.getFieldControllers().find((field): field is ImageFieldControllerV2 => field.type === "image")!;
assert(reloadedImage.value && "assetId" in reloadedImage.value && reloaded.getSnapshot().workingPackage?.assets[reloadedImage.value.assetId], "Offline reload should restore canonical Image references and browser asset metadata.");
assert(!("workingPackage" in saved), "Saved V2 session records must not persist derived working packages.");
let malformedRejected = false;
try {
  validateCurrentSavedTemplateSessionV2Record({
    ...structuredClone(saved),
    contentState: { ...structuredClone(saved.contentState), values: { unknown: { value: "bad" } } },
  });
} catch {
  malformedRejected = true;
}
assert(malformedRejected, "Malformed persisted canonical content must fail with an explicit load-boundary error.");
let incompatibleVersionRejected = false;
try {
  validateCurrentSavedTemplateSessionV2Record({ ...structuredClone(saved), schemaVersion: "saved-template-session-v2" });
} catch {
  incompatibleVersionRejected = true;
}
assert(incompatibleVersionRejected, "Persisted session versions must never be silently reinterpreted.");

const incompatibleSaved = {
  ...structuredClone(saved),
  id: "legacy-image-policy",
  name: "Legacy image policy",
  schemaVersion: "saved-template-session-v2",
};
storage.templateSessions.set(incompatibleSaved.id, incompatibleSaved as never);
assert(
  (await repository.listTemplateSessionsV2()).some((record) => record.id === saved.id) &&
    !(await repository.listTemplateSessionsV2()).some((record) => record.id === incompatibleSaved.id),
  "An incompatible saved record must not prevent compatible Library records from loading.",
);
assert(
  (await repository.listIncompatibleTemplateSessionsV2()).some((record) =>
    record.id === incompatibleSaved.id && record.reason === "reimport-required"),
  "Older saved image-policy work must remain discoverable as Reimport required.",
);
await repository.deleteIncompatibleTemplateSessionV2(incompatibleSaved.id);
assert(
  !(await repository.listIncompatibleTemplateSessionsV2()).some((record) => record.id === incompatibleSaved.id),
  "Deleting incompatible saved work must remove its lightweight Library record.",
);

const reimported = v2Package();
reimported.packageId = "field-rules-v2:reimported";
const remappedTitleNode = structuredClone(reimported.nodes["58:57"]);
remappedTitleNode.id = "reimport:title-node";
remappedTitleNode.name = "Reimported title target";
reimported.nodes[remappedTitleNode.id] = remappedTitleNode;
if (remappedTitleNode.parentId) {
  reimported.nodes[remappedTitleNode.parentId].children.push(remappedTitleNode.id);
}
const title = reimported.editableFields.find((field) => field.id === "text:title")!;
title.binding = { kind: "text-characters", nodeId: remappedTitleNode.id };
reimported.editableFields = reimported.editableFields.filter((field) => field.id !== "color:color");
reimported.editableFieldOrder = reimported.editableFieldOrder.filter((fieldId) => fieldId !== "color:color");
const added: EditableFieldDefinitionV2 = {
  id: "text:newCopy",
  type: "text",
  binding: { kind: "text-characters", nodeId: "reimport:new-copy-node" },
  defaultValue: "New",
  configuration: {},
};
const newCopyNode = structuredClone(reimported.nodes["58:57"]);
newCopyNode.id = "reimport:new-copy-node";
newCopyNode.name = "New copy target";
reimported.nodes[newCopyNode.id] = newCopyNode;
if (newCopyNode.parentId) reimported.nodes[newCopyNode.parentId].children.push(newCopyNode.id);
reimported.editableFields.push(added);
reimported.editableFieldOrder.push("text:newCopy");
const plan = reloaded.planReimport(reimported);
assert(plan.canApply && plan.fieldChanges.find((item) => item.fieldId === "text:title")?.targetChanged && plan.removedFieldIds.includes("color:color") && plan.addedFieldIds.includes("text:newCopy"), "V2 reimport should report remaps, removals, and additions by stable ID.");
reloaded.applyReimport(plan, { removedFieldDisposition: "archive" });
assert(reloaded.getSnapshot().basePackage?.editableFields.find((field) => field.id === "text:title")?.binding.nodeId === remappedTitleNode.id, "Reviewed reimport should adopt new target evidence.");
assert(reloaded.getSnapshot().fields.at(-1)?.descriptor.id === "text:newCopy", "New fields should append in portable order and use imported defaults even while their ancestor is hidden.");
assert((reloaded.getFieldControllers().find((field) => field.id === "boolean:visible") as BooleanFieldControllerV2).setValue(true).accepted, "Reimported descendant controls should return when their Boolean ancestor is enabled.");
const retainedTitle = reloaded.getFieldControllers().find((field): field is TextFieldControllerV2 => field.id === "text:title")!;
assert(retainedTitle.value === "" && retainedTitle.controlRole === "campaign-title" && retainedTitle.configuration.choices?.options[0].id === "primary", "Reimport should preserve retained canonical content, choices, configuration, and controlRole.");

const incompatible = structuredClone(reimported);
const incompatibleTitle = incompatible.editableFields.find((field) => field.id === "text:title")!;
Object.assign(incompatibleTitle, {
  type: "number",
  defaultValue: 1,
  configuration: {},
});
assert(!reloaded.planReimport(incompatible).canApply, "Semantic type changes must block reimport without coercion.");

const familyPackageA = v2Package();
familyPackageA.packageId = "family-variant-a";
const familyPackageB = structuredClone(familyPackageA);
familyPackageB.packageId = "family-variant-b";
const familyBTitleNode = structuredClone(familyPackageB.nodes["58:57"]);
familyBTitleNode.id = "family-b:title-node";
familyPackageB.nodes[familyBTitleNode.id] = familyBTitleNode;
if (familyBTitleNode.parentId) familyPackageB.nodes[familyBTitleNode.parentId].children.push(familyBTitleNode.id);
familyPackageB.editableFields.find((field) => field.id === "text:title")!.binding = {
  kind: "text-characters",
  nodeId: familyBTitleNode.id,
};
familyPackageB.editableFields.find((field) => field.id === "boolean:visible")!.binding = {
  kind: "structural-visibility",
  nodeId: familyBTitleNode.id,
};
const family: TemplateFieldFamilyV2 = {
  schemaVersion: TEMPLATE_FIELD_FAMILY_SCHEMA_VERSION,
  id: "family:v2",
  title: "V2 Family",
  fields: familyPackageA.editableFields.map(createTemplateFieldFamilyFieldV2),
  editableFieldOrder: familyPackageA.editableFieldOrder,
  variants: [
    { id: "a", packageValue: familyPackageA },
    {
      id: "b",
      packageValue: familyPackageB,
      fieldOverrides: {
        "text:title": {
          type: "text",
          configuration: {
            maxCharacters: 3,
            warningAtCharacters: null,
            choices: {
              mode: "suggested",
              options: [{ id: "variant", value: "Alt" }],
            },
          },
        },
        "image:hero": {
          type: "image",
          configuration: {
            replacementPlacement: "crop",
          },
        },
        "textarea:body": {
          type: "textarea",
          configuration: {
            maxLines: 1,
            warningAtLines: 1,
          },
        },
      },
    },
  ],
};
const commonFamilyImage = family.fields.find((field) => field.id === "image:hero");
assert(commonFamilyImage?.type === "image", "Family Crop test requires the shared Image field.");
commonFamilyImage.configuration = { replacementPlacement: "crop" };
const resolvedB = resolveTemplateFieldFamilyVariantV2(family, "b");
const resolvedTitle = resolvedB.packageValue?.editableFields.find((field) => field.id === "text:title");
assert(resolvedTitle?.type === "text" && resolvedTitle.configuration.choices?.options.length === 1 && resolvedTitle.configuration.choices.options[0].id === "variant", `Family collections should replace atomically rather than merge by option ID: ${JSON.stringify(resolvedB.issues)}`);
assert(resolvedB.configurationAuthority["text:title"]?.configuration.maxCharacters === "variant" && resolvedB.configurationAuthority["text:title"]?.configuration.choices === "variant", "Effective family configuration should expose common/variant/cleared property authority without leaking internal naming.");
assert(resolvedB.configurationAuthority["number:amount"]?.configuration.min === "common", "Inherited family configuration should report common property authority.");
const resolvedHero = resolvedB.packageValue?.editableFields.find((field) => field.id === "image:hero");
assert(resolvedHero?.type === "image" && resolvedHero.configuration.replacementPlacement === "crop", "Family Image replacement policy should override atomically.");
const invalidCommonOrder = structuredClone(family);
invalidCommonOrder.editableFieldOrder = invalidCommonOrder.editableFieldOrder.slice(1);
assert(!resolveTemplateFieldFamilyVariantV2(invalidCommonOrder, "a").valid, "Common family order must be an exact permutation of logical field IDs.");
const familySession = createTemplateFieldFamilySessionV2({ repository, objectUrls });
{
  const author = createTemplateFieldFamilySessionV2({ repository, objectUrls });
  author.load(family);
  const common = family.fields.find((field) => field.id === "text:title")!;
  assert(common.type === "text", "Family authoring needs Text.");
  author.configure({ fields: [{ ...common, configuration: { choices: { mode: "suggested", options: [{ id: "a", value: "A" }, { id: "b", value: "B" }, { id: "c", value: "C" }] } } }] });
  author.configure({ variants: [{ id: "b", fieldOverrides: { "text:title": { type: "text", configuration: { choices: { mode: "restricted", options: [{ id: "a", value: "Hi" }, { id: "d", value: "D" }] } } } } }] });
  author.selectVariant("b");
  const selected = author.getFieldControllers().find((field) => field.id === "text:title") as TextFieldControllerV2;
  assert(selected.configuration.choices!.options.map((option) => option.id).join() === "a,d", "Family choice overrides must replace atomically, never merge stable IDs.");
  assert(!selected.setValue("B").accepted && selected.selectChoice("d").accepted, "Restricted effective options are enforced by ordinary controllers.");
  const saved = await author.save();
  const restored = createTemplateFieldFamilySessionV2({ repository, objectUrls });
  await restored.loadSaved(saved.id);
  assert(JSON.stringify(restored.getSnapshot().family) === JSON.stringify(saved.family), "Family common/variant configuration must persist unchanged.");
  restored.configure({ variants: [{ id: "b", fieldOverrides: { "text:title": { type: "text", configuration: { choices: null } } } }] });
  assert(!(restored.getFieldControllers().find((field) => field.id === "text:title") as TextFieldControllerV2).configuration.choices, "Explicit null clears common choices.");
  restored.configure({ variants: [{ id: "b", fieldOverrides: {} }] });
  assert((restored.getFieldControllers().find((field) => field.id === "text:title") as TextFieldControllerV2).configuration.choices!.options.length === 3, "Removing the override restores common choice configuration.");
  author.dispose(); restored.dispose();
}
familySession.load(family);
{
  const groupedFamily: TemplateFieldFamilyV2 = {
    ...structuredClone(family),
    variantGroups: [{
      id: "format",
      title: "Format",
      options: [
        { id: "post", title: "Post" },
        { id: "banner", title: "Banner" },
      ],
    }],
    editorControlOrder: [
      { kind: "field", fieldId: "text:title" },
      { kind: "selection-property", groupId: "format" },
      ...family.editableFieldOrder.slice(1).map((fieldId) => ({ kind: "field" as const, fieldId })),
    ],
    variants: family.variants.map((variant) => ({
      ...structuredClone(variant),
      groupAssignments: { format: variant.id === "a" ? "post" : "banner" },
    })),
  };
  const groupedSession = createTemplateFieldFamilySessionV2({ repository, objectUrls });
  groupedSession.load(groupedFamily);
  const before = groupedSession.getSnapshot();
  const beforeContent = JSON.stringify(before.contentState);
  const beforeRevision = before.contentState?.revision;
  groupedSession.selectOption("format", "banner");
  const after = groupedSession.getSnapshot();
  assert(after.selectedVariantId === "b", "Selecting a complete option tuple should resolve an existing variant.");
  assert(JSON.stringify(after.contentState) === beforeContent && after.contentState?.revision === beforeRevision, "Selection metadata must never mutate canonical Family content or its revision.");
  assert(getTemplateFieldFamilyVariantSelectionV2(groupedFamily, "b").groupSelections.format === "banner", "Active selections should derive from the selected variant assignment.");
  assert(resolveTemplateFieldFamilySelectionV2(groupedFamily, { groupSelections: { format: "post" } }).status === "resolved", "Complete unique tuples should resolve through the portable contract.");
  assert(getTemplateFieldFamilyOptionAvailabilityV2(groupedFamily, getTemplateFieldFamilyVariantSelectionV2(groupedFamily, "a")).every((item) => item.available), "Available one-property choices should expose their candidate variants.");
  const reorderedFields = [...family.editableFieldOrder].reverse();
  const presentation = resolveTemplateFieldFamilyEditorControlsV2(groupedFamily, reorderedFields);
  assert(presentation.filter((control) => control.kind === "field").map((control) => control.kind === "field" ? control.fieldId : "").join() === reorderedFields.join(), "Editor control placement must not replace editableFieldOrder as field-order authority.");
  assert(presentation[1]?.kind === "selection-property", "Editor selection controls should retain their host presentation slot while fields follow editableFieldOrder.");
  const relabelled = applyTemplateFieldFamilySelectionMutationV2(groupedFamily, { type: "rename-option", groupId: "format", optionId: "banner", title: "Wide banner" });
  assert(relabelled.variantGroups?.[0].options[1].title === "Wide banner" && groupedFamily.variantGroups?.[0].options[1].title === "Banner", "Shared selection mutations must return a new configuration without mutating accepted state.");
  const withAudience = applyTemplateFieldFamilySelectionMutationV2(relabelled, { type: "add-property", property: { id: "audience", title: "Audience", options: [{ id: "consumer", title: "Consumer" }, { id: "business", title: "Business" }] }, assignments: { a: "consumer", b: "business" } });
  const movedProperty = applyTemplateFieldFamilySelectionMutationV2(withAudience, { type: "move-property", groupId: "format", targetIndex: 1 });
  assert(movedProperty.variantGroups?.map((group) => group.id).join() === "audience,format" && movedProperty.editorControlOrder?.filter((control) => control.kind === "selection-property").map((control) => control.kind === "selection-property" ? control.groupId : "").join() === "audience,format", "Property reorder should retain stable assignments and reorder only selection presentation slots.");
  const removedProperty = applyTemplateFieldFamilySelectionMutationV2(relabelled, { type: "remove-property", groupId: "format" });
  assert(!removedProperty.variantGroups?.length && removedProperty.editorControlOrder?.[0]?.kind === "direct-variant-selector" && removedProperty.variants.every((variant) => !variant.groupAssignments?.format), "Removing the final property should restore direct selection and clear only its assignments.");
  groupedSession.dispose();
}
const familyPublicationBase = familySession.beginRuntimeEvidencePublication();
const publishFamilyLines = (lineCount: number, generation: number) => {
  const current = familySession.getSnapshot();
  const materializationRevision = current.familyMaterialization?.materialization?.materializationRevision;
  assert(current.effectivePackage && current.contentState && materializationRevision, "Family line evidence requires a materialized selected variant.");
  assert(familySession.publishRuntimeReadiness({
    contentRevision: current.contentState.revision,
    materializationRevision,
    settlementRevision: `family-settlement:${current.selectedVariantId}`,
    fontRevision: "family-font",
    publicationGeneration: generation,
    fonts: "ready",
    renderer: "ready",
  }), "Current Family runtime readiness should publish before line evidence.");
  assert(familySession.publishFieldLayoutEvidence({
    schemaVersion: "field-layout-evidence-v1",
    fieldId: "textarea:body",
    packageIdentity: current.effectivePackage.packageId,
    contentRevision: current.contentState.revision,
    materializationRevision,
    settlementRevision: `family-settlement:${current.selectedVariantId}`,
    fontRevision: "family-font",
    publicationGeneration: generation,
    participation: "active",
    measuredVisualLines: lineCount,
    reliability: "reliable",
  }), "Current Family line evidence should publish for the selected variant.");
};
publishFamilyLines(2, familyPublicationBase);
assert(familySession.getSnapshot().fields.find((field) => field.descriptor.id === "textarea:body")?.renderValidation.state === "valid", "Two visual lines should satisfy variant A's maxLines rule at its warning threshold.");
familySession.selectVariant("b");
publishFamilyLines(2, familyPublicationBase + 1);
assert(familySession.getSnapshot().fields.find((field) => field.descriptor.id === "textarea:body")?.renderValidation.state === "invalid", "The same shared text and line count should be invalid under variant B's sparse maxLines override.");
familySession.selectVariant("a");
const sharedCrop = {
  mode: "crop" as const,
  crop: {
    schemaVersion: "normalized-image-crop-v1" as const,
    coordinateSpace: "normalized-slot-to-normalized-source" as const,
    transform: [[0.8, 0, 0.1], [0, 0.8, 0.1]] as [[number, number, number], [number, number, number]],
  },
};
const variantCrop = {
  mode: "crop" as const,
  crop: {
    schemaVersion: "normalized-image-crop-v1" as const,
    coordinateSpace: "normalized-slot-to-normalized-source" as const,
    transform: [[0.5, 0, 0.4], [0, 0.9, 0.05]] as [[number, number, number], [number, number, number]],
  },
};
const familyImageA = familySession.getFieldControllers().find(
  (field): field is TemplateFieldFamilyImageControllerV3 => field.type === "image",
)!;
assert((await familyImageA.replaceImage({
  dataUrl: "data:image/png;base64,iVBORw0KGgo=",
  width: 1200,
  height: 800,
  placement: sharedCrop,
})).accepted, "Family replacement should establish one shared asset and default Crop placement.");
const sharedAssetId = (familySession.getSnapshot().contentState?.values["image:hero"]?.value as { assetId: string }).assetId;
assert(familySession.getSnapshot().contentState?.schemaVersion === "template-field-family-content-v3", "Live Family sessions must use only V3 canonical content.");
familySession.selectVariant("b");
const familyImageB = familySession.getFieldControllers().find(
  (field): field is TemplateFieldFamilyImageControllerV3 => field.type === "image",
)!;
assert(
  !familyImageB.setVariantPlacement({ mode: "fit" }).accepted,
  "Variant placement must enforce the selected variant's designer-authorized modes.",
);
assert(familyImageB.setVariantPlacement(variantCrop).accepted, "A selected variant should accept independent canonical framing.");
assert(
  (familySession.getSnapshot().contentState?.values["image:hero"]?.value as { assetId: string }).assetId === sharedAssetId &&
    !("assetId" in (familySession.getSnapshot().contentState?.variantImagePlacements.b?.["image:hero"] ?? {})) &&
    JSON.stringify(familySession.getSnapshot().workingPackage?.nodes["58:61"].image?.imageTransform) === JSON.stringify(variantCrop.crop.transform) &&
    familySession.getSnapshot().resolvedTree?.nodes["58:61"].image?.scaleMode === "CROP" &&
    familySession.getSnapshot().resolvedTree?.nodes["58:61"].image?.placement.cropAspectPolicy === "cover-within-canonical",
  "Variant framing must compose with, but never duplicate or mutate, the shared asset.",
);
familySession.selectVariant("a");
assert(
  JSON.stringify(familySession.getSnapshot().workingPackage?.nodes["58:61"].image?.imageTransform) === JSON.stringify(sharedCrop.crop.transform),
  "A variant without an override should retain the shared default Crop.",
);
familySession.selectVariant("b");
assert(familySession.getFieldControllers().find(
  (field): field is TemplateFieldFamilyImageControllerV3 => field.type === "image",
)!.resetVariantPlacement().accepted, "Resetting variant framing should remove only the sparse override.");
assert(
  !familySession.getSnapshot().contentState?.variantImagePlacements.b?.["image:hero"] &&
    JSON.stringify(familySession.getSnapshot().workingPackage?.nodes["58:61"].image?.imageTransform) === JSON.stringify(sharedCrop.crop.transform),
  "Variant reset should resolve through the shared placement without changing the shared asset.",
);
const familyImageBeforeSwitch = familySession.getFieldControllers().find(
  (field): field is TemplateFieldFamilyImageControllerV3 => field.type === "image",
)!;
familySession.selectVariant("a");
assert(familyImageBeforeSwitch.setVariantPlacement(variantCrop).stale, "Variant placement controllers captured before a switch must reject stale writes.");
familySession.selectVariant("b");
assert(familySession.getFieldControllers().find(
  (field): field is TemplateFieldFamilyImageControllerV3 => field.type === "image",
)!.setVariantPlacement(variantCrop).accepted, "Variant Crop should be restorable before replacing the shared asset.");
familySession.selectVariant("a");
assert(familySession.getFieldControllers().find(
  (field): field is TemplateFieldFamilyImageControllerV3 => field.type === "image",
)!.setPlacement({ mode: "fill" }).accepted, "Changing shared placement should use the ordinary Image mutation path.");
assert(
  (familySession.getSnapshot().contentState?.values["image:hero"]?.value as { placement: { mode: string } }).placement.mode === "fill" &&
    JSON.stringify(familySession.getSnapshot().contentState?.variantImagePlacements.b?.["image:hero"]) === JSON.stringify(variantCrop),
  "Changing shared placement must preserve explicit per-variant framing.",
);
familySession.selectVariant("b");
assert(
  JSON.stringify(familySession.getSnapshot().workingPackage?.nodes["58:61"].image?.imageTransform) === JSON.stringify(variantCrop.crop.transform),
  "An explicit variant Crop must continue to win after the shared placement changes.",
);
familySession.selectVariant("a");
assert((await familySession.getFieldControllers().find(
  (field): field is TemplateFieldFamilyImageControllerV3 => field.type === "image",
)!.replaceImage({
  dataUrl: "data:image/png;base64,iVBORw0KGgo=",
  width: 1600,
  height: 900,
  placement: sharedCrop,
})).accepted, "Replacing the shared asset should use the ordinary Image controller path.");
assert(
  Object.keys(familySession.getSnapshot().contentState?.variantImagePlacements ?? {}).length === 0,
  "Replacing the shared asset must atomically clear every asset-bound variant crop.",
);
const legacyFamilyContent = {
  schemaVersion: "template-field-family-content-v2" as const,
  familyId: family.id,
  revision: 7,
  values: {},
};
const migratedFamilyContent = migrateTemplateFieldFamilyContentStateV2(legacyFamilyContent);
assert(
  migratedFamilyContent.schemaVersion === "template-field-family-content-v3" &&
    Object.keys(migratedFamilyContent.variantImagePlacements).length === 0,
  "V2 Family content should migrate once to V3 with an empty sparse placement map.",
);
assert((familySession.getFieldControllers().find((field) => field.id === "boolean:visible") as BooleanFieldControllerV2).setValue(false).accepted, "Family Boolean content should use the ordinary shared canonical reducer.");
assert(familySession.getSnapshot().workingPackage?.nodes["58:39"].appearance.visible === false, "Variant A must materialize shared false content to its own imported target.");
familySession.selectVariant("b");
assert(familySession.getSnapshot().workingPackage?.nodes[familyBTitleNode.id].appearance.visible === false, "Variant B must materialize the same shared false content to its distinct imported target without Family-specific Boolean logic.");
familySession.selectVariant("a");
assert(
  !(familySession.getFieldControllers().some((field) => field.id === "text:title")) &&
    (familySession.getFieldControllers().find((field) => field.id === "boolean:visible") as BooleanFieldControllerV2).setValue(true).accepted,
  "Family editor controls should hide descendants under a false Boolean and retain the toggle needed to restore them.",
);
const controllerBeforeSwitch = familySession.getFieldControllers().find((field) => field.id === "text:title") as TextFieldControllerV2;
assert(controllerBeforeSwitch.setValue("Summer").accepted, "Family shared content should mutate through the Core reducer.");
familySession.selectVariant("b");
assert(familySession.getSnapshot().contentState?.values["text:title"]?.value === "Summer" && familySession.getSnapshot().readiness.deterministic === "blocked", "Variant switching must preserve shared invalid content and block export without coercion.");
assert(controllerBeforeSwitch.setValue("Old variant").stale, "Controllers captured before a family switch must reject stale writes.");
assert((familySession.getFieldControllers().find((field) => field.id === "text:title") as TextFieldControllerV2).setValue("Alt").accepted, "A controller must remain able to correct content invalidated by a variant switch.");
assert(familySession.getFieldControllers().find(
  (field): field is TemplateFieldFamilyImageControllerV3 => field.type === "image",
)!.setVariantPlacement(variantCrop).accepted, "Variant framing should be present while reimport reviews the selected effective package.");
const familyReimportSource = structuredClone(familySession.getSnapshot().effectivePackage!);
familyReimportSource.packageId = "family-variant-b-reimported";
const familyReimportPlan = familySession.planVariantReimport(familyReimportSource);
assert(familyReimportPlan.canApply, "Family variant reimport should reuse the ordinary ID-based V2 plan.");
familySession.applyVariantReimport(familyReimportPlan);
assert(familySession.getSnapshot().contentState?.values["text:title"]?.value === "Alt", "Family variant reimport must preserve shared canonical content.");
assert(
  JSON.stringify((familySession.getSnapshot().contentState?.values["image:hero"]?.value as { placement: unknown }).placement) === JSON.stringify(sharedCrop) &&
    JSON.stringify(familySession.getSnapshot().contentState?.variantImagePlacements.b?.["image:hero"]) === JSON.stringify(variantCrop),
  "Variant reimport must not leak effective framing into the shared Image placement or discard the sparse override.",
);
assert(familySession.getFieldControllers().find(
  (field): field is TemplateFieldFamilyImageControllerV3 => field.type === "image",
)!.setVariantPlacement(variantCrop).accepted, "A persisted Family should retain an explicit selected-variant crop.");
const savedFamily = await familySession.save();
assert(savedFamily.schemaVersion === "saved-template-field-family-v4" && savedFamily.contentState.schemaVersion === "template-field-family-content-v3", "Family save should persist the current record and V3 content boundary.");
assert(validateCurrentSavedTemplateFieldFamilyV3Record(savedFamily).contentState.revision === savedFamily.contentState.revision, "Current V3 Family persistence should validate its canonical state.");
const invalidCropRecord = structuredClone(savedFamily);
invalidCropRecord.id = "family:v3:invalid-crop";
invalidCropRecord.contentState.variantImagePlacements.b = {
  "image:hero": {
    mode: "crop",
    crop: {
      schemaVersion: "normalized-image-crop-v1",
      coordinateSpace: "normalized-slot-to-normalized-source",
      transform: [[0, 0, 0], [0, 0, 0]],
    },
  },
};
assert(
  validateCurrentSavedTemplateFieldFamilyV3Record(invalidCropRecord).contentState.variantImagePlacements.b?.["image:hero"]?.mode === "crop",
  "A structurally canonical but non-invertible persisted Crop should remain stored for correction.",
);
await repository.saveTemplateFieldFamilyV3(invalidCropRecord);
const invalidCropSession = createTemplateFieldFamilySessionV2({ repository, objectUrls });
await invalidCropSession.loadSaved(invalidCropRecord.id);
assert(
  invalidCropSession.getSnapshot().readiness.exportReady === false &&
    invalidCropSession.getSnapshot().contentState?.variantImagePlacements.b?.["image:hero"]?.mode === "crop",
  "An invalid persisted Crop must remain canonical Crop state and block export rather than silently becoming Fill.",
);
invalidCropSession.dispose();
let malformedFamilyContentRejected = false;
try {
  validateCurrentSavedTemplateFieldFamilyV2Record({
    ...structuredClone(savedFamily),
    contentState: {
      ...structuredClone(savedFamily.contentState),
      values: { "text:title": { value: 42 } },
    },
  });
} catch {
  malformedFamilyContentRejected = true;
}
assert(malformedFamilyContentRejected, "Persisted shared family content must retain the canonical value type declared by the logical field.");
familySession.dispose();
const familyReloaded = createTemplateFieldFamilySessionV2({ repository, objectUrls });
await familyReloaded.loadSaved(savedFamily.id);
assert(
  familyReloaded.getSnapshot().selectedVariantId === "b" &&
    familyReloaded.getSnapshot().contentState?.values["text:title"]?.value === "Alt" &&
    JSON.stringify(familyReloaded.getSnapshot().contentState?.variantImagePlacements.b?.["image:hero"]) === JSON.stringify(variantCrop),
  "Family persistence should restore selection, shared content, and sparse variant framing.",
);
assert(familyReloaded.getFieldControllers().find(
  (field): field is TemplateFieldFamilyImageControllerV3 => field.type === "image",
)!.reset().accepted, "Shared Image reset should remain available through the ordinary controller.");
assert(
  !familyReloaded.getSnapshot().contentState?.values["image:hero"] &&
    Object.keys(familyReloaded.getSnapshot().contentState?.variantImagePlacements ?? {}).length === 0 &&
    familyReloaded.getSnapshot().fields.find((field) => field.descriptor.id === "image:hero")?.valueSource === "imported-default",
  "Shared Image reset must remove the replacement and all variant crops so each variant restores imported authority.",
);
familyReloaded.dispose();
reloaded.dispose();
assert(revoked.length >= 0, "Disposal path should remain callable for browser-owned URLs.");

// Closure regressions: these exercise existing contracts, not new capabilities.
function closureFamily(packageValue = v2Package()): TemplateFieldFamilyV2 {
  const absent = structuredClone(packageValue);
  absent.packageId += "-absent";
  absent.editableFields = absent.editableFields.filter((field) => field.id !== "text:title");
  absent.editableFieldOrder = absent.editableFieldOrder.filter((id) => id !== "text:title");
  return {
    schemaVersion: "template-field-family-v2", id: "closure-family", title: "Closure",
    fields: packageValue.editableFields.map(createTemplateFieldFamilyFieldV2),
    editableFieldOrder: packageValue.editableFieldOrder,
    variants: [{ id: "present", packageValue }, { id: "absent", packageValue: absent }],
  };
}

for (const familyMode of [false, true]) {
  const packageValue = v2Package();
  packageValue.editableFields.push({ id: "textarea:secondBody", type: "textarea", binding: { kind: "text-characters", nodeId: "58:57" }, defaultValue: "Hi", configuration: { maxLines: 2 } });
  packageValue.editableFields = packageValue.editableFields.filter((field) => field.id !== "text:title");
  packageValue.editableFieldOrder = packageValue.editableFields.map((field) => field.id);
  const current = familyMode ? createTemplateFieldFamilySessionV2() : createTemplateSessionV2();
  if ("selectVariant" in current) current.load(closureFamily(packageValue)); else current.load(packageValue);
  const initial = current.getSnapshot();
  const materialization = "materialization" in initial ? initial.materialization : initial.familyMaterialization!.materialization;
  const lease = current.beginRuntimeEvidencePublication();
  let generation = lease;
  let settlement = "settlement-a";
  let font = "font-a";
  const runtime = () => ({ contentRevision: initial.contentState!.revision, materializationRevision: materialization!.materializationRevision!, settlementRevision: settlement, fontRevision: font, publicationGeneration: generation, renderer: "ready" as const, fonts: "ready" as const });
  const line = (fieldId: string, count: number, excluded = false) => ({ ...runtime(), schemaVersion: "field-layout-evidence-v1" as const, packageIdentity: packageValue.packageId, fieldId, participation: excluded ? "structurally-excluded" as const : "active" as const, measuredVisualLines: count, reliability: "reliable" as const });
  current.publishRuntimeReadiness(runtime());
  current.publishFieldLayoutEvidence(line("textarea:body", 1));
  current.publishFieldLayoutEvidence(line("textarea:secondBody", 1));
  assert(current.getSnapshot().readiness.exportReady, "Current independent line evidence permits export.");
  const delayed = line("textarea:body", 1);
  for (const change of ["settlement", "font", "generation"]) {
    if (change === "settlement") settlement = "settlement-b";
    if (change === "font") font = "font-b";
    if (change === "generation") generation += 1;
    current.publishRuntimeReadiness(runtime());
    assert(current.getSnapshot().fields.filter((field) => field.descriptor.type === "textarea").every((field) => field.renderValidation.state === "pending"), `${change} must invalidate both active line evaluations.`);
    assert(!current.getSnapshot().readiness.exportReady, "Missing current lines block export.");
    current.publishFieldLayoutEvidence(line("textarea:body", change === "font" ? 3 : 2));
    assert(current.getSnapshot().fields.find((field) => field.descriptor.id === "textarea:secondBody")!.renderValidation.state === "pending", "One field's evidence cannot validate another.");
    current.publishFieldLayoutEvidence(line("textarea:secondBody", 1));
  }
  settlement = "settlement-a"; font = "font-a"; generation += 1;
  current.publishRuntimeReadiness(runtime());
  assert(!current.publishFieldLayoutEvidence(delayed), "Delayed first-A evidence is rejected after runtime ABA.");
  current.publishFieldLayoutEvidence(line("textarea:body", 1, true));
  current.publishFieldLayoutEvidence(line("textarea:secondBody", 1));
  generation += 1;
  current.publishRuntimeReadiness(runtime());
  assert(current.getSnapshot().fields.find((field) => field.descriptor.id === "textarea:body")!.renderValidation.state === "inactive", "Runtime-only invalidation retains unchanged structural exclusion.");
  current.beginRuntimeEvidencePublication();
  assert(current.getSnapshot().fields.find((field) => field.descriptor.id === "textarea:body")!.renderValidation.state === "inactive", "Publisher replacement also preserves unchanged structural exclusion.");
  const after = current.getSnapshot();
  assert(("materialization" in after ? after.materialization : after.familyMaterialization!.materialization) === materialization, "Runtime-only publication must not rematerialize.");
  current.dispose();
}

{
  const repo = new InMemoryTemplateSessionRepositoryV2();
  const current = createTemplateSessionV2({ repository: repo });
  current.load(v2Package());
  const cropField = current.getSnapshot().basePackage!.editableFields.find((field) => field.id === "image:hero")!;
  assert(cropField.type === "image", "Repair test requires an Image field.");
  current.configure({ fields: [{ ...cropField, configuration: { replacementPlacement: "crop" } }] });
  const image = current.getFieldControllers().find((field): field is ImageFieldControllerV2 => field.type === "image")!;
  await image.replaceImage({ dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", width: 1, height: 1 });
  const record = structuredClone(await current.save());
  const value = record.contentState.values["image:hero"].value as { assetId: string; placement: unknown };
  value.placement = { mode: "crop", crop: { schemaVersion: "normalized-image-crop-v1", coordinateSpace: "normalized-slot-to-normalized-source", transform: [[0, 0, 0], [0, 0, 0]] } };
  await repo.saveTemplateSessionV2(record);
  await current.loadSaved(record.id);
  assert(JSON.stringify(current.getSnapshot().contentState!.values["image:hero"]) === JSON.stringify(record.contentState.values["image:hero"]), "Invalid finite Crop must survive save/reload unchanged.");
  assert(!current.getSnapshot().readiness.exportReady && current.getSnapshot().fields.find((field) => field.descriptor.id === "image:hero")!.blockingErrors.some((issue) => issue.code === "field-v2.image-crop-noninvertible"), "Invalid persisted Crop remains diagnosed and export-blocking.");
  const corrective = current.getFieldControllers().find((field): field is ImageFieldControllerV2 => field.type === "image")!;
  assert(corrective.setPlacement({ mode: "crop", crop: { schemaVersion: "normalized-image-crop-v1", coordinateSpace: "normalized-slot-to-normalized-source", transform: [[1, 0, 0], [0, 1, 0]] } }).accepted, "Invalid Crop remains correctable through its controller.");
  assert(corrective.reset().accepted && !current.getSnapshot().contentState!.values["image:hero"], "Reset removes invalid/corrected Crop authority.");
  for (const malformed of [NaN, Infinity, "bad"]) {
    const bad = structuredClone(record);
    (bad.contentState.values["image:hero"].value as any).placement.crop.transform[0][0] = malformed;
    let rejected = false;
    try { validateCurrentSavedTemplateSessionV2Record(bad); } catch { rejected = true; }
    assert(rejected, "Malformed or non-finite Crop is not repairable canonical content.");
  }
  const wrongType = structuredClone(record);
  (wrongType.contentState.values as any)["number:amount"] = { value: "not a number" };
  let rejected = false;
  try { validateCurrentSavedTemplateSessionV2Record(wrongType); } catch { rejected = true; }
  assert(rejected, "Crop admission must not waive unrelated typed content errors.");
  current.dispose();
}

{
  const current = createTemplateFieldFamilySessionV2();
  const family = closureFamily();
  current.load(family);
  (current.getFieldControllers().find((field) => field.id === "text:title") as TextFieldControllerV2).selectChoice("primary");
  current.selectVariant("absent");
  const before = current.getSnapshot().contentState!;
  const common = family.fields.find((field) => field.id === "text:title")!;
  assert(common.type === "text", "Closure Choice is text.");
  const changed = { ...common, configuration: { choices: { mode: "suggested" as const, options: [{ id: "primary", value: "New" }] as [{ id: string; value: string }] } } };
  current.configure({ fields: [changed] });
  assert(current.getSnapshot().contentState!.values["text:title"].value === "New" && current.getSnapshot().contentState!.revision === before.revision + 1, "Common choice change reconciles absent shared content exactly once.");
  const content = current.getSnapshot().contentState;
  const initialRuntime = current.getSnapshot();
  const initialEvidence = {
    contentRevision: content!.revision,
    materializationRevision: initialRuntime.familyMaterialization!.materialization!.materializationRevision!,
    settlementRevision: "configuration-a", fontRevision: "fonts", publicationGeneration: 100,
    fonts: "ready" as const, renderer: "ready" as const,
  };
  assert(current.publishRuntimeReadiness(initialEvidence), "Initial configuration runtime is publishable.");
  let publications = 0;
  const unsubscribe = current.subscribe(() => { publications += 1; });
  current.configure({ fields: [{ ...changed, label: "New label" }] });
  assert(current.getSnapshot().contentState === content && publications === 1, "Configuration-only edits retain canonical state and publish one transaction.");
  current.configure({ fields: [changed] });
  assert(!current.publishRuntimeReadiness(initialEvidence), "Configuration-only A/B/A rejects delayed first-A publication without manufacturing a content revision.");
  assert(current.getSnapshot().contentState === content, "Configuration ABA preserves unchanged canonical content.");
  unsubscribe();
  current.selectVariant("present");
  assert(current.getSnapshot().contentState === content && current.getSnapshot().fields.find((field) => field.descriptor.id === "text:title")!.blockingErrors.length === 0, "Switching must not mutate shared content or discover a missed reconciliation.");
  current.configure({ fields: [{ ...changed, configuration: {} }] });
  assert(current.getSnapshot().contentState!.values["text:title"].value === "New" && !current.getSnapshot().contentState!.values["text:title"].selectedChoiceId, "Option removal reuses Core's preserve-value/clear-provenance behavior.");
  const atomicBefore = current.getSnapshot();
  let rejected = false;
  try { current.configure({ editableFieldOrder: ["text:title", "text:title"], fields: [changed] }); } catch { rejected = true; }
  assert(rejected && current.getSnapshot() === atomicBefore, "Failed configuration cannot publish partial content or configuration.");
  current.configure({ fields: [{ ...changed, configuration: { choices: { mode: "suggested", options: [{ id: "primary", value: "New" }, { id: "secondary", value: "Other" }] } } }] });
  (current.getFieldControllers().find((field) => field.id === "text:title") as TextFieldControllerV2).selectChoice("primary");
  const orderBefore = current.getSnapshot().contentState;
  current.configure({ fields: [{ ...changed, configuration: { choices: { mode: "suggested", options: [{ id: "secondary", value: "Other" }, { id: "primary", label: "Renamed", value: "New" }] } } }] });
  assert(current.getSnapshot().contentState === orderBefore, "Option label/reorder must not advance canonical content.");
  current.configure({ variants: [{ id: "present", fieldOverrides: { "text:title": { type: "text", configuration: { choices: { mode: "suggested", options: [{ id: "primary", value: "Variant" }] } } } } }] });
  const explicitOverride = JSON.stringify(current.getSnapshot().family!.variants[0].fieldOverrides);
  current.selectVariant("absent");
  current.configure({ fields: [{ ...changed, configuration: { choices: { mode: "suggested", options: [{ id: "primary", value: "Common" }] } } }] });
  const sharedAfter = current.getSnapshot().contentState;
  assert(sharedAfter!.values["text:title"].value === "Common" && JSON.stringify(current.getSnapshot().family!.variants[0].fieldOverrides) === explicitOverride, "Common reconciliation must neither flatten nor overwrite explicit variant choices.");
  current.selectVariant("present");
  assert(current.getSnapshot().contentState === sharedAfter, "Effective variant validation must not rewrite common reconciliation.");
  const saved = await current.save();
  const restored = createTemplateFieldFamilySessionV2();
  await restored.loadSaved(saved.id);
  assert(JSON.stringify(restored.getSnapshot().contentState) === JSON.stringify(sharedAfter), "Reconciled shared content and revision survive persistence.");
  restored.dispose();
  const amount = family.fields.find((field) => field.id === "number:amount")!;
  assert(amount.type === "number", "Batch reconciliation includes typed Number choices.");
  current.configure({ fields: [{ ...amount, configuration: { choices: { mode: "suggested", options: [{ id: "price", value: 10 }] } } }] });
  (current.getFieldControllers().find((field) => field.id === "number:amount") as NumberFieldControllerV2).selectChoice("price");
  const batchRevision = current.getSnapshot().contentState!.revision;
  let batchPublications = 0;
  const stopBatch = current.subscribe(() => { batchPublications += 1; });
  current.configure({ fields: [
    { ...changed, configuration: { choices: { mode: "suggested", options: [{ id: "primary", value: "Batch" }] } } },
    { ...amount, configuration: { choices: { mode: "suggested", options: [{ id: "price", value: 11 }] } } },
  ] });
  stopBatch();
  assert(current.getSnapshot().contentState!.revision === batchRevision + 1 && batchPublications === 1 &&
    current.getSnapshot().contentState!.values["text:title"].value === "Batch" && current.getSnapshot().contentState!.values["number:amount"].value === 11,
  "Multiple reconciled fields commit one canonical revision and one publication.");
  current.dispose();
}

{
  const packageValue = v2Package();
  const hero = packageValue.editableFields.find((field) => field.type === "image")!;
  packageValue.editableFields.push({ ...hero, id: "image:secondImage", binding: { kind: "image-content", nodeId: "58:87" } });
  packageValue.editableFieldOrder.push("image:secondImage");
  const released: string[] = [];
  let serial = 0;
  const current = createTemplateFieldFamilySessionV2({ objectUrls: {
    create: (blob) => { serial += 1; return URL.createObjectURL(blob); },
    revoke: (url) => { released.push(url); URL.revokeObjectURL(url); },
  } });
  current.load(closureFamily(packageValue));
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
  const images = () => current.getFieldControllers().filter((field): field is TemplateFieldFamilyImageControllerV3 => field.type === "image");
  for (const field of images()) assert((await field.replaceImage({ blob, width: 1, height: 1 })).accepted, "Identical uploads are valid.");
  const assetId = (current.getSnapshot().contentState!.values["image:hero"].value as { assetId: string }).assetId;
  assert((current.getSnapshot().contentState!.values["image:secondImage"].value as { assetId: string }).assetId === assetId, "Equal bytes share canonical identity.");
  const saved = await current.save();
  await current.loadSaved(saved.id);
  assert((current.getSnapshot().contentState!.values["image:secondImage"].value as { assetId: string }).assetId === assetId, "Reload preserves the shared replacement asset identity.");
  images()[0].reset();
  assert(current.getSnapshot().sessionAssets[assetId] && current.getSnapshot().fields.find((field) => field.descriptor.id === "image:secondImage")!.blockingErrors.length === 0, "First reset must retain the second field's shared asset.");
  images()[1].reset();
  assert(!current.getSnapshot().sessionAssets[assetId], "Last reset releases the unreferenced asset.");
  for (const field of images()) await field.replaceImage({ blob, width: 1, height: 1 });
  const different = new Blob([new Uint8Array([4, 5, 6])], { type: "image/png" });
  await images()[0].replaceImage({ blob: different, width: 1, height: 1 });
  assert(current.getSnapshot().sessionAssets[assetId], "Replacing A with Y retains X for B.");
  current.selectVariant("absent");
  assert(current.getSnapshot().sessionAssets[assetId], "Variant switching preserves shared assets.");
  await images()[1].replaceImage({ blob: different, width: 1, height: 1 });
  assert(!current.getSnapshot().sessionAssets[assetId], "Replacing final X reference releases X.");
  const pending = images()[0].replaceImage({ blob, width: 1, height: 1 });
  images()[0].reset();
  assert((await pending).stale, "Reset invalidates an older asynchronous Blob replacement.");
  assert(images()[1].blockingErrors.length === 0, "Stale cleanup cannot revoke the surviving field asset.");
  current.dispose();
  assert(released.length === serial && new Set(released).size === serial, "Every created URL must be revoked exactly once, including same-hash registration.");
}

// Hash-only Family source assets must be restored independently of replacements.
{
  const storage = createInMemoryTemplateSessionRepositoryV2Storage();
  const repository = new InMemoryTemplateSessionRepositoryV2(storage);
  const author = createTemplateFieldFamilySessionV2({ repository });
  author.load(closureFamily());
  const saved = await author.save();
  const stored = structuredClone(saved);
  const hash = "a".repeat(64);
  const sourceId = stored.family.variants[0].packageValue.nodes["58:61"].image!.assetId!;
  for (const variant of stored.family.variants) {
    const asset = variant.packageValue.assets[sourceId];
    delete asset.dataUrl; delete asset.stableUrl; delete asset.data;
    asset.hash = hash; asset.storageKey = `sha256:${hash}`; asset.source = "stored";
  }
  storage.fieldFamilies.set(stored.id, stored);
  storage.assets.set(hash, { hash, blob: new Blob(["source"], { type: "image/png" }), mimeType: "image/png", sizeBytes: 6, createdAt: new Date().toISOString() });
  const created: string[] = []; const released: string[] = [];
  const restored = createTemplateFieldFamilySessionV2({ repository, objectUrls: {
    create: () => { const url = `blob:source-${created.length}`; created.push(url); return url; },
    revoke: (url) => released.push(url),
  } });
  await restored.loadSaved(saved.id);
  assert(created.length === 1, "Repeated source hashes across variants hydrate once.");
  assert(restored.getSnapshot().family!.variants.every((variant) => variant.packageValue.assets[sourceId].stableUrl === created[0]), "All variant source maps receive the restored URL.");
  (restored.getFieldControllers().find((field) => field.id === "image:hero") as TemplateFieldFamilyImageControllerV3).reset();
  assert(released.length === 0, "Field reset never revokes Family source media.");
  const candidate = createTemplateFieldFamilySessionV2({ repository });
  candidate.load(structuredClone(restored.getSnapshot().family!), { contentState: restored.getSnapshot().contentState!, sessionAssets: restored.getSnapshot().sessionAssets });
  restored.dispose();
  assert(released.length === 0, "Publishing a candidate retains accepted source URLs after the previous session is disposed.");
  candidate.dispose();
  assert(released.length === 1, "Shared source URL is released once after its last session is disposed.");
  storage.assets.delete(hash);
  const missing = createTemplateFieldFamilySessionV2({ repository });
  await missing.loadSaved(saved.id);
  assert(missing.getSnapshot().readiness.assets === "blocked" && !missing.getSnapshot().readiness.exportReady, "Absent stored source bytes block Family media and export independently of Studio.");
  const snapshot = missing.getSnapshot();
  missing.publishRuntimeReadiness({ contentRevision: snapshot.contentState!.revision, materializationRevision: snapshot.familyMaterialization!.materialization!.materializationRevision!, settlementRevision: "ready", fontRevision: "ready", publicationGeneration: 1, renderer: "ready", fonts: "ready" });
  assert(missing.getSnapshot().readiness.assets === "blocked" && !missing.getSnapshot().readiness.exportReady, "Ready renderer evidence cannot override missing required source media.");
  missing.dispose(); author.dispose();
}

{
  const storage = createInMemoryTemplateSessionRepositoryV2Storage();
  const repository = new InMemoryTemplateSessionRepositoryV2(storage);
  const author = createTemplateFieldFamilySessionV2({ repository });
  author.load(closureFamily());
  const stored = structuredClone(await author.save());
  const id = stored.family.variants[0].packageValue.nodes["58:61"].image!.assetId!;
  for (const [index, variant] of stored.family.variants.entries()) {
    const asset = variant.packageValue.assets[id];
    delete asset.data; delete asset.dataUrl; delete asset.stableUrl;
    asset.hash = String(index + 1).repeat(64);
    asset.source = "stored"; asset.storageKey = `sha256:${asset.hash}`;
    storage.assets.set(asset.hash, { hash: asset.hash, blob: new Blob([String(index)]), mimeType: "image/png", sizeBytes: 1, createdAt: new Date().toISOString() });
  }
  storage.fieldFamilies.set(stored.id, stored);
  const created: string[] = []; const released: string[] = [];
  const restored = createTemplateFieldFamilySessionV2({ repository, objectUrls: { create: () => { const url = `blob:duplicate-${created.length}`; created.push(url); return url; }, revoke: (url) => released.push(url) } });
  await restored.loadSaved(stored.id);
  assert(new Set(restored.getSnapshot().family!.variants.map((variant) => variant.packageValue.assets[id].stableUrl)).size === stored.family.variants.length, "Repeated asset IDs with different hashes remain variant-local.");
  restored.dispose();
  assert(released.length === created.length, "Different variant source hashes release every URL.");
  let finishRead!: () => void;
  const originalRead = repository.getManagedAsset.bind(repository);
  repository.getManagedAsset = async (hash) => { await new Promise<void>((resolve) => { finishRead = resolve; }); return originalRead(hash); };
  const stale = createTemplateFieldFamilySessionV2({ repository, objectUrls: { create: () => { throw new Error("Stale loads must not create URLs"); }, revoke: () => {} } });
  const pending = stale.loadSaved(stored.id);
  while (!finishRead) await Promise.resolve();
  stale.load(closureFamily());
  finishRead(); await pending;
  assert(stale.getSnapshot().savedFamilyId === null, "An older load cannot publish over a newer accepted Family.");
  stale.dispose();
  let reads = 0; const failedUrls: string[] = [];
  repository.getManagedAsset = async hash => { if (++reads === 2) throw new Error("Storage read failed"); return originalRead(hash); };
  const unreadable = createTemplateFieldFamilySessionV2({ repository, objectUrls: { create: () => "blob:partial-hydration", revoke: url => failedUrls.push(url) } });
  await unreadable.loadSaved(stored.id);
  assert(unreadable.getSnapshot().status === "blocked" && unreadable.getSnapshot().readiness.assets === "blocked" && !unreadable.getSnapshot().readiness.exportReady, "Unreadable storage blocks Family media publication.");
  assert(failedUrls.length === 1, "A failed later read releases URLs created by earlier source reads.");
  unreadable.dispose(); author.dispose();
}

{
  const { waitForImageSource } = await import("../src/export/pngExport");
  const previous = Object.getOwnPropertyDescriptor(globalThis, "Image");
  class RejectingDecode {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    complete = true;
    naturalWidth = 1;
    set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    decode() { return Promise.reject(new Error("decode failed")); }
  }
  Object.defineProperty(globalThis, "Image", { configurable: true, value: RejectingDecode });
  try {
    const failure = await waitForImageSource("data:image/png;base64,broken", "required-image", 100, true);
    assert(failure?.code === "export.asset-load-failed", "A successful load event cannot hide a required-media decode rejection.");
  } finally {
    if (previous) Object.defineProperty(globalThis, "Image", previous);
    else delete (globalThis as { Image?: unknown }).Image;
  }
}

{
  const storage = createInMemoryTemplateSessionRepositoryV2Storage();
  const repository = new InMemoryTemplateSessionRepositoryV2(storage);
  const released: string[] = [];
  const single = createTemplateSessionV2({ repository, objectUrls: { create: () => "blob:promoted-source", revoke: url => released.push(url) } });
  single.load(v2Package());
  const stored = structuredClone(await single.save());
  const sourceId = stored.basePackage.nodes["58:61"].image!.assetId!;
  const asset = stored.basePackage.assets[sourceId]; const hash = "f".repeat(64);
  delete asset.dataUrl; delete asset.data; delete asset.stableUrl;
  asset.hash = hash; asset.source = "stored"; asset.storageKey = `sha256:${hash}`;
  storage.assets.set(hash, { hash, blob: new Blob(["source"]), mimeType: "image/png", sizeBytes: 6, createdAt: new Date().toISOString() });
  storage.templateSessions.set(stored.id, stored);
  await single.loadSaved(stored.id);
  const family = createTemplateFieldFamilySessionV2({ repository });
  family.load(closureFamily(single.getSnapshot().basePackage!));
  single.dispose();
  assert(released.length === 0, "Single-to-Family promotion retains hydrated source media and font URLs.");
  family.dispose();
  assert(released.length === 1, "The final Family owner releases promoted source media exactly once.");
}

// The repository may be remote: invocation order, not completion timing, owns saves.
for (const kind of ["single", "family"] as const) {
  const repository = new InMemoryTemplateSessionRepositoryV2();
  const records: Array<{ id: string; contentState: { revision: number } }> = [];
  let finish: (() => void) | undefined;
  let fail = false;
  const write = async <T extends { id: string; contentState: { revision: number } }>(record: T): Promise<T> => {
    records.push(record);
    await new Promise<void>((resolve) => { finish = resolve; });
    if (fail) { fail = false; throw new Error("write failed"); }
    return record;
  };
  repository.saveTemplateSessionV2 = write;
  repository.saveTemplateFieldFamilyV3 = write;
  const single = createTemplateSessionV2({ repository });
  const family = createTemplateFieldFamilySessionV2({ repository });
  if (kind === "single") single.load(v2Package());
  else family.load(closureFamily());
  const session = kind === "single" ? single : family;
  const first = session.save();
  await Promise.resolve();
  const editable = session.getFieldControllers().find(field => field.type === "text")! as TextFieldControllerV2;
  assert(editable.setValue("New").accepted, `${kind}: edit between pending saves is accepted.`);
  const second = session.save();
  await Promise.resolve();
  assert(records.length === 1, `${kind}: a second save waits for the first repository write.`);
  finish!(); await first; await Promise.resolve();
  assert(Number(records.length) === 2 && records[0].id === records[1].id, `${kind}: overlapping first saves share their record identity.`);
  assert(records[1].contentState.revision > records[0].contentState.revision, `${kind}: each save captures its invocation revision.`);
  finish!(); await second;
  fail = true;
  const rejected = session.save().then(() => false, () => true);
  await Promise.resolve(); finish!();
  assert(await rejected, `${kind}: each failed save rejects its caller.`);
  const retry = session.save();
  await Promise.resolve(); finish!(); await retry;
  const beforeReset = session.save();
  await Promise.resolve();
  const resetCancelled = session.save().then(() => false, () => true);
  session.reset();
  if (kind === "single") single.load(v2Package()); else family.load(closureFamily());
  finish!(); await beforeReset;
  assert(await resetCancelled, `${kind}: reset invalidates queued writes even when another source is loaded immediately.`);
  const afterReset = session.save();
  await Promise.resolve();
  if (kind === "single") assert(records[records.length - 1].id !== records[0].id, "Reset releases the single-session save identity.");
  finish!(); await afterReset;
  const active = session.save();
  await Promise.resolve();
  const cancelled = session.save().then(() => false, () => true);
  session.dispose(); finish!(); await active;
  assert(await cancelled, `${kind}: disposal prevents queued writes from starting.`);
  single.dispose(); family.dispose();
}

{
  const { sessionAssetUrlLeases } = await import("../src/session/sessionAssetUrlLeases");
  let revoked = 0;
  sessionAssetUrlLeases.set("blob:pending-save", { count: 1, revoke: () => { revoked++; } });
  const packageValue = v2Package();
  const id = packageValue.nodes["58:61"].image!.assetId!;
  packageValue.assets[id].stableUrl = "blob:pending-save";
  const repository = new InMemoryTemplateSessionRepositoryV2();
  let finish!: () => void;
  repository.saveTemplateSessionV2 = async record => { await new Promise<void>(resolve => { finish = resolve; }); return record; };
  const session = createTemplateSessionV2({ repository });
  session.load(packageValue);
  sessionAssetUrlLeases.get("blob:pending-save")!.count -= 1;
  const pending = session.save();
  await Promise.resolve(); session.dispose();
  assert(revoked === 0, "An in-flight repository write retains source assets after session disposal.");
  finish(); await pending;
  assert(Number(revoked) === 1, "Completed repository writes release their temporary asset ownership.");
}

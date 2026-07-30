import figmaPluginV041 from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import { validateTemplatePackage } from "../../../src/template-package/validateTemplatePackage";
import type {
  TemplatePackageV1,
  TextTemplateNode,
} from "../../../src/template-package/types";
import {
  createInMemoryTemplateRepositoryStorage,
  InMemoryTemplateRepository,
} from "../src/persistence/inMemoryTemplateRepository";
import { validateCurrentSavedTemplateRecord } from "../src/persistence/savedRecordValidation";
import {
  createSavedOutputDraftRecord,
  createSavedTemplateRecord,
} from "../src/persistence/templateRepository";
import { createSavedAssetRecord } from "../src/persistence/assetRepository";
import { semanticRendererMvpMigrationRecord } from "../src/persistence/semanticRendererMvpMigration";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

assert(
  semanticRendererMvpMigrationRecord.behavior === "ignored-inert" &&
    semanticRendererMvpMigrationRecord.obsoleteMetadataKeys.join("|") === "renderer-rollout-preference|renderer-rollout-cohort",
  "The MVP migration must mark rollout metadata inert without consulting or deleting it.",
);

const packageValue = structuredClone(
  figmaPluginV041 as unknown as TemplatePackageV1,
);
const validation = validateTemplatePackage(packageValue);
const storage = createInMemoryTemplateRepositoryStorage();
const repository = new InMemoryTemplateRepository(storage);
const created = createSavedTemplateRecord({
  name: "Persisted template",
  description: "Persistence fixture",
  packageValue,
  validation,
  figmaUrl: "https://www.figma.com/design/example/File?node-id=1-2",
});
const saved = await repository.saveTemplate(created);
assert(
  (await repository.listTemplates()).length === 1 &&
    saved.originalPackage.packageId === packageValue.packageId &&
    saved.source.type === "package-zip",
  "A saved template should appear in repository listings with canonical ZIP source metadata.",
);

const textNode = Object.values(saved.workingPackage.nodes).find(
  (node): node is TextTemplateNode => node.type === "TEXT",
);
if (!textNode) throw new Error("Persistence fixture needs a text node.");

function getTextNode(
  packageValue: TemplatePackageV1,
  nodeId: string,
): TextTemplateNode {
  const node = packageValue.nodes[nodeId];
  if (node?.type !== "TEXT") {
    throw new Error(`Expected ${nodeId} to reference a text node.`);
  }
  return node;
}

function readText(node: TextTemplateNode): string {
  return "characters" in node.text ? node.text.characters : node.text.content;
}

function writeText(node: TextTemplateNode, value: string): void {
  if ("characters" in node.text) {
    node.text.characters = value;
  } else {
    node.text.content = value;
  }
}

const originalTextNode = getTextNode(saved.originalPackage, textNode.id);
const originalText = readText(originalTextNode);
writeText(textNode, "Saved working edit");
const updated = await repository.updateWorkingPackage(
  saved.id,
  saved.workingPackage,
);
assert(
  readText(getTextNode(updated.workingPackage, textNode.id)) ===
    "Saved working edit" &&
    readText(getTextNode(updated.originalPackage, textNode.id)) === originalText,
  "Working edits should persist without mutating the imported original.",
);

const settingsPackage = structuredClone(updated.workingPackage);
writeText(
  getTextNode(settingsPackage, textNode.id),
  "Template settings edit",
);
const settingsField = settingsPackage.editableFields.find(
  (field) => field.type === "text" || field.type === "textarea",
);
if (!settingsField) throw new Error("Persistence fixture requires a text field.");
settingsField.constraints = {
  ...(settingsField.constraints ?? {}),
  maxCharacters: 10,
  maxLines: 1,
  pattern: "number",
};
const settingsValidation = validateTemplatePackage(settingsPackage);
const settingsUpdated = await repository.updateTemplateSettings(saved.id, {
  name: "Renamed in settings",
  description: "Updated template metadata",
  workingPackage: settingsPackage,
  validation: settingsValidation,
});
assert(
  settingsUpdated.name === "Renamed in settings" &&
    settingsUpdated.description === "Updated template metadata" &&
    readText(getTextNode(settingsUpdated.workingPackage, textNode.id)) ===
      "Template settings edit" &&
    readText(getTextNode(settingsUpdated.originalPackage, textNode.id)) ===
      originalText &&
    settingsValidation.schemaValid &&
    (settingsUpdated.workingPackage.editableFields.find(
      (field) => field.id === settingsField.id,
    )?.constraints as { maxCharacters?: number; maxLines?: number; pattern?: string })?.maxCharacters === 10 &&
    (settingsUpdated.workingPackage.editableFields.find(
      (field) => field.id === settingsField.id,
    )?.constraints as { maxCharacters?: number; maxLines?: number; pattern?: string })?.maxLines === 1 &&
    (settingsUpdated.workingPackage.editableFields.find(
      (field) => field.id === settingsField.id,
    )?.constraints as { maxCharacters?: number; maxLines?: number; pattern?: string })?.pattern === "number",
  "Template settings should persist independent supported field constraints without mutating originalPackage.",
);

const draft = await repository.saveDraft(
  createSavedOutputDraftRecord(settingsUpdated),
);
const editedDraftPackage = structuredClone(draft.workingPackage);
writeText(
  getTextNode(editedDraftPackage, textNode.id),
  "Independent output draft",
);
const updatedDraft = await repository.updateDraftPackage(
  draft.id,
  editedDraftPackage,
);
const templateAfterDraftEdit = await repository.getTemplate(saved.id);
assert(
  readText(getTextNode(updatedDraft.workingPackage, textNode.id)) ===
    "Independent output draft" &&
    templateAfterDraftEdit &&
    readText(
      getTextNode(templateAfterDraftEdit.workingPackage, textNode.id),
    ) === "Template settings edit",
  "Output draft edits must not mutate the reusable template workingPackage.",
);

const duplicate = await repository.duplicateTemplate(saved.id);
writeText(
  getTextNode(duplicate.workingPackage, textNode.id),
  "Independent duplicate",
);
await repository.updateWorkingPackage(
  duplicate.id,
  duplicate.workingPackage,
);
const reloadedSource = await repository.getTemplate(saved.id);
assert(
  reloadedSource &&
    readText(getTextNode(reloadedSource.workingPackage, textNode.id)) ===
      "Template settings edit",
  "Duplicate templates must have independent working package state.",
);
assert(
  repository.getAssetCountForTests() > 0,
  "Embedded package assets should be stored in the shared asset repository.",
);

const zipBackedRecord = createSavedTemplateRecord({
  name: "ZIP backed template",
  description: "ZIP source metadata fixture",
  packageValue,
  validation,
  source: {
    type: "package-zip",
    sourceName: "template-package-fixture.zip",
    packageFiles: {
      templateJson: true,
      assetsJson: true,
      motionJson: false,
      mcpJson: false,
      previewPng: true,
      assetCount: 2,
    },
  },
});
const savedZipBackedRecord = await repository.saveTemplate(zipBackedRecord);
const reloadedZipBackedRecord = await repository.getTemplate(
  savedZipBackedRecord.id,
);
assert(
  reloadedZipBackedRecord?.source.type === "package-zip" &&
    reloadedZipBackedRecord.source.sourceName ===
      "template-package-fixture.zip" &&
    reloadedZipBackedRecord.source.packageFiles?.assetCount === 2,
  "Saved ZIP templates should preserve source file metadata through repository reloads.",
);

const sharedAssetCount = repository.getAssetCountForTests();
await repository.deleteTemplate(saved.id);
assert(
  repository.getAssetCountForTests() === sharedAssetCount,
  "Deleting one template must preserve assets referenced by a duplicate.",
);
await repository.deleteTemplate(duplicate.id);
await repository.deleteTemplate(savedZipBackedRecord.id);
assert(
  repository.getAssetCountForTests() === sharedAssetCount,
  "Deleting templates must retain shared binaries referenced by an output draft.",
);
await repository.deleteDraft(draft.id);
assert(
  repository.getAssetCountForTests() === 0,
  "Deleting the final draft reference should clean up shared binaries.",
);

const previewStorage = createInMemoryTemplateRepositoryStorage();
const previewRepository = new InMemoryTemplateRepository(previewStorage);
const previewAsset = await createSavedAssetRecord(
  new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }),
);
const previewTemplate = createSavedTemplateRecord({
  name: "Managed preview template",
  packageValue,
  validation,
  previewAssetHash: previewAsset.hash,
});
const savedPreviewTemplate = await previewRepository.saveTemplate(
  previewTemplate,
  { previewAsset },
);
assert(
  savedPreviewTemplate.previewAssetHash === previewAsset.hash &&
    (await previewRepository.getManagedAsset(previewAsset.hash))?.mimeType ===
      "image/png",
  "Template previews should persist as managed assets referenced by hash rather than binary record data.",
);
const duplicatedPreviewTemplate = await previewRepository.duplicateTemplate(
  savedPreviewTemplate.id,
);
assert(
  duplicatedPreviewTemplate.previewAssetHash === previewAsset.hash,
  "Duplicating a template should safely share its managed preview reference.",
);
await previewRepository.deleteTemplate(savedPreviewTemplate.id);
assert(
  (await previewRepository.getManagedAsset(previewAsset.hash)) !== null,
  "Deleting one preview owner must not delete a preview shared by a duplicate.",
);
await previewRepository.deleteTemplate(duplicatedPreviewTemplate.id);
assert(
  (await previewRepository.getManagedAsset(previewAsset.hash)) === null,
  "Deleting the final preview owner should clean up the managed preview asset.",
);
const recordWithoutPreview = createSavedTemplateRecord({
  name: "No preview",
  packageValue,
  validation,
});
assert(
  validateCurrentSavedTemplateRecord(recordWithoutPreview).previewAssetHash ===
    undefined,
  "Existing current-schema records without preview references should remain valid.",
);

let unsupportedVersionRejected = false;
try {
  validateCurrentSavedTemplateRecord({ ...created, schemaVersion: "99.0" });
} catch {
  unsupportedVersionRejected = true;
}
assert(
  unsupportedVersionRejected,
  "Unknown saved-template versions should fail explicitly instead of being discarded.",
);

const unsupportedSourceRecord = structuredClone(created) as unknown as Record<
  string,
  unknown
>;
unsupportedSourceRecord.id = "template:unsupported-source";
unsupportedSourceRecord.source = {
  type: "package-json",
  sourceName: "historical-package.json",
};
let unsupportedSourceMessage = "";
try {
  validateCurrentSavedTemplateRecord(unsupportedSourceRecord);
} catch (error) {
  unsupportedSourceMessage =
    error instanceof Error ? error.message : String(error);
}
assert(
  unsupportedSourceMessage.includes("Only package-zip records are supported") &&
    unsupportedSourceMessage.includes("Clear unsupported local data"),
  "Historical source kinds should be rejected with an actionable local-data policy.",
);

storage.templates.set(
  "template:unsupported-source",
  unsupportedSourceRecord as unknown as typeof created,
);
let repositoryRejectedUnsupportedSource = false;
try {
  await repository.getTemplate("template:unsupported-source");
} catch {
  repositoryRejectedUnsupportedSource = true;
}
assert(
  repositoryRejectedUnsupportedSource,
  "Repository loading must reject historical source kinds instead of reinterpreting them as ZIP records.",
);

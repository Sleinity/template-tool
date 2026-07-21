import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import figmaPluginV041 from "../template-package/fixtures/figma-plugin-v0.4.1.json";
import {
  createSavedOutputDraftRecord,
  createSavedTemplateRecord,
} from "../template-package/persistence";
import type { TemplatePackageV1 } from "../template-package/types";
import { validateTemplatePackage } from "../template-package/validateTemplatePackage";
import { TemplateOverviewPage } from "./TemplateOverviewPage";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const packageValue = structuredClone(
  figmaPluginV041 as unknown as TemplatePackageV1,
);
const record = createSavedTemplateRecord({
  name: "Reusable template",
  packageValue,
  validation: validateTemplatePackage(packageValue),
});
const draft = createSavedOutputDraftRecord(record);

const markup = renderToStaticMarkup(
  createElement(TemplateOverviewPage, {
    records: [record],
    drafts: [draft],
    onCreateTemplate: () => undefined,
    onOpenTemplate: () => undefined,
    onOpenDraft: () => undefined,
    onDeleteDraft: async () => undefined,
    onOpenSettings: () => undefined,
    onRenameTemplate: async () => undefined,
    onDuplicateTemplate: async () => undefined,
    onDeleteTemplate: async () => undefined,
  }),
);

assert(
  markup.includes("Add template") &&
    markup.includes(`aria-label="Open template ${record.name}"`) &&
    !markup.includes(">Use template<") &&
    markup.includes("Settings") &&
    markup.includes("Duplicate") &&
    markup.includes("Rename") &&
    markup.includes("Delete") &&
    markup.includes("Recent drafts") &&
    markup.includes("Continue content you previously started") &&
    markup.includes(`${packageValue.canvas.width} × ${packageValue.canvas.height}`) &&
    !markup.includes(record.description ?? "Template generated from a Figma package."),
  "The Templates overview should expose separate template management and resumable draft actions.",
);

const previewRecord = {
  ...record,
  id: "template:with-preview",
  previewAssetHash: "preview-hash",
};
const previewMarkup = renderToStaticMarkup(
  createElement(TemplateOverviewPage, {
    records: [previewRecord, record],
    drafts: [],
    previewUrls: { [previewRecord.id]: "blob:managed-preview" },
    onCreateTemplate: () => undefined,
    onOpenTemplate: () => undefined,
    onOpenDraft: () => undefined,
    onDeleteDraft: async () => undefined,
    onOpenSettings: () => undefined,
    onRenameTemplate: async () => undefined,
    onDuplicateTemplate: async () => undefined,
    onDeleteTemplate: async () => undefined,
  }),
);
assert(
  previewMarkup.includes('src="blob:managed-preview"') &&
    previewMarkup.includes("Preview unavailable") &&
    previewMarkup.includes('aria-label="Actions for Reusable template"'),
  "Template cards should render managed previews, a missing-preview fallback, and an accessible overflow menu.",
);

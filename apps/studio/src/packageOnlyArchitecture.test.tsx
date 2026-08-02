import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import App from "./App";
import * as bundleApi from "@sleinity/template-core";
import * as importApi from "@sleinity/template-browser/importer";
import type { TemplatePackageImportPipelineInput } from "@sleinity/template-browser/importer";
import type { SavedTemplateRecord } from "@sleinity/template-browser/persistence";
import { TemplatePackageImportFlow } from "./views/TemplatePackageImportFlow";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

type RetiredJsonImportVariantRemoved = Extract<
  TemplatePackageImportPipelineInput,
  { format: "legacy-json" }
> extends never
  ? true
  : false;
const retiredJsonImportVariantRemoved: RetiredJsonImportVariantRemoved = true;
type RetiredSavedSourceKindsRemoved = Extract<
  SavedTemplateRecord["source"]["type"],
  "figma" | "package-json" | "legacy-package-json"
> extends never
  ? true
  : false;
const retiredSavedSourceKindsRemoved: RetiredSavedSourceKindsRemoved = true;

const appMarkup = renderToStaticMarkup(createElement(App));
const importMarkup = renderToStaticMarkup(
  createElement(TemplatePackageImportFlow, {
    onCancel: () => undefined,
    onAddTemplate: () => undefined,
  }),
);

assert(
  appMarkup.includes("Templates") &&
    appMarkup.includes("Add template"),
  "The overview should expose the ZIP-only Templates product flow.",
);
assert(
  importMarkup.includes("Template setup") &&
    importMarkup.includes("Choose template ZIP") &&
    !importMarkup.includes("Choose Import Format") &&
    !importMarkup.includes("Add JSON Package") &&
    !importMarkup.includes("Upload JSON Package"),
  "The importer should open directly as a ZIP-only package flow.",
);
assert(
  !appMarkup.includes("Legacy JSX") &&
    !importMarkup.includes("Legacy JSX") &&
    !importMarkup.includes("Paste JSX") &&
    !importMarkup.includes("Template Package JSON import"),
  "No JSX or retired package-source importer entry point should remain.",
);
assert(
  retiredJsonImportVariantRemoved &&
    retiredSavedSourceKindsRemoved &&
    !("adaptLegacyJsonTemplatePackageSource" in bundleApi) &&
    !("buildPackageImportResult" in importApi),
  "Retired package-source adapters and active source variants must not be exported.",
);

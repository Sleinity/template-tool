import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import figmaPluginV041 from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import type { TemplatePackageV1 } from "@sleinity/template-core";
import { createTemplateFamilyFromPackage } from "@sleinity/template-core/family";
import { createTemplateFamilySession } from "@sleinity/template-browser/session";
import { createTemplateFamilyImportWizard } from "@sleinity/template-browser/importer";
import {
  TemplateFamilySessionProvider,
  useTemplateFamilyEditor,
  type TemplateFamilyFieldControllerV1,
} from "../src/familyEditor";
import {
  TemplateFamilyImportWizardProvider,
  TemplateFamilyZipInput,
} from "../src/familyImporter";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const packageValue = structuredClone(
  figmaPluginV041 as unknown as TemplatePackageV1,
);
packageValue.fontRequirements = [];
const created = createTemplateFamilyFromPackage({
  familyId: "family:react",
  familyTitle: "React Family",
  variantId: "variant:square",
  variantTitle: "Square",
  packageValue,
  idFactory: (kind, seed) => `${kind}:${seed}`,
});
const landscape = structuredClone(created.family.variants[0]);
landscape.id = "variant:landscape";
landscape.title = "Landscape";
created.family.variants.push(landscape);
const session = createTemplateFamilySession({ fontRegistry: null });
session.load({ family: created.family, content: created.content });
const headline = created.family.fields[0];
session.setField(headline.id, "Shared React value");

let capturedFieldController: TemplateFamilyFieldControllerV1 | null = null;

function FamilyProbe() {
  const editor = useTemplateFamilyEditor();
  capturedFieldController = editor.fields[0] ?? null;
  return createElement(
    "section",
    {
      "data-family-id": editor.snapshot.family?.id,
      "data-variant-id": editor.snapshot.selectedVariantId,
      "data-render-session-ready": editor.renderSession.getSnapshot().status,
    },
    editor.fields.map((field) =>
      createElement("span", { key: field.field.id }, String(field.value))),
  );
}

const initialMarkup = renderToStaticMarkup(
  createElement(
    TemplateFamilySessionProvider,
    { session },
    createElement(FamilyProbe),
  ),
);
assert(
  initialMarkup.includes('data-family-id="family:react"') &&
    initialMarkup.includes("Shared React value") &&
    initialMarkup.includes('data-render-session-ready="ready"'),
  "React family hooks must expose shared fields and the existing render session without Studio dependencies.",
);
session.selectVariant(landscape.id);
const staleControllerResult = (
  capturedFieldController as TemplateFamilyFieldControllerV1 | null
)?.setValue("Stale React value");
assert(
  staleControllerResult?.stale === true &&
    session.getSnapshot().content?.values[headline.id] === "Shared React value",
  "React family controllers must reject mutations issued from an older family operation revision.",
);
const switchedMarkup = renderToStaticMarkup(
  createElement(
    TemplateFamilySessionProvider,
    { session },
    createElement(FamilyProbe),
  ),
);
assert(
  switchedMarkup.includes('data-variant-id="variant:landscape"') &&
    switchedMarkup.includes("Shared React value"),
  "React field controllers must retain shared content after variant selection changes.",
);

const wizard = createTemplateFamilyImportWizard({ familySession: session });
const inputMarkup = renderToStaticMarkup(
  createElement(
    TemplateFamilyImportWizardProvider,
    { wizard },
    createElement(TemplateFamilyZipInput, { mode: "add-variant" }),
  ),
);
assert(
  inputMarkup.includes("Add variant ZIP") && inputMarkup.includes('accept=".zip'),
  "The React family importer must expose a host-neutral ZIP action through the supported importer entry.",
);
wizard.dispose();

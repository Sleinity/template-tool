import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import figmaPluginV041 from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import type { TemplatePackageV1 } from "@sleinity/template-core";
import {createTemplateFamilyFromPackage} from "../../template-core/test/legacyEntry";
import {createTemplateFamilySession} from "../../template-browser/test/legacyEntry";
import {createTemplateFamilyImportWizard} from "../../template-browser/test/legacyImporter";
import {
  TemplateFamilySessionProvider,
  useTemplateFamilyEditor,
  useTemplateFamilySelection,
  type TemplateFamilyFieldControllerV1,
} from "./legacy/familyEditor";
import {
  TemplateFamilyImportWizardProvider,
  TemplateFamilyZipInput,
} from "./legacy/familyImporter";

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
const variantSpecificField = created.family.fields[0];
variantSpecificField.rule.constraints = { maxCharacters: 3 };
const variantSpecificTarget = landscape.bindings.find(
  (binding) => binding.familyFieldId === variantSpecificField.id,
)?.targets[0];
landscape.bindings = landscape.bindings.filter(
  (binding) => binding.familyFieldId !== variantSpecificField.id,
);
landscape.packageValue.editableFields = landscape.packageValue.editableFields.filter(
  (field) =>
    field.id !== variantSpecificTarget?.fieldId ||
    field.nodeId !== variantSpecificTarget?.nodeId,
);
created.family.variants.push(landscape);
created.family.variantGroups = [
  {
    id: "group:format",
    title: "Format",
    options: [
      { id: "option:square", title: "Square" },
      { id: "option:landscape", title: "Landscape" },
    ],
  },
  {
    id: "group:colour",
    title: "Colour",
    options: [{ id: "option:blue", title: "Blue" }],
  },
];
created.family.variants[0].groupAssignments = {
  "group:format": "option:square",
  "group:colour": "option:blue",
};
landscape.groupAssignments = {
  "group:format": "option:landscape",
  "group:colour": "option:blue",
};
const session = createTemplateFamilySession({ fontRegistry: null });
session.load({ family: created.family, content: created.content });
const headline = created.family.fields[0];
session.setField(headline.id, "Shared React value");

let capturedFieldController: TemplateFamilyFieldControllerV1 | null = null;

function FamilyProbe() {
  const editor = useTemplateFamilyEditor();
  const selection = useTemplateFamilySelection();
  capturedFieldController = editor.fields[0] ?? null;
  return createElement(
    "section",
    {
      "data-family-id": editor.snapshot.family?.id,
      "data-variant-id": editor.snapshot.selectedVariantId,
      "data-render-session-ready": editor.renderSession.getSnapshot().status,
      "data-all-fields": editor.fields.length,
      "data-visible-fields": editor.visibleFields.length,
      "data-selection-groups": selection.groups.length,
      "data-selection-variants": selection.variants.length,
      "data-editor-controls": editor.controls.length,
    },
    editor.visibleFields.map((field) =>
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
    initialMarkup.includes('data-selection-groups="2"') &&
    initialMarkup.includes('data-selection-variants="2"') &&
    initialMarkup.includes(`data-editor-controls="${created.family.fields.length + 2}"`) &&
    (capturedFieldController as TemplateFamilyFieldControllerV1 | null)
      ?.scope.kind === "variant-specific" &&
    (capturedFieldController as TemplateFamilyFieldControllerV1 | null)
      ?.selectedVariantIssues.length === 1 &&
    initialMarkup.includes('data-render-session-ready="ready"'),
  "React family hooks must expose shared fields and the existing render session without Studio dependencies.",
);
session.selectOption("group:format", "option:landscape");
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
    !switchedMarkup.includes("Shared React value") &&
    switchedMarkup.includes(`data-all-fields="${created.family.fields.length}"`) &&
    switchedMarkup.includes(`data-visible-fields="${created.family.fields.length - 1}"`) &&
    switchedMarkup.includes(`data-editor-controls="${created.family.fields.length + 1}"`) &&
    (capturedFieldController as TemplateFamilyFieldControllerV1 | null)?.issues.length === 1 &&
    (capturedFieldController as TemplateFamilyFieldControllerV1 | null)
      ?.selectedVariantIssues.length === 0 &&
    session.getSnapshot().content?.values[headline.id] === "Shared React value",
  "React family hooks must hide variant-specific controls without deleting their content or all-family inventory.",
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

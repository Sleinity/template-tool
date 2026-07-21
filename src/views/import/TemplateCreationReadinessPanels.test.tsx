import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  FieldConstraintSummary,
  TemplateCreationGate,
} from "../../template-package/import";
import {
  FieldExportReadinessPanel,
  TemplateCreationReadinessPanel,
} from "./TemplateCreationReadinessPanels";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const blockedGate: TemplateCreationGate = {
  canCreate: false,
  blockers: [
    {
      code: "template-name-required",
      message: "Template Name is required.",
      suggestion: "Enter a name for this reusable template.",
    },
    {
      code: "ROOT_NODE_MISSING",
      message: "The package root node is missing.",
      suggestion: "Restore the exported root node, then validate again.",
      nodeId: "root",
    },
  ],
};
const blockedMarkup = renderToStaticMarkup(
  createElement(TemplateCreationReadinessPanel, {
    gate: blockedGate,
    onFocusBlocker: () => undefined,
  }),
);
assert(
  blockedMarkup.includes('data-testid="template-creation-blockers"') &&
    blockedMarkup.includes('aria-labelledby="template-creation-blockers-title"') &&
    blockedMarkup.includes("Template Name is required.") &&
    blockedMarkup.includes("The package root node is missing.") &&
    blockedMarkup.includes("Enter template name") &&
    blockedMarkup.includes("Open blocking issue"),
  "Creation blockers should be visibly and accessibly explained with repair actions.",
);

const readyMarkup = renderToStaticMarkup(
  createElement(TemplateCreationReadinessPanel, {
    gate: { canCreate: true, blockers: [] },
    onFocusBlocker: () => undefined,
  }),
);
assert(
  readyMarkup.includes('data-testid="template-creation-ready"') &&
    readyMarkup.includes("Ready to add") &&
    readyMarkup.includes("export-only issues"),
  "A valid final step should state that creation is ready and distinguish export warnings.",
);

const fieldSummaries: FieldConstraintSummary[] = [
  {
    code: "field-required",
    fieldId: "headline",
    fieldLabel: "Headline",
    nodeId: "text:headline",
    nodeName: "field:text:headline",
    severity: "error",
    blocksExport: true,
    message: "Headline is required before export.",
    currentValue: "Empty",
    requirement: "A value is required.",
    repair: "Enter text in the editor.",
  },
  {
    code: "field-pattern-invalid",
    fieldId: "reference",
    fieldLabel: "Reference",
    nodeId: "text:reference",
    nodeName: "field:text:reference",
    severity: "warning",
    blocksExport: false,
    message: "Reference does not match its preferred pattern.",
    currentValue: "ABC",
    requirement: "Value must match the numeric pattern.",
    repair: "Enter a numeric reference.",
  },
];
const fieldMarkup = renderToStaticMarkup(
  createElement(FieldExportReadinessPanel, {
    summaries: fieldSummaries,
    onFocusField: () => undefined,
  }),
);
assert(
  fieldMarkup.includes('data-testid="template-field-export-readiness"') &&
    fieldMarkup.includes('aria-labelledby="template-field-export-readiness-title"') &&
    fieldMarkup.includes("You can add the template now") &&
    fieldMarkup.includes("Headline") &&
    fieldMarkup.includes("headline") &&
    fieldMarkup.includes("field:text:headline") &&
    fieldMarkup.includes("text:headline") &&
    fieldMarkup.includes("Current value") &&
    fieldMarkup.includes("Empty") &&
    fieldMarkup.includes("A value is required.") &&
    fieldMarkup.includes("Suggested action: Enter text in the editor.") &&
    fieldMarkup.includes("Blocked") &&
    fieldMarkup.includes("Needs attention") &&
    fieldMarkup.includes("Configure field") &&
    fieldMarkup.includes("Technical details"),
  "Field readiness should show field, node, current value, requirement, repair, classification, and a focus action.",
);

import figmaPluginV041 from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import { validatePackageFieldConstraints } from "../../../src/template-package/editor";
import type { PackageQualityIssue } from "../src/internal/qualityIssue";
import type { TemplatePackageV1 } from "../../../src/template-package/types";
import {
  createFieldConstraintSummaries,
  createTemplateCreationGate,
} from "../src/import/templateCreationGate";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const packageValue = figmaPluginV041 as unknown as TemplatePackageV1;
assert(
  createTemplateCreationGate({
    canImport: true,
    hasOriginalPackage: true,
    templateName: "Reusable template",
    isRebuildingDiagnostics: false,
    isSaving: false,
  }).canCreate,
  "A valid named package with an imported baseline should allow creation.",
);

const importBlocker: PackageQualityIssue = {
  id: "root-missing",
  fingerprint: "ROOT_NODE_MISSING|root",
  code: "ROOT_NODE_MISSING",
  severity: "error",
  category: "package",
  origins: ["package-validation"],
  message: "The root node is missing.",
  whyItMatters: "The package cannot render.",
  suggestedFix: "Restore the exported root node.",
  blocks: ["import"],
  blocksImport: true,
  nodeId: "root",
};
const exportOnlyIssue: PackageQualityIssue = {
  ...importBlocker,
  id: "field-export-only",
  fingerprint: "field-required|headline",
  code: "field-required",
  category: "fields",
  message: "Headline is required before export.",
  blocks: ["export"],
  blocksImport: false,
  fieldId: "headline",
};
const blockedGate = createTemplateCreationGate({
  canImport: false,
  hasOriginalPackage: true,
  templateName: "Reusable template",
  isRebuildingDiagnostics: false,
  isSaving: false,
  qualityIssues: [importBlocker, exportOnlyIssue],
});
assert(
  !blockedGate.canCreate &&
    blockedGate.blockers.length === 1 &&
    blockedGate.blockers[0].code === "ROOT_NODE_MISSING",
  "Canonical import blockers should disable creation while export-only issues remain non-blocking.",
);

const missingInputsGate = createTemplateCreationGate({
  canImport: true,
  hasOriginalPackage: false,
  templateName: "",
  isRebuildingDiagnostics: false,
  isSaving: false,
});
assert(
  !missingInputsGate.canCreate &&
    missingInputsGate.blockers.some(
      (item) => item.code === "original-package-missing",
    ) &&
    missingInputsGate.blockers.some(
      (item) => item.code === "template-name-required",
    ),
  "Every independent final-step requirement should produce its own visible blocker.",
);

const constrainedPackage = structuredClone(packageValue);
const field = constrainedPackage.editableFields.find(
  (candidate) => candidate.type === "text" || candidate.type === "textarea",
)!;
field.constraints = { maxCharacters: 3 };
const node = constrainedPackage.nodes[field.nodeId];
if (node.type !== "TEXT") throw new Error("Text constraint fixture is invalid.");
if ("characters" in node.text) node.text.characters = "Long value";
else node.text.content = "Long value";
const fieldValidation = validatePackageFieldConstraints(constrainedPackage);
const fieldSummaries = createFieldConstraintSummaries(
  constrainedPackage,
  fieldValidation,
);
assert(
  !fieldValidation.exportReady &&
    fieldSummaries.length === 1 &&
    fieldSummaries[0].fieldId === field.id &&
    fieldSummaries[0].nodeId === field.nodeId &&
    fieldSummaries[0].currentValue === "Long value" &&
    fieldSummaries[0].requirement.includes("3") &&
    fieldSummaries[0].repair.length > 0,
  "Field readiness details should identify field, node, current value, requirement, and repair guidance.",
);

assert(
  createTemplateCreationGate({
    canImport: true,
    hasOriginalPackage: true,
    templateName: "Reusable template",
    isRebuildingDiagnostics: false,
    isSaving: false,
    qualityIssues: [exportOnlyIssue],
  }).canCreate,
  "Export-only field constraints must not silently become creation blockers.",
);

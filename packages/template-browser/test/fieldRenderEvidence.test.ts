import type { FieldLayoutEvidenceV1, FieldRenderValidationStatusV1 } from "@sleinity/template-core";
import { evaluateFieldRenderEvidence, invalidateRuntimeFieldEvidence } from "../src/session/fieldRenderEvidence";
import { assert, equal, v2Package } from "./sessionContract.fixtures";
import { verifyFieldRenderEvidence } from "./fieldRenderEvidence.integration";
const field = v2Package().editableFields.find(f => f.type === "textarea")!;
assert(field.type === "textarea");
const evidence: FieldLayoutEvidenceV1 = { schemaVersion: "field-layout-evidence-v1", fieldId: field.id, packageIdentity: "source", contentRevision: 0,
  materializationRevision: "m", settlementRevision: "s", fontRevision: "f", publicationGeneration: 1,
  participation: "active", reliability: "reliable", measuredVisualLines: 1 };
const beforeField = structuredClone(field), beforeEvidence = structuredClone(evidence);
equal(evaluateFieldRenderEvidence(field, evidence), { state: "valid", contentRevision: 0, visualLines: 1, warnings: [] });
equal(evaluateFieldRenderEvidence(field, { ...evidence, measuredVisualLines: 2 }), { state: "valid", contentRevision: 0, visualLines: 2,
  warnings: [{ code: "field-v2.warning-lines", fieldId: field.id, severity: "warning", message: "Rendered content uses 2 visual lines.", blocksExport: false }] });
equal(evaluateFieldRenderEvidence(field, { ...evidence, measuredVisualLines: 3 }), { state: "invalid", contentRevision: 0, visualLines: 3,
  errors: [{ code: "field-v2.max-lines", fieldId: field.id, severity: "error", message: "Rendered content exceeds 2 visual lines.", blocksExport: true }] });
for (const measuredVisualLines of [undefined, 0, -1, 1.5, NaN, Infinity]) equal(evaluateFieldRenderEvidence(field, { ...evidence, measuredVisualLines }),
  { state: "pending", contentRevision: 0, reason: "Reliable visual-line evidence is unavailable." });
for (const reliability of ["pending", "unsupported"] as const) equal(evaluateFieldRenderEvidence(field, { ...evidence, reliability }),
  { state: "pending", contentRevision: 0, reason: "Reliable visual-line evidence is unavailable." });
const inactive = evaluateFieldRenderEvidence(field, { ...evidence, participation: "structurally-excluded", reliability: "unsupported", measuredVisualLines: 0 });
equal(inactive, { state: "inactive", contentRevision: 0, reason: "The Textarea is structurally excluded from the active render tree." });
const unbounded = { ...field, configuration: {} };
equal(evaluateFieldRenderEvidence(unbounded, { ...evidence, measuredVisualLines: 100 }), { state: "valid", contentRevision: 0, visualLines: 100, warnings: [] });
equal(field, beforeField); equal(evidence, beforeEvidence);
const map = new Map<string, FieldRenderValidationStatusV1>([
  ["inactive", inactive], ["valid", evaluateFieldRenderEvidence(field, evidence)], ["pending", { state: "pending", contentRevision: 0, reason: "pending" }],
  ["invalid", evaluateFieldRenderEvidence(field, { ...evidence, measuredVisualLines: 3 })], ["not-required", { state: "not-required" }],
]);
invalidateRuntimeFieldEvidence(map); equal([...map], [["inactive", inactive]]); assert(map.get("inactive") === inactive, "Inactive status retains identity");
invalidateRuntimeFieldEvidence(map); equal([...map], [["inactive", inactive]]);
assert(verifyFieldRenderEvidence().length === 133, "All native lifecycle checkpoints executed");
console.log("Accepted Textarea evidence and native publication lifecycle passed.");

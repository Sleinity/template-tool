import assert from "node:assert/strict";
import { canReuseTextMeasurement, textMeasurementInputKey } from "../src/internal/runtime-routing/textMeasurementInputs";

const inputs = { node: { text: "Date", runs: [{ weight: 400 }], width: 160 }, face: "binary/face/loaded", trim: "CAP_HEIGHT" };
const key = textMeasurementInputKey(inputs);
assert(canReuseTextMeasurement(key, key, "mounted-inputs", "mounted-inputs"));
for (const changed of [
  { ...inputs, node: { ...inputs.node, text: "Changed" } },
  { ...inputs, node: { ...inputs.node, runs: [{ weight: 500 }] } },
  { ...inputs, node: { ...inputs.node, width: 80 } },
  { ...inputs, face: "binary/face/absent" },
  { ...inputs, trim: "NONE" },
]) assert(!canReuseTextMeasurement(key, textMeasurementInputKey(changed), "mounted-inputs", "mounted-inputs"));
for (const changed of ["new-width", "new-chrome", "new-scale", "new-run-style", null])
  assert(!canReuseTextMeasurement(key, key, "mounted-inputs", changed));
assert(!canReuseTextMeasurement(key, key, null, null), "Unknown mounted inputs never authorize reuse");
assert.notEqual(textMeasurementInputKey({ runs: [1, 2] }), textMeasurementInputKey({ runs: [2, 1] }));
// Publication freshness is deliberately not an input to this private identity.
// Native settlement/session tests independently reject old generations and ABA.
assert.equal(textMeasurementInputKey(structuredClone(inputs)), key);
console.log("Mounted text input identity and conservative reuse checks passed");

import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import {
  normalizeTemplatePackageV1ToV2,
  validateTemplatePackageV2,
} from "../../packages/template-core/dist/index.js";
import {
  createTemplateSessionV2,
} from "../../packages/template-browser/dist/session.js";

const fixture = JSON.parse(await readFile(
  new URL("../../src/template-package/fixtures/figma-plugin-v0.4.1.json", import.meta.url),
  "utf8",
));
const normalized = normalizeTemplatePackageV1ToV2(fixture);
if (!normalized.package) throw new Error("Performance fixture failed V2 normalization.");
const packageValue = normalized.package;
packageValue.fontRequirements = [];
packageValue.nodes[packageValue.rootNodeId].extensions = {
  ...packageValue.nodes[packageValue.rootNodeId].extensions,
  sessionPerformancePadding: "x".repeat(2_450_000),
};
packageValue.editableFields = [{
  id: "text:headline",
  type: "text",
  binding: { kind: "text-characters", nodeId: "58:57" },
  defaultValue: "Initial",
  configuration: { maxCharacters: 100 },
}];
packageValue.editableFieldOrder = ["text:headline"];
if (!validateTemplatePackageV2(packageValue).valid) {
  throw new Error("Performance package is not a valid TemplatePackageV2.");
}

const session = createTemplateSessionV2();
session.load(packageValue);
const iterations = 20;
const started = performance.now();
for (let index = 0; index < iterations; index += 1) {
  const controller = session.getFieldControllers()[0];
  if (controller.type !== "text") throw new Error("Performance field is not Text.");
  const result = controller.setValue(`Revision ${index}`);
  if (!result.accepted) throw new Error("Performance mutation was rejected.");
}
const durationMs = performance.now() - started;
console.log(JSON.stringify({
  schemaVersion: "template-session-v2-performance-v1",
  packageBytes: JSON.stringify(packageValue).length,
  iterations,
  durationMs: Number(durationMs.toFixed(2)),
  averageMs: Number((durationMs / iterations).toFixed(2)),
  finalContentRevision: session.getSnapshot().contentState?.revision,
  materializationsPerAcceptedMutation: 1,
}));
session.dispose();

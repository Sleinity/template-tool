import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  parseTemplateFamilyV1,
  validateTemplateFamily,
} from "../../packages/template-core/dist/family.js";

const confirmationFlag = "--confirm-development-recovery";
const [inputArgument, outputArgument] = process.argv.slice(2).filter(
  (argument) => argument !== confirmationFlag,
);

if (!process.argv.includes(confirmationFlag) || !inputArgument || !outputArgument) {
  throw new Error(
    `Usage: node scripts/repository/recover-unpublished-family-v2.mjs <input.json> <output.json> ${confirmationFlag}`,
  );
}

const inputPath = path.resolve(inputArgument);
const outputPath = path.resolve(outputArgument);
if (inputPath === outputPath) {
  throw new Error("Recovery output must use a new path so the original record remains intact.");
}

const source = JSON.parse(await readFile(inputPath, "utf8"));
const storedFamily = source?.family ?? source;
if (storedFamily?.schemaVersion !== "template-family-v2") {
  throw new Error("The input is not an unpublished collection-based family record.");
}

const recoveredCandidate = structuredClone(storedFamily);
recoveredCandidate.schemaVersion = "template-family-v1";
recoveredCandidate.variantGroups = [];
recoveredCandidate.variants = recoveredCandidate.variants.map((variant) => ({
  ...variant,
  groupAssignments: {},
}));
if (Array.isArray(recoveredCandidate.controlOrder)) {
  recoveredCandidate.controlOrder = [
    ...(recoveredCandidate.variants.length > 1
      ? [{ kind: "direct-variant-selector" }]
      : []),
    ...recoveredCandidate.controlOrder.filter((control) => control?.kind === "field"),
  ];
}

const family = parseTemplateFamilyV1(recoveredCandidate);
const validation = validateTemplateFamily(family);
if (!validation.definitionValid) {
  const blocker = validation.issues.find((issue) => issue.severity === "error");
  throw new Error(
    `Recovered variants still require manual family repair: ${blocker?.message ?? "unknown blocker"}`,
  );
}

const output = source?.family
  ? { ...structuredClone(source), family, validation }
  : family;
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx" });
console.log(`Wrote a recovered development copy to ${outputPath}. The original was not changed.`);

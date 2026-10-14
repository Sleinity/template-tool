import fixture from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import { normalizeTemplatePackageV1ToV2, type TemplatePackageV1, type TemplatePackageV2 } from "@sleinity/template-core";
export function assert(condition: unknown, message = "Assertion failed."): asserts condition { if (!condition) throw new Error(message); }
/** Own-key equality retains omitted versus undefined properties and array order. */
export function equal(actual: unknown, expected: unknown, path = "value"): void {
  if (Object.is(actual, expected)) return;
  assert(actual !== null && expected !== null && typeof actual === "object" && typeof expected === "object", `${path}: unequal values`);
  assert(Array.isArray(actual) === Array.isArray(expected), `${path}: array shape differs`);
  const a = Reflect.ownKeys(actual), b = Reflect.ownKeys(expected);
  assert(a.length === b.length && a.every(key => b.includes(key)), `${path}: property presence differs`);
  for (const key of a) equal((actual as Record<PropertyKey, unknown>)[key], (expected as Record<PropertyKey, unknown>)[key], `${path}.${String(key)}`);
}
export function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
export function v2Package(): TemplatePackageV2 {
  const normalized = normalizeTemplatePackageV1ToV2(
    structuredClone(fixture as unknown as TemplatePackageV1),
  );
  assert(normalized.package, "Browser V2 fixture should normalize.");
  const packageValue = normalized.package;
  packageValue.fontRequirements = [];
  packageValue.nodes[packageValue.rootNodeId].appearance.fills.push({
    type: "SOLID",
    color: { r: 0, g: 0, b: 0, a: 1 },
    opacity: 1,
    visible: true,
    blendMode: "NORMAL",
  });
  packageValue.editableFields = [
    {
      id: "text:title",
      type: "text",
      label: "Headline",
      controlRole: "campaign-title",
      binding: { kind: "text-characters", nodeId: "58:57" },
      defaultValue: "Hi",
      configuration: {
        maxCharacters: 20,
        warningAtCharacters: 5,
        choices: { mode: "suggested", options: [{ id: "primary", value: "Hi" }] },
      },
    },
    {
      id: "textarea:body",
      type: "textarea",
      binding: { kind: "text-characters", nodeId: "58:60" },
      defaultValue: "Body",
      configuration: { maxCharacters: 100, maxLines: 2, warningAtLines: 2 },
    },
    {
      id: "image:hero",
      type: "image",
      binding: { kind: "image-content", nodeId: "58:61" },
      defaultValue: {
        assetId: packageValue.nodes["58:61"].image?.assetId ?? null,
        placement: { mode: "imported" },
      },
      configuration: { replacementPlacement: "fill" },
    },
    {
      id: "number:amount",
      type: "number",
      binding: { kind: "text-characters", nodeId: "58:76" },
      defaultValue: 10,
      configuration: { min: 0, max: 100, step: 1 },
    },
    {
      id: "date:date",
      type: "date",
      binding: { kind: "text-characters", nodeId: "58:79" },
      defaultValue: "2026-11-04",
      configuration: {},
    },
    {
      id: "boolean:visible",
      type: "boolean",
      binding: { kind: "structural-visibility", nodeId: "58:39" },
      defaultValue: true,
      configuration: {},
    },
    {
      id: "color:color",
      type: "color",
      binding: { kind: "solid-fill-color", nodeId: packageValue.rootNodeId, sourceIndex: 1 },
      defaultValue: "#000000",
      configuration: {},
    },
  ];
  packageValue.editableFieldOrder = ["text:title", "textarea:body", "image:hero", "number:amount", "date:date", "boolean:visible", "color:color"];
  return packageValue;
}

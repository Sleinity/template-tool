import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fixture from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import {
  normalizeTemplatePackageV1ToV2,
  type TemplatePackageV1,
} from "@sleinity/template-core";
import { createTemplateSessionV2, type TextFieldControllerV2 } from "@sleinity/template-browser/session";
import {
  TemplateFieldSessionV2Provider,
  TemplateFieldSessionRendererV2,
  useTemplateFieldControllersV2,
  useTemplateFieldSessionV2Snapshot,
} from "../src/fieldSessionV2";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const normalized = normalizeTemplatePackageV1ToV2(
  structuredClone(fixture as unknown as TemplatePackageV1),
);
assert(normalized.package, "React V2 consumer fixture should normalize.");
const textNode = Object.values(normalized.package.nodes).find((node) => node.type === "TEXT");
assert(textNode?.type === "TEXT", "React V2 consumer fixture needs a text node.");
normalized.package.editableFields = [{
  id: "headline",
  type: "text",
  controlRole: "campaign-title",
  binding: { kind: "text-characters", nodeId: textNode.id },
  defaultValue: "Imported",
  configuration: { maxCharacters: 30 },
}];
normalized.package.editableFieldOrder = ["headline"];
normalized.package.fontRequirements = [];

const session = createTemplateSessionV2();
session.load(normalized.package);
let captured: TextFieldControllerV2 | null = null;

function Probe() {
  const fields = useTemplateFieldControllersV2();
  const snapshot = useTemplateFieldSessionV2Snapshot();
  captured = fields[0] as TextFieldControllerV2;
  return createElement("output", {
    "data-status": snapshot.status,
    "data-field-id": fields[0]?.id,
    "data-field-type": fields[0]?.type,
    "data-control-role": fields[0]?.controlRole,
    "data-configuration": JSON.stringify(fields[0]?.configuration),
  }, String(fields[0]?.value));
}

const markup = renderToStaticMarkup(createElement(
  TemplateFieldSessionV2Provider,
  { session },
  createElement(Probe),
));
assert(
  markup.includes('data-field-id="headline"') &&
    markup.includes('data-field-type="text"') &&
    markup.includes('data-control-role="campaign-title"') &&
    markup.includes("Imported"),
  "An external React host should enumerate V2 type/configuration/value/controlRole without Studio dependencies.",
);
assert((captured as TextFieldControllerV2 | null)?.setValue("React edit").accepted, "React-exposed typed controllers should use the Browser/Core mutation path.");
assert(session.getSnapshot().contentState?.values.headline?.value === "React edit", "React mutation should update canonical content, not renderer text authority.");
const rendererMarkup = renderToStaticMarkup(createElement(
  TemplateFieldSessionV2Provider,
  { session },
  createElement(TemplateFieldSessionRendererV2),
));
assert(
  rendererMarkup.includes("data-template-field-session-v2-revision") &&
    rendererMarkup.includes("data-template-package-canvas"),
  "The V2 session renderer bridge should consume the ordinary materialized renderer package without a Studio-specific path.",
);
session.dispose();

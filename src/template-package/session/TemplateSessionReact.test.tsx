import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  TemplateSessionProvider,
  TemplateSessionRenderer,
} from "@sleinity/template-react";
import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import { createResolvedRenderTree } from "../resolved";
import type { TemplatePackageV1 } from "../types";
import { validateTemplatePackage } from "../validateTemplatePackage";
import type { PackageImportResult } from "../import/runTemplatePackageImportPipeline";
import { createTemplateSessionWithDependencies } from "./templateSession";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const packageValue = structuredClone(
  figmaPluginV041 as unknown as TemplatePackageV1,
);
const validation = validateTemplatePackage(packageValue);
const readySession = createTemplateSessionWithDependencies({}, {
  importZip: async () => ({
    package: structuredClone(packageValue),
    validation,
    diagnostics: validation.diagnostics,
    pluginDiagnostics: validation.pluginDiagnostics,
    enrichment: null,
    sourceMetadata: { type: "package-zip", sourceName: "react-session.zip" },
    loadedSource: {
      originalPackageValue: structuredClone(packageValue),
    },
  } as unknown as PackageImportResult),
  createResolvedTree: createResolvedRenderTree,
  validate: validateTemplatePackage,
});
await readySession.loadZip({ bytes: new ArrayBuffer(0) });

const readyMarkup = renderToStaticMarkup(
  createElement(
    TemplateSessionProvider,
    { session: readySession },
    createElement(TemplateSessionRenderer, { mode: "static" }),
  ),
);
assert(
  readyMarkup.includes("data-template-session-revision") &&
    readyMarkup.includes("data-template-package-canvas"),
  "The React adapter should render the current session tree without Studio UI.",
);

const idleSession = createTemplateSessionWithDependencies({}, {
  importZip: async () => {
    throw new Error("unused");
  },
  createResolvedTree: createResolvedRenderTree,
  validate: validateTemplatePackage,
});
const fallbackMarkup = renderToStaticMarkup(
  createElement(TemplateSessionRenderer, {
    session: idleSession,
    fallback: createElement("p", null, "Waiting for template"),
  }),
);
assert(
  fallbackMarkup.includes("Waiting for template") &&
    !fallbackMarkup.includes("data-template-package-canvas"),
  "The React adapter should expose host-owned fallback UI while a session is not ready.",
);

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  TemplateSessionProvider,
  TemplateSessionRenderer,
} from "@sleinity/template-react";
import {
  TemplateImporterWizard,
  TemplateImportValidationSummary,
} from "../../../packages/template-react/src/importer";
import type {
  TemplateImportFontValidationReportV1,
  TemplateImportRenderValidationReportV1,
  TemplateImportValidationReportV1,
} from "@sleinity/template-browser/importer";
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

const wizardMarkup = renderToStaticMarkup(
  createElement(TemplateImporterWizard, {
    session: idleSession,
    onComplete: () => undefined,
    onCancel: () => undefined,
  }),
);
assert(
  wizardMarkup.includes('aria-label="Template setup wizard"') &&
    wizardMarkup.includes("Package") &&
    wizardMarkup.includes("Fonts") &&
    wizardMarkup.includes("Validate") &&
    wizardMarkup.includes("Fields") &&
    wizardMarkup.includes("Confirm") &&
    wizardMarkup.includes("Completed") === false &&
    wizardMarkup.includes("Prepare fonts") === false &&
    wizardMarkup.includes("Choose a TemplatePackage ZIP") &&
    !wizardMarkup.includes('<p class="template-importer__eyebrow">Template setup</p>') &&
    wizardMarkup.includes("Templates"),
  "The reusable importer should present the headless workflow as an accessible five-page host-neutral setup without Studio UI.",
);

const aggregateValidationMarkup = renderToStaticMarkup(
  createElement(TemplateImportValidationSummary, {
    report: {
      status: "ready",
      diagnostics: [],
      findings: [],
      counts: { blockers: 0, warnings: 0, repairs: 0, notes: 0 },
      phases: {
        zip: { id: "zip", status: "ready", diagnostics: [] },
      },
    } as unknown as TemplateImportValidationReportV1,
    packageSummary: {
      packageId: "package:validation-summary",
      name: "Validation summary fixture",
      width: 1920,
      height: 1080,
      editableFieldCount: 4,
      assetCount: 3,
      requiredFontCount: 1,
    },
    sourceFilename: "validation-summary.zip",
    fontReport: {
      schemaVersion: "template-import-font-validation-v1",
      status: "ready",
      revision: 1,
      requirements: [],
      blockers: [],
      warnings: [],
    } satisfies TemplateImportFontValidationReportV1,
    renderReport: {
      schemaVersion: "template-import-render-validation-v1",
      status: "ready",
      revision: 1,
      renderIdentity: null,
      blockers: [],
      warnings: [],
      diagnostics: [],
    } satisfies TemplateImportRenderValidationReportV1,
  }),
);
assert(
  aggregateValidationMarkup.match(/aria-label="Template validation summary"/g)?.length === 1 &&
    aggregateValidationMarkup.includes("Template ready") &&
    aggregateValidationMarkup.includes("No unresolved diagnostics") &&
    aggregateValidationMarkup.includes("validation-summary.zip") &&
    aggregateValidationMarkup.match(/data-status="ready">Ready<\/span>/g)?.length === 3 &&
    !aggregateValidationMarkup.includes('template-importer__validation-checks"><span') &&
    !aggregateValidationMarkup.includes("Render validation summary"),
  "The reusable aggregate validator should render one complete package, font, and renderer summary card.",
);

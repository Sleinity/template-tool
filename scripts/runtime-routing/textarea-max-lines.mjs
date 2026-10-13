#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { importTemplatePackage, normalizeTemplatePackageV1ToV2 } from "@sleinity/template-core";
import { unzipSync } from "fflate";
import { launchBrowser } from "../fidelity/browser.mjs";
import { loadManifest, parseArguments, repoRoot, stableStringify, verifyFixture } from "../fidelity/core.mjs";
import { createStudioViteServer } from "../repository/studio-vite-server.mjs";

const args = parseArguments(process.argv.slice(2));
const runId = String(args["run-id"] || `textarea-max-lines-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const outputRoot = join(repoRoot, "fidelity", "runtime-routing", "textarea-max-lines", runId);
mkdirSync(outputRoot, { recursive: true });
const fixture = loadManifest().fixtures.find((item) => item.id === "now-hiring-post");
if (!fixture) throw new Error("The registered now-hiring-post fixture is required.");
const verified = verifyFixture(loadManifest(), fixture);
const bytes = verified.bytes.buffer.slice(verified.bytes.byteOffset, verified.bytes.byteOffset + verified.bytes.byteLength);
const imported = importTemplatePackage(bytes, verified.path);
if (!imported.importable || !imported.workingPackage) throw new Error("The exact source fixture must import before line evidence can run.");
const normalized = normalizeTemplatePackageV1ToV2(imported.workingPackage);
if (!normalized.package) throw new Error("The exact source fixture must normalize to TemplatePackageV2.");
const packageValue = normalized.package;
// This focused harness verifies line publication and export currentness. Exact
// binary/font-epoch behavior remains covered by runtime-routing:fonts and
// runtime-routing:text-trim against these same source bytes.
packageValue.fontRequirements = [];
for (const node of Object.values(packageValue.nodes)) {
  if (node.type !== "TEXT" || !("fontFamily" in node.text)) continue;
  node.text.fontFamily = "sans-serif";
  if (node.extensions?.figma?.style) node.extensions.figma.style.fontFamily = "sans-serif";
}
const entries = unzipSync(new Uint8Array(verified.bytes));
for (const asset of Object.values(packageValue.assets)) {
  if (asset.type !== "image" || asset.dataUrl || !asset.storageKey) continue;
  const source = entries[asset.storageKey];
  if (!source) continue;
  asset.source = "embedded";
  asset.dataUrl = `data:${asset.mimeType};base64,${Buffer.from(source).toString("base64")}`;
}
const sourceTextarea = packageValue.editableFields.find((field) => field.type === "textarea" && field.id === "text") ??
  packageValue.editableFields.find((field) => field.type === "textarea");
if (!sourceTextarea || sourceTextarea.type !== "textarea") throw new Error("The exact source fixture no longer contains an authentic Textarea binding.");
sourceTextarea.configuration = { ...sourceTextarea.configuration, maxLines: 3, warningAtLines: 2 };
const nodeId = sourceTextarea.binding.nodeId;
packageValue.editableFields.push({
  id: "boolean:showMaxLinesBody",
  type: "boolean",
  binding: { kind: "structural-visibility", nodeId },
  defaultValue: true,
  configuration: {},
});
packageValue.editableFieldOrder.push("boolean:showMaxLinesBody");
const serializedPackage = JSON.stringify(packageValue);
const server = await createStudioViteServer({ port: Number(args.port || 0), strictPort: Boolean(args.port) });
server.middlewares.use((request, response, next) => {
  if (request.url?.startsWith("/__textarea-max-lines-package.json")) {
    response.statusCode = 200;
    response.setHeader("content-type", "application/json");
    response.end(serializedPackage);
    return;
  }
  if (request.url?.startsWith("/__textarea-max-lines")) {
    response.statusCode = 200;
    response.setHeader("content-type", "text/html");
    response.end(`<!doctype html><html><body><div id="root"></div><script type="module">
      import RefreshRuntime from "/@react-refresh";
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
    </script><script type="module" src="/@fs/${repoRoot}/scripts/runtime-routing/textarea-max-lines-harness.tsx"></script></body></html>`);
    return;
  }
  next();
});
const harnessMiddleware = server.middlewares.stack.pop();
if (harnessMiddleware) server.middlewares.stack.unshift(harnessMiddleware);
await server.listen();
const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
if (!baseUrl) throw new Error("Textarea evidence server did not publish a local URL.");
const browser = await launchBrowser(Boolean(args.headed));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForState(page, expected, contentRevision) {
  try {
    await page.waitForFunction(({ state, revision }) => {
      const snapshot = window.__textareaMaxLines?.snapshot();
      const field = snapshot?.fields.find((item) => item.descriptor.type === "textarea");
      return snapshot?.contentState?.revision === revision &&
        field?.contentRevision === revision && field?.renderValidation.state === state;
    }, { state: expected, revision: contentRevision }, { timeout: 20_000 });
  } catch (error) {
    const observed = await page.evaluate(() => {
      const snapshot = window.__textareaMaxLines?.snapshot();
      const field = snapshot?.fields.find((item) => item.descriptor.type === "textarea");
      return snapshot ? {
        contentRevision: snapshot.contentState?.revision,
        fieldContentRevision: field?.contentRevision,
        renderValidation: field?.renderValidation,
        readiness: snapshot.readiness,
      } : null;
    });
    throw new Error(`Expected Textarea state ${expected} at revision ${contentRevision}; observed ${JSON.stringify(observed)}. ${error.message}`);
  }
  return page.evaluate(() => {
    const snapshot = window.__textareaMaxLines.snapshot();
    const field = snapshot.fields.find((item) => item.descriptor.type === "textarea");
    return { field: field.renderValidation, readiness: snapshot.readiness, contentRevision: snapshot.contentState.revision };
  });
}

const results = [];
try {
  for (const surface of ["validate", "fields", "editor", "png-export"]) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 1500 } });
    const browserErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));
    await page.goto(`${baseUrl}/__textarea-max-lines?mode=${surface === "editor" ? "editor" : "static"}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__textareaMaxLines?.ready === true).catch((error) => {
      throw new Error(`${surface}: harness did not become ready: ${browserErrors.join(" | ") || error.message}`);
    });
    const oneLineRevision = await page.evaluate(() => window.__textareaMaxLines.setText("One line"));
    const oneLine = await waitForState(page, "valid", oneLineRevision);
    const lineDebug = await page.evaluate((targetNodeId) => {
      const node = document.querySelector(`[data-package-node-id="${targetNodeId}"]`);
      const paint = node?.querySelector('[data-package-text-paint-box="true"]');
      if (!node || !paint) return null;
      const range = document.createRange();
      range.selectNodeContents(paint);
      return {
        nodeText: node.textContent,
        paintText: paint.textContent,
        nodeWidth: node.getBoundingClientRect().width,
        paintWidth: paint.getBoundingClientRect().width,
        whiteSpace: getComputedStyle(node).whiteSpace,
        rects: Array.from(range.getClientRects()).map((rect) => ({ top: rect.top, width: rect.width, height: rect.height })),
      };
    }, nodeId);
    assert(oneLine.field.visualLines === 1, `${surface}: a short value must produce one visible line: ${JSON.stringify({ oneLine, lineDebug })}.`);
    const warningRevision = await page.evaluate(() => window.__textareaMaxLines.setText("One\nTwo"));
    const warning = await waitForState(page, "valid", warningRevision);
    assert(warning.field.visualLines === 2 && warning.field.warnings?.length === 1 && warning.readiness.exportReady, `${surface}: warningAtLines equality must remain advisory.`);
    const overRevision = await page.evaluate(() => window.__textareaMaxLines.setText("One\nTwo\nThree\nFour"));
    const over = await waitForState(page, "invalid", overRevision);
    assert(over.field.visualLines === 4 && !over.readiness.exportReady, `${surface}: four laid-out lines must exceed maxLines=3 and block export.`);
    if (surface === "png-export") {
      const invalidExportRejected = await page.evaluate(async () => {
        try {
          await window.__textareaMaxLines.exportPng();
          return false;
        } catch {
          return true;
        }
      });
      assert(invalidExportRejected, "PNG export must reject the current over-limit Textarea state.");
    }
    const emptyRevision = await page.evaluate(() => window.__textareaMaxLines.setText(""));
    const empty = await waitForState(page, "valid", emptyRevision);
    assert(empty.field.visualLines === 1, `${surface}: empty rendered text must count as one line.`);
    const hiddenRevision = await page.evaluate(() => window.__textareaMaxLines.setVisible(false));
    const hidden = await waitForState(page, "inactive", hiddenRevision);
    assert(hidden.readiness.renderValidation === "ready", `${surface}: structural exclusion must deactivate line readiness.`);
    const shownRevision = await page.evaluate(() => window.__textareaMaxLines.setVisible(true));
    const shown = await waitForState(page, "valid", shownRevision);
    let png = null;
    if (surface === "png-export") {
      png = await page.evaluate(() => window.__textareaMaxLines.exportPng());
      assert(png.width === fixture.canvas.width && png.height === fixture.canvas.height && png.byteLength > 0, "PNG export must wait for current valid line evidence.");
    }
    results.push({ surface, oneLine, warning, over, empty, hidden, shown, png });
    await page.close();
  }
  const report = {
    schemaVersion: "textarea-max-lines-evidence-v1",
    fixture: { id: fixture.id, zipSha256: fixture.zipSha256, nodeId },
    owner: "visible-painted-text-range-line-boxes",
    surfaces: results,
  };
  writeFileSync(join(outputRoot, "report.json"), stableStringify(report));
  console.log(`Textarea maxLines evidence passed: ${join(outputRoot, "report.json")}`);
} finally {
  await browser.close();
  await server.close();
}

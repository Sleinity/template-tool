import {optionAction,choiceIds,optionLabel,openFormat} from '../repository/compact-fields-browser.mjs';
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizeTemplatePackageV1ToV2 } from "@sleinity/template-core";
import { launchBrowser } from "../fidelity/browser.mjs";
import { createStudioViteServer } from "../repository/studio-vite-server.mjs";

async function waitInput(input, value) {
  await input.page().waitForFunction(([element, expected]) => element?.isConnected && element.value === expected, [await input.elementHandle(), value]);
}

// Product integration fixture, not new Figma source certification or a golden.
const root = process.cwd();
const output = resolve(root, "fidelity/evidence/field-rules-v2-studio");
await mkdir(output, { recursive: true });
const fixture = JSON.parse(await readFile(resolve(root, "src/template-package/fixtures/figma-plugin-v0.4.1.json"), "utf8"));
const packageValue = normalizeTemplatePackageV1ToV2(fixture).package;
if (!packageValue) throw new Error("Integration source must normalize.");
packageValue.name = "Seven field proof";
packageValue.fontRequirements = [];
for (const node of Object.values(packageValue.nodes)) {
  if (node.type === "TEXT") {
    node.text.fontFamily = "sans-serif";
    if (node.extensions?.figma?.style) node.extensions.figma.style.fontFamily = "sans-serif";
  }
}
packageValue.nodes[packageValue.rootNodeId].appearance.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true, blendMode: "NORMAL" }];
packageValue.editableFields = [
  { id: "text:headline", type: "text", label: "Headline", binding: { kind: "text-characters", nodeId: "58:57" }, defaultValue: "Headline", configuration: {} },
  { id: "textarea:body", type: "textarea", label: "Body", binding: { kind: "text-characters", nodeId: "58:60" }, defaultValue: "Body", configuration: {} },
  { id: "image:hero", type: "image", label: "Hero", binding: { kind: "image-content", nodeId: "58:61" }, defaultValue: { assetId: packageValue.nodes["58:61"].image.assetId, placement: { mode: "imported" } }, configuration: { replacementPlacement: "fill" } },
  { id: "color:color", type: "color", label: "Brand", controlRole: "brand-color", binding: { kind: "solid-fill-color", nodeId: packageValue.rootNodeId, sourceIndex: 0 }, defaultValue: "#ffffff", configuration: {} },
  { id: "number:amount", type: "number", label: "Amount", binding: { kind: "text-characters", nodeId: "58:76" }, defaultValue: 10, configuration: {} },
  { id: "date:date", type: "date", label: "Date", binding: { kind: "text-characters", nodeId: "58:79" }, defaultValue: "2026-11-04", configuration: {} },
  { id: "boolean:visible", type: "boolean", label: "Show body", binding: { kind: "structural-visibility", nodeId: "58:60", additionalNodeIds: ["58:56"] }, defaultValue: true, configuration: {} },
];
packageValue.editableFieldOrder = packageValue.editableFields.map((field) => field.id);
const file = (value, name = "fields-v2.json") => ({ name, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(value)) });
const server = await createStudioViteServer();
// The external composition is mounted independently from Studio via public APIs.
server.middlewares.use((request, response, next) => {
  if (!request.url?.startsWith("/__field-host")) return next();
  response.setHeader("content-type", "text/html");
  response.end(`<!doctype html><html><body><div id="root"></div><script type="module">
    import RefreshRuntime from "/@react-refresh";
    RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>t=>t; window.__vite_plugin_react_preamble_installed__=true;
  </script><script type="module" src="/@fs/${root}/scripts/field-rules/host-harness.tsx"></script></body></html>`);
});
const middleware = server.middlewares.stack.pop(); server.middlewares.stack.unshift(middleware);
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await launchBrowser(false);
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const checks = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const apply = async () => {
  await page.getByRole("button", { name: "Apply field configuration", exact: true }).click();
  assert(await page.getByRole("alert").count() === 0, `Configuration error: ${await page.getByRole("alert").allTextContents()}`);
};
const select = async (id) => { await page.locator(".v2-order").getByRole("button", { name: id, exact: true }).click(); };
const ready = async () => page.getByRole("button", { name: "Export PNG", exact: true }).waitFor({ state: "visible" }).then(() => page.waitForFunction(() => [...document.querySelectorAll("button")].some((button) => button.textContent.trim() === "Export PNG" && !button.disabled), null, { timeout: 30000 }));
const createThroughSetup = async (files, name, family = false) => {
  await page.getByRole("button", { name: "Add template", exact: true }).click();
  await page.getByLabel("Import source packages").setInputFiles(files);
  await page.getByRole("button", { name: "Continue to fonts", exact: true }).click();
  await page.getByRole("button", { name: "Continue to checks", exact: true }).click();
  if (family) {
    await page.getByRole("button", { name: "Check again", exact: true }).click();
    await page.waitForFunction(() => ![...document.querySelectorAll('[role="status"]')].some((node) => node.textContent.startsWith("Checking ")));
  }
  await page.getByRole("button", { name: "Continue to fields", exact: true }).click();
  await page.getByRole("button", { name: "Continue to review", exact: true }).click();
  await page.getByRole("button", { name: "Save template", exact: true }).click({ timeout: 30000 });
  await page.getByTestId("template-card").last().waitFor();
  // Retain the original combined-workspace regression for explicitly untagged V2 work.
  const existingId = await page.evaluate(async (name) => {
    const { studioRecords } = await import("/src/workspace/studioRecords.ts");
    const record = (await studioRecords.list()).find((entry) => entry.name === name && entry.studio?.role === "template");
    const existing = await studioRecords.save({ ...record, id: `existing-${crypto.randomUUID()}`, studio: undefined });
    return existing.id;
  }, name);
  await page.goto(`${url}work/${encodeURIComponent(existingId)}`);
  await page.getByTestId("studio-field-rules-v2").waitFor();
};
try {
  await page.goto(url);
  await createThroughSetup(file(packageValue), packageValue.name);
  await page.getByLabel("Maximum characters", { exact: true }).fill("80");
  await page.getByText("Technical details", { exact: true }).click();
  await page.getByText("Host integration", { exact: true }).click();
  await page.getByLabel("Control role (advanced)").fill("unrecognized-host-hint");
  await page.getByRole("button",{name:"Close details",exact:true}).click();
  await page.getByText("Choices", { exact: true }).click();
  await page.getByLabel("Choice behavior").selectOption("suggested");
  await page.getByLabel("Option value", { exact: true }).fill("First");
  await page.getByRole("button", { name: "Add choice", exact: true }).click();
  await page.getByLabel("Option value", { exact: true }).nth(1).fill("Second");
  await optionAction(page,page.locator(".field-config-editor"),1,"Move up");
  assert((await choiceIds(page.locator(".field-config-editor")))[0] === "option-2", "Reordering must retain option identity.");
  await(await optionLabel(page.locator(".field-config-editor"),0)).fill("Second label");
  await apply(); checks.push("Text rules, unknown role, stable choice add/reorder/label/value");
  await select("Body"); await page.getByRole("textbox",{name:"Maximum rendered lines",exact:true}).fill("3"); await page.getByText("Line warning",{exact:true}).click(); await page.getByRole("textbox",{name:"Warn at rendered lines",exact:true}).fill("2"); await apply();
  await select("Hero"); await page.locator('input[name^="replacement-placement-"][value="crop"]').check(); await apply();
  await select("Brand"); await page.getByText("Choices", { exact: true }).click(); await page.getByLabel("Choice behavior").selectOption("suggested"); await apply();
  await select("Amount");await openFormat(page.locator(".field-config-editor")); await page.getByLabel("Minimum", { exact: true }).fill("0"); await page.getByLabel("Maximum", { exact: true }).fill("1000"); await page.getByLabel("Step", { exact: true }).fill("1"); await page.getByLabel("Prefix").fill("€"); await page.getByLabel("Suffix").fill(",-"); await apply();
  await select("Date");await openFormat(page.locator(".field-config-editor")); await page.getByLabel("Prefix").fill("Valid "); await page.getByLabel("Suffix").fill(" UTC"); await page.getByLabel("Date display format").selectOption("numeric-day-first"); await page.getByLabel("Date separator").selectOption("."); await apply();
  await select("Show body"); await page.getByLabel("Label", { exact: true }).fill("Show body"); await apply();
  await page.getByRole("button", { name: "Move Show body up", exact: true }).click();
  checks.push("Seven field configurations and portable order");
  await page.getByRole("button", { name: "Edit content", exact: true }).click();
  await page.getByLabel("Headline", { exact: true }).fill("Edited");
  await page.getByLabel("Body", { exact: true }).fill("One\nTwo\nThree");
  await page.getByText("3 / 3 rendered lines · valid", { exact: true }).waitFor();
  await page.getByText("Maximum of 3 rendered lines reached.", { exact: true }).waitFor();
  assert(await page.getByText("Maximum of 3 rendered lines reached.", { exact: true }).count() === 1, "The exact line maximum shows one maximum status.");
  assert(await page.getByText("Warning: Rendered content uses 3 visual lines.", { exact: true }).count() === 0, "The exact line maximum replaces the advisory warning.");
  await page.getByLabel("Body", { exact: true }).fill("One\nTwo\nThree\nFour");
  await waitInput(page.getByLabel("Body", { exact: true }), "One\nTwo\nThree");
  assert(await page.getByLabel("Body", { exact: true }).inputValue() === "One\nTwo\nThree", "Typing rejects a candidate beyond the rendered-line limit.");
  await ready();
  assert(await page.getByRole("button", { name: "Export PNG", exact: true }).isEnabled(), "Rejected growth preserves the current exportable content.");
  await page.getByLabel("Show body visible").uncheck();
  await page.getByText("Inactive — excluded from layout").waitFor();
  assert(await page.getByLabel("Headline", { exact: true }).count() === 0, "Studio omits a field control nested below any false Boolean target.");
  await page.getByLabel("Body", { exact: true }).fill("One\nTwo\nThree\nFour");
  await page.getByLabel("Show body visible").check();
  assert(await page.getByLabel("Headline", { exact: true }).inputValue() === "Edited", "Studio restores a nested field control with its retained canonical value.");
  await page.getByText("4 / 3 rendered lines · invalid", { exact: true }).waitFor();
  await page.getByLabel("Body", { exact: true }).fill("One\nTwo");
  await page.getByText("2 / 3 rendered lines · valid", { exact: true }).waitFor();
  await page.getByLabel("Preview surface").selectOption("static");
  await page.getByText("2 / 3 rendered lines · valid", { exact: true }).waitFor();
  await page.getByLabel("Preview surface").selectOption("editor");
  await page.getByText("2 / 3 rendered lines · valid", { exact: true }).waitFor();
  await page.getByLabel("Amount", { exact: true }).fill("125");
  await page.getByLabel("Date", { exact: true }).fill("2026-12-05");
  await page.getByText("Valid 05.12.2026 UTC", { exact: true }).waitFor();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  await page.getByLabel("Replace Hero").setInputFiles({ name: "host.png", mimeType: "image/png", buffer: png });
  await page.getByText(/Current placement: fill/).waitFor();
  await page.getByLabel("Crop width").fill("0.5"); await page.getByLabel("Crop height").fill("0.5");
  await page.getByRole("button", { name: "Apply Crop", exact: true }).click();
  await page.getByText(/Current placement: crop/).waitFor();
  await ready();
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Export PNG", exact: true }).click();
  await (await download).saveAs(resolve(output, "studio.png"));
  checks.push("Canonical seven-type editing, maxLines invalid/warning/inactive, surface remounts, Boolean show, Crop, PNG");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Saved portable configuration and canonical content.").waitFor();
  await page.reload();
  await page.getByTestId("studio-field-rules-v2").waitFor();
  await page.getByRole("button", { name: "Edit content", exact: true }).click();
  assert(await page.getByLabel("Headline", { exact: true }).inputValue() === "Edited", "Reload keeps canonical text.");
  assert(await page.getByLabel("Amount", { exact: true }).inputValue() === "125", "Reload retains numeric canonical content, not currency text.");
  await page.getByText(/Current placement: crop/).waitFor();
  await page.getByText("2 / 3 rendered lines · valid", { exact: true }).waitFor();
  await ready(); await page.screenshot({ path: resolve(output, "studio-workspace.png") });
  checks.push("Save/reload of rules/order/content/Crop; fresh renderer evidence");

  await page.getByLabel("Reimport selected template source").setInputFiles(file(packageValue));
  await page.getByRole("button", { name: "Apply reviewed reimport", exact: true }).click();
  assert(await page.getByLabel("Amount", { exact: true }).inputValue() === "125", "Reimport retains canonical Number.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Saved portable configuration and canonical content.").waitFor();
  checks.push("Studio review-first reimport retains authored rules and canonical values");

  // Persisted finite invalid Crop is repairable content, not a broken record.
  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("template-package-platform");
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const transaction = database.transaction("templates", "readwrite");
      const store = transaction.objectStore("templates");
      const request = store.getAll();
      request.onsuccess = () => {
        const record = request.result.find((record) => record.contentState?.values?.["image:hero"] && !record.studio?.role);
        if (!record) { transaction.abort(); return; }
        record.contentState.values["image:hero"].value.placement = { mode: "crop", crop: { schemaVersion: "normalized-image-crop-v1", coordinateSpace: "normalized-slot-to-normalized-source", transform: [[0, 0, 0], [0, 0, 0]] } };
        store.put(record);
      };
      transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(new Error("Crop repair fixture unavailable"));
    });
    database.close();
  });
  await page.goto(url);
  await page.locator('.studio-existing-grid article').filter({ hasText: 'Seven field proof' }).getByRole("button", { name: "Open", exact: true }).click();
  await page.getByRole("button", { name: "Edit content", exact: true }).click();
  await page.getByText(/Preview unavailable/).waitFor();
  await page.getByText(/Crop transform must be invertible/).first().waitFor();
  await page.getByText(/Current placement: crop/).waitFor();
  assert(await page.getByRole("button", { name: "Export PNG", exact: true }).isDisabled(), "Persisted invalid Crop blocks PNG.");
  await page.getByRole("button", { name: "Reset Hero", exact: true }).click();
  await page.getByText(/Current placement: imported/).waitFor();
  await ready();
  checks.push("Closure: invalid persisted Crop opens for repair, remains Crop/export-blocking, corrects and resets");

  await page.goto(url);
  const familySources = ["Square", "Portrait", "Landscape"].map((name, index) => {
    const source = structuredClone(packageValue); source.name = name; source.packageId += `-${name}`;
    source.editableFields.find((field) => field.id === "textarea:body").configuration = { maxLines: index === 1 ? 1 : 3, warningAtLines: 2 };
    if (index === 1) source.editableFields.find((field) => field.id === "textarea:body").configuration.warningAtLines = 1;
    return file(source, `${name}.json`);
  });
  await createThroughSetup(familySources, "Square", true);
  await select("Headline"); await page.getByLabel("Maximum characters", { exact: true }).fill("80"); await apply();
  await select("Hero"); await page.locator('input[name^="replacement-placement-"][value="crop"]').check(); await apply();
  await page.getByRole("button", { name: "Edit content", exact: true }).click();
  await page.getByLabel("Body", { exact: true }).fill("One\nTwo");
  await page.getByText("2 / 3 rendered lines · valid", { exact: true }).waitFor();
  await page.getByLabel("Replace Hero").setInputFiles({ name: "host.png", mimeType: "image/png", buffer: png });
  await page.getByText(/Current placement: fill/).waitFor();
  await page.getByLabel("Headline", { exact: true }).fill("Flushed before Family switch");
  await page.getByLabel("Selected variant").selectOption({ label: "Portrait" });
  await page.getByText("2 / 1 rendered lines · invalid", { exact: true }).waitFor();
  assert(await page.getByLabel("Headline", { exact: true }).inputValue() === "Flushed before Family switch", "A pending edit flushes before the Family variant changes.");
  await waitInput(page.getByLabel("Body", { exact: true }), "One\nTwo");
  assert(await page.getByLabel("Body", { exact: true }).inputValue() === "One\nTwo", "Family switching retains shared canonical text.");
  await page.getByLabel("Amount", { exact: true }).fill("-");
  await page.getByLabel("Selected variant").selectOption({ label: "Landscape" });
  assert(await page.getByLabel("Selected variant").locator("option:checked").textContent() === "Portrait", "An invalid literal draft blocks a Family variant switch.");
  assert(await page.getByLabel("Amount", { exact: true }).inputValue() === "-", "An invalid literal remains visible after a blocked switch.");
  await page.getByLabel("Amount", { exact: true }).fill("25");
  await page.getByLabel("Framing scope").selectOption("variant");
  await page.getByLabel("Crop width").fill("0.5"); await page.getByLabel("Crop height").fill("0.5");
  await page.getByRole("button", { name: "Apply Crop", exact: true }).click();
  await page.getByText("Variant override: crop", { exact: true }).waitFor();
  await page.getByLabel("Selected variant").selectOption({ label: "Landscape" });
  await page.getByText(/Current placement: fill/).waitFor();
  await page.getByLabel("Selected variant").selectOption({ label: "Portrait" });
  await page.getByText("Variant override: crop", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Configure fields", exact: true }).click();
  await page.getByLabel("Configuration scope").selectOption("variant"); await select("Body");
  await page.getByRole("textbox",{name:"Maximum rendered lines",exact:true}).fill("2"); await apply();
  await page.getByRole("button", { name: "Edit content", exact: true }).click();
  await page.getByText("2 / 2 rendered lines · valid", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Save", exact: true }).click(); await page.getByText("Saved portable configuration and canonical content.").waitFor();
  await page.reload(); await page.getByTestId("studio-field-rules-v2").waitFor();
  await page.getByRole("button", { name: "Edit content", exact: true }).click();
  await page.getByText("Variant override: crop", { exact: true }).waitFor();
  await page.getByText("2 / 2 rendered lines · valid", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Reset variant placement", exact: true }).click();
  await page.getByText("Inheriting shared/default placement", { exact: true }).waitFor();
  await page.getByText(/Current placement: fill/).waitFor();
  await page.getByRole("button", { name: "Save", exact: true }).click(); await page.getByText("Saved portable configuration and canonical content.").waitFor();
  checks.push("Family common/sparse configuration, selected-variant valid/invalid text, independent Crop/reset, V3 reload");

  // Independent host uses the identical serialized package, with custom palette.
  await page.goto(`${url}__field-host`);
  const hostPackage = structuredClone(packageValue);
  hostPackage.editableFields.find((field) => field.id === "image:hero").configuration = { replacementPlacement: "crop" };
  await page.getByLabel("Load V2 JSON or exporter ZIP").setInputFiles(file(hostPackage));
  await page.getByRole("button", { name: "Open template", exact: true }).click();
  await page.getByRole("button", { name: "#ff6644", exact: true }).click();
  await page.getByLabel("Headline", { exact: true }).fill("Host edited");
  await page.getByLabel("Amount", { exact: true }).fill("125");
  await page.getByLabel("Date", { exact: true }).fill("2026-12-05");
  await page.getByLabel("Replace Hero").setInputFiles({ name: "host.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Host center Crop", exact: true }).click();
  await page.getByLabel("Show body", { exact: true }).uncheck();
  assert(await page.locator('[data-host-field="text:headline"]').count() === 0, "The external React host omits descendant controls below a false Boolean target.");
  await page.getByLabel("Show body", { exact: true }).check();
  assert(await page.locator('[data-host-field="text:headline"]').count() === 1, "The external React host restores descendant controls when the Boolean target is enabled.");
  await ready();
  const hostDownload = page.waitForEvent("download"); await page.getByRole("button", { name: "Export PNG", exact: true }).click();
  await (await hostDownload).saveAs(resolve(output, "external-host.png"));
  const ids = await page.locator("[data-host-field]").evaluateAll((elements) => elements.map((element) => element.dataset.hostField));
  assert(JSON.stringify(ids) === JSON.stringify(packageValue.editableFieldOrder), "Host descriptors must follow portable order.");
  checks.push("Independent public host: ordered descriptors, custom brand role, Number/Date, host Crop, PNG");
  assert(errors.length === 0, `Unexpected browser errors: ${errors.join("\n")}`);
  await writeFile(resolve(output, "report.json"), JSON.stringify({ status: "pass", certification: "product integration; no source promotion", checks, errors }, null, 2));
  console.log(JSON.stringify({ status: "pass", checks, output }, null, 2));
} catch (error) {
  await page.screenshot({ path: resolve(output, "failure.png") });
  await writeFile(resolve(output, "failure.json"), JSON.stringify({ error: String(error), errors, checks, text: await page.locator("body").innerText(), telemetry: await page.locator("[data-template-package-canvas], [data-text-measurement-state], [data-package-node-id]").evaluateAll((elements) => elements.map((element) => ({ ...element.dataset }))) }, null, 2));
  throw error;
} finally { await context.close(); await browser.close(); await server.close(); }

// Keep output-limit and Family-default regressions in the standard rule gate.
await import("./audit-regressions.mjs");

await import("./architecture-audit.mjs");
await import("./renderer-transactions.mjs");

// Choices/configuration and restricted repair are required field-rule regressions.
await import("./choices-audit.mjs");

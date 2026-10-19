import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizeTemplatePackageV1ToV2 } from "@sleinity/template-core";
import { createTemplateFieldFamilyFromSourcesV2 } from "@sleinity/template-browser/importer";
import { createStudioViteServer } from "../repository/studio-vite-server.mjs";
import { launchBrowser } from "../fidelity/browser.mjs";

async function waitInput(input, value) {
  await input.page().waitForFunction(([element, expected]) => element?.isConnected && element.value === expected, [await input.elementHandle(), value]);
}

// Isolated product integration coverage; no user records or approved pixels.
const output = resolve("fidelity/evidence/field-rules-audit-20261019");
await mkdir(output, { recursive: true });
const source = JSON.parse(await readFile("src/template-package/fixtures/figma-plugin-v0.4.1.json", "utf8"));
const pkg = normalizeTemplatePackageV1ToV2(source).package;
pkg.fontRequirements = [];
for (const node of Object.values(pkg.nodes)) if (node.type === "TEXT") node.text.fontFamily = "sans-serif";
pkg.editableFields = [
  { id: "text:title", type: "text", label: "Title", binding: { kind: "text-characters", nodeId: "58:76" }, defaultValue: "Hi", configuration: { maxCharacters: 5 } },
  { id: "textarea:body", type: "textarea", label: "Body", binding: { kind: "text-characters", nodeId: "58:60" }, defaultValue: "Body", configuration: { maxCharacters: 40, maxLines: 2 } },
  { id: "image:hero", type: "image", label: "Hero", binding: { kind: "image-content", nodeId: "58:61" }, defaultValue: { assetId: pkg.nodes["58:61"].image.assetId, placement: { mode: "imported" } }, configuration: { replacementPlacement: "fill" } },
  { id: "textarea:hug", type: "textarea", label: "Auto width", binding: { kind: "text-characters", nodeId: "58:57" }, defaultValue: "Hi", configuration: { maxLines: 1 } },
  { id: "boolean:visible", type: "boolean", label: "Show body", binding: { kind: "structural-visibility", nodeId: "58:60" }, defaultValue: true, configuration: {} },
];
pkg.editableFieldOrder = pkg.editableFields.map(field => field.id);
const second = structuredClone(pkg); second.packageId += "-portrait"; second.name = "Portrait";
second.editableFields.find(field => field.type === "textarea").configuration.maxLines = 1;
second.editableFields.find(field => field.type === "text").configuration.maxCharacters = 3;
const familyValue = createTemplateFieldFamilyFromSourcesV2([pkg, second], "Audit Family");
const server = await createStudioViteServer();
await server.listen();
const browser = await launchBrowser(false);
const reports = [];
try {
  for (const family of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.setDefaultTimeout(20000);
    try {
      await page.goto(server.resolvedUrls.local[0]);
      const key = await page.evaluate(async ({ pkg, family, familyValue }) => {
        const { studioRecords: records, studioEntityKey, studioLocator } = await import("/src/workspace/studioRecords.ts");
        const seed = family ? { id: "audit-family", name: "Audit Family", family: familyValue } : { id: "audit-single", name: "Audit Single" };
        const session = records.openSession(seed);
        session.load(family ? seed.family : pkg);
        const record = await records.saveTemplate(session, { name: seed.name });
        session.dispose();
        return studioEntityKey(studioLocator(record));
      }, { pkg, family, familyValue });
      await page.goto(server.resolvedUrls.local[0] + "templates/" + encodeURIComponent(key) + "/settings");
      await page.locator('[data-field-id="image:hero"] .field-rule-card__select').click();
      const imageCard = page.locator('[data-field-id="image:hero"]');
      assert.equal(await imageCard.locator(".ui-field__error").count(), 0, "Imported defaults must not report replacement errors");
      assert.equal(await imageCard.getByText("Needs attention", { exact: true }).count(), 0);
      await page.goto(server.resolvedUrls.local[0] + "templates/" + encodeURIComponent(key) + "/output");
      const title = page.getByLabel("Title", { exact: true });
      const body = page.getByLabel("Body", { exact: true });
      const exportButton = page.getByRole("button", { name: "Export PNG", exact: true });
      const ready = async () => {
        // Export may be enabled while local drafts await an explicit flush.
        // Observe the actual candidate reaching the mounted renderer as well.
        const expected = await body.inputValue();
        await page.waitForFunction(value => document.querySelector('[data-package-node-id="58:60"]')?.textContent === value, expected);
        await page.waitForFunction(() => [...document.querySelectorAll("button")].some(button => button.textContent === "Export PNG" && !button.disabled));
      };
      await ready();
      const autoWidth = page.getByLabel("Auto width", { exact: true });
      await autoWidth.fill("A considerably longer heading");
      await ready();
      await page.waitForFunction(() => document.querySelector('[data-package-node-id="58:57"]')?.textContent === "A considerably longer heading");
      assert.equal(await autoWidth.inputValue(), "A considerably longer heading", "Real Studio input accepts valid HUG-width content");
      await title.fill("👨‍👩‍👧‍👦éabc");
      await page.getByRole("status", { name: "5 of 5 characters, maximum reached" }).waitFor();
      await title.fill("👨‍👩‍👧‍👦éabcd");
      assert.equal(await title.inputValue(), "👨‍👩‍👧‍👦éabc", "Typing and paste count graphemes, not code units");
      await body.evaluate(input => {
        window.auditInputDurations = [];
        let start = 0;
        input.addEventListener("input", () => { start = performance.now(); });
        // Bubble past React's root listener before recording synchronous work.
        window.addEventListener("input", event => {
          if (event.target === input) window.auditInputDurations.push(performance.now() - start);
        });
      });
      await body.fill("One\nTwo");
      await page.getByText("Maximum of 2 rendered lines reached.", { exact: true }).waitFor();
      await ready();
      await body.fill("One\nTwo\nThree");
      await waitInput(body, "One\nTwo");
      assert.equal(await body.inputValue(), "One\nTwo", "Explicit newline overflow is rejected");
      await body.fill("W".repeat(35));
      await waitInput(body, "One\nTwo");
      assert.equal(await body.inputValue(), "One\nTwo", "Automatic wrapping cannot bypass maxLines below maxCharacters");
      await body.dispatchEvent("compositionstart");
      await body.fill("One\nTwo\nThree");
      await waitInput(body, "One\nTwo\nThree");
      assert.equal(await body.inputValue(), "One\nTwo\nThree", "IME composition remains literal until completion");
      await body.dispatchEvent("compositionend", { data: "Three" });
      await waitInput(body, "One\nTwo");
      assert.equal(await body.inputValue(), "One\nTwo", "Completed composition obeys the line maximum");
      await page.getByText("Maximum of 2 rendered lines reached.", { exact: true }).waitFor();
      await ready();
      await body.fill("Alpha\nBeta");
      await body.dispatchEvent("compositionstart");
      await body.fill("Alpha\nBeta\nGamma");
      await body.dispatchEvent("compositionend", { data: "Gamma" });
      await waitInput(body, "Alpha\nBeta");
      assert.equal(await body.inputValue(), "Alpha\nBeta", "Rejected IME preserves an earlier uncommitted draft");
      await ready();
      if (family) {
        const selector = page.getByLabel("Design", { exact: true });
        const choices = await selector.locator("option").evaluateAll(options => options.map(option => option.value));
        await selector.selectOption(choices[1]);
        await page.getByText("This value exceeds the 3-character maximum. Shorten it to continue.", { exact: true }).waitFor();
        await waitInput(body, "Alpha\nBeta");
        assert.equal(await body.inputValue(), "Alpha\nBeta", "A stricter design does not truncate shared content");
        assert.equal(await title.inputValue(), "👨‍👩‍👧‍👦éabc", "A stricter character rule preserves shared text");
        await title.fill("Hey");
        // Canonical character errors prevent a painted preview until repaired;
        // visual-line evidence is meaningful only after that repair.
        await page.getByText("Rendered content exceeds 1 visual lines.", { exact: true }).waitFor();
        await title.fill("Four");
        assert.equal(await title.inputValue(), "Hey", "Per-design character maxima are enforced");
        assert.equal(await exportButton.isEnabled(), false, "Real cross-design overflow blocks export");
        await body.fill("One"); await ready();
        await body.fill("One\nTwo");
        await waitInput(body, "One");
        assert.equal(await body.inputValue(), "One", "The selected design's override governs input");
        await selector.selectOption(choices[0]); await ready();
        await body.fill("One\nTwo"); await ready();
      }
      await page.getByLabel("Show body", { exact: true }).uncheck();
      await body.fill("One\nTwo\nThree");
      await waitInput(body, "One\nTwo\nThree");
      assert.equal(await body.inputValue(), "One\nTwo\nThree", "Inactive text does not use a visual-line restriction");
      await page.getByLabel("Show body", { exact: true }).check();
      await page.getByText("Rendered content exceeds 2 visual lines.", { exact: true }).waitFor();
      await body.fill("One\nTwo"); await ready();
      await page.screenshot({ path: resolve(output, family ? "family.png" : "single.png"), fullPage: true });
      const measuredDurations = await page.evaluate(() => window.auditInputDurations);
      const download = page.waitForEvent("download");
      await exportButton.click();
      await (await download).saveAs(resolve(output, family ? "family-output.png" : "single-output.png"));
      await page.getByRole("heading", { name: "Library", exact: true }).waitFor();
      assert.deepEqual(errors, []);
      const inputDurations = measuredDurations;
      inputDurations.sort((left, right) => left - right);
      const typing = { samples: inputDurations.length, p50Ms: inputDurations[Math.floor(inputDurations.length * .5)], p95Ms: inputDurations[Math.min(inputDurations.length - 1, Math.floor(inputDurations.length * .95))] };
      reports.push({ family, passed: true, typing, scenarios: ["imported image defaults", "grapheme maximum", "newline and wrapped-line maximum", "IME rejection and rollback", "inactive fields", "existing overflow repair", "PNG and recovery completion", ...(family ? ["stricter selected design", "shared content preservation"] : [])] });
    } catch (error) {
      await page.screenshot({ path: resolve(output, family ? "family-failure.png" : "single-failure.png"), fullPage: true });
      await writeFile(resolve(output, "failure.txt"), `${error.stack}\n${await page.locator("body").innerText()}`);
      throw error;
    } finally { await context.close(); }
  }
  await writeFile(resolve(output, "report.json"), JSON.stringify({ browser: browser.version(), reports }, null, 2) + "\n");
  console.log(JSON.stringify(reports));
} finally { await browser.close(); await server.close(); }

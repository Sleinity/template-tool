import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizeTemplatePackageV1ToV2 } from "@sleinity/template-core";
import { createTemplateFieldFamilyFromSourcesV2 } from "@sleinity/template-browser/importer";
import { createStudioViteServer } from "../repository/studio-vite-server.mjs";
import { launchBrowser } from "../fidelity/browser.mjs";

const out = resolve("fidelity/evidence/field-rule-renderer-fixes-20261019");
await mkdir(out, { recursive: true });
const pkg = normalizeTemplatePackageV1ToV2(JSON.parse(await readFile("src/template-package/fixtures/figma-plugin-v0.4.1.json", "utf8"))).package;
pkg.fontRequirements = [];
for (const n of Object.values(pkg.nodes)) if (n.type === "TEXT") n.text.fontFamily = "sans-serif";
pkg.editableFields = [
  { id: "textarea:body", type: "textarea", label: "Body", binding: { kind: "text-characters", nodeId: "58:60" }, defaultValue: "Body", configuration: { maxLines: 2 } },
  { id: "boolean:visible", type: "boolean", label: "Show body", binding: { kind: "structural-visibility", nodeId: "58:60" }, defaultValue: true, configuration: {} },
];
pkg.editableFieldOrder = pkg.editableFields.map(f => f.id);
const other = structuredClone(pkg); other.packageId += "-second";
const familyValue = createTemplateFieldFamilyFromSourcesV2([pkg, other], "Transaction audit");
const server = await createStudioViteServer(); await server.listen();
const browser = await launchBrowser(false);
const reports = [];
try {
  for (const family of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    page.on("dialog", dialog => void dialog.accept());
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    try {
      await page.goto(server.resolvedUrls.local[0]);
      const record = await page.evaluate(async ({ pkg, family, familyValue }) => {
        const { studioRecords: records } = await import("/src/workspace/studioRecords.ts");
        const session = records.openSession({ id: "transactions", name: "Transaction audit", ...(family ? { family: familyValue } : {}) });
        session.load(family ? familyValue : pkg);
        const record = await records.saveTemplate(session, { name: "Transaction audit" }); session.dispose(); return record;
      }, { pkg, family, familyValue });
      await page.reload();
      await page.evaluate(async () => {
        // Test-only interception of the ordinary publisher, not a replacement
        // renderer: hold real evidence while observing persistence boundaries.
        const { studioRecords: records } = await import("/src/workspace/studioRecords.ts");
        const open = records.openSession;
        window.transactionAudit = { hold: false, latest: null, session: null, writes: [] };
        const save = records.recovery.save.bind(records.recovery);
        records.recovery.save = async (lease, record) => { window.transactionAudit.writes.push(structuredClone(record.contentState)); return save(lease, record); };
        records.openSession = (...args) => {
          const session = open(...args); const publish = session.publishFieldLayoutEvidence.bind(session);
          window.transactionAudit.session = session;
          window.transactionAudit.release = () => { window.transactionAudit.hold = false; if (window.transactionAudit.latest) publish(window.transactionAudit.latest); };
          session.publishFieldLayoutEvidence = evidence => {
            if (window.transactionAudit.hold && evidence.fieldId === "textarea:body") { window.transactionAudit.latest = evidence; return false; }
            return publish(evidence);
          };
          return session;
        };
      });
      await page.getByRole("button", { name: "Create output", exact: true }).click();
      const body = page.getByLabel("Body", { exact: true }); await body.waitFor();
      await page.waitForFunction(() => window.transactionAudit.session?.getSnapshot().readiness.exportReady);
      await page.evaluate(() => { window.transactionAudit.hold = true; });
      await body.fill("One\nTwo\nThree");
      await page.waitForFunction(() => window.transactionAudit.session.getSnapshot().contentState.values["textarea:body"]?.value === "One\nTwo\nThree");
      // Exercise the real 650ms autosave deadline; this delay is a negative
      // persistence assertion, never readiness or line-validation evidence.
      await page.waitForTimeout(850);
      assert.equal(await page.evaluate(() => window.transactionAudit.writes.some(state => state.values["textarea:body"]?.value === "One\nTwo\nThree")), false, "Provisional overflow never reaches recovery.save");
      await page.getByLabel("Show body", { exact: true }).click();
      assert.equal(await page.evaluate(() => window.transactionAudit.session.getSnapshot().fields.find(f => f.descriptor.id === "boolean:visible").value), true, "Concurrent visibility mutation waits behind real line validation");
      await page.evaluate(() => window.transactionAudit.release());
      await page.waitForFunction(() => {
        const s = window.transactionAudit.session.getSnapshot();
        return s.fields.find(f => f.descriptor.id === "textarea:body").value === "Body" && s.fields.find(f => f.descriptor.id === "boolean:visible").value === false && s.readiness.exportReady;
      });
      assert.equal(await body.inputValue(), "Body");
      assert.equal(await page.getByText("Check input", { exact: true }).count(), 0, "Restored value does not leave false invalid input");
      await page.getByLabel("Show body", { exact: true }).check();
      if (family) {
        await page.waitForFunction(() => window.transactionAudit.session.getSnapshot().readiness.exportReady);
        await page.evaluate(() => { window.transactionAudit.hold = true; });
        await body.fill("One\nTwo\nThree");
        await page.waitForFunction(() => window.transactionAudit.session.getSnapshot().contentState.values["textarea:body"]?.value === "One\nTwo\nThree");
        const selected = await page.evaluate(() => window.transactionAudit.session.getSnapshot().selectedVariantId);
        await page.getByLabel("Design", { exact: true }).selectOption({ index: 1 });
        assert.equal(await page.evaluate(() => window.transactionAudit.session.getSnapshot().selectedVariantId), selected, "Family switch drains an active candidate before changing context");
        await page.evaluate(() => window.transactionAudit.release());
        await page.waitForFunction(previous => window.transactionAudit.session.getSnapshot().selectedVariantId !== previous && window.transactionAudit.session.getSnapshot().readiness.exportReady, selected);
        assert.equal(await body.inputValue(), "Body", "Rejected shared content is not carried into the next design");
      }
      const locator = { kind: family ? "family" : "single", templateId: record.id };
      await page.waitForFunction(async locator => {
        const r = await (await import("/src/workspace/studioRecords.ts")).studioRecords.recovery.inspect(locator);
        return r?.payload.contentState.values["boolean:visible"]?.value === true && !r.payload.contentState.values["textarea:body"];
      }, locator);
      await page.evaluate(() => { window.transactionAudit.hold = true; });
      await body.fill("Unvalidated candidate");
      await page.waitForFunction(() => window.transactionAudit.session.getSnapshot().contentState.values["textarea:body"]?.value === "Unvalidated candidate");
      await page.reload();
      await body.waitFor();
      assert.equal(await body.inputValue(), "Body", "Reload resumes accepted recovery, not the candidate that lost its evidence");
      await body.fill("One\nTwo");
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Export PNG", exact: true }).click();
      await (await download).saveAs(resolve(out, family ? "family.png" : "single.png"));
      await page.getByRole("heading", { name: "Library", exact: true }).waitFor();
      assert.deepEqual(errors, []);
      reports.push({ family, passed: true, checks: ["slow painted evidence suppresses provisional autosave", "visibility queues after text", "rollback preserves imported default", "restored candidate clears input error", "reload during validation keeps accepted recovery", "PNG drains validation", ...(family ? ["Family switch waits for rollback"] : [])] });
    } catch (error) {
      await page.screenshot({ path: resolve(out, family ? "family-failure.png" : "single-failure.png"), fullPage: true });
      await writeFile(resolve(out, "failure.txt"), `${error.stack}\n${await page.locator("body").innerText()}`); throw error;
    } finally { await context.close(); }
  }
  await writeFile(resolve(out, "transactions.json"), JSON.stringify({ browser: browser.version(), reports }, null, 2) + "\n");
  console.log(JSON.stringify(reports));
} finally { await browser.close(); await server.close(); }

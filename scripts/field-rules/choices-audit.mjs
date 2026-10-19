import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { normalizeTemplatePackageV1ToV2 } from "@sleinity/template-core";
import { createStudioViteServer } from "../repository/studio-vite-server.mjs";
import { launchBrowser } from "../fidelity/browser.mjs";

// Regression gate. Isolated browser storage; real Studio/native/Core source and
// ordinary renderer. System font fixture is not pixel/source certification.
const root = process.cwd(), out = resolve("fidelity/evidence/choices-renderer-fixes-20261019");
await mkdir(out, { recursive: true });
const pkg = normalizeTemplatePackageV1ToV2(JSON.parse(await readFile("src/template-package/fixtures/figma-plugin-v0.4.1.json", "utf8"))).package;
pkg.name = "Choices audit"; pkg.fontRequirements = [];
for (const node of Object.values(pkg.nodes)) if (node.type === "TEXT") {
  node.text.fontFamily = "sans-serif";
  if (node.extensions?.figma?.style) node.extensions.figma.style.fontFamily = "sans-serif";
}
pkg.nodes[pkg.rootNodeId].appearance.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true, blendMode: "NORMAL" }];
const choices = (options, mode = "suggested") => ({ mode, options: options.map(([id, value]) => ({ id, value })) });
pkg.editableFields = [
  { id: "text:title", type: "text", label: "Title", binding: { kind: "text-characters", nodeId: "58:57" }, defaultValue: "Alpha", configuration: { maxCharacters: 80, warningAtCharacters: 3, choices: choices([["primary", "Alpha"], ["alternate", "Beta"]]) } },
  { id: "textarea:body", type: "textarea", label: "Body", binding: { kind: "text-characters", nodeId: "58:60" }, defaultValue: "Body", configuration: { maxCharacters: 1000, maxLines: 2, choices: choices([["safe", "One\nTwo"], ["overflow", "One\nTwo\nThree"]]) } },
  { id: "number:amount", type: "number", label: "Amount", binding: { kind: "text-characters", nodeId: "58:76" }, defaultValue: 10, configuration: { min: 0, max: 100, step: 0.5, format: { schemaVersion: "number-display-v1", prefix: "$", decimalPlaces: 2 }, choices: choices([["default", 10], ["alternate", 12.5], ["zero", 0]]) } },
  { id: "date:date", type: "date", label: "Date", binding: { kind: "text-characters", nodeId: "58:79" }, defaultValue: "2026-11-04", configuration: { format: { schemaVersion: "date-display-v1", preset: "numeric-day-first" }, choices: choices([["default", "2026-11-04"], ["alternate", "2026-04-16"]]) } },
  { id: "color:brand", type: "color", label: "Brand", binding: { kind: "solid-fill-color", nodeId: pkg.rootNodeId, sourceIndex: 0 }, defaultValue: "#ffffff", configuration: { choices: choices([["default", "#ffffff"], ["alternate", "#aabbcc"]]) } },
];
pkg.editableFieldOrder = pkg.editableFields.map(f => f.id);
const server = await createStudioViteServer(); await server.listen();
const browser = await launchBrowser(false);
const reports = [], findings = [], errors = [];
const check = (scope, name, passed, details) => {
  reports.push({ scope, name, passed, ...(details === undefined ? {} : { details }) });
  assert.ok(passed, `${scope}: ${name}: ${JSON.stringify(details)}`);
};
async function install(page) {
  await page.evaluate(async () => {
    const { studioRecords: records } = await import("/src/workspace/studioRecords.ts");
    const open = records.openSession;
    window.choicesAudit = { session: null, writes: [], hold: false, latest: null };
    const save = records.recovery.save.bind(records.recovery);
    records.recovery.save = async (lease, record) => { window.choicesAudit.writes.push(structuredClone(record.contentState)); return save(lease, record); };
    records.openSession = (...args) => {
      const session = open(...args), publish = session.publishFieldLayoutEvidence.bind(session);
      window.choicesAudit.session = session;
      window.choicesAudit.release = () => { window.choicesAudit.hold = false; if (window.choicesAudit.latest) publish(window.choicesAudit.latest); };
      session.publishFieldLayoutEvidence = evidence => {
        if (window.choicesAudit.hold && evidence.fieldId === "textarea:body") { window.choicesAudit.latest = evidence; return false; }
        return publish(evidence);
      };
      return session;
    };
  });
}
async function seed(page, family, divergent = false) {
  return page.evaluate(async ({ pkg, family, divergent, root }) => {
    const { studioRecords: records } = await import("/src/workspace/studioRecords.ts");
    const assembly = await import(`/@fs${root}/packages/template-browser/src/import/templateSourceAssemblyV2.ts`);
    const a = structuredClone(pkg), b = structuredClone(pkg); b.packageId += "-second"; a.name = "Design A"; b.name = "Design B";
    if (divergent) for (const [p, value] of [[a, "Alpha"], [b, divergent === "unknown" ? "Alpha" : "Bravo"]]) {
      const f = p.editableFields[0]; f.defaultValue = value;
      f.configuration = { choices: { mode: "restricted", options: [{ id: divergent === "unknown" && p === b ? "replacement" : "primary", value }] } };
    }
    const value = family ? assembly.createTemplateFieldFamilyFromSourcesV2([a, b], divergent ? "Divergent choices" : "Choices audit") : a;
    const session = records.openSession({ id: "choices-seed", name: "Choices audit", ...(family ? { family: value } : {}) });
    session.load(value);
    const record = await records.saveTemplate(session, { name: divergent ? "Divergent choices" : "Choices audit" }); session.dispose(); return record;
  }, { pkg, family, divergent, root });
}
const ready = page => page.waitForFunction(() => window.choicesAudit.session?.getSnapshot().readiness.exportReady);
const entry = (page, id) => page.evaluate(id => window.choicesAudit.session.getSnapshot().contentState.values[id], id);
const waitEntry = (page, id, value, choiceId) => page.waitForFunction(({ id, value, choiceId }) => {
  const s = window.choicesAudit.session.getSnapshot(), e = s.contentState.values[id];
  return e?.value === value && e.selectedChoiceId === choiceId;
}, { id, value, choiceId });
try {
  // Native controllers and pure Core, with both persistence kinds.
  const nativePage = await browser.newPage(); await nativePage.goto(server.resolvedUrls.local[0]);
  const native = await nativePage.evaluate(async ({ root, pkg }) => {
    const core = await import(`/@fs${root}/packages/template-core/src/index.ts`);
    const single = await import(`/@fs${root}/packages/template-browser/src/session/templateSessionV2.ts`);
    const families = await import(`/@fs${root}/packages/template-browser/src/session/templateFieldFamilySessionV2.ts`);
    const assembly = await import(`/@fs${root}/packages/template-browser/src/import/templateSourceAssemblyV2.ts`);
    const { InMemoryTemplateSessionRepositoryV2 } = await import(`/@fs${root}/packages/template-browser/src/persistence/v2SessionRepositories.ts`);
    const checks = [], findings = [];
    const check = (scope, name, passed, details) => {
      checks.push({ scope, name, passed, ...(details === undefined ? {} : { details }) });
      if (!passed) throw new Error(`${scope}: ${name}: ${JSON.stringify(details)}`);
    };
    const b = structuredClone(pkg); b.packageId += "-b";
    for (const isFamily of [false, true]) {
      const scope = isFamily ? "native-family" : "native-single";
      const repository = new InMemoryTemplateSessionRepositoryV2();
      const make = () => isFamily ? families.createTemplateFieldFamilySessionV2({ repository }) : single.createTemplateSessionV2({ repository });
      const s = make(), source = isFamily ? assembly.createTemplateFieldFamilyFromSourcesV2([pkg, b], scope) : pkg;
      s.load(source);
      const controller = id => s.getFieldControllers().find(f => f.id === id);
      const snapshot = () => s.getSnapshot();
      const mat = () => isFamily ? snapshot().familyMaterialization.materialization : snapshot().materialization;
      for (const [id, option, expected] of [["text:title", "alternate", "Beta"], ["textarea:body", "safe", "One\nTwo"], ["number:amount", "alternate", 12.5], ["date:date", "alternate", "2026-04-16"], ["color:brand", "alternate", "#aabbcc"]]) {
        const result = controller(id).selectChoice(option), e = snapshot().contentState.values[id];
        check(scope, `typed canonical choice ${id}`, result.accepted && e.value === expected && e.selectedChoiceId === option, e);
      }
      const working = mat().workingPackage;
      const paint = working.nodes[working.rootNodeId].appearance.fills[0].color;
      check(scope, "materializer applies canonical text and formatted Number/Date", working.nodes["58:57"].text.characters === "Beta" && working.nodes["58:60"].text.characters === "One\nTwo" && working.nodes["58:76"].text.characters === "$12.50" && working.nodes["58:79"].text.characters === "16/04/2026");
      check(scope, "Color choice lowers to indexed RGB without changing alpha", paint.r === 170 / 255 && paint.g === 187 / 255 && paint.b === 204 / 255 && paint.a === 1, paint);
      let before = JSON.stringify(snapshot().contentState);
      const bad = controller("text:title").selectChoice("missing");
      check(scope, "unknown ID is atomic rejection", !bad.accepted && JSON.stringify(snapshot().contentState) === before);
      const selected = snapshot().fields.find(f => f.descriptor.id === "text:title");
      check(scope, "character warnings remain advisory", selected.warnings.length > 0 && selected.blockingErrors.length === 0);
      const saved = await s.save(); const restored = make(); await restored.loadSaved(saved.id);
      check(scope, "save/reload preserves canonical choices and provenance", JSON.stringify(restored.getSnapshot().contentState) === JSON.stringify(snapshot().contentState));
      check(scope, "runtime evidence is never restored as readiness", !restored.getSnapshot().readiness.exportReady);
      restored.dispose();
      const plan = isFamily ? s.planVariantReimport(pkg) : s.planReimport(pkg);
      check(scope, "reimport can retain authored choices", plan.canApply);
      if (isFamily) s.applyVariantReimport(plan); else s.applyReimport(plan);
      check(scope, "reimport retains canonical value and stable option identity", snapshot().contentState.values["text:title"].value === "Beta" && snapshot().contentState.values["text:title"].selectedChoiceId === "alternate");
      controller("number:amount").selectChoice("zero");
      let stale = false; try { if (isFamily) s.applyVariantReimport(plan); else s.applyReimport(plan); } catch { stale = true; }
      check(scope, "stale reimport plan cannot overwrite a newer choice", stale && snapshot().contentState.values["number:amount"].value === 0);
      const zeroRecord = await s.save(); const zeroReload = make(); await zeroReload.loadSaved(zeroRecord.id);
      check(scope, "zero choice round trips through native persistence", zeroReload.getSnapshot().contentState.values["number:amount"].value === 0 && zeroReload.getSnapshot().fields.find(f => f.descriptor.id === "number:amount").value === 0); zeroReload.dispose();
      check(scope, "literal matching an option clears provenance", controller("text:title").setValue("Beta").accepted && !snapshot().contentState.values["text:title"].selectedChoiceId);
      controller("text:title").selectChoice("primary");
      const title = isFamily ? snapshot().family.fields.find(f => f.id === "text:title") : snapshot().basePackage.editableFields.find(f => f.id === "text:title");
      const renamed = structuredClone(title); renamed.configuration.choices.options.reverse(); renamed.configuration.choices.options.find(o => o.id === "primary").label = "Renamed";
      s.configure({ fields: [renamed] });
      check(scope, "label/reorder retains choice value and ID", snapshot().contentState.values["text:title"].value === "Alpha" && snapshot().contentState.values["text:title"].selectedChoiceId === "primary");
      const changed = structuredClone(renamed); changed.configuration.choices.options.find(o => o.id === "primary").value = "Changed";
      s.configure({ fields: [changed] });
      check(scope, "selected option value edit reconciles canonical content", snapshot().contentState.values["text:title"].value === "Changed" && snapshot().contentState.values["text:title"].selectedChoiceId === "primary");
      changed.configuration.choices.options = changed.configuration.choices.options.filter(o => o.id !== "primary"); s.configure({ fields: [changed] });
      check(scope, "removing option keeps literal value and clears provenance", snapshot().contentState.values["text:title"].value === "Changed" && !snapshot().contentState.values["text:title"].selectedChoiceId);
      controller("text:title").reset();
      check(scope, "reset returns to imported default with no override", !snapshot().contentState.values["text:title"] && snapshot().fields.find(f => f.descriptor.id === "text:title").value === "Alpha");
      s.dispose();
    }
    const title = structuredClone(pkg.editableFields[0]); title.configuration.choices.mode = "restricted";
    for (const [name, value, selectedChoiceId, code] of [["restricted custom literal", "Other", undefined, "field-v2.restricted-choice"], ["mismatching ID/value", "Beta", "primary", "field-v2.choice-value-mismatch"], ["unknown provenance with matching value", "Alpha", "missing", "field-v2.choice-id-unknown"]]) {
      const result = core.validateTemplateFieldValueV2(title, value, { selectedChoiceId });
      check("core", name, !result.valid && result.issues.some(i => i.code === code), result.issues);
    }
    const duplicate = structuredClone(title); duplicate.configuration.choices.options.push({ id: "duplicate", value: "Alpha" });
    check("core", "duplicate canonical choice values are rejected", core.validateEditableFieldDefinitionSemanticsV2(duplicate).some(i => i.severity === "error"));
    const invalidOption = structuredClone(title); invalidOption.configuration.maxCharacters = 5; invalidOption.configuration.choices.options.push({ id: "oversize", value: "Too long" });
    check("core", "options obey ordinary hard character rules", core.validateEditableFieldDefinitionSemanticsV2(invalidOption).some(i => i.severity === "error"));
    const a = structuredClone(pkg), other = structuredClone(pkg); other.packageId += "-divergent";
    for (const [p, value] of [[a, "Alpha"], [other, "Bravo"]]) {
      p.editableFields[0].defaultValue = value;
      p.editableFields[0].configuration = { choices: { mode: "restricted", options: [{ id: "primary", value }] } };
    }
    const family = assembly.createTemplateFieldFamilyFromSourcesV2([a, other], "Divergent choices");
    const s = families.createTemplateFieldFamilySessionV2(); s.load(family);
    s.getFieldControllers().find(f => f.id === "text:title").selectChoice("primary");
    const beforeSwitch = structuredClone(s.getSnapshot().contentState);
    s.selectVariant(family.variants[1].id);
    const incompatible = s.getSnapshot(), field = incompatible.fields.find(f => f.descriptor.id === "text:title");
    check("native-family", "switch preserves shared value and exposes real mismatch", JSON.stringify(incompatible.contentState) === JSON.stringify(beforeSwitch) && field.value === "Alpha" && field.blockingErrors.some(i => i.code === "field-v2.choice-value-mismatch") && !incompatible.readiness.exportReady);
    const variant = incompatible.family.variants[1], beforeChoices = JSON.stringify(field.descriptor.configuration.choices);
    s.configure({ variants: [{ id: variant.id, fieldOverrides: structuredClone(variant.fieldOverrides), editableFieldOrder: [...incompatible.effectivePackage.editableFieldOrder].reverse() }] });
    const after = s.getSnapshot(), changedField = after.fields.find(f => f.descriptor.id === "text:title");
    const mutated = JSON.stringify(beforeSwitch.values) !== JSON.stringify(after.contentState.values);
    check("native-family", "C1: order-only configuration retains the incompatible shared entry and revision", after.contentState === incompatible.contentState && after.contentState.values["text:title"].value === "Alpha" && after.contentState.values["text:title"].selectedChoiceId === "primary");
    findings.push({ id: "C1", priority: "P1", name: "Design-only field-order update silently rewrites shared selected-choice content", reproduced: mutated && after.contentState.values["text:title"].value === "Bravo" && beforeChoices === JSON.stringify(changedField.descriptor.configuration.choices), details: { before: beforeSwitch, after: after.contentState, choicesUnchanged: beforeChoices === JSON.stringify(changedField.descriptor.configuration.choices), selectedVariantId: after.selectedVariantId } });
    s.selectVariant(family.variants[0].id);
    const returned = s.getSnapshot(), returnedField = returned.fields.find(f => f.descriptor.id === "text:title");
    check("native-family", "C1: original design retains its accepted choice after order-only configuration", returnedField.value === "Alpha" && returnedField.blockingErrors.length === 0 && returned.contentState === incompatible.contentState);
    findings[0].details.originalDesignAfterReturn = { value: returnedField.value, errors: returnedField.blockingErrors };
    s.dispose();
    return { checks, findings };
  }, { root, pkg });
  reports.push(...native.checks); findings.push(...native.findings); await nativePage.close();
  await writeFile(resolve(out, "native.json"), JSON.stringify(native, null, 2) + "\n");
  console.log(JSON.stringify({ nativeChecks: native.checks.length, findings: native.findings }));

  for (const family of [false, true]) {
    const scope = family ? "studio-family" : "studio-single";
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    page.on("pageerror", error => errors.push({ scope, message: error.message })); page.on("dialog", dialog => void dialog.accept());
    try {
      await page.goto(server.resolvedUrls.local[0]); const record = await seed(page, family); await page.reload(); await install(page);
      await page.getByRole("button", { name: "Create output", exact: true }).click(); await ready(page);
      check(scope, "matching imported default displays option without creating provenance", await page.getByLabel("Title choices", { exact: true }).inputValue() === "primary" && !await entry(page, "text:title"));
      for (const [label, id, value, text, nodeId] of [["Title", "text:title", "Beta", "Beta", "58:57"], ["Amount", "number:amount", 12.5, "$12.50", "58:76"], ["Date", "date:date", "2026-04-16", "16/04/2026", "58:79"], ["Brand", "color:brand", "#aabbcc", null, null]]) {
        await page.getByLabel(`${label} choices`, { exact: true }).selectOption("alternate"); await waitEntry(page, id, value, "alternate"); await ready(page);
        if (text) await page.waitForFunction(({ nodeId, text }) => [...document.querySelectorAll(`[data-package-node-id="${nodeId}"]`)].some(n => n.textContent === text), { nodeId, text });
        check(scope, `${label} choice reaches canonical controller and visible renderer`, true);
      }
      await page.getByLabel("Body choices", { exact: true }).selectOption("safe"); await waitEntry(page, "textarea:body", "One\nTwo", "safe"); await ready(page);
      const acceptedRevision = await page.evaluate(() => window.choicesAudit.session.getSnapshot().contentState.revision);
      await page.evaluate(() => { window.choicesAudit.hold = true; });
      await page.getByLabel("Body choices", { exact: true }).selectOption("overflow"); await waitEntry(page, "textarea:body", "One\nTwo\nThree", "overflow");
      // Negative assertion over the actual 650ms autosave deadline, not readiness.
      await page.waitForTimeout(850);
      check(scope, "overflow choice remains provisional and absent from recovery", !await page.evaluate(() => window.choicesAudit.writes.some(state => state.values["textarea:body"]?.selectedChoiceId === "overflow")));
      await page.evaluate(() => window.choicesAudit.release()); await waitEntry(page, "textarea:body", "One\nTwo", "safe"); await ready(page);
      check(scope, "painted overflow restores preceding choice and provenance at newer revision", (await page.getByLabel("Body choices", { exact: true }).inputValue()) === "safe" && await page.evaluate(rev => window.choicesAudit.session.getSnapshot().contentState.revision > rev + 1, acceptedRevision));
      check(scope, "restored choice leaves no false Check input", await page.getByText("Check input", { exact: true }).count() === 0);
      const title = page.getByLabel("Title", { exact: true }); await title.fill("Uncommitted custom draft");
      await page.getByLabel("Title choices", { exact: true }).selectOption("primary"); await waitEntry(page, "text:title", "Alpha", "primary");
      check(scope, "choice supersedes its own local draft", await title.inputValue() === "Alpha");
      await page.getByLabel("Amount", { exact: true }).fill("-");
      await page.getByLabel("Title choices", { exact: true }).selectOption("alternate"); await waitEntry(page, "text:title", "Beta", "alternate");
      check(scope, "choice does not overwrite another field's invalid draft", await page.getByLabel("Amount", { exact: true }).inputValue() === "-");
      await page.getByLabel("Amount choices", { exact: true }).selectOption("zero"); await waitEntry(page, "number:amount", 0, "zero"); await ready(page);
      check(scope, "choice repairs its own invalid numeric draft including zero", await page.getByLabel("Amount", { exact: true }).inputValue() === "0");
      if (family) {
        await page.getByLabel("Design", { exact: true }).selectOption({ index: 1 }); await ready(page);
        check(scope, "compatible design switch preserves shared choice provenance", (await entry(page, "text:title")).selectedChoiceId === "alternate" && (await entry(page, "textarea:body")).selectedChoiceId === "safe");
      }
      const locator = { kind: family ? "family" : "single", templateId: record.id };
      // Poll completed IndexedDB reads from Node; an unresolved browser Promise
      // must never be mistaken for a successful readiness predicate.
      let persisted = false; const persistDeadline = Date.now() + 20000;
      while (!persisted && Date.now() < persistDeadline) {
        persisted = await page.evaluate(async locator => {
          const r = await (await import("/src/workspace/studioRecords.ts")).studioRecords.recovery.inspect(locator);
          return r?.payload.contentState.values["number:amount"]?.value === 0 && r.payload.contentState.values["text:title"]?.selectedChoiceId === "alternate" && r.payload.contentState.values["textarea:body"]?.selectedChoiceId === "safe";
        }, locator);
        if (!persisted) await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      }
      check(scope, "accepted choice state reaches durable recovery", persisted);
      const beforeReload = await page.evaluate(async locator => ({ current: window.choicesAudit.session.getSnapshot().contentState, recovery: (await (await import("/src/workspace/studioRecords.ts")).studioRecords.recovery.inspect(locator))?.payload.contentState, writes: window.choicesAudit.writes }), locator);
      await writeFile(resolve(out, `${scope}-before-reload.json`), JSON.stringify(beforeReload, null, 2) + "\n");
      await page.reload(); await page.getByRole("button", { name: "Continue draft", exact: true }).waitFor(); await install(page); await page.getByRole("button", { name: "Continue draft", exact: true }).click(); await page.getByLabel("Body choices", { exact: true }).waitFor(); await ready(page);
      const afterReload = await page.evaluate(async locator => ({ current: window.choicesAudit.session.getSnapshot().contentState, recovery: (await (await import("/src/workspace/studioRecords.ts")).studioRecords.recovery.inspect(locator))?.payload.contentState }), locator);
      await writeFile(resolve(out, `${scope}-after-reload.json`), JSON.stringify(afterReload, null, 2) + "\n");
      console.log(JSON.stringify({ scope, before: beforeReload.current, persisted: beforeReload.recovery, restored: afterReload.current }));
      check(scope, "recovery restores accepted choices across all five types", JSON.stringify(afterReload.current) === JSON.stringify(beforeReload.current) && await page.getByLabel("Body choices", { exact: true }).inputValue() === "safe" && await page.getByLabel("Amount", { exact: true }).inputValue() === "0" && await page.getByLabel("Date", { exact: true }).inputValue() === "2026-04-16" && await page.getByLabel("Brand", { exact: true }).inputValue() === "#aabbcc");
      await page.screenshot({ path: resolve(out, `${scope}.png`), fullPage: true });
      const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Export PNG", exact: true }).click();
      const file = resolve(out, `${scope}-output.png`); await (await download).saveAs(file);
      const bytes = await readFile(file); check(scope, "guarded PNG produces a real PNG from accepted choice content", bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" && bytes.length > 1000, { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
    } catch (error) {
      await page.screenshot({ path: resolve(out, `${scope}-failure.png`), fullPage: true });
      await writeFile(resolve(out, "failure.txt"), `${error.stack}\n${await page.locator("body").innerText()}`); throw error;
    } finally { await context.close(); }
  }

  // Real restricted selects: both mismatching ID/value and unknown provenance
  // with a matching literal must expose repair instead of a false selection.
  for (const kind of ["mismatch", "unknown"]) {
    const scope = `studio-restricted-${kind}`;
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } }); const page = await context.newPage();
    page.setDefaultTimeout(20000); page.on("pageerror", error => errors.push({ scope, message: error.message }));
    try {
      await page.goto(server.resolvedUrls.local[0]); await seed(page, true, kind); await page.reload(); await install(page);
      await page.getByRole("button", { name: "Create output", exact: true }).click(); await ready(page);
      // Seed explicit provenance; only keyboard input performs the actual repair.
      await page.evaluate(() => window.choicesAudit.session.getFieldControllers().find(f => f.id === "text:title").selectChoice("primary")); await ready(page);
      await page.getByLabel("Design", { exact: true }).selectOption({ index: 1 });
      await page.waitForFunction(code => window.choicesAudit.session.getSnapshot().fields.find(f => f.descriptor.id === "text:title").blockingErrors.some(i => i.code === code), kind === "mismatch" ? "field-v2.choice-value-mismatch" : "field-v2.choice-id-unknown");
      const select = page.getByLabel("Title choices", { exact: true });
      const before = await entry(page, "text:title");
      check(scope, "invalid choice blocks PNG until corrected", !await page.evaluate(() => window.choicesAudit.session.getSnapshot().readiness.exportReady) && await page.getByRole("button", { name: "Export PNG", exact: true }).isDisabled());
      const displayed = await select.inputValue();
      const currentValueShown = (await page.locator('[role="alert"]').allTextContents()).some(text => text.includes("Current value: Alpha"));
      check(scope, "C2: incompatible provenance displays a placeholder and the actual canonical value", displayed === "" && currentValueShown && before.value === "Alpha" && before.selectedChoiceId === "primary");
      await page.screenshot({ path: resolve(out, `restricted-${kind}-repair.png`), fullPage: true });
      await select.evaluate(el => { window.choiceChangeCount = 0; el.addEventListener("change", () => { window.choiceChangeCount += 1; }); });
      // selectOption() dispatches change for an already selected value. Ordinary
      // type-ahead keyboard events prove the only option can actually be chosen.
      // Arrow navigation is inert in this headless macOS select implementation.
      await select.focus(); await select.press(kind === "mismatch" ? "b" : "a"); await select.press("Enter");
      const expectedValue = kind === "mismatch" ? "Bravo" : "Alpha", expectedId = kind === "mismatch" ? "primary" : "replacement";
      await waitEntry(page, "text:title", expectedValue, expectedId); await ready(page);
      const details = await page.evaluate(() => ({ entry: window.choicesAudit.session.getSnapshot().contentState.values["text:title"], events: window.choiceChangeCount, exportReady: window.choicesAudit.session.getSnapshot().readiness.exportReady, errors: window.choicesAudit.session.getSnapshot().fields.find(f => f.descriptor.id === "text:title").blockingErrors }));
      check(scope, "C2: keyboard selection commits the configured option and restores export readiness", details.events > 0 && details.entry.value === expectedValue && details.entry.selectedChoiceId === expectedId && details.exportReady && details.errors.length === 0, details);
      check(scope, "repaired control clears its current-value error", !(await page.locator('[role="alert"]').allTextContents()).some(text => text.includes("Current value:")));
      if (kind === "mismatch") findings.push({ id: "C2", priority: "P2", name: "Restricted dropdown shows ID-matched option instead of incompatible canonical value", reproduced: displayed !== "" || !currentValueShown, details: { before, displayed, currentValueShown, ...details } });
      await page.getByRole("button", { name: "Reset Title", exact: true }).click(); await ready(page);
      check(scope, "Reset restores the matching imported default without inventing provenance", !await entry(page, "text:title") && await select.inputValue() === expectedId);
    } catch (error) {
      await page.screenshot({ path: resolve(out, `${scope}-failure.png`), fullPage: true });
      await writeFile(resolve(out, "failure.txt"), `${error.stack}\n${await page.locator("body").innerText()}`); throw error;
    } finally { await context.close(); }
  }
  check("browser", "no uncaught page errors", errors.length === 0, errors);
  const report = { date: new Date().toISOString(), status: findings.some(f => f.reproduced) ? "gaps-found" : "passed", browser: browser.version(), scope: "Source-driven contract and Studio integration; system font; no pixel certification", checkpointCount: reports.length, passedCheckpointCount: reports.filter(r => r.passed).length, findings, checks: reports };
  await writeFile(resolve(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ status: report.status, checkpointCount: report.checkpointCount, findings: findings.map(({ id, priority, reproduced }) => ({ id, priority, reproduced })), report: resolve(out, "report.json") }));
  assert.equal(findings.filter(f => f.reproduced).length, 0, "Choice architecture gaps remain");
} finally { await browser.close(); await server.close(); }

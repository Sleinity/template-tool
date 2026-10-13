import { createHash } from "node:crypto";
import { readFile, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizeTemplatePackageV1ToV2 } from "@sleinity/template-core";
import { launchBrowser } from "../fidelity/browser.mjs";
import { createStudioViteServer } from "../repository/studio-vite-server.mjs";
const root = process.cwd();
const output = resolve(root, "fidelity/evidence/studio-phase-5-setup");
await mkdir(output, { recursive: true });
await Promise.all([rm(resolve(output, "failure.png"), { force: true }), rm(resolve(output, "failure.txt"), { force: true })]);
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
  { id: "textarea:body", type: "textarea", label: "Body", binding: { kind: "text-characters", nodeId: "58:60" }, defaultValue: "One\nTwo", configuration: {} },
  { id: "image:hero", type: "image", label: "Hero", binding: { kind: "image-content", nodeId: "58:61" }, defaultValue: { assetId: packageValue.nodes["58:61"].image.assetId, placement: { mode: "imported" } }, configuration: { replacementPlacement: "fill" } },
  { id: "color:color", type: "color", label: "Brand", controlRole: "brand-color", binding: { kind: "solid-fill-color", nodeId: packageValue.rootNodeId, sourceIndex: 0 }, defaultValue: "#ffffff", configuration: {} },
  { id: "number:amount", type: "number", label: "Amount", binding: { kind: "text-characters", nodeId: "58:76" }, defaultValue: 10, configuration: {} },
  { id: "date:date", type: "date", label: "Date", binding: { kind: "text-characters", nodeId: "58:79" }, defaultValue: "2026-11-04", configuration: {} },
  { id: "boolean:visible", type: "boolean", label: "Show body", binding: { kind: "structural-visibility", nodeId: "58:60" }, defaultValue: true, configuration: {} },
];
packageValue.editableFieldOrder = packageValue.editableFields.map((field) => field.id);
packageValue.referencePreview = { assetId: packageValue.nodes["58:61"].image.assetId, width: packageValue.canvas.width, height: packageValue.canvas.height };
const file = (value, name = "fields-v2.json") => ({ name, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(value)) });

const server = await createStudioViteServer();
await server.listen();
const browser = await launchBrowser(false);
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const checks = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const step = (name) => page.locator(".setup-navigation").getByRole("button", { name, exact: true }).click();
const apply = () => page.getByRole("button", { name: "Apply changes", exact: true }).click();
const expandField = async (name, controlLabel) => {
  const card = page.locator('.studio-field-rule-list').getByRole('button', { name, exact: true });
  if (await card.getAttribute('aria-expanded') === 'true') {
    await page.getByLabel(controlLabel, { exact: true }).waitFor();
    return;
  }
  await card.click();
  await page.getByLabel(controlLabel, { exact: true }).waitFor();
};
const allFields = async () => {
  const expanded = page.locator('.studio-field-rule-list .field-rule-card__select[aria-expanded="true"]');
  if (await expanded.count()) await expanded.click();
};
const openSettings = async (card = page.getByTestId('template-card').first()) => {
  await card.getByRole('button', { name: /Actions for/ }).click();
  await page.getByRole('menuitem', { name: 'Template Settings', exact: true }).click();
};
const screenshotPair = async (name) => {
  for (const [width, suffix] of [[1440, 'desktop'], [1200, 'medium'], [768, '768'], [600, 'narrow']]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => { const content = document.querySelector('.setup-flow__content'); if (content) content.scrollTop = 0; });
    await page.screenshot({ path: resolve(output, `${name}-${suffix}.png`), fullPage: true });
    if (name !== 'library') await assertWorkspaceFits(`${name} at ${width}px`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
};
const assertWorkspaceFits = async (label) => {
  const result = await page.evaluate(() => {
    const content = document.querySelector('.setup-flow__content');
    const footer = document.querySelector('.setup-flow__footer');
    return {
      documentFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      contentFits: !content || content.scrollWidth <= content.clientWidth,
      footerFits: !footer || footer.getBoundingClientRect().right <= window.innerWidth + 1,
    };
  });
  assert(result.documentFits && result.contentFits && result.footerFits, `${label} must fit the 768-pixel Studio workspace without clipped controls.`);
};
try {
  await page.goto(server.resolvedUrls.local[0]);
  await page.getByRole("button", { name: "Add template", exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.locator('.setup-package-dropzone').focus(); await page.keyboard.press('Enter');
  (await chooser).setFiles([]);
  assert(await page.locator('.setup-package-dropzone').getByText(/Choose ZIP files/i).isVisible(), 'The empty collection has one clear upload action.');
  await page.getByLabel("Import source packages").setInputFiles(file(packageValue));
  await screenshotPair('package');
  await page.setViewportSize({ width: 768, height: 900 }); await assertWorkspaceFits('Package'); await page.setViewportSize({ width: 1440, height: 900 });
  checks.push('V1 package dropzone supports keyboard selection and presents exporter ZIP language');
  await page.getByRole("button", { name: "Continue to fonts", exact: true }).click();
  assert(await page.getByLabel("Settings for").isVisible() === false, "Single source must not expose family scope.");
  await page.getByRole("button", { name: "Continue to checks", exact: true }).click();
  await page.setViewportSize({ width: 768, height: 900 }); await assertWorkspaceFits('Fonts'); await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Continue to fields", exact: true }).click();
  await expandField("Headline", "Maximum characters");
  const technicalTrigger = page.getByRole('button', {name:'Technical details',exact:true});
  assert((await technicalTrigger.boundingBox()).height <= 48, 'Technical trigger stays compact');
  await technicalTrigger.press('Enter');await page.getByRole('dialog',{name:'Technical details',exact:true}).waitFor();
  await page.keyboard.press('Escape');assert(await page.getByRole('dialog').count()===0,'Technical drawer closes from keyboard');
  const choicesToggle = page.getByRole('switch', { name: 'Choices', exact: true });
  await choicesToggle.focus(); await page.keyboard.press('Space');
  assert(await choicesToggle.getAttribute('aria-checked') === 'true', 'Choices enables from the keyboard.');
  assert(await page.getByLabel('Choice behavior', { exact: true }).isVisible(), 'Enabling Choices reveals its configuration.');
  await choicesToggle.focus(); await page.keyboard.press('Space');
  assert(await choicesToggle.getAttribute('aria-checked') === 'false', 'Choices disables from the keyboard.');
  assert(await page.getByLabel('Choice behavior', { exact: true }).count() === 0, 'Disabled Choices hides its configuration.');
  await page.getByLabel("Maximum characters", { exact: true }).fill("80");
  await page.getByLabel("Label", { exact: true }).fill("Accepted headline");
  await apply();
  assert(await page.getByRole('button', { name: 'Accepted headline', exact: true }).getAttribute('aria-expanded') === 'true', 'Apply keeps the configured field expanded.');
  assert(await page.locator('.studio-field-rule-list .field-rule-card__select[aria-expanded="true"]').count() === 1, 'The Fields list keeps exactly one accordion card open.');
  await page.getByLabel('Label', { exact: true }).fill('Unapplied headline');
  await page.locator('.studio-field-rule-list').getByRole('button', { name: 'Body', exact: true }).click();
  await page.getByRole('heading', { name: 'Unapplied field changes', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  assert(await page.getByRole('button', { name: 'Accepted headline', exact: true }).getAttribute('aria-expanded') === 'true', 'Staying in the guard preserves the open field draft.');
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  assert(await page.getByRole('button', { name: 'Accepted headline', exact: true }).getAttribute('aria-expanded') === 'true', 'Discard keeps the configured field expanded.');
  assert(await page.getByLabel('Label', { exact: true }).inputValue() === 'Accepted headline', 'Discard restores the accepted field values.');
  await expandField('Body', 'Maximum rendered lines');
  assert(await page.locator('.studio-field-rule-list .field-rule-card__select[aria-expanded="true"]').count() === 1, 'Opening another field closes the previous accordion card.');
  await expandField('Accepted headline', 'Maximum characters');
  await page.getByRole("button", { name: "Reorder options for Accepted headline", exact: true }).click();
  await page.getByRole("menuitem", { name: /^After .*position / }).click();
  assert((await page.locator('[aria-live="polite"]').allTextContents()).some((value) => value.includes('Accepted headline moved to position 2')), 'Accessible field reordering announces the accepted position.');
  assert(await page.locator('[data-field-reorder-key="text:headline"]').evaluate((node) => node === document.activeElement), 'Accessible field reordering restores focus to the moved field.');
  await step("Fonts"); await step("Checks"); await step("Fields");
  await expandField("Accepted headline", "Maximum characters");
  assert(await page.getByLabel("Maximum characters", { exact: true }).inputValue() === "80", "Navigation must preserve accepted rules.");
  await allFields();
  assert((await page.locator(".studio-field-rule-list .field-rule-card").first().textContent()).includes("Body"), "Navigation must preserve order.");
  checks.push("Five-step navigation preserves accepted label, rule and ordering; single-source controls stay simple");
  assert(await page.getByLabel('Search fields', { exact: true }).count() === 0, 'Fields does not expose search.');
  const fieldFilters = page.getByLabel('Field filters', { exact: true });
  const chooseType = async type => {
    const selector = page.getByLabel('Field type', {exact:true});
    if (await selector.isVisible()) await selector.selectOption(type.toLowerCase());
    else await fieldFilters.getByRole('button', {name:new RegExp('^'+type)}).click();
  };
  await chooseType('Image');
  assert(await page.locator('.studio-field-rule-list .field-rule-card').count() === 1 && (await page.locator('.studio-field-rule-list').innerText()).includes('Hero'), 'Type filtering shows only matching fields.');
  await chooseType('All');
  await expandField('Accepted headline', 'Maximum characters');
  await page.getByLabel('Label', { exact: true }).fill('Pending type filter');
  await chooseType('Image');
  await page.getByRole('heading', { name: 'Unapplied field changes', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  assert(await page.getByLabel('Label', { exact: true }).inputValue() === 'Pending type filter', 'Filtering cannot discard a local draft.');
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  checks.push('Field type filters retain canonical order and guard unapplied drafts; search is absent');

  await expandField("Accepted headline", "Maximum characters");
  await page.getByLabel("Maximum characters", { exact: true }).fill("-1");
  assert(await page.getByLabel("Maximum characters", { exact: true }).getAttribute("aria-invalid") === "true", "Invalid local drafts show the error beside its control.");
  assert(await page.getByRole("button", { name: "Apply changes", exact: true }).isDisabled(), "Invalid local drafts must disable Apply.");
  await page.getByLabel("Maximum characters", { exact: true }).fill("80");
  assert(await page.getByLabel("Maximum characters", { exact: true }).getAttribute("aria-invalid") === "false", "Correcting a local draft clears its inline error.");
  await allFields();
  checks.push("Invalid configuration stays local, disables Apply, and can be corrected without a canonical transaction");
  await step("Designs");
  const second = structuredClone(packageValue); second.name = "Portrait"; second.packageId += "-portrait";
  await page.getByLabel("Import source packages").setInputFiles(file(second, "portrait.json"));
  await page.locator('.studio-design-collection').waitFor();
  await page.getByLabel(`Design name for ${packageValue.name}`, { exact: true }).fill('Portrait'); await page.getByLabel(`Design name for ${packageValue.name}`, { exact: true }).press('Enter');
  assert(await page.getByRole('button', { name: 'Actions for Portrait · fields-v2.json', exact: true }).count() === 1 && await page.getByRole('button', { name: 'Actions for Portrait · portrait.json', exact: true }).count() === 1, 'Duplicate canonical labels are distinct in Family controls.');
  await page.getByLabel('Design name for Portrait · fields-v2.json', { exact: true }).fill(packageValue.name); await page.getByLabel('Design name for Portrait · fields-v2.json', { exact: true }).press('Enter');
  checks.push('Duplicate Family labels remain canonical while source-aware presentation labels distinguish controls');
  await page.getByLabel('Design name for Portrait', { exact: true }).fill('Cancelled rename'); await page.getByLabel('Design name for Portrait', { exact: true }).press('Escape');
  assert(await page.getByLabel('Design name for Portrait', { exact: true }).inputValue() === 'Portrait', 'Escape restores the accepted Family label.');
  await page.getByLabel('Design name for Portrait', { exact: true }).fill('Portrait renamed');
  await page.getByLabel('Design name for Portrait', { exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Actions for Portrait renamed', exact: true }).click(); await page.getByRole('menuitem', { name: 'Move earlier', exact: true }).click();
  assert(await page.locator('.studio-design-collection [data-design-row]').first().locator('.family-variant-row__name').inputValue() === 'Portrait renamed', 'Family reorder commits through the candidate session.');
  await page.getByRole('button', { name: 'Actions for Portrait renamed', exact: true }).click(); await page.getByRole('menuitem', { name: 'Move later', exact: true }).click();
  const replacement = structuredClone(second); replacement.name = 'Portrait replacement'; replacement.packageId += '-replacement';
  await page.getByRole('button', { name: 'Actions for Portrait renamed', exact: true }).click(); await page.getByRole('menuitem', { name: 'Replace design', exact: true }).click();
  await page.getByLabel('Replace source package').setInputFiles(file(replacement, 'portrait-replacement.json'));
  await page.getByRole('button', { name: `Actions for ${packageValue.name}`, exact: true }).click(); await page.getByRole('menuitem', { name: 'Replace design', exact: true }).click();
  assert(await page.getByRole('button', { name: 'Apply reviewed replacement', exact: true }).count() === 0, 'Changing replacement target clears the previous reviewed plan.');
  await page.getByRole('button', { name: 'Cancel replacement', exact: true }).click();
  await page.getByRole('button', { name: 'Actions for Portrait renamed', exact: true }).click(); await page.getByRole('menuitem', { name: 'Replace design', exact: true }).click();
  await page.getByLabel('Replace source package').setInputFiles(file(replacement, 'portrait-replacement.json'));
  await step('Fonts'); await step('Designs');
  assert(await page.getByRole('button', { name: 'Apply reviewed replacement', exact: true }).count() === 0, 'Leaving Designs invalidates an unapplied replacement review.');
  await page.getByLabel('Replace source package').setInputFiles(file(replacement, 'portrait-replacement.json'));
  await page.getByRole('button', { name: 'Apply reviewed replacement', exact: true }).click();
  checks.push('Replacement review is bound to its target, accepted session revision and Designs visit');
  const temporary = structuredClone(packageValue); temporary.name = 'Temporary variant'; temporary.packageId += '-temporary';
  temporary.editableFields = temporary.editableFields.filter((field) => field.id !== 'textarea:body'); temporary.editableFieldOrder = temporary.editableFieldOrder.filter((id) => id !== 'textarea:body');
  await page.getByLabel('Import source packages').setInputFiles(file(temporary, 'temporary.json'));
  await page.getByRole('button', { name: 'Actions for Temporary variant', exact: true }).waitFor();
  await page.getByLabel('Design name for Temporary variant', { exact: true }).focus(); await step('Fields');
  await expandField('Body', 'Maximum rendered lines'); await page.getByLabel('Settings for').selectOption('common');
  assert((await page.locator('[data-field-id="textarea:body"]').textContent()).includes('Used in 2 designs'), 'An absent Family field remains selectable and configurable at Common scope.');
  checks.push('Added sparse Family variants retain Common field configuration and explicit coverage');
  await step('Designs');
  await page.getByRole('button', { name: 'Actions for Temporary variant', exact: true }).click(); await page.getByRole('menuitem', { name: 'Delete design', exact: true }).click();
  await page.getByRole('button', { name: 'Actions for Temporary variant', exact: true }).click(); await page.getByRole('menuitem', { name: 'Confirm delete design', exact: true }).click();
  assert(await page.getByRole('button', { name: 'Actions for Temporary variant', exact: true }).count() === 0, 'Family remove publishes only after candidate validation.');
  checks.push('Family rename, reorder, replace and remove use rollback-safe candidate sessions');
  const selection = page.locator('.studio-family-selection');
  const zeroRows = await selection.locator('[data-design-row]').evaluateAll(rows => rows.map(row => {
    const identity = row.firstElementChild.getBoundingClientRect();
    const actions = row.lastElementChild.getBoundingClientRect();
    return { height: row.getBoundingClientRect().height, aligned: actions.top < identity.bottom && actions.bottom > identity.top };
  }));
  assert(zeroRows.every(row => row.aligned), 'Zero-selector actions stay on the identity row.');
  await screenshotPair('family-zero-selectors');
  await selection.getByRole('button', { name: 'Add design selector', exact: true }).click();
  await selection.getByLabel('New property name', { exact: true }).fill('Format');
  await selection.locator('.studio-design-collection__draft-heading').getByRole('button', { name: 'Add', exact: true }).click();
  const formatInputs = selection.locator('.studio-design-collection__assignment input[list]');
  await formatInputs.nth(0).fill('Landscape'); await formatInputs.nth(0).press('Tab');
  await formatInputs.nth(1).fill('Portrait'); await formatInputs.nth(1).press('Tab');
  const oneHeights = await selection.locator('[data-design-row]').evaluateAll(rows => rows.map(row => row.getBoundingClientRect().height));
  assert(oneHeights.every((height, index) => Math.abs(height - zeroRows[index].height) < 2), 'Adding the first selector preserves row height.');

  await selection.getByRole('button', { name: 'Add design selector', exact: true }).click();
  await selection.getByLabel('New property name', { exact: true }).fill('Audience');
  await selection.locator('.studio-design-collection__draft-heading').getByRole('button', { name: 'Add', exact: true }).click();
  const audienceInputs = selection.locator('.studio-design-collection__assignment input[list]');
  await audienceInputs.nth(1).fill('Everyone'); await audienceInputs.nth(1).press('Tab');
  await audienceInputs.nth(3).fill('Everyone'); await audienceInputs.nth(3).press('Tab');
  assert(await selection.locator('.studio-design-collection__assignment input[list]').count() === 4, 'The Family matrix reuses two property vocabularies across its design rows.');
  await selection.getByRole('button', { name: 'Preview', exact: true }).first().click();
  await page.getByRole('dialog').getByText('Inspect this design before continuing.', { exact: true }).waitFor();
  assert(await page.getByRole('dialog').locator('.studio-setup-canvas').count() === 1, 'The historical Preview action opens the established inspection drawer.');
  await page.getByRole('button', { name: 'Close details', exact: true }).click();
  const matrixGeometry = await selection.evaluate(root => {
    const header = root.querySelector('.studio-design-collection__header');
    const rows = [...root.querySelectorAll('[data-design-row]')];
    return rows.every(row => [...header.children].every((cell, i) => cell.classList.contains("ui-visually-hidden") || Math.abs(cell.getBoundingClientRect().x - row.children[i].getBoundingClientRect().x) < 2));
  });
  assert(matrixGeometry, 'Selector headings and row values share identical column tracks.');
  await screenshotPair('family-selection');
  for (const title of ['Market', 'Language', 'Campaign', 'Channel']) {
    await selection.getByRole('button', { name: 'Add design selector', exact: true }).click();
    await selection.getByLabel('New property name', { exact: true }).fill(title);
    await selection.locator('.studio-design-collection__draft-heading').getByRole('button', { name: 'Add', exact: true }).click();
    for (const input of await selection.locator(`input[aria-label^="${title} for "]`).all()) { await input.fill('Default'); await input.press('Tab'); }
  }
  const pinned = await selection.locator('.studio-design-scroll').evaluate(async list => {
    list.scrollLeft = 0;
    await new Promise(requestAnimationFrame);
    const cell = list.querySelector('[data-design-row] > :first-child');
    const start = cell.getBoundingClientRect().left;
    list.scrollLeft = list.scrollWidth;
    await new Promise(requestAnimationFrame);
    const result = { scrollable: list.scrollWidth > list.clientWidth, delta: Math.abs(cell.getBoundingClientRect().left - start) };
    list.scrollLeft = 0;
    return result;
  });
  assert(pinned.scrollable && pinned.delta < 2, `Many selectors scroll while the design identity remains pinned: ${JSON.stringify(pinned)}`);
  for (const width of [1440, 1200, 768, 600]) {
    await page.setViewportSize({ width, height: 900 });
    const lastInput = selection.locator('input[aria-label^="Channel for "]').last();
    await lastInput.fill('Reachable'); await lastInput.press('Tab');
    await selection.getByRole('button', { name: 'Actions for Portrait renamed', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Move earlier', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    const reach = await lastInput.boundingBox();
    const scroll = await selection.locator('.studio-design-scroll').boundingBox();
    assert(reach && scroll && reach.x >= scroll.x && reach.x + reach.width <= scroll.x + scroll.width + 1, `Final selector is reachable at ${width}px.`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await selection.locator('.studio-design-scroll').evaluate(list => { list.scrollLeft = 0; });
  await screenshotPair('family-six-selectors');
  checks.push('Six selector columns share row tracks and preserve a pinned design identity during horizontal scrolling');

  await page.setViewportSize({ width: 768, height: 900 }); await assertWorkspaceFits('Family selection');
  assert(await selection.getByText('Audience', { exact: true }).first().isVisible() && await selection.getByText('Format', { exact: true }).first().isVisible(), 'The constrained Family matrix retains its property headings.');
  await page.setViewportSize({ width: 1440, height: 900 });
  checks.push('Historical Family matrix uses user-defined reusable values, opens Preview in the inspection drawer, preserves assignments, and adapts at 768 pixels');
  await step("Fields");
  await expandField("Accepted headline", "Maximum characters");
  assert(await page.getByLabel("Maximum characters", { exact: true }).inputValue() === "80", "Source addition must retain accepted common rules.");
  await allFields();
  assert((await page.locator(".studio-field-rule-list .field-rule-card").first().textContent()).includes("Body"), "Source addition preserves order.");
  await page.getByLabel("Settings for").selectOption({ label: "Portrait renamed" });
  await expandField("Accepted headline", "Maximum characters");
  await page.getByLabel("Settings for").selectOption({ label: "Portrait renamed" });
  await page.getByLabel("Maximum characters", { exact: true }).fill("40"); await apply();
  await step("Fonts");
  assert(await page.getByText('Return to checks', { exact: true }).count() === 0 && await page.getByText('Settings changed. Check again before saving.', { exact: true }).count() === 0, 'Correction links and stale reminders never leak into Fonts.');
  await step("Designs"); await step("Fields");
  await expandField("Accepted headline", "Maximum characters");
  await page.getByLabel("Settings for").selectOption({ label: "Portrait renamed" });
  assert(await page.getByLabel("Maximum characters", { exact: true }).inputValue() === "40", "Variant override survives navigation.");
  checks.push("Incremental family creation retains common rules/order and selected-variant overrides");
  await page.getByLabel("Settings for").selectOption("common");
  const inspectedName = await page.getByLabel('Inspect design', { exact: true }).locator('option:checked').textContent();
  await page.getByLabel('Setup preview').getByText(inspectedName, { exact: true }).waitFor();
  await expandField('Accepted headline', 'Maximum characters');
  await page.getByLabel('Label', { exact: true }).fill('Pending scope change');
  await page.getByLabel('Settings for').selectOption({ label: 'Portrait renamed' });
  await page.getByRole('heading', { name: 'Unapplied field changes', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  assert(await page.getByLabel('Settings for').inputValue() === 'common', 'Rejected scope switches preserve shared editing scope.');
  await page.getByLabel('Setup preview').getByText(inspectedName, { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  checks.push('Shared scope retains a containing preview; rejected editing-scope switches preserve inspection');
  await expandField("Body", "Maximum rendered lines");
  await page.getByLabel("Maximum rendered lines", { exact: true }).fill("1"); await apply();
  await expandField("Accepted headline", "Maximum characters");
  await step("Checks");
  await page.locator('.studio-check-filters .package-quality-panel__filters').waitFor();
  await page.locator('.inspection-preview-toolbar').first().waitFor();
  const chrome = await page.evaluate(() => {
    const filters = document.querySelector('.studio-check-filters .package-quality-panel__filters');
    const toolbar = document.querySelector('.inspection-preview-toolbar');
    const scale = document.querySelector('.inspection-preview-toolbar__scale');
    const select = document.querySelector('.studio-check-filters .ui-select__indicator');
    return { filters: getComputedStyle(filters).borderTopWidth, top: getComputedStyle(toolbar).borderTopWidth, bottom: getComputedStyle(toolbar).borderBottomWidth, scale: getComputedStyle(scale).borderTopWidth, indicatorRight: parseFloat(getComputedStyle(select).right) };
  });
  assert(chrome.filters === '0px' && chrome.top === '0px' && chrome.bottom === '0px', 'Checks filter and preview toolbar omit separator strokes.');
  assert(chrome.scale === '1px' && chrome.indicatorRight >= 12, 'Zoom has a matching box and select chevrons have an inset.');
  const issuesScope = page.getByLabel('Show issues from', { exact: true });
  const previewScope = page.getByLabel('Preview design', { exact: true });
  assert(await page.getByPlaceholder('Search issues').count() === 0 && await page.getByLabel('Area', { exact: true }).count() === 0 && await page.getByText('Technical filters', { exact: true }).count() === 0, 'Checks exposes only design scope and Status.');
  await issuesScope.selectOption({ label: 'Portrait renamed · Not checked' }).catch(async () => issuesScope.selectOption({ label: 'Portrait renamed' }));
  assert(await previewScope.inputValue() === await issuesScope.inputValue(), 'Left design selection updates preview.');
  const firstDesign = await previewScope.locator('option').first().getAttribute('value');
  await previewScope.selectOption(firstDesign);
  assert(await issuesScope.inputValue() === firstDesign, 'Preview selection updates issue scope.');
  await issuesScope.selectOption('all');
  assert(await previewScope.inputValue() === firstDesign, 'All designs initially previews the first design.');
  await page.getByRole('button', { name: 'Check again', exact: true }).click();
  await page.getByRole('button', { name: 'Check again', exact: true }).waitFor();
  await page.locator('.package-quality-issue-group__select').first().click();
  assert(await issuesScope.inputValue() === 'all', 'Opening an issue retains All designs scope.');
  assert(await page.locator('[data-testid="quality-issue-group"] [data-testid="quality-context-panel"]').count() === 1, 'Selected issue details expand within their row.');
  const targets = page.getByText(/^Affected targets/);
  if (await targets.count()) {
    await targets.click();
    await page.getByTestId('quality-context-panel').getByRole('button', { name: /Portrait renamed/ }).click();
    assert(await issuesScope.inputValue() === 'all' && await previewScope.inputValue() !== firstDesign, 'A different affected design updates preview without filtering All designs.');
    await page.getByTestId('quality-context-panel').getByText(/^Affected targets/).click();
  }
  await page.getByText('Issue technical details', { exact: true }).click();
  await page.getByText('Reproducible issue packet', { exact: true }).click();
  await page.getByLabel('Expected versus actual behavior').fill('Expected the two-line field to fit; the configured one-line limit reports a blocker.');
  await page.getByRole('button', { name: 'Export fidelity issue packet', exact: true }).click();
  await page.getByText('Issue packet downloaded.', { exact: true }).waitFor();
  await screenshotPair('checks-inline-issue');
  checks.push('Checks synchronizes explicit design selection, retains All designs during investigation and generates packets from inline issue details');
  await page.getByRole("button", { name: "Edit field settings", exact: true }).first().click();
  assert(await page.getByRole('region', { name: 'Configure Body', exact: true }).count() === 1, 'Validate correction opens the field that owns the selected issue.');
  assert(await page.getByLabel("Maximum rendered lines", { exact: true }).count() === 1, 'Validate correction exposes the responsible rule control.');
  await page.getByLabel("Maximum rendered lines", { exact: true }).fill("3"); await apply();
  await page.getByLabel("Settings for").selectOption({ label: "Portrait renamed" });
  await page.getByLabel("Settings for").selectOption({ label: "Portrait renamed" });
  await expandField("Body", "Maximum rendered lines"); await page.getByLabel("Maximum rendered lines", { exact: true }).fill("1"); await apply();
  await expandField("Accepted headline", "Maximum characters");
  await step("Checks");
  // Rule changes invalidate the previous check. Ask the supported authority for
  // current evidence before investigating; old/transient issues are not a gate.
  await page.getByRole('button', { name: 'Check again', exact: true }).click();
  await page.getByRole('button', { name: 'Check again', exact: true }).waitFor();
  await page.locator(".package-quality-issue-group__select").first().click(); await page.getByRole("button", { name: "Edit field settings", exact: true }).first().click();
  assert(await page.getByLabel("Settings for").inputValue() === "common", "A field issue without explicit configuration provenance opens the Common scope.");
  assert(await page.getByRole('region', { name: 'Configure Body', exact: true }).count() === 1, 'Variant correction opens the owning field instead of the previous field.');
  await page.getByLabel('Settings for').selectOption({ label: 'Portrait renamed' });
  await expandField('Body', 'Maximum rendered lines'); await page.getByLabel("Maximum rendered lines", { exact: true }).fill("3"); await apply();
  checks.push("Validate correction targets retain variant context, default ambiguous ownership to Common, and open the owning field");
  await step("Checks");
  const intendedVariant = await page.getByLabel('Preview design', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Check again', exact: true }).click();
  await page.getByRole('button', { name: 'Check again', exact: true }).waitFor();
  assert(await page.getByLabel('Preview design', { exact: true }).inputValue() === intendedVariant, 'Check again restores the intentional variant.');
  assert(await page.locator('[data-template-field-session-v2-revision]').count() === 1, 'Validate mounts exactly one session renderer.');
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find(button => button.textContent === 'Check again').click();
    [...document.querySelectorAll('.setup-navigation button')].find(button => button.textContent.trim().endsWith('Fields')).click();
  });
  assert(await page.getByLabel('Settings for').inputValue() === `design:${intendedVariant}`, 'Leaving Validate during traversal restores the selected editing scope.');
  await step('Checks');
  await screenshotPair('validate');
  await page.setViewportSize({ width: 768, height: 900 });
  const context = page.getByTestId('quality-context-panel');
  assert(await page.getByLabel('Setup preview').getByTestId('quality-context-panel').count() === 0, 'Diagnostic details never enter the preview column.');
  if (await context.count()) await context.scrollIntoViewIfNeeded();
  else await page.getByLabel('Setup preview').scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, 'validate-context-768.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  checks.push('Quality results and contextual inspection remain available; all-design traversal and navigation restore intentional selection');
  await page.setViewportSize({ width: 768, height: 900 }); await assertWorkspaceFits('Checks'); await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: resolve(output, "validate.png"), fullPage: true });
  const checksPreview = await page.getByLabel('Setup preview').boundingBox();
  await step("Review");
  const reviewPreview = await page.getByLabel('Setup preview').boundingBox();
  assert(Math.abs(checksPreview.x - reviewPreview.x) < 2 && Math.abs(checksPreview.width - reviewPreview.width) < 2, 'Checks and Review share the same preview column.');
  assert(await page.getByRole('button', { name: 'Inspect design', exact: true }).count() === 0, 'Review has no separate inspection mode.');
  await page.getByRole("button", { name: "Save template", exact: true }).waitFor({ state: "visible" });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent === 'Save template' && !button.disabled)).catch(async (error) => { throw new Error(`${error.message}\nReview state: ${await page.locator('body').innerText()}`); });
  assert((await page.getByLabel('Template summary').textContent()).includes('2 of 2'), 'Review automatically checks every remaining Family variant before enabling save.');
  assert(await page.getByLabel("Template summary").locator('[aria-label="Settings for"], [aria-label="Maximum characters"], [aria-label="Maximum rendered lines"]').count() === 0, "Review must contain no field or Family configuration controls.");
  await page.getByRole("button", { name: "Save template", exact: true }).waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((button) => button.textContent === 'Save template' && !button.disabled));
  await screenshotPair('review');
  await page.setViewportSize({ width: 1280, height: 640 });
  await step("Fields");
  const footer = await page.locator(".setup-flow__footer").boundingBox();
  assert(footer && footer.y + footer.height <= 641, "Wizard footer must remain visible in a short viewport.");
  await page.screenshot({ path: resolve(output, "fields-short.png"), fullPage: true });
  await screenshotPair('fields');
  await page.setViewportSize({ width: 768, height: 900 }); await assertWorkspaceFits('Fields'); await page.setViewportSize({ width: 1440, height: 900 });
  await step("Review");
  await page.setViewportSize({ width: 768, height: 900 }); await assertWorkspaceFits('Review'); await page.setViewportSize({ width: 1440, height: 900 });
  checks.push('Package, Fonts, Validate, Fields and Review fit the 768-pixel workspace without horizontal clipping; Review automatically completes all-variant validation');
  await page.getByRole("button", { name: "Save template", exact: true }).click();
  await page.getByTestId('template-card').first().waitFor();
  await page.locator('.template-thumbnail__image[data-loaded="true"]').first().waitFor();
  assert(await page.getByRole('region', { name: 'Saved template', exact: true }).count() === 0, 'Library does not duplicate template actions in a saved handoff.');
  const libraryMenu = page.getByTestId('template-card').first().locator('.ui-menu__trigger');
  await libraryMenu.click(); await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
  assert(await page.getByRole('menu').isVisible(), 'Delete keeps the confirmation in the same flyout.');
  assert(await page.getByRole('menuitem', { name: 'Confirm delete', exact: true }).isVisible(), 'Confirmation is reachable without reopening the menu.');
  assert(await page.locator('.template-card__inline-confirm').count() === 0, 'Confirmation is not split across the card.');
  await page.screenshot({ path: resolve(output, 'library-delete-flyout.png'), fullPage: true });
  await page.getByRole('menuitem', { name: 'Cancel', exact: true }).click();
  assert(await page.getByRole('menu').count() === 0, 'Cancel closes the flyout without deleting the record.');
  await libraryMenu.click();
  assert(await page.getByRole('menuitem', { name: 'Delete', exact: true }).isVisible(), 'A new flyout starts without stale confirmation.');
  await page.keyboard.press('Escape');
  checks.push('Library omits the saved handoff and supports delete confirmation/cancel inside its anchored flyout');
  await screenshotPair('library');
  await page.reload();
  await openSettings();
  await step("Fields");
  assert(await page.getByLabel("Settings for").inputValue() === "common", "Reload begins with shared settings and the first design preview.");
  await expandField("Accepted headline", "Maximum characters");
  assert(await page.getByLabel("Maximum characters", { exact: true }).inputValue() === "80", "Saved common configuration must survive reload.");
  checks.push("All-variant save gate, summary-only Review, short viewport footer, existing V3 save/reload");
  await page.goto(server.resolvedUrls.local[0]);
  await page.getByRole("button", { name: "Add template", exact: true }).click();
  const manifest = JSON.parse(await readFile(resolve(root, "fidelity/fixtures.json"), "utf8"));
  const zipFixture = manifest.fixtures.find((entry) => entry.id === "deal-of-the-week-banner");
  const zipBytes = await readFile(resolve(process.env.TEMPLATE_PACKAGE_FIXTURE_DIR ?? manifest.defaultFixtureDirectory, zipFixture.filename));
  assert(createHash("sha256").update(zipBytes).digest("hex") === zipFixture.zipSha256, "Real ZIP must match the registered bytes.");
  await page.getByLabel("Import source packages").setInputFiles({ name: zipFixture.filename, mimeType: "application/zip", buffer: zipBytes });
  await page.getByRole("button", { name: "Continue to fonts", exact: true }).click();
  await screenshotPair('fonts-missing');
  assert(await page.getByRole('button', { name: 'Inspect text', exact: true }).count() === 0, 'Fonts has no inspection workflow.');
  await page.getByRole("button", { name: "Upload font file", exact: true }).click();
  await page.getByTestId("package-font-upload-input").setInputFiles(resolve(root, "apps/studio/src/assets/fonts/rethink-sans-600.ttf"));
  await page.locator('[data-font-ui-status="Ready"]').waitFor();
  await page.getByRole('heading', { name: 'All required fonts are available', exact: true }).waitFor();
  assert(await page.getByRole('button', { name: 'Continue to checks', exact: true }).isEnabled(), 'Font preparation completes before leaving Fonts.');
  await screenshotPair('fonts-ready');
  const fontHash = await page.locator('[data-font-linked-binary-hash]').getAttribute('data-font-linked-binary-hash');
  assert(Boolean(fontHash), "Uploaded font must have binary identity evidence.");
  await step("Fields");
  await page.locator('.studio-field-rule-list .field-rule-card__select').first().click();
  await page.getByLabel("Label", { exact: true }).fill("Accepted ZIP field"); await apply();
  await step("Designs"); await step("Fonts");
  assert(await page.locator('[data-font-linked-binary-hash]').getAttribute('data-font-linked-binary-hash') === fontHash, "Navigation retains the accepted exact font binary.");
  await page.getByRole("button", { name: "Replace file", exact: true }).click();
  await page.getByTestId("package-font-upload-input").setInputFiles({ name: "invalid-font.ttf", mimeType: "font/ttf", buffer: Buffer.from("not a font") });
  await page.getByRole("alert").waitFor();
  assert(await page.locator('[data-font-linked-binary-hash]').getAttribute('data-font-linked-binary-hash') === fontHash, "Rejected font replacement retains accepted binary identity.");
  await page.getByRole("button", { name: "Replace file", exact: true }).click();
  await page.getByTestId("package-font-upload-input").setInputFiles(resolve(root, "apps/studio/src/assets/fonts/rethink-sans-variable.ttf"));
  await page.waitForFunction((previous) => {
    const node = document.querySelector('[data-font-linked-binary-hash]');
    return node?.getAttribute('data-font-linked-binary-hash') && node.getAttribute('data-font-linked-binary-hash') !== previous;
  }, fontHash);
  await step("Fields");
  await expandField("Accepted ZIP field", "Label");
  assert(await page.getByLabel("Label", { exact: true }).inputValue() === "Accepted ZIP field", "Returning through font preparation retains accepted field rules.");
  checks.push("Hash-gated real ZIP, exact font upload, rejected and accepted font replacement, retained field configuration");
  const acceptedFontHash = await page.locator('[data-font-linked-binary-hash]').getAttribute('data-font-linked-binary-hash');
  await step("Review"); await page.getByRole("button", { name: "Save template", exact: true }).click();
  await page.getByRole("heading", { name: "Library", exact: true }).waitFor();
  await openSettings(page.locator('article').filter({ hasText: 'Single design' }));
  await step('Fonts');
  assert(await page.locator('[data-font-linked-binary-hash]').getAttribute('data-font-linked-binary-hash') === acceptedFontHash, 'Saved V2 source reopens exact fonts without rebuilding fields');
  await step('Fields'); await expandField('Accepted ZIP field', 'Label');
  assert(await page.getByLabel('Label', { exact: true }).inputValue() === 'Accepted ZIP field', 'Saved V2 font adapter retains configured label');
  checks.push('Saved V2 source reopens exact-font workspaces and retained field configuration');
  assert(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
  await writeFile(resolve(output, "report.json"), JSON.stringify({ passed: true, checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, checks, output }));
} catch (cause) {
  await page.screenshot({ path: resolve(output, "failure.png"), fullPage: true });
  await writeFile(resolve(output, "failure.txt"), `${cause.stack}\n${await page.locator('body').innerText()}\nErrors: ${errors.join('; ')}`);
  throw cause;
} finally { await browser.close(); await server.close(); }

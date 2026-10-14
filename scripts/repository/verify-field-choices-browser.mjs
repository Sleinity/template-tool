import {openFormat,optionAction,choiceIds,optionLabel,restoreChoices,inspectCompactCards} from './compact-fields-browser.mjs';
/** Isolated exact-export Studio workflows; authored choices are not new source fixtures. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fieldsMeasurementPlugin, measureFields } from './fields-measurement.mjs';
import { runTemplatePackageImportPipelineV2, createTemplateFieldFamilyFromSourcesV2 } from '@sleinity/template-browser/importer';
import { formatRequiredFontFace } from '@sleinity/template-browser/fonts';
import { launchBrowser, waitForCurrentReadiness } from '../fidelity/browser.mjs';
import { loadManifest, verifyFixture } from '../fidelity/core.mjs';
import { selectSdkGateFixtures } from '../fidelity/gate-profile.mjs';
import { loadExactFontManifest, requireExactFont } from '../fidelity/fonts.mjs';
import { awaitReviewSaveReady, reviewEvidence } from '../fidelity/review-readiness.mjs';
import { createStudioViteServer } from './studio-vite-server.mjs';
const dir=process.argv.includes('--compact-cards')?'fidelity/evidence/compact-field-cards':process.argv.includes('--measure-fields')?'fidelity/evidence/fields-usability/measurement-setup':process.argv.includes('--fields-usability')?'fidelity/evidence/fields-usability':'fidelity/evidence/choices-completion';mkdirSync(dir,{recursive:true});
const manifest=loadManifest(), fixtures=selectSdkGateFixtures(manifest),fonts=loadExactFontManifest(fixtures.flatMap(f=>f.requiredFonts??[])),owners=[];
const alternate={text:'Offer',textarea:'New paragraph',number:42,date:'2027-04-16',color:'#123456'},types=Object.keys(alternate),rows=[],errors=[];
for(const fixture of fixtures) {const bytes=readFileSync(verifyFixture(manifest,fixture).path);owners.push(await runTemplatePackageImportPipelineV2({format:'zip',sourceId:fixture.id,sourceName:fixture.filename,buffer:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),fontRegistry:null}));}
const carrousel=owners[2].package, repeatedCarrousel=process.argv.includes('--family-carrousel'),familyDefinition=createTemplateFieldFamilyFromSourcesV2(repeatedCarrousel?[carrousel,carrousel]:owners.map(owner=>owner.package),'Choices Family');
const definitions=types.map(type=>carrousel.editableFields.find(field=>field.type===type));
let lastPage;
const fieldsChecks=[];
async function checkFields(page,kind) {
 const root=page.locator('.studio-setup-fields');
 const color=root.locator('[data-field-id="color:backgroundColor"]'); await color.locator('.field-rule-card__select').click();
 if(kind==='family') {
  assert.equal(await page.getByLabel('Inspect design',{exact:true}).locator('option').count(),1,'Sparse common field has one containing design');
  await page.getByLabel('Setup preview').getByText('Carrousel',{exact:true}).waitFor();
  await color.getByLabel('Label',{exact:true}).fill('Local inspection draft');
  await page.getByLabel('Inspect design',{exact:true}).selectOption(await page.getByLabel('Inspect design',{exact:true}).inputValue());
  assert.equal(await color.getByLabel('Label',{exact:true}).inputValue(),'Local inspection draft','Inspection preserves common draft');
  await color.getByRole('button',{name:'Discard',exact:true}).click();
  const shared=familyDefinition.fields.find(field=>familyDefinition.variants.filter(design=>design.packageValue.editableFields.some(source=>source.id===field.id)).length>1);
  assert(shared,'Exact Family must supply shared inspection coverage');
  const sharedCard=root.locator(`[data-field-id="${shared.id}"]`);await sharedCard.locator('.field-rule-card__select').click();
  await sharedCard.getByLabel('Label',{exact:true}).fill('Draft across designs');
  const inspection=page.getByLabel('Inspect design',{exact:true}),current=await inspection.inputValue();
  const other=(await inspection.locator('option').evaluateAll(nodes=>nodes.map(node=>node.value))).find(id=>id!==current);
  const resources=await page.evaluate(()=>({...globalThis.__fieldsResources}));
  await inspection.selectOption(other);
  assert.equal(await sharedCard.getByLabel('Label',{exact:true}).inputValue(),'Draft across designs','Actual design switch preserves shared configuration draft');
  assert.deepEqual(await page.evaluate(()=>globalThis.__fieldsResources),resources,'Pure inspection allocates no resources and persists nothing');
  await sharedCard.getByRole('button',{name:'Discard',exact:true}).click();
  await color.locator('.field-rule-card__select').click();
 }
 await revealChoices(color); await color.getByLabel('Option value',{exact:true}).first().fill('#zz');
 assert.equal(await color.locator('[data-invalid-color]').count(),1,'Invalid Color displays neutral state');
 assert(await color.getByRole('button',{name:'Apply changes',exact:true}).isDisabled(),'Invalid Color blocks Apply');
 await page.getByRole('button',{name:'Continue to review',exact:true}).click();
 const guard=page.getByRole('dialog',{name:'Unapplied field changes',exact:true});await guard.waitFor();
 assert.equal(await guard.getByRole('button',{name:'Apply and continue',exact:true}).count(),0,'Invalid guard cannot Apply');
 await guard.getByRole('button',{name:'Keep editing',exact:true}).click();
 assert.equal(await color.getByLabel('Option value',{exact:true}).first().inputValue(),'#zz','Guard keeps invalid draft');
 await color.getByLabel('Option value',{exact:true}).first().evaluate(node=>{if(node!==document.activeElement)throw new Error('Guard must focus the invalid control');});
 await color.getByRole('button',{name:'Discard',exact:true}).click();
 await revealChoices(color);await color.locator('[data-choice-row]').first().getByRole('button',{name:'Actions for option 1',exact:true}).click();await page.getByRole('menuitem',{name:'Remove',exact:true}).click();
 assert((await color.innerText()).includes('Add an option or turn Choices off.'),'Empty list points to actual control');
 await color.getByRole('button',{name:'Discard',exact:true}).click();
 const number=root.locator('[data-field-id="number:discount"]'); await number.locator('.field-rule-card__select').click();
 await openFormat(number);await number.getByLabel('Decimal places',{exact:true}).fill('101');
 assert(await number.getByRole('button',{name:'Apply changes',exact:true}).isDisabled(),'Precision 101 rejected before Apply');
 assert.equal(await number.getByLabel('Decimal places',{exact:true}).getAttribute('aria-invalid'),'true');
 await number.getByLabel('Decimal places',{exact:true}).fill('-');assert.equal(await number.getByLabel('Decimal places',{exact:true}).inputValue(),'-','Partial number stays local');
 await number.getByRole('button',{name:'Discard',exact:true}).click();
 const before=await root.locator('.field-rule-card').evaluateAll(nodes=>nodes.map(node=>node.dataset.fieldId));
 await number.getByRole('button',{name:'Reorder options for Discount',exact:true}).click();
 const menu=page.getByRole('menu'); const first=await menu.getByRole('menuitem').first().innerText();
 await page.keyboard.press('ArrowDown');assert.notEqual(await page.evaluate(()=>document.activeElement.textContent),first,'ArrowDown moves menu focus');
 await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>document.activeElement.textContent),first,'Home focuses first item');
 await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.textContent),await menu.getByRole('menuitem').last().innerText(),'End focuses last item');
 await page.keyboard.press('Escape');
 await number.getByRole('button',{name:'Reorder options for Discount',exact:true}).click();await page.getByRole('menuitem',{name:/^Before /}).click();
 await root.getByRole('button',{name:'Undo reorder',exact:true}).click();
 assert.deepEqual(await root.locator('.field-rule-card').evaluateAll(nodes=>nodes.map(node=>node.dataset.fieldId)),before,'Undo restores exact full order');
 if(await root.getByLabel('Field type',{exact:true}).isVisible())await root.getByLabel('Field type',{exact:true}).selectOption('number');else await root.getByRole('button',{name:/^Number/}).click();
 assert.equal(await number.getAttribute('draggable'),'false','Filtered fields cannot drag reorder');
 assert((await root.innerText()).includes('Show all to drag reorder'),'Filter explains ordering restriction');
 await number.getByRole('button',{name:'Reorder options for Discount',exact:true}).click();
 await page.keyboard.press('Tab');assert.equal(await page.getByRole('menu').count(),0,'Tab dismisses shared menu');
 if(await root.getByLabel('Field type',{exact:true}).isVisible())await root.getByLabel('Field type',{exact:true}).selectOption('all');else await root.getByRole('button',{name:/^All/}).click();
 await openFormat(number);await number.getByLabel('Prefix',{exact:true}).fill('Promo ');
 await number.getByRole('button',{name:'Reorder options for Discount',exact:true}).click();await page.getByRole('menuitem',{name:/^Before /}).click();
 const reorderGuard=page.getByRole('dialog',{name:'Unapplied field changes',exact:true});await reorderGuard.waitFor();
 await reorderGuard.getByRole('button',{name:'Keep editing',exact:true}).click();
 assert.deepEqual(await root.locator('.field-rule-card').evaluateAll(nodes=>nodes.map(node=>node.dataset.fieldId)),before,'Keep editing prevents reorder acceptance');
 await number.getByRole('button',{name:'Reorder options for Discount',exact:true}).click();await page.getByRole('menuitem',{name:/^Before /}).click();
 await reorderGuard.getByRole('button',{name:'Apply and continue',exact:true}).click();
 await root.getByRole('button',{name:'Undo reorder',exact:true}).click();
 assert.equal(await number.getByLabel('Prefix',{exact:true}).inputValue(),'Promo ','Undo preserves unrelated newly accepted configuration');
 await openFormat(number);await number.getByLabel('Prefix',{exact:true}).fill('');await number.getByRole('button',{name:'Apply changes',exact:true}).click();
 await number.getByRole('button',{name:'Reorder options for Discount',exact:true}).click();await page.getByRole('menuitem',{name:/^Before /}).click();
 await page.locator('.setup-navigation').getByRole('button',{name:'Fonts',exact:true}).click();
 await page.locator('.setup-navigation').getByRole('button',{name:'Fields',exact:true}).click();
 assert.equal(await root.getByRole('button',{name:'Undo reorder',exact:true}).count(),0,'Leaving Fields invalidates stale Undo');
 await number.getByRole('button',{name:'Reorder options for Discount',exact:true}).click();await page.getByRole('menuitem',{name:/^After /}).click();
 assert.deepEqual(await root.locator('.field-rule-card').evaluateAll(nodes=>nodes.map(node=>node.dataset.fieldId)),before,'Restoring order uses current native authority');
 await root.getByRole('button',{name:'Undo reorder',exact:true}).click();
 await number.getByRole('button',{name:'Reorder options for Discount',exact:true}).click();await page.getByRole('menuitem',{name:/^After /}).click();
 await page.screenshot({path:`${dir}/${kind}-fields-regressions.png`,fullPage:true});
 fieldsChecks.push({kind,previewContext:true,precision:true,partialNumber:true,color:true,guard:true,emptyChoices:true,keyboardMenu:true,undo:true});
}

async function revealChoices(card) {
 const toggle=card.getByRole('switch',{name:'Choices',exact:true});
 if(await toggle.getAttribute('aria-checked')!=='true')await toggle.click();
}
const measure=process.argv.includes('--measure-fields'), compact=process.argv.includes('--compact-cards');
const server=await createStudioViteServer({plugins:measure||process.argv.includes('--cards-before')?[fieldsMeasurementPlugin(process.argv.includes('--fields-baseline')||process.argv.includes('--cards-before'))]:process.argv.includes('--trace')?[{name:'test-only-choices-measurement-trace',enforce:'pre',transform(code,id){
 if(!id.endsWith('/internal/runtime-routing/useCoreLayoutRuntime.ts'))return;
 return code.replace('setMeasurements((previous) => {', `setMeasurements((previous) => {
 const trace = (globalThis.__choicesMeasurementTrace ??= []);
 if (trace.length < 2000) trace.push({before: previous[measurement.nodeId] ?? null, after: current});`);
}}]:[]});await server.listen();const browser=await launchBrowser(false);
try {
 for(const kind of (process.argv.includes('--family-only')?['family']:['single','family'])) for(const mode of (measure||process.argv.includes('--cards-before')?['suggested']:['suggested','restricted'])) {
  const context=await browser.newContext({viewport:{width:1440,height:1200},deviceScaleFactor:1,acceptDownloads:true});const page=await context.newPage();lastPage=page;page.on('pageerror',error=>{errors.push(error.message);console.error('Browser exception:',error.stack);});page.on('framenavigated',frame=>{if(frame===page.mainFrame())console.log(`${kind}/${mode} navigation: ${frame.url()}`);});page.on('console',message=>{if(message.text().includes('[vite]'))console.log(message.text());if(message.type()==='error'){console.error('Browser console:',message.text());if(process.argv.includes('--fail-on-loop')&&message.text().includes('Maximum update depth')){writeFileSync(dir+'/family-review-blocker.json',JSON.stringify({kind,mode,unconfigured:process.argv.includes('--review-only'),message:message.text(),regenerate:'node scripts/repository/verify-field-choices-browser.mjs --family-only --review-only --fail-on-loop',scope:'Three exact exports in Studio; renderer unchanged'},null,2));void browser.close();}}});
  if(measure || process.argv.includes('--fields-usability'))await context.addInitScript(()=>{
    globalThis.__fieldsResources={allocations:0,writes:0};
    const create=URL.createObjectURL;URL.createObjectURL=function(...args){globalThis.__fieldsResources.allocations++;return create.apply(this,args);};
    const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){globalThis.__fieldsResources.writes++;return put.apply(this,args);};
  });
  const name=`Choices ${kind} ${mode}`;const optionIds={};
  const labels=Object.fromEntries(definitions.map(field=>[field.id,kind==='family'?familyDefinition.fields.find(f=>f.id===field.id).label:field.label]));
  await page.goto(server.resolvedUrls.local[0]+'templates/new');
  await page.getByLabel('Import source packages').setInputFiles((kind==='family'?(repeatedCarrousel?[fixtures[2],fixtures[2]]:fixtures):[fixtures[2]]).map(f=>verifyFixture(manifest,f).path));
  await page.getByRole('button',{name:'Continue to fonts',exact:true}).click();await page.getByRole('region',{name:'Font preparation',exact:true}).waitFor();
  const familyFontEvidence=[];
  if(kind==='family') {
   const requirements=(repeatedCarrousel?[owners[2]]:owners).flatMap(owner=>owner.package.fontRequirements??[]);
   const handled=new Set();
   for(const requirement of requirements) {
    const label=formatRequiredFontFace(requirement);if(handled.has(label))continue;handled.add(label);
    const row=page.locator('.family-font-row').filter({has:page.getByRole('heading',{name:label,exact:true})});
    assert.equal(await row.count(),1,`Unambiguous Family font requirement: ${label}`);
    const font=requireExactFont(fonts,requirement.family,requirement.weight,requirement.cssStyle);
    if(await row.getAttribute('data-ready')!=='true')await row.locator('input[type="file"]').setInputFiles(font.path);
    await row.locator('input[type="file"]:not(:disabled)').waitFor();
    await row.locator('span').filter({hasText:'Available'}).waitFor();
    familyFontEvidence.push({label,binarySha256:font.verifiedSha256,available:await row.getAttribute('data-ready')==='true'});
   }
   assert(familyFontEvidence.length>0&&familyFontEvidence.every(entry=>entry.available),'Every Family requirement must be exact-linked');
  }
  for(let attempts=0;;attempts++) {
   const missing=page.locator('[data-font-requirement-id]').filter({has:page.getByRole('button',{name:'Upload font file',exact:true})});
   let row;
   for(const candidate of await missing.all()) if(await candidate.getAttribute('data-font-resolution-classification')!=='exact'){row=candidate;break;}
   if(!row)break;
   assert(attempts<12,'All Family requirements must retain exact uploaded fonts');
   const family=await row.getAttribute('data-font-family')??'', weight=await row.getAttribute('data-font-weight')??'', style=await row.getAttribute('data-font-style')??'normal';
   const font=requireExactFont(fonts,family,weight,style);
   await row.getByRole('button',{name:'Upload font file'}).click();await page.getByTestId('package-font-upload-input').setInputFiles(font.path);
   await page.waitForFunction(({hash,family,weight,style})=>{const requirements=[...document.querySelectorAll('[data-font-requirement-id]')].filter(node=>node.getAttribute('data-font-family')===family&&node.getAttribute('data-font-weight')===weight&&node.getAttribute('data-font-style')===style);return requirements.length>0&&requirements.every(node=>node.getAttribute('data-font-linked-binary-hash')===hash&&node.getAttribute('data-font-ui-status')==='Ready')},{hash:font.verifiedSha256,family,weight,style});
  }
  writeFileSync(dir+'/font-prerequisites.json',JSON.stringify(kind==='family'?familyFontEvidence:await page.locator('[data-font-requirement-id]').evaluateAll(nodes=>nodes.map(node=>Object.fromEntries([...node.attributes].filter(attribute=>attribute.name.startsWith('data-font')).map(attribute=>[attribute.name,attribute.value])))),null,2));
  await page.getByRole('button',{name:'Continue to checks',exact:true}).click();await waitForCurrentReadiness(page,'[data-template-package-canvas]');
  await page.getByRole('button',{name:'Continue to fields',exact:true}).click();
  if(compact){await inspectCompactCards(page,kind,process.argv.includes('--cards-before'));if(process.argv.includes('--cards-before')){await context.close();continue;}}
  if(measure){await measureFields(page,kind,browser.version(),process.argv.includes('--fields-baseline'));await context.close();continue;}
  if(process.argv.includes('--fields-usability'))await checkFields(page,kind);
  for(const field of (process.argv.includes('--review-only')?[]:definitions)) {
   const card=page.locator(`[data-field-id="${field.id}"]`);await card.locator('.field-rule-card__select').click();await revealChoices(card);
   await card.getByLabel('Choice behavior',{exact:true}).selectOption(mode);
   assert(await card.getByRole('button',{name:'Apply changes',exact:true}).isEnabled(),`${kind}/${mode}/${field.type}: imported defaults seed valid choices`);
   await card.getByRole('button',{name:'Add choice',exact:true}).click();
   const input=card.getByLabel('Option value',{exact:true}).last();
   if(['number','date','color'].includes(field.type)) assert(await card.getByRole('button',{name:'Apply changes',exact:true}).isDisabled(),`${field.type}: incomplete draft blocks Apply`);
   await input.fill(String(alternate[field.type]));await(await optionLabel(card,await card.locator('[data-choice-row]').count()-1)).fill('Alternative');
   const optionState=await choiceIds(card);
   const optionValues=await card.getByLabel('Option value',{exact:true}).evaluateAll(nodes=>nodes.map(node=>node.value));
   await card.getByRole('switch',{name:'Choices',exact:true}).click();
   assert.equal(await card.getByLabel('Choice behavior',{exact:true}).count(),0,'Disabled choices hide their controls');
   await card.getByRole('switch',{name:'Choices',exact:true}).click();
   assert.equal(await card.getByLabel('Choice behavior',{exact:true}).inputValue(),mode,'Re-enabling retains the choice mode');
   assert.deepEqual(await choiceIds(card),optionState,'Toggle round-trip preserves option identities');
   assert.deepEqual(await card.getByLabel('Option value',{exact:true}).evaluateAll(nodes=>nodes.map(node=>node.value)),optionValues,'Toggle round-trip preserves entered option values');
   optionIds[field.id]=(await choiceIds(card)).at(-1);
   await card.getByRole('button',{name:'Apply changes',exact:true}).click();
  }
  if(kind==='family'&&!process.argv.includes('--review-only')) {
   // Exercise real inheritance UI on a field present in Carrousel.
   const settings=page.getByLabel('Settings for',{exact:true}), design=await settings.locator('option').last().getAttribute('value');await settings.selectOption(design);
   const card=page.locator(`[data-field-id="${definitions[0].id}"]`);await card.locator('.field-rule-card__select').click();
   await card.getByRole('switch',{name:'Choices',exact:true}).click();await card.getByRole('button',{name:'Apply changes',exact:true}).click();
   assert.equal(await card.getByRole('switch',{name:'Choices',exact:true}).getAttribute('aria-checked'),'false','Explicit Family clear keeps Choices disabled');
   await restoreChoices(page,card);await card.getByRole('button',{name:'Apply changes',exact:true}).click();
   await revealChoices(card);await card.getByLabel('Option label',{exact:true}).last().fill('Variant alternative');
   await card.getByRole('button',{name:'Apply changes',exact:true}).click();
   await revealChoices(card);assert.equal(await card.getByLabel('Option label',{exact:true}).last().inputValue(),'Variant alternative');
   await restoreChoices(page,card);await card.getByRole('button',{name:'Apply changes',exact:true}).click();
   await settings.selectOption('common');
  }
  await page.getByRole('button',{name:'Continue to review',exact:true}).click();await page.getByLabel('Template name').fill(name);writeFileSync(dir+'/review-entered.json',JSON.stringify(await reviewEvidence(page),null,2));await awaitReviewSaveReady(page);
  if(process.argv.includes('--review-only')){console.log('Unconfigured Family Review passes.');await context.close();break;}
  await page.getByRole('button',{name:'Save template',exact:true}).click();await page.getByRole('heading',{name:'Library',exact:true}).waitFor();
  const template=page.locator('article').filter({has:page.getByRole('heading',{name,exact:true})});await template.getByRole('button',{name:'Create output',exact:true}).click();await page.getByTestId('studio-draft-editor').waitFor();
  if(kind==='family'){const variant=page.getByLabel(/^(Selected variant|Design)$/,{exact:true});await variant.selectOption(await variant.locator('option').last().getAttribute('value'));}
  await waitForCurrentReadiness(page,'[data-template-package-canvas]');
  for(const field of definitions) {
   const label=labels[field.id], section=page.getByRole('region',{name:`Edit ${label}`,exact:true});
   const select=section.getByLabel(`${label} choices`,{exact:true});assert((await select.inputValue())!=='',`${field.type}: matching imported value is displayed`);
   if(mode==='restricted') assert.equal(await section.locator('input:not([type="checkbox"]),textarea').count(),0,'Restricted choice fields have no free-form input');
   if(mode==='suggested'&&field.type==='number') {await section.getByRole('textbox',{name:label,exact:true}).fill('-');await section.getByRole('alert').filter({hasText:'complete number'}).waitFor();}
   await select.selectOption(optionIds[field.id]);await page.waitForFunction(({id,expected})=>document.querySelector(`select[id*="${encodeURIComponent(id)}"]`)?.value===expected,{id:field.id,expected:optionIds[field.id]});
   if(mode==='suggested') {
    const input=field.type==='color'?section.locator('input[type="color"]'):section.getByRole('textbox',{name:label,exact:true});
    await page.waitForFunction(({id,value,type})=>{const section=[...document.querySelectorAll('.v2-content')].find(node=>node.querySelector(`select[id*="${encodeURIComponent(id)}"]`));const input=section?.querySelector(type==='textarea'?'textarea':'input');return input?.value===value;},{id:field.id,value:String(alternate[field.type]),type:field.type});
    assert.equal(await input.inputValue(),String(alternate[field.type]));
   }
   rows.push({kind,mode,type:field.type,configured:true,used:true,configurationReopened:true,selectionReopened:true,reset:true,pngExport:true,invalidDraftRecovery:mode==='suggested'&&field.type==='number'});
  }
  await page.getByRole('button',{name:/Back to (templates|Library)/,exact:true}).click();await page.getByRole('heading',{name:'Library',exact:true}).waitFor();
  // Reopen configuration through the actual settings wizard.
  await template.getByRole('button',{name:`Actions for ${name}`,exact:true}).click();await page.getByRole('menuitem',{name:'Template Settings',exact:true}).click();
  await page.getByRole('button',{name:'Fields',exact:false}).click();
  for(const field of definitions) {
   const card=page.locator(`[data-field-id="${field.id}"]`);await card.locator('.field-rule-card__select').click();
   assert.equal(await card.getByLabel('Choice behavior',{exact:true}).inputValue(),mode);
   assert.equal((await choiceIds(card)).at(-1),optionIds[field.id]);
  }
  await page.getByRole('button',{name:'Back to Library',exact:true}).click();await page.getByRole('heading',{name:'Library',exact:true}).waitFor();
  await template.getByRole('button',{name:'Create output',exact:true}).click();await page.getByRole('button',{name:'Continue draft',exact:true}).click();await page.getByTestId('studio-draft-editor').waitFor();
  for(const field of definitions) assert.equal(await page.getByLabel(`${labels[field.id]} choices`,{exact:true}).inputValue(),optionIds[field.id],`${field.type}: selection survives reopen`);
  for(const field of definitions) {
   const section=page.getByRole('region',{name:`Edit ${labels[field.id]}`,exact:true}),select=section.getByLabel(`${labels[field.id]} choices`,{exact:true});
   await section.getByRole('button',{name:`Reset ${labels[field.id]}`,exact:true}).click();
   assert.notEqual(await select.inputValue(),optionIds[field.id],`${field.type}: Reset displays the imported default`);
   await select.selectOption(optionIds[field.id]);
  }
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Export PNG'&&!button.disabled));
  await page.screenshot({path:`${dir}/${kind}-${mode}.png`,fullPage:true});
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Export PNG',exact:true}).click();await(await downloading).saveAs(`${dir}/${kind}-${mode}-export.png`);
  if(process.argv.includes('--fields-usability'))writeFileSync(dir+'/fields-regressions.json',JSON.stringify(fieldsChecks,null,2));
  await context.close();console.log(`${kind}/${mode}: all five types configured, saved, reopened, selected and exported.`);
 }
 assert.deepEqual(errors,[]);writeFileSync(dir+(process.argv.includes('--review-only')?'/unconfigured-review.json':repeatedCarrousel?'/browser-carrousel-family.json':'/browser.json'),JSON.stringify({schemaVersion:'choices-browser-v1',browser:browser.version(),viewport:{width:1440,height:1200},deviceScaleFactor:1,rows,errors,automatedBrowser:true,manualLiveReview:false,repeatedCarrouselSyntheticFamily:repeatedCarrousel,fixtures:fixtures.map(f=>({id:f.id,zipSha256:f.zipSha256}))},null,2)+'\n');
}catch(error){if(lastPage&&!lastPage.isClosed()){writeFileSync(dir+'/review-readiness.json',JSON.stringify(await reviewEvidence(lastPage),null,2));const issues=lastPage.getByRole('button',{name:'Review issues',exact:true});if(await issues.count())await issues.click();await lastPage.screenshot({path:dir+'/failure.png',fullPage:true});console.error((await lastPage.locator('body').innerText()).slice(0,15000));}if(lastPage&&!lastPage.isClosed()){const trace=await lastPage.evaluate(()=>globalThis.__choicesMeasurementTrace??[]);writeFileSync(dir+'/measurement-trace.json',JSON.stringify(trace,null,2));}console.error(JSON.stringify(errors));throw error;}finally{await browser.close();await server.close();owners.forEach(owner=>owner.dispose())}

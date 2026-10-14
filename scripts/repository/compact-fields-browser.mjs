/** Test-only UI helpers and compact-card interaction/geometry evidence. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
export async function openFormat(card){const section=card.locator('details').filter({has:card.page().getByText('Display format',{exact:true})}).first();if(await section.getAttribute('open')===null)await section.locator(':scope > summary').click();}
export async function optionAction(page,card,index,name){await card.locator('[data-choice-row]').nth(index).getByRole('button',{name:`Actions for option ${index+1}`,exact:true}).click();await page.getByRole('menuitem',{name,exact:true}).click();}
export const choiceIds=card=>card.locator('[data-choice-row]').evaluateAll(nodes=>nodes.map(node=>node.dataset.choiceId));
export async function optionLabel(card,index){const row=card.locator('[data-choice-row]').nth(index);if(await row.getByRole('button',{name:'Add label',exact:true}).count())await row.getByRole('button',{name:'Add label',exact:true}).click();return row.getByLabel('Option label',{exact:true});}
export async function restoreChoices(page,card){await card.getByRole('button',{name:'Choices settings actions',exact:true}).click();await page.getByRole('menuitem',{name:'Restore shared choices',exact:true}).click();}
export async function inspectCompactCards(page,kind,before=false){
 const dir=`fidelity/evidence/compact-field-cards/${before?'before':'after'}`;mkdirSync(dir,{recursive:true});
 const root=page.locator('.studio-setup-fields'),color=root.locator('[data-field-id="color:backgroundColor"]');await color.locator('.field-rule-card__select').click();
 await page.setViewportSize({width:1440,height:900});
 const cleanHeight=(await color.boundingBox()).height;
 if(!before){assert(cleanHeight<=320,`Clean ${kind} Color card ${cleanHeight}px exceeds 320px`);assert.equal(await color.locator('.studio-field-inspector__actions').count(),0,'Clean card has no acceptance buttons');}
 await page.screenshot({path:`${dir}/${kind}-color-off.png`,fullPage:true});
 await color.getByRole('switch',{name:'Choices',exact:true}).click();
 await page.screenshot({path:`${dir}/${kind}-color-on.png`,fullPage:true});
 if(!before){
  const id=(await choiceIds(color))[0];
  await optionAction(page,color,0,'Edit option ID');const dialog=page.getByRole('dialog',{name:'Option identity',exact:true});await dialog.waitFor();
  await dialog.getByLabel('Stable option ID',{exact:true}).fill('');assert.equal(await dialog.getByLabel('Stable option ID',{exact:true}).getAttribute('aria-invalid'),'true');
  await dialog.getByRole('button',{name:'Close details',exact:true}).click();
  assert(await color.getByRole('button',{name:'Apply changes',exact:true}).isDisabled(),'Hidden ID error still blocks Apply');
  await page.getByRole('button',{name:'Continue to review',exact:true}).click();const guard=page.getByRole('dialog',{name:'Unapplied field changes',exact:true});await guard.waitFor();assert.equal(await page.getByRole('dialog').count(),1,'Guard has no competing technical drawer');
  await guard.getByRole('button',{name:'Keep editing',exact:true}).click();await dialog.waitFor();await dialog.getByLabel('Stable option ID',{exact:true}).evaluate(node=>{if(node!==document.activeElement)throw new Error('Identity error must receive focus');});
  await dialog.getByLabel('Stable option ID',{exact:true}).fill(id);await dialog.getByRole('button',{name:'Close details',exact:true}).click();
  await color.getByRole('button',{name:'Technical details',exact:true}).click();const technical=page.getByRole('dialog',{name:'Technical details',exact:true});await technical.waitFor();await technical.getByText('Host integration',{exact:true}).click();await technical.getByLabel('Control role (advanced)').fill('compact-host-hint');
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  await color.getByRole('button',{name:'Technical details',exact:true}).click();await technical.getByText('Host integration',{exact:true}).click();assert.equal(await technical.getByLabel('Control role (advanced)').inputValue(),'compact-host-hint','Drawer closure preserves parent draft');await technical.getByRole('button',{name:'Close details',exact:true}).click();
  await optionLabel(color,0);await color.getByLabel('Option label',{exact:true}).fill('Default color');
 }
 for(let i=0;i<3;i++){await color.getByRole('button',{name:'Add choice',exact:true}).click();await color.getByLabel('Option value',{exact:true}).last().fill(['#123456','#456789','#789ABC'][i]);}
 if(!before){const ids=await choiceIds(color);await optionAction(page,color,1,'Move up');assert.equal((await choiceIds(color))[0],ids[1]);await color.locator('[data-choice-row]').first().getByRole('button',{name:'Actions for option 1',exact:true}).evaluate(node=>{if(node!==document.activeElement)throw new Error('Move restores row menu focus');});await optionAction(page,color,0,'Remove');assert.deepEqual(await choiceIds(color),[ids[0],ids[2],ids[3]]);}
 await page.screenshot({path:`${dir}/${kind}-multiple-options.png`,fullPage:true});
 await page.setViewportSize({width:768,height:900});
 if(!before){for(let i=0;i<8;i++){await color.getByRole('button',{name:'Add choice',exact:true}).click();await color.getByLabel('Option value',{exact:true}).last().fill(`#${(0x220000+i).toString(16)}`);}
  const lastValue=color.getByLabel('Option value',{exact:true}).last();await lastValue.focus();await lastValue.evaluate(node=>{const control=node.getBoundingClientRect(),footer=document.querySelector('.setup-flow__footer')?.getBoundingClientRect(),actions=node.closest('form')?.querySelector('.studio-field-inspector__actions')?.getBoundingClientRect();if(control.bottom>Math.min(footer?.top??innerHeight,actions?.top??innerHeight)-6)throw new Error('Focused option must remain above sticky footers');});}
 await page.screenshot({path:`${dir}/${kind}-narrow.png`,fullPage:true});
 const layout=await color.evaluate(node=>({width:node.getBoundingClientRect().width,viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,internalScroll:getComputedStyle(node).overflowY}));assert(!layout.overflow,'Narrow layout fits viewport');assert(!['scroll','auto'].includes(layout.internalScroll),'Card has no internal scroll container');
 await page.setViewportSize({width:1440,height:900});await color.getByRole('button',{name:'Discard',exact:true}).click();
 const number=root.locator('[data-field-id="number:discount"]');await number.locator('.field-rule-card__select').click();if(!before){await openFormat(number);await number.getByLabel('Decimal places',{exact:true}).fill('101');assert(await number.getByRole('button',{name:'Apply changes',exact:true}).isDisabled());await number.locator('details').filter({has:page.getByText('Display format',{exact:true})}).locator(':scope > summary').click();assert((await number.innerText()).includes('Check settings'),'Closed invalid format advertises error');await number.getByRole('button',{name:'Discard',exact:true}).click();}
 await page.screenshot({path:`${dir}/${kind}-number.png`,fullPage:true});
 const textarea=root.locator('[data-field-id="textarea:headline"]');await textarea.locator('.field-rule-card__select').click();await textarea.getByRole('switch',{name:'Choices',exact:true}).click();await page.screenshot({path:`${dir}/${kind}-textarea.png`,fullPage:true});await textarea.getByRole('button',{name:'Discard',exact:true}).click();
 writeFileSync(`${dir}/${kind}.json`,JSON.stringify({kind,before,cleanColorHeight:cleanHeight,layout,manualScreenReader:false,publicSDKUnchanged:true},null,2));
}

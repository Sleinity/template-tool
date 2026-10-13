/** Exact ZIPs, test-authored configurations, supported SDK authorities only. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { loadManifest, verifyFixture } from '../fidelity/core.mjs';
import { selectSdkGateFixtures } from '../fidelity/gate-profile.mjs';
import { runTemplatePackageImportPipelineV2, createTemplateFieldFamilyFromSourcesV2 } from '@sleinity/template-browser/importer';
import { createTemplateSessionV2, createTemplateFieldFamilySessionV2 } from '@sleinity/template-browser/session';
import { InMemoryTemplateSessionRepositoryV2 } from '@sleinity/template-browser/persistence';
const dir='fidelity/evidence/choices-completion';mkdirSync(dir,{recursive:true});
const types=['text','textarea','number','date','color'], modes=['suggested','restricted'], owners=[],rows=[];
const alternate={text:'Offer',textarea:'New paragraph',number:42,date:'2027-04-16',color:'#123456'};
const revised={text:'Revised offer',textarea:'Revised paragraph',number:43,date:'2027-05-16',color:'#abcdef'};
const manifest=loadManifest();
try {
 for(const fixture of selectSdkGateFixtures(manifest)) {
  const bytes=readFileSync(verifyFixture(manifest,fixture).path);
  const owner=await runTemplatePackageImportPipelineV2({format:'zip',sourceId:fixture.id,sourceName:fixture.filename,buffer:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),fontRegistry:null});
  assert.equal(owner.status,'ready');owners.push(owner);
 }
 const original=owners[2].package;
 for(const mode of modes) {
  const repository=new InMemoryTemplateSessionRepositoryV2(), session=createTemplateSessionV2({repository});
  try {
   session.load(original);
   const definitions=types.map(type=>original.editableFields.find(field=>field.type===type));
   assert(definitions.every(Boolean),'Carrousel contains all five choice types');
   session.configure({fields:definitions.map(field=>({...field,configuration:{...field.configuration,choices:{mode,options:[{id:'imported',value:field.defaultValue},{id:'alternative',label:'Alternative',value:alternate[field.type]}]}}}))});
   for(const field of definitions) {
    let control=session.getFieldControllers().find(c=>c.id===field.id);
    assert(control.selectChoice('alternative').accepted);control=session.getFieldControllers().find(c=>c.id===field.id);assert.equal(control.value,alternate[field.type]);assert.equal(control.selectedChoiceId,'alternative');
    if(mode==='restricted') assert.equal(control.setValue(field.type==='number'?100:field.type==='date'?'2028-01-01':field.type==='color'?'#654321':'unlisted').accepted,false);
    assert(control.reset().accepted);assert.equal(session.getFieldControllers().find(c=>c.id===field.id).value,field.defaultValue);
    assert(session.getFieldControllers().find(c=>c.id===field.id).selectChoice('alternative').accepted);
    rows.push({kind:'single',mode,type:field.type,fieldId:field.id,configure:true,selection:true,reset:true});
   }
   const saved=await session.save();const restored=createTemplateSessionV2({repository});
   try {await restored.loadSaved(saved.id);assert.deepEqual(restored.getSnapshot().contentState,session.getSnapshot().contentState);assert.deepEqual(restored.getSnapshot().basePackage.editableFields,session.getSnapshot().basePackage.editableFields);assert.deepEqual(restored.getSnapshot().workingPackage.nodes,session.getSnapshot().workingPackage.nodes)}finally{restored.dispose()}
   for(const field of definitions) {
    const current=session.getSnapshot().basePackage.editableFields.find(candidate=>candidate.id===field.id);
    const options=current.configuration.choices.options.map(option=>option.id==='alternative'?{...option,label:'Revised',value:revised[field.type]}:option).reverse();
    session.configure({fields:[{...current,configuration:{...current.configuration,choices:{mode,options}}}]});
    let control=session.getFieldControllers().find(candidate=>candidate.id===field.id);
    assert.equal(control.value,revised[field.type]);assert.equal(control.selectedChoiceId,'alternative','Label, value and reordering preserve identity');
    session.configure({fields:[{...current,configuration:{...current.configuration,choices:{mode,options:options.filter(option=>option.id!=='alternative')}}}]});
    control=session.getFieldControllers().find(candidate=>candidate.id===field.id);assert.equal(control.value,revised[field.type]);assert.equal(control.selectedChoiceId,undefined,'Removing a selected option preserves its value and removes identity');
    if(mode==='restricted')assert(control.blockingErrors.length,'Removed restricted value remains visibly invalid');
    assert(control.reset().accepted);assert.equal(session.getFieldControllers().find(candidate=>candidate.id===field.id).value,field.defaultValue);
   }
   const savedAgain=await session.save(), reopened=createTemplateSessionV2({repository});
   try{await reopened.loadSaved(savedAgain.id);assert.deepEqual(reopened.getSnapshot().contentState,session.getSnapshot().contentState)}finally{reopened.dispose()}
  }finally{session.dispose()}
 }
 for(const mode of modes) {
  const repository=new InMemoryTemplateSessionRepositoryV2(), session=createTemplateFieldFamilySessionV2({repository});
  try {
   const family=createTemplateFieldFamilyFromSourcesV2(owners.map(owner=>owner.package),'Choices completion');session.load(family);
   const fields=family.fields.filter(field=>types.includes(field.type));
   session.configure({fields:fields.map(field=>{
    const defaults=family.variants.flatMap(variant=>variant.packageValue.editableFields.filter(f=>f.id===field.id).map(f=>f.defaultValue));
    const values=[...new Set([...defaults,alternate[field.type]])];
    return {...field,configuration:{...field.configuration,choices:{mode,options:values.map((value,index)=>({id:`option-${index+1}`,value}))}}};
   })});
   for(const variant of family.variants) {
    session.selectVariant(variant.id);
    for(const control of session.getFieldControllers().filter(c=>types.includes(c.type))) {
     const option=control.configuration.choices.options.find(option=>option.value===alternate[control.type]);
     assert(control.selectChoice(option.id).accepted);assert.equal(session.getFieldControllers().find(c=>c.id===control.id).value,alternate[control.type]);
     assert(session.getFieldControllers().find(c=>c.id===control.id).reset().accepted);
     rows.push({kind:'family',mode,type:control.type,variantId:variant.id,fieldId:control.id,selection:true,reset:true});
    }
   }
   const selected=family.variants[2];session.selectVariant(selected.id);const target=session.getSnapshot().effectivePackage.editableFields.find(field=>field.type==='text');
   session.configure({variants:[{id:selected.id,fieldOverrides:{[target.id]:{type:target.type,configuration:{choices:null}}}}]});assert.equal(session.getFieldControllers().find(c=>c.id===target.id).configuration.choices,undefined);
   session.configure({variants:[{id:selected.id,fieldOverrides:{}}]});assert(session.getFieldControllers().find(c=>c.id===target.id).configuration.choices);
   const saved=await session.save(), restored=createTemplateFieldFamilySessionV2({repository});
   try{await restored.loadSaved(saved.id);assert.deepEqual(restored.getSnapshot().family,session.getSnapshot().family);assert.deepEqual(restored.getSnapshot().contentState,session.getSnapshot().contentState)}finally{restored.dispose()}
  }finally{session.dispose()}
 }
 const color=original.editableFields.find(field=>field.type==='color');const single=createTemplateSessionV2();
 try{single.load(original);const node=color.binding.nodeId,index=color.binding.sourceIndex;assert.deepEqual(single.getSnapshot().workingPackage.nodes[node].appearance.fills[index],original.nodes[node].appearance.fills[index]);single.getFieldControllers().find(c=>c.id===color.id).setValue('#123456');single.getFieldControllers().find(c=>c.id===color.id).reset();assert.deepEqual(single.getSnapshot().workingPackage.nodes[node].appearance.fills[index],original.nodes[node].appearance.fills[index]);}finally{single.dispose()}
 writeFileSync(dir+'/native.json',JSON.stringify({schemaVersion:'choices-workflow-v1',types,modes,fixtures:owners.map(owner=>owner.sourceId),rows,exactSourceColorReset:true,syntheticConfigurations:true},null,2)+'\n');console.log(`Choices native workflows: ${rows.length} type/mode/design checks, save/reload and exact Color Reset pass.`);
}finally{owners.forEach(owner=>owner.dispose())}

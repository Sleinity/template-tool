import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {loadManifest,verifyFixture} from '../fidelity/core.mjs';
import {selectSdkGateFixtures} from '../fidelity/gate-profile.mjs';
import {runTemplatePackageImportPipelineV2,createTemplateFieldFamilyFromSourcesV2} from '@sleinity/template-browser/importer';
import {createTemplateSessionV2,createTemplateFieldFamilySessionV2} from '@sleinity/template-browser/session';
import {InMemoryTemplateSessionRepositoryV2} from '@sleinity/template-browser/persistence';
const rows=[];
mkdirSync('fidelity/evidence/choices-audit',{recursive:true});
const manifest=loadManifest();
for(const fixture of selectSdkGateFixtures(manifest)) {
 const name=fixture.id.replace('exporter-061-',''),verified=verifyFixture(manifest,fixture);
 const bytes=readFileSync(verified.path);
 const imported=await runTemplatePackageImportPipelineV2({format:'zip',sourceId:name,sourceName:name,buffer:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),fontRegistry:null});
 const repository=new InMemoryTemplateSessionRepositoryV2(),session=createTemplateSessionV2({repository});
 try{
  session.load(imported.package);const initial=session.getSnapshot();const row={fixture:fixture.id,zipSha256:fixture.zipSha256,fieldCount:initial.fields.length,configuredChoices:imported.package.editableFields.filter(f=>f.configuration.choices).length};
  if(name==='carrousel'){
   const f=initial.basePackage.editableFields.find(f=>f.type==='text'),id=f.id;row.field={id,label:f.label,defaultValue:f.defaultValue};
   const configure=choices=>{const current=session.getSnapshot().basePackage.editableFields.find(f=>f.id===id);session.configure({fields:[{...current,configuration:{...current.configuration,choices}}]});};
   try{configure({mode:'restricted',options:[{id:'option-1',value:'Option'}]});throw Error('Unexpected acceptance');}catch(e){row.genericRestrictedSeedError=e.message;assert.equal(session.getSnapshot(),initial)}
   configure({mode:'suggested',options:[{id:'offer',value:'Offer A'}]});assert(session.getFieldControllers().find(c=>c.id===id).selectChoice('offer').accepted);
   configure({mode:'suggested',options:[{id:'offer',value:'Offer B'}]});assert.equal(session.getFieldControllers().find(c=>c.id===id).value,'Offer B');row.optionValueEditChangesSelectedContent=true;
   const result=session.getFieldControllers().find(c=>c.id===id).setValue('Offer B');assert(result.accepted);row.manualMatchingValueSelectedChoiceId=session.getFieldControllers().find(c=>c.id===id).selectedChoiceId??null;
   session.getFieldControllers().find(c=>c.id===id).selectChoice('offer');configure(undefined);row.removal={value:session.getFieldControllers().find(c=>c.id===id).value,selectedChoiceId:session.getFieldControllers().find(c=>c.id===id).selectedChoiceId??null};
   configure({mode:'restricted',options:[{id:'default',value:f.defaultValue},{id:'offer',value:'Offer B'}]});session.getFieldControllers().find(c=>c.id===id).selectChoice('offer');
   configure({mode:'restricted',options:[{id:'default',value:f.defaultValue}]});row.removedSelectedOption={value:session.getFieldControllers().find(c=>c.id===id).value,blockingErrors:session.getFieldControllers().find(c=>c.id===id).blockingErrors};assert(row.removedSelectedOption.blockingErrors.some(i=>i.code==='field-v2.restricted-choice'));
   configure({mode:'suggested',options:[{id:'offer',value:'Offer B'}]});session.getFieldControllers().find(c=>c.id===id).selectChoice('offer');const saved=await session.save();const restored=createTemplateSessionV2({repository});try{await restored.loadSaved(saved.id);assert.equal(restored.getFieldControllers().find(c=>c.id===id).selectedChoiceId,'offer');row.savedChoiceIdentityRoundTrips=true}finally{restored.dispose()}
  }
  rows.push(row);
 }finally{session.dispose();imported.dispose()}
}
writeFileSync('fidelity/evidence/choices-audit/native.json',JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows,null,2));

// Separately exercise native Family inheritance; this is not Family UI coverage.
const owners=[];let familySession;
try{
 for(const fixture of selectSdkGateFixtures(manifest)){
  const bytes=readFileSync(verifyFixture(manifest,fixture).path);
  owners.push(await runTemplatePackageImportPipelineV2({format:'zip',sourceId:fixture.id,sourceName:fixture.filename,buffer:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),fontRegistry:null}));
 }
 const family=createTemplateFieldFamilyFromSourcesV2(owners.map(o=>o.package),'Choices audit');familySession=createTemplateFieldFamilySessionV2();familySession.load(family);
 const field=family.fields.find(f=>f.id==='text:subtitle'),variant=family.variants[2];
 familySession.configure({fields:[{...field,configuration:{...field.configuration,choices:{mode:'suggested',options:[{id:'shared',value:'Shared option'}]}}}]});familySession.selectVariant(variant.id);
 const inherited=familySession.getFieldControllers().find(c=>c.id===field.id).configuration.choices;
 familySession.configure({variants:[{id:variant.id,fieldOverrides:{[field.id]:{type:field.type,configuration:{choices:null}}}}]});assert.equal(familySession.getFieldControllers().find(c=>c.id===field.id).configuration.choices,undefined);
 familySession.configure({variants:[{id:variant.id,fieldOverrides:{}}]});assert.deepEqual(familySession.getFieldControllers().find(c=>c.id===field.id).configuration.choices,inherited);
 writeFileSync('fidelity/evidence/choices-audit/family.json',JSON.stringify({publicFamilyOperations:true,sources:owners.map(o=>o.sourceId),fieldId:field.id,commonChoices:inherited,explicitNullClears:true,removingOverrideRestoresInheritance:true,familyBrowserReviewed:false},null,2)+'\n');console.log('Family native choice clearing and inheritance restore pass.');
}finally{familySession?.dispose();owners.forEach(o=>o.dispose());}

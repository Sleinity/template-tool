/** Test-only component host: deferred storage faults never enter the production build. */
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import type { TemplatePackageV1 } from "@sleinity/template-core";
import { InMemoryManagedFontRegistry, setManagedFontRegistryForTests } from "@sleinity/template-browser/fonts";
import { TemplateStorageBlockedError } from "@sleinity/template-browser/persistence";
import { FamilyFontPreparationPanel } from "../components/template-family/FamilyFontPreparationPanel";
import type { TemplateFamilyV1 } from "@sleinity/template-core/family";
import { FontPreparationStep } from "../components/template-package/fonts/FontPreparationStep";
export function startStorageFontProbe(raw: TemplatePackageV1, kind = "single") {
  const source = structuredClone(raw); source.fontRequirements = [{id:"rethink-600",family:"Rethink Sans",postScriptName:"RethinkSans-SemiBold",style:"SemiBold",cssStyle:"normal",weight:600,usedBy:["headline"],characters:"Host",editable:true,mixedStyle:false,source:"figma",availableInFigma:true}];
  const registry = new InMemoryManagedFontRegistry(); const counts={lists:0,mappings:0,uploads:0,accepted:0};
  let fault: "list" | "mapping" | "upload" | null = "list", holding=false, release: (()=>void)|null=null;
  const blocked = () => new TemplateStorageBlockedError("template-package-platform",5);
  const list = registry.listManagedFonts.bind(registry);registry.listManagedFonts = async()=>{counts.lists++;if(fault==="list"){throw blocked();}return list();};
  const mapping = registry.getMapping.bind(registry);registry.getMapping = async key=>{counts.mappings++;if(fault==="mapping"){throw blocked();}return mapping(key);};
  const upload = registry.registerUploadedFont.bind(registry);registry.registerUploadedFont = async value=>{counts.uploads++;if(fault==="upload"){fault=null;throw blocked();}if(holding){holding=false;await new Promise<void>(resolve=>{release=resolve;});}return upload(value);};
  setManagedFontRegistryForTests(registry);
  const element=document.createElement("div");document.body.append(element);const root=createRoot(element);
  let replace!: (value:TemplatePackageV1)=>void;
  const familyFor = (value:TemplatePackageV1): TemplateFamilyV1 => ({schemaVersion:"template-family-v1",id:"storage-font-family",title:"Storage fonts",fields:[],variantGroups:[],variants:[value,{...structuredClone(value),packageId:value.packageId+"-second"}].map((packageValue,index)=>({id:`design-${index}`,title:`Design ${index+1}`,packageValue,source:{type:"package-zip"},bindings:[],ruleOverrides:{},groupAssignments:{}}))});
  function Host(){const [value,setValue]=useState(source);const [family,setFamily]=useState(()=>familyFor(source));replace=next=>{setValue(next);setFamily(familyFor(next));};if(kind==="family") return <FamilyFontPreparationPanel family={family} onFamilyChange={next=>{counts.accepted++;setFamily(next);}}/>;return <FontPreparationStep packageValue={value} onPackageChange={next=>{counts.accepted++;setValue(next);}}/>;}
  flushSync(()=>root.render(<StrictMode><Host/></StrictMode>));
  return {counts,inject(next:typeof fault){fault=next;},hold(){holding=true;},held:()=>Boolean(release),release(){release?.();release=null;},replace(){flushSync(()=>replace({...structuredClone(source),packageId:source.packageId+"-replacement"}));},unmount(){flushSync(()=>root.unmount());},source};
}

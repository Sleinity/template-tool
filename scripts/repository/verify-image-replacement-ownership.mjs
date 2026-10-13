import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { serialize, deserialize } from "node:v8";
import { build } from "vite";
import { repoRoot, parseArguments, sha256 } from "../fidelity/core.mjs";
const args = parseArguments(process.argv.slice(2)), runId = args["run-id"];
assert(runId && /^[a-zA-Z0-9_-]+$/.test(runId));
const root = join(repoRoot,"fidelity/evidence/image-replacement-ownership"), output = join(root,runId);
const beforeRun = args["before-run"] ?? "before-20261009a", beforeDir = args["before-directory"] ?? join(root,beforeRun);
const baseline = JSON.parse(readFileSync(join(beforeDir,"baseline.json")));
const natives = Object.keys(baseline.sourceHashes);
const before = Object.fromEntries(natives.map(file => [file, readFileSync(join(beforeDir,file.split('/').at(-1)),"utf8")]));
for(const file of natives) assert.equal(sha256(before[file]),baseline.sourceHashes[file]);
for(const [file,hash] of Object.entries(baseline.protectedArtifacts)) assert.equal(sha256(readFileSync(join(repoRoot,file))),hash,`Protected artifact ${file}`);
async function execute(sources, repaired) {
 const dir=mkdtempSync(join(tmpdir(),"replacement-evidence-"));let substitutions=0;
 try {
 await build({root:repoRoot,configFile:false,logLevel:"silent",ssr:{noExternal:true},plugins:[{name:"before-replacement",enforce:"pre",transform(source,id){const file=natives.find(file=>join(repoRoot,file)===id.split('?')[0]);if(file){if(sources){substitutions++;source=sources[file]}source=source.replace("  const revokeOwned = (assetId?: string) => {", "  const revokeOwned = (assetId?: string) => {\n    const __start = performance.now();");source=source.replace("      releaseUrl(url);\n    }\n  };\n  const revokeSources", "      releaseUrl(url);\n    }\n    globalThis.__replacementReleaseMeasure.ms += performance.now() - __start;\n  };\n  const revokeSources");return {code:source,map:null}}}}],build:{target:"esnext",ssr:join(repoRoot,"packages/template-browser/test/imageReplacementOwnership.integration.ts"),outDir:dir,rollupOptions:{output:{entryFileNames:"verify.mjs"}}}});
 if(sources)assert.equal(substitutions,2);
 globalThis.__replacementReleaseMeasure={ms:0};
 const module=await import(pathToFileURL(join(dir,"verify.mjs")));
 const OriginalDate=Date, originalUuid=crypto.randomUUID;let serial=0;
 globalThis.Date=class extends OriginalDate{constructor(...a){super(...(a.length?a:[1791536400000]));}static now(){return 1791536400000}};
 crypto.randomUUID=()=>`00000000-0000-4000-8000-${String(++serial).padStart(12,'0')}`;
 let transcript;try{transcript=await module.verifyImageReplacementOwnership(repaired)}finally{globalThis.Date=OriginalDate;crypto.randomUUID=originalUuid}
 const measurements=[];for(let trial=1;trial<=3;trial++)measurements.push({trial,rows:await module.measureImageReplacementOwnership(repaired)});
 return {transcript,measurements};
 }finally{rmSync(dir,{recursive:true,force:true})}
}
if(args["expect-repair"]){await execute(null,true);console.log("Repair expectations passed.");process.exit(0)}
if(args.baseline){assert(!existsSync(join(beforeDir,"transcript.v8")));const result=await execute(before,false);writeFileSync(join(beforeDir,"transcript.v8"),serialize(result.transcript));writeFileSync(join(beforeDir,"measurements.json"),JSON.stringify(result.measurements,null,2));console.log(`Pre-repair ${result.transcript.length} scenarios retained.`);process.exit(0)}
assert(!existsSync(output));
const prior=await execute(before,false);assert.deepEqual(prior.transcript,deserialize(readFileSync(join(beforeDir,"transcript.v8"))),"Baseline regenerates exactly.");
const current=await execute(null,true);assert.equal(current.transcript.length,prior.transcript.length);
const differences=[];
const changedScenarios=new Set(["same","roundtrip","shared-fields","source-collision","source-overlap","receiver","save-success","save-reject","queued-cancel","overlap","crop"]);
for(let i=0;i<current.transcript.length;i++){
 const a=prior.transcript[i],b=current.transcript[i];assert.equal(a.kind,b.kind);assert.equal(a.scenario,b.scenario);assert.deepEqual(a.semantic,b.semantic,`${b.kind}/${b.scenario} canonical transcript`);assert.equal(a.reads,b.reads);assert.equal(a.writes,b.writes);
 if(b.kind==='family')assert.deepEqual(a.resources,b.resources,"Family resource behavior unchanged");
 else if(JSON.stringify(a.resources)!==JSON.stringify(b.resources)){
  assert(changedScenarios.has(b.scenario),`Unexpected resource difference: ${b.scenario}`);
  assert.deepEqual(a.resources.filter(e=>e.event==='create'),b.resources.filter(e=>e.event==='create'),'Same allocation events');
  assert.deepEqual(a.resources.filter(e=>e.event==='revoke').map(e=>e.url).sort(),b.resources.filter(e=>e.event==='revoke').map(e=>e.url).sort(),'Same final revocations');
  assert.deepEqual(a.resources.find(e=>e.event==='checkpoint'&&e.name==='before-transition'),b.resources.find(e=>e.event==='checkpoint'&&e.name==='before-transition'),'Same ownership before replacement');
  differences.push({kind:b.kind,scenario:b.scenario,before:a.resources,after:b.resources});
 }
}
assert(differences.length>0);
const counts=rows=>rows.flatMap(g=>g.rows.map(({kind,repetitions,allocations,releases})=>({kind,repetitions,allocations,releases})));
assert.deepEqual(counts(prior.measurements),counts(current.measurements));
mkdirSync(output,{recursive:true});
for(const file of natives)writeFileSync(join(output,file.split('/').at(-1)),readFileSync(join(repoRoot,file)));
writeFileSync(join(output,"transcript.v8"),serialize(current.transcript));
const report={runId,beforeRun,commit:execFileSync('git',['rev-parse','HEAD'],{cwd:repoRoot,encoding:'utf8'}).trim(),sourceHashes:Object.fromEntries(natives.map(file=>[file,sha256(readFileSync(join(repoRoot,file)))])),baselineHashes:baseline.sourceHashes,transcriptSha256:sha256(serialize(current.transcript)),scenarios:current.transcript.length,canonicalEquality:true,familyResourceEquality:true,countsEqual:true,resourceDifferences:differences,measurements:{before:prior.measurements,after:current.measurements}};
writeFileSync(join(output,"report.json"),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,resourceDifferences:differences.map(({kind,scenario})=>({kind,scenario})),measurements:undefined}));

/** Ongoing registry smoke; prior exact/font/PNG certification remains separately retained. */
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm,realpath} from 'node:fs/promises';
import path from 'node:path';import {tmpdir} from 'node:os';import {spawnSync} from 'node:child_process';
import {archiveFiles,validateRegistryLock} from '../release-publication/host-installation.mjs';
import {sha256} from '../release-publication/candidate.mjs';
import {RegistryReadClient} from '../release-publication/registry.mjs';
import {extractCandidateExamples} from '../repository/local-sdk-candidate.mjs';
import {createCompactLifecycleFixture} from '../compact-lifecycle-fixture.mjs';
export async function verifyRegistryHosts({baseline:b},delivery){
 const rows=[];const client=new RegistryReadClient();
 for(const manager of ['npm','pnpm']){
  const dir=await mkdtemp(path.join(tmpdir(),'sdk-stable-'+manager+'-'));
  const env={...process.env,NPM_CONFIG_USERCONFIG:path.join(dir,'.npmrc'),NPM_CONFIG_CACHE:path.join(dir,'.cache'),npm_config_store_dir:path.join(dir,'.store'),CI:'true'};delete env.NODE_PATH;
  const run=(cmd,args)=>{const r=spawnSync(cmd,args,{cwd:dir,env,encoding:'utf8',maxBuffer:16*1024*1024});assert.equal(r.status,0,cmd+' failed; private output withheld');return (r.stdout??'')+(r.stderr??'');};
  try{
   const started=Date.now(),records=[];
   for(const row of b.archives){const s=await client.inspect(row.name,b.version);assert.equal(s.state,'present');assert.equal(sha256(await client.download(s)),row.sha256);records.push({name:row.name,version:b.version,integrity:s.integrity,tarballUrlSha256:sha256(new URL(s.url).href)});}
   const dependencies=Object.fromEntries(b.archives.map(r=>[r.name,b.version]));
   for(const name of ['react','react-dom','@types/react','@types/react-dom','typescript'])dependencies[name]=JSON.parse(await readFile(path.join(process.cwd(),'node_modules',name,'package.json'))).version;
   await writeFile(path.join(dir,'package.json'),JSON.stringify({name:'sdk-stable-registry-host',private:true,type:'module',dependencies}));
   await writeFile(path.join(dir,'.npmrc'),'registry=https://registry.npmjs.org/\n@sleinity:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}\n',{mode:0o600});
   await writeFile(path.join(dir,'pnpm-workspace.yaml'),'packages:\n  - .\n');
   run(manager,['install','--ignore-scripts',...(manager==='npm'?['--no-audit','--no-fund']:[])]);
   const lock=await readFile(path.join(dir,manager==='npm'?'package-lock.json':'pnpm-lock.yaml'),'utf8');assert(!/file:.*sleinity|workspace:|link:/.test(lock));validateRegistryLock(lock,manager,records);
   for(const row of b.archives){const installed=await realpath(path.join(dir,'node_modules',row.name));assert(installed.startsWith(await realpath(dir)+path.sep));for(const f of archiveFiles(await readFile(path.join(delivery,row.file))))assert.equal(sha256(await readFile(path.join(installed,f.file))),sha256(f.bytes));}
   await mkdir(path.join(dir,'src'));
   for(const [i,text] of extractCandidateExamples(await readFile(path.join(delivery,'SDK-V2-INTEGRATION.md'),'utf8')).entries())await writeFile(path.join(dir,'src',`guide-${i}.tsx`),text);
   const manifest=JSON.parse(await readFile(path.join(delivery,'SDK-DELIVERY-MANIFEST.json')));
   for(const row of manifest.files.filter(r=>/\.tsx?$/.test(r.file)))await copyFile(path.join(delivery,row.file),path.join(dir,'src',row.file));
   await writeFile(path.join(dir,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2020',lib:['ES2020','DOM','DOM.Iterable'],module:'ESNext',moduleResolution:'Bundler',strict:true,skipLibCheck:false,jsx:'react-jsx',noEmit:true},include:['src']}));
   run(process.execPath,[path.join(dir,'node_modules/typescript/bin/tsc'),'-p','tsconfig.json']);
   const fixture=await createCompactLifecycleFixture();await writeFile(path.join(dir,'synthetic.zip'),fixture.bytes);
   // Reuse the retained scenario exactly; only installation is registry-based.
   const historical=await readFile('scripts/release-publication/consumer.mjs','utf8');
   const probe=historical.match(/path\.join\(workspace, 'probe\.mjs'\),\s*`([\s\S]*?)`,/);assert(probe,'Retained synthetic scenario missing');await writeFile(path.join(dir,'probe.mjs'),probe[1]);
   const result=run(process.execPath,['probe.mjs']);rows.push({manager,status:'pass',durationMs:Date.now()-started,contractLogSha256:sha256(result),installation:'registry',strictDeclarations:true,exactSourceCertification:false});
  }finally{await rm(dir,{recursive:true,force:true});}
 }
 return rows;
}

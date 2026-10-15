/** Build the storage host using only installed unpublished archives. */
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build,preview} from 'vite';
export async function createPackedStorageHost(archives, manager='pnpm') {
 const directory=await mkdtemp(path.join(tmpdir(),'blocked-storage-packed-'));
 const dependencies={}, identities=[];await mkdir(path.join(directory,'vendor'));await mkdir(path.join(directory,'src'));
 for(const name of ['template-core','template-browser','template-react']) {
  const version=JSON.parse(await readFile(`packages/${name}/package.json`,'utf8')).version, file=`sleinity-${name}-${version}.tgz`;
  const bytes=await readFile(path.join(archives,file));identities.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});await cp(path.join(archives,file),path.join(directory,'vendor',file));dependencies[`@sleinity/${name}`]=`file:vendor/${file}`;
 }
 const installed=async name=>JSON.parse(await readFile(`node_modules/${name}/package.json`,'utf8')).version;
 await writeFile(path.join(directory,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{...dependencies,react:await installed('react'),'react-dom':await installed('react-dom'),typescript:await installed('typescript'),'@types/react':await installed('@types/react'),'@types/react-dom':await installed('@types/react-dom')},...(manager==='npm'?{overrides:dependencies}:{})}));
 if(manager==='pnpm')await writeFile(path.join(directory,'pnpm-workspace.yaml'),`packages:\n  - .\noverrides:\n${Object.entries(dependencies).map(([name,file])=>`  "${name}": "${file}"`).join('\n')}\n`);
 await writeFile(path.join(directory,'.npmrc'),'');const env={...process.env,CI:'true',NPM_CONFIG_USERCONFIG:path.join(directory,'.npmrc')};for(const key of ['NODE_AUTH_TOKEN','NPM_TOKEN','GH_TOKEN','GITHUB_TOKEN'])delete env[key];
 const run=(command,args)=>{const r=spawnSync(command,args,{cwd:directory,env,encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);};
 run(manager,manager==='npm'?['install','--ignore-scripts','--prefer-offline','--no-audit','--no-fund']:['install','--prefer-offline']);
 const lock=await readFile(path.join(directory,manager==='npm'?'package-lock.json':'pnpm-lock.yaml'),'utf8');assert(!/workspace:|link:|npm\.pkg\.github\.com/.test(lock));
 await cp('packages/template-browser/test/blockedStorageHost.browser.ts',path.join(directory,'src/host.ts'));
 await writeFile(path.join(directory,'src/contracts.ts'),`import {TemplateStorageBlockedError as Root} from "@sleinity/template-browser";
import {TemplateStorageBlockedError as Persistence} from "@sleinity/template-browser/persistence";
const cause = new Persistence("host-db", 5); const root: Root = cause;
const code: "template-storage-blocked" = root.code; const retryable: true = root.retryable;
const name: string = root.databaseName; const version: number = root.requestedVersion;
// @ts-expect-error Diagnostic identity is readonly.
root.databaseName = "changed";
// @ts-expect-error Stable code is readonly.
root.code = "changed";
`);
 await writeFile(path.join(directory,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',lib:['ES2022','DOM','DOM.Iterable'],module:'ESNext',moduleResolution:'Bundler',strict:true,skipLibCheck:false,noEmit:true},include:['src']}));
 run(process.execPath,[path.join(directory,'node_modules/typescript/bin/tsc'),'--noEmit']);
 await build({root:directory,configFile:false,logLevel:'error',build:{minify:false,rollupOptions:{input:path.join(directory,'src/host.ts'),preserveEntrySignatures:'strict',output:{entryFileNames:'host.js'}}}});
 const server=await preview({root:directory,configFile:false,logLevel:'error',preview:{host:'127.0.0.1',port:0}});
 return {url:server.resolvedUrls.local[0],entry:'/host.js',identities,manager,strictDeclarations:true,async close(){await new Promise(resolve=>server.httpServer.close(resolve));await rm(directory,{recursive:true,force:true});}};
}

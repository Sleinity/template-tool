/** Reproduction only: accepted-resource pruning is deferred outside hydration extraction.
 * Optional arguments: hash-verified original and extracted historical sources. */
import { build } from 'vite';
import { writeFileSync,readFileSync,mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
const repo=fileURLToPath(new URL('../../../',import.meta.url)).replace(/\/$/,'');
const record=JSON.parse(readFileSync(join(repo,'docs/architecture/evidence/stored-asset-hydration-20261009.json'),'utf8'));
const original=resolve(process.argv[2] ?? join(repo,'fidelity/evidence/stored-asset-hydration/hydration-original-20261009a/templateSessionV2.ts'));
const extracted=resolve(process.argv[3] ?? join(repo,'fidelity/evidence/stored-asset-hydration/hydration-extracted-20261009e/templateSessionV2.ts'));
const {createHash}=await import('node:crypto');
assert.equal(createHash('sha256').update(readFileSync(original)).digest('hex'),record.stages.original.sourceHashes['packages/template-browser/src/session/templateSessionV2.ts']);
assert.equal(createHash('sha256').update(readFileSync(extracted)).digest('hex'),record.stages.extracted.sourceHashes['packages/template-browser/src/session/templateSessionV2.ts']);
const rows=[];
for(const stage of ['original','extracted']) {
 const dir=mkdtempSync(join(tmpdir(),'hydration-extra-')); let substitutions=0;
 try {
 const input=join(dir,'probe.ts');
 writeFileSync(input,`import {createTemplateSessionV2} from '${repo}/packages/template-browser/src/session/templateSessionV2';
 import {v2Package} from '${repo}/packages/template-browser/test/sessionContract.fixtures';
 import {sessionAssetUrlLeases} from '${repo}/packages/template-browser/src/session/sessionAssetUrlLeases';
 export async function probe(){let creates=0;const revoked:string[]=[]; const s=createTemplateSessionV2({objectUrls:{create:()=> 'blob:extra-'+(++creates),revoke:u=>revoked.push(u)}});s.load(v2Package());const c=s.getFieldControllers().find(c=>c.type==='image');if(!c||c.type!=='image')throw Error('image'); const a=await c.replaceImage({blob:new Blob(['accepted'],{type:'image/png'}),assetId:'same-id',width:1,height:1});const b=await c.replaceImage({dataUrl:'data:image/png;base64,AQID',assetId:'same-id',width:1,height:1});const before={accepted:[a.accepted,b.accepted],descriptor:s.getSnapshot().sessionAssets['same-id'],leases:[...sessionAssetUrlLeases].filter(([u])=>u.startsWith('blob:extra')).map(([url,lease])=>({url,count:lease.count})),revoked:[...revoked]};s.dispose();return {before,revokedAfterDispose:revoked};}`);
 await build({root:repo,configFile:false,logLevel:'silent',ssr:{noExternal:true},plugins:[{name:'native-probe',enforce:'pre',transform(source,id){if(id===repo+'/packages/template-browser/src/session/templateSessionV2.ts'){substitutions++;return {code:readFileSync(stage==='original'?original:extracted,'utf8'),map:null}}}}],build:{ssr:input,target:'esnext',outDir:join(dir,'out'),rollupOptions:{output:{entryFileNames:'probe.mjs'}}}});
 assert.equal(substitutions,1,'Original source substitution must actually execute.');
 rows.push({stage,result:await (await import(pathToFileURL(join(dir,'out/probe.mjs')))).probe()});
 } finally{rmSync(dir,{recursive:true,force:true})}
}
assert.deepEqual(rows[0].result,rows[1].result,'Both retained historical stages reproduce the pre-repair retention defect.');
assert.equal(rows[1].result.before.revoked.length,0);
assert.equal(rows[1].result.before.leases[0].count,1);
assert.equal(rows[1].result.revokedAfterDispose.length,1);
console.log(JSON.stringify(rows,null,2));

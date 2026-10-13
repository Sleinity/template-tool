import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir,writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import { createStudioViteServer } from "./studio-vite-server.mjs";
const png = (r,g,b) => { const p = new PNG({width:1,height:1});p.data.set([r,g,b,255]);return `data:image/png;base64,${PNG.sync.write(p).toString('base64')}`; };
const oldData=png(255,0,0),nextData=png(0,0,255),entry='/@fs/'+fileURLToPath(new URL('../../packages/template-react/test/imageReplacementOwnership.browser.tsx',import.meta.url));
const server=await createStudioViteServer();await server.listen();const browser=await chromium.launch({headless:true});const rows=[];
try{for(const kind of ['single','family']){
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(server.resolvedUrls.local[0]);await page.evaluate(async({entry,kind,oldData,nextData})=>{window.ownership=await(await import(entry)).startImageOwnershipProbe(kind,oldData,nextData)},{entry,kind,oldData,nextData});
 await page.waitForFunction(()=>window.ownership.state().ready);const before=await page.evaluate(()=>window.ownership.state());assert.equal(before.revoked.length,0);
 assert((await page.evaluate(()=>window.ownership.replace())).accepted);await page.waitForFunction(revision=>window.ownership.state().ready&&window.ownership.state().revision>revision,before.revision);
 const after=await page.evaluate(()=>window.ownership.state());assert.equal(after.currentAsset.dataUrl,nextData);assert.equal(after.revoked.length,0,'Receiving renderer still owns the old URL');assert(await page.evaluate(async url=>(await fetch(url)).ok,after.oldUrl));
 const exports=await page.evaluate(()=>window.ownership.export());
 const sample = result => {const p=PNG.sync.read(Buffer.from(result.pngDataUrl.split(',')[1],'base64'));const offset=(Math.floor(p.height/2)*p.width+Math.floor(p.width/2))*4;return [...p.data.subarray(offset,offset+4)]};
 assert.deepEqual(sample(exports.current),[0,0,255,255]);assert.deepEqual(sample(exports.peer),[255,0,0,255]);
 await page.evaluate(()=>window.ownership.releasePeer());const released=await page.evaluate(()=>window.ownership.state());assert.deepEqual(released.revoked,[released.oldUrl]);await page.evaluate(()=>window.ownership.dispose());assert.deepEqual(errors,[]);rows.push({kind,before,after,released,exports:{current:{width:exports.current.width,height:exports.current.height},peer:{width:exports.peer.width,height:exports.peer.height}},errors});await page.close();
}await mkdir('fidelity/evidence/image-replacement-ownership',{recursive:true});await writeFile('fidelity/evidence/image-replacement-ownership/browser.json',JSON.stringify({profile:'headless Chromium',synthetic:true,sourceReview:false,rows},null,2));console.log('Single/Family embedded render and PNG, receiving renderer ownership and final cleanup passed.');}finally{await browser.close();await server.close()}

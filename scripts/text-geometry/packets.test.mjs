import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encodePacket, decodePacket, writePacket } from './packets.mjs';
const node = { text: 'long opaque evidence '.repeat(50), attributes: { absent: null, zero: 0 }, animations: [], style: 'a'.repeat(300) };
const row = { scenario: 'fixture', trace: { frames: Array.from({length: 100}, (_, index) => ({at:index, nodeEvidence:{id:node}, nodes:{id:[0,0,10,20]}, readiness:{ready:true}})) } };
const original = { phase:'paired', rows:[row, structuredClone(row)], failures:[] };
const encoded = encodePacket(original);
assert.deepEqual(decodePacket(JSON.parse(encoded)), original);
assert(encoded.length < JSON.stringify(original).length / 4, 'Repeated complete frame subtrees remain losslessly compact');
assert.deepEqual(decodePacket({message:{$longString:0},longStringPool:['historical']}), {message:'historical'});
assert.throws(() => decodePacket({message:{$longString:1},longStringPool:[]}), /Invalid packet string reference/);
assert.throws(() => decodePacket({nodes:{$packetObject:1},packetObjectPool:[],longStringPool:[]}), /Invalid packet object reference/);
const directory = await mkdtemp(join(tmpdir(),'text-evidence-packets-'));
try {
 const path=join(directory,'packet.json');
 await writePacket(path, original);
 const decoded=decodePacket(JSON.parse(await readFile(path,'utf8')));
 assert.deepEqual(decoded,original);
 assert.deepEqual(Object.keys(decoded.rows[0].trace.frames[0]),Object.keys(row.trace.frames[0]),'Property order survives streaming');
 decoded.rows[0].trace.frames[0].nodeEvidence.id.attributes.zero=1;
 assert.equal(decoded.rows[0].trace.frames[1].nodeEvidence.id.attributes.zero,0,'Decoded frames do not acquire shared mutable identity');
 await assert.rejects(readFile(path+'.partial'), {code:'ENOENT'});
 await assert.rejects(writePacket(path,{rows:null}),/Evidence rows are required/);
} finally {await rm(directory,{recursive:true,force:true});}
console.log('Lossless historical and streamed frame packets preserve complete evidence.');

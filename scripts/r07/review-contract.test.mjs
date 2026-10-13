import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertR07ReviewIdentity,comparableEnvironment} from './review-contract.mjs';
const review={schemaVersion:'r07-source-review-v1',sourceReview:'reviewed-source-faithful',fixtureId:'exporter-061-carrousel',surface:'editor',afterSha256:'new',beforeSha256:'old',environmentSha256:'env',source:{zipSha256:'zip',fontBinarySha256:'font',assetSha256:'image'},camera:'camera',sourceReason:'Source-authoritative FILL',reason:'Reviewed viewport history',cause:'Initial zoom'};
const actual={candidateSha256:'new',beforeSha256:'old',environmentSha256:'env',source:review.source,camera:'camera',repeatHashes:['new','new']};
test('a stable raster cannot inherit review from different source/font/camera/environment',()=>{
 assert.doesNotThrow(()=>assertR07ReviewIdentity(review,actual));
 for(const delta of[{candidateSha256:'different'},{beforeSha256:'different'},{environmentSha256:'different'},{camera:'different'},{source:{...review.source,fontBinarySha256:'substitute'}},{source:{...review.source,assetSha256:'different'}},{repeatHashes:['new']},{repeatHashes:['new','different']}])assert.throws(()=>assertR07ReviewIdentity(review,{...actual,...delta}));
 assert.throws(()=>assertR07ReviewIdentity({...review,surface:'png-export'},actual));
 assert.throws(()=>assertR07ReviewIdentity({...review,sourceReason:''},actual));
});
test('only observational timings may differ in retained environment',()=>{
 const a={browserVersion:'149',fontSources:[{sha256:'exact'}],testTimestamp:'a',approximateProcessMemoryBytes:1,fontDecisions:[{binaryHash:'exact',uploadAndLinkMs:1}]};
 const b={...a,testTimestamp:'b',approximateProcessMemoryBytes:2,fontDecisions:[{binaryHash:'exact',uploadAndLinkMs:2}]};
 assert.deepEqual(comparableEnvironment(a),comparableEnvironment(b));
 assert.notDeepEqual(comparableEnvironment(a),comparableEnvironment({...b,browserVersion:'150'}));
 assert.notDeepEqual(comparableEnvironment(a),comparableEnvironment({...b,fontSources:[{sha256:'substitute'}]}));
});

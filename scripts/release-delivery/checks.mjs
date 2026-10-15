/** Current-run checks with durable exit codes; no production imports. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root='docs/architecture/evidence/release-delivery-20261013/checks';mkdirSync(root,{recursive:true});
const groups={
 delivery:[['delivery-unit','node --test scripts/release-delivery/*.test.mjs'],['major-staging','node scripts/release-delivery/stage-major.mjs'],['delivered-example-npm','node scripts/example-lifecycle/verify.mjs --archives release-verification-artifacts/release-delivery-20261013a --manager npm --delivered --output docs/architecture/evidence/release-delivery-20261013/example-npm'],['delivered-example-pnpm','node scripts/example-lifecycle/verify.mjs --archives release-verification-artifacts/release-delivery-publication-simulation-20261013a --manager pnpm --delivered --output docs/architecture/evidence/release-delivery-20261013/example-pnpm']],
 seal:[['delivery-unit-sealed','node --test scripts/release-delivery/*.test.mjs'],['release-workflow-sealed','node scripts/repository/verify-release-contract.mjs'],['documentation-sealed','pnpm docs:verify'],['whitespace','git diff --check']],
 supplementary:[
 ['delivery-unit-final','node --test scripts/release-delivery/*.test.mjs'],
 ['v2-ownership-unit','node scripts/example-lifecycle/unit.mjs docs/architecture/evidence/release-delivery-20261013/lifecycle-unit.json'],
 ['v1-family-compatibility','node scripts/repository/verify-template-family-reference.mjs --archives release-verification-artifacts/release-delivery-20261013a'],
 ],
 final:[
  ['portable-final','pnpm test:portable'],['documentation','pnpm docs:verify'],
  ['review-contract','node --test scripts/r07/review-contract.test.mjs'],
  ['capture-camera','node scripts/fidelity/capture-camera.test.mjs'],
 ],
 build:[
  ['portable','pnpm test:portable'],['typescript','pnpm exec tsc -b --pretty false'],
  ['studio-build','pnpm --filter @sleinity/template-studio build'],['sdk','pnpm sdk:verify'],
  ['examples','pnpm example:build'],['documentation','pnpm docs:verify'],
 ],
 browser:[
  ['font-reactivation','pnpm font:reactivation:verify'],['font-routing','pnpm runtime-routing:fonts'],
  ['text-trim','pnpm runtime-routing:text-trim'],['routing','pnpm runtime-routing:scenarios'],
  ['setup','pnpm studio:setup'],['drafts','pnpm studio:drafts'],['field-rules','pnpm field-rules:studio'],
  ['family-parity','pnpm studio:family-parity'],['workflow','pnpm studio:workflow-acceptance'],
  ['output-workspace','node scripts/studio-product/verify.mjs --output fidelity/evidence/release-delivery/output-workspace'],
  ['output-lifecycle','node scripts/editor-performance/verify.mjs --output fidelity/evidence/release-delivery/output-lifecycle'],
  ['storage-retry','node scripts/repository/verify-studio-blocked-storage.mjs --output fidelity/evidence/release-delivery/studio-storage'],
  ['storage-fonts','node scripts/repository/verify-studio-storage-fonts.mjs --output fidelity/evidence/release-delivery/studio-storage-fonts'],
 ],
 packed:[
  ['npm-consumer','node scripts/repository/verify-runtime-release-consumer.mjs --archives release-verification-artifacts/release-delivery-20261013a'],
  ['pnpm-consumer','TEMPLATE_CONSUMER_PACKAGE_MANAGER=pnpm node scripts/repository/verify-runtime-release-consumer.mjs --archives release-verification-artifacts/release-delivery-20261013a'],
  ['r01-host','node scripts/repository/verify-host-font-authority.mjs --archives release-verification-artifacts/release-delivery-20261013a --output fidelity/evidence/release-delivery/host-font'],
  ['r04-unit','node scripts/repository/verify-blocked-storage-unit.mjs'],['v1-compatibility','node scripts/repository/verify-template-editor-reference.mjs --archives release-verification-artifacts/release-delivery-20261013a'],
  ['r04-npm','node scripts/repository/verify-blocked-storage.mjs --archives release-verification-artifacts/release-delivery-20261013a --manager npm --output fidelity/evidence/release-delivery/storage-npm'],
  ['r04-pnpm','node scripts/repository/verify-blocked-storage.mjs --archives release-verification-artifacts/release-delivery-20261013a --manager pnpm --output fidelity/evidence/release-delivery/storage-pnpm'],
 ],
};
const group=process.argv[2];if(!groups[group])throw new Error('Expected build, browser or packed');
const rows=process.argv.includes('--resume')?JSON.parse(readFileSync(`${root}/${group}.json`,'utf8')).filter(row=>row.exitCode===0):[];for(const [label,command]of groups[group]){if(rows.some(row=>row.label===label))continue;
 const start=Date.now(),result=spawnSync(command,{shell:true,encoding:'utf8',maxBuffer:32*1024*1024,env:process.env});
 const output=(result.stdout??'')+(result.stderr??'');const path=`${root}/${group}-${label}.log`;writeFileSync(path,output);
 rows.push({label,command,started:new Date(start).toISOString(),durationMs:Date.now()-start,exitCode:result.status,error:result.error?.message??null,log:path,logSha256:createHash('sha256').update(output).digest('hex')});
 writeFileSync(`${root}/${group}.json`,JSON.stringify(rows,null,2)+'\n');console.log(`${label}: ${result.status} (${Math.round((Date.now()-start)/1000)}s)`);
 if(result.status!==0){console.error(output.slice(-6000));process.exitCode=1;break;}
}

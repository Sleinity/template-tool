/** Fresh before comparison without modifying the user's checkout or app. */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const runId=process.argv[2]??'sdk-061-now-hiring-text-before-20261010a';
const identityPath='docs/architecture/evidence/now-hiring-text-baseline/identity.json';
const result=spawnSync('pnpm',['fidelity:compare','--','--gate','sdk-061','--run-id',runId,'--font-profile','source-authoritative','--repeat','2'],{env:{...process.env,EDITOR_RETAINED_SOURCE_IDENTITY:identityPath},encoding:'utf8',maxBuffer:35*1024*1024});
process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');
writeFileSync(`fidelity/candidates/${runId}/retained-source-identity.json`, JSON.stringify({runId,identityPath,identity:JSON.parse(readFileSync(identityPath)),productionSourcesModified:false,referencePromotion:false,exitCode:result.status},null,2)+'\n');
process.exitCode=result.status??1;

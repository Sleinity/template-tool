import assert from 'node:assert/strict';import { mkdir,writeFile } from 'node:fs/promises';import path from 'node:path';import { pathToFileURL } from 'node:url';import { unzipSync } from 'fflate';import { github,githubJson } from './github.mjs';import { sha256 } from './candidate.mjs';
export function previousInvocation(runs,currentId,currentAttempt){const current=runs.find(r=>r.id===currentId);assert(current,'Current workflow run unavailable');if(currentAttempt>1)return {run:current,attempt:currentAttempt-1};const prior=runs.filter(r=>r.event==='push'&&r.id!==currentId&&r.created_at<current.created_at).sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];return prior?{run:prior,attempt:prior.run_attempt}:null;}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const output=process.argv[2];assert(output&&process.env.GITHUB_RUN_ID&&process.env.GITHUB_SHA&&process.env.GITHUB_RUN_ATTEMPT);
  const runs=githubJson('actions/workflows/release.yml/runs?head_sha='+process.env.GITHUB_SHA+'&per_page=100').workflow_runs??[];
  const previous=previousInvocation(runs,Number(process.env.GITHUB_RUN_ID),Number(process.env.GITHUB_RUN_ATTEMPT));
  if(previous){
    const {run,attempt}=previous;const jobs=githubJson(`actions/runs/${run.id}/attempts/${attempt}/jobs`).jobs??[];
    const publish=jobs.find(j=>j.name==='publish'),step=publish?.steps?.find(s=>s.name==='Publish exact archives after human environment approval');
    if(step&&step.status!=='skipped'&&step.conclusion!=='skipped'&&step.started_at){
      const artifacts=githubJson('actions/runs/'+run.id+'/artifacts').artifacts.filter(a=>a.name==='sdk-publication-journal-'+attempt);
      assert.equal(artifacts.length,1,'Previous release journal missing; manual reconciliation required');const a=artifacts[0];assert.equal(a.expired,false,'Previous journal expired; manual reconciliation required');
      const bytes=github('actions/artifacts/'+a.id+'/zip',{binary:true});assert.equal('sha256:'+sha256(bytes),a.digest);const journal=unzipSync(bytes)['journal.json'];assert(journal,'Publication started but its journal is absent; manual reconciliation required');
      await mkdir(output,{recursive:true});await writeFile(path.join(output,'journal.json'),journal,{flag:'wx'});
    }
  }
  console.log(JSON.stringify({previousRun:previous?.run.id??null,previousAttempt:previous?.attempt??null}));
}

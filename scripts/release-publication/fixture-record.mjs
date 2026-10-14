import {execFileSync} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {ciphertextSha256} from './fixtures.mjs';
const[directory,id,digest]=process.argv.slice(2);assert(directory&&/^\d+$/.test(id)&&/^[a-f0-9]{64}$/.test(digest));
await mkdir(directory,{recursive:true});await writeFile(path.join(directory,'fixture-artifact.json'),JSON.stringify({id:Number(id),name:'sdk-1.0.0-sealed-fixtures',runId:Number(process.env.GITHUB_RUN_ID),headSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),digest:'sha256:'+digest,ciphertextSha256,retentionDays:3},null,2)+'\n');

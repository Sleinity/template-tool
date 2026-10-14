import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile, chmod } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { verifyFrozenCandidate } from '../candidate-certification/frozen.mjs';
import { archivePackageManifest } from '../release-delivery/bundle.mjs';

export const descriptorFile = 'config/sdk-publication-candidate.json';
export const registryUrl = 'https://npm.pkg.github.com';
export const repository = 'Sleinity/template-tool';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const packageNames = ['@sleinity/template-core','@sleinity/template-browser','@sleinity/template-react'];
const reviewedPaths = new Set(['package.json','.github/workflows/release.yml','scripts/release-delivery/workflow.mjs','scripts/release-delivery/workflow.test.mjs','scripts/release-delivery/simulate-publication.mjs','scripts/repository/verify-release-contract.mjs','docs/sdk/RELEASE_PREPARATION.md','docs/sdk/GITHUB_SETUP.md']);
export function safeRelative(file) {
  assert(typeof file === 'string' && file && !file.includes('\\') && !file.includes('\0') && !path.posix.isAbsolute(file) && file.split('/').every(p=>p && p!=='.' && p!=='..'), 'Unsafe candidate path');
  return file;
}
export function validateDescriptor(d) {
  assert.equal(d.schemaVersion,'sdk-publication-candidate-v1');
  assert.equal(d.repository,repository); assert.equal(d.registry,registryUrl); assert.equal(d.version,'1.0.0');
  assert.equal(d.candidate,'sdk-1-candidate-20261013k');
  assert.match(d.frozenManifestSha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(d.archives.map(x=>x.name),packageNames);
  for (const r of [...d.archives,...d.sourceFiles,...(d.publisherSourceFiles??[])]) {safeRelative(r.file);assert.match(r.sha256,/^[a-f0-9]{64}$/);}
  assert.equal(new Set(d.sourceFiles.map(x=>x.file)).size,d.sourceFiles.length);
  for (const r of d.reviewedToolingChanges) {assert(reviewedPaths.has(r.file),'Unreviewed source exception');assert.match(r.sha256,/^[a-f0-9]{64}$/);}
  for (const a of [d.originArtifact,d.retainedArtifact].filter(Boolean)) {assert(Number.isSafeInteger(a.id)&&a.id>0);assert(Number.isSafeInteger(a.runId)&&a.runId>0);assert.match(a.headSha,/^[a-f0-9]{40}$/);assert.match(a.digest,/^sha256:[a-f0-9]{64}$/);assert(['archives/',''].includes(a.prefix));}
  return d;
}
export async function loadDescriptor(root=process.cwd()) { return validateDescriptor(JSON.parse(await readFile(path.join(root,descriptorFile),'utf8'))); }
export function toolchain() {
  assert.equal(process.version,'v22.23.3','Use Node 22.23.3');
  const pnpm=execFileSync('pnpm',['--version'],{encoding:'utf8'}).trim(); assert.equal(pnpm,'11.9.0','Use pnpm 11.9.0');
  return {node:process.version,pnpm,npm:execFileSync('npm',['--version'],{encoding:'utf8'}).trim(),platform:process.platform,arch:process.arch};
}
export async function verifySource(d,root=process.cwd()) {
  const exceptions = new Map(d.reviewedToolingChanges.map(x=>[x.file,x.sha256]));
  for (const row of [...d.sourceFiles,...(d.publisherSourceFiles??[])]) assert.equal(sha256(await readFile(path.join(root,row.file))),exceptions.get(row.file)??row.sha256,`Source drift: ${row.file}`);
  const original=structuredClone(d.rootPackageBaseline),current=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
  original.scripts.release=current.scripts.release;
  assert.deepEqual(current,original,'Only the guarded root release command may change package metadata');
  assert.equal(current.scripts.release,'node scripts/release-publication/cli.mjs publish','Workspace publication is forbidden');
  const tracked=execFileSync('git',['ls-files','-z','--','packages','apps','src','examples','tools'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
  const expected=d.sourceFiles.filter(x=>/^(packages|apps|src|examples|tools)\//.test(x.file)).map(x=>x.file).sort();
  assert.deepEqual(tracked.sort(),expected,'Unexpected protected source membership');
}
export async function verifyArchives(d,directory) {
  assert.equal(sha256(await readFile(path.join(directory,'FROZEN-CANDIDATE.json'))),d.frozenManifestSha256,'Frozen manifest changed');
  const frozen=await verifyFrozenCandidate(directory);
  assert.deepEqual(d.sourceFiles.map(r=>r.file),frozen.certifiedSourceFiles.map(r=>r.file),'Incomplete certified source inventory');
  assert.deepEqual(frozen.files.filter(x=>x.file.endsWith('.tgz')),d.archives.map(({name,...r})=>r));
  for (const r of d.archives) {
    const b=await readFile(path.join(directory,r.file));assert.equal(b.length,r.bytes);assert.equal(sha256(b),r.sha256);
    const p=archivePackageManifest(b); assert.equal(p.name,r.name); assert.equal(p.version,d.version); assert(!JSON.stringify(p).includes('workspace:'));assert.equal(p.license,'UNLICENSED');assert.equal(p.publishConfig?.registry,registryUrl);
    for (const [name,version] of Object.entries(p.dependencies??{})) if(packageNames.includes(name)) assert.equal(version,d.version,'SDK dependencies must match the train');
  }
  return frozen;
}
export async function retainArtifact(d,metadata,zipBytes,output,artifact=d.retainedArtifact??d.originArtifact) {
  assert.equal(metadata.id,artifact.id);assert.equal(metadata.name,artifact.name);assert.equal(metadata.expired,false,'Certified artifact expired');assert(Date.parse(metadata.expires_at)>Date.now(),'Artifact has expired');
  assert.equal(metadata.workflow_run?.id,artifact.runId);assert.equal(metadata.workflow_run?.head_sha,artifact.headSha);assert.equal(metadata.digest,artifact.digest);assert.equal('sha256:'+sha256(zipBytes),artifact.digest,'Artifact digest mismatch');
  const entries=unzipSync(zipBytes),prefix=artifact.prefix;
  const raw=entries[prefix+'FROZEN-CANDIDATE.json'];assert(raw,'Frozen manifest absent');assert.equal(sha256(raw),d.frozenManifestSha256);
  const frozen=JSON.parse(Buffer.from(raw).toString()); const names=[...frozen.files.map(x=>x.file),'FROZEN-CANDIDATE.json'];
  for(const name of names) {safeRelative(name);assert.equal(path.basename(name),name);assert(entries[prefix+name],`Artifact file missing: ${name}`);}
  await mkdir(output,{recursive:true});
  for(const name of names) {await writeFile(path.join(output,name),entries[prefix+name],{flag:'wx'});await chmod(path.join(output,name),0o444);}
  await verifyArchives(d,output);
  return {artifactId:metadata.id,runId:artifact.runId,headSha:artifact.headSha,digest:artifact.digest,expiresAt:metadata.expires_at,retainedFiles:names.length,fixturesTransferred:false};
}
export function assertPublicationContext(d,env,tagCommit) {
  assert.equal(env.GITHUB_EVENT_NAME,'push','Publication requires a tag-push event');
  assert.equal(env.GITHUB_REPOSITORY,repository);assert.equal(env.GITHUB_REF,`refs/tags/sdk-v${d.version}`);
  assert.match(env.GITHUB_SHA??'',/^[a-f0-9]{40}$/);assert.equal(tagCommit,env.GITHUB_SHA,'Tag target changed');
}

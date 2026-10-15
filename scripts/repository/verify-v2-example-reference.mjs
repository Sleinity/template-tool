/** Shared V2 example acceptance; retired V1 journey tests are historical evidence. */
import {mkdtemp,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join,resolve}from'node:path';import{spawnSync}from'node:child_process';
const args=process.argv.slice(2);if(args.length&& (args[0]!=='--archives'||!args[1]))throw Error('Expected --archives DIRECTORY');
const temporary=args.length?null:await mkdtemp(join(tmpdir(),'sdk-v2-example-archives-'));
const directory=temporary??resolve(args[1]);
try{if(temporary)for(const name of ['core','browser','react']){const result=spawnSync('pnpm',['pack','--pack-destination',directory],{cwd:'packages/template-'+name,stdio:'pipe'});if(result.status!==0)throw Error(String(result.stderr));}
 const result=spawnSync(process.execPath,['scripts/example-lifecycle/verify.mjs','--archives',directory,'--manager',process.env.TEMPLATE_CONSUMER_PACKAGE_MANAGER??'pnpm','--output','/tmp/sdk-v2-example-reference'],{stdio:'inherit',env:process.env});if(result.status!==0)process.exitCode=result.status??1;
}finally{if(temporary)await rm(temporary,{recursive:true,force:true});}

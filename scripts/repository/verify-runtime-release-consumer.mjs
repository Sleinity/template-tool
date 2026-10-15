/** V2-only delivery consumer. Publication and tagging are never performed. */
import {verifyDeliveryBundle} from '../release-delivery/bundle.mjs';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
if(process.argv[2]!=='--archives'||!process.argv[3])throw Error('Usage: node verify-runtime-release-consumer.mjs --archives DIRECTORY');
const directory=resolve(process.argv[3]);const outputAt=process.argv.indexOf('--output');const output=outputAt<0?'/tmp/sdk-v2-delivered-example':resolve(process.argv[outputAt+1]);await verifyDeliveryBundle(directory);
for(const [script,args]of [['scripts/repository/verify-packed-consumer.mjs',['--archives',directory]],['scripts/example-lifecycle/verify.mjs',['--archives',directory,'--delivered','--manager',process.env.TEMPLATE_CONSUMER_PACKAGE_MANAGER??'pnpm','--output',join(output,'focused-example')]]]){
 const result=spawnSync(process.execPath,[script,...args],{stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status??1);
}

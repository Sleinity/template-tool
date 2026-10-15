/** Test-only immutable source checkpoint for independent paired optimization trials. */
import {mkdir,readFile,readdir,copyFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';import {join,resolve} from 'node:path';
const destination=resolve(process.argv[2]);
try { await stat(join(destination,'identity.json')); throw Error('Checkpoint already exists; never overwrite evidence'); } catch(error){if(error.code!=='ENOENT')throw error;}
const files={};
async function copy(file){const bytes=await readFile(file);await mkdir(join(destination,file,'..'),{recursive:true});await copyFile(file,join(destination,file));files[file]=createHash('sha256').update(bytes).digest('hex');}
async function walk(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const file=join(directory,entry.name);if(entry.isDirectory())await walk(file);else await copy(file);}}
for(const name of ['template-core','template-browser','template-react']){await walk(`packages/${name}/src`);await copy(`packages/${name}/package.json`);}
await walk('apps/studio/src');for(const file of ['config/sdk-entry-points.json','config/sdk-public-api.json','config/sdk-bundle-baselines.json'])await copy(file);
await writeFile(join(destination,'identity.json'),JSON.stringify({schemaVersion:'sdk-optimization-checkpoint-v1',createdAt:new Date().toISOString(),files},null,2)+'\n');
const studio={files:Object.fromEntries(Object.entries(files).filter(([file])=>/\.(ts|tsx)$/.test(file)).map(([file,sha256])=>[file,{path:join(destination,file),sha256}]))};
await writeFile(join(destination,'studio-identity.json'),JSON.stringify(studio,null,2)+'\n');
console.log(`Retained ${Object.keys(files).length} exact source files at ${destination}`);

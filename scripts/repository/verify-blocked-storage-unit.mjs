import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';
// A fresh module keeps callback ownership tests independent of earlier fake IDB connections.
const directory = await mkdtemp(path.join(tmpdir(), 'blocked-storage-unit-'));
try {
  const entry = path.join(directory, 'entry.ts');
  await writeFile(entry, `import { runBlockedStorageTests } from ${JSON.stringify(path.resolve('packages/template-browser/test/blockedStorage.test.ts'))};\nimport { runStudioStorageTests } from ${JSON.stringify(path.resolve('apps/studio/src/workspace/storageFailure.test.ts'))};\nimport { runBlockedStoragePinsTests } from ${JSON.stringify(path.resolve("packages/template-browser/test/blockedStoragePins.test.ts"))};\nawait runBlockedStorageTests();\nawait runStudioStorageTests();\nawait runBlockedStoragePinsTests();`);
  await build({configFile:false,logLevel:'error',ssr:{noExternal:true},build:{ssr:entry,outDir:path.join(directory,'build'),minify:false,target:'esnext'}});
  await import(pathToFileURL(path.join(directory,'build/entry.js')).href);
} finally {await rm(directory,{recursive:true,force:true});}

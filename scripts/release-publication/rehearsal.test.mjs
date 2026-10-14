import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('synthetic rehearsal cannot replace unconditional published V2 acceptance',async()=>{
 const rehearsal=await readFile('.github/workflows/release-rehearsal.yml','utf8');
 assert(rehearsal.includes('scripts/release-publication/consumer.mjs'));
 assert(!/packages: write|contents: write|cli\.mjs publish|fixtures\.enc/.test(rehearsal));
 const full=await readFile('scripts/repository/verify-runtime-release-consumer.mjs','utf8');
 assert(full.includes('verify-sdk-061-single-host.mjs'));assert(full.includes('verify-sdk-061-family-host.mjs'));
 assert(full.includes('skipLibCheck: false'));assert(!full.includes('SDK_SYNTHETIC'));
 const release=await readFile('.github/workflows/release.yml','utf8');assert(release.includes('scripts/repository/verify-runtime-release-consumer.mjs'));
 const consumer=await readFile('scripts/release-publication/consumer.mjs','utf8');
 assert(consumer.includes('verifyArchives(d, archives)'));assert(consumer.includes('skipLibCheck:false'));
 assert(consumer.includes('exactSourceCertification:false'));assert(!/pnpm (?:build|pack)|npm pack|workspace:.*dependencies/.test(consumer));
});

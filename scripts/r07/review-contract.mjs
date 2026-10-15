/** Hash-bound review checks, not a source-review substitute. */
import assert from 'node:assert/strict';
export function assertR07ReviewIdentity(review, actual) {
 assert.equal(review.schemaVersion,'r07-source-review-v1');
 assert.equal(review.sourceReview,'reviewed-source-faithful');
 assert.equal(review.fixtureId,'exporter-061-carrousel');
 assert.equal(review.surface,'editor');
 assert.equal(actual.candidateSha256,review.afterSha256,'Unreviewed raster');
 assert(actual.repeatHashes.length>=2 && actual.repeatHashes.every(h=>h===review.afterSha256),'Incomplete/unstable reviewed capture');
 assert.deepEqual(actual.source,review.source,'Source/font evidence identity');
 assert.equal(actual.environmentSha256,review.environmentSha256,'Review environment identity');
 assert.equal(actual.beforeSha256,review.beforeSha256,'Reviewed historical reference');
 assert.equal(actual.camera,review.camera,'Reviewed capture camera');
 assert(review.sourceReason && review.reason && review.cause,'Specific source review required');
}
export function comparableEnvironment(value) {
 const copy=structuredClone(value);
 delete copy.testTimestamp;delete copy.approximateProcessMemoryBytes;
 for(const decision of copy.fontDecisions??[])delete decision.uploadAndLinkMs;
 return copy;
}

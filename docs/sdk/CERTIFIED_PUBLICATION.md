# Certified SDK publication

This is private release tooling, not a supported SDK API. The fixed train is
Core, Browser and React **1.0.0**, using candidate `sdk-1-candidate-20261013k`.
Milestone 7 prepares and rehearses publication; it does not publish or tag.

## Inputs and provenance

`config/sdk-publication-candidate.json` records archive hashes, the exact frozen
manifest, reviewed source hashes and a pinned Actions artifact. The original
certificate is Linux run `38442123584`; the original inputs expire on October 16,
2026. Rehearsal retains the delivery for 90 days, excluding encrypted fixtures and
keys. Update the retained-artifact pointer only from a successful reviewed run
and record its ID, digest, commit and expiry. Never select by “latest” or rebuild
an expired delivery. Rerun the original unchanged certification if renewal is
needed and bind the new artifact explicitly.

Use Node **22.23.3** and pnpm **11.9.0**. npm's version is recorded in each report.
Publication reads the archives; no build, pack, version or lifecycle script runs.
The root release command fails without the verified files and tag-push context.

## Read-only preparation and rehearsal

Run in the reviewed source checkout with authenticated GitHub CLI access:

```sh
node scripts/release-publication/cli.mjs prepare --archives /path/to/new-delivery --output /path/to/retention-report
node scripts/release-publication/cli.mjs verify --archives /path/to/new-delivery --output /path/to/verification
node scripts/release-publication/cli.mjs rehearse --archives /path/to/new-delivery --output /path/to/rehearsal
```

Registry checks use `NODE_AUTH_TOKEN`; never paste or commit its value. Preparation
uses `GH_TOKEN` or the authenticated CLI. Rehearsal has repository/package read
permissions only. It can create an Actions artifact/report but cannot publish a
package, create a tag/release or upload release assets. Fixtures are not decrypted.
Source binding includes the protected SDK/build inputs and reviewed tooling hashes.
Refreshing those hashes is an explicit review-time operation, not a repair that
publication performs automatically.

## Publication — Milestone 8 only

After source review, required checks and explicit release authorization, tag the
verified commit `sdk-v1.0.0`. The tag job downloads the pinned delivery and validates
all inputs. `private-sdk-release` requires human approval from Sleinity, with
self-review allowed because the owner also authors releases. Tools never approve
the deployment. Only `sdk-v1.0.0` and main handoff refreshes are permitted.

Publish Core, then Browser, then React. Existing packages must download with the
certified hash; matching packages are skipped, conflicts stop. Authentication,
permission or network failures never mean a package is missing. After all packages
verify, the shared handoff uses downloaded registry bytes and strict npm/pnpm
consumers. GitHub assets remain a prerelease pending the full Milestone 8 contract.
Existing assets with matching bytes are skipped; conflicts never use clobber.
Historical package tags remain untouched; the SDK release tag is the train authority.

## Failure and retry

A journal is written before each publication and retained for 90 days, including
failures. Rerunning a failed tag job restores the previous invocation/attempt journal
and checks package state before writing. Successful packages remain published;
there is no rollback, deletion or overwrite. An uncertain or missing journal
requires manual reconciliation; no automatic retry loop is introduced.

Use read-only preflight to inspect/download the verified train. If all packages
are present but publication cleanup failed, use the main **handoff refresh**;
it does not publish packages again. A conflicting package/version requires a
separate release decision, not alteration of certified 1.0.0.

Reports preserve operation identities and redacted outcomes. Credentials and
signed download URLs are never included. Actual production-write permissions
remain unverified until Milestone 8; rehearsal is not publication evidence.

Distribution remains public GitHub release assets, **UNLICENSED**, authorized for
**Sleinity-owned applications only**. Public visibility is not an open-source licence.

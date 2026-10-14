# SDK 1.0.0 release intake repair

The protected existing-tag recovery was explicitly approved, reviewed and executed.
The three packages are now published; registry/handoff verification and stable
promotion are tracked in the [publication report](sdk-1-publication.md). This record
retains the original failure and never authorizes tag movement.

## Confirmed failure

The immutable `sdk-v1.0.0` tag points to
`33bd70dbca1f02cdd6c80a83dc1ba4666d2ed348`. Its first
[publication run](https://github.com/Sleinity/template-tool/actions/runs/38563617164)
failed in read-only preflight, before the publication job. Publish and handoff were
skipped; no package writes, prerelease assets or stable promotion occurred.

`fflate.unzipSync()` returns a `Uint8Array`. The fixture decryptor expects a Node
`Buffer` when checking the `SDKFIX01` header. Calling `.toString()` on the former
produces comma-separated byte numbers. The earlier preparation workflow read the
same ciphertext from a file, producing a Buffer and missing this transport seam.
Artifact digest and ciphertext hash checks passed before the header failure.

## Bounded repair

Normalize ZIP-extracted ciphertext to a Buffer at the private artifact boundary.
Keep artifact/source identity, expiry, ciphertext SHA-256, AES-GCM authentication,
plaintext fixture/font hashes and cleanup unchanged. The new regression feeds a
synthetic authenticated payload through ZIP extraction and the existing decryptor;
it fails before the correction. It also rejects a wrong artifact digest and a
missing ciphertext entry.

Preparation now restores through the same pinned artifact path used by publication,
rather than the file-only path. Its permissions remain read-only. This repair
changes private tooling only; no SDK code, archive, package metadata, supported API,
reference, tolerance, secret or ciphertext is changed.

## Approved protected existing-tag recovery

Rerunning the existing tag workflow would check out the same defective helper.
Moving or deleting the tag is prohibited. A protected recovery from reviewed `main`
was approved by the owner in this task on October 14, with a narrowly explicit
manual resume for the existing tag:

1. Validate the actual trusted `workflow_dispatch` event on `main`; never impersonate
   a tag-push event. Require an explicit resume flag and expected immutable tag commit.
2. Require remote and local `sdk-v1.0.0` to remain at the commit above. Validate its
   certified SDK sources separately from the corrected, hash-reviewed private tooling.
3. Run exact frozen-archive and fixture preflight before any package write. Preserve
   the existing human-protected environment and `GITHUB_TOKEN` writer ownership.
4. Publish only the same three 1.0.0 archives in order, with unchanged journal,
   reconciliation, matching-package skips and conflict refusal. Do not build, pack,
   version, create/move tags, delete packages or publish another version.
5. Retain full registry acceptance, handoff and separate human-approved stable
   promotion. Ordinary manual handoff refresh remains package-read only.

This is an explicitly approved private execution-policy exception to the original
tag-push-only plan. The repair branch implements it; source review and passing
checks must precede its main-branch execution. It does not approve publication or
stable deployment. The existing human-protected environment remains required.

Acceptance for that recovery must include refusal for missing/moved tags, wrong
commits, untrusted events/refs, mixed dispatch intents, source/archive drift, stale
evidence and missing protected approval; complete Linux/macOS registry matrices and
the retained passing fidelity gate remain required for release completion.

## Current repair verification

Actual [preparation run 38565152189](https://github.com/Sleinity/template-tool/actions/runs/38565152189)
passed at `25cae8be6198502290d85201235ee694df7b61d6`: the corrected pinned-artifact
restore authenticated every exact input, and all twelve npm/pnpm archive commands
passed. The recovery implementation adds independent checks for all 709 tagged
SDK/Studio/example source files, refusing source drift or a missing tag. Its local
39-test release suite passes, including wrong dispatch contexts, mixed intent,
wrong expected/tag commits and writer-journal recovery across tooling revisions.
Final head `4047ded4025b944d179d939cbb9f7f50dc65c3ca` then passed CI, rehearsal
and complete preparation. The owner accepted it and PR #26 merged as
`a707846e6c29674a1f8b9719702c2b2832283dac` before the protected recovery.

Journal identity remains the immutable tag commit; execution reports separately
identify the corrected tooling commit. Earlier writer attempts are found even if
a newer run failed or skipped preflight. Truncated history, absent/expired journals
or unresolved publication outcomes stop rather than permit fresh writes.

Frozen delivery documents retain their certified bytes. The old Changesets
publication paragraph in its GITHUB-SETUP copy is historical administrative
guidance; current release execution is defined by
[certified publication](../sdk/CERTIFIED_PUBLICATION.md) and this approved exception.
Host installation and V2 integration contracts and archives remain unchanged.

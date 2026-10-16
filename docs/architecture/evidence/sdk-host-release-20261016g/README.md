# SDK 2.0.0 candidate G certification

**GO for publication approval.** The [decision and immutable identities](certification.json)
bind `sdk-2-host-20261016g` to source `9e10507`; the packing manifest retains
`not-yet-verified`. Publication and replacement of the existing release tag have
not occurred.

- [macOS archive acceptance](macos/report.json) and [Linux acceptance](linux/report.json):
  eight groups per platform, four npm/pnpm starters with 16 passing checks each,
  exact fonts/ZIPs and guarded PNG/resource outcomes. Seven executable guide examples
  typecheck against installed archives.
- [Current source/capture review](source-review.json) and [gate](gate.json):
  24 stable captures, 12 renderer, three scene and 12 settlement comparisons.
  The three review sheets are retained alongside these reports. Prior source-review
  dispositions remain archived; no reference, fixture, font hash or tolerance changed.
- [Linux certification receipt](linux-ci-receipt.json): clean portable gate,
  tooling tests, supplied-archive hosts, both reference commands and fixture cleanup.
- [Shared-action rehearsal receipt](preflight-receipt.json) and
  [publication simulation](PUBLICATION-PATH-SIMULATION.json): approved frozen-input
  binding, restoration, reference commands, generated handoff and upload inventory.
  No package publication, tag change or Release upload is simulated as success.
- [Source delta](source-delta.json): two simulator/test changes from F;
  package/starter bytes match D/E/F, whose complete frozen bytes were rechecked.
- [Regression packet](simulation-regression.json): hash-verified F fails on missing
  installed dependencies using public stub archives; G's executable regression passes.
- [CI preparation receipt](ci-preparation.json) and [public input bindings](release-input-variables.json):
  the same seven approved private inputs use AES-GCM ciphertext. Raw inputs/key
  are absent from Git and decrypted files were removed in both CI runs.

Compressed logs and frozen/packing/delivery manifests preserve the exact records.
Automated browser checks and personally reviewed stored source/capture sheets are
separate evidence. Manual live interaction/accessibility and Bas's personal review
were not performed. Chromium is the certified browser; offline reopening assumes
an already loaded application. Supplemental field configurations are tested
derivatives. This automation correction makes no runtime/performance claim.

The [maintainer handoff](../../sdk-host-onboarding.md) describes the final commit/tag
approval and registry-derived verification still required before declaring release.

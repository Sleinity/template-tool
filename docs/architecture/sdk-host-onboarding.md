# SDK 2.0.0 host delivery and certification

## SDK 2.0.0 — published and verified, 2026-10-16

[The public Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v2.0.0)
contains all three registry-derived archives, 49 delivery files and the manifest
(53 assets total). [The publication packet](evidence/sdk-2-publication-20261016g/publication.json)
binds the release and package tags to approved commit `a1564a9`. Every published
package regular file matches certified G; registry tar-container identities are
recorded separately. All public archive bytes match direct registry downloads.

Eight host groups pass on each platform, with four npm/pnpm starters passing
16 checks each. All 53 anonymous public downloads are byte-identical to the
registry-derived delivery tested on macOS. Linux's protected handoff passed its
native consumers, fresh hosts, fonts/storage, exact references, visibility and
cleanup before upload. Source-bound G review remains separately retained; no
new reference/tolerance/fixture/font or production source change occurred.

The first two protected attempts exposed concurrent prepack declaration races,
publishing Core then Browser. The final same-source retry published React;
existing versions were skipped and never overwritten. Missing package-version
tags were retained explicitly at the approved commit. All attempts are preserved.
Correct prepack concurrency and expected-tag retention before the next new SDK
version train; this automation follow-up does not block verified SDK consumption.

Bas can use the [starter](https://github.com/Sleinity/template-tool/releases/download/sdk-v2.0.0/SDK-HOST-STARTER.zip)
and [onboarding guide](https://github.com/Sleinity/template-tool/releases/download/sdk-v2.0.0/SDK-QUICKSTART.md)
with the three archives in `vendor/`, exporter 0.6.1 ZIPs and licensed exact fonts.
His personal review follows automated handoff. The [Studio redesign handoff](../sdk/STUDIO_REDESIGN_HANDOFF.md)
remains the separate next product work; no component extraction or UI redesign
is included in this release.

## Candidate G — GO for publication approval, 2026-10-16

[The final certification packet](evidence/sdk-host-release-20261016g/certification.json)
binds immutable `sdk-2-host-20261016g` to source commit `9e10507`, 1,062 certified
source files and frozen-manifest SHA-256
`96852f55d8634e72420106110e86e8766bd23fcb1526c514d3e3bbdb066fdfe4`.
Its three SDK archives and starter equal D, E and F byte for byte. G changes only
the isolated publication simulator and its executable regression within F's
certified source scope; no SDK, Studio or example runtime changes are included.

All eight host groups pass on each platform, with npm/pnpm starters passing 16
checks each under Node 22.23.3/pnpm 11.9.0 and Chromium 149.0.7827.55. Seven literal
delivered guide examples typecheck against installed archives. Linux's clean
[certification run](https://github.com/Sleinity/template-tool/actions/runs/38905061349)
also passes the full portable gate, 32 tooling tests and both reference commands;
macOS strict ZIP tests pass. The fresh individually reviewed source gate is GO:
24 stable captures, 12 renderer, three scene and 12 settlement comparisons.
All 285 protected identities and earlier candidate bytes remain unchanged.

The [shared-action release rehearsal](https://github.com/Sleinity/template-tool/actions/runs/38906939936)
passes against that successful certification artifact and exact manifest hash.
It restores inputs through the same composite action as release, runs both
reference commands and generates the publication handoff/upload inventory.
Both local npm/pnpm consumers also pass against its simulated publication-context
guidance. The baseline simulator failure is retained alongside the passing fix.
Neither simulation contacts the package registry to publish or uploads a Release.

Certification inputs use the human-approved encrypted setup for the same seven
private ZIP/font identities; raw inputs/key are not committed and decrypted CI
inputs were removed. The packing manifest remains `not-yet-verified`; certification
is recorded separately. Stored-capture review and automated browser checks are
separate evidence classes; manual live/accessibility and Bas review are unperformed.

The current tag remains `sdk-v2.0.0` at `c6f489a`, with no SDK 2.0.0 package or
public Release. Obtain approval of the final evidence-only commit before replacing
that tag and publishing. Verify the frozen source scope at that exact target;
a shipped-source correction requires a new candidate. After publication, verify
registry-derived packages/assets through the same host workflows before declaring
the released handoff complete. Bas's checklist is in [Quickstart](../sdk/QUICKSTART.md).

## Candidate F rehearsal finding; candidate G correction — 2026-10-16

[Candidate F's retained packet](evidence/sdk-host-release-20261016f/progress.json)
records passing macOS/Linux archive hosts, Linux clean portable checks, strict
ZIP tests and a fresh individually reviewed 24/12/3/12 GO gate. The shared
certified-input action and both reference commands also passed in the
[release rehearsal](https://github.com/Sleinity/template-tool/actions/runs/38884477741).
The subsequent isolated publication simulation failed because it omitted
`node_modules`, which starter generation needs to read installed tool versions.
F is not release-certified around that failure.

The bounded correction links installed dependencies into that isolated workspace.
A new executable regression reproduced the exact failure before the fix and
passes afterward; all 32 tooling tests pass. Candidate G must renew certification
and the shared-action rehearsal. SDK/runtime/example source is unchanged; F and
previous archives/evidence remain immutable. Explicit encrypted CI setup approval
covers the same seven private inputs and fixture-key replacement. The release tag
remains on `c6f489a`; no SDK 2.0.0 package is published.

## Candidate F snapshot correction — in progress, 2026-10-16

The human explicitly approved encrypted fixture transfer and fixture-secret
replacement. E's prepared certification snapshot then exposed a checkout bug:
`git clone --no-checkout` followed by a same-commit branch switch had not hydrated
tracked historical evidence. The isolated E branch was pushed despite the failed
extra snapshot check; [its run](https://github.com/Sleinity/template-tool/actions/runs/38881726573)
was cancelled and no result accepted. Added files were limited to the approved
encrypted inputs and public SDK delivery; no raw fixtures or key were committed.

Candidate F will replace E for certification. Its snapshot helper performs a
normal full checkout, with a real-clone regression covering tracked evidence,
ignored inputs and preservation of user changes. A staged-path guard now runs
before secret replacement and rejects any change outside the approved input
files. All 31 tooling tests pass. SDK/runtime/example code remains unchanged;
the existing release tag is still `c6f489a` and no SDK 2.0.0 package is published.

## Release automation correction — local checks pass; CI setup pending, 2026-10-16

The user approved the corrected `c6f489a` tag target. Its
[Linux release run](https://github.com/Sleinity/template-tool/actions/runs/38877292992)
passed `ci:portable`, then stopped at exact packed-reference acceptance because
the workflow had not provisioned its private ZIP/font inputs. No package upload
ran. The tag remains on `c6f489a`.

The [automation correction contract](sdk-release-automation.md) binds both
release jobs to a successful current certification artifact and an independently
approved frozen-manifest hash before decryption. It preserves exact checks,
adds their clean-checkout/release-path rehearsal and retains portable public CI
without private-input probes. Candidate E and a new tag-target review are required
because automation and delivered maintainer guidance changed. Candidate D remains
immutable; no SDK runtime or example change is included.

[Candidate E's current progress packet](evidence/sdk-host-release-20261016e/progress.json)
records eight passing macOS npm/pnpm groups, 16 starter scenarios per manager,
the complete local portable gate and 29 tooling tests. Its fresh source-reviewed
three-export gate is GO: 24 stable captures, 12 renderer, three scene and 12
settlement comparisons. The three SDK archives and starter are byte-identical
to D, and all 285 protected identities are unchanged. This is not yet a complete
release certification: Linux and the shared certified-input action rehearsal
have not run.

Automatic approval review rejected the prepared CI setup because it would
upload encrypted private ZIP/font inputs and replace `SDK_CERT_FIXTURE_KEY`.
Explicit approval for those data-transfer/secret-setting actions was requested;
no retry or workaround was executed. E's new source/automation identities remain
separate from the unchanged certified package bytes. Publication is still stopped
before package upload, with `sdk-v2.0.0` on the previously approved `c6f489a`.

## Publication attempt — blocked before upload, 2026-10-16

The user approved commit `b158199baf06c9d5f59cf9c91b485429684bbb42` for
`sdk-v2.0.0`. That tag exists, but the [publication workflow](https://github.com/Sleinity/template-tool/actions/runs/38874449309)
stopped during portable CI before publishing any package. Its clean checkout
exposed 22 historical documentation targets that existed only in ignored local
evidence directories. Local existence alone had made the earlier link check pass.

The [correction packet](evidence/sdk-release-publication-20261016/README.md)
retains those exact historical captures/reports, using lossless gzip for the
87.6 MB trial report. It changes no SDK source, delivered guide, starter,
candidate archive, approved reference or tolerance. Candidate D remains frozen;
the correction passed its source check and the complete portable gate from a
clean macOS checkout under Node 22.23.3/pnpm 11.9.0. Moving the existing release
tag requires explicit approval of the corrected
commit. No SDK 2.0.0 package or public Release has been published.

## Current delivery — candidate D, 2026-10-16

**GO for publication approval:** immutable `sdk-2-host-20261016d` supersedes C.
[The current certification packet](evidence/sdk-host-release-20261016d/certification.json)
binds source commit `81802f6` to the new archive identities, fresh macOS/Linux
npm/pnpm acceptance and a fresh GO renderer/scene/settlement run. All four fresh
hosts passed 16 scenarios; five guide examples compile. The same 285 protected
identities remain unchanged.

Candidate C's publication simulation exposed current guides with static
unpublished labels. D uses delivery-context notices and neutral package README
wording. A new regression checks registry-derived documentation while preserving
historical wording; all 22 delivery tests pass. Only the three README archive
members differ from C; SDK runtime/declarations and starter bytes are identical.
The current [Linux receipt](https://github.com/Sleinity/template-tool/actions/runs/38872727783)
passed against D's exact frozen set. C and its evidence remain immutable.

The intended release remains `sdk-v2.0.0`; the blocked tag attempt is recorded above.
Publication-mode handoff generation and its installed-archive consumer passed
with explicit simulation provenance. Final publication and registry-derived
round-trip verification have not completed.

## Release boundary

The prepared SDK targets **2.0.0**, following the user's approval on 2026-10-15.
The existing [SDK 1.0.0 publication](https://github.com/Sleinity/template-tool/releases/tag/sdk-v1.0.0)
retains V1 compatibility APIs; retiring them and restricting exporter admission
requires a new major version. The earlier local 1.0.0-labelled optimization/F7
archives are distinct, unpublished source candidates and remain immutable.

V2 host APIs, exporter 0.6.1 admission, source schema 1.0 normalization and
canonical schema 2.2 remain the prepared runtime contract. This milestone adds
no public API, schema, renderer or optimization behavior. No tag or publication
is authorized by preparation or certification.

## Delivered host

[Current documentation](../sdk/README.md) is the entry point. The canonical
React/TypeScript example now composes native single and Family sessions through
public SDK entries. Multiple staged ZIP/font preparations are accepted atomically;
failed replacements retain accepted work. The example includes ordered typed
controls, Choices, diagnostics, replacement/Crop/Reset, saved-template listing,
Fresh/Resume/Discard recovery and guarded PNG with cleanup-only Retry.

`StarterOutput` and `Preparation` are private example composition. Native sessions
retain mutation, capture/pinning, validation and resource authority. The example
serializes destination selection for library versus token-bound recovery writes.
Its 650 ms autosave is host policy and starts after the first explicit Save.
Storage adapters and font authority can be injected without Studio annotations.

The delivery generator emits a deterministic standalone `SDK-HOST-STARTER.zip`,
configuration and exact vendored three-package closure. React 19 and tooling
versions come from the checked installation. pnpm explicitly permits esbuild's
build script; installation requires no private registry credentials. Exact
exporter ZIPs and licensed fonts remain external inputs.

## Documentation and reuse

The Markdown inventory classifies current host/maintainer guidance and historical
evidence. Historical ADRs/reports remain evidence; active guidance points to the
current contract. Published 1.0.0 documents are preserved with exact downloaded
asset hashes and their original wording. New 2.0 migration notes distinguish
actual removals from schema/image-policy changes already released in 1.0.

The Studio reuse catalogue identifies supported APIs, copyable examples and
Studio-specific references. Eighteen source links are pinned to the reviewed
implementation commit and checked against Git objects. Product styling and
private Studio modules are not SDK contracts. The post-release redesign handoff
records coupling and reuse opportunities without extracting new components.

## Verification and limitations

The test-only fresh-host gate extracts the delivered archive, installs its SDK
tarballs, builds the unmodified application and observes the same application
through build-local probes. It checks all seven fields, configured Choice/crop
derivatives, exact-font correction, save/recovery/offline reopen, failures/Retry,
failed Family batches, real Family selection, disposal and token ownership,
PNG and cleanup-only Retry. Configured derivatives are not additional exporter
certification. Offline reopening assumes the application has already loaded;
offline application bootstrap is not provided by this Vite example.

Focused single-source lifecycle tests retain their own test entry scaffold;
they no longer claim to exercise the complete starter's default route. The fresh
application gate covers that route. Browser automation and stored-capture source
review are reported separately; no manual accessibility or Bas review is implied.

Final acceptance must bind the frozen 2.0.0 archives, documentation and starter
to macOS/Linux reports under Node 22.23.3/pnpm 11.9.0 and a fresh three-export
renderer/scene/settlement gate. Packing keeps `not-yet-verified`; the certification
decision is recorded separately. Reference/fixture/font identities and previous
certified archives remain protected. Publication preparation uses supplied frozen
artifacts, and publication/tagging remain a separately approved final operation.


## Candidate C certification — recorded 2026-10-16, superseded

This recorded C decision is superseded by D above; its original evidence remains unchanged. Candidate `sdk-2-host-20261015c` binds source
commit `c82ff3254a0eeb8d6af595f71e2b0c1d08e6d2c1` and immutable delivery bytes.
[The certification packet](evidence/sdk-host-release-20261016/certification.json)
contains complete identities, checksums, commands, failures/retries and limitations.
The packing/delivery manifests deliberately retain `not-yet-verified`; certification
is a separate record and does not modify them.

macOS arm64 and Linux x64 passed the same archive set under Node 22.23.3/pnpm
11.9.0. Each platform passed npm and pnpm fresh hosts, installed consumers,
font authority and storage/Retry gates. All four fresh applications passed 16
scenarios, including actual root unmount; five delivered guide examples compile.
[Linux workflow receipt](https://github.com/Sleinity/template-tool/actions/runs/38756093269)
records the isolated source snapshot and successful run.

Run `sdk-2-host-20261015c` is GO: 24 stable captures, 12 renderer comparisons,
three scene comparisons and 12 settlement comparisons. The source-review packet
records individual current-run decisions after personally reviewing stored sheets
of the exact source and four surfaces. Earlier raster reviews are explicitly
supplementary; current outputs are byte-identical. The prior disposition is
archived. All 285 protected fixture/font/reference identities remain unchanged.

The publication handoff generator, verifier, upload inventory and installed npm
consumer passed using these frozen SDK archives with explicit simulation
provenance. No upload, registry publication or tag was performed. The intended
new tag is **`sdk-v2.0.0`**. The final evidence-only commit is the proposed release
commit; it must still pass frozen source-scope verification. Previous published
1.0.0 and local candidate archives/documentation remain unchanged.

Candidate A's Linux failure exposed timezone-dependent ZIP metadata; a three-zone
regression now proves deterministic starter bytes. Candidate B was superseded
before freezing by the completed documentation/starter corrections. Both remain
preserved and are not the approved delivery.

## Bas handoff checklist

Automated acceptance is complete. Bas's personal review follows this handoff and
is not a publication prerequisite.

- Obtain candidate D (or its separately verified registry-derived release assets)
  and verify the exact manifest and `SHA256SUMS`.
- Follow [onboarding](../sdk/QUICKSTART.md), using the standalone starter and one
  package manager; bring authorized exporter 0.6.1 ZIPs and exact font binaries.
- Exercise his application's single/Family inputs, styling and injected adapters;
  preserve native validation, resource ownership and export guards.
- Review [features](../sdk/FEATURES.md), [operations](../sdk/OPERATION_OUTCOMES.md),
  [Studio reuse](../sdk/STUDIO_REFERENCE.md) and the [post-release redesign handoff](../sdk/STUDIO_REDESIGN_HANDOFF.md).

Coverage remains automated Chromium on macOS/Linux plus stored-capture review;
no manual live/accessibility or Bas review is claimed. Offline checks restore
saved content after the application loads; no service-worker bootstrap is supplied.
The Studio redesign, component extraction and further optimization remain separate.

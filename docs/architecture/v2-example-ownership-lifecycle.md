# Recommended V2 example ownership lifecycle — R02/R03

**R02 and R03 are closed.** The recommended example now stages imports and exact
fonts before explicit acceptance, retains accepted work during replacement, and
rejects obsolete feedback. V2 is the default; `?fields-v2` remains an alias and
`?compatibility=v1` explicitly selects the retained V1 compatibility API example.
This selects an API demonstration, not a renderer mode.

The baseline is passing `sdk-061-r07-raster-20261013a`. The
[retained source/archive identity](evidence/v2-example-lifecycle-20261013/baseline/identity.json)
and [executable original failures](evidence/v2-example-lifecycle-20261013/baseline/runs/reproduction.json)
precede production edits. All **273 SDK and 101 Studio source identities**, 299
protected references/snapshots/fixtures/fonts/API/budget files and three SDK
archive hashes remain unchanged. No API, schema, renderer, persistence, version,
publication or approved-reference changes.

## Demonstrated failures and repair

| Retained failure | Current disposition |
| --- | --- |
| Carrousel's two imported media/SVG URLs survive original-host unmount | Both remain usable through handoff and revoke once after the final owner ends |
| Earlier failed JSON read overwrites newer accepted feedback | Import generation/lifetime/registry scope rejects successes, errors and finalizers |
| Invalid replacement loads into the accepted native session and blocks it | A fresh staging session validates replacements; failed input leaves accepted edits intact |
| ZIP read completes after unmount and allocates two unreleased URLs | Cancelled reads never start import; late pipeline candidates dispose immediately |
| No exact-font preparation; landing page demonstrates V1 | V2 default, requirement uploads, preparation and explicit Open template; V1 compatibility route preserved |

The private [lifecycle helper](../../examples/template-editor-integration/src/fieldHostLifecycle.ts)
uses only supported package entries. ZIP uses `runTemplatePackageImportPipelineV2`;
JSON uses public Core parsing. The helper is resource-free during construction.
Resources and ownership decisions are outside render functions and state updaters.
StrictMode replay invalidates pending work while preserving accepted ownership;
genuine teardown finalizes accepted and uncommitted sessions after subscription
cleanup.

## Ownership timeline

| Checkpoint | Candidate owner | Session owner | Finalization |
| --- | --- | --- | --- |
| File read | None yet | Existing accepted editor | Cancellation invalidates the read |
| ZIP pipeline returns | Pending source | Existing accepted editor | Late result disposes immediately |
| Canonical staging load | Pending source | Fresh staging session plus accepted editor | Staging load acquires independent import asset leases |
| Fonts / corrections | Pending source retained | Staging session; accepted editor stays usable | Uploads serialize; all completions check scope |
| Open template | Candidate ends after validated handoff | Staging becomes accepted; old accepted awaits commit | No staged/hidden renderer; new accepted renderer refreshes native evidence |
| Replacement editor commits | None | New accepted session | Old editor subscription cleanup precedes old session disposal |
| Cancel / failure / supersession / unmount | Available candidates end | Unaccepted staging sessions end | Late operations cannot publish or accept |
| Receiving peer / active and queued saves | Already disposed | Native independent owners/pins | Final-owner release occurs exactly once; disposed queued saves retain native cancellation |

Borrowed registries are never disposed. The same resolved authority serves ZIP
import, auto-linking, exact upload, preparation and the accepted renderer/export.
Omitted/undefined uses default IndexedDB; null uses embedded fonts. Registry
replacement cancels pending candidates and refreshes the accepted renderer through
R01's existing publisher lifecycle. A→B→A cannot revive earlier work.

Public font helpers consume the staging session's V1 renderer projection. Only
font requirements and font assets merge back into a cloned canonical V2 package;
Core validates it and the staging session reloads it. Nodes, bindings, defaults,
Choices, configuration, roles and order never come from that projection. Missing,
corrupt, mismatched or unavailable fonts prevent Open. Typed storage failure
retains the selected font file for manual Retry. Linked-but-unavailable binaries
show a preparation error and can recover after their source returns.

Import/font feedback and accepted-editor action feedback are separate. Image and
export completions additionally check accepted session, registry, component
lifetime and action generation. Older errors cannot update a replacement editor.
PNG uses the renderer handle's authority and native readiness; font preflight is
not render/export certification. Native resource pins and font activation/cache
lifetimes retain their existing SDK policies. Font-cache URLs are distinct from
the two temporary Carrousel import URLs.

## Current-run verification

[Verification](evidence/v2-example-lifecycle-20261013/verification.json) contains
implementation/test/archive hashes, command outcomes, current transcripts,
measurements and gate identity. The candidate archives under
`release-verification-artifacts/v2-example-lifecycle-final-20261013` are byte-identical
to R07. Their manifest records its creation snapshot; copied example sources are
independently bound by current implementation hashes.

| Evidence | Current result |
| --- | --- |
| Deferred lifecycle tests | 16 passing cases: cancellation, overlap, malformed/blocked source, exceptions, StrictMode, deferred commit, registry replacement, font-only merge and upload Retry |
| Actual copied example, npm and pnpm | Same archives; strict declarations (`skipLibCheck: false`), no aliases/Studio/internal imports; **24 passing browser scenarios per manager** |
| Exact Carrousel | Default, custom and embedded/null fonts; corrupt/mismatch rejection; storage Retry; edits, Reset, PNG; exact ZIP paint numbers restored |
| Typed controls | Seven field types; all five Choice types in suggested/restricted modes; edit/selection, Reset, native save/reopen and PNG on explicitly synthetic scenarios |
| Ownership | Receiving session keeps both imported URLs after candidate/staging release; active success/rejection and queued cancellation retain invocation-time assets until finalization |
| Lifecycle feedback | Cancel during read/pipeline/font preparation, staged-load exception, malformed ZIP/JSON, old import/image/export errors, A→B→A and unmount |
| Regression checks | Portable tests; package/Studio/example builds/typechecks; sdk:verify/API/boundaries/packed consumers/unchanged budgets; R01/R04; font/trim/routing; Studio setup, drafts, field rules, Family parity and workflows; V1 supported/restricted-CSP acceptance |
| Fresh source-authoritative gate | **GO — 24 stable captures, 12 renderer, three scene and 12 settlement passes** |

Gate: **`sdk-061-v2-example-lifecycle-20261013a`**. All twelve current PNG hashes
match R07 reviewed output; exact source, environment, camera and protected identity
checks retain the reviewed dispositions. The first gate assessment correctly
reported NO-GO for an older review binding. Rebinding and fresh public-host
assessment passed. No reference promotion.

Automated browser evidence and stored PNG inspection are separate. The current
packed Carrousel screenshot was inspected. There is **no new manual live browser
or screen-reader certification**. Synthetic tests are host integration evidence,
not new source certification. Family and save/restore interoperability use public
acceptance harnesses; no Family authoring, autosave or recovery UI is added.

## Measurements and limits

[Five paired production trials after warm-up](evidence/v2-example-lifecycle-20261013/performance.json)
use identical short, sustained-paste and multiline bursts. Before and after each
trial produce **three native operation revisions, 11 notifications and 11 editor
commits**, with zero typing allocations/activations and no typing long tasks.
Native acceptance medians are **4.50 / 4.95 ms**; input-to-rAF medians **15.20 /
14.80 ms**. These timings are descriptive. rAF is a paint proxy, not pixel settlement;
this three-burst workload is not a general sustained-keystroke benchmark.

Each selected ZIP invokes one pipeline. Ordinary edits do not invoke import or
host font preparation, acquire resources, or activate faces. Host parse counters
cover explicit example calls, not every internal SDK validation. Native operation
revisions provide separate canonical-work evidence. Original unmount leaked two
media URLs; repaired default/custom/null paths release both once. Completed
registry writes and SDK font caches retain their prior caller/cache ownership.

Initial verification exposed test-only frozen-result observation and temporary
build/JSX path mistakes; these are not SDK defects. Strict consumers also caught
ES2020-incompatible `Object.hasOwn` in the new helper/guide; both now use
`hasOwnProperty.call`. The V1 restricted-CSP driver required the explicit
compatibility route too. Retained README bytes use `.md.txt` to avoid evaluating
historical relative links from the evidence directory. No failing result is
counted as passing evidence.

Regenerate with:

```sh
node scripts/example-lifecycle/reproduce.mjs
node scripts/example-lifecycle/unit.mjs
node scripts/example-lifecycle/verify.mjs --archives <candidate> --manager npm
node scripts/example-lifecycle/verify.mjs --archives <candidate> --manager pnpm
node scripts/example-lifecycle/performance.mjs
pnpm sdk:gate:061 -- --run-id <new-unique-run>
```

Remaining release milestones, publication/version selection and additional host
product UX remain separate. Closing R02/R03 does not declare the SDK release-ready.

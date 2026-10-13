# Observational mask-range settlement

## Objective and boundary

Close the active Carrousel settlement gate by describing the existing
source-certified rectangular ALPHA mask authority. This milestone changes
observational evidence and its dependency model. Production sessions, rendering,
canonical package/scene semantics, resource ownership and persistence remain
authoritative as before. General masks, backend changes and compiler consolidation
are outside this milestone.

## Audit and contract

The previous engine unconditionally placed every source mask in
`pending-measurements`, even when the canonical scene retained a valid declared
range and the runtime resolver selected `exact-opaque-rectangular-alpha`.
Carrousel source `987:6813` declares sibling `987:6814` under parent `987:6812`;
the renderer already publishes the exact clip and suppresses mask RGB paint.
The dependency graph also parsed colon-containing source IDs as only their
first segment, breaking observational affected-node identity.

The settlement input gains optional existing `PackageMaskResolution` evidence
from `resolvePackageMaskRelationships`. The settlement engine must not invent
another mask classifier or capability policy. A mask is `resolved` only when:

- one current scene declaration and one supplied resolution agree on identity,
  source, parent, ordered scope, termination and mask revision;
- both retain the valid, exact rectangular ALPHA capability and CSS clip strategy;
- the canonical source/affected geometry agrees with the supplied clip evidence;
- the measurement publication is current under the existing complete revision
  vector.

Resolved evidence retains the relationship/revision, source bounds, affected
  clip insets and provenance. This records canonical clip derivation, not DOM
  measurement of alpha or a new final clipping authority. Missing, stale,
  malformed, overlapping or unsupported evidence remains explicitly unresolved.
  An absent evidence input preserves the old conservative behavior.

Mask bounds, declaration/paint/transform semantics, parent order and affected
  bounds invalidate the mask range, affected clip extents, diagnostics and export
  evidence. Node metadata and invalidation retain complete source IDs. Unknown
  source changes keep the existing full-tree fallback.

## Acceptance and verification

Contract tests must cover exact scopes, non-mask hints, missing/unsupported/stale
evidence, affected geometry, edits and resize, scoped invalidation, serialization
and measurement revision rejection. The hash-verified Carrousel ZIP supplies
source-backed differential evidence against the existing resolver and browser
clip telemetry. A fresh two-pass three-export capture must retain approved
renderer pixels and canonical scene snapshots. Settlement differences receive
individual source review and guarded promotion only after ready evidence.

Record exact fixture/font/environment/run identities, automated versus live
browser review, comparison results and settlement performance. The SDK gate may
become go only after all twelve settlement bundles have reviewed dispositions.
This does not promote the observational graph into production authority.

## Current verification

Implementation complete; captures complete; required references approved;
curated SDK gate **GO**. These are independent results, verified as follows.

### Identity and source review

Current run: `sdk-061-mask-settlement-final-20261007a`. Packages Core/Browser/React
are 0.8.0; the worktree is modified, with existing user changes preserved. The
capture has no available Git commit value (`gitCommit: null`); its build
identifier is `b1aa909ff3a835d5f833d7b6fa905359da065a9e4c58561257884aa4856e2eba`.
Environment SHA-256 is
`42c03f087402b697eed2ebe3d595311cee0335e643be95f2620ff04785666164`:
Darwin 25.5.0 arm64, Chromium 149.0.7827.55 headless, viewport 1440×1600,
DPR/scale 1, en-US/UTC, source-authoritative fonts, no fallback faces.

| Fixture | Exact ZIP SHA-256 |
| --- | --- |
| Now Hiring | `43059fd365c366b4723afc54c03634a84a3adba51cc504efc4d6c9be3d0e6cbc` |
| Cover | `086559ca6e5cf2cc8527ed45638eeaf1669c0081b966bf24f44f5141099d0c09` |
| Carrousel | `6bd49eaf67453273f9da99da117d5db35abea9d85cf58af4412336e405f4f904` |

Exact `template.json`/preview identities remain in the
[active profile](../../fidelity/gates/sdk-061.json) and
[run-bound dispositions](../../fidelity/gates/sdk-061-dispositions.json).
Font hashes: Geist Mono
`90b15711dc3779b2e64e8aff5228154dd019a90bce4947549c4a8a8a43f2ac25`,
Inter Tight `4b8ef9ed255ebe7341aa566554c0f3e87ee10ce06d2085f07ccf66f41ef96c28`,
Funnel Display `9062978ead3d7a3e8b339e41204a5b551e66bc4a5659fa2c845bb0749431af99`,
Rethink Sans `523d8be1ea86cb2563d503c8de51bfd2c69ab78cdfb72038873adf9cdfcbe2be`.

Carrousel has source bounds `(0, 0, 1080, 1080)`, parent `987:6812`,
source `987:6813`, ordered sibling `987:6814`, and
`mask-v1:f31e9a18`. Existing canonical affected insets are
`top:164.0001220703125, right:0, bottom:163.9998779296875, left:0`.
Raw ZIP, resolver and unrounded projection agree exactly. Snapshots retain
existing four-decimal normalization. All four browser captures publish the
same relationship/revision/capability/strategy and no mask-source RGB owner.

Before/after review finds only intended changes: Now Hiring/Cover dependency
property metadata fixes and editor/PNG route normalization; their settled
geometry, trace and comparison are unchanged. Carrousel source/affected mask
evidence and source/graph readiness change; no other node geometry changes.
All current renderer candidates are byte-identical to the prior individually
source-reviewed references. Canonical scenes are identical. Current review
is automated source/recorded-browser telemetry, not a new separate manual
live inspection. Synthetic edit/resize/fallback scenarios are contract coverage,
not additional source-certified renderer features.

### Commands and results

- Baseline prior-run comparisons: 12 renderer and three scene pass; eight
  settlement pass, four Carrousel bundles pending/unapproved.
- `pnpm fidelity:compare -- --gate sdk-061 --run-id sdk-061-mask-settlement-final-20261007a --font-profile source-authoritative --repeat 2`:
  24 complete captures; all 12 surfaces repeat-stable with zero changed pixels;
  all 12 approved renderer comparisons pass.
- `pnpm scene:compare -- --gate sdk-061 --run-id sdk-061-mask-settlement-final-20261007a --fidelity-run sdk-061-mask-settlement-final-20261007a`:
  three approved scene comparisons pass.
- `pnpm settlement:mask-source-evidence -- --fidelity-run sdk-061-mask-settlement-final-20261007a`:
  all 12 source/browser rows ready, exact mask authority; source/affected-width
  changes invalidate and recompute; partial alpha remains unresolved. Settlement serialization and dependencies are identical between both
  independently recorded capture passes. Local 24-call
  settlement timing: 0.173–1.140 ms, mean 0.369 ms. This is a current-worktree
  measurement, not a release budget or production latency claim.
- `pnpm settlement:update -- --fixture <exact-id> --surface <surface> --run-id sdk-061-mask-settlement-final-20261007a --source-run sdk-061-mask-settlement-final-20261007a --reason "<individual ADR 0092 source review>"`:
  12 individual ready/equivalent bundles approved. Before/after/reason evidence
  is retained under `fidelity/settlement/update-evidence/2026-10-07T16-25-*`.
- `pnpm settlement:compare -- --gate sdk-061 --run-id sdk-061-mask-settlement-final-20261007a --fidelity-run sdk-061-mask-settlement-final-20261007a`:
  12 ready/stable approved bundles pass. Complete/identity/readiness promotion
  guards reject incomplete, pending or unresolved bundles before writes.
- `pnpm sdk:gate:061 -- --run-id sdk-061-mask-settlement-final-20261007a --assess-existing`:
  public single host and Color browser edit/Reset/export pass; complete capture,
  renderer/scene/settlement integrity and source disposition checks return GO.
- `pnpm test:portable`, `pnpm packages:typecheck`, `pnpm build`,
  `pnpm api:contract`, `pnpm boundaries:check`: pass. Root build includes all
  SDK packages and Studio. An earlier concurrent build/check attempt saw
  transient missing dist declarations; checks were rerun after build completion.

The former run's disposition is archived, not overwritten as historical success.
No renderer/scene reference, comparison tolerance, public export name, canonical
schema, production session, persistence or resource policy changed. Advanced
inspection input/output gains additive optional mask evidence; callers without
it remain conservative. General alpha/luminance/nested masks and full settled
runtime authority remain outside this gate. Internal compiler-result contract
and differential tests are the next separate milestone.

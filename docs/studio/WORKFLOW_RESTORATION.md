# Studio workflow restoration

## Frozen responsibility contract

| Screen | Owns | Must not own |
| --- | --- | --- |
| Library | Template/draft discovery and lifecycle actions | Configuration, content editing, implicit conversion |
| Package/Family | Import, incremental variants, metadata, reviewed replacement | Fonts, rules, rebuilding accepted mappings on entry |
| Fonts | Exact font preparation and accepted choices | Mappings, rules, navigation-triggered resets |
| Validate | Existing issues, evidence, context and correction links | Configuration controls or a second semantic validator |
| Fields | Coverage, supported mappings, selected-field rules, labels and order | Source replacement, fonts, permanent output content |
| Add/Review | Summary, current save gate and save | Configuration controls or another validation workspace |
| Template Settings | Reusable metadata/configuration through the same setup workspaces | Draft content or silent updates to existing drafts |
| Draft Editor | Independent canonical content, preview, saving and export | Reusable configuration or source replacement |

Navigation preserves accepted mappings, configuration, ordering and fonts.
Only accepted upstream changes invalidate dependent evidence; rejected changes
leave the accepted state intact. Unapplied form values are UI drafts.

Templates own reusable source/configuration. Drafts own independent canonical
content against their starting configuration. Immutable sources/assets may be
shared under existing persistence ownership; draft independence does not imply
deep duplication. Existing saved work is not silently migrated.

## Phase 1 implementation contract

Context: the default V2 proof workspace bypassed the earlier Studio wizard.
Objective/scope: restore Package/Family → Fonts → Validate → Fields → Add/Review
using current public APIs and the existing design system. Single-source setup is
the simple case. Family controls appear with multiple sources.

Non-goals: no public SDK contracts, persistence versions, renderer/font semantic
changes, arbitrary cross-ID linking, selection-group semantics or visual redesign.
Historical interaction patterns are the reference, not V1 component internals.

Audit: verify existing public load/configure/reimport/resolver contracts before
using them. Source additions preserve accepted family configuration and existing
variant identities; no step-entry effect may rebuild sessions.

Acceptance: accepted rules/order survive backward/forward navigation and source
addition; font changes use reviewed-reimport semantics to retain field authority;
invalid source/configuration changes are atomic; Validate links to Fields; Review
has no configuration controls and uses current evidence for every variant.

Tests: focused state-preservation and failed-transaction tests plus a real-browser
wizard journey, all-variant checks, short viewport, rule correction and save/reload.
Run Studio typecheck/build, portable tests, API/boundary and documentation checks.
Performance: verify navigation does not replace the session, no parallel hidden
renderers, and no new SDK bundle/API surface. Renderer/fidelity gates apply only
if renderer behavior is changed; no golden updates are authorized.

Final report: distinguish browser evidence from automated coverage, record actual
commands/results, and identify remaining phases and specific contract blockers.

## Sequence

1. Setup shell and accepted-state preservation (this coherent implementation).
2. Saved-template/editor separation using existing persistence ownership.
3. Browser UX hardening across the complete restored pipeline.

Phase 1 retains the existing saved V2 workspace while phase 2 restores the full
template/draft distinction. This is not completion of the three-phase programme.

## Phase 1 evidence — 2026-09-06

Implemented in Studio's `src/setup` composition, using existing V2 source,
configuration, reimport, validation, rendering and persistence APIs. The source
append transaction validates a candidate before replacing the accepted session;
it preserves existing variant IDs, packages, common rules and order, and sparse
overrides. Step changes retain the same session and mounted form/font state.
Preview fit/zoom is an external Studio viewport transform, not canvas geometry.

Current-run passing checks:

- `pnpm studio:setup`: actual Chromium five-step navigation, single-source
  progressive disclosure, accepted labels/rules/order, invalid configuration
  correction, incremental Family import, retained variant overrides, rendered
  line issue → Fields correction, all-variant save readiness, summary-only
  Review, 1280×640 footer visibility and existing V3 save/reload.
- The same browser run imported the exact registered deal-of-the-week-banner
  ZIP (manifest SHA-256 checked), uploaded the local exact Rethink Sans face,
  retained its binary identity on navigation and failed replacement, then
  accepted the variable face while retaining an already accepted field label.
- `node scripts/field-rules/studio-v2.mjs`: all eight existing Studio/external-host
  scenarios passed through the restored setup entry point, including seven
  field types, Crop/Boolean/Textarea, PNG, reimport, invalid persisted Crop
  repair, family overrides/framing and save/reload.
- `pnpm test:portable`, `pnpm --filter @sleinity/template-studio build`,
  `pnpm api:contract`, `pnpm boundaries:check`, and `pnpm docs:verify` passed.
  The Studio build includes TypeScript checks. The existing large-chunk warning
  remains (main JS 1,450.65 kB / 403.13 kB gzip in this run).
- `git diff --check` passed. API and boundary checks confirm no SDK API expansion.

Browser evidence: `fidelity/evidence/studio-setup-restoration/report.json`,
`validate.png`, and `fields-short.png`; screenshots were personally inspected.
The existing eight-scenario report is in
`fidelity/evidence/field-rules-v2-studio/report.json`.

No renderer/font semantic implementation, SDK contract, persistence version,
fixture/reference/tolerance or golden changed. Pixel/scene/settlement gates were
not rerun for this host-only shell change; no fresh fidelity-parity claim is made.
This run does not claim V1 legacy-flow verification, arbitrary cross-ID mapping,
selection-group semantics, or completion of template/draft separation. Full
browser history and lifecycle hardening belongs to the remaining phases.

## Phase 2 and Phase 3 status

Template/Draft ownership is implemented; see [the Phase 2 contract and current-run evidence](PHASE_2.md). Templates, Drafts and untagged Existing work have distinct Library actions. The combined workspace is retained only for Existing work compatibility.

Phase 3 browser workflow hardening is implemented; see [its internal contracts and acceptance evidence](PHASE_3.md). Canonical entity locators disambiguate the two persistence stores, one typed route authority owns the default Studio, guarded transitions keep URL and workspace identity aligned, Settings tracks accepted changes, and Library lifecycle failures remain visible and retryable.

Phase 4 V1 shell convergence is implemented; see [its scope and current-run evidence](PHASE_4.md). The V1 Library, setup, Validate, Fields, and editor interaction patterns now compose the existing V2 Family, field-rule, content, persistence, and routing authorities without adding SDK contracts.

Phase 5 workflow parity closure is implemented; see [its bounded scope and evidence](PHASE_5.md). Correction targeting, V1 package intake, Family action ownership, accessible ordering, 768-pixel composition, and recoverable draft opening now close the remaining proven interaction gaps without changing public contracts.

Phase 6 restoration acceptance is implemented; see [the final workflow matrix and exact-package evidence](PHASE_6.md). Target-bound replacement review, conservative correction ownership, distinguishable Family controls, durable post-create recovery, and three hash-gated real-package journeys certify the restored baseline.

The continuing [Family and inspection parity slice](FAMILY_AND_INSPECTION_PARITY.md)
restores the historical selection matrix, grouped inspection interactions,
shared contextual preview and property-driven Draft navigation without changing
the accepted five-step ownership model. Its bounded V2 selection contract is the
only evidence-backed SDK addition to this restoration programme.

Hard offline application-shell delivery and the planned visual redesign remain
later work. Further SDK contracts still require evidence of a concrete
unsupported historical interaction.

## Family media and historical Validate restoration — 2026-09-09

The reported saved Family had recoverable binary assets but Family `loadSaved`
only hydrated replacement assets. Hash-only variant source maps therefore reached
the renderer without image/SVG URLs while media readiness examined replacement
content alone. No repair or migration of the user's saved records was needed.

Family loading now hydrates each variant source map and the replacement map,
deduplicating URLs by binary hash rather than by variant-local asset ID. Separate
source/replacement references retain URLs through content reset. Internal URL
leases also span single-template and Family candidate sessions: disposing a saved
single predecessor during Family promotion must not revoke its successor's source
images or fonts. Stale/failed loads release unpublished URLs; the final runtime
owner releases published URLs. Record versions and canonical content are unchanged.

Family SDK readiness consumes resolved missing-media evidence and the existing
browser image/SVG loader with required decode completion. Missing bytes, unreadable
storage and failed decoding block assets/export; pending decode remains pending.
Later renderer/font Ready publications cannot clear an asset failure. This is SDK
session authority, independent of Studio's diagnostic presentation.

After the focused media gate passed, Validate was recomposed with the existing
`TemplatePackageQualityPanel` and `TemplatePackageDiagnosticContext`: quality list,
status/area/technical filters, grouped findings, affected instances, correction
links and one contextual session renderer. The preview stays mounted when selected
or pending findings change, preventing a rendered-field validation/remount loop.
The Studio adapter projects existing validation, Family, field, resolved-backend
and readiness evidence. It does not run another validator or control saving/export.
Exporter severity and original technical evidence are retained. Absent/pending
renderer evidence and incomplete all-variant coverage are explicit, not Ready.

Intentional variant selection belongs to the Studio setup coordinator. Sequential
checks and issue inspection use temporary session selection, restore on completion,
cancellation/navigation, and never change canonical content or its revision.
Explicit selection supersedes traversal. Check caches are scoped to the accepted
configuration epoch and content revision; current runtime publications replace the
current variant's evidence. Save uses the restored intentional selection. Family
instances carry their variant label in the historical target lists.

### Current-run evidence

- Live affected saved Family: photos and logo restored after reload in Settings
  and Draft Editor. All four variants were checked; the original landscape/gray
  selection and “No changes” status were retained. Existing multiple-paint
  compatibility findings are now visible; those renderer capabilities were not
  changed. A download from that specific live user tab was not independently
  captured; PNG evidence below comes from isolated Chromium suites.
- `scripts/field-rules/family-media.mjs`: Chromium source-byte restoration,
  corrupt/missing bytes, renderer-publication override rejection and guarded
  Family PNG capture using a media-only synthetic probe. Report:
  `fidelity/evidence/studio-family-media/report.json`.
- Portable regressions: shared hashes, duplicate asset IDs with different hashes,
  reset/disposal, candidate ownership, single-to-Family promotion, stale load,
  strict decode rejection, inspection selection/content invariants and read-only
  diagnostic projection.
- `studio:setup`: historical Validate correction focus, exactly one renderer,
  all-variant and mid-traversal navigation restoration, saved selection reload,
  desktop/768 layout and exact-font setup passed. Screenshots include
  `fidelity/evidence/studio-phase-5-setup/validate-desktop.png`,
  `validate-768.png` and `validate-context-768.png`.
- `studio:drafts` and `field-rules:studio`: existing persistence, invalid-input,
  independent drafts, image replacement/framing and Studio/external-host PNG
  regressions passed.
- `studio:workflow-acceptance`: exact manifest-bound post, crop/banner and Boolean
  ZIP workflows passed, including real-package Family promotion, fonts, canonical
  content, independent drafts, reload and export. Report and screenshots remain
  separate in `fidelity/evidence/studio-phase-6-workflow-acceptance/`.

No renderer goldens, canonical schemas, persistence versions or public inspection
API were changed. Deeper capability fixes remain outside this restoration task.

Final checks in this run: `pnpm test:portable`, Studio build, `pnpm api:contract`,
`pnpm boundaries:check`, `pnpm docs:verify`, `pnpm studio:setup`,
`pnpm studio:drafts`, `pnpm field-rules:studio`, `pnpm studio:workflow-acceptance`
and the focused Family media Chromium script passed. The build retains its
existing large-chunk advisory; bundle work was not part of this task.

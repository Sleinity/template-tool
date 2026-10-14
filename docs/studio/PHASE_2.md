# Phase 2 — Templates and Drafts

Context: Phase 1 restored the setup shell. This phase restores product ownership using existing V2/V3 records and public session APIs.

Objective: Library → Template → Create output → Draft Editor → Export. Scope includes saved settings, independent draft snapshots, metadata preservation, serialized 650 ms autosave, explicit recoverable conversion, and source-only font preparation.

Non-goals: new SDK contracts, persistence versions, renderer changes, visual redesign, V1 conversion, or broader Phase 3 journey work.

## Frozen screen responsibilities

| Screen | Owns | Must not own |
| --- | --- | --- |
| Library | Template/draft discovery, creation, deletion, explicit existing-work conversion | Configuration or canonical editing |
| Package/Family | Source intake, metadata, reviewed replacement, progressive Family assembly | Font linking or field rules |
| Fonts | Accepted font assets and requirements | Rebuilding fields or rendered source |
| Validate | Current issues and links to their owning steps | Duplicate configuration controls |
| Fields | Coverage, ordering, selected-field rules | Draft content |
| Add/Review | Summary and explicit save gate | Configuration |
| Template Settings | Reusable source/configuration, explicit save/cancel | Rewriting existing drafts |
| Draft Editor | Canonical output, variant/framing, preview, diagnostics, export | Reimport or reusable rules |

Invariants: navigation retains accepted setup; drafts retain captured configuration; IDs inside Family/source remain unchanged; record IDs own writes and assets; metadata survives every save; older asynchronous loads/writes cannot mark newer work saved. Immutable binary assets remain shared through repository references. Cancel never persists settings.

Audit baseline: existing repositories retain envelope annotations and accept Family record IDs independently of family.id. Existing constructors provide initial canonical content. No proven SDK blockers.

Compatibility: untagged V2 stays Existing work; V1 stays legacy. Single-to-Family settings save a new Family. Conversion keeps its original and uses persisted target IDs for retry.

Acceptance: independent drafts and settings, Family destination isolation, metadata/reload, shared asset deletion, conversion failure recovery, invalid-content and navigation recovery. Automated checks: focused repository/coordinator coverage, portable tests, Studio build, API/boundary checks. Browser checks: setup, existing Studio/external host regression, IndexedDB draft/settings workflows. Performance: autosave schedules only canonical content/selection and serializes writes; renderer publications cause no writes. Record current-run results separately from historical browser evidence.

## Implementation and current-run evidence — 2026-09-06

Studio-owned `studio` envelope annotations distinguish Templates and Drafts and retain lineage/conversion progress. The bound repository adapter preserves record identity, metadata and creation time on session saves. Setup receives persistence ownership through composition; it reopens accepted settings, and promotion of a saved single explicitly saves a new Family. Drafts use existing constructors for initial content and existing asset references. The historical combined editor remains available only for untagged Existing work.

The Draft Editor contains typed canonical controls, variant/framing controls, a reused fit-to-design preview, diagnostics and guarded export. Its Studio coordinator debounces at 650 ms, serializes immutable record snapshots, retains failed writes, flushes before navigation and reports status for the latest content revision. Invalid typed input stays visible and prevents save/export/navigation until correction or reset. Renderer-only publications do not trigger autosave. Older asynchronous loads are discarded. No SDK operation, record version or public session architecture was added.

Automated evidence:

- `pnpm test:portable`: includes Studio repository/coordinator tests for single and Family isolation, future-draft configuration, metadata, shared assets, conversion destination failures/retries, revision-aware serialization and retained failed writes.
- Studio TypeScript/build, public API and package-boundary checks passed. The existing large-bundle warning remains; the implementation does not create an extra renderer or load a new asset framework.

Browser evidence (actual Chromium + IndexedDB, separate from the automated repository assertions):

- `pnpm studio:drafts`: independent drafts, edit/reset/navigation flush, Settings Save/Cancel, metadata/creation time, new configuration only in future drafts, seven field types, invalid input recovery, image replacement, PNG download, offline saved-record reopening, Save as new Family, Family record/selection/framing isolation, template deletion survival, shared binary assets after owner deletion, explicit conversion, injected save failure/retry and stale asynchronous loads. Renderer-only publications leave persisted records unchanged.
- `pnpm studio:setup`: retained accepted navigation/order/configuration, Family coverage/overrides, Validate → Fields correction, summary-only Review, real hash-gated exporter ZIP, exact font upload/replacement and saved V2 font Settings reopening without field reconstruction.
- `pnpm field-rules:studio`: all eight existing Studio/external-host scenarios passed. Its combined-workspace scenarios explicitly seed untagged Existing work; the separate draft suite verifies the new product path. This preserves the old compatibility coverage without presenting the combined workspace as a Draft Editor.

Reports are `fidelity/evidence/studio-phase-2/report.json`, `fidelity/evidence/studio-setup-restoration/report.json`, and `fidelity/evidence/field-rules-v2-studio/report.json`. Draft screenshots and a downloaded PNG are in the Phase 2 evidence directory. Evidence is generated locally, not an approved fidelity reference.

### Remaining limitation and Phase 3 boundary

Offline saved-record reopening succeeds while the application shell is loaded. A hard browser reload with the network disabled fails to fetch the Vite application shell: this host has no offline shell cache. This is a host delivery limitation, not an SDK persistence blocker, and is not claimed as a passing hard-offline-reload scenario. Phase 3 hardens loaded-shell IndexedDB reopening and explicitly defers offline shell delivery; see [Phase 3](PHASE_3.md). The later visual redesign remains separate.

No renderer semantic behavior, fixture, tolerance or approved reference was changed. Renderer pixel/scene/settlement suites were not rerun; these browser workflow results are not fidelity-parity claims. No proven SDK blocker was found.

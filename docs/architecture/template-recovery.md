# One resumable output per template

## Contract

`template-browser/persistence` exposes `TemplateRecoveryRepository`. A slot is keyed by template kind and saved template ID; all variants of a Family share one slot. Canonical V2 single and V3 Family envelopes retain their existing schemas. Ownership tokens and completion tombstones live separately in IndexedDB version 5's `templateRecovery` store.

`begin(key, "fresh" | "resume")` returns a lease and an optional snapshot. A fresh open creates ownership metadata, not a saved content payload. Accepted changes can be captured with the existing saved-session record constructors and passed to `save(lease, payload)`. Captures must be made after local input has been flushed and accepted. Saving is ordered within a lease and ownership is checked in the storage transaction after binary preparation.

`exportAndComplete(lease, callback)` checks ownership, awaits the host's existing export callback, and atomically completes only that lease. Callback rejection leaves recovery intact. `TemplateRecoveryCleanupError` means export succeeded but cleanup failed; retry `complete(lease)` without exporting again. Completion retries are idempotent. A superseded lease cannot save or clear a newer slot. Tombstones prevent interrupted migration from recreating finished work.

The renderer never receives the recovery repository. Asset hashes and owner references use the existing binary store; cleanup retains resources with other owners. In-memory recovery and V2 repositories can share the storage returned by `createInMemoryTemplateSessionRepositoryV2Storage`; default repositories share their memory platform too. IndexedDB ownership and asset-reference changes share a transaction. `getManagedAsset` supports restoring recovery assets through existing session repository adapters.

## Studio

Create output starts from defaults or opens Continue draft / Start from scratch / Cancel. Unchanged openings do not persist content. Local input coordination and the 650 ms autosave delay are retained. Navigation explicitly flushes accepted input and awaits saving. Invalid local values remain visible and block navigation.

Export locks controls and navigation, flushes local input, explicitly captures accepted state, awaits persistence and the existing renderer readiness gate, exports, then completes recovery. Success disposes the editor and returns to Library. Cleanup failure shows a separate retry screen and stops autosave. A superseded editor is replaced by an explanation and a Library action.

Current Studio legacy draft records are grouped by kind/template ID; greatest `updatedAt`, then greatest record ID, wins. Recovery acquires references before legacy owners are deleted. Re-running migration does not overwrite an existing recovery lifecycle. Unlinked records are retained internally with migration diagnostics. Retained old URLs resolve through their owning template; missing or superseded links return to Library. Incompatible records remain available as reimport diagnostics rather than being normalized silently.

V1 catalogue storage readers remain internal for existing data and fidelity tests. They are not supported SDK operations. The former single-template app is loaded only in development fidelity mode from `scripts/fidelity/legacy`; the production Library has no archive catalogue route. Saved legacy payload types and validation remain available for compatibility. Generic template/session storage remains separate from recovery.

## Host migration

Remove calls to `listDrafts`, `getDraft`, `saveDraft`, `updateDraftPackage`, `deleteDraft`, their Family counterparts, and Family session `saveDraft`. Removed record-creation/catalogue helpers are no longer exported. Use recovery inspect/begin/save/complete instead. Keep the lease with the editor and never catch a superseded error by starting a new lease automatically.

The public-only executable host example in `scripts/repository/verify-v2-import-host.mjs` demonstrates saving a canonical snapshot, export completion, and rejection of a late write without Studio imports. The older generic editor sample labels its independent save/restore operation as a session snapshot, not an output-draft catalogue.

## Evidence

Current-run browser evidence is under `fidelity/evidence/studio-recovery` and `studio-recovery-family`. It covers fresh open, navigation flush, cancel, resume, Family variant restoration, start-over, two tabs, failed export, successful export, cleanup retry without another download, retained and superseded legacy URLs, and template deletion.

`studio:drafts` retains seven-field, invalid-input, IME, typing-cadence, image, offline-resume and PNG coverage against recovery. `studio:workflow-acceptance` expects resume/start-over and return to Library after export. Renderer references, scene snapshots, settlement snapshots, and tolerances are unchanged.

### Verification disposition — 2026-09-27

Passed in this implementation run: portable tests, package typechecks and builds, Studio typecheck and production build, API contract, package boundaries, documentation verification, example build, public V2 import host, packed editor and Family acceptance, `studio:setup`, `studio:drafts`, `studio:family-parity`, `field-rules:studio`, and `studio:workflow-acceptance`. The single and Family recovery browser suites also passed after adding legacy URL and template-deletion coverage.

An additional `studio:browser-smoke` run against the development-only legacy Family surface failed at `scripts/repository/verify-studio-browser.mjs`: after the test manually deletes the private font from `document.fonts` and selects Blue Landscape, its wait for the private face to become loaded times out. This is an unresolved font-reactivation check, not a passing result or a demonstrated pre-existing failure. Font behavior was not changed to bypass it. The recovery workflow gates above pass independently; the broader legacy smoke suite is not green.

### Pre-release font verification — 2026-09-30

The unresolved `studio:browser-smoke` font timeout was reproduced by explicitly
removing its private face from `document.fonts`. Its legacy static inspection
preview changed variant without invoking font preparation again. This is an
obsolete expectation of the development-only probe, documented with binary,
private-family and revision evidence in
`fidelity/evidence/prerelease-20260929/legacy-font-removal-probe.json`.
The supported public V2 font lifecycle reactivates that verified binary after
external face removal and variant switching; shared ownership and disposal
checks pass in `pnpm font:reactivation:verify`. The ordinary legacy smoke passes
with the external deletion probe separated. Its fresh-page test now retains the
legacy fidelity-mode URL. `pnpm runtime-routing:fonts` passes with verified
Funnel Display/Sans paths from the shared exact-font manifest. No resource,
renderer, recovery or font runtime behavior was changed. Full fidelity and
gate disposition are recorded in `definition-instance-projection.md` under
“Pre-release regression disposition.”

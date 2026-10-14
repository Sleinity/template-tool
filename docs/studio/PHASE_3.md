# Phase 3 — Browser workflow hardening

Context: Phases 1 and 2 restored the five-step setup flow and separated reusable Templates from independent output Drafts. This phase hardens browser routing, transitions, save state, failures, and Library lifecycle actions without changing SDK or renderer contracts.

Objective: keep the URL, visible product entity, and persisted canonical revision synchronized through direct links, Back/Forward navigation, slow loads, failed writes, and record-ID collisions. Scope includes Studio-owned canonical entity locators, one typed route authority, transition locking, accurate Settings dirtiness, accessible retry states, deterministic Library presentation, and inline deletion.

Non-goals: public SDK additions, persistence or canonical schema versions, renderer behavior, service-worker delivery, automatic V1 conversion, new field semantics, or visual redesign.

## Internal contracts

A Studio entity locator is the pair `{ kind: "single" | "family", id }`. Routes serialize that full locator in the existing `/templates/:entity/settings`, `/drafts/:entity`, and `/work/:entity` shapes. A raw historical ID is accepted only when exactly one repository contains it and is immediately replaced with its canonical URL. A collision returns to Library with a recovery message.

The navigation coordinator owns the accepted route, requested route, transition state, retry target, and generation. It locks the current workspace before flushing, loads a candidate without disposing the active session, and commits only the latest successful request. Cancellation or failure restores the accepted URL and leaves the active session mounted. Unknown routes canonicalize to `/templates` through the same guarded transition.

Settings dirtiness follows accepted metadata, source, font, field, ordering, and reviewed-reimport transactions. Step movement and renderer evidence do not mark Settings dirty. Draft autosave remains a serialized 650 ms Studio coordinator; only its latest canonical revision may report Saved. Invalid local input and pending image reads remain visible and block navigation.

The Library uses the existing application shell and surface/status/alert/button system. Templates, Drafts, and Existing work are independently sorted by updated time, creation time, then canonical locator. Actions remain bounded by entity role. Existing work retains its direct opening path and explicit recoverable conversion. Delete is an inline two-step action; related Templates, Drafts, and shared assets retain their existing ownership behavior.

## Acceptance evidence — 2026-09-06

Automated coverage includes locator round trips and same-ID records in both stores, unique raw-link resolution, ambiguous-link recovery, revision-aware autosave and retry, metadata retention, Family destination binding, conversion recovery, and independent asset owners. Portable tests, Studio build, API contract, package-boundary checks, and documentation links are the required repository gates.

Current Chromium evidence is generated separately by:

- `pnpm studio:drafts`: canonical links, ID collision recovery, failed and stale navigation, locked slow transitions, URL restoration, Settings clean/dirty cancellation, save/list/create/delete failures and retry, independent drafts, Family framing, conversion, shared assets, invalid input, PNG export, and loaded-shell offline IndexedDB reopening.
- `pnpm studio:setup`: five-step setup preservation, progressive Family controls, exact fonts, Validate-to-Fields correction, and summary-only Review.
- `pnpm field-rules:studio`: the existing eight-scenario Studio/external-host regression, including direct opening and repair of untagged Existing work.

Reports live in `fidelity/evidence/studio-phase-3/report.json`, `fidelity/evidence/studio-setup-restoration/report.json`, and `fidelity/evidence/field-rules-v2-studio/report.json`. They are local browser evidence, not renderer reference material.

No public SDK, persistence version, canonical schema, fixture, tolerance, renderer golden, or approved reference is changed. Hard offline application-shell reload remains deferred; IndexedDB reopening remains supported after the Studio shell has loaded. No proven SDK blocker was found.

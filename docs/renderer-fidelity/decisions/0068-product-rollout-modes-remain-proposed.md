# ADR 0068: Internal rollout modes wrap resolved backend decisions

- Status: Superseded for active product behavior by ADR 0071; retained as historical evidence

## Context

The code had internal authoritative, compare, and disabled core-layout modes plus capability-routed appearance owners, but no unified Legacy/Semantic/Compare contract or persisted internal opt-in.

## Evidence

Editor and static surfaces choose different current defaults. ADR 0010 remains Proposed and compatibility still owns incomplete subtrees. Phase 11 centralized backend decisions and Phase 12 made their capability/fallback evidence inspectable, so an internal mode can now select owner activation without reinterpreting raw source properties.

Phase 13 evidence shows that the preference can remain separate from imported package semantics, survive reload/offline restoration, and wrap the same resolved backend decisions on Validate, Fields, editor, and hidden PNG export. Compare can remain observational with one visible owner and no hidden renderer.

## Decision

Accept `ResolvedRendererRolloutDecisionV1` as the versioned activation wrapper over `ResolvedBackendDecisionV1`.

- Missing preference preserves the pre-Phase-13 per-surface default exactly.
- `legacy` selects the compatibility/core-disabled policy where a compatibility owner exists; accepted singular semantic family owners remain active when no older competing owner exists.
- `semantic` selects capability-gated semantic owners and uses coherent compatibility fallback for unsupported families.
- `compare` records both eligible decisions but activates one current visible owner, renders no hidden duplicate, and never blocks export because comparison evidence is absent.
- The global internal preference is stored in IndexedDB metadata under `renderer-rollout-preference`, separate from `basePackage`, `workingPackage`, and imported source semantics.
- Unknown, corrupt, or unsupported persisted values fall back to the unchanged current default. Rollback writes `legacy`; clearing the preference restores the missing-preference default without re-import.
- Only the root provider reads persistence. Renderer components consume the resolved decision and must not read storage independently.

The query-gated development control (`?renderer-admin=1`) is internal tooling, not a public template setting or a new default.

## Alternatives

- Make Semantic the default immediately: rejected because capability coverage is incomplete and would migrate existing output.
- Remove Legacy: rejected because compatibility is required for unsupported families.
- Double-render visible Compare content: rejected because it can alter pixels and exported content.
- Persist the preference in each template: rejected because rollout policy is not imported design semantics.

## Consequences

Rollout is explicit, revisioned, observable, and reversible. Missing/invalid preference preserves current behavior. Compare supplies decision evidence without becoming a second pixel owner. Public rollout and default migration remain future work.

## Compatibility impact

Existing templates and drafts need no migration. Accepted DOM/CSS and SVG owners are not rewritten merely to emulate a historical owner that no longer exists.

## Migration impact

The v1 preference parser migrates known string and v0 values, preserves an auditable identity, and rejects unknown values to safe fallback. The metadata store already exists, so no database-version migration is required.

## Verification

Unit coverage proves missing/corrupt/default behavior, mappings, one-owner Compare, migration, persistence, rollback, diagnostics, filtering, and deterministic identity. Browser runs `phase-13-legacy-now-hiring`, `phase-13-semantic-now-hiring`, and `phase-13-compare-now-hiring` prove all-surface identity and repeatability. `phase-13-compare-representative` covers media, mask, primitive/stroke, linear-gradient, ordered-SOLID, preserved/unsupported paint, and node-opacity compatibility boundaries. Visible run `phase-13-control-headless` plus the in-app review prove persistence, corrupt-value fallback, rollback, and zero renderer-time Figma requests.

## Reversal strategy

Write `legacy` for immediate rollback without re-import. Clear the preference to restore the unchanged missing-preference defaults. The wrapper can be removed without altering imported packages or family contracts.

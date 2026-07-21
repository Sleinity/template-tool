# ADR 0066: Resolved backend decisions centralize existing owner selection

- Status: Accepted

## Context

Core layout, primitive, gradient, ordered-SOLID, media, vector, mask, and compatibility contracts already selected stable owners, but renderer components still inspected several family contracts independently.

## Evidence

Accepted ADRs 0025–0027, 0053, 0061, 0063, and 0065 require explicit, capability-only, singular ownership. Current approved references prove the existing DOM/CSS and SVG owners. ADR 0012 supplies no evidence for Canvas/offscreen activation.

## Decision

Attach one versioned `ResolvedBackendDecisionV1` to every resolved node. Derive it only from existing resolved family contracts, record all participating family owners and revisions, and require renderer owner gates to consume it. Store unavailable alternative-backend policy once at tree level.

## Alternatives

- Rewrite every family behind a new backend interface: rejected because it risks pixels without adding authority.
- Keep renderer-local selection: rejected because ownership remains fragmented and difficult to diagnose.
- Activate Canvas as a universal backend: rejected for lack of fixture evidence.

## Consequences

Backend identity is inspectable and stable across surfaces. Existing family geometry remains unchanged. Compatibility remains a first-class owner. The resolved tree becomes slightly larger.

## Compatibility impact

No intended pixel, layout, schema, import, field, or export change. Older persisted packages reconstruct decisions during resolution.

## Migration impact

Future owners register behind the central contract; they do not add independent renderer routing. Existing family contracts remain authoritative inputs.

## Verification

Contract tests cover deterministic identity, media state revisions, unavailable backend policy, persistence reconstruction, and renderer telemetry. Full reference guards remain required.

## Reversal strategy

Remove the orchestration projection and return gates to their family contracts; no canonical package migration is required.


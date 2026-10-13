# ADR 0087: Matrix and Cover source evidence does not certify group isolation

## Status

Accepted

## Context

Exporter 0.6.1 Matrix exposes six opaque SOLID paint blend modes over image
and flat-color backdrops. Cover exposes a realistic SOLID + IMAGE + DARKEN
gradient stack whose current fade is missing. Broad Phase 9 compositing must
not infer group isolation or alpha order from those two fixtures alone.

## Evidence

The exact identities, Figma screenshot hashes, source pixel checks, and
two-pass four-surface capture are recorded in
[the Phase 9 source gate](../PHASE_9_COMPOSITING_SOURCE_GATE.md). The six
Matrix flat-color samples match source blend formulas within one 8-bit value;
selected image samples match within three. Both ZIPs produce valid,
deterministic scene and appearance projections. Current Matrix PNG output
loses four visibly distinct blend rows.

## Decision

Treat the Matrix cases as partial source certification of opaque per-paint
blend calculations at sampled flat and image locations. Preserve Cover's
ordered IMAGE/gradient evidence and classify its fade as a runtime gap. Keep
general group isolation, paint alpha, node/group opacity order, backend
choice, and production routing unresolved until matched source controls
separate those interpretations. No Phase 9 runtime authority transfers.

## Alternatives

Applying CSS `mix-blend-mode` to all non-NORMAL paints now would guess at
stack isolation and risk backdrop leakage. Selecting Canvas/offscreen now
would add an unproved backend. Approving current stable output would confuse
repeatability with fidelity. All three are rejected for this gate.

## Consequences

The active SDK gate stays no-go for Cover's fade and unapproved references.
The research Matrix remains outside that three-export profile. A matched
group/opacity export is the next source prerequisite for a decision-complete
runtime contract.

## Compatibility impact

No renderer, import, schema, public API, persistence, diagnostic policy, or
stored-data behavior changes.

## Migration impact

None. The extra fixture and source checker are test-only evidence.

## Verification

Re-run the hash-gated `pnpm compositing:source-evidence` command, portable
profile tests, and two-pass four-surface capture. Scene/settlement comparisons
must remain run-bound and unapproved until separately reviewed. A later
runtime milestone needs edit, resize, export, ownership, invalidation,
performance, and source-fidelity evidence before support can be claimed.

## Reversal strategy

Archive the research fixture/profile if superseded by a better exact source;
do not rewrite historical capture evidence or approve current pixels.

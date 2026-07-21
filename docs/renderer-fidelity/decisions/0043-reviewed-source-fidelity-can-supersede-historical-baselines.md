# ADR 0043: Reviewed source fidelity can supersede a historical renderer baseline

## Status

Accepted

## Context

The now-hiring approved references froze an older renderer interpretation that never matched the exact ZIP preview. Treating that historical output as visual authority would block a source-grounded correction.

## Evidence

The exact ZIP hash, embedded preview hash, source node bounds, `CAP_HEIGHT` metadata, managed fonts, settlement geometry and all-surface evidence agree on text positions. Milestone 5 and 5.1 candidates preserve earlier intermediate states. The Milestone 5.2 bundle retains every reference type and shows remaining large differences are principally media placement.

## Decision

An approved renderer reference remains regression evidence, not stronger authority than exact source design and structural semantics. A candidate may be classified as a reviewed source-fidelity correction when its packet retains the exact source, historical reference, intervening candidates, current output, diffs, environment, and capability-specific evidence. Promotion still requires explicit human review, a supplied reason, and the guarded update command.

## Alternatives

Forcing new output toward the approved image, automatically using embedded previews as goldens, and promoting because a candidate is newer are rejected.

## Consequences

Fidelity corrections can intentionally replace known-bad history without weakening reference immutability. Review must separate the corrected family from unrelated remaining differences.

## Compatibility impact

No reference is changed by this decision. Normal comparison remains non-writing and fails against historical output until explicit promotion.

## Migration impact

The now-hiring packet classifies preview.png as primary source-design evidence and ZIP metadata as structural authority. Other fixtures require their own reviewed source classification; this is not a global preview-as-golden rule.

## Verification

Reference immutability checks, source/approved/M5/M5.1/M5.2 retained bundle, text geometry overlay, all-surface comparison, exact font identity, and explicit review gate.

## Reversal strategy

Leave historical approved references unchanged and retain the candidate artifacts. No source, package, or runtime rollback is required.

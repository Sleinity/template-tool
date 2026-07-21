# ADR 0029: Routed export requires a current stable settlement

## Status

Accepted

## Context

PNG capture can race font activation or measurement publication in its hidden editor renderer.

## Evidence

The first Milestone 4 preflight correctly withheld PNG output while native-trim text had no measurement publication. After correcting the intrinsic boundary, editor and hidden renderers published the same ready identity. Real root resize exported 800×1080.

## Decision

For a routed package, export requires a ready settlement identity and revision stable for two animation frames. Stale/pending work is rejected. A zero-routed compatibility package keeps existing export readiness.

## Alternatives

Capture after an arbitrary timeout or capture the last DOM state are rejected.

## Consequences

Readiness failures are explicit rather than silent stale exports.

## Compatibility impact

All registered PNG exports pass unchanged.

## Migration impact

ADR 0010 remains Proposed because static inspection surfaces do not yet consume the same settled instance.

## Verification

Stage 4A shared-identity evidence, PNG export tests, 16/16 browser comparisons, and compatibility export coverage.

## Reversal strategy

Disable routed ownership for the affected subtree; do not weaken the readiness check.


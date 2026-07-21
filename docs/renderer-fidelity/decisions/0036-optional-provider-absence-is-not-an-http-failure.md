# ADR 0036: Optional provider absence is not an HTTP failure

## Status

Accepted

## Context

Controlled imports reported a browser HTTP error whenever optional Figma enrichment had no configured provider.

## Evidence

The typed payload already distinguishes `provider-unavailable` from invalid requests, authentication, missing nodes, and provider failures.

## Decision

Return HTTP 200 with the existing typed `ok:false, code:provider-unavailable` payload only for expected provider absence. Keep unexpected and invalid states non-2xx.

## Alternatives

Suppressing all errors or requiring a provider was rejected.

## Consequences

Expected capability absence stays visible without console noise.

## Compatibility impact

Client semantics and non-blocking enrichment remain unchanged.

## Migration impact

None.

## Verification

Server tests and browser console capture.

## Reversal strategy

Restore 503 without affecting renderer output.

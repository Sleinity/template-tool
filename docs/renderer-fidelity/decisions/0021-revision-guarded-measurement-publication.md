# ADR 0021: Measurement publication is revision guarded

## Status

Accepted

## Context

Async font, asset, observer, and animation-frame work can finish after package, override, asset, font, or container state has changed.

## Evidence

Current effects clean up observers but do not publish against a shared package/scene/override/font/asset/container epoch. Contract tests demonstrate rejection of stale and unrecognized future revisions.

## Decision

Publish a measurement snapshot only when every revision-vector dimension exactly matches the settlement input. Older work is stale; future work is not accepted early. Rejection retains a machine-readable reason and publishes no partial snapshot.

## Alternatives

Last-callback-wins and timestamp ordering were rejected because neither proves semantic currency.

## Consequences

Async completion order cannot silently overwrite a newer observational state. Producers must retain revision identity.

## Compatibility impact

None; the guard is not wired to production callbacks.

## Migration impact

Future runtime adoption requires monotonically managed package, scene, override, font, asset, container, and epoch counters.

## Verification

Current, stale, and future publication tests plus deterministic serialization.

## Reversal strategy

Remove the publication guard with the observational settlement branch; current runtime remains unchanged.

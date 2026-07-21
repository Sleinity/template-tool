# ADR 0001: ZIP-first offline authority

## Status

Accepted

## Context

Deterministic rendering cannot require live source-system access.

## Evidence

`bundle/loadTemplatePackageBundle.ts`, `loadTemplatePackageBundleSource.ts`, the import pipeline, persistence repositories, and diagnostic ZIP scripts load all package files/assets before rendering. No renderer-time Figma call was found.

## Decision

The imported ZIP and the validated package/assets derived from it remain authoritative for offline rendering.

## Alternatives

Live Figma lookups at render time were rejected because they are non-deterministic and unavailable offline.

## Consequences

Required source data must be packaged, normalized, enriched ahead of time, cached, or diagnosed as unavailable.

## Compatibility impact

Existing ZIP import, persistence, previews, editor, and export remain unchanged.

## Migration impact

None for Milestone 0; future exporters may need to include additional semantics.

## Verification

Run full and strict diagnostic ZIP lifecycle tests; verify renderer modules do not import enrichment providers.

## Reversal strategy

Supersede this ADR only with an explicit determinism/security decision and offline replacement path.

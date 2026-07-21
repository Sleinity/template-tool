# ADR 0003: Optional non-blocking Figma enrichment

## Status

Accepted

## Context

Figma can add evidence but must not be required for import or rendering.

## Evidence

`runTemplatePackageImportPipeline.ts` calls enrichment only when source metadata permits and retains the normalized ZIP package when enrichment is absent or fails; server providers are outside renderer modules.

## Decision

Figma enrichment remains optional, non-blocking, cached/provenance-aware, and absent from renderer-time execution.

## Alternatives

Mandatory live enrichment is rejected for availability and determinism reasons.

## Consequences

Features requiring unavailable source semantics remain partial/unknown and diagnosed.

## Compatibility impact

Offline packages continue to import, persist, edit, preview, and export.

## Migration impact

Future cached enrichment must be versioned and revalidated.

## Verification

Import/enrichment tests with provider success, absence, and failure; offline render smoke test.

## Reversal strategy

Disable enrichment and use the original normalized ZIP package.

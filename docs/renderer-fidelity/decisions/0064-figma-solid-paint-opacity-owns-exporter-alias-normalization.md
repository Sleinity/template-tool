# ADR 0064: Figma SOLID paint opacity owns exporter-alias normalization

## Status

Accepted

## Context

Exporter 0.6.0 serializes one Figma SOLID Fill opacity into both canonical `color.a` and `paint.opacity`. Applying both multiplies one source semantic twice. The exporter source is unavailable.

## Evidence

The Figma Plugin API defines `SolidPaint.color` as RGB without alpha and defines paint `opacity` as the transparency property. `figma.util.solidPaint` maps alpha-bearing color input to paint opacity. Exact exporter-0.6.0 ZIPs contain equal serialized alpha/opacity pairs, and their previews apply the value once.

## Decision

Add strict `solid-paint-source-v1` canonical provenance. For identified exporter-0.6.0 Figma SOLIDs without raw paint evidence, finite unit alpha/opacity values equal within `1e-6` are a mirrored compatibility alias. Preserve both serialized values, normalize canonical color alpha to 1, retain paint opacity as source authority, and publish paint opacity as the one effective opacity. Differing or conflicting evidence remains unchanged and ambiguous.

## Alternatives

Multiplication, picking a field from preview pixels alone, treating every exporter/version as affected, copying mapped canonical data into `rawFills`, and fixture-specific rules were rejected.

## Consequences

Affected packages become semantically apply-once while retaining inspectable original evidence. Canonical and resolved source clones can distinguish source paint opacity, compatibility aliasing, effective opacity, and ambiguity.

## Compatibility impact

Only Figma exporter 0.6.0 and the exact predicate are normalized. Existing packages remain readable. Unaffected versions and differing values retain prior canonical fields. General multiple-fill rendering remains unchanged.

## Migration impact

Future exporter versions should preserve actual same-index raw `SolidPaint` records or emit equivalent explicit provenance. Future ordered-stack resolution consumes canonical provenance rather than guessing aliases.

## Verification

Focused normalization/schema tests cover mirrored partial values, multiplication rejection, opaque values, zero opacity, differing values, raw source preservation, unaffected versions, idempotence, and strict validation.

## Reversal strategy

Remove the bounded normalizer call while retaining serialized provenance fields. Do not route ambiguous paints or reinterpret them silently.

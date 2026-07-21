# Renderer Fidelity Charter

## Purpose

Build a deterministic contract renderer that converts validated `TemplatePackageV1` packages into editable, responsive, export-safe output while preserving source intent and provenance. Fidelity is a traceable systems property, not a collection of fixture-specific fixes.

## Contract

The long-term pipeline is:

`source ZIP -> source-contract parse -> provenance-preserving normalization -> strict canonical package -> resolved semantic graph -> dependency settlement -> renderer backend -> preview/export evidence`

The current implementation reaches a resolved render tree and browser DOM, but does not yet publish a single fully settled dependency graph. [Current architecture](CURRENT_ARCHITECTURE.md) records that factual boundary.

## Non-negotiable invariants

The root [`AGENTS.md`](../../AGENTS.md) contains the durable invariant list. Every future renderer milestone must preserve it. In particular:

- default and edited content share one lifecycle;
- imported values and unsupported features retain provenance;
- rendering is generic and never fixture- or name-dependent;
- browser measurement supplements semantic intent;
- image stretching requires explicit intent;
- Figma enrichment is optional and absent at render time;
- inspection/debug content is not export content;
- canonical validation remains strict;
- deterministic rendering is offline-capable;
- golden changes require fidelity evidence and review.

## Support taxonomy

| Level | Meaning |
| --- | --- |
| Native | The selected backend directly expresses the required semantics. |
| Emulated | Renderer logic reproduces semantics using another primitive. |
| Approximated | Output is intentionally close but known not to be exact. |
| Raster fallback | A raster representation is used to preserve appearance. |
| Preserved only | Source data survives, but current output does not reproduce it. |
| Unsupported | The renderer cannot preserve the behavior or appearance safely. |
| Unknown pending audit | No runtime evidence is sufficient for a claim. |

Type declarations alone are never evidence of support. A capability is complete only with a source fixture, edit test, resize test, export test, and documented fallback.

## Evidence and acceptance

Each behavioral change must include:

1. source and normalized evidence;
2. canonical and resolved evidence;
3. preview and export evidence;
4. diagnostics for fallback or unsupported behavior;
5. automated tests plus explicitly labeled browser verification;
6. performance evidence appropriate to the change;
7. capability, fixture, status, ADR, and handoff updates.

Do not claim success from static markup alone when the behavior depends on browser measurement, font activation, image decode, resizing, or capture.

## Diagnostics audiences

- **User**: actionable editing/export consequences in the product.
- **Exporter**: source omissions, malformed metadata, and contract defects.
- **Renderer telemetry**: resolution choices, approximations, invalidation, performance, and backend selection.

These streams may share identifiers but must not be collapsed into one audience.

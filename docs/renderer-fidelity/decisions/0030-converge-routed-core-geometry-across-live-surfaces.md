# ADR 0030: Converge routed core geometry across live surfaces

## Status

Accepted

## Context

Fields and Validate derived the same settlement identity as editor/export but presented static resolved geometry.

## Evidence

`TemplateInspectionPreview` is the shared live inspection surface. The fidelity harness captures it separately from editor and PNG.

## Decision

Apply authoritative settlement geometry for capability-routed nodes on all live inspection surfaces. Keep compatibility appearance and surface-local settlement instances.

## Alternatives

Static core geometry and forced whole-renderer parity were rejected.

## Consequences

Eligible geometry converges; reviewed reference differences may occur. ADR 0010 remains Proposed.

## Compatibility impact

Unsupported subtrees remain compatibility-owned; overlays remain non-export content.

## Migration impact

Future work may share a settled instance only under ADR 0010's independent gate.

## Verification

All-surface capture, repeatability, exact fonts, scene/settlement comparison, and real PNG export.

## Reversal strategy

Return inspection previews to compare mode without changing package or scene data.

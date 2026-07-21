# ADR 0063: Source-certified linear gradients use a versioned contract and singular runtime owner

## Status

Accepted

## Context

ADR 0062 required isolated real-source evidence before any linear-gradient authority transfer. The cumulative gradient-test evidence closes the fixture gate, including paint-opacity isolation. The separately approved Milestone 7.3A now transfers only the certified subset.

## Evidence

The exact four-revision source chain and selected-handle screenshots are recorded in `LINEAR_GRADIENT_TEST_INTAKE_EVIDENCE.md`. The final ZIP is `template-package-gradient-test-4.zip`, 193,635 bytes, SHA-256 `9da63d95f3a6b661a0c4818908abc39735e63a9b8cdf00e8aa42c243813a0ad3`, package/root `pkg_457_36_1784372293276` / `457:36`, exporter 0.6.0. Node `457:46` has one raw and canonical linear-gradient paint at opacity 0.5, node opacity 1, two stops at alpha 1, and no competing appearance owner. Preview samples match paint-opacity multiplication followed by source-over within one channel; ignoring, doubling, or applying opacity to stop RGB does not.

The earlier accepted revisions establish normalized node-local-to-gradient matrix direction, one inverse for start/end/third handles, nonuniform two- and three-stop order, straight RGB plus independent-alpha interpolation, non-square diagonal geometry, gradient-local evaluation before node rotation, independent-corner clipping, and controlled current-bounds resizing.

## Decision

Use one versioned canonical and resolved `GRADIENT_LINEAR` contract for the certified isolated subset, followed by one capability-selected singular SVG primitive owner. The implemented eligibility, geometry, fallbacks, revisions, surface identity, and evidence are in `LINEAR_GRADIENT_RUNTIME_AUTHORITY.md`.

## Alternatives

CSS-angle approximation, multiple simultaneous paint owners, trial-and-error transform changes, Canvas, shader rendering, and expanding directly into mixed paint stacks or compositing are rejected for the bounded first implementation.

## Consequences

Unsupported combinations retain one coherent compatibility owner. The SVG path reuses independent-corner primitive geometry and avoids non-square CSS-angle distortion. The exact transform mapping is verified against the source preview.

## Compatibility impact

Only capability-eligible isolated linear gradients transfer ownership; all other gradient and paint combinations retain current behavior and diagnostics.

## Migration impact

Implementation hydrates canonical source-indexed gradient semantics with provenance, adds resolved geometry and revision identity, and disables compatibility appearance only for eligible nodes. No general scene graph, Canvas backend, masks, effects, or compositing engine is introduced.

## Verification

Both exact hash-gated fixtures pass strict lifecycle. Focused contract/geometry tests pass. Two-pass Validate, Fields, editor, and PNG are stable. Source versus PNG is 3 pixels / 0.0002% for the nine-case fixture and exact for paint opacity. Save/reload with Figma blocked preserves identity with zero runtime requests. Reference promotion remains a separate explicit decision.

## Reversal strategy

Disable the capability route and restore the complete compatibility owner without altering preserved source semantics. Any backend change must keep the canonical contract and produce new reviewed source evidence.

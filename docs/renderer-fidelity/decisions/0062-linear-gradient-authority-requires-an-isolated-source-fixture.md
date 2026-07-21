# ADR 0062: Linear-gradient authority requires an isolated source fixture

## Status

Accepted

## Context

Milestone 7.2 is approved. The next appearance family is linear gradients, but the current fixture set contains only two gradient nodes. One is a SOLID + IMAGE + `DARKEN` gradient stack; the other is a SOLID + exporter-only SHADER + gradient stack. Neither can isolate gradient coordinate or raster semantics.

The audited exports also preserve complete stops and `gradientTransform` only in `extensions.figma.rawFills`; their canonical `appearance.fills` gradient entries omit that data. The resolver diagnoses gradients as unsupported and the renderer has no gradient owner.

## Evidence

The exact registered fixtures and all eleven ZIPs currently present in `/Users/niels/Documents/Templates` were audited on 2026-07-17. Only `template-package-bb-cover-thing.zip` and `template-package-main-visual-section.zip` contain `GRADIENT_LINEAR`, with the incompatible dependencies recorded in `LINEAR_GRADIENT_FIXTURE_GATE.md`.

Current code evidence is `PackageGradientPaint` and the strict schema, raw-fill preservation in normalization, `CanonicalSceneGraphV1`/`PaintStackV1`, unsupported `resolveFill`, and the renderer's first-visible-SOLID compatibility path.

The user-accepted first gradient-test fixture establishes most matrix, stop, alpha, non-square, rotation, and uniform-corner semantics. The exact supplementary fixture `template-package-gradient-test-2.zip` (`c2a41a23ed57651f50406bf645779191480eca38514c2a748cbe5b064ad6890a`) closes source-side independent-corner clipping and strengthens diagonal non-square evidence. It does not close the ADR gate: selected-handle evidence is absent, the opacity case changes node opacity rather than paint opacity, and the same-ID resized node also changes its stops and transform.

The second supplement `template-package-gradient-test-3.zip` (`d3904ce8b52c57111235482fecdd126a6ecf63ddbca1eb72a52e364dc927031b`) plus two exact selected-gradient screenshots closes handles and controlled resize. One inverse maps normalized gradient-space `(0,0.5)`, `(1,0.5)`, and `(0,1)` to the selected start, end, and perpendicular handles within one screenshot pixel. Node `451:175` preserves byte-identical stops and transform across 554×240 and 710×240 source states. The ADR remains gated only because the attempted opacity case records stop alpha 0.8 while paint opacity remains 1.

The final supplement `template-package-gradient-test-4.zip` (`9da63d95f3a6b661a0c4818908abc39735e63a9b8cdf00e8aa42c243813a0ad3`) closes that last condition. Node `457:46` isolates raw/canonical paint opacity 0.5 while node opacity and both stop alphas remain 1. Seven preview samples match straight RGB plus independent alpha, paint-opacity multiplication, and source-over within one channel; ignoring, doubling, or applying opacity only to RGB differs by 44–90, 44, and 47 channels respectively. The source fixture requirement in this ADR is now fulfilled.

## Decision

Do not transfer linear-gradient authority or change production gradient pixels until one exact real ZIP isolates the required coordinate, handle, transform, stop, opacity, corner, resize, surface, persistence, and offline cases in the fixture gate.

The fixture must prove source-to-canonical pairing before the renderer consumes the semantics. Existing unsupported combinations remain coherent compatibility boundaries. Backend selection remains evidence-led; Canvas, effects, masks, general compositing, gradient strokes, other gradient types, and unrelated primitive work are excluded.

## Alternatives

Using the existing layered gradients, authorizing from the synthetic appearance probe, guessing Figma matrix semantics from CROP, translating the matrix by visual trial and error, and updating historical references were rejected.

## Consequences

The source fixture gate is closed, but production work remains paused pending separate approval of the bounded authority-transfer proposal in ADR 0063. Gradient support remains `Preserved only`.

## Compatibility impact

None. Existing normalization, canonical validation, resolved warnings, compatibility rendering, all live surfaces, and PNG export are unchanged.

## Migration impact

After gate closure, a later change may add provenance-preserving source normalization and one capability-selected linear-gradient owner for the certified subset. Unsupported combinations continue to fall back as a complete primitive.

## Verification

Documentation validation, exact ZIP audit, code-path audit, and approved-reference aggregate identity checks. No reference update command is permitted by this ADR.

## Reversal strategy

Supersede this gate only with an ADR citing the exact qualifying ZIP, source regions, derived coordinate model, implementation evidence, all-surface/PNG results, persistence/offline evidence, and explicit reference-review state.

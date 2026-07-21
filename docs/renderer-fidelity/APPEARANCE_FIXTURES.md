# Appearance Fixture Audit and Acquisition Policy

The machine-readable audit is [`fidelity/appearance-fixtures.json`](../../fidelity/appearance-fixtures.json).

The five registered real ZIPs provide evidence for solid fills, image FILL, static affine CROP, basic rectangular clipping, text, and limited SVG/vector-asset presence. The new CROP fixture is exploratory and has no approved renderer/scene reference. Existing approved scene snapshots contain no gradient fills, strokes, effects, or true masks; they contain only `PASS_THROUGH` blend evidence. Type declarations and source-level helpers are not treated as rendered support.

The 2026-07-16 Milestone 6.1 audit also inspected the two unregistered external exports `template-package-bb-cover-thing.zip` (`7349496…e4b3`) and `template-package-main-visual-section.zip` (`c3562c45…31df`). Neither contains `scaleMode: CROP`; the first contains `FILL + imageTransform` and the second contains no CROP image paint. The diagnostic ZIP paths resolve to the already-registered deal post/banner. The later supplied real CROP export is recorded in [CROP source evidence](CROP_SOURCE_EVIDENCE.md).

Two source-level probes exist:

- `appearance-contract-probe` exercises contract ordering/preservation for multiple paints, gradients, strokes, mask metadata, effects, compositing, components, variables, and styles.
- `circular-fill-inside-hug` exercises deterministic route classification and compatibility fallback.

Both are explicitly exploratory. Neither is a real exporter ZIP, source-design reference, renderer golden, nor support claim.

Before an appearance family can route, acquire a real ZIP with exact bytes/hash, source reference, dimensions/root/version, fonts/assets, edit/resize/export cases, fallback expectation, and reviewed tolerance. Similar filenames may not substitute. The acquisition backlog covers media modes/adjustments, semantic geometry, paint/stroke details, true mask variants, effects/compositing, and design systems.

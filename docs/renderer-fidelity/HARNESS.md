# Renderer Fidelity Harness

The Milestone 1 harness captures current behavior through the real application flow. It imports the exact ZIP, applies only explicit and recorded font replacements needed by the existing wizard, persists a template, creates/restores a draft, captures live renderer surfaces, and downloads PNG through the real export button. It does not add a settled graph or a renderer-ready runtime API.

## Commands

Install project dependencies and the pinned browser once on a new machine:

```bash
pnpm install
pnpm exec playwright install chromium
```

The browser binary is a test dependency/cache and is not included in the production bundle.

| Command | Behavior |
| --- | --- |
| `pnpm fidelity:baseline` | Verify hashes and capture every fixture/surface twice. Writes candidates only. |
| `pnpm fidelity:compare` | Make a fresh capture, compare with approved pixels/geometry, and retain failures. Never updates references. |
| `pnpm fidelity:source-authoritative` | Verify registered exact font bytes, upload through the real Fonts UI, restore the draft, and capture now-hiring surfaces. Writes candidates only. |
| `pnpm fidelity:source-authoritative:compare` | Repeat the exact-font flow and compare without updating approved references. |
| `pnpm fidelity:update -- --reason "…"` | Explicitly promote candidates. A reason shorter than eight characters fails before mutation. |
| `pnpm fidelity:fixture -- <fixture-id>` | Capture one exact manifest fixture. |
| `pnpm fidelity:report` | Render the latest or selected `run.json`/comparison as Markdown. |
| `pnpm image-placement:png-determinism -- --run-id <id> [--headed]` | Capture `deal-of-the-week-banner` PNG five times in one browser process with media/decode/object-URL/network/raster evidence. Run twice for a fresh-process check. |

Common options are `--fixture <id>`, `--surface validate,fields,editor,png-export`, `--run-id <stable-id>`, `--output <candidate-root>`, `--artifact-output <failure-root>`, `--repeat <n>`, `--threshold <pixelmatch threshold>`, `--allowed-percent <percentage>`, `--headed`, and `--port <port>`. `TEMPLATE_PACKAGE_FIXTURE_DIR` relocates the fixture directory; filenames and hashes remain exact.

## Capture surfaces

| Surface | Route | Component/mode | Package source | Capture |
| --- | --- | --- | --- | --- |
| Validate | `/templates/new`, Validate step | `TemplateInspectionPreview` → `TemplatePackageRenderer`, static or selected diagnostic mode | Current import result package | Select the first Preview diagnostic that exposes a live canvas, then element screenshot |
| Fields | `/templates/new`, Fields step | `TemplateInspectionPreview`, static | Current import result package | Renderer-canvas element screenshot |
| Editor | `/drafts/:draftId` | `ScaledTemplatePackagePreview`, editor | Restored draft `workingPackage` | Renderer-canvas element screenshot |
| PNG export | `/drafts/:draftId` | hidden `TemplatePackageRenderer`, editor/final-frame | Restored draft `workingPackage` | Real download from `Export PNG` |

No separate review surface exists. Importer live output is the Validate/Fields pair. Dashboard thumbnails are persisted static images and intentionally excluded. The hidden visual-diff renderer is infrastructure, not a user capture surface.

Validate and Fields are expected to share static geometry for the same selected package. Editor mode may differ because it activates live layout/constraint behavior. PNG structural source metadata matches editor mode in the current implementation because export uses a second hidden editor-mode renderer; it is still separately captured.

## Readiness strategy

The harness waits for the existing evidence available today:

1. real import/validation and expected wizard route;
2. visible `[data-template-package-canvas]` with `data-resolved-render-tree` other than `package-fallback`;
3. `document.fonts.ready` and a recorded `FontFaceSet` report;
4. decoded DOM images and fetched background-image URLs;
5. unchanged node bounds for three consecutive animation frames, up to 120 frames;
6. capture only after the preceding checks.

This is deliberately not called a settled graph. It cannot prove that every late browser/font event is exhausted.

For hidden PNG export, CSS-background media has one additional explicit boundary under ADR 0069. The export path decodes every current media source, binds asset/placement/backend/settlement/geometry evidence into a revision fingerprint, and completes one discarded foreignObject raster for a new capture-node revision before producing the candidate raster. This is not a fixed sleep. `capture-N-evidence.json` retains pre/post hidden-target state, media readiness, decode events, object-URL lifecycle, backend/settlement identity, and raster timings; `network.json` and exact `repeat-comparison`/`repeat-diff` files remain beside the PNGs.

## Structural report

`structure-N.json` includes fixture/source hashes, surface/route/mode, root and package/resolved versions, ordered nodes, parentage, resolved and browser bounds, layout/sizing/positioning roles, transform evidence, hashed text, browser text measurements, font face/status/readiness, image asset/intrinsic/slot/fit/crop/focal/zoom data, clip/mask strategy, fallbacks, diagnostics, warnings, asset/font readiness, and phase timings.

`model-entry.mjs` is bundled temporarily as a Vite SSR test entry so it calls the production import pipeline and `createResolvedRenderTree` without being shipped in the application. Comparison normalization removes timestamps, run IDs, environment, browser console data, and timings and rounds geometry. Random draft IDs remain in the human report route but are excluded from geometry comparison.

The deterministic browser context explicitly fulfills optional `/api/template-package/enrich-figma` requests with the typed `provider-unavailable` response. This models the supported no-provider environment and prevents expected capability absence from becoming HTTP console noise. It does not mask other requests or unexpected application errors.

## Pixel and geometry comparison

Pixel comparison requires equal dimensions, records exact mismatch state, changed pixels/percentage, a configurable `pixelmatch` threshold, bounding rectangle, ten highest-density 64px regions, and a transparent diff PNG. Default policy is threshold `0.1`, anti-alias pixels excluded by `pixelmatch`, and zero allowed changed-pixel percentage. This tolerance is environment-specific and replaceable.

Geometry comparison independently reports missing, extra, and reordered nodes; x/y/width/height changes; transforms; text measurements; and image slots/placement. Defaults are 0.25px for bounds/image slots, 0.5px for text measurements, and 0.001 for transform scalars. Pixel similarity never hides structural change.

## Repeatability and timings

Every selected surface is captured twice in one process. The report compares repeated pixels, normalized geometry, font readiness, and timing deltas. A fixture run is non-zero when a capture errors or repeatability is unstable. A second `fidelity:compare` process supplies the fresh-process check.

Timings currently cover import, draft restore, first editor renderer appearance, readiness, capture, PNG export, and full fixture flow. They are baseline observations, not budgets. Approximate process memory is not yet reliable; the environment report records system memory only.

See [reference policy](REFERENCE_POLICY.md), [environment policy](ENVIRONMENT_POLICY.md), and [failure artifacts](FAILURE_ARTIFACTS.md).

Canonical scene snapshots/equivalence use a separate evidence system documented in [Scene graph harness](SCENE_GRAPH_HARNESS.md). Scene snapshot commands cannot update these pixel references, and pixel reference commands cannot approve a scene contract change.

## Font profiles

`application-default` preserves the historical harness behavior and records explicit replacements. `source-authoritative` loads `fidelity/fonts.json`, expands configured/default external paths, verifies byte count and SHA-256 before launching Chromium, and fails if an exact face is absent or changed. It then uses the real upload control for every source request. The report records requested identity, parsed/linked classification, full binary hash, private runtime family, computed CSS family, paint-range widths, loaded faces, and restore/export evidence. These profiles must not share approved raster assumptions implicitly.

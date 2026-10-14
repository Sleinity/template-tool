# Output workspace refinements — 2026-10-12

The five browser comments are implemented in the output workspace. Other Studio
pages, SDK diagnostics, validation and export authorities remain unchanged.

| Comment | Change |
| --- | --- |
| Header background and strokes | Transparent header with no container border or divider; accessible focus rings remain. |
| Issues | Removed the output button, count, drawer and drawer state. Field errors remain inline; export correction links focus the relevant value directly. |
| Initial zoom | Output opens at 40%, including newly selected Family designs. Explicit Fit design/field, zoom and pan remain available; ordinary edits preserve manual view state. |
| Page width | Output shell uses available width with 24 px outer gutters instead of the shared maximum-width cap. Other pages retain their shell. |
| Content width | 400 px desktop panel; 380 px at 1024–1199 px; tablet retains its full-width Content/Preview views. |

Only the output caller supplies the private initial-zoom and shell styling props.
Importer inspection and the separate field workspace retain their current fit
behavior. SDK sessions continue owning mutation acceptance, assets, fonts,
materialization, saving and readiness. No schema, public API, version or renderer
semantics change is included. Draft scheduling and autosave are unchanged.

The test-only source camera explicitly invokes the existing Fit design control;
its reference pose is independent of the new product default zoom. It does not
change approved references or tolerances.

Follow-up: [R07](../architecture/r07-carrousel-raster.md) proves that while the
final pose is unchanged, the preceding 40% viewport affects native thumbnail
raster samples. The retained NO-GO below is historical. A separately reviewed
Carrousel/editor reference update and fresh certification resolve that difference;
these output settings and renderer semantics remain unchanged.

## Verification

Hash-verified [pre-change sources](evidence/output-refinements-20261012/baseline.json)
retain the preceding implementation. Isolated exact-font browser tests cover
Now Hiring, Cover, Carrousel and a publicly assembled Family at 2048×1475,
1440×900, 1024×768 and 768×1024. They assert the transparent/borderless header,
missing Issues control, initial 40%, full wide-screen frame and wider panel.
They also exercise all-field Reset, queued input, invalid Date/Color, image
replacement, late callbacks, camera/mount persistence, tablet tabs and PNG export.
Blocked Textarea content remains visible inline and export stays disabled; its
correction action focuses the value without a drawer.

Studio typecheck/build, API contracts, package boundaries, editor lifecycle and
draft/recovery workflows pass. Lifecycle coverage includes IME, focus/caret,
save failure/retry, session replacement and latest-value export. Draft coverage
includes all seven field types, offline resume and export completion.
Automated captures were inspected; this is not manual user-browser or
screen-reader certification. The preceding product report remains historical
evidence rather than a claim that its old screenshots show this layout.

Current screenshot (retained locally: `../../fidelity/evidence/output-refinements-20261012/exporter-061-carrousel-2048-initial.png`; excluded from release source)
and [verification record](evidence/output-refinements-20261012/verification.json)
retain the measured layout, source hashes and command results.

The additional source gate `sdk-061-output-refinements-20261012b` has 24 complete
stable captures, three passing scene comparisons and 12 passing settlement
comparisons. All three downloaded PNGs are byte-identical to the preceding
certified gate; 272 SDK source hashes and 324 protected artifacts remain unchanged.
Eleven renderer comparisons pass. Carrousel/editor has one differing pixel at
(234,475) in the scaled bottom-image region, with unchanged measured geometry.
Its strict zero-change pixel gate remains flagged. No reference, snapshot,
tolerance or source-review disposition was altered, and this follow-up does not
claim a new release certification. The initial run is also retained: the test
driver moved the reference stage over Fit before clicking it. The corrected
driver clicks Fit first; this was not a product-toolbar failure.

## Regeneration

```sh
node scripts/studio-product/verify.mjs --output fidelity/evidence/output-refinements-20261012
pnpm exec tsc -p apps/studio/tsconfig.app.json --noEmit --pretty false
pnpm --filter @sleinity/template-studio build
pnpm api:contract
pnpm boundaries:check
pnpm editor:verify
pnpm studio:drafts
pnpm sdk:gate:061 -- --run-id sdk-061-output-refinements-20261012a
```

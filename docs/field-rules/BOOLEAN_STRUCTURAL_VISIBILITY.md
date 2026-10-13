# Boolean structural visibility

Field Rules V2 Boolean has one meaning:

```text
true  -> node/subtree participates
false -> node/subtree is structurally excluded
```

The canonical Boolean value materializes to `appearance.visible`. The shared
scene/runtime participation resolver then excludes the controlled node before
Auto Layout settlement. It is not opacity, post-layout hiding, or a V2-specific
render tree.

A Boolean binding may contain additional structural target node IDs. One
canonical value is applied to every target, allowing repeated same-ID exporter
markers to control sibling groups without duplicating content authority. Loose
V1 normalization merges only Boolean markers with matching defaults and unique
targets; ambiguous or conflicting duplicates remain blocked.

Excluded descendants keep their canonical field content but do not participate
in gaps, HUG, FILL, intrinsic measurement, media preload, masks, overlays,
rendering, or active export-safety aggregation. Restoring the ancestor makes the
subtree active with its current values.

Browser and React `getFieldControllers()` projections keep each controlling
Boolean available and omit controls bound below a false target. Hidden controls
retain their canonical values and portable order, and return in place when the
ancestor is enabled. Configuration surfaces continue to expose all fields.

The source-certified subset includes the supplied exporter-0.6.1 fixture's
vertical HUG/FILL chain and fixed horizontal `SPACE_BETWEEN` row. Hiding the
headline participant shrinks its HUG parent and moves/expands the following FILL
participant. Hiding the end-date participant removes its subtree while keeping
the source-fixed row and the remaining logo's start position. Portable coverage
also exercises the existing non-wrapping FIXED/HUG/FILL, padding, gap, and
MIN/CENTER/MAX/STRETCH paths. Existing unsupported layout and appearance
families retain their coherent compatibility boundary.

Renderer asynchronous work is current only when both the repeatable semantic
revision and the monotonic publication generation match. The latter prevents a
delayed first-true result from publishing after true/false/true returns to the
same semantic hash. Browser V2 sessions additionally require exact current
canonical-content and materialization revisions before publishing readiness.

The runtime is source-certified against
`template-package-deal-of-the-week-post-boolean-v0.6.1.zip` at ZIP SHA-256
`47a109f…b6ac`. Validate and Fields default previews, live editor true/false/reset,
resize-hidden-show, and hidden PNG exports passed. Default and reset PNGs are
byte-identical. The surviving 1080×112 header is pixel-identical when the
headline is excluded, and the surviving 300×112 logo region is pixel-identical
when the end date is excluded. No approved reference or comparison tolerance
was changed.

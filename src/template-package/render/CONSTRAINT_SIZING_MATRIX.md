# Editor Constraint and Sizing Matrix

Template package normalized fields are authoritative. Raw values in
`extensions.figma` are retained for diagnostics. Static mode always renders the
exported snapshot bounds and does not apply this matrix.

Placement and sizing are resolved independently. `ABSOLUTE` selects the
placement model; it does not imply `FIXED` dimensions.

Figma's API reports absolute children as `FIXED` even when their constraints
make them stretch with the parent. The package renderer therefore treats raw
Figma `STRETCH` constraints as the source of live absolute resizing:

- horizontal `STRETCH` normalizes to `LEFT_RIGHT`
- vertical `STRETCH` normalizes to `TOP_BOTTOM`

This constraint-driven stretch is expected and does not require normalized
`FILL` sizing.

## Horizontal constraints

| Constraint | Placement | FIXED | HUG | FILL |
| --- | --- | --- | --- | --- |
| `LEFT` | Preserve exported left offset. | Exported/fixed width. | Live content width. | Prefer live stretch using exported left and right offsets. |
| `RIGHT` | Preserve exported right offset. | Exported/fixed width. | Live content width; left moves as width changes. | Prefer live stretch using exported left and right offsets. |
| `LEFT_RIGHT` / raw `STRETCH` | Preserve both exported edge offsets when sizing supports stretch. | Stretch between edges; this is normal Figma absolute-node behavior. | Preserve live content width and exported left offset; warn that both-edge placement conflicts with HUG. | Stretch between edges using live parent width. |
| `CENTER` | Preserve exported center offset and translate the live element by `-50%`. | Fixed width centered on the live anchor. | Live content width centered on the live anchor. | Prefer live stretch; centered placement is superseded by explicit FILL intent. |
| `SCALE` | Preserve snapshot x/width ratios against live parent width. | Scale snapshot x and width proportionally. | Scale snapshot x and width; emit `absolute-scale-hug-ambiguous` because live content width cannot also remain authoritative. | Normalized FILL wins, stretches between exported edge offsets, and emits `scale-fill-constraint-conflict`. |

## Vertical constraints

| Constraint | Placement | FIXED | HUG | FILL |
| --- | --- | --- | --- | --- |
| `TOP` | Preserve exported top offset. | Exported/fixed height. | Live content height. | Prefer live stretch using exported top and bottom offsets. |
| `BOTTOM` | Preserve exported bottom offset. | Exported/fixed height. | Live content height; top moves as height changes. | Prefer live stretch using exported top and bottom offsets. |
| `TOP_BOTTOM` / raw `STRETCH` | Preserve both exported edge offsets when sizing supports stretch. | Stretch between edges; this is normal Figma absolute-node behavior. | Preserve live content height and exported top offset; warn that both-edge placement conflicts with HUG. | Stretch between edges using live parent height. |
| `CENTER` | Preserve exported center offset and translate the live element by `-50%`. | Fixed height centered on the live anchor. | Live content height centered on the live anchor. | Prefer live stretch; centered placement is superseded by explicit FILL intent. |
| `SCALE` | Preserve snapshot y/height ratios against live parent height. | Scale snapshot y and height proportionally. | Scale snapshot y and height; emit `absolute-scale-hug-ambiguous` because live content height cannot also remain authoritative. | Normalized FILL wins, stretches between exported edge offsets, and emits `scale-fill-constraint-conflict`. |

## Parent contexts

- In editor mode every package container provides its snapshot coordinate
  system to direct absolute children. Exported edge offsets are derived from
  that snapshot, while CSS resolves those offsets against the container's live
  size.
- This applies to fixed roots, fixed Auto Layout frames, resized `FILL`
  children, and `layout.mode: NONE` parents.
- A resized `FILL` child of an Auto Layout parent therefore propagates live
  constraint behavior to its absolute descendants regardless of whether its
  own layout is `NONE`, `HORIZONTAL`, or `VERTICAL`.
- A `layout.mode: NONE` parent uses snapshot positioning for its children, but
  live constraints are applied when that parent itself participates as a
  resized `FILL` item.
- Nested absolute overlays inherit constraint context one level at a time.
- Missing or unsupported constraints retain snapshot geometry and use
  containment as the editor-mode safety fallback.
- Static mode bypasses live constraint resolution entirely.

## Contradictory metadata

Normalized package sizing remains authoritative for FLOW items and for
content-driven HUG dimensions:

- `HUG` plus `LEFT_RIGHT` preserves live width, anchors to the exported left
  offset, and emits `hug-stretch-constraint-conflict`.
- `HUG` plus `TOP_BOTTOM` preserves live height, anchors to the exported top
  offset, and emits `hug-stretch-constraint-conflict`.
- `FILL` containers may contain HUG descendants; the container consumes
  available space while descendants retain their own content-driven sizing.
- raw `layoutAlign: STRETCH` plus normalized `HUG` preserves HUG and emits
  `figma-layout-align-hug-conflict`.
- raw `layoutAlign: STRETCH` plus normalized `FIXED` preserves FIXED and emits
  `figma-layout-align-fixed-conflict`.
- raw `layoutGrow > 0` plus normalized `FIXED` preserves FIXED and emits
  `figma-layout-grow-fixed-conflict`.
- raw `layoutGrow > 0` plus normalized `HUG` preserves HUG and emits
  `figma-layout-grow-hug-conflict`.

These warnings do not affect static mode or invalidate the package.

## SCALE behavior

- SCALE uses ratios derived from the child snapshot bounds and the parent
  snapshot size. CSS percentages apply those ratios to the live parent size.
- Horizontal SCALE only affects `x` and `width`; the vertical constraint is
  resolved independently.
- Vertical SCALE only affects `y` and `height`; the horizontal constraint is
  resolved independently.
- SCALE can be combined with CENTER on the opposite axis. The scaled axis uses
  percentages while CENTER preserves its live center anchor and translation.
- SCALE works for absolute children of resized Auto Layout containers and
  resized `layout.mode: NONE` containers. Parent layout controls whether live
  resize context exists; the child's own layout mode does not change SCALE
  math.
- SCALE plus FIXED is the faithful, unambiguous combination.
- SCALE plus HUG keeps proportional snapshot geometry and emits
  `absolute-scale-hug-ambiguous`.
- SCALE plus FILL prioritizes normalized FILL sizing, uses edge stretching, and
  emits `scale-fill-constraint-conflict`.
- Static mode ignores SCALE math and retains exported snapshot bounds.

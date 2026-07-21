# Vertical Text Trim Contract

Status: semantic height implemented in Milestone 5.1; source-grounded glyph origin implemented in Milestone 5.2. Renderer-reference approval remains open.

## Source and canonical authority

The exact exporter property is `TemplateNode.text.leadingTrim`. The now-hiring ZIP carries `"CAP_HEIGHT"` on all four text nodes and repeats the value as provenance under `extensions.figma.leadingTrim`. The strict package schema accepts only `NONE`, `CAP_HEIGHT`, or `null`. Older packages that omit the canonical field may use the preserved raw Figma value with `figma-extension` authority; unknown modes select compatibility routing and are never inferred from characters.

`CanonicalSceneGraphV1.text.leadingTrim` is the semantic/provenance authority. Runtime code maps it explicitly to `none`, `cap-height-to-baseline`, or `unsupported`.

## Geometry boxes

Text telemetry keeps these concepts separate:

| Box | Meaning | Authority |
| --- | --- | --- |
| Layout box | Node box participating in HUG/FILL/Auto Layout | Core settlement when routed |
| Browser line box | Browser inline formatting box including external leading/descent space | Measurement evidence only |
| Figma trimmed box | First-line cap top through final-line baseline | Intrinsic input, then settlement authority |
| Glyph paint bounds | Paint overhang above/below the semantic box | Telemetry; never sizing authority |
| Clipping bounds | Layout box plus whether explicit clipping is active | Canonical clip policy and settled geometry |
| Diagnostic/selection bounds | Ordinary inspection outline | Figma trimmed box for authoritative CAP_HEIGHT text |

Glyph paint is translated to align the first cap top with the semantic box. It is not scaled. Descenders may paint below the box when overflow is visible; trim does not imply clipping.

## Glyph origin and vertical alignment

The browser line-box origin is an explicit measurement coordinate. For an authoritative exact face:

`translationY = -measured first-line cap-top offset`

After translation, `resolved first cap top = 0` and `resolved final baseline = cap height + baseline gaps`. Container spare space, glyph bounds, exported height, and `(container - glyph) / 2` never enter the translation.

The renderer uses a semantic-content wrapper with the trimmed height and an inner browser line-box paint span. HUG `CAP_HEIGHT` bypasses source CENTER/BOTTOM alignment because its content owns the node height and has no spare space. Fixed-height text aligns the semantic wrapper TOP/CENTER/BOTTOM inside the larger fixed node; the inner glyph origin remains unchanged. Normal non-trim text retains the previous vertical-alignment behavior.

Milestone 5.1 applied CENTER/BOTTOM flex layout to the untrimmed line-box span and then translated that span by the cap offset. That mixed two coordinate spaces and displaced paint across the semantic outline. Milestone 5.2 removes that coupling.

## Cap-to-baseline formula

For an eligible exact or approved replacement face:

`trimmed height = cap height + (rendered line count - 1) × resolved line height + vertical chrome`

The browser supplies revision-tagged cap height, font ascent/descent, a calibrated first-line baseline, line count, and glyph paint extents. Canvas text metrics and a controlled DOM baseline marker are used together; no single browser API is treated as sufficient.

## Compatibility and readiness

Canonical trim authority requires a known mode, supported text-box mode, no unsupported mixed-run metrics, an exact or explicitly approved replacement face, and converged metrics. If any routed trim input is absent, the complete routed graph selects a deterministic compatibility boundary until a current authoritative measurement publishes. This prevents a compatibility-owned text height from feeding settled parents or FILL siblings.

Measurements bind the package/scene/font revision already used by `CoreLayoutSettlementV1`. Font activation changes that revision. Earlier fallback or approved-replacement measurements cannot overwrite a newer exact-face revision, and PNG export retains the current stable-settlement gate.

## Evidence

- `pnpm runtime-routing:text-trim` covers identical edits, multiline uppercase content, lowercase/descenders, HUG/FILL/image-slot propagation, reset, exact font identity, and repeatable semantic telemetry.
- The same command now covers actual paint-span cap/baseline coordinates, a centred-layer failure assertion, HUG alignment bypass, and fixed-height CENTER/BOTTOM semantic-wrapper placement.
- `pnpm runtime-routing:fonts` verifies exact source-height agreement and identical trim heights across Validate, Fields, editor, and hidden PNG, plus delayed exact-face activation.
- `pnpm fidelity:compare` retains expected/candidate/diff/structure artifacts. Normal runs never update approved references.

Current source-height evidence for the exact managed faces is 93.125 px for Inter Tight 700 against the ZIP's 93 px and 124.4/76.4 px for Geist Mono 500 against 124/76 px. These subpixel differences are retained as browser/font evidence; no fixed correction is applied.

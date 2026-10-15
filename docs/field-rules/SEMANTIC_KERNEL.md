# Field Rules V2 Core Semantic Kernel

## Ownership

Milestone 2 establishes one framework-neutral authority for deterministic V2
field semantics:

```text
TemplatePackageV2
+ TemplateFieldContentStateV1
+ typed mutation command
→ deterministic validation and normalization
→ immutable sparse content snapshot at a new revision
→ one-way materialization to an ordinary working TemplatePackageV2
```

`mutateTemplateFieldContentV2()` is the reducer. The convenience functions
`setTemplateFieldValueV2()`, `selectTemplateFieldChoiceV2()`,
`setTemplateImageReplacementV2()`, and `resetTemplateFieldValueV2()` only
construct commands for that reducer. They do not form independent mutation
engines.

`materializeTemplateFieldContentV2()` is the single V2 materialization
authority. It validates package/content compatibility, resolves each value from
the imported definition or sparse canonical override, applies deterministic
formatting, and writes only to the exact import-resolved binding in a cloned
package. It never reads renderer-facing values to reconstruct canonical state.

## Deterministic field behavior

| Field | Core canonical behavior in Milestone 2 |
| --- | --- |
| Text | String; rejects all line separators; grapheme-based maximum and warning; suggested/restricted choices. |
| Textarea | Multiline string; grapheme-based maximum and warning; line-rule configuration preserved as revision-bound pending evidence; choices. |
| Number | Finite number; `-0` canonicalizes to `0`; min/max and step anchored at `min` or zero; locale-free bounded formatter; choices. |
| Date | Real Gregorian `YYYY-MM-DD` calendar date; bounded locale- and timezone-free formatter; choices. |
| Color | `#RGB`/`#RRGGBB` input normalized to lowercase opaque `#rrggbb`; exact indexed SOLID RGB write preserving imported alpha/opacity; choices. |
| Image | Canonical replacement asset plus authorized Fill/Fit/Crop state; finite invertible normalized crop matrix; editor Crop uses the established affine image owner and reset retains the complete imported asset and placement. |
| Boolean | Exact boolean; materializes renderer-facing visibility. The shared renderer structurally excludes false nodes/subtrees before settlement under ADR 0078. |

Static option values pass through the same field validator as ordinary values.
Suggested sets permit other valid values; restricted sets do not. Stable option
IDs may be retained as provenance beside the canonical value and never replace
it.

Warnings have `blocksExport: false` and do not reject a mutation. Deterministic
hard-rule failures in the requested value reject without changing revision or
state. Existing semantic content errors (for example after tightening a rule)
do not prevent a corrective mutation; structural/schema errors still do.
Every accepted
set, choice, image replacement, or reset advances the revision, including a
reset when no sparse override exists.

## Render-backed line boundary

Core does not count newline characters as rendered lines and uses no DOM or
browser measurement. A Textarea with `maxLines` or `warningAtLines` returns
pending render validation for the committed content revision. Materialization
also returns pending evidence requirements:

- `maxLines` is blocking for export readiness while pending;
- `warningAtLines` alone remains advisory and does not block export;
- the over-limit value remains committed, visible, and editable;
- Milestone 6 publishes reliable line evidence only for the exact current
  content/materialization/settlement/font identity.

Milestone 6 completes this boundary through the ordinary visible DOM/CSS text
owner. The renderer counts clustered line boxes from the actual painted span;
fixed Textareas do not become intrinsic geometry inputs and no off-screen mirror
or independent wrapping engine is authoritative. Empty content counts as one
rendered line and downstream clipping does not reduce the laid-out count.
`warningAtLines` is inclusive and advisory; `maxLines` is blocking only when
the active current count exceeds it.

## Public host projection

`getOrderedHostEditableFieldsV2()` follows `editableFieldOrder` and omits
import-resolved bindings and source provenance. Its configuration is derived
from the discriminated field definition; there is no second capability matrix.
`controlRole` remains an opaque non-semantic hint for later host control
resolution.

## Browser integration

Milestone 3 consumes these authorities through `createTemplateSessionV2()` and
the lifecycle documented in [BROWSER_SESSION.md](BROWSER_SESSION.md). Browser,
family, persistence, reimport, and React controllers do not add field semantics.
No hidden synchronization exists between the V2 state and the isolated legacy
V1 Studio compatibility session.

# V1 terminology and messaging guide

## Voice

- Use sentence case for headings, labels, buttons, and statuses.
- Name the outcome of an action: **Import template**, **Configure fields**, **Add template**.
- Explain persistent problems inline. Use transient notifications only for completed actions.
- State what happened, the consequence, and the next useful action without blaming the user.
- Keep identifiers, paths, source types, and raw values inside **Technical details**.
- Use one useful sentence for supporting copy. Remove explanations of SDK or
  storage architecture from normal task pages.

## Product terminology

| Concept | Use | Avoid in the main UI |
| --- | --- | --- |
| Saved reusable design | Template | Template package document |
| Related designs within a template | Variants | Template Family in normal Studio UI |
| Imported ZIP file | Template ZIP, package file | Loaded source object |
| Template selection action | Use template | Open package |
| Content editor | Edit content | Post content, editable content |
| Field mapping | Fields | Bindings, target map |
| Editing constraints | Field rules | Common-rule authority |
| Template validation | Template check, Diagnostics | Loaded source diagnostic report |
| Visual rendering condition | Preview status | Render readiness |
| Animated preview | Motion preview | Motion JSON, motion metadata |
| Media preparation | Loading media | Asset ingestion |
| Internal graph/debug data | Technical details | Resolved template graph |

## Severity model

The setup vocabulary is **Ready**, **Needs attention**, **Blocked**, **Not
checked**, **Checking**, and **Stale**. Field scope such as shared across all,
shared across some variants, or variant-specific is informational and must not
use warning language unless the mapping is unresolved or invalid.

### Blocked

The template cannot be added or a required operation cannot complete reliably.
Always include the cause, affected item when known, and a direct recovery action.

### Needs attention

The template can continue, but preview quality, editing, or export may be affected.
Describe the likely consequence and whether continuing is safe.

### Repaired automatically

The app normalized, inferred, recovered, or otherwise repaired package data.
Show this quietly in Diagnostics. It does not require action.

### Information

Useful provenance or developer context with no required action.
Hide it from the default issue list and expose it through the Information filter or Technical details.

## Diagnostic anatomy

Every visible issue contains:

1. A short plain-language title.
2. The affected field, layer, font, or media item when known.
3. A concise explanation of what happened.
4. The user-visible consequence.
5. A suggested action when one exists.

Codes, IDs, paths, origins, layers, and raw payloads remain collapsed under **Technical details**. The copy action is **Copy technical details**.

## Core workflow copy

| Surface | Preferred copy |
| --- | --- |
| Dashboard card | Template name, Use template, Settings |
| Empty dashboard | Add a template to start creating reusable content. |
| Setup navigation | Variants, Fonts, Fields, Field rules, Validate, Review |
| First ZIP action | Choose ZIP |
| Additional ZIP action | Add variant |
| Optional variant selection | Add property, Choose or type a value, Remove property |
| Fonts heading | Fonts |
| Missing-font action | Add missing fonts |
| Font statuses | Missing, Mismatched, Checking, Ready |
| Validate result | Ready, Needs attention, Blocked, Not checked, Checking, Stale |
| Validation workspace | Diagnostics |
| Fields description | Decide which fields share content across variants. |
| Field rules description | Set editor order and input limits. |
| Editor heading | Edit content |
| Editor diagnostics action | Open diagnostics |
| Motion control | Motion preview |
| Final creation action | Add template |
| Existing-settings action | Save changes |

## Typography and action hierarchy

- The setup header contains the page title. Do not repeat it inside the body.
- Use page description, section title, subsection title, control-group title,
  field label, supporting copy, and metadata/technical detail consistently.
- Use one primary action per page region. Use secondary for reversible
  alternatives, quiet for low-priority actions, and destructive only inside a
  confirmed overflow menu.
- Buttons name their result: **Add variant**, **Continue to fonts**, **Check all
  variants**, **Review template**, **Add template**, and **Save changes**.
- A disabled forward action is accompanied by the reason it is unavailable.
- Use the compact preview dock on Fields, Field rules, Validate and Review.
  It sits below the preview pixels, keeps one selected variant across pages and
  opens a searchable list instead of adding horizontal page tabs. Status is
  shown in the dock only where it helps validation or review.
- Each setup page has one sentence of supporting copy: **Add one ZIP for each
  design and define how people choose between them.**, **Verify the exact fonts
  used by every variant.**, **Decide which fields share content across
  variants.**, **Set editor order and input limits.**, **Check every variant
  before saving.**, or **Name and save the template.** Do not add a second
  architectural explainer below it.

## System states

- **Loading:** Preserve the layout and name the active operation, such as *Importing template* or *Checking template*.
- **Empty:** Explain why nothing is shown and give the most relevant next action.
- **Success:** Confirm completion briefly without displacing the next task.
- **Warning:** State the consequence and whether continuing is safe.
- **Error:** Preserve recoverable input and provide a direct retry or repair path.
- **Disabled:** Disable only when required; place the reason next to the action when it is not self-evident.

## Deliberate technical language

The following remain valid inside Technical details and developer tooling: package schema, node ID, source node ID, asset ID, field ID, diagnostic origin, diagnostic layer, renderer feature support, motion data, package contract, and resolved graph data.

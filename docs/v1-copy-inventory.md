# V1 terminology and messaging guide

## Voice

- Use sentence case for headings, labels, buttons, and statuses.
- Name the outcome of an action: **Import template**, **Configure fields**, **Add template**.
- Explain persistent problems inline. Use transient notifications only for completed actions.
- State what happened, the consequence, and the next useful action without blaming the user.
- Keep identifiers, paths, source types, and raw values inside **Technical details**.

## Product terminology

| Concept | Use | Avoid in the main UI |
| --- | --- | --- |
| Saved reusable design | Template | Template package document |
| Imported ZIP file | Template ZIP, package file | Loaded source object |
| Template selection action | Use template | Open package |
| Content editor | Edit content | Post content, editable content |
| Field setup | Fields, Configure fields | Review |
| Template validation | Template check, Diagnostics | Loaded source diagnostic report |
| Visual rendering condition | Preview status | Render readiness |
| Animated preview | Motion preview | Motion JSON, motion metadata |
| Media preparation | Loading media | Asset ingestion |
| Internal graph/debug data | Technical details | Resolved template graph |

## Severity model

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
| Package action | Import template |
| Fonts heading | Fonts |
| Missing-font action | Add missing fonts |
| Font statuses | Missing, Added, Replaced, Ready |
| Validate result | Ready, Ready with warnings, Blocked |
| Validation workspace | Diagnostics |
| Fields heading | Configure fields |
| Editor heading | Edit content |
| Editor diagnostics action | Open diagnostics |
| Motion control | Motion preview |
| Final creation action | Add template |

## System states

- **Loading:** Preserve the layout and name the active operation, such as *Importing template* or *Checking template*.
- **Empty:** Explain why nothing is shown and give the most relevant next action.
- **Success:** Confirm completion briefly without displacing the next task.
- **Warning:** State the consequence and whether continuing is safe.
- **Error:** Preserve recoverable input and provide a direct retry or repair path.
- **Disabled:** Disable only when required; place the reason next to the action when it is not self-evident.

## Deliberate technical language

The following remain valid inside Technical details and developer tooling: package schema, node ID, source node ID, asset ID, field ID, diagnostic origin, diagnostic layer, renderer feature support, motion data, package contract, and resolved graph data.

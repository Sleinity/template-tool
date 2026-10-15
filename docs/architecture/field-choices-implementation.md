# Complete Choices — 2026-10-10

This implements the approved Complete Choices plan. The earlier
[audit](field-choices-audit.md) is retained as historical evidence; its pause
recommendation is superseded. The starting SDK gate is
`sdk-061-media-underlay-20261010a`.

## Contract and ownership

Core remains the authority for canonical values, portable identities, choice
validation, ordinary field rules and selection reconciliation. Browser sessions
remain the authority for mutation acceptance, persistence, materialization and
readiness. No SDK production implementation, schema, supported API, renderer,
resource lifecycle or persisted format changes in this milestone.

`choiceAuthoring.ts` is private Studio state. Its rows have stable local keys,
portable option identities, optional labels and raw typed input. Number, Date and
Color can be incomplete without entering canonical configuration. It delegates
canonicalization and validation to supported Core operations, and uses the existing
Family configuration resolver for sparse overrides and explicit clears.

Both importer Fields and the saved field workspace supply complete imported
definitions and design context. Common Family editing considers every design
inheriting choices, in source order, without treating the first design's immutable
default as everyone's default. Existing explicit lists and null clears remain
atomic and independent. Constraints conflicting with defaults produce named
design errors; neither constraints nor source defaults are silently repaired.

## Configuration and editing flow

1. Choose No choices, Suggested values, or Options only. Enabling choices seeds
   actual defaults; enabling restrictions adds missing canonical defaults while
   preserving existing rows and IDs. SDK canonicalization prevents short-hex and
   case-equivalent Color duplicates.
2. Edit optional labels and typed values. Textarea is multiline; Number retains
   incomplete decimal input; Date uses a calendar; Color has hex and picker controls.
   Reorder/remove controls are keyboard accessible. Removing the last option keeps
   an invalid draft until another option is added or No choices is chosen explicitly.
3. Apply/Discard retain existing transactions. Row errors identify value and ID
   problems separately; IDs are generated and placed behind Advanced. Changing an
   ID disconnects existing selection provenance. Choice errors open the relevant
   disclosures and invalid form submission focuses the offending control.
4. Family choices show Inherited, Overridden or Disabled for this design. Use shared
   value removes the override; disabling writes the existing null clear.
5. Suggested values retain typed input with optional presets. Options only uses
   the dropdown. Number/Date display uses SDK formatting; Color includes a swatch
   and hex. Matching literals/defaults display without creating selection identity.
   Unlisted restricted content remains visible and blocked, never silently reset.
6. Selecting a preset replaces only that field's pending draft, even when invalid,
   waits behind an active commit, and uses the latest native controller. Coordinator
   generation checks plus mount/session/variant guards reject abandoned callbacks.
   IME boundaries, text limits, autosave, recovery and export gating remain intact.
   Choice fields offer the existing native Reset operation in the output editor.

Option value edits follow stable selected identities. Label edits and reorder do
not change them. Removal retains content and removes selection provenance; a
restricted value can then require correction. Existing modes, values, labels,
identities, ordering, explicit clears and saved selections need no migration.
Invalid older configurations receive correction errors instead of being rewritten.
Image and Boolean choices are unsupported by this SDK model; Family selectors
remain separate.

## Workflow matrix

The test-authored configurations use isolated copies of hash-verified exports;
they are not additional source certifications. Every cell includes both Suggested
values and Options only.

| Type | Private draft / rule validation | Public single workflow | Public three-export Family | Studio single and three-export Family |
| --- | --- | --- | --- | --- |
| Text | Canonical duplicate, ID and single-line checks | Configure/select/edit/reorder/remove/Reset/save/reload | Shared defaults, sparse fields, selection/Reset/save/reload | Configure/Apply/save/reopen/select/Reset/PNG |
| Textarea | Multiline values and ordinary rules | Same lifecycle | Same lifecycle | Same lifecycle; existing rendered-line guard preserved |
| Number | Incomplete input, bounds and step | Same lifecycle | Same lifecycle | Same lifecycle; invalid local input recovered by selecting a preset |
| Date | Incomplete/invalid calendar dates | Same lifecycle | Same lifecycle | Same lifecycle with calendar configuration |
| Color | Incomplete hex and canonical equivalence | Same lifecycle; ZIP numeric paint equality on initial/Reset | Same lifecycle | Same lifecycle with swatch/hex output |

## Verification and reproductions

The durable [verification record](evidence/field-choices-completion-20261010.json)
contains implementation identities, per-type results, environment, command results
and regenerated packet locations. Retained pre-change sources and hashes live in
[the baseline identity](evidence/choices-baseline/identity.json).

```sh
node scripts/repository/audit-field-choices-native.mjs
node scripts/repository/audit-field-choices-browser.mjs --historical
node scripts/repository/verify-field-choices.mjs
node scripts/repository/verify-field-choices-browser.mjs
node scripts/repository/verify-field-choices-release.mjs --final
pnpm test:portable
pnpm --filter @sleinity/template-studio build
pnpm sdk:verify
pnpm docs:verify
```

The historical browser command uses only three hash-verified retained sources,
does not modify current source files or user storage, and reproduces the original
generic-default and invalid-draft failures. SDK authorities are unchanged.

The initial implementation accidentally omitted the existing Textarea visual-line
preflight. Draft and Family-parity regressions caught it; the guard was restored,
and both checks and the final regression suite passed. These initial failures are
retained rather than reported as successful runs.

An initial exact-export Family probe used single-source font controls and uploaded
no Family fonts. Review then reported missing fonts and a repeated-update warning.
The corrected harness uploads each verified binary through the shared Family
control, waits for exact linkage and checks native readiness. The unconfigured
three-export Family passes with those prerequisites. This is a harness disposition,
not a certified fallback-font workflow or a renderer repair. Supplemental repeated
Carrousel Family scenarios are labelled synthetic separately.

The final source-authoritative gate is `sdk-061-choices-20261010c`: 24 complete,
stable captures; 12 renderer, three scene and 12 settlement comparisons. Its source
reviews may be retained only after exact input/environment identities, all 272
unchanged SDK implementation hashes, protected API/reference hashes and byte-identical
reviewed PNGs pass. No reference promotion or tolerance adjustment occurs.

Current browser workflows are automated Chromium checks. Stored screenshots are
reviewed separately; no manual interaction with the user's browser or storage is
claimed. Existing StrictMode, recovery, navigation, save-failure/retry, field rules,
font activation, Family parity and workflow acceptance retain their own test evidence.

## Boundaries

Static choices do not add remote options, multi-select, Image/Boolean lists or
conditional option dependencies. Textarea still needs current line evidence for
bounded rendered-line input and export. Final SDK fidelity certification remains
the three-export gate; configured synthetic choices verify integration rather than
creating new approved visual references.

# Field Rules V2 Fixture and Evidence Plan

Milestone 1 uses repository-contained contract fixtures. These validate source
normalization and schemas; they do not authorize renderer support or pixel
reference changes.

## Contract fixtures

| Fixture family | Required scenarios |
| --- | --- |
| V1 normalization | Descriptor and marker input, optional labels, seven field types, preserved legacy provenance, invalid/unsupported legacy rules |
| Color target | Exact indexed SOLID descriptor, marker with one eligible SOLID, zero/multiple eligible SOLIDs, malformed index, opaque normalization, alpha rejection |
| Static choices | Stable option ID, reorder, label/value change, duplicate ID, duplicate normalized value, suggested/restricted modes |
| Field order | Exact permutation, duplicate/unknown/omitted IDs, first-import discovery order, reimport removed/new fields |
| Image policy | Omitted/all modes, Fill-only, Fit-only, Crop-only, invalid/duplicate modes, unauthorized default, preserved-imported-crop rejection |
| Family overrides | Omitted inheritance, scalar replacement, atomic choices replacement, atomic placement replacement, explicit-null clear, atomic field-order replacement |
| Canonical values | Opaque Color, finite Number, real calendar Date, imported Image identity, Boolean, Text newline rejection, Textarea multiline acceptance |

## Later behavioral fixtures

Milestone 2 adds deterministic Core edit/reset/materialization coverage. Later
milestones add browser/session/resize/persistence/export evidence that turns
renderer-dependent contracts into capabilities:

- typed default/edit/reset parity for all seven fields;
- Number and Date formatting without renderer readback;
- structural Boolean removal across vertical/horizontal Auto Layout, nested
  groups, spacing, HUG, FILL, descendants, reload, resize, and export;
- Fill/Fit/Crop replacement from Studio and host-produced identical crop state;
- Textarea hard wrapping, explicit newlines, font activation, width/ancestor
  changes, rapid edits, stale evidence, pending export, warning thresholds, and
  over-limit correction;
- Studio and an external host using the same controllers, `controlRole`
  fallback, choices, portable order, persistence, and export.

Every renderer capability still requires an exact source fixture, edit test,
resize test, export test, documented fallback, and guarded reference policy.

Milestone 4 runtime and portable structural tests are implemented. The exact
current-exporter fixture
`${TEMPLATE_PACKAGE_FIXTURE_DIR}/Exporter update testing/template-package-deal-of-the-week-post-boolean-v0.6.1.zip`
source-certifies its two authentic Boolean bindings: headline removal through a
vertical HUG/FILL chain and end-date removal from a fixed horizontal
`SPACE_BETWEEN` row. The focused browser gate covers default Validate/Fields,
live true/false/reset, resize-hidden-show, and real PNG export. Broader portable
nested, gap, FILL, alignment, Family, persistence, and ABA cases remain automated
coverage rather than claims that the source ZIP contains those layouts.

# TemplatePackageV2 Producer and Consumer Migration Map

> Historical milestone migration map. Its present/future-tense rollout descriptions record the original cutover, not current host support. Use [current SDK guidance](../sdk/README.md) and [SDK 2.0 migration](../sdk/SDK_2_0_MIGRATION.md); V1 editing workflows are retired.

## Boundary

Milestone 7 current state: Studio defaults to V2 authoring, Browser V2 sessions,
V2/V3 persistence and the public React renderer bridge. The inventory below
records the original cutover plan; its former Studio-pending entries are now
implemented. The old UI/record reader remains explicitly isolated under
`?studio-mode=legacy`, never synchronized with V2. See the
[current authoring/migration guide](STUDIO_AND_HOSTS.md).

The target pipeline is:

```text
raw exporter ZIP / persisted V1 source
→ loose source validation and provenance-preserving normalization
→ parseTemplatePackageV2
→ strict TemplatePackageV2 validation
→ canonical content state
→ one-way materialization
→ scene/resolved/render/export consumers
```

There is no V1 interpreter inside the target V2 session. Milestone 3 provides
that canonical path through `createTemplateSessionV2()`. The existing installed
V1 Studio session remains an isolated compatibility entry until Studio adopts
the V2 host controllers; it is neither synchronized with V2 nor accepted as a
source of reconstructed canonical values.

## Producer inventory

| Producer | Current evidence | V2 action / owner |
| --- | --- | --- |
| Figma exporter ZIP | Emits V1 descriptors and/or `field:type:id` markers | Continue as source input; exporter may later emit exact V2 bindings. Source normalization owns compatibility. |
| Bundle normalizer | Repairs bounded exporter variance before V1 validation | Retain loose source role; invoke the explicit V2 boundary after source normalization during the Milestone 3 production cutover. |
| `parseTemplatePackageV2` | Current schema 2.2 boundary | Validate canonical 2.2 or validate exporter 1.0 and normalize once; canonical 2.0/2.1 requires reimport. |
| Studio field setup | Writes generic V1 constraints today | Milestone 7 writes discriminated V2 configuration and exact setup-resolved bindings/order. |
| Template Family materializer | Produces V1 working packages today | Milestone 3 adopts V2 family/config/content contracts and atomic collection overrides. |
| Persistence/reimport | Persists materialized V1 working packages today | Milestone 3 persists V2 base/config plus canonical content state; reimport uses portable order repair. |

## Consumer inventory

| Consumer | Current authority | Required cutover |
| --- | --- | --- |
| Core schema/semantic validation | Strict V1 plus generic field semantics | The additive V2 schema and Milestone 2 semantic kernel are complete; production callers adopt them during the coherent Milestone 3 cutover. |
| Field mutation/default/reset | Direct V1 node-property mutation/readback | Milestone 2 provides typed commands, canonical state, and one-way materialization; Milestone 3 replaces the production session path with them. |
| Canonical scene/resolved tree | Reads V1 fields and materialized working nodes | Consume the V2 materialized package after the production cutover; do not interpret V1 rules. |
| Browser session/import pipeline | V2 session normalizes V1/native V2 once and publishes base/content/materialization identities; legacy Studio entry remains isolated | Adopt `createTemplateSessionV2`; do not synchronize with the legacy session. |
| Browser persistence | Explicit V2 record stores configured package, canonical content, and assets | Rematerialize on load; V1 records require their legacy reader or reimport. |
| Template Families | `TemplateFieldFamilyV2` resolves common config and atomic sparse overrides | Selected variants use the ordinary Core materializer and one shared family content state. |
| React renderer/editor | V2 provider/hooks expose ordered typed controllers; existing renderer consumes a one-way compatibility projection | External hosts compose controls without binding or renderer-internal APIs. |
| Studio | Edits V1 rules and package properties | Become a reference V2 SDK consumer in Milestone 7. |
| Fidelity/scene/settlement harnesses | Hash-gated V1 ZIP imports | Keep source bytes exact; normalize before canonical capture after runtime cutover. Never update references for a schema-only difference. |

## Source normalization policy

- Schema 2.2 canonical field IDs are `<type>:<name>`. The prefix must match the
  discriminator, while choice IDs retain their existing portable form. This
  lets `boolean:cta` and `text:cta` coexist without changing their labels.
- Descriptor order is authoritative for initial editor order; marker-discovered
  fields append in deterministic node insertion order. Repeated Boolean fields
  with the same type and name merge into one ordered multi-target structural
  binding when defaults and targets are compatible. Repeated non-Boolean fields
  and conflicting Boolean definitions remain blocking source errors.
- Loose exporter 1.0 input qualifies package fields, content keys, orders,
  Family overrides, editor-control references and variant image placements at
  the source boundary. Previous `<id>Visibility` repairs can recover the
  original source name from provenance. New packages and content snapshots
  write 2.2.
- Canonical 2.0 and 2.1 packages and saved envelopes are not migrated. Studio
  lists saved work that uses those contracts as `Reimport required`; it cannot
  be opened or edited, but remains safely deletable.
- Every Image field has one required `replacementPlacement`: Fill, Fit, or
  Crop. Exporter `cover`, `contain`, and `user-crop` rules normalize to those
  policies, and an absent exporter rule normalizes to Fill. Imported Figma
  placement remains separate and is restored by Reset.
- A Crop-policy upload without canonical crop data uses Fill as its deterministic
  host fallback. Fit is invalid for that policy. Family variants may inherit or
  override the required policy but cannot clear it.
- Reimport retains surviving configured IDs, removes missing IDs, then appends
  new IDs in deterministic discovery order.
- Exact `appearance.fills.N.color` descriptors are retained only when `N` is a
  current SOLID fill.
- Generic/marker Color targets normalize only when their node type supports an
  exact fill-color binding, exactly one eligible SOLID fill exists, and the node
  is not a source-certified mask input. ZIP normalization freezes an eligible
  generic descriptor to `appearance.fills.N.color` before strict V1 validation;
  raw exporter JSON and the original/resolved binding paths remain in source
  evidence.
- Exporter Number defaults containing one unambiguous finite dot-decimal token
  normalize to a numeric canonical default. Surrounding text and decimal
  precision seed `number-display-v1` prefix, suffix, and precision when the
  exporter did not provide those format properties. Raw source text remains
  preserved in source evidence.
- Exporter Date defaults containing one unambiguous numeric calendar date
  normalize to canonical `YYYY-MM-DD`. Supported source orders are year-first,
  day-first and month-first with slash, hyphen or dot separators. Prefixes,
  suffixes, separator and whether the year was displayed seed `date-display-v1`;
  explicit exporter format properties take precedence. A yearless source uses
  only the recorded package export year and remains blocked when that evidence
  is unavailable.
- Empty, non-finite, localized/grouped, or multiple-number display strings do
  not normalize without explicit unambiguous source semantics; strict field
  validation continues to reject them.
- Ambiguous numeric Date order remains blocked unless an explicit exporter
  format identifies day-first or month-first order. Invalid dates and multiple
  date tokens are never coerced.
- Ambiguous or unsupported targets block V2 publication and retain source
  evidence in diagnostics/setup state.
- Unsupported V1 constraints remain in field provenance and do not become V2
  runtime semantics.
- `preserve-original-crop` blocks automatic conversion because V2 replacement
  never reuses imported crop state.

## Cutover gate

Milestone 3 may switch production import/session/render entry points only when:

1. typed Core mutations and canonical content state cover all seven fields;
2. materialization is one-way and defaults/edits share it;
3. no production code reads V1 generic rules after normalization;
4. V2 packages pass source, schema, session, persistence, scene, renderer, and
   export regression checks;
5. exact fixture bytes and approved references remain guarded.

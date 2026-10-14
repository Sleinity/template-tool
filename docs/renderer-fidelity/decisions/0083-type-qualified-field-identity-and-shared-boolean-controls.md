# ADR 0083: Field identity is type-qualified and repeated Booleans share one control

- Status: Accepted
- Date: 2026-09-14

## Context

Exporter field markers use `field:<type>:<name>`, but TemplatePackage 2.0 kept
only `<name>` as canonical identity. A Boolean container and a nested content
field could therefore collide even though they have different value semantics.
The temporary `<name>Visibility` repair avoided the collision but made identity
depend on nesting and could not express one Boolean controlling several groups.

## Decision

TemplatePackage schema 2.1 uses `<type>:<name>` for every canonical field ID.
The prefix must match the field discriminator. `parseTemplatePackageV2` accepts
1.0, 2.0, and 2.1 input and returns 2.1. Persistence readers migrate packages,
content keys, orders, Family overrides, editor controls, and image placements
before current validation. Provenance from the temporary Visibility repair is
used to recover the original source name.

Loose source normalization groups fields by type and source name. Different
types may share a name. Compatible repeated Booleans become one structural
visibility binding with ordered targets; conflicting defaults, repeated target
nodes, incompatible bindings, and repeated non-Boolean fields remain blocked.
Raw ZIP evidence remains unchanged and normalization emits field-ID and Boolean
merge diagnostics.

Active content-controller projection keeps the shared Boolean and omits controls
bound beneath any false target. Hidden canonical values and configuration remain
unchanged and return in their original order when the Boolean is enabled.

## Consequences

- `boolean:cta` and `text:cta` are distinct stable public IDs.
- `field:boolean:cta` maps to `boolean:cta` without duplicating the type prefix.
- Choice-option IDs retain their existing portable format.
- Schema 2.0 remains readable but new packages and content snapshots write 2.1.
- This supersedes ADR 0082's `<name>Visibility` rename. Its multi-target binding
  and structural-participation decisions remain in force.
- Renderer ownership, Auto Layout behavior, and golden references do not change.

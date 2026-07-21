# ADR 0002: Normalize before strict validation

## Status

Accepted

## Context

Exporter variants must not weaken the canonical schema.

## Evidence

`sourceContract.ts` accepts the loose source; `normalizeTemplatePackageBundle.ts` produces canonical-shaped data; `parseTemplatePackage.ts` and `validateTemplatePackage.ts` enforce the strict schema.

## Decision

Normalize raw exporter data at the source boundary, preserve provenance, then apply strict `TemplatePackageV1` validation.

## Alternatives

Weakening the schema or scattering compatibility across runtime code is rejected.

## Consequences

New exporter variance belongs in bounded normalization with diagnostics and tests.

## Compatibility impact

Canonical consumers stay strict; existing raw Figma runtime helpers remain documented debt.

## Migration impact

Later milestones should promote required extension values into canonical fields before retiring helpers.

## Verification

Source-contract, normalization, schema, lifecycle, and diagnostic ZIP tests.

## Reversal strategy

Retain raw input and version normalization; revert a faulty adapter without changing the canonical schema.

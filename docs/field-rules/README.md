# Field Rules V2

Field Rules V2 is the typed editable-content contract introduced by
[ADR 0075](../renderer-fidelity/decisions/0075-template-package-v2-field-semantics-and-canonical-content-authority.md).

Milestone 7 connects the default Studio authoring workflow and an independent
custom host to the same V2 configuration, typed controllers and renderer bridge.
The source-certified/runtime-only boundaries of earlier milestones remain
unchanged; legacy saved work is explicitly isolated, not silently converted.

- [Producer and consumer migration map](TEMPLATE_PACKAGE_V2_MIGRATION.md)
- [Fixture and evidence plan](FIXTURE_PLAN.md)
- [Core semantic kernel and materialization](SEMANTIC_KERNEL.md)
- [Browser session, persistence, reimport, and React integration](BROWSER_SESSION.md)
- [Boolean structural visibility](BOOLEAN_STRUCTURAL_VISIBILITY.md)
- [Studio authoring and external hosts](STUDIO_AND_HOSTS.md)
- [Milestone 7 implementation and verification report](MILESTONE_7_REPORT.md)

The strict schemas are
`packages/template-core/src/schema/template-package-v2.schema.json` and
`packages/template-core/src/schema/template-field-content-v1.schema.json`. The
framework-neutral source-boundary API is `parseTemplatePackageV2`; it accepts a
strict V2 document or validates and normalizes a V1 source document once.

Milestone 1 froze the contract without changing renderer pixels. Milestone 2
implemented the DOM-free Core semantic kernel, canonical content reducer, and
one-way materializer. Milestone 3 adds the canonical Browser V2 session,
versioned persistence, review-first reimport, Template Field Families, and
React host controllers. Milestone 4 implements shared structural participation
and generation-safe Boolean reflow and is source-certified for the exact subset
recorded in the Boolean capability document. SDK 2.0.0 and Studio now expose V2
host workflows only. Source schema 1.0 normalization remains; V1 editing and
persistence workflows are retired. Start at [current host guidance](../sdk/README.md).

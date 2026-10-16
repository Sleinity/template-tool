# SDK 2.0.0 release notes

<!-- delivery-context:start -->
Core, Browser and React form one 2.0.0 fixed train. Verify the delivery's archive
identity and provenance; packing and certification are separate from publication.
<!-- delivery-context:end -->

The published 1.0.0 artifacts remain unchanged. Tagging and publication require
separate approval; release notes do not authorize them.

## Breaking changes from 1.0.0

- Retire V1 editing, single/Family sessions, wizard/confirmation and persistence
  workflows, including the React importer entry and its styles.
- Admit exporter **0.6.1** ZIPs only, with raw source schema **1.0**, before
  persistence or font linking. Missing/other exporter versions are blocked.
- Keep native V2 host APIs and canonical schema **2.2**. Current V2 records and
  recovery remain supported; no historical record deletion or V1 migration is
  performed. See [migration](SDK_2_0_MIGRATION.md).

## Runtime improvements

Reuse immutable validation authority, remove duplicate primitive interpretation
and collect persistence assets without copying unrelated scene graphs. Family
media completions publish readiness from current accepted materialization rather
than deriving semantic content again. These optimizations introduce no public
API or schema changes. Retained profiling evidence documents its workload and
instrumentation limitations; no general speedup guarantee is implied.

## Host delivery

The [current documentation](README.md) includes implementation recipes, a feature
catalogue, operational guidance and a Studio reuse catalogue. The complete
React/TypeScript starter demonstrates single and real Family workflows, staged
exact fonts, typed controls, Choices, image placement, Reset, saved templates,
template-scoped recovery and guarded PNG. Its 650 ms autosave is host policy.

The starter uses supported public SDK entries and injected adapters; lifecycle
composition stays private example code. Vendored installation requires no
registry credentials. Private certification ZIPs and licensed font binaries are
not bundled. Studio redesign and extraction of styled SDK components follow the
release and are not promises of future public APIs.

# ADR 0097: V2-only hosts and exporter 0.6.1 admission

## Status

Accepted for the unpublished 1.0.0 candidate. Publication, tagging and reference promotion are separate and unauthorized here.

## Context

The completed SDK audit identified duplicate validation, primitive interpretation and asset-collection scene copying. The supported corpus is Now Hiring (11 nodes), Cover (28) and Carrousel (26), exported by plugin 0.6.1. Larger padded packages are scaling probes, not representative latency evidence. There are no V1 hosts or Studio templates to migrate.

## Decision

Supported SDK and Studio host workflows are V2 only. Retire V1 session/Family editing, wizard/confirmation and persistence entries, React importer/styles and example selection routes. Keep source-schema 1.0 normalization, strict canonical schema 2.2, the private V1-shaped renderer bridge, exact-font contracts and read-only versioned evidence. A name ending in V1 is not a removal criterion.

The production source reader checks raw `template.json` exactly once and requires `schemaVersion === "1.0"` and `source.pluginVersion === "0.6.1"`. Other/missing/malformed versions produce `SOURCE_EXPORTER_VERSION_UNSUPPORTED`, retain available raw evidence, and block before persistent assets, font linking or candidate acceptance. Initial/replacement/reimport/Family ZIP paths share this authority. Historical readers and V1 fidelity consumers are test-only; they cannot enter supported entries or production bundles.

Existing current V2 records, fonts, assets and recovery tokens retain their contracts. Unknown/V1 stored records remain untouched outside the supported catalogue. Incompatible canonical V2 records retain their separate reimport-required handling. No V1 migration machinery is added.

Within an accepted synchronous single edit, use the frozen base directly without replacement assets, or one immutable operation-local merged shell for mutation validation and materialization. Reset that removes an asset builds its input from the new dictionary. Retain Core's deep-immutability proof, mutable validation and diagnostic isolation. Family materialization supplies the existing package-content validity result without a duplicate outer call. No effective-Family cache or async replacement change is introduced.

Tree construction collects primitive source revisions from its already-computed results in original source-node order. Both construction and the unchanged standalone stale-tree checker share the existing fingerprint assembly. No visual owner, mask option, revision input, ordering or defensive React check changes.

Native in-memory/IndexedDB saves and Studio recovery pass assets-only carriers to the existing collector. Records are reconstructed from independently owned validated data and returned asset maps. No asset-only object is cast to a canonical package. FIFO writes, capture timing, URL pins, garbage collection, token checks and failures retain their existing authorities.

## Non-goals and invariants

No global/cross-save cache, hash-prefix cache, structural sharing, renderer projection redesign, generated validator, lazy rasterizer, readiness batching, second Studio input batcher or backend is authorized. Imported values/provenance, Field Rules V2, Choices, Family selection, crop/reset, deterministic revisions, stale rejection and PNG raster readiness remain intact. ADRs 0010 and 0012 remain Proposed. No references, snapshots, tolerances or fixture/font bytes may be promoted by this work.

## Evidence and acceptance

See [the implementation and evidence report](../../architecture/sdk-v2-optimization.md). Each bounded optimization has retained source checkpoints, separate work counters, five alternating native paired trials, differential outputs and independent regression evidence. Instrumented profiles and memory observations are separate from timing acceptance. Browser automation is identified separately from native tests; no manual source review or publication certification is claimed.

Any repeatable tail regression, output/resource difference, weakened validation, new cache requirement or renderer-contract change blocks acceptance. Remaining hashing/projection, payload-read, bundle/startup, media completion and export-preparation proposals require their own contracts and paired evidence.

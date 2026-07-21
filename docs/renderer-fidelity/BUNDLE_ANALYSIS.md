# Renderer Bundle Analysis

Milestone 4 increased the verified minified main chunk by 45,433 bytes. The current runtime-routing and canonical-scene source set totals approximately 128,555 source bytes; the largest contributors are the canonical transformer and source mapping/authority tables.

The renderer imports `createCanonicalSceneGraph`, so the transformer and its direct mappings are production dependencies. Tree shaking removes unused exports but cannot remove code called by that transformer. The Milestone 5 appearance contracts, fixture probes, browser harnesses, and font binaries have no production renderer import and must remain absent from `dist`.

This is attribution evidence, not an optimization authorization. No runtime refactor or strict bundle budget is introduced here. Future reduction must retain canonical provenance and must pass scene, settlement, fidelity, and routing gates.

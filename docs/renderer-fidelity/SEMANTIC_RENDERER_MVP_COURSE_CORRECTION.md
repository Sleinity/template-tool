# Semantic Renderer MVP Course Correction

Status: active product direction  
Adopted: 2026-07-21  
Decision: [ADR 0071](decisions/0071-semantic-first-product-path-supersedes-rollout-governance.md)

## Outcome

The MVP has one automatic renderer experience. `ResolvedBackendDecisionV1` selects each certified semantic owner and its coherent capability-level compatibility fallback. Legacy, Semantic, and Compare are no longer product modes. Historical rollout and cohort evidence remains useful, but its metadata is inert and cannot influence rendering.

This is an authority transfer, not another renderer rewrite. Stable DOM/CSS and SVG family owners remain unchanged. Unsupported feature families remain preserved, classified, and routed through explicit compatibility boundaries.

## Product path

```text
ZIP
→ loose source contract
→ provenance-preserving normalization
→ strict TemplatePackageV1
→ persisted basePackage / workingPackage
→ CanonicalSceneGraphV1
→ ResolvedRenderTreeV1
→ ResolvedBackendDecisionV1 per node/subtree
→ capability-selected semantic owner or coherent compatibility owner
→ surface-local revision-current settlement
→ Validate / Fields / editor / previews / PNG
```

`ResolvedProductRenderIdentityV1` is a non-selecting projection of package, canonical, resolved, backend-decision, settlement, font, asset, placement, readiness, and export-safety revisions. It lets surfaces prove identity without reintroducing a rollout choice. ADR 0010 remains Proposed: the MVP does not require one globally shared post-measurement instance, only content-addressed agreement between independently created surface instances.

## Validate as the fidelity workbench

Validate extends the existing quality report with `rendering-health-projection-v1`. It reports readiness, semantic families, compatibility and preserved-only regions, unsupported capabilities, source-reference availability, and the current product-render identity.

Material findings include one root-cause identity, origin boundary, capability, support level, backend owner, fallback, confidence, affected surfaces, product impact, repairability, and one bounded action. Findings are grouped by root cause and capability. Region selection uses template-space bounds. Raw IDs, revisions, hashes, and backend details remain behind technical disclosure.

The product does not perform a hidden visual comparison. A source reference is reported only as available or missing, with comparison status `not-run-in-product`. Candidate generation, pixel/geometry comparison, and guarded reference promotion remain fidelity-harness responsibilities.

## Local fidelity issue packets

A selected finding can export `fidelity-issue-packet-v1` locally. Its stable packet ID hashes normalized evidence and the operator description. Volatile timestamps, object URLs, and remote URLs do not participate. Stable paths contain the manifest, issue, bounded source/canonical/resolved/backend evidence, product identity, environment, and a handoff. Raw ZIP bytes and asset bytes are excluded. Pixel evidence is opt-in.

Packet generation is read-only with respect to package, draft, references, and validator state. There is no upload or remote telemetry.

## Obsolete rollout metadata

The keys `renderer-rollout-preference` and `renderer-rollout-cohort` are obsolete. Startup records an idempotent `semantic-renderer-mvp-migration-v1` marker and does not inspect, migrate, or delete the obsolete records. Old, missing, corrupt, and future records therefore cannot affect renderer output.

## MVP acceptance

- one visible product renderer and no hidden product comparison renderer;
- automatic semantic owners with coherent capability fallback;
- identical backend and template-space geometry identities across Validate, Fields, editor, previews, persistence/offline restoration, and PNG;
- useful, deduplicated Validate findings for every material fallback;
- deterministic privacy-bounded issue packets;
- no renderer-time Figma request;
- approved renderer, scene, and settlement references remain guarded and separately reviewed.

No mixed-paint, additional gradient, effect, compositing, node-opacity, advanced-mask, design-system, Canvas/WebGL, or global-settled-graph capability is authorized by this course correction.

# Renderer Fidelity Programme

Repository and reusable SDK packaging are documented in
[`../sdk/README.md`](../sdk/README.md). The SDK extraction does not change
renderer authority or authorize reference updates.

This directory is the durable operating context for the contract-renderer programme. Current repository evidence is authoritative for statements about implemented behavior. The programme charter and roadmap remain authoritative for direction, invariants, milestone order, and acceptance discipline.

## Start here

| Document | Purpose |
| --- | --- |
| [Charter](CHARTER.md) | Target contract, invariants, evidence standard, and support taxonomy |
| [Architecture](ARCHITECTURE.md) | Architectural principles and authority model |
| [Delivery plan](DELIVERY_PLAN.md) | Milestone sequence, gates, and rollout rules |
| [Semantic Renderer MVP course correction](SEMANTIC_RENDERER_MVP_COURSE_CORRECTION.md) | Active single product path, validator workbench, issue packets, and MVP gate |
| [Rollout modes](ROLLOUT_MODES.md) | Historical Phase 13 Legacy/Semantic/Compare evidence; superseded for product behavior |
| [Semantic rollout policy](SEMANTIC_ROLLOUT_POLICY.md) | Historical Stage 1 cohort evidence; superseded for product behavior |
| [Status](STATUS.md) | Current baseline, gaps, flags, and next approved milestone |
| [Capabilities](CAPABILITIES.md) | Initial capability registry and support classifications |
| [Fixtures](FIXTURES.md) | Fixture identities, coverage, scenarios, and verification state |
| [Handoff](HANDOFF.md) | Current milestone evidence and exact continuation point |
| [Harness](HARNESS.md) | Commands, capture lifecycle, schemas, filters, and evidence outputs |
| [Reference policy](REFERENCE_POLICY.md) | Source/candidate/approved separation and guarded updates |
| [Environment policy](ENVIRONMENT_POLICY.md) | Reproducibility metadata and cross-environment rules |
| [Failure artifacts](FAILURE_ARTIFACTS.md) | Retention layout and required failure evidence |
| [Canonical scene graph](SCENE_GRAPH.md) | Versioned semantic contract, authority, validation, and exclusions |
| [Scene evidence tooling](SCENE_GRAPH_HARNESS.md) | Fixture snapshots, equivalence, inspection, updates, and performance |
| [Settlement contract](SETTLEMENT.md) | Measurement, dependency, invalidation, stale work, convergence, and readiness |
| [Settlement evidence tooling](SETTLEMENT_HARNESS.md) | Observation, scenarios, snapshots, update guards, and commands |
| [Core layout and text runtime routing](RUNTIME_ROUTING.md) | Milestone 4 property ownership, capability routing, intrinsic measurement, fallback, and export readiness |
| [Core surface convergence](SURFACE_CONVERGENCE.md) | Milestone 5 live-surface geometry ownership and circular fallback |
| [Exact font evidence](FONT_EVIDENCE.md) | Hash-gated required identities and browser activation evidence |
| [Font identity and linking](FONT_IDENTITY.md) | Request/face separation, OpenType matching, private runtime identity, persistence, and source-authoritative capture |
| [Vertical text trim](VERTICAL_TEXT_TRIM.md) | CAP_HEIGHT source authority, font metrics, semantic boxes, fallback, and evidence |
| [Appearance contracts](APPEARANCE_CONTRACTS.md) | Versioned appearance projections and backend matrix |
| [Appearance fixture audit](APPEARANCE_FIXTURES.md) | Real-ZIP evidence, source-level probes, and acquisition backlog |
| [Image placement authority](IMAGE_PLACEMENT.md) | Source fit/crop authority, coordinate spaces, geometry, sampling, compatibility, and telemetry |
| [Authoritative CROP fixture intake](CROP_FIXTURE_INTAKE.md) | Current ZIP audit, exact source-fixture specification, resize/replacement evidence, and intake gate |
| [CROP source evidence](CROP_SOURCE_EVIDENCE.md) | Exact real-ZIP identity, affine coordinate derivation, source comparison, all-surface evidence, and remaining certification boundary |
| [Editable image placement evidence](IMAGE_REPLACEMENT_EVIDENCE.md) | Exact CROP/FIT/FILL fields, replacement Fill/Fit, reset, persistence, stale-work, PNG, and reference status |
| [Source-certified mask authority](MASK_SOURCE_CONTRACT.md) | Strict mask source/relationship contract, exact ALPHA lowering, fallback, telemetry, and evidence |
| [Primitive geometry, paints, and strokes](PRIMITIVE_PAINTS.md) | Source-certified rectangular geometry, ordinary SOLID, uniform/independent corners, INSIDE/CENTER/OUTSIDE strokes, singular ownership, and fixture gates |
| [Milestone 7.2 corner/stroke fixture gate](PRIMITIVE_STROKE_FIXTURE_GATE.md) | Exact supplied ZIP identity, gate closure, certified source regions, and remaining advanced-stroke gate |
| [Independent corner and stroke geometry](PRIMITIVE_STROKE_GEOMETRY.md) | Edge-local Figma radius normalization, stroke-path bounds, DOM/SVG ownership, clipping, and source evidence |
| [Milestone 7.3 linear-gradient fixture gate](LINEAR_GRADIENT_FIXTURE_GATE.md) | Closed exact-ZIP source gate, cumulative certified subset, exclusions, and authority-transfer boundary |
| [Linear-gradient implementation plan](LINEAR_GRADIENT_IMPLEMENTATION_PLAN.md) | Completed bounded canonical/resolved contract, singular owner, fallbacks, tests, and approval boundary |
| [Linear-gradient runtime authority](LINEAR_GRADIENT_RUNTIME_AUTHORITY.md) | Implemented eligibility, matrix, stops/opacity, SVG ownership, revisions, diagnostics, evidence, and deferred boundaries |
| [Adventure-travel gradient intake evidence](LINEAR_GRADIENT_INTAKE_EVIDENCE.md) | Exact exploratory ZIP audit, vertical matrix-to-SVG derivation, preview samples, and unresolved gate cases |
| [Gradient-test intake evidence](LINEAR_GRADIENT_TEST_INTAKE_EVIDENCE.md) | Four-revision source audit, matrix/handles/stops/opacity/corners/resize evidence, and formal gate decision |
| [Phase 7 paint/stroke completion audit](PHASE_7_PAINT_STROKE_COMPLETION_AUDIT.md) | Exact 17-ZIP corpus findings, remaining V1 boundaries, dependency order, and the next ordered-NORMAL fill-stack fixture specification |
| [Ordered SOLID runtime authority](ORDERED_SOLID_STACK_RUNTIME_AUTHORITY.md) | Implemented apply-once opacity, resolved stack, property gate, singular SVG group/shared clip, evidence, and deferred mixed-paint boundary |
| [Ordered SOLID + linear-gradient authority](ORDERED_SOLID_LINEAR_RUNTIME_AUTHORITY.md) | Issue-packet-led source gate, exact two-layer property contract, singular SVG owner, pixel-exact source evidence, and remaining mixed-paint boundary |
| [Ordered NORMAL fill-stack intake](ORDERED_NORMAL_FILL_STACK_INTAKE.md) | Exact initial set plus corrected reverse-control evidence, source order/source-over math, exporter alpha ambiguity, mixed-layer findings, and the remaining provenance/corner gate |
| [Ordered SOLID stack runtime authority](ORDERED_SOLID_STACK_RUNTIME_AUTHORITY.md) | Closed source contract, exporter-0.6.0 opacity alias provenance, shared-corner geometry, proposed singular owner, and bounded Milestone 7.4 scope |
| [Backend orchestration](BACKEND_ORCHESTRATION.md) | Phase 11 node-level backend decisions, registered owners, revisions, fallbacks, and unavailable backend boundaries |
| [Diagnostic projection](DIAGNOSTIC_PROJECTION.md) | Phase 12 capability-aware diagnostic classification, grouping, audience, and Inspector presentation |
| [Rollout modes](ROLLOUT_MODES.md) | Current Legacy/Semantic/Compare readiness and the smallest safe Phase 13 task |
| [Bundle analysis](BUNDLE_ANALYSIS.md) | Production dependency attribution and test-only exclusion |
| [Decision records](decisions/README.md) | ADR index, statuses, and process |

## Audit maps and inventories

| Document | Question answered |
| --- | --- |
| [Current architecture map](CURRENT_ARCHITECTURE.md) | Which modules own each stage today? |
| [Source-to-render data flow](DATA_FLOW.md) | How does a ZIP value reach DOM and PNG output? |
| [Feature trace](FEATURE_TRACE.md) | Where does each required feature family travel or stop? |
| [Duplicate interpretations](DUPLICATE_INTERPRETATIONS.md) | Which properties are interpreted in more than one place? |
| [Render entry points](RENDER_ENTRY_POINTS.md) | Which previews and exports are live or static? |
| [Fallbacks](FALLBACKS.md) | What is approximated, preserved, diagnosed, or unsupported? |
| [Property authority](PROPERTY_AUTHORITY.md) | Which object currently wins at each lifecycle stage? |
| [Source-to-scene mapping](SOURCE_TO_SCENE_MAPPING.md) | Where every source family lands in the V1 scene contract |
| [Scene migration](SCENE_MIGRATION.md) | How duplicate runtime interpretations can be retired safely |

## Existing specialist references

These documents are retained as specialist sources and are not duplicated here:

- [Figma package pipeline](../figma-import-pipeline.md)
- [Optional Figma enrichment](../figma-mcp-enrichment.md)
- [ZIP-only retirement ledger](../legacy-import-retirement.md)
- [Constraint and sizing matrix](../../src/template-package/render/CONSTRAINT_SIZING_MATRIX.md)
- [Vector rendering](../../src/template-package/render/VECTOR_RENDERING.md)
- [Font subsystem](../../src/template-package/fonts/README.md)
- [Renderer regression fixtures](../../packages/template-react/test/render/regression-fixtures/README.md)

## Evidence labels

- **Verified**: confirmed from executable code, a fixture identity, or a current-run command.
- **Proven by automated coverage**: asserted by an existing test; this is not browser verification.
- **Assumed**: plausible but not confirmed; never use as an implementation contract.
- **Unverified**: evidence was unavailable or the scenario was not run.
- **Deferred**: deliberately outside the active milestone.

Milestone 1 adds the pixel/geometry evidence system. Milestone 2 adds the canonical scene contract. Milestone 3 adds observational measurement, dependency, invalidation, and settled evidence. Milestone 4 activates a bounded capability-routed core layout/text authority path while preserving explicit compatibility subtrees.
Milestone 5 converges eligible core geometry across live surfaces, verifies exact declared font identities, and prepares observational appearance contracts without routing appearance behavior.
Milestone 5.1 adds source-owned `CAP_HEIGHT` trim and cap-to-final-baseline geometry while leaving reference approval open.
Milestone 5.2 aligns the browser glyph origin to that semantic box, establishes reviewed source-fidelity correction policy, and retains all historical/new candidates without promotion.
Milestone 5.3 makes font import and linking source-authoritative, isolates managed runtime faces by binary identity, and retains all corrected candidates without promotion.
Milestone 6 makes dynamic FILL placement source-faithful, adds one resolved placement intent/geometry contract plus final-rect telemetry, and retains fixed ambiguous exporter shapes behind explicit compatibility pending source review.
Milestone 6.1 supersedes that temporary fixed-FILL boundary with a real shared-asset CROP/FIT/FILL fixture, separates immutable imported placement from revisioned replacement Fill/Fit, and verifies reset/persistence/stale-work behavior without promoting references.
Milestone 7 adds strict exporter-declared mask relationships and source-certifies one opaque rectangular ALPHA subset. Milestone 7.1 adds a separate capability-selected primitive authority for rectangular frames/rectangles, zero/one opaque ordinary SOLID, uniform/clamped corners, and one bounded stroke subset. Milestone 7.2 adds four independent corners, edge-local clamping, CENTER/OUTSIDE strokes, singular SVG ownership, and ancestor clipping. Milestone 7.3 closes the isolated linear-gradient source gate; Milestone 7.3A implements its singular SVG owner. Milestone 7.4 implements eligible ordered multiple-SOLID NORMAL stacks. The issue-packet follow-up adds only the exact source-certified SOLID-below-linear NORMAL pair through `ResolvedOrderedNormalPaintStackV1`; other mixed paints, advanced strokes, gradient families, non-NORMAL blending, effects, compositing, and Canvas retain explicit deferred boundaries.
Phases 11–12 consolidate those existing owners behind `ResolvedBackendDecisionV1` and project capability-aware diagnostics into the existing quality workspace. Phase 13 implements the bounded internal Legacy/Semantic/Compare control and the local Stage 1 operator cohort. Stage 2 template opt-in, public/default rollout, remote telemetry, and legacy retirement remain unimplemented.

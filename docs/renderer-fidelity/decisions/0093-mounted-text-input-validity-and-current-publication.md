# ADR 0093: Mounted text input validity and current publication

## Status

Accepted for the bounded React text-measurement lifecycle.

## Context and evidence

The editor-responsiveness baseline (`sdk-061-editor-responsiveness-20261009a`)
reproduced an unchanged Carrousel Date switching between trimmed and browser
line-box geometry. Whole-render publication generation was part of each local
measurement key. The retained-source browser reproduction and failing transient
assertion are recorded in the [measurement lifecycle](../TEXT_MEASUREMENT_LIFECYCLE.md).

The first dependency-checking experiment also exposed callbacks retaining a paint
span replaced when the semantic trim wrapper appeared/disappeared. The span could
become a different wrapper or detach. That produced incorrect input fingerprints
and callbacks which could not restore geometry. Checking current mounted refs
is necessary; removing publication generation from a string alone is insufficient.

## Decision

Local intrinsic metrics and rendered-line observations have a mounted-node input
identity independent of runtime publication. Canonical node/run/layout intent,
resolved text, parent constraints, font requirements and exact private-face state
form a conservative semantic identity. A layout effect validates current connected
box/run styles, wrapping, dimensions, chrome, transforms and scale before reuse.
Unknown or changed inputs retain pending/fallback behavior. Each hook owns its
cache and neither borrows another node's sample nor acquires font/resources.

A current-commit validation token gates publication through the current native
runtime callback. Runtime revision/generation, participation, session publisher,
Textarea validation and PNG-readiness guards remain unchanged. This is freshly
validated intrinsic input, not a relabelled settled graph or old line publication.

Callbacks check disposal, current box identity and current connected paint ref;
observers follow a replaced paint span and cleanup disconnects them. Font-ready
promises cannot schedule abandoned work. The same policy applies to fixed text
line observations. Existing metric/calibration and capability algorithms remain.

## Alternatives and consequences

Keeping the publication generation as a local key loses valid geometry. Ignoring
font/run/width dependencies accepts stale geometry. Freezing bounds or masking
movement hides legitimate reflow. A global cache or shared settlement graph would
expand authority beyond this repair. Local validation costs computed-style reads;
paired production measurements determine whether that causes a typing regression.

## Compatibility and reversal

No API, schema, source normalization, font owner, persistence or session change.
All surfaces retain their native local settlement. ADR 0010 stays Proposed;
ADR 0071 supersedes historical rollout-mode descriptions. Reversal restores the
hash-verified pre-change sources; no data migration or reference rewrite is needed.

## Verification

See the durable architecture evidence for failure-first reproduction, paired
production/development trials, genuine dependency and stale-publication scenarios,
and the unchanged renderer/scene/settlement gate. Automated browser and stored
capture evidence must remain separate from manual live review.

The retained development trace additionally demonstrates fresh child measurement
publication followed by a parent passive clear in the same generation (Cover
burst, continuous and multiline). Generation turnover now clears the two runtime
maps in a layout effect, before child passive publication. Filtering, participation,
revision/generation matching and settlement readiness remain unchanged. This
orders existing ownership rather than preserving stale runtime publications.
The failure-first ordering proof regenerates with the final renderer and the
hash-verified original runtime:

```sh
node scripts/editor-performance/run.mjs --baseline docs/architecture/evidence/text-geometry-baseline/identity.json --phase current --trials 1 --mode development --scenario exporter-061-cover --publication-order-baseline --output fidelity/evidence/text-geometry-order-before
node scripts/text-geometry/assert-publication-order.mjs fidelity/evidence/text-geometry-order-before/development-current.json --expect-erasure
```

The current-source assertion omits `--expect-erasure`. Final typing
measurements remain an independent acceptance requirement.

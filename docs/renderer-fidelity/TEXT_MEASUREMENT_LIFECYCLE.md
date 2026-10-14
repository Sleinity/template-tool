# Mounted text measurement validity and publication freshness

Starting gate: `sdk-061-editor-responsiveness-20261009a`.
The retained sources and identity record are in
[the baseline](../architecture/evidence/text-geometry-baseline/identity.json).
The previous five production traces reproduce unchanged Carrousel Date geometry
alternating between authoritative trim and untrimmed browser geometry, returning
to the same final bounds. Stage transforms and loaded fonts remain unchanged.

## Audit and bounded contract

`PackageNodeRenderer` includes whole-render `publicationGeneration` in both local
text measurement keys. `useIntrinsicTextGeometry` returns null on that mismatch
and waits for requestAnimationFrame. An unrelated accepted edit therefore loses
an unaffected node's trim geometry for a frame. Runtime publication still needs
that generation to prevent stale and A/B/A work; deleting that guard is not a fix.

Separate local measurement input identity from runtime publication identity.
Canonical node/text/run/layout intent, resolved text and font resolution plus the
private face signature identify semantic inputs. Before accepting reuse, a layout
effect checks connected DOM, current available/clipping dimensions, computed
box/run typography and wrapping, chrome, ancestor transforms and measurement
scale. Unknown or changed inputs invalidate the local sample. This check is not
final routed geometry authority. Reuse is per mounted hook and never a global cache.

Local geometry can survive an unrelated publication change only with identical
inputs. Publication remains unavailable until current-commit validation produces
a current publication token. Old callbacks are cancelled and disposed callbacks
cannot schedule more frames. Runtime settlement and session acceptance still
require their native revisions/generations. No old settlement or published line
observation is retimestamped. The same contract applies to fixed line observation.

Changed constraints preserve conservative pending/fallback behavior and real
ancestor/sibling/media/clip recomputation. No geometry is frozen, no source values
are changed, and no font owner or capability route is added. Metrics still derive
from the existing Range/Canvas/calibration algorithms. All surfaces remain local
settlement instances; ADR 0010 is Proposed. Historical rollout descriptions in
older programme sections are superseded by ADR 0071 and do not describe current
runtime selection.

## Additional reproduced dependency

The first correction exposed a second cause: the trim wrapper replaces the paint
span while the effect still captures the preceding span. A connected preceding
span may now be the semantic wrapper; a detached one stops the callback entirely.
Range measurement must read the current paint ref, verify the current box, and
observe the new span. Retained failed experiments are diagnostic evidence, not
passing certification. No font matching or trim semantics changed.

## Evidence

The focused repaired production trial has one Date bounds state for all three
workloads; its retained baseline has two. Full paired trials and release results
are recorded in [the architecture report](../architecture/text-geometry-stability.md). Stable final captures alone are not proof of
transient correctness. No reference or tolerance update is permitted here.

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

## Final disposition

The final `sdk-061-text-geometry-20261009d` gate passes unchanged references: 24
stable captures, 12 renderer, three scene and 12 settlement comparisons. Each of
30 production and 30 development current Date traces retains one bounds state.
The isolated production timing profile passes the five-pair latency criterion;
the instrumented timing signal and the bootstrap-enumeration harness correction
remain in the architecture report. Twelve current stored captures were inspected;
manual live typing is not claimed. This closes the bounded lifecycle repair, not
a shared-settlement or broader canonical-rendering milestone.

## Now Hiring follow-up: changed inputs and application transitions

[ADR 0094](decisions/0094-fresh-text-measurement-before-paint.md) distinguishes
invalidating a changed sample from delaying its fresh measurement. Explicit
cap-height trim, available current faces and mounted constraints permit fresh layout-effect measurement;
unknown inputs retain pending/fallback behavior. The trim-wrapper/HUG-width commit
is validated again before paint. Publication requires the current cached result,
not merely a matching semantic key. Untrimmed text and fixed-box line observations
keep their original asynchronous sampling. No old settled evidence is relabelled.

The follow-up exempts semantic text nodes from Studio's universal positive
transition duration under reduced motion. The recorded computed-style trace
demonstrates an animated used height despite a correct current inline trim
height. Setting text transition duration to zero removes that application leak
while preserving the existing media raster path. Reproductions and
current verification are in [the follow-up report](../architecture/now-hiring-text-stability.md).

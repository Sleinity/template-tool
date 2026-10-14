# ADR 0094: Fresh text measurement before paint

## Status

Accepted for the bounded mounted React text-measurement lifecycle. Full delivery
verification is recorded separately in the architecture evidence.

## Context and evidence

The preceding repair (ADR 0093, gate `sdk-061-text-geometry-20261009d`) keeps
unchanged Carrousel Date geometry available after unrelated edits. Now Hiring's
changed headline and body still paint browser line boxes before fresh trim
measurements. Per-revision production traces reproduce an extra 24.88 screen-pixel
headline height and 17.14 body-height difference, with dependent image/sibling
movement. Removing publication generation from local keys cannot fix changed
measurement inputs, which must remain invalidated.

A second transition arises after the HUG trim wrapper introduces max-content
width. The first Range observation can legitimately differ from the new mounted
constraints. Retained experiments show why only measuring earlier once is
insufficient. A computed-style trace also proves an unintended CSS height
transition: Studio's reduced-motion universal rule sets a positive duration on
nodes whose default transition-property is `all`, even though no transition was
requested. Current inline trim height can therefore differ from animated used
height. This is application motion leaking into template geometry.

## Decision

Invalidate changed intrinsic inputs as before. For explicit cap-height-to-baseline
trim, when the exact face (or existing
confirmed replacement authority) and connected mounted constraints are available,
measure the current DOM in a layout effect. Do not borrow a previous text sample.
Unknown constraints and unavailable faces retain the existing asynchronous
pending/fallback path, font events and ResizeObserver scheduling. Ordinary untrimmed
text and fixed-box line observations keep their previous asynchronous sampling.
The first broader implementation removed jitter but introduced isolated p95
handler increases in other workloads and one unapproved Carrousel editor pixel;
its complete evidence is retained, rather than treated as a pass.

ResizeObserver may report the geometry that the current commit already measured.
Skip that duplicate only for the same exact loaded face signature, loaded font set
and complete matching mounted inputs. Unknown/change cases and all font-loading
events retain normal scheduling. Do not schedule a second fulfilled fonts-ready
task after an already completed exact before-paint sample. This uses the existing
per-mounted-node cache; it acquires no fonts/resources and publishes no evidence.

Applying measured HUG width and the semantic cap-trim wrapper changes measurement
inputs. A following layout effect validates that commit and measures its current
inputs again when necessary. It does not guess final parent geometry or run a
new settlement solver. Native settlement retains final routed geometry authority;
compatibility layout remains its existing owner. Cached results retain identity
only under the existing complete metric equality check. Publication additionally
requires the exact cached result, so a superseded intermediate sample cannot
publish even if its input key is unchanged.

Studio's reduced-motion transition duration becomes zero for the private semantic
text-node class and its paint descendants. The existing universal duration and
media behavior remain unchanged. An isolated comparison demonstrated that making
the universal duration zero changes Carrousel's image raster despite identical
geometry; the scoped text rule restores the reviewed PNG byte identity. Styling
uses the canonical TEXT role, never diagnostic attributes, node names or IDs.
This respects the user's reduced-motion preference without inventing transitions
on text geometry.
No template animation, frozen dimensions, export masking, new backend, global
cache, font owner or resource owner is introduced. Changed or unknown observer
inputs remain scheduled normally; the experimental flushSync path was rejected
as unnecessary.

## Compatibility and alternatives

Font/calibration, source trim semantics, complete input keys, native revision and
publisher guards, Textarea validation, export readiness, scheduling, autosave and
recovery remain unchanged. Delayed/unavailable fonts and real wrapping/resize
changes still remeasure. Supported declarations and persisted data do not change.
ADR 0010 remains Proposed. ADR 0071 supersedes historical rollout-mode text.

Freezing old metrics, retimestamping old line observations, animating corrective
layout changes, or bypassing readiness would hide the problem and are rejected.
This bounded contract does not authorize a broader layout or settlement rewrite.

## Verification and reversal

The failure-first sources, trials and regeneration procedure are retained in
[the architecture report](../../architecture/now-hiring-text-stability.md).
Per-revision frame checks cover every node, including dependent image geometry,
while allowing genuine changes between accepted revisions. Production and
development, normal and reduced motion, single and public Family, delayed fonts,
wrapping, resize, stale callbacks, export and unchanged fidelity references are
separate checks. Frame sampling is evidence, not a compositor timestamp.

Reversal restores the retained renderer and Studio CSS sources. No migration or
reference update is required. Automated checks and stored capture inspection must
not be represented as manual live review.

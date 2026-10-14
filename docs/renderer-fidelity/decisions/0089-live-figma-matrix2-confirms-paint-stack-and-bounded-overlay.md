# ADR 0089: Live Matrix 2 confirms its paint stack and bounded group Overlay

## Status

Accepted

## Context

The user supplied the live [Matrix 2 Figma node](https://www.figma.com/design/Tb4DXmBGjBDkJ9eoBQwFYO/Niels-s-AI-Playground?node-id=1099-218&m=dev)
to inspect its paints and group setup directly. The ZIP at the same external
path had been re-exported since ADR 0088, changing the ZIP and template
hashes while keeping the embedded preview and asset bytes identical.

## Evidence

The [tracked read-only Figma inspection](../../../fidelity/gates/phase9-compositing-group-control-figma.json)
records all 14 nodes and 14 paints on 2026-10-06. Exact source floats,
paint order, opacity, blend modes, visibility, dimensions, group modes, and
child order match the new ZIP. Every group has a pink DARKEN paint, a yellow
NORMAL paint at 40% above it, and pink MULTIPLY and SCREEN paints; group
opacity is 80%. Group modes are PASS_THROUGH, NORMAL, and OVERLAY.

The new ZIP hash is
`b8228a8c9d256ff0b78f89f720c57e3416f60289cae0a0344ef034a146f66c52`;
`template.json` is
`087282c8327fdfdf8ddfae308e8ab2cf901abadc015e94c0d675ff7dd2bd0a31`.
The previous hash `03537cf0916126252c1697ccce1f2e63af5db26d73a4d6d1db9bfa35d7b4cc38`
belongs to the 2026-10-05 capture and remains historical evidence, not
current fixture bytes. The [source gate](../PHASE_9_GROUP_CONTROL_SOURCE_GATE.md)
records exact preview, image, screenshot, run, and environment identities.

Three samples in the third group's opaque image interior agree within one
RGB level with isolated child paints, group OVERLAY blending against the
image, and 80% post-group opacity. Each discriminates a pass-through-child
model by more than ten levels. Eighteen flat and six other image samples
still prove the matched PASS_THROUGH/NORMAL subset. The public V2 import,
parser, and session resolve the new ZIP. Its two-pass Validate/Fields/editor/
PNG capture is complete and stable. Renderer comparison remains four
unapproved surfaces; scene remains one unapproved snapshot; settlement
remains four missing or different approved bundles.

## Decision

Accept direct Figma-to-ZIP equality for this dated inspection and extend
the bounded source contract to the three sampled `OVERLAY` image-interior
pixels. Do not infer a general Overlay owner, transparent-edge behavior,
mixed IMAGE/gradient compositing, or source fidelity of current output.
No renderer/backend route, production API, approved reference, snapshot, or
tolerance changes under this decision. ADR 0088 remains the historical
matched-isolation finding; this record adds live source inspection and the
new exact export identity.

## Consequences

The next coherent runtime milestone may target the certified opaque-backdrop
subset, with explicit fallback elsewhere. It still needs one visual owner,
paint/group order, invalidation, edits, resize, export, and performance
evidence. Cover's mixed-stack fade remains separate. Phase 9 and the
active three-export SDK gate remain **no-go**.

## Verification

The current exact-ZIP source checker and public V2 path passed. The fresh
two-pass capture `phase9-group-capture-20261006-a` completed and repeated
stably. Renderer, scene, and settlement comparisons were bound to that
capture and retained their unapproved/missing results. Portable tests,
package build/typechecks, the API contract, package boundaries, public
three-export host, and documentation links passed in this run. The normal
comparison commands retain their nonzero disposition; none was promoted.

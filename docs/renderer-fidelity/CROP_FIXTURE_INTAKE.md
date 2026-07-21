# Authoritative CROP Fixture Intake

Status: superseded for Milestone 6.1 replacement certification by the exact editable CROP/FIT/FILL fixture. Retained as acquisition history and future source-resize/crop-tool specification.

This specification defines the minimum evidence for certifying genuine Figma `scaleMode: CROP`. A synthetic package, hand-authored JSON, source-level probe, renderer screenshot, or existing `FILL + imageTransform` package cannot satisfy this gate.

## 2026-07-16 fixture audit

The configured external directory and every repository/diagnostic fixture location were audited. No authoritative CROP ZIP was initially found. The user then supplied `template-package-deal-of-the-week-banner-crop.zip`; its exact final bytes are registered and audited in [CROP source evidence](CROP_SOURCE_EVIDENCE.md).

| ZIP | SHA-256 | Package / root | Image-paint finding | Classification |
| --- | --- | --- | --- | --- |
| `template-package-now-hiring-post.zip` | `14f895cbba1919cc39175e276fb34d7e3f4a92354c2085fe67656365246b906b` | `pkg_387_340_1783966486531` / `387:340` | `FILL`; retained non-identity matrix is CROP-inapplicable provenance | Registered authoritative FILL fixture |
| `template-package-deal-of-the-week-post.zip` | `96866712f10271407a182d3a905e112b2eb1b9170257c4d8fe6d05c9a7311b05` | `pkg_225_117_1783547502647` / `225:117` | `FILL`; retained non-identity matrix | Registered compatibility fixture |
| `template-package-deal-of-the-week-banner.zip` | `b8ac9d2acf962de377114013ef91626b0426ef9645566917a6655ffb538b7e1b` | `pkg_346_34_1783763662819` / `346:34` | Three `FILL` nodes; retained non-identity matrix | Registered compatibility fixture |
| `template-package-optimized-for-template-export.zip` | `fa87c4eeefbad1e8c3bbe3bc03912870aeb2a9a6d0d16ea301de25270f1e0823` | `pkg_378_19_1783892960002` / `378:19` | `FILL`; retained non-identity matrix | Registered exploratory fixture |
| `template-package-bb-cover-thing.zip` | `7349496cd1cca9012d55791ac92b2d0d1ade2dc9fe204102b5074566ad06e4b3` | `pkg_421_19_1784061375618` / `421:19` | `FILL`; retained non-identity matrix | Unregistered; not CROP evidence |
| `template-package-main-visual-section.zip` | `c3562c456978758384ba592fd463ac30ec7b7566ee55a67068691d8d260331df` | `pkg_2453_1435_1784061043132` / `2453:1435` | No CROP image paint | Unregistered; not CROP evidence |

The diagnostic lifecycle uses the registered deal post and banner bytes above. `imageFills.ts`, `imagePlacement.test.ts`, resolved-tree tests, and the analysis fixture contain synthetic CROP cases only. `appearanceContractProbe.ts` remains non-render-authoritative. The later exact `template-package-deal-of-the-week-banner-crop-2.zip` adds editable FILL/CROP/FIT fields and completes the corrected replacement/reset/persistence gate; see [Editable Image Placement Evidence](IMAGE_REPLACEMENT_EVIDENCE.md). A second reviewed source resize remains useful future crop-tool evidence but is not required by the corrected Milestone 6.1 scope.

## Package evidence still required

The received ZIP satisfies the unchanged real-export, CROP matrix, real asset, intrinsic-size, preview, identity, and static coordinate requirements. To complete resize and replacement certification, provide a follow-up real export/evidence bundle that contains:

- `template.json` with a real image paint whose source `scaleMode` is exactly `CROP`;
- a valid, finite, non-identity 2×3 `imageTransform` on that same paint/node;
- the referenced image asset as a ZIP member and a matching `assets.json` record;
- intrinsic image width and height that can be verified from the asset bytes;
- `preview.png` produced for that exact export, or a reviewed Figma screenshot if the exporter cannot embed one;
- the original source node ID, root node ID, canvas dimensions, package ID, package/schema version, and exporter/plugin version where available;
- enough raw Figma paint metadata to distinguish the stored matrix direction and coordinate space;
- the original Figma file URL and node URL when sharing them is acceptable; rendering must not depend on either URL.

The crop must be visibly non-centred. The chosen source region should include asymmetric, recognizable landmarks near at least two crop edges so centred cover, reversed translation, double inversion, and normalized/pixel coordinate mistakes produce visibly different output.

## Recommended source design

The strongest single fixture has one rectangular image slot in a simple supported Auto Layout chain and an editable image field. Its source should also provide:

- one text field whose short and long values change the live image-slot height;
- a second reviewed root/frame size, or an exporter-supported responsive resize scenario, showing how the same crop intent behaves when the slot changes;
- no true mask, effect, blend, gradient, rotation, shear, or multiple image paint on the certification node;
- no missing font or remote-only asset dependency that could obscure media evidence;
- an ordinary rectangular clip, with radius only if the already-supported radius behavior is intentional.

Keep rotation/shear in a separate later fixture. The first certification fixture should isolate translation and scale so the affine direction can be derived rather than guessed.

## Replacement evidence bundle

To certify field policies, include or supply deterministic replacement assets with redistribution permission:

| Replacement | Required evidence |
| --- | --- |
| Wider landscape | File bytes, SHA-256, intrinsic dimensions, expected preserve-crop result |
| Taller portrait | File bytes, SHA-256, intrinsic dimensions, expected preserve-crop result |
| Square | File bytes, SHA-256, intrinsic dimensions, expected preserve-crop result |
| Transparent PNG | File bytes, SHA-256, intrinsic dimensions, expected alpha/background behavior |
| High resolution | File bytes, SHA-256, intrinsic dimensions, expected sampling behavior |

For each asset, state whether the tested action is **Preserve original crop**, **Fill frame**, **Fit inside**, or **Explicit stretch**. Clear/reset must restore the imported asset, `CROP` mode, raw transform, and provenance.

## Source evidence for resize semantics

A static preview proves only the exported slot. To authorize live resize behavior, provide one of:

1. two exported ZIPs or source frames with the same image/crop intent at two documented slot sizes; or
2. a reviewed Figma recording/screenshots showing the source node before and after the exact root/slot resize; or
3. exporter metadata that explicitly defines how normalized crop intent is retained during resize, plus a source capture confirming the result.

The evidence must establish whether resize preserves a normalized source rectangle, focal/zoom intent, the original affine relationship, or another defined source semantic. The implementation will not choose among these by assumption.

## Intake record

After receipt, register the fixture only after recording all fields below:

```text
stable fixture ID
repository-relative or configured external source path
filename, byte size, ZIP SHA-256
embedded preview entry and SHA-256
canvas width/height, root node ID, package ID/version, exporter version
crop node ID and source bounds
asset ID, ZIP path, byte size, SHA-256, intrinsic width/height
source scaleMode and exact raw imageTransform
transform coordinate space and direction evidence
expected normalized visible source region
expected destination geometry at the exported slot
editable-field ID and replacement policies
required fonts and exact font policy
Figma file/node URL when available
authoritative/exploratory status, purpose, date added, limitations
```

The manifest entry must bind the exact filename, byte size, ZIP digest, preview digest, dimensions, root, and package version. Similar filenames or newer exports never substitute silently.

## Intake validation

Before any production change:

1. verify the ZIP signature, central directory, required entries, byte size, and SHA-256;
2. parse through the loose source contract, normalization, and strict `TemplatePackageV1` validation;
3. prove that the crop node and asset references survive with raw provenance;
4. independently decode the asset dimensions and hash;
5. derive the expected source polygon/rectangle and destination geometry from the raw matrix;
6. compare that derivation with the embedded preview/source screenshot;
7. register it in `fidelity/fixtures.json` as exploratory until human source review is complete;
8. capture Validate, Fields, editor, shared preview, and real PNG twice without approving references;
9. retain source, candidate, diff, structural, transform, font, environment, and timing evidence;
10. request explicit visual review before any reference promotion or support-level change.

The static intake now passes and is no longer synthetic-only. MED-003 and MED-007 remain incomplete until the missing resize/replacement/reload scenarios have source authority. ADR 0012 remains Proposed, and Milestone 6.1 remains partially complete.

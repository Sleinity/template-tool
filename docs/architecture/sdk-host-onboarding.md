# SDK 2.0.0 host delivery and certification

## Release boundary

The prepared SDK targets **2.0.0**, following the user's approval on 2026-10-15.
The existing [SDK 1.0.0 publication](https://github.com/Sleinity/template-tool/releases/tag/sdk-v1.0.0)
retains V1 compatibility APIs; retiring them and restricting exporter admission
requires a new major version. The earlier local 1.0.0-labelled optimization/F7
archives are distinct, unpublished source candidates and remain immutable.

V2 host APIs, exporter 0.6.1 admission, source schema 1.0 normalization and
canonical schema 2.2 remain the prepared runtime contract. This milestone adds
no public API, schema, renderer or optimization behavior. No tag or publication
is authorized by preparation or certification.

## Delivered host

[Current documentation](../sdk/README.md) is the entry point. The canonical
React/TypeScript example now composes native single and Family sessions through
public SDK entries. Multiple staged ZIP/font preparations are accepted atomically;
failed replacements retain accepted work. The example includes ordered typed
controls, Choices, diagnostics, replacement/Crop/Reset, saved-template listing,
Fresh/Resume/Discard recovery and guarded PNG with cleanup-only Retry.

`StarterOutput` and `Preparation` are private example composition. Native sessions
retain mutation, capture/pinning, validation and resource authority. The example
serializes destination selection for library versus token-bound recovery writes.
Its 650 ms autosave is host policy and starts after the first explicit Save.
Storage adapters and font authority can be injected without Studio annotations.

The delivery generator emits a deterministic standalone `SDK-HOST-STARTER.zip`,
configuration and exact vendored three-package closure. React 19 and tooling
versions come from the checked installation. pnpm explicitly permits esbuild's
build script; installation requires no private registry credentials. Exact
exporter ZIPs and licensed fonts remain external inputs.

## Documentation and reuse

The Markdown inventory classifies current host/maintainer guidance and historical
evidence. Historical ADRs/reports remain evidence; active guidance points to the
current contract. Published 1.0.0 documents are preserved with exact downloaded
asset hashes and their original wording. New 2.0 migration notes distinguish
actual removals from schema/image-policy changes already released in 1.0.

The Studio reuse catalogue identifies supported APIs, copyable examples and
Studio-specific references. Eighteen source links are pinned to the reviewed
implementation commit and checked against Git objects. Product styling and
private Studio modules are not SDK contracts. The post-release redesign handoff
records coupling and reuse opportunities without extracting new components.

## Verification and limitations

The test-only fresh-host gate extracts the delivered archive, installs its SDK
tarballs, builds the unmodified application and observes the same application
through build-local probes. It checks all seven fields, configured Choice/crop
derivatives, exact-font correction, save/recovery/offline reopen, failures/Retry,
failed Family batches, real Family selection, disposal and token ownership,
PNG and cleanup-only Retry. Configured derivatives are not additional exporter
certification. Offline reopening assumes the application has already loaded;
offline application bootstrap is not provided by this Vite example.

Focused single-source lifecycle tests retain their own test entry scaffold;
they no longer claim to exercise the complete starter's default route. The fresh
application gate covers that route. Browser automation and stored-capture source
review are reported separately; no manual accessibility or Bas review is implied.

Final acceptance must bind the frozen 2.0.0 archives, documentation and starter
to macOS/Linux reports under Node 22.23.3/pnpm 11.9.0 and a fresh three-export
renderer/scene/settlement gate. Packing keeps `not-yet-verified`; the certification
decision is recorded separately. Reference/fixture/font identities and previous
certified archives remain protected. Publication preparation uses supplied frozen
artifacts, and publication/tagging remain a separately approved final operation.

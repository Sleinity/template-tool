# ADR 0085: Image fields declare one replacement policy

- Status: Accepted
- Date: 2026-09-20

## Context

TemplatePackage 2.1 let an Image field authorize several placement modes and
select a separate default. That made the Draft Editor responsible for choosing
how replacement media should behave. Replacement policy belongs to template
authoring, while imported Figma placement is immutable source evidence.

## Decision

TemplatePackage 2.2 replaces `allowedPlacements` and
`defaultReplacementPlacement` with the required singular
`replacementPlacement: "fill" | "fit" | "crop"` property.

Loose 1.0 exporter packages normalize `cover`, `contain`, and `user-crop` to
Fill, Fit, and Crop. An unspecified replacement rule becomes Fill. The raw
exporter package and its provenance remain unchanged. Canonical 2.0 and 2.1
packages are rejected rather than migrated.

Imported images retain their source Fill, Fit, or Crop placement until they are
replaced or reset. Fill and Fit uploads immediately use their configured mode.
Crop hosts may submit a canonical crop with the upload or call `setPlacement`
afterward. When no crop tool supplies a crop, Crop policy deterministically
falls back to Fill. Fit is never valid under Crop policy.

Changing a policy does not rewrite existing replacement content. Content that
is incompatible with the new policy remains visible, invalid, export-blocking,
and repairable. Family variants may inherit or override the required policy;
they cannot clear it.

Current saved envelopes advance with the contract. Older Templates, Families,
and Drafts remain discoverable as `Reimport required`, cannot be opened, and
can be deleted through raw ownership-aware repository operations.

## Consequences

- Draft Editors no longer expose Fill/Fit mode selection.
- Studio Fields uses one radio group and one rule summary.
- `setPlacement` remains the host crop/framing API and enforces the policy.
- Source placement, active replacement placement, Family framing, and renderer
  geometry remain separate authorities.
- No renderer owner, layout behavior, golden reference, scene snapshot,
  settlement snapshot, or tolerance changes.

## Verification

Core contract tests cover default Fill, exact Fill/Fit enforcement, Crop with
canonical data, Crop-to-Fill fallback, source reset, and old-schema rejection.
Browser and Studio coverage exercises single and Family sessions, persistence,
incompatible record listing/deletion, the radio UI, and host crop controls.

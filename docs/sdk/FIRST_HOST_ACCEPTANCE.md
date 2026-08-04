# First host acceptance

This is the bounded acceptance checklist for the first external SDK 0.7 host.
Use only the three verified release-candidate archives and their `SHA256SUMS`.
Do not link the template-tool workspace or import repository source.

## Required flow

1. Install all three archives without a GitHub Packages token. For pnpm, map
   the private transitive package closure to the same vendored archives.
2. Call `inspectTemplateRuntimeSupport()` before presenting the workflow.
3. Import and explicitly confirm one representative production ZIP through the
   SDK wizard or headless controller.
4. Store the immutable confirmation through the host's existing persistence.
5. Create a fresh session and reopen it with
   `loadTemplateImportConfirmation()`.
6. Render through `TemplateSessionViewport`, use the ordered field controllers
   for text and image edits, and present the diagnostic summary in host UI.
7. Verify Fill, Fit and reset for an editable image, then capture a silent PNG
   only from the current ready revision.
8. Dispose the session, disable external requests, reopen the same record and
   verify offline rendering and editing.

The host must not import Studio modules, repository paths, package source, or
an entry named `renderer-internal`. Navigation, forms, image processing,
authentication, cloud storage, catalogues and publishing remain host-owned.

## Acceptance evidence

Record the host commit, package checksums, package manager and browser version;
the ZIP identity; confirmation and fresh-session outcomes; edit/reset/capture
results; offline result; and any console or network failures. Do not include
template ZIP bytes or private assets in a shared report unless separately
approved.

## Feedback classification

- **Documentation/integration correction:** the supported contract works but
  the handoff is unclear.
- **Host-owned concern:** product workflow or infrastructure outside SDK
  ownership.
- **SDK correctness blocker:** a documented 0.7 contract fails from the packed
  archives and prevents the required flow.
- **Future feature request:** useful capability that is not required by the
  documented 0.7 contract.

Only SDK correctness blockers may reopen the 0.7 release candidate. Other
feedback is recorded for a later roadmap. After publication, an emergency
`0.7.1` requires the same fixed-train release gates.

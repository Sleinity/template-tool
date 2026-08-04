# Lovable handoff: upgrade an existing SDK 0.2 host to 0.7.0

This handoff is for the existing Sleinity host that already has a working SDK
0.2 integration. Upgrade it in place. Preserve working product behavior and
keep a rollback commit until the 0.7 flow has passed.

Give Lovable one prompt at a time. After every prompt, review its file list,
test results, manual checks and blockers before continuing.

## Prompt 1 — inventory the working integration

```text
Audit the existing Template Platform SDK 0.2 integration. Do not modify files.

Identify every @sleinity import, installed version, SDK-related route and
component, stored template/confirmation/draft shape, ZIP import path, editor
control, image workflow, persistence service, PNG/export path and test.

Separate SDK-owned behavior from host-owned navigation, forms, authentication,
image processing, storage, catalogues and publishing. Identify whether stored
records contain the complete 0.2 confirmation or only selected package data.

Report the exact in-place migration order, likely compatibility risks and the
rollback commit to retain. Do not recommend a fresh application or imports from
Studio, repository source, package src directories or renderer-internal.
```

Checkpoint: confirm the inventory accounts for every existing SDK import and
stored record before changing dependencies.

## Prompt 2 — upgrade the fixed package train

Place the checksum-verified 0.7.0 Release archives in `vendor/` first.

```text
Upgrade the existing Template Platform integration from 0.2 to the three
vendored 0.7.0 archives using the supplied SDK-INSTALLATION.md.

Keep the current package manager. Pin core, browser and React to the local
0.7.0 archives; add pnpm overrides when applicable; update the lockfile; and
remove obsolete 0.2 package resolutions. Do not add GitHub credentials or
registry fallback. Do not change application behavior yet.

Run dependency inspection, typecheck and production build. Report every
compile error grouped as changed public usage, existing host issue or package
resolution issue. Do not silence errors with any, ts-ignore or deep imports.
```

Checkpoint: all installed SDK packages resolve to exactly 0.7.0 and the host
still has a straightforward rollback commit.

## Prompt 3 — migrate import and confirmation

```text
Replace the existing 0.2 import/setup glue with the supported 0.7 React wizard
while preserving the host route, layout and navigation.

Use useTemplateImportWizard and TemplateImportWizard from
@sleinity/template-react/importer and its packaged CSS. Let the wizard own ZIP,
package, exact-font, render, field-rule and confirmation steps. On explicit
completion, retain the complete TemplateImportConfirmationV1 through the
existing host storage boundary and return through existing navigation.

Cancellation must create no record. Do not reuse wizard.session as the
customer editor session, copy Studio UI, duplicate validation, or change cloud
storage/publishing contracts.
```

Checkpoint: one valid ZIP confirms, one invalid ZIP remains blocked, and the
host record is created only after completion.

## Prompt 4 — reopen existing and new records

```text
Migrate record reopening to a fresh 0.7 session.

Create one useTemplateSession per mounted editor and call
loadTemplateImportConfirmation for complete confirmation records. Treat
applied=false as blocked and show inspection issues. Never fall back to the
wizard session or trust stored resolved/readiness data.

Test every stored 0.2 record shape found in the audit. If a record cannot be
reopened because the old host did not retain enough confirmation/package
evidence, do not fabricate it or weaken validation. Mark that record as
requiring one-time ZIP re-import and provide clear host UI guidance.
```

Checkpoint: document the number of records that reopen directly and every
record shape that requires re-import.

## Prompt 5 — adopt the 0.7 editor bindings

```text
Update the existing editor without replacing its product UI.

Wrap the fresh session in TemplateSessionProvider. Replace custom preview
fitting and renderer readiness glue with TemplateSessionViewport. Bind current
host controls through useTemplateSessionEditableFields or
useTemplateSessionEditableField. Replace duplicated diagnostic aggregation
with useTemplateSessionDiagnosticSummary.

Preserve the existing forms, labels, layout, image selection/crop processing,
navigation and product actions. Submit final values through field controllers.
Use controller reset and session.restoreImportedState rather than direct node
mutation. Keep Fill/Fit behavior explicit for images.
```

Checkpoint: existing text and image workflows look unchanged to the user while
using only supported 0.7 entries.

## Prompt 6 — preserve persistence and export

```text
Connect the upgraded 0.7 session to the host's existing persistence and export
boundaries.

Keep existing cloud storage and publishing services. Use session.save and
loadSavedTemplate only where the old integration intentionally used local
browser drafts. Capture through TemplateSessionViewportHandle only when the
latest snapshot belongs to the current revision and canExport is true. Use
exportPng({ download: false }) and pass the result to the existing host export
or publishing callback.

Verify an edit invalidates the previous export identity. Do not introduce a
new backend, browser download or external SDK runtime request.
```

Checkpoint: local/offline behavior and the existing host publication path both
use current 0.7 revisions.

## Prompt 7 — remove obsolete 0.2 glue and verify

```text
Remove only integration code made obsolete by the completed 0.7 migration.

Prove each removed adapter, validator, preview fitter, field lookup or
diagnostic aggregator has no remaining consumer. Preserve host-owned forms,
crop tools, navigation, persistence and publishing even when they are old.

Run typecheck, tests and production build. Browser-test invalid/valid ZIP,
fonts, confirmation, fresh reopening, migrated or re-imported records, text
edit/reset, image replacement, Fill/Fit, save/reload, offline reopening,
stale-export rejection and silent PNG capture. Confirm no Studio,
repository-source, package-src or renderer-internal imports, no external SDK
requests, no downloads and no console errors.

Report automated and manual evidence separately, the final changed-file list,
known limitations and rollback instructions.
```

Checkpoint: remove the rollback branch only after the product owner accepts the
working 0.7 implementation.

Post-release feedback should be classified as documentation correction,
host-owned concern, SDK correctness defect or future feature request. Only a
genuine SDK compatibility blocker should trigger a 0.7.1 patch.

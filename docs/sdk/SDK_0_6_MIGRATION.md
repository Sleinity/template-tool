# SDK 0.6.0 migration

SDK 0.6.0 preserves every 0.5.0 package entry and existing import, session,
renderer, persistence, and capture API. Upgrade the fixed core/browser/React
train together.

The default wizard now treats zero-routed compatibility rendering as ready
when the existing package, exact-font, asset, DOM, revision, and export-safety
authorities pass. Routed core-layout templates still require a current stable
settlement. Blocked render reports always include a stable actionable issue.

The React importer entry adds three optional shared components:

- `TemplateImportValidationSummary`
- `TemplateImportRenderValidationSummary`
- `TemplateImportFieldRulesEditor`

The default wizard uses these components automatically. Headless hosts may use
them with the existing controller snapshot, or keep their own presentation.
Studio deliberately retains its richer native validation and field-card
presentation; it does not embed the generic SDK summaries.
The preview bridge now fits the complete intrinsic canvas into its container
with protected padding and no scrollbars; renderer markup and capture pixels do
not change.

Wizard snapshots and new confirmations include
`TemplateImportFieldValidationReportV1`. Invalid rule drafts remain visible,
but the last valid working package stays active until a valid change can be
applied atomically. Confirmation inspection reconstructs the portable
field-validation report for older supported confirmation records.

Field Rules now configure only host-input behavior. All fields remain present
and reorderable. Imported labels, types, targets, and defaults are read-only.
Text supports a maximum-character limit, textarea additionally supports maximum
lines, and image fields support format, size, dimensions, aspect-ratio and
Fill/Fit/host-crop policy. Number, date, colour and boolean fields need no setup
panel because their descriptor type already defines host behavior. Legacy
enabled/help-text confirmation metadata is accepted but ignored.

`TemplateSessionSnapshotV1.fontPreparation` exposes revision-bound exact-font
activation evidence. A verified upload is registered under its private runtime
family in the active browser `FontFaceSet`; Font Validation and Render Validation
wait for the current revision rather than accepting a fallback face.

Device emoji fallback remains available as internal diagnostic evidence but is
not displayed as setup guidance and does not create a warning by itself. Exact
font identity and all non-emoji glyph coverage remain strict.

No host migration is required unless it wants to adopt the new shared
presentation or field-validation report. Host-owned forms, crop tools,
navigation, storage, publishing, and cross-device transport remain outside the
SDK.

## Migrating a 0.2.2 host

Upgrade `@sleinity/template-core`, `@sleinity/template-browser`, and
`@sleinity/template-react` together. Replace only the host's hand-built import
and setup flow with `useTemplateImportWizard()` and
`TemplateImportWizard`. Keep the existing host dashboard, catalogue record,
customer-facing editor controls, image or crop workflow, storage, and export
pipeline.

On explicit confirmation, store the returned
`TemplateImportConfirmationV1` as host-owned data and return to the host
dashboard. When that template is selected later, create a fresh
`useTemplateSession()` instance and reopen the confirmation atomically with
`loadTemplateImportConfirmation()`. Continue sending final supported values
through `session.setField()`, `session.replaceImage()`, and the existing reset
and replacement-mode methods. Do not keep using the wizard-owned session as
the customer editor session.

This migration deliberately does not require the host to replace working
navigation, authentication, cloud persistence, image processing, publishing,
or PNG delivery code. The SDK owns package correctness, exact-font setup,
session state, readiness, supported mutation, and faithful rendering; the host
continues to own its product.

## External adoption evidence

During the first real integration, record repeated host code only when the
same responsibility also exists in Studio and the standalone reference. Use
these categories:

- responsive session-preview fitting and current render-identity handling;
- descriptor-to-session value, mutation-result, and reset binding;
- final image-file preparation before `session.replaceImage()`;
- draft autosave and lifecycle flushing;
- readiness, mutation-rejection, and stale-render error presentation.

For each candidate, record the host use case, approximate repeated code, SDK
workaround, and whether Studio and the reference duplicate it. Product-specific
forms, crop UI, catalogues, navigation, storage, publishing, and authentication
do not qualify. A future SDK primitive should be proposed only after all three
implementations provide concrete evidence of the same boilerplate.

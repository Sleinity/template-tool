# Migrating from SDK 0.7 to 0.8

SDK 0.8 adds Template Families without replacing the 0.7 single-template
workflow. Existing ZIP imports, confirmations, sessions, React renderers,
editor controllers and PNG capture remain supported. Adopt families only when
several ZIP variants need one shared content record.

## Install the fixed train

Install all SDK packages at exactly `0.8.0`. For credential-free installation,
verify and vendor the three archives from the public `sdk-v0.8.0` GitHub
Release as described in [INSTALLATION.md](INSTALLATION.md).

```sh
pnpm add @sleinity/template-core@0.8.0 \
  @sleinity/template-browser@0.8.0 \
  @sleinity/template-react@0.8.0
```

React 19, React DOM 19 and a modern browser remain the runtime requirements.

## Choose whether to adopt families

Stay on the existing 0.7-shaped APIs when every saved item is one ZIP with one
content state. No conversion is required.

Adopt a Template Family when two or more ZIP variants should:

- retain their own package, canvas, assets, fonts and local field targets;
- share stable host-facing field keys and one content state;
- switch without copying or losing content; and
- apply common field rules with sparse per-variant overrides.

The SDK does not interpret group titles. “Format”, “Colour” and “Language” are
host vocabulary; the family contract stores only generic groups, options and
assignments.

## Recommended family composition

```ts
import {
  createTemplateFamilyImportWizard,
} from "@sleinity/template-browser/importer";
import {
  createTemplateFamilySession,
} from "@sleinity/template-browser/session";

const wizard = createTemplateFamilyImportWizard();
await wizard.loadFirstZip(firstZip);
await wizard.addVariant(secondZip);

// The host presents field matches, optional groups, rule differences and
// selected-variant preview before retaining the confirmation.
const confirmation = await wizard.confirm();

const familySession = createTemplateFamilySession();
familySession.load({
  family: confirmation.family,
  content: confirmation.content,
  sharedImageAssets: confirmation.sharedImageAssets,
});
```

React hosts can use `TemplateFamilyImportWizardProvider`,
`TemplateFamilyZipInput` and `TemplateFamilyImportPreview` from
`@sleinity/template-react/importer`, then use
`TemplateFamilySessionProvider`, `useTemplateFamilyEditor()` and the family
field/selection hooks from `@sleinity/template-react/editor`. Continue to pass
`familySession.renderSession` to `TemplateSessionViewport`; there is no
family-specific renderer.

## Existing saved templates and drafts

The browser persistence layer can present 0.7 saved templates and drafts as
deterministic one-variant families in memory. It does not eagerly rewrite or
delete the legacy records. A new family record is written only when the host
explicitly saves family settings; a continued legacy draft is written to the
new family-draft store while the legacy draft remains available for rollback.

Do not flatten a multi-variant family into `SavedTemplateRecord` or
`TemplateSessionV1`. Use the family repository and `TemplateFamilySessionV1`.

## Reimport

Use `planTemplateFamilyVariantReimport()` before mutation. Exact previous
targets are matched first, exact compatible fields second, and weaker matches
remain suggestions. Show added, removed, incompatible and unresolved fields
to the user. Apply with `applyTemplateFamilyVariantReimport()` only against the
expected family revision. Failed or stale application leaves the current
family unchanged.

## Host ownership remains unchanged

The host owns navigation, forms, image processing, cloud persistence,
authentication, publishing and the meaning of variant selectors. The SDK owns
family identity, matching, rule inheritance, shared content, validation,
materialization, browser-local persistence and current-variant lifecycle.

Never import Studio code, repository source paths, package `src/` paths or a
`renderer-internal` entry. Do not create hidden renderers for unselected
variants and do not batch-export a family in 0.8.

## Agent checkpoint

Ask an implementation agent to prove all of the following before accepting a
migration:

```text
Verify this SDK 0.8 integration without changing renderer behavior. Confirm
that every SDK package resolves to 0.8.0; all imports use supported public
entries; existing single-template records still open; family content survives
variant switching, disposal and offline reopening; only the selected variant
is materialized; capture uses the current renderSession revision; and there
are zero Studio, repository-source or renderer-internal imports. Report any
record that requires reimport instead of silently changing it.
```

# @sleinity/template-core

## 0.3.0

### Minor Changes

- Add the host-neutral template setup wizard, portable editable-field rule
  operations, and revision-safe session setup/font preparation APIs.
- Align portable font readiness with the established device-emoji fallback
  while keeping all non-emoji text-face coverage strict.

## 0.2.2

The fixed SDK train advances together with host-neutral installation,
authorization, and template-editor handoffs. Core importer behavior and its
public declaration are unchanged.

## 0.2.1

The fixed SDK train advances together. Core importer behavior and its public
declaration are unchanged in this patch.

## 0.2.0

### Minor Changes

- Add the SDK 0.2 consumer runtime contract: a revision-safe browser
  `TemplateSession`, injectable offline adapters, React session bindings, guarded
  current-identity PNG export, and isolated packed-tarball consumer verification.
  Add a UI-independent composable inspection viewport while preserving the
  existing inspection-preview API and moving Studio presentation out of the SDK.
  Make the portable ZIP importer, resolved/backend models, and field-editing
  contracts physically owned by `@sleinity/template-core`, and add a release
  handoff for direct GitHub Packages and secret-free Lovable Business consumers.

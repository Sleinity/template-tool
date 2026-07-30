# @sleinity/template-core

## 0.4.1

### Patch Changes

- Advance the fixed SDK train for the browser-runtime ownership migration.
  Portable core behavior and the public core declaration are unchanged.

## 0.4.0

### Minor Changes

- Advance the fixed SDK train for the external-adoption compatibility contract.
  Portable importer, package, validation, field, and renderer-model behavior is
  unchanged.
- Initialize canonical schema compilation on first validation so browser
  runtime preflight can report restrictive CSP environments before import.

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

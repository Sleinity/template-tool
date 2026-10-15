# SDK consumer compatibility

This is the integration contract for applications that import, edit, render,
persist, and export TemplatePackage ZIPs through the SDK packages.

## Runtime matrix

| Concern | Supported contract |
| --- | --- |
| Core importer | Modern browser or Node with `ArrayBuffer`, `TextDecoder`, `Blob`, and `structuredClone` |
| Browser runtime | Browser application with DOM, IndexedDB, image decoding, font loading, SVG, data URLs, and blobs |
| React adapter | React 19 and React DOM 19 |
| Pixel authority | Current pinned Chromium environment |
| Other browsers | Expected modern-platform compatibility, but not a pixel-authority claim until separately verified |
| Network | No importer- or renderer-time external requests are required |
| Server rendering | Not supported by the browser session/renderer contract |
| Host integration | Product navigation, authentication, catalogues, cloud storage, and publishing remain host-owned |

## Content security policy

The browser runtime can use embedded `data:` assets, browser-created `blob:`
URLs, inline element styles, SVG, managed fonts, and canvas-backed browser
capture internals. A restrictive host CSP must be tested against the actual
integration. Typical required allowances include:

```text
img-src 'self' data: blob:
font-src 'self' data: blob:
style-src 'self' 'unsafe-inline'
script-src 'self' 'unsafe-eval'
connect-src 'self' blob: data:
```

Do not add an external image or font origin merely to satisfy the renderer.
Assets and managed fonts should remain package- or browser-storage-backed for
offline deterministic rendering. The exact CSP matrix is a host acceptance
test, not a reason to weaken the host's global policy without review.
Call `inspectTemplateRuntimeSupport()` to receive stable `ready`, `warning`,
or `blocked` evidence for the current browser and policy. The packed acceptance
tests both a supported policy and an intentionally restricted policy.
The SDK lazily initializes the canonical AJV validator so the preflight can
report `runtime.dynamic-code.unavailable` before a ZIP is validated.

## Storage and persistence

Default browser persistence uses IndexedDB. Consumers may inject the existing
repository, asset-storage, and managed-font adapters. Store only the returned
saved-template identifier in namespaced `localStorage`; do not duplicate the
working package there.

Same-version save/reload is verified. Cross-version saved-draft compatibility
must be tested for every release until an explicit persisted-record migration
contract is published. Keep the imported ZIP or uploaded media authority
available for rollback.

Browser-local managed fonts and IndexedDB records are not cross-device artifacts. Reopened sessions must prepare current exact font and renderer evidence; a saved record is not a portable font licence or readiness certificate.

## Current admission and persistence

The unpublished 2.0.0 candidate exposes V2 host workflows. ZIP sources must declare schema 1.0 and exporter 0.6.1. Canonical packages remain schema 2.2. V1 confirmation/session/persistence workflows are retired, with no migration or deletion of historical stored bytes. Current V2 records retain their own strict compatibility handling.

## Revision and export contract

- Session mutations publish a new revision.
- Export requires current content, operation, materialization, publisher, font, asset and renderer evidence; readiness-only snapshot publication is not a semantic edit.
- Pending or stale identities cannot export.
- `exportPng()` retains the original download behavior.
- `exportPng({ download: false })` returns the same revision-safe PNG result
  without initiating a browser download.
- The host may pass the returned data URL and metadata to an existing storage
  or publishing contract only after a successful current-revision result.

## Versioning and upgrades

The SDK packages use one fixed version. Upgrade `template-core`,
`template-browser`, and `template-react` together, replace every vendored
archive, verify `SHA256SUMS`, update the dependency overrides and lockfile, then
run valid/invalid ZIP, edit/reset, persistence, readiness, PNG, offline, and
network tests.

Studio-only changes require no consumer upgrade. SDK implementation fixes that
preserve public contracts are patches. Additive consumer capabilities are
minor releases. Breaking contracts require explicit migration notes.

## Licensing

The package manifests use `UNLICENSED`. The `sleinity-tools-only` release
policy authorizes use in Sleinity-owned applications only. Repository and
Release visibility do not grant a general public reuse license.

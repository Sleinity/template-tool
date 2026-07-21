# ADR 0004: Shared dynamic geometry path for defaults and edits

## Status

Accepted

## Context

Initial content and edited content must not use separate geometry implementations.

## Evidence

`TemplatePackageEditorPage.tsx` derives the resolved tree from `workingPackage`; field bindings mutate that same package; editor preview and offscreen export both use editor-mode `TemplatePackageRenderer`. Existing now-hiring tests compare imported/default-equivalent content paths.

## Decision

Imported defaults and edited values use the same canonical-package → resolved-tree → editor renderer lifecycle.

## Alternatives

Static imported screenshots or a special edit-only layout path are rejected.

## Consequences

Edits trigger normal resolution/browser layout. Current HUG settlement remains DOM-local and graph instances are not yet shared.

## Compatibility impact

Preserves existing editor and PNG behavior; does not claim static inspection parity.

## Migration impact

Milestones 2–3 must move this lifecycle to one explicit settled graph without changing accepted pixels.

## Verification

Default, equal-value edit, changed edit, clear override, resize, and PNG comparisons on now-hiring.

## Reversal strategy

Keep the current package/resolver/renderer path available behind explicit comparison until replacement evidence passes.

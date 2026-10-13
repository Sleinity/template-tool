# `@sleinity/template-core`

For the current unpublished workspace candidate, use the
[V2 integration guide](../../docs/sdk/V2_INTEGRATION.md). Published 0.8.0
installation/migration instructions describe their historical artifacts;
unchanged package versions do not identify current candidate bytes.

Field Rules V2 authoring uses strict discriminated configuration and
`reconcileTemplateFieldConfigurationV2` for explicit revisioned reconciliation,
not renderer readback. See [Studio and external hosts](../../docs/field-rules/STUDIO_AND_HOSTS.md).

Private framework-neutral SDK for importing a TemplatePackage ZIP, preserving
source provenance, validating the strict canonical package, creating canonical
and resolved projections, and applying typed field values.

This package performs no renderer-time network access and does not export the
Template Studio UI.

`@sleinity/template-core/renderer-internal` is a package-private sibling seam
for `@sleinity/template-react`. It is not a host integration API and carries no
independent compatibility promise. Applications must use the documented core,
browser, and React entries instead.

The canonical package types, schema, diagnostics, ZIP/source reader,
normalization and strict validation are physically owned by this package.
Portable color/asset/axis, layout, stroke, transform and vector models plus the
resolved graph, injected font-readiness, image-placement, backend-decision and
internal primitive-appearance implementations are also physically owned here.
Portable editor-session, field mutation, image replacement/reset, field-rule
validation and measurement-result projection are physically owned here as
well. Their former root paths are checked behavior-free forwarders.

Legacy repository paths are internal compatibility forwarders only. Consumers
must import supported contracts from `@sleinity/template-core`.

## TemplatePackageV2 field semantics

The package exports the strict `TemplatePackageV2` field contract,
`parseTemplatePackageV2()`, `validateTemplatePackageV2()`, and
`normalizeTemplatePackageV1ToV2()`. V2 defines seven discriminated fields,
exact import-resolved bindings, stable choices, portable editor order, opaque
Color values, canonical content-state types, and revision-bound rendered-line
evidence.

`validateTemplateFieldContentStateV1()` validates the separately versioned,
serializable content envelope. `createTemplateFieldContentStateV1()` creates an
immutable sparse revision-zero state. All typed updates dispatch through
`mutateTemplateFieldContentV2()`; the set, select-choice, image-replacement, and
reset helpers are convenience command wrappers rather than separate mutation
authorities.

`materializeTemplateFieldContentV2()` is a pure one-way transformation from the
validated V2 base package plus canonical content state to a cloned ordinary V2
working package. Number formatting and Date presets/affixes, exact indexed Color RGB updates,
Image replacement placement, and single- or multi-target Boolean visibility happen there without
renderer-property readback. `getOrderedHostEditableFieldsV2()` exposes portable
editor order and safe field configuration while omitting imported binding and
source-provenance details.

TemplatePackage 2.2 requires one Image `replacementPlacement`: Fill, Fit, or
Crop. Imported placement remains separate. Crop without host-authored crop data
falls back to Fill; later `setPlacement()` may apply a canonical Crop. Canonical
2.0 and 2.1 inputs are rejected, while loose exporter 1.0 input normalizes at
the source boundary.

The React renderer consumes materialized Boolean visibility through one shared
structural-participation projection. False nodes/subtrees leave supported Auto
Layout before settlement while their canonical descendant state remains intact.
The active host projection retains the controlling Boolean and omits descendant
content controls until their ancestor is enabled again.

`TemplateFieldFamilyContentStateV3` keeps a shared Image asset/default placement
plus sparse per-variant placement-only overrides. Resolution produces an
ordinary package-scoped Image value before materialization; no Family renderer
or asset mutation path exists. Editor Crop uses the same normalized affine
contract as imported Crop and derives cover-within-canonical framing for a new
slot aspect without mutating canonical state.

Hosts use the V2 Browser session rather than passing a V2 package to the legacy
V1 session, and must not edit raw content-state objects as a parallel mutation
path.
See the [Field Rules V2 migration map](../../docs/field-rules/TEMPLATE_PACKAGE_V2_MIGRATION.md).

## Curated entries

- `@sleinity/template-core/editor` — field discovery, mutation, rules,
  constraints, counters, and validation.
- `@sleinity/template-core/family` — portable family identity, shared fields,
  generic groups, matching, typed rule inheritance, validation and selected
  variant materialization.
- `@sleinity/template-core/assets` — portable asset safety, references, and
  source resolution.
- `@sleinity/template-core/fonts` — requirements, readiness, and character
  coverage.
- `@sleinity/template-core/motion` — motion linking, summaries, evaluation,
  and final-frame timing.
- `@sleinity/template-core/inspection` — supported advanced canonical-scene,
  appearance, measurement, dependency, settlement, comparison, and diagnostic
  evidence. These records report existing authority; they do not select or
  replace the renderer.

## ZIP importer

`importTemplatePackage` is the supported importer entry point for consumers.
It accepts ZIP bytes as an `ArrayBuffer` and an optional source filename:

```ts
import { importTemplatePackage } from "@sleinity/template-core";

export async function importTemplateZip(file: File) {
  const result = importTemplatePackage(
    await file.arrayBuffer(),
    file.name,
  );

  if (!result.importable || !result.workingPackage) {
    return {
      ok: false as const,
      diagnostics: result.source.diagnostics,
      validation: result.validation,
    };
  }

  return {
    ok: true as const,
    template: result.workingPackage,
    importedBaseline: result.basePackage,
    source: result.source,
    validation: result.validation,
  };
}
```

The result contains the loaded source evidence, an independent imported
baseline, an editable working package, strict validation results, diagnostics,
and the final `importable` status. Lower-level ZIP-reader, normalization, and
validation exports remain available, but consumers should not orchestrate them
instead of this importer for the normal ZIP flow.

The importer runs directly in a modern browser after `File.arrayBuffer()` and
also runs in Node. It needs no API route, React runtime, runtime environment
variable, secret, DOM, storage, font, or network access. The package has no peer
dependencies. Its `ajv` and `fflate` runtime dependencies are installed
transitively.

## Template Families

`TemplateFamilyV1` does not change or wrap the strict ZIP schema. Each variant
retains an unmodified `TemplatePackageV1`; shared content, bindings, generic
selection properties and sparse per-variant rule overrides live in a separate serializable
definition. `materializeTemplateFamilyVariant()` produces one ordinary package
for the existing session/renderer pipeline and never trims a shared value to
fit one variant.

Use `validateTemplateFamily()`, `resolveTemplateFamilyVariant()`,
`getTemplateFamilyOptionAvailability()`, `getTemplateFamilyControlOrder()`,
`getTemplateFamilyFieldScope()`, `getTemplateFamilyFieldsForVariant()`,
`updateTemplateFamilyContentField()`,
`resolveTemplateFamilyFieldRule()` and
`planTemplateFamilyFieldMatches()` for framework-neutral orchestration. Match
plans keep imported rule differences as reviewable sparse-override suggestions.
Use `parseTemplateFamilyV1()` and `parseTemplateFamilyContentStateV1()` at JSON
trust boundaries. Image defaults use stable family asset references and can be
projected into variants with different package-local asset IDs. The core entry
remains DOM-, React-, storage- and network-free.

Field applicability is derived from bindings. A field may be family-wide,
shared by a subset of variants, or variant-specific; an unbound family field is
invalid. Materialization and rule/content validation skip fields that do not
apply to the selected variant, while the content state retains their values for
later selection. The family mutation helpers add and remove exact targets or
create stable variant-specific and subset-shared fields without persisting a
separate scope property.

Selection properties contain stable option IDs, and every concrete variant
assigns one option for every property. A complete option tuple resolves to at
most one ZIP variant; missing Cartesian combinations are valid. Use
`getTemplateFamilyOptionAvailability()` to disable choices that cannot resolve
with the other current selections without silently changing those selections.
Property-free families use direct variant selection. The optional control order
interleaves every active selector and editable field exactly once.

## Install from GitHub Packages

Configure the scoped registry without committing a token:

```ini
@sleinity:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
```

Then install the exact reviewed version:

```sh
npm install @sleinity/template-core@0.8.0
```

`NODE_AUTH_TOKEN` must be a GitHub personal access token (classic) with
`read:packages`. The token's user must also have read access to the private
package or its linked repository.

## Credential-free archive installation

Hosts and coding agents that cannot inject a private-registry secret use the
checksum-verified archive attached to the public `sdk-v0.8.0` GitHub Release:

1. Verify `sleinity-template-core-0.8.0.tgz` against `SHA256SUMS`.
2. Commit it to the consuming repository under `vendor/`.
3. Declare
   `"@sleinity/template-core":
   "file:vendor/sleinity-template-core-0.8.0.tgz"`.
4. Run `npm install` and commit the lockfile.

No `.npmrc` or GitHub token belongs in the vendored consumer. The release
archive is downloaded from the published GitHub Packages version before it is
attached, so it is not an independently rebuilt artifact.

The packed-core Node verification installs only the package archive, imports it
by package name, loads an inline ZIP, creates resolved/backend projections,
applies text/color/visibility/image edits and field-rule configuration, and
restores imported state without
repository fixtures, and rejects DOM, CSS, storage, font and network global
access. The generated release handoff records the exact archive and declaration
hashes for SDK 0.8.0; consumers should verify those release-derived values
instead of copying a source-worktree checksum.

See the repository's
[installation guide](../../docs/sdk/INSTALLATION.md) for the complete npm and
pnpm archive configuration. The
[SDK capability catalog](../../docs/sdk/SDK_CAPABILITIES.md) maps this package's
root and focused entries to host integration outcomes.

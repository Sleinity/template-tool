# ADR 0096: Host font registry is render and export authority

## Status

Accepted — bounded R01 host integration repair.

## Context and evidence

The retained public-host reproduction uploads an exact face into a supplied
registry. Explicit preparation succeeds, while the ordinary V2 renderer uses
the default registry, reports fonts blocked and rejects PNG. PNG readiness,
embedding and capture independently selected that default too. The baseline and
verification are retained in the [R01 report](../../architecture/host-font-authority.md).

## Decision

The optional V2 renderer and Browser PNG `fontRegistry` input is borrowed.
Omitted/undefined uses the established default; explicit null disables registry
lookup while preserving package font sources. One resolved registry supplies
preparation, readiness, embedding and capture. Renderer-handle PNG options cannot
override it. The adapter is never persisted, disposed or made a font owner.

A committed renderer scope binds session, registry identity, mount lifetime and
the existing native publication lease. Registry replacement invalidates readiness
before paint; abandoned async callbacks cannot publish into a newer scope. Capture
is silent until current scope, operation/content/materialization and render
identity are revalidated. Only then may a result be returned or downloaded.

The committed lease changes a private immutable package shell passed to the
existing renderer. This advances its existing publication generation without
changing canonical data or remounting measurement hooks. Old line observations
are cleared by the existing lifecycle and dependency-valid local measurements
are revalidated before current publication; they are never merely relabelled.

Required exact font bytes must be available for the PNG clone. A previously
activated face cannot justify omitted embedding CSS. Existing font matching,
private families, glyph checks, activation caches, media raster boundaries and
native single/Family publication policies remain authoritative and unchanged.

## Compatibility and migration

The API additions are optional. Existing default and embedded callers retain their
lookup policy and output. There is no schema, persistence or package-version
change. Hosts recreate their own persistent registry when reopening; stable
adapter instances avoid incidental publication changes. No provider, session
constructor or renderer-identity schema gains a registry field.

## Verification and reversal

Deferred reads/raster checkpoints cover registry A/B/A, StrictMode, remount,
session replacement and abandoned export. Packed public single/Family hosts
exercise exact upload, edits, Reset, selection, restore, embedding and PNG; default
and embedded outputs are compared with retained archives. Font/fidelity gates
retain their existing identities and policies. R07 and separately reproduced
in-place Family reload behavior are tracked outside this repair. Invalid storage
bytes remain non-ready; terminal error publication is a separate concern.

Reversal retains the optional input contract and explicit blocked outcomes; it
must not silently route a supplied registry back to the default.

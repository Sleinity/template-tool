# Figma Template Package Pipeline

Template Package ZIP is the only active import format. The ZIP contains
`template.json` plus assets and optional support files. Saved templates use the
current canonical ZIP record shape; historical development-era records are not
deserialized or migrated.

## Current Flow

```text
Figma design
↓
Designer marks editable layers with field:type:id
↓
Figma plugin exports Template Package ZIP
↓
App indexes the ZIP, reads package files safely, and normalizes the source
↓
App validates the loose exporter/source shape, normalizes known variations,
then strictly validates the canonical package and asset references
↓
Semantic renderer previews the package node tree
↓
Generated controls edit a separate working package
```

The package is parsed as data. It is never evaluated as application code.

## Package Responsibilities

A ZIP package can contain:

- `template.json` with canvas dimensions, node tree, editable fields, fonts,
  motion links, renderer hints, and plugin diagnostics
- `assets.json` with canonical asset IDs, aliases, MIME metadata, hashes, and
  ZIP paths
- external image/SVG assets referenced by the manifest
- optional `motion.json`
- optional `mcp.json`
- optional `preview.png` for visual QA

## Validation

Raw exporter data and canonical runtime data use separate contracts. The source
pass establishes that parsed values are safe enough for a known adapter. The
strict `TemplatePackageV1` schema runs after normalization and retains its
additional-property and enum checks. Raw source data is never accepted as
canonical merely because the importer knows how to read it.

Known source repairs include:

- Figma `VIDEO` paints are removed from canonical static fills when a valid
  `IMAGE` fallback exists; the raw paint is retained in node Figma provenance.
- An explicit exporter `none` motion state with no motion file is represented
  canonically by omitting package motion.
- Readable ZIP asset bytes override declared size metadata while retaining both
  values in provenance.

Schema branch failures sharing one paint or union path are coalesced for the
user interface. Raw branch failures remain available in technical details.

Import is blocked for structural or safety failures such as:

- missing or unreadable required package files
- invalid JSON or unsupported schema version
- missing root or broken parent/child references
- node graph cycles
- invalid dimensions or sizing values
- unreadable required asset files
- unsafe embedded data URLs, remote URLs, or active SVG content
- invalid editable field bindings

Optional files, renderer limitations, plugin diagnostics, missing fonts,
unmatched motion nodes, and placeholder-renderable assets remain non-blocking
unless they make the package structurally unsafe.

Package-authored diagnostics describe what the exporter observed. They retain
`plugin`/package provenance but do not directly control current import or PNG
export eligibility. Runtime asset, font, field, renderer, and capture reports
independently determine current capability.

## Asset Identity And Byte Size

`assets.json` manifest IDs, typed package IDs, `asset://` URIs, hash aliases,
template asset bridges, and editable-field references normalize to the existing
typed package asset ID used by the runtime. Original references, manifest path,
and aliases remain provenance. Node usage remains separate from asset identity,
so one stored image can serve several nodes without collapsing their geometry.

The exact bytes read from a ZIP entry are authoritative for ingestion and
renderability. Manifest `byteSize` is declared metadata. A readable mismatch is
reported as `ASSET_BYTESIZE_MISMATCH`, including declared bytes, actual bytes,
and their difference, but does not make an otherwise safe, ingested asset
missing or export-blocking.

The upstream Figma exporter must calculate manifest byte size from the exact
`Uint8Array` passed to its ZIP writer. It must not use base64 length, string
length, a Blob wrapper, or a pre-transform buffer. The exporter implementation
is not part of this repository, so this consumer retains mismatch tolerance and
the two strict real-ZIP fixtures protect backward compatibility until that
producer is updated.

The exporter must also exclude unsupported Figma paints such as `VIDEO` from
canonical static fills, retain them as Figma provenance, and emit a static
image fallback when available. The exporter implementation is not contained in
this repository, so the consumer adapter remains required for older packages.

## Bundled Figma Source

When `mcp.json` contains a valid Figma design URL, bundle loading extracts the
URL, file key, normalized colon-form node ID, document label, and root-match
status. Source precedence is explicit user override, bundled `mcp.json`, other
canonical source metadata, then no source. Bundled metadata is promoted into
the normalized package and saved source record without requiring the user to
paste the link again.

Live enrichment remains optional and server-side. Provider failure keeps the
normalized ZIP package authoritative and does not block import or rendering.
The renderer consumes persisted normalized graph data and never fetches Figma.

## Font And Export Readiness

Font metadata and `FONT_BINARY_NOT_INCLUDED` do not prove either availability
or failure. Exact application and managed faces are verified through the font
loading API. Confirmed replacements and approved fallbacks must also verify in
the current environment. Font readiness records both visual fidelity and
deterministic export eligibility: an approved verified fallback is export-ready
with a warning, while an unresolved required face blocks PNG export.

PNG readiness consolidates current asset, font, field, and renderer capability.
Large/externalized/deduplicated assets, optional MCP/preview files, exporter
notices, and readable byte-size mismatches do not block by themselves.

## Editing

The editor keeps:

- an immutable original package
- a separate working package

Text, textarea, image, color, and visibility bindings update the working
package and semantic preview. Saved templates use `package-zip` source metadata
and preserve managed assets without storing raw ZIP bytes or Blob URLs.

## Export Roadmap

PNG export is available from the editor at native package resolution. MP4 export
is still a future milestone.

The previous JSX, RTF, pasted-source, and raw-package import paths have been
removed. Unsupported development-era saved records are rejected with an
instruction to clear local data and re-import the source ZIP; they are never
silently interpreted as current ZIP records.

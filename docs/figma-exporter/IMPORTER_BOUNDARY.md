# Current Figma Exporter to Template Tool Import Boundary

> Repository baseline revision: `944c51b33433ce2e37ec05f7de66457d5154d5b4`
> Audit and implementation date: 2026-08-31
> Relevant packages: `@sleinity/template-core` 0.8.0,
> `@sleinity/template-browser` 0.8.0, `@sleinity/template-react` 0.8.0

This document describes consumer behavior at the repository revision above. It
must be refreshed when ZIP ingestion, source normalization, canonical
validation, asset ingestion, or related import compatibility changes
materially. It is a read-only compatibility reference, not a new exporter or
package contract.

## 1. Purpose, authority, and non-goals

The Template Tool implementation is the downstream authority for this audit.
The independently developed Figma exporter does not need to emit the exact
TypeScript shape of `TemplatePackageV1` at every point because the consumer has
an intentional source compatibility layer before strict validation:

```text
Figma exporter
  -> source ZIP and exporter-shaped JSON
  -> ZIP/source compatibility boundary
  -> normalized strict TemplatePackageV1
  -> browser-owned asset/font/enrichment work
  -> canonical scene, resolved tree, editor, renderer, and SDK
```

Two questions must remain separate throughout this document:

1. **Does the importer accept it today?** This includes historical values that
   the importer repairs, preserves only as provenance, or tolerates for
   compatibility.
2. **Should a new exporter deliberately produce it?** New output should prefer
   direct, unambiguous source semantics even when older representations remain
   readable.

`Accepted today` therefore does not mean `recommended for new exporter
output`. In particular, a version-specific repair is evidence of a consumer
compatibility obligation, not a producer pattern to copy.

This document does not redesign `TemplatePackageV1`, relax its schema, define a
new ZIP version, change renderer support, or plan exporter implementation work.
Current code wins if historical roadmap prose differs. Such differences are
called out rather than silently rewriting the renderer-fidelity charter.

## 2. Pipeline overview

### Actual current path

1. [`readZipCentralDirectory`](../../packages/template-core/src/bundle/zipReader.ts)
   reads classic ZIP central-directory records and reports structural,
   encryption, and compression diagnostics.
2. [`loadTemplatePackageZipBundle` and `indexTemplatePackageBundleFiles`](../../packages/template-core/src/bundle/loadTemplatePackageBundle.ts)
   normalize paths, classify entries, enforce bundle-wide limits, and build the
   file index.
3. [`ZipBundleReader`](../../packages/template-core/src/bundle/zipBundleReader.ts)
   reads individual stored or DEFLATE entries with archive and per-entry safety
   limits, exact decompressed-size checks, and fatal UTF-8 decoding for text.
4. [`loadTemplatePackageBundleSource`](../../packages/template-core/src/bundle/loadTemplatePackageBundleSource.ts)
   reads `template.json`, `assets.json`, optional motion/MCP JSON and
   `preview.png`; it retains both raw and normalized template values.
5. [`validateTemplatePackageBundleSource`](../../packages/template-core/src/bundle/sourceContract.ts)
   checks only whether raw exporter data is readable enough to adapt. This is
   deliberately not canonical validation.
6. [`normalizeTemplatePackageBundleTemplate`](../../packages/template-core/src/bundle/normalizeTemplatePackageBundle.ts)
   applies known source repairs, inference, compatibility extraction, and
   provenance attachment.
7. [`parseTemplatePackage`](../../packages/template-core/src/parseTemplatePackage.ts)
   accepts schema version `1.0`, clones it through the currently no-op V1
   migration, and calls strict validation.
8. [`validateTemplatePackage`](../../packages/template-core/src/validateTemplatePackage.ts)
   applies the strict JSON schema and then graph, layout, asset, field, font,
   mask, and motion semantic checks.
9. [`importTemplatePackage`](../../packages/template-core/src/importTemplatePackage.ts)
   exposes the framework-neutral core result: loaded-source evidence, imported
   baseline, working package, validation, and `importable`.
10. [`buildZipPackageImportResult`](../../packages/template-browser/src/import/runTemplatePackageImportPipeline.ts)
    adds browser-runtime work: ZIP asset persistence, managed-font auto-linking,
    optional enrichment, revalidation, and layered diagnostics.
11. Downstream code derives `CanonicalSceneGraphV1`, `ResolvedRenderTreeV1`,
    routed settlements, backend decisions, editor state, and export readiness
    from the validated working package. These are consumer outputs, not ZIP
    authoring surfaces.

### Authority by layer

| Layer | What exists there | Authority |
| --- | --- | --- |
| Exporter/source representation | ZIP entries, raw `template.json`, raw `assets.json`, source-only keys, plugin diagnostics, `renderHints`, `tokens`, raw Figma extensions | Evidence supplied by the producer; not automatically canonical |
| Importer compatibility layer | Source checks, aliases, external-asset placeholders, paint/font/motion repairs, MCP promotion, extracted source extras | Consumer-owned interpretation of known exporter variance |
| Canonical runtime representation | Strictly validated `TemplatePackageV1`, including canonical nodes, fields, assets, font requirements, source, motion, masks, `rendererHints`, and permitted extensions | Durable semantic input to downstream consumers |
| Runtime-derived information | Persisted asset URLs/hashes, font links/private families, generated hints, verification, effective field bindings, scene/resolved/settled graphs, diagnostics projections, export readiness | Consumer-created; an exporter must not try to author it as settled truth |

The loader exposes these layers separately through `rawTemplateJson`,
`normalizedTemplateJson`, `originalPackageValue`, `packageValue`,
`compatibility`, bundle diagnostics, package diagnostics, the asset registry,
and optional preview/MCP evidence.

## 3. ZIP structure and safety

### File handling

| ZIP entry | Current classification | Handling and authority |
| --- | --- | --- |
| `template.json` | Required; runtime-authoritative after normalization and validation | Must be readable UTF-8 JSON. Read/parse failure is blocking. Its raw value is source evidence; only the normalized, strictly validated result becomes canonical. |
| `assets.json` | Contract-required with one narrow compatibility exception | Normally must contain an `assets` array. If `template.json`, nodes, paints, fields, preview reference, and `assets/` prove there are no asset declarations or references, the loader synthesizes an empty import-time registry and emits informational diagnostics. |
| `assets/*` | Optional as a directory; authoritative bytes when referenced | Indexed as asset files. Bytes are read only through safe normalized paths. During browser ingestion, actual bytes determine hash and size and may be persisted to managed storage. Unreferenced files do not become canonical assets automatically. |
| `motion.json` | Optional/compatibility | Read when present or when `template.json` points to another motion path. Invalid optional JSON warns. Missing explicitly referenced motion warns. Linked motion is copied into canonical `motion`. |
| `mcp.json` | Optional provenance/enrichment input | A valid Figma URL may populate canonical source URL/file key/MCP status. Invalid or absent data does not require live Figma and does not block deterministic rendering. Raw data remains loaded-source evidence. |
| `preview.png` | Optional source/QA reference | PNG header dimensions and ZIP byte size are recorded. It is not an approved renderer golden and is not automatically inserted into canonical `assets` or `referencePreview`. |
| Directories | Ignored | Directory entries are not added to the file map. |
| Unknown files | Ignored by the package contract with an info diagnostic | Indexed as `unknown`, but not parsed or promoted to runtime authority. |

The bundle constants still list both `template.json` and `assets.json` as
required. The asset-free omission is a later, narrowly guarded normalization in
`loadTemplatePackageBundleSource`; it is not permission to omit a manifest when
any asset dependency exists.

### ZIP restrictions

- Default bundle index limit: 500 central-directory entries.
- Default total declared uncompressed limit: 100 MiB.
- Default readable archive limit: 150 MiB.
- Default per-entry compressed limit: 50 MiB.
- Default per-entry uncompressed limit: 100 MiB.
- Supported compression methods: stored (`0`) and DEFLATE (`8`).
- Encrypted entries and multi-disk archives are rejected.
- The reader implements classic 32-bit ZIP directory records; ZIP64 is not a
  documented supported format.
- Empty names, NULs, backslashes, absolute paths, Windows drive paths, and any
  `..` segment are unsafe. `.` and empty path segments are removed.
- Duplicate entries are detected after path normalization. The first indexed
  file remains; the duplicate produces a blocking diagnostic.
- Local-header bounds/signature and compressed-byte ranges are checked before
  decompression. Expanded length must exactly match the central-directory
  declaration.
- Text entries use fatal UTF-8 decoding. Required `template.json` read/parse
  failures are errors; optional motion/MCP parse failures are warnings.

## 4. Exporter compatibility matrix

Recommendation meanings: **Preferred** is the unambiguous representation a new
exporter should choose; **Accepted** is valid but not uniquely preferred;
**Legacy-tolerated** exists for compatibility and should not be copied;
**Provenance-only** may be emitted as retained Figma evidence but is not a
runtime capability; **Unsupported** cannot become a valid current package
without another supported representation or coordinated change.

### Assets

| Exporter/source value | Accepted today? | Import behavior | Canonical result | Provenance retained? | Recommended for new exporter output? | Candidate producer improvement? |
| --- | --- | --- | --- | --- | --- | --- |
| Package asset `source: "external"` with `path`/`src` | Yes | Converted before strict validation to `source: "stored"`; `storageKey` initially uses `path`, `src`, or asset ID | Stored placeholder, later replaced with managed storage identity when bytes ingest | Yes, under `extensions.bundleSource` | **Accepted current source representation**. Canonical `stored` describes downstream storage semantics and should not be copied merely to resemble the runtime type. | Emit precise paths/bytes now; changing producer asset-source semantics requires deliberate review. |
| Canonical `source: "stored"` with `storageKey` or `stableUrl` | Yes | Passes normalization; browser ingestion may replace it with the actual managed record | Stored asset | Yes | **Accepted** when the value is genuinely consumer-managed; not a claim an independent exporter can make | B if the producer wants to author storage identity |
| `path`, `src`, aliases, `byteSize`, rendered dimensions on package assets | Yes | Removed from the strict asset surface and copied to `extensions.bundleSource` | Not canonical asset fields, except `byteSize` may become `sizeBytes` for external assets | Yes | **Accepted** as source bridge metadata | A for accuracy/simplification |
| Manifest `byteSize` or legacy `sizeBytes` | Yes | Parsed as declared metadata and compared with ZIP entry size | Actual ingested bytes set canonical `sizeBytes`; mismatch is informational | Both declared and actual retained after ingestion | **Preferred** when computed from the exact written byte array | A |
| Manifest `path` | Yes, if safe and present | Normalized and required to resolve to a readable ZIP entry for successful ingestion | Managed stored asset after ingestion | Original and normalized paths retained | **Preferred** | A |
| Manifest `src`, `hash`, aliases | Yes | Indexed as alternative resolution keys | Canonical asset identity stays the package asset ID | Yes | **Accepted**; emit only real, stable aliases | A |
| `asset://...` reference | Yes | Scheme is stripped for lookup; aliases/hashes may match | Resolves to the existing canonical package asset | Original ref remains in source/bridge evidence | **Accepted**, though typed package IDs are clearer inside canonical fields | A |
| Typed ID such as `asset:image:<hash>` | Yes | Exact ID/alias lookup, then typed hash lookup | Existing typed canonical asset | Yes | **Preferred** for canonical package references | A |
| Manifest ID different from canonical typed asset ID | Yes | Package `src`/path/alias/hash bridge resolves to the manifest entry | Canonical typed ID is retained | Manifest ID retained in bundle provenance | **Accepted**, but simplify when possible | A |
| Multiple nodes using one physical asset | Yes | Usage is collected separately; persistence deduplicates storage by hash | One asset can serve multiple node placements | Usage and node-specific geometry remain separate | **Preferred** | None required |
| Declared asset with no resolvable/readable ZIP file | Partially; import is not safely complete | Missing file warns at registry time; unreadable required bytes can error and downstream readiness remains unresolved | Placeholder may validate, but ingestion/render readiness is incomplete | Yes | **Unsupported** for intentional new output | A |

### Appearance, images, masks, and effects

| Exporter/source value | Accepted today? | Import behavior | Canonical result | Provenance retained? | Recommended for new exporter output? | Candidate producer improvement? |
| --- | --- | --- | --- | --- | --- | --- |
| SOLID RGB plus paint opacity | Yes | Preserved unless the bounded 0.6.0 compatibility rule applies. Exact Figma exporter 0.6.1 alpha-1 plus paint-opacity source can derive separate renderer-internal native capability evidence without a repair record. | Canonical SOLID; no synthetic `solid-paint-source-v1` for clean 0.6.1 input | Yes | **Preferred**: RGB color alpha 1 with transparency in paint opacity when matching Figma semantics | A |
| Exporter 0.6.0 mirrored `color.a === opacity` without same-index raw paint | Yes | Under exact finite/unit/equality predicate, color alpha becomes 1 and opacity applies once; `solid-paint-source-v1` records both values | Corrected canonical SOLID | Fully | **Legacy-tolerated**, not recommended | A |
| Exporter 0.6.0 differing color alpha/opacity | Schema-dependent but not normalized as an alias | Values remain separate and provenance marks ambiguity | Canonical values remain but routed stack authority may reject them | Fully | **Unsupported** as deliberate ambiguous output | A |
| Same-index `extensions.figma.rawFills` SOLID | Yes | Valid raw paint opacity owns normalization; conflicts are diagnosed | Canonical SOLID plus source record | Fully | **Provenance-only** alongside a correct canonical SOLID | D |
| Canonical `GRADIENT_LINEAR` with stops/transform aliases | Yes | `gradientStops`/`stops` and `gradientTransform`/`transform` are paired with same-index raw evidence; missing canonical values may be hydrated. Complete 0.6.1 canonical/raw values must agree exactly; comparison tolerance is not widened. | Canonical gradient plus `linear-gradient-source-v1` | Fully, including conflicts | **Preferred** to emit complete canonical values; raw data may remain provenance | A/D |
| Radial/angular/diamond gradients | Schema accepts | Preserved canonically, but current runtime support is capability-limited | Canonical paint | Yes | **Provenance-only** unless downstream capability is sufficient | C/D |
| `VIDEO` paint with IMAGE or node-image fallback | Yes before strict validation | VIDEO is removed from canonical fills and preserved as unsupported Figma paint; static IMAGE remains | Static canonical image rendering | Yes | **Legacy-tolerated**; new output should emit the static canonical IMAGE and retain VIDEO only as provenance | A/D |
| `VIDEO` without static fallback | Readable, but visually incomplete | Removed from canonical fills and warned | No static canonical paint for the video | Yes | **Unsupported** | A or C |
| Other unsupported paint types, for example SHADER | Readable before strict validation | Removed from strict fills and stored in `extensions.figma.unsupportedPaints` | No canonical paint owner for that entry | Yes | **Provenance-only** with an explicit supported fallback; otherwise **Unsupported** | C/D |
| IMAGE paint plus node `image` payload | Yes | References are collected from both; resolved runtime chooses current media intent | Canonical image paint/payload | Yes | **Preferred** when internally consistent | A |
| `scaleMode` and `imageTransform` | Yes | Preserved separately; `imageTransform` is active only for CROP, inapplicable provenance for FILL/FIT/TILE | Canonical source placement intent | Yes | **Preferred** when semantics follow the Figma API | A |
| Stroke alignment and independent corners | Yes within schema | Preserved; exact runtime ownership is capability-gated by geometry/paint evidence | Canonical appearance | Raw Figma details may remain in extensions | **Accepted** | C for unsupported stroke families |
| Node `mask.isMask` plus package `maskRelationships` | Yes | Strict validation requires declared, same-parent ordered scope; no inference from names/order | Canonical mask intent and relations | Yes | **Preferred** for masks | A for correct declarations; C for richer masks |
| `maskType` alone or extension-only mask hints | Yes as evidence, not as an active relation | Does not classify or infer a mask scope | No active canonical mask relationship | Yes | **Provenance-only** | D |
| Effects and non-NORMAL blend evidence | Schema accepts bounded effect shapes | Preserved, but runtime support remains capability-specific | Canonical appearance evidence | Yes | **Accepted** only with truthful downstream support expectations | C/D |

### Text and fonts

| Exporter/source value | Accepted today? | Import behavior | Canonical result | Provenance retained? | Recommended for new exporter output? | Candidate producer improvement? |
| --- | --- | --- | --- | --- | --- | --- |
| Single-style text with family/style/weight/PostScript metadata | Yes | Strictly validated and used for font inference/matching | Canonical text payload | Yes | **Preferred** | A |
| Mixed `styleRanges` | Yes | Bounds and existing fields are validated and preserved unchanged. They participate in per-face collection but are not replaced when explicit requirements exist. | Canonical style ranges | Yes | **Accepted**; completeness matters | A/C |
| Missing or empty `fontRequirements` | Yes when inferable | Inferred from text nodes and editable text targets | Canonical inferred requirements with `source: "figma-inferred"` | Inference is diagnosed; text remains source evidence | **Legacy-tolerated** | A |
| Exporter-authored complete `fontRequirements` | Yes | Preserved; importer does not replace a non-empty declaration | Canonical requirements | Yes | **Preferred** | A |
| `extensions.figma.textStyleSegments` | Yes | Preserved as rich Figma source evidence and included in scene unmapped/provenance reporting | No new canonical text semantics | Fully | **Provenance-only** | D |
| Metadata-only font requirement without binary | Yes | Managed registry later attempts exact/compatible/replacement matching | Canonical request; resolution is runtime-derived | Yes | **Accepted** | D unless embedding is coordinated |
| `resolution`, managed font ID, private runtime family | Schema can store consumer records | Browser owns and updates these based on verified binaries/revisions | Runtime-managed font resolution | Yes | **Unsupported** for independent exporter authorship | D |
| Outlined SVG text fallback | Yes when it references an SVG/vector asset | Validated; editable live text remains authoritative for editable nodes | Canonical fallback | Yes | **Accepted** for explicit fallback, not as a substitute for editable text semantics | C/D |

### Package/source and compatibility-only top-level data

| Exporter/source value | Accepted today? | Import behavior | Canonical result | Provenance retained? | Recommended for new exporter output? | Candidate producer improvement? |
| --- | --- | --- | --- | --- | --- | --- |
| `schemaVersion: "1.0"` | Accepted source input | The existing installed V1 importer remains active until the Milestone 2 runtime cutover. The new `parseTemplatePackageV2` boundary validates V1 and normalizes unambiguous fields once into strict V2. | Source V1 today; strict canonical V2 through the explicit new boundary | Yes, including preserved legacy field provenance and normalization diagnostics | **Legacy source-compatible**; new canonical integrations target V2 | B |
| `schemaVersion: "2.2"` | Accepted by the explicit V2 boundary | Strict discriminated field schema; type-qualified IDs; singular Image replacement policy; exact typed bindings and portable field order | Canonical V2 | Yes | **Current target contract** | B |
| `schemaVersion: "2.0"` / `"2.1"` | Rejected | Older canonical contracts are not reinterpreted because Image replacement semantics changed | None | No | Re-export or reimport from loose 1.0 source | B |
| `source.type: "figma"`, `packageContract`, `pluginVersion` | Yes | Preserved; plugin version can select bounded compatibility or native capability logic | Canonical source metadata | Yes | **Preferred**, accurate and stable. Filename suffixes are informational only. | A |
| Figma `fileKey`, URL, document/page/root IDs, `exportedAt` | Yes when within the strict source shape | Preserved; bundled/user Figma URL may supplement file key/MCP status | Canonical source metadata | Yes | **Preferred** when accurately captured | A |
| Unknown `source` properties such as exporter mode/MCP flags | Yes at source boundary | Removed before strict validation and returned as `compatibility.sourceExtras` | Not canonical | Yes on loaded-source result | **Provenance-only** | D or B if runtime meaning is desired |
| Top-level `renderHints` | Yes | Removed before strict validation and exposed as compatibility data | Not canonical; does not become `rendererHints` | Yes on loaded-source result | **Legacy-tolerated** | B or stop producing |
| Top-level canonical `rendererHints` | Yes | Preserved; browser-generated hints fill gaps while authored hints win on key collision | Canonical runtime hints | Yes | **Accepted**, but avoid claiming settled geometry | D/B |
| Top-level `tokens` | Yes | Removed before strict validation and attached to loaded-source compatibility data | Not canonical/runtime-evaluated | Yes | **Provenance-only** | D or C |
| Plugin-authored `diagnostics` | Yes | Extracted and preserved separately from consumer diagnostics | Canonical package diagnostics | Yes | **Accepted** as producer observations | D |
| `mcp.json` with valid Figma URL | Yes | URL/file key/node ID/root match are extracted and source fields supplemented | Canonical source metadata plus loaded-source evidence | Raw MCP retained | **Accepted** | D |
| Figma Variables, modes, component/style IDs, JSON REST evidence in extensions | Yes where extensions permit JSON data | Preserved and projected as provenance/relationships; not evaluated as live design-system semantics | Usually extension/canonical-scene provenance | Yes | **Provenance-only** | C/D |

### Fields, motion, previews, and families

| Exporter/source value | Accepted today? | Import behavior | Canonical result | Provenance retained? | Recommended for new exporter output? | Candidate producer improvement? |
| --- | --- | --- | --- | --- | --- | --- |
| Explicit editable field ID/type/node/property/default | Yes when valid | Strict validation checks uniqueness, target, property compatibility, default type, and referenced image assets | Canonical binding | Yes | **Preferred** | A |
| `assetRef`, `typedRef`, `refType` on image fields | Yes | Included in asset dependency and resolution checks | Canonical field metadata | Yes | **Accepted**; one unambiguous reference is preferable | A |
| Field constraints and behavior | Yes within schema | Preserved; semantic validation warns on cross-type constraints and rejects invalid ranges/patterns | Canonical field rules | Yes | **Accepted** | A |
| Figma layer name `field:type:id`, with the exporter emitting a matching explicit `editableFields` entry | Yes | The naming convention remains source-side authoring intent; the explicit exported binding is strictly validated | Canonical explicit editable-field binding | Layer name and binding both remain | **Preferred**. The layer-name convention may remain how the plugin defines fields, while the package should include explicit bindings. | A |
| Layer name `field:type:id` with explicit `editableFields` absent | Yes downstream | `getEffectiveEditableFields` can discover a session/editor binding; initial core import does not silently rewrite raw canonical fields | Runtime-effective derived binding, not an explicit imported binding | Marker remains node identity | **Accepted fallback, not preferred for new package output** | A: export the explicit binding derived from the authoring marker. |
| Motion object with `file` and legacy `linking.status: "matched"` | Yes at source boundary | File content is attached; status becomes `pass`; source-only `file` is removed | Canonical motion | Yes through source/raw motion | **Legacy-tolerated** | A |
| Explicit static motion (`status: "none"`, no file/data) | Yes | Whole motion object is omitted canonically | No canonical motion | Diagnostic records normalization | **Accepted**, but omitting motion is simpler | A |
| `preview.png` | Yes | Header/dimensions become QA evidence only | No automatic canonical preview | Yes | **Preferred** as source QA evidence, not as a downstream compatibility claim | D |
| `referencePreview` in `template.json` | Yes | Strictly validated; asset ID must resolve | Canonical reference metadata | Yes | **Accepted** | D |
| Exporter-authored family/variant model | Not through package ZIP import | Current family infrastructure wraps independently imported packages and creates host-owned family IDs, bindings, groups, rules, and content | No direct promotion from Figma components/variants | Figma component data may remain extensions | **Unsupported** as direct family input | B/C |

## 5. Compatibility repairs and inference

### Core source normalization

| Repair/inference | Function and trigger | Source to normalized value | Provenance and diagnostic | Rendering effect and producer implication |
| --- | --- | --- | --- | --- |
| Empty manifest synthesis | `loadTemplatePackageBundleSource`; `assets.json` absent and every asset declaration/reference check is empty | Missing file to `{version:1, assets:[]}` registry | `bundle.asset-manifest-omitted-empty`, `ASSETS_JSON_OMITTED_EMPTY` | None for truly asset-free packages. New exporters should normally include an exact empty manifest. |
| External asset placeholder | `normalizeExternalAssets`; package asset source is `external` | `stored`, with `storageKey=path ?? src ?? id`; `byteSize` maps to `sizeBytes` | Source fields move to `extensions.bundleSource`; `EXTERNAL_ASSET_COMPAT_NORMALIZED` | Enables strict validation before bytes are persisted. `external` is an accepted current producer representation; canonical `stored` is downstream storage semantics, so changing the producer representation requires deliberate review. |
| Unknown/source-only asset fields | `moveUnknownAssetFields`; keys outside strict asset shape or explicit bridge keys | Removed from strict surface | Copied to `extensions.bundleSource` | Does not itself change pixels; preserves alias/path evidence. |
| Unsupported paints | `normalizeUnsupportedPaints`; fill type outside canonical paint set | Entry removed from canonical `fills` | Exact entry/index stored in `extensions.figma.unsupportedPaints`; `UNSUPPORTED_PAINT_PRESERVED` or VIDEO codes | Removes an invalid strict paint. Pixels depend on a supported fallback; producers should emit one explicitly. |
| VIDEO static fallback | Same function; unsupported entries are VIDEO and IMAGE/node-image fallback exists | VIDEO removed, supported image remains | `VIDEO_PAINT_STATIC_FALLBACK_NORMALIZED` | Static rendering keeps the image. New exporters should not rely on repair. |
| VIDEO without fallback | Same function; VIDEO only and no static image | VIDEO removed with no replacement | `VIDEO_PAINT_REMOVED_WITHOUT_FALLBACK` | Static pixels are missing; unsupported new output. |
| Exporter 0.6.0 SOLID opacity | `normalizeSolidPaintOpacity`; exact Figma/0.6.0/version/equality or raw-paint predicate | Mirrored alpha canonicalizes to color alpha 1 and paint opacity once; raw paint can own opacity | `solid-paint-source-v1`; `SOLID_PAINT_OPACITY_ALIAS_NORMALIZED`, `SOLID_PAINT_RAW_OPACITY_CANONICALIZED`, or conflict/ambiguity codes | Corrects double-opacity risk and affects paint semantics. Producers should emit direct unambiguous opacity, not the repaired alias. |
| Linear-gradient pairing | `normalizeLinearGradientPaints`; canonical and same-index raw fill are both linear | Missing canonical stops/transform may be hydrated; aliases and raw data are compared | `linear-gradient-source-v1`; `LINEAR_GRADIENT_CANONICALIZED` or `LINEAR_GRADIENT_SOURCE_CONFLICT` | Enables the bounded gradient owner only when evidence is coherent. New exporters should emit complete canonical semantics. |
| Missing font requirements | `inferMissingFontRequirements`; requirements absent/empty and text faces are discoverable | Per-family/weight/style requirements synthesized, including mixed ranges and editable use | `FONT_REQUIREMENTS_INFERRED`, requirements marked `figma-inferred` | Affects font setup/readiness. Explicit complete requirements are preferred. |
| Static motion normalization | `normalizeMotion`; explicit no-motion state with no file/data/source motion flag | `motion` deleted | `STATIC_MOTION_STATE_NORMALIZED` | Static behavior unchanged. |
| Legacy motion link status | `normalizeMotion`; `linking.status === "matched"` | Status becomes `pass`; source `file` removed | `BUNDLE_NORMALIZATION_WARNING` | Motion linking semantics become canonical. |
| Bundled MCP source | `attachBundledFigmaSource`; readable `mcp.json` Figma URL | Supplements source type, URL, file key and MCP status | Raw MCP plus `BundledFigmaSource`; `MCP_FIGMA_SOURCE_DETECTED` or invalid-URL diagnostic | No renderer-time network dependency; enrichment remains optional. |
| Unknown source metadata | `normalizeSource`; source keys outside strict allowlist | Removed from canonical source | Returned as `compatibility.sourceExtras`; `BUNDLE_SOURCE_METADATA_ATTACHED` | No direct rendering effect. Keep Figma-only evidence as provenance. |
| `renderHints` extraction | `normalizeRenderHints`; top-level key exists | Removed from normalized package | Returned as compatibility data; `RENDER_HINTS_COMPAT_NORMALIZED` | Does not become canonical `rendererHints`. |
| `tokens` extraction | `normalizeTokens`; top-level key exists | Removed from normalized package | Returned as compatibility data; `TOKENS_ATTACHED` | No current live variable/token evaluator. |

Normalization clones the raw input and is intended to be idempotent for
already-provenanced paint records. `originalPackageValue` is captured after
normalization/validation (and after motion linking), not as a clone of the raw
exporter JSON.

### Asset registry and browser ingestion

`parseBundleAssetsManifest` accepts manifest `byteSize` or `sizeBytes`,
`sourceNodeId` or `nodeId`, and optional file/usage metadata. Entry IDs and
types are required. Paths must be safe and should exist. MIME type inferred
from the extension is compared with the declaration.

`BundleAssetRegistry.resolve` tries exact ID/alias/path/src/hash, stripped
`asset://`, typed asset hash, package bridge `src`/path, and hash candidates.
Colliding aliases/paths/refs warn and the first indexed owner remains.

`ingestLoadedSourceBundleAssets` is later and browser-owned. For each canonical
asset it resolves the manifest entry, reads the actual bytes, selects the
manifest or package hash or computes one, deduplicates storage by hash, and
updates canonical size, MIME, dimensions, usage, hash, storage identity, and
`extensions.bundleSource`. `ASSET_BYTESIZE_MISMATCH` is informational because
actual readable bytes win; declared and actual sizes both remain visible.

### Font linking and enrichment

After assets ingest, `autoLinkManagedFonts` may attach app-owned resolution
metadata backed by verified managed font records. `enrichTemplatePackage`
then derives renderer hints, asset strategy, verification/coverage, optional
metadata comparison, and source URL evidence. Generated renderer hints are
merged first and existing canonical `rendererHints` override them. These steps
are runtime-derived and must not be confused with source normalization.

## 6. Canonical versus provenance

| Classification | Examples | Exporter rule |
| --- | --- | --- |
| Runtime-authoritative canonical data | Validated canvas, node graph/order, bounds/layout/sizing, text, image placement intent, canonical paints/strokes/effects, explicit fields, assets, font requests, motion, mask relations, source identity, `rendererHints` | Emit accurate semantics and references. Passing the schema alone does not prove renderer support. |
| Figma provenance | `extensions.figma`, raw fills, transforms, raw unsupported paints, Variables/styles/components, Figma node IDs, source diagnostics | Preserve source truth; do not claim it owns pixels unless a current capability route says so. |
| Compatibility metadata | `renderHints`, `tokens`, source extras, external-asset bridge fields, manifest aliases, 0.6.0 serialized opacity evidence | May remain readable for history. Do not choose it for new output merely because the importer repairs it. |
| Derived runtime metadata | Managed asset storage keys/URLs/hashes, font resolution/private families, generated hints, asset strategy, verification, effective marker-derived fields, canonical scene, resolved tree, settlements, backend decisions, diagnostic projection, readiness | Never author as if the exporter had observed current consumer state. Let this repository derive it. |

Additional distinctions:

- Package/plugin diagnostics report producer observations. Consumer bundle,
  validation, asset, font, renderer, field, and export diagnostics independently
  decide current readiness.
- `preview.png` is source evidence. Fidelity candidates and approved renderer
  references are separate, hash-gated harness artifacts.
- `CanonicalSceneGraphV1` is a backend-neutral projection of validated
  `workingPackage`, not exporter input and not the full settled graph.
- `ResolvedRenderTreeV1`, capability routes, primitive/media owners, and
  settlements are disposable runtime projections and can change when content,
  fonts, assets, bounds, or revisions change.
- `field:type:id` is a valid Figma authoring convention and may be the plugin's
  source-side mechanism for defining a field. The preferred exported package
  contains the resulting explicit `editableFields` binding. Only when that
  binding is absent does consumer code fall back to downstream marker discovery
  through effective fields.
- Template families are host-owned aggregates of independently imported
  packages. Figma components, variants, and variables may inform future family
  work but do not currently author family records through this ZIP boundary.

## 7. Producer responsibility boundary

### What the independent exporter can test truthfully

- The ZIP writer produced the intended entry names and both required JSON
  documents (including an empty `assets.json` when there are no assets).
- JSON serialization succeeds and values are finite/serializable.
- Every node dictionary key equals its node ID; root, parent, children, and
  ordering are internally consistent and acyclic.
- Absolute/relative bounds and layout values were captured from the intended
  Figma nodes without losing source values.
- Every package/field asset reference has a deliberate manifest bridge, every
  manifest path is safe, and every referenced path exists in the written ZIP.
- Manifest byte size is calculated from the exact final `Uint8Array` passed to
  the ZIP writer, not from base64/string/blob or a pre-transform buffer.
- Manifest MIME, dimensions, hash, aliases, and source-node identity describe
  the file that was actually written.
- Explicit editable field IDs are unique, targets exist, properties/types
  agree, image defaults resolve, and constraints are internally coherent.
- Raw Figma paint, mask, text, font, variable, component, motion, and source
  metadata were captured successfully and remain distinguishable from
  canonical semantics.
- A static preview can be generated for source-side QA and its dimensions match
  the intended export root.

The exporter can also run its own fixtures against a copied, version-anchored
description of these rules. That still is not a downstream compatibility test.

### What requires this repository

The independent exporter cannot truthfully guarantee the following without
running the relevant Template Tool revision:

- equivalence after the current compatibility normalizer;
- acceptance by the strict schema and semantic validator;
- historical importer and alias behavior;
- browser asset persistence, deduplication, decoding, and offline restoration;
- managed-font parsing, exact face matching, linking, glyph coverage, private
  runtime identity, and fallback readiness;
- Studio import, validation, field, editor, family, or save/reload behavior;
- current canonical-scene/resolved/backend routing and capability fallback;
- renderer fidelity across Validate, Fields, editor, and PNG export;
- current export readiness, revision guards, or hidden-raster stabilization;
- host integration through the published SDK packages.

Compatibility claims should therefore name the downstream repository revision,
fixture ZIP hash, tests/surfaces exercised, and whether evidence was automated
or personally browser-verified.

## 8. Producer-side improvement classifications

This is classification only, not an implementation roadmap.

| Opportunity | Class | Boundary note |
| --- | --- | --- |
| Exact final asset byte size, MIME, dimensions, hashes, safe paths, and resolvable references | **A. Exporter-only safe** | Improves evidence without changing canonical meaning. |
| Simplify redundant asset aliases/IDs while keeping stable typed package identity | **A**, or **B** if existing references change | Historical packages still require current bridge compatibility. |
| Emit Figma SOLID opacity once with correct raw provenance | **A. Exporter-only safe** | Do not reproduce the 0.6.0 mirrored alias. |
| Emit complete font requirements and rich text ranges from captured Figma data | **A** for existing fields; **C** for unsupported typography semantics | Runtime still owns binary matching and readiness. |
| Promote `renderHints`, tokens, or new top-level metadata into canonical meaning | **B. Coordinated migration** | Current compatibility extraction is intentionally non-canonical. |
| Figma Variables/modes, component properties/variants, Auto Layout GRID, richer typography | **C. SDK-first capability** | Preserve evidence now; canonical/runtime semantics need separate design and fixtures. |
| `absoluteRenderBounds`, `strokesIncludedInLayout`, `itemReverseZIndex`, `counterAxisAlignContent`, raw transforms | **D. Keep as compatibility/provenance** unless a coordinated runtime capability is approved | Existing extension evidence is useful without pretending it is universally render-authoritative. |
| JSON REST V1, MCP, document/page/component/style identity | **D. Keep as compatibility/provenance** | Promote only individual fields that acquire an explicit downstream contract. |
| Direct exporter authorship of Template Family records or runtime font/asset/backend state | **B/C**, not exporter-only | These are current consumer/host responsibilities. |

## 9. Regression fixture strategy

Use the repository's existing exact-fixture and lifecycle conventions rather
than creating a parallel importer test system.

### Fixture location and identity

- Keep real exporter ZIPs in the external directory selected by
  `TEMPLATE_PACKAGE_FIXTURE_DIR` (currently defaulting to
  `/Users/niels/Documents/Templates`). Do not copy large or licensed source
  binaries into production packages by default.
- Register selected fixtures in [`fidelity/fixtures.json`](../../fidelity/fixtures.json)
  with exact filename, byte size, ZIP SHA-256, embedded-preview hash, package
  and root identity, exporter/package version, expected assets/fonts, purpose,
  status, and evidence notes.
- Never substitute a similar filename or newer archive for a registered hash.
  Historical exporter packages remain independently addressable fixtures.

### What to compare

For importer compatibility, capture deterministic evidence at successive
boundaries:

1. ZIP entry inventory and exact hashes/sizes.
2. Raw source diagnostics and source-only keys.
3. Normalized template plus repair/provenance diagnostics.
4. Strict canonical validation and semantic diagnostics.
5. Asset resolutions, actual byte/hash/storage evidence, and font requests.
6. Stable canonical-scene serialization and unmapped-property reports.
7. Resolved structural evidence and capability/backend/fallback identity.
8. Where rendering is relevant, two captures each for Validate, Fields, editor,
   and real PNG export under the recorded environment profile.

Use the strict realistic-ZIP lifecycle to cover import, managed assets,
persistence, reload, rendering, editing where fields exist, and export
readiness. Use `pnpm fidelity:baseline`/`fidelity:compare`, scene comparison,
and other family-specific evidence only under their existing policies. Normal
commands must never update approved references.

### What not to snapshot as semantic contract

- timestamps, run IDs, temporary object URLs, random draft IDs, local storage
  keys, or environment paths;
- raw ZIP bytes duplicated into source control when exact external hash binding
  is sufficient;
- browser timings or system-font fallback pixels as universal semantics;
- every diagnostic message string when a stable code/path/details projection
  is sufficient;
- `preview.png` as an approved renderer reference;
- current compatibility pixels as proof that an unsupported feature is native.

### Comparing exporter versions of one design

Keep both ZIPs and bind both hashes. Compare them in this order:

1. Source inventory: entry additions/removals, manifest references, raw Figma
   evidence, and producer diagnostics.
2. Normalization: canonical values, repair codes, conflicts, and provenance.
3. Canonical semantics: stable graph IDs/order, fields, assets, fonts, masks,
   motion, and source identity.
4. Scene/resolved structure: property authority, capability, fallback,
   geometry, and revision inputs.
5. Pixels: identical-design surfaces and source-preview regions under the same
   recorded browser/font profile.

A change is source-format-only when expected raw/provenance evidence changes
but normalized canonical semantics, validation outcome, scene structure,
runtime capability/fallback, and pixels remain equivalent. A change is
semantic when canonical intent, graph identity/order, asset/font/field/mask
meaning, diagnostics severity/readiness, resolved geometry/backend, or pixels
change. Semantic changes require explicit downstream review; a different
candidate image is never sufficient reason to promote a golden.

Existing relevant tests include the synthetic bundle boundary in
`src/template-package/bundle/templatePackageBundle.test.ts`, the package-owned
source/import contract in `packages/template-core/test/coreSourceContract.test.ts`,
strict validation in `src/template-package/validateTemplatePackage.test.ts`,
and the real ZIP lifecycle in
`src/template-package/lifecycle/zipSavedTemplateLifecycle.test.tsx`.

## Verified exporter 0.6.1 alignment

The 2026-08-31 downstream audit used the exact supplied Deal of the Week ZIP
(`dc2ba9c89fb588c30b4f175dd988f9a9f9400ea216cce40864c3c234b7d32e28`),
the clean SOLID fixture (`7e09ef2d…a9160`), and the corrected gradient/mixed
fixture (`e55ae505…fe8b`). All three pass strict source and canonical validation
and the realistic ZIP lifecycle.

- The Deal ZIP declares exporter 0.6.1 in `template.json`, contains 19 nodes,
  seven editable fields, two exact-size assets, one explicit Rethink Sans
  SemiBold requirement, four canonical style ranges, and four preserved rich
  Figma text segments. No `FONT_REQUIREMENTS_INFERRED` diagnostic is emitted.
- Clean 0.6.1 SOLIDs remain byte-for-byte canonical through normalization and
  emit none of the historical SOLID alias/ambiguity/raw-canonicalization codes.
- Corrected gradients retain complete stops, transforms, stop alpha, paint
  opacity, visibility, blend mode, and exact raw agreement. They emit no
  `LINEAR_GRADIENT_SOURCE_CONFLICT`.
- Mixed nodes `811:459` and `811:460` have exact canonical/raw SOLID RGB
  agreement and select `ordered-normal-paint-svg`. Isolated gradient nodes
  `811:461` and `811:462` retain `linear-gradient-svg`.
- The capability decision reads only `source.pluginVersion`; registered fixture
  subdirectories and versioned ZIP filenames have no semantic authority.

The canonical schema and supported public SDK are unchanged. Exporter 0.6.0
continues to use the strict historical compatibility adapter, and packages
without explicit font requirements continue to use downstream inference.

## Current-code and historical-documentation differences

- `assets.json` remains listed as required by the bundle contract, while the
  loader now has the narrow, evidence-based asset-free synthesis described
  above. The code path is the current fact; it does not weaken the general
  requirement.
- [`LINEAR_GRADIENT_FIXTURE_GATE.md`](../renderer-fidelity/LINEAR_GRADIENT_FIXTURE_GATE.md)
  contains historical text saying normalization does not hydrate gradient data
  from `rawFills`. Current normalization now hydrates missing eligible values,
  binds same-index provenance, and records conflicts.
- Older delivery-plan/status passages describe media or gradient gates as
  blocked. Later fixture records, accepted ADRs, runtime-authority documents,
  and current code document their bounded closure and implementation. The old
  passages remain historical evidence.
- [`figma-import-pipeline.md`](../figma-import-pipeline.md) correctly recommends
  that a producer exclude VIDEO from canonical static fills. Current importer
  behavior is intentionally broader: it still accepts historical/current VIDEO
  output, preserves it as Figma provenance, and uses a static fallback when
  supplied. Tolerance is not a recommendation.

## 10. Guidance for an independent Figma exporter agent

- Treat this repository revision as the downstream consumer reference.
- Do not assume canonical runtime types are identical to accepted exporter
  source values; inspect source normalization before changing an existing
  representation.
- Distinguish “the importer accepts this” from “new exporters should produce
  this.” Do not copy legacy or version-specific repair shapes.
- Do not add top-level package properties or new canonical meaning without a
  coordinated downstream migration.
- Keep Figma-only information as provenance when current runtime support does
  not exist, and preserve semantic intent rather than imitating TypeScript
  interfaces mechanically.
- Emit internally consistent node graphs, explicit fields, resolvable assets,
  exact final byte metadata, and unambiguous paint/font/source semantics.
- Do not author consumer-derived storage, font-resolution, scene, settlement,
  backend, readiness, or fidelity state.
- Do not claim Studio, renderer, SDK, persistence, or export compatibility
  unless it was tested by the downstream repository at a named revision.
- Plan any change to SDK or canonical meaning as a separate coordinated
  migration with fixtures and downstream acceptance evidence.

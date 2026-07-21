# ZIP-Only Import Retirement Ledger

New template imports and persisted template records are ZIP-only. This ledger
records the deliberate retirement of development-era import and saved-record
compatibility.

## Removed in ZIP-only Phase 1

| Area | Removed | Evidence |
| --- | --- | --- |
| Import UI | JSON/ZIP mode selector, pasted package textarea, raw JSON file input | `TemplatePackageImportFlow` now renders one ZIP input. |
| Import state | `importFormat`, pasted `source`, `updateSource`, JSON-specific reset state | New imports retain only the short-lived ZIP buffer and file summary. |
| Import orchestration | Reachable `legacy-json` branch in the wizard validation callback | The product callback always invokes the ZIP pipeline. |
| Review UI | Manual Motion JSON attachment during a new import | ZIP `motion.json` is canonical; manual repair remains settings-only. |
| Product copy | JSON-first labels and legacy import instructions | Import and overview surfaces now use ZIP/package wording. |

No JSX or RTF parser/entry point existed at the start of this phase. Architecture
tests continue to prevent those removed pipelines from returning.

## Removed in ZIP-only Phase 2

| Symbol/file | Removal evidence | Replacement |
| --- | --- | --- |
| `buildPackageImportResult` | Only tests used it after Phase 1; no production, Settings, persistence, or migration consumer remained. | Import tests now build compact ZIP packages. |
| `adaptLegacyJsonTemplatePackageSource` | Only adapter-specific and diagnostic fixture tests used it. Saved records deserialize package objects directly and never call this adapter. | Layered diagnostics tests now load compact ZIP sources; saved-record tests construct historical source metadata directly. |
| `PackageImportFormat` and the `legacy-json` pipeline input/dispatcher branch | The active importer always supplied ZIP and no external runtime consumer remained. | `TemplatePackageImportPipelineInput` is now ZIP-only. |
| `LoadedTemplatePackageSourceKind` legacy variant and `legacySourceFiles` | Loaded sources are created only by the ZIP bundle loader. Persisted source types use a separate type. | `LoadedTemplatePackageSource.sourceKind` is the literal `package-zip`. |
| Raw-adapter tests and fixture plumbing | They tested a retired new-import path or used it as a shortcut. | ZIP fixtures cover the same validation, font, motion, graph, and diagnostic behavior. |

No whole implementation file or npm dependency was deleted: removable symbols
were mixed into active ZIP files, and no legacy parser dependency existed.

## Removed in ZIP-only Phase 3

| Area | Decision | Current behavior |
| --- | --- | --- |
| `package-json` / `legacy-package-json` persisted source values | Removed because no production legacy records require support. | Repositories accept only `package-zip`. |
| Historical persistence migrations and source fallbacks | Removed rather than retaining an empty compatibility layer. | Current records are validated against schema version `1.0` and the canonical source shape. |
| Unsupported development-era records | Rejected, not silently converted or deleted. | The repository reports that local unsupported data must be cleared and the template re-imported from ZIP. |
| Runtime source branches and UI labels | Simplified to the canonical ZIP source. | Overview, import, diagnostics, editor and export consume current ZIP records only. |

Current ZIP records, managed assets, immutable `originalPackage`, working edits,
motion metadata and repository recreation remain supported. The repository does
not persist raw ZIP bytes, Blob URLs, object URLs or import-session readers.

Settings-only Motion JSON attachment remains supported as a repair tool for
already saved templates. It is intentionally absent from the new-import flow.

## Completed in ZIP-only Phase 4

The retirement project is complete. Current product boundaries are:

- Template import: ZIP package only.
- Saved templates: current `package-zip` records only.
- JSON usage: internal metadata files inside ZIP packages, plus Settings-only
  Motion JSON repair.
- Unsupported: raw JSON template import, pasted JSON template import, JSX
  import, RTF import, and historical saved JSON records.

Remaining old-terminology occurrences are intentional:

- Architecture tests mention retired source strings only as negative guards.
- This ledger names retired formats so future cleanup does not reintroduce
  them by accident.
- Settings Motion JSON repair keeps JSON wording because users are explicitly
  attaching motion metadata there.

## Shared Runtime: Do Not Remove

ZIP import depends on package schema validation, package normalization, layered
diagnostics, asset/font persistence, resolved graph creation, renderer/editor,
motion evaluation, Package Quality, saved-template repositories and PNG export.
Retired terminology in or near these modules is not evidence that the module
itself is removable.

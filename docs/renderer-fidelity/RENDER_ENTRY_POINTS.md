# Render Entry-Point Inventory

| Surface | Call site | Renderer path | Mode / graph | Live? | Notes and divergence risk |
| --- | --- | --- | --- | --- | --- |
| Fields setup preview | `apps/studio/src/views/TemplatePackageImportFlow.tsx` | Studio `TemplateInspectionPreview` -> public `TemplateInspectionViewport` -> `TemplatePackageRenderer` | Static appearance; authoritative eligible core route | Yes | Highlight uses rendered target bounds outside exported content |
| Validate affected-layer preview | `apps/studio/src/components/template-package/quality/TemplatePackageDiagnosticContext.tsx` | Studio preview -> public viewport -> renderer | Static/editor appearance by diagnostic; authoritative eligible core route | Yes | Highlight/dimming overlay is inspection-only |
| Validate no-selection preview | same | same | Static appearance; authoritative eligible core route | Yes | Full live package preview |
| Editor preview | `apps/studio/src/views/TemplatePackageEditorPage.tsx` | `ScaledTemplatePackagePreview` -> renderer | Editor; page passes current resolved tree | Yes | Dynamic layout, motion playback/final frame, browser HUG measurement |
| PNG export tree | `TemplatePackageEditorPage.tsx` hidden offscreen node | direct renderer | Editor; renderer recreates tree because call site does not pass one | Yes, offscreen | Captured DOM is the export pixel authority; no debug/highlight props passed |
| PNG readiness/capture | `export/pngExport.ts`, `captureTemplatePackagePreview.ts` | readiness and `html-to-image` capture | Recreate resolved tree for fonts/assets | N/A | Re-resolution is not the mounted DOM’s settled graph |
| Visual comparison | `enrichment/TemplatePackageVisualDiff.tsx` | direct renderer | Static | Yes | Compared with reference image; structural metrics are separate from pixel proof |
| Dashboard thumbnail | `apps/studio/src/views/TemplateOverviewPage.tsx` | `TemplateThumbnailStage` with persisted preview URL | Stored `previewAssetHash` | No | May be stale relative to edited `workingPackage`; no live render |
| Imported reference preview | ZIP `preview.png` surfaced in import/visual comparison | `<img>` / reference asset | Source image | No | Reference evidence, not renderer output |
| Motion preview | editor renderer + `motion/packageMotion.ts` | same editor tree with time transform | Playback or final frame | Yes | Motion transforms apply to live renderer |
| Motion export | none found | none | none | No | Only PNG final-frame capture is implemented; animated-file export is unsupported |
| Review/final preview | no separate renderer call site found | none distinct | N/A | No distinct surface | Editor and validation are the final live render surfaces currently found |
| Thumbnail generation | import persistence stores ZIP preview asset | persisted source preview | Static | No live generation found | `captureTemplatePackagePreview` is used for PNG export, not a discovered thumbnail regeneration workflow |

## Authoritative export graph

PNG pixels come from the hidden editor-mode renderer DOM built from the current `workingPackage`. The editor preview separately receives a page-level `resolvedTree`; the export tree currently does not. Thus editor and export share the same component/mode and package but not the same resolved-tree object or browser element.

`CanonicalSceneGraphV1` feeds `CoreLayoutRouteV1` and surface-local core settlement on live render entry points. `AppearanceContractProjectionV1` has no render entry point and remains Node/test evidence only.

## Overlay boundary

`TemplatePackageRenderer` can emit debug overlays, selection rings, dimming, and diagnostic data attributes. Inspection surfaces pass those controls. The export call site does not. There is no compile-time export-only renderer boundary, so ADR 0011 records the convention that must remain enforced and later strengthened.

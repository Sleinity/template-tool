# `@sleinity/template-react`

Private Studio-independent React integration exposing the proven
`TemplatePackageRenderer`, composable inspection primitives, and a small runtime
context. It deliberately excludes Template Studio routes, settings, Validate,
Fields, and product editor controls.

Host applications must use this package's documented root and importer entry
points. `@sleinity/template-core/renderer-internal` and
`@sleinity/template-react/renderer-internal` are unsupported fixed-train seams
reserved for repository composition and compatibility forwarders; Studio and
external applications must never import them directly.

The production renderer, previews, inspection viewport and renderer-specific
runtime routing are physically owned by this package. Their former repository
paths are behavior-free compatibility forwarders for remaining test and
fidelity infrastructure.

## Advanced inspection

`@sleinity/template-react/inspection` is a supported advanced entry for hosts
that need renderer feature coverage, fidelity-risk projection, quality-report
composition, diagnostic presentation, filtering, and grouping. Ordinary
importing, editing, and rendering do not require it, and ordinary consumers do
not bundle it unless they import the entry.

Layout debug components, stress reports, visual-difference tools, fidelity
issue packets, and runtime development harnesses remain Studio/fidelity-only
and are not shipped in this package.

## Template setup wizard

Applications that need a complete import/setup flow use the dedicated importer
entry and stylesheet:

```tsx
import {
  TemplateImportWizard,
  useTemplateImportWizard,
} from "@sleinity/template-react/importer";
import "@sleinity/template-react/importer.css";

const wizard = useTemplateImportWizard();

<TemplateImportWizard
  wizard={wizard}
  onComplete={({ packageValue, renderIdentity }) => {
    // Persist, publish, or navigate through host-owned services.
  }}
/>;
```

The default interface presents the headless controller as five focused pages:
Package → Fonts → Validate → Fields → Confirm. Package and render validation
remain distinct controller evidence but are grouped into the Package and
Validate pages, and confirmation returns directly to the host. The workflow owns no catalogue, cloud
persistence, navigation, authentication, or publishing. A framework-neutral
controller lives in `template-browser`; this entry provides
`TemplateImportWizardProvider`, `useTemplateImportWizardSnapshot` and
`TemplateImportWizardPreview` for custom page, modal, drawer or workspace
interfaces. The optional default UI accepts host class/style/action slots,
supports image constraint and Fill/Fit-default configuration, never
saves automatically, and completes only for the current validated render
identity. Required fonts progress only through an
exact uploaded face with complete required text-face coverage. Explicit emoji
sequences may use the device emoji font as internal portability evidence; the
default setup UI does not turn that established fallback into a warning or
instruction. Ordinary text-style symbols and other missing characters remain
blocking and are identified. The wizard
shows the required family, named weight and numeric weight, omits normal
upright posture from the label, and shows italic/oblique, stretch, or variable
axes only when relevant. Previously verified exact files are reused
automatically; suggestions, open-font retrieval, compatible faces,
replacements, and system fallback do not bypass or appear in the setup flow.

SDK 0.6 adds reusable `TemplateImportValidationSummary`,
`TemplateImportRenderValidationSummary`, and
`TemplateImportFieldRulesEditor` components. The validation summary accepts the
package report by itself for compatibility, or optional package facts plus font
and render reports to present one consolidated host-facing result with compact
checks, actionable findings, and a single technical disclosure. The focused
render summary remains available for custom compositions.

The field editor keeps invalid
numeric, MIME, aspect-ratio, or target drafts visible with inline blockers while the
last valid package and preview stay active. Imported defaults remain read-only,
and one expandable field-card list owns both order and applicable rules. It exposes only maximum
characters, textarea lines, and image format/size/dimensions/aspect/placement
policy plus accessible drag and menu-based keyboard reordering. It does not expose
enablement, label/help-text mutation, patterns, manual counters, overflow modes,
node paths, or content editing. Studio keeps its richer native field-card and
validation presentation instead of importing this host-neutral visual shell.

`TemplateImportWizardPreview` fits the complete intrinsic canvas into a
responsive, observer-driven frame with protected padding and hidden overflow.
The intrinsic renderer remains unchanged, so preview fitting does not alter DOM
output, capture dimensions, or pixels.

Optional font and confirmation-persistence adapters integrate
host-owned services without weakening SDK validation. The confirmation result
contains the imported baseline, validated package, sanitized field rules,
structured import/font/render evidence, current render identity, deterministic
fingerprint and source metadata. `TemplateImporterWizard` remains as a
compatibility alias for the earlier unpublished five-step component contract.

The wizard is not a content-input framework. Hosts render their own controls
from the session's editable descriptors and may preprocess values with richer
forms, croppers, or other tools before calling the existing session mutation
methods. Final values must still pass template constraints.

For application integration, use the StrictMode-safe `useTemplateSession`,
`TemplateSessionProvider`, `useTemplateSessionSnapshot`, and
`TemplateSessionRenderer`. The owned-session hook creates one active browser
session and disposes it after permanent unmount without letting React's
development effect replay dispose the live instance. The renderer
accepts either provider context or an explicit session, renders host-owned
fallback content until ready, and exposes an imperative `exportPng()` handle.
Export rejects pending or stale render identities instead of capturing an older
session revision. Pass `{ download: false }` when the host needs the PNG result
without a browser download.

For inspection surfaces, `TemplateInspectionViewport` owns fit, zoom,
settled-target measurement and non-export overlays while the host owns controls
and stage styling. Its imperative handle exposes `fitTemplate()`, `fitTarget()`,
`zoomBy()` and `getSnapshot()`. `TemplateInspectionPreview` remains available as
an accessible, UI-independent compatibility composition with its existing props.

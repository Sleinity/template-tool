# Template Studio

This workspace owns the real Vite application, product routes, views, styles,
assets, optional import/font services, and production build. It is the reference
Studio consumer for the private renderer SDK.

Milestone 1B closes the UI seam: the design system, field/font/quality panels,
and the styled inspection-preview composition are Studio-owned. The public
React package exposes a UI-independent viewport and compatibility preview;
published packages never import `apps/studio`.

As of SDK 0.5.0, ordinary Studio production and server code consumes the same
supported core, browser, React, and advanced-inspection entry points as an
external host. It does not import repository compatibility paths or package
source internals. Studio-specific layout debugging, stress reports, visual
comparison, fidelity issue packets, and development harness adapters remain
local to `src/fidelity` and are not SDK exports.

SDK 0.6 keeps Studio's five-step product shell, catalogue workflow, styling,
and advanced diagnostics while reusing supported package-validation and
field-rule components from `@sleinity/template-react/importer`. Invalid field
drafts no longer replace the active package, imported defaults remain reset
authority, and device-emoji fallback is not presented as setup guidance.

The public packages bundle only their supported entry points. Studio-only
navigation, import panels, Fields, Validate, and editor controls are not part of
the published SDK.

The default V2 source setup uses the restored five-step Studio shell:
Designs, Fonts, Checks, Fields, Review. It retains accepted state
across navigation and reuses public V2 transactions. `pnpm studio:setup` verifies
the workflow in Chromium, including exact font upload from the registered ZIP.
See [the restoration contract](../../docs/studio/WORKFLOW_RESTORATION.md) for
screen ownership. [Phase 2](../../docs/studio/PHASE_2.md) separates Templates, independent Drafts and Existing work. [Phase 3](../../docs/studio/PHASE_3.md) adds collision-safe canonical routes, guarded browser transitions, accurate Settings dirtiness, and accessible Library failure recovery. `pnpm studio:drafts` verifies the product lifecycle against IndexedDB. Offline record reopening works in the loaded shell; hard offline app-shell reload remains deferred.

[Phase 5](../../docs/studio/PHASE_5.md) closes the remaining V1 workflow parity gaps: correction targeting, source dropzone and Family actions, accessible ordering, 768-pixel composition, and recoverable first-open failures for persisted drafts.

[Phase 6](../../docs/studio/PHASE_6.md) accepts the restored V1-equivalent workflow after target-bound replacement review, conservative correction ownership, duplicate-label disambiguation, durable draft recovery, and three hash-gated real-package journeys. Run it with `pnpm studio:workflow-acceptance` from the repository root.

Run from the repository root:

```sh
pnpm dev
pnpm build
```

The root commands delegate here. Direct workspace commands are also supported:

```sh
pnpm --filter @sleinity/template-studio dev
pnpm --filter @sleinity/template-studio build
```

### Current output recovery flow

The [connected workspace contract](../../docs/studio/PRODUCT_EXPERIENCE_20261012.md)
defines field focus, viewport navigation and responsive presentation. Hosts can
adapt the [Studio source example](../../docs/sdk/STUDIO_REFERENCE.md) using
supported SDK operations; Studio UI components remain private.

The draft catalogue described by the historical phase records is superseded by [one recovery slot per template](../../docs/architecture/template-recovery.md). Create output starts fresh or offers Continue draft / Start from scratch / Cancel. Navigation persists valid accepted edits; successful PNG export clears recovery and returns to Library. A Family shares one slot across its variants. The old V1 interfaces are development-only fidelity surfaces, not Library navigation.

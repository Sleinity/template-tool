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

The public packages bundle only their supported entry points. Studio-only
navigation, import panels, Fields, Validate, and editor controls are not part of
the published SDK.

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

# Template Studio

This workspace owns the real Vite application, product routes, views, styles,
assets, optional import/font services, and production build. It is the reference
Studio consumer for the private renderer SDK.

Milestone 1B closes the UI seam: the design system, field/font/quality panels,
and the styled inspection-preview composition are Studio-owned. The public
React package exposes a UI-independent viewport and compatibility preview;
published packages never import `apps/studio`. Technical implementation remains
under `../../src/template-package` until the later physical package milestones.

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

# Template Tool monorepo

This private monorepo contains the Template Studio reference application and a
reusable browser renderer SDK. Fidelity improvements are made once here and are
released as versioned private packages for other client tools.

## Workspace map

- `apps/studio` — the current Template Tool product and fidelity workbench;
- `packages/template-core` — framework-neutral import, validation, canonical
  scene, resolution, backend decisions, and typed field values;
- `packages/template-browser` — browser assets, fonts, persistence, readiness,
  measurement, and PNG export;
- `packages/template-react` — UI-free React renderer integration;
- `examples/minimal-renderer` — small consumer without Template Studio UI;
- `tools/fidelity` and `fidelity` — local evidence harness and guarded approved
  references.

See [the private SDK guide](docs/sdk/README.md) and
[GitHub setup](docs/sdk/GITHUB_SETUP.md).

## Template Studio

Renderer-fidelity programme documentation starts at
[`docs/renderer-fidelity/README.md`](docs/renderer-fidelity/README.md).

A local React and TypeScript editor for ZIP Template Packages exported by the
Figma plugin. New imports accept ZIP packages only.

## Supported Workflow

1. Export a Template Package ZIP from Figma.
2. Import the ZIP package, including `template.json`, `assets.json`, optional
   motion/MCP metadata, preview image, and external assets.
3. Validate package structure, assets, fonts, fields, motion, and renderer
   compatibility.
4. Review the semantic preview.
5. Edit package fields in the Template Package Editor.
6. Export the current template frame as a native-resolution PNG.

Saved templates use the current ZIP package record format. Unsupported
development-era records must be cleared and re-imported from their ZIP package.

## Commands

```bash
pnpm dev
pnpm test
pnpm test:realistic-zip
pnpm build
pnpm fidelity:baseline
pnpm fidelity:compare
```

`pnpm test` remains portable: it uses the realistic lifecycle ZIP when the
configured/default file is readable and otherwise reports that it used the
compact fallback fixture. To prove the full lifecycle against a specific real
package, use strict mode:

```bash
TEMPLATE_PACKAGE_LIFECYCLE_ZIP=/absolute/path/package.zip pnpm test:realistic-zip
```

Strict mode never falls back. It validates the ZIP file and reports its
filename, byte size, and SHA-256 before running the shared lifecycle assertions.

Renderer-fidelity commands verify the exact fixture manifest, capture the real
Validate/Fields/editor/PNG surfaces, and compare against reviewed references.
They never update approved references automatically; see the
[harness guide](docs/renderer-fidelity/HARNESS.md).

Optional live Figma enrichment is available through
`POST /api/template-package/enrich-figma`. Copy the relevant values from
your local environment into `.env`. An MCP gateway can provide richer context;
`FIGMA_ACCESS_TOKEN` provides REST metadata and screenshot fallback.

## Current Output Status

PNG export is available from the editor and uses the current working package at
native canvas resolution. Motion preview is supported for the implemented
channels; MP4 export remains a future milestone.

See [the Figma package pipeline](docs/figma-import-pipeline.md) and
[editable field naming](docs/figma-layer-naming-convention.md).

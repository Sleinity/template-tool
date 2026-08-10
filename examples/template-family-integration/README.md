# Template Family integration reference

This packed-consumer example demonstrates the supported SDK 0.8 family path. It imports multiple real TemplatePackage ZIPs, preserves per-variant packages, uses one shared content state, previews one variant at a time, reports per-variant validation, persists and reopens offline, inspects reimport compatibility, and captures the current revision.

It intentionally owns its forms, selector presentation, downloads and navigation. It imports no Studio or `renderer-internal` code.

Run `pnpm --filter @sleinity/template-family-integration dev`, then choose two compatible TemplatePackage ZIPs.

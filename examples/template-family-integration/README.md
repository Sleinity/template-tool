# Template Family integration reference

This packed-consumer example demonstrates the Template Family path. It imports multiple real TemplatePackage ZIPs, preserves per-variant packages, classifies unmatched targets as variant-specific fields, assigns independent selection-property options to each concrete variant, uses one shared content state, previews one variant at a time, reports per-variant validation, persists and reopens offline, inspects reimport compatibility, and captures the current revision. Ordered editor controls keep selectors and fields composable, while variant-only fields hide and reappear without losing their values.

It intentionally owns its forms, selector presentation, downloads and navigation. It imports no Studio or `renderer-internal` code.

Run `pnpm --filter @sleinity/template-family-integration dev`, then choose two compatible TemplatePackage ZIPs.

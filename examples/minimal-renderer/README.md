# Minimal renderer consumer

This application proves that a separate product can create one `TemplateSession`,
import a ZIP, apply typed field values, render with the same backend decisions as
Template Studio, expose the product-render identity, and export PNG without
adopting Studio UI or coordinating the low-level packages itself.

```sh
pnpm example:dev
```

For an interactive editor, mount `TemplateSessionRenderer` in `editor` mode and
call the session's typed field methods. For narrowcasting, use `static` mode,
load a saved template or ZIP once, inject the current values with `setField`, and
keep the renderer mounted; no Template Studio route or renderer-time network
access is required.

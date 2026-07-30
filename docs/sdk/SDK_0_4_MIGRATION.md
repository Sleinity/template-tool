# Migrating to SDK 0.4

Upgrade `template-core`, `template-browser`, and `template-react` together.
Existing 0.3 root imports remain supported; no existing session, renderer,
editing, persistence, or PNG API was removed.

New integrations should adopt the curated browser entry points:

```ts
import {
  createTemplateSession,
} from "@sleinity/template-browser/session";
import type {
  TemplateImportConfirmationV1,
} from "@sleinity/template-browser/importer";
import {
  inspectTemplateRuntimeSupport,
  loadTemplateImportConfirmation,
} from "@sleinity/template-browser/compatibility";
```

Run the runtime preflight before exposing template workflows. Store the
wizard's immutable confirmation in host-owned state. When the user selects it,
create a fresh session and call:

```ts
const result = await loadTemplateImportConfirmation(session, confirmation);
if (!result.applied) {
  showCompatibilityIssues(result.inspection.issues);
}
```

Do not copy stored validation, resolved trees, readiness, or render identities
into the fresh session. The helper inspects integrity and delegates to the
existing atomic session rebuild.

Confirmations produced by 0.4 contain a SHA-256 package digest. Supported 0.3
confirmations without a digest remain loadable and report a compatibility
warning. Missing browser-local managed fonts are reported because confirmation
records are not yet portable cross-device artifacts.

After replacing vendored archives, update the lockfile and rerun the host's
valid/invalid ZIP, confirmation, reopening, editing, offline, CSP and rendering
checks.

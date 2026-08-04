# Migrating from SDK 0.6 to 0.7

SDK 0.7 keeps the 0.6 importer, session, renderer, persistence and PNG APIs.
The new `@sleinity/template-react/editor` entry replaces repeated host glue
after a confirmed template is reopened in a fresh session.

Upgrade all packages together. Follow the
[installation guide](INSTALLATION.md) for credential-free Release archives or
authenticated GitHub Packages.

```sh
pnpm add @sleinity/template-core@0.7.0 \
  @sleinity/template-browser@0.7.0 \
  @sleinity/template-react@0.7.0
```

## 1. Replace custom preview fitting

```tsx
import {
  TemplateSessionViewport,
  type TemplateSessionViewportHandle,
  type TemplateSessionViewportSnapshotV1,
} from "@sleinity/template-react/editor";

const viewportRef = useRef<TemplateSessionViewportHandle>(null);
const [viewport, setViewport] =
  useState<TemplateSessionViewportSnapshotV1 | null>(null);

<TemplateSessionViewport
  ref={viewportRef}
  mode="editor"
  onViewportSnapshot={setViewport}
/>;

const png = await viewportRef.current?.exportPng({ download: false });
```

The viewport keeps the intrinsic renderer intact, fits it with responsive
padding, refits on resize and invalidates identity/export readiness as soon as
the session revision changes.

## 2. Replace manual field lookup and dispatch

```tsx
import {
  useTemplateSessionEditableField,
  useTemplateSessionEditableFields,
} from "@sleinity/template-react/editor";

const fields = useTemplateSessionEditableFields();
const headline = useTemplateSessionEditableField("headline");

headline?.setValue("Updated headline");
headline?.reset();
```

The plural hook returns every controller in host-facing order. The singular
hook selects one field and returns `null` for an unknown ID. Controllers reuse
the existing mutation and constraint authorities; they do not prescribe input
components.

Image bytes and processing remain host-owned. After cropping or other host
work, submit the final validated input through `replaceImage()` and switch
Fill/Fit through `setImageReplacementMode()`.

## 3. Replace manual diagnostic aggregation

```tsx
import {
  useTemplateSessionDiagnosticSummary,
} from "@sleinity/template-react/editor";

const diagnostics = useTemplateSessionDiagnosticSummary({
  viewportSnapshot: viewport,
});
```

The projection combines existing current-revision package, font, asset,
session and renderer evidence. It reports `pending`, `ready`, `needs-review`
or `blocked`, preserves original evidence, ignores stale viewport snapshots and
does not run another validator.

## Unchanged host responsibilities

Keep navigation, editor UI, image processing, cloud storage, catalogues,
publishing and authentication in the host. Keep using the 0.6 wizard for setup,
store its confirmation only after explicit confirmation, and reopen it through
`loadTemplateImportConfirmation()` in a fresh `useTemplateSession()` before
mounting the editor primitives.

Hosts upgrading a working SDK 0.2 integration should use the dedicated
[0.2→0.7 Lovable handoff](SDK_0_2_TO_0_7_LOVABLE_HANDOFF.md) instead of applying
the 0.6 delta in isolation.

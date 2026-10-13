# V2 integration — current contract

<!-- delivery-context:start -->
This guide describes the current source contract. The fixed-train workspace packages are
1.0.0, an unpublished candidate pending cross-platform certification. Historical
published 0.8.0 archives describe a different contract. Verify archive hashes and delivery
provenance. [Installation](INSTALLATION.md), [release preparation](RELEASE_PREPARATION.md)
and [1.0 migration](SDK_1_0_MIGRATION.md) distinguish those states.
<!-- delivery-context:end -->

The tested release baseline is exporter **0.6.1**, specifically Now Hiring,
Cover and Carrousel in the hash-gated `sdk-061` profile. Those ZIPs declare
source schema `1.0`; the source reader and V1-to-V2 normalization remain necessary.
Current canonical packages use schema `2.2`. Older exports retain best-effort
handling but have no source-fidelity compatibility guarantee.

## Static choices

Text, Textarea, Number, Date and Color can configure suggested or restricted
static choices. Use the existing field configuration and native `selectChoice()`
controller; Image, Boolean and Family design selectors are separate. Core validates
typed values, portable option IDs, canonical duplicates and ordinary rules.
Restricted lists must include each applicable imported default for Reset.

An explicit selection stores its stable option identity. Changing its value
reconciles selected content; removing the option keeps the content value and
removes that identity. An unlisted restricted value remains invalid until corrected.
A matching literal or imported default may display as a matching option without
inventing selection provenance. Family option lists are atomic overrides: null
disables choices; removing the override restores inheritance.

Studio's private authoring model keeps incomplete input out of canonical
configuration and provides the complete default/design context. It adds no SDK
schema or persistence migration. [Studio guidance](../field-rules/STUDIO_AND_HOSTS.md#choices-ordering-and-configuration-transactions)
describes the configuration and output controls. Color correctness and Reset
continue to use exact imported ZIP paint numbers, not PNG pixels.

## Import and transfer ownership

Use the Browser importer for canonical V2 ingestion. Accept only `ready`;
`blocked` retains inspectable data, and `error` retains its original exception
and failing stage. Import and V2 parse evidence remain separate. Import readiness
does not establish font, renderer or PNG readiness.

```ts
// sdk-candidate-example: import
import { runTemplatePackageImportPipelineV2 } from "@sleinity/template-browser/importer";
import { createTemplateSessionV2 } from "@sleinity/template-browser/session";

export async function openSingle(file: File, sourceId: string) {
  const candidate = await runTemplatePackageImportPipelineV2({
    format: "zip", buffer: await file.arrayBuffer(), sourceName: file.name, sourceId,
  });
  if (candidate.status !== "ready" || !candidate.package) {
    // The caller owns this inspectable result and must dispose it after review.
    return { kind: "rejected" as const, candidate };
  }
  const session = createTemplateSessionV2();
  try {
    const snapshot = session.load(candidate.package);
    if (snapshot.status !== "ready") throw snapshot.error ?? new Error("Session load failed");
    return { kind: "accepted" as const, session };
  } catch (error) {
    session.dispose();
    throw error;
  } finally {
    candidate.dispose();
  }
}
```

Loading acquires the session's own managed URL leases. Dispose the session when
its host owner ends. If later authoring transactions still need the original
source, retain the candidate until those transactions and their handoffs finish.
Dispose cancelled, superseded and rejected candidates, including late successful
imports from a failed batch. Caller-provided stores remain caller-owned.

The [recommended React example](../../examples/template-editor-integration/README.md)
stages replacement imports and exact-font preparation before **Open template**.
Its default route is V2; `?fields-v2` remains an alias. The retained V1 compatibility
API example requires `?compatibility=v1` (this parameter takes precedence).
Candidates stay owned through preparation and handoff; only an accepted session
mounts a renderer. Cancellation invalidates late results rather than aborting reads.
Failed replacements preserve accepted edits and resources. The private lifecycle
helper also guards failures/finalizers and disposes sessions awaiting a React commit.

## Family authoring and canonical editing

Single sources remain single templates. Use the existing Browser authoring
transaction when several sources form a Family; host source IDs remain variant
identities. Initial assembly, promotion and append retain distinct transaction
guards. A failed candidate leaves the accepted session unchanged.

```ts
// sdk-candidate-example: family
import { appendTemplateSourcesV2, type TemplateImportSourceV2 } from "@sleinity/template-browser/importer";

export function openFamily(sources: readonly TemplateImportSourceV2[], title: string) {
  // Sources must be ready imports; their owners remain live through this handoff.
  return appendTemplateSourcesV2(null, [], sources, title);
}
```

Use typed controllers for Text, Textarea, Number, Date, Color, Image and Boolean.
Use `configure()` for accepted configuration and the existing review-first
reimport operations for replacement. Field `reset()` restores its imported
default; session `reset()` unloads the session. Preserve Choice identity with
its value. Shared Family content survives fields absent from the selected design;
Image placement overrides remain sparse and variant-specific. Selector metadata
and resolution use the existing Core/Browser authorities, never filename heuristics.

Color's hex control is a representation. Unchanged imported defaults and Reset
preserve the ZIP's exact bound paint numbers; explicit edits affect only the
bound SOLID fill. PNG pixels are not the Color-value oracle.

## Rendering, exact fonts and export

```tsx
// sdk-candidate-example: renderer
import { useRef } from "react";
import type { TemplateSessionV2 } from "@sleinity/template-browser/session";
import {
  TemplateFieldSessionRendererV2,
  type TemplateFieldSessionRendererV2Handle,
} from "@sleinity/template-react/editor";

export function SinglePreview({ session }: { session: TemplateSessionV2 }) {
  const renderer = useRef<TemplateFieldSessionRendererV2Handle>(null);
  return <TemplateFieldSessionRendererV2 ref={renderer} session={session} mode="editor" />;
}
```

The same renderer accepts a native Family session and renders its selected
effective package. Hosts use `useTemplateFieldSessionV2Snapshot()` and
`useTemplateFieldControllersV2()` for state and controls. The host owns borrowed
sessions; rendering does not take ownership of disposal. Hooks that create
sessions retain their established StrictMode-safe ownership.

Use `/fonts` operations for managed exact-face upload/linking. Requested family,
style and weight are distinct from verified binary hash and private loaded face.
System fonts or `document.fonts.check()` alone cannot establish exact identity.
Missing exact fonts remain visible blockers; do not substitute silently.

### Host-owned font registries

Pass one stable `ManagedFontRegistry` instance through upload/linking and the V2
renderer. Omitted or `undefined` uses the existing default IndexedDB registry;
explicit `null` disables registry lookup while retaining package-provided font
sources. The renderer borrows the registry and does not dispose it. Changing its
instance establishes a new publisher and invalidates readiness. Keep the instance
stable across ordinary React renders; updates to its storage alone do not emit a
session notification. Use the existing package reload/reimport or a renderer
remount after an external storage change that needs fresh preparation.

```tsx
// sdk-candidate-example: host-fonts
import { useRef, useState } from "react";
import { parseTemplatePackageV2, type TemplatePackageV2 } from "@sleinity/template-core";
import { createTemplateSessionV2, type TemplateSessionV2 } from "@sleinity/template-browser/session";
import { uploadExactManagedFontForRequirement, type ManagedFontRegistry } from "@sleinity/template-browser/fonts";
import { TemplateFieldSessionRendererV2, useTemplateFieldSessionV2Snapshot,
  type TemplateFieldSessionRendererV2Handle } from "@sleinity/template-react/editor";

export async function linkHostFont(source: TemplatePackageV2, requirementId: string,
  file: File, registry: ManagedFontRegistry | null) {
  const staged = createTemplateSessionV2();
  try {
    const snapshot = staged.load(source);
    if (snapshot.status !== "ready" || !snapshot.rendererPackage) throw new Error("Invalid source");
    const linked = await uploadExactManagedFontForRequirement(snapshot.rendererPackage, requirementId,
      await file.arrayBuffer(), { registry, fileName: file.name, mimeType: file.type });
    // The V1 projection owns font patches only. Preserve V2 fields/defaults/configuration.
    const next = structuredClone(source);
    if (Object.prototype.hasOwnProperty.call(linked.packageValue, "fontRequirements")) next.fontRequirements = linked.packageValue.fontRequirements;
    for (const [id, asset] of Object.entries(linked.packageValue.assets)) if (asset.type === "font") next.assets[id] = asset;
    const parsed = parseTemplatePackageV2(next);
    if (!parsed.package || !parsed.validation?.valid) throw new Error("Invalid font patch");
    return parsed.package;
  } finally { staged.dispose(); }
}

export function HostFontPreview({ session, registry }: {
  session: TemplateSessionV2; registry: ManagedFontRegistry | null;
}) {
  const renderer = useRef<TemplateFieldSessionRendererV2Handle>(null);
  const snapshot = useTemplateFieldSessionV2Snapshot(session);
  const [error, setError] = useState<string | null>(null);
  return <>
    <TemplateFieldSessionRendererV2 ref={renderer} session={session}
      fontRegistry={registry} mode="editor" />
    <button disabled={!snapshot.readiness.exportReady} onClick={() => {
      setError(null);
      void renderer.current!.exportPng({ download: false }).then(result => {
        // Hand result.pngDataUrl to the host's upload/download service.
      }).catch(cause => setError(cause instanceof Error ? cause.message : String(cause)));
    }}>Export PNG</button>
    {error && <p role="alert">{error}</p>}
  </>;
}

export async function reopenHostSession(savedId: string) {
  const session = createTemplateSessionV2();
  try {
    const loaded = await session.loadSaved(savedId);
    if (loaded.status !== "ready") throw new Error(loaded.error?.message ?? "Restore failed");
    return session; // Mount HostFontPreview with the recreated host registry.
  } catch (error) { session.dispose(); throw error; }
}
```

Registry records and binaries remain host-owned; they are not serialized into a
session adapter. Recreate a registry backed by the same persistent host storage
when reopening in a new document. An empty new in-memory registry does not restore
font authority. Families use the same renderer prop and their existing repository.

Direct Browser PNG calls accept the same optional `fontRegistry`. Renderer-handle
export options deliberately exclude it: export uses the mounted renderer's
registry, even if untyped callers supply a different one. Preparation, readiness,
font embedding and capture use that one authority. Missing exact embedding bytes
reject export even when a face remains loaded in the current document. A registry,
session, content or mount change during capture rejects the obsolete result and
prevents its download.

Enable capture from current session readiness, then call the mounted renderer's
`exportPng({ download: false })`. The operation checks current readiness itself.
Do not submit host-made line counts, invent evidence revisions, bypass pending
assets/fonts/layout or wait a fixed duration. An edit, variant/configuration
change, renderer replacement or late evidence can invalidate earlier readiness.
Host navigation and download/publishing behavior remain host responsibilities.

## One recovery slot per template

Generic saved templates/sessions remain available; they are not a draft catalogue.
Use `/persistence` recovery operations keyed by template kind and ID. One Family
slot spans all variants. Inspection does not change ownership. Ask Continue,
Start from scratch or Cancel in the host's UI when recovery exists. Fresh/resume
acquires a token and supersedes older editors; cancel leaves recovery untouched.

```ts
// sdk-candidate-example: recovery
import {
  createSavedTemplateSessionV2Record,
  type TemplateRecoveryLease,
  type TemplateRecoveryRepository,
} from "@sleinity/template-browser/persistence";
import type { TemplateSessionV2 } from "@sleinity/template-browser/session";

export async function saveRecovery(
  recovery: TemplateRecoveryRepository, lease: TemplateRecoveryLease, session: TemplateSessionV2,
) {
  const snapshot = session.getSnapshot();
  if (!snapshot.basePackage || !snapshot.contentState) throw new Error("No loaded content");
  return recovery.save(lease, createSavedTemplateSessionV2Record({
    name: snapshot.basePackage.name, basePackage: snapshot.basePackage,
    contentState: snapshot.contentState, sessionAssets: snapshot.sessionAssets,
  }));
}

export async function exportRecovery<T>(
  recovery: TemplateRecoveryRepository, lease: TemplateRecoveryLease,
  flushPersistAndExport: () => Promise<T>,
) {
  return recovery.exportAndComplete(lease, flushPersistAndExport);
}
```

Persist after an accepted edit/selection; unchanged opening need not save a
payload. For resume, restore the retained independent snapshot/content using
the native session restore path and a repository that can read its managed assets.
For Families capture with `createSavedTemplateFieldFamilyV3Record`.

Before export, stop concurrent edits/navigation/autosave, flush and validate
local input, capture and await recovery persistence, then await readiness and
PNG export in the callback. Failed export retains recovery. If cleanup fails
after export, show “Output exported, but the saved draft could not be cleared.”
Retry `complete(lease)` without exporting again; leave autosave stopped.
Superseded tokens cannot overwrite or clear newer work. Successful completion
clears recovery and permits a fresh next session; the host owns disposal/navigation.
Browser downloads cannot prove the user retained a file. Unpersisted keystrokes
are not promised crash recovery.

## Supported boundaries

Use installed package entries only. `session-internal` and `renderer-internal`
are restricted fixed-train dependencies, not host APIs. Never import Studio,
package `src/`, workspace aliases, compiler results, session adapters or
Definition/Instance projections. V1 wizards and session/confirmation contracts
remain supported compatibility paths; they do not become V2 through a version label.

See [ownership and cleanup](HOST_LIFECYCLE.md), [operation outcomes](OPERATION_OUTCOMES.md),
the [V2 Browser contract](../field-rules/BROWSER_SESSION.md),
[host authoring guidance](../field-rules/STUDIO_AND_HOSTS.md) and
[recovery architecture](../architecture/template-recovery.md).

## Blocked local storage and manual Retry

An older app tab can hold a connection that prevents the current database upgrade.
Browser persistence and the default managed-font registry reject immediately with
`TemplateStorageBlockedError` (exported from root and `/persistence`). Its stable
code is `template-storage-blocked`; `databaseName`, `requestedVersion` and
`retryable: true` are available for host diagnostics. Close other app tabs/windows,
then retry the operation. Keep entered work and the intended destination until it
succeeds. Never delete/reset the database to recover from this error.

```ts
// sdk-candidate-example: blocked-storage
import { TemplateStorageBlockedError } from "@sleinity/template-browser/persistence";
import type { TemplateSessionV2 } from "@sleinity/template-browser/session";

export async function saveWithStorageFeedback(session: TemplateSessionV2) {
  try {
    return { kind: "saved" as const, record: await session.save() };
  } catch (cause) {
    if (cause instanceof TemplateStorageBlockedError) {
      // Present a manual Retry that saves the latest accepted input.
      return { kind: "retry" as const, message: cause.message, cause };
    }
    throw cause;
  }
}
```

Concurrent callers share one opening attempt but retain independent operation
outcomes and cleanup. While its rejected native request remains blocked, further
calls reject promptly without adding native requests. After that request settles,
a new invocation can open again. There is no automatic retry loop or fixed waiting
period. Ordinary IndexedDB errors retain their original identity.

Native restore outcomes intentionally differ: a single session's `loadSaved()`
returns a blocked snapshot with `saved-session-load-failed` and the repository
error message; a Family repository-read failure rejects with the original error.
Check both outcomes. Studio retains the requested destination and explicit
fresh/resume decision and accepts a fresh candidate only after successful restore.
A failed read is not evidence of a missing record or superseded recovery lease.

Recovery cleanup after a successful PNG export can throw
`TemplateRecoveryCleanupError`; its `cause` may be the blocked-storage error.
Retry `complete(lease)` only, never the export. Font hosts retain the selected File
and requirement for manual upload retry, clearing them when cancelled or replaced.
Adapters, sessions and recovery tokens remain under their existing ownership rules.

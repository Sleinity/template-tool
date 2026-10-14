# Template editor integration reference

The default page is a small React 19 **V2 host**, using supported SDK entries
without Studio or renderer internals. Install one coherent local candidate using
[release preparation](../../docs/sdk/RELEASE_PREPARATION.md); current source and
published 0.8.0 archives have different contracts despite matching version labels.

```sh
pnpm --filter @sleinity/template-editor-integration dev
```

## Recommended V2 flow

1. Select exporter ZIP or canonical V2 JSON.
2. Resolve each exact font with the requirement's upload control. Missing,
   mismatched or corrupt fonts prevent opening. Storage failures offer manual Retry.
3. Choose **Open template**. Only this accepted session mounts a renderer.
4. Edit ordered typed fields, use Choices or custom control overrides, Reset and
   export PNG when native readiness permits it.

A replacement is staged separately. The accepted template remains editable and
exportable while reading or preparing it. Cancel, malformed input and failed
preparation preserve accepted work. New imports supersede earlier candidates;
late successes, errors and finalizers cannot update the newer editor.

`fieldHostLifecycle.ts` is a private example helper, not an SDK contract. It retains
ZIP candidates until their ownership handoff finishes and disposes all abandoned
candidates and staging sessions. A receiving session acquires independent asset
leases. React commit cleanup ends the previous editor's ownership; active/queued
native saves retain their invocation-time assets according to native save policy.
Cancellation invalidates results logically; it does not abort SDK/file reads.

Pass an optional stable `fontRegistry` to `FieldRulesV2Host`. Omitted/undefined
uses the default IndexedDB registry; `null` uses embedded font authority only.
The same borrowed authority serves import, upload/linking, preparation and render/
export. Hosts own registry binaries and must supply their authority again when
reopening. Registry replacement cancels pending imports; native renderer readiness
refreshes for the accepted session. Font helpers consume its V1 renderer projection,
then **only font requirements and font assets** merge back into canonical V2.

Controllers demonstrate all seven types, existing Choices, a custom `brand-color`
palette and fallback controls. Image replacement respects configured Fill/Fit/Crop;
the sample Crop action submits a supported normalized host crop. Exact imported
Color defaults and Reset preserve source numbers, not inferred PNG colors.

`?fields-v2` remains an alias for the default page. This example intentionally has
no Family authoring, autosave, recovery, authentication or publishing UI. Native
save interoperability and ownership are tested by the acceptance harness. See
[V2 integration](../../docs/sdk/V2_INTEGRATION.md) and
[host composition](../../docs/field-rules/STUDIO_AND_HOSTS.md).

## V1 compatibility API examples

Use **`?compatibility=v1`** for the retained V1 demonstrations. This explicit
parameter takes precedence over the V2 alias. It selects the V1 API example,
not a renderer mode.

The compatibility page demonstrates the public setup wizard, an in-memory
catalogue, confirmation handoff, policy-driven image replacement, local IndexedDB
save/reload and silent PNG export. Its `onTemplateExportReady` callback hands
control to host publishing/storage; the SDK does not own those workflows.

```sh
pnpm template-editor:acceptance
node scripts/example-lifecycle/verify.mjs --archives <candidate-directory> --manager npm
node scripts/example-lifecycle/verify.mjs --archives <candidate-directory> --manager pnpm
node scripts/example-lifecycle/unit.mjs
```

Acceptance copies the complete example into isolated consumers and installs the
same local archives. Declarations compile with `skipLibCheck: false`. V1-only
acceptance controls use `?compatibility=v1&acceptance=1`; they are test hooks,
not integration instructions. Synthetic workflow scenarios are not source-fidelity
certification; exact exporter ZIPs and the three-export gate remain separate.

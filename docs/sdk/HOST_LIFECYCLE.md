# Host ownership and cleanup

Use [V2 integration](V2_INTEGRATION.md) and the [recommended example](../../examples/template-editor-integration/README.md).
SDK authority remains Core validation/materialization, Browser mutation acceptance,
resource ownership/persistence/readiness and React rendering/bindings. Studio is
private presentation, not a supported UI contract.

## Imports and replacement acceptance

Run `runTemplatePackageImportPipelineV2` once per selected ZIP. Accept only `ready`;
retain blocked/error evidence for inspection, then dispose its candidate. Parse
JSON through public Core parsing. Do not manufacture ZIPs or relax validation.

Prepare a replacement in a fresh native session. Keep accepted edits usable while
reading or preparing it. Retain the candidate through exact-font preparation and
explicit acceptance. Loading acquires independent session asset leases. End the
candidate only after handoff; end the previous session after its editor cleans up.

Guard success, error, progress and finalization by source generation, session,
registry identity and component lifetime. Logical cancellation does not abort
SDK/file reads: dispose late pipeline results too. StrictMode discarded renders
must allocate no owners. Sessions waiting for a UI commit also need teardown.

## Borrowed adapters and React

| Resource | Host responsibility | SDK responsibility |
| --- | --- | --- |
| Supplied repository/asset store | Retain a usable adapter and its persisted bytes | Borrow it; finalize operation-local pins/URLs, not the adapter itself |
| Supplied font registry | Retain a stable instance; persist binaries; supply it again on reopen | Borrow it through preparation/render/export; never dispose it |
| Import candidate | Dispose success/rejection/cancel/supersession/failure/late results | Expose idempotent candidate cleanup; receiving sessions retain independent leases |
| Host-created native session | Dispose when its host owner ends, after subscriptions/render cleanup | Protect invocation-time resources and reject abandoned work |
| React-created session/controller hooks | End the owning component lifecycle | Existing hooks provide their own StrictMode-safe cleanup |
| Renderer receiving a session | Keep the borrowed session alive | Render/evidence cleanup does not transfer session disposal ownership |

Adapter borrowing does not mean URL ownership is borrowed: a native final owner
may invoke the supplied URL allocator's revoke operation. Do not revoke URLs while
other sessions or active/queued saves hold them. Saved records reference persisted
asset authority; a previous document's Blob URL is not restoration authority.

## Fonts and export

Use the same resolved `fontRegistry` through ZIP ingestion, upload/linking,
preparation and renderer/export. Omitted/undefined uses default IndexedDB; null
uses embedded package authority. Registries are caller-owned. Exact identity
requires the linked binary/face and current private loaded face; system fonts alone
are insufficient. Registry replacement invalidates current publication authority.

When font helpers return a V1 renderer projection, merge only font requirements
and font assets into the canonical V2 candidate. Preserve fields/defaults/nodes,
Choices, bindings and configuration. Revalidate and reload the staging session.
Serialize uploads; retain the selected file for manual storage Retry.

SDK font activation/cache lifetimes remain distinct from temporary import/media
owners. Disposing a candidate must not indiscriminately revoke font-cache URLs or
undo completed caller-owned registry writes.

Font preflight is not renderer readiness. PNG waits for the accepted renderer's
current evidence. Renderer-handle export owns its registry; do not override it per
call. Stale exports cannot be accepted or downloaded.

## Saves and recovery

Native saves capture content/assets at invocation and serialize writes. Later
edits do not rewrite captured payloads; reset/disposal retain native queued-save
cancellation and exactly-once pin finalization. Repository failure does not justify
clearing entered work or deleting storage.

Recovery is template-scoped and token-owned. Retain fresh/resume intent on Retry;
failed reads are not missing work. Complete only the matching exported recovery
session. If export succeeds but cleanup fails, Retry cleanup only, never export
again. See [operation outcomes](OPERATION_OUTCOMES.md) and
[recovery](../architecture/template-recovery.md).

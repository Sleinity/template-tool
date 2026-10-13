# Operation outcomes and failure recovery

These are existing operation-specific contracts, not a uniform SDK error policy.
Hosts must handle returned results, native snapshots and promise rejection at the
correct boundary. Preserve entered work and guard callbacks against replacement.

| Operation | Expected unsuccessful outcome | Host response |
| --- | --- | --- |
| Core V2 parse/validation | Invalid data returns diagnostics/validation with no accepted canonical package | Inspect evidence; runtime/invocation exceptions may still throw |
| Browser V2 ZIP pipeline | `ready`, `blocked` or `error`; error retains failing stage and original cause | Accept only ready; dispose every candidate, including late results |
| Native load/configure/field mutation | Blocked snapshot or rejected mutation with blocking findings | Inspect status/acceptance; do not infer success from non-throwing calls |
| Single `loadSaved` repository failure | Resolves a blocked snapshot with `saved-session-load-failed` | Check snapshot status/error; do not assume a typed storage exception escapes |
| Family `loadSaved` repository-read failure | Rejects the promise | Catch the original repository/storage error |
| Family asset-hydration failure | Resolves blocked snapshot with `family-assets-unavailable` | Check the returned snapshot and keep accepted workspace ownership |
| Missing saved record | Single/Family blocked snapshot with the native not-found code | Distinguish missing from failed reads |
| Native save | Rejects on write failure or native queued cancellation | Keep work dirty; retry current accepted work manually; captured pins finalize natively |
| Recovery inspect/begin/save/complete | Promise rejection or operation-specific token result | Preserve ownership and fresh/resume intent; never reinterpret failure as empty storage |
| Recovery export completion | Successful export can be followed by `TemplateRecoveryCleanupError` with cause | Retain successful output; retry cleanup only |
| Font upload/registry reads/linking | Rejection for invalid/mismatched fonts or storage failure | Retain file/requirement for applicable Retry; prevent competing patches |
| Font preparation | Can return a non-ready report rather than rejecting | Check `exportReady`; linked metadata alone does not establish usable exact bytes |
| PNG export | Rejects missing/pending/stale authority or abandoned operations | No download from obsolete work; wait for current native readiness |

Disposed-session invocation errors and native supersession policies remain
operation-specific. Do not normalize them into a fabricated universal result.
For output correction, use current controllers and preserve unrelated drafts.

## Blocked storage

`TemplateStorageBlockedError` from Browser root or `/persistence` has stable code
`template-storage-blocked`, readonly database name/requested version and
`retryable: true`. Show: **Local storage is blocked. Close other tabs or windows
of this app, then retry.** Do not parse message text or delete/reset the database.

A save/read may reject immediately when an older IndexedDB connection blocks an
upgrade. Closing the blocker allows a fresh retry after the abandoned request
settles. There is no SDK retry loop or fixed waiting period. Single restore's
snapshot policy still differs from Family repository-read rejection.

## Feedback and ownership

Configuration **Apply** accepts the form into a native session; it does not
persist it. Studio saves configuration in **Review**. Output recovery autosave is
a separate Studio policy at 650 ms, not an implicit SDK-session behavior. Saved
content may still be invalid for export. Present save state and export readiness
separately. See [field guidance](../field-rules/STUDIO_AND_HOSTS.md) and
[ownership](HOST_LIFECYCLE.md).

# SDK 2.0.0 troubleshooting

Use stable issue codes for decisions and the operation's actual result/rejection contract. See [operation outcomes](SDK-OPERATION-OUTCOMES.md).

| Symptom | Check and correction |
| --- | --- |
| Import blocked before fonts/assets | Inspect `importEvidence`, `parseResult` and failure stage. Raw source must declare schema 1.0 and exporter 0.6.1. `SOURCE_EXPORTER_VERSION_UNSUPPORTED` is not corrected by relabeling source metadata. |
| Runtime preflight blocked | Call Browser `/compatibility` `inspectTemplateRuntimeSupport`; inspect browser/CSP, IndexedDB, font/image/SVG and capture capabilities. Current runtime schema compilation requires dynamic-code permission; do not silently weaken a host policy. |
| Exact font will not link | Check actual binary/face identity, requested style/weight and coverage. Upload the correct licensed binary; a matching system-family name is insufficient. Keep the registry stable across rendering/export. |
| Reopen failed | Single restore can return a blocked snapshot; Family repository reads can reject. Distinguish missing, incompatible canonical work and storage failure. Current V2 records retain native handling; no V1 confirmation reader is supported. |
| Local storage blocked | Close other app tabs/connections, then explicitly Retry. Check `template-storage-blocked`; do not delete/reset the database or reinterpret rejection as empty storage. |
| Control rejected a value | Use typed controllers and inspect `accepted`/blocking findings. Preserve incomplete input in the host. Do not mutate nodes or recover values from formatted display strings. |
| Export pending/blocked | Inspect current asset/font/line/renderer readiness. Mount the public V2 renderer, correct input and await current evidence. A saved record does not establish export readiness. |
| Old tab cannot save | A newer recovery lease superseded it. Reopen current work; do not retry an obsolete token against a new session. |
| PNG downloaded but cleanup failed | Preserve the successful output and retry recovery completion only. Never trigger a second export to clear recovery. |
| Different device lacks assets/fonts | Browser-local storage is not cross-device transport. Supply a host-owned portable storage service and licensed font authority explicitly. |
| External runtime request | Inspect host services, adapters, CSS and service workers. Deterministic SDK rendering needs no Figma/network dependency. |

[The starter checklist](SDK-QUICKSTART.md) and [compatibility guide](CONSUMER-COMPATIBILITY.md) cover host acceptance. [Historical confirmation/wizard guidance](SDK-HISTORY.md) does not describe current APIs.

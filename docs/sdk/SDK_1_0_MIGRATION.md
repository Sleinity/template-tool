# Migrating to the fixed-train 1.0.0 candidate

**Versioned, not published.** Core, Browser and React are 1.0.0 in this workspace.
Certification must bind exact archives and provenance; version labels alone are
not certification. Tagging and publication remain separate authorized operations.

## Breaking changes

| Contract | 1.0 direction | Required host action |
| --- | --- | --- |
| Canonical package/content schema | Schema 2.2; typed field identities and strict current records | Reimport original source ZIPs for incompatible canonical 2.0/2.1 work |
| Image replacement policy | One `replacementPlacement`: Fill, Fit or Crop; replaces allowed modes plus default | Author one policy; keep imported placement distinct; Reset restores source placement |
| Draft catalogue | Supported list/get/save/delete draft APIs and Family `saveDraft` removed | Use template-scoped recovery for output work; retain generic session/template persistence |

Canonical 2.0/2.1 packages and incompatible saved envelopes are deliberately not
migrated on read. Listings can expose lightweight **Reimport required** records;
that is not successful restoration. Do not synthesize canonical defaults/content
from working renderer nodes or silently discard old records.

## Source normalization and compatibility

Exporter source schema 1.0 is not canonical schema 2.0/2.1. Its existing
provenance-preserving import/normalization remains supported. The tested source
baseline is the exact exporter 0.6.1 Now Hiring, Cover and Carrousel ZIPs; it does
not certify every old exporter or Figma capability.

The unpublished 1.0.0 candidate supports V2 host workflows only. ZIP admission requires raw source schema 1.0 and exporter 0.6.1 before asset persistence or font linking. Other or missing versions return blocked with SOURCE_EXPORTER_VERSION_UNSUPPORTED and retained raw evidence. Canonical packages remain schema 2.2.

Source normalization and the private V1-shaped renderer bridge remain necessary for current exports. Read-only versioned evidence does not authorize V1 editing. V1 sessions, Family editing, wizard/confirmation, persistence, React importer and importer styles are retired. Historical readers/adapters are test-only and absent from supported host entries. Existing V2 records, assets, fonts and recovery tokens are preserved. Unknown historical records remain untouched outside the catalogue; no V1 migration is provided.

## Recommended integration

Use [V2 integration](V2_INTEGRATION.md), [ownership](HOST_LIFECYCLE.md),
[operation outcomes](OPERATION_OUTCOMES.md) and template-scoped
[recovery](../architecture/template-recovery.md). Retain import candidates through
font preparation and acceptance; borrow host adapters; preserve native single/
Family restore differences and save capture/pinning.

The corrected changesets have been applied to all three fixed packages at
1.0.0. Internal dependencies, lockfile, API/declaration expectations and archive
metadata must pass final certification together. Migration prose does not change
runtime semantics. Do not reuse the published 0.8 tag for this source contract.

> Historical published-version guidance. Not the current V2 or upcoming 2.0 migration contract.

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

V1 import wizard, confirmation and session/editor compatibility APIs remain
available. They are a separate compatibility journey, not a renderer mode or an
automatic migration into V2. Published [0.7→0.8 migration](SDK-0.8-MIGRATION.md)
remains historical and must not be used as the 1.0 migration policy.

## Recommended integration

Use [V2 integration](SDK-V2-INTEGRATION.md), [ownership](SDK-HOST-LIFECYCLE.md),
[operation outcomes](SDK-OPERATION-OUTCOMES.md) and template-scoped
[recovery](TEMPLATE-RECOVERY.md). Retain import candidates through
font preparation and acceptance; borrow host adapters; preserve native single/
Family restore differences and save capture/pinning.

The corrected changesets have been applied to all three fixed packages at
1.0.0. Internal dependencies, lockfile, API/declaration expectations and archive
metadata must pass final certification together. Migration prose does not change
runtime semantics. Do not reuse the published 0.8 tag for this source contract.

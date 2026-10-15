# Architecture audit closure and local SDK candidate

Date: 2026-10-09. Starting recorded gate: **sdk-061-field-render-evidence-20261009b**.
This record closes the incremental architecture audit for release preparation;
it does not authorize publication or a universal session rewrite.

This is the **2026-10-09 historical candidate assessment**. Later host-integration
milestones have separate current evidence: [font authority](host-font-authority.md),
[blocked storage](blocked-storage.md), [R07 raster review](r07-carrousel-raster.md)
[V2 example ownership — R02/R03](v2-example-ownership-lifecycle.md)
and [release delivery — R05/R06](release-delivery.md).
Their bounded closures do not establish completion of the remaining release
milestones or authorize publication.

The historical [platform boundary audit](TEMPLATE_PLATFORM_BOUNDARY_AUDIT.md)
describes earlier releases. Current code, checked package boundaries and the
following milestone evidence supersede its unfinished-work descriptions.

## Finding disposition matrix

| Finding | Disposition | Current authority / evidence |
| --- | --- | --- |
| Platform implementation bundled from root and dependent on Studio | Resolved | Boundary audit milestones 1A–2G; package/Core/Browser/React physical owners; `boundaries:check` |
| Unclear portable/browser/React ownership | Resolved | Core parsing/validation/materialization; Browser storage/resources/import/session/readiness; React rendering/bindings; checked entry inventory |
| Broad or accidental internal host imports | Resolved | Curated entries, protected API contract, archive/bundle checks; restricted fixed-train entries prohibited for hosts |
| Portable compatibility, source diagnostics, motion and silent capture boundaries | Resolved | Supported compatibility/inspection/motion/capture entries; API inventory and packed reference workflows |
| Exact-font registry coupled to template persistence | Resolved | Shared Browser binary/storage layer; font semantic matcher and activation owner remain separate; font lifecycle tests |
| Independent single and Family models obscure common semantics | Resolved for descriptive contract | [Definition/Instance projection](definition-instance-projection.md); internal and lossless; no production mutation authority |
| Mixed historical fixtures made architecture fidelity gate unusable | Resolved | [Three-export baseline](sdk-061-three-export-baseline.md); three exact 0.6.1 exports; historical corpus retained separately |
| Exact imported Color, SVG stroke and Cover compositing defects | Resolved within certified subset | Current source-reviewed three-export renderer references; ZIP numbers remain Color authority; renderer ADRs 0086/0090/0091 |
| Duplicate ZIP ingestion/normalization and unclear candidate ownership | Resolved | [Compiler-result report](internal-compiler-result.md); public V2 importer, Studio ingestion, batch/stale cleanup; [production-import evidence](evidence/production-v2-zip-import-20261008.json) |
| Duplicate Family field seeding and override derivation | Resolved | Private Family preparation; native initial/promotion/append transactions retained; [differential evidence](evidence/family-preparation-20261008.json) |
| Bundle budget, packed Core expectation and empty Family probe | Resolved | [Release-check evidence](evidence/sdk-release-verification-20261008.json); fixed declaration version contract, curated imports, active three-source Family probe |
| Failed restore cleanup and shared replacement asset loss | Resolved | [Session contract](internal-session-contract.md); [native/browser resource evidence](evidence/internal-session-contract-20261008.json) |
| Duplicated React single/Family snapshot interpretation | Resolved | Borrowed restricted readers and sole private React bridge; [snapshot-bridge evidence](evidence/react-session-snapshot-bridge-20261008.json) |
| Duplicated save queue mechanics | Resolved | Private serialized queue; native capture/pinning/cancellation/publication; [save differential](evidence/save-scheduling-20261008.json) |
| Temporary stored-asset hydration duplication | Resolved | Private hydration scope; native traversal/accepted ownership/errors; [hydration differential](evidence/stored-asset-hydration-20261009.json) |
| Colliding asset IDs leaked source ownership; persisted blob authority survived missing storage | Resolved | Separate single source/replacement ownership, final-owner leases, obsolete blob removal; [repair evidence](evidence/stored-asset-hydration-20261009.json) |
| Same-ID Blob → embedded replacement retained obsolete lease | Resolved | Single-only accepted cleanup; shared sessions/save pins protected; [replacement evidence](evidence/image-replacement-ownership-20261009.json) |
| Duplicated accepted Textarea evidence evaluation/runtime pruning | Resolved | [Evidence-evaluation differential](evidence/field-render-evidence-20261009.json): 133 complete before/after checkpoints; native freshness guards unchanged |
| Single/Family content/configuration revisions and publication watermarks | Intentionally different | Session contract: Family effective package and minimum-publication watermark; single native revisions/publication guards |
| Asset readiness, restore errors and accepted-resource pruning | Intentionally different | Single replacement/content ownership versus all Family variant sources/shared content and media decode; native error/notification behavior retained |
| Family absent-field values, placement overrides and selector no-ops | Intentionally different | Existing Family canonical content/selection authorities; no single-to-one-variant conversion |
| Draft catalogue/product persistence coupling | Resolved | [Recovery architecture](template-recovery.md); one token-protected slot per template; generic persistence retained |
| Reusable styled validation/field UI | Deferred, non-blocking | Public typed controllers and quality projections suffice; Studio design/navigation stays product-owned; no evidence of a required new UI API |
| Non-React pixels/Chromium service and new rendering backends | Deferred, non-blocking | Browser/React supported runtime; server service/backends require independent capability and ownership decisions |
| Full settled-graph/surface convergence and unsupported paint families | Deferred, non-blocking for this baseline | Renderer programme/accepted capability boundaries; no claim of general Figma-feature coverage |
| Session unification, persistence migration and compatibility removal | Deferred, non-blocking | No remaining demonstrated equivalent lifecycle branch requires consolidation; each needs an audit and differential plan |
| Current release documentation and archive certification | Resolved for this local candidate | Current V2 guide compiled against installed archives; npm/pnpm consumers, packed references and fresh three-export gate pass |
| Package version selection and published archive provenance | Deferred to publication preparation | Versions unchanged; pending fixed-train major changesets; no tags/publication here |

## Remaining native lifecycle differences

Single evaluates its base package, per-field required line checks and replacement
asset availability. Family evaluates the selected effective package, shared
content and variant sources, media decoding and variant-specific diagnostic
reasons. Native readiness publication and restore error behavior differ.

Family configuration may leave content revision unchanged; its minimum-publication
watermark rejects configuration A → B → A evidence. Single advances its native
revisions. First-save identity/publication guards, no-op selection, reimport and
restore behavior retain their original native meaning. Both own cancellation,
accepted resource leases and transient evidence. Shared helpers contain only
proven equal mechanics and never reinterpret those policies.

## Local candidate and release decision

The [current V2 integration guide](../sdk/V2_INTEGRATION.md) and
[release preparation guide](../sdk/RELEASE_PREPARATION.md) distinguish unpublished
0.8.0 source candidates from the published release and inventory breaking changes.
Packing records source/worktree, archive, dependency, fixture/font and environment
identity; packing alone is not certification. Supported API and comparison
baselines remain protected.

Current-run verification, candidate identity, exact commands, archive checksums,
protected hashes, environment results and final disposition are recorded in
[local candidate evidence](evidence/local-sdk-candidate-20261009.json).
Automated browser checks, stored-identity review and manual review are separate.
No historical pass substitutes for a missing current-run result.

### Current verification — 2026-10-09

The unpublished candidate in
`release-verification-artifacts/sdk-0.8.0-unpublished-20261009a` is **ready for
versioning and publication preparation**. Core, Browser and React remain 0.8.0;
no version, tag, changeset application or publication occurred. Its manifest
identifies the dirty source snapshot independently of that version and records
each archive, dependency and documentation checksum. Packing still says
`not-yet-verified`; a separate verification record binds the passing checks to
those exact archives.

The portable suite passed in both the established Node 24.19.0/pnpm 11.25.0
environment and Node 22.23.3/pnpm 11.9.0. The same archives passed isolated npm
11.21.0 and pnpm 11.9.0 consumers under Node 22, with all four V2 guide examples
compiled and the exact three-source single/Family contracts exercised. Packed
editor and Family browser workflows passed, including resource/font ownership,
offline restoration and PNG export. Studio, public V2, exact-font, recovery,
React lifecycle and native differential checks also passed. All curated bundle
profiles remain within unchanged limits.

Fresh gate **sdk-061-local-candidate-20261009a** is **GO**: 24 complete stable
captures, 12 passing renderer comparisons, three passing scene comparisons and
12 passing settlement comparisons. Its initial assessment deliberately rejected
the older review identity. The final assessment passed after exact source/font,
environment and byte-identical PNG checks retained the prior individual reviews;
the prior disposition is archived. This is current automated capture and stored
identity review, not a new manual live source review or reference approval.
Carrousel Color passed against ZIP numbers. All 324 protected artifacts remain
unchanged, as do all 275 package source/build-contract files from the candidate
snapshot. Documentation and test-only verification changes are recorded separately.

The early toolchain setup failure remains non-final evidence: its pnpm shim was
not executable and fell back to the local runtime. The corrected explicit Node
22/pnpm 11.9.0 run passed. Both toolchains were exercised on macOS arm64; Linux
CI and registry round-trip verification remain publication-workflow checks, not
claims of this local certification.

There are no unresolved runtime or architecture defects blocking this candidate.
The next step is to choose the fixed-train version, reconcile the final breaking
release notes and version-specific declaration contract, then execute the guarded
publication workflow. No further session consolidation is required for this
release; deferred architecture work needs its own evidence and decision.

# ADR 0081: Studio and custom hosts share V2 configuration and content authority

- Status: Accepted
- Date: 2026-09-04

## Decision

Studio's default authoring workflow consumes V2 packages, Browser V2 single and
Family sessions, typed controllers and the ordinary React renderer bridge.
Form drafts are not canonical state. Public `configure()` transactions validate
portable metadata/rules/order through Core, preserving bindings, defaults,
content and managed assets. Family collections replace atomically.

Core reconciliation advances currentness and explicitly reconciles stable
selected choices, never renderer readback. Existing semantic errors remain
correctable through the normal reducer; structural/schema failures still block
mutation. Each accepted configuration transaction materializes once.

Closure clarification: Family configuration reconciles affected common Choice
content independently of selected-variant presence, reusing Core's stable-ID
behavior. Configuration and content publish atomically. Unchanged canonical
entries retain their state/revision; changed entries advance the Family content
revision once. Configuration-only currentness uses existing operation and
publication identities, not manufactured canonical content revisions. Removed
options clear selection provenance and preserve the value, as Core already did.

The renderer bridge acquires a publishing lease on committed mount rather than
in a StrictMode-discardable initializer. Callbacks also compare session operation
revision. Browser Blob ingestion uses a schema-valid managed/stored URL carrier
and decodes local bytes for missing dimensions. No crop, line or rendering owner
is added.

Studio's controls remain Studio-local. A public-only external host demonstrates
ordered controllers, custom brand-palette hints, canonical Number/Date/Crop and
guarded PNG. No component registry or SDK form framework is introduced.

## Compatibility and evidence

Legacy V1 saved work is isolated at `?studio-mode=legacy`. Original ZIPs normalize
to V2 for new authoring; no working-node values are guessed into canonical state.
Persistence/reimport retain their versioned, review-first boundaries.

The Studio/custom-host browser test is product integration evidence. Existing
Boolean/Crop/Textarea source boundaries remain ADRs 0078–0080; dedicated
multi-aspect Family source certification remains outstanding. No reference
promotion is authorized.

## Reversal

Revert the UI route and additive configuration APIs coherently while preserving
V2/V3 records. Never restore renderer readback as canonical value authority.

# Settlement Evidence Harness

The harness compiles `scripts/settlement/model-entry.mjs` as a temporary SSR bundle. It imports exact registered ZIP bytes through the production import pipeline, derives the canonical scene and dependency graph, converts fidelity DOM reports into measurement snapshots, settles them, and writes comparison evidence. No settlement module is imported by the production application.

## Commands

```sh
pnpm settlement:baseline -- --fidelity-run <run> --run-id <id>
pnpm settlement:compare -- --fidelity-run <run> --run-id <id>
pnpm settlement:update -- --source-run <id> --reason "reviewed reason"
pnpm settlement:scenario -- --fixture now-hiring-post --scenario all --run-id <id>
pnpm settlement:browser-scenarios -- --run-id <id>
pnpm settlement:report -- --source-run <id>
```

All observed commands accept the fidelity harness `--fixture` and `--surface` filters. `--profile chromium-visible` classifies visible-browser observations separately. Normal baseline, observe, compare, scenario, and report commands never modify approved settlement references.

## Artifacts

Candidates use:

`fidelity/settlement/candidates/<run>/<fixture>/<surface>/`

Each surface contains:

- `dependency.json`;
- `measurements.json`;
- `settled.json`;
- `trace.json`;
- `comparison.json`;
- non-critical `performance.json`.

Approved settlement references use the same five comparison-critical files under `fidelity/settlement/snapshots/approved/`. They are independent of pixel references and canonical scene snapshots. Updating them never authorizes another reference type to change.

## Update guard

An update requires a reason of at least 12 characters. For each file it retains the prior approved value when present, the candidate replacement, a deterministic difference report, fixture/surface identity, reason, and timestamp under `fidelity/settlement/update-evidence/`. A missing reason fails before mutation.

## Browser scenarios

`settlement:browser-scenarios` drives the real now-hiring ZIP through import, font decision, persistence, draft restoration, and editor UI. It observes baseline, short text, long text, cleared text, browser image replacement, cleared replacement, and preview-container resize. Every scenario is sampled twice after current font/asset/geometry readiness; its DOM evidence is passed to the observational settlement model.

This scenario command does not approve references. The synthetic scenario command separately exercises explicit root-width, late-font, and asset-state invalidation contracts. Exact-font activation is unavailable in the current fixture environment and remains a verification gap.

## Fixed comparison policy

Geometry uses the existing 0.25px tolerance and text measurement uses 0.5px. Comparison-critical settlement values are normalized to four decimals; timestamps, run IDs, process time, and random draft IDs are excluded. Pixel policy remains owned by the fidelity harness and is not broadened here.

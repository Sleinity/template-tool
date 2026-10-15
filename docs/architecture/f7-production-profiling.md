# F7 production media profiling — 2026-10-15

The bounded profiling milestone is complete. Cover repeatedly performs 15 additional Family derivations for 15 media completions without changing content, materialization, primitive-tree or backend identity. Those derivations consume a median 76.0 ms on cold Family opening and 77.4 ms on first Cover selection in the detailed profile. Fourteen or fifteen execute before the initial editor mount request in every cold-Cover trial. All fifteen execute before final readiness in both workflows. This is observed synchronous work in the mount/readiness sequence; it is not a measured 76–77 ms potential user-visible saving.

The evidence supports a separate, bounded F7 ownership/implementation plan. Keep implementation deferred until that plan defines readiness-only publication and preserves immutable content/render inputs, stale-completion rejection, selection and disposal ownership, exact fonts, line validation and revision-bound PNG raster readiness. No production readiness state, batching, caches, renderer owners or public APIs changed here. A future implementation must demonstrate benefit with minimally instrumented before/after pairs; cold-versus-warm differences cannot establish that saving.

## Context, scope and measurement contract

[Candidate certification](sdk-v2-candidate-certification.md) reached GO before profiling began. Every one of the 353 SDK/Studio source files selected from the candidate inventory was hash-verified unchanged by the runner. The exact three exporter-0.6.1 ZIPs and four managed font binaries are hash-gated; canonical schema 2.2 and source schema 1.0 remain unchanged. Instrumentation is a Vite test-build transform, absent from the separately built production application. All production application JavaScript chunks were checked for the test hook and their hashes retained.

The harness mounts production-built `DraftEditor`, renderer and controls through the existing public import, exact-font, Family and Studio persistence authorities. It records import/font setup separately from native load, media callbacks, materialization/tree work, publications, React commits, export readiness, observed stable preview and PNG. Detailed media events retain source URL/asset/node identity; publications retain current selection/content/materialization/tree/backend revisions. These are observations, never injected readiness. Single controls have no native Family decode callback; DOM media observations and renderer readiness remain separate evidence.

Seven workload sequences cover three cold singles, cold Family opening with each of the three designs initially selected, and one live Family sequence through all designs followed by warm revisits. One discarded warmup and five matched detailed/minimal pairs per sequence produce **120 measured steps / 60 step pairs**, with 24 warmup steps excluded. Steps within a Family sequence are correlated; analysis is per case across five paired contexts, not a pooled independent-sample claim. Detailed/minimal order alternates. Fresh contexts/storage/sessions establish decode/session coldness, while browser process and OS/disk caches are warm or uncontrolled. Warm steps retain the same live session. PNG occurs only at the sequence end because successful product export completes recovery.

Environment: macOS arm64, Node 24.19.0, Chromium 149.0.7827.55, Vite 6.4.3, React 19.2.7; 1440×1600 viewport, DPR 1, reduced motion, en-US/UTC. Separate native accepted-load time, ready publication, stable DOM and PNG boundaries are retained. Three stable geometry frames are an observational harness wait, not production export authority or compositor paint. Nested spans overlap and must not be added together.

## Results and limits

| Workflow | Minimal final-ready median | Minimal stable-preview median | Native media completions / total Family derivations | Detailed media-derivation median |
| --- | ---: | ---: | --- | ---: |
| Cold Family, Now Hiring | 163.6 ms | 212.5 ms | 1 / 2 | 4.5 ms |
| Cold Family, Cover | 268.5 ms | 317.9 ms | 15 / 16 | 76.0 ms |
| Cold Family, Carrousel | 217.7 ms | 269.6 ms | 2 / 3 | 13.9 ms |
| First switch to Cover | 472.0 ms | 521.3 ms | 15 / 16 | 77.4 ms |
| Warm Cover revisit | 91.8 ms | 181.1 ms | 0 / 1 | 0 ms |

All ten detailed cold-open/first-switch Cover observations retain identical content/materialization/tree/backend identities across each media-triggered publication. First Cover selection produces 38 editor commits in every detailed trial; warm Cover has five. This is useful attribution, not proof that every extra commit can be removed. The five cold-Cover trials perform 14–15 derivations before mount; their exact intervals and work counts remain in the packet.

No media derivation overlaps a recorded >50 ms long task in this run. Other renderer/setup long tasks occur in these new cold/switch workflows and are retained; the prior typing benchmark's absence of long tasks does not apply to them. The proposed follow-up is justified by recurring work in the mount/readiness sequence, not a claim that F7 causes those long tasks. Decode scheduling, persistence setup, fonts and renderer settlement also contribute. Detailed-minus-minimal ready-time paired intervals include zero for all twelve cases; this bounds observed instrumentation variability, not a performance-equivalence guarantee. Five-trial p95 values are descriptive and do not establish a reliable tail distribution.

Cold single controls have final-ready medians 155.2 / 165.2 / 172.5 ms. Actual button-to-download PNG medians are 534.3 / 435.2 / 698.5 ms for singles and 514.8 / 443.7 / 734.4 ms for corresponding cold Families. These include save/recovery and capture work; they are not rasterizer-only measurements. Warm sequence export is Carrousel only. No export preparation optimization or speedup is claimed.

## Lifecycle and application verification

Separate diagnostic cases pass: invalid media blocks readiness/export; rapid selection while decode is held never republishes obsolete selection/content; disposal rejects late completion without another publication; image replacement then Reset restores the original replacement-asset dictionary at a newer content revision and permits PNG. Only these diagnostics use invalid or held HTTP media; measured workloads never delay or combine callbacks.

An independently built, uninstrumented production application opens a Family saved through supported APIs, follows Library → Create output, selects all three designs through the real control and downloads PNG. No external network request or browser exception occurred. This is automated browser coverage with API-prepared exact inputs, not manual live interaction or a complete setup-wizard review.

The [raw compressed packet](evidence/f7-production-20261015/profile.json.gz), [analysis](evidence/f7-production-20261015/analysis.json), [source/tooling identities and invalid pilot history](evidence/f7-production-20261015/identity.json) and [verification](evidence/f7-production-20261015/verification.json) are durable. The first two pilots were rejected for harness errors (wrong initial-selection signature; attempting reuse after completed export). Their failed packets/logs remain under `nonfinal`; a corrected one-pair pilot is preliminary only. Evidence validation also rejects eight deliberately incomplete, stale or corrupted packet variants.

## Reproduction

Run the workload in isolation from other builds/profiling:

```sh
node scripts/f7/run.mjs --output /tmp/f7-new-run --trials 5
node scripts/f7/analyze.mjs /tmp/f7-new-run/profile.json /tmp/f7-new-run/analysis.json
node scripts/f7/validate-evidence.mjs /tmp/f7-new-run/profile.json
```

The analyzer also reads retained `.json.gz` packets. The runner refuses changed certified runtime sources or missing/mismatched ZIP/font bytes, requires prior candidate GO and uses disposable browser contexts. No promotion command is part of this workflow.

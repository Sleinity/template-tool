# Fidelity Environment Policy

Approved comparisons are environment-sensitive. Each run records:

- operating system/release and architecture;
- Node and package-manager identity when exposed;
- browser name/version;
- viewport 1440×1600, device-pixel ratio 1, CSS capture scale 1;
- locale `en-US` and timezone `UTC`;
- loaded `FontFaceSet` entries, explicit replacement decisions, and known fallback use;
- capture timestamp and optional build/content identifier;
- system memory as context only.

The repository is not a Git checkout. `gitCommit` is therefore always `null`; content/fixture hashes carry identity. Font sources unavailable through browser APIs remain `unknown` rather than inferred.

The default headless path uses the matching Playwright Chromium, with the existing Remotion headless shell as a local fallback. `--headed` uses Playwright Chromium or `FIDELITY_BROWSER_CHANNEL`. Do not compare outputs from a materially different OS/browser/font environment as if they were the same baseline; either reproduce the approved environment or create a separately reviewed environment policy.

Exact font absence is visible in the fixture run and environment report. The
application-default baseline retains its recorded replacement state through a
development-only harness operation; the user-facing Studio and SDK setup flows
do not expose replacement controls. Those pixels are a regression baseline,
not an authoritative exact-font design reference.


## Current Studio capture profile

Since the 2026-09-25 driver repair, current Studio captures use the registered
exact-font upload flow for both accepted profile labels. They do not invoke the
retired development fallback API. Only selected-fixture fonts are required;
unknown/unavailable required faces fail rather than being silently substituted.
Historical application-default captures retain their original fallback evidence.
The current-export before/after runs share the same exact-font environment and
do not promote or overwrite those historical references.

The SDK gate's explicit `studio-reference-20261012` presentation camera retains
the established 906×1444 stage at (485,107) within the unchanged 1440×1600 browser
viewport. It is test-only and recorded per fixture; actual Studio layout is tested
separately. See [the camera contract](HARNESS.md#explicit-studio-source-capture-camera--2026-10-12).

R07 establishes that identical final bounds do not identify the complete native
raster environment. The intentional output startup at 40%, followed by Fit,
changes two clipped Carrousel thumbnail samples relative to the historical Fit
startup, even with identical final unrounded inputs. The driver records native
pre-Fit mode, transform, zoom, scroll, DPR and motion state. Camera geometry,
action order, Chromium and tolerances remain unchanged. See the
[causal source review](../architecture/r07-carrousel-raster.md). Do not repair
browser sampling history by snapping geometry or force-painting content.

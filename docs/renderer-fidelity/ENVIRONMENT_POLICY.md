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

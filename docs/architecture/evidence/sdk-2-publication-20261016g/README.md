# SDK 2.0.0 — published and verified

[The public Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v2.0.0)
and all three GitHub Packages versions are published from approved commit
`a1564a9ba6cffeacf0ffe14f1c475e6d1bed5cae`. The SDK tag and three package-version
tags point to that commit. [The final report](publication.json) records the
registry identities, publication history, acceptance and limitations.

Bas starts with the [complete starter](https://github.com/Sleinity/template-tool/releases/download/sdk-v2.0.0/SDK-HOST-STARTER.zip)
and [onboarding guide](https://github.com/Sleinity/template-tool/releases/download/sdk-v2.0.0/SDK-QUICKSTART.md),
placing the three Release archives in `vendor/`. Vendored installation requires
no registry credentials. Exporter 0.6.1 ZIPs and licensed exact fonts are separate
inputs; private certification ZIP/font binaries are not bundled. SDK 2.0.0 keeps
V2 host workflows, source schema 1.0 and canonical schema 2.2.

## Actual released-input verification

- [Anonymous downloads](anonymous-download.json): all 53 public assets downloaded
  with curl user configuration disabled and no authorization header; byte sizes
  and GitHub digests match.
- [Complete delivery equivalence](whole-delivery-equivalence.json): every downloaded
  asset exactly equals the actual registry-derived delivery used by eight macOS
  npm/pnpm host groups. This binds the tests by content identity; their report
  accurately labels its locally generated registry-handoff input.
- [Registry/Release comparison](registry-release-comparison.json): all three
  Release tarballs exactly equal direct registry downloads and match every regular
  file in certified G. Registry container hashes differ from the local pack and
  are recorded separately. The starter ZIP is byte-identical to certified G.
- [Successful protected receipt](release-success-receipt.json): Linux's eight host
  groups, published Core consumer, exact single/Family references, public visibility,
  upload inventory and private-fixture cleanup pass. The two managers on each
  platform pass 16 fresh-starter checks each; seven guide examples typecheck.
- [Source-bound certification](../sdk-host-release-20261016g/certification.json):
  retained 24 stable captures, 12 renderer, three scene and 12 settlement comparisons.
  No new source-fidelity capture is claimed for publication: exact shipped regular-file
  identity binds this evidence to the packages. All 285 protected identities remain.

## Publication recovery and follow-up

[Attempt one](attempt1-receipt.json) published Core, then concurrent prepack builds
removed declarations needed by dependent builds. [Attempt two](attempt2-receipt.json)
skipped Core and published Browser; React hit the same race. Attempt three skipped
both dependencies and published React. All retries kept the exact approved source,
protected reviews, tests and immutable existing versions. No local package publish
or credential-scope change occurred. The three missing package-version tags were
explicitly retained without force after registry-content verification.

Before the next SDK version train, correct concurrent prepack publication and
require every expected package tag. That automation correction is outstanding;
released SDK consumption is verified. Bas's integration and the Studio redesign
can use these immutable artifacts. No SDK source, API, schema, reference or
performance change is included in this publication record.

Browser automation and personally reviewed stored G source/capture evidence remain
separate. Manual live/accessibility and Bas's personal review were not performed.
Chromium is the certified browser; offline reopening assumes an already loaded app.

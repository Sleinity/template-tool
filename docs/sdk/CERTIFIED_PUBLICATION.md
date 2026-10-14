# Certified SDK publication and stable baseline

SDK 1.0.0 is [published and stable](https://github.com/Sleinity/template-tool/releases/tag/sdk-v1.0.0).
The immutable runtime tag is `33bd70dbca1f02cdd6c80a83dc1ba4666d2ed348`;
reviewed post-handoff main is the source starting point for future milestones.
Read the [publication report](../architecture/sdk-1-publication.md),
[baseline handoff](../architecture/sdk-1-baseline.md) and [roadmap](RELEASE_ROADMAP.md).

## Read-only verification

Use Node 22.23.3 and pnpm 11.9.0 with GitHub Packages read access:

```sh
pnpm sdk:baseline:verify --local
pnpm sdk:baseline:verify --hosts
```

Local verification checks durable receipts, certified tag sources and protected
references. Remote verification checks stable release status, the tag, all 41
assets, delivery links/anchors against original tag source, and all three registry
archive hashes. The host check installs exact registry versions with npm/pnpm,
checks lock origins/integrities and installed bytes, compiles the delivered V2
guide/example with `skipLibCheck: false`, and exercises synthetic single/Family
edit, Reset, save/reopen and disposal. It does not replace retained exact-font/PNG
certification. No Actions artifact, fixture decryption or package-write permission
is needed. Never paste tokens or put them in a repository npmrc.

## Retired execution contract

The fixed 1.0.0 publication, preparation, certification and promotion paths are
retired. Their [archived workflows](../architecture/evidence/sdk-1-baseline-20261014/workflows/)
and immutable descriptors remain historical evidence. The protected existing-tag
recovery was an explicitly reviewed exception, not a future release policy.
Old CLI entrypoints refuse execution before writes or fixture access. Do not
resume them by restoring the retired secret or broadening source exceptions.

A future release requires a new candidate identity, reviewed source contract,
sequential build/pack, frozen archives, fresh platform acceptance and required
fidelity evidence. Read renderer programme guidance before behavior changes.
Never repack 1.0.0, move its tag, overwrite assets or infer approval from stability.

## Ownership and retention

Temporary input retirement is recorded in the baseline report. Original source
fixtures/fonts and private captures remain protected; sanitized reports and
published bytes remain available. Key retirement does not erase historical Git
ciphertext. User credentials and borrowed adapters are unrelated to that cleanup.
GitHub release visibility is public; packages remain UNLICENSED and authorized
only for Sleinity-owned applications.

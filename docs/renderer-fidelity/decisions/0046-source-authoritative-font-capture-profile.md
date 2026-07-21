# ADR 0046: Source-authoritative font capture profile

## Status

Accepted

## Context

The normal fidelity profile intentionally chooses recorded replacements. Direct `FontFace` injection in specialist tests did not prove that import, Fonts UI, persistence, restore, runtime linking, and export agree.

## Evidence

Run `milestone-5-approval-review-final` hash-verifies both registered files, uploads them through the real UI, restores the saved draft, and captures every surface twice. All repeats are pixel- and structure-stable. Historical-reference failures were retained before guarded promotion; final run `milestone-5-approved-final-exact-v2` passes 4/4.

## Decision

Keep `application-default` and `source-authoritative` as distinct profiles. The source profile must fail on missing/changed exact bytes, use the real Fonts link flow, record request/face/hash/runtime identity, and never promote references automatically.

## Alternatives

Treating source `preview.png` as a golden and direct test injection were rejected as insufficient approval and integration evidence.

## Consequences

Exact-font changes first produce reviewable unapproved candidates. Promotion remains a separate explicit action with a reason and evidence. External binary provisioning remains an environment prerequisite.

## Compatibility impact

Harness-only modules stay outside production. The ordinary profile remains distinct. Approval may replace only explicitly reviewed fixture/surface references; unrelated approved hashes remain unchanged.

## Migration impact

Future exact-font fixtures add hash-gated manifest entries and explicit license/source notes.

## Verification

Missing file/hash failure, real upload, exact classification, repeated four-surface capture, PNG export, reference immutability, environment metadata, and failure artifacts are required.

## Reversal strategy

Remove the profile scripts while retaining candidate evidence and the production font-identity contract.

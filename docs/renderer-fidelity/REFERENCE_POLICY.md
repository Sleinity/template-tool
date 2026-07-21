# Fidelity Reference Policy

The evidence system keeps three concepts separate:

- **Source reference**: embedded `preview.png` or another design-source image. It expresses intent and is never an automatic pass condition.
- **Approved renderer reference**: reviewed expected current output for one exact fixture hash and capture surface, stored under `fidelity/references/approved/<fixture>/<surface>/`.
- **Current candidate**: output of one run under `fidelity/candidates/<run>/<fixture>/<surface>/`.

Baseline and comparison runs cannot write approved references. Missing approval causes `fidelity:compare` to report `unapproved` and return non-zero. Similar filenames, newer timestamps, source references, and changed implementation output are never promotion rules.

Promotion requires `pnpm fidelity:update -- --run-id <run> --fixture <id> --surface <surface> --reason "<reviewed fidelity reason>"`. Fixture/surface filters may be omitted only when the same reviewed reason genuinely applies to the full run. The command uses pending files plus atomic rename and stores update evidence under `fidelity/update-evidence/`.

For replacement updates, evidence includes the previous approved PNG, candidate PNG, transparent difference image, structural before/after, environment, exact fixture identity/hash, reason, timestamp, and pixel summary. An initial approval has no prior image; its metadata explicitly represents initial promotion rather than inventing a previous reference. Initial Milestone 1 references were reviewed as current-behavior baselines, not declarations that fallback fonts or source-design fidelity are correct.

Golden changes require a fidelity reason and review. Never update references merely to make comparison green. If the intended change is uncertain, retain the failure artifacts and leave the approved reference untouched.

## Reviewed source-fidelity corrections

An approved renderer reference is a regression baseline, not perpetual visual authority over stronger source evidence. When a historical baseline is known to preserve an incorrect renderer interpretation, a fidelity milestone may classify a candidate as a **reviewed source-fidelity correction**. This classification does not promote it automatically.

The review packet must retain the exact ZIP and embedded-source hashes; source preview; exported node bounds and semantics; old approved reference; intervening candidates; current candidate; pixel/structural diffs; exact font and environment identity; semantic/paint/clip geometry; and the specific fidelity reason. Review must distinguish corrected capability pixels from independent unresolved families.

For `now-hiring-post`, `preview.png` is the primary source-design reference, ZIP node bounds/Figma metadata are structural authority, the approved renderer image is historical regression evidence, and Milestone 5/5.1 outputs are intervening candidates. A corrected reference may replace that history only after explicit review confirms all live surfaces, text bounds, glyph placement, and remaining media-only differences. The guarded update command and retained before/after evidence remain mandatory.

The Milestone 5 approval review promoted the four `now-hiring-post` surfaces from run `milestone-5-approval-review-final`. Review retained hash/face/runtime identity, source-region pixel evidence, exact trim and line widths, PNG clone-boundary evidence, historical references, and independent media discrepancies. Historical now-hiring references ceased to be authoritative because they encoded pre-trim, replacement-font, or PNG fallback behavior. All approved identities outside those four fixture/surface references were preserved.

Milestone 6 candidate `milestone-6-source-final` corrects a separate media interpretation: dynamic FILL ignores a retained CROP-only matrix and uses centered cover from the current slot. It remains a current candidate until explicit review confirms the source rectangle and all four surface profiles. Normal comparisons must continue to fail against the historical media pixels. Additive placement telemetry and source-corrected pixels are evidence, not automatic permission to rewrite either now-hiring or unrelated fixture references.

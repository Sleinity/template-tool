# SDK 2.0.1 — bugfix release

- Preserve shared Family choices when reordering fields or changing labels and unrelated rules.
- Correct stale preview readiness after reload/reset/restore and recover rendering after invalid content is repaired.
- Enforce Studio textarea line limits using the visible preview; rejected edits stay out of recovery and PNG output.
- Correct Family image diagnostics and make invalid choice selections visible and repairable.

No public API, schema or saved-data migration changes. Upgrade Core, Browser and
React together on the fixed 2.0.1 train.

Prepared as a patch Changeset for review. The published baseline remains 2.0.0
until the normal versioning and certified publication steps complete.

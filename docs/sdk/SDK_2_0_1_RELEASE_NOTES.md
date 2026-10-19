# SDK 2.0.1 — bugfix release

<!-- delivery-context:start -->
Core, Browser and React are versioned 2.0.1. This candidate awaits protected release certification and publication.
<!-- delivery-context:end -->

- Preserve shared Family choices when reordering fields or changing labels and unrelated rules.
- Correct stale preview readiness after reload/reset/restore and recover rendering after invalid content is repaired.
- Enforce Studio textarea line limits using the visible preview; rejected edits stay out of recovery and PNG output.
- Correct Family image diagnostics and make invalid choice selections visible and repairable.

No public API, schema or saved-data migration changes. Upgrade Core, Browser and
React together on the fixed 2.0.1 train.

This patch requires no host migration. The published baseline remains 2.0.0
until certification and publication complete.

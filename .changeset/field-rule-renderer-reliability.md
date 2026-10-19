---
"@sleinity/template-core": patch
"@sleinity/template-browser": patch
"@sleinity/template-react": patch
---

Fix stale renderer readiness after reload, reset and saved-session restoration.
Preserve shared Family choices during ordering and unrelated configuration edits,
and restore renderer publication after correcting invalid content.

Studio now validates textarea line limits against the visible renderer, restores
rejected edits without saving provisional content, uses effective Family image
diagnostics, and exposes invalid choice selections for repair.

No public API or saved-data migration changes. Core advances with the fixed SDK
train; its portable behavior is unchanged.

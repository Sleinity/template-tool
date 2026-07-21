# Fidelity Failure Artifacts

Failed and unapproved comparisons are retained under:

`fidelity/artifacts/<run-id>/<fixture-id>/<surface>/`

The harness never deletes the latest failure automatically. Stable path segments are sanitized; exact fixture identity remains inside the report.

Where available, each failure contains:

- `approved-reference.png`;
- `current-candidate.png`;
- `difference.png`;
- `structural-report.json`;
- `comparison.json` with pixel and geometry summaries;
- `environment.json`;
- `fixture-identity.json` with ZIP/source hashes;
- `browser-console.json` with warnings/errors;
- `font-readiness.json`;
- `route-and-timing.json`.

Candidate surface folders also retain repeated captures, repeated structural reports, browser console evidence, and a complete-page surface screenshot where useful. A dimension mismatch has no same-size diff bitmap and is reported explicitly. An unapproved comparison has no approved image by definition; all available candidate evidence is still retained.

Failure artifacts are local run output and ignored by source control. Approved references and durable policy/docs remain repository evidence. Reference-update evidence is retained separately and must not be confused with failure output.

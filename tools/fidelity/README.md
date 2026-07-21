# Fidelity tooling boundary

The existing Node-side harness remains under `scripts/` and stores manifests,
approved references, and local run evidence under `fidelity/`. This directory
marks that tooling as a monorepo tool rather than a production SDK dependency.

No file below `tools/fidelity`, `scripts/fidelity`, or `fidelity` is included in
the three private package archives.

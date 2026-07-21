# Changesets

Every SDK-facing pull request adds a changeset with `pnpm changeset`. Select the
affected private packages and record the consumer-visible change. Fidelity fixes
without an API break are patches; backwards-compatible capabilities are minors;
breaking contracts are majors.

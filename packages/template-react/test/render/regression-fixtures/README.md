# Template Package renderer regression fixtures

Fixtures are grouped by renderer concern and remain test-only. Runtime renderer
code must never branch on fixture IDs, names, or node names.

Each fixture contains:

- a JSON-compatible `TemplatePackageV1`
- a renderer mode (`static` or `editor`)
- expected node style fragments
- expected compatibility warning codes

## Add a fixture

1. Choose the smallest matching concern module.
2. Clone `createRendererFixturePackage()`.
3. Change only the package properties required for the behavior.
4. Give the fixture a generic kebab-case ID.
5. Add focused style and warning expectations.
6. Run `TemplatePackageRegressionFixtures.test.tsx`.

When a real template exposes a bug, reduce it to package semantics. Do not copy
brand names, field IDs, or complete production templates into this library.

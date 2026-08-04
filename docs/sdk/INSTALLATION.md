# Install Template Platform SDK 0.7.0

Install the three SDK packages at the same version. Choose one installation
method and do not mix registry and archive dependencies.

## Recommended: GitHub Release archives

Use this method for external hosts, agent-built applications and environments
that should not receive a GitHub Packages credential.

1. Download these files from the public
   [`sdk-v0.7.0` GitHub Release](https://github.com/Sleinity/template-tool/releases/tag/sdk-v0.7.0):

   - `sleinity-template-core-0.7.0.tgz`
   - `sleinity-template-browser-0.7.0.tgz`
   - `sleinity-template-react-0.7.0.tgz`
   - `SHA256SUMS`

2. Put all four files in the host repository's `vendor/` directory and verify
   the archives before installing:

   ```sh
   cd vendor
   shasum -a 256 -c SHA256SUMS
   ```

3. Add exact local dependencies:

   ```json
   {
     "dependencies": {
       "@sleinity/template-core": "file:vendor/sleinity-template-core-0.7.0.tgz",
       "@sleinity/template-browser": "file:vendor/sleinity-template-browser-0.7.0.tgz",
       "@sleinity/template-react": "file:vendor/sleinity-template-react-0.7.0.tgz"
     }
   }
   ```

4. pnpm hosts must also pin the private transitive package closure in
   `pnpm-workspace.yaml`:

   ```yaml
   overrides:
     "@sleinity/template-core": "file:vendor/sleinity-template-core-0.7.0.tgz"
     "@sleinity/template-browser": "file:vendor/sleinity-template-browser-0.7.0.tgz"
     "@sleinity/template-react": "file:vendor/sleinity-template-react-0.7.0.tgz"
   ```

5. Run the host's normal install command and commit the updated lockfile. Check
   that all three installed package versions resolve to `0.7.0`.

Do not add a GitHub Packages `.npmrc`, `NODE_AUTH_TOKEN` or personal access
token to a vendored consumer. The release archives are downloaded back from
GitHub Packages by the release workflow, so the public files retain registry
provenance.

## Optional: authenticated GitHub Packages

Use this method only when local development and CI can safely provide a GitHub
Packages credential.

```ini
@sleinity:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
always-auth=true
```

```sh
pnpm add @sleinity/template-core@0.7.0 \
  @sleinity/template-browser@0.7.0 \
  @sleinity/template-react@0.7.0
```

The token must be a classic GitHub personal access token with `read:packages`
and access to the packages. Never commit the token.

## Choose only what the host needs

- Core-only import and validation may install only
  `@sleinity/template-core@0.7.0`.
- Headless browser import, sessions, persistence or capture require core and
  browser at `0.7.0`.
- React UI or rendering requires the complete fixed train plus React 19 and
  React DOM 19.

The full runtime assumes a modern browser with IndexedDB, `FontFace`, SVG,
blob/data URLs, image decoding and the APIs reported by
`inspectTemplateRuntimeSupport()`.

## Common failures

- **GitHub Packages returns 401/403:** the token or package access is missing.
  Use the Release archives when a secret cannot be provided.
- **pnpm contacts GitHub Packages after vendoring:** add all three exact
  overrides shown above and reinstall from a clean dependency directory.
- **Two SDK versions are installed:** make every direct dependency and pnpm
  override exactly `0.7.0`.
- **React peer conflict:** upgrade the host to React 19 before adopting
  `@sleinity/template-react`; do not force an unsupported peer resolution.
- **An export cannot be resolved:** import only package roots and documented
  subpaths. Never import package `src/`, repository paths, Studio code or an
  entry named `renderer-internal`.
- **The browser is blocked:** show the stable issues returned by
  `inspectTemplateRuntimeSupport()` instead of bypassing the check.

After installation, choose an implementation track in the
[agent integration prompts](AGENT_INTEGRATION_PROMPTS.md) or inspect the
[template editor reference](../../examples/template-editor-integration/README.md).

# Figma MCP Enrichment

The template package document remains the renderer contract. Figma MCP evidence is
optional verification data and is never executed as JSX, React, or CSS code.

## Flow

1. Parse and validate the uploaded Template Package.
2. Prefer a deliberate user override, otherwise extract the bundled `mcp.json`
   Figma URL into `fileKey` and normalized `nodeId`.
3. Generate stable `rendererHints` from package data.
4. When a host provides MCP evidence, compare live metadata with package nodes.
5. Record design-context observations as non-executable debug hints.
6. Analyze embedded assets without removing or rewriting them.
7. Render deterministically from the enriched package.

The browser calls `POST /api/template-package/enrich-figma`. The route is
mounted in the local Vite host and keeps credentials, provider calls, and raw
design context outside the renderer.

## Provider configuration

Preferred MCP gateway:

```text
FIGMA_MCP_PROVIDER_URL=http://127.0.0.1:8787/figma
FIGMA_MCP_PROVIDER_TOKEN=optional-bearer-token
```

The gateway receives POST requests shaped like:

```json
{
  "operation": "metadata | design-context | screenshot",
  "fileKey": "Tb4DXmBGjBDkJ9eoBQwFYO",
  "nodeId": "211:79"
}
```

Metadata may be returned as normalized JSON or the XML-like tree emitted by
Figma MCP. Design context may be returned as a string or under
`designContext`, `code`, or `context`. Screenshot responses may contain
`url`, `assetId`, `width`, and `height`.

Direct Figma REST fallback:

```text
FIGMA_ACCESS_TOKEN=figma-personal-access-token
```

REST mode provides node metadata and a screenshot reference. Design-context
hints are unavailable in that mode.

The API accepts `figmaUrl`, `packageRootNodeId`, optional package summary/hash,
and an optional full package. Supplying the full package enables node-level
comparison and returns the enriched package directly.

Raw MCP design-context code is never included in the API response. It is
reduced server-side to the safe `designHints` vocabulary before serialization.

## Trust Order

1. Template Package node data
2. Normalized renderer hints
3. Live MCP metadata for comparison
4. MCP design-context notes for debugging only
5. Figma screenshot as a visual-diff target

Existing packages without enrichment fields remain valid and render unchanged.
Provider unavailability or failure is reported as a neutral fallback to ZIP
data. Enrichment runs during import or explicit refresh, not when the renderer
mounts, and normalized results persist with the package for offline rendering.

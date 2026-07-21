# Template Package fonts

`fontRequirements` describes the exact faces needed by a package. It does not
imply that the package contains redistributable font binaries.

The app resolves a required face in this order:

1. A package `font` asset referenced by `fontRequirements[].assetId`.
2. A face in the app-managed bundled font registry.
3. A browser/system face, reported as unknown or fallback unless explicitly
   trusted by the readiness checker.

Font assets use the normal package asset fields (`stableUrl`, `url`, `dataUrl`,
or `data`) and are loaded through `FontFace`. Preview capture and export
readiness call the same preparation function before measuring or rasterizing.

For non-editable text that must remain visually exact without a font binary,
the exporter may add:

```json
{
  "textFallback": {
    "type": "outlined-svg",
    "assetId": "asset:svg:text-outline"
  }
}
```

The asset must be an SVG/vector package asset. Editable text deliberately
continues to render as text, because an outline cannot reflect user edits.

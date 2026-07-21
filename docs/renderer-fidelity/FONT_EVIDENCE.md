# Exact Font Evidence

The machine-readable identity registry is [`fidelity/fonts.json`](../../fidelity/fonts.json). Font files remain external test inputs and are read only by Node-side tooling.

| Identity | Verified binary | SHA-256 | Policy |
| --- | --- | --- | --- |
| Geist Mono 500 normal | Vercel Geist v1.7.2 `GeistMono-Medium.ttf` | `90b15711dc3779b2e64e8aff5228154dd019a90bce4947549c4a8a8a43f2ac25` | Official release asset; external directory controlled by `RENDERER_FIDELITY_FONT_DIR` |
| Inter Tight 700 normal | local `InterTight-VariableFont_wght.ttf` | `4b8ef9ed255ebe7341aa566554c0f3e87ee10ce06d2085f07ccf66f41ef96c28` | Path controlled by `INTER_TIGHT_FIDELITY_FONT_PATH`; source license was not reverified in this run |

`pnpm runtime-routing:fonts` verifies path, byte count, and digest before starting Chromium. It installs the exact family/weight/style through `FontFace`, records the installed face and source hash, captures Validate, Fields, editor, and the hidden PNG renderer, repeats live captures, and uses the real export action. A second context captures fallback before delayed activation and requires a new ready settlement revision after activation.

Milestone 5.1 also records Canvas font ascent/descent/cap height, a controlled DOM baseline, line height/count, first cap top, final baseline, glyph paint overhang, and semantic trim boxes. Exact Inter Tight 700 measures 93.125 px cap-to-baseline against the ZIP's 93 px box. Exact Geist Mono 500 measures 124.4 and 76.4 px for the three- and two-line boxes against 124 and 76 px. Validate, Fields, editor, and hidden PNG report identical trim heights. These subpixel results are retained; no font-specific correction is applied.

Milestone 5.2 additionally records the actual rendered paint-span box, semantic-wrapper box, cap-top coordinate, final-baseline coordinate, translation, and HUG/fixed alignment mode. All four exact-font surfaces place the Inter Tight caps at local `0` and baseline at `93.125`; Geist Mono cap tops are within `0.00003px` of zero and final baselines within `0.00003px` of `124.4`/`76.4`. Cached synthetic activation must still produce a new font signature before old fallback geometry can publish.

Browser font checks alone are not proof of binary identity because a system fallback can satisfy CSS shaping. Only a manifest-verified binary explicitly installed by this harness is labelled exact. Missing, substituted, or unverified faces remain visible in the evidence JSON.

Milestone 5.3 additionally exercises the production import/link path. `pnpm fidelity:source-authoritative` verifies both hashes, uploads each file through the real Fonts step, persists the managed records and request mappings, restores the draft, registers each face under a hash-derived private family, and captures every live surface plus real PNG export. The ordinary replacement-font profile remains separate.

The prior Geist upload failure was not a missing font. OpenType name ID 1 is `Geist Mono Medium`, while typographic ID 16 is `Geist Mono`. The parser preserves both and uses the typographic family for the source request. The linked 40 px sample measures 864 px in Chromium; system-ui measures 771.2 px.

The approval audit found that live surfaces painted this exact face but the real PNG initially used proportional fallback. `html-to-image` clones the DOM into an SVG document, and dynamically registered private `FontFace` instances do not cross that boundary. PNG capture now emits data-backed `@font-face` CSS for exact linked binaries only. The final PNG matches the source glyph shapes, 864/840/528 px body line widths, weight and spacing; its body-band difference is 0.427% and CTA-band difference is 0.002%, limited to antialiasing/one-pixel raster origin. `milestone-5-approved-final-exact-v2` passes all four promoted references.

No font binary is imported by production source or copied into `dist`.

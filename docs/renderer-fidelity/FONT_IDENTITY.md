# Font Import, Face Identity and Linking

Milestone 5.3 separates the font requested by the template from the face supplied by a binary and from the private family used at runtime. A filename, CSS family string, or successful `document.fonts.check()` is not sufficient evidence of face identity.

## Versioned identities

`CanonicalFontRequestV1` preserves the source family, source style label, CSS style, weight, stretch, axis values, PostScript name, required characters, source node IDs, and provenance. `CanonicalFontFaceV1` records the binary SHA-256, collection face index, OpenType typographic and legacy family/subfamily names, full name, PostScript name, OS/2 weight/style/stretch, every `fvar` axis, `cmap` coverage, license-name evidence, and raw name records.

The now-hiring request is `Geist Mono`, source style `Medium`, weight 500, normal. The verified binary deliberately has different valid name records:

- typographic family/subfamily: `Geist Mono` / `Medium`;
- legacy family/subfamily: `Geist Mono Medium` / `Regular`;
- full name: `Geist Mono Medium`;
- PostScript name: `GeistMono-Medium`.

The former importer preferred legacy family name ID 1 and therefore rejected this correct face. The parser now prefers typographic IDs 16/17 while retaining all competing records.

## One semantic matcher

Candidate discovery, upload validation, trusted-font validation, explicit linking, auto-linking, and package-asset attachment call the same matcher. Results are `exact`, `compatible`, `replacement`, or `missing`; ambiguity and missing glyph coverage remain explicit. PostScript identity, typographic family, legacy family, full-name evidence, trusted aliases, weight/axis range, style, stretch, and required glyph coverage participate in the decision.

Different-family replacement requires an explicit action. An exact face can replace a prior fallback and retains resolution history. Old managed records are normalized into the V2 record shape on read without discarding legacy identity.

### Emoji fallback coverage authority

Exact text-face coverage excludes only explicit emoji sequences that the
existing renderer deliberately delegates to the device emoji font. The shared
classifier recognizes default emoji presentation, U+FE0F presentation
sequences, ZWJ sequences, skin-tone modifiers, regional-indicator flags and
keycaps. A text-presentation selector retains its base symbol under text-face
authority.

This exception is deliberately narrow. Letters, numbers, punctuation,
currency, accented characters, Greek letters and ordinary text-presentation
symbols still require coverage from the uploaded face. Emoji and symbol font
families retain authority for their own characters. Exact binary identity,
family/PostScript matching, weight, posture, stretch, axes, face ambiguity and
revision checks are unchanged. Accepted platform fallback remains visible as
the existing non-blocking `font.glyph-fallback-likely` portability diagnostic.

## Runtime identity

Managed faces are registered under a deterministic private family:

`__template_font_<binary-hash-prefix>_<face-index>_<axis-instance>`

The human family remains source and UI identity. `ResolvedRenderText`, CSS, normalized text runs, intrinsic measurement, readiness, and export use the private family. Resolution records bind request ID, managed record, full binary hash, face index, classification, effective face properties, private family, and history. This prevents a local/system face with the same display name from satisfying an exact claim.

`document.fonts.check()` remains supporting readiness evidence only. Exact authority additionally requires a manifest-verified hash, a linked face record, the private loaded `FontFace`, matching request/face semantics, and current measurement/settlement revisions.

The revision signature observes only effective primary faces declared by the package. For a linked face this is the private family; for compatibility fallback it remains the requested family at the head of the CSS stack so later exact activation invalidates the fallback revision. Unrelated application fonts are excluded, and equal browser face descriptors are set-normalized so draft restore can register the same binary again without creating a false revision.

## Source-authoritative browser profile

`pnpm fidelity:source-authoritative` verifies the exact external font bytes and imports them through the real Fonts UI before Validate, Fields, editor, and PNG capture. It fails on absent or changed bytes and never uses replacement buttons. `pnpm fidelity:source-authoritative:compare` produces guarded candidates and failure artifacts; it never updates approved references.

The final now-hiring evidence is under `fidelity/candidates/milestone-5-3-source-final/`. Repeated pixels and structures are stable on all four surfaces, which publish one content/font revision and settlement identity. Geist is bound to `90b15711…ac25`, face 0, and the private family `__template_font_90b15711dc3779b2_0_static`. Its measured 40 px line width is 864 px; the same Chromium reports 771.2 px for system-ui. This proves the managed binary is used, but it does not prove that the source preview used the same font release, feature settings, or tracking.

## Compatibility and open evidence

Older packages without the new resolution fields keep existing fallback behavior. Unknown metadata, ambiguous collection faces, uncovered text-face glyphs, unavailable axes, and corrupt binaries do not acquire exact authority. Device emoji appearance remains platform-dependent and is reported as portability evidence. Cross-browser raster equivalence, OpenType feature settings, source-preview font-version identity, variable-axis instances beyond the current declared weight, rich mixed-face runs, and Inter Tight license provenance remain open.

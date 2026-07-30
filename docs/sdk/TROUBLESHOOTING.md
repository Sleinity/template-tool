# SDK integration troubleshooting

Use machine-readable issue codes for application decisions. English messages
are display text and may improve independently.

## Runtime preflight is blocked

Call `inspectTemplateRuntimeSupport()` and inspect `report.issues`. Common
causes are unavailable IndexedDB, managed-font loading, image decoding, SVG,
blob/data URLs, inline styles, or capture capabilities. Test the host's actual
Content Security Policy. Do not add external font or image providers; the SDK
is designed for offline operation.

If the host injects persistence, pass `persistence: "injected"`. If it does not
need persistence, pass `persistence: "none"`. Request `pngCapture: true` only
where PNG capture is part of the host workflow.

## A confirmation will not reopen

Inspect it with `inspectTemplateImportConfirmation()`. Unsupported schema,
malformed packages, package identity mismatch, and fingerprint or digest
mismatch are blocking. Rejection is atomic: the active session remains
unchanged.

A 0.3 confirmation without a digest is accepted with a warning after fresh
package validation. A missing browser-local managed font is also reported;
restore the verified font bytes through the existing managed-font workflow.

## The template reopened but looks different on another device

Confirmation state does not bundle browser-local managed fonts or IndexedDB
records. SDK 0.4 improves diagnosis but is not a cross-device transport
artifact. Keep original package and font authority in host storage until the
portable-artifact milestone is released.

## Import or rendering makes a network request

That is not expected SDK behavior. Inspect host adapters, service workers,
browser extensions, CSS, and application services. The packed SDK acceptance
blocks external runtime requests.

The current canonical AJV validator compiles its schema locally and requires
`script-src 'unsafe-eval'`. It is initialized lazily so the runtime preflight
can report `runtime.dynamic-code.unavailable` instead of crashing the app.

## A host control cannot change a value

Read `snapshot.editableFields` and use the supported session mutation methods.
Hosts may preprocess values or impose stricter rules, but the final value must
map to an editable descriptor and pass the template's safety constraints.
Arbitrary node mutation is not a stable SDK contract.

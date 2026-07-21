# Template Studio

The existing Vite application is the reference Studio consumer for the private
renderer SDK. During the behavior-preserving extraction its proven source files
remain at the repository root; this workspace package owns the product build
and declares the three public SDK dependencies.

The public packages bundle only their supported entry points. Studio-only
navigation, import panels, Fields, Validate, and editor controls are not part of
the published SDK.

Run from the repository root:

```sh
pnpm dev
```

import type { RuntimePropertyOwnershipState } from "./types";

export interface RuntimePropertyOwnershipEntry {
  property: string;
  supportedRoute: RuntimePropertyOwnershipState;
  compatibilityRoute: RuntimePropertyOwnershipState;
  browserRole: "none" | "intrinsic-only" | "readiness-only";
  note: string;
}

export const CORE_LAYOUT_PROPERTY_OWNERSHIP: RuntimePropertyOwnershipEntry[] = [
  { property: "geometry.x/y", supportedRoute: "settled-authoritative", compatibilityRoute: "compatibility-authoritative", browserRole: "none", note: "Final flow positions are computed from canonical layout semantics." },
  { property: "geometry.width/height", supportedRoute: "settled-authoritative", compatibilityRoute: "compatibility-authoritative", browserRole: "intrinsic-only", note: "Browser text metrics may feed HUG; final boxes may not." },
  { property: "transform", supportedRoute: "static-canonical", compatibilityRoute: "compatibility-authoritative", browserRole: "none", note: "Non-identity transforms remain outside the core route." },
  { property: "child.order", supportedRoute: "settled-authoritative", compatibilityRoute: "compatibility-authoritative", browserRole: "none", note: "Canonical child order is preserved." },
  { property: "sizing.fixed/hug/fill", supportedRoute: "settled-authoritative", compatibilityRoute: "compatibility-authoritative", browserRole: "intrinsic-only", note: "Only intrinsic text measurement crosses the browser boundary." },
  { property: "layout.padding/gap/alignment", supportedRoute: "settled-authoritative", compatibilityRoute: "compatibility-authoritative", browserRole: "none", note: "MIN, CENTER, MAX and STRETCH are supported; other values fall back coherently." },
  { property: "text.intrinsic", supportedRoute: "intrinsic-measurement-input", compatibilityRoute: "compatibility-authoritative", browserRole: "intrinsic-only", note: "Measurements are revision-tagged and stale publications are rejected." },
  { property: "text.vertical-trim", supportedRoute: "static-canonical", compatibilityRoute: "compatibility-authoritative", browserRole: "intrinsic-only", note: "Canonical CAP_HEIGHT selects cap-to-final-baseline semantics; exact face metrics supply the intrinsic trim inputs." },
  { property: "text.trimmed-box", supportedRoute: "settled-authoritative", compatibilityRoute: "compatibility-authoritative", browserRole: "intrinsic-only", note: "Settlement consumes the semantic trimmed height; browser line and glyph boxes remain separate telemetry." },
  { property: "text.final-bounds", supportedRoute: "settled-authoritative", compatibilityRoute: "compatibility-authoritative", browserRole: "none", note: "Final text boxes are produced by settlement." },
  { property: "parent.hug", supportedRoute: "settled-authoritative", compatibilityRoute: "compatibility-authoritative", browserRole: "none", note: "HUG consumes settled participating children." },
  { property: "sibling.fill", supportedRoute: "settled-authoritative", compatibilityRoute: "compatibility-authoritative", browserRole: "none", note: "FILL consumes settled remaining space." },
  { property: "image.slot", supportedRoute: "settled-authoritative", compatibilityRoute: "compatibility-authoritative", browserRole: "none", note: "Existing image placement consumes the settled slot." },
  { property: "clip.rect", supportedRoute: "settled-authoritative", compatibilityRoute: "compatibility-authoritative", browserRole: "none", note: "Only basic rectangular clipping bounds migrate." },
  { property: "export.root", supportedRoute: "settled-authoritative", compatibilityRoute: "compatibility-authoritative", browserRole: "readiness-only", note: "Export must capture the current ready settlement revision." },
];

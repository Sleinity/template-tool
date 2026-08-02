import type { SettlementEnvironmentProfile } from "./types";

export interface RasterEnvironmentPolicyV1 {
  id: SettlementEnvironmentProfile;
  comparisonClass: "approved-headless" | "observational-visible" | "synthetic" | "unclassified";
  maySharePixelReferencesWith: SettlementEnvironmentProfile[];
  geometryCanBeComparedAcrossProfiles: boolean;
  notes: string;
}

export const RASTER_ENVIRONMENT_POLICIES: RasterEnvironmentPolicyV1[] = [
  { id: "chromium-headless", comparisonClass: "approved-headless", maySharePixelReferencesWith: ["chromium-headless"], geometryCanBeComparedAcrossProfiles: true, notes: "Current approved renderer references were captured under the controlled headless Chromium profile." },
  { id: "chromium-visible", comparisonClass: "observational-visible", maySharePixelReferencesWith: ["chromium-visible"], geometryCanBeComparedAcrossProfiles: true, notes: "Visible-browser rasterization is reported separately; pixel variance does not broaden headless tolerance." },
  { id: "synthetic-test", comparisonClass: "synthetic", maySharePixelReferencesWith: ["synthetic-test"], geometryCanBeComparedAcrossProfiles: false, notes: "Pure contract tests; never a renderer golden." },
  { id: "unknown", comparisonClass: "unclassified", maySharePixelReferencesWith: [], geometryCanBeComparedAcrossProfiles: false, notes: "Must be classified before approval." },
];

export function classifyEnvironmentProfile(headed: boolean | null): SettlementEnvironmentProfile {
  return headed === true ? "chromium-visible" : headed === false ? "chromium-headless" : "unknown";
}

export interface ResolvedProductRenderIdentityV1 {
  schemaVersion: "resolved-product-render-identity-v1";
  identityId: string;
  packageId: string;
  packageRevision: string;
  canonicalRevision: string;
  resolvedRevision: string;
  backendDecisionRevision: string;
  settlementRevision: string;
  fontRevision: string;
  assetRevision: string;
  placementRevision: string;
  exportSafety: "safe" | "warning" | "blocked" | "unknown";
  readiness: "ready" | "pending" | "unsupported";
}

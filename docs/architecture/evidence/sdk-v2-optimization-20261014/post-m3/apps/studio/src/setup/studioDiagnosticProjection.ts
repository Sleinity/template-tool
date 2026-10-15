export type StudioDiagnosticOwner = "package" | "fonts" | "fields";
export type StudioDiagnosticArea = "import" | "preview" | "media" | "fields" | "export";

export type StudioDiagnosticEvidence = {
  id: string;
  title: string;
  message: string;
  owner: StudioDiagnosticOwner;
  severity: "blocked" | "attention";
  fieldId?: string;
  variantId?: string;
  configurationScope?: "common" | "variant";
  area?: StudioDiagnosticArea;
  details?: readonly string[];
};

/**
 * Presentation projection only. It preserves every supplied finding and its
 * severity; SDK validation/readiness remain the save and export authorities.
 */
export function projectStudioDiagnosticEvidence(
  evidence: readonly StudioDiagnosticEvidence[],
  filters: { query: string; area: "all" | StudioDiagnosticArea; severity: "all" | StudioDiagnosticEvidence["severity"] },
) {
  const query = filters.query.trim().toLowerCase();
  const findings = evidence.filter((item) => {
    const matchesQuery = !query || `${item.title} ${item.message} ${item.details?.join(" ") ?? ""}`.toLowerCase().includes(query);
    return matchesQuery && (filters.area === "all" || item.area === filters.area) && (filters.severity === "all" || item.severity === filters.severity);
  });
  return {
    findings,
    groups: (["package", "fonts", "fields"] as const).map((owner) => ({ owner, findings: findings.filter((item) => item.owner === owner) })).filter((group) => group.findings.length),
    areaCounts: Object.fromEntries((["import", "preview", "media", "fields", "export"] as const).map((area) => [area, evidence.filter((item) => item.area === area).length])) as Record<StudioDiagnosticArea, number>,
  };
}

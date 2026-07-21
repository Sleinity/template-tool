import type { ResolvedRenderNode, ResolvedRenderWarning } from "../resolved/types";
import type {
  ResolvedBackendDecisionV1,
  ResolvedBackendDiagnosticGroupV1,
  ResolvedBackendDiagnosticProjectionV1,
  ResolvedBackendDiagnosticV1,
  ResolvedDiagnosticClassification,
} from "./types";

function stableHash(value: unknown): string {
  const input = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function classifications(codes: string[], messages: string[]): ResolvedDiagnosticClassification[] {
  const value = `${codes.join(" ")} ${messages.join(" ")}`.toLowerCase();
  const result = new Set<ResolvedDiagnosticClassification>();
  if (/source|exporter|figma|schema/.test(value)) result.add("source-exporter-issue");
  if (/normaliz|canonical|mapping/.test(value)) result.add("normalization-issue");
  if (/unsupported|fallback|preserved|compatibility/.test(value)) result.add("unsupported-renderer-capability");
  if (/layout|settlement|stabili|constraint|\bhug\b|fill[-_ ]?(?:sizing|remaining|space)/.test(value)) {
    result.add("layout-stabilization-issue");
  }
  if (/font|asset|image.*missing|missing.*image|svg.*missing/.test(value)) result.add("missing-font-or-asset");
  if (/measure|variance|font.*fallback|raster|antialias/.test(value)) result.add("measurement-variance");
  if (/visual.diff|pixel|regression/.test(value)) result.add("visual-regression");
  if (result.size === 0) result.add("unsupported-renderer-capability");
  return [...result];
}

function isDependencyOwnedDiagnostic(code: string): boolean {
  return /^(resolved-font-|font\.|asset-|resolved-(?:image|vector)-asset-missing)/i.test(code);
}

function group(
  diagnostics: ResolvedBackendDiagnosticV1[],
  kind: ResolvedBackendDiagnosticGroupV1["kind"],
  getKey: (diagnostic: ResolvedBackendDiagnosticV1) => string,
): ResolvedBackendDiagnosticGroupV1[] {
  const values = new Map<string, ResolvedBackendDiagnosticV1[]>();
  diagnostics.forEach((diagnostic) => {
    const key = getKey(diagnostic);
    const current = values.get(key);
    if (current) current.push(diagnostic);
    else values.set(key, [diagnostic]);
  });
  return [...values].map(([key, items]) => ({
    id: `${kind}:${key}`,
    kind,
    key,
    diagnosticIds: items.map((item) => item.id),
    nodeIds: Array.from(new Set(items.map((item) => item.nodeId))),
  }));
}

export function createBackendDiagnosticProjection(
  nodes: Record<string, ResolvedRenderNode>,
  warnings: ResolvedRenderWarning[],
  sourceDecisionRevision: string,
): ResolvedBackendDiagnosticProjectionV1 {
  const diagnostics: ResolvedBackendDiagnosticV1[] = [];
  const warningsByNode = new Map<string, ResolvedRenderWarning[]>();
  warnings.forEach((warning) => {
    if (!warning.nodeId) return;
    const current = warningsByNode.get(warning.nodeId);
    if (current) current.push(warning);
    else warningsByNode.set(warning.nodeId, [warning]);
  });
  Object.values(nodes).forEach((node) => {
    const decision: ResolvedBackendDecisionV1 = node.backendDecision;
    const nodeWarnings = warningsByNode.get(node.id) ?? [];
    const allSourceDiagnostics = [
      ...node.fidelityDiagnostics.filter((diagnostic) => diagnostic.severity === "warning"),
      ...nodeWarnings,
    ];
    const dependencyDiagnostics = allSourceDiagnostics.filter((diagnostic) => isDependencyOwnedDiagnostic(diagnostic.code));
    const sourceDiagnostics = allSourceDiagnostics.filter((diagnostic) => !isDependencyOwnedDiagnostic(diagnostic.code));
    if (
      dependencyDiagnostics.length > 0 &&
      sourceDiagnostics.length === 0 &&
      decision.fallback.reasonCodes.length === 0 &&
      decision.disposition !== "preserved-only" &&
      decision.disposition !== "unsupported"
    ) return;
    const meaningful = decision.fallback.active || sourceDiagnostics.length > 0 ||
      decision.supportLevel === "unsupported" || decision.supportLevel === "preserved-only";
    if (!meaningful) return;
    const codes = Array.from(new Set([
      ...decision.fallback.reasonCodes,
      ...sourceDiagnostics.map((diagnostic) => diagnostic.code),
    ]));
    const messages = sourceDiagnostics.map((diagnostic) => diagnostic.message);
    const classified = classifications(codes, messages);
    const repairableSourceGap = classified.includes("source-exporter-issue") &&
      /missing|invalid|conflict|schema|exporter/.test(`${codes.join(" ")} ${messages.join(" ")}`.toLowerCase());
    const userRepairable = classified.includes("missing-font-or-asset") || repairableSourceGap;
    if (userRepairable) classified.push("user-actionable-issue");
    const userVisible = decision.fallback.active ||
      decision.supportLevel === "unsupported" ||
      decision.supportLevel === "preserved-only" ||
      classified.includes("missing-font-or-asset");
    const capabilityId = decision.owners
      .find((candidate) => candidate.runtimeOwner === decision.runtimeOwner)?.capabilityId ??
      decision.requiredCapabilities[0] ?? "CAPABILITY-UNKNOWN";
    diagnostics.push({
      id: `backend-diagnostic:${node.id}:${stableHash({ codes, capabilityId, revision: decision.revisions.resolved })}`,
      nodeId: node.id,
      regionId: `node:${node.id}`,
      capabilityId,
      classifications: classified,
      supportLevel: decision.supportLevel,
      selectedBackend: decision.selectedBackend,
      runtimeOwner: decision.runtimeOwner,
      disposition: decision.disposition,
      fallback: decision.fallback,
      confidence: decision.confidence,
      visualImpact: decision.exportSafety === "blocked"
        ? "high"
        : decision.disposition === "degraded-fallback"
          ? decision.fallback.reasonCodes.some((code) => /paint|vector|mask|clip|overflow|asset|font/i.test(code)) ? "medium" : "low"
          : decision.disposition === "preserved-only" || decision.disposition === "unsupported"
            ? "medium"
            : "none",
      explanation: messages[0] ?? decision.fallback.description ?? decision.reason,
      userRepairable,
      userAction: userRepairable
        ? "Inspect the affected layer and its source dependency; flatten or re-export only when exact support is required."
        : null,
      audience: userVisible ? "user" : "technical-trace",
      severity: decision.exportSafety === "blocked" || decision.fallback.active ? "warning" : "info",
      sourceDiagnosticCodes: codes,
    });
  });
  const groups = [
    ...group(diagnostics, "capability", (diagnostic) => diagnostic.capabilityId),
    ...group(diagnostics, "region", (diagnostic) => diagnostic.regionId),
  ];
  return {
    schemaVersion: "resolved-backend-diagnostic-projection-v1",
    projectionId: `backend-diagnostics:${stableHash({ sourceDecisionRevision, diagnostics, groups })}`,
    sourceDecisionRevision,
    diagnostics,
    groups,
  };
}

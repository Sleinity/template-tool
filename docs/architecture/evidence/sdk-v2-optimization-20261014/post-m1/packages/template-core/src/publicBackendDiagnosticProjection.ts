import type {
  ResolvedRenderNode,
  ResolvedRenderWarning,
} from "./resolved/types";
import { createBackendDiagnosticProjection as createBackendDiagnosticProjectionInternal } from "./backend-decision/createDiagnosticProjection";
import type { ResolvedBackendDiagnosticProjectionV1 } from "./backend-decision/types";

export function createBackendDiagnosticProjection(
  nodes: Record<string, ResolvedRenderNode>,
  warnings: ResolvedRenderWarning[],
  sourceDecisionRevision: string,
): ResolvedBackendDiagnosticProjectionV1 {
  return createBackendDiagnosticProjectionInternal(
    nodes,
    warnings,
    sourceDecisionRevision,
  );
}

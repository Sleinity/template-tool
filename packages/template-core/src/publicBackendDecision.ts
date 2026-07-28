import type {
  ResolvedRenderNode,
} from "./resolved/types";
import {
  backendDecisionOwns as backendDecisionOwnsInternal,
  backendDecisionRevision as backendDecisionRevisionInternal,
  resolveBackendDecision as resolveBackendDecisionInternal,
  resolvedBackendAvailability as resolvedBackendAvailabilityInternal,
} from "./backend-decision/resolveBackendDecision";
import type {
  ResolvedBackendDecisionV1,
  ResolvedBackendAvailabilityV1,
  ResolvedBackendOwnerV1,
} from "./backend-decision/types";

export * from "./backend-decision/types";

export const resolvedBackendAvailability: ResolvedBackendAvailabilityV1 =
  resolvedBackendAvailabilityInternal;

type DecisionNode = Omit<ResolvedRenderNode, "backendDecision">;

export interface ResolveBackendDecisionOptions {
  packageId: string;
  sourceRevision: string;
  maskOwner?: "css-clip" | "compatibility" | null;
  maskCapability?: string | null;
}

export function resolveBackendDecision(
  node: DecisionNode,
  options: ResolveBackendDecisionOptions,
): ResolvedBackendDecisionV1 {
  return resolveBackendDecisionInternal(node, options);
}

export function backendDecisionOwns(
  decision: ResolvedBackendDecisionV1 | undefined,
  runtimeOwner: ResolvedBackendOwnerV1["runtimeOwner"],
): boolean {
  return backendDecisionOwnsInternal(decision, runtimeOwner);
}

export function backendDecisionRevision(
  decisions: ResolvedBackendDecisionV1[],
): string {
  return backendDecisionRevisionInternal(decisions);
}

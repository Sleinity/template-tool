import type { EditableFieldBinding, TemplateNodeType } from "../types";
import type { PrimitiveAppearanceV1 } from "../primitives";
import type { ResolvedBackendDecisionV1 } from "./types";

export interface BackendDecisionNodeInputV1 {
  id: string;
  type: TemplateNodeType;
  children: string[];
  editableFields: EditableFieldBinding[];
  appearance: {
    fills: Array<{ kind: string }>;
    strokes: unknown[];
    effects: Array<{ supported: boolean }>;
    opacity: number;
  };
  primitiveAppearance: PrimitiveAppearanceV1;
  text?: unknown;
  image?: {
    scaleMode: string | null;
    renderMode: string;
    activePlacementState: string;
    placementRevision: number;
    assetId: string | null;
    missingAsset: boolean;
  };
  vector?: {
    renderMode: string;
    renderModeSource: string;
    assetId: string | null;
    missingAsset: boolean;
  };
  fidelityDiagnostics: BackendDiagnosticInputV1[];
  renderStrategy: "semantic" | "asset" | "fallback";
  fallbackReason?: string;
}

export interface BackendDiagnosticInputV1 {
  code: string;
  message: string;
  severity: "info" | "warning";
}

export interface BackendDiagnosticNodeInputV1 {
  id: string;
  backendDecision: ResolvedBackendDecisionV1;
  fidelityDiagnostics: BackendDiagnosticInputV1[];
}

export interface BackendWarningInputV1 {
  code: string;
  message: string;
  nodeId?: string;
}

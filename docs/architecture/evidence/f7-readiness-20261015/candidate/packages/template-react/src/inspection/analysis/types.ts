export type FeatureSupportStatus =
  | "supported"
  | "partial"
  | "unsupported"
  | "unknown";

export type FidelityRiskLevel = "low" | "medium" | "high";

export type FidelityRiskCause =
  | "renderer limitation"
  | "plugin export gap"
  | "unsupported Figma feature"
  | "missing asset/font issue"
  | "unknown";

export interface AnalysisNodeReference {
  id: string;
  name: string;
}

export interface RendererFeatureCoverageItem {
  key: string;
  category: string;
  name: string;
  status: FeatureSupportStatus;
  affectedNodes: AnalysisNodeReference[];
  explanation: string;
  relatedDiagnostics: string[];
}

export interface RendererFeatureCoverageReport {
  items: RendererFeatureCoverageItem[];
  summary: Record<FeatureSupportStatus, number>;
  blocking: false;
}

export interface FidelityRiskItem {
  featureKey: string;
  featureName: string;
  level: FidelityRiskLevel;
  reason: string;
  likelyCause: FidelityRiskCause;
  affectedNodes: AnalysisNodeReference[];
}

export interface FidelityRiskReport {
  items: FidelityRiskItem[];
  summary: Record<FidelityRiskLevel, number>;
  blocking: false;
}

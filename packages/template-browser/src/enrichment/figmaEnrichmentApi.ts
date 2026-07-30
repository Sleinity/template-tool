import type {
  PackageMetadataDifference,
  TemplatePackageV1,
} from "@sleinity/template-core";
import type { ParsedFigmaUrl } from "../internal/core";
import type { FigmaMcpMetadata } from "./comparePackageToFigmaMetadata";

export interface FigmaPackageSummary {
  name?: string;
  hash?: string;
  canvas?: {
    width: number;
    height: number;
  };
  nodeCount?: number;
  editableFields?: Array<{
    id: string;
    type: string;
    nodeId: string;
    marker?: string;
  }>;
}

export interface FigmaEnrichmentApiRequest {
  figmaUrl: string;
  packageRootNodeId: string;
  packageSummary?: FigmaPackageSummary;
  packageHash?: string;
  package?: TemplatePackageV1;
}

export interface FigmaSummaryComparison {
  status: "matched" | "changed";
  differences: PackageMetadataDifference[];
}

export interface FigmaEnrichmentProviderInfo {
  kind: "mcp-gateway" | "figma-rest" | "custom";
  metadata: boolean;
  designContext: boolean;
  screenshot: boolean;
}

export interface FigmaEnrichmentApiSuccess {
  ok: true;
  reference: ParsedFigmaUrl;
  provider: FigmaEnrichmentProviderInfo;
  metadata: FigmaMcpMetadata;
  screenshot?: {
    url?: string;
    dataUrl?: string;
    assetId?: string;
    width?: number;
    height?: number;
  } | null;
  comparison: FigmaSummaryComparison;
  staleWarnings: string[];
  package?: TemplatePackageV1;
}

export interface FigmaEnrichmentApiFailure {
  ok: false;
  code:
    | "invalid-request"
    | "invalid-figma-url"
    | "missing-node-id"
    | "provider-unavailable"
    | "invalid-access-token"
    | "provider-error"
    | "node-not-found";
  message: string;
}

export type FigmaEnrichmentApiResponse =
  | FigmaEnrichmentApiSuccess
  | FigmaEnrichmentApiFailure;

export async function requestFigmaEnrichment(
  request: FigmaEnrichmentApiRequest,
  fetcher: typeof fetch = fetch,
): Promise<FigmaEnrichmentApiResponse> {
  const response = await fetcher("/api/template-package/enrich-figma", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = (await response.json()) as FigmaEnrichmentApiResponse;
  return payload;
}

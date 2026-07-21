import { FigmaRestProvider } from "./figmaRestProvider";
import { HttpMcpFigmaProvider } from "./httpMcpProvider";
import type { BackendFigmaEnrichmentProvider } from "./provider";

export interface FigmaProviderEnvironment {
  FIGMA_MCP_PROVIDER_URL?: string;
  FIGMA_MCP_PROVIDER_TOKEN?: string;
  FIGMA_ACCESS_TOKEN?: string;
}

export function createFigmaEnrichmentProvider(
  environment: FigmaProviderEnvironment,
): BackendFigmaEnrichmentProvider | null {
  if (environment.FIGMA_MCP_PROVIDER_URL) {
    return new HttpMcpFigmaProvider({
      endpoint: environment.FIGMA_MCP_PROVIDER_URL,
      token: environment.FIGMA_MCP_PROVIDER_TOKEN,
    });
  }
  if (environment.FIGMA_ACCESS_TOKEN) {
    return new FigmaRestProvider({
      accessToken: environment.FIGMA_ACCESS_TOKEN,
    });
  }
  return null;
}

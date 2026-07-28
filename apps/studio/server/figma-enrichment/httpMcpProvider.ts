import type {
  FigmaMcpEvidence,
  FigmaMcpMetadata,
  ParsedFigmaUrl,
} from "../../../../src/template-package/enrichment";
import { normalizeProviderMetadata } from "./normalizeMetadata";
import {
  type BackendFigmaEnrichmentProvider,
  FigmaProviderError,
} from "./provider";

interface HttpMcpProviderOptions {
  endpoint: string;
  token?: string;
  fetcher?: typeof fetch;
}

export class HttpMcpFigmaProvider
  implements BackendFigmaEnrichmentProvider
{
  readonly info = {
    kind: "mcp-gateway" as const,
    metadata: true,
    designContext: true,
    screenshot: true,
  };

  private readonly fetcher: typeof fetch;

  constructor(private readonly options: HttpMcpProviderOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  private async call(
    operation: "metadata" | "design-context" | "screenshot",
    reference: ParsedFigmaUrl,
  ): Promise<unknown> {
    const response = await this.fetcher(this.options.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.options.token
          ? { authorization: `Bearer ${this.options.token}` }
          : {}),
      },
      body: JSON.stringify({
        operation,
        fileKey: reference.fileKey,
        nodeId: reference.nodeId,
      }),
    });
    if (!response.ok) {
      throw new FigmaProviderError(
        `Figma MCP gateway returned ${response.status}.`,
        response.status === 404 ? "node-not-found" : "provider-error",
      );
    }
    return response.json();
  }

  async fetchMetadata(reference: ParsedFigmaUrl): Promise<FigmaMcpMetadata> {
    const payload = await this.call("metadata", reference);
    return normalizeProviderMetadata(payload, reference);
  }

  async fetchDesignContext(reference: ParsedFigmaUrl): Promise<string | null> {
    const payload = await this.call("design-context", reference);
    if (typeof payload === "string") return payload;
    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      const value = record.designContext ?? record.code ?? record.context;
      return typeof value === "string" ? value : null;
    }
    return null;
  }

  async fetchScreenshot(
    reference: ParsedFigmaUrl,
  ): Promise<FigmaMcpEvidence["screenshot"]> {
    const payload = await this.call("screenshot", reference);
    if (!payload || typeof payload !== "object") return null;
    const record = payload as Record<string, unknown>;
    const screenshot =
      record.screenshot && typeof record.screenshot === "object"
        ? (record.screenshot as Record<string, unknown>)
        : record;
    return {
      url: typeof screenshot.url === "string" ? screenshot.url : undefined,
      dataUrl:
        typeof screenshot.dataUrl === "string"
          ? screenshot.dataUrl
          : undefined,
      assetId:
        typeof screenshot.assetId === "string"
          ? screenshot.assetId
          : undefined,
      width:
        typeof screenshot.width === "number" ? screenshot.width : undefined,
      height:
        typeof screenshot.height === "number" ? screenshot.height : undefined,
    };
  }
}

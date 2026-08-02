import type {
  FigmaMcpEvidence,
  FigmaMcpMetadata,
  FigmaMcpNodeMetadata,
  ParsedFigmaUrl,
} from "@sleinity/template-browser/enrichment";
import {
  type BackendFigmaEnrichmentProvider,
  FigmaProviderError,
} from "./provider";

interface FigmaRestProviderOptions {
  accessToken: string;
  apiBaseUrl?: string;
  fetcher?: typeof fetch;
}

interface FigmaRestNode {
  id: string;
  name: string;
  type?: string;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  children?: FigmaRestNode[];
  style?: FigmaRestTextStyle;
  styleOverrideTable?: Record<string, FigmaRestTextStyle>;
}

interface FigmaRestTextStyle {
  fontFamily?: string;
  fontPostScriptName?: string | null;
  fontWeight?: number;
  fontStyle?: string;
  italic?: boolean;
}

function cssFontStyle(style: FigmaRestTextStyle): string {
  return style.italic || /italic/i.test(style.fontStyle ?? "")
    ? "italic"
    : "normal";
}

function collectLiveFontFaces(node: FigmaRestNode) {
  const styles = [
    node.style,
    ...Object.values(node.styleOverrideTable ?? {}),
  ].filter((style): style is FigmaRestTextStyle => Boolean(style?.fontFamily));
  const seen = new Set<string>();
  return styles.flatMap((style) => {
    const family = style.fontFamily ?? "";
    const weight = style.fontWeight ?? 400;
    const cssStyle = cssFontStyle(style);
    const key = `${family.toLowerCase()}:${weight}:${cssStyle}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [
      {
        family,
        postScriptName: style.fontPostScriptName,
        weight,
        style: cssStyle,
      },
    ];
  });
}

function encodeBase64(bytes: Uint8Array): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const combined = (first << 16) | (second << 8) | third;
    result += alphabet[(combined >> 18) & 63];
    result += alphabet[(combined >> 12) & 63];
    result +=
      index + 1 < bytes.length ? alphabet[(combined >> 6) & 63] : "=";
    result += index + 2 < bytes.length ? alphabet[combined & 63] : "=";
  }
  return result;
}

function flattenNodeTree(
  root: FigmaRestNode,
): Record<string, FigmaMcpNodeMetadata> {
  const result: Record<string, FigmaMcpNodeMetadata> = {};
  const visit = (node: FigmaRestNode, parentId: string | null) => {
    result[node.id] = {
      id: node.id,
      name: node.name,
      dataName: node.name,
      type: node.type,
      parentId,
      children: node.children?.map((child) => child.id) ?? [],
      bounds: node.absoluteBoundingBox,
      fontFaces:
        node.type === "TEXT" ? collectLiveFontFaces(node) : undefined,
    };
    node.children?.forEach((child) => visit(child, node.id));
  };
  visit(root, null);
  return result;
}

export class FigmaRestProvider implements BackendFigmaEnrichmentProvider {
  readonly info = {
    kind: "figma-rest" as const,
    metadata: true,
    designContext: false,
    screenshot: true,
  };

  private readonly fetcher: typeof fetch;
  private readonly apiBaseUrl: string;
  private metadataCache = new Map<string, FigmaMcpMetadata>();

  constructor(private readonly options: FigmaRestProviderOptions) {
    this.fetcher = options.fetcher ?? fetch;
    this.apiBaseUrl = options.apiBaseUrl ?? "https://api.figma.com";
  }

  private headers(): Record<string, string> {
    return { "x-figma-token": this.options.accessToken };
  }

  async fetchMetadata(reference: ParsedFigmaUrl): Promise<FigmaMcpMetadata> {
    if (!reference.nodeId) {
      throw new FigmaProviderError(
        "A node ID is required for Figma metadata.",
        "node-not-found",
      );
    }
    const cacheKey = `${reference.fileKey}:${reference.nodeId}`;
    const cached = this.metadataCache.get(cacheKey);
    if (cached) return cached;

    const endpoint = new URL(
      `/v1/files/${encodeURIComponent(reference.fileKey)}/nodes`,
      this.apiBaseUrl,
    );
    endpoint.searchParams.set("ids", reference.nodeId);
    const response = await this.fetcher(endpoint, {
      headers: this.headers(),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new FigmaProviderError(
          "The configured Figma access token was rejected.",
          "invalid-access-token",
        );
      }
      throw new FigmaProviderError(
        `Figma REST API returned ${response.status}.`,
        response.status === 404 ? "node-not-found" : "provider-error",
      );
    }
    const payload = (await response.json()) as {
      nodes?: Record<string, { document?: FigmaRestNode } | null>;
    };
    const root = payload.nodes?.[reference.nodeId]?.document;
    if (!root) {
      throw new FigmaProviderError(
        `Figma node ${reference.nodeId} was not found.`,
        "node-not-found",
      );
    }
    const metadata: FigmaMcpMetadata = {
      rootNodeId: root.id,
      rootName: root.name,
      canvas: root.absoluteBoundingBox
        ? {
            width: root.absoluteBoundingBox.width,
            height: root.absoluteBoundingBox.height,
          }
        : undefined,
      nodes: flattenNodeTree(root),
    };
    this.metadataCache.set(cacheKey, metadata);
    return metadata;
  }

  async fetchDesignContext(): Promise<null> {
    return null;
  }

  async fetchScreenshot(
    reference: ParsedFigmaUrl,
  ): Promise<FigmaMcpEvidence["screenshot"]> {
    if (!reference.nodeId) return null;
    const endpoint = new URL(
      `/v1/images/${encodeURIComponent(reference.fileKey)}`,
      this.apiBaseUrl,
    );
    endpoint.searchParams.set("ids", reference.nodeId);
    endpoint.searchParams.set("format", "png");
    endpoint.searchParams.set("scale", "1");
    const response = await this.fetcher(endpoint, {
      headers: this.headers(),
    });
    if (response.status === 401 || response.status === 403) {
      throw new FigmaProviderError(
        "The configured Figma access token was rejected.",
        "invalid-access-token",
      );
    }
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      images?: Record<string, string | null>;
    };
    const imageUrl = payload.images?.[reference.nodeId] ?? undefined;
    let dataUrl: string | undefined;
    if (imageUrl) {
      try {
        const imageResponse = await this.fetcher(imageUrl);
        const mimeType =
          imageResponse.headers.get("content-type")?.split(";")[0] ??
          "image/png";
        if (imageResponse.ok && mimeType.startsWith("image/")) {
          const bytes = new Uint8Array(await imageResponse.arrayBuffer());
          dataUrl = `data:${mimeType};base64,${encodeBase64(bytes)}`;
        }
      } catch {
        dataUrl = undefined;
      }
    }
    const metadata = await this.fetchMetadata(reference);
    return {
      url: imageUrl,
      dataUrl,
      width: metadata.canvas?.width,
      height: metadata.canvas?.height,
    };
  }
}

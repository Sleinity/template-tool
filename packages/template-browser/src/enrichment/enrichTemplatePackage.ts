import type {
  PackageMetadataComparison,
  TemplatePackageV1,
} from "@sleinity/template-core";
import { analyzePackageAssets } from "./analyzePackageAssets";
import {
  comparePackageToFigmaMetadata,
  type FigmaMcpMetadata,
} from "./comparePackageToFigmaMetadata";
import { createRendererHints } from "./createRendererHints";
import { extractMcpDesignHints } from "./extractMcpDesignHints";
import { parseFigmaUrl, type ParsedFigmaUrl } from "../internal/core";

export interface FigmaMcpEvidence {
  metadata?: FigmaMcpMetadata | null;
  designContext?: string | null;
  screenshot?: {
    url?: string;
    dataUrl?: string;
    assetId?: string;
    width?: number;
    height?: number;
  } | null;
  fetchedAt?: {
    metadata?: string;
    designContext?: string;
    screenshot?: string;
  };
}

export interface TemplatePackageEnrichmentOptions {
  figmaUrl?: string;
  evidence?: FigmaMcpEvidence;
  externalizeThresholdBytes?: number;
}

export interface TemplatePackageEnrichmentResult {
  package: TemplatePackageV1;
  figmaReference: ParsedFigmaUrl | null;
  figmaUrlError: string | null;
  metadataComparison: PackageMetadataComparison;
}

export interface FigmaMcpEnrichmentProvider {
  fetchMetadata(reference: ParsedFigmaUrl): Promise<FigmaMcpMetadata | null>;
  fetchDesignContext?(reference: ParsedFigmaUrl): Promise<string | null>;
  fetchScreenshot?(
    reference: ParsedFigmaUrl,
  ): Promise<FigmaMcpEvidence["screenshot"]>;
}

function percentage(part: number, total: number): number {
  return total === 0 ? 100 : Math.round((part / total) * 1000) / 10;
}

export function enrichTemplatePackage(
  packageValue: TemplatePackageV1,
  options: TemplatePackageEnrichmentOptions = {},
): TemplatePackageEnrichmentResult {
  const enriched = structuredClone(packageValue);
  const parsedUrl = options.figmaUrl?.trim()
    ? parseFigmaUrl(options.figmaUrl)
    : null;
  const figmaReference = parsedUrl?.valid ? parsedUrl.value : null;
  const figmaUrlError =
    parsedUrl && !parsedUrl.valid ? parsedUrl.error : null;
  const metadataComparison = comparePackageToFigmaMetadata(
    enriched,
    options.evidence?.metadata,
  );
  const rendererHints = createRendererHints(enriched);
  const totalNodes = Object.keys(enriched.nodes).length;

  enriched.rendererHints = {
    ...rendererHints,
    ...enriched.rendererHints,
  };
  enriched.assetStrategy = analyzePackageAssets(
    enriched,
    options.externalizeThresholdBytes,
  );
  enriched.verification = {
    ...enriched.verification,
    metadata: metadataComparison,
    designHints: extractMcpDesignHints(options.evidence?.designContext),
    figmaScreenshot:
      options.evidence?.screenshot ?? enriched.verification?.figmaScreenshot,
    rendererHintCoverage: {
      hintedNodes: Object.keys(enriched.rendererHints).length,
      totalNodes,
      percentage: percentage(
        Object.keys(enriched.rendererHints).length,
        totalNodes,
      ),
    },
  };

  if (figmaReference) {
    enriched.source = {
      ...enriched.source,
      type: enriched.source?.type ?? "figma",
      fileKey: figmaReference.fileKey,
      url: figmaReference.url,
      figmaMcp: {
        ...enriched.source?.figmaMcp,
        nodeId: figmaReference.nodeId ?? enriched.rootNodeId,
        status: metadataComparison.status,
        metadataFetchedAt: options.evidence?.fetchedAt?.metadata,
        designContextFetchedAt: options.evidence?.fetchedAt?.designContext,
        screenshotFetchedAt: options.evidence?.fetchedAt?.screenshot,
      },
    };
  }

  return {
    package: enriched,
    figmaReference,
    figmaUrlError,
    metadataComparison,
  };
}

export async function enrichTemplatePackageWithProvider(
  packageValue: TemplatePackageV1,
  figmaUrl: string,
  provider: FigmaMcpEnrichmentProvider,
): Promise<TemplatePackageEnrichmentResult> {
  const parsed = parseFigmaUrl(figmaUrl);
  if (!parsed.valid) {
    return enrichTemplatePackage(packageValue, { figmaUrl });
  }
  try {
    const [metadata, designContext, screenshot] = await Promise.all([
      provider.fetchMetadata(parsed.value),
      provider.fetchDesignContext?.(parsed.value) ?? Promise.resolve(null),
      provider.fetchScreenshot?.(parsed.value) ?? Promise.resolve(null),
    ]);
    const now = new Date().toISOString();
    return enrichTemplatePackage(packageValue, {
      figmaUrl,
      evidence: {
        metadata,
        designContext,
        screenshot,
        fetchedAt: {
          metadata: now,
          designContext: designContext ? now : undefined,
          screenshot: screenshot ? now : undefined,
        },
      },
    });
  } catch {
    const result = enrichTemplatePackage(packageValue, { figmaUrl });
    result.package.source = {
      ...result.package.source,
      type: result.package.source?.type ?? "figma",
      figmaMcp: {
        ...result.package.source?.figmaMcp,
        nodeId: result.figmaReference?.nodeId ?? result.package.rootNodeId,
        status: "error",
      },
    };
    return result;
  }
}

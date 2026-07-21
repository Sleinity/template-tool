import {
  type FigmaEnrichmentApiRequest,
  type FigmaEnrichmentApiResponse,
  type FigmaPackageSummary,
} from "../../src/template-package/enrichment/figmaEnrichmentApi";
import {
  comparePackageToFigmaMetadata,
  type FigmaMcpMetadata,
} from "../../src/template-package/enrichment/comparePackageToFigmaMetadata";
import { enrichTemplatePackage } from "../../src/template-package/enrichment/enrichTemplatePackage";
import { parseFigmaUrl } from "../../src/template-package/enrichment/parseFigmaUrl";
import type {
  PackageMetadataDifference,
  TemplatePackageV1,
} from "../../src/template-package/types";
import { validateTemplatePackage } from "../../src/template-package/validateTemplatePackage";
import {
  type BackendFigmaEnrichmentProvider,
  FigmaProviderError,
} from "./provider";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isFigmaEnrichmentApiRequest(
  value: unknown,
): value is FigmaEnrichmentApiRequest {
  if (!isRecord(value)) return false;
  return (
    typeof value.figmaUrl === "string" &&
    typeof value.packageRootNodeId === "string" &&
    (value.packageSummary === undefined || isRecord(value.packageSummary)) &&
    (value.package === undefined || isRecord(value.package))
  );
}

function nodeRecord(metadata: FigmaMcpMetadata) {
  return Array.isArray(metadata.nodes)
    ? Object.fromEntries(metadata.nodes.map((node) => [node.id, node]))
    : metadata.nodes;
}

function summaryFromPackage(
  packageValue: TemplatePackageV1,
): FigmaPackageSummary {
  return {
    name: packageValue.name,
    canvas: packageValue.canvas,
    nodeCount: Object.keys(packageValue.nodes).length,
    editableFields: packageValue.editableFields.map((field) => ({
      id: field.id,
      type: field.type,
      nodeId: field.nodeId,
      marker: `field:${field.type}:${field.id}`,
    })),
  };
}

function compareSummary(
  rootNodeId: string,
  summary: FigmaPackageSummary | undefined,
  metadata: FigmaMcpMetadata,
): PackageMetadataDifference[] {
  const differences: PackageMetadataDifference[] = [];
  const nodes = nodeRecord(metadata);
  const liveRootId = metadata.rootNodeId;
  const liveRoot = liveRootId ? nodes[liveRootId] : undefined;

  if (liveRootId && liveRootId !== rootNodeId) {
    differences.push({
      code: "root-changed",
      nodeId: rootNodeId,
      packageValue: rootNodeId,
      figmaValue: liveRootId,
      message: `Package root ${rootNodeId} differs from live Figma root ${liveRootId}.`,
    });
  }
  if (summary?.name && metadata.rootName && summary.name !== metadata.rootName) {
    differences.push({
      code: "name-changed",
      nodeId: liveRootId,
      packageValue: summary.name,
      figmaValue: metadata.rootName,
      message: "The package name differs from the live Figma root name.",
    });
  }
  if (
    summary?.canvas &&
    metadata.canvas &&
    (Math.abs(summary.canvas.width - metadata.canvas.width) > 1 ||
      Math.abs(summary.canvas.height - metadata.canvas.height) > 1)
  ) {
    differences.push({
      code: "canvas-changed",
      nodeId: liveRootId,
      packageValue: summary.canvas,
      figmaValue: metadata.canvas,
      message: "The package canvas size differs from the live Figma root.",
    });
  }
  if (
    summary?.nodeCount !== undefined &&
    summary.nodeCount !== Object.keys(nodes).length
  ) {
    differences.push({
      code: "node-count-changed",
      nodeId: liveRootId,
      packageValue: summary.nodeCount,
      figmaValue: Object.keys(nodes).length,
      message: "The package node count differs from the live Figma subtree.",
    });
  }
  summary?.editableFields?.forEach((field) => {
    const liveNode = nodes[field.nodeId];
    const expectedMarker =
      field.marker ?? `field:${field.type}:${field.id}`;
    const liveMarker = liveNode?.dataName ?? liveNode?.name;
    if (!liveNode || liveMarker !== expectedMarker) {
      differences.push({
        code: "field-marker-changed",
        nodeId: field.nodeId,
        packageValue: expectedMarker,
        figmaValue: liveMarker,
        message: `Editable field marker ${expectedMarker} does not match live Figma metadata.`,
      });
    }
  });
  if (!liveRoot) {
    differences.push({
      code: "missing-in-figma",
      nodeId: rootNodeId,
      packageValue: rootNodeId,
      message: `Package root ${rootNodeId} is missing from live Figma metadata.`,
    });
  }
  return differences;
}

export async function handleFigmaEnrichment(
  request: FigmaEnrichmentApiRequest,
  provider: BackendFigmaEnrichmentProvider | null,
): Promise<FigmaEnrichmentApiResponse> {
  const parsed = parseFigmaUrl(request.figmaUrl);
  if (!parsed.valid) {
    return {
      ok: false,
      code: "invalid-figma-url",
      message: parsed.error,
    };
  }
  if (!parsed.value.nodeId) {
    return {
      ok: false,
      code: "missing-node-id",
      message: "Use a node-specific Figma URL containing node-id.",
    };
  }
  if (!request.packageRootNodeId.trim()) {
    return {
      ok: false,
      code: "invalid-request",
      message: "packageRootNodeId is required.",
    };
  }
  if (!provider) {
    return {
      ok: false,
      code: "provider-unavailable",
      message:
        "No Figma provider is configured. Set FIGMA_MCP_PROVIDER_URL or FIGMA_ACCESS_TOKEN.",
    };
  }
  if (request.package) {
    const validation = validateTemplatePackage(request.package);
    if (!validation.valid) {
      return {
        ok: false,
        code: "invalid-request",
        message: "The supplied Template Package is invalid.",
      };
    }
  }

  try {
    const [metadata, designContext, screenshot] = await Promise.all([
      provider.fetchMetadata(parsed.value),
      provider.fetchDesignContext?.(parsed.value) ?? Promise.resolve(null),
      provider.fetchScreenshot?.(parsed.value) ?? Promise.resolve(null),
    ]);
    if (!metadata) {
      throw new FigmaProviderError(
        "The Figma provider did not return metadata.",
      );
    }

    const summary =
      request.packageSummary ??
      (request.package ? summaryFromPackage(request.package) : undefined);
    const summaryDifferences = compareSummary(
      request.packageRootNodeId,
      summary,
      metadata,
    );
    const packageComparison = request.package
      ? comparePackageToFigmaMetadata(request.package, metadata)
      : null;
    const differences = [
      ...summaryDifferences,
      ...(packageComparison?.differences ?? []),
    ].filter(
      (difference, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.code === difference.code &&
            candidate.nodeId === difference.nodeId &&
            candidate.message === difference.message,
        ) === index,
    );
    const now = new Date().toISOString();
    const enriched = request.package
      ? enrichTemplatePackage(request.package, {
          figmaUrl: request.figmaUrl,
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
        }).package
      : undefined;

    return {
      ok: true,
      reference: parsed.value,
      provider: provider.info,
      metadata,
      screenshot,
      comparison: {
        status: differences.length > 0 ? "changed" : "matched",
        differences,
      },
      staleWarnings: differences.map((difference) => difference.message),
      package: enriched,
    };
  } catch (error) {
    const providerError =
      error instanceof FigmaProviderError ? error : null;
    return {
      ok: false,
      code: providerError?.code ?? "provider-error",
      message:
        providerError?.message ??
        (error instanceof Error
          ? error.message
          : "Figma enrichment failed."),
    };
  }
}

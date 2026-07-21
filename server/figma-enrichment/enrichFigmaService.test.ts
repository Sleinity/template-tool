import figmaPluginV041 from "../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import type {
  FigmaMcpMetadata,
  ParsedFigmaUrl,
} from "../../src/template-package/enrichment";
import type { TemplatePackageV1 } from "../../src/template-package/types";
import { handleFigmaEnrichment } from "./enrichFigmaService";
import type { BackendFigmaEnrichmentProvider } from "./provider";
import { FigmaProviderError } from "./provider";
import { figmaEnrichmentHttpStatus } from "./apiRoute";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const packageValue =
  figmaPluginV041 as unknown as TemplatePackageV1;

function metadataForPackage(
  packageInput: TemplatePackageV1,
): FigmaMcpMetadata {
  return {
    rootNodeId: packageInput.rootNodeId,
    rootName: packageInput.nodes[packageInput.rootNodeId].name,
    canvas: {
      width: packageInput.canvas.width,
      height: packageInput.canvas.height,
    },
    nodes: Object.fromEntries(
      Object.values(packageInput.nodes).map((node) => {
        const field = packageInput.editableFields.find(
          (candidate) => candidate.nodeId === node.id,
        );
        return [
          node.id,
          {
            id: node.id,
            name: node.name,
            dataName: field
              ? `field:${field.type}:${field.id}`
              : node.name,
            type: node.type,
            parentId: node.parentId,
            children: node.children,
            bounds: node.bounds.absolute,
          },
        ];
      }),
    ),
  };
}

function providerWithMetadata(
  metadata: FigmaMcpMetadata,
): BackendFigmaEnrichmentProvider {
  return {
    info: {
      kind: "custom",
      metadata: true,
      designContext: true,
      screenshot: true,
    },
    async fetchMetadata(_reference: ParsedFigmaUrl) {
      return metadata;
    },
    async fetchDesignContext() {
      return '<img className="object-cover" />';
    },
    async fetchScreenshot() {
      return {
        url: "https://example.test/reference.png",
        width: packageValue.canvas.width,
        height: packageValue.canvas.height,
      };
    },
  };
}

const baseRequest = {
  figmaUrl: `https://www.figma.com/design/testFile/Example?node-id=${packageValue.rootNodeId.replace(":", "-")}`,
  packageRootNodeId: packageValue.rootNodeId,
  package: packageValue,
};

const unavailable = await handleFigmaEnrichment(baseRequest, null);
assert(
  !unavailable.ok && unavailable.code === "provider-unavailable" && figmaEnrichmentHttpStatus(unavailable) === 200,
  "Expected optional-provider absence should remain typed without creating a browser HTTP error.",
);

const missingNode = await handleFigmaEnrichment(
  {
    ...baseRequest,
    figmaUrl: "https://www.figma.com/design/testFile/Example",
  },
  providerWithMetadata(metadataForPackage(packageValue)),
);
assert(
  !missingNode.ok && missingNode.code === "missing-node-id",
  "A Figma URL without node-id should be rejected before provider access.",
);

const failedProvider: BackendFigmaEnrichmentProvider = {
  info: {
    kind: "custom",
    metadata: true,
    designContext: false,
    screenshot: false,
  },
  async fetchMetadata() {
    throw new FigmaProviderError("Provider unavailable.", "provider-error");
  },
};
const providerFailure = await handleFigmaEnrichment(
  baseRequest,
  failedProvider,
);
assert(
  !providerFailure.ok && providerFailure.code === "provider-error",
  "Provider failures should return a normalized API failure.",
);
assert(figmaEnrichmentHttpStatus(providerFailure) === 400, "Unexpected provider failures must remain non-2xx.");

const staleMetadata = metadataForPackage(packageValue);
staleMetadata.canvas = {
  width: packageValue.canvas.width + 100,
  height: packageValue.canvas.height,
};
const stale = await handleFigmaEnrichment(
  baseRequest,
  providerWithMetadata(staleMetadata),
);
assert(
  stale.ok &&
    stale.comparison.status === "changed" &&
    stale.staleWarnings.some((warning) => warning.includes("canvas size")),
  "Canvas mismatches should produce stale-package warnings.",
);

const success = await handleFigmaEnrichment(
  baseRequest,
  providerWithMetadata(metadataForPackage(packageValue)),
);
assert(
  success.ok &&
    success.comparison.status === "matched" &&
    success.package?.source?.figmaMcp?.status === "matched" &&
    Boolean(success.package?.rendererHints) &&
    success.screenshot?.url === "https://example.test/reference.png",
  "Successful provider evidence should return an enriched package and screenshot reference.",
);
assert(
  success.ok &&
    !("designContext" in success) &&
    success.package?.verification?.designHints?.[0]?.kind === "object-fit",
  "Raw MCP design context must not be exposed; only safe normalized hints may leave the server.",
);

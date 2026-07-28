import figmaPluginV041 from "../../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import type { TemplatePackageV1 } from "../../../../src/template-package/types";
import { handleFigmaEnrichment } from "./enrichFigmaService";
import { FigmaRestProvider } from "./figmaRestProvider";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const packageValue =
  figmaPluginV041 as unknown as TemplatePackageV1;
const figmaUrl = `https://www.figma.com/design/restFile/Example?node-id=${packageValue.rootNodeId.replace(":", "-")}`;
const request = {
  figmaUrl,
  packageRootNodeId: packageValue.rootNodeId,
  package: packageValue,
};

const noProvider = await handleFigmaEnrichment(request, null);
assert(
  !noProvider.ok && noProvider.code === "provider-unavailable",
  "A server without a configured provider should return provider-unavailable.",
);

const rejectedTokenProvider = new FigmaRestProvider({
  accessToken: "invalid",
  apiBaseUrl: "https://figma.test",
  fetcher: async () =>
    new Response(JSON.stringify({ err: "Invalid token" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    }),
});
const rejectedToken = await handleFigmaEnrichment(
  request,
  rejectedTokenProvider,
);
assert(
  !rejectedToken.ok && rejectedToken.code === "invalid-access-token",
  "A rejected FIGMA_ACCESS_TOKEN should return a specific normalized error.",
);

function restNode(nodeId: string): Record<string, unknown> {
  const node = packageValue.nodes[nodeId];
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    absoluteBoundingBox: node.bounds.absolute,
    children: node.children.map(restNode),
  };
}

let tokenHeaderObserved = false;
const successfulProvider = new FigmaRestProvider({
  accessToken: "valid-token",
  apiBaseUrl: "https://figma.test",
  fetcher: async (input, init) => {
    const headers = init?.headers as Record<string, string> | undefined;
    tokenHeaderObserved =
      tokenHeaderObserved || headers?.["x-figma-token"] === "valid-token";
    const url = String(input);
    if (url === "https://figma.test/rendered-node.png") {
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: { "content-type": "image/png" },
      });
    }
    if (url.includes("/v1/images/")) {
      return new Response(
        JSON.stringify({
          images: {
            [packageValue.rootNodeId]:
              "https://figma.test/rendered-node.png",
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }
    return new Response(
      JSON.stringify({
        nodes: {
          [packageValue.rootNodeId]: {
            document: restNode(packageValue.rootNodeId),
          },
        },
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  },
});
const successfulRestEnrichment = await handleFigmaEnrichment(
  request,
  successfulProvider,
);
assert(
  successfulRestEnrichment.ok &&
    successfulRestEnrichment.provider.kind === "figma-rest" &&
    successfulRestEnrichment.metadata.rootNodeId ===
      packageValue.rootNodeId &&
    successfulRestEnrichment.screenshot?.url ===
      "https://figma.test/rendered-node.png" &&
    successfulRestEnrichment.screenshot?.dataUrl?.startsWith(
      "data:image/png;base64,",
    ) &&
    tokenHeaderObserved,
  "Figma REST enrichment should fetch metadata and a screenshot server-side using the configured token.",
);

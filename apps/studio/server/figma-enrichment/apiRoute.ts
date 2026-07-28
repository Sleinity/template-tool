import type { IncomingMessage, ServerResponse } from "node:http";
import {
  isFigmaEnrichmentApiRequest,
  handleFigmaEnrichment,
} from "./enrichFigmaService";
import type { BackendFigmaEnrichmentProvider } from "./provider";
import type { FigmaEnrichmentApiResponse } from "../../../../src/template-package/enrichment/figmaEnrichmentApi";

const DEFAULT_BODY_LIMIT = 64 * 1024 * 1024;

async function readJsonBody(
  request: IncomingMessage,
  maxBytes: number,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let received = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    received += buffer.byteLength;
    if (received > maxBytes) {
      throw new Error("Request body is too large.");
    }
    chunks.push(buffer);
  }
  const source = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(source);
}

function writeJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(payload));
}

export function figmaEnrichmentHttpStatus(result: FigmaEnrichmentApiResponse): number {
  if (result.ok || result.code === "provider-unavailable") return 200;
  if (result.code === "invalid-access-token") return 401;
  if (result.code === "node-not-found") return 404;
  return 400;
}

export function createFigmaEnrichmentApiHandler(
  provider: BackendFigmaEnrichmentProvider | null,
  options: { maxBodyBytes?: number } = {},
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<boolean> => {
    const pathname = new URL(
      request.url ?? "/",
      "http://localhost",
    ).pathname;
    if (pathname !== "/api/template-package/enrich-figma") return false;
    if (request.method !== "POST") {
      writeJson(response, 405, {
        ok: false,
        code: "invalid-request",
        message: "Use POST for this endpoint.",
      });
      return true;
    }

    try {
      const body = await readJsonBody(
        request,
        options.maxBodyBytes ?? DEFAULT_BODY_LIMIT,
      );
      if (!isFigmaEnrichmentApiRequest(body)) {
        writeJson(response, 400, {
          ok: false,
          code: "invalid-request",
          message:
            "figmaUrl and packageRootNodeId are required.",
        });
        return true;
      }
      const result = await handleFigmaEnrichment(body, provider);
      // Provider absence is an expected optional-capability result. Keep the
      // typed failure payload visible without manufacturing a browser HTTP error.
      writeJson(response, figmaEnrichmentHttpStatus(result), result);
    } catch (error) {
      writeJson(response, 400, {
        ok: false,
        code: "invalid-request",
        message:
          error instanceof Error
            ? error.message
            : "Invalid JSON request.",
      });
    }
    return true;
  };
}

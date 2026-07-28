interface FontApiRequest extends AsyncIterable<Uint8Array | string> {
  url?: string;
  method?: string;
}

interface FontApiResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(value?: string): void;
}

interface OpenFontRecord {
  family: string;
  weight: number;
  style: "normal" | "italic";
  postScriptName: string;
  url: string;
  fileName: string;
}

const OPEN_FONT_LICENSE = {
  name: "SIL Open Font License 1.1",
  url: "https://openfontlicense.org/",
};

const trustedOpenFonts: OpenFontRecord[] = [
  {
    family: "Crimson Text",
    weight: 400,
    style: "normal",
    postScriptName: "CrimsonText",
    url: "https://raw.githubusercontent.com/google/fonts/main/ofl/crimsontext/CrimsonText-Regular.ttf",
    fileName: "CrimsonText-Regular.ttf",
  },
  {
    family: "Darker Grotesque",
    weight: 700,
    style: "normal",
    postScriptName: "DarkerGrotesque-Bold",
    url: "https://raw.githubusercontent.com/google/fonts/main/ofl/darkergrotesque/DarkerGrotesque%5Bwght%5D.ttf",
    fileName: "DarkerGrotesque-wght.ttf",
  },
];

export interface OpenFontRequest {
  family: string;
  weight: number;
  style: "normal" | "italic";
  postScriptName?: string | null;
}

function normalize(value: unknown): string {
  return typeof value === "string"
    ? value.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "";
}

async function readBody(request: FontApiRequest): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) {
    chunks.push(
      typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk,
    );
  }
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.length;
  });
  return JSON.parse(new TextDecoder().decode(bytes));
}

function writeJson(response: FontApiResponse, statusCode: number, value: unknown) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(value));
}

function toBase64(source: ArrayBuffer): string {
  const bytes = new Uint8Array(source);
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    output += alphabet[first >> 2];
    output += alphabet[((first & 3) << 4) | ((second ?? 0) >> 4)];
    output +=
      second === undefined
        ? "="
        : alphabet[((second & 15) << 2) | ((third ?? 0) >> 6)];
    output += third === undefined ? "=" : alphabet[third & 63];
  }
  return output;
}

export async function resolveTrustedOpenFont(
  body: OpenFontRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<{ statusCode: number; body: Record<string, unknown> }> {
  const match = trustedOpenFonts.find(
    (font) =>
      normalize(font.family) === normalize(body.family) &&
      font.weight === Number(body.weight) &&
      font.style === body.style &&
      (!body.postScriptName ||
        normalize(font.postScriptName) === normalize(body.postScriptName)),
  );
  if (!match) {
    return {
      statusCode: 404,
      body: {
        ok: false,
        code: "font-not-in-trusted-catalog",
        message:
          "This exact face is not in the trusted open-font catalog. Upload the licensed font file instead.",
      },
    };
  }
  const upstream = await fetchImpl(match.url);
  if (!upstream.ok) {
    return {
      statusCode: 502,
      body: {
        ok: false,
        code: "font-provider-failed",
        message: "The trusted font provider could not supply this face.",
      },
    };
  }
  const bytes = await upstream.arrayBuffer();
  return {
    statusCode: 200,
    body: {
      ok: true,
      dataUrl: `data:font/ttf;base64,${toBase64(bytes)}`,
      mimeType: "font/ttf",
      fileName: match.fileName,
      provider: "google-fonts",
      license: OPEN_FONT_LICENSE,
    },
  };
}

export function createOpenFontApiHandler(
  fetchImpl: typeof fetch = fetch,
) {
  return async (
    request: FontApiRequest,
    response: FontApiResponse,
  ): Promise<boolean> => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (pathname !== "/api/template-package/resolve-open-font") return false;
    if (request.method !== "POST") {
      writeJson(response, 405, { ok: false, code: "invalid-request" });
      return true;
    }
    try {
      const body = (await readBody(request)) as OpenFontRequest;
      const result = await resolveTrustedOpenFont(body, fetchImpl);
      writeJson(response, result.statusCode, result.body);
      return true;
    } catch (error) {
      writeJson(response, 400, {
        ok: false,
        code: "invalid-request",
        message: error instanceof Error ? error.message : "Invalid request.",
      });
      return true;
    }
  };
}

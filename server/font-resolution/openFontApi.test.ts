import { resolveTrustedOpenFont } from "./openFontApi";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const missing = await resolveTrustedOpenFont(
  {
    family: "Commercial Mystery Font",
    weight: 400,
    style: "normal",
  },
  async () => new Response(),
);
assert(
  missing.statusCode === 404 &&
    missing.body.code === "font-not-in-trusted-catalog",
  "Unknown faces must require an explicit licensed upload.",
);

let requestedUrl = "";
const resolved = await resolveTrustedOpenFont(
  {
    family: "Crimson Text",
    weight: 400,
    style: "normal",
    postScriptName: "CrimsonText",
  },
  async (input) => {
    requestedUrl = String(input);
    return new Response(new Uint8Array([0, 1, 2, 3]), { status: 200 });
  },
);
assert(
  resolved.statusCode === 200 &&
    String(resolved.body.dataUrl).startsWith("data:font/ttf;base64,") &&
    requestedUrl.includes("CrimsonText-Regular.ttf"),
  "A trusted exact face should be fetched server-side with license metadata.",
);

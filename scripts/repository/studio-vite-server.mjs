import path from "node:path";
import { createServer } from "vite";

export const studioRoot = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "apps",
  "studio",
);

export function createStudioViteServer({
  port = 0,
  strictPort = false,
  logLevel = "error",
} = {}) {
  return createServer({
    root: studioRoot,
    logLevel,
    define: {
      "import.meta.env.VITE_TEMPLATE_PACKAGE_FONT_SETUP_HARNESS":
        JSON.stringify("true"),
    },
    server: {
      host: "127.0.0.1",
      port,
      strictPort,
    },
  });
}

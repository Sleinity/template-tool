import path from "node:path";
import { createServer } from "vite";
import { retainedSourcePlugin } from "../text-geometry/retained-source-plugin.mjs";

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
  plugins = [],
} = {}) {
  return createServer({
    root: studioRoot,
    plugins: [...plugins, ...(process.env.EDITOR_RETAINED_SOURCE_IDENTITY
      ? [retainedSourcePlugin(process.env.EDITOR_RETAINED_SOURCE_IDENTITY)]
      : [])],
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

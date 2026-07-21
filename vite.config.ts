import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { figmaEnrichmentApiPlugin } from "./server/figma-enrichment/vitePlugin";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  return {
    resolve: {
      alias: {
        "@sleinity/template-core": fileURLToPath(
          new URL("./packages/template-core/src/index.ts", import.meta.url),
        ),
        "@sleinity/template-browser": fileURLToPath(
          new URL("./packages/template-browser/src/index.ts", import.meta.url),
        ),
        "@sleinity/template-react": fileURLToPath(
          new URL("./packages/template-react/src/index.ts", import.meta.url),
        ),
      },
    },
    plugins: [
      react(),
      figmaEnrichmentApiPlugin({
        FIGMA_MCP_PROVIDER_URL: environment.FIGMA_MCP_PROVIDER_URL,
        FIGMA_MCP_PROVIDER_TOKEN: environment.FIGMA_MCP_PROVIDER_TOKEN,
        FIGMA_ACCESS_TOKEN: environment.FIGMA_ACCESS_TOKEN,
      }),
    ],
  };
});

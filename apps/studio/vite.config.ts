import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { figmaEnrichmentApiPlugin } from "./server/figma-enrichment/vitePlugin";
import sdkEntryPoints from "../../config/sdk-entry-points.json";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

const sdkSourceAliases = sdkEntryPoints.packages
  .flatMap((packageValue) => packageValue.entries.map((entry) => ({
    find: entry.path === "."
      ? new RegExp(`^${packageValue.name.replaceAll("/", "\\/")}$`)
      : `${packageValue.name}/${entry.path.slice(2)}`,
    replacement: fileURLToPath(
      new URL(
        `../../packages/${packageValue.directory}/${entry.source}`,
        import.meta.url,
      ),
    ),
  })))
  .sort((left, right) => String(right.find).length - String(left.find).length);

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, repositoryRoot, "");
  return {
    envDir: repositoryRoot,
    resolve: {
      alias: sdkSourceAliases,
    },
    server: {
      fs: {
        allow: [repositoryRoot],
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

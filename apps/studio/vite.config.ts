import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { figmaEnrichmentApiPlugin } from "./server/figma-enrichment/vitePlugin";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, repositoryRoot, "");
  return {
    envDir: repositoryRoot,
    resolve: {
      alias: [
        {
          find: "@sleinity/template-core/renderer-internal",
          replacement: fileURLToPath(
            new URL(
              "../../packages/template-core/src/renderer-internal.ts",
              import.meta.url,
            ),
          ),
        },
        {
          find: "@sleinity/template-react/renderer-internal",
          replacement: fileURLToPath(
            new URL(
              "../../packages/template-react/src/renderer-internal.ts",
              import.meta.url,
            ),
          ),
        },
        {
          find: "@sleinity/template-browser/session",
          replacement: fileURLToPath(
            new URL(
              "../../packages/template-browser/src/session.ts",
              import.meta.url,
            ),
          ),
        },
        {
          find: "@sleinity/template-browser/importer",
          replacement: fileURLToPath(
            new URL(
              "../../packages/template-browser/src/importer.ts",
              import.meta.url,
            ),
          ),
        },
        {
          find: "@sleinity/template-browser/compatibility",
          replacement: fileURLToPath(
            new URL(
              "../../packages/template-browser/src/compatibility.ts",
              import.meta.url,
            ),
          ),
        },
        ...[
          "editor",
          "assets",
          "fonts",
          "motion",
          "inspection",
        ].map((entry) => ({
          find: `@sleinity/template-core/${entry}`,
          replacement: fileURLToPath(
            new URL(`../../packages/template-core/src/${entry}.ts`, import.meta.url),
          ),
        })),
        ...[
          "assets",
          "fonts",
          "persistence",
          "capture",
          "enrichment",
        ].map((entry) => ({
          find: `@sleinity/template-browser/${entry}`,
          replacement: fileURLToPath(
            new URL(`../../packages/template-browser/src/${entry}.ts`, import.meta.url),
          ),
        })),
        {
          find: "@sleinity/template-react/inspection",
          replacement: fileURLToPath(
            new URL(
              "../../packages/template-react/src/inspection.ts",
              import.meta.url,
            ),
          ),
        },
        {
          find: /^@sleinity\/template-core$/,
          replacement: fileURLToPath(
          new URL("../../packages/template-core/src/index.ts", import.meta.url),
          ),
        },
        {
          find: /^@sleinity\/template-browser$/,
          replacement: fileURLToPath(
          new URL("../../packages/template-browser/src/index.ts", import.meta.url),
          ),
        },
        {
          find: /^@sleinity\/template-react$/,
          replacement: fileURLToPath(
          new URL("../../packages/template-react/src/index.ts", import.meta.url),
          ),
        },
      ],
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

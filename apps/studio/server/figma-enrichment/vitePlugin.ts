import type { Plugin, PreviewServer, ViteDevServer } from "vite";
import { createFigmaEnrichmentApiHandler } from "./apiRoute";
import { createFigmaEnrichmentProvider } from "./createProvider";
import type { FigmaProviderEnvironment } from "./createProvider";

function installMiddleware(
  server: ViteDevServer | PreviewServer,
  environment: FigmaProviderEnvironment,
) {
  const handler = createFigmaEnrichmentApiHandler(
    createFigmaEnrichmentProvider(environment),
  );
  server.middlewares.use((request, response, next) => {
    void handler(request, response)
      .then((handled) => {
        if (!handled) next();
      })
      .catch(next);
  });
}

export function figmaEnrichmentApiPlugin(
  environment: FigmaProviderEnvironment,
): Plugin {
  return {
    name: "figma-enrichment-api",
    configureServer(server) {
      installMiddleware(server, environment);
    },
    configurePreviewServer(server) {
      installMiddleware(server, environment);
    },
  };
}

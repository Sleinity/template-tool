import type {
  FigmaEnrichmentProviderInfo,
  FigmaMcpEnrichmentProvider,
} from "../../src/template-package/enrichment";

export interface BackendFigmaEnrichmentProvider
  extends FigmaMcpEnrichmentProvider {
  readonly info: FigmaEnrichmentProviderInfo;
}

export class FigmaProviderError extends Error {
  constructor(
    message: string,
    readonly code:
      | "provider-unavailable"
      | "invalid-access-token"
      | "provider-error"
      | "node-not-found" = "provider-error",
  ) {
    super(message);
    this.name = "FigmaProviderError";
  }
}

import type { ParseTemplatePackageV2Result, TemplatePackageV2 } from "@sleinity/template-core";
import { compileZipSource } from "../internal/compilerResult/compile";
import type { PackageImportResult, TemplatePackageImportPipelineInput } from "./runTemplatePackageImportPipeline";

export type TemplatePackageImportPipelineInputV2 = TemplatePackageImportPipelineInput & {
  /** Host-owned source identity; it is not a generated or persisted package ID. */
  sourceId: string;
};

export type TemplatePackageImportFailureV2 = Readonly<{
  stage: "import" | "v2-normalization";
  cause: unknown;
}>;

export interface TemplatePackageImportResultV2 {
  readonly sourceId: string;
  readonly sourceName: string;
  /** Import acceptance only, independent of font/render/export readiness. */
  readonly status: "ready" | "blocked" | "error";
  /** Available canonical data remains inspectable even when acceptance is blocked. */
  readonly package: TemplatePackageV2 | null;
  /** Borrowed authority evidence. Do not mutate it or use temporary URLs after disposal. */
  readonly importEvidence: Readonly<Omit<PackageImportResult, "dispose">> | null;
  readonly parseResult: Readonly<ParseTemplatePackageV2Result> | null;
  readonly failure: TemplatePackageImportFailureV2 | null;
  /** Idempotent. Sessions retain their own URL leases during load. */
  dispose(): void;
}

/** Internal delegate seam for contract tests; never exported by a package entry. */
export function createV2ImportOperation(compile: typeof compileZipSource) {
  return async (input: TemplatePackageImportPipelineInputV2): Promise<TemplatePackageImportResultV2> => {
    const compiled = await compile(input);
    const source = compiled.sources[0];
    // The compiler retains these exact existing authority objects. This facade
    // names their established public types without exporting experiment types.
    const importEvidence = source.importResult as TemplatePackageImportResultV2["importEvidence"];
    const parseResult = source.parseResult as TemplatePackageImportResultV2["parseResult"];
    const failure = source.failure;
    return Object.freeze({
      sourceId: source.id, sourceName: source.sourceName, status: source.status,
      package: parseResult?.package ?? null, importEvidence, parseResult,
      failure: failure ? Object.freeze({ stage: failure.stage as TemplatePackageImportFailureV2["stage"], cause: failure.cause }) : null,
      dispose: () => compiled.resources.release(),
    });
  };
}

/** ZIP → canonical V2 package, with separate source/normalization evidence and ownership. */
export const runTemplatePackageImportPipelineV2: (
  input: TemplatePackageImportPipelineInputV2,
) => Promise<TemplatePackageImportResultV2> = createV2ImportOperation(compileZipSource);

import type { ParseTemplatePackageV2Result, TemplatePackageV2 } from "@sleinity/template-core";
import type { TemplateFieldFamilyV2 } from "@sleinity/template-core/family";
import type { PackageImportResult, TemplatePackageImportPipelineInput, buildZipPackageImportResult } from "../../import/runTemplatePackageImportPipeline";
import type { createTemplateFieldFamilyFromSourcesV2 } from "../../import/templateSourceAssemblyV2";

/** Read-only architecture view, not a public SDK or serialized contract. */
type PreviousDepth = [0, 0, 1, 2, 3, 4, 5, 6, 7];
export type ReadonlyData<T, Depth extends number = 8> = 0 extends (1 & T) ? T
  : T extends (...args: never[]) => unknown ? T
  : T extends Blob | ArrayBuffer | ArrayBufferView ? T
  : T extends object ? Depth extends 0 ? Readonly<T>
    : { readonly [K in keyof T]: ReadonlyData<T[K], PreviousDepth[Depth]> } : T;

declare const sourceBrand: unique symbol;
export type CompilerSourceInput = TemplatePackageImportPipelineInput & { sourceId: string };
export type CompilerFailure = Readonly<{
  stage: "import" | "v2-normalization" | "family-assembly";
  sourceId?: string;
  cause: unknown;
}>;
export type CompiledSourceRecord = Readonly<{
  id: string;
  sourceName: string;
  status: "ready" | "blocked" | "error";
  importResult: ReadonlyData<Omit<PackageImportResult, "dispose">> | null;
  parseResult: ReadonlyData<ParseTemplatePackageV2Result> | null;
  failure: CompilerFailure | null;
}>;
export interface CompilerResourceHandle {
  readonly released: boolean;
  release(): void;
}
export type CompiledSingleResult = Readonly<{
  readonly [sourceBrand]: true;
  kind: "single";
  status: CompiledSourceRecord["status"];
  sources: readonly [CompiledSourceRecord];
  output: Readonly<{ kind: "single"; packageValue: ReadonlyData<TemplatePackageV2> }> | null;
  failures: readonly CompilerFailure[];
  resources: CompilerResourceHandle;
}>;
export type CompiledFamilyResult = Readonly<{
  kind: "family";
  status: CompiledSourceRecord["status"];
  sources: readonly CompiledSourceRecord[];
  output: Readonly<{ kind: "family"; family: ReadonlyData<TemplateFieldFamilyV2> }> | null;
  sourceVariants: readonly Readonly<{ sourceId: string; variantId: string }>[];
  failures: readonly CompilerFailure[];
  resources: CompilerResourceHandle;
}>;

/** Narrow test seam for calls to existing authorities, never pipeline stages. */
export interface CompilerDelegates {
  importZip: typeof buildZipPackageImportResult;
  parseV2: (input: unknown) => ParseTemplatePackageV2Result;
  assembleFamily: typeof createTemplateFieldFamilyFromSourcesV2;
}

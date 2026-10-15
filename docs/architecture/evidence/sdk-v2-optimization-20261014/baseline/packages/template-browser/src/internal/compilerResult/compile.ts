import { parseTemplatePackageV2, type ParseTemplatePackageV2Result } from "@sleinity/template-core";
import {
  buildZipPackageImportResult, canImportPackageResult, type PackageImportResult,
} from "../../import/runTemplatePackageImportPipeline";
import { createTemplateFieldFamilyFromSourcesV2 } from "../../import/templateSourceAssemblyV2";
import { importResourceOwner, resourceHandle } from "./resources";
import type { CompiledFamilyResult, CompiledSingleResult, CompiledSourceRecord, CompilerDelegates, CompilerFailure, CompilerSourceInput } from "./types";

type SourceAuthority = {
  parsed: ParseTemplatePackageV2Result | null;
  retain(): () => void;
};
const authorities = new WeakMap<CompiledSingleResult, SourceAuthority>();

export class CompilerContractError extends Error {
  constructor(message: string) { super(message); this.name = "CompilerContractError"; }
}

export async function compileZipSource(
  input: CompilerSourceInput,
  delegates: Partial<Pick<CompilerDelegates, "importZip" | "parseV2">> = {},
): Promise<CompiledSingleResult> {
  const { format, sourceId, sourceName, buffer, figmaUrl, assetStorage, fontRegistry } = input;
  if (format !== "zip" || typeof sourceId !== "string" || !sourceId.trim()) {
    throw new CompilerContractError("A ZIP source requires a nonempty caller-provided source ID.");
  }
  let imported: PackageImportResult | null = null;
  let parsed: ParseTemplatePackageV2Result | null = null;
  let failure: CompilerFailure | null = null;
  let stage: CompilerFailure["stage"] = "import";
  let ready = false;
  try {
    imported = await (delegates.importZip ?? buildZipPackageImportResult)(
      buffer, sourceName, figmaUrl, assetStorage, fontRegistry,
    );
    stage = "v2-normalization";
    if (imported.package) parsed = (delegates.parseV2 ?? parseTemplatePackageV2)(imported.package);
    ready = canImportPackageResult(imported) && imported.validation?.valid === true &&
      Boolean(parsed?.package && parsed.validation?.valid);
  } catch (cause) { failure = Object.freeze({ stage, sourceId, cause }); }
  const owner = importResourceOwner(imported?.dispose?.bind(imported));
  // Retain every existing data property, including omitted-vs-present evidence.
  const data = imported ? (({ dispose: _dispose, ...value }) => Object.freeze(value))(imported) : null;
  const source: CompiledSourceRecord = Object.freeze({
    id: sourceId, sourceName,
    status: failure ? "error" : ready ? "ready" : "blocked",
    importResult: data, parseResult: parsed, failure,
  });
  const result = Object.freeze({
    kind: "single" as const, status: source.status,
    sources: Object.freeze([source]) as readonly [CompiledSourceRecord],
    output: ready && parsed?.package ? Object.freeze({ kind: "single" as const, packageValue: parsed.package }) : null,
    failures: Object.freeze(failure ? [failure] : []), resources: owner.handle,
  }) as CompiledSingleResult;
  authorities.set(result, { parsed, retain: owner.retain });
  return result;
}

export function assembleCompiledFamily(
  sources: readonly CompiledSingleResult[], title: string,
  delegates: Partial<Pick<CompilerDelegates, "assembleFamily">> = {},
): CompiledFamilyResult {
  if (!sources.length) throw new CompilerContractError("A Family requires at least one compiled source.");
  const seen = new Set<string>();
  // Validate the entire input before acquiring leases or running assembly.
  for (const source of sources) {
    if (!authorities.has(source) || source.resources.released) throw new CompilerContractError("Family assembly requires live constructor-produced sources.");
    const id = source.sources[0].id;
    if (seen.has(id)) throw new CompilerContractError(`Duplicate compiler source ID: ${id}`);
    seen.add(id);
  }
  const resources = resourceHandle(sources.map(source => authorities.get(source)!.retain()));
  const records = Object.freeze(sources.map(source => source.sources[0]));
  const failures = records.flatMap(record => record.failure ? [record.failure] : []);
  let status: CompiledSourceRecord["status"] = records.some(record => record.status === "error") ? "error"
    : records.some(record => record.status === "blocked") ? "blocked" : "ready";
  let output: CompiledFamilyResult["output"] = null;
  let sourceVariants: CompiledFamilyResult["sourceVariants"] = Object.freeze([]);
  if (status === "ready") {
    try {
      const family = (delegates.assembleFamily ?? createTemplateFieldFamilyFromSourcesV2)(
        sources.map(source => authorities.get(source)!.parsed!.package!), title,
      );
      output = Object.freeze({ kind: "family" as const, family });
      sourceVariants = Object.freeze(family.variants.map((variant, index) => Object.freeze({ sourceId: records[index].id, variantId: variant.id })));
    } catch (cause) {
      status = "error";
      failures.push(Object.freeze({ stage: "family-assembly", cause }));
    }
  }
  return Object.freeze({ kind: "family", status, sources: records, output,
    sourceVariants, failures: Object.freeze(failures), resources });
}

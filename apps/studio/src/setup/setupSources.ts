import { parseTemplatePackageV2, type TemplatePackageV1, type TemplatePackageV2 } from "@sleinity/template-core";
import type { TemplateFieldFamilyV2 } from "@sleinity/template-core/family";
import { appendTemplateSourcesV2, mutateTemplateFamilyV2, runTemplatePackageImportPipelineV2 } from "@sleinity/template-browser/importer";
import type { ReactTemplateFieldSessionV2 } from "@sleinity/template-react";
import { normalizeStudioTextField } from "../field-rules/studioTextLimits";

export type Source = { dispose?: () => void; name: string; packageValue: TemplatePackageV1 | TemplatePackageV2 };
export type SetupSource = Source & { id: string };
export type SetupFamilyMutation =
  | { type: "rename"; variantId: string; label: string }
  | { type: "move"; variantId: string; targetIndex: number }
  | { type: "remove"; variantId: string }
  | { type: "replace"; variantId: string; source: SetupSource }
  | { type: "selection-metadata"; family: TemplateFieldFamilyV2 };

const blobDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("preview.png could not be encoded."));
  reader.onerror = () => reject(reader.error ?? new Error("preview.png could not be read."));
  reader.readAsDataURL(blob);
});

async function attachZipPreview(packageValue: TemplatePackageV2, preview: Blob | undefined): Promise<TemplatePackageV2> {
  if (!preview) return packageValue;
  let assetId = "studio-reference-preview";
  for (let suffix = 2; packageValue.assets[assetId]; suffix += 1) assetId = `studio-reference-preview-${suffix}`;
  return {
    ...packageValue,
    assets: {
      ...packageValue.assets,
      [assetId]: {
        id: assetId,
        type: "image",
        source: "embedded",
        mimeType: "image/png",
        dataUrl: await blobDataUrl(preview),
        sizeBytes: preview.size,
      },
    },
    referencePreview: {
      assetId,
      ...(packageValue.referencePreview?.width ? { width: packageValue.referencePreview.width } : {}),
      ...(packageValue.referencePreview?.height ? { height: packageValue.referencePreview.height } : {}),
    },
  };
}

type StudioVariantDisplayInput = {
  id: string;
  label?: string;
  packageValue: Pick<TemplatePackageV2, "name" | "canvas">;
};

/** Presentation-only labels for controls that must distinguish Family variants.
 * Canonical labels and variant IDs remain untouched.
 */
export function studioVariantDisplayLabels(
  variants: readonly StudioVariantDisplayInput[],
  sources: readonly Pick<SetupSource, "id" | "name">[] = [],
): Record<string, string> {
  const sourceNames = new Map(sources.map((source) => [source.id, source.name]));
  const groups = new Map<string, StudioVariantDisplayInput[]>();
  for (const variant of variants) {
    const base = variant.label?.trim() || variant.packageValue.name || variant.id;
    groups.set(base, [...groups.get(base) ?? [], variant]);
  }
  const labels: Record<string, string> = {};
  for (const [base, group] of groups) {
    if (group.length === 1) { labels[group[0].id] = base; continue; }
    const sourceCounts = new Map<string, number>();
    const sizeCounts = new Map<string, number>();
    for (const variant of group) {
      const source = sourceNames.get(variant.id);
      const size = `${variant.packageValue.canvas.width} × ${variant.packageValue.canvas.height}`;
      if (source) sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
      sizeCounts.set(size, (sizeCounts.get(size) ?? 0) + 1);
    }
    group.forEach((variant, index) => {
      const source = sourceNames.get(variant.id);
      const size = `${variant.packageValue.canvas.width} × ${variant.packageValue.canvas.height}`;
      labels[variant.id] = source && sourceCounts.get(source) === 1
        ? `${base} · ${source}`
        : sizeCounts.get(size) === 1
          ? `${base} · ${size}`
          : `${base} · ${size} · ${index + 1}`;
    });
  }
  return labels;
}

export function normalizedSource(source: Source): TemplatePackageV2 {
  const parsed = parseTemplatePackageV2(source.packageValue);
  if (!parsed.package || !parsed.validation?.valid) {
    throw new Error(parsed.diagnostics.map((issue) => issue.message).join("\n") || "Invalid source package.");
  }
  return applyStudioSourcePolicy(parsed.package);
}

/** Authoring defaults are separate from SDK source parsing. */
function applyStudioSourcePolicy(packageValue: TemplatePackageV2): TemplatePackageV2 {
  return { ...packageValue, editableFields: packageValue.editableFields.map(normalizeStudioTextField) };
}

function studioSourcePackage(source: Source): TemplatePackageV2 {
  return source.packageValue.schemaVersion === "2.2"
    ? applyStudioSourcePolicy(source.packageValue)
    : normalizedSource(source);
}

/** Studio owns default authoring policy; assembly and reconciliation belong to the SDK. */
export function appendSetupSources(
  accepted: ReactTemplateFieldSessionV2 | null,
  previousSources: readonly SetupSource[], additions: readonly SetupSource[], title: string,
  assignments: Readonly<Record<string, Readonly<Record<string, string>>>> = {},
): ReactTemplateFieldSessionV2 {
  return appendTemplateSourcesV2(accepted, previousSources, additions.map(source => ({ ...source, packageValue: studioSourcePackage(source) })), title, assignments);
}

export function mutateSetupFamily(
  accepted: ReactTemplateFieldSessionV2, previousSources: readonly SetupSource[], mutation: SetupFamilyMutation,
): { session: ReactTemplateFieldSessionV2; sources: SetupSource[] } {
  return mutateTemplateFamilyV2(accepted, previousSources, mutation.type === "replace"
    ? { ...mutation, source: { ...mutation.source, packageValue: studioSourcePackage(mutation.source) } }
    : mutation, { removedFieldDisposition: "discard" });
}

export { createTemplateFieldFamilyFromSourcesV2 as familyFromSources } from "@sleinity/template-browser/importer";

export async function readSource(file: File, sourceId = `source-${crypto.randomUUID()}`): Promise<SetupSource> {
  if (file.name.toLowerCase().endsWith(".json")) {
    const parsed = parseTemplatePackageV2(JSON.parse(await file.text()));
    if (!parsed.package) throw new Error(parsed.diagnostics.map((issue) => issue.message).join("\n"));
    return { id: sourceId, name: file.name, packageValue: normalizedSource({ name: file.name, packageValue: parsed.package }) };
  }
  const buffer = await file.arrayBuffer();
  const result = await runTemplatePackageImportPipelineV2({ format: "zip", buffer, sourceName: file.name, sourceId });
  try {
    if (result.failure) throw result.failure.cause;
    if (result.status !== "ready" || !result.package) throw new Error([
      ...result.importEvidence?.diagnostics ?? [], ...result.parseResult?.diagnostics ?? [],
    ].map(issue => issue.message).join("\n") || "Source import failed.");
    const packageValue = applyStudioSourcePolicy(result.package);
    return { id: result.sourceId, name: result.sourceName, dispose: result.dispose, packageValue: await attachZipPreview(packageValue, result.importEvidence?.previewBlob) };
  } catch (error) { result.dispose(); throw error; }
}

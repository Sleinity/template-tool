/** Frozen pre-consolidation test oracle, captured 2026-10-08. Never exported or used in production. */
import { parseTemplatePackageV2, type TemplateFieldContentEntryV1, type TemplateFieldConfigurationV2, type TemplatePackageV1, type TemplatePackageV2 } from "@sleinity/template-core";
import { getTemplateFieldFamilyEditorControlOrderV2, resolveTemplateFieldFamilyVariantV2, type TemplateFieldFamilyV2, type TemplateFieldFamilyVariantFieldOverrideV2 } from "@sleinity/template-core/family";
import { createTemplateSessionV2, type TemplateSessionV2, type TemplateSessionV2Options } from "../src/session/templateSessionV2";
import { createTemplateFieldFamilySessionV2, type TemplateFieldFamilySessionV2, type TemplateFieldFamilySessionV2Options } from "../src/session/templateFieldFamilySessionV2";
import type { TemplateReimportRemovedFieldDispositionV2 } from "../src/import/templateReimportV2";

type TemplateAuthoringSessionV2 = TemplateSessionV2 | TemplateFieldFamilySessionV2;
export type TemplateImportSourceV2 = { id: string; name: string; packageValue: TemplatePackageV1 | TemplatePackageV2 };
export type TemplateFamilyMutationV2 =
  | { type: "rename"; variantId: string; label: string }
  | { type: "move"; variantId: string; targetIndex: number }
  | { type: "remove"; variantId: string }
  | { type: "replace"; variantId: string; source: TemplateImportSourceV2 }
  | { type: "selection-metadata"; family: TemplateFieldFamilyV2 };

function validatedSource(source: TemplateImportSourceV2): TemplatePackageV2 {
  const parsed = parseTemplatePackageV2(source.packageValue);
  if (!parsed.package || !parsed.validation?.valid) throw new Error(parsed.diagnostics.map(issue => issue.message).join("\n") || "Invalid source package.");
  return parsed.package;
}

/** An explicit upstream transaction, never called by navigation or step mounting.
 * The candidate is checked before the caller replaces/disposes the accepted session.
 * Setup has no output-content controls, so source assembly cannot discard draft edits.
 */
export function baselineAppendTemplateSourcesV2(
  accepted: TemplateAuthoringSessionV2 | null,
  previousSources: readonly TemplateImportSourceV2[],
  additions: readonly TemplateImportSourceV2[],
  title: string,
  selectionAssignments: Readonly<Record<string, Readonly<Record<string, string>>>> = {},
  sessionOptions: { single?: TemplateSessionV2Options; family?: TemplateFieldFamilySessionV2Options } = {},
): TemplateAuthoringSessionV2 {
  if (!additions.length) throw new Error("Choose a source package.");
  const packages = additions.map(validatedSource);
  if (!accepted && additions.length === 1) {
    const next = createTemplateSessionV2(sessionOptions.single);
    next.load(packages[0]);
    if (next.getSnapshot().status !== "ready") {
      const reason = next.getSnapshot().error?.message;
      next.dispose();
      throw new Error(reason ?? "Source could not be loaded.");
    }
    return next;
  }
  const snapshot = accepted?.getSnapshot();
  let family: TemplateFieldFamilyV2;
  if (snapshot && "family" in snapshot && snapshot.family) {
    family = structuredClone(snapshot.family);
  } else if (snapshot && "basePackage" in snapshot && snapshot.basePackage) {
    if (snapshot.contentState && Object.keys(snapshot.contentState.values).length) throw new Error("Promote source configuration before editing output content.");
    if (!previousSources[0]) throw new Error("The accepted source identity is required for promotion.");
    family = baselineCreateTemplateFieldFamilyFromSourcesV2([snapshot.basePackage], title);
    family.variants = [{ ...family.variants[0], id: previousSources[0].id }];
  } else {
    family = { schemaVersion: "template-field-family-v2", id: `family-${crypto.randomUUID()}`, title,
      fields: [], editableFieldOrder: [], variants: [], variantGroups: [], editorControlOrder: [] };
  }
  for (const [index, packageValue] of packages.entries()) {
    // Seed new fields only. Existing accepted common rules/order/overrides are immutable here.
    const imported = baselineCreateTemplateFieldFamilyFromSourcesV2([packageValue], title);
    const newFields = imported.fields.filter((field) => !family.fields.some((entry) => entry.id === field.id));
    family.fields = [...family.fields, ...newFields];
    family.editableFieldOrder = [...family.editableFieldOrder, ...newFields.map((field) => field.id)];
    const fieldOverrides = Object.fromEntries(packageValue.editableFields.flatMap((field) => {
      const common = family.fields.find((entry) => entry.id === field.id)!;
      if (common.type !== field.type) throw new Error(`Field ${field.id} has different types across variants. Existing setup is unchanged.`);
      const keys = new Set([...Object.keys(common.configuration), ...Object.keys(field.configuration)]);
      const configuration = Object.fromEntries([...keys].filter((key) =>
        JSON.stringify((common.configuration as Record<string, unknown>)[key]) !== JSON.stringify((field.configuration as Record<string, unknown>)[key]),
      ).map((key) => [key, (field.configuration as Record<string, unknown>)[key] ?? null]));
      return Object.keys(configuration).length ? [[field.id, { type: field.type, configuration }]] : [];
    })) as Record<string, TemplateFieldFamilyVariantFieldOverrideV2>;
    const groupAssignments = Object.fromEntries((family.variantGroups ?? []).map((group) => {
      const assigned = selectionAssignments[additions[index].id]?.[group.id];
      if (!assigned || !group.options.some((option) => option.id === assigned)) {
        throw new Error(`Choose a ${group.title} value for ${packageValue.name} before adding it.`);
      }
      return [group.id, assigned];
    }));
    family.variants = [...family.variants, { id: additions[index].id, label: packageValue.name, packageValue, fieldOverrides, groupAssignments }];
  }
  family.editorControlOrder = getTemplateFieldFamilyEditorControlOrderV2(family);
  for (const variant of family.variants) {
    const result = resolveTemplateFieldFamilyVariantV2(family, variant.id);
    if (!result.valid) throw new Error(result.issues.map((issue) => issue.message).join("\n"));
  }
  const next = createTemplateFieldFamilySessionV2(sessionOptions.family);
  try {
    next.load(family, snapshot && "family" in snapshot ? {
      contentState: snapshot.contentState ?? undefined,
      selectedVariantId: snapshot.selectedVariantId ?? undefined,
      sessionAssets: snapshot.sessionAssets,
    } : undefined);
    if (next.getSnapshot().status !== "ready") throw new Error(next.getSnapshot().error?.message ?? "Family could not be loaded.");
    return next;
  } catch (cause) { next.dispose(); throw cause; }
}

/** Source/configuration authoring only. Never reads working nodes back as content. */
export function baselineCreateTemplateFieldFamilyFromSourcesV2(sources: readonly TemplatePackageV2[], title: string): TemplateFieldFamilyV2 {
  if (!sources.length) throw new Error("Choose at least one source package.");
  sources = structuredClone(sources);
  const fields = new Map<string, TemplateFieldConfigurationV2>();
  for (const source of sources) for (const id of source.editableFieldOrder) {
    const field = source.editableFields.find((entry) => entry.id === id)!;
    const previous = fields.get(id);
    if (previous && previous.type !== field.type) throw new Error(`Field ${id} has different types across variants.`);
    if (!previous) fields.set(id, { id, type: field.type, label: field.label, controlRole: field.controlRole, configuration: field.configuration } as TemplateFieldConfigurationV2);
  }
  const family: TemplateFieldFamilyV2 = {
    schemaVersion: "template-field-family-v2", id: `family-${crypto.randomUUID()}`, title,
    fields: [...fields.values()], editableFieldOrder: [...fields.keys()], variantGroups: [],
    variants: sources.map((packageValue, index) => ({
      id: `variant-${index + 1}`, label: packageValue.name, packageValue,
      // Source-specific rule differences are explicit atomic property overrides.
      fieldOverrides: Object.fromEntries(packageValue.editableFields.flatMap((field) => {
        const common = fields.get(field.id)!;
        const keys = new Set([...Object.keys(common.configuration), ...Object.keys(field.configuration)]);
        const configuration = Object.fromEntries([...keys].filter((key) => JSON.stringify((common.configuration as Record<string, unknown>)[key]) !== JSON.stringify((field.configuration as Record<string, unknown>)[key])).map((key) => [key, (field.configuration as Record<string, unknown>)[key] ?? null]));
        return Object.keys(configuration).length ? [[field.id, { type: field.type, configuration }]] : [];
      })) as Record<string, TemplateFieldFamilyVariantFieldOverrideV2>, groupAssignments: {},
    })),
  };
  family.editorControlOrder = getTemplateFieldFamilyEditorControlOrderV2(family);
  for (const variant of family.variants) {
    const result = resolveTemplateFieldFamilyVariantV2(family, variant.id);
    if (!result.valid) throw new Error(result.issues.map((issue) => issue.message).join("\n"));
  }
  return family;
}

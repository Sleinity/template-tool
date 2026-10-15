import { parseTemplatePackageV2, type TemplateFieldContentEntryV1, type TemplatePackageV1, type TemplatePackageV2 } from "@sleinity/template-core";
import { resolveTemplateFieldFamilyVariantV2, type TemplateFieldFamilyV2 } from "@sleinity/template-core/family";
import { createTemplateSessionV2, type TemplateSessionV2, type TemplateSessionV2Options } from "../session/templateSessionV2";
import { createTemplateFieldFamilySessionV2, type TemplateFieldFamilySessionV2, type TemplateFieldFamilySessionV2Options } from "../session/templateFieldFamilySessionV2";
import type { TemplateReimportRemovedFieldDispositionV2 } from "./templateReimportV2";
import { prepareInitialFamilyV2, prepareAppendedFamilyV2 } from "./familySourcePreparationV2";

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
export function appendTemplateSourcesV2(
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
    family = snapshot.family;
  } else if (snapshot && "basePackage" in snapshot && snapshot.basePackage) {
    if (snapshot.contentState && Object.keys(snapshot.contentState.values).length) throw new Error("Promote source configuration before editing output content.");
    if (!previousSources[0]) throw new Error("The accepted source identity is required for promotion.");
    family = createTemplateFieldFamilyFromSourcesV2([snapshot.basePackage], title);
    family.variants = [{ ...family.variants[0], id: previousSources[0].id }];
  } else {
    family = { schemaVersion: "template-field-family-v2", id: `family-${crypto.randomUUID()}`, title,
      fields: [], editableFieldOrder: [], variants: [], variantGroups: [], editorControlOrder: [] };
  }
  family = prepareAppendedFamilyV2(family, packages.map((packageValue, index) => ({ id: additions[index].id, packageValue })), selectionAssignments);
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

/**
 * Applies an accepted Family edit to an isolated session. The accepted session is
 * never mutated; callers swap it in only after every surviving variant resolves.
 */
export function mutateTemplateFamilyV2(
  accepted: TemplateAuthoringSessionV2,
  previousSources: readonly TemplateImportSourceV2[],
  mutation: TemplateFamilyMutationV2,
  options: { removedFieldDisposition?: TemplateReimportRemovedFieldDispositionV2; session?: TemplateFieldFamilySessionV2Options } = {},
): { session: TemplateAuthoringSessionV2; sources: TemplateImportSourceV2[]; archivedContent: Readonly<Record<string, TemplateFieldContentEntryV1>> } {
  const snapshot = accepted.getSnapshot();
  if (!("family" in snapshot) || !snapshot.family || !("selectedVariantId" in snapshot)) {
    throw new Error("Family controls become available after a second design is accepted.");
  }
  let variants = [...structuredClone(snapshot.family.variants)];
  let family: TemplateFieldFamilyV2 = { ...structuredClone(snapshot.family), variants };
  let sources = [...previousSources];
  let selectedVariantId = snapshot.selectedVariantId ?? family.variants[0]?.id;
  const index = mutation.type === "selection-metadata"
    ? -1
    : variants.findIndex((variant) => variant.id === mutation.variantId);
  if (mutation.type !== "selection-metadata" && index < 0) throw new Error("That Family design is no longer available.");

  if (mutation.type === "selection-metadata") {
    if (mutation.family.id !== family.id) throw new Error("Family selection metadata targets a different Family.");
    family = {
      ...family,
      variantGroups: structuredClone(mutation.family.variantGroups ?? []),
      editorControlOrder: structuredClone(mutation.family.editorControlOrder ?? []),
      variants: variants.map((variant) => ({
        ...variant,
        groupAssignments: structuredClone(mutation.family.variants.find((candidate) => candidate.id === variant.id)?.groupAssignments ?? {}),
      })),
    };
    variants = [...family.variants];
  } else if (mutation.type === "rename") {
    const label = mutation.label.trim();
    if (!label) throw new Error("A design name is required.");
    variants[index] = { ...variants[index], label };
  } else if (mutation.type === "move") {
    const target = Math.max(0, Math.min(variants.length - 1, mutation.targetIndex));
    const [variant] = variants.splice(index, 1);
    variants.splice(target, 0, variant);
    const sourceIndex = sources.findIndex((source) => source.id === mutation.variantId);
    if (sourceIndex >= 0) {
      const [source] = sources.splice(sourceIndex, 1);
      sources.splice(target, 0, source);
    }
  } else if (mutation.type === "remove") {
    if (variants.length === 1) throw new Error("A Family must retain at least one design.");
    variants.splice(index, 1);
    sources = sources.filter((source) => source.id !== mutation.variantId);
    if (selectedVariantId === mutation.variantId) selectedVariantId = variants[Math.min(index, variants.length - 1)].id;
  }
  family = { ...family, variants };

  for (const variant of family.variants) {
    const result = resolveTemplateFieldFamilyVariantV2(family, variant.id);
    if (!result.valid) throw new Error(result.issues.map((issue) => issue.message).join("\n"));
  }

  let archivedContent: Readonly<Record<string, TemplateFieldContentEntryV1>> = {};
  let contentState = structuredClone(snapshot.contentState);
  if (mutation.type === "remove" && contentState && "variantImagePlacements" in contentState) contentState = {
    ...contentState,
    variantImagePlacements: Object.fromEntries(Object.entries(contentState.variantImagePlacements).filter(([variantId]) => variantId !== mutation.variantId)),
  };
  const next = createTemplateFieldFamilySessionV2(options.session);
  try {
    next.load(family, {
      contentState: contentState ?? undefined,
      selectedVariantId: mutation.type === "replace" ? mutation.variantId : selectedVariantId,
      sessionAssets: snapshot.sessionAssets,
    });
    if (mutation.type === "replace") {
      const packageValue = validatedSource(mutation.source);
      const plan = next.planVariantReimport(packageValue);
      if (!plan.canApply) throw new Error(plan.diagnostics.map((issue) => issue.message).join("\n") || "Replacement cannot be applied.");
      archivedContent = next.applyVariantReimport(plan, options).archivedContent;
      sources = sources.map((source) => source.id === mutation.variantId ? { ...mutation.source, id: mutation.variantId } : source);
    }
    const ready = next.getSnapshot();
    if (ready.status !== "ready") throw new Error(ready.error?.message ?? "Family change could not be loaded.");
    const acceptedFamily = "family" in ready ? ready.family : null;
    if (!acceptedFamily) throw new Error("Family change did not produce a Family.");
    for (const variant of acceptedFamily.variants) {
      const result = resolveTemplateFieldFamilyVariantV2(acceptedFamily, variant.id);
      if (!result.valid) throw new Error(result.issues.map((issue) => issue.message).join("\n"));
    }
    return { session: next, sources, archivedContent };
  } catch (cause) {
    next.dispose();
    throw cause;
  }
}

/** Source/configuration authoring only. Never reads working nodes back as content. */
export function createTemplateFieldFamilyFromSourcesV2(sources: readonly TemplatePackageV2[], title: string): TemplateFieldFamilyV2 {
  if (!sources.length) throw new Error("Choose at least one source package.");
  return prepareInitialFamilyV2(sources, title, `family-${crypto.randomUUID()}`, sources.map((_, index) => `variant-${index + 1}`));
}

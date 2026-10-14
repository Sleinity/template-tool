import {
  getEffectiveEditableFields,
  type EditableFieldBinding,
  type TemplatePackageV1,
} from "@sleinity/template-core";
import {
  bindTemplateFamilyFieldTarget,
  createTemplateFamilyFieldForTarget,
  removeTemplateFamilyField,
  planTemplateFamilyFieldMatches,
  validateTemplateFamily,
  type TemplateFamilyContentStateV1,
  type TemplateFamilyFieldTargetV1,
  type TemplateFamilyV1,
  type TemplateFamilyVariantFieldBindingV1,
  type TemplateFamilyVariantSourceV1,
} from "@sleinity/template-core/family";

export const TEMPLATE_FAMILY_REIMPORT_PLAN_SCHEMA_VERSION =
  "template-family-reimport-plan-v1" as const;

export interface TemplateFamilyReimportFieldChangeV1 {
  familyFieldId: string;
  status: "retained" | "remapped" | "unresolved";
  previousTargets: TemplateFamilyFieldTargetV1[];
  proposedTargets: TemplateFamilyFieldTargetV1[];
  suggestedTargets: TemplateFamilyFieldTargetV1[];
  message: string;
}

export interface TemplateFamilyReimportPlanV1 {
  schemaVersion: typeof TEMPLATE_FAMILY_REIMPORT_PLAN_SCHEMA_VERSION;
  familyId: string;
  expectedFamilyRevision: number;
  variantId: string;
  previousPackageId: string;
  nextPackage: TemplatePackageV1;
  nextSource: Partial<TemplateFamilyVariantSourceV1>;
  proposedBindings: TemplateFamilyVariantFieldBindingV1[];
  fieldChanges: TemplateFamilyReimportFieldChangeV1[];
  unmatchedTargets: TemplateFamilyFieldTargetV1[];
  addedTargets: TemplateFamilyFieldTargetV1[];
  removedTargets: TemplateFamilyFieldTargetV1[];
  incompatibleTargets: TemplateFamilyFieldTargetV1[];
  unresolvedFamilyFieldIds: string[];
  canApply: boolean;
}

export type TemplateFamilyReimportAddedTargetResolutionV1 =
  | {
      target: TemplateFamilyFieldTargetV1;
      action: "bind-existing";
      familyFieldId: string;
    }
  | {
      target: TemplateFamilyFieldTargetV1;
      action: "create-variant-specific";
      fieldId: string;
      key?: string;
      title?: string;
    };

export interface TemplateFamilyReimportStateOptionsV1 {
  resolvedBindings?: readonly TemplateFamilyVariantFieldBindingV1[];
  addedTargetResolutions?: readonly TemplateFamilyReimportAddedTargetResolutionV1[];
  removeOrphanFamilyFieldIds?: readonly string[];
}

export interface TemplateFamilyReimportStateResultV1 {
  family: TemplateFamilyV1;
  content: TemplateFamilyContentStateV1;
}

function target(field: EditableFieldBinding): TemplateFamilyFieldTargetV1 {
  return { fieldId: field.id, nodeId: field.nodeId, property: field.property };
}

function targetKey(value: TemplateFamilyFieldTargetV1): string {
  return `${value.fieldId}:${value.nodeId}:${value.property}`;
}

function compatible(
  fieldType: string,
  value: EditableFieldBinding,
): boolean {
  return value.type === fieldType &&
    (fieldType === "image"
      ? value.property === "image.assetId"
      : value.property !== "image.assetId");
}

export function planTemplateFamilyVariantReimport(
  family: TemplateFamilyV1,
  variantId: string,
  nextPackage: TemplatePackageV1,
  expectedFamilyRevision = 0,
  nextSource: Partial<TemplateFamilyVariantSourceV1> = {},
): TemplateFamilyReimportPlanV1 {
  const variant = family.variants.find((item) => item.id === variantId);
  if (!variant) throw new Error(`Template family variant "${variantId}" was not found.`);
  const nextFields = getEffectiveEditableFields(nextPackage);
  const nextByTarget = new Map(nextFields.map((field) => [targetKey(target(field)), field]));
  const genericMatches = planTemplateFamilyFieldMatches(family.fields, nextPackage);
  const fieldChanges: TemplateFamilyReimportFieldChangeV1[] = [];
  const proposedBindings: TemplateFamilyVariantFieldBindingV1[] = [];
  const usedTargets = new Set<string>();
  const removedTargets: TemplateFamilyFieldTargetV1[] = [];
  const incompatibleTargets: TemplateFamilyFieldTargetV1[] = [];

  for (const familyField of family.fields) {
    const previous = variant.bindings.find(
      (binding) => binding.familyFieldId === familyField.id,
    )?.targets ?? [];
    if (previous.length === 0) continue;
    const retained = previous.filter((previousTarget) => {
      const next = nextByTarget.get(targetKey(previousTarget));
      return next ? compatible(familyField.type, next) : false;
    });
    for (const previousTarget of previous) {
      const next = nextByTarget.get(targetKey(previousTarget));
      if (!next) removedTargets.push(structuredClone(previousTarget));
      else if (!compatible(familyField.type, next)) {
        incompatibleTargets.push(structuredClone(previousTarget));
      }
    }
    if (retained.length === previous.length && retained.length > 0) {
      retained.forEach((item) => usedTargets.add(targetKey(item)));
      proposedBindings.push({ familyFieldId: familyField.id, targets: retained });
      fieldChanges.push({
        familyFieldId: familyField.id,
        status: "retained",
        previousTargets: structuredClone(previous),
        proposedTargets: structuredClone(retained),
        suggestedTargets: [],
        message: "The previous package targets still exist and remain compatible.",
      });
      continue;
    }
    const exact = nextFields.filter((next) =>
      next.id === familyField.key && compatible(familyField.type, next) &&
      !usedTargets.has(targetKey(target(next)))
    );
    if (exact.length === 1) {
      const nextTarget = target(exact[0]);
      usedTargets.add(targetKey(nextTarget));
      proposedBindings.push({ familyFieldId: familyField.id, targets: [nextTarget] });
      fieldChanges.push({
        familyFieldId: familyField.id,
        status: "remapped",
        previousTargets: structuredClone(previous),
        proposedTargets: [nextTarget],
        suggestedTargets: [],
        message: "The prior target changed, but an exact compatible field ID was found.",
      });
      continue;
    }
    const suggestedTargets = genericMatches.candidates
      .filter((candidate) =>
        candidate.familyFieldId === familyField.id &&
        candidate.confidence === "suggested" &&
        !usedTargets.has(targetKey(candidate.target))
      )
      .map((candidate) => candidate.target);
    const remainsAvailableElsewhere = family.variants.some(
      (candidate) =>
        candidate.id !== variantId &&
        candidate.bindings.some(
          (binding) =>
            binding.familyFieldId === familyField.id &&
            binding.targets.length > 0,
        ),
    );
    if (suggestedTargets.length === 0 && remainsAvailableElsewhere) {
      fieldChanges.push({
        familyFieldId: familyField.id,
        status: "retained",
        previousTargets: structuredClone(previous),
        proposedTargets: [],
        suggestedTargets: [],
        message: "The field no longer appears in this variant and remains available in other variants.",
      });
      continue;
    }
    proposedBindings.push({ familyFieldId: familyField.id, targets: [] });
    fieldChanges.push({
      familyFieldId: familyField.id,
      status: "unresolved",
      previousTargets: structuredClone(previous),
      proposedTargets: [],
      suggestedTargets,
      message: suggestedTargets.length
        ? "Review the suggested targets before applying this reimport."
        : "The previous target was removed or became incompatible.",
    });
  }
  const unmatchedTargets = nextFields
    .map(target)
    .filter((item) => !usedTargets.has(targetKey(item)));
  return {
    schemaVersion: TEMPLATE_FAMILY_REIMPORT_PLAN_SCHEMA_VERSION,
    familyId: family.id,
    expectedFamilyRevision,
    variantId,
    previousPackageId: variant.packageValue.packageId,
    nextPackage: structuredClone(nextPackage),
    nextSource: structuredClone(nextSource),
    proposedBindings,
    fieldChanges,
    unmatchedTargets,
    addedTargets: structuredClone(unmatchedTargets),
    removedTargets,
    incompatibleTargets,
    unresolvedFamilyFieldIds: fieldChanges
      .filter((change) => change.status === "unresolved")
      .map((change) => change.familyFieldId),
    canApply:
      fieldChanges.every((change) => change.status !== "unresolved") &&
      unmatchedTargets.length === 0,
  };
}

export function applyTemplateFamilyVariantReimport(
  family: TemplateFamilyV1,
  plan: TemplateFamilyReimportPlanV1,
  currentFamilyRevision: number,
  resolvedBindings: readonly TemplateFamilyVariantFieldBindingV1[] =
    plan.proposedBindings,
): TemplateFamilyV1 {
  if (family.id !== plan.familyId) {
    throw new Error("The reimport plan belongs to a different family.");
  }
  if (currentFamilyRevision !== plan.expectedFamilyRevision) {
    throw new Error("The family changed after the reimport plan was created.");
  }
  const next = structuredClone(family);
  const variant = next.variants.find((item) => item.id === plan.variantId);
  if (!variant) throw new Error("The reimported variant no longer exists.");
  if (variant.packageValue.packageId !== plan.previousPackageId) {
    throw new Error("The variant package changed after the reimport plan was created.");
  }
  variant.packageValue = structuredClone(plan.nextPackage);
  variant.source = {
    ...variant.source,
    ...structuredClone(plan.nextSource),
    packageDigest: plan.nextSource.packageDigest,
  };
  variant.bindings = structuredClone([...resolvedBindings]);
  for (const familyFieldId of Object.keys(variant.ruleOverrides)) {
    if (!variant.bindings.some(
      (binding) =>
        binding.familyFieldId === familyFieldId && binding.targets.length > 0,
    )) {
      delete variant.ruleOverrides[familyFieldId];
    }
  }
  const report = validateTemplateFamily(next);
  const bindingErrors = report.issues.filter((item) =>
    item.variantId === plan.variantId &&
    (item.code.startsWith("family.binding") || item.code === "family.variant-field-unbound") &&
    item.severity === "error"
  );
  if (bindingErrors.length > 0) {
    throw new Error(
      `Resolve every reimported field before applying the variant (${bindingErrors[0].message})`,
    );
  }
  return next;
}

/**
 * Applies a reviewed variant reimport and its content-shape changes as one pure
 * state transition. New package targets must be linked or explicitly accepted
 * as variant-specific fields. A removed field may be deleted only when it
 * would otherwise be orphaned.
 */
export function applyTemplateFamilyVariantReimportState(
  familyInput: TemplateFamilyV1,
  contentInput: TemplateFamilyContentStateV1,
  plan: TemplateFamilyReimportPlanV1,
  currentFamilyRevision: number,
  options: TemplateFamilyReimportStateOptionsV1 = {},
): TemplateFamilyReimportStateResultV1 {
  if (familyInput.id !== plan.familyId || contentInput.familyId !== plan.familyId) {
    throw new Error("The reimport plan and content must belong to the current family.");
  }
  if (currentFamilyRevision !== plan.expectedFamilyRevision) {
    throw new Error("The family changed after the reimport plan was created.");
  }
  const originalVariant = familyInput.variants.find((item) => item.id === plan.variantId);
  if (!originalVariant || originalVariant.packageValue.packageId !== plan.previousPackageId) {
    throw new Error("The reimported variant changed after the plan was created.");
  }

  let family = structuredClone(familyInput);
  let content = structuredClone(contentInput);
  const removeIds = new Set(options.removeOrphanFamilyFieldIds ?? []);
  const removableIds = new Set(plan.unresolvedFamilyFieldIds);
  for (const fieldId of removeIds) {
    if (!removableIds.has(fieldId)) {
      throw new Error(
        `Field "${fieldId}" was not identified as an orphan by the reviewed reimport plan.`,
      );
    }
    const scopeOutsideVariant = family.variants.some((variant) =>
      variant.id !== plan.variantId && variant.bindings.some(
        (binding) => binding.familyFieldId === fieldId && binding.targets.length > 0,
      ),
    );
    if (scopeOutsideVariant) {
      throw new Error(`Field "${fieldId}" is still used by another variant and cannot be removed.`);
    }
    const removed = removeTemplateFamilyField(family, content, fieldId);
    family = removed.family;
    content = removed.content;
  }

  const reviewedBindings = options.resolvedBindings ?? plan.proposedBindings;
  const resolvedFamilyFieldIds = new Set(
    reviewedBindings
      .filter((binding) => binding.targets.length > 0)
      .map((binding) => binding.familyFieldId),
  );
  const unresolved = plan.unresolvedFamilyFieldIds.filter(
    (fieldId) => !removeIds.has(fieldId) && !resolvedFamilyFieldIds.has(fieldId),
  );
  if (unresolved.length > 0) {
    throw new Error("Resolve or explicitly remove every orphaned field before applying the reimport.");
  }

  const variant = family.variants.find((item) => item.id === plan.variantId)!;
  variant.packageValue = structuredClone(plan.nextPackage);
  variant.source = {
    ...variant.source,
    ...structuredClone(plan.nextSource),
    packageDigest: plan.nextSource.packageDigest,
  };
  variant.bindings = structuredClone(
    [...reviewedBindings]
      .filter((binding) => !removeIds.has(binding.familyFieldId) && binding.targets.length > 0),
  );
  for (const fieldId of Object.keys(variant.ruleOverrides)) {
    if (!variant.bindings.some((binding) => binding.familyFieldId === fieldId)) {
      delete variant.ruleOverrides[fieldId];
    }
  }

  const resolutions = options.addedTargetResolutions ?? [];
  const resolutionByTarget = new Map(
    resolutions.map((resolution) => [targetKey(resolution.target), resolution]),
  );
  if (resolutionByTarget.size !== resolutions.length) {
    throw new Error("Each added package target may have only one reviewed resolution.");
  }
  const targetsAlreadyBound = new Set(
    variant.bindings.flatMap((binding) => binding.targets.map(targetKey)),
  );
  const missingAdded = plan.addedTargets.filter(
    (addedTarget) =>
      !targetsAlreadyBound.has(targetKey(addedTarget)) &&
      !resolutionByTarget.has(targetKey(addedTarget)),
  );
  if (missingAdded.length > 0) {
    throw new Error("Every added package field must be linked or kept as a new variant-specific field.");
  }
  for (const resolution of resolutions) {
    if (!plan.addedTargets.some((candidate) => targetKey(candidate) === targetKey(resolution.target))) {
      throw new Error("The reimport resolution contains a target that was not part of the reviewed plan.");
    }
    if (resolution.action === "bind-existing") {
      const existing = family.fields.find((field) => field.id === resolution.familyFieldId);
      const packageField = getEffectiveEditableFields(plan.nextPackage).find(
        (field) => targetKey(target(field)) === targetKey(resolution.target),
      );
      if (!existing || !packageField || !compatible(existing.type, packageField)) {
        throw new Error("The selected family field is not compatible with the added package target.");
      }
      family = bindTemplateFamilyFieldTarget(
        family,
        plan.variantId,
        resolution.familyFieldId,
        resolution.target,
      );
    } else {
      const created = createTemplateFamilyFieldForTarget({
        family,
        content,
        variantId: plan.variantId,
        target: resolution.target,
        fieldId: resolution.fieldId,
        key: resolution.key,
        title: resolution.title,
      });
      family = created.family;
      content = created.content;
    }
  }

  const report = validateTemplateFamily(family, content);
  if (!report.definitionValid) {
    const first = report.issues.find((issue) => issue.severity === "error");
    throw new Error(first?.message ?? "The reimported family is invalid.");
  }
  return { family, content };
}

import {
  getEffectiveEditableFields,
  updateTemplatePackageField,
} from "../editor/packageFieldBindings";
import type { EditableFieldBinding, PackageImageAsset } from "../types";
import { resolveTemplateFamilyFieldRule } from "./rules";
import type {
  TemplateFamilyContentStateV1,
  TemplateFamilyFieldTargetV1,
  TemplateFamilyImageValueV1,
  TemplateFamilyMaterializationV1,
  TemplateFamilyMaterializeOptionsV1,
  TemplateFamilyV1,
} from "./types";

function targetKey(target: TemplateFamilyFieldTargetV1): string {
  return `${target.fieldId}:${target.nodeId}:${target.property}`;
}

function isImageValue(value: unknown): value is TemplateFamilyImageValueV1 {
  return Boolean(value && typeof value === "object" &&
    (value as { kind?: unknown }).kind === "image");
}

export function materializeTemplateFamilyVariant(
  family: TemplateFamilyV1,
  variantId: string,
  content: TemplateFamilyContentStateV1,
  options: TemplateFamilyMaterializeOptionsV1 = {},
): TemplateFamilyMaterializationV1 {
  const variant = family.variants.find((item) => item.id === variantId);
  if (!variant) throw new Error(`Template family variant "${variantId}" was not found.`);
  if (content.familyId !== family.id) {
    throw new Error("Template family content belongs to a different family.");
  }
  let packageValue = structuredClone(variant.packageValue);
  const sourceFields = new Map(
    getEffectiveEditableFields(packageValue).map((field) => [
      targetKey({ fieldId: field.id, nodeId: field.nodeId, property: field.property }),
      field,
    ]),
  );
  const effectiveFields: EditableFieldBinding[] = [];
  const resolvedRules: TemplateFamilyMaterializationV1["resolvedRules"] = {};
  const issues: TemplateFamilyMaterializationV1["issues"] = [];

  for (const familyField of family.fields) {
    const binding = variant.bindings.find(
      (item) => item.familyFieldId === familyField.id,
    );
    if (!binding || binding.targets.length === 0) {
      continue;
    }
    const resolvedRule = resolveTemplateFamilyFieldRule(
      familyField.rule,
      variant.ruleOverrides[familyField.id],
    );
    resolvedRules[familyField.id] = resolvedRule;
    const value = Object.prototype.hasOwnProperty.call(content.values, familyField.id)
      ? content.values[familyField.id]
      : familyField.defaultValue;
    for (const target of binding.targets) {
      const sourceField = sourceFields.get(targetKey(target));
      if (!sourceField) {
        issues.push({
          code: "family.binding-target-missing",
          severity: "error",
          message: `The bound package target "${targetKey(target)}" is missing.`,
          fieldId: familyField.id,
          variantId,
          target,
        });
        continue;
      }
      const effectiveField: EditableFieldBinding = {
        ...structuredClone(sourceField),
        label: familyField.title,
        defaultValue: isImageValue(familyField.defaultValue)
          ? sourceField.defaultValue
          : familyField.defaultValue,
        constraints: structuredClone(resolvedRule.rule.constraints),
        behavior: structuredClone(resolvedRule.rule.behavior),
      };
      effectiveFields.push(effectiveField);
      if (isImageValue(value)) {
        let asset = packageValue.assets[value.assetRef] as PackageImageAsset | undefined;
        if (!asset) {
          asset = family.variants
            .map((candidate) => candidate.packageValue.assets[value.assetRef])
            .find((candidate): candidate is PackageImageAsset => candidate?.type === "image");
        }
        if (!asset && options.resolveImageAsset) {
          asset = options.resolveImageAsset(value, target, packageValue) ?? undefined;
        }
        if (!asset) {
          issues.push({
            code: "family.image-asset-missing",
            severity: "error",
            message: `Shared image asset "${value.assetRef}" could not be resolved.`,
            fieldId: familyField.id,
            variantId,
            target,
          });
          continue;
        }
        asset = { ...structuredClone(asset), nodeId: target.nodeId };
        packageValue.assets[asset.id] = asset;
        const update = updateTemplatePackageField(
          packageValue,
          { ...effectiveField, constraints: undefined, behavior: { onOverflow: "allow" } },
          asset.id,
        );
        packageValue = update.packageValue;
        if (value.placementState && update.applied !== false) {
          const image = packageValue.nodes[target.nodeId]?.image;
          if (image?.activePlacement) {
            image.activePlacement.state = value.placementState;
          }
        }
        if (update.warning) {
          issues.push({
            code: update.warning.code,
            severity: "warning",
            message: update.warning.message,
            fieldId: familyField.id,
            variantId,
            target,
          });
        }
        continue;
      }
      const update = updateTemplatePackageField(
        packageValue,
        { ...effectiveField, constraints: undefined, behavior: { onOverflow: "allow" } },
        value,
      );
      packageValue = update.packageValue;
      if (update.warning) {
        issues.push({
          code: update.warning.code,
          severity: "warning",
          message: update.warning.message,
          fieldId: familyField.id,
          variantId,
          target,
        });
      }
    }
  }
  packageValue.editableFields = structuredClone(effectiveFields);
  return {
    familyId: family.id,
    variantId,
    contentRevision: content.revision,
    packageValue,
    effectiveFields,
    resolvedRules,
    issues,
  };
}

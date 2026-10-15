import {
  resolveTemplateFieldContentV2,
  type TemplateFieldContentStateV1,
  type TemplatePackageV2,
} from "@sleinity/template-core";

/** Browser host projection only; canonical fields and editor order stay complete. */
export function activeTemplateFieldIdsV2(
  packageValue: TemplatePackageV2,
  state: TemplateFieldContentStateV1,
): Set<string> {
  const hiddenRoots = packageValue.editableFields.flatMap((field) =>
      field.type === "boolean" && resolveTemplateFieldContentV2(field, state).value === false
        ? [field.binding.nodeId, ...(field.binding.additionalNodeIds ?? [])]
            .map((nodeId) => ({ fieldId: field.id, nodeId }))
        : []
    );
  const isInsideHiddenRoot = (nodeId: string, ownFieldId?: string): boolean => {
    const visited = new Set<string>();
    let parentId = packageValue.nodes[nodeId]?.parentId;
    while (parentId && !visited.has(parentId)) {
      if (hiddenRoots.some((root) => root.nodeId === parentId && root.fieldId !== ownFieldId)) return true;
      visited.add(parentId);
      parentId = packageValue.nodes[parentId]?.parentId;
    }
    return false;
  };
  return new Set(packageValue.editableFields.flatMap((field) =>
    isInsideHiddenRoot(field.binding.nodeId, field.type === "boolean" ? field.id : undefined) ? [] : [field.id]
  ));
}

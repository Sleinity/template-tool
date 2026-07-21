import type {
  EditableFieldBinding,
  PackageColor,
  PackageImageFieldConstraints,
  PackageImageAsset,
  PackageImagePayload,
  PackagePaint,
  TemplateNode,
  TemplatePackageV1,
} from "../types";
import {
  constrainTextInput,
  type TextInputConstraintOptions,
  validateImageReplacement,
} from "./fieldConstraints";
import { canonicalPackageAssetId } from "../assets/packageAssetResolution";

export interface PackageEditorFieldWarning {
  code: string;
  message: string;
  fieldId: string;
  nodeId?: string;
}

export interface PackageEditorFieldTargetStatus {
  field: EditableFieldBinding;
  source: "descriptor" | "field-marker";
  targetExists: boolean;
  targetNodeType?: TemplateNode["type"];
  propertySupported: boolean;
  assetId?: string | null;
  assetExists?: boolean;
  constraints: {
    aspectRatio?: PackageImageFieldConstraints["aspectRatio"];
    replacementMode?: PackageImageFieldConstraints["replacementMode"];
    scaleMode?: string;
    bounds?: { width: number; height: number };
  };
}

export interface PackageFieldUpdateResult {
  packageValue: TemplatePackageV1;
  warning?: PackageEditorFieldWarning;
  applied?: boolean;
}

export interface PackageFieldUpdateOptions extends TextInputConstraintOptions {}

interface ImageReplacementOptions {
  assetId?: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  placementState?: "replacement-fill" | "replacement-fit";
}

export type PackageImageActivePlacementState = NonNullable<
  PackageImagePayload["activePlacement"]
>["state"];

function nextImagePlacementRevision(image: PackageImagePayload | undefined): number {
  return (image?.activePlacement?.revision ?? 0) + 1;
}

function imagePlacementForAssetUpdate(
  packageValue: TemplatePackageV1,
  image: PackageImagePayload | undefined,
  field: EditableFieldBinding,
  assetId: string | null,
): NonNullable<PackageImagePayload["activePlacement"]> {
  const defaultAssetId = typeof field.defaultValue === "string"
    ? canonicalPackageAssetId(packageValue, field.defaultValue) ?? field.defaultValue
    : null;
  const isImportedAsset = assetId === defaultAssetId;
  const current = image?.activePlacement?.state;
  return {
    state: isImportedAsset
      ? "imported-source"
      : current === "replacement-fit"
        ? "replacement-fit"
        : "replacement-fill",
    revision: nextImagePlacementRevision(image),
  };
}

const supportedImageMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function warning(
  field: EditableFieldBinding,
  code: string,
  message: string,
): PackageEditorFieldWarning {
  return {
    code,
    message,
    fieldId: field.id,
    nodeId: field.nodeId,
  };
}

function clonePackage(packageValue: TemplatePackageV1): TemplatePackageV1 {
  return structuredClone(packageValue);
}

function parseHexColor(value: unknown): PackageColor | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16) / 255,
    g: Number.parseInt(normalized.slice(2, 4), 16) / 255,
    b: Number.parseInt(normalized.slice(4, 6), 16) / 255,
    a: 1,
  };
}

function colorToHex(color: PackageColor): string {
  const channel = (value: number) =>
    Math.round(Math.max(0, Math.min(1, value)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

function defaultTextValue(node: TemplateNode): string | null {
  if (node.type !== "TEXT") return null;
  return "characters" in node.text ? node.text.characters : node.text.content;
}

function firstSolidPaint(node: TemplateNode): Extract<PackagePaint, { type: "SOLID" }> | undefined {
  return node.appearance.fills.find(
    (paint): paint is Extract<PackagePaint, { type: "SOLID" }> =>
      paint.type === "SOLID",
  );
}

function isColorProperty(property: string): boolean {
  return (
    property === "appearance.fills" ||
    /^appearance\.fills\.\d+\.color$/.test(property)
  );
}

function propertyForFieldType(fieldType: EditableFieldBinding["type"]): string {
  if (fieldType === "image") return "image.assetId";
  if (fieldType === "color") return "appearance.fills";
  if (fieldType === "boolean") return "visible";
  return "text.characters";
}

function defaultValueForField(
  node: TemplateNode,
  type: EditableFieldBinding["type"],
): EditableFieldBinding["defaultValue"] {
  if (type === "image") return node.image?.assetId ?? null;
  if (type === "color") {
    const paint = firstSolidPaint(node);
    return paint ? colorToHex(paint.color) : null;
  }
  if (type === "boolean") return node.appearance.visible ?? true;
  return defaultTextValue(node);
}

function parseFieldMarker(
  node: TemplateNode,
): EditableFieldBinding | null {
  const match = node.name.match(
    /^field:(text|textarea|image|color|number|date|boolean):([A-Za-z0-9_-]+)$/i,
  );
  if (!match) return null;
  const type = match[1].toLowerCase() as EditableFieldBinding["type"];
  const id = match[2];
  return {
    id,
    type,
    nodeId: node.id,
    property: propertyForFieldType(type),
    defaultValue: defaultValueForField(node, type),
    label: id
      .replace(/[-_]+/g, " ")
      .replace(/^\w/, (value) => value.toUpperCase()),
  };
}

export function getEffectiveEditableFields(
  packageValue: TemplatePackageV1,
): EditableFieldBinding[] {
  const fields = [...packageValue.editableFields];
  const seen = new Set(
    fields.map((field) => `${field.id}:${field.nodeId}`),
  );
  Object.values(packageValue.nodes).forEach((node) => {
    const field = parseFieldMarker(node);
    if (!field) return;
    const key = `${field.id}:${field.nodeId}`;
    if (seen.has(key)) return;
    seen.add(key);
    fields.push(field);
  });
  return fields;
}

export function packageWithEffectiveEditableFields(
  packageValue: TemplatePackageV1,
): TemplatePackageV1 {
  const fields = getEffectiveEditableFields(packageValue);
  if (
    fields.length === packageValue.editableFields.length &&
    fields.every(
      (field, index) =>
        field.id === packageValue.editableFields[index]?.id &&
        field.nodeId === packageValue.editableFields[index]?.nodeId,
    )
  ) return packageValue;
  return {
    ...packageValue,
    editableFields: fields,
  };
}

export function restoreImportedPackageForEditing(
  importedPackage: TemplatePackageV1,
  currentPackage: TemplatePackageV1,
): TemplatePackageV1 {
  const restored = structuredClone(importedPackage);
  Object.entries(currentPackage.assets).forEach(([assetId, asset]) => {
    if (assetId.startsWith("asset:image:user:")) return;
    restored.assets[assetId] = structuredClone(asset);
  });
  return packageWithEffectiveEditableFields(restored);
}

export function clearTemplatePackageImageOverride(
  packageValue: TemplatePackageV1,
  field: EditableFieldBinding,
): PackageFieldUpdateResult {
  if (field.property !== "image.assetId") {
    return {
      packageValue,
      applied: false,
      warning: warning(field, "invalid-image-field", "This field does not edit an image."),
    };
  }
  const defaultReference =
    typeof field.defaultValue === "string" ? field.defaultValue : null;
  if (!defaultReference) {
    return {
      packageValue,
      applied: false,
      warning: warning(field, "missing-default-image", "The imported image is unavailable."),
    };
  }
  const currentReference = packageValue.nodes[field.nodeId]?.image?.assetId;
  const update = updateTemplatePackageField(packageValue, field, defaultReference);
  if (
    update.applied === false ||
    !currentReference?.startsWith("asset:image:user:") ||
    Object.values(update.packageValue.nodes).some(
      (node) => node.image?.assetId === currentReference,
    )
  ) {
    return update;
  }
  const cleanedPackage = clonePackage(update.packageValue);
  delete cleanedPackage.assets[currentReference];
  return {
    ...update,
    packageValue: cleanedPackage,
  };
}

export function getPackageFieldValue(
  packageValue: TemplatePackageV1,
  field: EditableFieldBinding,
): string | number | boolean | null {
  const node = packageValue.nodes[field.nodeId];
  if (!node) return field.defaultValue;

  if (field.property === "text.characters" && node.type === "TEXT") {
    return "characters" in node.text
      ? node.text.characters
      : node.text.content;
  }
  if (field.property === "image.assetId") {
    const reference = node.image?.assetId ??
      (typeof field.defaultValue === "string" ? field.defaultValue : null);
    return canonicalPackageAssetId(packageValue, reference) ?? reference;
  }
  if (isColorProperty(field.property)) {
    const paint = firstSolidPaint(node);
    return paint ? colorToHex(paint.color) : field.defaultValue;
  }
  if (field.property === "visible") {
    return node.appearance.visible ?? true;
  }
  return field.defaultValue;
}

export function getPackageFieldOverrideValue(
  packageValue: TemplatePackageV1,
  field: EditableFieldBinding,
): string | number | boolean | null {
  const rendered = getPackageFieldValue(packageValue, field);
  if (field.property === "image.assetId") {
    const renderedId = typeof rendered === "string"
      ? canonicalPackageAssetId(packageValue, rendered) ?? rendered
      : rendered;
    const defaultId = typeof field.defaultValue === "string"
      ? canonicalPackageAssetId(packageValue, field.defaultValue) ?? field.defaultValue
      : field.defaultValue;
    return renderedId === defaultId ? null : renderedId;
  }
  return rendered === field.defaultValue ? "" : rendered;
}

export function getPackageEditorFieldWarnings(
  packageValue: TemplatePackageV1,
): PackageEditorFieldWarning[] {
  return getEffectiveEditableFields(packageValue).flatMap((field) => {
    const node = packageValue.nodes[field.nodeId];
    if (!node) {
      return [
        warning(field, "missing-target-node", `Target node "${field.nodeId}" does not exist.`),
      ];
    }
    if (
      ![
        "text.characters",
        "image.assetId",
        "visible",
      ].includes(field.property) &&
      !isColorProperty(field.property)
    ) {
      return [
        warning(
          field,
          "unsupported-property-path",
          `Property path "${field.property}" is not editable in this MVP.`,
        ),
      ];
    }
    if (field.property === "text.characters" && node.type !== "TEXT") {
      return [
        warning(field, "invalid-text-target", "text.characters requires a TEXT node."),
      ];
    }
    if (isColorProperty(field.property) && !firstSolidPaint(node)) {
      return [
        warning(
          field,
          "missing-solid-fill",
          "Color editing requires an existing SOLID fill.",
        ),
      ];
    }
    if (!["text", "textarea", "image", "color", "boolean"].includes(field.type)) {
      return [
        warning(
          field,
          "basic-field-fallback",
          `${field.type} fields use a basic text fallback in this MVP.`,
        ),
      ];
    }
    return [];
  });
}

function isSupportedEditableProperty(
  field: EditableFieldBinding,
  node: TemplateNode | undefined,
): boolean {
  if (!node) return false;
  if (field.property === "text.characters") return node.type === "TEXT";
  if (field.property === "image.assetId") return true;
  if (field.property === "visible") return true;
  if (isColorProperty(field.property)) return Boolean(firstSolidPaint(node));
  return false;
}

export function getPackageEditorFieldTargetStatuses(
  packageValue: TemplatePackageV1,
): PackageEditorFieldTargetStatus[] {
  const fields = getEffectiveEditableFields(packageValue);
  const usesExportedDescriptors = packageValue.editableFields.length > 0;
  return fields.map((field) => {
    const node = packageValue.nodes[field.nodeId];
    const imageReference =
      field.property === "image.assetId"
        ? node?.image?.assetId ??
          field.assetRef ??
          field.typedRef ??
          (typeof field.defaultValue === "string" ? field.defaultValue : null)
        : undefined;
    const imageAssetId =
      imageReference === undefined
        ? undefined
        : canonicalPackageAssetId(packageValue, imageReference);
    return {
      field,
      source: usesExportedDescriptors ? "descriptor" : "field-marker",
      targetExists: Boolean(node),
      targetNodeType: node?.type,
      propertySupported: isSupportedEditableProperty(field, node),
      assetId: imageAssetId,
      assetExists:
        imageAssetId === undefined
          ? undefined
          : imageAssetId === null
            ? false
            : Boolean(packageValue.assets[imageAssetId]),
      constraints: {
        aspectRatio:
          field.constraints && "aspectRatio" in field.constraints
            ? field.constraints.aspectRatio
            : undefined,
        replacementMode:
          field.constraints && "replacementMode" in field.constraints
            ? field.constraints.replacementMode
            : undefined,
        scaleMode: node?.image?.scaleMode,
        bounds: node
          ? {
              width: node.bounds.relative.width,
              height: node.bounds.relative.height,
            }
          : undefined,
      },
    };
  });
}

export function updateTemplatePackageField(
  packageValue: TemplatePackageV1,
  field: EditableFieldBinding,
  value: unknown,
  options: PackageFieldUpdateOptions = {},
): PackageFieldUpdateResult {
  const node = packageValue.nodes[field.nodeId];
  if (!node) {
    return {
      packageValue,
      warning: warning(
        field,
        "missing-target-node",
        `Target node "${field.nodeId}" does not exist.`,
      ),
    };
  }

  if (field.property === "text.characters") {
    if (node.type !== "TEXT" || !("characters" in node.text)) {
      return {
        packageValue,
        warning: warning(
          field,
          "invalid-text-target",
          "text.characters requires a current-format TEXT node.",
        ),
      };
    }
    if (typeof value !== "string") {
      return {
        packageValue,
        warning: warning(field, "invalid-text-value", "Text values must be strings."),
      };
    }
    const currentOverride = getPackageFieldOverrideValue(packageValue, field);
    const currentValue = typeof currentOverride === "string" ? currentOverride : "";
    const constrained = constrainTextInput(field, currentValue, value, options);
    if (constrained.prevented && constrained.value === currentValue) {
      const constraintIssue = constrained.issues[0];
      return {
        packageValue,
        applied: false,
        warning: constraintIssue
          ? warning(field, constraintIssue.code, constraintIssue.message)
          : warning(
              field,
              "field-input-prevented",
              "This value exceeds the field's editing boundary.",
            ),
      };
    }
    const nextPackage = clonePackage(packageValue);
    const nextNode = nextPackage.nodes[field.nodeId];
    if (nextNode.type === "TEXT" && "characters" in nextNode.text) {
      nextNode.text.characters = constrained.value === ""
        ? String(field.defaultValue ?? "")
        : constrained.value;
    }
    const constraintIssue = constrained.issues[0];
    const limits = field.constraints as { maxCharacters?: number; maxLines?: number } | undefined;
    const trimmedMessage = constrained.trimmed
      ? limits?.maxCharacters !== undefined
        ? `Maximum of ${limits.maxCharacters} characters reached.`
        : limits?.maxLines !== undefined
          ? `Maximum of ${limits.maxLines} ${limits.maxLines === 1 ? "line" : "lines"} reached.`
          : "The field limit was reached."
      : undefined;
    return {
      packageValue: nextPackage,
      applied: true,
      warning: trimmedMessage
        ? warning(field, "field-limit-reached", trimmedMessage)
        : constraintIssue
        ? warning(field, constraintIssue.code, constraintIssue.message)
        : undefined,
    };
  }

  if (field.property === "image.assetId") {
    if (value !== null && typeof value !== "string") {
      return {
        packageValue,
        warning: warning(
          field,
          "invalid-image-value",
          "Image asset IDs must be strings or null.",
        ),
      };
    }
    const resolvedAssetId =
      typeof value === "string"
        ? canonicalPackageAssetId(packageValue, value)
        : null;
    if (typeof value === "string" && !resolvedAssetId) {
      return {
        packageValue,
        warning: warning(
          field,
          "missing-image-asset",
          `Image asset "${value}" does not exist.`,
        ),
      };
    }
    const nextPackage = clonePackage(packageValue);
    const nextNode = nextPackage.nodes[field.nodeId];
    nextNode.image = {
      ...nextNode.image,
      assetId: resolvedAssetId,
      deferred: nextNode.image?.deferred ?? false,
      activePlacement: imagePlacementForAssetUpdate(
        packageValue,
        nextNode.image,
        field,
        resolvedAssetId,
      ),
    };
    return { packageValue: nextPackage };
  }

  if (isColorProperty(field.property)) {
    const color = parseHexColor(value);
    if (!color) {
      return {
        packageValue,
        warning: warning(
          field,
          "invalid-color-value",
          "Colors must use a six-digit hexadecimal value.",
        ),
      };
    }
    const solidIndex = node.appearance.fills.findIndex(
      (paint) => paint.type === "SOLID",
    );
    if (solidIndex < 0) {
      return {
        packageValue,
        warning: warning(
          field,
          "missing-solid-fill",
          "Color editing requires an existing SOLID fill.",
        ),
      };
    }
    const nextPackage = clonePackage(packageValue);
    const nextPaint = nextPackage.nodes[field.nodeId].appearance.fills[solidIndex];
    if (nextPaint.type === "SOLID") nextPaint.color = color;
    return { packageValue: nextPackage };
  }

  if (field.property === "visible") {
    if (typeof value !== "boolean") {
      return {
        packageValue,
        warning: warning(
          field,
          "invalid-boolean-value",
          "Visibility values must be booleans.",
        ),
      };
    }
    const nextPackage = clonePackage(packageValue);
    nextPackage.nodes[field.nodeId].appearance.visible = value;
    return { packageValue: nextPackage };
  }

  return {
    packageValue,
    warning: warning(
      field,
      "unsupported-property-path",
      `Property path "${field.property}" is not editable in this MVP.`,
    ),
  };
}

export function replaceTemplatePackageImage(
  packageValue: TemplatePackageV1,
  field: EditableFieldBinding,
  dataUrl: string,
  options: ImageReplacementOptions,
): PackageFieldUpdateResult {
  const constraintIssues = validateImageReplacement(field, {
    mimeType: options.mimeType,
    sizeBytes: options.sizeBytes ?? 0,
    width: options.width,
    height: options.height,
  });
  const blockingIssue = constraintIssues.find(
    (item) => item.severity === "error",
  );
  if (blockingIssue) {
    return {
      packageValue,
      applied: false,
      warning: warning(field, blockingIssue.code, blockingIssue.message),
    };
  }
  if (!supportedImageMimeTypes.has(options.mimeType)) {
    return {
      packageValue,
      warning: warning(
        field,
        "unsupported-image-type",
        `Image type "${options.mimeType || "unknown"}" is not supported.`,
      ),
    };
  }
  if (!dataUrl.startsWith(`data:${options.mimeType}`)) {
    return {
      packageValue,
      warning: warning(
        field,
        "invalid-image-data",
        "Uploaded image data does not match its MIME type.",
      ),
    };
  }

  const node = packageValue.nodes[field.nodeId];
  if (!node) {
    return {
      packageValue,
      warning: warning(
        field,
        "missing-target-node",
        `Target node "${field.nodeId}" does not exist.`,
      ),
    };
  }

  const assetId =
    options.assetId ??
    `asset:image:user:${Date.now().toString(36)}`;
  const asset: PackageImageAsset = {
    id: assetId,
    type: "image",
    source: "embedded",
    deferred: false,
    nodeId: field.nodeId,
    mimeType: options.mimeType,
    dataUrl,
    width: options.width ?? node.bounds.relative.width,
    height: options.height ?? node.bounds.relative.height,
  };
  const packageWithAsset = clonePackage(packageValue);
  packageWithAsset.assets[assetId] = asset;
  const updated = updateTemplatePackageField(
    packageWithAsset,
    field,
    assetId,
  );
  const updatedNode = updated.packageValue.nodes[field.nodeId];
  if (updatedNode?.image) {
    updatedNode.image.activePlacement = {
      state: options.placementState ?? "replacement-fill",
      revision: updatedNode.image.activePlacement?.revision ?? 1,
    };
  }
  const advisoryIssue = constraintIssues[0];
  return advisoryIssue && updated.packageValue !== packageValue
    ? {
        ...updated,
        applied: true,
        warning: warning(
          field,
          advisoryIssue.code,
          advisoryIssue.message,
        ),
      }
    : updated;
}

export function setTemplatePackageImageReplacementMode(
  packageValue: TemplatePackageV1,
  field: EditableFieldBinding,
  state: "replacement-fill" | "replacement-fit",
): PackageFieldUpdateResult {
  if (field.property !== "image.assetId") {
    return {
      packageValue,
      applied: false,
      warning: warning(field, "invalid-image-field", "This field does not edit an image."),
    };
  }
  const node = packageValue.nodes[field.nodeId];
  const defaultAssetId = typeof field.defaultValue === "string"
    ? canonicalPackageAssetId(packageValue, field.defaultValue) ?? field.defaultValue
    : null;
  const activeAssetId = canonicalPackageAssetId(packageValue, node?.image?.assetId) ?? node?.image?.assetId;
  if (!node?.image || !activeAssetId || activeAssetId === defaultAssetId) {
    return {
      packageValue,
      applied: false,
      warning: warning(
        field,
        "missing-image-replacement",
        "Choose a replacement image before changing its Fill or Fit placement.",
      ),
    };
  }
  if (node.image.activePlacement?.state === state) {
    return { packageValue, applied: false };
  }
  const nextPackage = clonePackage(packageValue);
  const nextImage = nextPackage.nodes[field.nodeId].image;
  if (!nextImage) return { packageValue, applied: false };
  nextImage.activePlacement = {
    state,
    revision: nextImagePlacementRevision(node.image),
  };
  return { packageValue: nextPackage, applied: true };
}

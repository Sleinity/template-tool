import { MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, MenuItem } from "../../ui";
import { resolvePackageAssetReference } from "@sleinity/template-browser/assets";
import { resolvePackageAssetSource } from "@sleinity/template-core/assets";
import type {
  EditableFieldBinding,
  PackageImageFieldConstraints,
  PackageTextFieldConstraints,
  TemplatePackageV1,
} from "@sleinity/template-core";
import { formatEditableFieldLabel } from "./fieldLabels";
import { withTextFieldConstraint } from "@sleinity/template-core/editor";
import {
  getEffectiveEditableFields,
  getPackageEditorFieldTargetStatuses,
  packageWithEffectiveEditableFields,
} from "@sleinity/template-core/editor";
import { FieldRuleCardShell } from "./FieldRuleCardShell";
import { FieldRuleConstraintControls } from "./FieldRuleConstraintControls";

interface TemplatePackageFieldRulesEditorProps {
  packageValue: TemplatePackageV1;
  onPackageChange: (packageValue: TemplatePackageV1) => void;
  selectedFieldKey?: string | null;
  onSelectField?: (field: EditableFieldBinding | null) => void;
}

const textFieldTypes = new Set(["text", "textarea"]);
const imageFormats = [
  { label: "JPEG", mimeType: "image/jpeg" },
  { label: "PNG", mimeType: "image/png" },
  { label: "WebP", mimeType: "image/webp" },
  { label: "SVG", mimeType: "image/svg+xml" },
] as const;

export function editableFieldSelectionKey(field: EditableFieldBinding): string {
  return `${field.id}:${field.nodeId}`;
}

export function editableFieldTypeLabel(type: EditableFieldBinding["type"]): string {
  const labels: Partial<Record<EditableFieldBinding["type"], string>> = {
    text: "Text",
    textarea: "Text area",
    image: "Image",
    number: "Number",
    date: "Date",
    boolean: "Option",
    color: "Color",
  };
  return labels[type] ?? "Unsupported field";
}

export function editableFieldGroup(field: EditableFieldBinding): "Text" | "Images" | "Colours" | "Visibility" | "Advanced" {
  if (textFieldTypes.has(field.type)) return "Text";
  if (field.type === "image") return "Images";
  if (field.type === "color") return "Colours";
  if (field.type === "boolean") return "Visibility";
  return "Advanced";
}

export function reorderEditableFields(
  fields: EditableFieldBinding[],
  fieldKey: string,
  nextIndex: number,
): EditableFieldBinding[] {
  const currentIndex = fields.findIndex(
    (field) => editableFieldSelectionKey(field) === fieldKey,
  );
  if (currentIndex < 0) return fields;
  const boundedIndex = Math.max(0, Math.min(fields.length - 1, nextIndex));
  if (boundedIndex === currentIndex) return fields;
  const reordered = [...fields];
  const [moved] = reordered.splice(currentIndex, 1);
  reordered.splice(boundedIndex, 0, moved);
  return reordered;
}

function replacementModeLabel(
  value: PackageImageFieldConstraints["replacementMode"],
): string {
  if (value === "cover") return "Fill frame";
  if (value === "contain") return "Fit inside frame";
  if (value === "user-crop") return "Host-provided crop";
  return "Fill frame";
}

function imageFormatLabel(mimeType: string): string {
  return imageFormats.find((format) => format.mimeType === mimeType)?.label ?? mimeType;
}

function fieldSummary(field: EditableFieldBinding): string {
  if (field.type === "image") {
    const constraints = (field.constraints ?? {}) as PackageImageFieldConstraints;
    const formats = constraints.allowedMimeTypes?.map(imageFormatLabel).join(", ");
    return `${replacementModeLabel(constraints.replacementMode)}${formats ? ` · ${formats}` : ""}`;
  }
  if (textFieldTypes.has(field.type)) {
    const constraints = (field.constraints ?? {}) as PackageTextFieldConstraints;
    const characters = constraints.maxCharacters
      ? `${constraints.maxCharacters} characters`
      : "No character limit";
    const lineLimit = field.type === "textarea" && constraints.maxLines
      ? constraints.maxLines === 1
        ? "1 line"
        : `${constraints.maxLines} lines`
      : null;
    return lineLimit ? `${characters} · ${lineLimit}` : characters;
  }
  return editableFieldTypeLabel(field.type);
}

function cleanLegacyConstraints(field: EditableFieldBinding): void {
  if (!field.constraints) return;
  const constraints = field.constraints as PackageTextFieldConstraints & PackageImageFieldConstraints;
  delete constraints.required;
  delete constraints.maxWords;
  delete constraints.minWords;
  if (field.behavior) {
    field.behavior.onOverflow = "prevent-input";
    field.behavior.counterType = "characters";
    field.behavior.showCounter = constraints.maxCharacters !== undefined;
  }
}

function DefaultValue({
  packageValue,
  field,
}: {
  packageValue: TemplatePackageV1;
  field: EditableFieldBinding;
}) {
  if (field.type === "image") {
    const reference = typeof field.defaultValue === "string" ? field.defaultValue : null;
    const asset = resolvePackageAssetReference(packageValue, reference)?.asset;
    const source = resolvePackageAssetSource(asset);
    return (
      <div className="field-default-image">
        <div className="field-default-image__preview">
          {source ? <img src={source} alt="" /> : <span>Preview unavailable</span>}
        </div>
        <div className="min-w-0">
          <p className="ui-field__label">Template default</p>
          <p className="mt-1 truncate text-sm text-content-secondary" title={asset?.id ?? reference ?? "Imported image"}>
            {asset?.id ?? reference ?? "Imported image"}
          </p>
          <p className="mt-1 text-xs text-content-muted">
            {asset?.width && asset?.height ? `${asset.width} × ${asset.height}px · ` : ""}
            {asset?.mimeType ? imageFormatLabel(asset.mimeType) : "Imported media"}
          </p>
        </div>
      </div>
    );
  }
  const value = field.defaultValue == null ? "" : String(field.defaultValue);
  return (
    <div className="field-template-default">
      <p className="ui-field__label">Template default</p>
      <p className="mt-1 line-clamp-2 text-sm text-content-secondary" title={value}>
        {value || "Empty"}
      </p>
    </div>
  );
}

export function TemplatePackageFieldRulesEditor({
  packageValue,
  onPackageChange,
  selectedFieldKey = null,
  onSelectField,
}: TemplatePackageFieldRulesEditorProps) {
  const fields = useMemo(
    () => getEffectiveEditableFields(packageValue),
    [packageValue],
  );
  const [expandedFieldKey, setExpandedFieldKey] = useState<string | null>(
    selectedFieldKey ?? (fields[0] ? editableFieldSelectionKey(fields[0]) : null),
  );
  const [draggedFieldKey, setDraggedFieldKey] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [reorderAnnouncement, setReorderAnnouncement] = useState("");
  const previousSelectedKeyRef = useRef(selectedFieldKey);
  const targets = useMemo(
    () => getPackageEditorFieldTargetStatuses(packageValue),
    [packageValue],
  );

  useEffect(() => {
    if (!selectedFieldKey && fields[0]) {
      onSelectField?.(fields[0]);
      setExpandedFieldKey(editableFieldSelectionKey(fields[0]));
    }
  }, [fields, onSelectField, selectedFieldKey]);

  useEffect(() => {
    if (
      selectedFieldKey !== previousSelectedKeyRef.current &&
      selectedFieldKey &&
      fields.some((field) => editableFieldSelectionKey(field) === selectedFieldKey)
    ) {
      setExpandedFieldKey(selectedFieldKey);
    }
    previousSelectedKeyRef.current = selectedFieldKey;
  }, [fields, selectedFieldKey]);

  const updateField = (
    field: EditableFieldBinding,
    update: (next: EditableFieldBinding) => void,
  ) => {
    const nextPackage = structuredClone(
      packageWithEffectiveEditableFields(packageValue),
    );
    const nextField = nextPackage.editableFields.find(
      (candidate) => editableFieldSelectionKey(candidate) === editableFieldSelectionKey(field),
    );
    if (!nextField) return;
    update(nextField);
    cleanLegacyConstraints(nextField);
    onPackageChange(nextPackage);
  };

  const moveField = (fieldKey: string, nextIndex: number) => {
    const currentIndex = fields.findIndex((field) => editableFieldSelectionKey(field) === fieldKey);
    if (currentIndex < 0) return;
    const boundedIndex = Math.max(0, Math.min(fields.length - 1, nextIndex));
    if (boundedIndex === currentIndex) return;
    const nextPackage = structuredClone(
      packageWithEffectiveEditableFields(packageValue),
    );
    nextPackage.editableFields = reorderEditableFields(
      nextPackage.editableFields,
      fieldKey,
      boundedIndex,
    );
    const moved = nextPackage.editableFields[boundedIndex];
    onPackageChange(nextPackage);
    const label = formatEditableFieldLabel(moved);
    setReorderAnnouncement(`${label} moved to position ${boundedIndex + 1} of ${fields.length}`);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-field-reorder-key="${CSS.escape(fieldKey)}"]`)?.focus();
    });
  };

  const finishDrag = () => {
    setDraggedFieldKey(null);
    setDropIndex(null);
  };

  if (fields.length === 0) {
    return (
      <div className="field-rules-empty">
        <p className="ui-subsection-title">No editable fields</p>
        <p className="mt-1 text-sm text-content-muted">
          This template does not expose any configurable fields.
        </p>
      </div>
    );
  }

  return (
    <div className="field-rules-workspace">
      <p className="ui-visually-hidden" aria-live="polite">{reorderAnnouncement}</p>
      <div className="field-rules-grid" role="list" aria-label="Editor field order">
        {fields.map((field, index) => {
          const fieldKey = editableFieldSelectionKey(field);
          const selected = selectedFieldKey === fieldKey;
          const expanded = expandedFieldKey === fieldKey;
          const target = targets.find((item) => editableFieldSelectionKey(item.field) === fieldKey);
          const targetLinked = Boolean(target?.targetExists && target.propertySupported);
          const configurable = field.type === "text" || field.type === "textarea" || field.type === "image";
          const textConstraints = (field.constraints ?? {}) as PackageTextFieldConstraints;
          const imageConstraints = (field.constraints ?? {}) as PackageImageFieldConstraints;
          const node = packageValue.nodes[field.nodeId];
          const slotWidth = Math.round(node?.bounds.relative.width ?? 0);
          const slotHeight = Math.round(node?.bounds.relative.height ?? 0);
          const aspect = slotWidth > 0 && slotHeight > 0
            ? `${slotWidth / Math.max(1, slotHeight) >= 1 ? (slotWidth / slotHeight).toFixed(2) : "1"}:${slotWidth / Math.max(1, slotHeight) >= 1 ? "1" : (slotHeight / slotWidth).toFixed(2)}`
            : null;

          const updateTextConstraint = (
            key: keyof PackageTextFieldConstraints,
            value: PackageTextFieldConstraints[keyof PackageTextFieldConstraints],
          ) => updateField(field, (next) => {
            const updated = withTextFieldConstraint(next, key, value);
            next.constraints = updated.constraints;
          });
          const updateImageConstraint = (
            key: keyof PackageImageFieldConstraints,
            value: PackageImageFieldConstraints[keyof PackageImageFieldConstraints],
          ) => updateField(field, (next) => {
            const constraints = { ...(next.constraints as PackageImageFieldConstraints | undefined) };
            if (value === undefined) delete constraints[key];
            else Object.assign(constraints, { [key]: value });
            next.constraints = constraints;
          });
          const selectAndToggle = () => {
            onSelectField?.(field);
            if (configurable) {
              setExpandedFieldKey((current) => current === fieldKey ? null : fieldKey);
            }
          };

          return (
            <FieldRuleCardShell
              key={fieldKey}
              fieldId={fieldKey}
              title={formatEditableFieldLabel(field)}
              summary={fieldSummary(field)}
              typeLabel={editableFieldTypeLabel(field.type)}
              selected={selected}
              expanded={expanded}
              configurable={configurable}
              statuses={!targetLinked ? [{ label: "Preview unavailable", tone: "attention" }] : []}
              onSelect={selectAndToggle}
              reorderLabel={`Drag ${formatEditableFieldLabel(field)} to reorder`}
              onDragStart={(event) => {
                setDraggedFieldKey(fieldKey);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", fieldKey);
                const row = event.currentTarget.closest<HTMLElement>(".field-rule-card");
                if (row) {
                  const ghost = row.cloneNode(true) as HTMLElement;
                  ghost.classList.add("field-rule-card--drag-ghost");
                  ghost.querySelector(".field-rule-card__content")?.remove();
                  ghost.style.width = `${row.getBoundingClientRect().width}px`;
                  document.body.appendChild(ghost);
                  event.dataTransfer.setDragImage(ghost, 28, 28);
                  window.setTimeout(() => ghost.remove(), 0);
                }
              }}
              onDragEnd={finishDrag}
              dropBefore={dropIndex === index}
              onDragOver={(event) => {
                if (!draggedFieldKey) return;
                event.preventDefault();
                setDropIndex(index);
                const scrollOwner = event.currentTarget.closest(".page-content");
                const rect = event.currentTarget.getBoundingClientRect();
                if (scrollOwner && rect.top < 160) scrollOwner.scrollBy({ top: -24 });
                if (scrollOwner && rect.bottom > window.innerHeight - 120) scrollOwner.scrollBy({ top: 24 });
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (draggedFieldKey) moveField(draggedFieldKey, index);
                finishDrag();
              }}
              reorderActions={(
                <div aria-label={`Reorder ${formatEditableFieldLabel(field)}`}>
                  <Menu label={<MoreHorizontal size={16} />} accessibleLabel={`More reorder actions for ${formatEditableFieldLabel(field)}`}>
                    {index > 0 ? <MenuItem onClick={() => moveField(fieldKey, index - 1)}>Move up</MenuItem> : null}
                    {index < fields.length - 1 ? <MenuItem onClick={() => moveField(fieldKey, index + 1)}>Move down</MenuItem> : null}
                    <MenuItem onClick={() => moveField(fieldKey, 0)}>Move to top</MenuItem>
                    <MenuItem onClick={() => moveField(fieldKey, fields.length - 1)}>Move to bottom</MenuItem>
                  </Menu>
                </div>
              )}
              content={(
                <>
                  <DefaultValue packageValue={packageValue} field={field} />
                  {field.type === "image" ? (
                    <>
                      {slotWidth > 0 && slotHeight > 0 ? (
                        <div className="field-slot-summary">
                          <p className="ui-field__label">Image slot</p>
                          <p className="mt-1 text-sm text-content-secondary">
                            {slotWidth} × {slotHeight}px{aspect ? ` · ${aspect} aspect ratio` : ""}
                          </p>
                          <p className="mt-1 text-xs text-content-muted">
                            Recommended upload: at least {slotWidth * 2} × {slotHeight * 2}px
                          </p>
                        </div>
                      ) : null}
                      <FieldRuleConstraintControls
                        fieldType={field.type}
                        constraints={imageConstraints}
                        onChange={(key, value) => updateImageConstraint(
                          key as keyof PackageImageFieldConstraints,
                          value as PackageImageFieldConstraints[keyof PackageImageFieldConstraints],
                        )}
                      />
                    </>
                  ) : field.type === "text" || field.type === "textarea" ? (
                    <FieldRuleConstraintControls
                      fieldType={field.type}
                      constraints={textConstraints}
                      onChange={(key, value) => updateTextConstraint(
                        key as keyof PackageTextFieldConstraints,
                        value as PackageTextFieldConstraints[keyof PackageTextFieldConstraints],
                      )}
                    />
                  ) : null}
                </>
              )}
            />
          );
        })}
        {draggedFieldKey && dropIndex === fields.length ? <div className="field-rule-drop-indicator" /> : null}
      </div>
    </div>
  );
}

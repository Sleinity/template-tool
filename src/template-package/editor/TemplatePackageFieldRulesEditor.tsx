import { ChevronDown, GripVertical, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckboxField,
  Input,
  Menu,
  MenuItem,
  Select,
  Status,
} from "../../components/ui";
import { resolvePackageAssetReference } from "../assets/packageAssetResolution";
import { resolvePackageAssetSource } from "../render";
import type {
  EditableFieldBinding,
  PackageImageFieldConstraints,
  PackageTextFieldConstraints,
  TemplatePackageV1,
} from "../types";
import { formatEditableFieldLabel } from "./fieldLabels";
import { withTextFieldConstraint } from "./fieldConstraints";
import {
  getEffectiveEditableFields,
  getPackageEditorFieldTargetStatuses,
  packageWithEffectiveEditableFields,
} from "./packageFieldBindings";

interface TemplatePackageFieldRulesEditorProps {
  packageValue: TemplatePackageV1;
  onPackageChange: (packageValue: TemplatePackageV1) => void;
  selectedFieldKey?: string | null;
  onSelectField?: (field: EditableFieldBinding | null) => void;
}

const textFieldTypes = new Set(["text", "textarea", "number", "date"]);
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
  return "Preserve original crop";
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
    const lineLimit = constraints.maxLines
      ? constraints.maxLines === 1
        ? "1 line"
        : `${constraints.maxLines} lines`
      : "No line limit";
    return `${characters} · ${lineLimit}`;
  }
  return editableFieldTypeLabel(field.type);
}

function positiveInteger(value: string): number | undefined {
  if (value === "") return undefined;
  if (!/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10000
    ? parsed
    : undefined;
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
            setExpandedFieldKey((current) => current === fieldKey ? null : fieldKey);
          };

          return (
            <article
              key={fieldKey}
              role="listitem"
              className="field-rule-card"
              data-selected={selected || undefined}
              data-expanded={expanded || undefined}
              data-drop-before={dropIndex === index || undefined}
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
            >
              <div className="field-rule-card__summary">
                <button
                  type="button"
                  className="field-rule-card__drag-handle"
                  draggable
                  data-field-reorder-key={fieldKey}
                  aria-label={`Drag ${formatEditableFieldLabel(field)} to reorder`}
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
                >
                  <GripVertical aria-hidden="true" size={18} />
                </button>
                <button
                  type="button"
                  className="field-rule-card__select"
                  aria-expanded={expanded}
                  aria-controls={`field-rules-${fieldKey}`}
                  aria-pressed={selected}
                  onClick={selectAndToggle}
                >
                  <span className="min-w-0 text-left">
                    <span className="block truncate font-medium">{formatEditableFieldLabel(field)}</span>
                    <span className="mt-1 block text-xs font-normal text-content-muted">{fieldSummary(field)}</span>
                  </span>
                  <span className="field-rule-card__summary-meta">
                    {!targetLinked ? <Status tone="attention">Preview unavailable</Status> : null}
                    <Status tone="neutral" className="field-rule-card__type">
                      {editableFieldTypeLabel(field.type)}
                    </Status>
                    <ChevronDown className="field-rule-card__chevron" aria-hidden="true" size={18} />
                  </span>
                </button>
                <div className="field-rule-card__reorder-actions" aria-label={`Reorder ${formatEditableFieldLabel(field)}`}>
                  <Menu label={<MoreHorizontal size={16} />} accessibleLabel={`More reorder actions for ${formatEditableFieldLabel(field)}`}>
                    {index > 0 ? <MenuItem onClick={() => moveField(fieldKey, index - 1)}>Move up</MenuItem> : null}
                    {index < fields.length - 1 ? <MenuItem onClick={() => moveField(fieldKey, index + 1)}>Move down</MenuItem> : null}
                    <MenuItem onClick={() => moveField(fieldKey, 0)}>Move to top</MenuItem>
                    <MenuItem onClick={() => moveField(fieldKey, fields.length - 1)}>Move to bottom</MenuItem>
                  </Menu>
                </div>
              </div>

              {expanded ? (
                <div id={`field-rules-${fieldKey}`} className="field-rule-card__content space-y-4">
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
                      <div className="field-rules-two-column">
                        <Input label="Maximum file size (MB)" type="number" min={0.1} step={0.1} value={imageConstraints.maxFileSizeMb ?? ""} placeholder="No limit" onChange={(event) => updateImageConstraint("maxFileSizeMb", event.target.value === "" ? undefined : Math.max(0.1, Number(event.target.value)))} />
                        <Input label="Minimum width" type="number" min={1} step={1} value={imageConstraints.minWidth ?? ""} placeholder="No limit" onChange={(event) => updateImageConstraint("minWidth", positiveInteger(event.target.value))} />
                        <Input label="Minimum height" type="number" min={1} step={1} value={imageConstraints.minHeight ?? ""} placeholder="No limit" onChange={(event) => updateImageConstraint("minHeight", positiveInteger(event.target.value))} />
                        <Select label="Replacement mode" value={imageConstraints.replacementMode ?? "preserve-original-crop"} onChange={(event) => updateImageConstraint("replacementMode", event.target.value as PackageImageFieldConstraints["replacementMode"])}>
                          <option value="preserve-original-crop">Preserve original crop</option>
                          <option value="cover">Fill frame</option>
                          <option value="contain">Fit inside frame</option>
                        </Select>
                      </div>
                      <fieldset className="field-format-options">
                        <legend className="ui-field__label">Allowed formats</legend>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {imageFormats.map((format) => (
                            <CheckboxField
                              key={format.mimeType}
                              label={format.label}
                              checked={(imageConstraints.allowedMimeTypes ?? []).includes(format.mimeType)}
                              onChange={(checked) => {
                                const current = imageConstraints.allowedMimeTypes ?? [];
                                const next = checked
                                  ? [...new Set([...current, format.mimeType])]
                                  : current.filter((value) => value !== format.mimeType);
                                updateImageConstraint("allowedMimeTypes", next.length ? next : undefined);
                              }}
                            />
                          ))}
                        </div>
                      </fieldset>
                    </>
                  ) : textFieldTypes.has(field.type) ? (
                    <>
                      <div className="field-rules-two-column field-rules-two-column--narrow">
                        <Input label="Maximum characters" type="number" inputMode="numeric" min={1} step={1} max={10000} value={textConstraints.maxCharacters ?? ""} placeholder="No limit" helpText="Blank means unrestricted." onChange={(event) => updateTextConstraint("maxCharacters", positiveInteger(event.target.value))} />
                        <Input label="Maximum lines" type="number" inputMode="numeric" min={1} step={1} max={1000} value={textConstraints.maxLines ?? ""} placeholder="No limit" helpText="Automatic wrapping counts toward this limit." onChange={(event) => updateTextConstraint("maxLines", positiveInteger(event.target.value))} />
                      </div>
                      <Select label="Input format" value={textConstraints.pattern ?? "free"} onChange={(event) => updateTextConstraint("pattern", event.target.value as PackageTextFieldConstraints["pattern"])}>
                        <option value="free">Free text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                      </Select>
                    </>
                  ) : (
                    <p className="text-sm text-content-secondary">
                      This field uses its imported configuration.
                    </p>
                  )}
                  <details className="border-t border-line-subtle pt-3">
                    <summary className="cursor-pointer text-sm text-content-muted">Technical target</summary>
                    <p className="mt-2 break-words font-mono text-xs text-content-muted">{field.nodeId} · {field.property}</p>
                  </details>
                </div>
              ) : null}
            </article>
          );
        })}
        {draggedFieldKey && dropIndex === fields.length ? <div className="field-rule-drop-indicator" /> : null}
      </div>
    </div>
  );
}

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { Eye, GripVertical, MoreHorizontal, Plus } from "lucide-react";
import {
  assignTemplateFamilyVariantOption,
  getTemplateFamilyControlOrder,
  setTemplateFamilyControlOrder,
  type TemplateFamilyV1,
} from "@sleinity/template-core/family";
import {
  Button,
  FilePickerButton,
  Input,
  Menu,
  MenuItem,
  SideDrawer,
  Status,
} from "../ui";

interface FamilyVariantPropertyTableProps {
  family: TemplateFamilyV1;
  selectedVariantId: string | null;
  busy?: boolean;
  statusForVariant(variantId: string): {
    label: string;
    tone: "repaired" | "attention" | "blocked";
  };
  onChange(family: TemplateFamilyV1): void;
  onAddZip(file: File): void;
  onSelectVariant(variantId: string): void;
  onPreview(variantId: string): void;
  onMove(variantId: string, nextIndex: number): void;
  onDelete(variantId: string): void;
}

function updatePropertyTitle(
  familyInput: TemplateFamilyV1,
  groupId: string,
  title: string,
): TemplateFamilyV1 {
  const family = structuredClone(familyInput);
  const group = family.variantGroups.find((candidate) => candidate.id === groupId);
  if (group) group.title = title;
  return family;
}

function removeProperty(
  familyInput: TemplateFamilyV1,
  groupId: string,
): TemplateFamilyV1 {
  const family = structuredClone(familyInput);
  family.variantGroups = family.variantGroups.filter((group) => group.id !== groupId);
  for (const variant of family.variants) delete variant.groupAssignments[groupId];
  const previous = getTemplateFamilyControlOrder(familyInput);
  const nextControls = previous.filter(
    (control) => control.kind !== "selection-property" || control.groupId !== groupId,
  );
  if (family.variantGroups.length === 0 && family.variants.length > 1) {
    const insertion = previous.findIndex(
      (control) => control.kind === "selection-property" && control.groupId === groupId,
    );
    nextControls.splice(Math.max(0, insertion), 0, { kind: "direct-variant-selector" });
  }
  return setTemplateFamilyControlOrder(family, nextControls);
}

function addProperty(
  familyInput: TemplateFamilyV1,
  title: string,
): TemplateFamilyV1 {
  const family = structuredClone(familyInput);
  const groupId = `group:${crypto.randomUUID()}`;
  const previous = getTemplateFamilyControlOrder(familyInput);
  family.variantGroups.push({ id: groupId, title: title.trim(), options: [] });
  const directIndex = previous.findIndex((control) => control.kind === "direct-variant-selector");
  const firstField = previous.findIndex((control) => control.kind === "field");
  const insertion = directIndex >= 0
    ? directIndex
    : firstField >= 0
      ? firstField
      : previous.length;
  const controls = previous.filter((control) => control.kind !== "direct-variant-selector");
  controls.splice(insertion, 0, { kind: "selection-property", groupId });
  return setTemplateFamilyControlOrder(family, controls);
}

function commitAssignment(
  familyInput: TemplateFamilyV1,
  variantId: string,
  groupId: string,
  rawTitle: string,
): TemplateFamilyV1 {
  const title = rawTitle.trim();
  if (!title) return assignTemplateFamilyVariantOption(familyInput, variantId, groupId, null);
  let family = structuredClone(familyInput);
  const group = family.variantGroups.find((candidate) => candidate.id === groupId);
  if (!group) return familyInput;
  let option = group.options.find(
    (candidate) => candidate.title.trim().toLocaleLowerCase() === title.toLocaleLowerCase(),
  );
  if (!option) {
    option = { id: `option:${crypto.randomUUID()}`, title };
    group.options.push(option);
  }
  family = assignTemplateFamilyVariantOption(family, variantId, groupId, option.id);
  return family;
}

function AssignmentInput({
  family,
  variantId,
  groupId,
  onChange,
}: {
  family: TemplateFamilyV1;
  variantId: string;
  groupId: string;
  onChange(family: TemplateFamilyV1): void;
}) {
  const listId = useId();
  const group = family.variantGroups.find((candidate) => candidate.id === groupId)!;
  const optionId = family.variants.find((variant) => variant.id === variantId)
    ?.groupAssignments[groupId];
  const assignedTitle = group.options.find((option) => option.id === optionId)?.title ?? "";
  const [value, setValue] = useState(assignedTitle);
  useEffect(() => setValue(assignedTitle), [assignedTitle]);
  const commit = () => onChange(commitAssignment(family, variantId, groupId, value));
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.currentTarget.blur();
  };
  return (
    <div className="family-property-assignment">
      <input
        className="ui-input"
        aria-label={`${group.title || "Selection property"} for ${family.variants.find((variant) => variant.id === variantId)?.title ?? variantId}`}
        aria-invalid={!optionId || undefined}
        list={listId}
        value={value}
        placeholder="Choose or type a value"
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
      <datalist id={listId}>
        {group.options.map((option) => <option key={option.id} value={option.title} />)}
      </datalist>
      {!optionId ? <p className="ui-field__error">Choose a value</p> : null}
    </div>
  );
}

export function FamilyVariantPropertyTable({
  family,
  selectedVariantId,
  busy,
  statusForVariant,
  onChange,
  onAddZip,
  onSelectVariant,
  onPreview,
  onMove,
  onDelete,
}: FamilyVariantPropertyTableProps) {
  const [addingProperty, setAddingProperty] = useState(false);
  const [propertyName, setPropertyName] = useState("");
  const [editingValuesFor, setEditingValuesFor] = useState<string | null>(null);
  const [renamingProperty, setRenamingProperty] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [confirmRemovePropertyId, setConfirmRemovePropertyId] = useState<string | null>(null);
  const duplicateTupleMessages = useMemo(() => {
    const tupleOwners = new Map<string, string>();
    const messages = new Map<string, string>();
    for (const variant of family.variants) {
      const tuple = family.variantGroups.map((group) => variant.groupAssignments[group.id]);
      if (tuple.length === 0 || tuple.some((optionId) => !optionId)) continue;
      const key = tuple.join("|");
      const previousId = tupleOwners.get(key);
      if (!previousId) {
        tupleOwners.set(key, variant.id);
        continue;
      }
      const previous = family.variants.find((candidate) => candidate.id === previousId);
      const message = `Same selection values as ${previous?.title ?? "another variant"}`;
      messages.set(variant.id, message);
      messages.set(previousId, `Same selection values as ${variant.title}`);
    }
    return messages;
  }, [family]);

  const createProperty = () => {
    if (!propertyName.trim()) return;
    onChange(addProperty(family, propertyName));
    setPropertyName("");
    setAddingProperty(false);
  };

  return (
    <div className="family-property-workspace">
      <div className="family-section-heading">
        <div />
        <div className="family-variant-board__section-actions">
          <FilePickerButton
            size="small"
            accept=".zip,application/zip,application/x-zip-compressed"
            disabled={busy}
            leadingIcon={<Plus size={15} />}
            onSelect={(file) => file && onAddZip(file)}
          >
            Add variant
          </FilePickerButton>
          <Button size="small" variant="secondary" onClick={() => setAddingProperty(true)}>
            Add property
          </Button>
        </div>
      </div>

      <div className="family-property-table-scroll">
        <table className="family-property-table">
          <thead>
            <tr>
              <th scope="col">Variant</th>
              <th scope="col">Status</th>
              {family.variantGroups.map((group) => (
                <th scope="col" key={group.id}>
                  <div className="family-property-table__heading">
                    {renamingProperty?.id === group.id ? (
                      <div className="family-property-table__rename">
                        <input
                          autoFocus
                          className="family-property-table__property-name"
                          aria-label="Selection property name"
                          aria-invalid={!renamingProperty.value.trim() || undefined}
                          value={renamingProperty.value}
                          onChange={(event) => setRenamingProperty({
                            id: group.id,
                            value: event.target.value,
                          })}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setRenamingProperty(null);
                            if (event.key === "Enter" && renamingProperty.value.trim()) {
                              onChange(updatePropertyTitle(family, group.id, renamingProperty.value.trim()));
                              setRenamingProperty(null);
                            }
                          }}
                        />
                        <Button
                          size="small"
                          variant="quiet"
                          disabled={!renamingProperty.value.trim()}
                          onClick={() => {
                            onChange(updatePropertyTitle(family, group.id, renamingProperty.value.trim()));
                            setRenamingProperty(null);
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    ) : <span>{group.title}</span>}
                    <Menu label={<MoreHorizontal size={15} />} accessibleLabel={`Actions for ${group.title || "selection property"}`}>
                      <MenuItem onClick={() => setRenamingProperty({ id: group.id, value: group.title })}>
                        Rename property
                      </MenuItem>
                      <MenuItem onClick={() => setEditingValuesFor(
                        editingValuesFor === group.id ? null : group.id,
                      )}>
                        Edit values
                      </MenuItem>
                      <MenuItem destructive onClick={() => {
                        if (confirmRemovePropertyId === group.id) {
                          onChange(removeProperty(family, group.id));
                          setConfirmRemovePropertyId(null);
                        } else setConfirmRemovePropertyId(group.id);
                      }}>
                        {confirmRemovePropertyId === group.id ? "Confirm remove property" : "Remove property"}
                      </MenuItem>
                    </Menu>
                  </div>
                </th>
              ))}
              {addingProperty ? (
                <th scope="col" className="family-property-table__draft-column">
                  <div className="family-property-table__draft-heading">
                    <input
                      autoFocus
                      className="ui-input"
                      aria-label="New property name"
                      placeholder="Property name"
                      value={propertyName}
                      onChange={(event) => setPropertyName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") createProperty();
                        if (event.key === "Escape") {
                          setAddingProperty(false);
                          setPropertyName("");
                        }
                      }}
                    />
                    <div>
                      <Button size="small" disabled={!propertyName.trim()} onClick={createProperty}>Add</Button>
                      <Button size="small" variant="quiet" onClick={() => {
                        setAddingProperty(false);
                        setPropertyName("");
                      }}>Cancel</Button>
                    </div>
                  </div>
                </th>
              ) : null}
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {family.variants.map((variant, index) => {
              const status = statusForVariant(variant.id);
              return (
                <tr key={variant.id} data-selected={selectedVariantId === variant.id || undefined}>
                  <td>
                    <div className="family-property-table__variant">
                      <button
                        type="button"
                        className="family-variant-row__drag"
                        aria-label={`Move ${variant.title}`}
                        disabled={family.variants.length < 2}
                      >
                        <GripVertical size={16} />
                      </button>
                      <input
                        className="family-variant-row__name"
                        aria-label={`Variant name for ${variant.title}`}
                        value={variant.title}
                        onFocus={() => onSelectVariant(variant.id)}
                        onChange={(event) => {
                          const next = structuredClone(family);
                          const target = next.variants.find((candidate) => candidate.id === variant.id);
                          if (target) target.title = event.target.value;
                          onChange(next);
                        }}
                      />
                      {duplicateTupleMessages.get(variant.id) ? (
                        <p className="ui-field__error">{duplicateTupleMessages.get(variant.id)}</p>
                      ) : null}
                    </div>
                  </td>
                  <td><Status tone={status.tone}>{status.label}</Status></td>
                  {family.variantGroups.map((group) => (
                    <td key={group.id}>
                      <AssignmentInput
                        family={family}
                        variantId={variant.id}
                        groupId={group.id}
                        onChange={onChange}
                      />
                    </td>
                  ))}
                  {addingProperty ? (
                    <td className="family-property-table__draft-cell">
                      <span>Set after naming</span>
                    </td>
                  ) : null}
                  <td>
                    <div className="family-property-table__actions">
                      <Button size="small" variant="quiet" leadingIcon={<Eye size={15} />} onClick={() => onPreview(variant.id)}>
                        Preview
                      </Button>
                      <Menu label={<MoreHorizontal size={16} />} accessibleLabel={`More actions for ${variant.title}`}>
                        {index > 0 ? <MenuItem onClick={() => onMove(variant.id, index - 1)}>Move earlier</MenuItem> : null}
                        {index < family.variants.length - 1 ? <MenuItem onClick={() => onMove(variant.id, index + 1)}>Move later</MenuItem> : null}
                        <MenuItem destructive onClick={() => onDelete(variant.id)}>Delete variant</MenuItem>
                      </Menu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SideDrawer
        open={Boolean(editingValuesFor)}
        title={`${family.variantGroups.find((group) => group.id === editingValuesFor)?.title || "Property"} values`}
        description="Rename a value without changing which variants use it."
        onClose={() => setEditingValuesFor(null)}
      >
        {editingValuesFor ? (
          <div className="family-property-values__list">
            {family.variantGroups.find((group) => group.id === editingValuesFor)?.options.map((option) => (
              <Input
                key={option.id}
                label="Value name"
                aria-invalid={!option.title.trim() || undefined}
                value={option.title}
                onChange={(event) => {
                  const next = structuredClone(family);
                  const target = next.variantGroups
                    .find((group) => group.id === editingValuesFor)
                    ?.options.find((candidate) => candidate.id === option.id);
                  if (target) target.title = event.target.value;
                  onChange(next);
                }}
              />
            ))}
          </div>
        ) : null}
      </SideDrawer>
    </div>
  );
}

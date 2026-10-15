import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { DesignThumbnail } from "./DesignThumbnail";
import { Eye, GripVertical, MoreHorizontal, Plus } from "lucide-react";
import {
  applyTemplateFieldFamilySelectionMutationV2,
  getTemplateFieldFamilyEditorControlOrderV2,
  resolveTemplateFieldFamilyVariantV2,
  type TemplateFieldFamilyV2,
} from "@sleinity/template-core/family";
import { Button, ConnectedList, ConnectedListItem, Input, Menu, MenuItem, SideDrawer, Status } from "../components/ui";
import { studioVariantDisplayLabels, type SetupSource } from "./setupSources";
import { SetupActionGroup, SetupSectionHeader } from "./SetupPagePrimitives";

const copy = <T,>(value: T): T => structuredClone(value);

function addProperty(family: TemplateFieldFamilyV2, title: string): TemplateFieldFamilyV2 {
  const next = copy(family);
  const id = `group-${crypto.randomUUID()}`;
  next.variantGroups = [...next.variantGroups ?? [], { id, title: title.trim(), options: [] }];
  const order = getTemplateFieldFamilyEditorControlOrderV2(family)
    .filter((control) => control.kind !== "direct-variant-selector");
  const firstField = order.findIndex((control) => control.kind === "field");
  order.splice(firstField < 0 ? order.length : firstField, 0, {
    kind: "selection-property",
    groupId: id,
  });
  next.editorControlOrder = order;
  return next;
}

function renameProperty(
  family: TemplateFieldFamilyV2,
  propertyId: string,
  title: string,
): TemplateFieldFamilyV2 {
  const next = copy(family);
  next.variantGroups = (next.variantGroups ?? []).map((group) =>
    group.id === propertyId ? { ...group, title: title.trim() } : group
  );
  return next;
}

function commitAssignment(
  family: TemplateFieldFamilyV2,
  variantId: string,
  propertyId: string,
  rawTitle: string,
): TemplateFieldFamilyV2 {
  const title = rawTitle.trim();
  const next = copy(family);
  const group = next.variantGroups?.find((candidate) => candidate.id === propertyId);
  const variant = next.variants.find((candidate) => candidate.id === variantId);
  if (!group || !variant) return family;
  if (!title) {
    const assignments = { ...(variant.groupAssignments ?? {}) };
    delete assignments[propertyId];
    variant.groupAssignments = assignments;
    return next;
  }
  let option = group.options.find(
    (candidate) => candidate.title.trim().toLocaleLowerCase() === title.toLocaleLowerCase(),
  );
  if (!option) {
    option = { id: `option-${crypto.randomUUID()}`, title };
    group.options = [...group.options, option];
  }
  variant.groupAssignments = {
    ...(variant.groupAssignments ?? {}),
    [propertyId]: option.id,
  };
  return next;
}

function familyMatrixReady(family: TemplateFieldFamilyV2): boolean {
  return family.variants.every(
    (variant) => resolveTemplateFieldFamilyVariantV2(family, variant.id).valid,
  );
}

function duplicateMessages(family: TemplateFieldFamilyV2): Map<string, string> {
  const groups = family.variantGroups ?? [];
  const owners = new Map<string, string>();
  const messages = new Map<string, string>();
  for (const variant of family.variants) {
    const tuple = groups.map((group) => variant.groupAssignments?.[group.id]);
    if (!tuple.length || tuple.some((value) => !value)) continue;
    const key = tuple.join("|");
    const previousId = owners.get(key);
    if (!previousId) {
      owners.set(key, variant.id);
      continue;
    }
    const previous = family.variants.find((candidate) => candidate.id === previousId);
    messages.set(variant.id, `Same selection values as ${previous?.label ?? "another design"}`);
    messages.set(previousId, `Same selection values as ${variant.label ?? "another design"}`);
  }
  return messages;
}

function AssignmentInput({
  family,
  variantId,
  propertyId,
  disabled,
  onChange,
}: {
  family: TemplateFieldFamilyV2;
  variantId: string;
  propertyId: string;
  disabled?: boolean;
  onChange(family: TemplateFieldFamilyV2): void;
}) {
  const listId = useId();
  const group = family.variantGroups?.find((candidate) => candidate.id === propertyId)!;
  const assignedId = family.variants.find((variant) => variant.id === variantId)
    ?.groupAssignments?.[propertyId];
  const assignedTitle = group.options.find((option) => option.id === assignedId)?.title ?? "";
  const [value, setValue] = useState(assignedTitle);
  useEffect(() => setValue(assignedTitle), [assignedTitle]);
  const commit = () => onChange(commitAssignment(family, variantId, propertyId, value));
  return (
    <div className="family-property-assignment">
      <input
        className="ui-input"
        aria-label={`${group.title || "Selection property"} for ${family.variants.find((variant) => variant.id === variantId)?.label ?? variantId}`}
        aria-invalid={!assignedId || undefined}
        list={listId}
        value={value}
        disabled={disabled}
        placeholder="Choose or type a value"
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setValue(assignedTitle);
            event.currentTarget.blur();
          }
        }}
      />
      <datalist id={listId}>
        {group.options.map((option) => <option key={option.id} value={option.title} />)}
      </datalist>
      {!assignedId ? <p className="ui-field__error">Choose a value</p> : null}
    </div>
  );
}

function PendingAssignmentInput({
  family,
  source,
  propertyId,
  assignedId,
  disabled,
  onCommit,
}: {
  family: TemplateFieldFamilyV2;
  source: SetupSource;
  propertyId: string;
  assignedId?: string;
  disabled?: boolean;
  onCommit(title: string): void;
}) {
  const listId = useId();
  const group = family.variantGroups?.find((candidate) => candidate.id === propertyId)!;
  const accepted = group.options.find((option) => option.id === assignedId)?.title ?? "";
  const [value, setValue] = useState(accepted);
  useEffect(() => setValue(accepted), [accepted]);
  const commit = () => {
    const title = value.trim();
    if (title) onCommit(title);
  };
  return <div className="family-property-assignment">
    <input className="ui-input" list={listId} value={value} disabled={disabled}
      aria-label={`${group.title} for ${source.packageValue.name}`}
      aria-invalid={!assignedId || undefined} placeholder="Choose or type a value"
      onChange={(event) => setValue(event.target.value)} onBlur={commit}
      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } if (event.key === "Escape") { setValue(accepted); event.currentTarget.blur(); } }} />
    <datalist id={listId}>{group.options.map((option) => <option key={option.id} value={option.title} />)}</datalist>
    {!assignedId ? <p className="ui-field__error">Choose a value</p> : null}
  </div>;
}

export function FamilySelectionMatrixV2({
  family,
  sources = [],
  selectedVariantId,
  disabled,
  onChange,
  onSelectVariant,
  onPreviewVariant,
  onRenameVariant,
  onMoveVariant,
  onReplaceVariant,
  onRemoveVariant,
  onAddVariant,
  onDraftStateChange,
  pendingSources = [],
  pendingAssignments = {},
  onPendingAssignment,
  onAcceptPending,
  onCancelPending,
}: {
  family: TemplateFieldFamilyV2;
  sources?: readonly SetupSource[];
  selectedVariantId?: string | null;
  disabled?: boolean;
  onChange(family: TemplateFieldFamilyV2): boolean | void;
  onSelectVariant?(variantId: string): void;
  onPreviewVariant?(variantId: string): void;
  onRenameVariant?(variantId: string, label: string): void;
  onMoveVariant?(variantId: string, targetIndex: number): void;
  onReplaceVariant?(variantId: string): void;
  onRemoveVariant?(variantId: string): void;
  onAddVariant?(): void;
  onDraftStateChange?(pending: boolean): void;
  pendingSources?: readonly SetupSource[];
  pendingAssignments?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  onPendingAssignment?(sourceId: string, groupId: string, optionId: string): void;
  onAcceptPending?(): void;
  onCancelPending?(): void;
}) {
  const [draftFamily, setDraftFamily] = useState<TemplateFieldFamilyV2 | null>(null);
  const [addingProperty, setAddingProperty] = useState(false);
  const [propertyName, setPropertyName] = useState("");
  const [editingValuesFor, setEditingValuesFor] = useState<string | null>(null);
  const [renamingProperty, setRenamingProperty] = useState<{ id: string; value: string } | null>(null);
  const [confirmRemovePropertyId, setConfirmRemovePropertyId] = useState<string | null>(null);
  const [confirmRemoveVariantId, setConfirmRemoveVariantId] = useState<string | null>(null);
  const cancelledRenames = useRef(new Set<string>());
  const displayed = draftFamily ?? family;
  const groups = displayed.variantGroups ?? [];
  const labels = useMemo(
    () => studioVariantDisplayLabels(displayed.variants, sources),
    [displayed.variants, sources],
  );
  const duplicateTupleMessages = useMemo(() => duplicateMessages(displayed), [displayed]);
  const sourceNames = useMemo(() => new Map(sources.map((source) => [source.id, source.name])), [sources]);
  const collectionStyle = {
    "--design-selector-count": groups.length + (addingProperty ? 1 : 0),
  } as CSSProperties;

  useEffect(() => {
    if (!draftFamily) return;
    if (
      draftFamily.id !== family.id ||
      draftFamily.variants.some((variant) => !family.variants.some((candidate) => candidate.id === variant.id))
    ) setDraftFamily(null);
  }, [draftFamily, family]);
  useEffect(() => onDraftStateChange?.(Boolean(draftFamily)), [draftFamily, onDraftStateChange]);
  useEffect(() => () => onDraftStateChange?.(false), [onDraftStateChange]);

  const publish = (next: TemplateFieldFamilyV2) => {
    if (!familyMatrixReady(next)) {
      setDraftFamily(next);
      return;
    }
    if (onChange(next) === false) {
      setDraftFamily(next);
      return;
    }
    setDraftFamily(null);
  };
  const createProperty = () => {
    if (!propertyName.trim()) return;
    publish(addProperty(displayed, propertyName));
    setPropertyName("");
    setAddingProperty(false);
  };
  const removeProperty = (propertyId: string) => {
    publish(applyTemplateFieldFamilySelectionMutationV2(displayed, {
      type: "remove-property",
      groupId: propertyId,
    }));
    setConfirmRemovePropertyId(null);
  };

  return (
    <div className="family-property-workspace studio-family-selection">
      <SetupSectionHeader
        title="Included designs"
        meta={<span className="ui-metadata">{displayed.variants.length} designs</span>}
        actions={<SetupActionGroup>
          <Button size="small" variant="secondary" leadingIcon={<Plus size={15} />} disabled={disabled || Boolean(draftFamily) || pendingSources.length > 0} onClick={onAddVariant}>
            Add designs
          </Button>
          <Button size="small" variant="quiet" disabled={disabled || addingProperty} onClick={() => setAddingProperty(true)}>
            Add design selector
          </Button>
        </SetupActionGroup>}
      />
      <div className="studio-design-scroll" role="region" aria-label="Design selector matrix" tabIndex={0}>
      <ConnectedList
        data-has-selectors={groups.length + (addingProperty ? 1 : 0) > 0}
        label="Included designs"
        className="studio-design-collection"
        style={collectionStyle}
        header={<div className="studio-design-collection__grid studio-design-collection__header">
              <span>Design</span>
              {groups.map((group) => (
                <div key={group.id} className="studio-design-collection__selector-heading">
                    {renamingProperty?.id === group.id ? (
                      <div className="studio-design-collection__rename">
                        <input
                          autoFocus
                          className="family-property-table__property-name"
                          aria-label="Design selector name"
                          aria-invalid={!renamingProperty.value.trim() || undefined}
                          value={renamingProperty.value}
                          onChange={(event) => setRenamingProperty({ id: group.id, value: event.target.value })}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setRenamingProperty(null);
                            if (event.key === "Enter" && renamingProperty.value.trim()) {
                              publish(renameProperty(displayed, group.id, renamingProperty.value));
                              setRenamingProperty(null);
                            }
                          }}
                        />
                        <Button size="small" variant="quiet" disabled={!renamingProperty.value.trim()} onClick={() => {
                          publish(renameProperty(displayed, group.id, renamingProperty.value));
                          setRenamingProperty(null);
                        }}>Save</Button>
                      </div>
                    ) : <span>{group.title}</span>}
                    <Menu label={<MoreHorizontal size={15} />} accessibleLabel={`Actions for ${group.title || "design selector"}`}>
                      <MenuItem onClick={() => setRenamingProperty({ id: group.id, value: group.title })}>Rename selector</MenuItem>
                      <MenuItem onClick={() => setEditingValuesFor(editingValuesFor === group.id ? null : group.id)}>Edit options</MenuItem>
                      <MenuItem destructive onClick={() => {
                        if (confirmRemovePropertyId === group.id) removeProperty(group.id);
                        else setConfirmRemovePropertyId(group.id);
                      }}>
                        {confirmRemovePropertyId === group.id ? "Confirm remove selector" : "Remove selector"}
                      </MenuItem>
                    </Menu>
                </div>
              ))}
              {addingProperty ? (
                <div className="studio-design-collection__draft-heading">
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
              ) : null}
              <span className="ui-visually-hidden">Actions</span>
            </div>}
      >
            {displayed.variants.map((variant, index) => {
              const resolution = resolveTemplateFieldFamilyVariantV2(displayed, variant.id);
              return (
                <ConnectedListItem key={variant.id} data-design-row selected={selectedVariantId === variant.id} className="studio-design-collection__grid studio-design-collection__row">
                    <div className="family-property-table__variant">
                      <button
                        type="button"
                        className="family-variant-row__drag"
                        aria-label={`Move ${labels[variant.id]}`}
                        disabled={disabled || Boolean(draftFamily) || displayed.variants.length < 2}
                      >
                        <GripVertical size={16} aria-hidden="true" />
                      </button>
                      <DesignThumbnail packageValue={variant.packageValue} />
                      <div className="family-property-table__variant-copy">
                        <input
                          key={`${variant.id}:${variant.label ?? variant.packageValue.name}`}
                          className="family-variant-row__name"
                          aria-label={`Design name for ${labels[variant.id]}`}
                          defaultValue={variant.label ?? variant.packageValue.name}
                          disabled={disabled || Boolean(draftFamily)}
                          onFocus={() => onSelectVariant?.(variant.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              cancelledRenames.current.add(variant.id);
                              event.currentTarget.value = variant.label ?? variant.packageValue.name;
                              event.currentTarget.blur();
                            }
                            if (event.key === "Enter") event.currentTarget.blur();
                          }}
                          onBlur={(event) => {
                            if (cancelledRenames.current.delete(variant.id)) return;
                            const title = event.currentTarget.value.trim();
                            if (title && title !== (family.variants.find((candidate) => candidate.id === variant.id)?.label ?? variant.packageValue.name)) {
                              onRenameVariant?.(variant.id, title);
                            } else {
                              event.currentTarget.value = variant.label ?? variant.packageValue.name;
                            }
                          }}
                        />
                        <div className="family-property-table__variant-meta">
                          <span>{variant.packageValue.canvas.width} × {variant.packageValue.canvas.height}</span>
                          <details><summary>Source</summary><small>{sourceNames.get(variant.id) ?? variant.packageValue.name}</small></details>
                        </div>
                        {duplicateTupleMessages.get(variant.id)
                          ? <p className="ui-field__error">{duplicateTupleMessages.get(variant.id)}</p>
                          : null}
                        {!resolution.valid ? <Status tone="blocked">Needs values</Status> : null}
                      </div>
                    </div>
                  {groups.map((group) => (
                    <div key={group.id} className="studio-design-collection__assignment">
                      <AssignmentInput family={displayed} variantId={variant.id} propertyId={group.id} disabled={disabled} onChange={publish} />
                    </div>
                  ))}
                  {addingProperty ? <div className="studio-design-collection__draft-cell"><span>Set after naming</span></div> : null}
                    <div className="family-property-table__actions">
                      <Button size="small" variant="quiet" leadingIcon={<Eye size={15} />} disabled={Boolean(draftFamily)} onClick={() => onPreviewVariant?.(variant.id)}>Preview</Button>
                      <Menu label={<MoreHorizontal size={16} />} accessibleLabel={`Actions for ${labels[variant.id]}`}>
                        <MenuItem onClick={() => onReplaceVariant?.(variant.id)}>Replace design</MenuItem>
                        {index > 0 ? <MenuItem onClick={() => onMoveVariant?.(variant.id, index - 1)}>Move earlier</MenuItem> : null}
                        {index < displayed.variants.length - 1 ? <MenuItem onClick={() => onMoveVariant?.(variant.id, index + 1)}>Move later</MenuItem> : null}
                        <MenuItem destructive onClick={() => {
                          if (confirmRemoveVariantId === variant.id) {
                            onRemoveVariant?.(variant.id);
                            setConfirmRemoveVariantId(null);
                          } else setConfirmRemoveVariantId(variant.id);
                        }}>
                          {confirmRemoveVariantId === variant.id ? "Confirm delete design" : "Delete design"}
                        </MenuItem>
                      </Menu>
                    </div>
                </ConnectedListItem>
              );
            })}
            {pendingSources.map((source) => <ConnectedListItem key={source.id} data-design-row data-pending-design tone="attention" className="studio-design-collection__grid studio-design-collection__row">
              <div className="studio-design-collection__pending"><strong>{source.packageValue.name}</strong><small>{source.name} · {source.packageValue.canvas.width} × {source.packageValue.canvas.height}</small><Status tone="attention">Needs values</Status></div>
              {groups.map((group) => <div key={group.id} className="studio-design-collection__assignment"><PendingAssignmentInput family={displayed} source={source} propertyId={group.id} assignedId={pendingAssignments[source.id]?.[group.id]} disabled={disabled} onCommit={(rawTitle) => {
                const title = rawTitle.trim();
                let option = group.options.find((candidate) => candidate.title.trim().toLocaleLowerCase() === title.toLocaleLowerCase());
                if (!option) {
                  option = { id: `option-${crypto.randomUUID()}`, title };
                  const next = copy(displayed);
                  next.variantGroups = (next.variantGroups ?? []).map((candidate) => candidate.id === group.id ? { ...candidate, options: [...candidate.options, option!] } : candidate);
                  if (onChange(next) === false) return;
                }
                onPendingAssignment?.(source.id, group.id, option.id);
              }} /></div>)}
              {addingProperty ? <div className="studio-design-collection__draft-cell">Set after naming</div> : null}
              <Button size="small" variant="quiet" onClick={onCancelPending}>Cancel</Button>
            </ConnectedListItem>)}
      </ConnectedList>
      </div>
      {pendingSources.length ? <div className="family-variant-board__section-actions">
        <Button disabled={pendingSources.some((source) => groups.some((group) => !pendingAssignments[source.id]?.[group.id]))} onClick={onAcceptPending}>Add designs</Button>
        <Button variant="quiet" onClick={onCancelPending}>Cancel</Button>
      </div> : null}
      <SideDrawer
        open={Boolean(editingValuesFor)}
        title={`${groups.find((group) => group.id === editingValuesFor)?.title || "Design selector"} values`}
        description="Rename a value without changing which designs use it."
        onClose={() => setEditingValuesFor(null)}
      >
        {editingValuesFor ? (
          <div className="family-property-values__list">
            {groups.find((group) => group.id === editingValuesFor)?.options.map((option) => (
              <Input
                key={option.id}
                label="Value name"
                aria-invalid={!option.title.trim() || undefined}
                value={option.title}
                onChange={(event) => {
                  const next = copy(displayed);
                  const target = next.variantGroups
                    ?.find((group) => group.id === editingValuesFor)
                    ?.options.find((candidate) => candidate.id === option.id);
                  if (target) target.title = event.target.value;
                  publish(next);
                }}
              />
            ))}
          </div>
        ) : null}
      </SideDrawer>
    </div>
  );
}

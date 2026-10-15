import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { MoreHorizontal } from "lucide-react";
import { formatTemplateNumberV1, formatTemplateCalendarDateV1, type TemplateFieldConfigurationV2 } from "@sleinity/template-core";
import { type TemplateFieldFamilyVariantFieldOverrideV2 } from "@sleinity/template-core/family";
import { useTemplateFieldSessionV2Snapshot, type ReactTemplateFieldSessionV2 } from "@sleinity/template-react";
import { Button, FilterChip, Menu, MenuItem, Select, Status } from "../components/ui";
import { FieldRuleCardShell } from "../components/template-package/editor/FieldRuleCardShell";
import { familyFieldIssues, readableFieldLabel, type FieldAuthoringContext } from "../field-rules/fieldAuthoring";
import { choiceAuthoringSources } from "../field-rules/choiceAuthoring";
import { FieldConfigurationEditorV2 } from "../field-rules/FieldConfigurationEditorV2";
import { useSetupEditGuard } from "./SetupEditGuard";
import { studioVariantDisplayLabels } from "./setupSources";
import { SetupSectionHeader } from "./SetupPagePrimitives";

const typeLabel = (value: string) => value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
export const ruleSummary = (field: TemplateFieldConfigurationV2, override?: TemplateFieldFamilyVariantFieldOverrideV2, attention = false, defaultValue?: unknown) => {
  const configuration = { ...field.configuration, ...override?.configuration } as Record<string, unknown>;
  const parts: string[] = [];
  const choices = configuration.choices as { mode?: string; options?: unknown[] } | undefined;
  if (choices?.options?.length) parts.push(`${choices.options.length} ${choices.mode === "restricted" ? "options only" : "presets"}`);
  if (configuration.replacementPlacement) parts.push(typeLabel(String(configuration.replacementPlacement)));
  if (configuration.maxCharacters != null) parts.push(`${configuration.maxCharacters} characters`);
  if (configuration.maxLines != null) parts.push(`${configuration.maxLines} lines`);
  if (configuration.min != null || configuration.max != null) parts.push(`${configuration.min ?? "Any"}–${configuration.max ?? "Any"}`);
  if (field.type === "number" && typeof defaultValue === "number") parts.push(formatTemplateNumberV1(defaultValue, configuration.format as never));
  if (field.type === "date" && typeof defaultValue === "string") parts.push(formatTemplateCalendarDateV1(defaultValue, configuration.format as never));
  if (!parts.length) parts.push(field.type === "boolean" ? "Show / hide group" : field.type === "image" ? "Imported placement" : field.type === "color" ? "Any RGB color" : "No limits");
  return `${attention ? "Needs attention · " : ""}${parts.join(" · ")}`;
};

export type SetupFieldCorrectionTarget = { key: number; fieldId: string; variantId?: string; scope: "common" | "variant" };
type Filter = "all" | TemplateFieldConfigurationV2["type"];

export function SetupFields({ session, active, onSelectVariant, onInspectVariant, selected, correctionTarget, onCorrectionHandled, onSelect, onAccepted }: {
  session: ReactTemplateFieldSessionV2;
  active: boolean;
  onSelectVariant(id: string): Promise<boolean>;
  onInspectVariant?(id: string): void;
  selected: string | null;
  correctionTarget?: SetupFieldCorrectionTarget | null;
  onCorrectionHandled?(): void;
  onSelect(id: string): void;
  onAccepted(): void;
}) {
  const root = useRef<HTMLElement>(null);
  const fieldEdits = useSetupEditGuard();
  const snapshot = useTemplateFieldSessionV2Snapshot(session);
  const [acceptedChanges, setAcceptedChanges] = useState(false);
  const [undo, setUndo] = useState<{ before: string[]; after: string[]; variantId?: string } | null>(null);
  const [scope, setScope] = useState<"common" | "variant">("common");
  const [editing, setEditing] = useState<string | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [revealedField, setRevealedField] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const family = "family" in snapshot ? snapshot.family : null;
  const variant = family?.variants.find((entry) => "selectedVariantId" in snapshot && entry.id === snapshot.selectedVariantId);
  const variantDisplayLabels = useMemo(() => family ? studioVariantDisplayLabels(family.variants) : {}, [family]);
  const packageValue = "basePackage" in snapshot ? snapshot.basePackage : snapshot.effectivePackage;
  const sourceSignature = JSON.stringify(family ? family.variants.map(source => source.packageValue) : packageValue && { ...packageValue, editableFieldOrder: undefined, editableFields: packageValue.editableFields.map(({ configuration: _configuration, label: _label, controlRole: _role, ...source }) => source) });
  useEffect(() => { setUndo(null); }, [session, active, scope, scope === "variant" ? variant?.id : undefined, sourceSignature]);
  const issues = useMemo(() => family ? familyFieldIssues(family, snapshot.contentState?.values ?? {}) : [], [family, snapshot.contentState?.values]);
  const authoringContext = useMemo<FieldAuthoringContext | undefined>(() => packageValue ? { packageValue, family, variantId: scope === "variant" ? variant?.id : undefined } : undefined, [packageValue, family, scope, variant?.id]);
  const choiceContexts = useMemo(() => Object.fromEntries((family?.fields ?? packageValue?.editableFields ?? []).map(field => [field.id, choiceAuthoringSources(field.id, packageValue?.editableFields ?? [], family, scope === "variant" ? variant?.id : undefined)])), [family, packageValue?.editableFields, scope, variant?.id]);
  useEffect(() => {
    if (!active || !family || scope !== "common" || !selected) return;
    const containing = family.variants.filter(design => design.packageValue.editableFields.some(field => field.id === selected));
    if (containing.length && !containing.some(design => design.id === variant?.id)) onInspectVariant?.(containing[0].id);
  }, [active, family, scope, selected, variant?.id, onInspectVariant]);
  if (!packageValue) return null;
  const fields = family && scope === "common" ? family.fields : packageValue.editableFields;
  const order = family && scope === "common" ? family.editableFieldOrder : packageValue.editableFieldOrder;
  const fieldFor = (id: string) => fields.find((entry) => entry.id === id) ?? family?.fields.find((entry) => entry.id === id);
  const hasAttention = (id: string) => (scope === "common" && issues.some(issue => issue.fieldId === id)) || snapshot.fields.some((entry) => entry.descriptor.id === id && (entry.blockingErrors.length || entry.warnings.length || entry.renderValidation.state === "invalid"));
  const coverageFor = (id: string) => family?.variants.filter((entry) => entry.packageValue.editableFields.some((candidate) => candidate.id === id)) ?? [];
  const matchesFilter = (id: string, value: Filter) => value === "all" || fieldFor(id)?.type === value;
  const visibleOrder = order.filter((id) => id === correctionTarget?.fieldId || id === revealedField || matchesFilter(id, filter));
  const filterOptions: Filter[] = ["all", ...(["text", "textarea", "number", "date", "color", "image", "boolean"] as const).filter(type => fields.some(field => field.type === type))];
  const displayLabel = (field: TemplateFieldConfigurationV2) => { const label = readableFieldLabel(field); return fields.filter(other => readableFieldLabel(other) === label).length > 1 ? `${label} · ${typeLabel(field.type)} · ${field.id}` : label; };
  const filterCounts = Object.fromEntries(filterOptions.map(value => [value, order.filter(id => matchesFilter(id, value)).length])) as Record<Filter, number>;
  const focusField = (id: string) => queueMicrotask(() => requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-field-id="${CSS.escape(id)}"] .field-rule-card__select`)?.focus()));

  useEffect(() => {
    if (!correctionTarget) return;
    setFilter("all");
    setRevealedField(correctionTarget.fieldId);
    setScope(correctionTarget.scope);
    setEditing(correctionTarget.fieldId);
    onSelect(correctionTarget.fieldId);
    setAnnouncement(`Opened ${fieldFor(correctionTarget.fieldId)?.label ?? correctionTarget.fieldId} from Checks.`);
    onCorrectionHandled?.();
  }, [correctionTarget?.key]);
  useEffect(() => {
    if (!visibleOrder.length || (selected && visibleOrder.includes(selected))) return;
    onSelect(visibleOrder[0]);
    setAnnouncement(`${visibleOrder.length} fields shown. Selected ${fieldFor(visibleOrder[0])?.label ?? visibleOrder[0]}.`);
  }, [filter, scope, visibleOrder.join("|")]);
  const configure = (field: TemplateFieldConfigurationV2, override?: TemplateFieldFamilyVariantFieldOverrideV2) => {
    if ("selectVariant" in session && variant && scope === "variant") session.configure({ variants: [{ id: variant.id, editableFieldOrder: variant.editableFieldOrder, fieldOverrides: { ...variant.fieldOverrides, [field.id]: override! } }] });
    else session.configure({ fields: [field] });
    setAcceptedChanges(true); setError(null); setAnnouncement(`${field.label ?? field.id} changes applied.`); onAccepted(); focusField(field.id);
  };
  const toggleField = async (id: string) => {
    if (editing === id) {
      if (fieldEdits?.dirty && !await fieldEdits.request()) return;
      setEditing(null); setAnnouncement(`${fieldFor(id)?.label ?? id} collapsed.`); return;
    }
    if (fieldEdits?.dirty && !await fieldEdits.request()) return;
    onSelect(id); setEditing(id); setAnnouncement(`Editing ${fieldFor(id)?.label ?? id}.`);
  };
  // Scope and preview change together, only after the current field transaction resolves.
  const changeScope = async (next: string) => {
    const id = next === "common" ? family?.variants[0]?.id : next.slice("design:".length);
    if (fieldEdits?.dirty && !await fieldEdits.request()) return;
    if (id && !await onSelectVariant(id)) return;
    setScope(next === "common" ? "common" : "variant");
    setRevealedField(null);
    setAnnouncement(next === "common" ? "Showing rules for all designs." : "Showing rules for the selected design.");
  };
  const move = async (id: string, targetIndex: number) => {
    if (fieldEdits?.dirty && !await fieldEdits.request()) return;
    const next = [...order]; const index = next.indexOf(id); const target = Math.max(0, Math.min(next.length - 1, targetIndex));
    if (index < 0 || target === index) return;
    next.splice(index, 1); next.splice(target, 0, id);
    try {
      if ("selectVariant" in session && variant && scope === "variant") session.configure({ variants: [{ id: variant.id, fieldOverrides: variant.fieldOverrides, editableFieldOrder: next }] });
      else session.configure({ editableFieldOrder: next });
      setUndo({ before: [...order], after: [...next], variantId: scope === "variant" ? variant?.id : undefined }); setAcceptedChanges(true);
      const label = fieldFor(id) ? displayLabel(fieldFor(id)!) : id; setAnnouncement(`${label} moved to position ${target + 1} of ${order.length}.`);
      queueMicrotask(() => requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-field-reorder-key="${CSS.escape(id)}"]`)?.focus()));
      setError(null); onAccepted();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const undoOrder = async () => {
    if (!undo || (fieldEdits?.dirty && !await fieldEdits.request())) return;
    try {
      const current = session.getSnapshot();
      const target = "family" in current ? current.family?.variants.find(design => design.id === undo.variantId) : undefined;
      const currentOrder = "family" in current ? undo.variantId ? current.effectivePackage?.editableFieldOrder : current.family?.editableFieldOrder : current.basePackage?.editableFieldOrder;
      if (JSON.stringify(currentOrder) !== JSON.stringify(undo.after) || new Set(undo.before).size !== undo.before.length || undo.before.some(id => !currentOrder?.includes(id))) throw new Error("Field order changed. Undo is no longer available.");
      if ("selectVariant" in session && target) session.configure({ variants: [{ id: target.id, fieldOverrides: target.fieldOverrides, editableFieldOrder: undo.before }] });
      else session.configure({ editableFieldOrder: undo.before });
      setUndo(null); setAcceptedChanges(true); setError(null); setAnnouncement("Previous field order restored."); onAccepted();
    } catch (cause) { setUndo(null); setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const drop = (event: DragEvent<HTMLElement>, id: string) => { event.preventDefault(); if (filter === "all" && dragged && dragged !== id) void move(dragged, order.indexOf(id)); setDragged(null); setDropTarget(null); };
  const scopeControl = family ? <Select label="Settings for" value={scope === "common" ? "common" : `design:${variant?.id}`} onChange={event => void changeScope(event.target.value)}><option value="common">All designs</option>{family.variants.map(design => <option key={design.id} value={`design:${design.id}`}>{variantDisplayLabels[design.id] ?? design.label ?? design.id}</option>)}</Select> : null;
  const changeFilter = async (next: Filter) => {
    if (editing && !matchesFilter(editing, next) && fieldEdits?.dirty && !await fieldEdits.request()) return;
    if (editing && !matchesFilter(editing, next)) setEditing(null);
    setRevealedField(null); setFilter(next); setAnnouncement(`${filterCounts[next]} fields match ${next === "all" ? "All" : typeLabel(next)}.`);
  };

  return <section ref={root} className="studio-setup-fields studio-fields-list-view" aria-label="Field configuration">
    <p className="ui-visually-hidden" aria-live="polite">{announcement}</p>
    <SetupSectionHeader
      title="Editable fields"
      meta={<span className="ui-metadata">{order.length} {order.length === 1 ? "field" : "fields"}</span>}
    />
    {error ? <p role="alert">{error}</p> : null}

    <div className="studio-fields-toolbar">
      {scopeControl}
      {family && scope === "common" && selected && <Select label="Inspect design" value={variant?.id ?? ""} onChange={event => onInspectVariant?.(event.target.value)}>{coverageFor(selected).map(design => <option key={design.id} value={design.id}>{variantDisplayLabels[design.id] ?? design.label ?? design.packageValue.name}</option>)}</Select>}
      <p className="ui-metadata" role="status">{fieldEdits?.dirty ? "Unapplied changes" : acceptedChanges ? "Changes applied · Save in Review" : "Configuration unchanged"}</p>
      {undo && <Button size="small" variant="quiet" onClick={() => void undoOrder()}>Undo reorder</Button>}
      {filter !== "all" && <p className="ui-metadata">Show all to drag reorder. Menu actions use the full field order.</p>}
      <div className="studio-field-filter-row"><div className="studio-field-filter-select"><Select label="Field type" value={filter} onChange={event => void changeFilter(event.target.value as typeof filter)}>{filterOptions.map(value => <option key={value} value={value}>{value === "all" ? "All" : typeLabel(value)} · {filterCounts[value]}</option>)}</Select></div><div className="studio-field-filters" aria-label="Field filters">{filterOptions.map((value) => <FilterChip key={value} selected={filter === value} count={filterCounts[value]} label={value === "all" ? "All" : typeLabel(value)} onClick={() => void changeFilter(value)} />)}</div>
      </div>
    </div>
    <div role="list" aria-label="Editable fields" className="studio-field-rule-list studio-field-rule-list--cards">{visibleOrder.map((id) => {
      const index = order.indexOf(id); const field = fieldFor(id); if (!field) return null;
      const coverage = coverageFor(id); const override = variant?.fieldOverrides?.[id]; const attention = hasAttention(id); const fieldPresent = packageValue.editableFields.some((entry) => entry.id === id);
      const expanded = editing === id;
      const hasOverrides = Boolean(override && (Object.keys(override.configuration ?? {}).length || "label" in override || "controlRole" in override));
      return <FieldRuleCardShell key={id} fieldId={id} identity={field.id} title={displayLabel(field)} typeLabel={typeLabel(field.type)} summary={ruleSummary(field, scope === "variant" ? override : undefined, attention, packageValue.editableFields.find(source => source.id === id)?.defaultValue)} selected={selected === id} expanded={expanded} configurable
        statuses={[...(attention ? [{ label: "Needs attention", tone: "attention" as const }] : []),  ...(scope === "variant" && (!fieldPresent || hasOverrides) ? [{ label: fieldPresent ? "Overridden" : "Unavailable", tone: fieldPresent ? "neutral" as const : "attention" as const }] : [])]}
        onSelect={() => void toggleField(id)} reorderLabel={order.length > 1 && filter === "all" ? `Reorder ${field.label ?? id}` : undefined}
        onDragStart={order.length > 1 && filter === "all" ? (event) => { setDragged(id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", id); } : undefined} onDragEnd={() => { setDragged(null); setDropTarget(null); }} onDragOver={(event) => { event.preventDefault(); setDropTarget(id); }} onDrop={(event) => drop(event, id)} dropBefore={dropTarget === id && dragged !== id}
        reorderActions={order.length > 1 ? <Menu label={<MoreHorizontal size={18} />} accessibleLabel={`Reorder options for ${field.label ?? id}`}>{index > 0 && <MenuItem onClick={() => void move(id, index - 1)}>Before {displayLabel(fieldFor(order[index - 1])!)} · position {index}</MenuItem>}{index < order.length - 1 && <MenuItem onClick={() => void move(id, index + 1)}>After {displayLabel(fieldFor(order[index + 1])!)} · position {index + 2}</MenuItem>}{index > 0 && <MenuItem onClick={() => void move(id, 0)}>Move to first · position 1</MenuItem>}{index < order.length - 1 && <MenuItem onClick={() => void move(id, order.length - 1)}>Move to last · position {order.length}</MenuItem>}</Menu> : undefined}
        content={<>
        {family && <details className="studio-field-coverage"><summary>Used in {coverage.length === 1 ? variantDisplayLabels[coverage[0].id] ?? coverage[0].label : `${coverage.length} designs`}</summary>{coverage.map(design => <Button key={design.id} size="small" variant="quiet" onClick={() => scope === "common" ? onInspectVariant?.(design.id) : void changeScope(`design:${design.id}`)}>{variantDisplayLabels[design.id] ?? design.label ?? design.packageValue.name}</Button>)}</details>}
        {scope === "common" && issues.filter(issue => issue.fieldId === id).map((issue, index) => <p className="ui-field__error" key={`${issue.variantId}:${issue.code}:${index}`}><Button size="small" variant="quiet" onClick={() => { if (issue.variantId) void changeScope(`design:${issue.variantId}`); }}>{issue.design}</Button>: {issue.message}</p>)}
        {expanded && (fieldPresent || scope === "common") ? <FieldConfigurationEditorV2 key={`${scope}:${scope === "variant" ? variant?.id : "common"}:${field.id}:${JSON.stringify(field)}:${scope === "variant" ? JSON.stringify(override) : ""}`} field={field} choiceSources={choiceContexts[field.id]} authoringContext={authoringContext} exampleSource={choiceContexts[field.id]?.find(source => source.design === (variant?.label ?? packageValue.name)) ?? choiceContexts[field.id]?.[0]} inheritedField={family?.fields.find((entry) => entry.id === field.id)} variant={Boolean(family && scope === "variant")} override={scope === "variant" ? override : undefined} onSave={configure} onCancel={() => { setAnnouncement(`${field.label ?? field.id} changes discarded.`); focusField(field.id); }} /> : expanded ? <div className="studio-fields-empty studio-fields-empty--inline"><Status tone="attention">Unavailable in this design</Status><p>This field is not part of the selected design. Its shared configuration is still available.</p><Button variant="secondary" onClick={() => void changeScope("common")}>Edit for all designs</Button></div> : null}</>} />;
    })}</div>
    {!visibleOrder.length ? <div className="studio-fields-empty"><h2>No matching fields</h2><p>Choose another field type or show all fields.</p><Button variant="secondary" onClick={() => { setFilter("all"); setRevealedField(null); setAnnouncement("Filters cleared."); }}>Clear filters</Button></div> : null}
  </section>;
}

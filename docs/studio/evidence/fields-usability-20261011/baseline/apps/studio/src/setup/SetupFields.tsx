import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { MoreHorizontal } from "lucide-react";
import type { TemplateFieldConfigurationV2 } from "@sleinity/template-core";
import { type TemplateFieldFamilyVariantFieldOverrideV2 } from "@sleinity/template-core/family";
import { useTemplateFieldSessionV2Snapshot, type ReactTemplateFieldSessionV2 } from "@sleinity/template-react";
import { Button, FilterChip, Menu, MenuItem, Select, Status } from "../components/ui";
import { FieldRuleCardShell } from "../components/template-package/editor/FieldRuleCardShell";
import { choiceAuthoringSources } from "../field-rules/choiceAuthoring";
import { FieldConfigurationEditorV2 } from "../field-rules/FieldConfigurationEditorV2";
import { useSetupEditGuard } from "./SetupEditGuard";
import { studioVariantDisplayLabels } from "./setupSources";
import { SetupSectionHeader } from "./SetupPagePrimitives";

const typeLabel = (value: string) => value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
export const ruleSummary = (field: TemplateFieldConfigurationV2, override?: TemplateFieldFamilyVariantFieldOverrideV2, attention = false) => {
  if (attention) return "Needs attention";
  const configuration = { ...field.configuration, ...override?.configuration } as Record<string, unknown>;
  const choices = configuration.choices as { options?: unknown[] } | undefined;
  if (choices?.options?.length) return `${choices.options.length} ${choices.options.length === 1 ? "choice" : "choices"}`;
  if (configuration.replacementPlacement) return `${typeLabel(String(configuration.replacementPlacement))} on upload`;
  if (configuration.maxCharacters != null) return `${configuration.maxCharacters} characters maximum`;
  if (configuration.maxLines != null) return `${configuration.maxLines} rendered lines maximum`;
  if (configuration.format) return "Display format configured";
  if (configuration.min != null || configuration.max != null) return "Number range configured";
  return "Imported settings";
};

export type SetupFieldCorrectionTarget = { key: number; fieldId: string; variantId?: string; scope: "common" | "variant" };
type Filter = "all" | TemplateFieldConfigurationV2["type"];

export function SetupFields({ session, active, onSelectVariant, selected, correctionTarget, onCorrectionHandled, onSelect, onAccepted }: {
  session: ReactTemplateFieldSessionV2;
  active: boolean;
  onSelectVariant(id: string): Promise<boolean>;
  selected: string | null;
  correctionTarget?: SetupFieldCorrectionTarget | null;
  onCorrectionHandled?(): void;
  onSelect(id: string): void;
  onAccepted(): void;
}) {
  const root = useRef<HTMLElement>(null);
  const fieldEdits = useSetupEditGuard();
  const snapshot = useTemplateFieldSessionV2Snapshot(session);
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
  if (!packageValue) return null;
  const fields = family && scope === "common" ? family.fields : packageValue.editableFields;
  const order = family && scope === "common" ? family.editableFieldOrder : packageValue.editableFieldOrder;
  const fieldFor = (id: string) => fields.find((entry) => entry.id === id) ?? family?.fields.find((entry) => entry.id === id);
  const hasAttention = (id: string) => snapshot.fields.some((entry) => entry.descriptor.id === id && (entry.blockingErrors.length || entry.warnings.length || entry.renderValidation.state === "invalid"));
  const coverageFor = (id: string) => family?.variants.filter((entry) => entry.packageValue.editableFields.some((candidate) => candidate.id === id)) ?? [];
  const matchesFilter = (id: string, value: Filter) => value === "all" || fieldFor(id)?.type === value;
  const visibleOrder = order.filter((id) => id === correctionTarget?.fieldId || id === revealedField || matchesFilter(id, filter));
  const filterOptions: Filter[] = ["all", ...Array.from(new Set(fields.map(field => field.type)))];
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
    setError(null); setAnnouncement(`${field.label ?? field.id} changes applied.`); onAccepted(); focusField(field.id);
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
  useEffect(() => {
    if (!active || !family || correctionTarget || scope !== "common") return;
    const first = family.variants[0]?.id;
    if (first && variant?.id !== first) void onSelectVariant(first);
  }, [active, scope, family?.variants[0]?.id, correctionTarget?.key]);
  const move = async (id: string, targetIndex: number) => {
    const next = [...order]; const index = next.indexOf(id); const target = Math.max(0, Math.min(next.length - 1, targetIndex));
    if (index < 0 || target === index) return;
    next.splice(index, 1); next.splice(target, 0, id);
    try {
      if ("selectVariant" in session && variant && scope === "variant") session.configure({ variants: [{ id: variant.id, fieldOverrides: variant.fieldOverrides, editableFieldOrder: next }] });
      else session.configure({ editableFieldOrder: next });
      const label = fieldFor(id)?.label ?? id; setAnnouncement(`${label} moved to position ${target + 1} of ${order.length}.`);
      queueMicrotask(() => requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-field-reorder-key="${CSS.escape(id)}"]`)?.focus()));
      setError(null); onAccepted();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  const drop = (event: DragEvent<HTMLElement>, id: string) => { event.preventDefault(); if (dragged && dragged !== id) void move(dragged, order.indexOf(id)); setDragged(null); setDropTarget(null); };
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
      <div className="studio-field-filter-row"><div className="studio-field-filters" aria-label="Field filters">{filterOptions.map((value) => <FilterChip key={value} selected={filter === value} count={filterCounts[value]} label={value === "all" ? "All" : typeLabel(value)} onClick={() => void changeFilter(value)} />)}</div>
      </div>
    </div>
    <div role="list" aria-label="Editable fields" className="studio-field-rule-list studio-field-rule-list--cards">{visibleOrder.map((id) => {
      const index = order.indexOf(id); const field = fieldFor(id); if (!field) return null;
      const coverage = coverageFor(id); const override = variant?.fieldOverrides?.[id]; const attention = hasAttention(id); const fieldPresent = packageValue.editableFields.some((entry) => entry.id === id);
      const expanded = editing === id;
      return <FieldRuleCardShell key={id} fieldId={id} identity={field.id} title={field.label ?? id} typeLabel={typeLabel(field.type)} summary={ruleSummary(field, scope === "variant" ? override : undefined, attention)} selected={selected === id} expanded={expanded} configurable
        statuses={[...(attention ? [{ label: "Needs attention", tone: "attention" as const }] : []), ...(family && coverage.length !== family.variants.length ? [{ label: `${coverage.length}/${family.variants.length} designs`, tone: "neutral" as const }] : []), ...(scope === "variant" ? [{ label: fieldPresent ? override ? "Overridden" : "Inherited" : "Unavailable", tone: fieldPresent ? "neutral" as const : "attention" as const }] : [])]}
        onSelect={() => void toggleField(id)} reorderLabel={order.length > 1 ? `Reorder ${field.label ?? id}` : undefined}
        onDragStart={order.length > 1 ? (event) => { setDragged(id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", id); } : undefined} onDragEnd={() => { setDragged(null); setDropTarget(null); }} onDragOver={(event) => { event.preventDefault(); setDropTarget(id); }} onDrop={(event) => drop(event, id)} dropBefore={dropTarget === id && dragged !== id}
        reorderActions={order.length > 1 ? <Menu label={<MoreHorizontal size={18} />} accessibleLabel={`Reorder options for ${field.label ?? id}`}>{index > 0 && <MenuItem onClick={() => void move(id, index - 1)}>Move up</MenuItem>}{index < order.length - 1 && <MenuItem onClick={() => void move(id, index + 1)}>Move down</MenuItem>}{index > 0 && <MenuItem onClick={() => void move(id, 0)}>Move to top</MenuItem>}{index < order.length - 1 && <MenuItem onClick={() => void move(id, order.length - 1)}>Move to bottom</MenuItem>}</Menu> : undefined}
        content={expanded && (fieldPresent || scope === "common") ? <FieldConfigurationEditorV2 key={`${scope}:${variant?.id}:${field.id}:${JSON.stringify(field)}:${JSON.stringify(override)}`} field={field} choiceSources={choiceAuthoringSources(field.id, packageValue.editableFields, family, scope === "variant" ? variant?.id : undefined)} inheritedField={family?.fields.find((entry) => entry.id === field.id)} variant={Boolean(family && scope === "variant")} override={override} onSave={configure} onCancel={() => { setAnnouncement(`${field.label ?? field.id} changes discarded.`); focusField(field.id); }} /> : expanded ? <div className="studio-fields-empty studio-fields-empty--inline"><Status tone="attention">Unavailable in this design</Status><p>This field is not part of the selected design. Its shared configuration is still available.</p><Button variant="secondary" onClick={() => void changeScope("common")}>Edit for all designs</Button></div> : null} />;
    })}</div>
    {!visibleOrder.length ? <div className="studio-fields-empty"><h2>No matching fields</h2><p>Choose another field type or show all fields.</p><Button variant="secondary" onClick={() => { setFilter("all"); setRevealedField(null); setAnnouncement("Filters cleared."); }}>Clear filters</Button></div> : null}
  </section>;
}

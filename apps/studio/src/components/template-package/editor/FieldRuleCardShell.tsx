import { ChevronDown, GripVertical } from "lucide-react";
import type {
  DragEventHandler,
  ReactNode,
} from "react";
import { Status, type StatusTone } from "../../ui";

export interface FieldRuleCardStatus {
  label: string;
  tone: StatusTone;
}

export function FieldRuleCardShell({
  fieldId,
  identity,
  title,
  summary,
  typeLabel,
  selected,
  expanded,
  configurable = true,
  selectable = true,
  statuses = [],
  onSelect,
  content,
  reorderLabel,
  onDragStart,
  onDragEnd,
  reorderActions,
  onDragOver,
  onDrop,
  dropBefore = false,
}: {
  fieldId: string;
  identity?: string;
  title: string;
  summary: string;
  typeLabel: string;
  selected: boolean;
  expanded: boolean;
  configurable?: boolean;
  selectable?: boolean;
  statuses?: FieldRuleCardStatus[];
  onSelect: () => void;
  content?: ReactNode;
  reorderLabel?: string;
  onDragStart?: DragEventHandler<HTMLElement>;
  onDragEnd?: DragEventHandler<HTMLElement>;
  reorderActions?: ReactNode;
  onDragOver?: DragEventHandler<HTMLElement>;
  onDrop?: DragEventHandler<HTMLElement>;
  dropBefore?: boolean;
}) {
  const summaryContent = (
    <>
      <span className="min-w-0 text-left">
        <span className="block truncate font-medium" title={typeof title === "string" ? title : undefined}>{title}</span>
        <span className="mt-1 block text-xs font-normal text-content-muted">{summary}</span>
      </span>
      <span className="field-rule-card__summary-meta">
        {statuses.map((status) => (
          status.tone === "neutral" ? <span key={`${status.tone}:${status.label}`} className="field-rule-card__metadata">{status.label}</span> : <Status key={`${status.tone}:${status.label}`} tone={status.tone}>{status.label}</Status>
        ))}
        <span className="field-rule-card__type">{typeLabel}</span>
        {configurable ? <ChevronDown className="field-rule-card__chevron" aria-hidden="true" size={18} /> : null}
      </span>
    </>
  );
  return (
    <article
      role="listitem"
      className="field-rule-card"
      data-field-id={fieldId}
      data-selected={selected || undefined}
      data-expanded={expanded || undefined}
      data-drop-before={dropBefore || undefined}
      data-field-reorder-key={reorderLabel ? fieldId : undefined}
      tabIndex={reorderLabel ? -1 : undefined}
      draggable={Boolean(reorderLabel)}
      aria-label={reorderLabel}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="field-rule-card__summary">
        {reorderLabel ? (
          <span
            className="field-rule-card__drag-handle"
            aria-hidden="true"
          >
            <GripVertical aria-hidden="true" size={18} />
          </span>
        ) : <span className="field-rule-card__summary-spacer" />}
        {selectable ? (
          <button
            type="button"
            className="field-rule-card__select"
            aria-label={title}
            aria-description={`${identity ?? fieldId}. ${typeLabel}. ${summary}`}
            title={typeof title === "string" ? `${title} · ${identity ?? fieldId}` : identity ?? fieldId}
            aria-expanded={configurable ? expanded : undefined}
            aria-controls={configurable ? `field-rules-${fieldId}` : undefined}
            aria-pressed={selected}
            onClick={onSelect}
          >
            {summaryContent}
          </button>
        ) : (
          <div className="field-rule-card__select">{summaryContent}</div>
        )}
        <div className="field-rule-card__reorder-actions">{reorderActions}</div>
      </div>
      {expanded && configurable ? (
        <div id={`field-rules-${fieldId}`} className="field-rule-card__content space-y-4" role="region" aria-label={`Configure ${typeof title === "string" ? title : fieldId}`}>
          {content}
        </div>
      ) : null}
    </article>
  );
}

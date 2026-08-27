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
  onDragStart?: DragEventHandler<HTMLButtonElement>;
  onDragEnd?: DragEventHandler<HTMLButtonElement>;
  reorderActions?: ReactNode;
  onDragOver?: DragEventHandler<HTMLElement>;
  onDrop?: DragEventHandler<HTMLElement>;
  dropBefore?: boolean;
}) {
  const summaryContent = (
    <>
      <span className="min-w-0 text-left">
        <span className="block truncate font-medium">{title}</span>
        <span className="mt-1 block text-xs font-normal text-content-muted">{summary}</span>
      </span>
      <span className="field-rule-card__summary-meta">
        {statuses.map((status) => (
          <Status key={`${status.tone}:${status.label}`} tone={status.tone}>
            {status.label}
          </Status>
        ))}
        <Status tone="neutral" className="field-rule-card__type">{typeLabel}</Status>
        {configurable ? <ChevronDown className="field-rule-card__chevron" aria-hidden="true" size={18} /> : null}
      </span>
    </>
  );
  return (
    <article
      role="listitem"
      className="field-rule-card"
      data-selected={selected || undefined}
      data-expanded={expanded || undefined}
      data-drop-before={dropBefore || undefined}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="field-rule-card__summary">
        {reorderLabel ? (
          <button
            type="button"
            className="field-rule-card__drag-handle"
            draggable
            data-field-reorder-key={fieldId}
            aria-label={reorderLabel}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <GripVertical aria-hidden="true" size={18} />
          </button>
        ) : <span className="field-rule-card__summary-spacer" />}
        {selectable ? (
          <button
            type="button"
            className="field-rule-card__select"
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
        <div id={`field-rules-${fieldId}`} className="field-rule-card__content space-y-4">
          {content}
        </div>
      ) : null}
    </article>
  );
}

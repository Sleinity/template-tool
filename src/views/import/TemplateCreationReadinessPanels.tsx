import type {
  FieldConstraintSummary,
  TemplateCreationBlocker,
  TemplateCreationGate,
} from "../../template-package/import";

interface TemplateCreationReadinessPanelProps {
  gate: TemplateCreationGate;
  onFocusBlocker: (blocker: TemplateCreationBlocker) => void;
}

export function TemplateCreationReadinessPanel({
  gate,
  onFocusBlocker,
}: TemplateCreationReadinessPanelProps) {
  if (!gate.blockers.length) {
    return (
      <p
        id="template-creation-status"
        data-testid="template-creation-ready"
        className="rounded-lg border border-[var(--color-status-repaired-border)] bg-[var(--color-status-repaired-bg)] px-4 py-3 text-sm text-[var(--color-status-repaired-fg)]"
      >
        Ready to add. Any export-only issues below can be fixed while editing.
      </p>
    );
  }

  return (
    <section
      id="template-creation-status"
      data-testid="template-creation-blockers"
      aria-labelledby="template-creation-blockers-title"
      className="rounded-lg border border-[var(--color-status-blocked-border)] bg-[var(--color-status-blocked-bg)] p-5"
    >
      <h2
        id="template-creation-blockers-title"
        className="text-sm font-semibold text-[var(--color-status-blocked-fg)]"
      >
        Before this template can be added
      </h2>
      <ul className="mt-3 space-y-3">
        {gate.blockers.map((blocker) => (
          <li
            key={`${blocker.code}:${blocker.fieldId ?? ""}:${blocker.nodeId ?? ""}`}
            className="rounded-lg border border-line-subtle bg-surface-interactive px-4 py-3"
          >
            <p className="text-sm font-medium text-content-primary">
              {blocker.message}
            </p>
            <p className="mt-1 text-xs leading-5 text-content-secondary">
              {blocker.suggestion}
            </p>
            {blocker.code !== "template-save-in-progress" &&
            blocker.code !== "diagnostics-refreshing" ? (
              <button
                type="button"
                onClick={() => onFocusBlocker(blocker)}
                className="mt-2 text-xs font-semibold text-content-primary underline decoration-white/25 underline-offset-2"
              >
                {blocker.code === "template-name-required"
                  ? "Enter template name"
                  : blocker.code === "original-package-missing"
                    ? "Return to package setup"
                    : "Open blocking issue"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface FieldExportReadinessPanelProps {
  summaries: FieldConstraintSummary[];
  onFocusField: (fieldId: string, nodeId: string) => void;
}

export function FieldExportReadinessPanel({
  summaries,
  onFocusField,
}: FieldExportReadinessPanelProps) {
  if (!summaries.length) return null;

  const exportBlockerCount = summaries.filter(
    (item) => item.blocksExport,
  ).length;

  return (
    <section
      data-testid="template-field-export-readiness"
      aria-labelledby="template-field-export-readiness-title"
      className="rounded-lg border border-[var(--color-status-attention-border)] bg-[var(--color-status-attention-bg)] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="template-field-export-readiness-title"
            className="text-sm font-semibold text-[var(--color-status-attention-fg)]"
          >
            Fields needing attention
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--color-status-attention-fg)]">
            You can add the template now, but these values may prevent a complete export.
          </p>
        </div>
        <span className="rounded-full border border-[var(--color-status-attention-border)] bg-surface-interactive px-2.5 py-1 text-[11px] font-medium text-[var(--color-status-attention-fg)]">
          {exportBlockerCount} blocked · {summaries.length - exportBlockerCount}{" "}
          need attention
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {summaries.map((item) => (
          <li
            key={`${item.code}:${item.fieldId}:${item.nodeId}`}
            className="rounded-lg border border-line-subtle bg-surface-interactive p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-content-primary">
                  {item.fieldLabel}
                </p>
              </div>
              <span className="rounded-full border border-line-subtle px-2 py-1 text-[10px] font-medium uppercase text-content-secondary">
                {item.blocksExport ? "Blocked" : "Needs attention"}
              </span>
            </div>
            <p className="mt-3 text-sm text-content-primary">{item.message}</p>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-content-muted">Current value</dt>
                <dd className="mt-1 break-words text-content-primary">
                  {item.currentValue}
                </dd>
              </div>
              <div>
                <dt className="text-content-muted">Requirement</dt>
                <dd className="mt-1 text-content-primary">{item.requirement}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-content-secondary">
              Suggested action: {item.repair}
            </p>
            <button
              type="button"
              onClick={() => onFocusField(item.fieldId, item.nodeId)}
              className="mt-2 text-xs font-semibold text-content-primary underline decoration-white/25 underline-offset-2"
            >
              Configure field
            </button>
            <details className="mt-3 border-t border-line-subtle pt-2">
              <summary className="cursor-pointer text-[11px] text-content-muted">
                Technical details
              </summary>
              <p className="mt-2 font-mono text-[10px] text-content-muted">
                {item.code} · {item.fieldId} · {item.nodeName} · {item.nodeId}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

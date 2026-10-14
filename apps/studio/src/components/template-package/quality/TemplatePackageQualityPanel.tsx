import { ChevronDown, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, ConnectedList, ConnectedListItem, FilterChip, Input, Select, Status, type StatusTone } from "../../ui";
import {
  filterPackageQualityIssues,
  getPackageQualityAreaCounts,
  getPackageQualityPrimaryTarget,
  getPackageQualityTechnicalOptions,
  getPackageQualityWorkspaceCounts,
  getPreferredPackageQualitySelection,
  groupPackageQualityIssues,
  packageQualityAreaLabels,
  packageQualityCategoryLabels,
  visiblePackageQualitySelection,
  type PackageQualityAreaFilter,
  type PackageQualityIssueGroup,
  type PackageQualitySeverityFilter,
} from "@sleinity/template-react/inspection";
import type { PackageQualityHealth, PackageQualityIssue, PackageQualityReport } from "@sleinity/template-react/inspection";
import {
  diagnosticPresentationLabels,
  getDiagnosticFriendlyTarget,
  getDiagnosticPresentation,
  getDiagnosticPresentationState,
  getPackageQualityIssueTitle,
} from "@sleinity/template-react/inspection";

interface TemplatePackageQualityPanelProps {
  compact?: boolean;
  scopeControl?: ReactNode;
  renderIssueDetails?: (issue: PackageQualityIssue) => ReactNode;
  selectionPending?: boolean;
  selectionDisabled?: boolean;
  report: PackageQualityReport;
  evidenceStates?: Partial<Record<keyof PackageQualityReport["health"], string>>;
  selectedIssueId?: string | null;
  onSelectIssue?: (issue: PackageQualityIssue | null) => void;
}

const healthStatusTone: Record<PackageQualityHealth, StatusTone> = {
  ready: "repaired",
  review: "attention",
  blocked: "blocked",
};

const healthLabels: Record<PackageQualityHealth, string> = {
  ready: "Ready",
  review: "Needs attention",
  blocked: "Blocked",
};

function presentationLabel(state: keyof typeof diagnosticPresentationLabels): string {
  return state === "review" ? "Needs attention" : diagnosticPresentationLabels[state];
}

const presentationDot = {
  blocked: "bg-[var(--color-status-blocked-icon)]",
  review: "bg-[var(--color-status-attention-icon)]",
  repaired: "bg-[var(--color-status-repaired-icon)]",
  information: "bg-[var(--color-status-info-icon)]",
};

function statusTone(issue: PackageQualityIssue): StatusTone {
  const state = getDiagnosticPresentationState(issue);
  return state === "blocked"
    ? "blocked"
    : state === "review"
      ? "attention"
      : state === "repaired"
        ? "repaired"
        : "info";
}

function ReadinessButton({
  label,
  value,
  active,
  onClick,
  evidenceState,
}: {
  evidenceState?: string;
  label: string;
  value: PackageQualityHealth;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="package-quality-readiness"
      data-active={active ? "true" : "false"}
    >
      <span>{label}</span>
      {value === "ready" && !evidenceState
        ? <span className="package-quality-readiness__state">Ready</span>
        : <Status tone={value === "blocked" ? "blocked" : evidenceState ? "attention" : healthStatusTone[value]}>{value === "blocked" ? healthLabels[value] : evidenceState ?? healthLabels[value]}</Status>}
    </button>
  );
}

function FilterButton({
  active,
  label,
  count,
  onClick,
  disabled,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <FilterChip
      selected={active}
      label={label}
      count={count}
      onClick={onClick}
      disabled={disabled}
    />
  );
}

function GroupRow({
  group,
  compact = false,
  expanded,
  selectedIssueId,
  onToggle,
  onSelect,
  renderIssueDetails,
  selectionDisabled,
}: {
  renderIssueDetails?: (issue: PackageQualityIssue) => ReactNode;
  selectionDisabled?: boolean;
  group: PackageQualityIssueGroup;
  compact?: boolean;
  expanded: boolean;
  selectedIssueId: string | null;
  onToggle: () => void;
  onSelect: (issue: PackageQualityIssue) => void;
}) {
  const issue =
    group.issues.find((instance) => instance.id === selectedIssueId) ?? group.primaryIssue;
  const selected = group.issues.some((instance) => instance.id === selectedIssueId);
  const presentation = getDiagnosticPresentation(issue);
  const target = getDiagnosticFriendlyTarget(issue) ?? getPackageQualityPrimaryTarget(issue);
  const state = getDiagnosticPresentationState(issue);
  return (
    <ConnectedListItem
      data-testid="quality-issue-group"
      selected={selected}
      tone={state === "blocked" ? "blocked" : state === "review" ? "attention" : "neutral"}
      className="package-quality-issue-group"
    >
      <div className="package-quality-issue-group__layout">
        <button
          type="button"
          disabled={selectionDisabled}
          aria-pressed={renderIssueDetails ? undefined : selected}
          aria-expanded={renderIssueDetails ? selected : undefined}
          aria-controls={renderIssueDetails ? `issue-details-${group.id}` : undefined}
          onClick={() => onSelect(issue)}
          className="package-quality-issue-group__select"
          data-inline={Boolean(renderIssueDetails)}
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${presentationDot[state]}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-sm font-semibold text-content-primary">
                  {getPackageQualityIssueTitle(issue)}
                </span>
                <Status tone={statusTone(issue)}>{compact && state === "review" ? "Warning" : compact && state === "blocked" ? "Action required" : presentationLabel(state)}</Status>
              </div>
              <p className={`mt-1 ${renderIssueDetails ? "" : "line-clamp-1"} text-sm text-content-secondary`}>
                {presentation.userImpact ?? presentation.userSummary}
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-content-muted">
                {typeof issue.details?.variantLabel === "string" ? <span>{issue.details.variantLabel}</span> : null}
                {target ? <span className="truncate">{target}</span> : null}
                <span>{packageQualityCategoryLabels[issue.category]}</span>
                {group.issues.length > 1 ? (
                  <span className="shrink-0">{group.issues.length} affected</span>
                ) : null}
              </div>
            </div>
          </div>
          {renderIssueDetails && <ChevronDown aria-hidden="true" size={16} className={selected ? "rotate-180" : undefined} />}
        </button>
        {!renderIssueDetails && group.issues.length > 1 ? (
          <button
            type="button"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${getPackageQualityIssueTitle(issue)} instances`}
            aria-expanded={expanded}
            onClick={onToggle}
            className="package-quality-issue-group__expand"
          >
            <ChevronDown
              aria-hidden="true"
              size={15}
              className={`mx-auto transition ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        ) : null}
      </div>
      {expanded && group.issues.length > 1 ? (
        <div data-testid="quality-group-instances" className="border-t border-line-subtle px-3 py-2">
          {group.issues.map((instance, index) => (
            <button
              key={instance.id}
              type="button"
              disabled={selectionDisabled}
              aria-pressed={instance.id === selectedIssueId}
              onClick={() => onSelect(instance)}
              className={`flex w-full items-start gap-2 rounded-[var(--radius-control)] px-2 py-2 text-left text-sm ${
                instance.id === selectedIssueId
                  ? "bg-surface-hovered text-content-primary"
                  : "text-content-muted hover:bg-surface-secondary"
              }`}
            >
              <span className="shrink-0">{index + 1}.</span>
              <span className="min-w-0 truncate">
                {typeof instance.details?.variantLabel === "string" ? `${instance.details.variantLabel} · ` : ""}{getDiagnosticFriendlyTarget(instance) ?? getPackageQualityPrimaryTarget(instance) ?? getDiagnosticPresentation(instance).userSummary}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {renderIssueDetails && selected && <div id={`issue-details-${group.id}`} className="studio-check-issue-details">{renderIssueDetails(issue)}</div>}
    </ConnectedListItem>
  );
}

export function TemplatePackageQualityPanel({
  report,
  compact = false,
  scopeControl,
  renderIssueDetails,
  selectionPending = false,
  selectionDisabled = false,
  evidenceStates,
  selectedIssueId,
  onSelectIssue,
}: TemplatePackageQualityPanelProps) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<PackageQualitySeverityFilter>("unresolved");
  const [area, setArea] = useState<PackageQualityAreaFilter>("all");
  const [technical, setTechnical] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [internalSelection, setInternalSelection] = useState<string | null>(null);
  const activeSelection = selectedIssueId !== undefined ? selectedIssueId : internalSelection;

  const workspaceCounts = useMemo(
    () => getPackageQualityWorkspaceCounts(report.issues),
    [report.issues],
  );
  const areaCounts = useMemo(() => getPackageQualityAreaCounts(report.issues), [report.issues]);
  const technicalOptions = useMemo(
    () => getPackageQualityTechnicalOptions(report.issues),
    [report.issues],
  );
  const filtered = useMemo(
    () => filterPackageQualityIssues(report.issues, { query, severity, area, technical }),
    [area, query, report.issues, severity, technical],
  );
  const groups = useMemo(() => groupPackageQualityIssues(filtered).sort((a, b) => Number(getDiagnosticPresentationState(b.primaryIssue) === "blocked") - Number(getDiagnosticPresentationState(a.primaryIssue) === "blocked")), [filtered]);
  const allVisibleCount = useMemo(
    () =>
      filterPackageQualityIssues(report.issues, {
        query: "",
        severity: "all",
        area: "all",
        technical: "all",
      }).length,
    [report.issues],
  );
  const filtersActive = Boolean(query.trim() || area !== "all" || technical !== "all" || severity !== "unresolved");

  useEffect(() => {
    if (selectionPending || renderIssueDetails && !activeSelection) return;
    if (activeSelection && visiblePackageQualitySelection(activeSelection, filtered)) return;
    const next = renderIssueDetails ? null : getPreferredPackageQualitySelection(filtered);
    setInternalSelection(next?.id ?? null);
    onSelectIssue?.(next);
  }, [activeSelection, filtered, onSelectIssue, renderIssueDetails, selectionPending]);

  const selectIssue = (issue: PackageQualityIssue) => {
    const next = renderIssueDetails && activeSelection === issue.id ? null : issue;
    setInternalSelection(next?.id ?? null);
    onSelectIssue?.(next);
  };

  const resetFilters = () => {
    setQuery("");
    setSeverity("unresolved");
    setArea("all");
    setTechnical("all");
  };

  const technicalFilters = ((technicalOptions.layers.length > 0 || technicalOptions.origins.length > 0 || technicalOptions.capabilities.length > 0 || technicalOptions.regions.length > 0) ? (
          <details className="rounded-lg border border-line-subtle px-3 py-2">
            <summary className="cursor-pointer text-sm text-content-muted">Technical filters</summary>
            <Select label="Validation stage" value={technical} onChange={(event) => setTechnical(event.target.value)} className="mt-3">
              <option value="all">All validation stages</option>
              <optgroup label="Layers">
                {technicalOptions.layers.map((layer) => <option key={layer} value={`layer:${layer}`}>{layer}</option>)}
              </optgroup>
              <optgroup label="Origins">
                {technicalOptions.origins.map((origin) => <option key={origin} value={`origin:${origin}`}>{origin}</option>)}
              </optgroup>
              <optgroup label="Capabilities">
                {technicalOptions.capabilities.map((capability) => <option key={capability} value={`capability:${capability}`}>{capability}</option>)}
              </optgroup>
              <optgroup label="Regions">
                {technicalOptions.regions.map((region) => <option key={region} value={`region:${region}`}>{region}</option>)}
              </optgroup>
            </Select>
          </details>
        ) : null);
  const statusControl = (<Select label="Status" value={severity} onChange={event => setSeverity(event.target.value as PackageQualitySeverityFilter)}>
            <option value="unresolved">Needs review ({workspaceCounts.blockers + workspaceCounts.warnings})</option>
            <option value="blockers">Blocked ({workspaceCounts.blockers})</option>
            <option value="review">Warnings ({workspaceCounts.warnings})</option>
            <option value="repaired">Repaired ({workspaceCounts.repaired})</option>
            <option value="info">Information ({workspaceCounts.info})</option>
            <option value="all">All ({allVisibleCount})</option>
          </Select>);
  const statusTitle = report.status === "blocked" ? "Blocked" : report.status === "review" ? "Needs attention" : "Ready";
  return (
    <section data-testid="package-quality-report" className="package-quality-panel rounded-lg border border-line-subtle bg-surface-secondary p-5">
      {!compact && <div className="package-quality-panel__header">
        <Status tone={report.status === "blocked" ? "blocked" : Object.keys(evidenceStates ?? {}).length ? "attention" : healthStatusTone[report.status]}>{report.status === "blocked" ? statusTitle : Object.keys(evidenceStates ?? {}).length ? "Current evidence required" : statusTitle}{" · "}
          {workspaceCounts.blockers ? `${workspaceCounts.blockers} blocked · ` : ""}
          {workspaceCounts.warnings} {workspaceCounts.warnings === 1 ? "item needs" : "items need"} attention
          {workspaceCounts.repaired ? ` · ${workspaceCounts.repaired} repaired` : ""}
          {workspaceCounts.info ? ` · ${workspaceCounts.info} notes` : ""}
        </Status>
      </div>}


      <section className="studio-check-filters" aria-label="Filter issues">{!compact && <h3 className="ui-subsection-title">Filter issues</h3>}
      {!compact && <div className="package-quality-panel__health mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <ReadinessButton label="Import" value={report.health.import} evidenceState={evidenceStates?.import} active={area === "import"} onClick={() => setArea(area === "import" ? "all" : "import")} />
        <ReadinessButton label="Preview" value={report.health.fidelity} evidenceState={evidenceStates?.fidelity} active={area === "preview"} onClick={() => setArea(area === "preview" ? "all" : "preview")} />
        <ReadinessButton label="Media & fonts" value={report.health.assets} evidenceState={evidenceStates?.assets} active={area === "media" || area === "fonts"} onClick={() => setArea(area === "media" ? "fonts" : area === "fonts" ? "all" : "media")} />
        <ReadinessButton label="Fields" value={report.health.editability} evidenceState={evidenceStates?.editability} active={area === "fields"} onClick={() => setArea(area === "fields" ? "all" : "fields")} />
        <ReadinessButton label="Export" value={report.health.export} evidenceState={evidenceStates?.export} active={area === "export"} onClick={() => setArea(area === "export" ? "all" : "export")} />
      </div>}

      <div className="package-quality-panel__filters mt-4 space-y-3">
        <div className={compact && scopeControl ? "studio-check-filter-selects" : undefined}>
        {scopeControl}
        {renderIssueDetails && statusControl}
        {!renderIssueDetails && <Input
          label="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search issues"
        />}
        </div>

        {compact ? !renderIssueDetails && <div className="studio-check-filter-selects">
          {statusControl}
          {!renderIssueDetails && <Select label="Area" value={area} onChange={event => setArea(event.target.value as PackageQualityAreaFilter)}>
            <option value="all">All areas</option>
            {areaCounts.map(summary => <option key={summary.area} value={summary.area}>{packageQualityAreaLabels[summary.area]} ({summary.count})</option>)}
          </Select>}
        </div> : <>
        <div>
          <p className="ui-field-label mb-2">Status</p>
          <div className="flex flex-wrap gap-2" aria-label="Diagnostic status filters">
            {workspaceCounts.blockers > 0 ? (
              <FilterButton active={severity === "unresolved" || severity === "blockers"} label="Blocked" count={workspaceCounts.blockers} onClick={() => setSeverity("blockers")} />
            ) : null}
            <FilterButton active={severity === "unresolved" || severity === "review"} label="Needs attention" count={workspaceCounts.warnings} onClick={() => setSeverity("review")} />
            <FilterButton active={severity === "repaired"} label="Repaired" count={workspaceCounts.repaired} onClick={() => setSeverity("repaired")} />
            <FilterButton active={severity === "info"} label="Information" count={workspaceCounts.info} onClick={() => setSeverity("info")} />
            <FilterButton active={severity === "all"} label="All" count={allVisibleCount} onClick={() => setSeverity("all")} />
          </div>
        </div>

        <div>
          <p className="ui-field-label mb-2">Area</p>
          <div className="flex flex-wrap gap-2" aria-label="Diagnostic area filters">
            <FilterChip selected={area === "all"} label="All areas" onClick={() => setArea("all")} />
            {areaCounts.map((summary) => (
              <FilterChip
                key={summary.area}
                selected={area === summary.area}
                label={packageQualityAreaLabels[summary.area]}
                count={summary.count}
                onClick={() => setArea(area === summary.area ? "all" : summary.area)}
              />
            ))}
          </div>
        </div>

        </>}


        {!compact && technicalFilters}
      </div>

      </section>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-subtle pt-4">
        <p className="text-sm font-medium text-content-primary">{groups.length} {groups.length === 1 ? "finding" : "findings"}{filtered.length !== groups.length ? ` · ${filtered.length} locations` : ""}</p>
        {filtersActive ? <Button variant="quiet" size="small" leadingIcon={<RotateCcw size={14} />} onClick={resetFilters}>Reset filters</Button> : null}
      </div>

      <ConnectedList label="Check issues" className="package-quality-panel__issues" aria-live="polite">
        {groups.length > 0 ? groups.map((group) => (
          <GroupRow
            key={group.id}
            group={group}
            renderIssueDetails={renderIssueDetails}
            selectionDisabled={selectionDisabled}
            compact={compact}
            expanded={expandedGroups.has(group.id)}
            selectedIssueId={activeSelection}
            onToggle={() => setExpandedGroups((current) => {
              const next = new Set(current);
              if (next.has(group.id)) next.delete(group.id); else next.add(group.id);
              return next;
            })}
            onSelect={selectIssue}
          />
        )) : severity === "unresolved" && !query.trim() ? (
          <div className="package-quality-complete-state">
            <p className="font-medium text-content-primary">{Object.keys(evidenceStates ?? {}).length ? "Current checks required" : workspaceCounts.repaired > 0 ? "All review items resolved" : compact ? "No unresolved issues" : "Validation complete"}</p>
            <p className="mt-1 text-sm text-content-muted">{Object.keys(evidenceStates ?? {}).length ? "Current evidence is still required. Run checks to refresh the results." : workspaceCounts.repaired > 0 ? "Automatically repaired items and information remain available through the filters." : "No issues were found in the available evidence."}</p>
          </div>
        ) : (
          <div className="package-quality-empty-state">
            <p className="font-medium text-content-primary">No diagnostics match these filters</p>
            <Button variant="quiet" size="small" className="mt-2" onClick={resetFilters}>Reset filters</Button>
          </div>
        )}
      </ConnectedList>
      {compact && !renderIssueDetails && technicalFilters}
    </section>
  );
}

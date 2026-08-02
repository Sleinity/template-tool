import { ChevronDown, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, FilterChip, Input, Select, Status, type StatusTone } from "../../ui";
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
  report: PackageQualityReport;
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
  review: "Review",
  blocked: "Blocked",
};

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
}: {
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
      <Status tone={healthStatusTone[value]}>{healthLabels[value]}</Status>
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
  expanded,
  selectedIssueId,
  onToggle,
  onSelect,
}: {
  group: PackageQualityIssueGroup;
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
    <article
      data-testid="quality-issue-group"
      data-selected={selected ? "true" : "false"}
      className="package-quality-issue-group border-b border-line-subtle"
    >
      <div className="flex items-stretch">
        <button
          type="button"
          aria-pressed={selected}
          onClick={() => onSelect(issue)}
          className="min-w-0 flex-1 px-2 py-3 text-left hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-focus-ring)]"
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
                <Status tone={statusTone(issue)}>{diagnosticPresentationLabels[state]}</Status>
                <span className="text-xs text-content-muted">
                  {packageQualityCategoryLabels[issue.category]}
                </span>
              </div>
              <p className="mt-1 line-clamp-1 text-sm text-content-secondary">
                {presentation.userImpact ?? presentation.userSummary}
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-content-muted">
                {target ? <span className="truncate">{target}</span> : null}
                {group.issues.length > 1 ? (
                  <span className="shrink-0">{group.issues.length} affected</span>
                ) : null}
              </div>
            </div>
          </div>
        </button>
        {group.issues.length > 1 ? (
          <button
            type="button"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${getPackageQualityIssueTitle(issue)} instances`}
            aria-expanded={expanded}
            onClick={onToggle}
            className="w-11 shrink-0 text-content-muted hover:bg-surface-secondary hover:text-content-primary"
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
                {getDiagnosticFriendlyTarget(instance) ?? getPackageQualityPrimaryTarget(instance) ?? getDiagnosticPresentation(instance).userSummary}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function TemplatePackageQualityPanel({
  report,
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
  const groups = useMemo(() => groupPackageQualityIssues(filtered), [filtered]);
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
    if (activeSelection && visiblePackageQualitySelection(activeSelection, filtered)) return;
    const next = getPreferredPackageQualitySelection(filtered);
    setInternalSelection(next?.id ?? null);
    onSelectIssue?.(next);
  }, [activeSelection, filtered, onSelectIssue]);

  const selectIssue = (issue: PackageQualityIssue) => {
    setInternalSelection(issue.id);
    onSelectIssue?.(issue);
  };

  const resetFilters = () => {
    setQuery("");
    setSeverity("unresolved");
    setArea("all");
    setTechnical("all");
  };

  const statusTitle = report.status === "blocked" ? "Blocked" : report.status === "review" ? "Review recommended" : "Ready";
  const unresolvedCount = workspaceCounts.blockers + workspaceCounts.warnings;

  return (
    <section data-testid="package-quality-report" className="package-quality-panel rounded-lg border border-line-subtle bg-surface-secondary p-5">
      <div className="package-quality-panel__header">
        <Status tone={healthStatusTone[report.status]}>{statusTitle}</Status>
        <p className="mt-2 text-sm leading-6 text-content-secondary">
          {report.status === "blocked"
            ? `${workspaceCounts.blockers} ${workspaceCounts.blockers === 1 ? "issue blocks" : "issues block"} this template. Resolve the blocked items before continuing.`
            : report.status === "review"
              ? `${workspaceCounts.warnings} ${workspaceCounts.warnings === 1 ? "issue may" : "issues may"} affect preview quality or editing. Import and available export paths remain usable unless marked blocked.`
              : "No unresolved issues require review. The template is ready to continue."}
        </p>
        <p className="mt-1 text-sm font-medium text-content-primary">
          {unresolvedCount} {unresolvedCount === 1 ? "item" : "items"} to review · {workspaceCounts.repaired} repaired · {workspaceCounts.info} notes
        </p>
      </div>

      <div className="package-quality-panel__health mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <ReadinessButton label="Import" value={report.health.import} active={area === "import"} onClick={() => setArea(area === "import" ? "all" : "import")} />
        <ReadinessButton label="Preview" value={report.health.fidelity} active={area === "preview"} onClick={() => setArea(area === "preview" ? "all" : "preview")} />
        <ReadinessButton label="Media & fonts" value={report.health.assets} active={area === "media" || area === "fonts"} onClick={() => setArea(area === "media" ? "fonts" : area === "fonts" ? "all" : "media")} />
        <ReadinessButton label="Fields" value={report.health.editability} active={area === "fields"} onClick={() => setArea(area === "fields" ? "all" : "fields")} />
        <ReadinessButton label="Export" value={report.health.export} active={area === "export"} onClick={() => setArea(area === "export" ? "all" : "export")} />
      </div>

      <div className="mt-4 rounded-lg border border-line-subtle bg-surface-primary p-3" data-testid="rendering-health-summary">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-content-primary">Rendering health</p>
          <Status tone={report.renderingHealth.reviewFallbackRegionCount || report.renderingHealth.unsupportedCapabilities.length ? "attention" : "repaired"}>
            {report.renderingHealth.semanticCapabilityFamilies.length} semantic families
          </Status>
        </div>
        <p className="mt-1 text-xs leading-5 text-content-muted">
          {report.renderingHealth.reviewFallbackRegionCount} fallback regions require review · {report.renderingHealth.preservedOnlyRegionCount} preserved-only regions · {report.renderingHealth.unsupportedCapabilities.length} unsupported capabilities
        </p>
        {report.renderingHealth.compatibilityRegionCount ? (
          <details className="mt-1 text-xs text-content-muted">
            <summary className="cursor-pointer">Technical compatibility ownership</summary>
            <p className="mt-1">{report.renderingHealth.compatibilityRegionCount} regions use an established export-safe compatibility owner.</p>
          </details>
        ) : null}
        <p className="mt-1 text-xs leading-5 text-content-muted">
          Source reference {report.renderingHealth.sourceReference.availability}. Visual comparison is not run in the product; reviewed comparisons remain in the fidelity harness.
        </p>
        {report.renderingHealth.productRenderIdentity ? (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-content-muted">Product render identity</summary>
            <code className="mt-1 block break-all text-[11px] text-content-muted">{report.renderingHealth.productRenderIdentity.identityId}</code>
          </details>
        ) : null}
      </div>

      <div className="package-quality-panel__filters mt-4 space-y-3">
        <Input
          label="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search titles, layers, fields, media, fonts or codes"
        />

        <div>
          <p className="ui-field-label mb-2">Status</p>
          <div className="flex flex-wrap gap-2" aria-label="Diagnostic status filters">
            {workspaceCounts.blockers > 0 ? (
              <FilterButton active={severity === "unresolved" || severity === "blockers"} label="Blocked" count={workspaceCounts.blockers} onClick={() => setSeverity("blockers")} />
            ) : null}
            <FilterButton active={severity === "unresolved" || severity === "review"} label="Review" count={workspaceCounts.warnings} onClick={() => setSeverity("review")} />
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

        {(technicalOptions.layers.length > 0 || technicalOptions.origins.length > 0 || technicalOptions.capabilities.length > 0 || technicalOptions.regions.length > 0) ? (
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
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-subtle pt-4">
        <p className="text-sm font-medium text-content-primary">{filtered.length} diagnostics</p>
        {filtersActive ? <Button variant="quiet" size="small" leadingIcon={<RotateCcw size={14} />} onClick={resetFilters}>Reset filters</Button> : null}
      </div>

      <div className="package-quality-panel__issues mt-2 overflow-y-auto pr-1" aria-live="polite">
        {groups.length > 0 ? groups.map((group) => (
          <GroupRow
            key={group.id}
            group={group}
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
            <p className="font-medium text-content-primary">{workspaceCounts.repaired > 0 ? "All review items resolved" : "Validation complete"}</p>
            <p className="mt-1 text-sm text-content-muted">{workspaceCounts.repaired > 0 ? "Repaired items and technical notes remain available through filters and the package technical report." : "No issues were found. The template is ready to continue."}</p>
          </div>
        ) : (
          <div className="package-quality-empty-state">
            <p className="font-medium text-content-primary">No diagnostics match these filters</p>
            <Button variant="quiet" size="small" className="mt-2" onClick={resetFilters}>Reset filters</Button>
          </div>
        )}
      </div>
    </section>
  );
}

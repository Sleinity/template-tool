import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Alert, Button } from "../../components/ui";
import type {
  LoadedSourceDiagnosticReport,
  LoadedTemplatePackageSource,
  TemplatePackageBundleDiagnostic,
} from "../../template-package/bundle";
import type { TemplatePackageValidationResult } from "../../template-package/packageDiagnostics";
import type { SavedTemplateRecord } from "../../template-package/persistence";
import {
  getDiagnosticAudience,
  getPackageQualityPrimaryTarget,
  getDiagnosticPresentationState,
  getPackageQualityIssueTitle,
  getPackageQualityValidationHistory,
  getPackageQualityTechnicalTrace,
  getPackageQualityWorkspaceCounts,
  type PackageQualityIssue,
  type PackageQualityReport,
} from "../../template-package/quality";
import type { TemplatePackageV1 } from "../../template-package/types";

type ReadinessState = "ready" | "warning" | "blocked";

export function PackageValidationStatusHeader({
  report,
  qualityReport,
  onValidate,
}: {
  report?: LoadedSourceDiagnosticReport;
  qualityReport?: PackageQualityReport | null;
  onValidate: () => void;
}) {
  const state: ReadinessState = qualityReport
    ? qualityReport.status === "blocked"
      ? "blocked"
      : qualityReport.status === "review"
        ? "warning"
        : "ready"
    : report?.status ?? "ready";
  const title =
    state === "blocked"
      ? "Blocked"
      : state === "warning"
        ? "Review recommended"
        : "Ready";
  const description =
    state === "blocked"
      ? "A required capability is blocked. Review the affected area and suggested action below."
      : state === "warning"
        ? "You can continue, but some items may affect preview quality or editing."
        : "You can add and use this template.";
  const Icon =
    state === "blocked"
      ? XCircle
      : state === "warning"
        ? AlertTriangle
      : CheckCircle2;
  const counts = qualityReport
    ? getPackageQualityWorkspaceCounts(qualityReport.issues)
    : null;

  return (
    <section data-testid="validation-status-header">
      <Alert
        tone={state === "blocked" ? "blocked" : state === "warning" ? "attention" : "repaired"}
        title={title}
        icon={<Icon size={20} />}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mt-1 max-w-2xl text-sm leading-6">{description}</p>
            {counts ? (
              <p className="mt-2 text-sm font-medium">
                {counts.blockers} blocked · {counts.warnings} to review · {counts.repaired} repaired
              </p>
            ) : null}
          </div>
          <Button variant="secondary" leadingIcon={<RotateCcw size={16} />} onClick={onValidate}>
            Check again
          </Button>
        </div>
      </Alert>
    </section>
  );
}

export function PackageBlockingIssues({
  qualityReport,
  onSelectIssue,
}: {
  qualityReport?: PackageQualityReport | null;
  onSelectIssue: (issue: PackageQualityIssue) => void;
}) {
  const blockers =
    qualityReport?.issues.filter(
      (issue) =>
        getDiagnosticAudience(issue) === "user" &&
        getDiagnosticPresentationState(issue) === "blocked",
    ) ?? [];
  if (blockers.length === 0) return null;
  return (
    <section
      data-testid="validation-blocking-issues"
      className="rounded-lg border border-[var(--color-status-blocked-border)] bg-red-400/[0.045] p-5"
    >
      <h2 className="text-base font-semibold text-[var(--color-status-blocked-fg)]">
        Blocked capabilities
      </h2>
      <p className="mt-1 text-sm leading-6 text-[var(--color-status-blocked-fg)]">
        Select an issue to see which capability is unavailable and how to restore it.
      </p>
      <div className="mt-3 space-y-2">
        {blockers.slice(0, 5).map((issue) => (
          <button
            key={issue.id}
            type="button"
            onClick={() => onSelectIssue(issue)}
            className="flex w-full items-start justify-between gap-4 rounded-lg border border-[var(--color-status-blocked-border)] bg-surface-secondary px-3 py-3 text-left transition hover:bg-surface-interactive"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--color-status-blocked-fg)]">
                {getPackageQualityIssueTitle(issue)}
              </span>
              <span className="mt-1 line-clamp-2 block text-sm text-[var(--color-status-blocked-fg)]">
                {issue.message}
              </span>
            </span>
            <span className="max-w-[40%] shrink-0 truncate text-sm text-[var(--color-status-blocked-fg)]">
              {getPackageQualityPrimaryTarget(issue) ?? "Package"}
            </span>
          </button>
        ))}
      </div>
      {blockers.length > 5 ? (
        <p className="mt-3 text-sm text-[var(--color-status-blocked-fg)]">
          {blockers.length - 5} more blocked issues are listed in Diagnostics.
        </p>
      ) : null}
    </section>
  );
}

function SummaryFact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-content-muted">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-content-primary">{value}</dd>
    </div>
  );
}

function included(value: boolean): string {
  return value ? "Included" : "Not included";
}

export function CompactPackageSummary({
  packageValue,
  source,
}: {
  packageValue: TemplatePackageV1;
  source?: LoadedTemplatePackageSource;
  metadata?: SavedTemplateRecord["source"];
}) {
  const sourceFiles = source?.sourceFiles;
  const hasMotion = Boolean(
    packageValue.motion || source?.motionData || sourceFiles?.motion?.exists,
  );
  const hasPreview = Boolean(
    packageValue.referencePreview || source?.preview || sourceFiles?.preview?.exists,
  );
  const sourceLabel = "ZIP package";
  return (
    <section
      data-testid="compact-package-summary"
      className="compact-package-summary rounded-lg border border-line-subtle bg-surface-secondary px-5 py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-content-secondary">
            Template summary
          </p>
          <h2 className="mt-1 text-base font-semibold text-content-primary">
            {packageValue.name}
          </h2>
        </div>
      </div>
      <dl className="compact-package-summary__facts mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line-subtle pt-3 sm:grid-cols-4 xl:grid-cols-8">
        <SummaryFact label="Source" value={sourceLabel} />
        <SummaryFact label="Template size" value={`${packageValue.canvas.width} × ${packageValue.canvas.height}`} />
        <SummaryFact label="Layers" value={Object.keys(packageValue.nodes).length} />
        <SummaryFact label="Media" value={Object.keys(packageValue.assets).length} />
        <SummaryFact label="Fields" value={packageValue.editableFields.length} />
        <SummaryFact label="Motion preview" value={included(hasMotion)} />
        <SummaryFact label="Reference image" value={included(hasPreview)} />
      </dl>
    </section>
  );
}

function technicalJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function PackageTechnicalDetails({
  packageValue,
  source,
  metadata,
  layeredDiagnostics,
  validation,
  assetIngestionDiagnostics = [],
  qualityReport,
}: {
  packageValue: TemplatePackageV1;
  source?: LoadedTemplatePackageSource;
  metadata?: SavedTemplateRecord["source"];
  layeredDiagnostics?: LoadedSourceDiagnosticReport;
  validation?: TemplatePackageValidationResult | null;
  assetIngestionDiagnostics?: TemplatePackageBundleDiagnostic[];
  qualityReport?: PackageQualityReport | null;
}) {
  const fileInventory = source
    ? [
        source.sourceFiles.template,
        source.sourceFiles.assetManifest,
        source.sourceFiles.motion,
        source.sourceFiles.mcp,
        source.sourceFiles.preview,
        ...source.sourceFiles.assets,
      ].filter(Boolean)
    : [];
  const validationHistory = qualityReport
    ? getPackageQualityValidationHistory(qualityReport.issues)
    : [];
  const technicalTrace = qualityReport
    ? getPackageQualityTechnicalTrace(qualityReport.issues)
    : [];
  return (
    <details
      data-testid="package-technical-details"
      className="rounded-lg border border-line-subtle bg-surface-secondary px-5 py-4"
    >
      <summary className="cursor-pointer text-sm font-medium text-content-secondary">
        Package technical report
      </summary>
      <div className="mt-4 space-y-5 border-t border-line-subtle pt-4">
        <Button
          variant="secondary"
          onClick={() =>
            void navigator.clipboard.writeText(
              technicalJson({
                packageId: packageValue.packageId,
                rootNodeId: packageValue.rootNodeId,
                sourceKind: source?.sourceKind ?? metadata?.type,
                sourceName: source?.sourceName ?? metadata?.sourceName,
                files: fileInventory,
                layeredDiagnostics: layeredDiagnostics?.diagnostics ?? [],
                validation: validation?.diagnostics ?? [],
                pluginDiagnostics: validation?.pluginDiagnostics ?? [],
                assetIngestionDiagnostics,
                packageQuality: qualityReport,
              }),
            )
          }
          leadingIcon={<Clipboard size={16} />}
        >
          Copy package technical report
        </Button>
        {validationHistory.length > 0 ? (
          <div>
            <h3 className="ui-subsection-title">Validation history</h3>
            <p className="mt-1 text-sm text-content-muted">
              Safe corrections applied without changing visible output.
            </p>
            <ul className="mt-2 divide-y divide-line-subtle">
              {validationHistory.map((issue) => (
                <li key={issue.id} className="py-2 text-sm text-content-secondary">
                  {getPackageQualityIssueTitle(issue)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {technicalTrace.length > 0 ? (
          <details className="border-t border-line-subtle pt-3">
            <summary className="cursor-pointer text-sm font-medium text-content-secondary">
              Technical trace ({technicalTrace.length})
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[10px] leading-5 text-content-muted">
              {technicalJson(technicalTrace)}
            </pre>
          </details>
        ) : null}
        <div>
          <h3 className="text-xs font-medium text-content-secondary">Debug identifiers</h3>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap text-[10px] leading-5 text-content-muted">
            {technicalJson({
              packageId: packageValue.packageId,
              rootNodeId: packageValue.rootNodeId,
              sourceKind: source?.sourceKind ?? metadata?.type,
              sourceName: source?.sourceName ?? metadata?.sourceName,
              packageContract: packageValue.source?.packageContract,
              pluginVersion: packageValue.source?.pluginVersion,
            })}
          </pre>
        </div>
        {fileInventory.length ? (
          <div>
            <h3 className="text-xs font-medium text-content-secondary">Package files</h3>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[10px] leading-5 text-content-muted">
              {technicalJson(fileInventory)}
            </pre>
          </div>
        ) : null}
        <div>
          <h3 className="text-xs font-medium text-content-secondary">Diagnostic sources</h3>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[10px] leading-5 text-content-muted">
            {technicalJson(layeredDiagnostics?.diagnostics ?? [])}
          </pre>
        </div>
        <div>
          <h3 className="text-xs font-medium text-content-secondary">Validation details</h3>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[10px] leading-5 text-content-muted">
            {technicalJson({
              schemaValid: validation?.schemaValid,
              semanticValid: validation?.semanticValid,
              diagnostics: validation?.diagnostics ?? [],
              pluginDiagnostics: validation?.pluginDiagnostics ?? [],
              sourceDiagnostics: source?.diagnostics ?? [],
              assetIngestionDiagnostics,
            })}
          </pre>
        </div>
      </div>
    </details>
  );
}

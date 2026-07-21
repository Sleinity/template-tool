import { useMemo } from "react";
import type { TemplatePackageV1 } from "../types";
import { analyzeRendererFeatureCoverage } from "./featureCoverage";
import { analyzeFidelityRisk } from "./fidelityRisk";
import type {
  FeatureSupportStatus,
  FidelityRiskLevel,
  RendererFeatureCoverageItem,
} from "./types";

interface TemplatePackageStressReportsProps {
  packageValue: TemplatePackageV1;
}

const supportTone: Record<FeatureSupportStatus, string> = {
  supported: "border-[var(--color-status-repaired-border)] bg-[var(--color-status-repaired-bg)] text-[var(--color-status-repaired-fg)]",
  partial: "border-[var(--color-status-attention-border)] bg-[var(--color-status-attention-bg)] text-[var(--color-status-attention-fg)]",
  unsupported: "border-[var(--color-status-blocked-border)] bg-[var(--color-status-blocked-bg)] text-[var(--color-status-blocked-fg)]",
  unknown: "border-[var(--color-status-neutral-border)] bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral-fg)]",
};

const riskTone: Record<FidelityRiskLevel, string> = {
  low: "border-[var(--color-status-repaired-border)] bg-[var(--color-status-repaired-bg)] text-[var(--color-status-repaired-fg)]",
  medium: "border-[var(--color-status-attention-border)] bg-[var(--color-status-attention-bg)] text-[var(--color-status-attention-fg)]",
  high: "border-[var(--color-status-blocked-border)] bg-[var(--color-status-blocked-bg)] text-[var(--color-status-blocked-fg)]",
};

function SummaryChip({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <span
      className={`rounded-full border px-2 py-1 text-[10px] font-medium ${className}`}
    >
      {label} {value}
    </span>
  );
}

function groupFeaturesByStatus(items: RendererFeatureCoverageItem[]) {
  return items.reduce<Record<FeatureSupportStatus, RendererFeatureCoverageItem[]>>(
    (groups, item) => {
      groups[item.status].push(item);
      return groups;
    },
    { supported: [], partial: [], unsupported: [], unknown: [] },
  );
}

export function TemplatePackageStressReports({
  packageValue,
}: TemplatePackageStressReportsProps) {
  const coverage = useMemo(
    () => analyzeRendererFeatureCoverage(packageValue),
    [packageValue],
  );
  const risk = useMemo(() => analyzeFidelityRisk(coverage), [coverage]);
  const featureGroups = useMemo(
    () => groupFeaturesByStatus(coverage.items),
    [coverage.items],
  );

  return (
    <>
      <details
        data-testid="renderer-feature-coverage-report"
        className="template-stress-report rounded-lg border border-line-subtle p-4"
      >
        <summary className="cursor-pointer list-none">
          <p className="text-sm font-semibold text-content-primary">
            Preview feature support
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(
              [
                "supported",
                "partial",
                "unsupported",
                "unknown",
              ] as const
            ).map((status) => (
              <SummaryChip
                key={status}
                label={status}
                value={coverage.summary[status]}
                className={supportTone[status]}
              />
            ))}
          </div>
        </summary>

        <div className="mt-4 space-y-4">
          {(Object.entries(featureGroups) as [
            FeatureSupportStatus,
            RendererFeatureCoverageItem[],
          ][])
            .filter(([, items]) => items.length > 0)
            .map(([status, items]) => (
            <section key={status}>
              <h3 className="text-[10px] font-medium uppercase tracking-[0.16em] text-content-muted">
                {status}
              </h3>
              <div className="mt-2 space-y-2">
                {items.map((item) => (
                  <details
                    key={item.key}
                    className="rounded-lg border border-line-subtle bg-surface-primary p-3"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-content-primary">
                          {item.name}
                        </span>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium ${supportTone[item.status]}`}
                        >
                          {item.status} · {item.affectedNodes.length}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-content-muted">
                        {item.category}
                      </p>
                    </summary>
                    <p className="mt-2 text-[11px] leading-5 text-content-secondary">
                      {item.explanation}
                    </p>
                    <p className="mt-2 text-[10px] leading-4 text-content-muted">
                      Nodes:{" "}
                      {item.affectedNodes
                        .map((node) => `${node.name} (${node.id})`)
                        .join(", ")}
                    </p>
                    {item.relatedDiagnostics.length > 0 ? (
                      <p className="mt-1 text-[10px] leading-4 text-content-muted">
                        Diagnostics: {item.relatedDiagnostics.join(", ")}
                      </p>
                    ) : null}
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </details>

      <details
        data-testid="fidelity-risk-report"
        className="template-stress-report rounded-lg border border-line-subtle p-4"
      >
        <summary className="cursor-pointer list-none">
          <p className="text-sm font-semibold text-content-primary">
            Fidelity risks
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(["low", "medium", "high"] as const).map((level) => (
              <SummaryChip
                key={level}
                label={level}
                value={risk.summary[level]}
                className={riskTone[level]}
              />
            ))}
          </div>
        </summary>

        <div className="mt-4 space-y-4">
          {(["high", "medium", "low"] as const).map((level) => {
            const items = risk.items.filter((item) => item.level === level);
            if (items.length === 0) return null;
            return (
              <section key={level}>
                <h3 className="text-[10px] font-medium uppercase tracking-[0.16em] text-content-muted">
                  {level} risk
                </h3>
                <div className="mt-2 space-y-2">
                  {items.map((item) => (
                    <details
                      key={item.featureKey}
                      className="rounded-lg border border-line-subtle bg-surface-primary p-3"
                    >
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-medium text-content-primary">
                            {item.featureName}
                          </span>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium ${riskTone[item.level]}`}
                          >
                            {item.level}
                          </span>
                        </div>
                      </summary>
                      <p className="mt-2 text-[11px] leading-5 text-content-secondary">
                        {item.reason}
                      </p>
                      <p className="mt-2 text-[10px] leading-4 text-content-muted">
                        Likely cause: {item.likelyCause}
                      </p>
                      <p className="mt-1 text-[10px] leading-4 text-content-muted">
                        Nodes:{" "}
                        {item.affectedNodes
                          .map((node) => `${node.name} (${node.id})`)
                          .join(", ")}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </details>
    </>
  );
}

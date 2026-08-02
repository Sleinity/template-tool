import type { ReactNode } from "react";
import { analyzeAssetReliability } from "@sleinity/template-browser/assets";
import type { TemplatePackageEnrichmentResult } from "@sleinity/template-browser/enrichment";
import type { LoadedSourceDiagnosticReport } from "@sleinity/template-browser/importer";
import type { validatePackageJpgExportReadiness } from "@sleinity/template-browser/capture";
import { getPackageMotionSummary, type PackageMotionDiagnostic } from "@sleinity/template-core/motion";
import { collectTemplatePackageRenderWarnings } from "@sleinity/template-react";
import {
  type LoadedTemplatePackageSource,
  type PackageDiagnostic,
  type TemplatePackageV1,
  createResolvedRenderTree,
  type FontReadinessReport,
} from "@sleinity/template-core";
import { comparePreviewReferenceDimensions } from "@sleinity/template-core/inspection";
import type { SavedTemplateRecord } from "@sleinity/template-browser/persistence";
import { getDiagnosticCodeTitle } from "@sleinity/template-react/inspection";

const formatBytes = (value: number | undefined): string => {
  if (!value || value <= 0) return "0 KB";
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / 1024).toFixed(1)} KB`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const summarizeValue = (value: unknown): string => {
  if (value === null) return "null";
  if (typeof value === "string") {
    if (/^data:image\//i.test(value)) {
      return `${value.slice(0, value.indexOf(",") + 1)}… [embedded image]`;
    }
    return value.length > 90 ? `${value.slice(0, 87)}…` : value;
  }
  return String(value);
};

const motionLabel = (packageValue: TemplatePackageV1 | null) => {
  if (!packageValue?.motion) return "Static";
  const raw = packageValue.motion.raw;
  return raw && typeof raw === "object" && Object.keys(raw).length > 0
    ? "Motion included"
    : "Static";
};

const Metric = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-lg border border-line-subtle bg-surface-interactive px-3 py-2.5">
    <div className="text-[11px] text-content-muted">{label}</div>
    <div className="mt-1 truncate text-sm font-medium text-content-primary">{value}</div>
  </div>
);

const StatusPill = ({
  status,
  label,
}: {
  status: "pass" | "warning" | "error" | "neutral";
  label: string;
}) => {
  const className =
    status === "pass"
      ? "border-[var(--color-status-repaired-border)] bg-[var(--color-status-repaired-bg)] text-[var(--color-status-repaired-fg)]"
      : status === "warning"
        ? "border-[var(--color-status-attention-border)] bg-[var(--color-status-attention-bg)] text-[var(--color-status-attention-fg)]"
        : status === "error"
          ? "border-[var(--color-status-blocked-border)] bg-[var(--color-status-blocked-bg)] text-[var(--color-status-blocked-fg)]"
          : "border-line-subtle bg-surface-interactive text-content-secondary";
  return (
    <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
};

const Panel = ({
  title,
  status,
  children,
}: {
  title: string;
  status?: ReactNode;
  children: ReactNode;
}) => (
  <section className="rounded-lg border border-line-subtle bg-surface-secondary p-5">
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-base font-semibold text-content-primary">{title}</h2>
      {status}
    </div>
    {children}
  </section>
);

function packageSourceLabel(
  sourceType:
    | SavedTemplateRecord["source"]["type"]
    | LoadedTemplatePackageSource["sourceKind"]
    | undefined,
): string {
  return sourceType ? "Package" : "Template";
}

function countMotionKeyframes(packageValue: TemplatePackageV1 | null): {
  fieldCount: number;
  keyframeCount: number;
} {
  const raw = packageValue?.motion?.raw;
  if (!isRecord(raw) || !Array.isArray(raw.nodes)) {
    return { fieldCount: 0, keyframeCount: 0 };
  }
  return raw.nodes.reduce<{ fieldCount: number; keyframeCount: number }>(
    (counts, node) => {
      if (!isRecord(node) || !Array.isArray(node.fields)) return counts;
      counts.fieldCount += node.fields.length;
      node.fields.forEach((field) => {
        if (isRecord(field) && Array.isArray(field.keyframes)) {
          counts.keyframeCount += field.keyframes.length;
        }
      });
      return counts;
    },
    { fieldCount: 0, keyframeCount: 0 },
  );
}

const MotionDiagnosticList = ({
  diagnostics,
}: {
  diagnostics: PackageMotionDiagnostic[];
}) => {
  if (diagnostics.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2">
      {diagnostics.slice(0, 6).map((item, index) => (
        <li
          key={`${item.code}-${item.nodeId ?? ""}-${item.field ?? ""}-${index}`}
          className={`rounded-lg border px-3 py-2 text-xs leading-5 ${
            item.severity === "error"
              ? "border-[var(--color-status-blocked-border)] bg-[var(--color-status-blocked-bg)] text-[var(--color-status-blocked-fg)]"
              : "border-[var(--color-status-attention-border)] bg-[var(--color-status-attention-bg)] text-[var(--color-status-attention-fg)]"
          }`}
        >
          <span className="font-medium">{item.code}</span>
          {" · "}
          {item.message}
        </li>
      ))}
      {diagnostics.length > 6 ? (
        <li className="text-xs text-content-muted">
          {diagnostics.length - 6} additional motion notices.
        </li>
      ) : null}
    </ul>
  );
};

export const PackageFilesPanel = ({
  source,
}: {
  source: LoadedTemplatePackageSource | undefined;
}) => {
  if (!source || source.sourceKind !== "package-zip") return null;
  const files = source.sourceFiles;
  const items = [
    ["template.json", files.template.exists ? "Found" : "Missing"],
    ["assets.json", files.assetManifest?.exists ? "Found" : "Missing"],
    ["motion.json", files.motion?.exists ? "Found" : "Optional"],
    ["mcp.json", files.mcp?.exists ? "Found" : "Optional"],
    ["preview.png", files.preview?.exists ? "Found" : "Optional"],
    ["Assets", String(files.assets.length)],
  ] as const;
  return (
    <Panel
      title="Package files"
      status={
        <StatusPill
          status={
            files.template.exists && files.assetManifest?.exists
              ? "pass"
              : "warning"
          }
          label={source.sourceKind === "package-zip" ? "ZIP" : "Template"}
        />
      }
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {items.map(([label, value]) => (
          <Metric key={label} label={label} value={value} />
        ))}
      </div>
      {source.diagnostics.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-content-muted">
          {source.diagnostics.length} source diagnostic
          {source.diagnostics.length === 1 ? "" : "s"} included in review.
        </p>
      ) : null}
    </Panel>
  );
};

export const LoadedSourceDiagnosticsPanel = ({
  report,
}: {
  report: LoadedSourceDiagnosticReport | undefined;
}) => {
  if (!report) return null;
  const visibleDiagnostics = [
    ...report.blockingDiagnostics,
    ...report.warningDiagnostics,
  ].slice(0, 8);
  return (
    <Panel
      title="Template check"
      status={
        <StatusPill
          status={
            report.status === "blocked"
              ? "error"
              : report.status === "warning"
                ? "warning"
                : "pass"
          }
          label={
            report.status === "blocked"
              ? "Blocked"
              : report.status === "warning"
                ? "Needs attention"
                : "Ready"
          }
        />
      }
    >
      {visibleDiagnostics.length > 0 ? (
        <ul className="space-y-2">
          {visibleDiagnostics.map((diagnostic, index) => (
            <li
              key={`${diagnostic.code}-${diagnostic.path ?? ""}-${diagnostic.nodeId ?? ""}-${index}`}
              className={`rounded-lg border px-4 py-3 ${
                diagnostic.severity === "error"
                  ? "border-[var(--color-status-blocked-border)] bg-[var(--color-status-blocked-bg)]"
                  : diagnostic.severity === "warning"
                    ? "border-[var(--color-status-attention-border)] bg-[var(--color-status-attention-bg)]"
                    : "border-line-subtle bg-surface-secondary"
              }`}
            >
              <p className="text-sm font-medium text-content-primary">
                {getDiagnosticCodeTitle(diagnostic.code)}
              </p>
              <p className="mt-1 text-xs leading-5 text-content-secondary">
                {diagnostic.message}
              </p>
              {diagnostic.suggestion ? (
                <p className="mt-2 text-xs leading-5 text-content-secondary">
                  Suggested action: {diagnostic.suggestion}
                </p>
              ) : null}
              <details className="mt-2 border-t border-current/10 pt-2">
                <summary className="cursor-pointer text-[11px] text-content-muted">
                  Technical details
                </summary>
                <p className="mt-2 break-words font-mono text-[10px] text-content-muted">
                  {[diagnostic.code, diagnostic.layer, diagnostic.origin, diagnostic.path, diagnostic.nodeId, diagnostic.assetId]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {diagnostic.details ? (
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] text-content-muted">
                    {JSON.stringify(diagnostic.details, null, 2)}
                  </pre>
                ) : null}
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-[var(--color-status-repaired-fg)]">
          No import issues found.
        </p>
      )}
      {report.diagnostics.length > visibleDiagnostics.length ? (
        <p className="mt-3 text-xs leading-5 text-content-muted">
          {report.diagnostics.length - visibleDiagnostics.length} additional
          information note
          {report.diagnostics.length - visibleDiagnostics.length === 1
            ? ""
            : "s"} are available in Technical details.
        </p>
      ) : null}
    </Panel>
  );
};

export const PackageOverviewDiagnosisPanel = ({
  packageValue,
  source,
  metadata,
  enrichment,
}: {
  packageValue: TemplatePackageV1 | null;
  source: LoadedTemplatePackageSource | undefined;
  metadata: SavedTemplateRecord["source"] | undefined;
  enrichment: TemplatePackageEnrichmentResult | null | undefined;
}) => {
  if (!packageValue) return null;
  const rootNode = packageValue.nodes[packageValue.rootNodeId];
  const sourceKind =
    source?.sourceKind ??
    metadata?.type ??
    "package-zip";
  return (
    <Panel
      title="Package overview"
      status={<StatusPill status="neutral" label={packageSourceLabel(sourceKind)} />}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="Name" value={packageValue.name} />
        <Metric
          label="Canvas"
          value={`${packageValue.canvas.width} × ${packageValue.canvas.height}`}
        />
        <Metric label="Root node" value={packageValue.rootNodeId} />
        <Metric label="Root name" value={rootNode?.name ?? "Missing"} />
        <Metric
          label="Plugin"
          value={packageValue.source?.pluginVersion ?? "Unknown"}
        />
        <Metric label="Mode" value={motionLabel(packageValue)} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Metric
          label="Source file"
          value={metadata?.sourceName ?? source?.sourceName ?? "Not recorded"}
        />
        <Metric
          label="Figma/MCP"
          value={
            enrichment?.figmaReference
              ? enrichment.figmaReference.nodeId ?? "Linked"
              : packageValue.source?.rootNodeId ?? "Not linked"
          }
        />
      </div>
    </Panel>
  );
};

export const RenderReadinessDiagnosisPanel = ({
  packageValue,
  assetReliability,
  fontReadiness,
  rendererWarnings,
  editorRendererWarnings,
  exportReadiness,
}: {
  packageValue: TemplatePackageV1 | null;
  assetReliability: ReturnType<typeof analyzeAssetReliability> | null;
  fontReadiness: FontReadinessReport | null;
  rendererWarnings: ReturnType<typeof collectTemplatePackageRenderWarnings>;
  editorRendererWarnings: ReturnType<typeof collectTemplatePackageRenderWarnings>;
  exportReadiness: ReturnType<typeof validatePackageJpgExportReadiness> | null;
}) => {
  if (!packageValue) return null;
  const assetReady =
    !assetReliability?.missingAssets &&
    !assetReliability?.diagnostics.some((item) => item.severity === "error");
  const fontReady = fontReadiness?.reliable ?? false;
  const warningTotal =
    rendererWarnings.length +
    editorRendererWarnings.length +
    (exportReadiness?.issues.length ?? 0);
  return (
    <Panel
      title="Preview status"
      status={
        <StatusPill
          status={warningTotal || !assetReady || !fontReady ? "warning" : "pass"}
          label={warningTotal || !assetReady || !fontReady ? "Review" : "Ready"}
        />
      }
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="Static render" value="Available" />
        <Metric
          label="Motion render"
          value={packageValue.motion ? "Motion linked" : "Static only"}
        />
        <Metric label="Assets" value={assetReady ? "Resolved" : "Review"} />
        <Metric label="Fonts" value={fontReady ? "Ready" : "Fallback risk"} />
        <Metric
          label="Renderer warnings"
          value={rendererWarnings.length + editorRendererWarnings.length}
        />
        <Metric label="Export" value={exportReadiness?.status ?? "Checking"} />
      </div>
    </Panel>
  );
};

export const NodeGraphDiagnosisPanel = ({
  packageValue,
  diagnostics,
  resolvedTree,
}: {
  packageValue: TemplatePackageV1 | null;
  diagnostics: PackageDiagnostic[];
  resolvedTree: ReturnType<typeof createResolvedRenderTree> | null;
}) => {
  if (!packageValue) return null;
  const nodes = Object.values(packageValue.nodes);
  const byType = nodes.reduce<Record<string, number>>((counts, node) => {
    counts[node.type] = (counts[node.type] ?? 0) + 1;
    return counts;
  }, {});
  const absoluteCount = nodes.filter((node) => node.positioning === "ABSOLUTE").length;
  const clippingCount = nodes.filter((node) => node.appearance.clipContent).length;
  const graphIssues = diagnostics.filter(
    (item) => item.category === "graph" || item.category === "layout",
  );
  return (
    <Panel
      title="Node graph"
      status={
        <StatusPill
          status={graphIssues.length ? "warning" : "pass"}
          label={graphIssues.length ? "Review" : "Ready"}
        />
      }
    >
      <div className="grid gap-2 sm:grid-cols-4">
        <Metric label="Nodes" value={nodes.length} />
        <Metric label="Types" value={Object.keys(byType).length} />
        <Metric label="Absolute overlays" value={absoluteCount} />
        <Metric label="Clipping frames" value={clippingCount} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(byType).map(([type, count]) => (
          <span
            key={type}
            className="rounded-full border border-line-subtle bg-surface-secondary px-3 py-1.5 text-xs text-content-secondary"
          >
            {type} · {count}
          </span>
        ))}
      </div>
      {resolvedTree?.summary.fallbackRenderedNodeCount ? (
        <p className="mt-4 rounded-lg border border-[var(--color-status-attention-border)] bg-[var(--color-status-attention-bg)] px-4 py-3 text-xs leading-5 text-[var(--color-status-attention-fg)]">
          {resolvedTree.summary.fallbackRenderedNodeCount} node(s) use fallback rendering.
        </p>
      ) : null}
    </Panel>
  );
};

export const AssetDiagnosisPanel = ({
  source,
  assetReliability,
}: {
  source: LoadedTemplatePackageSource | undefined;
  assetReliability: ReturnType<typeof analyzeAssetReliability> | null;
}) => {
  if (!assetReliability && !source?.assetRegistry.entries.length) return null;
  const registryEntries = source?.assetRegistry.entries ?? [];
  const entries = assetReliability?.entries ?? [];
  return (
    <Panel
      title="Assets recovered"
      status={
        <StatusPill
          status={assetReliability?.missingAssets ? "warning" : "pass"}
          label={assetReliability?.missingAssets ? "Review" : "Ready"}
        />
      }
    >
      <div className="grid gap-2 sm:grid-cols-4">
        <Metric label="Manifest assets" value={registryEntries.length} />
        <Metric label="Package assets" value={assetReliability?.totalAssets ?? 0} />
        <Metric label="Stored" value={assetReliability?.storedAssets ?? 0} />
        <Metric label="Missing" value={assetReliability?.missingAssets ?? 0} />
      </div>
      <div className="mt-4 space-y-2">
        {(registryEntries.length ? registryEntries : entries)
          .slice(0, 6)
          .map((asset) => {
            const reliability =
              "status" in asset
                ? asset
                : entries.find((entry) => entry.id === asset.id);
            const assetSize =
              "byteSize" in asset && typeof asset.byteSize === "number"
                ? asset.byteSize
                : "sizeBytes" in asset && typeof asset.sizeBytes === "number"
                  ? asset.sizeBytes
                  : undefined;
            return (
              <div
                key={asset.id}
                className="rounded-lg border border-line-subtle bg-surface-interactive px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-content-primary">{asset.id}</p>
                  <span className="rounded-full bg-surface-hovered px-2.5 py-1 text-xs text-content-secondary">
                    {asset.type}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-content-muted">
                  {("normalizedPath" in asset && asset.normalizedPath) ||
                    ("sourceUsed" in asset && asset.sourceUsed) ||
                    "No path"}
                  {" · "}
                  {asset.mimeType ?? "unknown MIME"}
                  {" · "}
                  {formatBytes(assetSize)}
                </p>
                <p className="mt-1 text-xs leading-5 text-content-muted">
                  Aliases:{" "}
                  {"aliases" in asset && asset.aliases.length
                    ? asset.aliases.slice(0, 4).join(", ")
                    : "None"}
                  {reliability?.usedBy?.length
                    ? ` · Used by ${reliability.usedBy.slice(0, 4).join(", ")}`
                    : ""}
                </p>
              </div>
            );
          })}
      </div>
    </Panel>
  );
};

export const EditableFieldsDiagnosisPanel = ({
  packageValue,
}: {
  packageValue: TemplatePackageV1 | null;
}) => {
  if (!packageValue) return null;
  return (
    <Panel
      title="Editable fields recovered"
      status={<StatusPill status="neutral" label={`${packageValue.editableFields.length} fields`} />}
    >
      {packageValue.editableFields.length ? (
        <div className="space-y-2">
          {packageValue.editableFields.slice(0, 8).map((field) => {
            const target = packageValue.nodes[field.nodeId];
            return (
              <div
                key={`${field.id}-${field.nodeId}-${field.property}`}
                className="rounded-lg border border-line-subtle bg-surface-interactive px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-content-primary">
                    {field.label ?? field.id}
                  </p>
                  <StatusPill
                    status={target ? "pass" : "warning"}
                    label={target ? "Target found" : "Missing node"}
                  />
                </div>
                <p className="mt-1 text-xs leading-5 text-content-muted">
                  {field.id} · {field.type} · {field.nodeId} · {field.property}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-content-muted">No editable fields recovered.</p>
      )}
    </Panel>
  );
};

export const FontDiagnosisPanel = ({
  packageValue,
  fontReadiness,
}: {
  packageValue: TemplatePackageV1 | null;
  fontReadiness: FontReadinessReport | null;
}) => {
  if (!packageValue) return null;
  const fonts = packageValue.fontRequirements ?? [];
  return (
    <Panel
      title="Fonts recovered"
      status={
        <StatusPill
          status={fontReadiness?.reliable ? "pass" : fonts.length ? "warning" : "neutral"}
          label={fontReadiness?.reliable ? "Ready" : fonts.length ? "Review" : "None"}
        />
      }
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="Required faces" value={fonts.length} />
        <Metric label="Missing" value={fontReadiness?.missing.length ?? 0} />
        <Metric label="Fallback/unverified" value={fontReadiness?.unverified.length ?? 0} />
      </div>
      {fonts.length ? (
        <div className="mt-4 space-y-2">
          {fonts.slice(0, 6).map((font) => (
            <div
              key={font.id}
              className="rounded-lg border border-line-subtle bg-surface-interactive px-4 py-3"
            >
              <p className="text-sm font-medium text-content-primary">
                {font.family} · {font.weight} · {font.cssStyle}
              </p>
              <p className="mt-1 text-xs leading-5 text-content-muted">
                Used by: {font.usedBy.slice(0, 5).join(", ") || "No nodes"}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </Panel>
  );
};

export const TokenDiagnosisPanel = ({
  source,
}: {
  source: LoadedTemplatePackageSource | undefined;
}) => {
  const tokenRoot = source?.tokens;
  if (!isRecord(tokenRoot)) return null;
  const colors = isRecord(tokenRoot.colors) ? tokenRoot.colors : {};
  const colorEntries = Object.entries(colors).slice(0, 8);
  const oddNames = colorEntries.filter(([name]) =>
    /^(color|paint|fill|untitled|style)[\s-_]?\d*$/i.test(name),
  );
  return (
    <Panel
      title="Tokens recovered"
      status={
        <StatusPill
          status={oddNames.length ? "warning" : "pass"}
          label={oddNames.length ? "Review names" : "Ready"}
        />
      }
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <Metric label="Color tokens" value={Object.keys(colors).length} />
        <Metric label="Odd names" value={oddNames.length} />
      </div>
      {colorEntries.length ? (
        <div className="mt-4 space-y-2">
          {colorEntries.map(([name, value]) => (
            <div
              key={name}
              className="rounded-lg border border-line-subtle bg-surface-interactive px-4 py-3"
            >
              <p className="text-sm font-medium text-content-primary">{name}</p>
              <p className="mt-1 break-all text-xs leading-5 text-content-muted">
                {summarizeValue(JSON.stringify(value))}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-content-muted">
          Token metadata exists, but no color token list was found.
        </p>
      )}
    </Panel>
  );
};

export const MotionDiagnosisPanel = ({
  packageValue,
  source,
}: {
  packageValue: TemplatePackageV1 | null;
  source: LoadedTemplatePackageSource | undefined;
}) => {
  if (!packageValue) return null;
  const summary = getPackageMotionSummary(packageValue);
  const counts = countMotionKeyframes(packageValue);
  const hasMotionFile = Boolean(source?.sourceFiles.motion?.exists);
  return (
    <Panel
      title="Motion recovered"
      status={
        <StatusPill
          status={packageValue.motion ? "pass" : hasMotionFile ? "warning" : "neutral"}
          label={packageValue.motion ? "Linked" : hasMotionFile ? "File present" : "Static"}
        />
      }
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="Animated nodes" value={summary.animatedNodeCount} />
        <Metric label="Fields" value={counts.fieldCount} />
        <Metric label="Keyframes" value={counts.keyframeCount} />
        <Metric label="Duration" value={`${(summary.durationMs / 1000).toFixed(2)}s`} />
        <Metric label="Unmatched" value={summary.missingNodeIds.length} />
        <Metric label="Unsupported" value={summary.unsupportedFields.length} />
      </div>
      <MotionDiagnosticList diagnostics={summary.diagnostics} />
    </Panel>
  );
};

export const PreviewReferenceDiagnosisPanel = ({
  packageValue,
  source,
}: {
  packageValue: TemplatePackageV1 | null;
  source: LoadedTemplatePackageSource | undefined;
}) => {
  if (!packageValue && !source?.preview) return null;
  const preview = source?.preview;
  const previewQa = comparePreviewReferenceDimensions(
    preview,
    packageValue
      ? {
          width: packageValue.canvas.width,
          height: packageValue.canvas.height,
        }
      : null,
  );
  return (
    <Panel
      title="Preview reference"
      status={
        <StatusPill
          status={preview || packageValue?.referencePreview ? "pass" : "neutral"}
          label={preview || packageValue?.referencePreview ? "Available" : "Missing"}
        />
      }
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <Metric label="preview.png" value={preview ? "Found" : "Not included"} />
        <Metric label="Path" value={preview?.normalizedPath ?? "Not included"} />
        <Metric label="File size" value={formatBytes(preview?.byteSize)} />
        <Metric
          label="Dimensions"
          value={
            preview?.width && preview.height
              ? `${preview.width} × ${preview.height}`
              : packageValue?.referencePreview?.width &&
                  packageValue.referencePreview.height
                ? `${packageValue.referencePreview.width} × ${packageValue.referencePreview.height}`
                : "Unknown"
          }
        />
        <Metric
          label="QA hook"
          value={
            previewQa.status === "ready"
              ? "Ready"
              : previewQa.status === "warning"
                ? "Review"
                : "Skipped"
          }
        />
      </div>
      <p className="mt-3 text-xs leading-5 text-content-muted">
        {previewQa.message}
      </p>
    </Panel>
  );
};

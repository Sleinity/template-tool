import { Check, Clipboard, PackageOpen } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button, Status } from "../../components/ui";
import { resolvePackageAssetReference } from "../assets";
import { captureTemplatePackagePreview } from "../enrichment/captureTemplatePackagePreview";
import { TemplateInspectionPreview, type ResolvedProductRenderIdentityV1 } from "../render";
import type { ResolvedRenderTreeV1 } from "../resolved";
import type { TemplatePackageV1 } from "../types";
import { createFidelityIssuePacket, downloadFidelityIssuePacket } from "./fidelityIssuePacket";
import {
  diagnosticPresentationLabels,
  getDiagnosticContext,
  getDiagnosticFriendlyTarget,
  getDiagnosticPresentation,
  getDiagnosticPresentationState,
  getPackageQualityIssueTitle,
  serializePackageQualityTechnicalDetails,
} from "./diagnosticPresentation";
import type { DiagnosticUserAction, PackageQualityIssue } from "./types";

interface TemplatePackageDiagnosticContextProps {
  packageValue: TemplatePackageV1;
  resolvedTree?: ResolvedRenderTreeV1 | null;
  productRenderIdentity?: ResolvedProductRenderIdentityV1 | null;
  sourceReferencePng?: string | null;
  onRenderIdentity?: (identity: ResolvedProductRenderIdentityV1) => void;
  issue: PackageQualityIssue | null;
  instances?: PackageQualityIssue[];
  onSelectInstance?: (issue: PackageQualityIssue) => void;
  onAction?: (action: DiagnosticUserAction, issue: PackageQualityIssue) => void;
}

function statusTone(issue: PackageQualityIssue) {
  const state = getDiagnosticPresentationState(issue);
  return state === "blocked" ? "blocked" : state === "review" ? "attention" : state === "repaired" ? "repaired" : "info";
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <dt className="text-xs text-content-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-content-primary">{value}</dd>
    </div>
  );
}

function formatBytes(value: unknown): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < 1024) return `${value} bytes`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function TemplatePackageDiagnosticContext({
  packageValue,
  resolvedTree,
  productRenderIdentity = null,
  sourceReferencePng,
  onRenderIdentity,
  issue,
  instances = [],
  onSelectInstance,
  onAction,
}: TemplatePackageDiagnosticContextProps) {
  const [copied, setCopied] = useState(false);
  const [packetDescription, setPacketDescription] = useState("");
  const [includeCurrentScreenshot, setIncludeCurrentScreenshot] = useState(false);
  const [includeSourceReference, setIncludeSourceReference] = useState(false);
  const [packetState, setPacketState] = useState<"idle" | "creating" | "complete" | "failed">("idle");
  const previewRef = useRef<HTMLDivElement>(null);

  const context = issue ? getDiagnosticContext(issue) : { type: "none" as const };
  const presentation = issue ? getDiagnosticPresentation(issue) : null;
  const assetResolution = useMemo(
    () => issue?.assetId ? resolvePackageAssetReference(packageValue, issue.assetId) : null,
    [issue?.assetId, packageValue],
  );
  const field = issue?.fieldId
    ? packageValue.editableFields.find((candidate) => candidate.id === issue.fieldId)
    : undefined;
  const hasVisualTarget = Boolean(issue?.nodeId);
  const visualTargetIds = Array.from(
    new Set(
      [issue, ...instances]
        .flatMap((candidate) => candidate?.nodeId ? [candidate.nodeId] : []),
    ),
  );
  const heading = context.type === "asset"
    ? "Asset details"
    : context.type === "font"
      ? "Font usage"
      : context.type === "field"
        ? "Field target"
        : context.type === "visual-target"
          ? "Affected preview"
          : "Package details";

  if (!issue || !presentation) {
    return (
      <section className="validate-affected-preview" data-testid="quality-context-panel">
        <h2 className="ui-section-title">Validation complete</h2>
        <p className="text-sm leading-6 text-content-muted">
          No unresolved diagnostic is selected. Repaired items and technical notes remain available through filters.
        </p>
        <TemplateInspectionPreview packageValue={packageValue} dimUnselected={false} onRenderIdentity={onRenderIdentity} />
      </section>
    );
  }

  const targetName = getDiagnosticFriendlyTarget(issue);
  return (
    <section
      className="validate-affected-preview"
      data-testid="quality-context-panel"
      aria-live="polite"
      aria-atomic="true"
    >
      <div>
        <p className="text-sm font-medium text-content-muted">{heading}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="ui-section-title">{getPackageQualityIssueTitle(issue)}</h2>
          <Status tone={statusTone(issue)}>
            {diagnosticPresentationLabels[getDiagnosticPresentationState(issue)]}
          </Status>
        </div>
        {targetName ? <p className="mt-1 text-sm font-medium text-content-secondary">{targetName}</p> : null}
        <p className="mt-3 text-sm leading-6 text-content-secondary">{presentation.userSummary}</p>
        {presentation.userImpact ? (
          <div className="mt-3 border-l-2 border-line-strong pl-3">
            <p className="text-xs font-medium text-content-muted">Impact</p>
            <p className="mt-1 text-sm leading-6 text-content-primary">{presentation.userImpact}</p>
          </div>
        ) : null}
        {presentation.userAction && onAction ? (
          <Button className="mt-4" variant={getDiagnosticPresentationState(issue) === "blocked" ? "primary" : "secondary"} onClick={() => onAction(presentation.userAction!, issue)}>
            {presentation.userAction.label}
          </Button>
        ) : null}
      </div>

      {hasVisualTarget ? (
        <div ref={previewRef}>
        <TemplateInspectionPreview
          packageValue={packageValue}
          targetNodeIds={visualTargetIds}
          targetFitLabel="Fit affected layer"
          mode={issue.modes?.includes("editor") ? "editor" : "static"}
          onRenderIdentity={onRenderIdentity}
        />
        </div>
      ) : (
        <div className="diagnostic-no-target">
          <p className="font-medium text-content-primary">No visual area is affected</p>
          <p className="mt-1 text-sm leading-6 text-content-muted">
            This diagnostic concerns {context.type === "asset" ? "media metadata" : context.type === "font" ? "font availability" : context.type === "field" ? "field configuration" : "package metadata"} and does not point to a specific rendered layer.
          </p>
        </div>
      )}

      {context.type === "asset" ? (
        <dl className="diagnostic-context-grid">
          <Detail label="Asset" value={targetName ?? assetResolution?.asset.id ?? issue.assetId} />
          <Detail label="Path" value={assetResolution?.manifestPath ?? issue.file ?? issue.path} />
          <Detail label="MIME type" value={assetResolution?.mimeType} />
          <Detail label="Actual size" value={formatBytes(assetResolution?.actualByteSize ?? issue.details?.actualByteSize)} />
          <Detail label="Declared size" value={formatBytes(assetResolution?.declaredByteSize ?? issue.details?.declaredByteSize)} />
          <Detail label="Resolution" value={assetResolution?.status} />
        </dl>
      ) : null}

      {context.type === "font" ? (
        <dl className="diagnostic-context-grid">
          <Detail label="Font" value={(issue.details?.family as string | undefined) ?? targetName ?? issue.ref} />
          <Detail label="Weight" value={issue.details?.weight as number | undefined} />
          <Detail label="Style" value={issue.details?.style as string | undefined} />
          <Detail label="Loaded state" value={issue.details?.status as string | undefined} />
          <Detail label="Source" value={issue.details?.source as string | undefined} />
        </dl>
      ) : null}

      {context.type === "field" ? (
        <dl className="diagnostic-context-grid">
          <Detail label="Field" value={field?.label ?? targetName ?? issue.fieldId} />
          <Detail label="Type" value={field?.type} />
          <Detail label="Target layer" value={issue.nodeName ?? field?.nodeId} />
          <Detail label="Default value" value={typeof field?.defaultValue === "string" ? field.defaultValue : undefined} />
        </dl>
      ) : null}

      {instances.length > 1 ? (
        <details className="border-t border-line-subtle pt-3">
          <summary className="cursor-pointer text-sm text-content-secondary">Affected targets ({instances.length})</summary>
          <div className="mt-2 space-y-1">
            {instances.map((instance) => (
              <button key={instance.id} type="button" className="block w-full rounded-[var(--radius-control)] px-2 py-2 text-left text-sm text-content-muted hover:bg-surface-secondary" onClick={() => onSelectInstance?.(instance)}>
                {getDiagnosticFriendlyTarget(instance) ?? instance.nodeName ?? instance.id}
              </button>
            ))}
          </div>
        </details>
      ) : null}

      {resolvedTree ? (
        <section className="border-t border-line-subtle pt-3" aria-label="Fidelity issue packet">
          <h3 className="text-sm font-medium text-content-primary">Reproducible issue packet</h3>
          <p className="mt-1 text-xs leading-5 text-content-muted">
            Export bounded local evidence for this finding. Raw package and asset bytes are never included.
          </p>
          <label className="mt-3 block text-xs font-medium text-content-muted">
            Expected versus actual behavior
            <textarea
              className="mt-1 min-h-20 w-full rounded-lg border border-line-subtle bg-surface-interactive px-3 py-2 text-sm text-content-primary outline-none focus:border-line-strong"
              value={packetDescription}
              onChange={(event) => setPacketDescription(event.target.value)}
              placeholder="Describe the visible problem and the expected source behavior."
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-content-secondary">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeCurrentScreenshot} onChange={(event) => setIncludeCurrentScreenshot(event.target.checked)} />
              Include current preview pixels
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeSourceReference} disabled={!sourceReferencePng?.startsWith("data:")} onChange={(event) => setIncludeSourceReference(event.target.checked)} />
              Include source reference pixels
            </label>
          </div>
          <Button
            className="mt-3"
            variant="secondary"
            size="small"
            leadingIcon={<PackageOpen size={15} />}
            disabled={!packetDescription.trim() || packetState === "creating"}
            loading={packetState === "creating"}
            loadingLabel="Creating packet"
            onClick={() => {
              void (async () => {
                setPacketState("creating");
                try {
                  const currentScreenshot = includeCurrentScreenshot && previewRef.current
                    ? (await captureTemplatePackagePreview(previewRef.current, packageValue)).pngDataUrl
                    : null;
                  const packet = createFidelityIssuePacket({
                    packageValue,
                    resolvedTree,
                    issue,
                    productRenderIdentity,
                    operatorDescription: packetDescription,
                    currentScreenshot,
                    sourceReference: includeSourceReference ? sourceReferencePng : null,
                  });
                  downloadFidelityIssuePacket(packet);
                  setPacketState("complete");
                } catch {
                  setPacketState("failed");
                }
              })();
            }}
          >
            Export fidelity issue packet
          </Button>
          {packetState === "complete" ? <p className="mt-2 text-xs text-content-muted">Issue packet downloaded.</p> : null}
          {packetState === "failed" ? <p className="mt-2 text-xs text-[var(--color-status-blocked-fg)]">The packet could not be created. Check preview readiness and try again.</p> : null}
        </section>
      ) : null}

      <details className="border-t border-line-subtle pt-3">
        <summary className="cursor-pointer text-sm text-content-muted">Issue technical details</summary>
        <div className="mt-3">
          {issue.origins.includes("backend-decision") ? (
            <dl className="diagnostic-context-grid mb-3">
              <Detail label="Capability" value={issue.capabilityId} />
              <Detail label="Region" value={issue.regionId} />
              <Detail label="Renderer owner" value={issue.backendOwner} />
              <Detail label="Support" value={issue.supportLevel} />
              <Detail label="Confidence" value={issue.confidence} />
              <Detail label="Visual impact" value={issue.visualImpact} />
              <Detail label="User repair" value={issue.userRepairable ? "Available" : "Not available"} />
              <Detail label="Root cause" value={issue.rootCauseId} />
              <Detail label="Origin boundary" value={issue.originBoundary} />
              <Detail label="Affected surfaces" value={issue.affectedSurfaces?.join(", ")} />
            </dl>
          ) : null}
          {presentation.developerNote ? (
            <div className="mb-3">
              <p className="text-xs font-medium text-content-muted">Developer note</p>
              <p className="mt-1 text-sm leading-6 text-content-secondary">{presentation.developerNote}</p>
            </div>
          ) : null}
          <Button
            variant="quiet"
            size="small"
            leadingIcon={copied ? <Check size={15} /> : <Clipboard size={15} />}
            onClick={() => {
              void navigator.clipboard.writeText(serializePackageQualityTechnicalDetails(issue));
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? "Copied" : "Copy technical details"}
          </Button>
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-content-muted">
            {serializePackageQualityTechnicalDetails(issue)}
          </pre>
        </div>
      </details>
    </section>
  );
}

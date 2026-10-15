import { useCallback, useMemo, useState } from "react";
import type { ReactTemplateFieldSessionV2 } from "@sleinity/template-react";
import { getPackageQualityWorkspaceCounts, groupPackageQualityIssues, type PackageQualityIssue } from "@sleinity/template-react/inspection";
import { Button, Select, Status } from "../components/ui";
import { TemplatePackageQualityPanel } from "../components/template-package/quality/TemplatePackageQualityPanel";
import { TemplatePackageDiagnosticContext } from "../components/template-package/quality/TemplatePackageDiagnosticContext";
import { SetupPreview, SetupPreviewPanel } from "./SetupPreview";
import type { createSetupQualityReport } from "./setupQualityReport";
import type { StudioDiagnosticEvidence, StudioDiagnosticOwner } from "./studioDiagnosticProjection";
import { SetupActionGroup, SetupOutcome } from "./SetupPagePrimitives";
export type SetupIssueOwner = StudioDiagnosticOwner;
export type SetupIssue = StudioDiagnosticEvidence;

export function SetupValidationWorkbench({ session, quality, family, selectedVariantId, checked, checking, onSelectVariant, onInspectVariant, checkFailure, onCheckAll, onCheckCurrent, onCancelCheck, onOpenOwner }: {
  session: ReactTemplateFieldSessionV2;
  quality: ReturnType<typeof createSetupQualityReport>;
  family?: readonly { id: string; label: string }[];
  selectedVariantId?: string;
  checked?: Record<string, { ready: boolean; quality: ReturnType<typeof createSetupQualityReport> }>;
  checking?: string;
  onSelectVariant(id: string): Promise<boolean>;
  onInspectVariant(id: string): void;
  checkFailure?: string | null;
  onCheckAll(): void;
  onCheckCurrent(): void;
  onCancelCheck(): void;
  onOpenOwner(issue: SetupIssue): void;
}) {
  const [scope, setScope] = useState<string>(selectedVariantId ?? "all");
  const allVariants = scope === "all";
  const chooseDesign = async (id: string) => {
    const target = id === "all" ? family?.[0]?.id : id;
    if (!target || !await onSelectVariant(target)) return;
    setSelected(null);
    setScope(id);
  };
  const displayQuality = useMemo(() => {
    if (!quality) return quality;
    const withLabel = (value: NonNullable<typeof quality>, id: string) => ({ ...value, report: { ...value.report, issues: value.report.issues.map(issue => ({ ...issue, details: { ...issue.details, variantId: id, variantLabel: family?.find(design => design.id === id)?.label } })) } });
    if (!allVariants) {
      const value = scope === selectedVariantId ? quality : checked?.[scope]?.quality;
      return value ? withLabel(value, scope) : { ...quality, report: { ...quality.report, issues: [] }, evidenceStates: { import: "Unchecked" } };
    }
    const reports = family?.map(variant => variant.id === selectedVariantId ? quality : checked?.[variant.id]?.quality).filter(value => value != null) ?? [quality];
    const worst = (values: Array<"ready" | "review" | "blocked">): "ready" | "review" | "blocked" => values.includes("blocked") ? "blocked" : values.includes("review") ? "review" : "ready";
    const health = { ...quality.report.health };
    for (const key of Object.keys(health) as Array<keyof typeof health>) health[key] = worst(reports.map(value => value.report.health[key]));
    const evidenceStates = Object.assign({}, ...reports.map(value => value.evidenceStates));
    if (reports.length !== family?.length) for (const key of Object.keys(health)) evidenceStates[key] = "Stale";
    return { report: { ...quality.report, status: worst(reports.map(value => value.report.status)), health, issues: reports.flatMap(value => value.report.issues).map(issue => ({ ...issue, details: { ...issue.details, variantLabel: family?.find(variant => variant.id === issue.details?.variantId)?.label } })) }, evidenceStates };
  }, [quality, allVariants, scope, family, checked, selectedVariantId]);
  const [selected, setSelected] = useState<PackageQualityIssue | null>(null);
  const snapshot = session.getSnapshot();
  const packageValue = snapshot.rendererPackage;
  const selectIssue = useCallback((issue: PackageQualityIssue | null) => {
    setSelected(issue);
    if (typeof issue?.details?.variantId === "string") onInspectVariant(issue.details.variantId);

  }, [onInspectVariant]);
  const groups = useMemo(() => groupPackageQualityIssues(displayQuality?.report.issues ?? []), [displayQuality?.report.issues]);
  const instances = selected ? groups.find(group => group.issues.some(issue => issue.id === selected.id))?.issues ?? [selected] : [];
  const owner = selected?.category === "fonts" ? "fonts" : selected?.category === "fields" && !selected.code.startsWith("field-family.") ? "fields" : "package";
  const openOwner = () => selected && onOpenOwner({ id: selected.id, title: selected.code, message: selected.message, severity: selected.severity === "error" ? "blocked" : "attention", owner, fieldId: selected.fieldId, variantId: typeof selected.details?.variantId === "string" ? selected.details.variantId : selectedVariantId, configurationScope: selected.details?.configurationScope === "variant" ? "variant" : "common" });
  const preview = packageValue ? <SetupPreviewPanel mode="inspection" selector={family?.length ? <Select label="Preview design" value={selectedVariantId} disabled={Boolean(checking)} onChange={event => void chooseDesign(event.target.value)}>{family.map(variant => <option key={variant.id} value={variant.id}>{variant.label}</option>)}</Select> : undefined}>
    <SetupPreview session={session} width={packageValue.canvas.width} height={packageValue.canvas.height} highlightNodeId={selected?.nodeId} />
  </SetupPreviewPanel> : <Status tone="attention">Preview evidence unavailable</Status>;
  const counts = displayQuality ? getPackageQualityWorkspaceCounts(displayQuality.report.issues) : null;
  const coverage = family?.length ? family.filter(design => checked?.[design.id]).length : Object.keys(checked ?? {}).length;
  const total = family?.length ?? 1;
  return <section aria-label="Validation workbench" className="studio-restored-validation" data-sdk-export-ready={snapshot.readiness.exportReady ? "true" : "false"}>

    <SetupOutcome
      role="status"
      title={checking ? "Checking designs…" : checkFailure ? "Checks could not finish" : counts?.blockers ? `${counts.blockers} issues require action` : coverage < total ? "Check every design before saving" : snapshot.readiness.exportReady ? "Ready to continue" : "Current checks required"}
      tone={checkFailure ? "attention" : counts?.blockers ? "blocked" : counts?.warnings || coverage < total ? "attention" : snapshot.readiness.exportReady ? "ready" : "attention"}
      actions={<SetupActionGroup>{checking ? <Button variant="secondary" onClick={onCancelCheck}>Cancel check</Button> : <><Button size="small" variant="secondary" disabled={!packageValue} onClick={() => { setSelected(null); onCheckAll(); }}>{coverage ? "Check again" : "Run checks"}</Button>{family && family.length > 1 && <Button size="small" variant="quiet" disabled={!packageValue} onClick={() => { setSelected(null); onCheckCurrent(); }}>Check preview design</Button>}</>}</SetupActionGroup>}
    >{checkFailure && <p>{checkFailure}</p>}<p>{coverage} of {total} designs checked{counts?.warnings ? ` · ${counts.warnings} warning locations` : ""}.</p></SetupOutcome>
    <div className="studio-restored-validation__columns">
      <div className="studio-checks-list-column">
        {displayQuality ? <TemplatePackageQualityPanel compact scopeControl={family && family.length > 1 ? <Select label="Show issues from" value={scope} disabled={Boolean(checking)} onChange={event => void chooseDesign(event.target.value)}><option value="all">All designs</option>{family.map(design => <option key={design.id} value={design.id}>{design.label}{checked?.[design.id] ? "" : " · Not checked"}</option>)}</Select> : null} selectionPending={snapshot.readiness.state === "pending" || snapshot.readiness.state === "idle"} selectionDisabled={Boolean(checking)} report={displayQuality.report} evidenceStates={displayQuality.evidenceStates} selectedIssueId={selected?.id} onSelectIssue={selectIssue}
          renderIssueDetails={issue => packageValue && selected ? <><p className="studio-check-next-action">{owner === "fonts" ? "Link or upload the required face in Fonts." : owner === "fields" ? "Correct the affected field in Fields." : /duplicate.*field|field.*duplicate/i.test(issue.code) ? "Give exported fields unique IDs, then replace the ZIP in Designs." : issue.category === "renderer" ? "Review the highlighted region; renderer limitations are listed in technical details." : "Review the source evidence below. Source corrections require a replacement ZIP in Designs."}</p><TemplatePackageDiagnosticContext key={issue.id} compact inline packageValue={packageValue} resolvedTree={snapshot.resolvedTree} issue={issue} instances={instances} onSelectInstance={selectIssue} preview={false}
            customAction={owner === "package" ? undefined : { label: owner === "fields" ? "Edit field settings" : "Resolve fonts", onClick: openOwner }} /></> : null}
        /> : <Status tone="attention">Checks are not available yet.</Status>}
      </div>
      {preview}

    </div>
  </section>;
}

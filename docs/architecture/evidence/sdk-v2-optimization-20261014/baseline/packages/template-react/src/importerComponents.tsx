import {
  useEffect,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from "react";
import type {
  PackageImageFieldConstraints,
  PackageTextFieldConstraints,
} from "@sleinity/template-core";
import type {
  TemplateImportFontValidationReportV1,
  TemplateImportFieldRulePatchV1,
  TemplateImportFieldRuleV1,
  TemplateImportIssueV1,
  TemplateImportPackageSummaryV1,
  TemplateImportRenderValidationReportV1,
  TemplateImportValidationReportV1,
} from "@sleinity/template-browser/importer";

function classes(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

function issueCountLabel(count: number): string {
  return count === 1 ? "1 issue" : `${count} issues`;
}

function statusLabel(status: string): string {
  if (status === "ready") return "Ready";
  if (status === "warning") return "Needs review";
  if (status === "blocked" || status === "error") return "Blocked";
  return "Checking";
}

function guidanceForPhase(phase: string): string {
  const guidance: Record<string, string> = {
    zip: "Choose an intact TemplatePackage ZIP.",
    manifest: "Include the required package files and manifest entries.",
    schema: "Export the package with a supported TemplatePackage version.",
    semantics: "Correct invalid template dimensions, nodes, or package values.",
    bindings: "Repair editable-field targets and supported properties.",
    assets: "Include every referenced asset with valid metadata.",
    features: "Review unsupported or partially supported template features.",
  };
  return guidance[phase] ?? "Review the affected package data.";
}

function technicalIssueDetails(issue: TemplateImportIssueV1): ReactNode {
  if (!issue.details && !issue.fieldId && !issue.requirementId) return null;
  return (
    <details className="template-importer__technical-details">
      <summary>Technical details</summary>
      <pre>{JSON.stringify({
        code: issue.code,
        fieldId: issue.fieldId,
        requirementId: issue.requirementId,
        ...issue.details,
      }, null, 2)}</pre>
    </details>
  );
}

export interface TemplateImportValidationSummaryProps {
  report: TemplateImportValidationReportV1 | null;
  packageSummary?: TemplateImportPackageSummaryV1 | null;
  sourceFilename?: string | null;
  fontReport?: TemplateImportFontValidationReportV1 | null;
  renderReport?: TemplateImportRenderValidationReportV1 | null;
  className?: string;
  style?: CSSProperties;
  renderIssue?: (issue: TemplateImportIssueV1) => ReactNode;
}

interface ValidationFindingPresentation {
  issue: TemplateImportIssueV1;
  area: string;
  impact: string;
  repairGuidance: string;
  evidence: unknown[];
}

function issueIdentity(issue: TemplateImportIssueV1): string {
  const details = issue.details ?? {};
  return [
    issue.code,
    issue.fieldId ?? "",
    issue.requirementId ?? "",
    String(details.path ?? ""),
    String(details.nodeId ?? ""),
  ].join(":");
}

function aggregateStatus(
  report: TemplateImportValidationReportV1 | null,
  fontReport?: TemplateImportFontValidationReportV1 | null,
  renderReport?: TemplateImportRenderValidationReportV1 | null,
): "ready" | "warning" | "blocked" | "running" {
  const statuses = [report?.status, fontReport?.status, renderReport?.status].filter(Boolean);
  if (statuses.some((status) => status === "blocked" || status === "error")) return "blocked";
  if (statuses.some((status) => status === "running" || status === "stale" || status === "not-run")) return "running";
  if (statuses.some((status) => status === "warning")) return "warning";
  return report ? "ready" : "running";
}

export function TemplateImportValidationSummary({
  report,
  packageSummary,
  sourceFilename,
  fontReport,
  renderReport,
  className,
  style,
  renderIssue,
}: TemplateImportValidationSummaryProps) {
  if (!report) {
    return <p className={className} style={style}>Validation has not run yet.</p>;
  }
  const phaseTitles: Record<string, string> = {
    zip: "ZIP and files",
    manifest: "Package manifest",
    schema: "Schema and version",
    semantics: "Template semantics",
    bindings: "Editable-field bindings",
    assets: "Assets",
    features: "Feature support",
  };
  const findings = report.findings ?? report.diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    severity: diagnostic.severity,
    phase: Object.values(report.phases).find((phase) =>
      phase.diagnostics.some((candidate) => candidate === diagnostic ||
        candidate.code === diagnostic.code && candidate.message === diagnostic.message))?.id ?? "semantics",
    target: { kind: "package" as const },
    impact: diagnostic.severity === "error"
      ? "This prevents the template from being imported."
      : "The template can continue, but this may affect editing or preview quality.",
    repairGuidance: guidanceForPhase("semantics"),
    diagnostic,
  }));
  const presentedFindings: ValidationFindingPresentation[] = findings.map((finding) => {
    const diagnostic = finding.diagnostic;
    return {
      issue: {
        code: finding.code,
        severity: finding.severity,
        message: diagnostic.message,
        details: {
          category: diagnostic.category,
          path: diagnostic.path,
          nodeId: diagnostic.nodeId,
          target: finding.target,
          ...diagnostic.details,
        },
      },
      area: phaseTitles[finding.phase] ?? finding.phase,
      impact: finding.impact,
      repairGuidance: finding.repairGuidance,
      evidence: [diagnostic],
    };
  });
  for (const requirement of fontReport?.requirements ?? []) {
    for (const diagnostic of requirement.diagnostics) {
      if (diagnostic.code === "font.emoji-platform-fallback") continue;
      presentedFindings.push({
        issue: diagnostic,
        area: `Required font: ${requirement.family}`,
        impact: diagnostic.severity === "error"
          ? "The exact font cannot be used by the current template revision."
          : "This may affect text appearance or measurement.",
        repairGuidance: "Provide the exact required font file and try again.",
        evidence: [diagnostic],
      });
    }
  }
  for (const diagnostic of [
    ...(fontReport?.blockers ?? []),
    ...(fontReport?.warnings ?? []),
  ]) {
    presentedFindings.push({
      issue: diagnostic,
      area: "Required fonts",
      impact: diagnostic.severity === "error"
        ? "The exact font cannot be used by the current template revision."
        : "This may affect text appearance or measurement.",
      repairGuidance: "Provide the exact required font file and try again.",
      evidence: [diagnostic],
    });
  }
  for (const diagnostic of [
    ...(renderReport?.diagnostics ?? []),
    ...(renderReport?.blockers ?? []),
    ...(renderReport?.warnings ?? []),
  ]) {
    presentedFindings.push({
      issue: diagnostic,
      area: "Renderer",
      impact: diagnostic.severity === "error"
        ? "The current template revision cannot be confirmed."
        : "This may affect preview or export fidelity.",
      repairGuidance: "Resolve the reported package, font, or asset issue and validate again.",
      evidence: [diagnostic],
    });
  }
  const uniqueFindings = new Map<string, ValidationFindingPresentation>();
  for (const finding of presentedFindings) {
    const identity = issueIdentity(finding.issue);
    const existing = uniqueFindings.get(identity);
    if (existing) existing.evidence.push(...finding.evidence);
    else uniqueFindings.set(identity, finding);
  }
  const unresolved = [...uniqueFindings.values()];
  const counts = {
    blockers: unresolved.filter(({ issue }) => issue.severity === "error").length,
    warnings: unresolved.filter(({ issue }) => issue.severity === "warning").length,
    repairs: report.counts?.repairs ?? 0,
    notes: unresolved.filter(({ issue }) => issue.severity === "info").length,
  };
  const aggregate = aggregateStatus(report, fontReport, renderReport);
  const title = aggregate === "ready"
    ? "Template ready"
    : aggregate === "warning"
      ? "Review recommended"
      : aggregate === "blocked"
        ? "Template blocked"
        : "Checking template";
  const checkRows = [
    { label: "Package", status: report.status },
    ...(fontReport ? [{ label: "Required fonts", status: fontReport.status }] : []),
    ...(renderReport ? [{ label: "Renderer", status: renderReport.status }] : []),
  ];
  return (
    <section
      className={classes("template-importer__validation-summary", className)}
      style={style}
      data-status={aggregate}
      aria-label="Template validation summary"
      aria-live="polite"
    >
      <header className="template-importer__validation-header">
        <div>
          <strong>{title}</strong>
          <p>
            {aggregate === "ready"
              ? "Package, fonts, and renderer are ready."
              : aggregate === "running"
                ? "Current-revision checks are still running."
                : `${counts.blockers} blocked · ${counts.warnings} to review${counts.repairs ? ` · ${counts.repairs} repaired` : ""}${counts.notes ? ` · ${counts.notes} notes` : ""}`}
          </p>
        </div>
      </header>
      <div className="template-importer__validation-checks" aria-label="Validation checks">
        {checkRows.map((check) => (
          <div key={check.label} data-status={check.status}>
            <strong>{check.label}</strong>
            <span className="template-importer__validation-status" data-status={check.status}>
              {statusLabel(check.status)}
            </span>
          </div>
        ))}
      </div>
      {packageSummary || sourceFilename ? (
        <dl className="template-importer__validation-facts">
          {sourceFilename ? <div><dt>File</dt><dd title={sourceFilename}>{sourceFilename}</dd></div> : null}
          {packageSummary ? <>
            <div><dt>Package</dt><dd title={packageSummary.name}>{packageSummary.name}</dd></div>
            <div><dt>Dimensions</dt><dd>{packageSummary.width} × {packageSummary.height}</dd></div>
            <div><dt>Fields</dt><dd>{packageSummary.editableFieldCount}</dd></div>
            <div><dt>Assets</dt><dd>{packageSummary.assetCount}</dd></div>
            <div><dt>Fonts</dt><dd>{packageSummary.requiredFontCount}</dd></div>
          </> : null}
        </dl>
      ) : null}
      <div className="template-importer__validation-findings">
        {unresolved.length ? unresolved.map((finding, index) => (
          <article key={`${issueIdentity(finding.issue)}:${index}`} role={finding.issue.severity === "error" ? "alert" : undefined}>
            {renderIssue ? renderIssue(finding.issue) : <>
              <div className="template-importer__validation-finding-heading">
                <strong>{finding.issue.message}</strong>
                <span>{finding.area}</span>
              </div>
              <p>{finding.impact}</p>
              <p><strong>Next step:</strong> {finding.repairGuidance}</p>
            </>}
          </article>
        )) : <p className="template-importer__validation-empty">✓ No unresolved diagnostics</p>}
      </div>
      {unresolved.length ? (
        <details className="template-importer__technical-details template-importer__technical-details--summary">
          <summary>Technical details</summary>
          <pre>{JSON.stringify(unresolved.map((finding) => ({
            area: finding.area,
            code: finding.issue.code,
            severity: finding.issue.severity,
            fieldId: finding.issue.fieldId,
            requirementId: finding.issue.requirementId,
            details: finding.issue.details,
            evidence: finding.evidence,
          })), null, 2)}</pre>
        </details>
      ) : null}
    </section>
  );
}

export interface TemplateImportRenderValidationSummaryProps {
  report: TemplateImportRenderValidationReportV1;
  className?: string;
  style?: CSSProperties;
  renderIssue?: (issue: TemplateImportIssueV1) => ReactNode;
}

export function TemplateImportRenderValidationSummary({
  report,
  className,
  style,
  renderIssue,
}: TemplateImportRenderValidationSummaryProps) {
  const issues = report.diagnostics;
  const title = statusLabel(report.status);
  return (
    <section
      className={classes("template-importer__validation-summary", className)}
      style={style}
      data-status={report.status}
      aria-label="Render validation summary"
    >
      <header>
        <div>
          <strong>{title}</strong>
          <p>
            {issues.length
              ? issueCountLabel(issues.length)
              : report.status === "ready"
                ? "The current revision passed renderer readiness checks."
                : "The preview is still settling."}
          </p>
        </div>
        <span data-status={report.status}>{statusLabel(report.status)}</span>
      </header>
      {issues.length ? (
        <div className="template-importer__validation-issues">
          {issues.map((issue, index) => (
            <article key={`${issue.code}:${index}`} role={issue.severity === "error" ? "alert" : undefined}>
              {renderIssue ? renderIssue(issue) : (
                <>
                  <p><strong>{issue.message}</strong></p>
                  {technicalIssueDetails(issue)}
                </>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

const configurableTypes = new Set(["text", "textarea", "image"]);
const imageFormats = [
  ["JPEG", "image/jpeg"],
  ["PNG", "image/png"],
  ["WebP", "image/webp"],
  ["SVG", "image/svg+xml"],
] as const;

function fieldTypeLabel(type: TemplateImportFieldRuleV1["type"]): string {
  return ({
    text: "Text",
    textarea: "Text area",
    image: "Image",
    number: "Number",
    date: "Date",
    color: "Colour",
    boolean: "Option",
  } as Record<string, string>)[type] ?? type;
}

function fieldDisplayLabel(field: TemplateImportFieldRuleV1): string {
  const label = field.label || field.fieldId;
  return label.toLowerCase() === "cta" ? "CTA" : label;
}

function ruleSummary(field: TemplateImportFieldRuleV1): string {
  if (field.type === "image") {
    const constraints = (field.constraints ?? {}) as PackageImageFieldConstraints;
    const mode = constraints.replacementMode === "contain"
      ? "Fit"
      : constraints.replacementMode === "user-crop"
        ? "Host crop"
        : constraints.replacementMode === "preserve-original-crop"
          ? "Imported crop"
          : "Fill";
    const formats = constraints.allowedMimeTypes?.map((mime) =>
      imageFormats.find(([, value]) => value === mime)?.[0] ?? mime).join("/");
    return `${formats ? `${formats} · ` : ""}${constraints.maxFileSizeMb ? `Max ${constraints.maxFileSizeMb} MB · ` : ""}${mode}`;
  }
  if (field.type === "text" || field.type === "textarea") {
    const constraints = (field.constraints ?? {}) as PackageTextFieldConstraints;
    const details = [
      constraints.maxCharacters ? `Max ${constraints.maxCharacters} characters` : null,
      field.type === "textarea" && constraints.maxLines
        ? `${constraints.maxLines} line${constraints.maxLines === 1 ? "" : "s"}`
        : null,
    ].filter(Boolean);
    return details.length ? details.join(" · ") : "No limits";
  }
  return "";
}

function DraftNumberInput({
  label,
  value,
  integer,
  onValue,
}: {
  label: string;
  value: number | undefined;
  integer?: boolean;
  onValue(value: number | undefined): void;
}) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));
  useEffect(() => {
    if (draft === "" && value === undefined) return;
    if (Number(draft) === value) return;
    if (Number.isFinite(Number(draft))) return;
    setDraft(value === undefined ? "" : String(value));
  }, [value]);
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        min={0}
        step={integer ? 1 : 0.1}
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          onValue(next === "" ? undefined : Number(next));
        }}
      />
    </label>
  );
}

function DefaultValue({ field }: { field: TemplateImportFieldRuleV1 }) {
  const value = field.defaultValue == null ? "Empty" : String(field.defaultValue);
  return (
    <div className="template-importer__field-default">
      <span>Template default</span>
      <strong title={value}>{value}</strong>
    </div>
  );
}

export interface TemplateImportFieldRulesEditorProps {
  fields: TemplateImportFieldRuleV1[];
  onUpdateField(ruleId: string, patch: TemplateImportFieldRulePatchV1): void;
  onReorderField(ruleId: string, nextIndex: number): void;
  className?: string;
  fieldClassName?: string;
  selectedRuleId?: string | null;
  onSelectField?: (field: TemplateImportFieldRuleV1) => void;
  renderDefault?: (field: TemplateImportFieldRuleV1) => ReactNode;
}

export function TemplateImportFieldRulesEditor({
  fields,
  onUpdateField,
  onReorderField,
  className,
  fieldClassName,
  selectedRuleId = null,
  onSelectField,
  renderDefault,
}: TemplateImportFieldRulesEditorProps) {
  const [expanded, setExpanded] = useState<string | null>(
    selectedRuleId ?? fields[0]?.ruleId ?? null,
  );
  const [dragged, setDragged] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    ruleId: string;
    position: "before" | "after";
  } | null>(null);
  useEffect(() => {
    if (selectedRuleId) setExpanded(selectedRuleId);
  }, [selectedRuleId]);
  const move = (field: TemplateImportFieldRuleV1, index: number) => {
    onReorderField(field.ruleId, Math.max(0, Math.min(fields.length - 1, index)));
  };
  const moveDroppedField = (
    draggedRuleId: string,
    targetRuleId: string,
    position: "before" | "after",
  ) => {
    const sourceIndex = fields.findIndex((field) => field.ruleId === draggedRuleId);
    const targetIndex = fields.findIndex((field) => field.ruleId === targetRuleId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const nextIndex = position === "before"
      ? sourceIndex < targetIndex ? targetIndex - 1 : targetIndex
      : sourceIndex < targetIndex ? targetIndex : targetIndex + 1;
    onReorderField(draggedRuleId, Math.max(0, Math.min(fields.length - 1, nextIndex)));
  };
  return (
    <div className={classes("template-importer__fields", className)}>
      <div className="template-importer__field-list" aria-label="Template fields">
      {fields.map((field, index) => {
        const text = (field.constraints ?? {}) as PackageTextFieldConstraints;
        const image = (field.constraints ?? {}) as PackageImageFieldConstraints;
        const configurable = configurableTypes.has(field.type);
        const open = expanded === field.ruleId;
        const patchConstraints = (constraints: PackageTextFieldConstraints | PackageImageFieldConstraints) =>
          onUpdateField(field.ruleId, { constraints });
        return (
          <section
            key={field.ruleId}
            className={classes("template-importer__field", fieldClassName)}
            draggable
            data-status={field.validation.status}
            data-expanded={open || undefined}
            data-dragging={dragged === field.ruleId || undefined}
            data-drop-position={dropTarget?.ruleId === field.ruleId ? dropTarget.position : undefined}
            onDragStart={(event: DragEvent<HTMLElement>) => {
              const origin = event.target as HTMLElement;
              if (origin.closest("button, input, select, textarea, label, details, a, [contenteditable='true']")) {
                event.preventDefault();
                return;
              }
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", field.ruleId);
              setDragged(field.ruleId);
            }}
            onDragOver={(event: DragEvent<HTMLElement>) => {
              if (!dragged || dragged === field.ruleId) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              const bounds = event.currentTarget.getBoundingClientRect();
              setDropTarget({
                ruleId: field.ruleId,
                position: event.clientY < bounds.top + bounds.height / 2 ? "before" : "after",
              });
            }}
            onDragLeave={(event: DragEvent<HTMLElement>) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDropTarget((current) => current?.ruleId === field.ruleId ? null : current);
              }
            }}
            onDragEnd={() => {
              setDragged(null);
              setDropTarget(null);
            }}
            onDrop={(event: DragEvent<HTMLElement>) => {
              event.preventDefault();
              if (dragged && dropTarget?.ruleId === field.ruleId) {
                moveDroppedField(dragged, field.ruleId, dropTarget.position);
              }
              setDragged(null);
              setDropTarget(null);
            }}
          >
            <div className="template-importer__field-row">
              <span className="template-importer__drag-handle" aria-hidden="true">⋮⋮</span>
              <button
                type="button"
                className="template-importer__field-toggle"
                aria-expanded={configurable ? open : undefined}
                onClick={() => {
                  if (configurable) setExpanded(open ? null : field.ruleId);
                  onSelectField?.(field);
                }}
              >
              <span>
                <strong>{fieldDisplayLabel(field)}</strong>
                <small>{ruleSummary(field) || "No additional rules"}</small>
              </span>
              {field.validation.status === "blocked" || field.validation.status === "warning" ? (
                <span data-status={field.validation.status}>{field.validation.status === "blocked" ? "Blocked" : "Needs review"}</span>
              ) : null}
              <span className="template-importer__field-type">{fieldTypeLabel(field.type)}</span>
              {configurable ? <span className="template-importer__field-chevron" aria-hidden="true">{open ? "⌃" : "⌄"}</span> : null}
              </button>
              <details className="template-importer__field-menu">
                <summary aria-label={`Reorder ${fieldDisplayLabel(field)}`}>•••</summary>
                <div role="menu" aria-label={`Move ${fieldDisplayLabel(field)}`}>
                  {[
                    ["Move up", index - 1, index === 0],
                    ["Move down", index + 1, index === fields.length - 1],
                    ["Move to top", 0, index === 0],
                    ["Move to bottom", fields.length - 1, index === fields.length - 1],
                  ].map(([label, nextIndex, disabled]) => (
                    <button
                      key={String(label)}
                      type="button"
                      role="menuitem"
                      disabled={Boolean(disabled)}
                      onClick={(event) => {
                        move(field, Number(nextIndex));
                        event.currentTarget.closest("details")?.removeAttribute("open");
                      }}
                    >{String(label)}</button>
                  ))}
                </div>
              </details>
            </div>
            {configurable && open ? (
              <div className="template-importer__field-body">
                {field.targetStatus !== "ready" ? (
                  <p className="template-importer__field-target-warning" role="alert">
                    This field target is {field.targetStatus}. Its rules cannot be applied until the package binding is repaired.
                  </p>
                ) : null}
                {renderDefault?.(field) ?? <DefaultValue field={field} />}
                {field.type === "text" || field.type === "textarea" ? (
                  <div className="template-importer__grid">
                    <DraftNumberInput label="Maximum characters" integer value={text.maxCharacters} onValue={(value) => patchConstraints({ ...text, maxCharacters: value })} />
                    {field.type === "textarea" ? (
                      <DraftNumberInput label="Maximum lines" integer value={text.maxLines} onValue={(value) => patchConstraints({ ...text, maxLines: value })} />
                    ) : null}
                  </div>
                ) : null}
                {field.type === "image" ? (
                  <div className="template-importer__grid">
                    <label>
                      <span>Image placement</span>
                      <select value={image.replacementMode ?? "cover"} onChange={(event) => patchConstraints({ ...image, replacementMode: event.target.value as PackageImageFieldConstraints["replacementMode"] })}>
                        <option value="cover">Fill frame</option>
                        <option value="contain">Fit inside frame</option>
                        <option value="user-crop">Host-provided crop</option>
                      </select>
                    </label>
                    <DraftNumberInput label="Maximum file size (MB)" value={image.maxFileSizeMb} onValue={(value) => patchConstraints({ ...image, maxFileSizeMb: value })} />
                    <DraftNumberInput label="Minimum width (px)" integer value={image.minWidth} onValue={(value) => patchConstraints({ ...image, minWidth: value })} />
                    <DraftNumberInput label="Minimum height (px)" integer value={image.minHeight} onValue={(value) => patchConstraints({ ...image, minHeight: value })} />
                    <label>
                      <span>Aspect ratio</span>
                      <select
                        value={typeof image.aspectRatio === "number" ? "custom" : image.aspectRatio ?? "preserve-frame"}
                        onChange={(event) => patchConstraints({
                          ...image,
                          aspectRatio: event.target.value === "custom" ? 1 : event.target.value as "preserve-frame" | "free",
                        })}
                      >
                        <option value="preserve-frame">Match template frame</option>
                        <option value="free">Any ratio</option>
                        <option value="custom">Custom ratio</option>
                      </select>
                    </label>
                    {typeof image.aspectRatio === "number" ? (
                      <DraftNumberInput label="Custom aspect ratio" value={image.aspectRatio} onValue={(value) => patchConstraints({ ...image, aspectRatio: value ?? "preserve-frame" })} />
                    ) : null}
                    <fieldset className="template-importer__wide template-importer__formats">
                      <legend>Allowed image formats</legend>
                      {imageFormats.map(([label, mime]) => (
                        <label key={mime}>
                          <input
                            type="checkbox"
                            checked={image.allowedMimeTypes?.includes(mime) ?? false}
                            onChange={(event) => {
                              const next = new Set(image.allowedMimeTypes ?? []);
                              if (event.target.checked) next.add(mime);
                              else next.delete(mime);
                              patchConstraints({ ...image, allowedMimeTypes: [...next] });
                            }}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </fieldset>
                    <label className="template-importer__wide">
                      <span>Additional MIME types</span>
                      <input
                        value={(image.allowedMimeTypes ?? []).filter((mime) => !imageFormats.some(([, known]) => known === mime)).join(", ")}
                        placeholder="image/avif"
                        onChange={(event) => {
                          const standard = (image.allowedMimeTypes ?? []).filter((mime) => imageFormats.some(([, known]) => known === mime));
                          const custom = event.target.value.split(",").map((item) => item.trim()).filter(Boolean);
                          patchConstraints({ ...image, allowedMimeTypes: [...standard, ...custom] });
                        }}
                      />
                    </label>
                  </div>
                ) : null}
                {field.validation.blockers.length || field.validation.warnings.length ? (
                  <div className="template-importer__field-issues">
                    {[...field.validation.blockers, ...field.validation.warnings].map((item, issueIndex) => (
                      <p key={`${item.code}:${issueIndex}`} role={item.severity === "error" ? "alert" : "status"} data-severity={item.severity}>
                        {item.message}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
      </div>
      {!fields.length ? <p>No editable fields were declared or derived.</p> : null}
    </div>
  );
}

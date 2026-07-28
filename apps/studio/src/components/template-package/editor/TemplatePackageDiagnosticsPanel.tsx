import {
  AlertTriangle,
  Bug,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import { TemplatePackageStressReports } from "../../../../../../src/template-package/analysis";
import { TemplatePackageLayoutDebugger } from "../../../../../../src/template-package/debug";
import type { TemplatePackageValidationResult } from "../../../../../../src/template-package/packageDiagnostics";
import type { TemplatePackageRenderWarning } from "../../../../../../src/template-package/render";
import type {
  EditableFieldBinding,
  TemplatePackageV1,
} from "../../../../../../src/template-package/types";
import type { PackageEditorFieldWarning } from "../../../../../../src/template-package/editor/packageFieldBindings";
import { getDiagnosticCodeTitle } from "../../../../../../src/template-package/quality";

interface TemplatePackageDiagnosticsPanelProps {
  packageValue: TemplatePackageV1;
  validation: TemplatePackageValidationResult;
  rendererWarnings: TemplatePackageRenderWarning[];
  editorWarnings: PackageEditorFieldWarning[];
  selectedField: EditableFieldBinding | null;
  renderMode: "static" | "editor";
}

export function TemplatePackageDiagnosticsPanel({
  packageValue,
  validation,
  rendererWarnings,
  editorWarnings,
  selectedField,
  renderMode,
}: TemplatePackageDiagnosticsPanelProps) {
  const [showLayoutDebug, setShowLayoutDebug] = useState(false);
  const appWarnings = validation.diagnostics.filter(
    (item) => item.severity === "warning",
  );
  const appErrors = validation.diagnostics.filter(
    (item) => item.severity === "error",
  );
  const pluginDiagnostics = validation.pluginDiagnostics;

  return (
    <div
      data-testid="package-editor-diagnostics"
      className="space-y-2"
    >
      <div className="grid grid-cols-2 gap-2 pb-2 text-sm text-content-muted">
        <span>Template: {appErrors.length} blocked · {appWarnings.length} need attention</span>
        <span>Source notes: {pluginDiagnostics.length}</span>
        <span>Preview: {rendererWarnings.length}</span>
        <span>Fields: {editorWarnings.length}</span>
      </div>

      <details className="rounded-lg border border-line-subtle bg-surface-interactive p-3">
        <summary className="cursor-pointer text-sm font-medium text-content-secondary">
          Template check
        </summary>
        <div className="mt-3 space-y-2">
          {validation.diagnostics.length === 0 ? (
            <p className="flex items-center gap-2 text-xs text-[var(--color-status-repaired-fg)]">
              <CheckCircle2 aria-hidden="true" size={13} />
              No template issues.
            </p>
          ) : (
            validation.diagnostics.map((item, index) => (
              <div
                key={`${item.code}-${item.nodeId ?? ""}-${index}`}
                className="rounded-lg border border-line-subtle bg-white/[0.03] p-2.5"
              >
                <p className="text-xs font-medium text-content-primary">
                  {getDiagnosticCodeTitle(item.code)}
                </p>
                <p className="mt-1 text-sm leading-5 text-content-muted">
                  {item.message}
                </p>
                <details className="mt-2 border-t border-line-subtle pt-2">
                  <summary className="cursor-pointer text-xs text-content-muted">
                    Technical details
                  </summary>
                  <p className="ui-technical-detail mt-2">
                    {[item.code, item.path, item.nodeId].filter(Boolean).join(" · ")}
                  </p>
                </details>
              </div>
            ))
          )}
        </div>
      </details>

      <details className="rounded-lg border border-line-subtle bg-surface-interactive p-3">
        <summary className="cursor-pointer text-sm font-medium text-content-secondary">
          Source notes · {pluginDiagnostics.length}
        </summary>
        <div className="mt-3 space-y-2">
          {pluginDiagnostics.length === 0 ? (
            <p className="text-xs text-content-muted">
              No source notes.
            </p>
          ) : (
            pluginDiagnostics.map((item, index) => (
              <div
                key={`${item.code}-${item.nodeId ?? ""}-${index}`}
                className="rounded-lg border border-line-subtle bg-white/[0.03] p-2.5"
              >
                <p className="text-xs font-medium text-content-primary">
                  {getDiagnosticCodeTitle(item.code)}
                </p>
                <p className="mt-1 text-sm leading-5 text-content-muted">
                  {item.message}
                </p>
                <details className="mt-2 border-t border-line-subtle pt-2">
                  <summary className="cursor-pointer text-xs text-content-muted">
                    Technical details
                  </summary>
                  <p className="ui-technical-detail mt-2">
                    {[item.code, item.nodeId].filter(Boolean).join(" · ")}
                  </p>
                </details>
              </div>
            ))
          )}
        </div>
      </details>

      <details className="rounded-lg border border-line-subtle bg-surface-interactive p-3">
        <summary className="cursor-pointer text-sm font-medium text-content-secondary">
          Preview issues · {rendererWarnings.length}
        </summary>
        <div className="mt-3 space-y-2">
          {rendererWarnings.length === 0 ? (
            <p className="text-xs text-content-muted">No preview issues.</p>
          ) : (
            rendererWarnings.map((item) => (
              <div
                key={`${item.code}-${item.nodeId ?? ""}`}
                className="rounded-lg border border-[var(--color-status-attention-border)] bg-[var(--color-status-attention-bg)] p-2.5"
              >
                <p className="flex items-center gap-2 text-xs font-medium text-[var(--color-status-attention-fg)]">
                  <AlertTriangle aria-hidden="true" size={12} />
                  {getDiagnosticCodeTitle(item.code)}
                </p>
                <p className="mt-1 text-sm leading-5 text-content-muted">
                  {item.message}
                </p>
                <details className="mt-2 border-t border-current/10 pt-2">
                  <summary className="cursor-pointer text-xs text-content-muted">
                    Technical details
                  </summary>
                  <p className="ui-technical-detail mt-2">
                    {[item.code, item.nodeId].filter(Boolean).join(" · ")}
                  </p>
                </details>
              </div>
            ))
          )}
        </div>
      </details>

      <details className="rounded-lg border border-line-subtle bg-surface-interactive p-3">
        <summary className="cursor-pointer text-sm font-medium text-content-secondary">
          Field issues · {editorWarnings.length}
        </summary>
        <div className="mt-3 space-y-2">
          {editorWarnings.length === 0 ? (
            <p className="text-xs text-content-muted">No editor field warnings.</p>
          ) : (
            editorWarnings.map((item) => (
              <div
                key={`${item.fieldId}-${item.code}`}
                className="rounded-lg border border-[var(--color-status-attention-border)] bg-[var(--color-status-attention-bg)] p-2.5"
              >
                <p className="text-xs font-medium text-[var(--color-status-attention-fg)]">
                  {getDiagnosticCodeTitle(item.code)}
                </p>
                <p className="mt-1 text-sm leading-5 text-content-muted">
                  {item.message}
                </p>
                <details className="mt-2 border-t border-current/10 pt-2">
                  <summary className="cursor-pointer text-xs text-content-muted">
                    Technical details
                  </summary>
                  <p className="ui-technical-detail mt-2">
                    {[item.code, item.fieldId, item.nodeId].filter(Boolean).join(" · ")}
                  </p>
                </details>
              </div>
            ))
          )}
        </div>
      </details>

      <TemplatePackageStressReports packageValue={packageValue} />

      {import.meta.env.DEV ? (
        <details className="rounded-lg border border-line-subtle bg-surface-secondary p-3">
          <summary className="cursor-pointer text-sm font-medium text-content-secondary">
            Developer tools
          </summary>
          <button
            type="button"
            onClick={() => setShowLayoutDebug((current) => !current)}
            className="mt-3 inline-flex min-h-[var(--control-height-sm)] items-center gap-2 rounded-control border border-line-default bg-surface-primary px-3 text-sm text-content-primary transition hover:bg-surface-hovered"
          >
            <Bug aria-hidden="true" size={13} />
            {showLayoutDebug ? "Hide layout debug" : "Show layout debug"}
          </button>
          {showLayoutDebug ? (
            <div className="mt-3">
              <TemplatePackageLayoutDebugger
                packageValue={packageValue}
                selectedField={selectedField}
                renderMode={renderMode}
              />
            </div>
          ) : null}
        </details>
      ) : null}
    </div>
  );
}

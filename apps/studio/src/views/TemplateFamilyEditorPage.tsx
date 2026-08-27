import {
  ArrowLeft,
  Download,
  ImagePlus,
  ListChecks,
  RotateCcw,
  Settings,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { type TemplateFamilyFieldScopeV1 } from "@sleinity/template-core/family";
import type { TemplateFamilySessionV1 } from "@sleinity/template-browser/session";
import {
  TemplateFamilySessionProvider,
  TemplateSessionViewport,
  type TemplateFamilyFieldControllerV1,
  type TemplateSessionViewportHandle,
  useTemplateFamilyEditor,
  useTemplateFamilySelection,
} from "@sleinity/template-react/editor";
import { EditorLayout } from "../components/EditorLayout";
import {
  Alert,
  Button,
  CountBadge,
  IconButton,
  Input,
  PreviewWorkspace,
  Select,
  Status,
  Textarea,
  WorkspaceSidePanel,
} from "../components/ui";

export interface TemplateFamilyEditorPageProps {
  session: TemplateFamilySessionV1;
  saveStatus?: "saved" | "saving" | "error";
  onRetrySave?: () => Promise<void>;
  onBack: () => void | Promise<void>;
  onSettings: () => void | Promise<void>;
}

type CaptureState =
  | { status: "idle"; message: null }
  | { status: "preparing" | "complete" | "failed"; message: string };

function scopeLabel(
  scope: TemplateFamilyFieldScopeV1,
  variantTitles: ReadonlyMap<string, string>,
): string {
  if (scope.kind === "family-wide") return "Shared across all variants";
  if (scope.kind === "unbound") return "Unassigned";
  const names = scope.variantIds.map((id) => variantTitles.get(id) ?? id);
  if (scope.kind === "variant-specific") return `${names[0] ?? "Variant"} only`;
  return `Shared across ${names.join(" and ")}`;
}

function FieldScopeBadge({
  controller,
  variantTitles,
}: {
  controller: TemplateFamilyFieldControllerV1;
  variantTitles: ReadonlyMap<string, string>;
}) {
  return (
    <Status
      className="family-editor-field__scope"
      tone={controller.scope.kind === "variant-specific" ? "neutral" : "info"}
    >
      {scopeLabel(controller.scope, variantTitles)}
    </Status>
  );
}

function FamilyFieldControl({
  controller,
  variantTitles,
}: {
  controller: TemplateFamilyFieldControllerV1;
  variantTitles: ReadonlyMap<string, string>;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const warning = controller.selectedVariantIssues[0]?.message;
  const helpText = <FieldScopeBadge controller={controller} variantTitles={variantTitles} />;

  if (controller.field.type === "image") {
    const imageValue = typeof controller.value === "object" && controller.value
      ? controller.value
      : null;
    return (
      <div className="family-editor-field" data-field-scope={controller.scope.kind}>
        <div className="family-editor-field__heading">
          <span className="ui-field__label">{controller.field.title}</span>
          {helpText}
        </div>
        <input
          ref={fileInput}
          className="ui-visually-hidden"
          aria-hidden="true"
          tabIndex={-1}
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (!file || !controller.replaceImage) return;
            const reader = new FileReader();
            reader.onload = () => controller.replaceImage?.({
              dataUrl: String(reader.result),
              mimeType: file.type,
              sizeBytes: file.size,
            });
            reader.readAsDataURL(file);
            event.currentTarget.value = "";
          }}
        />
        <div className="family-editor-field__image-actions">
          <Button
            size="small"
            variant="secondary"
            leadingIcon={<ImagePlus aria-hidden="true" size={15} />}
            onClick={() => fileInput.current?.click()}
          >
            Replace image
          </Button>
          <Button size="small" variant="quiet" onClick={() => controller.reset()}>
            Reset
          </Button>
        </div>
        <p className="ui-help-text">
          {imageValue && "assetRef" in imageValue
            ? `Stored as ${imageValue.assetRef}`
            : "Uses the template default image until replaced."}
        </p>
        {warning ? <p className="ui-field__warning">{warning}</p> : null}
      </div>
    );
  }

  const value = String(controller.value ?? "");
  const constraints = controller.field.rule.constraints;
  const multiline = constraints && "maxLines" in constraints && (constraints.maxLines ?? 1) > 1;
  const commonProps = {
    label: controller.field.title,
    value,
    helpText,
    warning,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      controller.setValue(event.target.value),
  };
  return (
    <div className="family-editor-field" data-field-scope={controller.scope.kind}>
      {multiline ? <Textarea {...commonProps} rows={3} /> : <Input {...commonProps} />}
      <Button size="small" variant="quiet" onClick={() => controller.reset()}>
        Reset field
      </Button>
    </div>
  );
}

function EditorContent({
  session,
  saveStatus = "saved",
  onRetrySave,
  onBack,
  onSettings,
}: TemplateFamilyEditorPageProps) {
  const editor = useTemplateFamilyEditor(session);
  const selection = useTemplateFamilySelection({}, session);
  const viewport = useRef<TemplateSessionViewportHandle>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [captureState, setCaptureState] = useState<CaptureState>({ status: "idle", message: null });
  const family = editor.snapshot.family;
  const selected = family?.variants.find((variant) => variant.id === editor.snapshot.selectedVariantId);
  const variantTitles = useMemo(
    () => new Map(family?.variants.map((variant) => [variant.id, variant.title]) ?? []),
    [family],
  );
  const selectedIssues = editor.diagnostics.issues.filter(
    (issue) => !issue.variantId || issue.variantId === editor.snapshot.selectedVariantId,
  );

  const capture = async () => {
    setCaptureState({ status: "preparing", message: "Preparing current variant…" });
    try {
      const result = await viewport.current?.exportPng();
      if (!result) throw new Error("The current preview is not ready for capture.");
      setCaptureState({ status: "complete", message: `Downloaded ${result.filename}` });
    } catch (cause) {
      setCaptureState({
        status: "failed",
        message: cause instanceof Error ? cause.message : "PNG capture failed.",
      });
    }
  };

  return (
    <>
      <EditorLayout
        panelPosition="left"
        toolbar={
          <div className="workspace-toolbar family-editor-toolbar">
            <Button
              variant="secondary"
              leadingIcon={<ArrowLeft aria-hidden="true" size={16} />}
              onClick={onBack}
            >
              Templates
            </Button>
            <div className="family-editor-toolbar__identity">
              <strong>{family?.title ?? "Template"}</strong>
              <span>{selected?.title ?? "No variant selected"}</span>
            </div>
            <Button
              className="family-editor-toolbar__settings"
              variant="quiet"
              leadingIcon={<Settings aria-hidden="true" size={15} />}
              onClick={onSettings}
            >
              Template settings
            </Button>
          </div>
        }
        panel={
          <WorkspaceSidePanel
            className="workspace-panel family-editor-panel"
            data-testid="family-editor-panel"
            header={
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="ui-subsection-title">Edit shared content</h1>
                  <p className="ui-help-text mt-1">
                    Fields change with the selected variant. Hidden values stay saved.
                  </p>
                </div>
                <Status tone={saveStatus === "error" ? "blocked" : saveStatus === "saving" ? "attention" : "repaired"}>
                  {saveStatus === "error" ? "Save failed" : saveStatus === "saving" ? "Saving…" : "Saved"}
                </Status>
              </div>
            }
            footer={
              <div className="family-editor-panel__footer">
                {saveStatus === "error" ? (
                  <Alert tone="blocked" title="Automatic save failed">
                    <p>Your changes are still open in this browser.</p>
                    {onRetrySave ? (
                      <Button size="small" variant="secondary" onClick={() => void onRetrySave()}>
                        Retry save
                      </Button>
                    ) : null}
                  </Alert>
                ) : null}
                <Button
                  leadingIcon={<Download aria-hidden="true" size={15} />}
                  loading={captureState.status === "preparing"}
                  loadingLabel="Preparing PNG"
                  onClick={() => void capture()}
                >
                  Capture current variant
                </Button>
                {captureState.status !== "idle" ? (
                  <p
                    className="ui-help-text"
                    data-tone={captureState.status === "failed" ? "blocked" : undefined}
                    role={captureState.status === "failed" ? "alert" : "status"}
                  >
                    {captureState.message}
                  </p>
                ) : null}
              </div>
            }
          >
            {editor.snapshot.error ? (
              <Alert tone="blocked" title="Template session is blocked">
                {editor.snapshot.error.message}
              </Alert>
            ) : null}
            <section className="family-editor-field-section">
              <div className="family-editor-field-list">
                {editor.controls.map((control) => {
                  if (control.kind === "direct-variant-selector") {
                    return (
                      <Select
                        key="direct-variant-selector"
                        label="Variant"
                        value={editor.snapshot.selectedVariantId ?? ""}
                        onChange={(event) => selection.selectVariant(event.target.value)}
                      >
                        {selection.variants.map((variant) => (
                          <option value={variant.id} key={variant.id}>{variant.title}</option>
                        ))}
                      </Select>
                    );
                  }
                  if (control.kind === "selection-property") {
                    return (
                      <Select
                        key={control.ref.groupId}
                        label={control.selection.group.title}
                        value={control.selection.selectedOptionId ?? ""}
                        onChange={(event) => selection.selectOption(
                          control.ref.groupId,
                          event.target.value,
                        )}
                      >
                        <option value="" disabled>Choose a value</option>
                        {control.selection.options.map((option) => (
                          <option
                            value={option.optionId}
                            key={option.optionId}
                            disabled={!option.available && !option.selected}
                          >
                            {option.title}{!option.available && !option.selected ? " — unavailable" : ""}
                          </option>
                        ))}
                      </Select>
                    );
                  }
                  return (
                    <FamilyFieldControl
                      key={control.ref.fieldId}
                      controller={control.controller}
                      variantTitles={variantTitles}
                    />
                  );
                })}
              </div>
            </section>
            {editor.visibleFields.length === 0 ? (
              <Alert tone="attention" title="No editable fields in this variant">
                Choose another variant or review its field mapping in Template settings.
              </Alert>
            ) : null}
          </WorkspaceSidePanel>
        }
        preview={
          <div className="workspace-preview family-editor-preview" data-testid="family-working-preview">
            <header className="workspace-preview__header">
              <div>
                <h2 className="ui-subsection-title">Live preview</h2>
                <p className="ui-metadata mt-1">{selected?.title ?? "Select a variant"}</p>
              </div>
              <Button
                variant="secondary"
                leadingIcon={<ListChecks aria-hidden="true" size={15} />}
                aria-expanded={showDiagnostics}
                onClick={() => setShowDiagnostics(true)}
              >
                Diagnostics
                <CountBadge
                  count={editor.diagnostics.counts.blockers + editor.diagnostics.counts.warnings}
                  label="issues"
                />
              </Button>
            </header>
            <PreviewWorkspace className="workspace-preview__body">
              <TemplateSessionViewport
                ref={viewport}
                session={editor.renderSession}
                className="family-editor-preview__viewport"
                fallback={<p className="ui-help-text">Preparing selected variant…</p>}
              />
            </PreviewWorkspace>
            {showDiagnostics ? (
              <button
                type="button"
                aria-label="Close diagnostics"
                className="absolute inset-0 z-20 bg-black/55"
                onClick={() => setShowDiagnostics(false)}
              />
            ) : null}
            <aside
              aria-hidden={!showDiagnostics}
              className={`workspace-diagnostics ${showDiagnostics ? "translate-x-0" : "invisible translate-x-full pointer-events-none"}`}
            >
              <header className="workspace-diagnostics__header">
                <div>
                  <h2 className="ui-subsection-title">Template diagnostics</h2>
                  <p className="ui-metadata mt-1">
                    {selectedIssues.length} current-variant · {editor.diagnostics.issues.length} family-wide
                  </p>
                </div>
                <IconButton
                  label="Close diagnostics panel"
                  icon={<X aria-hidden="true" size={16} />}
                  onClick={() => setShowDiagnostics(false)}
                />
              </header>
              <div className="family-editor-diagnostics">
                {editor.diagnostics.issues.length === 0 ? (
                  <Alert tone="repaired" title="No template issues">
                    The current family and content are ready.
                  </Alert>
                ) : (
                  editor.diagnostics.issues.map((issue, index) => {
                    const field = family?.fields.find((candidate) => candidate.id === issue.fieldId);
                    const variant = family?.variants.find((candidate) => candidate.id === issue.variantId);
                    return (
                      <article className="family-editor-diagnostic" key={`${issue.code}:${issue.variantId ?? "family"}:${issue.fieldId ?? "none"}:${index}`}>
                        <div className="family-editor-diagnostic__heading">
                          <Status tone={issue.severity === "error" ? "blocked" : issue.severity === "warning" ? "attention" : "info"}>
                            {issue.severity}
                          </Status>
                          <strong>{field?.title ?? issue.code}</strong>
                        </div>
                        <p>{issue.message}</p>
                        {variant ? <span className="ui-metadata">Variant: {variant.title}</span> : null}
                      </article>
                    );
                  })
                )}
              </div>
            </aside>
          </div>
        }
      />
    </>
  );
}

export function TemplateFamilyEditorPage(props: TemplateFamilyEditorPageProps) {
  return (
    <TemplateFamilySessionProvider session={props.session}>
      <EditorContent {...props} />
    </TemplateFamilySessionProvider>
  );
}

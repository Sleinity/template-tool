import { useRef } from "react";
import {
  resolveTemplateFamilyVariant,
} from "@sleinity/template-core/family";
import type { TemplateFamilySessionV1 } from "@sleinity/template-browser/session";
import {
  TemplateFamilySessionProvider,
  TemplateSessionViewport,
  type TemplateSessionViewportHandle,
  useTemplateFamilyEditor,
} from "@sleinity/template-react/editor";
import {
  AppShell,
  Alert,
  Button,
  PageContent,
  PageHeader,
  PageWorkspace,
} from "../components/ui";

export interface TemplateFamilyEditorPageProps {
  session: TemplateFamilySessionV1;
  saveStatus?: "saved" | "saving" | "error";
  onBack: () => void;
  onSettings: () => void;
}

function EditorContent({
  session,
  saveStatus = "saved",
  onBack,
  onSettings,
}: TemplateFamilyEditorPageProps) {
  const editor = useTemplateFamilyEditor(session);
  const viewport = useRef<TemplateSessionViewportHandle>(null);
  const family = editor.snapshot.family;
  const selected = family?.variants.find((variant) => variant.id === editor.snapshot.selectedVariantId);

  const selectGroupOption = (groupId: string, optionId: string) => {
    if (!family || !selected) return;
    const selections = { ...selected.groupAssignments, [groupId]: optionId };
    const resolution = resolveTemplateFamilyVariant(family, { groupSelections: selections });
    if (resolution.status === "resolved") session.selectVariant(resolution.variantId);
  };

  return (
    <AppShell>
      <PageWorkspace>
        <PageHeader>
          <div>
            <p className="ui-eyebrow">Shared-content editor</p>
            <h1 className="ui-page-title">{family?.title ?? "Template Family"}</h1>
            <p className="ui-page-description">{selected?.title ?? "No variant"} · {saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : "Saved"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <>
              <Button variant="secondary" onClick={onBack}>Back to templates</Button>
              <Button variant="secondary" onClick={onSettings}>Family settings</Button>
              <Button onClick={() => void viewport.current?.exportPng()}>Capture current variant</Button>
            </>
          </div>
        </PageHeader>
        <PageContent>
          {editor.snapshot.error ? <Alert tone="blocked" title="Family session is blocked">{editor.snapshot.error.message}</Alert> : null}
          <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-5 rounded-xl border border-line-subtle bg-surface-primary p-5">
              <section>
                <h2 className="ui-section-title">Variant</h2>
                {family?.variantGroups.length ? family.variantGroups.map((group) => (
                  <label className="mt-3 grid gap-1 text-sm font-medium" key={group.id}>
                    {group.title}
                    <select
                      value={selected?.groupAssignments[group.id] ?? ""}
                      onChange={(event) => selectGroupOption(group.id, event.target.value)}
                    >
                      {group.options.map((option) => {
                        const resolution = resolveTemplateFamilyVariant(family, {
                          groupSelections: { ...(selected?.groupAssignments ?? {}), [group.id]: option.id },
                        });
                        return <option disabled={resolution.status === "no-match"} value={option.id} key={option.id}>{option.title}</option>;
                      })}
                    </select>
                  </label>
                )) : (
                  <select
                    value={editor.snapshot.selectedVariantId ?? ""}
                    onChange={(event) => session.selectVariant(event.target.value)}
                  >
                    {family?.variants.map((variant) => <option value={variant.id} key={variant.id}>{variant.title}</option>)}
                  </select>
                )}
              </section>
              <section>
                <h2 className="ui-section-title">Content</h2>
                <div className="mt-3 space-y-4">
                  {editor.fields.map((controller) => controller.field.type === "image" ? (
                    <label className="grid gap-1 text-sm font-medium" key={controller.field.id}>
                      {controller.field.title}
                      <input
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
                        }}
                      />
                    </label>
                  ) : (
                    <label className="grid gap-1 text-sm font-medium" key={controller.field.id}>
                      {controller.field.title}
                      <input value={String(controller.value ?? "")} onChange={(event) => controller.setValue(event.target.value)} />
                      {controller.issues.length ? <span className="text-xs text-[var(--color-status-attention-fg)]">{controller.issues.length} variant findings</span> : null}
                    </label>
                  ))}
                </div>
              </section>
              <details>
                <summary>Family diagnostics ({editor.diagnostics.counts.blockers + editor.diagnostics.counts.warnings})</summary>
                <ul className="mt-2 space-y-1 text-xs">
                  {editor.diagnostics.issues.map((issue, index) => <li key={`${issue.code}:${index}`}>{issue.variantId ? `${issue.variantId}: ` : ""}{issue.message}</li>)}
                </ul>
              </details>
            </aside>
            <TemplateSessionViewport
              ref={viewport}
              session={editor.renderSession}
              className="min-h-[680px] rounded-xl bg-surface-secondary"
            />
          </div>
        </PageContent>
      </PageWorkspace>
    </AppShell>
  );
}

export function TemplateFamilyEditorPage(props: TemplateFamilyEditorPageProps) {
  return (
    <TemplateFamilySessionProvider session={props.session}>
      <EditorContent {...props} />
    </TemplateFamilySessionProvider>
  );
}

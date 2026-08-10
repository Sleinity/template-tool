import { Plus, Settings, Trash2 } from "lucide-react";
import type {
  SavedTemplateFamilyDraftRecord,
  SavedTemplateFamilyRecord,
} from "@sleinity/template-browser/persistence";
import {
  AppShell,
  Alert,
  Button,
  EmptyState,
  PageContent,
  PageHeader,
  PageWorkspace,
} from "../components/ui";

export interface TemplateFamilyOverviewPageProps {
  records: readonly SavedTemplateFamilyRecord[];
  drafts: readonly SavedTemplateFamilyDraftRecord[];
  error?: string | null;
  onCreate: () => void;
  onOpen: (familyId: string) => void;
  onOpenDraft: (draftId: string) => void;
  onSettings: (familyId: string) => void;
  onDelete: (familyId: string) => Promise<void>;
  onDeleteDraft: (draftId: string) => Promise<void>;
}

export function TemplateFamilyOverviewPage({
  records,
  drafts,
  error,
  onCreate,
  onOpen,
  onOpenDraft,
  onSettings,
  onDelete,
  onDeleteDraft,
}: TemplateFamilyOverviewPageProps) {
  return (
    <AppShell>
      <PageWorkspace>
        <PageHeader className="templates-page__header">
          <div>
            <p className="ui-eyebrow">Template platform</p>
            <h1 className="ui-page-title">Templates</h1>
            <p className="ui-page-description">Reusable Template Families and their shared-content drafts.</p>
          </div>
          <Button leadingIcon={<Plus size={16} />} onClick={onCreate}>Add template</Button>
        </PageHeader>
        <PageContent>
          {error ? <Alert tone="blocked" title="Saved families are unavailable">{error}</Alert> : null}
          {records.length === 0 ? (
            <EmptyState
              title="No template families yet"
              description="Import a TemplatePackage ZIP to create the first variant."
              action={<Button onClick={onCreate}>Add template</Button>}
            />
          ) : (
            <section className="template-grid" aria-label="Template families">
              {records.map((record) => {
                const first = record.family.variants[0]?.packageValue;
                return (
                  <article className="template-card" key={record.id}>
                    <button
                      type="button"
                      className="template-card__open"
                      aria-label={`Open template family ${record.name}`}
                      onClick={() => onOpen(record.id)}
                    >
                      <span className="template-thumbnail-stage">
                        <strong>{record.family.variants.length}</strong>
                        <span>{record.family.variants.length === 1 ? "variant" : "variants"}</span>
                      </span>
                      <span className="template-card__footer">
                        <span className="template-card__name">{record.name}</span>
                        <span className="template-card__metadata">
                          {first ? `${first.canvas.width} × ${first.canvas.height}` : "No preview"}
                          {record.family.variantGroups.length
                            ? ` · ${record.family.variantGroups.length} selector groups`
                            : " · simple variant selector"}
                        </span>
                      </span>
                    </button>
                    <div className="flex gap-2 p-3">
                      <Button variant="secondary" onClick={() => onSettings(record.id)}>
                        <Settings size={15} /> Settings
                      </Button>
                      <Button variant="secondary" onClick={() => void onDelete(record.id)}>
                        <Trash2 size={15} /> Delete
                      </Button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          <section className="mt-10" aria-label="Recent family drafts">
            <h2 className="ui-section-title">Recent drafts</h2>
            <p className="mt-2 text-sm text-content-secondary">
              Continue content you previously started. Shared values are retained across variants.
            </p>
            <div className="mt-4 space-y-2">
              {drafts.length === 0 ? <p className="text-sm text-content-muted">No drafts yet.</p> : null}
              {drafts.map((draft) => (
                <div className="flex items-center justify-between rounded-lg border border-line-subtle bg-surface-primary p-4" key={draft.id}>
                  <button type="button" onClick={() => onOpenDraft(draft.id)}>
                    <strong>{draft.name}</strong>
                    <span className="ml-2 text-xs text-content-muted">{draft.familyName}</span>
                  </button>
                  <Button variant="secondary" onClick={() => void onDeleteDraft(draft.id)}>
                    <Trash2 size={15} /> Delete
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </PageContent>
      </PageWorkspace>
    </AppShell>
  );
}

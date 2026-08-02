import {
  Copy,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  AppShell,
  Alert,
  Button,
  EmptyState,
  Input,
  Menu,
  MenuItem,
  PageContent,
  PageHeader,
  PageWorkspace,
  TemplateThumbnailStage,
} from "../components/ui";
import type {
  SavedOutputDraftRecord,
  SavedTemplateRecord,
} from "@sleinity/template-browser/persistence";

const templateDateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatTemplateDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : `Updated ${templateDateFormatter.format(date)}`;
}

interface TemplateOverviewPageProps {
  records: readonly SavedTemplateRecord[];
  drafts: readonly SavedOutputDraftRecord[];
  previewUrls?: Readonly<Record<string, string>>;
  persistenceError?: string | null;
  onOpenTemplate: (templateId: string) => void;
  onOpenDraft: (draftId: string) => void;
  onDeleteDraft: (draftId: string) => Promise<void>;
  onOpenSettings: (templateId: string) => void;
  onCreateTemplate: () => void;
  onRenameTemplate: (templateId: string, name: string) => Promise<void>;
  onDuplicateTemplate: (templateId: string) => Promise<void>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
}

export function TemplateThumbnail({
  name,
  src,
  loading = false,
}: {
  name: string;
  src?: string;
  loading?: boolean;
}) {
  return <TemplateThumbnailStage name={name} src={src} loading={loading} />;
}

export function TemplateCard({
  record,
  previewUrl,
  onOpen,
  onSettings,
  onRename,
  onDuplicate,
  onDelete,
}: {
  record: SavedTemplateRecord;
  previewUrl?: string;
  onOpen: () => void;
  onSettings: () => void;
  onRename: (name: string) => Promise<void>;
  onDuplicate: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(record.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const packageValue = record.workingPackage;
  const dimensions = `${packageValue.canvas.width} × ${packageValue.canvas.height}`;

  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    try {
      await operation();
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="template-card" data-testid="template-card">
      <button
        type="button"
        className="template-card__open"
        onClick={onOpen}
        aria-label={`Open template ${record.name}`}
      >
        <TemplateThumbnail
          name={record.name}
          src={previewUrl}
          loading={Boolean(record.previewAssetHash && !previewUrl)}
        />
        <span className="template-card__footer">
          <span className="template-card__name">{record.name}</span>
          <span className="template-card__metadata">
            <span>{dimensions}</span>
            <span aria-hidden="true">·</span>
            <span>{formatTemplateDate(record.updatedAt)}</span>
            {packageValue.motion ? (
              <>
                <span aria-hidden="true">·</span>
                <span>Motion</span>
              </>
            ) : null}
          </span>
        </span>
      </button>

      <div className="template-card__menu">
        <Menu
          label={<MoreHorizontal aria-hidden="true" size={18} />}
          accessibleLabel={`Actions for ${record.name}`}
        >
          <MenuItem onClick={onSettings}>
            <Settings aria-hidden="true" size={15} /> Settings
          </MenuItem>
          <MenuItem onClick={() => setRenaming(true)}>
            <Pencil aria-hidden="true" size={15} /> Rename
          </MenuItem>
          <MenuItem onClick={() => void run(onDuplicate)}>
            <Copy aria-hidden="true" size={15} /> Duplicate
          </MenuItem>
          <MenuItem
            destructive
            onClick={() => {
              if (confirmDelete) void run(onDelete);
              else setConfirmDelete(true);
            }}
          >
            <Trash2 aria-hidden="true" size={15} />
            {confirmDelete ? "Confirm delete" : "Delete"}
          </MenuItem>
        </Menu>
      </div>

      {renaming ? (
        <form
          className="template-card__rename"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            void run(async () => {
              await onRename(name);
              setRenaming(false);
            });
          }}
        >
          <Input
            label="Template name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            error={name.trim() ? undefined : "Enter a template name."}
          />
          <div className="template-card__rename-actions">
            <Button size="small" loading={busy} loadingLabel="Saving">
              Save
            </Button>
            <Button
              size="small"
              variant="quiet"
              onClick={() => {
                setName(record.name);
                setRenaming(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </article>
  );
}

function RecentWork({
  draft,
  onOpen,
  onDelete,
}: {
  draft: SavedOutputDraftRecord;
  onOpen: () => void;
  onDelete: () => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <article className="recent-work-row">
      <span className="recent-work-row__icon" aria-hidden="true">
        <Pencil size={15} />
      </span>
      <button type="button" className="recent-work-row__open" onClick={onOpen}>
        <strong>{draft.name}</strong>
        <span>
          From {draft.templateName} · {formatTemplateDate(draft.updatedAt)}
        </span>
      </button>
      <Button
        size="small"
        variant={confirmDelete ? "destructive" : "quiet"}
        onClick={() => {
          if (confirmDelete) void onDelete();
          else setConfirmDelete(true);
        }}
      >
        {confirmDelete ? "Confirm" : "Delete"}
      </Button>
    </article>
  );
}

export function TemplateOverviewPage({
  records,
  drafts,
  previewUrls = {},
  persistenceError,
  onOpenTemplate,
  onOpenDraft,
  onDeleteDraft,
  onOpenSettings,
  onCreateTemplate,
  onRenameTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
}: TemplateOverviewPageProps) {
  return (
    <AppShell mainLabel="Templates">
      <PageWorkspace className="templates-page">
        <PageHeader className="templates-page__header">
          <div>
            <h1 className="ui-page-title">Templates</h1>
            <p className="ui-page-description">
              Choose a template to create new content.
            </p>
          </div>
          <Button leadingIcon={<Plus aria-hidden="true" size={16} />} onClick={onCreateTemplate}>
            Add template
          </Button>
        </PageHeader>

        <PageContent className="templates-page__body">
          {persistenceError ? (
            <Alert tone="blocked" title="Saved templates are unavailable">
              {persistenceError}
            </Alert>
          ) : null}

          {records.length > 0 ? (
            <section aria-labelledby="saved-templates-title">
            <div className="templates-page__section-heading">
              <h2 id="saved-templates-title" className="ui-section-title">Saved templates</h2>
              <span className="templates-page__count-badge">{records.length} saved</span>
            </div>
            <div className="template-grid">
              {records.map((record) => (
                <TemplateCard
                  key={record.id}
                  record={record}
                  previewUrl={previewUrls[record.id]}
                  onOpen={() => onOpenTemplate(record.id)}
                  onSettings={() => onOpenSettings(record.id)}
                  onRename={(name) => onRenameTemplate(record.id, name)}
                  onDuplicate={() => onDuplicateTemplate(record.id)}
                  onDelete={() => onDeleteTemplate(record.id)}
                />
              ))}
            </div>
            </section>
          ) : (
            <EmptyState
              title="No templates yet"
              description="Add a template to start creating reusable content."
              action={<Button leadingIcon={<Plus size={16} />} onClick={onCreateTemplate}>Add template</Button>}
            />
          )}

          {drafts.length > 0 ? (
            <section className="templates-page__recent-work" aria-labelledby="recent-work-title">
            <div className="templates-page__section-heading">
              <div>
                <h2 id="recent-work-title" className="ui-section-title">Recent drafts</h2>
                <p className="mt-1 text-sm text-content-muted">
                  Continue content you previously started from a template.
                </p>
              </div>
              <span className="templates-page__count-badge">{drafts.length} saved</span>
            </div>
            <div className="recent-work-list">
              {drafts.map((draft) => (
                <RecentWork
                  key={draft.id}
                  draft={draft}
                  onOpen={() => onOpenDraft(draft.id)}
                  onDelete={() => onDeleteDraft(draft.id)}
                />
              ))}
            </div>
            </section>
          ) : null}
        </PageContent>
      </PageWorkspace>
    </AppShell>
  );
}

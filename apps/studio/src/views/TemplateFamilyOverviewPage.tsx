import {
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { resolvePackageAssetSource } from "@sleinity/template-core/assets";
import { getTemplateFamilyFieldScope } from "@sleinity/template-core/family";
import type {
  SavedTemplateFamilyDraftRecord,
  SavedTemplateFamilyRecord,
} from "@sleinity/template-browser/persistence";
import {
  AppShell,
  Alert,
  Button,
  Disclosure,
  EmptyState,
  Menu,
  MenuItem,
  PageContent,
  PageHeader,
  PageWorkspace,
  Status,
  TemplateThumbnailStage,
} from "../components/ui";

export interface TemplateFamilyOverviewPageProps {
  records: readonly SavedTemplateFamilyRecord[];
  drafts: readonly SavedTemplateFamilyDraftRecord[];
  previewUrls?: Readonly<Record<string, string>>;
  error?: string | null;
  onCreate: () => void;
  onStartNew: (familyId: string) => void;
  onOpenDraft: (draftId: string) => void;
  onSettings: (familyId: string) => void;
  onDelete: (familyId: string) => Promise<void>;
  onDeleteDraft: (draftId: string) => Promise<void>;
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : `Updated ${dateFormatter.format(date)}`;
}

function safeCardPreview(
  record: SavedTemplateFamilyRecord,
  managedPreviewUrl?: string,
): string | undefined {
  if (managedPreviewUrl) return managedPreviewUrl;
  const packageValue = record.family.variants[0]?.packageValue;
  const preview = packageValue?.referencePreview;
  const source = preview?.assetId
    ? resolvePackageAssetSource(packageValue.assets[preview.assetId])
    : null;
  return source && /^(?:data:image\/|blob:)/i.test(source) ? source : undefined;
}

function fieldCounts(record: SavedTemplateFamilyRecord) {
  const scopes = record.family.fields.map((field) =>
    getTemplateFamilyFieldScope(record.family, field.id),
  );
  return {
    shared: scopes.filter((scope) => scope.kind === "family-wide").length,
    subset: scopes.filter((scope) => scope.kind === "variant-subset").length,
    specific: scopes.filter((scope) => scope.kind === "variant-specific").length,
    unbound: scopes.filter((scope) => scope.kind === "unbound").length,
  };
}

function FamilyCard({
  record,
  onOpen,
  onSettings,
  onDelete,
  previewUrl,
}: {
  record: SavedTemplateFamilyRecord;
  onOpen: () => void;
  onSettings: () => void;
  onDelete: () => Promise<void>;
  previewUrl?: string;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const counts = fieldCounts(record);
  const first = record.family.variants[0]?.packageValue;
  const preview = safeCardPreview(record, previewUrl);
  return (
    <article className="template-card family-template-card" data-testid="family-template-card">
      <button
        type="button"
        className="template-card__open"
        aria-label={`Open template ${record.name}`}
        onClick={onOpen}
      >
        <TemplateThumbnailStage name={record.name} src={preview} />
        <span className="template-card__footer">
          <span className="template-card__name">{record.name}</span>
          <span className="template-card__metadata">
            <span>{record.family.variants.length} {record.family.variants.length === 1 ? "variant" : "variants"}</span>
            {first ? <><span aria-hidden="true">·</span><span>{first.canvas.width} × {first.canvas.height}</span></> : null}
            <><span aria-hidden="true">·</span><span>{formatDate(record.updatedAt)}</span></>
          </span>
          <span className="family-template-card__field-summary">
            <span>{counts.shared} shared</span>
            {counts.subset ? <span>{counts.subset} shared across some</span> : null}
            {counts.specific ? <span>{counts.specific} variant-specific</span> : null}
          </span>
        </span>
      </button>
      <div className="template-card__menu">
        <Menu
          label={<MoreHorizontal aria-hidden="true" size={18} />}
          accessibleLabel={`Actions for ${record.name}`}
        >
          <MenuItem onClick={onSettings}>
            <Settings aria-hidden="true" size={15} /> Template settings
          </MenuItem>
          <MenuItem
            destructive
            onClick={() => {
              if (confirmDelete) void onDelete();
              else setConfirmDelete(true);
            }}
          >
            <Trash2 aria-hidden="true" size={15} />
            {confirmDelete ? "Confirm delete" : "Delete"}
          </MenuItem>
        </Menu>
      </div>
      {counts.unbound ? (
        <Status className="family-template-card__warning" tone="blocked">
          {counts.unbound} unassigned {counts.unbound === 1 ? "field" : "fields"}
        </Status>
      ) : null}
    </article>
  );
}

function DraftRow({
  draft,
  onOpen,
  onDelete,
}: {
  draft: SavedTemplateFamilyDraftRecord;
  onOpen: () => void;
  onDelete: () => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <article className="recent-work-row">
      <span className="recent-work-row__icon" aria-hidden="true"><Pencil size={15} /></span>
      <button type="button" className="recent-work-row__open" onClick={onOpen}>
        <strong>{draft.name}</strong>
        <span>From {draft.familyName} · {formatDate(draft.updatedAt)}</span>
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

export function TemplateFamilyOverviewPage({
  records,
  drafts,
  previewUrls = {},
  error,
  onCreate,
  onStartNew,
  onOpenDraft,
  onSettings,
  onDelete,
  onDeleteDraft,
}: TemplateFamilyOverviewPageProps) {
  const [openingFamilyId, setOpeningFamilyId] = useState<string | null>(null);
  const groupedDrafts = useMemo(() => {
    const groups = new Map<string, SavedTemplateFamilyDraftRecord[]>();
    for (const draft of drafts) {
      const current = groups.get(draft.familyId) ?? [];
      current.push(draft);
      groups.set(draft.familyId, current);
    }
    for (const group of groups.values()) {
      group.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    }
    return groups;
  }, [drafts]);
  const openingRecord = records.find((record) => record.id === openingFamilyId) ?? null;
  const openingDrafts = openingFamilyId ? groupedDrafts.get(openingFamilyId) ?? [] : [];

  const requestOpen = (familyId: string) => {
    const existingDrafts = groupedDrafts.get(familyId) ?? [];
    if (existingDrafts.length === 0) onStartNew(familyId);
    else setOpeningFamilyId(familyId);
  };

  return (
    <AppShell mainLabel="Templates">
      <PageWorkspace className="templates-page">
        <PageHeader className="templates-page__header">
          <div>
            <h1 className="ui-page-title">Templates</h1>
            <p className="ui-page-description">Choose a template, then create content for any of its variants.</p>
          </div>
          <Button leadingIcon={<Plus aria-hidden="true" size={16} />} onClick={onCreate}>Add template</Button>
        </PageHeader>
        <PageContent className="templates-page__body">
          {error ? <Alert tone="blocked" title="Saved families are unavailable">{error}</Alert> : null}
          {records.length === 0 ? (
            <EmptyState
              title="No template families yet"
              description="Import one or more template ZIPs to create your first template."
              action={<Button onClick={onCreate}>Add template</Button>}
            />
          ) : (
            <section aria-labelledby="saved-families-title">
              <div className="templates-page__section-heading">
                <h2 id="saved-families-title" className="ui-section-title">Saved template families</h2>
                <span className="templates-page__count-badge">{records.length} saved</span>
              </div>
              <div className="template-grid" aria-label="Template families">
                {records.map((record) => (
                  <FamilyCard
                    key={record.id}
                    record={record}
                    previewUrl={previewUrls[record.id]}
                    onOpen={() => requestOpen(record.id)}
                    onSettings={() => onSettings(record.id)}
                    onDelete={() => onDelete(record.id)}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="templates-page__recent" aria-labelledby="family-drafts-title">
            <div className="templates-page__section-heading">
              <div>
                <h2 id="family-drafts-title" className="ui-section-title">Recent drafts</h2>
                <p className="ui-page-description">Continue shared content without creating another draft.</p>
              </div>
              <span className="templates-page__count-badge">{drafts.length} saved</span>
            </div>
            {drafts.length === 0 ? (
              <p className="text-sm text-content-muted">No drafts yet.</p>
            ) : (
              <div className="family-draft-groups">
                {[...groupedDrafts.entries()].map(([familyId, familyDrafts]) => {
                  const [latest, ...older] = familyDrafts;
                  if (!latest) return null;
                  return (
                    <section className="family-draft-group" key={familyId}>
                      <DraftRow
                        draft={latest}
                        onOpen={() => onOpenDraft(latest.id)}
                        onDelete={() => onDeleteDraft(latest.id)}
                      />
                      {older.length ? (
                        <Disclosure summary={`${older.length} earlier ${older.length === 1 ? "draft" : "drafts"}`}>
                          <div className="family-draft-group__older">
                            {older.map((draft) => (
                              <DraftRow
                                key={draft.id}
                                draft={draft}
                                onOpen={() => onOpenDraft(draft.id)}
                                onDelete={() => onDeleteDraft(draft.id)}
                              />
                            ))}
                          </div>
                        </Disclosure>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            )}
          </section>
        </PageContent>
        {openingRecord ? (
          <div className="family-draft-choice-backdrop" role="presentation" onMouseDown={() => setOpeningFamilyId(null)}>
            <section
              className="family-draft-choice"
              role="dialog"
              aria-modal="true"
              aria-labelledby="family-draft-choice-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <Status tone="info">{openingDrafts.length} saved {openingDrafts.length === 1 ? "draft" : "drafts"}</Status>
              <div>
                <h2 id="family-draft-choice-title" className="ui-section-title">Continue {openingRecord.name}?</h2>
                <p className="ui-page-description">Open your latest work or begin with the template defaults.</p>
              </div>
              <div className="family-draft-choice__actions">
                <Button
                  leadingIcon={<Play aria-hidden="true" size={15} />}
                  onClick={() => onOpenDraft(openingDrafts[0]!.id)}
                >
                  Continue latest draft
                </Button>
                <Button
                  variant="secondary"
                  leadingIcon={<Plus aria-hidden="true" size={15} />}
                  onClick={() => onStartNew(openingRecord.id)}
                >
                  Start new
                </Button>
                <Button variant="quiet" onClick={() => setOpeningFamilyId(null)}>Cancel</Button>
              </div>
            </section>
          </div>
        ) : null}
      </PageWorkspace>
    </AppShell>
  );
}

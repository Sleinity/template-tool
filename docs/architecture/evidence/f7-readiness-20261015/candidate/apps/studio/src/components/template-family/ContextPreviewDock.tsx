import { Check, ChevronsUpDown, Search } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Status, type StatusTone } from "../ui";

export interface ContextPreviewItem {
  id: string;
  title: string;
  status?: { label: string; tone: StatusTone };
}

export function filterContextPreviewItems(
  items: ContextPreviewItem[],
  query: string,
): ContextPreviewItem[] {
  const normalized = query.trim().toLocaleLowerCase();
  return normalized
    ? items.filter((item) => item.title.toLocaleLowerCase().includes(normalized))
    : items;
}

export function ContextPreviewDock({
  items,
  selectedId,
  onSelect,
  label = "Preview variant",
}: {
  items: ContextPreviewItem[];
  selectedId: string | null | undefined;
  onSelect: (id: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const filtered = useMemo(() => filterContextPreviewItems(items, query), [items, query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const closeFromOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeFromOutside);
    return () => document.removeEventListener("pointerdown", closeFromOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="context-preview-dock">
      {open ? (
        <div className="context-preview-dock__flyout" role="dialog" aria-label={label}>
          <label className="context-preview-dock__search">
            <Search size={15} aria-hidden="true" />
            <span className="ui-visually-hidden">Search variants</span>
            <input
              ref={searchRef}
              value={query}
              placeholder="Search variants"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setOpen(false);
                }
              }}
            />
          </label>
          <div id={listId} className="context-preview-dock__list" role="listbox" aria-label="Variants">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={item.id === selected?.id}
                title={item.title}
                onClick={() => {
                  onSelect(item.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className="context-preview-dock__item-title">{item.title}</span>
                {item.status ? <Status tone={item.status.tone}>{item.status.label}</Status> : null}
                {item.id === selected?.id ? <Check size={16} aria-hidden="true" /> : null}
              </button>
            ))}
            {filtered.length === 0 ? <p className="ui-supporting-copy">No variants match your search.</p> : null}
          </div>
        </div>
      ) : null}
      <button
        type="button"
        className="context-preview-dock__trigger"
        aria-label={`${label}: ${selected?.title ?? "Choose a variant"}. Change variant`}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <span>
          <span className="context-preview-dock__label">{label}</span>
          <strong title={selected?.title}>{selected?.title ?? "Choose a variant"}</strong>
        </span>
        <span className="context-preview-dock__meta" aria-hidden="true">
          {selected?.status ? <Status tone={selected.status.tone}>{selected.status.label}</Status> : null}
          <span className="context-preview-dock__change">Change</span>
          <ChevronsUpDown size={17} />
        </span>
      </button>
    </div>
  );
}

export function ContextPreviewFrame({
  children,
  items,
  selectedId,
  onSelect,
  label,
  className = "",
}: {
  children: ReactNode;
  items: ContextPreviewItem[];
  selectedId: string | null | undefined;
  onSelect: (id: string) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`context-preview-frame ${className}`.trim()}>
      <div className="context-preview-frame__viewport">{children}</div>
      <ContextPreviewDock
        items={items}
        selectedId={selectedId}
        onSelect={onSelect}
        label={label}
      />
    </div>
  );
}

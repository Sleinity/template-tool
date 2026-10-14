import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ContextPreviewDock,
  filterContextPreviewItems,
  type ContextPreviewItem,
} from "./ContextPreviewDock";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const items: ContextPreviewItem[] = Array.from({ length: 14 }, (_, index) => ({
  id: `variant:${index}`,
  title: index === 12 ? "A deliberately long landscape campaign variant" : `Variant ${index + 1}`,
  status: { label: index === 0 ? "Ready" : "Not checked", tone: index === 0 ? "repaired" : "attention" },
}));

const markup = renderToStaticMarkup(createElement(ContextPreviewDock, {
  items,
  selectedId: items[0].id,
  onSelect: () => undefined,
  label: "Previewing",
}));

assert(
  markup.includes('aria-expanded="false"') &&
    markup.includes('aria-label="Previewing: Variant 1. Change variant"') &&
    markup.includes("Previewing") &&
    markup.includes("Variant 1") &&
    markup.includes("Change") &&
    markup.includes("Ready") &&
    !markup.includes("Search variants"),
  "The compact preview dock must expose the current variant and status without rendering an always-visible variant list.",
);

assert(
  filterContextPreviewItems(items, "landscape").map((item) => item.id).join(",") === "variant:12" &&
    filterContextPreviewItems(items, "  VARIANT  ").length === 14,
  "The preview flyout search must remain case-insensitive and usable with 12 or more variants.",
);

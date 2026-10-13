import type { ReactTemplateFieldSessionV2 } from "@sleinity/template-react";

/** Temporary traversal is Studio presentation state, never a saved selection. */
export function createSetupInspection(session: ReactTemplateFieldSessionV2) {
  const selected = () => { const snapshot = session.getSnapshot(); return "selectedVariantId" in snapshot ? snapshot.selectedVariantId : null; };
  let intentional = selected();
  let generation = 0;
  const switchTo = (id: string | null) => {
    const snapshot = session.getSnapshot();
    if (snapshot.status === "disposed") return;
    if (id && "selectVariant" in session && "family" in snapshot && snapshot.family?.variants.some(variant => variant.id === id) && selected() !== id) session.selectVariant(id);
  };
  return {
    intentional: () => intentional,
    generation: () => generation,
    select(id: string) { generation++; intentional = id; switchTo(id); },
    inspect(id: string) { switchTo(id); return generation; },
    restore() { generation++; switchTo(intentional); },
  };
}

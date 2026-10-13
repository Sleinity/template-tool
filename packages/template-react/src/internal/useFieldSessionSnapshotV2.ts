import { useMemo, useSyncExternalStore } from "react";
import type { TemplateSessionV2, TemplateFieldFamilySessionV2 } from "@sleinity/template-browser/session";
import { createSingleSessionSnapshotReader, createFamilySessionSnapshotReader } from "@sleinity/template-browser/session-internal";

/** Read-only bridge. Native sessions retain lifecycle and evidence authority. */
export function useFieldSessionSnapshotV2(session: TemplateSessionV2 | TemplateFieldFamilySessionV2) {
  const reader = useMemo(() => "family" in session.getSnapshot()
    ? createFamilySessionSnapshotReader(session as TemplateFieldFamilySessionV2)
    : createSingleSessionSnapshotReader(session as TemplateSessionV2), [session]);
  const view = useSyncExternalStore<ReturnType<typeof reader.getSnapshot>>(reader.subscribe, reader.getSnapshot, reader.getSnapshot);
  return { reader, view };
}

/** Unsupported fixed-version integration seam. Host applications must not import it. */
import type { TemplateSessionV2 } from "./session/templateSessionV2";
import type { TemplateFieldFamilySessionV2 } from "./session/templateFieldFamilySessionV2";
import { adaptSingleSession, adaptFamilySession } from "./internal/sessionContract/adapt";

/** Borrows the session; never owns its controllers, resources or disposal. */
export function createSingleSessionSnapshotReader(session: TemplateSessionV2) {
  const adapter = adaptSingleSession(session);
  return Object.freeze({ getSnapshot: adapter.getSnapshot, subscribe: adapter.subscribe });
}

/** Borrows the session; selection and all mutations remain native. */
export function createFamilySessionSnapshotReader(session: TemplateFieldFamilySessionV2) {
  const adapter = adaptFamilySession(session);
  return Object.freeze({ getSnapshot: adapter.getSnapshot, subscribe: adapter.subscribe });
}

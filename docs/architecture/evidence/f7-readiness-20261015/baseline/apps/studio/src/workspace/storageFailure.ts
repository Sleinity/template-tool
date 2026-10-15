import { TemplateStorageBlockedError } from "@sleinity/template-browser/persistence";

/** Private presentation projection. Keep the original cause for host diagnostics. */
export function blockedStorageCause(cause: unknown): TemplateStorageBlockedError | null {
  const seen = new Set<unknown>();
  while (cause && !seen.has(cause)) {
    if (cause instanceof TemplateStorageBlockedError) return cause;
    seen.add(cause);
    cause = cause instanceof Error && "cause" in cause ? cause.cause : null;
  }
  return null;
}
export const studioFailureMessage = (cause: unknown) => blockedStorageCause(cause)?.message ?? (cause instanceof Error ? cause.message : String(cause));

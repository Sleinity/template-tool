import type { SavedTemplateFamilyRecord } from "./types";
import { validateCurrentSavedTemplateFamilyRecord } from "./savedRecordValidation";

/**
 * Returns only records that the current family runtime can open. Unreadable
 * records are deliberately left untouched in storage so an obsolete local
 * development record cannot hide otherwise valid templates from a listing.
 */
export function filterReadableSavedTemplateFamilyRecords(
  inputs: readonly unknown[],
): SavedTemplateFamilyRecord[] {
  const readable: SavedTemplateFamilyRecord[] = [];
  for (const input of inputs) {
    try {
      readable.push(validateCurrentSavedTemplateFamilyRecord(input));
    } catch {
      // A direct get still reports the precise validation error. Listings are
      // resilient so one preserved legacy record cannot block every template.
    }
  }
  return readable;
}

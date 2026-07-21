import type { EditableFieldBinding } from "../types";

export function formatEditableFieldLabel(field: EditableFieldBinding): string {
  const source = field.label?.trim() || field.id;
  if (/^enddate$/i.test(source)) return "End date";
  if (/^cta$/i.test(source)) return "CTA";
  return source
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

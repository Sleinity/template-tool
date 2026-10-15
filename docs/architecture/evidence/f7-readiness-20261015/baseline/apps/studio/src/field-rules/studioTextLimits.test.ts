import { acceptStudioTextareaInput, acceptStudioTextInput, normalizeStudioFamilyTextLimits, normalizeStudioTextField, studioCharacterWarningAt, studioTextCounter } from "./studioTextLimits";
import type { TemplateFieldFamilyV2 } from "@sleinity/template-core/family";

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

assert(studioCharacterWarningAt(10) === 8 && studioCharacterWarningAt(11) === 9, "Studio warnings begin at ceil(80% of the maximum).");
assert(studioTextCounter("seven!!", 10).state === "normal", "Counters remain neutral below 80%.");
assert(studioTextCounter("12345678", 10).state === "warning", "Counters warn at 80%.");
assert(studioTextCounter("1234567890", 10).state === "maximum", "Counters identify the maximum.");
assert(studioTextCounter("unlimited").maximum === undefined && studioTextCounter("unlimited").count === 9, "Unlimited fields retain a count without inventing a maximum.");
assert(studioTextCounter("👨‍👩‍👧‍👦é", 2).count === 2, "Counters use grapheme clusters for emoji and combining marks.");

const rejected = acceptStudioTextInput("12345", "123456", 5);
assert(!rejected.accepted && rejected.value === "12345", "Overflow preserves the last accepted value.");
const replacement = acceptStudioTextInput("12345", "abcd", 5);
assert(replacement.accepted && replacement.value === "abcd", "Replacement and deletion remain available at the maximum.");
const repaired = acceptStudioTextInput("123456", "12345", 5);
assert(repaired.accepted, "Persisted over-limit values can be shortened.");
assert(acceptStudioTextInput("👨‍👩‍👧‍👦é", "👨‍👩‍👧‍👦éx", 2).accepted === false, "Composed emoji and combining-mark results are rejected by grapheme count.");

const wrappedLines = (value: string) => Math.max(1, Math.ceil(Array.from(value).length / 5));
assert(acceptStudioTextareaInput("12345", "1234567890", { maxLines: 2, measureLines: wrappedLines }).accepted, "The exact rendered-line maximum remains accepted.");
const rejectedWrap = acceptStudioTextareaInput("1234567890", "12345678901", { maxLines: 2, measureLines: wrappedLines });
assert(!rejectedWrap.accepted && rejectedWrap.reason === "lines" && rejectedWrap.value === "1234567890", "The first candidate beyond the rendered-line maximum preserves the accepted value.");
assert(!acceptStudioTextareaInput("one\ntwo", "one\ntwo\nthree", { maxLines: 2, measureLines: (value) => value.split("\n").length }).accepted, "Explicit newlines use the rendered-line maximum.");
assert(acceptStudioTextareaInput("12345678901", "1234567890", { maxLines: 2, measureLines: wrappedLines, currentVisualLines: 3 }).accepted, "Persisted visual-line overflow can be shortened without forced truncation.");
assert(!acceptStudioTextareaInput("short", "longer", { maxLines: 2 }).accepted, "Growth waits when the active preview cannot be measured.");
assert(acceptStudioTextareaInput("longer", "short", { maxLines: 2 }).accepted, "Deletion remains available while preview measurement is unavailable.");
assert(acceptStudioTextareaInput("one\ntwo\nthree", "one\ntwo\nthree plus", { maxLines: 2, measureLines: (value) => value.split("\n").length, inactive: true }).accepted, "Structurally inactive fields do not apply a visual-line guard.");

const normalized = normalizeStudioTextField({ id: "text:title", type: "text", binding: { kind: "text-characters", nodeId: "title" }, defaultValue: "Title", configuration: { maxCharacters: 25, warningAtCharacters: 24 } });
assert(normalized.configuration.warningAtCharacters === 20, "Studio replaces configurable character warnings with the fixed 80% value.");
const unlimited = normalizeStudioTextField({ ...normalized, configuration: { warningAtCharacters: 5 } });
assert(unlimited.configuration.warningAtCharacters === undefined, "Removing a maximum removes its warning threshold.");

const family = normalizeStudioFamilyTextLimits({
  schemaVersion: "template-field-family-v2", id: "family", title: "Family", editableFieldOrder: ["text:title"], editorControlOrder: [{ kind: "field", fieldId: "text:title" }], variantGroups: [],
  fields: [normalized],
  variants: [{ id: "a", packageValue: { schemaVersion: "2.2", packageId: "a", name: "A", canvas: { width: 1, height: 1 }, rootNodeId: "root", nodes: {}, assets: {}, editableFieldOrder: ["text:title"], editableFields: [normalized] }, fieldOverrides: { "text:title": { type: "text", configuration: { maxCharacters: 10, warningAtCharacters: 9 } } } },
    { id: "b", packageValue: { schemaVersion: "2.2", packageId: "b", name: "B", canvas: { width: 1, height: 1 }, rootNodeId: "root", nodes: {}, assets: {}, editableFieldOrder: ["text:title"], editableFields: [normalized] }, fieldOverrides: { "text:title": { type: "text", configuration: { warningAtCharacters: 3 } } } }],
} as TemplateFieldFamilyV2);
const firstOverride = family.variants[0]?.fieldOverrides?.["text:title"]?.configuration as Record<string, unknown> | undefined;
const secondOverride = family.variants[1]?.fieldOverrides?.["text:title"]?.configuration as Record<string, unknown> | undefined;
assert(firstOverride?.warningAtCharacters === 8, "Variant maximums receive their own 80% warning.");
assert(!Object.prototype.hasOwnProperty.call(secondOverride ?? {}, "warningAtCharacters"), "Inherited maximums inherit the common warning.");
assert(family.variants.every((variant) => (variant.packageValue.editableFields[0]?.configuration as Record<string, unknown>).warningAtCharacters === 20), "Family source snapshots use the same derived warning configuration.");
const clearedOverride = normalizeStudioFamilyTextLimits({ ...family, variants: [{ ...family.variants[0]!, fieldOverrides: { "text:title": { type: "text", configuration: { maxCharacters: null, warningAtCharacters: 4 } } } }] });
assert((clearedOverride.variants[0]?.fieldOverrides?.["text:title"]?.configuration as Record<string, unknown>).warningAtCharacters === null, "Clearing a variant maximum also clears its warning override.");

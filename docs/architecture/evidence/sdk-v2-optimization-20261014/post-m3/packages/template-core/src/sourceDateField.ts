import { isCalendarDateValueV1 } from "./fieldValuesV2";
import type { DateDisplayFormatV1 } from "./types";

type JsonRecord = Record<string, unknown>;
type DateSeparator = NonNullable<DateDisplayFormatV1["separator"]>;
type DatePreset = DateDisplayFormatV1["preset"];

export interface ParsedSourceDateDisplay {
  value: string;
  prefix: string;
  suffix: string;
  preset: DatePreset;
  separator?: DateSeparator;
  inferredYear?: number;
}

const YEAR_FIRST = /(?<![\d./-])(\d{4})([-/.])(\d{1,2})\2(\d{1,2})(?![\d./-])/gu;
const YEAR_LAST = /(?<![\d./-])(\d{1,2})([-/.])(\d{1,2})\2(\d{4})(?![\d./-])/gu;
const YEARLESS = /(?<![\d./-])(\d{1,2})([-/.])(\d{1,2})(?![\d./-])/gu;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exportedYear(value: unknown): number | null {
  const match = typeof value === "string" ? value.match(/^(\d{4})-/u) : null;
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isInteger(year) && year >= 1 ? year : null;
}

function canonicalDate(year: number, month: number, day: number): string | null {
  const value = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isCalendarDateValueV1(value) ? value : null;
}

function explicitOrder(value: unknown): "day-first" | "month-first" | null {
  if (!isRecord(value)) return null;
  return value.preset === "numeric-day-first" || value.preset === "numeric-day-month"
    ? "day-first"
    : value.preset === "numeric-month-first" || value.preset === "numeric-month-day"
      ? "month-first"
      : null;
}

function resolveMonthDay(
  first: number,
  second: number,
  format: unknown,
): { month: number; day: number; order: "day-first" | "month-first" } | null {
  const order = explicitOrder(format);
  if (order === "day-first") return { month: second, day: first, order };
  if (order === "month-first") return { month: first, day: second, order };
  if (first > 12 && second <= 12) return { month: second, day: first, order: "day-first" };
  if (second > 12 && first <= 12) return { month: first, day: second, order: "month-first" };
  return null;
}

type Token = {
  index: number;
  text: string;
  separator: DateSeparator;
  year: number | null;
  month: number;
  day: number;
  order: "year-first" | "day-first" | "month-first";
  yearless: boolean;
};

function tokens(input: string, format: unknown): Token[] {
  const found: Token[] = [];
  for (const match of input.matchAll(YEAR_FIRST)) {
    found.push({
      index: match.index,
      text: match[0],
      separator: match[2] as DateSeparator,
      year: Number(match[1]),
      month: Number(match[3]),
      day: Number(match[4]),
      order: "year-first",
      yearless: false,
    });
  }
  for (const match of input.matchAll(YEAR_LAST)) {
    const resolved = resolveMonthDay(Number(match[1]), Number(match[3]), format);
    if (!resolved) continue;
    found.push({
      index: match.index,
      text: match[0],
      separator: match[2] as DateSeparator,
      year: Number(match[4]),
      month: resolved.month,
      day: resolved.day,
      order: resolved.order,
      yearless: false,
    });
  }
  for (const match of input.matchAll(YEARLESS)) {
    const resolved = resolveMonthDay(Number(match[1]), Number(match[3]), format);
    if (!resolved) continue;
    found.push({
      index: match.index,
      text: match[0],
      separator: match[2] as DateSeparator,
      year: null,
      month: resolved.month,
      day: resolved.day,
      order: resolved.order,
      yearless: true,
    });
  }
  return found.sort((left, right) => left.index - right.index);
}

/** Parse one unambiguous numeric display date at the loose exporter boundary. */
export function parseSourceDateDisplay(
  input: string,
  options: { exportedAt?: unknown; explicitFormat?: unknown } = {},
): ParsedSourceDateDisplay | null {
  const matches = tokens(input, options.explicitFormat);
  if (matches.length !== 1) return null;
  const token = matches[0];
  const inferredYear = token.yearless ? exportedYear(options.exportedAt) : null;
  const year = token.year ?? inferredYear;
  if (year === null) return null;
  const value = canonicalDate(year, token.month, token.day);
  if (!value) return null;
  const preset: DatePreset = token.order === "year-first"
    ? token.separator === "-" ? "iso" : "numeric-year-first"
    : token.yearless
      ? token.order === "day-first" ? "numeric-day-month" : "numeric-month-day"
      : token.order === "day-first" ? "numeric-day-first" : "numeric-month-first";
  return {
    value,
    prefix: input.slice(0, token.index),
    suffix: input.slice(token.index + token.text.length),
    preset,
    ...(preset !== "iso" ? { separator: token.separator } : {}),
    ...(inferredYear !== null ? { inferredYear } : {}),
  };
}

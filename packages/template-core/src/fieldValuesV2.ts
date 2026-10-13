import type { CalendarDateValueV1, ColorInputV1, ColorValueV1 } from "./types";

/** Normalize the initial opaque V2 Color input subset to lowercase #rrggbb. */
export function normalizeColorInputV1(input: ColorInputV1 | unknown): ColorValueV1 | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  const short = value.match(/^#([0-9a-f]{3})$/iu);
  if (short) {
    return `#${Array.from(short[1], (channel) => `${channel}${channel}`).join("")}`.toLowerCase();
  }
  return /^#[0-9a-f]{6}$/iu.test(value) ? value.toLowerCase() : null;
}

export function isColorValueV1(input: unknown): input is ColorValueV1 {
  return typeof input === "string" && /^#[0-9a-f]{6}$/u.test(input);
}

export function isCalendarDateValueV1(input: unknown): input is CalendarDateValueV1 {
  if (typeof input !== "string") return false;
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

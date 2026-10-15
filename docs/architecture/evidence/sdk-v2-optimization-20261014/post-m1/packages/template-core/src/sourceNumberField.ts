export interface ParsedSourceNumberDisplay {
  value: number;
  prefix: string;
  suffix: string;
  decimalPlaces?: number;
}

const DECIMAL_NUMBER_TOKEN = /[+-]?(?:\d+(?:\.\d+)?|\.\d+)/gu;

export function parseSourceNumberDisplay(value: string): ParsedSourceNumberDisplay | null {
  const matches = [...value.matchAll(DECIMAL_NUMBER_TOKEN)];
  if (matches.length !== 1 || matches[0].index === undefined) return null;
  const token = matches[0][0];
  const parsed = Number(token);
  if (!Number.isFinite(parsed)) return null;
  const fraction = token.match(/\.(\d+)$/u)?.[1];
  return {
    value: Object.is(parsed, -0) ? 0 : parsed,
    prefix: value.slice(0, matches[0].index),
    suffix: value.slice(matches[0].index + token.length),
    ...(fraction ? { decimalPlaces: fraction.length } : {}),
  };
}

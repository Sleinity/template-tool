import type { McpDesignHint } from "../types";

const rules: Array<{
  kind: McpDesignHint["kind"];
  pattern: RegExp;
  value: (match: RegExpMatchArray) => string;
}> = [
  {
    kind: "object-fit",
    pattern: /\bobject-(cover|contain|fill)\b/i,
    value: (match) => match[1].toLowerCase(),
  },
  {
    kind: "absolute-center",
    pattern:
      /\b(left-1\/2|top-1\/2|translate-x-\[-?50%\]|translate-y-\[-?50%\])\b/i,
    value: () => "center-anchor",
  },
  {
    kind: "space-between",
    pattern: /\b(justify-between|space-between)\b/i,
    value: () => "space-between",
  },
  {
    kind: "text-size",
    pattern: /\btext-\[(\d+(?:\.\d+)?)px\]\b/i,
    value: (match) => `${match[1]}px`,
  },
];

export function extractMcpDesignHints(source?: string | null): McpDesignHint[] {
  if (!source) return [];
  const hints: McpDesignHint[] = [];
  rules.forEach((rule) => {
    const match = source.match(rule.pattern);
    if (!match) return;
    hints.push({
      kind: rule.kind,
      value: rule.value(match),
      sourceExcerpt: match[0].slice(0, 120),
    });
  });
  return hints;
}

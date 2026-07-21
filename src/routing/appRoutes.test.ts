import { appRoutePath, parseAppRoute } from "./appRoutes";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const routes = [
  { path: "/templates", kind: "templates" },
  { path: "/templates/new", kind: "new-template" },
  { path: "/templates/template%3Aone/settings", kind: "template-settings" },
  { path: "/drafts/draft%3Aone", kind: "draft-workspace" },
] as const;

for (const fixture of routes) {
  const parsed = parseAppRoute(fixture.path);
  assert(parsed.kind === fixture.kind, `${fixture.path} should resolve to ${fixture.kind}.`);
  assert(
    appRoutePath(parsed) === fixture.path,
    `${fixture.path} should remain stable through parse and serialization.`,
  );
}

assert(
  parseAppRoute("/unknown").kind === "templates",
  "Unknown product routes should recover to Templates.",
);

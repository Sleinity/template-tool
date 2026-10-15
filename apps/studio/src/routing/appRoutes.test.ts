import { appRoutePath, parseAppRoute, parseStudioAppRoute, studioAppRoutePath } from "./appRoutes";

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

const existing = parseStudioAppRoute("/work/single%3Aexisting%3Aone");
assert(existing.recognized && existing.route.kind === "existing-work", "Studio should parse Existing work routes.");
assert(studioAppRoutePath(existing.route) === "/work/single%3Aexisting%3Aone", "Existing work routes should round-trip.");
assert(!parseStudioAppRoute("/unknown").recognized, "Studio should distinguish an unknown route from Templates.");

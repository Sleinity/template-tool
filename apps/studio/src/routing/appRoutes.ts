export type AppRoute =
  | { kind: "templates" }
  | { kind: "new-template" }
  | { kind: "template-settings"; templateId: string }
  | { kind: "draft-workspace"; draftId: string };

export function parseAppRoute(pathname: string): AppRoute {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/templates/new") return { kind: "new-template" };
  if (normalized === "/templates" || normalized === "/") {
    return { kind: "templates" };
  }
  const settings = normalized.match(/^\/templates\/([^/]+)\/settings$/);
  if (settings) {
    return {
      kind: "template-settings",
      templateId: decodeURIComponent(settings[1]),
    };
  }
  const draft = normalized.match(/^\/drafts\/([^/]+)$/);
  if (draft) {
    return {
      kind: "draft-workspace",
      draftId: decodeURIComponent(draft[1]),
    };
  }
  return { kind: "templates" };
}

export function appRoutePath(route: AppRoute): string {
  switch (route.kind) {
    case "new-template":
      return "/templates/new";
    case "template-settings":
      return `/templates/${encodeURIComponent(route.templateId)}/settings`;
    case "draft-workspace":
      return `/drafts/${encodeURIComponent(route.draftId)}`;
    default:
      return "/templates";
  }
}

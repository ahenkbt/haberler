/**
 * HmPublicApp wraps all `/editor/...` pages in one lazy chunk.
 *
 * wouter uses regexparam. `/editor/:rest*` is a *single* path segment
 * (`/editor/haberler` matches, `/editor/haberler/yeni` does not).
 * Use `/editor/*` so create/edit routes reach HmEditorRoutes.
 */
export const HM_PUBLIC_EDITOR_WILDCARD_PATH = "/editor/*";

export function hmPublicAppLoadsEditorRoutes(pathname: string): boolean {
  const p = (String(pathname ?? "").split("?")[0] ?? "").replace(/\/+$/, "") || "/";
  return p === "/editor" || p.startsWith("/editor/");
}

/** regexparam v2 named `:rest*` — one segment only (the #267 wrapper bug). */
export function hmPublicEditorNamedRestStarMatches(pathname: string): boolean {
  const p = (String(pathname ?? "").split("?")[0] ?? "").replace(/\/+$/, "") || "/";
  return /^\/editor\/[^/]+$/i.test(p);
}

/** regexparam `/editor/*` — any depth under /editor. */
export function hmPublicEditorWildcardMatches(pathname: string): boolean {
  const p = (String(pathname ?? "").split("?")[0] ?? "").replace(/\/+$/, "") || "/";
  return /^\/editor\/.+/i.test(p);
}

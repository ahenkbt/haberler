import { describe, expect, it } from "vitest";
import {
  HM_PUBLIC_EDITOR_WILDCARD_PATH,
  hmPublicAppLoadsEditorRoutes,
  hmPublicEditorNamedRestStarMatches,
  hmPublicEditorWildcardMatches,
} from "./hmPublicEditorRoute";

const nestedEditorPaths = [
  "/editor/haberler/yeni",
  "/editor/haberler/42/duzenle",
  "/editor/makaleler/yeni",
  "/editor/makaleler/9/duzenle",
  "/editor/rss-kampanyalari/yeni",
  "/editor/rss-kampanyalari/3/duzenle",
  "/editor/rss-kampanyalari/loglar",
];

const shallowEditorPaths = ["/editor/haberler", "/editor/kategoriler", "/editor/giris"];

describe("hmPublicEditorRoute — HmPublicApp editor wrapper", () => {
  it("uses a true wildcard, not :rest*", () => {
    expect(HM_PUBLIC_EDITOR_WILDCARD_PATH).toBe("/editor/*");
  });

  it("documents that :rest* misses + Yeni Haber and edit URLs", () => {
    expect(hmPublicEditorNamedRestStarMatches("/editor/haberler")).toBe(true);
    for (const path of nestedEditorPaths) {
      expect(hmPublicEditorNamedRestStarMatches(path)).toBe(false);
    }
  });

  it("matches list, create, and edit paths with /editor/*", () => {
    for (const path of [...shallowEditorPaths, ...nestedEditorPaths]) {
      expect(hmPublicEditorWildcardMatches(path)).toBe(true);
      expect(hmPublicAppLoadsEditorRoutes(path)).toBe(true);
    }
    expect(hmPublicEditorWildcardMatches("/editor")).toBe(false);
    expect(hmPublicAppLoadsEditorRoutes("/editor")).toBe(true);
    expect(hmPublicAppLoadsEditorRoutes("/haber/yeni")).toBe(false);
  });

  it("explains the video: no spinner because the parent route never mounted LazyChunk", () => {
    // Instant blank + no RouteChunkFallback spinner = Switch miss, not a pending chunk.
    expect(hmPublicEditorNamedRestStarMatches("/editor/haberler/yeni")).toBe(false);
    expect(hmPublicEditorWildcardMatches("/editor/haberler/yeni")).toBe(true);
  });
});

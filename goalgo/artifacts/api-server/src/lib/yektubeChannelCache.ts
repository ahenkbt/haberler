import type { VideoSourceRow } from "@workspace/db";

export function buildVideoSourceEtag(row: Pick<VideoSourceRow, "id" | "videoCount" | "name" | "active">): string {
  const name = String(row.name ?? "").trim().slice(0, 40);
  return `"yt-src-${row.id}-${row.videoCount ?? 0}-${row.active ? 1 : 0}-${name.length}"`;
}

export function applyConditionalJsonEtag(
  req: { headers: Record<string, unknown> },
  res: { setHeader: (k: string, v: string) => void; status: (n: number) => { end: () => void } },
  etag: string,
): boolean {
  res.setHeader("ETag", etag);
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  const inm = String(req.headers["if-none-match"] ?? "").trim();
  if (inm && inm === etag) {
    res.status(304).end();
    return true;
  }
  return false;
}

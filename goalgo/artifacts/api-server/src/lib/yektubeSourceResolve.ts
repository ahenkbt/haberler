import { eq } from "drizzle-orm";
import type { VideoSourceRow } from "@workspace/db";
import { getYektubeDbForRead, videoSourcesTable } from "@workspace/db";
import { slugifyVideoCategory } from "./yektubeCategoryCatalog.js";

const yektubeDb = getYektubeDbForRead();

function slugifyName(value: string): string {
  return slugifyVideoCategory(value);
}

/** Kaynak adından URL slug üretir */
export function sourcePathSlug(name: string, id?: number): string {
  const slug = slugifyName(name);
  if (slug) return slug;
  return id != null ? String(id) : "kanal";
}

function slugMatches(refSlug: string, nameSlug: string): boolean {
  if (!refSlug || !nameSlug) return false;
  if (refSlug === nameSlug) return true;
  const longer = refSlug.length >= nameSlug.length ? refSlug : nameSlug;
  const shorter = refSlug.length < nameSlug.length ? refSlug : nameSlug;
  if (shorter.length < 3) return false;
  return longer === shorter || longer.startsWith(`${shorter}-`);
}

function scoreMatch(refSlug: string, row: VideoSourceRow): number {
  const nameSlug = slugifyName(row.name);
  const channelSlug = slugifyName(row.channelId ?? "");
  let score = 0;
  if (refSlug === nameSlug) score += 100;
  else if (slugMatches(refSlug, nameSlug)) score += 80;
  if (refSlug === channelSlug) score += 90;
  else if (channelSlug && slugMatches(refSlug, channelSlug)) score += 70;
  if (refSlug === String(row.id)) score += 120;
  score += Math.min(row.videoCount ?? 0, 50);
  if (row.active) score += 10;
  return score;
}

/** ref: sayısal id, kanal adı slug'ı veya slug-id biçimi */
export async function resolveVideoSourceByRef(ref: string): Promise<VideoSourceRow | null> {
  const raw = decodeURIComponent(ref.trim());
  if (!raw) return null;

  const num = parseInt(raw, 10);
  if (!Number.isNaN(num) && num > 0 && String(num) === raw) {
    const [row] = await yektubeDb.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, num));
    return row ?? null;
  }

  const slug = slugifyName(raw);
  if (!slug) return null;

  // slug-id biçimi: haberturk-189
  const suffix = raw.match(/-(\d+)$/);
  if (suffix?.[1]) {
    const id = parseInt(suffix[1], 10);
    if (id > 0) {
      const [byId] = await yektubeDb.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, id));
      if (byId) return byId;
    }
  }

  // YouTube kanal id (UC…)
  if (/^uc[a-z0-9_-]{20,}$/i.test(raw)) {
    const [byChannel] = await yektubeDb
      .select()
      .from(videoSourcesTable)
      .where(eq(videoSourcesTable.channelId, raw));
    if (byChannel) return byChannel;
  }

  const rows = await yektubeDb.select().from(videoSourcesTable);
  let best: VideoSourceRow | null = null;
  let bestScore = 0;

  for (const row of rows) {
    const score = scoreMatch(slug, row);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }

  if (bestScore >= 70) return best;

  // Son çare: yalnızca aktif kaynaklarda tam eşleşme
  const activeExact = rows.filter((r) => r.active && slugifyName(r.name) === slug);
  if (activeExact.length === 1) return activeExact[0]!;
  if (activeExact.length > 1) {
    activeExact.sort((a, b) => (b.videoCount ?? 0) - (a.videoCount ?? 0));
    return activeExact[0]!;
  }

  return bestScore >= 50 ? best : null;
}

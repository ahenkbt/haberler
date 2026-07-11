import { and, desc, eq, inArray } from "drizzle-orm";
import {
  dualWriteYektubeUpdate,
  getYektubeDbForRead,
  videosTable,
  type VideoRow,
} from "@workspace/db";
import { callGeminiChat, getSiteIntegrationKeys } from "./aiChatProviders.js";
import {
  ADMIN_CATEGORY_SLUGS,
  categoryDisplayLabel,
  slugifyVideoCategory,
} from "./yektubeCategoryCatalog.js";
import { logger } from "./logger.js";
import { scheduleVideoSeoResolve } from "./yektubeVideoSeo.js";

const db = getYektubeDbForRead();
const BATCH = 8;

export type GeminiClassifyResult = {
  scanned: number;
  moved: number;
  seoScheduled: number;
  skipped: number;
  errors: string[];
};

type GeminiItem = { id: number; categorySlug: string; move: boolean };

function jsonExtract(text: string): { items?: GeminiItem[] } | null {
  try {
    return JSON.parse(text) as { items?: GeminiItem[] };
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as { items?: GeminiItem[] };
    } catch {
      return null;
    }
  }
}

function allowedSlugs(): Set<string> {
  return new Set(ADMIN_CATEGORY_SLUGS.map((s) => slugifyVideoCategory(s)).filter(Boolean));
}

function buildSystemPrompt(): string {
  const cats = ADMIN_CATEGORY_SLUGS.map((s) => `${s} = ${categoryDisplayLabel(s)}`).join("; ");
  return [
    "Yektube video kategori sınıflandırıcısısın.",
    "Her video için en uygun categorySlug seç.",
    `İzin verilen slug'lar: ${cats}`,
    "Yalnızca geçerli JSON döndür, markdown yok.",
    'Format: {"items":[{"id":123,"categorySlug":"spor","move":true}]}',
    "move=true yalnızca mevcut kategori bariz yanlışsa veya genel/haberler gibi varsayılandan daha spesifik bir kategori gerekiyorsa.",
    "Çocuk içeriği → cocuk, müzik → muzik, dizi → dizi, film → sinema, haber → haberler.",
    "Türkçe yanıt zorunlu değil; slug İngilizce kalır.",
  ].join(" ");
}

async function classifyBatch(rows: VideoRow[], apiKey: string): Promise<GeminiItem[]> {
  const allowed = allowedSlugs();
  const payload = rows.map((r) => ({
    id: r.id,
    title: r.title.slice(0, 240),
    description: (r.description ?? "").slice(0, 400),
    channelName: r.channelName ?? "",
    currentCategory: r.categorySlug,
  }));

  const user = `Videolar:\n${JSON.stringify(payload, null, 0)}`;
  const out = await callGeminiChat(apiKey, buildSystemPrompt(), user, 0.2, false);
  if (!out.text) return [];

  const parsed = jsonExtract(out.text);
  const items = parsed?.items ?? [];
  const byId = new Map<number, GeminiItem>();
  for (const item of items) {
    const id = Number(item.id);
    const slug = slugifyVideoCategory(String(item.categorySlug ?? ""));
    if (!Number.isFinite(id) || id <= 0 || !slug || !allowed.has(slug)) continue;
    byId.set(id, { id, categorySlug: slug, move: Boolean(item.move) });
  }
  return [...byId.values()];
}

export async function classifyVideosWithGemini(opts?: {
  limit?: number;
  videoIds?: number[];
}): Promise<GeminiClassifyResult> {
  const limit = Math.min(Math.max(Number(opts?.limit ?? 120) || 120, 1), 400);
  const result: GeminiClassifyResult = {
    scanned: 0,
    moved: 0,
    seoScheduled: 0,
    skipped: 0,
    errors: [],
  };

  const site = await getSiteIntegrationKeys();
  const apiKey = site.geminiApiKey;
  if (!apiKey) {
    result.errors.push("Gemini API anahtarı yok (Genel Ayarlar → Entegrasyonlar)");
    return result;
  }

  let rows: VideoRow[];
  if (opts?.videoIds?.length) {
    const ids = opts.videoIds.filter((id) => Number.isFinite(id) && id > 0).slice(0, limit);
    if (ids.length === 0) return result;
    rows = await db
      .select()
      .from(videosTable)
      .where(and(eq(videosTable.active, true), inArray(videosTable.id, ids)));
  } else {
    rows = await db
      .select()
      .from(videosTable)
      .where(eq(videosTable.active, true))
      .orderBy(desc(videosTable.id))
      .limit(limit);
  }

  result.scanned = rows.length;
  if (rows.length === 0) return result;

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    try {
      const decisions = await classifyBatch(chunk, apiKey);
      const decisionById = new Map(decisions.map((d) => [d.id, d]));
      for (const row of chunk) {
        const d = decisionById.get(row.id);
        if (!d || !d.move) {
          result.skipped++;
          continue;
        }
        const normCurrent = slugifyVideoCategory(row.categorySlug);
        if (normCurrent === d.categorySlug) {
          result.skipped++;
          continue;
        }
        await dualWriteYektubeUpdate(
          videosTable,
          {
            categorySlug: d.categorySlug,
            seoTitle: null,
            seoDescription: null,
            seoUpdatedAt: null,
          },
          eq(videosTable.id, row.id),
        );
        result.moved++;
        scheduleVideoSeoResolve({
          dbId: row.id,
          youtubeVideoId: row.videoId,
          title: row.title,
          description: row.description,
          channelName: row.channelName,
          thumbnail: row.thumbnail,
          duration: row.duration,
          publishedAt: row.publishedAt,
          categorySlug: d.categorySlug,
        });
        result.seoScheduled++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(msg.slice(0, 200));
      logger.warn({ err, batch: i }, "[yektubeGeminiClassify] batch failed");
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  logger.info(result, "[yektubeGeminiClassify] completed");
  return result;
}

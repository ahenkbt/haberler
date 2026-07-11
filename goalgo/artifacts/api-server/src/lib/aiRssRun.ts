import { eq, inArray } from "drizzle-orm";
import {
  db,
  aiSettingsTable,
  newsTable,
  categoriesTable,
  hmNewsSitesTable,
} from "@workspace/db";
import { normalizeRssSourceUrl, rssArticleAlreadyImported } from "./rssImportDedupe";
import { coerceNewsPublishedAt } from "./rssPublishedDate.js";
import { fetchRssFeedXml } from "./rssFeedFetch.js";
import {
  callChatForPreferredProvider,
  formatProviderChatFailure,
  formatQuotaFallbackUserError,
  getSiteIntegrationKeys,
  hasChatApiKeyForProvider,
  isOpenAiQuotaOrBillingError,
  mergeChatKeysFromAiAndSite,
  missingProviderKeyMessage,
} from "./aiChatProviders.js";
import { aiNewsSystemPrompt, aiNewsUserJsonHint } from "./aiNewsPrompts.js";
import { finalizeAiNewsArticle } from "./aiNewsArticle.js";
import { parseFeedItems } from "./rssFeedParse.js";

async function getAiSettingsRow() {
  const rows = await db.select().from(aiSettingsTable).limit(1);
  if (rows[0]) return rows[0];
  const [row] = await db.insert(aiSettingsTable).values({}).returning();
  return row;
}

function jsonExtract(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* ignore */
      }
    }
    return null;
  }
}

function makeSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[ğ]/g, "g")
      .replace(/[ü]/g, "u")
      .replace(/[ş]/g, "s")
      .replace(/[ı]/g, "i")
      .replace(/[ö]/g, "o")
      .replace(/[ç]/g, "c")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) +
    "-" +
    Date.now()
  );
}

export type AiRssRunResult =
  | { ok: true; generated: number; news: { title: string; id: number }[] }
  | {
      ok: false;
      error: string;
      aiSkipped?: number;
      openAiQuotaHit?: boolean;
      geminiFallbackAttempted?: boolean;
      geminiConfigured?: boolean;
    };

/**
 * RSS + OpenAI ile haber üretir; `ai_settings` içinde `lastRunAt` / `nextRunAt` / `totalAiRuns` güncellenir.
 * Admin `POST /ai/run-rss` ve zamanlayıcı aynı mantığı kullanır.
 */
export async function executeAiRssRun(opts: {
  count: number;
  siteIds: number[];
}): Promise<AiRssRunResult> {
  const s = await getAiSettingsRow();
  const siteKeys = await getSiteIntegrationKeys();
  const chatKeys = mergeChatKeysFromAiAndSite(s, siteKeys);

  if (!hasChatApiKeyForProvider(chatKeys, chatKeys.preferredProvider)) {
    return { ok: false, error: missingProviderKeyMessage(chatKeys.preferredProvider) };
  }

  const lines = (s.rssUrls || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  if (!lines.length) {
    return { ok: false, error: "RSS kaynağı girilmemiş. Ayarlar sekmesinden ekleyin." };
  }

  const count = Math.max(1, Math.min(50, Number(opts.count) || 10));
  const requestedSiteIds = opts.siteIds
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);
  let siteTargets: (number | null)[] = [null];
  if (requestedSiteIds.length > 0) {
    const existing = await db
      .select({ id: hmNewsSitesTable.id })
      .from(hmNewsSitesTable)
      .where(inArray(hmNewsSitesTable.id, requestedSiteIds));
    const ok = new Set(existing.map((r) => r.id));
    const filtered = requestedSiteIds.filter((id) => ok.has(id));
    siteTargets = filtered.length > 0 ? filtered : [null];
  }

  const allNews: { title: string; id: number }[] = [];
  const feedErrors: string[] = [];
  let itemsSeen = 0;
  let aiSkipped = 0;
  let lastAiError: string | undefined;
  let openAiQuotaHit = false;
  let geminiFallbackAttempted = false;

  for (const line of lines) {
    if (allNews.length >= count) break;
    const [rssUrl, catSlug] = line.split("|").map((p) => p.trim());
    if (!rssUrl) continue;

    let catId: number | null = null;
    if (catSlug) {
      const cats = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, catSlug));
      if (cats[0]) catId = cats[0].id;
    }

    try {
      const xml = (await fetchRssFeedXml(rssUrl)).xml;
      const items = parseFeedItems(xml, s.maxPerSource);
      if (!items.length) {
        feedErrors.push(`${rssUrl}: beslemede haber maddesi bulunamadı (RSS/Atom formatını kontrol edin)`);
        continue;
      }

      for (const item of items) {
        if (allNews.length >= count) break;
        itemsSeen++;

        const langInstruction = s.language === "tr" ? "Haberi Türkçe yaz." : "Write in English.";
        const systemPrompt = aiNewsSystemPrompt({ langInstruction });
        const userPrompt = `RSS haber başlığı: "${item.title}"\nKısa özet: "${item.desc.slice(0, 500)}"\n\nBu haberi tamamen yeniden yaz; güncel haber dili kullan (makale veya deneme değil).\n${aiNewsUserJsonHint(s.wordCount)}`;

        const aiOut = await callChatForPreferredProvider(chatKeys.preferredProvider, {
          openaiApiKey: chatKeys.openaiApiKey,
          openaiModel: chatKeys.openaiModel,
          geminiApiKey: chatKeys.geminiApiKey,
          deepseekApiKey: chatKeys.deepseekApiKey,
          system: systemPrompt,
          user: userPrompt,
          temperature: 0.7,
        });
        if (!aiOut.text) {
          aiSkipped++;
          if (aiOut.detail) lastAiError = aiOut.detail;
          if (isOpenAiQuotaOrBillingError(aiOut.httpStatus, aiOut.detail)) openAiQuotaHit = true;
          if (aiOut.geminiFallbackAttempted) geminiFallbackAttempted = true;
          continue;
        }
        const parsed = jsonExtract(aiOut.text) as {
          baslik?: string;
          spot?: string;
          icerik?: string;
          etiketler?: string[];
        } | null;
        if (!parsed?.baslik || !parsed?.icerik) {
          aiSkipped++;
          continue;
        }

        const finalized = await finalizeAiNewsArticle({
          icerikRaw: parsed.icerik,
          rssItemRaw: item.rawInner,
          descriptionHtml: item.descHtml,
          link: item.link,
          title: parsed.baslik,
          topicKeyword: item.title,
        });

        const sourceKey = normalizeRssSourceUrl(item.link);
        for (const siteId of siteTargets) {
          if (allNews.length >= count) break;
          if (await rssArticleAlreadyImported(siteId, sourceKey, parsed.baslik)) {
            continue;
          }
          try {
            const publishedAt = coerceNewsPublishedAt(item.publishedAt);
            const [created] = await db
              .insert(newsTable)
              .values({
                title: parsed.baslik,
                slug: makeSlug(parsed.baslik) + (siteId != null ? `-s${siteId}` : ""),
                spot: parsed.spot || null,
                content: finalized.content,
                imageUrl: finalized.imageUrl,
                categoryId: catId,
                status: s.postStatus as "draft" | "published",
                isFeatured: false,
                isBreaking: false,
                tags: parsed.etiketler || [],
                views: 0,
                isAiGenerated: true,
                siteId: siteId ?? null,
                rssSourceUrl: sourceKey,
                isEditorManual: false,
                createdAt: publishedAt,
                updatedAt: publishedAt,
              })
              .returning();

            allNews.push({ title: created.title, id: created.id });
          } catch (e: unknown) {
            const uniqueViolation =
              e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "23505";
            if (!uniqueViolation) throw e;
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[AI] RSS fetch error:", rssUrl, e);
      feedErrors.push(`${rssUrl}: ${msg.slice(0, 120)}`);
    }
  }

  const next = new Date();
  next.setHours(next.getHours() + s.intervalHours);
  await db
    .update(aiSettingsTable)
    .set({
      lastRunAt: new Date(),
      nextRunAt: s.autoRunEnabled ? next : s.nextRunAt,
      totalAiRuns: s.totalAiRuns + (allNews.length > 0 ? 1 : 0),
    })
    .where(eq(aiSettingsTable.id, s.id));

  if (allNews.length > 0) {
    return { ok: true, generated: allNews.length, news: allNews };
  }

  if (feedErrors.length) {
    const hint = feedErrors.slice(0, 2).join("; ");
    return {
      ok: false,
      error: `RSS kaynakları okunamadı veya boş: ${hint}`,
    };
  }
  if (itemsSeen > 0 && lastAiError) {
    const geminiConfigured = !!chatKeys.geminiApiKey;
    let error: string;
    if (chatKeys.preferredProvider !== "auto") {
      error = `${formatProviderChatFailure(chatKeys.preferredProvider, lastAiError)} (${aiSkipped} madde atlandı)`;
    } else if (openAiQuotaHit && geminiConfigured && geminiFallbackAttempted) {
      error = formatQuotaFallbackUserError({ aiSkipped, combinedDetail: lastAiError });
    } else if (openAiQuotaHit && geminiConfigured) {
      error = `OpenAI kotası doldu; Gemini yedek anahtarı denenemedi veya geçersiz (${aiSkipped} madde atlandı). Genel Ayarlar → Yapay zekâ anahtarını kontrol edin.`;
    } else if (openAiQuotaHit && !geminiConfigured) {
      error = `OpenAI kotası doldu (${aiSkipped} madde atlandı). Yedek için Genel Ayarlar → Yapay zekâ → Gemini API anahtarı ekleyin veya OpenAI kredisi yükleyin.`;
    } else {
      error = `AI yanıt vermedi (${aiSkipped} madde atlandı). ${lastAiError.slice(0, 200)}`;
    }
    return {
      ok: false,
      error,
      aiSkipped,
      openAiQuotaHit,
      geminiFallbackAttempted,
      geminiConfigured,
    };
  }
  if (itemsSeen > 0) {
    return {
      ok: false,
      error: "RSS maddeleri bulundu ancak tümü zaten içe aktarılmış veya AI çıktısı geçersizdi.",
    };
  }

  return { ok: false, error: "Hiçbir RSS satırından haber maddesi alınamadı." };
}

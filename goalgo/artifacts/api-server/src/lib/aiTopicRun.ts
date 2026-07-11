import { eq, inArray } from "drizzle-orm";
import {
  db,
  aiSettingsTable,
  newsTable,
  hmNewsSitesTable,
} from "@workspace/db";
import { normalizeRssSourceUrl, rssArticleAlreadyImported } from "./rssImportDedupe";
import { coerceNewsPublishedAt } from "./rssPublishedDate.js";
import {
  callChatForPreferredProvider,
  getSiteIntegrationKeys,
  hasChatApiKeyForProvider,
  mergeChatKeysFromAiAndSite,
  missingProviderKeyMessage,
} from "./aiChatProviders.js";
import { aiNewsSystemPrompt, aiNewsUserJsonHint } from "./aiNewsPrompts.js";
import { finalizeAiNewsArticle } from "./aiNewsArticle.js";
import { fetchTopicNewsItems, probeTopicItemImages } from "./topicNewsFetcher.js";

export type { RssFeedItem } from "./rssFeedParse.js";
export {
  parseRssFeedItems,
  parseAtomFeedEntries,
  parseFeedItems,
  googleNewsRssUrl,
} from "./rssFeedParse.js";

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

export type AiTopicRunResult =
  | { ok: true; generated: number; news: { title: string; id: number }[]; topic: string }
  | { ok: false; error: string };

/**
 * Google News + TR yayıncılar → AI özgün haber; `POST /ai/run-topic` ve Konu Planı.
 */
export async function executeAiTopicRun(opts: {
  topic: string;
  count: number;
  categoryId: number | null;
  siteIds: number[];
  lang?: string;
  skipImages?: boolean;
}): Promise<AiTopicRunResult> {
  const topic = String(opts.topic ?? "").trim();
  if (!topic) {
    return { ok: false, error: "Konu gerekli." };
  }

  const s = await getAiSettingsRow();
  const siteKeys = await getSiteIntegrationKeys();
  const chatKeys = mergeChatKeysFromAiAndSite(s, siteKeys);

  if (!hasChatApiKeyForProvider(chatKeys, chatKeys.preferredProvider)) {
    return { ok: false, error: missingProviderKeyMessage(chatKeys.preferredProvider) };
  }

  const count = Math.max(1, Math.min(50, Number(opts.count) || 10));
  const categoryId =
    opts.categoryId != null && Number.isFinite(Number(opts.categoryId)) ? Number(opts.categoryId) : null;

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

  const langCode = String(opts.lang ?? s.language ?? "tr").toLowerCase();
  const hl = langCode.startsWith("en") ? "en" : "tr";
  const gl = hl === "en" ? "US" : "TR";

  const skipImages = opts.skipImages === true;
  const lightScan = count <= 3;
  const singleArticle = count === 1;

  const feedItems = await fetchTopicNewsItems({
    topic,
    maxItems: singleArticle ? 8 : Math.min(Math.max(count + 6, 12), 24),
    hl,
    gl,
    probeImages: singleArticle,
    probeLimit: singleArticle ? 4 : 0,
    lightScan,
    imageTimeoutMs: singleArticle ? 4_000 : 5_000,
  });

  if (!feedItems.length) {
    return { ok: false, error: `"${topic}" için güncel haber bulunamadı.` };
  }

  const langInstruction =
    hl === "tr" ? "Haberi Türkçe yaz. Güncel gelişmeleri yansıt." : "Write in English.";
  const allNews: { title: string; id: number }[] = [];

  for (const item of feedItems) {
    if (allNews.length >= count) break;

    if (!skipImages && !item.hasImage) {
      await probeTopicItemImages(item, singleArticle ? 4_000 : 5_000);
    }

    const systemPrompt = aiNewsSystemPrompt({
      langInstruction,
      extra: `Konu: ${topic}. Kaynak başlık ve özetten ilham al; metni tamamen özgün yaz.`,
    });
    const userPrompt = `Güncel haber konusu: "${topic}"\nKaynak başlık: "${item.title}"\nÖzet: "${item.desc.slice(0, 600)}"\n\nBu gelişmeyi özgün bir haber olarak yeniden yaz (makale veya deneme değil; ters piramit, kısa paragraflar).\n${aiNewsUserJsonHint(s.wordCount)}`;

    const aiOut = await callChatForPreferredProvider(chatKeys.preferredProvider, {
      openaiApiKey: chatKeys.openaiApiKey,
      openaiModel: chatKeys.openaiModel,
      geminiApiKey: chatKeys.geminiApiKey,
      deepseekApiKey: chatKeys.deepseekApiKey,
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.7,
    });
    if (!aiOut.text) continue;

    const parsed = jsonExtract(aiOut.text) as {
      baslik?: string;
      spot?: string;
      icerik?: string;
      etiketler?: string[];
    } | null;
    if (!parsed?.baslik || !parsed?.icerik) continue;

    const articleLink = item.resolvedLink || item.link;
    const finalized = await finalizeAiNewsArticle({
      icerikRaw: parsed.icerik,
      rssItemRaw: item.rawInner,
      descriptionHtml: item.descHtml,
      link: articleLink,
      title: parsed.baslik,
      topicKeyword: topic,
      sourceImageUrl: item.previewImageUrl,
    });

    const sourceKey = normalizeRssSourceUrl(articleLink || `${topic}:${item.title}`);
    for (const siteId of siteTargets) {
      if (allNews.length >= count) break;
      if (await rssArticleAlreadyImported(siteId, sourceKey, parsed.baslik)) {
        continue;
      }
      const publishedAt = coerceNewsPublishedAt(item.publishedAt);
      const [created] = await db
        .insert(newsTable)
        .values({
          title: parsed.baslik,
          slug: makeSlug(parsed.baslik) + (siteId != null ? `-s${siteId}` : ""),
          spot: parsed.spot || null,
          content: finalized.content,
          imageUrl: finalized.imageUrl,
          categoryId,
          status: s.postStatus as "draft" | "published",
          isFeatured: false,
          isBreaking: false,
          tags: parsed.etiketler || [topic],
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

  return { ok: true, generated: allNews.length, news: allNews, topic };
}

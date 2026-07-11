import { Router, type IRouter } from "express";
import { eq, inArray, sql } from "drizzle-orm";
import { db, aiSettingsTable, newsTable, categoriesTable, authorsTable, hmNewsSitesTable } from "@workspace/db";
import { normalizeNewsTitle } from "../lib/hm-ahb-haber-import";
import { denyUnlessAdminMaintenance, denyUnlessAdminMaintenanceAny } from "../lib/admin-guard";
import {
  normalizeRssSourceUrl,
  rssArticleAlreadyImported,
} from "../lib/rssImportDedupe";
import { fetchRssFeedXml } from "../lib/rssFeedFetch";
import { parseFeedItems } from "../lib/rssFeedParse";
import { executeAiRssRun } from "../lib/aiRssRun";
import { executeAiTopicRun } from "../lib/aiTopicRun.js";
import { fetchBestTopicNewsItem } from "../lib/topicNewsFetcher.js";
import {
  callChatForPreferredProvider,
  callChatWithProvider,
  callChatWithOpenAiGeminiFallback,
  callGeminiChat,
  formatProviderChatFailure,
  getSiteIntegrationKeys,
  hasAnyChatApiKey,
  hasChatApiKeyForProvider,
  mergeChatKeysFromAiAndSite,
  missingProviderKeyMessage,
  normalizePreferredProvider,
} from "../lib/aiChatProviders.js";
import { DEFAULT_GEMINI_MODEL } from "../lib/geminiSearchService.js";
import { aiNewsSystemPrompt, aiNewsUserJsonHint } from "../lib/aiNewsPrompts.js";
import { finalizeAiNewsArticle } from "../lib/aiNewsArticle.js";
const router: IRouter = Router();

/* — helpers ──────────────────────────────────────────────────────── */

let aiSettingsSchemaReady: Promise<void> | null = null;

function ensureAiSettingsSchema(): Promise<void> {
  if (!aiSettingsSchemaReady) {
    aiSettingsSchemaReady = db
      .execute(
        sql`ALTER TABLE ai_settings ADD COLUMN IF NOT EXISTS preferred_provider TEXT NOT NULL DEFAULT 'auto'`,
      )
      .then(() => undefined)
      .catch((e) => {
        aiSettingsSchemaReady = null;
        throw e;
      });
  }
  return aiSettingsSchemaReady;
}

async function getAiSettings() {
  await ensureAiSettingsSchema();
  const rows = await db.select().from(aiSettingsTable).limit(1);
  if (rows[0]) return rows[0];
  const [row] = await db.insert(aiSettingsTable).values({}).returning();
  return row;
}

function jsonExtract(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch {}
    }
    return null;
  }
}

const PORTAL_SITE_LABEL = "Merkez haber akışı";

function parseRequestedSiteIds(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
  }
  return [];
}

/** Duplikat anahtarı: aynı site (null = merkez) + normalize başlık. */
function duplicateNewsGroupKey(siteId: number | null, title: string): string {
  const siteKey = siteId == null ? "portal" : String(siteId);
  return `${siteKey}:${normalizeNewsTitle(title)}`;
}

function makeSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[ğ]/g, "g").replace(/[ü]/g, "u").replace(/[ş]/g, "s")
      .replace(/[ı]/g, "i").replace(/[ö]/g, "o").replace(/[ç]/g, "c")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) +
    "-" + Date.now()
  );
}

/* — GET /ai/settings ─────────────────────────────────────────────── */
router.get("/ai/settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "site_ayarlari")) return;
  const s = await getAiSettings();
  res.json({
    id: s.id,
    openaiApiKey: s.openaiApiKey ? "sk-••••••••••••••••" : "",
    hasApiKey: s.openaiApiKey.length > 0,
    openaiModel: s.openaiModel,
    language: s.language,
    autoUniquify: s.autoUniquify,
    wordCount: s.wordCount,
    postStatus: s.postStatus,
    rssUrls: s.rssUrls,
    maxPerSource: s.maxPerSource,
    intervalHours: s.intervalHours,
    autoRunEnabled: s.autoRunEnabled,
    nextRunAt: s.nextRunAt ? s.nextRunAt.toISOString() : null,
    lastRunAt: s.lastRunAt ? s.lastRunAt.toISOString() : null,
    totalAiRuns: s.totalAiRuns,
    preferredProvider: normalizePreferredProvider(s.preferredProvider),
  });
});

/* — PUT /ai/settings ─────────────────────────────────────────────── */
router.put("/ai/settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "site_ayarlari")) return;
  const {
    openaiApiKey, openaiModel, language, autoUniquify, wordCount, postStatus,
    rssUrls, maxPerSource, intervalHours, autoRunEnabled, preferredProvider,
  } = req.body as any;
  const current = await getAiSettings();

  const updateData: any = { updatedAt: new Date() };
  if (openaiApiKey && !openaiApiKey.includes("••••")) updateData.openaiApiKey = openaiApiKey.trim();
  if (openaiModel) updateData.openaiModel = openaiModel;
  if (language) updateData.language = language;
  if (typeof autoUniquify === "boolean") updateData.autoUniquify = autoUniquify;
  if (wordCount) updateData.wordCount = Number(wordCount);
  if (postStatus) updateData.postStatus = postStatus;
  if (typeof rssUrls === "string") updateData.rssUrls = rssUrls;
  if (maxPerSource !== undefined) updateData.maxPerSource = Number(maxPerSource);
  if (intervalHours !== undefined) updateData.intervalHours = Number(intervalHours);
  if (typeof autoRunEnabled === "boolean") {
    updateData.autoRunEnabled = autoRunEnabled;
    if (autoRunEnabled) {
      const next = new Date();
      next.setHours(next.getHours() + (Number(intervalHours) || current.intervalHours));
      updateData.nextRunAt = next;
    } else {
      updateData.nextRunAt = null;
    }
  }
  if (preferredProvider !== undefined) {
    updateData.preferredProvider = normalizePreferredProvider(String(preferredProvider));
  }

  const [row] = await db
    .update(aiSettingsTable)
    .set(updateData)
    .where(eq(aiSettingsTable.id, current.id))
    .returning();

  res.json({
    ok: true,
    ...row,
    hasApiKey: row.openaiApiKey.length > 0,
    preferredProvider: normalizePreferredProvider(row.preferredProvider),
  });
});

/* — POST /ai/test ─────────────────────────────────────────────────── */
router.post("/ai/test", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenanceAny(req, res, ["haberler", "site_ayarlari"])) return;
  const s = await getAiSettings();
  const siteKeys = await getSiteIntegrationKeys();
  const chatKeys = mergeChatKeysFromAiAndSite(s, siteKeys);
  if (!hasChatApiKeyForProvider(chatKeys, chatKeys.preferredProvider)) {
    res.status(400).json({ ok: false, error: missingProviderKeyMessage(chatKeys.preferredProvider) });
    return;
  }
  const model = chatKeys.openaiModel;
  const preferred = chatKeys.preferredProvider;
  const { text, httpStatus, detail, provider } =
    preferred === "auto"
      ? await callChatForPreferredProvider("auto", {
          openaiApiKey: chatKeys.openaiApiKey,
          openaiModel: model,
          geminiApiKey: chatKeys.geminiApiKey,
          deepseekApiKey: chatKeys.deepseekApiKey,
          system: "Sen bir test asistanısın.",
          user: 'Sadece tam olarak şu iki harfi büyük harfle yaz: OK (başka kelime veya noktalama ekleme).',
          temperature: 0.1,
        })
      : await callChatWithProvider(preferred, {
          openaiApiKey: chatKeys.openaiApiKey,
          openaiModel: model,
          geminiApiKey: chatKeys.geminiApiKey,
          deepseekApiKey: chatKeys.deepseekApiKey,
          system: "Sen bir test asistanısın.",
          user: 'Sadece tam olarak şu iki harfi büyük harfle yaz: OK (başka kelime veya noktalama ekleme).',
          temperature: 0.1,
        });
  const normalized = (text ?? "").trim();
  const looksOk = /\bOK\b/i.test(normalized) || /^OK\b/i.test(normalized.replace(/^[`"'“]+/, ""));
  if (looksOk) {
    const providerLabel =
      provider === "gemini" ? "gemini" : provider === "deepseek" ? "deepseek-chat" : model;
    res.json({ ok: true, model: providerLabel, provider: provider ?? preferred });
    return;
  }
  const errMsg = detail
    ? formatProviderChatFailure(provider ?? preferred, detail, httpStatus)
    : normalized
      ? `Yanıt alındı ancak test doğrulanamadı: ${normalized.slice(0, 160)}`
      : "AI yanıt vermedi veya boş döndü.";
  res.status(502).json({ ok: false, error: errMsg });
});

/* — POST /ai/test-gemini ── Yalnızca Gemini (Genel Ayarlar anahtarı) ─ */
router.post("/ai/test-gemini", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenanceAny(req, res, ["haberler", "site_ayarlari"])) return;
  const siteKeys = await getSiteIntegrationKeys();
  if (!siteKeys.geminiApiKey) {
    res.status(400).json({
      ok: false,
      error: "Gemini API anahtarı girilmemiş. Genel Ayarlar → Entegrasyonlar → Yapay zekâ → Google Gemini.",
    });
    return;
  }
  const { text, httpStatus, detail } = await callGeminiChat(
    siteKeys.geminiApiKey,
    "Sen bir test asistanısın.",
    'Sadece tam olarak şu iki harfi büyük harfle yaz: OK (başka kelime veya noktalama ekleme).',
    0.1,
  );
  const normalized = (text ?? "").trim();
  const looksOk = /\bOK\b/i.test(normalized) || /^OK\b/i.test(normalized.replace(/^[`"'“]+/, ""));
  if (looksOk) {
    res.json({ ok: true, provider: "gemini", model: DEFAULT_GEMINI_MODEL });
    return;
  }
  const errMsg = detail
    ? `Gemini (${httpStatus || "ağ"}): ${detail}`
    : normalized
      ? `Yanıt alındı ancak test doğrulanamadı: ${normalized.slice(0, 160)}`
      : "Gemini yanıt vermedi veya boş döndü.";
  res.status(502).json({ ok: false, error: errMsg, detail });
});

/* — POST /ai/run-topic ─── Google News konu → AI haber ─────────── */
router.post("/ai/run-topic", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const b = req.body as {
    topic?: string;
    count?: number;
    categoryId?: number | string | null;
    siteIds?: unknown[];
    siteId?: number | null;
    lang?: string;
    skipImages?: unknown;
  };
  const skipImages =
    String(b.skipImages ?? "").toLowerCase() === "1" ||
    String(b.skipImages ?? "").toLowerCase() === "true";
  const topic = String(b.topic ?? "").trim();
  const count = b.count ?? 10;
  const catRaw = b.categoryId;
  const categoryId =
    catRaw != null && String(catRaw).trim() !== "" && Number.isFinite(Number(catRaw))
      ? Number(catRaw)
      : null;
  const rawSiteIds = Array.isArray(b.siteIds) ? b.siteIds : b.siteId != null ? [b.siteId] : [];
  const siteIds = rawSiteIds
    .map((x: unknown) => Number(x))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  const r = await executeAiTopicRun({
    topic,
    count,
    categoryId,
    siteIds,
    lang: b.lang,
    skipImages,
  });
  if (!r.ok) {
    res.status(400).json(r);
    return;
  }
  res.json({ ok: true, generated: r.generated, news: r.news, topic: r.topic });
});

/* — POST /ai/run-rss ─── RSS'ten haber çek + AI yaz ─────────────── */
router.post("/ai/run-rss", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const count = req.body?.count || 10;
  const rawSiteIds = Array.isArray(req.body?.siteIds) ? req.body.siteIds : [];
  const requestedSiteIds = rawSiteIds
    .map((x: unknown) => Number(x))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  try {
    const r = await executeAiRssRun({ count, siteIds: requestedSiteIds });
    if (!r.ok) {
      res.status(400).json(r);
      return;
    }
    res.json({ ok: true, generated: r.generated, news: r.news });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[AI] run-rss error:", e);
    res.status(500).json({ ok: false, error: `RSS çalıştırma hatası: ${msg.slice(0, 200)}` });
  }
});

/** RSS → taslak haber (AI yok). AI İçerik Robotu “RSS Direkt” sekmesi. */
router.post("/ai/rss-import", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const b = req.body as { rssUrl?: string; categoryId?: number | string | null; maxItems?: number; siteId?: number | null };
  const rssUrl = String(b.rssUrl ?? "").trim();
  const maxItems = Math.min(100, Math.max(1, Number(b.maxItems) || 20));
  const siteId = b.siteId != null && Number.isFinite(Number(b.siteId)) ? Number(b.siteId) : null;
  const catRaw = b.categoryId;
  const categoryId =
    catRaw != null && String(catRaw).trim() !== "" && Number.isFinite(Number(catRaw)) ? Number(catRaw) : null;
  if (!rssUrl) {
    res.status(400).json({ ok: false, error: "rssUrl gerekli" });
    return;
  }
  const s = await getAiSettings();
  const status = (s.postStatus === "published" ? "published" : "draft") as "draft" | "published";

  let xml: string;
  try {
    xml = (await fetchRssFeedXml(rssUrl)).xml;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "RSS adresine ulaşılamadı.";
    res.status(400).json({ ok: false, error: msg });
    return;
  }

  const items = parseFeedItems(xml, maxItems * 2).map((item) => ({
    title: item.title,
    desc: item.desc,
    link: item.link,
  }));

  const imported: { id: number; title: string }[] = [];
  for (const item of items) {
    if (imported.length >= maxItems) break;
    const sourceKey = normalizeRssSourceUrl(item.link);
    if (await rssArticleAlreadyImported(siteId, sourceKey, item.title)) continue;
    const plain = (item.desc?.trim() || item.title).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const content = `<p>${plain}</p>`;
    try {
      const [created] = await db
        .insert(newsTable)
        .values({
          title: item.title,
          slug: makeSlug(item.title),
          spot: item.desc ? item.desc.slice(0, 280) : null,
          content,
          categoryId,
          status,
          isFeatured: false,
          isBreaking: false,
          tags: [],
          views: 0,
          isAiGenerated: false,
          siteId,
          rssSourceUrl: sourceKey,
          isEditorManual: false,
        })
        .returning();
      if (created) imported.push({ id: created.id, title: created.title });
    } catch (e: unknown) {
      const uniqueViolation =
        e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "23505";
      if (!uniqueViolation) throw e;
    }
  }

  res.json({ ok: true, imported, skipped: items.length - imported.length });
});

/** ElevenLabs TTS → MP3 `data/media-uploads` (AI İçerik Robotu Podcast sekmesi). */
router.post("/ai/elevenlabs-tts", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const b = req.body as { text?: string; voiceId?: string; apiKey?: string; modelId?: string };
  const text = String(b.text ?? "").trim();
  const voiceId = String(b.voiceId ?? "").trim();
  const apiKey = String(b.apiKey ?? "").trim();
  const modelId = String(b.modelId ?? "eleven_multilingual_v2").trim() || "eleven_multilingual_v2";
  if (!text || !voiceId || !apiKey) {
    res.status(400).json({ ok: false, error: "text, voiceId ve apiKey gerekli." });
    return;
  }
  if (text.length > 8000) {
    res.status(400).json({ ok: false, error: "Metin en fazla 8000 karakter." });
    return;
  }

  try {
    const er = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.slice(0, 5000),
        model_id: modelId,
      }),
    });
    if (!er.ok) {
      const errText = await er.text().catch(() => "");
      res.status(502).json({ ok: false, error: `ElevenLabs hata ${er.status}`, detail: errText.slice(0, 400) });
      return;
    }
    const buf = Buffer.from(await er.arrayBuffer());
    if (!buf.length || buf.length > 25 * 1024 * 1024) {
      res.status(502).json({ ok: false, error: "Geçersiz veya çok büyük ses yanıtı." });
      return;
    }
    const { saveMediaBuffer } = await import("../lib/mediaUploadService.js");
    const saved = await saveMediaBuffer(buf, {
      ext: "mp3",
      mime: "audio/mpeg",
      prefix: "podcast-",
    });
    res.json({
      ok: true,
      url: saved.url,
    });
  } catch (e: unknown) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

/** HeyGen avatar video → poll; dönen `videoUrl` HeyGen CDN (geçici). */
router.post("/ai/heygen-video", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const b = req.body as {
    apiKey?: string;
    script?: string;
    avatarId?: string;
    voiceId?: string;
    title?: string;
    width?: number;
    height?: number;
  };
  const apiKey = String(b.apiKey ?? "").trim();
  const script = String(b.script ?? "").trim();
  const avatarId = String(b.avatarId ?? "").trim();
  const voiceId = String(b.voiceId ?? "").trim();
  if (!apiKey || !script || !avatarId || !voiceId) {
    res.status(400).json({ ok: false, error: "apiKey, script, avatarId ve voiceId gerekli." });
    return;
  }
  const title = String(b.title ?? "Video").trim().slice(0, 200) || "Video";
  const width = Math.min(1920, Math.max(256, Number(b.width) || 1280));
  const height = Math.min(1920, Math.max(256, Number(b.height) || 720));

  let genJson: any;
  try {
    const genRes = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        dimension: { width, height },
        video_inputs: [
          {
            character: { type: "avatar", avatar_id: avatarId },
            voice: { type: "text", voice_id: voiceId, input_text: script.slice(0, 4800) },
          },
        ],
      }),
    });
    genJson = await genRes.json().catch(() => ({}));
    if (!genRes.ok || genJson?.error || !genJson?.data?.video_id) {
      const msg =
        typeof genJson?.error === "string"
          ? genJson.error
          : genJson?.error?.message || genJson?.message || `HeyGen ${genRes.status}`;
      res.status(502).json({ ok: false, error: msg, detail: genJson?.error ?? genJson });
      return;
    }
  } catch (e: unknown) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
    return;
  }

  const videoId = String(genJson.data.video_id);

  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    let stJson: any;
    try {
      const st = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`, {
        headers: { "x-api-key": apiKey },
      });
      stJson = await st.json().catch(() => ({}));
    } catch {
      continue;
    }
    const status = stJson?.data?.status;
    if (status === "completed" && stJson?.data?.video_url) {
      res.json({
        ok: true,
        videoId,
        videoUrl: stJson.data.video_url as string,
        thumbnailUrl: stJson.data.thumbnail_url as string | undefined,
      });
      return;
    }
    if (status === "failed") {
      const err = stJson?.data?.error;
      const msg = typeof err === "object" && err?.message ? err.message : String(err || "HeyGen render başarısız");
      res.status(502).json({ ok: false, error: msg, detail: err });
      return;
    }
  }
  res.status(504).json({ ok: false, error: "Zaman aşımı: video hâlen hazır değil.", videoId });
});

/* — POST /ai/generate ─── Tek AI Üret ────────────────────────────── */
router.post("/ai/generate", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const { mode, url, topic, keyword, categoryId, authorId } = req.body as any;
  const s = await getAiSettings();
  const siteKeys = await getSiteIntegrationKeys();
  const chatKeys = mergeChatKeysFromAiAndSite(s, siteKeys);

  if (!hasChatApiKeyForProvider(chatKeys, chatKeys.preferredProvider)) {
    res.status(400).json({ ok: false, error: missingProviderKeyMessage(chatKeys.preferredProvider) });
    return;
  }

  let sourceContent = "";
  if (mode === "url" && url) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Yekpare/1.0" }, signal: AbortSignal.timeout(10000) });
      const html = await r.text();
      sourceContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 3000);
    } catch {
      res.status(400).json({ ok: false, error: "URL içeriği çekilemedi." });
      return;
    }
  }

  let catName = "Genel";
  if (categoryId) {
    const cats = await db.select().from(categoriesTable).where(eq(categoriesTable.id, Number(categoryId)));
    if (cats[0]) catName = cats[0].name;
  }

  const langInstruction =
    s.language === "tr" ? "Haberi Türkçe yaz. Başlık çarpıcı olsun." : "Write in English.";
  const systemPrompt = aiNewsSystemPrompt({
    langInstruction,
    extra: `Kategori: ${catName}.`,
  });

  let userPrompt = "";
  let topicKeyword = "";
  let rssContext: { rawInner: string; descHtml: string; link: string } | null = null;
  let topicSourceImageUrl: string | null | undefined;

  if (mode === "url" && sourceContent) {
    userPrompt = `Şu haber içeriğini tamamen özgünleştir ve yeniden yaz:\n\n${sourceContent}\n\n${aiNewsUserJsonHint(s.wordCount)}`;
  } else {
    const topicText = keyword || topic || "Güncel Haber";
    topicKeyword = topicText;
    userPrompt = `"${topicText}" konusunda özgün haber yaz.\n\n${aiNewsUserJsonHint(s.wordCount)}`;

    const hl = s.language === "en" ? "en" : "tr";
    const gl = hl === "en" ? "US" : "TR";
    try {
      const best = await fetchBestTopicNewsItem({ topic: topicText, hl, gl });
      if (best) {
        topicSourceImageUrl = best.previewImageUrl;
        rssContext = {
          rawInner: best.rawInner,
          descHtml: best.descHtml,
          link: best.resolvedLink || best.link,
        };
      }
    } catch {
      /* görsel yedekleri için kaynak taraması isteğe bağlı */
    }
  }

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
    res.status(500).json({
      ok: false,
      error: aiOut.detail
        ? formatProviderChatFailure(aiOut.provider ?? chatKeys.preferredProvider, aiOut.detail, aiOut.httpStatus)
        : "AI yanıt vermedi.",
    });
    return;
  }

  const parsed = jsonExtract(aiOut.text);
  if (!parsed?.baslik || !parsed?.icerik) {
    res.status(500).json({ ok: false, error: "AI geçerli içerik üretemedi.", raw: aiOut.text.slice(0, 500) });
    return;
  }

  const finalized = await finalizeAiNewsArticle({
    icerikRaw: parsed.icerik,
    rssItemRaw: rssContext?.rawInner,
    descriptionHtml: rssContext?.descHtml,
    link: rssContext?.link,
    title: parsed.baslik,
    topicKeyword: topicKeyword || undefined,
    sourceImageUrl: topicSourceImageUrl,
  });

  const [created] = await db
    .insert(newsTable)
    .values({
      title: parsed.baslik,
      slug: makeSlug(parsed.baslik),
      spot: parsed.spot || null,
      content: finalized.content,
      imageUrl: finalized.imageUrl,
      categoryId: categoryId ? Number(categoryId) : null,
      authorId: authorId ? Number(authorId) : null,
      status: s.postStatus as any,
      isFeatured: false,
      isBreaking: false,
      tags: parsed.etiketler || [],
      views: 0,
      isAiGenerated: true,
    })
    .returning();

  res.json({
    ok: true,
    news: { id: created.id, title: created.title, status: created.status },
    provider: aiOut.provider,
  });
});

/* — POST /ai/uniquify ─────────────────────────────────────────────── */
router.post("/ai/uniquify", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const { newsId } = req.body as { newsId?: unknown };
  const nid = Number(newsId);
  if (!Number.isFinite(nid)) {
    res.status(400).json({ ok: false, error: "newsId gerekli" });
    return;
  }
  const s = await getAiSettings();
  const siteKeys = await getSiteIntegrationKeys();
  if (!s.openaiApiKey?.trim() && !siteKeys.geminiApiKey) {
    res.status(400).json({ ok: false, error: "OpenAI veya Gemini API anahtarı girilmemiş." });
    return;
  }

  const rows = await db.select().from(newsTable).where(eq(newsTable.id, nid));
  if (!rows[0]) { res.status(404).json({ ok: false, error: "Haber bulunamadı." }); return; }
  const news = rows[0];

  const langInstruction = s.language === "tr" ? "Haberi Türkçe yaz." : "Write in English.";
  const aiOut = await callChatWithOpenAiGeminiFallback({
    openaiApiKey: s.openaiApiKey,
    openaiModel: s.openaiModel,
    geminiApiKey: siteKeys.geminiApiKey,
    system: aiNewsSystemPrompt({ langInstruction, extra: "Haberi tamamen yeniden yaz." }),
    user: `Başlık: ${news.title}\nİçerik: ${(news.content || "").slice(0, 2000)}\n\n${aiNewsUserJsonHint(s.wordCount, '"baslik","spot","icerik"')}`,
    temperature: 0.8,
  });
  if (!aiOut.text) {
    res.status(500).json({ ok: false, error: aiOut.detail ? `AI yanıt vermedi: ${aiOut.detail}` : "AI yanıt vermedi." });
    return;
  }

  const parsed = jsonExtract(aiOut.text);
  if (!parsed?.baslik) { res.status(500).json({ ok: false, error: "AI geçerli içerik üretemedi." }); return; }

  let nextContent = news.content;
  let nextImageUrl = news.imageUrl;
  if (parsed.icerik) {
    const finalized = await finalizeAiNewsArticle({
      icerikRaw: parsed.icerik,
      title: parsed.baslik,
      sourceImageUrl: news.imageUrl,
    });
    nextContent = finalized.content;
    nextImageUrl = finalized.imageUrl ?? news.imageUrl;
  }

  const [updated] = await db
    .update(newsTable)
    .set({
      title: parsed.baslik,
      spot: parsed.spot || news.spot,
      content: nextContent,
      imageUrl: nextImageUrl,
      isAiGenerated: true,
    })
    .where(eq(newsTable.id, news.id))
    .returning();

  res.json({ ok: true, news: { id: updated.id, title: updated.title } });
});

/* — POST /ai/columnist ─────────────────────────────────────────────── */
router.post("/ai/columnist", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const { authorId, topic, wordCount } = req.body as any;
  const s = await getAiSettings();
  const siteKeys = await getSiteIntegrationKeys();
  if (!s.openaiApiKey?.trim() && !siteKeys.geminiApiKey) {
    res.status(400).json({ ok: false, error: "OpenAI veya Gemini API anahtarı girilmemiş." });
    return;
  }

  let authorName = "Köşe Yazarı";
  let authorBio = "";
  if (authorId) {
    const rows = await db.select().from(authorsTable).where(eq(authorsTable.id, Number(authorId)));
    if (rows[0]) { authorName = rows[0].name; authorBio = rows[0].bio || ""; }
  }

  const wc = wordCount || s.wordCount;
  const topicText = topic || "Güncel Gündem";

  const aiOut = await callChatWithOpenAiGeminiFallback({
    openaiApiKey: s.openaiApiKey,
    openaiModel: s.openaiModel,
    geminiApiKey: siteKeys.geminiApiKey,
    system: `Sen "${authorName}" adlı köşe yazarısın. ${authorBio ? `Biyografi: ${authorBio}` : ""} Samimi, özgün köşe yazısı yaz. JSON formatında yanıt ver.`,
    user: `"${topicText}" konusunda ${wc} kelimelik köşe yazısı yaz.\n\nJSON: {"baslik":"...","spot":"...","icerik":"..."}`,
    temperature: 0.9,
  });
  if (!aiOut.text) {
    res.status(500).json({ ok: false, error: aiOut.detail ? `AI yanıt vermedi: ${aiOut.detail}` : "AI yanıt vermedi." });
    return;
  }

  const parsed = jsonExtract(aiOut.text);
  if (!parsed?.baslik) { res.status(500).json({ ok: false, error: "AI geçerli içerik üretemedi." }); return; }

  const [created] = await db
    .insert(newsTable)
    .values({
      title: parsed.baslik,
      slug: makeSlug(parsed.baslik),
      spot: parsed.spot || null,
      content: parsed.icerik,
      authorId: authorId ? Number(authorId) : null,
      status: s.postStatus as any,
      isFeatured: false,
      isBreaking: false,
      tags: [],
      views: 0,
      isAiGenerated: true,
    })
    .returning();

  res.json({ ok: true, news: { id: created.id, title: created.title, status: created.status }, provider: aiOut.provider });
});

/* — GET /ai/duplicates ─────────────────────────────────────────────── */
router.get("/ai/duplicates", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const requestedSiteIds = parseRequestedSiteIds(req.query.siteIds);

  let newsQuery = db
    .select({
      id: newsTable.id,
      title: newsTable.title,
      siteId: newsTable.siteId,
      createdAt: newsTable.createdAt,
      status: newsTable.status,
    })
    .from(newsTable)
    .$dynamic();

  if (requestedSiteIds.length > 0) {
    newsQuery = newsQuery.where(inArray(newsTable.siteId, requestedSiteIds));
  }

  const allNews = await newsQuery.orderBy(newsTable.createdAt);

  const siteRows = await db
    .select({ id: hmNewsSitesTable.id, displayName: hmNewsSitesTable.displayName })
    .from(hmNewsSitesTable);
  const siteNameById = new Map(siteRows.map((s) => [s.id, s.displayName]));

  type NewsRow = (typeof allNews)[number];
  const groups = new Map<string, NewsRow[]>();
  for (const n of allNews) {
    const normalized = normalizeNewsTitle(n.title);
    if (!normalized) continue;
    const key = duplicateNewsGroupKey(n.siteId, n.title);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }

  const duplicates: {
    key: string;
    siteId: number | null;
    siteName: string;
    count: number;
    originalId: number;
    items: (NewsRow & { isOriginal: boolean })[];
  }[] = [];
  for (const [, group] of groups) {
    if (group.length > 1) {
      const sorted = [...group].sort((a, b) => a.id - b.id);
      const originalId = sorted[0].id;
      const siteId = sorted[0].siteId ?? null;
      duplicates.push({
        key: sorted[0].title.slice(0, 50),
        siteId,
        siteName: siteId == null ? PORTAL_SITE_LABEL : (siteNameById.get(siteId) ?? `Site #${siteId}`),
        count: sorted.length,
        originalId,
        items: sorted.map((item) => ({ ...item, isOriginal: item.id === originalId })),
      });
    }
  }

  duplicates.sort((a, b) => b.count - a.count || a.siteName.localeCompare(b.siteName, "tr"));

  res.json({
    totalNews: allNews.length,
    duplicateGroups: duplicates.length,
    duplicates: duplicates.slice(0, 50),
    scopedSiteIds: requestedSiteIds.length > 0 ? requestedSiteIds : null,
  });
});

function buildDuplicateNewsGroups(allNews: { id: number; title: string; siteId: number | null }[]) {
  const groups = new Map<string, typeof allNews>();
  for (const n of allNews) {
    const normalized = normalizeNewsTitle(n.title);
    if (!normalized) continue;
    const key = duplicateNewsGroupKey(n.siteId, n.title);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }
  return groups;
}

/* — DELETE /ai/duplicates ──────────────────────────────────────────── */
router.delete("/ai/duplicates", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const { ids } = req.body as { ids: number[] };
  if (!ids?.length) { res.status(400).json({ ok: false, error: "Silinecek ID listesi boş." }); return; }

  const uniqueIds = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
  if (!uniqueIds.length) {
    res.status(400).json({ ok: false, error: "Geçerli silinecek ID bulunamadı." });
    return;
  }

  const allNews = await db
    .select({ id: newsTable.id, title: newsTable.title, siteId: newsTable.siteId })
    .from(newsTable);
  const newsById = new Map(allNews.map((n) => [n.id, n]));
  const duplicateGroups = buildDuplicateNewsGroups(allNews);

  let deleted = 0;
  let skipped = 0;
  for (const id of uniqueIds) {
    const row = newsById.get(id);
    if (!row) {
      skipped++;
      continue;
    }
    const key = duplicateNewsGroupKey(row.siteId, row.title);
    const group = duplicateGroups.get(key);
    if (!group || group.length < 2) {
      skipped++;
      continue;
    }
    const originalId = Math.min(...group.map((g) => g.id));
    if (id === originalId) {
      skipped++;
      continue;
    }
    await db.delete(newsTable).where(eq(newsTable.id, id));
    deleted++;
    const remaining = group.filter((g) => g.id !== id);
    if (remaining.length) duplicateGroups.set(key, remaining);
  }

  res.json({ ok: true, deleted, skipped });
});

function maskGeminiKeyHint(key: string | null | undefined): string | null {
  const v = String(key ?? "").trim();
  if (!v) return null;
  if (v.length <= 4) return "****";
  return `…${v.slice(-4)}`;
}

async function buildAiProviderStatus() {
  const s = await getAiSettings();
  const siteKeys = await getSiteIntegrationKeys();
  const chatKeys = mergeChatKeysFromAiAndSite(s, siteKeys);
  const openaiConfigured = !!chatKeys.openaiApiKey;
  const geminiConfigured = !!chatKeys.geminiApiKey;
  const deepseekConfigured = !!chatKeys.deepseekApiKey;
  const preferredProvider = chatKeys.preferredProvider;
  return {
    hasApiKey: openaiConfigured,
    openaiConfigured,
    geminiConfigured,
    deepseekConfigured,
    preferredProvider,
    geminiKeyHint: maskGeminiKeyHint(chatKeys.geminiApiKey),
    hasAnyAiKey: hasChatApiKeyForProvider(chatKeys, preferredProvider),
    openaiModel: chatKeys.openaiModel,
  };
}

/* — GET /ai/status ─── OpenAI + Gemini yapılandırma özeti ─────────── */
router.get("/ai/status", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const status = await buildAiProviderStatus();
  res.json({ ok: true, ...status });
});

/* — GET /ai/stats ──────────────────────────────────────────────────── */
router.get("/ai/stats", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haberler")) return;
  const s = await getAiSettings();
  const providerStatus = await buildAiProviderStatus();
  const allNews = await db
    .select({ id: newsTable.id, isAiGenerated: newsTable.isAiGenerated, status: newsTable.status })
    .from(newsTable);
  const aiGenerated = allNews.filter((n) => n.isAiGenerated).length;

  // Count RSS lines
  const rssLines = (s.rssUrls || "").split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length;

  res.json({
    ...providerStatus,
    totalNews: allNews.length,
    aiGenerated,
    published: allNews.filter((n) => n.status === "published").length,
    draft: allNews.filter((n) => n.status === "draft").length,
    rssSourceCount: rssLines,
    totalAiRuns: s.totalAiRuns,
    lastRunAt: s.lastRunAt ? s.lastRunAt.toISOString() : null,
    nextRunAt: s.nextRunAt ? s.nextRunAt.toISOString() : null,
    autoRunEnabled: s.autoRunEnabled,
    intervalHours: s.intervalHours,
  });
});

/* — AI Vendor Content Generation ──────────────────────────── */
router.post("/ai/vendor-content", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  const { vendorName, vendorType, productName, productCategory, keyFeatures, tone, contentType } = req.body as any;
  const s = await getAiSettings();
  const siteKeys = await getSiteIntegrationKeys();
  if (!s.openaiApiKey?.trim() && !siteKeys.geminiApiKey) {
    res.status(400).json({
      ok: false,
      error: "OpenAI (AI Ayarları) veya Gemini (Genel Ayarlar) API anahtarı girilmemiş.",
    });
    return;
  }

  const toneMap: Record<string, string> = {
    friendly: "samimi ve arkadaşça",
    professional: "profesyonel ve güvenilir",
    energetic: "enerjik ve heyecanlı",
    luxury: "lüks ve prestijli",
  };
  const toneText = toneMap[tone] || "samimi";

  const contentTypePrompts: Record<string, string> = {
    product_desc: `"${productName}" adlı ürün için ${toneText} bir ürün açıklaması yaz. Öne çıkan özellikler: ${keyFeatures || "genel"}.`,
    promo_text: `"${vendorName}" mağazası için ${toneText} bir promosyon/tanıtım metni yaz.`,
    social_post: `"${vendorName}" mağazasının "${productName}" ürünü için Instagram ve Twitter paylaşımı yaz. Emoji kullan.`,
    seo_title: `"${productName || vendorName}" için SEO uyumlu başlık ve meta açıklama yaz.`,
    announcement: `"${vendorName}" mağazasından ${productName || "yeni ürün"} duyurusu yaz.`,
  };

  const userPrompt = `${contentTypePrompts[contentType] || contentTypePrompts["product_desc"]}

Mağaza türü: ${vendorType === "delivery" ? "Yemek/Teslimat" : vendorType === "ecommerce" ? "E-Ticaret" : "Genel"}
Kategori: ${productCategory || "Genel"}

JSON formatında yanıt ver: {"baslik":"...","icerik":"...","etiketler":["...","...","..."]}`;

  const systemPrompt = `Sen Türkiye'deki küçük ve orta ölçekli işletmeler için içerik üreten bir AI pazarlama asistanısın. ${toneText.charAt(0).toUpperCase() + toneText.slice(1)} bir üslup kullan. Türkçe yaz.`;

  const aiOut = await callChatWithOpenAiGeminiFallback({
    openaiApiKey: s.openaiApiKey,
    openaiModel: s.openaiModel,
    geminiApiKey: siteKeys.geminiApiKey,
    system: systemPrompt,
    user: userPrompt,
    temperature: 0.8,
  });
  if (!aiOut.text) {
    res.status(500).json({ ok: false, error: aiOut.detail ? `AI yanıt vermedi: ${aiOut.detail}` : "AI yanıt vermedi." });
    return;
  }

  const parsed = jsonExtract(aiOut.text);
  if (!parsed?.icerik) { res.status(500).json({ ok: false, error: "İçerik üretilemedi.", raw: aiOut.text }); return; }

  res.json({
    ok: true,
    baslik: parsed.baslik || "",
    icerik: parsed.icerik,
    etiketler: parsed.etiketler || [],
    provider: aiOut.provider,
  });
});

export default router;

import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import {
  getYektubeDbForRead,
  dualWriteYektubeInsert,
  dualWriteYektubeUpdate,
  videoSourcesTable,
  videosTable,
  yektubeMemberPrefsTable,
  yektubeMemberSubscriptionsTable,
  yektubePlaylistItemsTable,
  yektubePlaylistsTable,
  yektubeWatchHistoryTable,
} from "@workspace/db";
import { serializeVideo, serializeVideoSource } from "../lib/serializers";
import { slugifyVideoCategory } from "../lib/yektubeCategoryCatalog.js";
import { scheduleSyncVideoSource } from "../lib/youtubeVideoSync.js";
import { extFromMime, saveMediaBuffer } from "../lib/mediaUploadService.js";
import { getMediaStorageMode, isS3MediaConfigured } from "../lib/mediaStorageConfig.js";
import { isWebPushConfigured, sendWebPushSafe } from "../lib/webPushService.js";
import {
  formatDurationSeconds,
  YEKCEK_MAX_DURATION_SECONDS,
} from "../lib/yektubeVideoClassify.js";

const uploadMaxMb = Math.min(500, Math.max(10, Number(process.env.YEKTUBE_UPLOAD_MAX_MB ?? 100) || 100));
const creatorVideoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadMaxMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype.toLowerCase();
    const ok =
      /^video\/(mp4|webm|ogg|quicktime|x-matroska)$/i.test(mime) ||
      (mime === "application/octet-stream" && /\.(mp4|webm|mov|mkv)$/i.test(file.originalname));
    cb(null, ok);
  },
});

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype.toLowerCase()));
  },
});

const router: IRouter = Router();
const db = getYektubeDbForRead();

function memberId(req: Request, res: Response): string | null {
  const id = req.session?.memberId?.trim();
  if (!id) {
    res.status(401).json({ error: "Giriş gerekli." });
    return null;
  }
  return id;
}

async function ensureMemberYektubeChannel(memberIdVal: string, displayName: string) {
  const channelKey = `member:${memberIdVal}`;
  const [existing] = await db
    .select()
    .from(videoSourcesTable)
    .where(and(eq(videoSourcesTable.platform, "yektube"), eq(videoSourcesTable.channelId, channelKey)))
    .limit(1);
  if (existing) return existing;

  const [row] = await dualWriteYektubeInsert(videoSourcesTable, {
    name: displayName.slice(0, 200) || "Yektube Yayıncı",
    platform: "yektube",
    sourceType: "channel",
    channelId: channelKey,
    url: null,
    logoUrl: null,
    categorySlug: "eglence",
    active: true,
    isLive: false,
    useYoutubeApi: false,
  });
  return row;
}

const DEFAULT_PREFS = {
  notifyNewVideos: true,
  notifyShorts: true,
  notifyLive: false,
  saveHistory: true,
  avatarUrl: null as string | null,
  linkedChannelUrl: null as string | null,
  hasPushSubscription: false,
};

let memberPrefsSchemaReady: Promise<void> | null = null;

async function ensureMemberPrefsExtendedSchema(): Promise<void> {
  if (!memberPrefsSchemaReady) {
    memberPrefsSchemaReady = (async () => {
      await db.execute(sql`ALTER TABLE yektube_member_prefs ADD COLUMN IF NOT EXISTS avatar_url text`);
      await db.execute(sql`ALTER TABLE yektube_member_prefs ADD COLUMN IF NOT EXISTS linked_channel_url text`);
      await db.execute(
        sql`ALTER TABLE yektube_member_prefs ADD COLUMN IF NOT EXISTS push_subscription_json text`,
      );
    })().catch((err) => {
      memberPrefsSchemaReady = null;
      throw err;
    });
  }
  await memberPrefsSchemaReady;
}

async function syncMemberChannelLinks(
  memberIdVal: string,
  opts: { linkedChannelUrl?: string | null; avatarUrl?: string | null },
) {
  const channelKey = `member:${memberIdVal}`;
  const patch: { url?: string | null; logoUrl?: string | null } = {};
  if ("linkedChannelUrl" in opts) patch.url = opts.linkedChannelUrl ?? null;
  if ("avatarUrl" in opts) patch.logoUrl = opts.avatarUrl ?? null;
  if (!Object.keys(patch).length) return;
  await db
    .update(videoSourcesTable)
    .set(patch)
    .where(and(eq(videoSourcesTable.platform, "yektube"), eq(videoSourcesTable.channelId, channelKey)));
}

async function loadPrefs(memberIdVal: string) {
  await ensureMemberPrefsExtendedSchema();
  const [row] = await db
    .select()
    .from(yektubeMemberPrefsTable)
    .where(eq(yektubeMemberPrefsTable.memberId, memberIdVal))
    .limit(1);
  if (!row) return { ...DEFAULT_PREFS };
  return {
    notifyNewVideos: row.notifyNewVideos,
    notifyShorts: row.notifyShorts,
    notifyLive: row.notifyLive,
    saveHistory: row.saveHistory,
    avatarUrl: row.avatarUrl ?? null,
    linkedChannelUrl: row.linkedChannelUrl ?? null,
    hasPushSubscription: Boolean(row.pushSubscriptionJson?.trim()),
  };
}

/** GET /video/me/subscriptions */
router.get("/video/me/subscriptions", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  try {
    const subs = await db
      .select()
      .from(yektubeMemberSubscriptionsTable)
      .where(eq(yektubeMemberSubscriptionsTable.memberId, mid))
      .orderBy(desc(yektubeMemberSubscriptionsTable.createdAt));
    if (subs.length === 0) {
      res.json({ items: [] });
      return;
    }
    const sourceIds = subs.map((s) => s.sourceId);
    const sources = await db
      .select()
      .from(videoSourcesTable)
      .where(inArray(videoSourcesTable.id, sourceIds));
    const byId = new Map(sources.map((s) => [s.id, s]));
    const items = subs
      .map((s) => byId.get(s.sourceId))
      .filter(Boolean)
      .map((s) => serializeVideoSource(s!));
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** GET /video/me/subscriptions/status?sourceId= */
router.get("/video/me/subscriptions/status", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  const sourceId = parseInt(String(req.query.sourceId ?? ""), 10);
  if (Number.isNaN(sourceId)) {
    res.status(400).json({ error: "sourceId gerekli" });
    return;
  }
  try {
    const [row] = await db
      .select({ id: yektubeMemberSubscriptionsTable.id })
      .from(yektubeMemberSubscriptionsTable)
      .where(
        and(
          eq(yektubeMemberSubscriptionsTable.memberId, mid),
          eq(yektubeMemberSubscriptionsTable.sourceId, sourceId),
        ),
      )
      .limit(1);
    res.json({ subscribed: Boolean(row) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /video/me/subscriptions/:sourceId */
router.post("/video/me/subscriptions/:sourceId", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  const sourceId = parseInt(String(req.params.sourceId), 10);
  if (Number.isNaN(sourceId)) {
    res.status(400).json({ error: "Geçersiz kaynak" });
    return;
  }
  try {
    const [source] = await db.select().from(videoSourcesTable).where(eq(videoSourcesTable.id, sourceId)).limit(1);
    if (!source) {
      res.status(404).json({ error: "Kanal bulunamadı" });
      return;
    }
    await db
      .insert(yektubeMemberSubscriptionsTable)
      .values({ memberId: mid, sourceId })
      .onConflictDoNothing();
    res.json({ success: true, source: serializeVideoSource(source) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** DELETE /video/me/subscriptions/:sourceId */
router.delete("/video/me/subscriptions/:sourceId", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  const sourceId = parseInt(String(req.params.sourceId), 10);
  if (Number.isNaN(sourceId)) {
    res.status(400).json({ error: "Geçersiz kaynak" });
    return;
  }
  try {
    await db
      .delete(yektubeMemberSubscriptionsTable)
      .where(
        and(
          eq(yektubeMemberSubscriptionsTable.memberId, mid),
          eq(yektubeMemberSubscriptionsTable.sourceId, sourceId),
        ),
      );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** GET /video/me/history */
router.get("/video/me/history", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50));
  try {
    const rows = await db
      .select()
      .from(yektubeWatchHistoryTable)
      .where(eq(yektubeWatchHistoryTable.memberId, mid))
      .orderBy(desc(yektubeWatchHistoryTable.watchedAt))
      .limit(limit);
    if (rows.length === 0) {
      res.json({ items: [] });
      return;
    }
    const videoIds = rows.map((r) => r.videoId);
    const videos = await db.select().from(videosTable).where(inArray(videosTable.id, videoIds));
    const byId = new Map(videos.map((v) => [v.id, v]));
    const items = rows
      .map((r) => {
        const v = byId.get(r.videoId);
        if (!v) return null;
        return { ...serializeVideo(v), watchedAt: r.watchedAt };
      })
      .filter(Boolean);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /video/me/history */
router.post("/video/me/history", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  const { videoId, sourceId, youtubeVideoId } = req.body as {
    videoId?: number;
    sourceId?: number;
    youtubeVideoId?: string;
  };
  if (!videoId || !youtubeVideoId?.trim()) {
    res.status(400).json({ error: "videoId ve youtubeVideoId gerekli" });
    return;
  }
  try {
    const prefs = await loadPrefs(mid);
    if (!prefs.saveHistory) {
      res.json({ success: true, skipped: true });
      return;
    }
    await db
      .insert(yektubeWatchHistoryTable)
      .values({
        memberId: mid,
        videoId,
        sourceId: sourceId ?? null,
        youtubeVideoId: youtubeVideoId.trim(),
        watchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [yektubeWatchHistoryTable.memberId, yektubeWatchHistoryTable.videoId],
        set: { watchedAt: new Date(), sourceId: sourceId ?? null, youtubeVideoId: youtubeVideoId.trim() },
      });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** DELETE /video/me/history — tümü veya ?videoId= */
router.delete("/video/me/history", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  const videoIdRaw = req.query.videoId;
  try {
    if (videoIdRaw != null && String(videoIdRaw).trim()) {
      const videoId = parseInt(String(videoIdRaw), 10);
      if (!Number.isNaN(videoId)) {
        await db
          .delete(yektubeWatchHistoryTable)
          .where(and(eq(yektubeWatchHistoryTable.memberId, mid), eq(yektubeWatchHistoryTable.videoId, videoId)));
      }
    } else {
      await db.delete(yektubeWatchHistoryTable).where(eq(yektubeWatchHistoryTable.memberId, mid));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** GET /video/me/playlists */
router.get("/video/me/playlists", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  try {
    const playlists = await db
      .select()
      .from(yektubePlaylistsTable)
      .where(eq(yektubePlaylistsTable.memberId, mid))
      .orderBy(desc(yektubePlaylistsTable.updatedAt));
    if (playlists.length === 0) {
      res.json({ items: [] });
      return;
    }
    const playlistIds = playlists.map((p) => p.id);
    const items = await db
      .select()
      .from(yektubePlaylistItemsTable)
      .where(inArray(yektubePlaylistItemsTable.playlistId, playlistIds))
      .orderBy(yektubePlaylistItemsTable.sortOrder);
    const videoIds = [...new Set(items.map((i) => i.videoId))];
    const videos =
      videoIds.length > 0
        ? await db.select().from(videosTable).where(inArray(videosTable.id, videoIds))
        : [];
    const videoById = new Map(videos.map((v) => [v.id, v]));
    const itemsByPlaylist = new Map<number, ReturnType<typeof serializeVideo>[]>();
    for (const item of items) {
      const v = videoById.get(item.videoId);
      if (!v) continue;
      const list = itemsByPlaylist.get(item.playlistId) ?? [];
      list.push(serializeVideo(v));
      itemsByPlaylist.set(item.playlistId, list);
    }
    res.json({
      items: playlists.map((p) => ({
        id: p.id,
        title: p.title,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        videos: itemsByPlaylist.get(p.id) ?? [],
      })),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /video/me/playlists */
router.post("/video/me/playlists", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  const title = String((req.body as { title?: string }).title ?? "").trim();
  if (!title) {
    res.status(400).json({ error: "Liste adı gerekli" });
    return;
  }
  try {
    const [row] = await db
      .insert(yektubePlaylistsTable)
      .values({ memberId: mid, title })
      .returning();
    res.json({ id: row!.id, title: row!.title, videos: [] });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** DELETE /video/me/playlists/:id */
router.delete("/video/me/playlists/:id", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Geçersiz liste" });
    return;
  }
  try {
    const [pl] = await db
      .select()
      .from(yektubePlaylistsTable)
      .where(and(eq(yektubePlaylistsTable.id, id), eq(yektubePlaylistsTable.memberId, mid)))
      .limit(1);
    if (!pl) {
      res.status(404).json({ error: "Liste bulunamadı" });
      return;
    }
    await db.delete(yektubePlaylistsTable).where(eq(yektubePlaylistsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /video/me/playlists/:id/items */
router.post("/video/me/playlists/:id/items", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  const playlistId = parseInt(String(req.params.id), 10);
  const videoId = parseInt(String((req.body as { videoId?: number }).videoId ?? ""), 10);
  if (Number.isNaN(playlistId) || Number.isNaN(videoId)) {
    res.status(400).json({ error: "Geçersiz liste veya video" });
    return;
  }
  try {
    const [pl] = await db
      .select()
      .from(yektubePlaylistsTable)
      .where(and(eq(yektubePlaylistsTable.id, playlistId), eq(yektubePlaylistsTable.memberId, mid)))
      .limit(1);
    if (!pl) {
      res.status(404).json({ error: "Liste bulunamadı" });
      return;
    }
    const [video] = await db.select().from(videosTable).where(eq(videosTable.id, videoId)).limit(1);
    if (!video) {
      res.status(404).json({ error: "Video bulunamadı" });
      return;
    }
    const [countRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(yektubePlaylistItemsTable)
      .where(eq(yektubePlaylistItemsTable.playlistId, playlistId));
    await db
      .insert(yektubePlaylistItemsTable)
      .values({ playlistId, videoId, sortOrder: Number(countRow?.c ?? 0) })
      .onConflictDoNothing();
    await db
      .update(yektubePlaylistsTable)
      .set({ updatedAt: new Date() })
      .where(eq(yektubePlaylistsTable.id, playlistId));
    res.json({ success: true, video: serializeVideo(video) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** DELETE /video/me/playlists/:id/items/:videoId */
router.delete("/video/me/playlists/:playlistId/items/:videoId", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  const playlistId = parseInt(String(req.params.playlistId), 10);
  const videoId = parseInt(String(req.params.videoId), 10);
  if (Number.isNaN(playlistId) || Number.isNaN(videoId)) {
    res.status(400).json({ error: "Geçersiz parametre" });
    return;
  }
  try {
    const [pl] = await db
      .select()
      .from(yektubePlaylistsTable)
      .where(and(eq(yektubePlaylistsTable.id, playlistId), eq(yektubePlaylistsTable.memberId, mid)))
      .limit(1);
    if (!pl) {
      res.status(404).json({ error: "Liste bulunamadı" });
      return;
    }
    await db
      .delete(yektubePlaylistItemsTable)
      .where(
        and(
          eq(yektubePlaylistItemsTable.playlistId, playlistId),
          eq(yektubePlaylistItemsTable.videoId, videoId),
        ),
      );
    await db
      .update(yektubePlaylistsTable)
      .set({ updatedAt: new Date() })
      .where(eq(yektubePlaylistsTable.id, playlistId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** GET /video/me/prefs */
router.get("/video/me/prefs", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  try {
    res.json(await loadPrefs(mid));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** PATCH /video/me/prefs */
router.patch("/video/me/prefs", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  const body = req.body as Partial<typeof DEFAULT_PREFS>;
  try {
    const current = await loadPrefs(mid);
    const next = {
      notifyNewVideos: typeof body.notifyNewVideos === "boolean" ? body.notifyNewVideos : current.notifyNewVideos,
      notifyShorts: typeof body.notifyShorts === "boolean" ? body.notifyShorts : current.notifyShorts,
      notifyLive: typeof body.notifyLive === "boolean" ? body.notifyLive : current.notifyLive,
      saveHistory: typeof body.saveHistory === "boolean" ? body.saveHistory : current.saveHistory,
      avatarUrl: current.avatarUrl,
      linkedChannelUrl:
        typeof body.linkedChannelUrl === "string"
          ? body.linkedChannelUrl.trim().slice(0, 2000) || null
          : current.linkedChannelUrl,
      hasPushSubscription: current.hasPushSubscription,
    };
    await db
      .insert(yektubeMemberPrefsTable)
      .values({
        memberId: mid,
        notifyNewVideos: next.notifyNewVideos,
        notifyShorts: next.notifyShorts,
        notifyLive: next.notifyLive,
        saveHistory: next.saveHistory,
        avatarUrl: next.avatarUrl,
        linkedChannelUrl: next.linkedChannelUrl,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: yektubeMemberPrefsTable.memberId,
        set: {
          notifyNewVideos: next.notifyNewVideos,
          notifyShorts: next.notifyShorts,
          notifyLive: next.notifyLive,
          saveHistory: next.saveHistory,
          linkedChannelUrl: next.linkedChannelUrl,
          updatedAt: new Date(),
        },
      });
    if (typeof body.linkedChannelUrl === "string") {
      await syncMemberChannelLinks(mid, { linkedChannelUrl: next.linkedChannelUrl });
    }
    res.json(next);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /video/me/sync-guest — misafir localStorage verisini hesaba aktar */
router.post("/video/me/sync-guest", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  const { subscriptions = [], history = [] } = req.body as {
    subscriptions?: number[];
    history?: { videoId: number; sourceId?: number; youtubeVideoId: string }[];
  };
  try {
    for (const sourceId of subscriptions) {
      if (typeof sourceId === "number" && sourceId > 0) {
        await db
          .insert(yektubeMemberSubscriptionsTable)
          .values({ memberId: mid, sourceId })
          .onConflictDoNothing();
      }
    }
    for (const h of history.slice(0, 100)) {
      if (!h?.videoId || !h?.youtubeVideoId) continue;
      await db
        .insert(yektubeWatchHistoryTable)
        .values({
          memberId: mid,
          videoId: h.videoId,
          sourceId: h.sourceId ?? null,
          youtubeVideoId: h.youtubeVideoId,
        })
        .onConflictDoUpdate({
          target: [yektubeWatchHistoryTable.memberId, yektubeWatchHistoryTable.videoId],
          set: { watchedAt: new Date() },
        });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** GET /video/me/creator/submissions — üyenin gönderdiği kanal/bağlantı ve yüklemeler */
router.get("/video/me/creator/submissions", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  const memberChannel = `member:${mid}`;
  const pendingPrefix = `member-pending:${mid}:`;

  try {
    const sources = await db
      .select()
      .from(videoSourcesTable)
      .where(
        or(
          like(videoSourcesTable.channelId, `${pendingPrefix}%`),
          and(eq(videoSourcesTable.platform, "yektube"), eq(videoSourcesTable.channelId, memberChannel)),
        ),
      )
      .orderBy(desc(videoSourcesTable.createdAt))
      .limit(80);

    type Item = {
      kind: "upload" | "link" | "live" | "playlist";
      status: "pending" | "published" | "approved";
      title: string;
      url?: string | null;
      sourceId: number;
      videoId?: number;
      categorySlug: string;
      createdAt: string;
      platform: string;
    };

    const items: Item[] = [];

    for (const s of sources) {
      if (s.platform === "yektube" && s.channelId === memberChannel) {
        const vids = await db
          .select()
          .from(videosTable)
          .where(eq(videosTable.sourceId, s.id))
          .orderBy(desc(videosTable.createdAt))
          .limit(50);
        for (const v of vids) {
          items.push({
            kind: "upload",
            status: v.active ? "published" : "pending",
            title: v.title,
            sourceId: s.id,
            videoId: v.id,
            categorySlug: v.categorySlug,
            createdAt: v.createdAt?.toISOString?.() ?? new Date().toISOString(),
            platform: v.platform,
          });
        }
        continue;
      }

      items.push({
        kind: s.isLive ? "live" : s.sourceType === "playlist" ? "playlist" : "link",
        status: s.active ? "approved" : "pending",
        title: s.name,
        url: s.url,
        sourceId: s.id,
        categorySlug: s.categorySlug,
        createdAt: s.createdAt?.toISOString?.() ?? new Date().toISOString(),
        platform: s.platform,
      });
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ items: items.slice(0, 100) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** GET /video/me/creator/analytics — stüdyo özet istatistikleri */
router.get("/video/me/creator/analytics", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  const memberChannel = `member:${mid}`;
  const pendingPrefix = `member-pending:${mid}:`;

  try {
    const [source] = await db
      .select()
      .from(videoSourcesTable)
      .where(and(eq(videoSourcesTable.platform, "yektube"), eq(videoSourcesTable.channelId, memberChannel)))
      .limit(1);

    let videoCount = 0;
    let publishedCount = 0;
    let totalViews = 0;
    let subscriberCount = 0;

    if (source) {
      const channelVideos = await db
        .select({ id: videosTable.id, active: videosTable.active })
        .from(videosTable)
        .where(eq(videosTable.sourceId, source.id));
      videoCount = channelVideos.length;
      publishedCount = channelVideos.filter((v) => v.active).length;

      const videoIds = channelVideos.map((v) => v.id);
      if (videoIds.length > 0) {
        const [viewsRow] = await db
          .select({ c: sql<number>`count(*)::int` })
          .from(yektubeWatchHistoryTable)
          .where(inArray(yektubeWatchHistoryTable.videoId, videoIds));
        totalViews = Number(viewsRow?.c ?? 0);
      }

      const [subRow] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(yektubeMemberSubscriptionsTable)
        .where(eq(yektubeMemberSubscriptionsTable.sourceId, source.id));
      subscriberCount = Number(subRow?.c ?? 0);
    }

    const pendingSources = await db
      .select({ id: videoSourcesTable.id, active: videoSourcesTable.active })
      .from(videoSourcesTable)
      .where(like(videoSourcesTable.channelId, `${pendingPrefix}%`));

    const pendingLinks = pendingSources.filter((s) => !s.active).length;
    const pendingUploads = Math.max(0, videoCount - publishedCount);

    res.json({
      videoCount,
      publishedCount,
      pendingUploads,
      pendingLinks,
      totalViews,
      subscriberCount,
      hasChannel: Boolean(source),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /video/me/profile/avatar — profil fotoğrafı yükle */
router.post("/video/me/profile/avatar", avatarUpload.single("avatar"), async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;

  const file = req.file;
  if (!file?.buffer?.length) {
    res.status(400).json({ error: "Görsel gerekli (JPEG, PNG veya WebP, en fazla 4 MB)." });
    return;
  }

  const mime = file.mimetype.toLowerCase();
  const ext = extFromMime(mime) ?? "jpg";

  try {
    const saved = await saveMediaBuffer(file.buffer, { ext, mime, prefix: "yt-av-" });
    await ensureMemberPrefsExtendedSchema();

    const current = await loadPrefs(mid);
    await db
      .insert(yektubeMemberPrefsTable)
      .values({
        memberId: mid,
        notifyNewVideos: current.notifyNewVideos,
        notifyShorts: current.notifyShorts,
        notifyLive: current.notifyLive,
        saveHistory: current.saveHistory,
        avatarUrl: saved.url,
        linkedChannelUrl: current.linkedChannelUrl,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: yektubeMemberPrefsTable.memberId,
        set: { avatarUrl: saved.url, updatedAt: new Date() },
      });

    await syncMemberChannelLinks(mid, { avatarUrl: saved.url });

    res.json({
      ok: true,
      avatarUrl: saved.url,
      storage: { mode: getMediaStorageMode(), s3Configured: isS3MediaConfigured() },
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** GET /video/me/push-config — tarayıcı push aboneliği için VAPID public key */
router.get("/video/me/push-config", (_req, res): void => {
  const vapidPublicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() || null;
  res.json({ vapidPublicKey, pushEnabled: isWebPushConfigured() });
});

/** POST /video/me/push-subscription — web push aboneliğini kaydet */
router.post("/video/me/push-subscription", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;

  const subscription = (req.body as { subscription?: unknown })?.subscription;
  if (!subscription || typeof subscription !== "object") {
    res.status(400).json({ error: "Geçersiz push aboneliği." });
    return;
  }

  try {
    await ensureMemberPrefsExtendedSchema();
    const current = await loadPrefs(mid);
    const json = JSON.stringify(subscription);

    await db
      .insert(yektubeMemberPrefsTable)
      .values({
        memberId: mid,
        notifyNewVideos: current.notifyNewVideos,
        notifyShorts: current.notifyShorts,
        notifyLive: current.notifyLive,
        saveHistory: current.saveHistory,
        avatarUrl: current.avatarUrl,
        linkedChannelUrl: current.linkedChannelUrl,
        pushSubscriptionJson: json,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: yektubeMemberPrefsTable.memberId,
        set: { pushSubscriptionJson: json, updatedAt: new Date() },
      });

    res.json({ ok: true, hasPushSubscription: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** DELETE /video/me/push-subscription */
router.delete("/video/me/push-subscription", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;

  try {
    await ensureMemberPrefsExtendedSchema();
    await db
      .update(yektubeMemberPrefsTable)
      .set({ pushSubscriptionJson: null, updatedAt: new Date() })
      .where(eq(yektubeMemberPrefsTable.memberId, mid));
    res.json({ ok: true, hasPushSubscription: false });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /video/me/push-test — kayıtlı aboneliğe test bildirimi gönder */
router.post("/video/me/push-test", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;

  if (!isWebPushConfigured()) {
    res.status(503).json({ error: "Push sunucusu yapılandırılmamış (VAPID anahtarları)." });
    return;
  }

  try {
    const prefs = await loadPrefs(mid);
    const [row] = await db
      .select({ pushSubscriptionJson: yektubeMemberPrefsTable.pushSubscriptionJson })
      .from(yektubeMemberPrefsTable)
      .where(eq(yektubeMemberPrefsTable.memberId, mid))
      .limit(1);

    const subJson = row?.pushSubscriptionJson?.trim();
    if (!subJson) {
      res.status(400).json({ error: "Push aboneliği yok. Önce bildirimlere izin verin." });
      return;
    }

    const result = await sendWebPushSafe(subJson, {
      title: "Yektube",
      body: "Test bildirimi — push aboneliğiniz çalışıyor.",
      url: "/yp/",
    });

    if (!result.ok && result.expired) {
      await db
        .update(yektubeMemberPrefsTable)
        .set({ pushSubscriptionJson: null, updatedAt: new Date() })
        .where(eq(yektubeMemberPrefsTable.memberId, mid));
      res.status(410).json({ error: "Abonelik süresi dolmuş; yeniden kaydolun." });
      return;
    }

    if (!result.ok) {
      res.status(502).json({ error: result.error });
      return;
    }

    res.json({ ok: true, hasPushSubscription: prefs.hasPushSubscription });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /video/me/creator/sources — üye içerik önerisi (moderasyon kuyruğu) */
router.post("/video/me/creator/sources", async (req, res): Promise<void> => {
  const mid = memberId(req, res);
  if (!mid) return;
  const body = req.body as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const url = String(body.url ?? "").trim();
  const sourceTypeRaw = String(body.sourceType ?? "channel");
  const sourceType =
    sourceTypeRaw === "live" ? "live" : sourceTypeRaw === "playlist" ? "playlist" : "channel";
  if (!url) {
    res.status(400).json({ error: "YouTube URL veya ID gerekli." });
    return;
  }
  const categorySlug = slugifyVideoCategory(String(body.categorySlug ?? "eglence")) || "eglence";
  try {
    const [row] = await dualWriteYektubeInsert(videoSourcesTable, {
      name: (name || url).slice(0, 200),
      platform: "youtube",
      sourceType,
      channelId: `member-pending:${mid}:${Date.now()}`,
      url: url.slice(0, 2000),
      logoUrl: null,
      categorySlug,
      active: false,
      isLive: sourceType === "live",
      useYoutubeApi: true,
    });
    scheduleSyncVideoSource(row.id);
    res.json({ ok: true, sourceId: row.id, source: serializeVideoSource(row) });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** POST /video/me/creator/upload — üye video dosyası yükle (Yektube barındırma) */
router.post(
  "/video/me/creator/upload",
  creatorVideoUpload.single("video"),
  async (req, res): Promise<void> => {
    const mid = memberId(req, res);
    if (!mid) return;

    const file = req.file;
    if (!file?.buffer?.length) {
      res.status(400).json({ error: "Video dosyası gerekli (MP4, WebM veya MOV)." });
      return;
    }

    const title = String(req.body?.title ?? "").trim();
    if (!title) {
      res.status(400).json({ error: "Video başlığı gerekli." });
      return;
    }

    const description = String(req.body?.description ?? "").trim();
    const channelLabel = String(req.body?.channelName ?? "").trim();
    const categorySlug = slugifyVideoCategory(String(req.body?.categorySlug ?? "eglence")) || "eglence";
    const yekcek = String(req.body?.yekcek ?? "").trim() === "1" || String(req.body?.yekcek ?? "").toLowerCase() === "true";
    const durationSecondsRaw = Number(req.body?.durationSeconds);
    const durationSeconds =
      Number.isFinite(durationSecondsRaw) && durationSecondsRaw > 0 ? Math.floor(durationSecondsRaw) : null;

    if (yekcek) {
      if (durationSeconds == null) {
        res.status(400).json({ error: "Yekçek yüklemesi için video süresi gerekli." });
        return;
      }
      if (durationSeconds > YEKCEK_MAX_DURATION_SECONDS) {
        res.status(400).json({
          error: `Yekçek videoları en fazla ${YEKCEK_MAX_DURATION_SECONDS / 60} dakika olabilir.`,
        });
        return;
      }
    }

    const mime = file.mimetype.toLowerCase();
    let ext = extFromMime(mime);
    if (!ext) {
      const fromName = file.originalname.match(/\.(mp4|webm|mov|mkv|ogv)$/i)?.[1]?.toLowerCase();
      ext = fromName === "ogv" ? "ogv" : fromName ?? "mp4";
    }
    const resolvedMime =
      mime.startsWith("video/") || mime === "application/octet-stream"
        ? mime.startsWith("video/")
          ? mime
          : `video/${ext === "mov" ? "quicktime" : ext}`
        : "video/mp4";

    try {
      const saved = await saveMediaBuffer(file.buffer, {
        ext,
        mime: resolvedMime,
        prefix: "yt-up-",
      });

      const source = await ensureMemberYektubeChannel(mid, channelLabel || title);
      const now = new Date().toISOString();

      const [videoRow] = await dualWriteYektubeInsert(videosTable, {
        sourceId: source.id,
        platform: "yektube",
        videoId: saved.fname,
        title: title.slice(0, 300),
        description: description.slice(0, 8000) || null,
        thumbnail: null,
        channelName: source.name,
        channelId: source.channelId,
        publishedAt: now,
        duration: durationSeconds != null ? formatDurationSeconds(durationSeconds) : null,
        categorySlug,
        isFeatured: false,
        isHeadline: false,
        isStory: yekcek,
        sortOrder: 0,
        active: true,
        embedAllowed: false,
      });

      await dualWriteYektubeUpdate(
        videoSourcesTable,
        { videoCount: (source.videoCount ?? 0) + 1, categorySlug },
        eq(videoSourcesTable.id, source.id),
      );

      const video = serializeVideo(videoRow);
      res.json({
        ok: true,
        sourceId: source.id,
        video,
        streamUrl: saved.url,
        storage: {
          mode: getMediaStorageMode(),
          s3Configured: isS3MediaConfigured(),
          fileName: saved.fname,
        },
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  },
);

export default router;

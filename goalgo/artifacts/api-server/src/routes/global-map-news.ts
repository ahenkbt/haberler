import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, globalMapNewsFeedsTable } from "@workspace/db";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard.js";
import seedRows from "../data/globalMapNewsFeedsSeed.json" with { type: "json" };
import {
  countGlobalMapNewsFeedsByUrl,
  ensureNewsmapRegionalRssFeedsSeeded,
  groupGlobalMapNewsFeeds,
  listGlobalMapNewsFeeds,
  mapGlobalMapNewsFeedRow,
  parseGlobalMapNewsFeedInput,
} from "../lib/global-map-news-feeds.js";

const router: IRouter = Router();

router.get("/admin/global-map-news/feeds", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  try {
    const rows = (await listGlobalMapNewsFeeds()).map(mapGlobalMapNewsFeedRow);
    res.json({
      continents: groupGlobalMapNewsFeeds(rows),
      total: rows.length,
      enabled: rows.filter((row) => row.enabled).length,
    });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Küresel harita RSS listesi alınamadı" });
  }
});

router.post("/admin/global-map-news/feeds", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const input = parseGlobalMapNewsFeedInput((req.body ?? {}) as Record<string, unknown>);
  if (!input) {
    res.status(400).json({ error: "Geçerli ad ve RSS URL gerekli" });
    return;
  }

  try {
    const duplicateCount = await countGlobalMapNewsFeedsByUrl(input.url);
    if (duplicateCount > 0) {
      res.status(409).json({ error: "Bu RSS URL zaten kayıtlı" });
      return;
    }

    const [row] = await db
      .insert(globalMapNewsFeedsTable)
      .values({
        name: input.name,
        url: input.url,
        continent: input.continent,
        countryCode: input.countryCode,
        countryName: input.countryName,
        category: input.category ?? "news",
        scope: input.scope ?? "country",
        enabled: input.enabled !== false,
        priority: input.priority ?? 0,
        lat: input.lat,
        lng: input.lng,
        regionKey: input.regionKey,
        regionLabel: input.regionLabel,
      })
      .returning();

    res.status(201).json({ feed: mapGlobalMapNewsFeedRow(row) });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "RSS kaynağı eklenemedi" });
  }
});

router.patch("/admin/global-map-news/feeds/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Geçersiz kaynak kimliği" });
    return;
  }

  const input = parseGlobalMapNewsFeedInput((req.body ?? {}) as Record<string, unknown>);
  if (!input) {
    res.status(400).json({ error: "Geçerli ad ve RSS URL gerekli" });
    return;
  }

  try {
    const duplicateCount = await countGlobalMapNewsFeedsByUrl(input.url, id);
    if (duplicateCount > 0) {
      res.status(409).json({ error: "Bu RSS URL zaten kayıtlı" });
      return;
    }

    const [row] = await db
      .update(globalMapNewsFeedsTable)
      .set({
        name: input.name,
        url: input.url,
        continent: input.continent,
        countryCode: input.countryCode,
        countryName: input.countryName,
        category: input.category ?? "news",
        scope: input.scope ?? "country",
        enabled: input.enabled !== false,
        priority: input.priority ?? 0,
        lat: input.lat,
        lng: input.lng,
        regionKey: input.regionKey,
        regionLabel: input.regionLabel,
      })
      .where(eq(globalMapNewsFeedsTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Kaynak bulunamadı" });
      return;
    }

    res.json({ feed: mapGlobalMapNewsFeedRow(row) });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "RSS kaynağı güncellenemedi" });
  }
});

router.delete("/admin/global-map-news/feeds/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Geçersiz kaynak kimliği" });
    return;
  }

  try {
    const [row] = await db
      .delete(globalMapNewsFeedsTable)
      .where(eq(globalMapNewsFeedsTable.id, id))
      .returning({ id: globalMapNewsFeedsTable.id });
    if (!row) {
      res.status(404).json({ error: "Kaynak bulunamadı" });
      return;
    }
    res.json({ ok: true, id: row.id });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "RSS kaynağı silinemedi" });
  }
});

router.post("/admin/global-map-news/feeds/seed", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "haritalar")) return;
  const replace = String((req.body as { replace?: unknown })?.replace ?? "").trim() === "1";

  try {
    if (replace) {
      await db.delete(globalMapNewsFeedsTable);
    }

    const existing = replace ? [] : await listGlobalMapNewsFeeds();
    const existingUrls = new Set(existing.map((row) => row.url.trim().toLowerCase()));

    let inserted = 0;
    let skipped = 0;

    for (const raw of seedRows) {
      const input = parseGlobalMapNewsFeedInput(raw as Record<string, unknown>);
      if (!input) {
        skipped += 1;
        continue;
      }
      if (existingUrls.has(input.url.toLowerCase())) {
        skipped += 1;
        continue;
      }

      await db.insert(globalMapNewsFeedsTable).values({
        name: input.name,
        url: input.url,
        continent: input.continent,
        countryCode: input.countryCode,
        countryName: input.countryName,
        category: input.category ?? "news",
        scope: input.scope ?? "country",
        enabled: input.enabled !== false,
        priority: input.priority ?? 0,
      });
      existingUrls.add(input.url.toLowerCase());
      inserted += 1;
    }

    const total = (await listGlobalMapNewsFeeds()).length;
    const regional = await ensureNewsmapRegionalRssFeedsSeeded();
    res.json({
      ok: true,
      inserted,
      skipped,
      total,
      seedCount: seedRows.length,
      regionalInserted: regional.inserted,
      regionalUpdated: regional.updated,
    });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Varsayılan küresel kaynaklar yüklenemedi" });
  }
});

export default router;

import { Router, type IRouter } from "express";
import { timingSafeEqual } from "node:crypto";
import type { PgTable } from "drizzle-orm/pg-core";
import {
  authorsTable,
  deleteRowFromNewsDb,
  hmMakalelerTable,
  isNewsDatabaseConfigured,
  mirrorRowToNewsDb,
  newsTable,
  shouldMirrorToNewsDb,
} from "@workspace/db";
import { getHmEdgeBridgeSecret } from "../lib/hm-edge-session-bridge.js";
import { rowFromSnakeCase } from "../lib/hm-edge-mirror-row.js";

/**
 * Worker kenarı (Neon DATABASE_URL) → ayrı haber DB'si (NEWS_DATABASE_URL) ayna köprüsü.
 *
 * Panel haber/makale/yazar kayıtları artık Container'a uğramadan kenarda Neon'a yazılıyor.
 * PHP tema gibi NEWS_DATABASE_URL'den okuyan ön yüzler bu satırları görmüyordu.
 * Kenar, başarılı Neon yazımından sonra en-iyi-çaba bu uca POST atar; Container
 * NEWS_DATABASE_URL + NEWS_DB_WRITE=dual (veya NEWS_DB_READ=news) ise satırı aynı id ile kopyalar.
 * Ayna kapalıysa 200 { mirrored: false } döner; kenar yazımı hiçbir durumda bozulmaz.
 */
const router: IRouter = Router();

const MIRROR_TABLES: Record<string, PgTable> = {
  hm_makaleler: hmMakalelerTable,
  news: newsTable,
  authors: authorsTable,
};

function bridgeSecretOk(headerValue: string | undefined): boolean {
  const given = Buffer.from(String(headerValue ?? "").trim());
  const expected = Buffer.from(getHmEdgeBridgeSecret());
  return given.length > 0 && given.length === expected.length && timingSafeEqual(given, expected);
}

router.post("/hm/bridge/mirror", async (req, res): Promise<void> => {
  if (!bridgeSecretOk(req.get("x-yekpare-hm-edge-bridge"))) {
    res.status(401).json({ error: "Geçersiz kenar köprü anahtarı." });
    return;
  }
  const body = (req.body ?? {}) as { table?: unknown; op?: unknown; row?: unknown; id?: unknown };
  const table = MIRROR_TABLES[String(body.table ?? "")];
  if (!table) {
    res.status(400).json({ error: "table: hm_makaleler | news | authors" });
    return;
  }
  if (!isNewsDatabaseConfigured || !shouldMirrorToNewsDb()) {
    res.json({ mirrored: false, reason: isNewsDatabaseConfigured ? "news-db-write-mode" : "no-news-database-url" });
    return;
  }
  const op = body.op === "delete" ? "delete" : "upsert";
  if (op === "delete") {
    const id = Number(body.id ?? (body.row as { id?: unknown } | undefined)?.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "id gerekli" });
      return;
    }
    const mirrored = await deleteRowFromNewsDb(table, id);
    res.json({ mirrored });
    return;
  }
  const raw = body.row;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    res.status(400).json({ error: "row gerekli" });
    return;
  }
  const values = rowFromSnakeCase(table, raw as Record<string, unknown>);
  if (!Number.isFinite(Number(values.id))) {
    res.status(400).json({ error: "row.id gerekli" });
    return;
  }
  const mirrored = await mirrorRowToNewsDb(table, values as never);
  res.json({ mirrored });
});

export default router;

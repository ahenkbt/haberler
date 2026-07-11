import { Router, type IRouter } from "express";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard.js";
import { isSafeMsbImagePath, resolveMsbAssetUrl } from "../lib/msb-sehitlerimiz.js";
import { getMsbSehitlerimizPayload, mergeMsbRecentFromScrape, syncMsbSehitlerToDb } from "../lib/msb-sehitler-db.js";

const router: IRouter = Router();

router.get("/msb/sehitlerimiz", async (req, res): Promise<void> => {
  try {
    const forceRefresh = String(req.query.refresh ?? "") === "1";
    const payload = await getMsbSehitlerimizPayload(forceRefresh);
    res.json({ success: true, data: payload });
  } catch (err) {
    res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : "Şehit listesi alınamadı",
    });
  }
});

router.post("/msb/sehitlerimiz/sync", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  try {
    const sync = await syncMsbSehitlerToDb();
    res.json({ success: true, data: sync });
  } catch (err) {
    res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : "Şehit senkronizasyonu başarısız",
    });
  }
});

router.post("/msb/sehitlerimiz/refresh-recent", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "hm_sites")) return;
  try {
    const sync = await mergeMsbRecentFromScrape();
    res.json({ success: true, data: sync });
  } catch (err) {
    res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : "MSB güncelleme başarısız",
    });
  }
});

function isAllowedExternalImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host === "www.mehmetcik.org.tr" || host === "mehmetcik.org.tr" || host.endsWith(".msb.gov.tr");
  } catch {
    return false;
  }
}

router.get("/msb/sehitlerimiz/image", async (req, res): Promise<void> => {
  const rawPath = String(req.query.path ?? "").trim();
  if (!rawPath) {
    res.status(400).json({ success: false, error: "Görsel yolu gerekli" });
    return;
  }

  const decoded = decodeURIComponent(rawPath);
  const isExternal = /^https?:\/\//i.test(decoded);
  const upstreamUrl = isExternal
    ? decoded
    : isSafeMsbImagePath(decoded)
      ? resolveMsbAssetUrl(decoded)
      : "";

  if (!upstreamUrl) {
    res.status(400).json({ success: false, error: "Geçersiz görsel yolu" });
    return;
  }

  if (isExternal && !isAllowedExternalImageUrl(upstreamUrl)) {
    res.status(400).json({ success: false, error: "İzin verilmeyen görsel kaynağı" });
    return;
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; YekpareVKD/1.0; +https://yekpare.net)",
        Referer: isExternal ? "https://www.mehmetcik.org.tr/sehitlerimiz" : "https://www.msb.gov.tr/SehitVefat/Sehitlerimiz",
      },
    });
    if (!upstream.ok) {
      res.status(upstream.status).end();
      return;
    }
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch {
    res.status(502).end();
  }
});

export default router;

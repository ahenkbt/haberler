import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, adSlotsTable } from "@workspace/db";
import { UpdateAdsBody } from "@workspace/api-zod";
import { serializeAd } from "../lib/serializers";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";

const router: IRouter = Router();

const DEFAULT_AD_SLOTS: { slotKey: string; name: string; description: string }[] = [
  { slotKey: "header_top", name: "Header Üst Banner", description: "Logo üzeri 728x90 alan" },
  { slotKey: "header_bottom", name: "Header Alt Banner", description: "Menü altı leaderboard" },
  { slotKey: "home_middle", name: "Anasayfa Orta", description: "Modüller arası reklam" },
  { slotKey: "manset_alti", name: "Manşet Altı", description: "Haber ana sayfası slider hemen altı" },
  { slotKey: "sidebar_top", name: "Yan Kolon Üst", description: "Detay sayfası yan kolonu" },
  { slotKey: "article_inline", name: "Makale İçi", description: "Yazı arasına yerleşen reklam" },
  { slotKey: "footer", name: "Footer Banner", description: "Site sonu banner" },
  {
    slotKey: "siparis_empty",
    name: "Sipariş — Boş liste (maskot)",
    description:
      "Mekan & Dükkan sayfasında bu bölgede işletme yokken gösterilir. HTML: örn. <img src=\"/api/media/uploads/...\" class=\"w-44 h-44 object-contain\" alt=\"\" /> veya script’siz banner.",
  },
];

/** Yeni slot tanımları mevcut kurulumlara da eklenir. */
async function ensureDefaultAdSlots(): Promise<void> {
  const existing = await db.select({ slotKey: adSlotsTable.slotKey }).from(adSlotsTable);
  const have = new Set(existing.map((r) => r.slotKey));
  const missing = DEFAULT_AD_SLOTS.filter((d) => !have.has(d.slotKey));
  if (missing.length === 0) return;
  await db.insert(adSlotsTable).values(
    missing.map((a) => ({ ...a, html: "", enabled: false })),
  );
}

async function listAdsRowsOrdered() {
  const existing = await db.select().from(adSlotsTable).orderBy(asc(adSlotsTable.id));
  if (existing.length === 0) {
    await db.insert(adSlotsTable).values(
      DEFAULT_AD_SLOTS.map((a) => ({ ...a, html: "", enabled: false })),
    );
    return db.select().from(adSlotsTable).orderBy(asc(adSlotsTable.id));
  }
  await ensureDefaultAdSlots();
  return db.select().from(adSlotsTable).orderBy(asc(adSlotsTable.id));
}

router.get("/ads", async (_req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  const rows = await listAdsRowsOrdered();
  res.json(rows.map(serializeAd));
});

router.put("/ads", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "site_ayarlari")) return;
  const parsed = UpdateAdsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  for (const s of parsed.data.slots) {
    await db
      .update(adSlotsTable)
      .set({ html: s.html, enabled: s.enabled })
      .where(eq(adSlotsTable.id, s.id));
  }
  res.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  const rows = await listAdsRowsOrdered();
  res.json(rows.map(serializeAd));
});

export default router;

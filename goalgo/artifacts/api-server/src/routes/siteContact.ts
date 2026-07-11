import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, hmNewsSitesTable } from "@workspace/db";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard.js";

const router = Router();

function normalizeHmSiteSlug(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

router.post("/site/contact", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = body.phone != null ? String(body.phone).trim().slice(0, 40) : "";
  const subject = body.subject != null ? String(body.subject).trim().slice(0, 200) : "";
  const message = String(body.message ?? "").trim();
  const pageSourceRaw = body.pageSource != null ? String(body.pageSource).trim() : "iletisim";
  const pageSource = pageSourceRaw.slice(0, 80);
  const imageRaw = body.imageData != null ? String(body.imageData).trim() : "";
  const imageData =
    imageRaw && imageRaw.startsWith("data:image/") && imageRaw.length <= 600000 ? imageRaw : null;
  if (!name || !email || !message) {
    res.status(400).json({ error: "Ad, e-posta ve mesaj zorunludur." });
    return;
  }
  if (name.length > 200 || email.length > 200 || message.length > 8000) {
    res.status(400).json({ error: "Girdi çok uzun." });
    return;
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    res.status(400).json({ error: "Geçerli bir e-posta girin." });
    return;
  }

  try {
    let hmSiteId: number | null = null;
    let hmSiteSlugOut: string | null = null;
    const sidRaw = body.siteId;
    const slugHint = normalizeHmSiteSlug(String(body.hmSiteSlug ?? ""));
    if (sidRaw != null && String(sidRaw).trim() !== "") {
      const sid = Number(sidRaw);
      if (Number.isFinite(sid) && sid > 0) {
        const [row] = await db
          .select({ id: hmNewsSitesTable.id, slug: hmNewsSitesTable.slug })
          .from(hmNewsSitesTable)
          .where(and(eq(hmNewsSitesTable.id, sid), eq(hmNewsSitesTable.active, true)));
        if (row) {
          hmSiteId = row.id;
          hmSiteSlugOut = row.slug;
        }
      }
    }
    if (hmSiteId == null && slugHint.length > 0) {
      const [row] = await db
        .select({ id: hmNewsSitesTable.id, slug: hmNewsSitesTable.slug })
        .from(hmNewsSitesTable)
        .where(and(eq(hmNewsSitesTable.slug, slugHint), eq(hmNewsSitesTable.active, true)));
      if (row) {
        hmSiteId = row.id;
        hmSiteSlugOut = row.slug;
      }
    }

    await db.execute(sql`ALTER TABLE site_contact_messages ADD COLUMN IF NOT EXISTS page_source TEXT DEFAULT 'iletisim'`);
    await db.execute(sql`ALTER TABLE site_contact_messages ADD COLUMN IF NOT EXISTS image_data TEXT`);
    await db.execute(sql`ALTER TABLE site_contact_messages ADD COLUMN IF NOT EXISTS hm_site_id INTEGER`);
    await db.execute(sql`ALTER TABLE site_contact_messages ADD COLUMN IF NOT EXISTS hm_site_slug TEXT`);
    await db.execute(sql`
      INSERT INTO site_contact_messages (name, email, phone, subject, message, page_source, image_data, hm_site_id, hm_site_slug)
      VALUES (${name}, ${email}, ${phone || null}, ${subject || null}, ${message}, ${pageSource || "iletisim"}, ${imageData}, ${hmSiteId}, ${hmSiteSlugOut})
    `);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Mesaj kaydedilemedi." });
  }
});

router.get("/site/admin/contact-messages", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "iletisim")) return;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = 30;
  const offset = (page - 1) * limit;
  try {
    const rows = await db.execute(sql`
      SELECT id, name, email, phone, subject, message, is_read, created_at,
             COALESCE(page_source, 'iletisim') AS page_source, image_data,
             hm_site_id, hm_site_slug
      FROM site_contact_messages
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const totalRow = await db.execute(sql`SELECT COUNT(*)::int AS c FROM site_contact_messages`);
    const total = Number((totalRow.rows[0] as { c: number }).c);
    res.json({ messages: rows.rows, total, page, limit });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/site/admin/contact-messages/:id/read", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "iletisim")) return;
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: "Geçersiz kayıt." });
    return;
  }
  try {
    await db.execute(sql`UPDATE site_contact_messages SET is_read = true WHERE id = ${id}`);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Güncellenemedi." });
  }
});

export default router;

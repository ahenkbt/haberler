import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard.js";
import { resolveSupportActor, type SupportAuthCtx } from "./support.js";
import { trySendSiteOutboundWhatsApp } from "../lib/whatsapp.js";

const router: IRouter = Router();

let ensured = false;
async function ensureBroadcastTables(): Promise<void> {
  if (ensured) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS platform_broadcasts (
      id SERIAL PRIMARY KEY,
      audience TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      image_url TEXT,
      whatsapp_requested BOOLEAN NOT NULL DEFAULT false,
      whatsapp_sent INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS platform_broadcast_reads (
      broadcast_id INTEGER NOT NULL REFERENCES platform_broadcasts(id) ON DELETE CASCADE,
      recipient_kind TEXT NOT NULL,
      recipient_key TEXT NOT NULL,
      read_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (broadcast_id, recipient_kind, recipient_key)
    )
  `);
  ensured = true;
}

function recipientFromActor(a: SupportAuthCtx): { kind: string; key: string } {
  if (a.kind === "member") return { kind: "member", key: a.id };
  if (a.kind === "customer") return { kind: "customer", key: String(a.id) };
  return { kind: "vendor", key: String(a.id) };
}

function audienceSqlForActor(kind: SupportAuthCtx["kind"]): ReturnType<typeof sql> {
  if (kind === "member") {
    return sql`(b.audience = 'all' OR b.audience = 'members')`;
  }
  if (kind === "customer") {
    return sql`(b.audience = 'all' OR b.audience = 'customers')`;
  }
  return sql`(b.audience = 'all' OR b.audience = 'vendors')`;
}

/** GET /api/site/my-broadcasts — üye, mağaza müşterisi veya işletme oturumu */
router.get("/site/my-broadcasts", async (req, res): Promise<void> => {
  await ensureBroadcastTables();
  const actor = await resolveSupportActor(req);
  if (!actor) {
    res.status(401).json({ broadcasts: [], unreadCount: 0 });
    return;
  }
  const { kind, key } = recipientFromActor(actor);
  const aud = audienceSqlForActor(actor.kind);
  const includeRead = String(req.query.includeRead ?? "").trim().toLowerCase();
  const includeReadRows = includeRead === "1" || includeRead === "true" || includeRead === "yes";
  const limit = Math.min(200, Math.max(5, parseInt(String(req.query.limit ?? (includeReadRows ? "80" : "30")), 10) || 30));
  try {
    const rows = includeReadRows
      ? await db.execute(
          sql`
      SELECT b.id, b.title, b.body, b.image_url, b.audience, b.created_at, r.read_at
      FROM platform_broadcasts b
      LEFT JOIN platform_broadcast_reads r
        ON r.broadcast_id = b.id
       AND r.recipient_kind = ${kind}
       AND r.recipient_key = ${key}
      WHERE ${aud}
      ORDER BY b.created_at DESC
      LIMIT ${limit}
    `,
        )
      : await db.execute(
          sql`
      SELECT b.id, b.title, b.body, b.image_url, b.audience, b.created_at
      FROM platform_broadcasts b
      WHERE ${aud}
        AND NOT EXISTS (
          SELECT 1 FROM platform_broadcast_reads r
          WHERE r.broadcast_id = b.id AND r.recipient_kind = ${kind} AND r.recipient_key = ${key}
        )
      ORDER BY b.created_at DESC
      LIMIT ${limit}
    `,
        );
    const list = (rows as { rows: unknown[] }).rows ?? [];
    const unreadRows = await db.execute(
      sql`
      SELECT COUNT(*)::int AS c
      FROM platform_broadcasts b
      WHERE ${aud}
        AND NOT EXISTS (
          SELECT 1 FROM platform_broadcast_reads r
          WHERE r.broadcast_id = b.id AND r.recipient_kind = ${kind} AND r.recipient_key = ${key}
        )
    `,
    );
    const unreadCount = Number(((unreadRows as { rows?: Array<{ c?: number }> }).rows?.[0]?.c ?? 0));
    res.json({ broadcasts: list, unreadCount });
  } catch {
    res.status(500).json({ error: "Liste alınamadı" });
  }
});

/** POST /api/site/my-broadcasts/:id/read */
router.post("/site/my-broadcasts/:id/read", async (req, res): Promise<void> => {
  await ensureBroadcastTables();
  const actor = await resolveSupportActor(req);
  if (!actor) {
    res.status(401).json({ error: "Giriş gerekli" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: "Geçersiz" });
    return;
  }
  const { kind, key } = recipientFromActor(actor);
  try {
    await db.execute(
      sql`
      INSERT INTO platform_broadcast_reads (broadcast_id, recipient_kind, recipient_key)
      VALUES (${id}, ${kind}, ${key})
      ON CONFLICT (broadcast_id, recipient_kind, recipient_key) DO NOTHING
    `,
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Kaydedilemedi" });
  }
});

/** GET /api/site/admin/broadcasts */
router.get("/site/admin/broadcasts", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "duyurular")) return;
  await ensureBroadcastTables();
  try {
    const rows = await db.execute(
      sql`SELECT id, audience, title, body, image_url, whatsapp_requested, whatsapp_sent, created_at
          FROM platform_broadcasts ORDER BY created_at DESC LIMIT 100`,
    );
    res.json({ broadcasts: (rows as { rows: unknown[] }).rows ?? [] });
  } catch {
    res.status(500).json({ error: "Liste alınamadı" });
  }
});

/** POST /api/site/admin/broadcasts */
router.post("/site/admin/broadcasts", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "duyurular")) return;
  await ensureBroadcastTables();
  const body = req.body as Record<string, unknown>;
  const audience = String(body.audience ?? "").trim().toLowerCase();
  const title = String(body.title ?? "").trim().slice(0, 200);
  const msgBody = String(body.body ?? "").trim();
  const imageUrl = body.imageUrl != null ? String(body.imageUrl).trim().slice(0, 500000) : "";
  const sendWhatsapp = Boolean(body.sendWhatsapp);
  const allowed = new Set(["all", "members", "customers", "vendors"]);
  if (!allowed.has(audience) || !title || !msgBody) {
    res.status(400).json({ error: "audience, title ve body zorunludur." });
    return;
  }
  if (msgBody.length > 12000) {
    res.status(400).json({ error: "Metin çok uzun." });
    return;
  }
  const img = imageUrl && imageUrl.startsWith("data:image/") ? imageUrl : null;
  try {
    const ins = await db.execute<{ id: number }>(
      sql`
      INSERT INTO platform_broadcasts (audience, title, body, image_url, whatsapp_requested)
      VALUES (${audience}, ${title}, ${msgBody}, ${img}, ${sendWhatsapp})
      RETURNING id
    `,
    );
    const row = (ins as { rows?: { id: number }[] }).rows?.[0];
    const broadcastId = row?.id ?? 0;
    let waSent = 0;
    if (sendWhatsapp && broadcastId) {
      const waText = `📢 *Yekpare*\n*${title}*\n\n${msgBody.slice(0, 2500)}`;
      const phones = new Set<string>();
      const addPhones = async (q: ReturnType<typeof sql>) => {
        const r = await db.execute(q);
        for (const p of (r as { rows?: Record<string, unknown>[] }).rows ?? []) {
          const w = String(p.whatsapp ?? "").replace(/\D/g, "");
          const ph = String(p.phone ?? "").replace(/\D/g, "");
          if (w.length >= 10) phones.add(w);
          else if (ph.length >= 10) phones.add(ph);
        }
      };
      if (audience === "all" || audience === "members") {
        await addPhones(
          sql`SELECT phone, CAST(NULL AS TEXT) AS whatsapp FROM site_members WHERE is_active = true AND phone IS NOT NULL`,
        );
      }
      if (audience === "all" || audience === "customers") {
        await addPhones(
          sql`SELECT phone, CAST(NULL AS TEXT) AS whatsapp FROM shop_users WHERE active = true AND phone IS NOT NULL`,
        );
      }
      if (audience === "all" || audience === "vendors") {
        await addPhones(sql`SELECT phone, whatsapp FROM vendors WHERE active = true`);
      }
      let n = 0;
      for (const digits of phones) {
        const raw = digits.startsWith("90") ? `+${digits}` : digits.length === 10 ? `+90${digits}` : `+${digits}`;
        const ok = await trySendSiteOutboundWhatsApp(raw, waText);
        if (ok.sent) waSent++;
        n++;
        if (n >= 80) break;
        await new Promise((r) => setTimeout(r, 120));
      }
      await db.execute(sql`UPDATE platform_broadcasts SET whatsapp_sent = ${waSent} WHERE id = ${broadcastId}`);
    }
    res.status(201).json({ ok: true, id: broadcastId, whatsappSent: waSent });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;

import { Router, type IRouter, type Request } from "express";
import { sql, eq, and } from "drizzle-orm";
import { db, vendorsTable } from "@workspace/db";
import { getShopUser } from "./shop-auth";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";

const router: IRouter = Router();

let ensuredSupportTables = false;
async function ensureSupportTables(): Promise<void> {
  if (ensuredSupportTables) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS platform_support_tickets (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'open',
      author_kind TEXT NOT NULL,
      member_id TEXT,
      customer_user_id INTEGER,
      vendor_id INTEGER,
      contact_email TEXT NOT NULL,
      contact_phone TEXT,
      subject TEXT NOT NULL,
      body TEXT NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS platform_support_ticket_messages (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES platform_support_tickets(id) ON DELETE CASCADE,
      author_role TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  ensuredSupportTables = true;
}

export type SupportAuthCtx =
  | { kind: "customer"; id: number; email: string; phone?: string | null }
  | { kind: "member"; id: string; email: string; phone?: string | null }
  | { kind: "vendor"; id: number; email: string; phone?: string | null };

export async function resolveSupportActor(req: Request): Promise<SupportAuthCtx | null> {
  const shop = await getShopUser(req);
  if (shop) {
    return { kind: "customer", id: shop.id, email: shop.email, phone: shop.phone ?? null };
  }
  const mid = req.session?.memberId?.trim();
  if (mid) {
    const rows = await db.execute<{ email: string; phone: string | null }>(
      sql`SELECT email, phone FROM site_members WHERE id = ${mid} AND is_active = true LIMIT 1`,
    );
    const r = (rows as { rows?: { email: string; phone: string | null }[] }).rows?.[0];
    if (r?.email) return { kind: "member", id: mid, email: r.email, phone: r.phone };
  }
  const vid = parseInt(String(req.headers["x-vendor-id"] ?? ""), 10);
  const vem = String(req.headers["x-vendor-email"] ?? "").trim().toLowerCase();
  if (Number.isFinite(vid) && vid > 0 && vem) {
    const [v] = await db
      .select({
        id: vendorsTable.id,
        ownerEmail: vendorsTable.ownerEmail,
        email: vendorsTable.email,
        phone: vendorsTable.phone,
      })
      .from(vendorsTable)
      .where(eq(vendorsTable.id, vid))
      .limit(1);
    if (!v) return null;
    const o = String(v.ownerEmail ?? "").trim().toLowerCase();
    const e = String(v.email ?? "").trim().toLowerCase();
    if (o === vem || e === vem) {
      return { kind: "vendor", id: v.id, email: vem, phone: v.phone };
    }
  }
  return null;
}

function ticketWhereForActor(a: SupportAuthCtx) {
  if (a.kind === "customer") return sql`customer_user_id = ${a.id}`;
  if (a.kind === "member") return sql`member_id = ${a.id}`;
  return sql`vendor_id = ${a.id}`;
}

/** POST /api/support/tickets */
router.post("/support/tickets", async (req, res): Promise<void> => {
  await ensureSupportTables();
  const actor = await resolveSupportActor(req);
  if (!actor) {
    res.status(401).json({ error: "Destek talebi için giriş yapın (üye, müşteri veya işletme oturumu)." });
    return;
  }
  const { subject, body, contactPhone } = req.body as Record<string, unknown>;
  const sub = String(subject ?? "").trim().slice(0, 200);
  const msg = String(body ?? "").trim();
  if (!sub || !msg) {
    res.status(400).json({ error: "Konu ve mesaj zorunludur." });
    return;
  }
  if (msg.length > 12000) {
    res.status(400).json({ error: "Mesaj çok uzun." });
    return;
  }
  const phone = contactPhone != null ? String(contactPhone).trim().slice(0, 40) : actor.phone?.trim().slice(0, 40) ?? null;

  const memberId = actor.kind === "member" ? actor.id : null;
  const customerId = actor.kind === "customer" ? actor.id : null;
  const vendorId = actor.kind === "vendor" ? actor.id : null;

  const ins = await db.execute<{ id: number }>(
    sql`
    INSERT INTO platform_support_tickets (
      status, author_kind, member_id, customer_user_id, vendor_id,
      contact_email, contact_phone, subject, body
    ) VALUES (
      'open', ${actor.kind}, ${memberId}, ${customerId}, ${vendorId},
      ${actor.email}, ${phone}, ${sub}, ${msg}
    ) RETURNING id
  `,
  );
  const row = (ins as { rows?: { id: number }[] }).rows?.[0];
  res.status(201).json({ success: true, id: row?.id });
});

/** GET /api/support/tickets */
router.get("/support/tickets", async (req, res): Promise<void> => {
  await ensureSupportTables();
  const actor = await resolveSupportActor(req);
  if (!actor) {
    res.status(401).json({ error: "Giriş gerekli." });
    return;
  }
  const wh = ticketWhereForActor(actor);
  const rows = await db.execute(
    sql`
    SELECT id, status, subject, created_at, updated_at
    FROM platform_support_tickets
    WHERE ${wh}
    ORDER BY created_at DESC
    LIMIT 100
  `,
  );
  res.json({ tickets: (rows as { rows: unknown[] }).rows ?? [] });
});

/** GET /api/support/tickets/:id */
router.get("/support/tickets/:id", async (req, res): Promise<void> => {
  await ensureSupportTables();
  const actor = await resolveSupportActor(req);
  if (!actor) {
    res.status(401).json({ error: "Giriş gerekli." });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: "Geçersiz talep." });
    return;
  }
  const wh = ticketWhereForActor(actor);
  const t = await db.execute(
    sql`SELECT * FROM platform_support_tickets WHERE id = ${id} AND (${wh}) LIMIT 1`,
  );
  const ticket = (t as { rows?: Record<string, unknown>[] }).rows?.[0];
  if (!ticket) {
    res.status(404).json({ error: "Bulunamadı." });
    return;
  }
  const msgs = await db.execute(
    sql`SELECT id, author_role, body, created_at FROM platform_support_ticket_messages WHERE ticket_id = ${id} ORDER BY created_at ASC`,
  );
  res.json({ ticket, messages: (msgs as { rows: unknown[] }).rows ?? [] });
});

/** POST /api/support/tickets/:id/reply */
router.post("/support/tickets/:id/reply", async (req, res): Promise<void> => {
  await ensureSupportTables();
  const actor = await resolveSupportActor(req);
  if (!actor) {
    res.status(401).json({ error: "Giriş gerekli." });
    return;
  }
  const id = Number(req.params.id);
  const text = String((req.body as { body?: string })?.body ?? "").trim();
  if (!Number.isFinite(id) || id < 1 || !text || text.length > 12000) {
    res.status(400).json({ error: "Geçersiz istek." });
    return;
  }
  const wh = ticketWhereForActor(actor);
  const own = await db.execute(sql`SELECT id FROM platform_support_tickets WHERE id = ${id} AND (${wh}) LIMIT 1`);
  if (!(own as { rows?: unknown[] }).rows?.length) {
    res.status(404).json({ error: "Bulunamadı." });
    return;
  }
  await db.execute(
    sql`INSERT INTO platform_support_ticket_messages (ticket_id, author_role, body) VALUES (${id}, ${"user"}, ${text})`,
  );
  await db.execute(sql`UPDATE platform_support_tickets SET updated_at = NOW(), status = 'open' WHERE id = ${id}`);
  res.json({ success: true });
});

/** GET /api/site/admin/support-tickets */
router.get("/site/admin/support-tickets", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "destek")) return;
  await ensureSupportTables();
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = 40;
  const offset = (page - 1) * limit;
  const rows = await db.execute(
    sql`
    SELECT t.*, (SELECT COUNT(*)::int FROM platform_support_ticket_messages m WHERE m.ticket_id = t.id) AS message_count
    FROM platform_support_tickets t
    ORDER BY t.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `,
  );
  const c = await db.execute(sql`SELECT COUNT(*)::int AS c FROM platform_support_tickets`);
  const countRow = (c as unknown as { rows?: Record<string, unknown>[] }).rows?.[0];
  const total = Number(countRow?.c ?? 0);
  res.json({ tickets: (rows as { rows: unknown[] }).rows ?? [], total, page, limit });
});

/** GET /api/site/admin/support-tickets/:id */
router.get("/site/admin/support-tickets/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "destek")) return;
  await ensureSupportTables();
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: "Geçersiz." });
    return;
  }
  const t = await db.execute(sql`SELECT * FROM platform_support_tickets WHERE id = ${id} LIMIT 1`);
  const ticket = (t as { rows?: Record<string, unknown>[] }).rows?.[0];
  if (!ticket) {
    res.status(404).json({ error: "Yok." });
    return;
  }
  const msgs = await db.execute(
    sql`SELECT * FROM platform_support_ticket_messages WHERE ticket_id = ${id} ORDER BY created_at ASC`,
  );
  res.json({ ticket, messages: (msgs as { rows: unknown[] }).rows ?? [] });
});

/** PATCH /api/site/admin/support-tickets/:id */
router.patch("/site/admin/support-tickets/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "destek")) return;
  await ensureSupportTables();
  const id = Number(req.params.id);
  const { status, adminReply } = req.body as { status?: string; adminReply?: string };
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: "Geçersiz." });
    return;
  }
  const st = status != null ? String(status).trim().toLowerCase() : "";
  if (st && ["open", "answered", "closed"].includes(st)) {
    await db.execute(sql`UPDATE platform_support_tickets SET status = ${st}, updated_at = NOW() WHERE id = ${id}`);
  }
  const reply = adminReply != null ? String(adminReply).trim() : "";
  if (reply) {
    await db.execute(
      sql`INSERT INTO platform_support_ticket_messages (ticket_id, author_role, body) VALUES (${id}, ${"admin"}, ${reply})`,
    );
    await db.execute(sql`UPDATE platform_support_tickets SET updated_at = NOW(), status = 'answered' WHERE id = ${id}`);
  }
  res.json({ ok: true });
});

export default router;

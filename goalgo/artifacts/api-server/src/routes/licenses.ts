import { Router, type IRouter } from "express";
import { eq, desc, or, ilike } from "drizzle-orm";
import { db, licensesTable, siteActivationTable } from "@workspace/db";
import { randomBytes } from "crypto";

const router: IRouter = Router();

function generateCode(): string {
  const part = () => randomBytes(3).toString("hex").toUpperCase();
  return `AP-${part()}-${part()}-${part()}`;
}

// ── Admin: List all licenses ─────────────────────────────────────────────────
router.get("/licenses", async (req, res): Promise<void> => {
  const q = req.query.q as string | undefined;
  let rows;
  if (q) {
    rows = await db
      .select()
      .from(licensesTable)
      .where(
        or(
          ilike(licensesTable.customerName, `%${q}%`),
          ilike(licensesTable.customerEmail, `%${q}%`),
          ilike(licensesTable.domain, `%${q}%`),
          ilike(licensesTable.activationCode, `%${q}%`)
        )
      )
      .orderBy(desc(licensesTable.createdAt));
  } else {
    rows = await db
      .select()
      .from(licensesTable)
      .orderBy(desc(licensesTable.createdAt));
  }
  res.json(rows);
});

// ── Admin: Get single license ─────────────────────────────────────────────────
router.get("/licenses/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Geçersiz ID" }); return; }
  const [row] = await db.select().from(licensesTable).where(eq(licensesTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Bulunamadı" }); return; }
  res.json(row);
});

// ── Admin: Create license ─────────────────────────────────────────────────────
router.post("/licenses", async (req, res): Promise<void> => {
  const { customerName, customerEmail, phone, domain, plan, price, paymentMethod, paymentStatus, status, notes, expiresAt } = req.body;
  if (!customerName || !customerEmail) {
    res.status(400).json({ error: "Ad ve e-posta zorunludur" });
    return;
  }
  const activationCode = generateCode();
  const activatedAt = status === "active" ? new Date() : undefined;
  const [row] = await db
    .insert(licensesTable)
    .values({
      customerName,
      customerEmail,
      phone: phone || null,
      domain: domain || null,
      activationCode,
      status: status || "pending",
      plan: plan || "pro",
      price: price ? parseInt(price) : 0,
      paymentMethod: paymentMethod || null,
      paymentStatus: paymentStatus || "pending",
      notes: notes || null,
      activatedAt,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();
  res.status(201).json(row);
});

// ── Admin: Update license ─────────────────────────────────────────────────────
router.put("/licenses/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Geçersiz ID" }); return; }
  const { customerName, customerEmail, phone, domain, status, plan, price, paymentMethod, paymentStatus, notes, expiresAt } = req.body;

  const update: Record<string, unknown> = {};
  if (customerName !== undefined) update.customerName = customerName;
  if (customerEmail !== undefined) update.customerEmail = customerEmail;
  if (phone !== undefined) update.phone = phone;
  if (domain !== undefined) update.domain = domain;
  if (plan !== undefined) update.plan = plan;
  if (price !== undefined) update.price = parseInt(price);
  if (paymentMethod !== undefined) update.paymentMethod = paymentMethod;
  if (paymentStatus !== undefined) update.paymentStatus = paymentStatus;
  if (notes !== undefined) update.notes = notes;
  if (expiresAt !== undefined) update.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (status !== undefined) {
    update.status = status;
    if (status === "active") update.activatedAt = new Date();
  }

  const [row] = await db
    .update(licensesTable)
    .set(update as never)
    .where(eq(licensesTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Bulunamadı" }); return; }
  res.json(row);
});

// ── Admin: Delete license ─────────────────────────────────────────────────────
router.delete("/licenses/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Geçersiz ID" }); return; }
  await db.delete(licensesTable).where(eq(licensesTable.id, id));
  res.json({ success: true });
});

// ── Admin: Regenerate activation code ────────────────────────────────────────
router.post("/licenses/:id/regenerate-code", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Geçersiz ID" }); return; }
  const code = generateCode();
  const [row] = await db
    .update(licensesTable)
    .set({ activationCode: code })
    .where(eq(licensesTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Bulunamadı" }); return; }
  res.json(row);
});

// ── Public: Validate license (called by client sites) ────────────────────────
router.post("/licenses/validate", async (req, res): Promise<void> => {
  const { email, activationCode, domain } = req.body;
  if (!email || !activationCode) {
    res.status(400).json({ valid: false, error: "E-posta ve aktivasyon kodu gerekli" });
    return;
  }
  const [license] = await db
    .select()
    .from(licensesTable)
    .where(eq(licensesTable.activationCode, activationCode.trim().toUpperCase()))
    .limit(1);

  if (!license) {
    res.json({ valid: false, error: "Geçersiz aktivasyon kodu" });
    return;
  }
  if (license.customerEmail.toLowerCase() !== email.toLowerCase()) {
    res.json({ valid: false, error: "E-posta adresi eşleşmiyor" });
    return;
  }
  if (license.status !== "active") {
    res.json({ valid: false, error: "Lisans henüz aktif değil. Ödeme ve aktivasyon için satıcıyla iletişime geçin." });
    return;
  }
  if (license.expiresAt && license.expiresAt < new Date()) {
    res.json({ valid: false, error: "Lisans süresi dolmuş. Yenileme için satıcıyla iletişime geçin." });
    return;
  }

  // Update domain if first use
  if (!license.domain && domain) {
    await db.update(licensesTable).set({ domain }).where(eq(licensesTable.id, license.id));
  }

  res.json({
    valid: true,
    plan: license.plan,
    customerName: license.customerName,
    expiresAt: license.expiresAt,
  });
});

// ── Site Activation: Get current activation status ───────────────────────────
router.get("/site-activation", async (_req, res): Promise<void> => {
  const [row] = await db.select().from(siteActivationTable).limit(1);
  res.json(row ?? { status: "inactive" });
});

// ── Site Activation: Activate this installation ───────────────────────────────
router.post("/site-activation", async (req, res): Promise<void> => {
  const { email, activationCode } = req.body;
  if (!email || !activationCode) {
    res.status(400).json({ success: false, error: "E-posta ve kod gerekli" });
    return;
  }

  // Validate against local licenses DB
  const code = activationCode.trim().toUpperCase();
  const [license] = await db
    .select()
    .from(licensesTable)
    .where(eq(licensesTable.activationCode, code))
    .limit(1);

  if (!license) {
    res.json({ success: false, error: "Geçersiz aktivasyon kodu" });
    return;
  }
  if (license.customerEmail.toLowerCase() !== email.toLowerCase()) {
    res.json({ success: false, error: "E-posta adresi eşleşmiyor" });
    return;
  }
  if (license.status !== "active") {
    res.json({ success: false, error: "Lisans henüz aktif değil. Lütfen satıcıyla iletişime geçin." });
    return;
  }
  if (license.expiresAt && license.expiresAt < new Date()) {
    res.json({ success: false, error: "Lisans süresi dolmuş" });
    return;
  }

  // Upsert local activation record
  const existing = await db.select().from(siteActivationTable).limit(1);
  if (existing[0]) {
    await db.update(siteActivationTable).set({
      email, activationCode: code, status: "active",
      activatedAt: new Date(), expiresAt: license.expiresAt,
    }).where(eq(siteActivationTable.id, existing[0].id));
  } else {
    await db.insert(siteActivationTable).values({
      email, activationCode: code, status: "active",
      activatedAt: new Date(), expiresAt: license.expiresAt,
    });
  }

  // Mark license domain
  if (!license.domain) {
    const host = req.get("host") || "";
    await db.update(licensesTable).set({ domain: host }).where(eq(licensesTable.id, license.id));
  }

  res.json({ success: true, plan: license.plan, expiresAt: license.expiresAt });
});

// ── Public: Purchase Request ─────────────────────────────────────────────────
router.post("/license-request", async (req, res): Promise<void> => {
  const { customerName, customerEmail, phone, domain, plan, paymentMethod, notes } = req.body;
  if (!customerName || !customerEmail || !phone) {
    res.status(400).json({ success: false, error: "Ad, e-posta ve telefon zorunludur" });
    return;
  }
  const activationCode = generateCode();
  const [row] = await db
    .insert(licensesTable)
    .values({
      customerName,
      customerEmail,
      phone,
      domain: domain || null,
      activationCode,
      status: "pending",
      plan: plan || "pro",
      price: plan === "enterprise" ? 4999 : plan === "starter" ? 1499 : 2999,
      paymentMethod: paymentMethod || "bank",
      paymentStatus: "pending",
      notes: notes || `Müşteri başvurusu — ${new Date().toLocaleString("tr-TR")}`,
    })
    .returning();
  res.status(201).json({ success: true, requestId: row.id });
});

export default router;

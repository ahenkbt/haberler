import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { partnerApplicationsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";

const router: IRouter = Router();

/* — MIGRATE ──────────────────────────────────────────────────── */

router.post("/partners/migrate", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "is_ortaklari")) return;
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_type') THEN
        CREATE TYPE partner_type AS ENUM ('sahis', 'limited', 'anonim');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_status') THEN
        CREATE TYPE partner_status AS ENUM ('pending', 'reviewing', 'approved', 'rejected');
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS partner_applications (
      id SERIAL PRIMARY KEY,
      partner_type partner_type NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      company_name TEXT NOT NULL,
      tax_number TEXT NOT NULL,
      tax_office TEXT,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT,
      website TEXT,
      tc_kimlik TEXT,
      tax_document_url TEXT,
      signature_circular_url TEXT,
      business_categories TEXT[],
      description TEXT,
      status partner_status NOT NULL DEFAULT 'pending',
      review_note TEXT,
      reviewed_at TIMESTAMPTZ,
      reviewed_by TEXT,
      email_verified BOOLEAN NOT NULL DEFAULT false,
      email_verify_token TEXT,
      email_verified_at TIMESTAMPTZ,
      terms_accepted BOOLEAN NOT NULL DEFAULT false,
      terms_accepted_at TIMESTAMPTZ,
      member_id INTEGER,
      vendor_ids INTEGER[],
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  res.json({ ok: true });
});

/* — APPLY ────────────────────────────────────────────────────── */

router.post("/partners/apply", async (req, res): Promise<void> => {
  const {
    partnerType, firstName, lastName, email, phone,
    companyName, taxNumber, taxOffice, address, city, district, website,
    tcKimlik, taxDocumentUrl, signatureCircularUrl,
    businessCategories, description, termsAccepted,
  } = req.body;

  if (!partnerType || !firstName || !lastName || !email || !phone ||
      !companyName || !taxNumber || !address || !city) {
    res.status(400).json({ error: "Zorunlu alanlar eksik" });
    return;
  }

  if (!termsAccepted) {
    res.status(400).json({ error: "Kullanım koşullarını kabul etmeniz gerekiyor" });
    return;
  }

  if (partnerType === "sahis" && !tcKimlik) {
    res.status(400).json({ error: "Şahıs firmaları için TC kimlik numarası zorunludur" });
    return;
  }

  const emailVerifyToken = crypto.randomBytes(32).toString("hex");

  const [row] = await db.insert(partnerApplicationsTable).values({
    partnerType,
    firstName, lastName, email, phone,
    companyName, taxNumber, taxOffice, address, city, district, website,
    tcKimlik,
    taxDocumentUrl,
    signatureCircularUrl,
    businessCategories: businessCategories ?? [],
    description,
    termsAccepted: !!termsAccepted,
    termsAcceptedAt: new Date(),
    emailVerifyToken,
    status: "pending",
  }).returning();

  // TODO: Send verification email via nodemailer/resend

  res.status(201).json({
    success: true,
    applicationId: row.id,
    message: "Başvurunuz alındı. E-posta adresinizi doğrulamanız gerekmektedir.",
    emailVerifyToken, // TODO: Remove in production, only for dev
  });
});

/* — VERIFY EMAIL ─────────────────────────────────────────────── */

router.get("/partners/verify-email/:token", async (req, res): Promise<void> => {
  const { token } = req.params;
  const [app] = await db.select()
    .from(partnerApplicationsTable)
    .where(eq(partnerApplicationsTable.emailVerifyToken, token))
    .limit(1);

  if (!app) {
    res.status(404).json({ error: "Geçersiz veya süresi dolmuş doğrulama linki" });
    return;
  }

  if (app.emailVerified) {
    res.json({ success: true, message: "E-posta zaten doğrulanmış", alreadyVerified: true });
    return;
  }

  await db.update(partnerApplicationsTable)
    .set({ emailVerified: true, emailVerifiedAt: new Date(), status: "reviewing" })
    .where(eq(partnerApplicationsTable.id, app.id));

  res.json({ success: true, message: "E-posta başarıyla doğrulandı. Başvurunuz incelemeye alındı." });
});

/* — CHECK STATUS ─────────────────────────────────────────────── */

router.get("/partners/status/:email", async (req, res): Promise<void> => {
  const { email } = req.params;
  const apps = await db.select({
    id: partnerApplicationsTable.id,
    status: partnerApplicationsTable.status,
    emailVerified: partnerApplicationsTable.emailVerified,
    companyName: partnerApplicationsTable.companyName,
    partnerType: partnerApplicationsTable.partnerType,
    createdAt: partnerApplicationsTable.createdAt,
  }).from(partnerApplicationsTable)
    .where(eq(partnerApplicationsTable.email, email));
  res.json(apps);
});

/* — ADMIN: LIST ──────────────────────────────────────────────── */

router.get("/partners/admin/applications", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "is_ortaklari")) return;
  const { status } = req.query as Record<string, string>;
  let query = db.select().from(partnerApplicationsTable);
  if (status) {
    const rows = await db.select().from(partnerApplicationsTable)
      .where(eq(partnerApplicationsTable.status, status as "pending" | "reviewing" | "approved" | "rejected"))
      .orderBy(partnerApplicationsTable.createdAt);
    res.json(rows);
    return;
  }
  const rows = await query.orderBy(partnerApplicationsTable.createdAt);
  res.json(rows);
});

/* — ADMIN: APPROVE/REJECT ────────────────────────────────────── */

router.patch("/partners/admin/applications/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "is_ortaklari")) return;
  const id = parseInt(req.params.id);
  const { status, reviewNote } = req.body;

  if (!["approved", "rejected", "reviewing"].includes(status)) {
    res.status(400).json({ error: "Geçersiz durum" });
    return;
  }

  const [row] = await db.update(partnerApplicationsTable)
    .set({ status, reviewNote, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(partnerApplicationsTable.id, id))
    .returning();

  res.json(row);
});

export default router;

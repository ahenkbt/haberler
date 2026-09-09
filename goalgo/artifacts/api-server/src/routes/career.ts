import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard.js";
import { extFromMime, saveMediaBuffer } from "../lib/mediaUploadService.js";
import { logger } from "../lib/logger.js";
import {
  CAREER_POSITION_SLUG,
  CAREER_POSITION_TITLE,
  careerContactFallbackPayload,
  executeSqlRows,
  parseCvDataUrl,
  parseKariyerContactMessage,
  validateCareerApplyBody,
} from "../lib/careerInbox.js";

const router = Router();

async function ensureCareerTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS career_applications (
      id SERIAL PRIMARY KEY,
      position_slug TEXT NOT NULL DEFAULT 'cagri-merkezi-satis',
      position_title TEXT NOT NULL DEFAULT 'Çağrı Merkezi Satış Temsilcileri',
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT,
      experience_years TEXT,
      cover_letter TEXT NOT NULL,
      cv_url TEXT,
      cv_file_name TEXT,
      is_read BOOLEAN NOT NULL DEFAULT false,
      status TEXT NOT NULL DEFAULT 'pending',
      review_note TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS source_kind TEXT NOT NULL DEFAULT 'kariyer'`);
  await db.execute(sql`ALTER TABLE career_applications ADD COLUMN IF NOT EXISTS source_contact_id INTEGER`);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS career_applications_created_at_idx
    ON career_applications (created_at DESC)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS career_applications_is_read_idx
    ON career_applications (is_read, created_at DESC)
  `);
}

async function saveCareerContactFallback(data: {
  fullName: string;
  email: string;
  phone: string;
  city?: string | null;
  experienceYears?: string | null;
  coverLetter: string;
  cvUrl?: string | null;
}): Promise<void> {
  const payload = careerContactFallbackPayload(data);
  await db.execute(sql`ALTER TABLE site_contact_messages ADD COLUMN IF NOT EXISTS page_source TEXT DEFAULT 'iletisim'`);
  await db.execute(sql`
    INSERT INTO site_contact_messages (name, email, phone, subject, message, page_source)
    VALUES (
      ${payload.name}, ${payload.email}, ${payload.phone}, ${payload.subject},
      ${payload.message}, ${payload.pageSource}
    )
  `);
}

async function insertCareerApplication(row: {
  fullName: string;
  email: string;
  phone: string;
  city: string | null;
  experienceYears: string | null;
  coverLetter: string;
  cvUrl: string | null;
  cvFileName: string | null;
  reviewNote: string | null;
  sourceKind?: string;
  sourceContactId?: number | null;
  createdAt?: unknown;
}): Promise<number | null> {
  const createdAt = row.createdAt ?? null;
  const inserted = createdAt
    ? await db.execute(sql`
        INSERT INTO career_applications (
          position_slug, position_title, full_name, email, phone, city,
          experience_years, cover_letter, cv_url, cv_file_name, review_note,
          source_kind, source_contact_id, created_at
        ) VALUES (
          ${CAREER_POSITION_SLUG}, ${CAREER_POSITION_TITLE}, ${row.fullName}, ${row.email}, ${row.phone},
          ${row.city}, ${row.experienceYears}, ${row.coverLetter}, ${row.cvUrl}, ${row.cvFileName},
          ${row.reviewNote}, ${row.sourceKind ?? "kariyer"}, ${row.sourceContactId ?? null},
          ${createdAt}
        )
        RETURNING id
      `)
    : await db.execute(sql`
        INSERT INTO career_applications (
          position_slug, position_title, full_name, email, phone, city,
          experience_years, cover_letter, cv_url, cv_file_name, review_note,
          source_kind, source_contact_id
        ) VALUES (
          ${CAREER_POSITION_SLUG}, ${CAREER_POSITION_TITLE}, ${row.fullName}, ${row.email}, ${row.phone},
          ${row.city}, ${row.experienceYears}, ${row.coverLetter}, ${row.cvUrl}, ${row.cvFileName},
          ${row.reviewNote}, ${row.sourceKind ?? "kariyer"}, ${row.sourceContactId ?? null}
        )
        RETURNING id
      `);
  const id = Number(executeSqlRows(inserted)[0]?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function importKariyerContactFallbacks(): Promise<void> {
  try {
    const contacts = await db.execute(sql`
      SELECT id, name, email, phone, message, is_read, created_at
      FROM site_contact_messages
      WHERE COALESCE(page_source, '') = 'kariyer'
      ORDER BY created_at DESC
      LIMIT 300
    `);
    for (const raw of executeSqlRows(contacts)) {
      const contactId = Number(raw.id);
      if (!Number.isFinite(contactId) || contactId < 1) continue;
      const already = await db.execute(sql`
        SELECT id FROM career_applications WHERE source_contact_id = ${contactId} LIMIT 1
      `);
      if (executeSqlRows(already).length) continue;
      const parsed = parseKariyerContactMessage(raw);
      if (!parsed.fullName || !parsed.email || !parsed.coverLetter) continue;
      await insertCareerApplication({
        fullName: parsed.fullName,
        email: parsed.email,
        phone: parsed.phone || "—",
        city: parsed.city || null,
        experienceYears: parsed.experienceYears || null,
        coverLetter: parsed.coverLetter,
        cvUrl: parsed.cvUrl || null,
        cvFileName: parsed.cvUrl ? "cv.pdf" : null,
        reviewNote: `İletişim yedeğinden aktarıldı (#${contactId})`,
        sourceKind: "site_contact",
        sourceContactId: contactId,
        createdAt: raw.created_at,
      });
    }
  } catch (err) {
    logger.warn({ err }, "[career] iletişim yedeği aktarılamadı");
  }
}

router.post("/career/apply", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const validated = validateCareerApplyBody(body);
  if ("error" in validated) {
    res.status(validated.status).json({ error: validated.error });
    return;
  }
  const data = validated.data;

  let cvUrl: string | null = data.cvUrlInput || null;
  let storedFileName: string | null = data.cvFileName || null;
  let reviewNote: string | null = null;

  if (data.cvDataUrl) {
    const parsed = parseCvDataUrl(data.cvDataUrl);
    if (!parsed) {
      reviewNote = "CV dosyası geçersiz veya 5 MB sınırını aşıyor; başvuru yine kaydedildi.";
    } else {
      const ext = extFromMime(parsed.mime);
      if (!ext) {
        reviewNote = "CV dosya türü desteklenmedi (PDF beklenir); başvuru yine kaydedildi.";
      } else {
        try {
          const saved = await saveMediaBuffer(parsed.buf, { ext, mime: parsed.mime, prefix: "cv-" });
          cvUrl = saved.url;
          storedFileName = data.cvFileName || "cv.pdf";
        } catch (err) {
          logger.error({ err }, "[career] CV yüklenemedi — başvuru metin olarak kaydediliyor");
          reviewNote = "CV depolanamadı; başvuru metin olarak kaydedildi.";
        }
      }
    }
  }

  try {
    await ensureCareerTable();
    const id = await insertCareerApplication({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      city: data.city || null,
      experienceYears: data.experienceYears || null,
      coverLetter: data.coverLetter,
      cvUrl,
      cvFileName: storedFileName,
      reviewNote,
    });
    if (!id) throw new Error("career insert returned no id");
    res.status(201).json({
      ok: true,
      id,
      message: "Başvurunuz alındı. En kısa sürede sizinle iletişime geçeceğiz.",
    });
  } catch (err) {
    logger.error({ err }, "[career] career_applications insert failed — iletişim yedeğine yazılıyor");
    try {
      await saveCareerContactFallback({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        city: data.city,
        experienceYears: data.experienceYears,
        coverLetter: data.coverLetter,
        cvUrl,
      });
      res.status(201).json({
        ok: true,
        message: "Başvurunuz alındı. En kısa sürede sizinle iletişime geçeceğiz.",
        fallback: "site_contact",
      });
    } catch (fallbackErr) {
      logger.error({ err: fallbackErr }, "[career] iletişim yedeği de başarısız");
      res.status(500).json({ error: "Başvuru kaydedilemedi." });
    }
  }
});

router.get("/career/admin/applications", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "kariyer")) return;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = 30;
  const offset = (page - 1) * limit;
  const unreadOnly = String(req.query.unread ?? "") === "1";

  try {
    await ensureCareerTable();
    await importKariyerContactFallbacks();
    const rows = unreadOnly
      ? await db.execute(sql`
          SELECT id, position_slug, position_title, full_name, email, phone, city,
                 experience_years, cover_letter, cv_url, cv_file_name, is_read, status,
                 review_note, reviewed_at, created_at, source_kind, source_contact_id
          FROM career_applications
          WHERE is_read = false
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `)
      : await db.execute(sql`
          SELECT id, position_slug, position_title, full_name, email, phone, city,
                 experience_years, cover_letter, cv_url, cv_file_name, is_read, status,
                 review_note, reviewed_at, created_at, source_kind, source_contact_id
          FROM career_applications
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `);
    const totalRow = unreadOnly
      ? await db.execute(sql`SELECT COUNT(*)::int AS c FROM career_applications WHERE is_read = false`)
      : await db.execute(sql`SELECT COUNT(*)::int AS c FROM career_applications`);
    const total = Number(executeSqlRows(totalRow)[0]?.c ?? 0);
    res.json({ applications: executeSqlRows(rows), total, page, limit });
  } catch (e) {
    logger.error({ err: e }, "[career] admin list failed");
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/career/admin/applications/:id/read", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "kariyer")) return;
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id < 1) {
    res.status(400).json({ error: "Geçersiz kayıt." });
    return;
  }
  const reviewNote =
    req.body && (req.body as { reviewNote?: unknown }).reviewNote != null
      ? String((req.body as { reviewNote: string }).reviewNote).trim().slice(0, 2000)
      : null;

  try {
    await ensureCareerTable();
    await db.execute(sql`
      UPDATE career_applications
      SET is_read = true,
          status = 'reviewed',
          review_note = COALESCE(${reviewNote}, review_note),
          reviewed_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Güncellenemedi." });
  }
});

export default router;

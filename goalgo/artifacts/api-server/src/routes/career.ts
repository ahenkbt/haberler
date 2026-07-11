import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard.js";
import { extFromMime, saveMediaBuffer } from "../lib/mediaUploadService.js";

const router = Router();

const MAX_CV_BYTES = 5 * 1024 * 1024;
const POSITION_SLUG = "cagri-merkezi-satis";
const POSITION_TITLE = "Çağrı Merkezi Satış Temsilcileri";

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
}

function parseCvDataUrl(raw: string): { mime: string; buf: Buffer } | null {
  const dataUrl = String(raw ?? "").trim();
  const m = dataUrl.match(/^data:(application\/pdf);base64,(.+)$/i);
  if (!m) return null;
  try {
    const buf = Buffer.from(m[2].replace(/\s/g, ""), "base64");
    if (!buf.length || buf.length > MAX_CV_BYTES) return null;
    return { mime: m[1].toLowerCase(), buf };
  } catch {
    return null;
  }
}

router.post("/career/apply", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const city = body.city != null ? String(body.city).trim().slice(0, 120) : "";
  const experienceYears =
    body.experienceYears != null ? String(body.experienceYears).trim().slice(0, 40) : "";
  const coverLetter = String(body.coverLetter ?? "").trim();
  const cvUrlInput = body.cvUrl != null ? String(body.cvUrl).trim().slice(0, 2000) : "";
  const cvDataUrl = body.cvDataUrl != null ? String(body.cvDataUrl).trim() : "";
  const cvFileName = body.cvFileName != null ? String(body.cvFileName).trim().slice(0, 255) : "";

  if (!fullName || !email || !phone || !coverLetter) {
    res.status(400).json({ error: "Ad soyad, e-posta, telefon ve ön yazı zorunludur." });
    return;
  }
  if (fullName.length > 200 || email.length > 200 || phone.length > 40 || coverLetter.length > 8000) {
    res.status(400).json({ error: "Girdi çok uzun." });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Geçerli bir e-posta girin." });
    return;
  }
  if (!cvUrlInput && !cvDataUrl) {
    res.status(400).json({ error: "CV dosyası veya CV bağlantısı zorunludur." });
    return;
  }

  let cvUrl = cvUrlInput || null;
  let storedFileName = cvFileName || null;

  if (cvDataUrl) {
    const parsed = parseCvDataUrl(cvDataUrl);
    if (!parsed) {
      res.status(400).json({ error: "CV dosyası geçersiz veya 5 MB sınırını aşıyor (PDF)." });
      return;
    }
    const ext = extFromMime(parsed.mime);
    if (!ext) {
      res.status(400).json({ error: "Desteklenmeyen CV dosya türü (yalnızca PDF)." });
      return;
    }
    try {
      const saved = await saveMediaBuffer(parsed.buf, { ext, mime: parsed.mime });
      cvUrl = saved.url;
      storedFileName = cvFileName || "cv.pdf";
    } catch {
      res.status(500).json({ error: "CV yüklenemedi." });
      return;
    }
  } else if (cvUrlInput && !/^https?:\/\//i.test(cvUrlInput)) {
    res.status(400).json({ error: "CV bağlantısı http veya https ile başlamalıdır." });
    return;
  }

  try {
    await ensureCareerTable();
    await db.execute(sql`
      INSERT INTO career_applications (
        position_slug, position_title, full_name, email, phone, city,
        experience_years, cover_letter, cv_url, cv_file_name
      ) VALUES (
        ${POSITION_SLUG}, ${POSITION_TITLE}, ${fullName}, ${email}, ${phone},
        ${city || null}, ${experienceYears || null}, ${coverLetter}, ${cvUrl}, ${storedFileName}
      )
    `);
    res.status(201).json({ ok: true, message: "Başvurunuz alındı. En kısa sürede sizinle iletişime geçeceğiz." });
  } catch {
    res.status(500).json({ error: "Başvuru kaydedilemedi." });
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
    const rows = unreadOnly
      ? await db.execute(sql`
          SELECT id, position_slug, position_title, full_name, email, phone, city,
                 experience_years, cover_letter, cv_url, cv_file_name, is_read, status,
                 review_note, reviewed_at, created_at
          FROM career_applications
          WHERE is_read = false
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `)
      : await db.execute(sql`
          SELECT id, position_slug, position_title, full_name, email, phone, city,
                 experience_years, cover_letter, cv_url, cv_file_name, is_read, status,
                 review_note, reviewed_at, created_at
          FROM career_applications
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `);
    const totalRow = unreadOnly
      ? await db.execute(sql`SELECT COUNT(*)::int AS c FROM career_applications WHERE is_read = false`)
      : await db.execute(sql`SELECT COUNT(*)::int AS c FROM career_applications`);
    const total = Number((totalRow.rows[0] as { c: number }).c);
    res.json({ applications: rows.rows, total, page, limit });
  } catch (e) {
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

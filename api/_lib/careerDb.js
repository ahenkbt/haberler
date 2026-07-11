const { Pool } = require("pg");
const { POSITION_SLUG, POSITION_TITLE } = require("./careerShared.js");

let pool = null;

function normalizeEnv(value) {
  if (value == null) return "";
  let v = String(value).replace(/^\uFEFF/, "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v.replace(/\r?\n/g, "");
}

function getDatabaseUrl() {
  return (
    normalizeEnv(process.env.DATABASE_URL) ||
    normalizeEnv(process.env.POSTGRES_URL) ||
    normalizeEnv(process.env.DATABASE_PUBLIC_URL) ||
    ""
  );
}

function getPool() {
  const url = getDatabaseUrl();
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      ssl: url.includes("sslmode=require") || url.includes("railway.app") ? { rejectUnauthorized: false } : undefined,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    });
  }
  return pool;
}

async function ensureCareerTable(client) {
  await client.query(`
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

async function insertCareerApplication(row) {
  const p = getPool();
  if (!p) return { ok: false, reason: "no_database_url" };
  const client = await p.connect();
  try {
    await ensureCareerTable(client);
    await client.query(
      `INSERT INTO career_applications (
        position_slug, position_title, full_name, email, phone, city,
        experience_years, cover_letter, cv_url, cv_file_name
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        POSITION_SLUG,
        POSITION_TITLE,
        row.fullName,
        row.email,
        row.phone,
        row.city || null,
        row.experienceYears || null,
        row.coverLetter,
        row.cvUrl || null,
        row.cvFileName || null,
      ],
    );
    return { ok: true };
  } finally {
    client.release();
  }
}

async function listCareerApplications({ page = 1, unreadOnly = false }) {
  const p = getPool();
  if (!p) return { ok: false, reason: "no_database_url" };
  const limit = 30;
  const offset = (Math.max(1, page) - 1) * limit;
  const client = await p.connect();
  try {
    await ensureCareerTable(client);
    const where = unreadOnly ? "WHERE is_read = false" : "";
    const rows = await client.query(
      `SELECT id, position_slug, position_title, full_name, email, phone, city,
              experience_years, cover_letter, cv_url, cv_file_name, is_read, status,
              review_note, reviewed_at, created_at
       FROM career_applications
       ${where}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    const totalRes = await client.query(
      unreadOnly
        ? "SELECT COUNT(*)::int AS c FROM career_applications WHERE is_read = false"
        : "SELECT COUNT(*)::int AS c FROM career_applications",
    );
    return {
      ok: true,
      applications: rows.rows,
      total: Number(totalRes.rows[0]?.c ?? 0),
      page: Math.max(1, page),
      limit,
    };
  } finally {
    client.release();
  }
}

async function markCareerApplicationRead(id, reviewNote) {
  const p = getPool();
  if (!p) return { ok: false, reason: "no_database_url" };
  const client = await p.connect();
  try {
    await ensureCareerTable(client);
    await client.query(
      `UPDATE career_applications
       SET is_read = true,
           status = 'reviewed',
           review_note = COALESCE($2, review_note),
           reviewed_at = NOW()
       WHERE id = $1`,
      [id, reviewNote],
    );
    return { ok: true };
  } finally {
    client.release();
  }
}

module.exports = {
  getDatabaseUrl,
  insertCareerApplication,
  listCareerApplications,
  markCareerApplicationRead,
};

/**
 * melihozkara/il-ilce-mahalle-sokak-veritabani — `data/` → Postgres (`tr_il`, `tr_ilce`, `tr_mahalle`, `tr_sokak`).
 *
 *   DATABASE_URL=... node ./scripts/import-tr-address-data.mjs "C:/path/to/.../data"
 *   TR_ADDRESS_DATA_PATH=... node ./scripts/import-tr-address-data.mjs
 *
 * Önce migration `0009_tr_address_registry.sql` uygulanmış olmalı (`pnpm run db:migrate`).
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const goalgoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(goalgoRoot, ".env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const dataDir = process.argv[2] || process.env.TR_ADDRESS_DATA_PATH;
if (!dataDir || !fs.existsSync(dataDir)) {
  console.error("[import-tr-address] data klasörü gerekli (argüman veya TR_ADDRESS_DATA_PATH).");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("[import-tr-address] DATABASE_URL tanımlı değil.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function forEachJsonl(filePath, fn) {
  if (!fs.existsSync(filePath)) return;
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    let row;
    try {
      row = JSON.parse(t);
    } catch {
      continue;
    }
    await fn(row);
  }
}

function placeholders(rows, colCount) {
  let i = 1;
  return rows
    .map(() => `(${Array.from({ length: colCount }, () => `$${i++}`).join(",")})`)
    .join(",");
}

async function flushIlce(client, batch) {
  if (!batch.length) return;
  const flat = batch.flat();
  const sql = `INSERT INTO tr_ilce (kimlik_no, il_plaka, adi, kayit_no) VALUES ${placeholders(batch, 4)} ON CONFLICT (kimlik_no) DO NOTHING`;
  await client.query(sql, flat);
}

async function flushMahalle(client, batch) {
  if (!batch.length) return;
  const flat = batch.flat();
  const sql = `INSERT INTO tr_mahalle (kimlik_no, il_plaka, ilce_kimlik, adi, bilesen) VALUES ${placeholders(batch, 5)} ON CONFLICT (kimlik_no) DO NOTHING`;
  await client.query(sql, flat);
}

async function flushSokak(client, batch) {
  if (!batch.length) return;
  const flat = batch.flat();
  const sql = `INSERT INTO tr_sokak (kimlik_no, il_plaka, ilce_kimlik, mahalle_kimlik, adi, bilesen) VALUES ${placeholders(batch, 6)} ON CONFLICT (kimlik_no) DO NOTHING`;
  await client.query(sql, flat);
}

const ILCE_BATCH = 150;
const MAH_BATCH = 700;
const SOK_BATCH = 550;

const skipped = {
  mahalle: 0,
  sokak: 0,
};

const normalized = {
  mahalle: 0,
  sokak: 0,
};

function nonEmptyText(value) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function deriveMahalleAdi(row) {
  const explicit = nonEmptyText(row.adi);
  if (explicit) return explicit;
  const villageName = nonEmptyText(row.koyAdi);
  if (villageName) return villageName;
  const componentName = nonEmptyText(row.bilesenAdi);
  if (componentName) return componentName;
  return null;
}

function deriveSokakAdi(row) {
  const explicit = nonEmptyText(row.adi);
  if (explicit) return explicit;

  const componentName = nonEmptyText(row.bilesenAdi);
  if (!componentName) return null;
  const onlyTypeLabel = /^\(?\s*(sokak|cadde|caddesi|bulvar|bulvarı|meydan|küme evler)\s*\)?$/iu.test(componentName);
  return onlyTypeLabel ? null : componentName;
}

async function insertIl(client) {
  const rows = [];
  await forEachJsonl(path.join(dataDir, "iller.jsonl"), async (r) => {
    rows.push([r.kimlikNo, r.adi, r.ilKayitNo ?? null]);
  });
  if (!rows.length) return;
  const flat = rows.flat();
  const sql = `INSERT INTO tr_il (plaka, adi, kayit_no) VALUES ${placeholders(rows, 3)} ON CONFLICT (plaka) DO NOTHING`;
  await client.query(sql, flat);
  console.log("[import-tr-address] tr_il:", rows.length);
}

async function importOneIl(client, ilDir, label) {
  let ilceN = 0;
  let mahN = 0;
  let sokN = 0;

  let ilceBuf = [];
  await forEachJsonl(path.join(ilDir, "ilceler.jsonl"), async (r) => {
    ilceBuf.push([r.kimlikNo, r.il_id, r.adi, r.ilceKayitNo ?? null]);
    if (ilceBuf.length >= ILCE_BATCH) {
      await flushIlce(client, ilceBuf);
      ilceN += ilceBuf.length;
      ilceBuf = [];
    }
  });
  if (ilceBuf.length) {
    await flushIlce(client, ilceBuf);
    ilceN += ilceBuf.length;
  }

  let mahBuf = [];
  await forEachJsonl(path.join(ilDir, "mahalleler.jsonl"), async (r) => {
    const adi = deriveMahalleAdi(r);
    if (!adi) {
      skipped.mahalle += 1;
      return;
    }
    if (adi !== nonEmptyText(r.adi)) normalized.mahalle += 1;
    mahBuf.push([r.kimlikNo, r.il_id, r.ilce_id, adi, (r.bilesenAdi ?? "").toString()]);
    if (mahBuf.length >= MAH_BATCH) {
      await flushMahalle(client, mahBuf);
      mahN += mahBuf.length;
      mahBuf = [];
    }
  });
  if (mahBuf.length) {
    await flushMahalle(client, mahBuf);
    mahN += mahBuf.length;
  }

  let sokBuf = [];
  await forEachJsonl(path.join(ilDir, "sokaklar.jsonl"), async (r) => {
    const mh = r.mahalleKayitNo ?? r.mahalle_id;
    const adi = deriveSokakAdi(r);
    if (!adi) {
      skipped.sokak += 1;
      return;
    }
    if (adi !== nonEmptyText(r.adi)) normalized.sokak += 1;
    sokBuf.push([r.kimlikNo, r.il_id, r.ilce_id, mh, adi, (r.bilesenAdi ?? "").toString()]);
    if (sokBuf.length >= SOK_BATCH) {
      await flushSokak(client, sokBuf);
      sokN += sokBuf.length;
      sokBuf = [];
    }
  });
  if (sokBuf.length) {
    await flushSokak(client, sokBuf);
    sokN += sokBuf.length;
  }

  console.log(`[import-tr-address] ${label}: ilçe ${ilceN}, mahalle ${mahN}, sokak ${sokN}`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await insertIl(client);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const entries = fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^il-\d+$/.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]));

  console.log("[import-tr-address] il klasörleri:", entries.length);

  for (const name of entries) {
    const ilDir = path.join(dataDir, name);
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await importOneIl(c, ilDir, name);
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      console.error(`[import-tr-address] HATA ${name}:`, e?.message || e);
    } finally {
      c.release();
    }
  }

  const [ilRes, ilceRes, mahRes, sokRes] = await Promise.all([
    pool.query("SELECT count(*)::int AS c FROM tr_il"),
    pool.query("SELECT count(*)::int AS c FROM tr_ilce"),
    pool.query("SELECT count(*)::int AS c FROM tr_mahalle"),
    pool.query("SELECT count(*)::int AS c FROM tr_sokak"),
  ]);
  const ilc = ilRes.rows[0].c;
  const ilcec = ilceRes.rows[0].c;
  const mahc = mahRes.rows[0].c;
  const sokc = sokRes.rows[0].c;
  console.log("[import-tr-address] Özet — il:", ilc, "ilçe:", ilcec, "mahalle:", mahc, "sokak:", sokc);
  console.log(
    "[import-tr-address] Adı normalize edilen — mahalle:",
    normalized.mahalle,
    "sokak:",
    normalized.sokak,
    "| atlanan geçersiz — mahalle:",
    skipped.mahalle,
    "sokak:",
    skipped.sokak,
  );
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

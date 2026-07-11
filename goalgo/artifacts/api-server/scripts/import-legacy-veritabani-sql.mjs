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

const sqlPath = process.argv[2];
if (!sqlPath || !fs.existsSync(sqlPath)) {
  console.error("[legacy-import] SQL dosyasi gerekli.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("[legacy-import] DATABASE_URL bulunamadi.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function placeholders(rows, colCount) {
  let i = 1;
  return rows
    .map(() => `(${Array.from({ length: colCount }, () => `$${i++}`).join(",")})`)
    .join(",");
}

async function bulkInsert(client, table, cols, rows, conflictCol) {
  if (!rows.length) return;
  const sql = `INSERT INTO ${table} (${cols.join(",")}) VALUES ${placeholders(rows, cols.length)} ON CONFLICT (${conflictCol}) DO NOTHING`;
  await client.query(sql, rows.flat());
}

function unN(v) {
  return v?.replace(/^N'/, "'").replace(/^'/, "").replace(/'$/, "").replace(/''/g, "'") ?? "";
}

async function main() {
  const cityBySehirId = new Map(); // sehirId -> { plaka, adi }
  const ilceById = new Map(); // ilceId -> { sehirId, ilceAdi }
  const ilRows = [];
  const ilceRows = [];
  const mahRows = [];

  const rl = readline.createInterface({
    input: fs.createReadStream(sqlPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const lineRaw of rl) {
    const line = lineRaw.trim();
    if (!line.startsWith("INSERT [dbo].[")) continue;

    if (line.startsWith("INSERT [dbo].[Sehirler]")) {
      const m = line.match(/VALUES\s*\((\d+),\s*N'([^']*(?:''[^']*)*)',\s*(\d+),/i);
      if (!m) continue;
      const sehirId = Number(m[1]);
      const adi = unN(`N'${m[2]}'`);
      const plaka = Number(m[3]);
      cityBySehirId.set(sehirId, { plaka, adi });
      ilRows.push([plaka, adi, null]);
    } else if (line.startsWith("INSERT [dbo].[Ilceler]")) {
      const m = line.match(/VALUES\s*\((\d+),\s*(\d+),\s*N'([^']*(?:''[^']*)*)',\s*N'([^']*(?:''[^']*)*)'\)/i);
      if (!m) continue;
      const ilceId = Number(m[1]);
      const sehirId = Number(m[2]);
      const ilceAdi = unN(`N'${m[3]}'`);
      ilceById.set(ilceId, { sehirId, ilceAdi });
      const city = cityBySehirId.get(sehirId);
      if (city) ilceRows.push([BigInt(ilceId), city.plaka, ilceAdi, null]);
    } else if (line.startsWith("INSERT [dbo].[SemtMah]")) {
      const m = line.match(/VALUES\s*\((\d+),\s*N'([^']*(?:''[^']*)*)',\s*N'([^']*(?:''[^']*)*)',\s*N'([^']*(?:''[^']*)*)',\s*(\d+)\)/i);
      if (!m) continue;
      const semtMahId = Number(m[1]);
      const semtAdi = unN(`N'${m[2]}'`);
      const mahalleAdi = unN(`N'${m[3]}'`);
      const ilceId = Number(m[5]);
      const ilce = ilceById.get(ilceId);
      const city = ilce ? cityBySehirId.get(ilce.sehirId) : null;
      if (!ilce || !city) continue;
      mahRows.push([BigInt(semtMahId), city.plaka, BigInt(ilceId), mahalleAdi, semtAdi]);
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await bulkInsert(client, "tr_il", ["plaka", "adi", "kayit_no"], ilRows, "plaka");
    await bulkInsert(client, "tr_ilce", ["kimlik_no", "il_plaka", "adi", "kayit_no"], ilceRows, "kimlik_no");
    await bulkInsert(client, "tr_mahalle", ["kimlik_no", "il_plaka", "ilce_kimlik", "adi", "bilesen"], mahRows, "kimlik_no");
    await client.query("COMMIT");
    console.log("[legacy-import] Tamamlandi", { il: ilRows.length, ilce: ilceRows.length, mahalle: mahRows.length });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("[legacy-import] HATA", e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


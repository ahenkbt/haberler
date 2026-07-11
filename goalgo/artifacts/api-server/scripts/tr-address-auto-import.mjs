/**
 * Üretim / Railway: `goalgo/data/tr-address-registry` (il–ilçe–mahalle; isteğe bağlı sokak jsonl)
 * veri eksikse `import-tr-address-data.mjs` çalıştırır. Idempotent (ON CONFLICT DO NOTHING).
 *
 * `pnpm start` içinde HTTP’den **önce** bloklamaz; `dist/index.mjs` dinleyiciyi açtıktan sonra arka planda spawn edilir
 * (Railway healthcheck zaman aşımı önlenir).
 *
 *   SKIP_TR_ADDRESS_IMPORT=1
 *   TR_ADDRESS_MIN_MAHALLE=70000
 *   TR_ADDRESS_MIN_SOKAK=6000000   — sokak dosyaları repoda ve satır sayısı buna ulaştıysa import atlanır (~tam set)
 */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const goalgoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(goalgoRoot, ".env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const bundledDir = path.join(goalgoRoot, "data/tr-address-registry");
const illerFile = path.join(bundledDir, "iller.jsonl");
const importScript = path.join(__dirname, "import-tr-address-data.mjs");

const minMahalle = Number(process.env.TR_ADDRESS_MIN_MAHALLE ?? "70000");
const minSokak = Number(process.env.TR_ADDRESS_MIN_SOKAK ?? "6000000");

async function ensureTrAddressSchema(pool) {
  await pool.query(`
CREATE TABLE IF NOT EXISTS tr_il (
  plaka integer PRIMARY KEY NOT NULL,
  adi text NOT NULL,
  kayit_no integer
);
CREATE TABLE IF NOT EXISTS tr_ilce (
  kimlik_no bigint PRIMARY KEY NOT NULL,
  il_plaka integer NOT NULL REFERENCES tr_il (plaka),
  adi text NOT NULL,
  kayit_no integer
);
CREATE INDEX IF NOT EXISTS tr_ilce_il_plaka_idx ON tr_ilce (il_plaka);
CREATE TABLE IF NOT EXISTS tr_mahalle (
  kimlik_no bigint PRIMARY KEY NOT NULL,
  il_plaka integer NOT NULL,
  ilce_kimlik bigint NOT NULL REFERENCES tr_ilce (kimlik_no),
  adi text NOT NULL,
  bilesen text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS tr_mahalle_ilce_idx ON tr_mahalle (ilce_kimlik);
CREATE INDEX IF NOT EXISTS tr_mahalle_il_plaka_idx ON tr_mahalle (il_plaka);
CREATE TABLE IF NOT EXISTS tr_sokak (
  kimlik_no bigint PRIMARY KEY NOT NULL,
  il_plaka integer NOT NULL,
  ilce_kimlik bigint NOT NULL,
  mahalle_kimlik bigint NOT NULL REFERENCES tr_mahalle (kimlik_no),
  adi text NOT NULL,
  bilesen text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS tr_sokak_mahalle_idx ON tr_sokak (mahalle_kimlik);
CREATE INDEX IF NOT EXISTS tr_sokak_ilce_idx ON tr_sokak (ilce_kimlik);
  `);
}

if (process.env.SKIP_TR_ADDRESS_IMPORT === "1") {
  console.log("[tr-address-auto-import] SKIP_TR_ADDRESS_IMPORT=1 — atlandı");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("[tr-address-auto-import] DATABASE_URL yok; db-migrate sonrası beklenirdi.");
  process.exit(1);
}

if (!fs.existsSync(illerFile)) {
  console.log("[tr-address-auto-import] Gömülü veri yok:", illerFile, "— atlanıyor");
  process.exit(0);
}

const hasBundledSokak = fs.existsSync(path.join(bundledDir, "il-34", "sokaklar.jsonl"));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let mahCount = 0;
let sokCount = 0;
try {
  const {
    rows: [reg],
  } = await pool.query("SELECT to_regclass('public.tr_mahalle')::text AS name");
  const mahalleTableExists = typeof reg?.name === "string" && reg.name.length > 0;
  if (!mahalleTableExists) {
    console.warn("[tr-address-auto-import] tr_mahalle tablosu yok; şema otomatik oluşturuluyor…");
    await ensureTrAddressSchema(pool);
  }
  const {
    rows: [m],
  } = await pool.query("SELECT count(*)::int AS c FROM tr_mahalle");
  mahCount = m?.c ?? 0;
  try {
    const { rows: [s] } = await pool.query("SELECT count(*)::int AS c FROM tr_sokak");
    sokCount = s?.c ?? 0;
  } catch {
    sokCount = 0;
  }
} finally {
  await pool.end();
}

const mahOk = mahCount >= minMahalle;
const sokOk = !hasBundledSokak || sokCount >= minSokak;
if (mahOk && sokOk) {
  console.log(
    "[tr-address-auto-import] tr_mahalle=",
    mahCount,
    "tr_sokak=",
    sokCount,
    "— atlanıyor",
  );
  process.exit(0);
}

console.log(
  "[tr-address-auto-import] tr_mahalle=",
  mahCount,
  "tr_sokak=",
  sokCount,
  hasBundledSokak ? "(sokak dosyaları repoda)" : "",
  "→ içe aktarılıyor…",
);
if (hasBundledSokak && mahOk && sokCount < minSokak) {
  console.log(
    "[tr-address-auto-import] UYARI: Sokak milyonlarca satır olabilir; ilk kurulumda Railway zaman aşımına düşerse SKIP_TR_ADDRESS_IMPORT=1 yapıp yerelde DATABASE_URL ile `pnpm import:tr-address` çalıştırın.",
  );
}

const r = spawnSync(process.execPath, [importScript, bundledDir], {
  stdio: "inherit",
  env: { ...process.env },
  cwd: path.join(__dirname, ".."),
});

if (r.status !== 0) {
  console.error("[tr-address-auto-import] import çıkış kodu:", r.status);
  process.exit(r.status ?? 1);
}
console.log("[tr-address-auto-import] tamam");
process.exit(0);

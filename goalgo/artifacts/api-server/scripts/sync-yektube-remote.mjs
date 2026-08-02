/**
 * Yektube (/yp) — tüm video kaynak botlarını uzak API üzerinden tetikler.
 *
 *   ADMIN_MAINTENANCE_SECRET=... node ./scripts/sync-yektube-remote.mjs --api=https://turk.eco
 *
 * Oturum çerezi ile (tarayıcıdan kopyalanmış) alternatif:
 *   node ./scripts/sync-yektube-remote.mjs --api=https://turk.eco --public-only
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function argVal(name) {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  return p ? p.slice(name.length + 1) : undefined;
}

const publicOnly = process.argv.includes("--public-only");
const apiBase = (argVal("--api") ?? process.env.YEKTUBE_API_BASE ?? "https://turk.eco").replace(/\/$/, "");

async function postJson(pathname, body = {}, opts = {}) {
  const secret = process.env.ADMIN_MAINTENANCE_SECRET?.trim();
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(secret && !publicOnly ? { "X-Yekpare-Admin-Secret": secret } : {}),
    ...opts.headers,
  };
  const res = await fetch(`${apiBase}/api${pathname}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP ${res.status} ${pathname}`);
  }
  return data;
}

async function getJson(pathname) {
  const res = await fetch(`${apiBase}/api${pathname}`, { headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status} ${pathname}`);
  return data;
}

async function main() {
  console.log(`[yektube-sync] API: ${apiBase} publicOnly=${publicOnly}`);

  if (publicOnly) {
    const refresh = await postJson("/video/refresh", {});
    console.log("[yektube-sync] refresh:", refresh);
    return;
  }

  const secret = process.env.ADMIN_MAINTENANCE_SECRET?.trim();
  if (!secret) {
    console.error("ADMIN_MAINTENANCE_SECRET yok — yalnızca --public-only kullanın veya sırrı ortam değişkeni olarak verin.");
    process.exit(1);
  }

  const categories = await getJson("/video/categories");
  const items = Array.isArray(categories?.items) ? categories.items : Array.isArray(categories) ? categories : [];
  console.log(`[yektube-sync] ${items.length} kategori, mevcut video sayıları yüklendi`);

  const syncAll = await postJson("/video/sync-all", {
    geminiClassify: true,
    languageScope: "tr",
  });
  console.log("[yektube-sync] sync-all:", syncAll);

  const shorts = await postJson("/video/sync-shorts", {});
  console.log("[yektube-sync] sync-shorts:", shorts);

  const social = await postJson("/video/sync-social", { async: true });
  console.log("[yektube-sync] sync-social:", social);

  console.log("[yektube-sync] Tamam — Render loglarında [video] bulk update ve kuyruk izlenebilir.");
}

main().catch((err) => {
  console.error("[yektube-sync] Hata:", err instanceof Error ? err.message : err);
  process.exit(1);
});

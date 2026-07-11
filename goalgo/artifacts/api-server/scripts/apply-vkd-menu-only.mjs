/**
 * VKD üst menüsüne yalnızca eksik maddeleri ekler (editör ayarlarını silmez).
 *
 * Yerel DB:
 *   npx tsx ./scripts/apply-vkd-menu-only.mjs
 *
 * Canlı API (admin bakım anahtarı gerekir):
 *   set ADMIN_MAINTENANCE_SECRET=...
 *   npx tsx ./scripts/apply-vkd-menu-only.mjs --api=https://goalgo-y7ze.onrender.com
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { syncVkdMenuPartialFromData } from "../src/lib/vkd-page-restore.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function argVal(name) {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  return p ? p.slice(name.length + 1) : undefined;
}

async function applyViaApi(apiBase) {
  const secret = process.env.ADMIN_MAINTENANCE_SECRET?.trim();
  if (!secret) {
    throw new Error("ADMIN_MAINTENANCE_SECRET tanımlı değil");
  }
  const res = await fetch(`${apiBase.replace(/\/$/, "")}/api/hm/admin/vkd-restore-menu`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-maintenance-secret": secret,
    },
    body: "{}",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return body;
}

async function main() {
  const api = argVal("--api");
  if (api) {
    const result = await applyViaApi(api);
    console.log("[vkd-menu] API:", result.message ?? result);
    if (result.added != null) console.log(`[vkd-menu] eklenen=${result.added} eksik=${(result.missingBefore ?? []).join(", ")}`);
    return;
  }

  const result = await syncVkdMenuPartialFromData();
  console.log(`[vkd-menu] eklenen=${result.added} eksik=${result.missingBefore.join(", ") || "yok"}`);
}

main().catch((err) => {
  console.error("[vkd-menu] hata:", err instanceof Error ? err.message : err);
  process.exit(1);
});

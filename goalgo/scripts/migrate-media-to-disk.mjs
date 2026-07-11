#!/usr/bin/env node
/**
 * Mevcut görselleri site diskine taşır (haber, logo, köşe yazarı, banner, RSS).
 *
 * Kullanım:
 *   ADMIN_MAINTENANCE_SECRET=... API_ORIGIN=https://yekpare.net node goalgo/scripts/migrate-media-to-disk.mjs
 *   ADMIN_MAINTENANCE_SECRET=... API_ORIGIN=https://goalgo-y7ze.onrender.com node goalgo/scripts/migrate-media-to-disk.mjs --limit 200 --batches 20
 */
const apiOrigin = (process.env.API_ORIGIN ?? "https://yekpare.net").replace(/\/+$/, "");
const secret = String(process.env.ADMIN_MAINTENANCE_SECRET ?? "").trim();

const args = process.argv.slice(2);
const limit = Number(args.find((a, i) => args[i - 1] === "--limit") ?? 150);
const batches = Number(args.find((a, i) => args[i - 1] === "--batches") ?? 30);
const dryRun = args.includes("--dry-run");

if (!secret) {
  console.error("ADMIN_MAINTENANCE_SECRET gerekli");
  process.exit(1);
}

async function runBatch(batchNo) {
  const res = await fetch(`${apiOrigin}/api/media/migrate-to-disk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Yekpare-Admin-Secret": secret,
    },
    body: JSON.stringify({
      limit,
      dryRun,
      includeExternal: true,
      scopes: ["all"],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const data = await res.json().catch(() => ({}));
  console.log(`batch ${batchNo}: HTTP ${res.status}`, JSON.stringify(data));
  return data;
}

let totalUpdated = 0;
let totalImported = 0;
for (let i = 1; i <= batches; i += 1) {
  const data = await runBatch(i);
  if (!data?.ok) break;
  totalUpdated += Number(data.updatedRows ?? 0);
  totalImported += Number(data.importedFiles ?? 0);
  if (dryRun) break;
  if ((data.updatedRows ?? 0) + (data.importedFiles ?? 0) + (data.failed ?? 0) === 0) {
    console.log("Taşınacak kayıt kalmadı.");
    break;
  }
  await new Promise((r) => setTimeout(r, 1500));
}

console.log(`Toplam güncellenen: ${totalUpdated}, içe aktarılan dosya: ${totalImported}`);

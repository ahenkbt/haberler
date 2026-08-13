#!/usr/bin/env node
/**
 * Mevcut görselleri Cloudflare R2'ye taşır (haber, logo, köşe yazarı, banner, RSS).
 *
 * Kullanım:
 *   ADMIN_MAINTENANCE_SECRET=... API_ORIGIN=https://turk.eco node goalgo/scripts/migrate-media-to-r2.mjs
 */
const apiOrigin = (process.env.API_ORIGIN ?? "https://turk.eco").replace(/\/+$/, "");
const secret = String(process.env.ADMIN_MAINTENANCE_SECRET ?? "").trim();

if (/onrender\.com/i.test(apiOrigin)) {
  console.error("API_ORIGIN Render olamaz — https://turk.eco kullanın");
  process.exit(1);
}

const args = process.argv.slice(2);
const limit = Number(args.find((a, i) => args[i - 1] === "--limit") ?? 150);
const batches = Number(args.find((a, i) => args[i - 1] === "--batches") ?? 30);
const dryRun = args.includes("--dry-run");

if (!secret) {
  console.error("ADMIN_MAINTENANCE_SECRET gerekli");
  process.exit(1);
}

async function runBatch(batchNo) {
  const res = await fetch(`${apiOrigin}/api/media/migrate-to-r2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Yekpare-Admin-Secret": secret,
    },
    body: JSON.stringify({
      limit,
      dryRun,
      includeDbReferenced: true,
      scanLocalDisk: true,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const data = await res.json().catch(() => ({}));
  console.log(`batch ${batchNo}: HTTP ${res.status}`, JSON.stringify(data));
  return data;
}

let totalUploaded = 0;
let totalAlready = 0;
for (let i = 1; i <= batches; i += 1) {
  const data = await runBatch(i);
  if (!data?.ok) break;
  totalUploaded += Number(data.uploaded ?? 0);
  totalAlready += Number(data.alreadyInR2 ?? 0);
  if (dryRun) break;
  if ((data.uploaded ?? 0) + (data.failed ?? 0) === 0 && (data.scannedDb ?? 0) + (data.scannedLocal ?? 0) === 0) {
    console.log("Taşınacak kayıt kalmadı.");
    break;
  }
  if ((data.uploaded ?? 0) === 0 && (data.failed ?? 0) === 0) {
    console.log("Bu batch'te yeni yükleme yok.");
  }
  await new Promise((r) => setTimeout(r, 1500));
}

console.log(`Toplam R2 yüklenen: ${totalUploaded}, zaten R2'de: ${totalAlready}`);

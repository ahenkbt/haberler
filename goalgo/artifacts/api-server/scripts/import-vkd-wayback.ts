/**
 * Wayback (`vatankahramanlari.org.tr`) haberleri → HM site `vkd`.
 *
 *   pnpm --dir goalgo/artifacts/api-server run import:vkd-wayback -- --crawl
 *   pnpm --dir goalgo/artifacts/api-server run import:vkd-wayback -- --dry-run
 *   pnpm --dir goalgo/artifacts/api-server run import:vkd-wayback -- --apply
 *   pnpm --dir goalgo/artifacts/api-server run import:vkd-wayback -- --apply-remote --api=https://yekpare.net
 *
 * `--apply` için DATABASE_URL gerekir.
 * `--apply-remote` için ADMIN_MAINTENANCE_SECRET + X-Yekpare-Admin-Secret gerekir.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenvConfig({ path: path.join(__dirname, "../../../.env") });
dotenvConfig({ path: path.join(__dirname, "../.env") });

import {
  crawlVkdWaybackArticles,
  emptyVkdWaybackPayload,
  parseVkdWaybackPayload,
  runHmVkdWaybackImport,
  toAhbHaberExport,
  VKD_WAYBACK_DEFAULT_SITE_SLUG,
  VKD_WAYBACK_PREFERRED_SNAPSHOT,
  type VkdWaybackPayload,
} from "../src/lib/hm-vkd-wayback-import";

function argVal(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  return p ? p.slice(name.length + 1) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

const DEFAULT_PAYLOAD = path.resolve(__dirname, "../../../data/vkd/wayback-haber.json");
const DEFAULT_AHB = path.resolve(__dirname, "../../../data/vkd/wayback-haber-ahb.json");
const DEFAULT_API = "https://yekpare.net";

async function loadOrEmptyPayload(filePath: string): Promise<VkdWaybackPayload> {
  try {
    const raw = JSON.parse(await readFile(filePath, "utf8")) as unknown;
    return parseVkdWaybackPayload(raw);
  } catch {
    return emptyVkdWaybackPayload();
  }
}

async function writePayload(filePath: string, payload: VkdWaybackPayload): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  const ahbPath = filePath === DEFAULT_PAYLOAD ? DEFAULT_AHB : filePath.replace(/\.json$/i, "-ahb.json");
  await writeFile(ahbPath, `${JSON.stringify(toAhbHaberExport(payload), null, 2)}\n`, "utf8");
  console.log(`Yazıldı: ${filePath} (${payload.items.length} haber)`);
  console.log(`AHB uyumlu: ${ahbPath}`);
}

async function applyRemote(payload: VkdWaybackPayload, opts: {
  apiBase: string;
  siteSlug: string;
  dryRun: boolean;
  skipImages: boolean;
}): Promise<void> {
  const secret = String(process.env.ADMIN_MAINTENANCE_SECRET ?? "").trim();
  if (!secret) {
    console.error("ADMIN_MAINTENANCE_SECRET tanımlı değil.");
    process.exit(1);
  }
  const res = await fetch(`${opts.apiBase.replace(/\/+$/, "")}/api/hm/admin/import-vkd-wayback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Yekpare-Admin-Secret": secret,
    },
    body: JSON.stringify({
      siteSlug: opts.siteSlug,
      dryRun: opts.dryRun,
      skipImages: opts.skipImages,
      payload,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Uzak uygulama başarısız (${res.status}): ${text.slice(0, 500)}`);
    process.exit(1);
  }
  console.log(text);
}

async function main() {
  const siteSlug = (argVal("--site-slug") ?? VKD_WAYBACK_DEFAULT_SITE_SLUG).trim().toLowerCase();
  const payloadPath = path.resolve(argVal("--payload") ?? DEFAULT_PAYLOAD);
  const snapshot = argVal("--snapshot") ?? VKD_WAYBACK_PREFERRED_SNAPSHOT;
  const apiBase = (argVal("--api") ?? DEFAULT_API).trim();
  const doCrawl = hasFlag("--crawl");
  const applyRemoteFlag = hasFlag("--apply-remote");
  const applyDb = hasFlag("--apply");
  const skipImages = hasFlag("--skip-images");
  const dryRun = !applyDb && !applyRemoteFlag ? true : hasFlag("--dry-run");
  const limitRaw = argVal("--limit");
  const limit = limitRaw ? Math.max(0, parseInt(limitRaw, 10) || 0) : undefined;

  if (hasFlag("--help") || hasFlag("-h")) {
    console.log(`Kullanım:
  --crawl                 CDX + anasayfa bağlantılarından haber çek
  --payload=PATH          JSON (varsayılan: goalgo/data/vkd/wayback-haber.json)
  --dry-run               DB yazmadan önizleme (varsayılan)
  --apply                 DATABASE_URL ile yaz
  --apply-remote          ADMIN_MAINTENANCE_SECRET ile canlı API
  --api=URL               uzak API kökü (varsayılan ${DEFAULT_API})
  --site-slug=vkd
  --skip-images           görselleri yeniden barındırma
  --limit=N               crawl üst sınırı
  --snapshot=YYYYMMDDhhmmss`);
    return;
  }

  let payload = await loadOrEmptyPayload(payloadPath);
  if (doCrawl) {
    console.log(`Wayback taranıyor (snapshot ${snapshot})…`);
    payload = await crawlVkdWaybackArticles({
      preferredSnapshot: snapshot,
      limit,
      extraUrls: payload.items.map((i) => i.canonicalUrl),
      log: (line) => console.log(line),
    });
    await writePayload(payloadPath, payload);
  } else if (!payload.items.length) {
    console.error(`Payload boş: ${payloadPath}. Önce --crawl çalıştırın.`);
    process.exit(1);
  }

  const featured = payload.items.filter((i) => i.featuredImageUrl).length;
  const bodyImgs = payload.items.reduce((n, i) => n + i.bodyImageUrls.length, 0);
  console.log(
    `Özet: ${payload.items.length} haber, ${featured} kapak, ${bodyImgs} gövde/galeri görseli.`,
  );

  if (applyRemoteFlag) {
    await applyRemote(payload, { apiBase, siteSlug, dryRun, skipImages });
    return;
  }

  if (!applyDb) {
    const { mkdir: mk, writeFile: wf } = await import("node:fs/promises");
    const reportPath = path.join(path.dirname(payloadPath), "wayback-haber-dry-run.json");
    const preview = payload.items.map((item) => ({
      title: item.title,
      slug: item.slug,
      categorySlug: item.categorySlug,
      date: item.date,
      dateLabel: item.dateLabel,
      canonicalUrl: item.canonicalUrl,
      sourceUrl: item.sourceUrl,
      featuredImageUrl: item.featuredImageUrl,
      imageCountInBody: item.bodyImageUrls.length,
      spot: item.spot?.slice(0, 180) ?? null,
    }));
    await mk(path.dirname(reportPath), { recursive: true });
    await wf(reportPath, `${JSON.stringify({ dryRun: true, siteSlug, items: preview }, null, 2)}\n`, "utf8");
    console.log(`Dry-run önizleme: ${reportPath}`);
    console.log("DB yazmak için --apply (DATABASE_URL) veya --apply-remote kullanın.");
    for (const row of preview.slice(0, 8)) {
      console.log(`  - ${row.dateLabel ?? row.date ?? "?"} [${row.categorySlug}] ${row.title}`);
    }
    if (preview.length > 8) console.log(`  … +${preview.length - 8} haber`);
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL tanımlı değil (--dry-run veya --apply-remote kullanın).");
    process.exit(1);
  }

  const { db, hmNewsSitesTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const [site] = await db.select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, siteSlug)).limit(1);
  if (!site) {
    console.error(`HM site bulunamadı: slug=${siteSlug}`);
    process.exit(1);
  }

  const result = await runHmVkdWaybackImport({
    siteId: site.id,
    siteSlug,
    payload,
    dryRun: false,
    skipImages,
    log: (line) => console.log(line),
  });
  console.log(
    `\nBitti. Site: ${siteSlug} (id ${site.id}). +${result.newsAdded} haber, atlanan ${result.newsSkipped} (yinelenen ${result.skippedDuplicates}), görsel ${result.imagesDownloaded}, görsel hata ${result.imagesFailed}.`,
  );
  console.log(`Örnek: https://vatankahramanlari.org/haber/${payload.items[0]?.slug ?? ""}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Neon'daki /api/media/uploads/* dosyalarını Cloudflare R2'ye kopyalar.
 *
 * Kaynak sırası:
 *   1) RENDER_MEDIA_ORIGIN (varsayılan: https://goalgo-y7ze.onrender.com) — bir kerelik disk kopyası
 *   2) haber rss_source_url sayfasındaki og:image (Render askıdaysa yedek)
 *
 * Kullanım:
 *   DATABASE_URL=... S3_ENDPOINT=... S3_BUCKET=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
 *     node goalgo/scripts/copy-render-media-to-r2.mjs
 */
import pg from "pg";
import { AwsClient } from "aws4fetch";
import { pathToFileURL } from "node:url";
import path from "node:path";

export const DEFAULT_RENDER_MEDIA_ORIGIN = "https://goalgo-y7ze.onrender.com";
export const UPLOAD_FNAME_RE = /\/api\/media\/uploads\/([a-zA-Z0-9._-]+)/g;
const SAFE_FNAME = /^[a-zA-Z0-9._-]+$/;

const MIME_BY_EXT = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
};

const TEXT_SQL = [
  "SELECT image_url AS t FROM news WHERE image_url IS NOT NULL",
  "SELECT avatar_url AS t FROM authors WHERE avatar_url IS NOT NULL",
  "SELECT logo_url AS t FROM site_settings WHERE logo_url IS NOT NULL",
  "SELECT favicon_url AS t FROM site_settings WHERE favicon_url IS NOT NULL",
  "SELECT news_layout_json AS t FROM site_settings WHERE news_layout_json IS NOT NULL",
  "SELECT homepage_design_json AS t FROM site_settings WHERE homepage_design_json IS NOT NULL",
  "SELECT image_url AS t FROM hm_makaleler WHERE image_url IS NOT NULL",
  "SELECT content AS t FROM hm_makaleler WHERE content LIKE '%/api/media/uploads/%'",
  "SELECT layout_json AS t FROM hm_news_sites WHERE layout_json IS NOT NULL",
  "SELECT html AS t FROM ad_slots WHERE html IS NOT NULL",
  "SELECT image_url AS t FROM photo_gallery_items WHERE image_url IS NOT NULL",
  "SELECT cover_image AS t FROM photo_galleries WHERE cover_image IS NOT NULL",
  "SELECT image_url AS t FROM resmi_ilanlar WHERE image_url IS NOT NULL",
  "SELECT pdf_url AS t FROM resmi_ilanlar WHERE pdf_url IS NOT NULL",
  "SELECT image_url AS t FROM portal_rss_items WHERE image_url IS NOT NULL",
  "SELECT content AS t FROM news WHERE content LIKE '%/api/media/uploads/%'",
];

export function extractUploadFnames(text) {
  const out = new Set();
  const raw = String(text || "");
  for (const m of raw.matchAll(UPLOAD_FNAME_RE)) {
    const name = m[1];
    if (name && SAFE_FNAME.test(name) && !name.includes("..")) out.add(name);
  }
  return out;
}

export function mimeFromFname(fname) {
  const ext = String(fname).split(".").pop()?.toLowerCase() || "";
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

export function isRenderSuspendedResponse(res, bodyText) {
  const routing = String(res.headers?.get?.("x-render-routing") || "").toLowerCase();
  if (routing === "suspend") return true;
  const text = String(bodyText || "");
  return /service has been suspended/i.test(text);
}

export function parseOgImage(html) {
  const raw = String(html || "");
  const m =
    raw.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    raw.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  const url = m?.[1]?.trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  if (/onrender\.com/i.test(url) && /\/api\/media\/uploads\//i.test(url)) return null;
  return url;
}

function envVal(name) {
  return String(process.env[name] || "").replace(/^\uFEFF/, "").trim();
}

function s3Endpoint() {
  const raw = envVal("S3_ENDPOINT");
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw.replace(/\/+$/, "") : `https://${raw.replace(/\/+$/, "")}`;
}

function requireS3Env() {
  const missing = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"].filter(
    (k) => !envVal(k),
  );
  if (missing.length) {
    throw new Error(`S3 env eksik: ${missing.join(", ")} — GitHub Actions Secrets veya Environment Variables`);
  }
}

function aws() {
  return new AwsClient({
    accessKeyId: envVal("S3_ACCESS_KEY_ID"),
    secretAccessKey: envVal("S3_SECRET_ACCESS_KEY"),
    service: "s3",
    region: envVal("S3_REGION") || "auto",
  });
}

function objectUrl(fname) {
  const prefix = envVal("S3_KEY_PREFIX").replace(/^\/+|\/+$/g, "");
  const key = prefix ? `${prefix}/${fname}` : fname;
  return `${s3Endpoint()}/${envVal("S3_BUCKET")}/${key}`;
}

async function r2Exists(fname) {
  const res = await aws().fetch(objectUrl(fname), { method: "HEAD" });
  return res.ok;
}

async function r2Put(fname, buf, contentType) {
  const res = await aws().fetch(objectUrl(fname), {
    method: "PUT",
    body: buf,
    headers: {
      "content-type": contentType,
      "content-length": String(buf.byteLength),
    },
  });
  if (!res.ok) {
    const detail = (await res.text()).trim().slice(0, 180);
    throw new Error(`R2 PUT HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
}

async function fetchBytes(url, timeoutMs = 25_000) {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "image/*,application/pdf,video/*,*/*;q=0.8" },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  return { res, buf };
}

function looksLikeBinaryMedia(res, buf) {
  if (!res.ok || !buf?.length || buf.length < 32) return false;
  const type = String(res.headers.get("content-type") || "").toLowerCase();
  if (type.includes("text/html") || type.includes("application/json")) return false;
  const head = buf.subarray(0, 16).toString("utf8");
  if (/<!doctype html/i.test(head) || /<html/i.test(head)) return false;
  return true;
}

async function listFnames(client) {
  const fnames = new Set();
  for (const sql of TEXT_SQL) {
    try {
      const { rows } = await client.query(sql);
      for (const row of rows) {
        for (const name of extractUploadFnames(row.t)) fnames.add(name);
      }
    } catch (err) {
      console.warn(`[copy-r2] sorgu atlandı: ${sql.slice(0, 60)}… (${err.message})`);
    }
  }
  return [...fnames].sort();
}

async function rssSourceByFname(client) {
  const map = new Map();
  try {
    const { rows } = await client.query(
      `SELECT image_url, rss_source_url
         FROM news
        WHERE image_url LIKE '%/api/media/uploads/%'
          AND rss_source_url IS NOT NULL
          AND rss_source_url <> ''`,
    );
    for (const row of rows) {
      for (const fname of extractUploadFnames(row.image_url)) {
        if (!map.has(fname)) map.set(fname, String(row.rss_source_url));
      }
    }
  } catch (err) {
    console.warn("[copy-r2] rss_source_url okunamadı:", err.message);
  }
  return map;
}

async function fetchFromRender(fname, origin, state) {
  if (state.suspended || !origin) return null;
  const url = `${origin.replace(/\/+$/, "")}/api/media/uploads/${fname}`;
  try {
    const { res, buf } = await fetchBytes(url);
    const preview = buf.subarray(0, 400).toString("utf8");
    if (isRenderSuspendedResponse(res, preview)) {
      state.suspended = true;
      console.error("[copy-r2] Render servisi askıda (Service Suspended). Dashboard'dan Resume edin, sonra workflow'u tekrar çalıştırın.");
      return null;
    }
    if (looksLikeBinaryMedia(res, buf)) return buf;
  } catch (err) {
    console.warn(`[copy-r2] Render fetch ${fname}: ${err.message}`);
  }
  return null;
}

async function fetchOgImage(articleUrl) {
  if (!articleUrl || !/^https?:\/\//i.test(articleUrl)) return null;
  try {
    const { res, buf } = await fetchBytes(articleUrl, 20_000);
    if (!res.ok) return null;
    const og = parseOgImage(buf.toString("utf8"));
    if (!og) return null;
    const img = await fetchBytes(og, 20_000);
    if (looksLikeBinaryMedia(img.res, img.buf)) return img.buf;
  } catch {
    /* kaynak sayfa kapalı olabilir */
  }
  return null;
}

async function mapPool(items, concurrency, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i;
      i += 1;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a, i) => process.argv[i - 1] === "--limit");
  const limit = limitArg ? Math.max(1, Number(limitArg)) : 0;
  const origin = (envVal("RENDER_MEDIA_ORIGIN") || DEFAULT_RENDER_MEDIA_ORIGIN).replace(/\/+$/, "");

  if (!envVal("DATABASE_URL")) throw new Error("DATABASE_URL gerekli");
  if (!dryRun) requireS3Env();

  const client = new pg.Client({
    connectionString: envVal("DATABASE_URL"),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  let fnames;
  let rssMap;
  try {
    fnames = await listFnames(client);
    rssMap = await rssSourceByFname(client);
  } finally {
    await client.end();
  }

  if (limit) fnames = fnames.slice(0, limit);
  console.log(`[copy-r2] ${fnames.length} dosya (Render: ${origin}, rss yedek: ${rssMap.size})`);

  const stats = {
    already: 0,
    uploaded: 0,
    fromRender: 0,
    fromOg: 0,
    missing: 0,
    failed: 0,
  };
  const renderState = { suspended: false };
  const missing = [];

  await mapPool(fnames, 6, async (fname) => {
    try {
      if (!dryRun && (await r2Exists(fname))) {
        stats.already += 1;
        return;
      }
      let buf = await fetchFromRender(fname, origin, renderState);
      let source = "render";
      if (!buf) {
        buf = await fetchOgImage(rssMap.get(fname) || "");
        source = "og:image";
      }
      if (!buf) {
        stats.missing += 1;
        if (missing.length < 40) missing.push(fname);
        return;
      }
      if (dryRun) {
        stats.uploaded += 1;
        if (source === "render") stats.fromRender += 1;
        else stats.fromOg += 1;
        return;
      }
      await r2Put(fname, buf, mimeFromFname(fname));
      stats.uploaded += 1;
      if (source === "render") stats.fromRender += 1;
      else stats.fromOg += 1;
      if (stats.uploaded % 50 === 0) {
        console.log(`[copy-r2] ilerleme uploaded=${stats.uploaded} already=${stats.already} missing=${stats.missing}`);
      }
    } catch (err) {
      stats.failed += 1;
      console.warn(`[copy-r2] ${fname}: ${err.message}`);
    }
  });

  console.log("[copy-r2] bitti", JSON.stringify({ ...stats, renderSuspended: renderState.suspended, sampleMissing: missing }));
  if (renderState.suspended && stats.fromRender === 0 && stats.uploaded === 0) {
    process.exitCode = 2;
  }
}

const isMain =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((err) => {
    console.error("[copy-r2] hata:", err);
    process.exit(1);
  });
}

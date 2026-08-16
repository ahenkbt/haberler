/**
 * HM editör medya yükleme — Worker → Cloudflare R2.
 */
import { AwsClient } from "aws4fetch";

const MAX_BYTES_IMAGE = 6 * 1024 * 1024;
const MAX_BYTES_PDF = 12 * 1024 * 1024;
const MAX_BYTES_VIDEO = 15 * 1024 * 1024;

const MIME_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
};

function normalizeEnvValue(value) {
  if (value == null) return "";
  let v = String(value).replace(/^\uFEFF/, "").trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v.replace(/\r?\n/g, "");
}

/** GitHub/panel: tüm env bloğu tek secret'a yapıştırılınca `S3_BUCKET=yekpare-media` ayıkla. */
export function assignmentFromEnvBlob(blob, key) {
  const re = new RegExp(`(?:^|[\\n\\r;\\s"']+)${key}=([^\\s\\n\\r"']+)`, "i");
  const m = String(blob ?? "").match(re);
  return m ? m[1].trim() : "";
}

export function coerceS3Bucket(raw, blob = "") {
  const combined = `${raw ?? ""}\n${blob ?? ""}`;
  const named = assignmentFromEnvBlob(combined, "S3_BUCKET");
  if (named && /^[a-z0-9][a-z0-9._-]{1,62}$/i.test(named)) return named;
  const n = normalizeEnvValue(raw);
  if (/^[a-z0-9][a-z0-9._-]{1,62}$/i.test(n)) return n;
  if (/yekpare-media/i.test(combined)) return "yekpare-media";
  return "";
}

export function coerceS3AccessKeyId(raw, blob = "") {
  const n = normalizeEnvValue(raw);
  if (n && n.length < 180 && !/S3_/i.test(n) && !n.includes("://")) return n;
  const named = assignmentFromEnvBlob(`${raw ?? ""}\n${blob ?? ""}`, "S3_ACCESS_KEY_ID");
  if (named && named.length >= 8 && named.length <= 128 && !named.includes("=") && !named.includes("://")) {
    return named;
  }
  return "";
}

export function coerceS3SecretAccessKey(raw, blob = "") {
  const n = normalizeEnvValue(raw);
  if (n && n.length < 180 && !/S3_/i.test(n) && !n.includes("://")) return n;
  const named = assignmentFromEnvBlob(`${raw ?? ""}\n${blob ?? ""}`, "S3_SECRET_ACCESS_KEY");
  if (named && named.length >= 8 && named.length <= 256 && !named.includes("://")) return named;
  return "";
}

function s3Endpoint(env) {
  const keys = [
    "S3_ENDPOINT",
    "S3_API_ENDPOINT",
    "R2_ENDPOINT",
    "CLOUDFLARE_R2_ENDPOINT",
    "S3_ENDPOINT_URL",
  ];
  for (const key of keys) {
    const v = coerceR2S3Endpoint(env?.[key]);
    if (v) return v;
  }
  return "";
}

function s3EndpointRaw(env) {
  const keys = [
    "S3_ENDPOINT",
    "S3_API_ENDPOINT",
    "R2_ENDPOINT",
    "CLOUDFLARE_R2_ENDPOINT",
    "S3_ENDPOINT_URL",
  ];
  for (const key of keys) {
    const v = env?.[key];
    if (v != null && String(v).trim()) return v;
  }
  return "";
}

const R2_API_URL_RE = /https?:\/\/[a-z0-9][a-z0-9.-]*\.r2\.cloudflarestorage\.com/gi;
const R2_API_HOST_RE = /(?:^|[\s"'=\n\r])([a-z0-9][a-z0-9.-]*\.r2\.cloudflarestorage\.com)/gi;

/** Render env (PR #103): 2 aydır dual-write bu R2 S3 hostuna yazdı. */
export const RENDER_R2_S3_ENDPOINT =
  "https://fb9f9c9dc1991b7cc17ba58ab3c2e8726.r2.cloudflarestorage.com";

/** wrangler.toml account_id — Worker secret bloğunda yanlışlıkla ilk sıraya düşebiliyor. */
export const CF_ACCOUNT_R2_S3_ENDPOINT =
  "https://16f5b996194174624e7969a3658bd2bb.r2.cloudflarestorage.com";

function r2S3UrlFromValue(value) {
  const n = String(value ?? "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/^http:\/\//i, "https://");
  if (!n) return null;
  try {
    const host = new URL(/^https?:\/\//i.test(n) ? n : `https://${n}`).hostname;
    if (!/\.r2\.cloudflarestorage\.com$/i.test(host)) return null;
    return `https://${host}`;
  } catch {
    return null;
  }
}

/** Env bloğundaki tüm R2 S3 hostları; Render dual-write hostu önce. */
export function listR2S3EndpointCandidates(raw) {
  const blob = [];
  const seenBlob = new Set();
  const addBlob = (value) => {
    const url = r2S3UrlFromValue(value);
    if (!url || seenBlob.has(url)) return;
    seenBlob.add(url);
    blob.push(url);
  };

  const text = String(raw ?? "");
  for (const m of text.matchAll(R2_API_URL_RE)) addBlob(m[0]);
  for (const m of text.matchAll(R2_API_HOST_RE)) addBlob(`https://${m[1]}`);

  const extras = [];
  const seenExtra = new Set();
  const addExtra = (value) => {
    const url = r2S3UrlFromValue(value);
    if (!url || seenExtra.has(url) || seenBlob.has(url)) return;
    seenExtra.add(url);
    extras.push(url);
  };

  if (blob.length > 0 || text.length > 180) {
    addExtra(RENDER_R2_S3_ENDPOINT);
    addExtra(CF_ACCOUNT_R2_S3_ENDPOINT);
  }

  const out = [];
  const seen = new Set();
  const push = (url) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };

  const render = r2S3UrlFromValue(RENDER_R2_S3_ENDPOINT);
  if (render && (seenBlob.has(render) || seenExtra.has(render))) push(render);
  for (const u of blob) push(u);
  for (const u of extras) push(u);

  if (out.length === 0) {
    const v = normalizeEnvValue(raw);
    if (v && v.length <= 180) {
      const withScheme = /^https?:\/\//i.test(v) ? v.replace(/\/+$/, "") : `https://${v.replace(/\/+$/, "")}`;
      try {
        const host = new URL(withScheme).hostname;
        if (host) push(`${new URL(withScheme).protocol}//${host}`);
      } catch {
        /* ignore */
      }
    }
  }

  return out;
}

function s3EndpointCandidates(env) {
  return listR2S3EndpointCandidates(s3EndpointRaw(env));
}

/** Yapıştırılmış env bloğundan R2 S3 API hostunu ayıkla (Render dual-write önce). */
export function coerceR2S3Endpoint(raw) {
  return listR2S3EndpointCandidates(raw)[0] || "";
}

function s3BlobText(env) {
  return `${s3EndpointRaw(env) || ""}\n${env?.S3_BUCKET || ""}\n${env?.S3_ACCESS_KEY_ID || ""}\n${env?.S3_PUBLIC_BASE_URL || ""}`;
}

function s3BucketName(env) {
  return coerceS3Bucket(env?.S3_BUCKET, s3BlobText(env));
}

function s3CredentialSets(env) {
  const blob = s3BlobText(env);
  const out = [];
  const seen = new Set();
  const add = (idRaw, secretRaw) => {
    const accessKeyId = coerceS3AccessKeyId(idRaw, blob);
    const secretAccessKey = coerceS3SecretAccessKey(secretRaw, blob);
    if (!accessKeyId || !secretAccessKey) return;
    const k = `${accessKeyId}:${secretAccessKey}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ accessKeyId, secretAccessKey });
  };
  add(env?.S3_ACCESS_KEY_ID, env?.S3_SECRET_ACCESS_KEY);
  add(assignmentFromEnvBlob(blob, "S3_ACCESS_KEY_ID"), assignmentFromEnvBlob(blob, "S3_SECRET_ACCESS_KEY"));
  return out;
}

export function s3MediaEnvReady(env) {
  return Boolean(s3BucketName(env) && s3CredentialSets(env).length > 0 && s3Endpoint(env));
}

function parseDataUrl(dataUrl) {
  const m =
    dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/i) ||
    dataUrl.match(/^data:(application\/pdf);base64,(.+)$/i) ||
    dataUrl.match(/^data:(video\/(?:mp4|webm|ogg));base64,(.+)$/i);
  if (!m) return { error: "Geçersiz data URL (jpeg, png, gif, webp, pdf, mp4, webm veya ogg)" };
  const mime = m[1].toLowerCase();
  const b64 = m[2].replace(/\s/g, "");
  let bytes;
  try {
    const bin = atob(b64);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } catch {
    return { error: "Base64 okunamadı" };
  }
  const maxBytes =
    mime === "application/pdf" ? MAX_BYTES_PDF : mime.startsWith("video/") ? MAX_BYTES_VIDEO : MAX_BYTES_IMAGE;
  if (!bytes.length || bytes.length > maxBytes) {
    return { error: `Dosya çok büyük (en fazla ${maxBytes / 1024 / 1024} MB)` };
  }
  const ext = MIME_EXT[mime];
  if (!ext) return { error: "Desteklenmeyen dosya türü" };
  return { mime, ext, bytes };
}

function objectKey(env, fname) {
  const prefix = normalizeEnvValue(env?.S3_KEY_PREFIX).replace(/^\/+|\/+$/g, "");
  if (prefix && prefix.length <= 80 && !/S3_/i.test(prefix)) return `${prefix}/${fname}`;
  return fname;
}

function publicUploadUrl(fname) {
  return `/api/media/uploads/${fname}`;
}

const UPLOAD_GET_RE = /^\/api\/media\/uploads\/([a-zA-Z0-9._-]+)$/;

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

export function parseMediaUploadFname(pathname) {
  const m = String(pathname || "").match(UPLOAD_GET_RE);
  const name = m?.[1] || null;
  if (!name || name.includes("..")) return null;
  return name;
}

function mimeFromFname(fname) {
  const ext = String(fname).split(".").pop()?.toLowerCase() || "";
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

function s3ClientWithCreds(creds, env) {
  return new AwsClient({
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    service: "s3",
    region: normalizeEnvValue(env?.S3_REGION) || "auto",
  });
}

function s3ObjectUrl(endpoint, env, fname) {
  const bucket = s3BucketName(env);
  const key = objectKey(env, fname);
  return `${endpoint}/${bucket}/${key}`;
}

const R2_PUBLIC_URL_RE = /https?:\/\/pub-[a-f0-9]+\.r2\.dev/gi;

function isPublicHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** r2.dev / özel CDN — S3 API hostu değil. 404 bir dosyayı zehirlemez. */
export function listR2PublicBaseCandidates(env) {
  const out = [];
  const add = (raw) => {
    let v = normalizeEnvValue(raw).replace(/\/+$/, "");
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    try {
      const u = new URL(v);
      if (/\.r2\.cloudflarestorage\.com$/i.test(u.hostname)) return;
      const base = `${u.protocol}//${u.host}`.replace(/\/+$/, "");
      if (!isPublicHttpUrl(base) || out.includes(base)) return;
      out.push(base);
    } catch {
      /* ignore */
    }
  };
  add(env?.S3_PUBLIC_BASE_URL);
  const blob = `${String(env?.S3_PUBLIC_BASE_URL || "")}\n${String(s3EndpointRaw(env) || "")}`;
  for (const m of blob.matchAll(R2_PUBLIC_URL_RE)) add(m[0]);
  return out;
}

/** wrangler.toml `MEDIA_BUCKET` — S3 API TLS (alert 40) olmadan aynı hesaptaki nesneler. */
export function r2Binding(env) {
  const bucket = env?.MEDIA_BUCKET;
  return bucket && typeof bucket.get === "function" ? bucket : null;
}

/**
 * GET/HEAD `/api/media/uploads/:file` → R2. Yoksa null (Container dener).
 * Temmuz 2026 dual-write: dosyalar R2'de olabilir; bozuk S3_ENDPOINT ayıklanır.
 */
export async function handleMediaGetFromR2(request, env) {
  const method = String(request.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return null;
  const fname = parseMediaUploadFname(new URL(request.url).pathname);
  if (!fname) return null;

  const respond = (body, contentType, len, via) => {
    const headers = new Headers();
    headers.set("content-type", contentType || mimeFromFname(fname));
    if (len) headers.set("content-length", len);
    headers.set("cache-control", "public, max-age=86400, stale-while-revalidate=604800");
    headers.set("x-yekpare-frontend", "cloudflare-worker");
    headers.set("x-yekpare-media", via);
    if (method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(body, { status: 200, headers });
  };

  const bound = r2Binding(env);
  if (bound) {
    try {
      const key = objectKey(env, fname);
      if (method === "HEAD") {
        const head = await bound.head(key);
        if (head) {
          return respond(
            null,
            head.httpMetadata?.contentType,
            head.size != null ? String(head.size) : null,
            "r2-binding",
          );
        }
      } else {
        const obj = await bound.get(key);
        if (obj) {
          return respond(
            obj.body,
            obj.httpMetadata?.contentType,
            obj.size != null ? String(obj.size) : null,
            "r2-binding",
          );
        }
      }
    } catch (err) {
      console.error("[media-r2-binding]", String(err?.message || err).slice(0, 160));
    }
  }

  const publicBases = listR2PublicBaseCandidates(env);
  for (const pub of publicBases) {
    try {
      const pubRes = await fetch(`${pub}/${encodeURIComponent(fname)}`, {
        method: method === "HEAD" ? "GET" : method,
        redirect: "follow",
        signal: AbortSignal.timeout(4000),
      });
      const ct = String(pubRes.headers.get("content-type") || "").toLowerCase();
      if (pubRes.ok && !ct.includes("text/html")) {
        const len = pubRes.headers.get("content-length");
        return respond(pubRes.body, pubRes.headers.get("content-type"), len, "r2-public");
      }
    } catch (err) {
      console.error("[media-r2-public]", pub.slice(0, 48), String(err?.message || err).slice(0, 160));
    }
  }

  const creds = s3CredentialSets(env);
  const endpoints = s3EndpointCandidates(env);
  if (creds.length && endpoints.length) {
    for (const cred of creds) {
      const client = s3ClientWithCreds(cred, env);
      for (const endpoint of endpoints) {
        try {
          const res = await client.fetch(s3ObjectUrl(endpoint, env, fname), {
            method,
            signal: AbortSignal.timeout(4000),
          });
          if (res && res.ok) {
            return respond(
              res.body,
              res.headers.get("content-type"),
              res.headers.get("content-length"),
              "r2",
            );
          }
        } catch (err) {
          console.error("[media-r2-get]", endpoint.slice(8, 12), String(err?.message || err).slice(0, 160));
        }
      }
    }
  }

  const miss = new Headers();
  miss.set("x-yekpare-frontend", "cloudflare-worker");
  miss.set("x-yekpare-media", "miss");
  miss.set("x-yekpare-media-ready", s3MediaEnvReady(env) ? "1" : "0");
  miss.set("x-yekpare-media-bucket-len", String(s3BucketName(env).length));
  miss.set("x-yekpare-media-hosts", String(endpoints.length));
  miss.set("cache-control", "no-store");
  return new Response(null, { status: 404, headers: miss });
}

/**
 * @returns {Promise<{ url: string }|{ error: string }>}
 */
export async function saveMediaDataUrlToS3(env, dataUrl, title) {
  const parsed = parseDataUrl(dataUrl);
  if (parsed.error) return { error: parsed.error };

  const fname = `${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}.${parsed.ext}`;
  const key = objectKey(env, fname);
  const bound = r2Binding(env);
  if (bound && typeof bound.put === "function") {
    try {
      await bound.put(key, parsed.bytes, { httpMetadata: { contentType: parsed.mime } });
      return { url: publicUploadUrl(fname) };
    } catch (err) {
      console.error("[media-r2-put]", String(err?.message || err).slice(0, 160));
    }
  }

  const endpoints = s3EndpointCandidates(env);
  const creds = s3CredentialSets(env);
  if (!creds.length || !endpoints.length) {
    return { error: "S3 yapılandırması eksik" };
  }

  let lastDetail = "";
  for (const cred of creds) {
    const client = s3ClientWithCreds(cred, env);
    for (const endpoint of endpoints) {
      const url = s3ObjectUrl(endpoint, env, fname);
      let res;
      try {
        res = await client.fetch(url, {
          method: "PUT",
          body: parsed.bytes,
          headers: {
            "content-type": parsed.mime,
            "content-length": String(parsed.bytes.length),
          },
        });
      } catch (err) {
        lastDetail = `S3 yükleme hatası: ${String(err?.message || err).slice(0, 160)}`;
        continue;
      }

      if (res.ok) {
        return { url: publicUploadUrl(fname) };
      }
      const detail = (await res.text()).trim().slice(0, 200);
      lastDetail = `S3 yükleme reddedildi (HTTP ${res.status})${detail ? `: ${detail}` : ""}`;
    }
  }

  return { error: lastDetail || "S3 yapılandırması eksik" };
}

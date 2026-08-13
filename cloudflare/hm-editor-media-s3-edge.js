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

const R2_API_URL_RE = /https?:\/\/[a-z0-9][a-z0-9.-]*\.r2\.cloudflarestorage\.com/i;
const R2_API_HOST_RE = /(?:^|[\s"'=\n\r])([a-z0-9][a-z0-9.-]*\.r2\.cloudflarestorage\.com)/i;

/** Yapıştırılmış env bloğundan R2 S3 API hostunu ayıkla. */
export function coerceR2S3Endpoint(raw) {
  const v = normalizeEnvValue(raw);
  if (!v) return "";
  const embedded = v.match(R2_API_URL_RE);
  if (embedded?.[0]) {
    return embedded[0].replace(/\/+$/, "").replace(/^http:\/\//i, "https://");
  }
  const bare = v.match(R2_API_HOST_RE);
  if (bare?.[1]) return `https://${bare[1].replace(/\/+$/, "")}`;
  if (v.length > 180) return "";
  const withScheme = /^https?:\/\//i.test(v) ? v.replace(/\/+$/, "") : `https://${v.replace(/\/+$/, "")}`;
  try {
    const host = new URL(withScheme).hostname;
    if (/\.r2\.cloudflarestorage\.com$/i.test(host)) return `https://${host}`;
  } catch {
    return "";
  }
  return withScheme;
}

export function s3MediaEnvReady(env) {
  return Boolean(
    normalizeEnvValue(env?.S3_BUCKET) &&
      normalizeEnvValue(env?.S3_ACCESS_KEY_ID) &&
      normalizeEnvValue(env?.S3_SECRET_ACCESS_KEY) &&
      s3Endpoint(env),
  );
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
  return prefix ? `${prefix}/${fname}` : fname;
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

function s3Client(env) {
  return new AwsClient({
    accessKeyId: normalizeEnvValue(env.S3_ACCESS_KEY_ID),
    secretAccessKey: normalizeEnvValue(env.S3_SECRET_ACCESS_KEY),
    service: "s3",
    region: normalizeEnvValue(env.S3_REGION) || "auto",
  });
}

function s3ObjectUrl(env, fname) {
  const bucket = normalizeEnvValue(env.S3_BUCKET);
  const endpoint = s3Endpoint(env);
  const key = objectKey(env, fname);
  return `${endpoint}/${bucket}/${key}`;
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

  if (s3MediaEnvReady(env)) {
    try {
      const res = await s3Client(env).fetch(s3ObjectUrl(env, fname), { method });
      if (res && res.ok) {
        return respond(
          res.body,
          res.headers.get("content-type"),
          res.headers.get("content-length"),
          "r2",
        );
      }
    } catch (err) {
      console.error("[media-r2-get]", String(err?.message || err).slice(0, 160));
    }
  }

  const pub = normalizeEnvValue(env?.S3_PUBLIC_BASE_URL).replace(/\/+$/, "");
  if (pub && /^https?:\/\//i.test(pub)) {
    try {
      const pubRes = await fetch(`${pub}/${encodeURIComponent(fname)}`, {
        method: method === "HEAD" ? "GET" : method,
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      });
      const ct = String(pubRes.headers.get("content-type") || "").toLowerCase();
      if (pubRes.ok && !ct.includes("text/html")) {
        const len = pubRes.headers.get("content-length");
        return respond(pubRes.body, pubRes.headers.get("content-type"), len, "r2-public");
      }
    } catch (err) {
      console.error("[media-r2-public]", String(err?.message || err).slice(0, 160));
    }
  }

  return null;
}

/**
 * @returns {Promise<{ url: string }|{ error: string }>}
 */
export async function saveMediaDataUrlToS3(env, dataUrl, title) {
  if (!s3MediaEnvReady(env)) {
    return { error: "S3 yapılandırması eksik" };
  }
  const parsed = parseDataUrl(dataUrl);
  if (parsed.error) return { error: parsed.error };

  const fname = `${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}.${parsed.ext}`;
  const bucket = normalizeEnvValue(env.S3_BUCKET);
  const endpoint = s3Endpoint(env);
  const region = normalizeEnvValue(env.S3_REGION) || "auto";
  const key = objectKey(env, fname);

  const client = new AwsClient({
    accessKeyId: normalizeEnvValue(env.S3_ACCESS_KEY_ID),
    secretAccessKey: normalizeEnvValue(env.S3_SECRET_ACCESS_KEY),
    service: "s3",
    region,
  });

  const url = `${endpoint}/${bucket}/${key}`;
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
    return { error: `S3 yükleme hatası: ${String(err?.message || err).slice(0, 160)}` };
  }

  if (!res.ok) {
    const detail = (await res.text()).trim().slice(0, 200);
    return { error: `S3 yükleme reddedildi (HTTP ${res.status})${detail ? `: ${detail}` : ""}` };
  }

  return { url: publicUploadUrl(fname) };
}

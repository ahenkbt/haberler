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

/** fb9f R2 hesabı (Dashboard: fb9fc9dc… 32 hex). Eski kodda fazla 9 vardı (33 karakter → 401). */
export const R2_MEDIA_ACCOUNT_ID = "fb9fc9dc1991b7cc17ba58ab3c2e8726";
const R2_MEDIA_ACCOUNT_ID_TYPO = "fb9f9c9dc1991b7cc17ba58ab3c2e8726";

/** Render dual-write R2 S3 hostu — doğru 32 karakterlik hesap ID. */
export const RENDER_R2_S3_ENDPOINT =
  `https://${R2_MEDIA_ACCOUNT_ID}.r2.cloudflarestorage.com`;

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
    const host = new URL(/^https?:\/\//i.test(n) ? n : `https://${n}`).hostname
      .replace(R2_MEDIA_ACCOUNT_ID_TYPO, R2_MEDIA_ACCOUNT_ID);
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
  add(assignmentFromEnvBlob(blob, "S3_ACCESS_KEY_ID"), assignmentFromEnvBlob(blob, "S3_SECRET_ACCESS_KEY"));
  add(env?.S3_ACCESS_KEY_ID, env?.S3_SECRET_ACCESS_KEY);
  return out;
}

export function r2CfApiToken(env) {
  return normalizeEnvValue(env?.R2_CF_API_TOKEN) || normalizeEnvValue(env?.R2_API_TOKEN);
}

export function r2CfAccountId(env) {
  const n = normalizeEnvValue(env?.R2_ACCOUNT_ID).replace(/[^a-f0-9]/gi, "");
  if (n === R2_MEDIA_ACCOUNT_ID_TYPO) return R2_MEDIA_ACCOUNT_ID;
  if (/^[a-f0-9]{32}$/i.test(n)) return n.toLowerCase();
  return R2_MEDIA_ACCOUNT_ID;
}

function cfApiObjectUrl(account, bucket, key) {
  const path = String(key)
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  return `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${encodeURIComponent(bucket)}/objects/${path}`;
}

async function fetchR2ObjectViaCfApi(env, method, fname, body, mime) {
  const token = r2CfApiToken(env);
  const bucket = s3BucketName(env) || "yekpare-media";
  if (!token || !bucket) return null;
  const account = r2CfAccountId(env);
  const keys = method === "PUT" ? [objectKey(env, fname)] : listMediaObjectKeys(env, fname);
  let last = null;
  for (const key of keys) {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (mime) headers["Content-Type"] = mime;
      last = await fetch(cfApiObjectUrl(account, bucket, key), {
        method,
        headers,
        body: body || undefined,
        signal: AbortSignal.timeout(method === "PUT" ? 15000 : 8000),
      });
      if (last && last.ok) return last;
    } catch (err) {
      console.error("[media-r2-cfapi]", method, String(err?.message || err).slice(0, 160));
    }
  }
  return last;
}

export function s3MediaEnvReady(env) {
  if (s3BucketName(env) && r2CfApiToken(env)) return true;
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
  // Path-style URL zaten /yekpare-media/<dosya> (bucket adı). Ek önek çift yol yapıyordu.
  return fname;
}

/** GET: önce düz dosya adı (GitHub S3 öncesi kapaklar), sonra uploads/ ve yekpare-media/. */
export function listMediaObjectKeys(env, fname) {
  const primary = objectKey(env, fname);
  const keys = [primary];
  if (primary === fname) {
    keys.push(`uploads/${fname}`);
    keys.push(`yekpare-media/${fname}`);
  }
  return keys;
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
    retries: 1,
    initRetryMs: 50,
  });
}

function hostPrefix4(endpoint) {
  return String(endpoint || "").replace(/^https?:\/\//i, "").slice(0, 4);
}

function noteHostAttempt(attempts, endpoint, status) {
  const tag = `${hostPrefix4(endpoint)}:${status}`;
  const host = hostPrefix4(endpoint);
  const idx = attempts.findIndex((a) => a.startsWith(`${host}:`));
  if (idx >= 0) attempts[idx] = tag;
  else attempts.push(tag);
}

function bytesForS3Body(bytes) {
  if (bytes instanceof ArrayBuffer) return bytes;
  if (ArrayBuffer.isView(bytes)) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  return bytes;
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

/** r2.dev / özel CDN — path (`/yekpare-media`) korunur; origin'e indirgenmez. */
export function listR2PublicBaseCandidates(env) {
  const out = [];
  const add = (raw) => {
    let v = normalizeEnvValue(raw).replace(/\/+$/, "");
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    try {
      const u = new URL(v);
      if (/\.r2\.cloudflarestorage\.com$/i.test(u.hostname)) return;
      const origin = `${u.protocol}//${u.host}`.replace(/\/+$/, "");
      if (!isPublicHttpUrl(origin)) return;
      const path = u.pathname.replace(/\/+$/, "");
      const base = path && path !== "/" ? `${origin}${path}` : origin;
      if (!out.includes(base)) out.push(base);
    } catch {
      /* ignore */
    }
  };
  const blob = s3BlobText(env);
  add(assignmentFromEnvBlob(blob, "S3_PUBLIC_BASE_URL"));
  add(env?.S3_PUBLIC_BASE_URL);
  for (const m of blob.matchAll(R2_PUBLIC_URL_RE)) add(m[0]);
  for (const m of blob.matchAll(/https?:\/\/[^\s"'=]+/gi)) {
    if (!/\.r2\.cloudflarestorage\.com/i.test(m[0])) add(m[0]);
  }
  const bucket = s3BucketName(env) || "yekpare-media";
  for (const base of [...out]) {
    try {
      const u = new URL(base);
      const path = u.pathname.replace(/\/+$/, "") || "/";
      if (path === "/" && bucket) add(`${base}/${bucket}`);
    } catch {
      /* ignore */
    }
  }
  return out;
}

/** wrangler.toml `MEDIA_BUCKET` — S3 API TLS (alert 40) olmadan aynı hesaptaki nesneler. */
export function r2Binding(env) {
  const bucket = env?.MEDIA_BUCKET;
  return bucket && typeof bucket.get === "function" ? bucket : null;
}

/** Worker kenar healthz — gizli değer yok; Dashboard vs canlı env ayrımı. */
export function mediaEdgeHealthPayload(env) {
  const blob = s3BlobText(env);
  const endpoints = s3EndpointCandidates(env);
  return {
    ready: s3MediaEnvReady(env),
    bucket: Boolean(s3BucketName(env)),
    accessKey: Boolean(coerceS3AccessKeyId(env?.S3_ACCESS_KEY_ID, blob)),
    secret: Boolean(coerceS3SecretAccessKey(env?.S3_SECRET_ACCESS_KEY, blob)),
    endpointReady: Boolean(s3Endpoint(env)),
    endpointLength: String(s3EndpointRaw(env) || "").length,
    hostPrefix: endpoints[0] ? endpoints[0].slice(8, 12) : null,
    hosts: endpoints.length,
    publicBases: listR2PublicBaseCandidates(env).length,
    cfApiToken: Boolean(r2CfApiToken(env)),
    r2AccountPrefix: r2CfAccountId(env).slice(0, 8),
  };
}

async function probeCfApiFromWorker(env) {
  if (!r2CfApiToken(env)) return { status: "missing" };
  try {
    const res = await fetchR2ObjectViaCfApi(env, "GET", "healthz-probe-object");
    return { status: res ? res.status : 0 };
  } catch {
    return { status: "err" };
  }
}

async function probeS3HostsFromWorker(env) {
  const creds = s3CredentialSets(env)[0];
  const endpoints = s3EndpointCandidates(env);
  const bucket = s3BucketName(env);
  if (!creds || !endpoints.length || !bucket) return [];
  const client = s3ClientWithCreds(creds, env);
  const out = [];
  for (const endpoint of endpoints) {
    try {
      const res = await client.fetch(`${endpoint}/${bucket}/healthz-probe-object`, {
        method: "HEAD",
        signal: AbortSignal.timeout(4000),
      });
      out.push({ host: hostPrefix4(endpoint), status: res ? res.status : 0 });
    } catch (err) {
      const msg = String(err?.message || err);
      out.push({ host: hostPrefix4(endpoint), status: /tls|handshake|EPROTO/i.test(msg) ? "tls" : "err" });
    }
  }
  return out;
}

export async function handleMediaEdgeHealth(request, env) {
  const method = String(request.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return null;
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  if (path !== "/api/healthz/media-edge") return null;
  const payload = mediaEdgeHealthPayload(env);
  if (method === "GET") {
    payload.s3Probe = await probeS3HostsFromWorker(env);
    payload.cfApiProbe = await probeCfApiFromWorker(env);
  }
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-yekpare-frontend": "cloudflare-worker",
      "x-yekpare-media": "health",
    },
  });
}

function edgeBridgeSecret(env) {
  const s = String(env?.HM_EDGE_BRIDGE_SECRET || "").trim();
  return s || "yekpare-hm-kh-bridge-20260727-v1";
}

async function hmacSha256Base64Url(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(message)));
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeEqualString(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (left.length !== right.length) return false;
  let out = 0;
  for (let i = 0; i < left.length; i++) out |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return out === 0;
}

/**
 * Container → Worker R2 yazma. Node OpenSSL R2 S3 API'ye TLS alert 40 verir;
 * Worker fetch aynı nesneyi yazabilir.
 */
export async function handleMediaR2PutProxy(request, env) {
  const method = String(request.method || "GET").toUpperCase();
  if (method !== "POST") return null;
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  if (path !== "/api/media/r2-put-proxy") return null;

  const fname = String(request.headers.get("x-yekpare-r2-fname") || "").trim();
  const mime = String(request.headers.get("x-yekpare-r2-mime") || "application/octet-stream").trim();
  const exp = String(request.headers.get("x-yekpare-r2-exp") || "").trim();
  const nonce = String(request.headers.get("x-yekpare-r2-nonce") || "").trim();
  const sig = String(request.headers.get("x-yekpare-r2-proxy") || "").trim();
  if (!fname || fname.includes("..") || !/^[a-zA-Z0-9._-]+$/.test(fname)) {
    return new Response(JSON.stringify({ error: "Geçersiz dosya adı" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  const expMs = Number(exp);
  if (!Number.isFinite(expMs) || expMs < Date.now() || expMs > Date.now() + 5 * 60_000) {
    return new Response(JSON.stringify({ error: "Köprü oturumu geçersiz" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES_VIDEO) {
    return new Response(JSON.stringify({ error: "Dosya boş veya çok büyük" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  const canonical = `r2-put\n${exp}\n${nonce}\n${fname}\n${mime}\n${bytes.length}`;
  const expected = await hmacSha256Base64Url(edgeBridgeSecret(env), canonical);
  if (!timingSafeEqualString(sig, expected)) {
    return new Response(JSON.stringify({ error: "Kimlik doğrulama gerekli" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  const saved = await putBytesToR2(env, fname, bytes, mime);
  if (saved.error) {
    return new Response(JSON.stringify({ error: saved.error }), {
      status: 502,
      headers: { "content-type": "application/json; charset=utf-8", "x-yekpare-media": "r2-proxy-fail" },
    });
  }
  return new Response(JSON.stringify({ url: saved.url }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-yekpare-frontend": "cloudflare-worker",
      "x-yekpare-media": "r2-proxy",
    },
  });
}

/**
 * GET/HEAD `/api/media/uploads/:file` → R2. Yoksa null (Container dener).
 * Temmuz 2026 dual-write: dosyalar R2'de olabilir; bozuk S3_ENDPOINT ayıklanır.
 * `diag` verilirse miss durumunda lastS3/ready yazılır (404 yanıtına header).
 */
export async function handleMediaGetFromR2(request, env, diag) {
  const method = String(request.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return null;
  const fname = parseMediaUploadFname(new URL(request.url).pathname);
  if (!fname) return null;
  const markMiss = (lastS3) => {
    if (!diag || typeof diag !== "object") return;
    diag.lastS3 = lastS3;
    diag.ready = s3MediaEnvReady(env) ? "1" : "0";
    diag.hosts = s3EndpointCandidates(env).length;
  };

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
      for (const key of listMediaObjectKeys(env, fname)) {
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
      }
    } catch (err) {
      console.error("[media-r2-binding]", String(err?.message || err).slice(0, 160));
    }
  }

  const cfApiGet = await fetchR2ObjectViaCfApi(env, method === "HEAD" ? "GET" : method, fname);
  if (cfApiGet && cfApiGet.ok) {
    const ct = cfApiGet.headers.get("content-type");
    if (!String(ct || "").toLowerCase().includes("application/json")) {
      return respond(
        cfApiGet.body,
        ct,
        cfApiGet.headers.get("content-length"),
        "r2-cfapi",
      );
    }
    // JSON error body — R2 object GET başarılıysa binary döner.
    const peek = await cfApiGet.clone().text().catch(() => "");
    if (peek && !peek.trim().startsWith("{") && !peek.trim().startsWith("<")) {
      return respond(peek, ct || mimeFromFname(fname), String(peek.length), "r2-cfapi");
    }
  }

  const publicBases = listR2PublicBaseCandidates(env);
  const publicPaths = listMediaObjectKeys(env, fname);
  for (const pub of publicBases) {
    for (const key of publicPaths) {
      try {
        const path = key.split("/").map((p) => encodeURIComponent(p)).join("/");
        const pubRes = await fetch(`${pub.replace(/\/+$/, "")}/${path}`, {
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
  }

  const creds = s3CredentialSets(env);
  const endpoints = s3EndpointCandidates(env);
  let lastS3 = "none";
  const attempts = [];
  const keyNames = listMediaObjectKeys(env, fname);
  if (creds.length && endpoints.length) {
    for (const cred of creds) {
      const client = s3ClientWithCreds(cred, env);
      for (const endpoint of endpoints) {
        for (const key of keyNames) {
          const url = `${endpoint}/${s3BucketName(env)}/${key}`;
          try {
            const res = await client.fetch(url, {
              method,
              signal: AbortSignal.timeout(4000),
            });
            lastS3 = `${hostPrefix4(endpoint)}:${res ? res.status : "0"}`;
            noteHostAttempt(attempts, endpoint, res ? res.status : 0);
            if (res && res.ok) {
              return respond(
                res.body,
                res.headers.get("content-type"),
                res.headers.get("content-length"),
                "r2",
              );
            }
          } catch (err) {
            lastS3 = `${hostPrefix4(endpoint)}:tls`;
            noteHostAttempt(attempts, endpoint, "tls");
            console.error("[media-r2-get]", hostPrefix4(endpoint), String(err?.message || err).slice(0, 160));
          }
        }
      }
    }
  }

  const missLabel = attempts.length ? attempts.join(",") : lastS3;
  console.error("[media-r2-miss]", missLabel, "ready", s3MediaEnvReady(env) ? "1" : "0", "hosts", endpoints.length);
  markMiss(missLabel);
  // 404 dönme — Worker.js Container'a düşsün (eski S3 env / public URL).
  return null;
}

async function putBytesToR2(env, fname, bytes, mime) {
  const key = objectKey(env, fname);
  const bound = r2Binding(env);
  if (bound && typeof bound.put === "function") {
    try {
      await bound.put(key, bytes, { httpMetadata: { contentType: mime } });
      return { url: publicUploadUrl(fname) };
    } catch (err) {
      console.error("[media-r2-put]", String(err?.message || err).slice(0, 160));
    }
  }

  const cfPut = await fetchR2ObjectViaCfApi(env, "PUT", fname, bytesForS3Body(bytes), mime);
  if (cfPut && cfPut.ok) {
    return { url: publicUploadUrl(fname) };
  }
  if (cfPut && !cfPut.ok) {
    const detail = (await cfPut.text()).trim().slice(0, 160);
    console.error("[media-r2-cfapi-put]", cfPut.status, detail);
  }

  const endpoints = s3EndpointCandidates(env);
  const creds = s3CredentialSets(env);
  if (!creds.length || !endpoints.length) {
    if (cfPut && !cfPut.ok) {
      return { error: `R2 API HTTP ${cfPut.status}` };
    }
    return { error: "S3 yapılandırması eksik" };
  }

  const body = bytesForS3Body(bytes);
  let lastDetail = "";
  for (const cred of creds) {
    const client = s3ClientWithCreds(cred, env);
    for (const endpoint of endpoints) {
      const url = `${endpoint}/${s3BucketName(env)}/${key}`;
      let res;
      try {
        res = await client.fetch(url, {
          method: "PUT",
          body,
          headers: {
            "content-type": mime,
          },
          signal: AbortSignal.timeout(15000),
        });
      } catch (err) {
        lastDetail = `${hostPrefix4(endpoint)}:tls ${String(err?.message || err).slice(0, 120)}`;
        continue;
      }

      if (res.ok) {
        return { url: publicUploadUrl(fname) };
      }
      const detail = (await res.text()).trim().slice(0, 160);
      lastDetail = `${hostPrefix4(endpoint)}:HTTP ${res.status}${detail ? `: ${detail}` : ""}`;
    }
  }

  return { error: lastDetail || "S3 yapılandırması eksik" };
}

/**
 * @returns {Promise<{ url: string }|{ error: string }>}
 */
export async function saveMediaDataUrlToS3(env, dataUrl, title) {
  const parsed = parseDataUrl(dataUrl);
  if (parsed.error) return { error: parsed.error };

  const fname = `${Date.now()}-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}.${parsed.ext}`;
  return putBytesToR2(env, fname, parsed.bytes, parsed.mime);
}

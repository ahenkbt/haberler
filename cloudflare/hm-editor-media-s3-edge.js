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
    const v = normalizeEnvValue(env?.[key]);
    if (v) return /^https?:\/\//i.test(v) ? v.replace(/\/+$/, "") : `https://${v.replace(/\/+$/, "")}`;
  }
  return "";
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

/**
 * Worker secret / vars → Cloudflare Container process.env.
 * Statik envVars Worker secret'larını (DATABASE_URL, SESSION_SECRET, S3_*)
 * iletmez; start() sırasında açıkça verilmelidir.
 */

import {
  coerceR2S3Endpoint,
  coerceS3AccessKeyId,
  coerceS3Bucket,
  coerceS3SecretAccessKey,
  s3MediaEnvReady,
} from "./hm-editor-media-s3-edge.js";

export const CONTAINER_PORT = 3000;

export const CONTAINER_DEFAULTS = {
  NODE_ENV: "production",
  PORT: String(CONTAINER_PORT),
  LISTEN_HOST: "0.0.0.0",
  MEDIA_STORAGE_MODE: "s3",
  SITE_PUBLIC_ORIGIN: "https://ahenk.net.tr",
  LEGACY_MEDIA_ORIGIN: "0",
  YEKTUBE_DB_READ: "main",
  YEKTUBE_DB_WRITE: "main",
  NEWS_DB_READ: "main",
  NEWS_DB_WRITE: "main",
  USE_NATIVE_AI_CALL: "true",
  PG_POOL_MAX: "15",
  PG_POOL_CONNECTION_TIMEOUT_MS: "8000",
  S3_REGION: "auto",
  S3_FORCE_PATH_STYLE: "true",
};

/** Durable Object / Assets bağlamları — process.env'e kopyalanmaz. */
const SKIP_ENV_KEYS = new Set(["GOALGO_API", "ASSETS"]);

const FORWARD_KEYS = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "S3_ENDPOINT",
  "R2_ENDPOINT",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_REGION",
  "S3_PUBLIC_BASE_URL",
  "S3_FORCE_PATH_STYLE",
  "R2_CF_API_TOKEN",
  "R2_API_TOKEN",
  "R2_ACCOUNT_ID",
  "HM_EDITOR_JWT_SECRET",
  "HM_EDGE_BRIDGE_SECRET",
  "HM_LLM_KEY_SECRET",
  "ADMIN_BOOTSTRAP_EMAIL",
  "ADMIN_BOOTSTRAP_PASSWORD",
  "ADMIN_MAINTENANCE_SECRET",
  "ADMIN_PANEL_PASSWORD",
  "ADMIN_PANEL_USERNAMES",
  "AGENTLABS_URL",
  "CONTAINER_ROLL",
  "NEWS_DATABASE_URL",
  // Ayrı haber DB'si (PHP tema okuması) için Worker secret'ı ile dual yazma açılabilsin; yoksa main/main kalır.
  "NEWS_DB_READ",
  "NEWS_DB_WRITE",
  "YEKTUBE_DATABASE_URL",
  "YEKTUBE_DB_READ",
  "YEKTUBE_DB_WRITE",
  "CORS_ORIGIN",
  "SITE_PUBLIC_ORIGIN",
];

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasDatabaseUrl(workerEnv) {
  return nonEmptyString(workerEnv?.DATABASE_URL);
}

export function hasSessionSecret(workerEnv) {
  return nonEmptyString(workerEnv?.SESSION_SECRET) && workerEnv.SESSION_SECRET.trim().length >= 16;
}

export function hasS3MediaConfig(vars) {
  return s3MediaEnvReady(vars);
}

/**
 * Container start() env: Dockerfile ENV + bu nesne.
 * Worker binding nesneleri atlanır; yalnızca string secret/var kopyalanır.
 */
export function buildContainerEnv(workerEnv = {}) {
  const vars = { ...CONTAINER_DEFAULTS };
  for (const key of FORWARD_KEYS) {
    if (SKIP_ENV_KEYS.has(key)) continue;
    const value = workerEnv[key];
    if (nonEmptyString(value)) vars[key] = value;
  }
  const blob = [vars.S3_ENDPOINT, vars.R2_ENDPOINT, vars.S3_BUCKET, vars.S3_ACCESS_KEY_ID, vars.S3_PUBLIC_BASE_URL]
    .map((v) => String(v ?? ""))
    .join("\n");
  const endpoint = coerceR2S3Endpoint(vars.S3_ENDPOINT) || coerceR2S3Endpoint(vars.R2_ENDPOINT) || coerceR2S3Endpoint(blob);
  if (endpoint) vars.S3_ENDPOINT = endpoint;
  const bucket = coerceS3Bucket(vars.S3_BUCKET, blob);
  if (bucket) vars.S3_BUCKET = bucket;
  const accessKey = coerceS3AccessKeyId(vars.S3_ACCESS_KEY_ID, blob);
  if (accessKey) vars.S3_ACCESS_KEY_ID = accessKey;
  const secret = coerceS3SecretAccessKey(vars.S3_SECRET_ACCESS_KEY, blob);
  if (secret) vars.S3_SECRET_ACCESS_KEY = secret;
  if (!hasS3MediaConfig(vars)) {
    vars.SKIP_MEDIA_STORAGE_CHECK = "1";
  }
  return vars;
}

export function missingContainerBootSecrets(workerEnv = {}) {
  const missing = [];
  if (!hasDatabaseUrl(workerEnv)) missing.push("DATABASE_URL");
  if (!hasSessionSecret(workerEnv)) missing.push("SESSION_SECRET");
  return missing;
}

/** Ayrı haber/yektube DB secret'ları start() anındaki process.env'e kilitlenir; sonraki wrangler secret put sıcak VM'i güncellemez. */
export const CONTAINER_ENV_FINGERPRINT_KEYS = [
  "NEWS_DATABASE_URL",
  "NEWS_DB_WRITE",
  "NEWS_DB_READ",
  "YEKTUBE_DATABASE_URL",
  "YEKTUBE_DB_WRITE",
  "YEKTUBE_DB_READ",
];

const CONTAINER_ENV_FP_STORAGE_KEY = "containerEnvFp";

function fnv1aHex(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/**
 * Secret değerlerini loglamadan, start() env'inin değişip değişmediğini DO storage ile kıyaslamak için.
 * URL'nin kendisi fingerprint'e açık yazılmaz (uzunluk + hash).
 */
export function containerEnvFingerprint(envVars = {}) {
  return CONTAINER_ENV_FINGERPRINT_KEYS.map((key) => {
    const value = String(envVars[key] ?? "");
    return `${key}:${value.length}:${fnv1aHex(value)}`;
  }).join("|");
}

/**
 * Worker secret'ı son start()'tan sonra değiştiyse (veya hiç kaydedilmediyse) çalışan isolate'i durdur.
 * CONTAINER_ROLL artırmadan NEWS_DATABASE_URL gibi sonradan put edilen secret'ların yeni process.env'e düşmesi için.
 */
export async function stopContainerIfEnvFingerprintChanged({
  isRunning,
  stop,
  destroy,
  storage,
  fingerprint,
}) {
  const last = await storage.get(CONTAINER_ENV_FP_STORAGE_KEY);
  if (typeof isRunning !== "function" || !isRunning() || last === fingerprint) return false;
  await stop();
  const deadline = Date.now() + 45_000;
  while (isRunning() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (isRunning() && typeof destroy === "function") {
    await destroy();
  }
  return true;
}

export async function rememberContainerEnvFingerprint(storage, fingerprint) {
  await storage.put(CONTAINER_ENV_FP_STORAGE_KEY, fingerprint);
}

/** Incoming Worker request.signal start()/port wait'i iptal etmesin. */
export function requestWithoutAbort(request) {
  const headers = new Headers(request.headers);
  const method = String(request.method || "GET");
  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD" && request.body) {
    init.body = request.body;
    init.duplex = "half";
  }
  return new Request(request.url, init);
}

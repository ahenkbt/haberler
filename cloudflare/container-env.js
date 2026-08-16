/**
 * Worker secret / vars → Cloudflare Container process.env.
 * Statik envVars Worker secret'larını (DATABASE_URL, SESSION_SECRET, S3_*)
 * iletmez; start() sırasında açıkça verilmelidir.
 */

export const CONTAINER_PORT = 3000;

export const CONTAINER_DEFAULTS = {
  NODE_ENV: "production",
  PORT: String(CONTAINER_PORT),
  LISTEN_HOST: "0.0.0.0",
  MEDIA_STORAGE_MODE: "s3",
  SITE_PUBLIC_ORIGIN: "https://turk.eco",
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
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_REGION",
  "S3_PUBLIC_BASE_URL",
  "S3_FORCE_PATH_STYLE",
  "HM_EDITOR_JWT_SECRET",
  "HM_EDGE_BRIDGE_SECRET",
  "ADMIN_BOOTSTRAP_EMAIL",
  "ADMIN_BOOTSTRAP_PASSWORD",
  "ADMIN_MAINTENANCE_SECRET",
  "AGENTLABS_URL",
  "NEWS_DATABASE_URL",
  "YEKTUBE_DATABASE_URL",
  "CORS_ORIGIN",
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
  return (
    nonEmptyString(vars?.S3_ENDPOINT) &&
    nonEmptyString(vars?.S3_BUCKET) &&
    nonEmptyString(vars?.S3_ACCESS_KEY_ID) &&
    nonEmptyString(vars?.S3_SECRET_ACCESS_KEY)
  );
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

/** Railway / yerel ortam — Yektube Postgres bağlantı URL'si */
export const YEKTUBE_DATABASE_URL_KEYS = [
  "YEKTUBE_DATABASE_URL",
  "YEKTUBE_DATABASE_PRIVATE_URL",
  "YEKTUBE_DATABASE_PUBLIC_URL",
];

export function resolveYektubeDatabaseUrlFromEnv(env = process.env) {
  for (const key of YEKTUBE_DATABASE_URL_KEYS) {
    const v = env[key]?.trim();
    if (v) return v;
  }
  return "";
}

export function hasYektubeDatabaseUrl(env = process.env) {
  return Boolean(resolveYektubeDatabaseUrlFromEnv(env));
}

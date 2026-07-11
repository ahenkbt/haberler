/** Railway Postgres: ana URL yoksa private/public yedeklerini dene. */
const DATABASE_URL_KEYS = [
  "DATABASE_URL",
  "DATABASE_PRIVATE_URL",
  "DATABASE_PUBLIC_URL",
] as const;

/** Haber cluster DB — ayrı Postgres (NEWS_DATABASE_URL). */
const NEWS_DATABASE_URL_KEYS = [
  "NEWS_DATABASE_URL",
  "NEWS_DATABASE_PRIVATE_URL",
  "NEWS_DATABASE_PUBLIC_URL",
] as const;

/** Yektube cluster DB — ayrı Postgres (YEKTUBE_DATABASE_URL). */
const YEKTUBE_DATABASE_URL_KEYS = [
  "YEKTUBE_DATABASE_URL",
  "YEKTUBE_DATABASE_PRIVATE_URL",
  "YEKTUBE_DATABASE_PUBLIC_URL",
] as const;

export function resolveDatabaseUrl(): string {
  for (const key of DATABASE_URL_KEYS) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return "";
}

export function resolveNewsDatabaseUrl(): string {
  for (const key of NEWS_DATABASE_URL_KEYS) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return "";
}

export function resolveYektubeDatabaseUrl(): string {
  for (const key of YEKTUBE_DATABASE_URL_KEYS) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return "";
}

export function requireDatabaseUrl(): string {
  const url = resolveDatabaseUrl();
  if (url) return url;
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database? " +
      "Railway: PostgreSQL servisini goalgo API ile linkleyin; Variables'da DATABASE_URL dolu olmalı. " +
      "Yalnızca DATABASE_PRIVATE_URL varsa da kabul edilir.",
  );
}

export function requireNewsDatabaseUrl(): string {
  const url = resolveNewsDatabaseUrl();
  if (url) return url;
  throw new Error(
    "NEWS_DATABASE_URL must be set. Railway: yeni PostgreSQL servisini goalgo API ile linkleyin; " +
      "Variables'da NEWS_DATABASE_URL dolu olmalı.",
  );
}

export function requireYektubeDatabaseUrl(): string {
  const url = resolveYektubeDatabaseUrl();
  if (url) return url;
  throw new Error(
    "YEKTUBE_DATABASE_URL must be set. Railway: Yektube PostgreSQL servisini goalgo API ile linkleyin; " +
      "Variables'da YEKTUBE_DATABASE_URL dolu olmalı.",
  );
}

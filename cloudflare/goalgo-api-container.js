/**
 * Goalgo Express API — Cloudflare Container (Durable Object).
 * wrangler.toml [[containers]] → goalgo/Dockerfile.cloudflare
 * Neon + R2 secret'ları Worker üzerinden container'a aktarılır.
 */
import { Container } from "@cloudflare/containers";

export class GoalgoApiContainer extends Container {
  defaultPort = 3000;
  sleepAfter = "30m";
  enableInternet = true;

  envVars = {
    NODE_ENV: "production",
    PORT: "3000",
    MEDIA_STORAGE_MODE: "s3",
    SITE_PUBLIC_ORIGIN: "https://turk.eco",
    LEGACY_MEDIA_ORIGIN: "0",
    YEKTUBE_DB_READ: "main",
    YEKTUBE_DB_WRITE: "main",
    NEWS_DB_READ: "main",
    NEWS_DB_WRITE: "main",
    USE_NATIVE_AI_CALL: "true",
    PG_POOL_MAX: "5",
    PG_POOL_CONNECTION_TIMEOUT_MS: "10000",
    S3_REGION: "auto",
  };
}

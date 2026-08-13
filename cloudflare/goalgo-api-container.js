/**
 * Goalgo Express API — Cloudflare Container (Durable Object).
 * wrangler.toml [[containers]] → goalgo/Dockerfile.cloudflare
 * Neon + R2 secret'ları Worker üzerinden container'a aktarılır.
 *
 * İlk açılış (imaj + migrate) 20s varsayılan port timeout'unu aşar;
 * fetch() request.signal ile iptal edilmez.
 */
import { Container } from "@cloudflare/containers";

export class GoalgoApiContainer extends Container {
  defaultPort = 3000;
  requiredPorts = [3000];
  sleepAfter = "30m";
  enableInternet = true;

  envVars = {
    NODE_ENV: "production",
    PORT: "3000",
    LISTEN_HOST: "0.0.0.0",
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

  async fetch(request) {
    try {
      await this.startAndWaitForPorts({
        ports: [this.defaultPort],
        cancellationOptions: {
          instanceGetTimeoutMS: 120_000,
          portReadyTimeoutMS: 180_000,
          waitInterval: 500,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/no Container instance|provisioning/i.test(msg)) {
        return new Response(
          "Container provisioning. Retry in a minute.\n" + msg,
          { status: 503 },
        );
      }
      return new Response(`Failed to start container: ${msg}`, { status: 503 });
    }
    return this.containerFetch(request, this.defaultPort);
  }
}

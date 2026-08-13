/**
 * Goalgo Express API — Cloudflare Container (Durable Object).
 * wrangler.toml [[containers]] → goalgo/Dockerfile.cloudflare
 *
 * Worker secret'ları (DATABASE_URL, SESSION_SECRET, S3_*) otomatik olarak
 * container process.env'e düşmez; start() env ile iletilir.
 * İlk açılış (imaj + migrate) 20s varsayılan port timeout'unu aşar;
 * fetch() request.signal ile iptal edilmez.
 */
import { Container } from "@cloudflare/containers";
import {
  CONTAINER_PORT,
  buildContainerEnv,
  missingContainerBootSecrets,
  requestWithoutAbort,
} from "./container-env.js";

export class GoalgoApiContainer extends Container {
  defaultPort = CONTAINER_PORT;
  requiredPorts = [CONTAINER_PORT];
  sleepAfter = "30m";
  enableInternet = true;

  constructor(ctx, env) {
    super(ctx, env);
    this.envVars = buildContainerEnv(env);
  }

  async fetch(request) {
    const missing = missingContainerBootSecrets(this.env);
    if (missing.length > 0) {
      return new Response(
        `Container cannot start: Worker secret(s) missing: ${missing.join(", ")}\n`,
        { status: 503 },
      );
    }

    const envVars = buildContainerEnv(this.env);
    this.envVars = envVars;

    try {
      await this.startAndWaitForPorts({
        ports: [this.defaultPort],
        startOptions: {
          envVars,
          enableInternet: true,
        },
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
    return this.containerFetch(requestWithoutAbort(request), this.defaultPort);
  }
}

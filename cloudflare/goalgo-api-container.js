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
  containerEnvFingerprint,
  missingContainerBootSecrets,
  rememberContainerEnvFingerprint,
  requestWithoutAbort,
  stopContainerIfEnvFingerprintChanged,
} from "./container-env.js";

/**
 * Boot repairs, resyncs and schedulers run only on instance index 0 ("<roll>-0").
 * Unknown name (unnamed DO) keeps the old behaviour (jobs on).
 */
export function instanceRoleEnv(name) {
  const m = String(name ?? "").match(/-(\d+)$/);
  if (!m) return {};
  return { YK_BACKGROUND_JOBS: m[1] === "0" ? "1" : "0", YK_INSTANCE: m[1] };
}

function withInstanceRole(vars, ctx) {
  let name = "";
  try {
    name = ctx?.id?.name || "";
  } catch {
    name = "";
  }
  return { ...vars, ...instanceRoleEnv(name) };
}

export class GoalgoApiContainer extends Container {
  defaultPort = CONTAINER_PORT;
  requiredPorts = [CONTAINER_PORT];
  sleepAfter = "2h";
  enableInternet = true;

  constructor(ctx, env) {
    super(ctx, env);
    this.envVars = withInstanceRole(buildContainerEnv(env), ctx);
  }

  /**
   * Self-heal (2026-10-09): the Worker calls this when a GET to this instance timed out.
   * If the container does not answer /api/healthz/live within 5 s, or /api/healthz (DB ping) within 8 s while its pool is not queueing, it is stuck (seen live:
   * one of three instances hung every request while the others answered in 1-3 s), so
   * destroy it; the next request boots a fresh one. At most once per 10 minutes.
   */
  async poolSnapshot(ms) {
    try {
      const res = await Promise.race([
        this.containerFetch(new Request("http://container/api/healthz/pool"), this.defaultPort),
        new Promise((r) => setTimeout(() => r(null), ms)),
      ]);
      if (!res || res.status !== 200) return null;
      const body = await res.json().catch(() => null);
      return body?.pool ?? null;
    } catch {
      return null;
    }
  }

  async probeAndRecycle() {
    if (!this.container?.running) return "not-running";
    const last = Number((await this.ctx.storage.get("yk-last-recycle")) || 0);
    if (Date.now() - last < 10 * 60_000) return "cooldown";
    const probeStatus = (path, ms) =>
      Promise.race([
        this.containerFetch(new Request(`http://container${path}`), this.defaultPort)
          .then((r) => {
            r.body?.cancel?.().catch?.(() => {});
            return r.status;
          })
          .catch(() => 0),
        new Promise((r) => setTimeout(() => r(-1), ms)),
      ]);
    let status = await probeStatus("/api/healthz/live", 5_000);
    if (status === 200) {
      // Seen live after #517: /live answers but every DB-bound request (incl. /api/healthz) hangs
      // on this one instance while the others answer in 1-3 s. Check the DB path too.
      const db = await probeStatus("/api/healthz", 8_000);
      if (db === 200) return "healthy";
      // A full pool with a queue is load, not a stuck connection: destroying it moved the whole
      // queue to the other instance plus a cold boot, and both kept recycling every few minutes
      // (2026-10-09 evening). Recycle only when the pool is not queueing (stuck connection) or
      // the diagnostics do not answer at all.
      const pool = await this.poolSnapshot(7_000); // /healthz/pool pings with a 5 s cap
      if (pool && Number(pool.waiting) > 0) return `busy:waiting=${pool.waiting}`;
      status = `db:${db}`;
    }
    await this.ctx.storage.put("yk-last-recycle", Date.now());
    try {
      await this.destroy();
    } catch (err) {
      return `destroy-failed:${String(err?.message || err).slice(0, 80)}`;
    }
    return `recycled:${status}`;
  }

  async fetch(request) {
    if (new URL(request.url).pathname === "/__yk_internal/probe-recycle") {
      return new Response(await this.probeAndRecycle(), { status: 200 });
    }
    const missing = missingContainerBootSecrets(this.env);
    if (missing.length > 0) {
      return new Response(
        `Container cannot start: Worker secret(s) missing: ${missing.join(", ")}\n`,
        { status: 503 },
      );
    }

    const envVars = withInstanceRole(buildContainerEnv(this.env), this.ctx);
    this.envVars = envVars;
    const fingerprint = containerEnvFingerprint(envVars);

    try {
      await this.ctx.blockConcurrencyWhile(async () => {
        await stopContainerIfEnvFingerprintChanged({
          isRunning: () => Boolean(this.container?.running),
          stop: () => this.stop(),
          destroy: () => this.destroy(),
          storage: this.ctx.storage,
          fingerprint,
        });
      });

      let lastErr = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          if (typeof this.start === "function" && !this.container?.running) {
            await this.start({
              envVars,
              enableInternet: true,
            });
          }
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
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : String(err);
          // Slot / not-running yarışı: kısa bekle, yeniden dene
          if (!/not running|try again|no container instance|provisioning/i.test(msg) || attempt === 2) {
            throw err;
          }
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
      if (lastErr) throw lastErr;

      await rememberContainerEnvFingerprint(this.ctx.storage, fingerprint);
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

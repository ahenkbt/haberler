/**
 * Railway production: migrate tamamlanana kadar PORT'ta geçici health yanıtı verir,
 * ardından gerçek API sürecini başlatır (healthcheck "service unavailable" döngüsünü önler).
 * Acil durumda SKIP_DB_MIGRATE=1 ile migration atlanabilir.
 */
import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasYektubeDatabaseUrl } from "./yektube-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const migrateScript = path.join(__dirname, "db-migrate.mjs");
const serverEntry = path.join(apiRoot, "dist/index.mjs");

const LISTEN_MARKER = "Server listening";
const MAIN_BOOT_TIMEOUT_MS = Number(process.env.API_MAIN_BOOT_TIMEOUT_MS) || 180_000;

function resolvePort() {
  const raw = process.env.PORT;
  const port = Number(raw);
  if (!raw || Number.isNaN(port) || port <= 0) {
    console.error("[start-production] PORT environment variable is required");
    process.exit(1);
  }
  return port;
}

function resolveListenHost() {
  return process.env.LISTEN_HOST?.trim() || "0.0.0.0";
}

function isReadinessPath(url) {
  const p = (url ?? "").split("?")[0] ?? "";
  return p === "/api/healthz" || p === "/api/healthz/live" || p === "/api/health";
}

function isBootDebugPath(url) {
  const p = (url ?? "").split("?")[0] ?? "";
  return p === "/" || p === "/api/bootz";
}

function startBootProbe(port, host) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (isReadinessPath(req.url)) {
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ status: "ok", boot: "migrating" }));
        return;
      }
      if (isBootDebugPath(req.url)) {
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ status: "ok", boot: "migrating" }));
        return;
      }
      res.writeHead(503, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ status: "starting" }));
    });
    server.on("error", reject);
    server.listen(port, host, () => {
      console.log(`[start-production] boot probe ${host}:${port} (migrate sırasında healthcheck)`);
      resolve(server);
    });
  });
}

function runMigrate() {
  if (process.env.SKIP_DB_MIGRATE === "1") {
    console.warn("[start-production] SKIP_DB_MIGRATE=1 — migrasyon atlandı");
    return;
  }
  console.log("[start-production] db-migrate başlatılıyor");
  const result = spawnSync(process.execPath, [migrateScript], {
    stdio: "inherit",
    env: process.env,
    cwd: apiRoot,
  });
  if (result.error) {
    console.error("[start-production] db-migrate spawn hatası:", result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error("[start-production] db-migrate başarısız", {
      code: result.status,
      signal: result.signal,
    });
    process.exit(result.status ?? 1);
  }
  console.log("[start-production] db-migrate tamam");
}

function runNewsDbMigrate() {
  if (process.env.SKIP_NEWS_DB_MIGRATE === "1") {
    console.warn("[start-production] SKIP_NEWS_DB_MIGRATE=1 — haber migrasyonu atlandı");
    return;
  }
  if (!process.env.NEWS_DATABASE_URL?.trim()) {
    return;
  }
  const newsMigrateScript = path.join(__dirname, "news-db-migrate.mjs");
  console.log("[start-production] news-db-migrate başlatılıyor");
  const result = spawnSync(process.execPath, [newsMigrateScript], {
    stdio: "inherit",
    env: process.env,
    cwd: apiRoot,
  });
  if (result.error) {
    console.error("[start-production] news-db-migrate spawn hatası:", result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error("[start-production] news-db-migrate başarısız", {
      code: result.status,
      signal: result.signal,
    });
    process.exit(result.status ?? 1);
  }
  console.log("[start-production] news-db-migrate tamam");
}

function runNewsDataMigrateIfNeeded() {
  if (process.env.SKIP_NEWS_DATA_MIGRATE === "1") {
    console.warn("[start-production] news-data-migrate SKIP_NEWS_DATA_MIGRATE=1 — haber veri taşıma atlandı");
    return;
  }
  const hasNewsDatabaseUrl = [
    process.env.NEWS_DATABASE_URL,
    process.env.NEWS_DATABASE_PRIVATE_URL,
    process.env.NEWS_DATABASE_PUBLIC_URL,
  ].some((value) => value?.trim());
  if (!hasNewsDatabaseUrl) {
    console.warn("[start-production] news-data-migrate NEWS_DATABASE_URL yok — haber veri taşıma atlandı");
    return;
  }
  const dataScript = path.join(__dirname, "migrate-news-data-to-cluster.mjs");
  console.log("[start-production] news-data-migrate başlatılıyor");
  const result = spawnSync(process.execPath, [dataScript], {
    stdio: "inherit",
    env: process.env,
    cwd: apiRoot,
  });
  if (result.error) {
    console.warn("[start-production] news-data-migrate spawn hatası:", result.error);
    return;
  }
  if (result.status !== 0) {
    console.warn("[start-production] news-data-migrate atlandı veya hata (API yine açılır)", {
      code: result.status,
      signal: result.signal,
    });
    return;
  }
  console.log("[start-production] news-data-migrate tamam");
}

function runYektubeDbMigrate() {
  if (process.env.SKIP_YEKTUBE_DB_MIGRATE === "1") {
    console.warn("[start-production] SKIP_YEKTUBE_DB_MIGRATE=1 — yektube migrasyonu atlandı");
    return;
  }
  if (!hasYektubeDatabaseUrl()) {
    return;
  }
  const yektubeMigrateScript = path.join(__dirname, "yektube-db-migrate.mjs");
  console.log("[start-production] yektube-db-migrate başlatılıyor");
  const result = spawnSync(process.execPath, [yektubeMigrateScript], {
    stdio: "inherit",
    env: process.env,
    cwd: apiRoot,
  });
  if (result.error) {
    console.error("[start-production] yektube-db-migrate spawn hatası:", result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error("[start-production] yektube-db-migrate başarısız (API yine açılır — YEKTUBE_DB_READ=main veya shell ile migrate)", {
      code: result.status,
      signal: result.signal,
    });
    return;
  }
  console.log("[start-production] yektube-db-migrate tamam");
}

function runYektubeDataMigrateIfNeeded() {
  if (process.env.SKIP_YEKTUBE_DATA_MIGRATE === "1") {
    console.warn("[start-production] SKIP_YEKTUBE_DATA_MIGRATE=1 — yektube veri taşıma atlandı");
    return;
  }
  if (!hasYektubeDatabaseUrl()) {
    console.warn("[start-production] yektube-data-migrate YEKTUBE_DATABASE_URL yok — atlandı");
    return;
  }
  const dataScript = path.join(__dirname, "migrate-yektube-data-to-cluster.mjs");
  console.log("[start-production] yektube-data-migrate arka planda başlatılıyor");
  const child = spawn(process.execPath, [dataScript], {
    stdio: "inherit",
    env: process.env,
    cwd: apiRoot,
  });
  child.on("error", (err) => {
    console.warn("[start-production] yektube-data-migrate spawn hatası:", err);
  });
  child.on("exit", (code, signal) => {
    if (code === 0) {
      console.log("[start-production] yektube-data-migrate tamam");
      return;
    }
    console.warn("[start-production] yektube-data-migrate atlandı veya hata (API çalışmaya devam eder)", {
      code,
      signal,
    });
  });
}

async function runPostMigrateJobs() {
  const jobsEntry = path.join(apiRoot, "dist/post-migrate-jobs.mjs");
  try {
    const mod = await import(jobsEntry);
    if (typeof mod.runPostMigrateJobs === "function") {
      console.log("[start-production] post-migrate işleri başlatılıyor");
      await mod.runPostMigrateJobs();
      console.log("[start-production] post-migrate işleri tamam");
    }
  } catch (err) {
    console.warn(
      "[start-production] post-migrate atlandı veya hata:",
      err instanceof Error ? err.message : err,
    );
  }
}

function closeProbe(probe) {
  return new Promise((resolve, reject) => {
    probe.close((err) => (err ? reject(err) : resolve()));
  });
}

async function main() {
  const port = resolvePort();
  const host = resolveListenHost();
  const probe = await startBootProbe(port, host);

  try {
    runMigrate();
    runNewsDbMigrate();
    runNewsDataMigrateIfNeeded();
    runYektubeDbMigrate();
  } catch (err) {
    console.error("[start-production] migrate hatası:", err);
    await closeProbe(probe).catch(() => {});
    process.exit(1);
  }

  await closeProbe(probe);
  console.log("[start-production] boot probe kapatıldı — API başlatılıyor");

  const bootTimer = setTimeout(() => {
    console.error(
      `[start-production] API ${MAIN_BOOT_TIMEOUT_MS}ms içinde dinlemeye geçmedi (${LISTEN_MARKER} yok)`,
    );
    process.exit(1);
  }, MAIN_BOOT_TIMEOUT_MS);
  bootTimer.unref();

  const server = spawn(process.execPath, ["--enable-source-maps", serverEntry], {
    stdio: ["inherit", "pipe", "inherit"],
    env: process.env,
    cwd: apiRoot,
  });

  server.stdout?.on("data", (chunk) => {
    process.stdout.write(chunk);
    const text = chunk.toString();
    if (text.includes(LISTEN_MARKER)) {
      clearTimeout(bootTimer);
      setImmediate(() => {
        runYektubeDataMigrateIfNeeded();
        void runPostMigrateJobs().catch((err) => {
          console.warn(
            "[start-production] post-migrate arka plan hatası:",
            err instanceof Error ? err.message : err,
          );
        });
      });
    }
  });

  server.on("error", (err) => {
    console.error("[start-production] API spawn hatası:", err);
    process.exit(1);
  });

  server.on("exit", (code, signal) => {
    clearTimeout(bootTimer);
    if (signal) {
      console.error("[start-production] API sinyalle kapandı", signal);
      process.exit(1);
    }
    process.exit(code ?? 0);
  });

  for (const sig of ["SIGTERM", "SIGINT"]) {
    process.on(sig, () => {
      server.kill(sig);
    });
  }
}

void main();

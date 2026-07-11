import { randomUUID } from "node:crypto";
import { db, mapBusinessesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  scrapeInsaatfirmalarimBatch,
  scrapeInsaatfirmalarimPair,
  checkInsaatfirmalarimRobots,
  resolveInsaatfirmalarimScrapePairs,
  INSAATFIRMALARIM_CATEGORIES,
  INSAATFIRMALARIM_CITIES,
  type InsaatfirmalarimScrapedFirm,
  type InsaatfirmalarimScrapeMode,
} from "./insaatfirmalarim-scraper.js";
import { importInsaatfirmalarimFirms, importInsaatfirmalarimFirm } from "./insaatfirmalarim-import.js";

export type InsaatfirmalarimJobStatus = "queued" | "running" | "done" | "error";

export type InsaatfirmalarimJob = {
  id: string;
  batchId?: string;
  status: InsaatfirmalarimJobStatus;
  autoImport: boolean;
  options: {
    mode?: InsaatfirmalarimScrapeMode;
    categorySlug?: string;
    categorySlugs?: string[];
    citySlug?: string;
    maxFirms?: number;
    geocode: boolean;
  };
  progress: {
    discovered: number;
    scraped: number;
    imported: number;
    updated: number;
    skipped: number;
    listPages?: number;
  };
  firms: InsaatfirmalarimScrapedFirm[];
  errors: string[];
  message: string;
  createdAt: string;
  updatedAt: string;
};

const jobs = new Map<string, InsaatfirmalarimJob>();
const queue: string[] = [];
let workerRunning = false;
let currentJobId: string | null = null;
let currentJobStartedAt: number | null = null;
let lastWorkerError: string | null = null;

const INSAATFIRMALARIM_JOB_TIMEOUT_MS = Math.max(
  60_000,
  Number(process.env.INSAATFIRMALARIM_JOB_TIMEOUT_MS) || 25 * 60_000,
);
const INSAATFIRMALARIM_STUCK_JOB_MS = INSAATFIRMALARIM_JOB_TIMEOUT_MS + 2 * 60_000;
const INSAATFIRMALARIM_GHOST_RUNNING_MS = Math.max(90_000, INSAATFIRMALARIM_JOB_TIMEOUT_MS / 4);
const INSAATFIRMALARIM_WATCHDOG_MS = Math.max(
  10_000,
  Number(process.env.INSAATFIRMALARIM_WATCHDOG_MS) || 20_000,
);

async function withInsaatfirmalarimJobTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} zaman aşımı (${Math.round(ms / 60_000)} dk)`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function reconcileInsaatfirmalarimQueue(): void {
  const inQueue = new Set(queue);
  for (const job of jobs.values()) {
    if (job.status === "queued" && !inQueue.has(job.id)) queue.push(job.id);
  }
}

function isInsaatfirmalarimRunningJobStale(job: InsaatfirmalarimJob, now = Date.now()): boolean {
  const startedMs = job.id === currentJobId && currentJobStartedAt != null
    ? currentJobStartedAt
    : new Date(job.updatedAt).getTime();
  return Number.isFinite(startedMs) && now - startedMs >= INSAATFIRMALARIM_GHOST_RUNNING_MS;
}

/** "running" görünüp worker tarafından işlenmeyen hayalet işleri yeniden kuyruğa alır. */
function recoverGhostRunningInsaatfirmalarimJobs(opts?: { batchId?: string }): number {
  const batchFilter = opts?.batchId?.trim() || undefined;
  const now = Date.now();
  let recovered = 0;
  for (const job of jobs.values()) {
    if (job.status !== "running") continue;
    if (batchFilter && job.batchId !== batchFilter) continue;
    const activelyProcessed = job.id === currentJobId && workerRunning && !isInsaatfirmalarimRunningJobStale(job, now);
    if (activelyProcessed) continue;
    job.status = "queued";
    job.message = "Yeniden kuyruğa alındı (hayalet iş kurtarıldı)";
    touch(job);
    recovered += 1;
  }
  if (currentJobId) {
    const active = jobs.get(currentJobId);
    if (!active || active.status !== "running") {
      currentJobId = null;
      currentJobStartedAt = null;
    } else if (!workerRunning || isInsaatfirmalarimRunningJobStale(active, now)) {
      currentJobId = null;
      currentJobStartedAt = null;
    }
  }
  return recovered;
}

function unlockStuckInsaatfirmalarimWorker(): void {
  const now = Date.now();
  if (workerRunning && !currentJobId) {
    workerRunning = false;
    lastWorkerError = lastWorkerError ?? "Worker kilitlenmesi kurtarıldı";
    return;
  }
  if (
    workerRunning
    && currentJobStartedAt != null
    && now - currentJobStartedAt > INSAATFIRMALARIM_JOB_TIMEOUT_MS + 60_000
  ) {
    workerRunning = false;
    currentJobId = null;
    currentJobStartedAt = null;
    lastWorkerError = lastWorkerError ?? "Worker zaman aşımı kilidi kurtarıldı";
  }
}

function ensureInsaatfirmalarimWorkerActive(): void {
  recoverGhostRunningInsaatfirmalarimJobs();
  reconcileInsaatfirmalarimQueue();
  unlockStuckInsaatfirmalarimWorker();
  if (!workerRunning && queue.length > 0) void runWorker();
}

function recoverStuckInsaatfirmalarimJobs(): number {
  const now = Date.now();
  let recovered = 0;
  for (const job of jobs.values()) {
    if (job.status !== "running") continue;
    const started = new Date(job.updatedAt).getTime();
    if (!Number.isFinite(started) || now - started < INSAATFIRMALARIM_STUCK_JOB_MS) continue;
    job.status = "error";
    job.message = `İş takıldı — ${Math.round((now - started) / 60_000)} dk sonra kurtarıldı`;
    job.errors.push(job.message);
    touch(job);
    recovered += 1;
  }
  if (currentJobId && jobs.get(currentJobId)?.status !== "running") {
    currentJobId = null;
    currentJobStartedAt = null;
  }
  return recovered;
}

function touch(job: InsaatfirmalarimJob): void {
  job.updatedAt = new Date().toISOString();
}

function normalizeMaxFirms(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(50_000, Math.floor(n));
}

async function runSingleInsaatfirmalarimJob(job: InsaatfirmalarimJob): Promise<void> {
  job.status = "running";
  job.message = "Kazıma başladı";
  currentJobId = job.id;
  currentJobStartedAt = Date.now();
  touch(job);
  try {
    const robots = await checkInsaatfirmalarimRobots();
    if (!robots.ok) throw new Error(robots.message);

    const { categorySlug, citySlug, mode } = job.options;
    let batch: { firms: InsaatfirmalarimScrapedFirm[]; discovered: number; errors: string[] };

    if (mode && categorySlug && citySlug) {
      const importCap = job.options.maxFirms;
      batch = await scrapeInsaatfirmalarimPair(categorySlug, citySlug, {
        maxFirms: job.options.maxFirms,
        geocode: job.options.geocode,
        onProgress: (msg) => {
          job.message = msg;
          const pageMatch = /Liste sayfa (\d+)\/(\d+)/.exec(msg);
          if (pageMatch) job.progress.listPages = parseInt(pageMatch[1]!, 10) || undefined;
          touch(job);
        },
        onFirmScraped: job.autoImport
          ? async (firm) => {
              const used = job.progress.imported + job.progress.updated;
              if (importCap != null && importCap > 0 && used >= importCap) return;
              const row = await importInsaatfirmalarimFirm(firm, {
                maxToImport: importCap,
                currentTotal: used,
              });
              job.progress.scraped += 1;
              job.progress.imported += row.imported;
              job.progress.updated += row.updated;
              job.progress.skipped += row.skipped;
              if (row.error) job.errors.push(row.error);
              touch(job);
            }
          : undefined,
      });
    } else {
      batch = await scrapeInsaatfirmalarimBatch({
        mode: job.options.mode,
        categorySlug: job.options.categorySlug,
        categorySlugs: job.options.categorySlugs,
        citySlug: job.options.citySlug,
        maxFirms: job.options.maxFirms,
        geocode: job.options.geocode,
        onProgress: (msg) => {
          job.message = msg;
          touch(job);
        },
      });
    }

    job.progress.discovered = batch.discovered;
    if (!job.autoImport || !(mode && categorySlug && citySlug)) {
      job.progress.scraped = batch.firms.length;
    }
    job.firms = batch.firms.slice(0, 10);
    job.errors.push(...batch.errors.slice(0, 30));

    if (job.autoImport && batch.firms.length > 0 && !(mode && categorySlug && citySlug)) {
      const imp = await importInsaatfirmalarimFirms(batch.firms, {
        maxToImport: job.options.maxFirms,
      });
      job.progress.imported = imp.imported;
      job.progress.updated = imp.updated;
      job.progress.skipped = imp.skipped;
      job.errors.push(...imp.errors.slice(0, 20));
      if (imp.samples.length) job.firms = imp.samples;
    } else if (job.autoImport && batch.firms.length > 0 && mode && categorySlug && citySlug) {
      if (batch.firms.length) job.firms = batch.firms.slice(0, 5);
    }

    job.status = "done";
    job.message = `${job.progress.scraped} firma çekildi${job.autoImport ? `, ${job.progress.imported} yeni, ${job.progress.updated} güncellendi` : ""}${job.progress.skipped ? `, ${job.progress.skipped} atlandı` : ""}`;
  } catch (err) {
    job.status = "error";
    job.message = err instanceof Error ? err.message : String(err);
    job.errors.push(job.message);
    lastWorkerError = job.message;
  } finally {
    currentJobId = null;
    currentJobStartedAt = null;
    touch(job);
  }
}

function dequeueNextInsaatfirmalarimJobId(): string | null {
  reconcileInsaatfirmalarimQueue();
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) break;
    const job = jobs.get(id);
    if (!job) continue;
    if (job.status === "queued") return id;
  }
  return null;
}

async function runWorker(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;
  try {
    recoverStuckInsaatfirmalarimJobs();
    recoverGhostRunningInsaatfirmalarimJobs();
    while (true) {
      const id = dequeueNextInsaatfirmalarimJobId();
      if (!id) break;
      const job = jobs.get(id);
      if (!job || job.status !== "queued") continue;
      const label = `${job.options.citySlug ?? "?"}/${job.options.categorySlug ?? "?"}`;
      await withInsaatfirmalarimJobTimeout(
        runSingleInsaatfirmalarimJob(job),
        INSAATFIRMALARIM_JOB_TIMEOUT_MS,
        `insaatfirmalarim ${label}`,
      ).catch((err) => {
        if (job.status === "running") {
          job.status = "error";
          job.message = err instanceof Error ? err.message : String(err);
          job.errors.push(job.message);
          lastWorkerError = job.message;
          touch(job);
        }
      });
    }
  } finally {
    workerRunning = false;
    currentJobId = null;
    currentJobStartedAt = null;
    reconcileInsaatfirmalarimQueue();
    if (queue.some((id) => jobs.get(id)?.status === "queued")) void runWorker();
  }
}

function createJob(
  input: {
    batchId?: string;
    mode?: InsaatfirmalarimScrapeMode;
    categorySlug?: string;
    categorySlugs?: string[];
    citySlug?: string;
    maxFirms?: number;
    geocode?: boolean;
    autoImport?: boolean;
  },
  opts?: { prepend?: boolean },
): InsaatfirmalarimJob {
  const job: InsaatfirmalarimJob = {
    id: randomUUID(),
    batchId: input.batchId,
    status: "queued",
    autoImport: Boolean(input.autoImport),
    options: {
      mode: input.mode,
      categorySlug: input.categorySlug?.trim() || undefined,
      categorySlugs: Array.isArray(input.categorySlugs)
        ? input.categorySlugs.map((s) => String(s).trim()).filter(Boolean)
        : undefined,
      citySlug: input.citySlug?.trim() || undefined,
      maxFirms: normalizeMaxFirms(input.maxFirms),
      geocode: input.geocode !== false,
    },
    progress: { discovered: 0, scraped: 0, imported: 0, updated: 0, skipped: 0 },
    firms: [],
    errors: [],
    message: "Kuyrukta",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  jobs.set(job.id, job);
  if (opts?.prepend) queue.unshift(job.id);
  else queue.push(job.id);
  return job;
}

/** Tek iş kuyruğu (pilot / legacy). */
export function enqueueInsaatfirmalarimJob(input: {
  mode?: InsaatfirmalarimScrapeMode;
  categorySlug?: string;
  categorySlugs?: string[];
  citySlug?: string;
  maxFirms?: number;
  geocode?: boolean;
  autoImport?: boolean;
}): InsaatfirmalarimJob {
  const job = createJob(input);
  void runWorker();
  return job;
}

export type InsaatfirmalarimJobBatch = {
  batchId: string;
  mode: InsaatfirmalarimScrapeMode;
  citySlug?: string;
  categorySlug?: string;
  jobCount: number;
  jobIds: string[];
  jobs: InsaatfirmalarimJob[];
};

/** İl bazlı → 29 kategori işi; kategori bazlı → 81 il işi. */
export function enqueueInsaatfirmalarimJobsFromMode(input: {
  mode: InsaatfirmalarimScrapeMode;
  citySlug?: string;
  categorySlug?: string;
  maxFirms?: number;
  geocode?: boolean;
  autoImport?: boolean;
  /** true = yeni batch kuyruğun başına alınır (eski bekleyen işlerin önüne). */
  priority?: boolean;
}): InsaatfirmalarimJobBatch {
  const pairs = resolveInsaatfirmalarimScrapePairs(input);
  const batchId = randomUUID();
  const created: InsaatfirmalarimJob[] = [];
  const prepend = Boolean(input.priority);

  for (let i = pairs.length - 1; i >= 0; i--) {
    const { category, city } = pairs[i]!;
    created.unshift(
      createJob(
        {
          batchId,
          mode: input.mode,
          categorySlug: category.slug,
          citySlug: city.slug,
          maxFirms: input.maxFirms,
          geocode: input.geocode,
          autoImport: input.autoImport,
        },
        { prepend },
      ),
    );
  }

  void runWorker();

  return {
    batchId,
    mode: input.mode,
    citySlug: input.citySlug,
    categorySlug: input.categorySlug,
    jobCount: created.length,
    jobIds: created.map((j) => j.id),
    jobs: created,
  };
}

export function getInsaatfirmalarimJob(id: string): InsaatfirmalarimJob | null {
  return jobs.get(id) ?? null;
}

export function listInsaatfirmalarimJobs(limit = 20): InsaatfirmalarimJob[] {
  return [...jobs.values()]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}

export type InsaatfirmalarimBatchStatus = {
  batchId: string;
  jobCount: number;
  queued: number;
  running: number;
  done: number;
  error: number;
  progress: {
    discovered: number;
    scraped: number;
    imported: number;
    updated: number;
    skipped: number;
  };
  jobs: InsaatfirmalarimJob[];
};

export type InsaatfirmalarimQueueJobRow = {
  id: string;
  batchId?: string;
  city: string;
  citySlug: string;
  category: string;
  categorySlug: string;
  status: InsaatfirmalarimJobStatus;
  firmsFound: number;
  firmsImported: number;
  firmsUpdated: number;
  pagesScraped: number;
  errors: string[];
  errorCount: number;
  remaining: number;
  message: string;
};

export type InsaatfirmalarimQueueStatus = {
  workerRunning: boolean;
  queueDepth: number;
  /** Bellek içi kuyruk dizisi uzunluğu (reconcile sonrası). */
  inMemoryQueueDepth: number;
  /** Bekleyen iş var ama worker çalışmıyor — resume/recover önerilir. */
  needsResume: boolean;
  currentJob: {
    id: string;
    city: string;
    category: string;
    message: string;
    runningMs: number;
  } | null;
  lastWorkerError: string | null;
  jobTimeoutMinutes: number;
  summary: { done: number; running: number; queued: number; error: number; total: number };
  batches: Array<{
    batchId: string;
    jobCount: number;
    done: number;
    running: number;
    queued: number;
    error: number;
    imported: number;
  }>;
  jobs: InsaatfirmalarimQueueJobRow[];
  totalsByCity: Array<{ citySlug: string; city: string; imported: number; scraped: number }>;
};

function cityLabel(slug: string | undefined): string {
  if (!slug) return "—";
  return INSAATFIRMALARIM_CITIES.find((c) => c.slug === slug)?.label ?? slug;
}

function categoryLabel(slug: string | undefined): string {
  if (!slug) return "—";
  return INSAATFIRMALARIM_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

function formatQueueJobRow(job: InsaatfirmalarimJob, remaining: number): InsaatfirmalarimQueueJobRow {
  const citySlug = job.options.citySlug ?? "";
  const categorySlug = job.options.categorySlug ?? "";
  return {
    id: job.id,
    batchId: job.batchId,
    city: cityLabel(citySlug),
    citySlug,
    category: categoryLabel(categorySlug),
    categorySlug,
    status: job.status,
    firmsFound: job.progress.discovered || job.progress.scraped,
    firmsImported: job.progress.imported,
    firmsUpdated: job.progress.updated,
    pagesScraped: job.progress.listPages ?? 0,
    errors: job.errors.slice(0, 5),
    errorCount: job.errors.length,
    remaining,
    message: job.message,
  };
}

export function getInsaatfirmalarimQueueStatus(opts?: {
  batchId?: string;
  limit?: number;
}): InsaatfirmalarimQueueStatus {
  ensureInsaatfirmalarimWorkerActive();
  const limit = Math.max(1, Math.min(500, opts?.limit ?? 200));
  const batchFilter = opts?.batchId?.trim() || undefined;
  const allJobs: InsaatfirmalarimJob[] = [...jobs.values()];
  const filtered = batchFilter ? allJobs.filter((j: InsaatfirmalarimJob) => j.batchId === batchFilter) : allJobs;

  const queuePositions = new Map<string, number>();
  queue.forEach((id, idx) => queuePositions.set(id, idx + 1));

  const jobRows = filtered
    .sort((a: InsaatfirmalarimJob, b: InsaatfirmalarimJob) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit)
    .map((j: InsaatfirmalarimJob) => formatQueueJobRow(j, j.status === "queued" ? (queuePositions.get(j.id) ?? queue.length) : 0));

  const summary = {
    done: filtered.filter((j) => j.status === "done").length,
    running: filtered.filter((j) => j.status === "running").length,
    queued: filtered.filter((j) => j.status === "queued").length,
    error: filtered.filter((j) => j.status === "error").length,
    total: filtered.length,
  };

  const batchMap = new Map<string, InsaatfirmalarimQueueStatus["batches"][number]>();
  for (const j of filtered) {
    const bid = j.batchId ?? j.id;
    const row = batchMap.get(bid) ?? {
      batchId: bid,
      jobCount: 0,
      done: 0,
      running: 0,
      queued: 0,
      error: 0,
      imported: 0,
    };
    row.jobCount += 1;
    if (j.status === "done") row.done += 1;
    else if (j.status === "running") row.running += 1;
    else if (j.status === "queued") row.queued += 1;
    else if (j.status === "error") row.error += 1;
    row.imported += j.progress.imported;
    batchMap.set(bid, row);
  }

  const cityTotals = new Map<string, { citySlug: string; city: string; imported: number; scraped: number }>();
  for (const j of filtered) {
    const slug = j.options.citySlug ?? "";
    if (!slug) continue;
    const row = cityTotals.get(slug) ?? { citySlug: slug, city: cityLabel(slug), imported: 0, scraped: 0 };
    row.imported += j.progress.imported;
    row.scraped += j.progress.scraped;
    cityTotals.set(slug, row);
  }

  let currentJob: InsaatfirmalarimQueueStatus["currentJob"] = null;
  if (currentJobId) {
    const active = jobs.get(currentJobId);
    if (active && active.status === "running") {
      currentJob = {
        id: active.id,
        city: cityLabel(active.options.citySlug),
        category: categoryLabel(active.options.categorySlug),
        message: active.message,
        runningMs: currentJobStartedAt ? Math.max(0, Date.now() - currentJobStartedAt) : 0,
      };
    }
  }

  const scopedQueueDepth = batchFilter ? summary.queued : queue.length;
  const inMemoryQueueDepth = queue.length;

  return {
    workerRunning,
    queueDepth: Math.max(inMemoryQueueDepth, scopedQueueDepth),
    inMemoryQueueDepth,
    needsResume: summary.queued > 0 && !workerRunning && currentJob == null,
    currentJob,
    lastWorkerError,
    jobTimeoutMinutes: Math.round(INSAATFIRMALARIM_JOB_TIMEOUT_MS / 60_000),
    summary,
    batches: [...batchMap.values()].sort((a, b) => b.jobCount - a.jobCount),
    jobs: jobRows,
    totalsByCity: [...cityTotals.values()].sort((a, b) => b.imported - a.imported),
  };
}

export function getInsaatfirmalarimBatchStatus(batchId: string): InsaatfirmalarimBatchStatus | null {
  const batchJobs = [...jobs.values()].filter((j) => j.batchId === batchId);
  if (!batchJobs.length) return null;
  const progress = { discovered: 0, scraped: 0, imported: 0, updated: 0, skipped: 0 };
  for (const j of batchJobs) {
    progress.discovered += j.progress.discovered;
    progress.scraped += j.progress.scraped;
    progress.imported += j.progress.imported;
    progress.updated += j.progress.updated;
    progress.skipped += j.progress.skipped;
  }
  return {
    batchId,
    jobCount: batchJobs.length,
    queued: batchJobs.filter((j) => j.status === "queued").length,
    running: batchJobs.filter((j) => j.status === "running").length,
    done: batchJobs.filter((j) => j.status === "done").length,
    error: batchJobs.filter((j) => j.status === "error").length,
    progress,
    jobs: batchJobs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  };
}

export function getInsaatfirmalarimCatalog() {
  return {
    categories: INSAATFIRMALARIM_CATEGORIES,
    cities: INSAATFIRMALARIM_CITIES,
    categoryCount: INSAATFIRMALARIM_CATEGORIES.length,
    cityCount: INSAATFIRMALARIM_CITIES.length,
    pairCount: INSAATFIRMALARIM_CATEGORIES.length * INSAATFIRMALARIM_CITIES.length,
  };
}

/** Bekleyen kuyruk işlerini iptal eder; çalışan işe dokunmaz. */
export function clearInsaatfirmalarimQueue(opts?: {
  batchId?: string;
}): { cleared: number; remaining: number } {
  const batchFilter = opts?.batchId?.trim() || undefined;
  let cleared = 0;

  for (const job of jobs.values()) {
    if (job.status !== "queued") continue;
    if (batchFilter && job.batchId !== batchFilter) continue;
    job.status = "error";
    job.message = "Kuyruk temizlendi (iptal)";
    job.errors.push(job.message);
    touch(job);
    cleared += 1;
  }

  queue.length = 0;
  for (const job of jobs.values()) {
    if (job.status === "queued") queue.push(job.id);
  }

  return { cleared, remaining: queue.length };
}

/** Takılı worker veya uzun süredir çalışan işleri kurtarır, kuyruğu yeniden başlatır. */
export function recoverInsaatfirmalarimWorker(): {
  recoveredJobs: number;
  workerRunning: boolean;
  queueDepth: number;
} {
  const stuckRecovered = recoverStuckInsaatfirmalarimJobs();
  const ghostRecovered = recoverGhostRunningInsaatfirmalarimJobs();
  reconcileInsaatfirmalarimQueue();
  unlockStuckInsaatfirmalarimWorker();
  void runWorker();
  return {
    recoveredJobs: stuckRecovered + ghostRecovered,
    workerRunning,
    queueDepth: queue.length,
  };
}

/** Bekleyen (veya hayalet running) işleri yeniden sıraya alır ve worker'ı başlatır. */
export function resumeInsaatfirmalarimQueue(opts?: { batchId?: string }): {
  requeued: number;
  workerRunning: boolean;
  queueDepth: number;
} {
  const batchFilter = opts?.batchId?.trim() || undefined;
  const ghostRecovered = recoverGhostRunningInsaatfirmalarimJobs({ batchId: batchFilter });
  reconcileInsaatfirmalarimQueue();
  unlockStuckInsaatfirmalarimWorker();
  void runWorker();
  const scopedQueued = [...jobs.values()].filter(
    (j) => j.status === "queued" && (!batchFilter || j.batchId === batchFilter),
  ).length;
  return {
    requeued: ghostRecovered,
    workerRunning,
    queueDepth: batchFilter ? scopedQueued : queue.length,
  };
}

const PILOT_CATEGORY_SLUGS = [
  "muteahhitlik-hizmetleri",
  "hazir-beton-ve-beton-malzemeleri",
  "tadilat-bakim-onarim-isleri",
] as const;

let autoStartScheduled = false;
let queueWatchdogStarted = false;

/** Gece botu vb. için: yalnızca gerçekten aktif iş varken meşgul say. */
export function isInsaatfirmalarimWorkerActivelyBusy(): boolean {
  recoverGhostRunningInsaatfirmalarimJobs();
  unlockStuckInsaatfirmalarimWorker();
  if (!workerRunning) return false;
  if (!currentJobId) return false;
  const active = jobs.get(currentJobId);
  return Boolean(active && active.status === "running" && !isInsaatfirmalarimRunningJobStale(active));
}

/** Aktif batch/kuyruk varken periyodik reconcile + worker başlatma (manuel düğme gerektirmez). */
export function startInsaatfirmalarimQueueWatchdog(log?: {
  info: (o: unknown, m?: string) => void;
  warn: (o: unknown, m?: string) => void;
}): () => void {
  if (queueWatchdogStarted) return () => {};
  queueWatchdogStarted = true;
  const tick = () => {
    const pending = [...jobs.values()].filter((j) => j.status === "queued" || j.status === "running").length;
    if (pending === 0) return;
    const beforeQueued = [...jobs.values()].filter((j) => j.status === "queued").length;
    const ghosts = recoverGhostRunningInsaatfirmalarimJobs();
    recoverStuckInsaatfirmalarimJobs();
    reconcileInsaatfirmalarimQueue();
    unlockStuckInsaatfirmalarimWorker();
    if (!workerRunning && queue.length > 0) void runWorker();
    if (ghosts > 0 && log) {
      log.info({ ghosts, queueDepth: queue.length, pendingQueued: beforeQueued }, "[insaatfirmalarim-watchdog] hayalet iş kurtarıldı");
    }
  };
  tick();
  const id = setInterval(tick, INSAATFIRMALARIM_WATCHDOG_MS);
  (id as unknown as { unref?: () => void }).unref?.();
  return () => {
    clearInterval(id);
    queueWatchdogStarted = false;
  };
}

/** Production startup: düşük kayıt sayısında tam katalog kazımasını kuyruğa alır. */
export function scheduleInsaatfirmalarimAutoImport(log: {
  info: (o: unknown, m?: string) => void;
  warn: (o: unknown, m?: string) => void;
}): void {
  if (autoStartScheduled) return;
  if (process.env.INSAATFIRMALARIM_AUTO_START === "0") {
    log.info("[insaatfirmalarim-auto] INSAATFIRMALARIM_AUTO_START=0 — atlandı");
    return;
  }
  autoStartScheduled = true;
  setTimeout(() => {
    void (async () => {
      try {
        const [row] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(mapBusinessesTable)
          .where(eq(mapBusinessesTable.importSource, "insaatfirmalarim"));
        const existing = row?.count ?? 0;
        const fullImport = process.env.INSAATFIRMALARIM_FULL_IMPORT === "1";
        const minCount = Number(process.env.INSAATFIRMALARIM_AUTO_MIN_COUNT) || 500;
        const pendingQueued = [...jobs.values()].filter((j) => j.status === "queued" || j.status === "running").length;
        if (pendingQueued > 0) {
          log.info({ pendingQueued }, "[insaatfirmalarim-auto] aktif kuyruk var — atlandı");
          return;
        }
        if (!fullImport && existing >= minCount) {
          log.info({ existing, minCount }, "[insaatfirmalarim-auto] yeterli kayıt var — atlandı");
          return;
        }
        const maxFirms = fullImport
          ? normalizeMaxFirms(process.env.INSAATFIRMALARIM_MAX_FIRMS) ?? undefined
          : normalizeMaxFirms(process.env.INSAATFIRMALARIM_PILOT_MAX_FIRMS) ?? undefined;

        if (fullImport) {
          const batch = enqueueInsaatfirmalarimJobsFromMode({
            mode: "city",
            citySlug: process.env.INSAATFIRMALARIM_PILOT_CITY?.trim() || "antalya",
            maxFirms,
            geocode: process.env.INSAATFIRMALARIM_PILOT_GEOCODE === "1",
            autoImport: true,
          });
          log.info(
            { batchId: batch.batchId, jobCount: batch.jobCount, existing, fullImport, maxFirms },
            "[insaatfirmalarim-auto] il bazlı tam katalog kazıma kuyruğa alındı",
          );
          return;
        }

        const job = enqueueInsaatfirmalarimJob({
          citySlug: process.env.INSAATFIRMALARIM_PILOT_CITY?.trim() || "antalya",
          categorySlugs: [...PILOT_CATEGORY_SLUGS],
          maxFirms,
          geocode: process.env.INSAATFIRMALARIM_PILOT_GEOCODE === "1",
          autoImport: true,
        });
        log.info(
          {
            jobId: job.id,
            existing,
            fullImport,
            city: job.options.citySlug ?? "(tüm iller)",
            categories: job.options.categorySlugs?.length ?? INSAATFIRMALARIM_CATEGORIES.length,
            maxFirms: job.options.maxFirms,
          },
          existing === 0
            ? "[insaatfirmalarim-auto] pilot kazıma kuyruğa alındı"
            : "[insaatfirmalarim-auto] pilot kazıma kuyruğa alındı",
        );
      } catch (err) {
        log.warn({ err }, "[insaatfirmalarim-auto] başlatılamadı");
      }
    })();
  }, 15_000).unref();
}

export async function runInsaatfirmalarimScrapeNow(input: {
  mode?: InsaatfirmalarimScrapeMode;
  categorySlug?: string;
  categorySlugs?: string[];
  citySlug?: string;
  maxFirms?: number;
  geocode?: boolean;
  autoImport?: boolean;
}) {
  const maxFirms = normalizeMaxFirms(input.maxFirms);
  const batch = await scrapeInsaatfirmalarimBatch({
    mode: input.mode,
    categorySlug: input.categorySlug,
    categorySlugs: input.categorySlugs,
    citySlug: input.citySlug,
    maxFirms,
    geocode: input.geocode !== false,
  });
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const importErrors: string[] = [];
  let samples = batch.firms.slice(0, 3);
  if (input.autoImport && batch.firms.length > 0) {
    const imp = await importInsaatfirmalarimFirms(batch.firms, { maxToImport: maxFirms });
    imported = imp.imported;
    updated = imp.updated;
    skipped = imp.skipped;
    importErrors.push(...imp.errors);
    if (imp.samples.length) samples = imp.samples.slice(0, 3);
  }
  return {
    discovered: batch.discovered,
    scraped: batch.firms.length,
    imported,
    updated,
    skipped,
    errors: [...batch.errors, ...importErrors],
    samples,
    firms: batch.firms,
  };
}

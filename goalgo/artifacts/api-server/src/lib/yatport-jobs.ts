import { randomUUID } from "node:crypto";
import {
  scrapeYatportBatch,
  getYatportCatalog as getYatportScraperCatalog,
  YATPORT_FETCH_TIMEOUT_MS,
  type YatportScrapedBoat,
  type YatportScrapeMode,
} from "./yatport-scraper.js";
import { importYatportBoat } from "./yatport-import.js";

export type YatportJobStatus = "queued" | "running" | "done" | "error";

export type YatportJob = {
  id: string;
  batchId?: string;
  status: YatportJobStatus;
  autoImport: boolean;
  options: {
    mode?: YatportScrapeMode;
    listSlug?: string;
    districtSlug?: string;
    boatTypeSlug?: string;
    maxBoats?: number;
    downloadImages: boolean;
  };
  progress: {
    discovered: number;
    scraped: number;
    imported: number;
    updated: number;
    skipped: number;
    listPages?: number;
  };
  boats: YatportScrapedBoat[];
  errors: string[];
  message: string;
  createdAt: string;
  updatedAt: string;
};

const jobs = new Map<string, YatportJob>();
const queue: string[] = [];
let workerRunning = false;
let currentJobId: string | null = null;
let currentJobStartedAt: number | null = null;
let lastWorkerError: string | null = null;

const YATPORT_JOB_TIMEOUT_MS = Math.max(
  60_000,
  Number(process.env.YATPORT_JOB_TIMEOUT_MS) || 25 * 60_000,
);
const YATPORT_STUCK_JOB_MS = YATPORT_JOB_TIMEOUT_MS + 2 * 60_000;

async function withYatportJobTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
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

function touch(job: YatportJob): void {
  job.updatedAt = new Date().toISOString();
}

function normalizeMaxBoats(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(50_000, Math.floor(n));
}

function reconcileYatportQueue(): void {
  const inQueue = new Set(queue);
  for (const job of jobs.values()) {
    if (job.status === "queued" && !inQueue.has(job.id)) queue.push(job.id);
  }
}

function recoverStuckYatportJobs(): number {
  const now = Date.now();
  let recovered = 0;
  for (const job of jobs.values()) {
    if (job.status !== "running") continue;
    const started = new Date(job.updatedAt).getTime();
    if (!Number.isFinite(started) || now - started < YATPORT_STUCK_JOB_MS) continue;
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

async function runSingleYatportJob(job: YatportJob): Promise<void> {
  job.status = "running";
  job.message = "Yatport kazıma başladı";
  currentJobId = job.id;
  currentJobStartedAt = Date.now();
  touch(job);
  try {
    const importCap = job.options.maxBoats;
    const batch = await scrapeYatportBatch({
      mode: job.options.mode,
      listSlug: job.options.listSlug,
      districtSlug: job.options.districtSlug,
      boatTypeSlug: job.options.boatTypeSlug,
      maxBoats: job.options.maxBoats,
      onProgress: (msg) => {
        job.message = msg;
        const pageMatch = /sayfa (\d+)/.exec(msg);
        if (pageMatch) job.progress.listPages = parseInt(pageMatch[1]!, 10) || undefined;
        const countMatch = /(\d+) tekne/.exec(msg);
        if (countMatch) job.progress.discovered = parseInt(countMatch[1]!, 10) || job.progress.discovered;
        touch(job);
      },
      onBoatScraped: job.autoImport
        ? async (boat) => {
            const used = job.progress.imported + job.progress.updated;
            if (importCap != null && importCap > 0 && used >= importCap) return;
            const row = await importYatportBoat(boat, {
              maxToImport: importCap,
              currentTotal: used,
              downloadImages: job.options.downloadImages,
            });
            job.progress.scraped += 1;
            job.progress.imported += row.imported;
            job.progress.updated += row.updated;
            job.progress.skipped += row.skipped;
            if (row.error) job.errors.push(row.error);
            touch(job);
          }
        : async (boat) => {
            job.progress.scraped += 1;
            job.boats.push(boat);
            touch(job);
          },
    });
    job.progress.discovered = batch.discovered;
    job.progress.listPages = batch.listPages;
    if (!job.autoImport) job.boats = batch.boats;
    job.errors.push(...batch.errors);
    if (batch.discovered === 0 && batch.boats.length === 0) {
      const hint =
        batch.errors[0] ??
        "Hiç tekne bulunamadı — api.yatport.com erişimini veya slug ayarını kontrol edin";
      if (!job.errors.length) job.errors.push(hint);
      job.status = "error";
      job.message = hint;
      lastWorkerError = hint;
    } else {
      job.status = "done";
      job.message = `Tamamlandı — ${job.progress.scraped} tekne, ${job.progress.imported} yeni, ${job.progress.updated} güncelleme`;
    }
  } catch (err) {
    job.status = "error";
    job.message = err instanceof Error ? err.message : String(err);
    job.errors.push(job.message);
    lastWorkerError = job.message;
  } finally {
    touch(job);
    currentJobId = null;
    currentJobStartedAt = null;
  }
}

async function runWorker(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;
  try {
    reconcileYatportQueue();
    recoverStuckYatportJobs();
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) break;
      const job = jobs.get(id);
      if (!job || job.status !== "queued") continue;
      const label = `${job.options.mode ?? "listing"}/${job.options.listSlug ?? job.options.districtSlug ?? "?"}`;
      await withYatportJobTimeout(runSingleYatportJob(job), YATPORT_JOB_TIMEOUT_MS, `yatport ${label}`).catch(
        (err) => {
          if (job.status === "running") {
            job.status = "error";
            job.message = err instanceof Error ? err.message : String(err);
            job.errors.push(job.message);
            lastWorkerError = job.message;
            touch(job);
          }
        },
      );
    }
  } finally {
    workerRunning = false;
    if (queue.length > 0) void runWorker();
  }
}

function createJob(
  input: {
    batchId?: string;
    mode?: YatportScrapeMode;
    listSlug?: string;
    districtSlug?: string;
    boatTypeSlug?: string;
    maxBoats?: number;
    autoImport?: boolean;
    downloadImages?: boolean;
  },
  opts?: { prepend?: boolean },
): YatportJob {
  const job: YatportJob = {
    id: randomUUID(),
    batchId: input.batchId,
    status: "queued",
    autoImport: Boolean(input.autoImport),
    options: {
      mode: input.mode,
      listSlug: input.listSlug?.trim() || undefined,
      districtSlug: input.districtSlug?.trim() || undefined,
      boatTypeSlug: input.boatTypeSlug?.trim() || undefined,
      maxBoats: normalizeMaxBoats(input.maxBoats),
      downloadImages: input.downloadImages !== false,
    },
    progress: { discovered: 0, scraped: 0, imported: 0, updated: 0, skipped: 0 },
    boats: [],
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

export function enqueueYatportJob(input: {
  mode?: YatportScrapeMode;
  listSlug?: string;
  districtSlug?: string;
  boatTypeSlug?: string;
  maxBoats?: number;
  autoImport?: boolean;
  downloadImages?: boolean;
}): YatportJob {
  const job = createJob(input);
  void runWorker();
  return job;
}

export function enqueueYatportJobsFromMode(input: {
  mode: YatportScrapeMode;
  listSlug?: string;
  districtSlug?: string;
  boatTypeSlug?: string;
  maxBoats?: number;
  autoImport?: boolean;
  downloadImages?: boolean;
  priority?: boolean;
}): { batchId: string; jobCount: number; jobIds: string[]; jobs: YatportJob[] } {
  const batchId = randomUUID();
  const created: YatportJob[] = [];
  const prepend = Boolean(input.priority);

  if (input.mode === "district" && !input.districtSlug) {
    const { districts } = getYatportScraperCatalog();
    for (let i = districts.length - 1; i >= 0; i--) {
      const d = districts[i]!;
      created.unshift(
        createJob(
          {
            batchId,
            mode: "district",
            districtSlug: d.slug,
            boatTypeSlug: input.boatTypeSlug,
            maxBoats: input.maxBoats,
            autoImport: input.autoImport,
            downloadImages: input.downloadImages,
          },
          { prepend },
        ),
      );
    }
  } else {
    created.push(
      createJob(
        {
          batchId,
          mode: input.mode,
          listSlug: input.listSlug,
          districtSlug: input.districtSlug,
          boatTypeSlug: input.boatTypeSlug,
          maxBoats: input.maxBoats,
          autoImport: input.autoImport,
          downloadImages: input.downloadImages,
        },
        { prepend },
      ),
    );
  }

  void runWorker();
  return {
    batchId,
    jobCount: created.length,
    jobIds: created.map((j) => j.id),
    jobs: created,
  };
}

export function getYatportJob(id: string): YatportJob | null {
  return jobs.get(id) ?? null;
}

export function listYatportJobs(limit = 20): YatportJob[] {
  return [...jobs.values()]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}

export function getYatportCatalog() {
  return getYatportScraperCatalog();
}

export function getYatportBatchStatus(batchId: string) {
  const batchJobs = [...jobs.values()].filter((j) => j.batchId === batchId);
  if (!batchJobs.length) return null;
  return {
    batchId,
    jobCount: batchJobs.length,
    queued: batchJobs.filter((j) => j.status === "queued").length,
    running: batchJobs.filter((j) => j.status === "running").length,
    done: batchJobs.filter((j) => j.status === "done").length,
    error: batchJobs.filter((j) => j.status === "error").length,
    progress: batchJobs.reduce(
      (acc, j) => ({
        discovered: acc.discovered + j.progress.discovered,
        scraped: acc.scraped + j.progress.scraped,
        imported: acc.imported + j.progress.imported,
        updated: acc.updated + j.progress.updated,
        skipped: acc.skipped + j.progress.skipped,
      }),
      { discovered: 0, scraped: 0, imported: 0, updated: 0, skipped: 0 },
    ),
    jobs: batchJobs,
  };
}

export function getYatportQueueStatus(opts: { batchId?: string; limit?: number } = {}) {
  reconcileYatportQueue();
  recoverStuckYatportJobs();
  const limit = opts.limit ?? 200;
  const relevant = [...jobs.values()]
    .filter((j) => !opts.batchId || j.batchId === opts.batchId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
  const jobRows = relevant.map((j) => ({
    id: j.id,
    batchId: j.batchId,
    status: j.status,
    mode: j.options.mode,
    listSlug: j.options.listSlug,
    districtSlug: j.options.districtSlug,
    boatTypeSlug: j.options.boatTypeSlug,
    progress: j.progress,
    errorCount: j.errors.length,
    errors: j.errors.slice(0, 3),
    message: j.message,
    updatedAt: j.updatedAt,
  }));
  const summary = {
    done: jobRows.filter((j) => j.status === "done").length,
    running: jobRows.filter((j) => j.status === "running").length,
    queued: jobRows.filter((j) => j.status === "queued").length,
    error: jobRows.filter((j) => j.status === "error").length,
    total: jobRows.length,
  };
  const currentJob = relevant.find((j) => j.status === "running");
  return {
    workerRunning,
    queueDepth: queue.length,
    currentJobId,
    lastWorkerError,
    fetchTimeoutSeconds: Math.round(YATPORT_FETCH_TIMEOUT_MS / 1000),
    jobTimeoutMinutes: Math.round(YATPORT_JOB_TIMEOUT_MS / 60_000),
    summary,
    currentJob: currentJob
      ? {
          id: currentJob.id,
          mode: currentJob.options.mode,
          label:
            currentJob.options.districtSlug ||
            currentJob.options.boatTypeSlug ||
            currentJob.options.listSlug ||
            "yatport",
          message: currentJob.message,
          runningMs: Date.now() - (currentJobStartedAt ?? new Date(currentJob.updatedAt).getTime()),
          discovered: currentJob.progress.discovered,
          scraped: currentJob.progress.scraped,
        }
      : null,
    jobs: jobRows,
  };
}

export function clearYatportQueue(batchId?: string): number {
  let cleared = 0;
  for (const job of jobs.values()) {
    if (job.status !== "queued") continue;
    if (batchId && job.batchId !== batchId) continue;
    job.status = "error";
    job.message = "Kuyruk temizlendi";
    touch(job);
    cleared += 1;
  }
  if (batchId) {
    for (let i = queue.length - 1; i >= 0; i--) {
      const id = queue[i]!;
      const job = jobs.get(id);
      if (job?.batchId === batchId) queue.splice(i, 1);
    }
  } else {
    queue.length = 0;
  }
  return cleared;
}

export function recoverYatportWorker(): { recoveredJobs: number; workerRunning: boolean; queueDepth: number } {
  const recoveredJobs = recoverStuckYatportJobs();
  reconcileYatportQueue();
  if (workerRunning && queue.length > 0 && !currentJobId) {
    workerRunning = false;
    lastWorkerError = "Worker kilitlenmesi kurtarıldı";
  }
  void runWorker();
  return { recoveredJobs, workerRunning, queueDepth: queue.length };
}

export async function runYatportScrapeNow(input: {
  mode?: YatportScrapeMode;
  listSlug?: string;
  districtSlug?: string;
  boatTypeSlug?: string;
  maxBoats?: number;
  autoImport?: boolean;
  downloadImages?: boolean;
}): Promise<{
  boats: YatportScrapedBoat[];
  discovered: number;
  listPages: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}> {
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const importCap = normalizeMaxBoats(input.maxBoats);
  const batch = await scrapeYatportBatch({
    mode: input.mode,
    listSlug: input.listSlug,
    districtSlug: input.districtSlug,
    boatTypeSlug: input.boatTypeSlug,
    maxBoats: input.maxBoats,
    onBoatScraped: input.autoImport
      ? async (boat) => {
          const used = imported + updated;
          if (importCap != null && importCap > 0 && used >= importCap) return;
          const row = await importYatportBoat(boat, {
            maxToImport: importCap,
            currentTotal: used,
            downloadImages: input.downloadImages !== false,
          });
          imported += row.imported;
          updated += row.updated;
          skipped += row.skipped;
          if (row.error) errors.push(row.error);
        }
      : undefined,
  });
  errors.push(...batch.errors);
  return {
    boats: batch.boats,
    discovered: batch.discovered,
    listPages: batch.listPages,
    imported: input.autoImport ? imported : 0,
    updated: input.autoImport ? updated : 0,
    skipped: input.autoImport ? skipped : 0,
    errors,
  };
}

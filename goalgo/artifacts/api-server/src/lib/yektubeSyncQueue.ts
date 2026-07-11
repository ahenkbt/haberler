import { randomBytes } from "node:crypto";

export type YektubeSyncJobStatus = "queued" | "running" | "done" | "error";

export type YektubeSyncJobKind = "source" | "bulk" | "shorts" | "playlists";

export type YektubeSyncSample = {
  videoId: string;
  title: string;
};

export type YektubeSyncJob = {
  id: string;
  batchId: string;
  kind: YektubeSyncJobKind;
  status: YektubeSyncJobStatus;
  sourceId?: number;
  sourceName?: string;
  syncMode?: string;
  startedAt: number;
  finishedAt?: number;
  progress: {
    scraped: number;
    upserted: number;
    skippedEmbed: number;
    skippedLanguage: number;
    removed: number;
  };
  warning?: string;
  error?: string;
  samples: YektubeSyncSample[];
};

const MAX_JOBS = 400;

const jobs = new Map<string, YektubeSyncJob>();
const jobOrder: string[] = [];

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

function trimJobs(): void {
  while (jobOrder.length > MAX_JOBS) {
    const old = jobOrder.shift();
    if (old) jobs.delete(old);
  }
}

export function createYektubeSyncBatch(): string {
  return newId("batch");
}

export function enqueueYektubeSyncJob(input: {
  batchId: string;
  kind: YektubeSyncJobKind;
  sourceId?: number;
  sourceName?: string;
}): YektubeSyncJob {
  const job: YektubeSyncJob = {
    id: newId("job"),
    batchId: input.batchId,
    kind: input.kind,
    status: "queued",
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    startedAt: Date.now(),
    progress: { scraped: 0, upserted: 0, skippedEmbed: 0, skippedLanguage: 0, removed: 0 },
    samples: [],
  };
  jobs.set(job.id, job);
  jobOrder.push(job.id);
  trimJobs();
  return job;
}

export function patchYektubeSyncJob(
  jobId: string,
  patch: Partial<
    Pick<
      YektubeSyncJob,
      "status" | "syncMode" | "finishedAt" | "warning" | "error" | "progress" | "samples" | "sourceName"
    >
  >,
): YektubeSyncJob | null {
  const job = jobs.get(jobId);
  if (!job) return null;
  if (patch.progress) {
    job.progress = { ...job.progress, ...patch.progress };
  }
  if (patch.samples?.length) {
    job.samples = patch.samples.slice(0, 12);
  }
  if (patch.status !== undefined) job.status = patch.status;
  if (patch.syncMode !== undefined) job.syncMode = patch.syncMode;
  if (patch.finishedAt !== undefined) job.finishedAt = patch.finishedAt;
  if (patch.warning !== undefined) job.warning = patch.warning;
  if (patch.error !== undefined) job.error = patch.error;
  if (patch.sourceName !== undefined) job.sourceName = patch.sourceName;
  return job;
}

export function markYektubeSyncJobRunning(jobId: string): void {
  patchYektubeSyncJob(jobId, { status: "running" });
}

export function completeYektubeSyncJobFromResult(
  jobId: string,
  result: {
    ok: boolean;
    upserted?: number;
    removed?: number;
    skippedEmbed?: number;
    skippedLanguage?: number;
    warning?: string;
    error?: string;
    syncMode?: string;
    scraped?: number;
    samples?: YektubeSyncSample[];
  },
): void {
  patchYektubeSyncJob(jobId, {
    status: result.ok ? "done" : "error",
    finishedAt: Date.now(),
    syncMode: result.syncMode,
    warning: result.warning,
    error: result.error,
    progress: {
      scraped: result.scraped ?? 0,
      upserted: result.upserted ?? 0,
      skippedEmbed: result.skippedEmbed ?? 0,
      skippedLanguage: result.skippedLanguage ?? 0,
      removed: result.removed ?? 0,
    },
    samples: result.samples,
  });
}

export function getYektubeSyncQueue(opts?: { batchId?: string; limit?: number }): {
  summary: {
    total: number;
    queued: number;
    running: number;
    done: number;
    error: number;
    scraped: number;
    upserted: number;
  };
  jobs: YektubeSyncJob[];
} {
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 250);
  const batchId = opts?.batchId?.trim();
  let list = [...jobOrder].reverse().map((id) => jobs.get(id)).filter(Boolean) as YektubeSyncJob[];
  if (batchId) list = list.filter((j) => j.batchId === batchId);
  list = list.slice(0, limit);

  const summary = {
    total: list.length,
    queued: 0,
    running: 0,
    done: 0,
    error: 0,
    scraped: 0,
    upserted: 0,
  };
  for (const j of list) {
    if (j.status === "queued") summary.queued++;
    else if (j.status === "running") summary.running++;
    else if (j.status === "done") summary.done++;
    else if (j.status === "error") summary.error++;
    summary.scraped += j.progress.scraped;
    summary.upserted += j.progress.upserted;
  }

  return { summary, jobs: list };
}

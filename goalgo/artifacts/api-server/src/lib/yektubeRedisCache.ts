const KEY_PREFIX = "yektube:";

type CacheEnvelope<T> = {
  data: T;
  expiresAt: number;
};

const memory = new Map<string, CacheEnvelope<unknown>>();

function upstashConfigured(): boolean {
  return Boolean(
    String(process.env.UPSTASH_REDIS_REST_URL ?? "").trim() &&
      String(process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim(),
  );
}

async function upstashCommand<T>(command: unknown[]): Promise<T | null> {
  const baseUrl = String(process.env.UPSTASH_REDIS_REST_URL ?? "").trim().replace(/\/+$/, "");
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim();
  if (!baseUrl || !token) return null;

  try {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: T };
    return data.result ?? null;
  } catch {
    return null;
  }
}

export function yektubeCacheKey(suffix: string): string {
  return `${KEY_PREFIX}${suffix}`;
}

export async function readYektubeCache<T>(suffix: string): Promise<T | null> {
  const key = yektubeCacheKey(suffix);
  const mem = memory.get(key);
  if (mem && mem.expiresAt > Date.now()) return mem.data as T;
  if (mem) memory.delete(key);

  if (!upstashConfigured()) return null;
  const raw = await upstashCommand<string>(["GET", key]);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      void upstashCommand(["DEL", key]);
      return null;
    }
    memory.set(key, parsed as CacheEnvelope<unknown>);
    return parsed.data;
  } catch {
    return null;
  }
}

export async function writeYektubeCache<T>(suffix: string, data: T, ttlSec: number): Promise<void> {
  const key = yektubeCacheKey(suffix);
  const envelope: CacheEnvelope<T> = {
    data,
    expiresAt: Date.now() + ttlSec * 1000,
  };
  memory.set(key, envelope as CacheEnvelope<unknown>);

  if (!upstashConfigured()) return;
  await upstashCommand(["SET", key, JSON.stringify(envelope), "EX", Math.max(30, ttlSec)]);
}

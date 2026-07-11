import type { ClientRateLimitInfo, Options, Store } from "express-rate-limit";
import { upstashCommand, upstashConfigured } from "./upstash-redis.js";

const KEY_PREFIX = "api-rate:";

function parseRedisCount(raw: unknown): number {
  const n = typeof raw === "string" ? Number(raw) : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Replica-safe express-rate-limit store (Upstash REST INCR + PEXPIRE). */
export class UpstashRateLimitStore implements Store {
  localKeys = false;
  prefix: string;
  windowMs = 60_000;

  constructor(prefix: string) {
    this.prefix = `${KEY_PREFIX}${prefix}:`;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private redisKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const redisKey = this.redisKey(key);
    const hitsRaw = await upstashCommand<number | string>(["INCR", redisKey]);
    const hits = parseRedisCount(hitsRaw) || 1;
    if (hits === 1) {
      await upstashCommand(["PEXPIRE", redisKey, this.windowMs]);
    }
    const ttlMs = Number(await upstashCommand<number>(["PTTL", redisKey]));
    const resetTime =
      Number.isFinite(ttlMs) && ttlMs > 0 ? new Date(Date.now() + ttlMs) : new Date(Date.now() + this.windowMs);
    return { totalHits: hits, resetTime };
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const redisKey = this.redisKey(key);
    const hits = parseRedisCount(await upstashCommand<number | string>(["GET", redisKey]));
    if (hits <= 0) return undefined;
    const ttlMs = Number(await upstashCommand<number>(["PTTL", redisKey]));
    const resetTime =
      Number.isFinite(ttlMs) && ttlMs > 0 ? new Date(Date.now() + ttlMs) : undefined;
    return { totalHits: hits, resetTime };
  }

  async decrement(key: string): Promise<void> {
    const redisKey = this.redisKey(key);
    const hits = parseRedisCount(await upstashCommand<number | string>(["GET", redisKey]));
    if (hits <= 1) {
      await upstashCommand(["DEL", redisKey]);
      return;
    }
    await upstashCommand(["DECR", redisKey]);
  }

  async resetKey(key: string): Promise<void> {
    await upstashCommand(["DEL", this.redisKey(key)]);
  }
}

export function createUpstashRateLimitStore(prefix: string): UpstashRateLimitStore | undefined {
  if (!upstashConfigured()) return undefined;
  return new UpstashRateLimitStore(prefix);
}

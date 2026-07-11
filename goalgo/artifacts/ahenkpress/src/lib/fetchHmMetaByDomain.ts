import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { apiUrl } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";

/** index.html inline bootstrap ile aynı sessionStorage anahtarı (60 sn). */
export const HM_META_BY_DOMAIN_SS_PREFIX = "hm-meta-by-domain:ss:v1:";
export const HM_META_BY_DOMAIN_SS_MAX_AGE_MS = 60_000;

export type HmMetaByDomain = {
  id: number;
  slug: string;
  domain: string | null;
  domain2?: string | null;
  domain3?: string | null;
  displayName: string;
  description?: string | null;
  contact?: { email?: string | null; phone?: string; address?: string; notes?: string } | null;
  layout?: unknown;
  seoVerification?: Record<string, unknown> | null;
  createdAt?: string;
  layoutUpdatedAt?: string | null;
};

type HmMetaByDomainSessionStored = {
  data: HmMetaByDomain | null;
  savedAt: number;
};

const inflightByHost = new Map<string, Promise<HmMetaByDomain | null>>();

function normalizeHmMetaByDomainHost(hostRaw: string): string {
  return String(hostRaw ?? "")
    .trim()
    .toLowerCase()
    .split(":")[0] ?? "";
}

function hmMetaByDomainSessionKey(host: string): string {
  return `${HM_META_BY_DOMAIN_SS_PREFIX}${host}`;
}

function readHmMetaByDomainSessionCache(host: string): HmMetaByDomain | null | undefined {
  if (typeof window === "undefined" || !host) return undefined;
  try {
    const raw = sessionStorage.getItem(hmMetaByDomainSessionKey(host));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as HmMetaByDomainSessionStored;
    if (typeof parsed?.savedAt !== "number") return undefined;
    if (Date.now() - parsed.savedAt > HM_META_BY_DOMAIN_SS_MAX_AGE_MS) return undefined;
    return parsed.data ?? null;
  } catch {
    return undefined;
  }
}

function writeHmMetaByDomainSessionCache(host: string, data: HmMetaByDomain | null): void {
  if (typeof window === "undefined" || !host) return;
  try {
    const payload: HmMetaByDomainSessionStored = { data, savedAt: Date.now() };
    sessionStorage.setItem(hmMetaByDomainSessionKey(host), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearHmMetaByDomainSessionCache(hostRaw?: string): void {
  if (typeof window === "undefined") return;
  const host = hostRaw ? normalizeHmMetaByDomainHost(hostRaw) : "";
  try {
    if (host) {
      sessionStorage.removeItem(hmMetaByDomainSessionKey(host));
      return;
    }
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(HM_META_BY_DOMAIN_SS_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    /* quota / private mode */
  }
}

export function hmMetaByDomainQueryKey(hostRaw: string): readonly ["hm-meta-by-domain", string] {
  return ["hm-meta-by-domain", normalizeHmMetaByDomainHost(hostRaw)] as const;
}

export async function fetchHmMetaByDomain(
  hostRaw: string,
  options?: {
    timeoutMs?: number;
    retries?: number;
    signal?: AbortSignal;
  },
): Promise<HmMetaByDomain | null> {
  const host = normalizeHmMetaByDomainHost(hostRaw);
  if (!host) return null;

  const sessionCached = readHmMetaByDomainSessionCache(host);
  if (sessionCached !== undefined) return sessionCached;

  const inflight = inflightByHost.get(host);
  if (inflight) return inflight;

  const promise = (async (): Promise<HmMetaByDomain | null> => {
    const { ok, status, data } = await fetchPublicJson<HmMetaByDomain>(
      apiUrl(`/api/hm/meta/by-domain?domain=${encodeURIComponent(host)}`),
      {
        timeoutMs: options?.timeoutMs ?? 12_000,
        retries: options?.retries ?? 1,
        signal: options?.signal,
      },
    );
    if (status === 404) {
      writeHmMetaByDomainSessionCache(host, null);
      return null;
    }
    if (!ok || !data) throw new Error(`HTTP ${status}`);
    writeHmMetaByDomainSessionCache(host, data);
    return data;
  })().finally(() => {
    inflightByHost.delete(host);
  });

  inflightByHost.set(host, promise);
  return promise;
}

type UseHmMetaByDomainOptions = {
  enabled?: boolean;
  staleTime?: number;
  retry?: UseQueryOptions<HmMetaByDomain | null>["retry"];
  retryDelay?: UseQueryOptions<HmMetaByDomain | null>["retryDelay"];
  timeoutMs?: number;
  retries?: number;
};

export function useHmMetaByDomain(
  hostRaw: string,
  options?: UseHmMetaByDomainOptions,
): UseQueryResult<HmMetaByDomain | null> {
  const host = normalizeHmMetaByDomainHost(hostRaw);
  return useQuery({
    queryKey: hmMetaByDomainQueryKey(host),
    queryFn: ({ signal }) =>
      fetchHmMetaByDomain(host, {
        signal,
        timeoutMs: options?.timeoutMs,
        retries: options?.retries,
      }),
    enabled: (options?.enabled ?? true) && !!host,
    staleTime: options?.staleTime ?? HM_META_BY_DOMAIN_SS_MAX_AGE_MS,
    retry: options?.retry ?? 1,
    retryDelay: options?.retryDelay,
  });
}

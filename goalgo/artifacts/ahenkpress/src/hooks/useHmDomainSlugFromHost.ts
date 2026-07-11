import { useParams } from "wouter";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { resolveHmDomainSlugHint, writeHmDomainSlugCache } from "@/lib/hmNestedMetaStorage";
import { useHmMetaByDomain } from "@/lib/fetchHmMetaByDomain";

/** Rota `slug` veya özel alan meta önbelleğinden site slug'ı. */
export function useHmDomainSlugFromHost(): string {
  const params = useParams<{ slug?: string }>();
  const routeSlug = String(params?.slug ?? "").trim();
  if (routeSlug) return routeSlug;

  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const isCustom = !!host && !isDefaultPortalHost(host);
  const cached = isCustom ? resolveHmDomainSlugHint(host) : undefined;

  const { data } = useHmMetaByDomain(host, {
    enabled: isCustom && !cached,
    timeoutMs: 18_000,
    retries: 2,
    retry: 2,
  });

  const resolved = routeSlug || cached || data?.slug || "";
  if (isCustom && data?.slug) writeHmDomainSlugCache(host, data.slug);
  return resolved;
}

import { useParams } from "wouter";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { resolveKnownHmEditorSlug } from "@/lib/hmEditorDomains";
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
  const cached = isCustom ? resolveHmDomainSlugHint(host) ?? resolveKnownHmEditorSlug(host) : undefined;

  const { data } = useHmMetaByDomain(host, {
    // Bilinen slug yedeği olsa da domain meta çekilsin (slug doğrulama / cache güncelleme).
    enabled: isCustom,
    timeoutMs: 18_000,
    retries: 2,
    retry: 2,
  });

  const resolved = routeSlug || data?.slug || cached || resolveKnownHmEditorSlug(host) || "";
  if (isCustom && data?.slug) writeHmDomainSlugCache(host, data.slug);
  return resolved;
}

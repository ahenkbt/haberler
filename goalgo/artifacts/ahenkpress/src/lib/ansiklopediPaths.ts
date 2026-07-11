import { useParams } from "wouter";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

/**
 * Portal: `/bilgiagaci/...` — HM vitrin: `/tr/{slug}/bilgiagaci/...`
 * Eski `/ansiklopedi` yolları rota katmanında `/bilgiagaci` karşılığına yönlendirilir.
 */
export function useAnsiklopediBasePath(): string {
  const p = useParams<{ slug?: string }>();
  const ctx = useHmPublicLinkContextOptional();
  const hm = (p.slug ?? ctx?.slug ?? "").trim();
  if (hm) return `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(hm)}/bilgiagaci`;
  return "/bilgiagaci";
}

/** HM vitrin ansiklopedi kökü (bağlam veya route slug). */
export function resolveHmAnsiklopediBasePath(siteSlug?: string | null): string {
  const hm = String(siteSlug ?? "").trim();
  if (hm) return `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(hm)}/bilgiagaci`;
  return "/bilgiagaci";
}

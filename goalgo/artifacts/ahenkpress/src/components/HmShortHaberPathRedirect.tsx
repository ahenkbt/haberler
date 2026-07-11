import { Redirect, useParams } from "wouter";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { isHmReservedRouteSegment } from "@/lib/hmExtraPageLookup";

/** Eski kısa yol: `/{siteSlug}/haber/{id}` → `/tr/{siteSlug}/haber/{id}` */
export function HmShortHaberPathRedirect() {
  const params = useParams<{ slug: string; id: string }>();
  const slug = String(params.slug ?? "").trim();
  const id = String(params.id ?? "").trim();
  if (!slug || !id || isHmReservedRouteSegment(slug)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-600">Geçersiz haber adresi.</div>
    );
  }
  return (
    <Redirect
      to={`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}/haber/${encodeURIComponent(id)}`}
    />
  );
}

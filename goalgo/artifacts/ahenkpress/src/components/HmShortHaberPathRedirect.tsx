import { Redirect, useLocation, useParams } from "wouter";
import { hmShortHaberRedirectPath } from "@/lib/hmSitePublicPath";

/** Eski kısa yol: `/{siteSlug}/haber/{id}` → `/tr/{siteSlug}/haber/{id}`. Portal `/haberler/haber/{id}` → `/haber/{id}`. */
export function HmShortHaberPathRedirect() {
  const params = useParams<{ slug?: string; siteSlug?: string; id?: string }>();
  const [location] = useLocation();
  const path = (location.split("?")[0] ?? "").trim();
  let slug = String(params.siteSlug ?? params.slug ?? "").trim();
  const id = String(params.id ?? "").trim();
  if (!slug && /^\/haberler\/haber\//i.test(path)) slug = "haberler";
  const target = hmShortHaberRedirectPath(slug, id);
  if (!target) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-600">Geçersiz haber adresi.</div>
    );
  }
  return <Redirect to={target} replace />;
}

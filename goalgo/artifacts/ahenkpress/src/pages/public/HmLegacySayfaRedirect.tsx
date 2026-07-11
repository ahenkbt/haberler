import { Redirect, useParams } from "wouter";

/** Eski `/tr/:slug/sayfa/:pageSlug` → `/tr/:slug/:pageSlug`. */
export default function HmLegacySayfaRedirect() {
  const params = useParams<{ slug: string; pageSlug: string }>();
  const siteSlug = String(params?.slug ?? "").trim();
  let pageSlug = String(params?.pageSlug ?? "").trim();
  if (!siteSlug || !pageSlug) return <Redirect to="/" />;
  try {
    pageSlug = decodeURIComponent(pageSlug);
  } catch {
    /* keep */
  }
  return (
    <Redirect
      to={`/tr/${encodeURIComponent(siteSlug)}/${encodeURIComponent(pageSlug)}${typeof window !== "undefined" ? window.location.search : ""}`}
    />
  );
}

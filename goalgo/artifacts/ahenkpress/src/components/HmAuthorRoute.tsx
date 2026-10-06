import { Redirect, useParams } from "wouter";
import { readHmAuthorJwt, readHmAuthorPayload } from "@/lib/hmAuthorSession";
import { useHmDomainSlugFromHost } from "@/hooks/useHmDomainSlugFromHost";
import { hmAuthorPanelHref } from "@/lib/hmAuthorPanelPath";

/** Köşe yazarı JWT yoksa veya slug eşleşmiyorsa girişe yönlendirir. */
export function HmAuthorRoute({ children }: { children: React.ReactNode }) {
  const params = useParams<{ slug: string }>();
  const hostSlug = useHmDomainSlugFromHost();
  const slug = String(params?.slug ?? "").trim() || hostSlug;
  const token = readHmAuthorJwt();
  const payload = readHmAuthorPayload();
  if (!token || !payload?.site?.slug) {
    return <Redirect to={slug ? hmAuthorPanelHref(slug, "giris") : "/"} />;
  }
  if (slug && payload.site.slug !== slug) {
    return <Redirect to={hmAuthorPanelHref(payload.site.slug, "haberler")} />;
  }
  return <>{children}</>;
}

import { Redirect, useParams } from "wouter";
import { readHmAuthorJwt, readHmAuthorPayload } from "@/lib/hmAuthorSession";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

/** Köşe yazarı JWT yoksa veya slug eşleşmiyorsa girişe yönlendirir. */
export function HmAuthorRoute({ children }: { children: React.ReactNode }) {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "").trim();
  const token = readHmAuthorJwt();
  const payload = readHmAuthorPayload();
  if (!token || !payload?.site?.slug) {
    return <Redirect to={slug ? `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}/yazar/giris` : "/"} />;
  }
  if (payload.site.slug !== slug) {
    return (
      <Redirect to={`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(payload.site.slug)}/yazar/haberler`} />
    );
  }
  return <>{children}</>;
}

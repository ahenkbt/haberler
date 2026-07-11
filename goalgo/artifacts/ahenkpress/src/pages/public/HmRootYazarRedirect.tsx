import { Redirect, useParams } from "wouter";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { useHmMetaByDomain } from "@/lib/fetchHmMetaByDomain";

/** Özel alanda `/yazar/:id` → `/tr/{siteSlug}/yazar/:id` */
export default function HmRootYazarRedirect() {
  const { authorKey } = useParams<{ authorKey: string }>();
  const key = String(authorKey ?? "").trim();
  const host =
    typeof window !== "undefined" ? (window.location.hostname.toLowerCase().split(":")[0] ?? "") : "";

  const { data, isLoading, isError } = useHmMetaByDomain(host, {
    enabled: host.length > 0 && key.length > 0,
    retry: false,
  });

  if (!key) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-600">
        Geçersiz adres
      </div>
    );
  }

  if (isLoading) {
    return <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-600">Yükleniyor…</div>;
  }

  if (isError || !data?.slug) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-3 text-slate-700">
        <p>Bu adres köşe yazarı listesi için geçerli değil.</p>
        <p className="text-sm text-slate-500">Haber sitenizde yazarlar için ana sayfadaki Yazarlar bağlantısını kullanın.</p>
      </div>
    );
  }

  return <Redirect to={`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(data.slug)}/yazar/${encodeURIComponent(key)}`} />;
}

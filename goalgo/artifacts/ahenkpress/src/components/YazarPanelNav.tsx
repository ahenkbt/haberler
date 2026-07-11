import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { clearHmAuthorSession } from "@/lib/hmAuthorSession";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

export function YazarPanelNav({ slug }: { slug: string }) {
  const h = useHmPublicHref();
  const enc = encodeURIComponent(slug);
  const base = `/${HM_SITE_PUBLIC_PREFIX}/${enc}/yazar`;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
      <Button variant="outline" size="sm" asChild>
        <Link href={`${base}/haberler`}>Makalelerim</Link>
      </Button>
      <Button size="sm" className="bg-[#e61e25] hover:bg-[#c9181e] text-white" asChild>
        <Link href={`${base}/haber/yeni`}>Yeni makale</Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href={`${base}/sifre`}>Şifre değiştir</Link>
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <Link href={h("/")}>Vitrine dön</Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-slate-500 ml-auto"
        type="button"
        onClick={() => {
          clearHmAuthorSession();
          window.location.href = `${base}/giris`;
        }}
      >
        Çıkış
      </Button>
    </div>
  );
}

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { clearHmAuthorSession, readHmAuthorPayload } from "@/lib/hmAuthorSession";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { hmPublicAuthorHref, hmPublicHomeHref } from "@/lib/hmPublicSiteUrl";
import { hmAuthorPanelHref } from "@/lib/hmAuthorPanelPath";

export function YazarPanelNav({ slug }: { slug: string }) {
  const ctx = useHmPublicLinkContextOptional();
  const authorPayload = readHmAuthorPayload();
  /** Vitrin bağlantıları için site alan adları: vitrin bağlamı → yazar oturumu → yalnız slug. */
  const publicSite =
    ctx ?? (authorPayload?.site && authorPayload.site.slug === slug ? authorPayload.site : { slug });
  const authorId = authorPayload?.site?.slug === slug ? authorPayload?.author?.id ?? null : null;
  const haberlerHref = hmAuthorPanelHref(slug, "haberler");
  const yeniHref = hmAuthorPanelHref(slug, "haber/yeni");
  const sifreHref = hmAuthorPanelHref(slug, "sifre");
  const girisHref = hmAuthorPanelHref(slug, "giris");
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
      <Button variant="outline" size="sm" asChild>
        <Link href={haberlerHref}>Makalelerim</Link>
      </Button>
      <Button size="sm" className="bg-[#e61e25] hover:bg-[#c9181e] text-white" asChild>
        <Link href={yeniHref}>Yeni makale</Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href={sifreHref}>Şifre değiştir</Link>
      </Button>
      {authorId != null ? (
        <Button variant="ghost" size="sm" asChild>
          <a href={hmPublicAuthorHref(publicSite, authorId)} target="_blank" rel="noopener noreferrer">
            Yazar sayfam
          </a>
        </Button>
      ) : null}
      <Button variant="ghost" size="sm" asChild>
        <a href={hmPublicHomeHref(publicSite)}>Vitrine dön</a>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-slate-500 ml-auto"
        type="button"
        onClick={() => {
          clearHmAuthorSession();
          window.location.href = girisHref;
        }}
      >
        Çıkış
      </Button>
    </div>
  );
}

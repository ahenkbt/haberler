import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { apiUrl } from "@/lib/apiBase";
import { Button } from "@/components/ui/button";
import { parseNewsSiteLayoutFromJson, resolveHmNewsVideoTvEnabled } from "@/lib/newsSiteLayout";
import { HmPublicSiteFooter } from "@/components/HmPublicSiteFooter";
import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import { HmPublicLinkProvider, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { hmPublicHref, hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { applyHmNewsSiteHomeMeta } from "@/lib/pageSeo";
import { useHmDomainSlugFromHost } from "@/hooks/useHmDomainSlugFromHost";
import { useHmCustomPageEnhancements } from "@/lib/hmCustomPageEnhancements";
import {
  prepareHmCustomPageBodyHtml,
  shouldUseHmTemplatePageBody,
} from "@/lib/prepareHmCustomPageBodyHtml";
import { extraPageBodyHtmlOf, findHmExtraPageBySlug } from "@/lib/hmExtraPageLookup";
import {
  hmContainedPageShellClass,
  hmFullWidthPageShellClass,
  isHmSiteLayoutContained,
} from "@/lib/hmChromeLayout";
import { isHmTgdPremiumBody, parseHmTgdPremiumBody } from "@/lib/hmTgdPremiumPage";
import { VATAN_ASSETS } from "@/lib/hmVatanTheme";
import "@/styles/hmVkdCorporatePages.css";
import "@/styles/hmTgdPremiumPages.css";

type HmMeta = {
  id: number;
  slug: string;
  domain: string | null;
  displayName: string;
  contact?: { phone?: string; email?: string; address?: string; notes?: string } | null;
  layout?: unknown;
};

export type HmCustomPageSite = {
  id: number;
  slug: string;
  domain: string | null;
  displayName: string;
  contact?: { phone?: string; email?: string; address?: string; notes?: string } | null;
  layoutPrefs: ReturnType<typeof parseNewsSiteLayoutFromJson>;
};

function normalizeCustomPageSlug(raw: string): string {
  return String(raw ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

class HmCustomPageErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: string | null }> {
  state: { error: string | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : "Sayfa içeriği gösterilemedi." };
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Sayfa içeriği güvenli şekilde gösterilemedi. Lütfen editörde HTML’i kontrol edin.
        </div>
      );
    }
    return this.props.children;
  }
}

export function HmCustomPageContent({ pageSlug, site }: { pageSlug: string; site: HmCustomPageSite }) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const listedPage = useMemo(() => {
    return findHmExtraPageBySlug(site.layoutPrefs.hmExtraPages, pageSlug);
  }, [site.layoutPrefs.hmExtraPages, pageSlug]);
  const listedHtml = extraPageBodyHtmlOf(listedPage);
  const { data: fetchedLayout, isFetched: fetchedFullHtml } = useQuery({
    queryKey: ["/api/hm/meta/by-slug", site.slug, "page-html", normalizeCustomPageSlug(pageSlug)],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/api/hm/meta/by-slug/${encodeURIComponent(site.slug)}?includePageContent=1`));
      if (!r.ok) throw new Error("notfound");
      const text = await r.text();
      const meta = JSON.parse(text) as HmMeta;
      return parseNewsSiteLayoutFromJson(meta.layout != null ? JSON.stringify(meta.layout) : null, site.slug);
    },
    enabled: Boolean(listedPage) && !listedHtml && site.slug.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const page = useMemo(() => {
    if (!listedPage) return undefined;
    if (listedHtml) return listedPage;
    return (
      findHmExtraPageBySlug(fetchedLayout?.hmExtraPages, pageSlug) ??
      findHmExtraPageBySlug(fetchedLayout?.hmExtraPages, listedPage.slug) ??
      listedPage
    );
  }, [listedPage, listedHtml, fetchedLayout, pageSlug]);

  useEffect(() => {
    if (!page) return;
    applyHmNewsSiteHomeMeta({
      siteName: site.displayName,
      browserTitle: `${page.title} · ${site.displayName}`,
      description: page.title,
      canonicalPath: `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}/${encodeURIComponent(page.slug.trim())}`,
      canonicalOrigin: hmPublicSiteOrigin(site.domain),
      imageUrl: site.layoutPrefs.logoUrl,
      logoUrl: site.layoutPrefs.logoUrl,
      faviconUrl: site.layoutPrefs.faviconUrl,
    });
    return () => {};
  }, [page, site.displayName, site.domain, site.layoutPrefs.faviconUrl, site.layoutPrefs.logoUrl, site.slug]);

  const isCorporate = site.layoutPrefs.hmVitrinTheme === "corporate" || site.layoutPrefs.hmVitrinTheme === "vatan";
  const isVatan = site.layoutPrefs.hmVitrinTheme === "vatan";
  /** Trafik sitesi + TGD arşiv HTML / tgd-archive kaynağı → Vatan premium kabuk. */
  const useTgdPremium =
    isVatan &&
    Boolean(page?.bodyHtml) &&
    (site.slug === "trafik" || isHmTgdPremiumBody(page?.bodyHtml ?? "", page?.importSource));

  const tgdPremium = useMemo(() => {
    if (!useTgdPremium || !page?.bodyHtml) return null;
    const prepared = prepareHmCustomPageBodyHtml(page.bodyHtml, {
      corporate: true,
      importSource: page.importSource,
      site: { slug: site.slug, siteId: site.id, domain: site.domain ?? null },
    });
    return parseHmTgdPremiumBody(prepared, page.title, page.slug || pageSlug);
  }, [useTgdPremium, page?.bodyHtml, page?.importSource, page?.title, page?.slug, pageSlug, site.domain, site.id, site.slug]);

  const pageBodySafe = useMemo(() => {
    if (!page?.bodyHtml) return "";
    const prepared = prepareHmCustomPageBodyHtml(page.bodyHtml, {
      corporate: isCorporate,
      importSource: page.importSource,
      site: { slug: site.slug, siteId: site.id, domain: site.domain ?? null },
    });
    if (!useTgdPremium) return prepared;
    return tgdPremium?.bodyHtml ?? parseHmTgdPremiumBody(prepared, page.title, page.slug || pageSlug).bodyHtml;
  }, [
    page?.bodyHtml,
    page?.importSource,
    page?.title,
    page?.slug,
    pageSlug,
    isCorporate,
    useTgdPremium,
    tgdPremium?.bodyHtml,
    site.domain,
    site.id,
    site.slug,
  ]);

  const htmlPending = Boolean(listedPage) && !pageBodySafe.trim() && !listedHtml && !fetchedFullHtml;

  useHmCustomPageEnhancements(bodyRef, site, page?.slug ?? pageSlug, page?.title ?? pageSlug, pageBodySafe);

  if (!page) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-700 font-medium">Sayfa bulunamadı veya yayından kaldırılmış.</p>
        <Button variant="outline" asChild>
          <Link href={hmPublicHref("/", { domain: site.domain, slug: site.slug, siteId: site.id })}>Vitrine dön</Link>
        </Button>
      </div>
    );
  }

  const isContained = isHmSiteLayoutContained(site.layoutPrefs) || page.fullWidth === false;
  const useTemplateBody = shouldUseHmTemplatePageBody({
    corporate: isCorporate,
    importSource: page.importSource,
    bodyHtml: page.bodyHtml,
  });
  const shellClass = isContained
    ? hmContainedPageShellClass("hm-custom-page-shell flex-1 py-0")
    : `${hmFullWidthPageShellClass()} hm-custom-page-shell flex-1 py-0`;

  if (useTgdPremium && tgdPremium) {
    const heroSrc = tgdPremium.heroImage.trim() || VATAN_ASSETS.guvenlikGucleri;
    const homeHref = hmPublicHref("/", { domain: site.domain, slug: site.slug, siteId: site.id });
    const linkCtx = { domain: site.domain, slug: site.slug, siteId: site.id };
    const activeSlug = normalizeCustomPageSlug(page.slug || pageSlug);
    return (
      <div className="flex min-w-0 flex-1 flex-col">
        <article className="hm-tgd-ultra">
          <header className="hm-tgd-ultra__hero">
            <div className="hm-tgd-ultra__hero-bg" aria-hidden="true">
              <img src={heroSrc} alt="" fetchPriority="high" decoding="async" width={1600} height={900} />
            </div>
            <div className="hm-tgd-ultra__wrap hm-tgd-ultra__hero-grid">
              <div>
                <p className="hm-tgd-ultra__badge">{tgdPremium.eyebrow}</p>
                <h1 className="hm-tgd-ultra__title">{tgdPremium.title}</h1>
                {tgdPremium.lead ? <p className="hm-tgd-ultra__lead">{tgdPremium.lead}</p> : null}
              </div>
              {tgdPremium.stats.length > 0 ? (
                <div className="hm-tgd-ultra__stats" role="list">
                  {tgdPremium.stats.map((stat) => (
                    <div key={`${stat.value}-${stat.label}`} className="hm-tgd-ultra__stat" role="listitem">
                      <span className="hm-tgd-ultra__stat-value">{stat.value}</span>
                      <span className="hm-tgd-ultra__stat-label">{stat.label}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </header>

          {tgdPremium.related.length > 0 ? (
            <nav className="hm-tgd-ultra__subnav" aria-label="İlgili sayfalar">
              <div className="hm-tgd-ultra__wrap hm-tgd-ultra__subnav-inner">
                {tgdPremium.related.map((item) => {
                  const itemSlug = normalizeCustomPageSlug(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={hmPublicHref(item.href, linkCtx)}
                      className={itemSlug === activeSlug ? "is-active" : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          ) : null}

          <div className="hm-tgd-ultra__wrap">
            <nav className="hm-tgd-ultra__bc" aria-label="Sayfa konumu">
              <Link href={homeHref}>Ana Sayfa</Link>
              <span className="hm-tgd-ultra__bc-sep" aria-hidden="true">
                ›
              </span>
              <span>{tgdPremium.title}</span>
            </nav>
          </div>

          <section className="hm-tgd-ultra__body">
            <div className="hm-tgd-ultra__wrap">
              <div className="hm-tgd-ultra__section-head">
                <p className="hm-tgd-ultra__section-badge">Program içeriği</p>
              </div>
              <HmCustomPageErrorBoundary resetKey={`${page.slug}-${pageBodySafe.length}`}>
                {pageBodySafe.trim() ? (
                  <div
                    ref={bodyRef}
                    className="hm-custom-page-body hm-custom-page-body--corporate hm-custom-page-body--vatan hm-tgd-prose max-w-none overflow-x-hidden"
                    data-hm-page-slug={page.slug}
                    dangerouslySetInnerHTML={{ __html: pageBodySafe }}
                  />
                ) : htmlPending ? (
                  <div className="min-h-[40vh]" aria-busy="true" aria-label="Sayfa yükleniyor" />
                ) : null}
              </HmCustomPageErrorBoundary>
            </div>
          </section>
        </article>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className={`min-w-0 ${shellClass}`}>
        {useTemplateBody ? (
          <HmCustomPageErrorBoundary resetKey={`${page.slug}-${page.bodyHtml.length}`}>
            {pageBodySafe.trim() ? (
              <div
                ref={bodyRef}
                className={`hm-custom-page-body hm-custom-page-body--corporate max-w-none overflow-x-hidden${site.layoutPrefs.hmVitrinTheme === "vatan" ? " hm-custom-page-body--vatan" : ""}`}
                data-hm-page-slug={page.slug}
                dangerouslySetInnerHTML={{ __html: pageBodySafe }}
              />
            ) : htmlPending ? (
              <div className="min-h-[40vh]" aria-busy="true" aria-label="Sayfa yükleniyor" />
            ) : (
              <h1 className="px-4 py-10 text-2xl font-black tracking-tight text-slate-900">{page.title}</h1>
            )}
          </HmCustomPageErrorBoundary>
        ) : (
          <article className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-6 py-5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{page.title}</h1>
            </header>
            <HmCustomPageErrorBoundary resetKey={`${page.slug}-${page.bodyHtml.length}`}>
              {pageBodySafe.trim() ? (
                <div
                  ref={bodyRef}
                  className="hm-custom-page-body prose prose-slate max-w-none px-6 py-8"
                  dangerouslySetInnerHTML={{ __html: pageBodySafe }}
                />
              ) : htmlPending ? (
                <div className="min-h-[24vh]" aria-busy="true" aria-label="Sayfa yükleniyor" />
              ) : null}
            </HmCustomPageErrorBoundary>
          </article>
        )}
      </div>
    </div>
  );
}

export default function HmCustomPage() {
  const params = useParams<{ slug: string; pageSlug: string }>();
  const hmCtx = useHmPublicLinkContextOptional();
  const hostSlug = useHmDomainSlugFromHost();
  const siteSlug = String(params?.slug ?? "").trim() || hostSlug;
  const pageSlugEnc = String(params?.pageSlug ?? "").trim();
  const pageSlug = (() => {
    try {
      return decodeURIComponent(pageSlugEnc).trim();
    } catch {
      return pageSlugEnc;
    }
  })();

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/hm/meta/by-slug", siteSlug],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/api/hm/meta/by-slug/${encodeURIComponent(siteSlug)}?includePageContent=1`));
      if (!r.ok) throw new Error("notfound");
      const text = await r.text();
      try {
        return JSON.parse(text) as HmMeta;
      } catch {
        throw new Error("invalid_json");
      }
    },
    enabled: !hmCtx && siteSlug.length > 0,
  });

  const layoutPrefs = useMemo(
    () => parseNewsSiteLayoutFromJson(data?.layout != null ? JSON.stringify(data.layout) : null),
    [data?.layout],
  );

  if (!siteSlug || !pageSlugEnc) {
    return <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-600">Geçersiz adres</div>;
  }

  if (hmCtx) {
    return (
      <HmCustomPageContent
        pageSlug={pageSlug}
        site={{
          id: hmCtx.siteId,
          slug: hmCtx.slug,
          domain: hmCtx.domain ?? null,
          displayName: hmCtx.displayName,
          contact: hmCtx.contact ?? null,
          layoutPrefs: hmCtx.layoutPrefs,
        }}
      />
    );
  }

  if (isLoading) {
    return <div className="max-w-lg mx-auto px-4 py-16 text-center">Yükleniyor…</div>;
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-700 font-medium">Site bulunamadı.</p>
        <Button variant="outline" asChild>
          <Link href="/">Anasayfa</Link>
        </Button>
      </div>
    );
  }

  return (
    <HmPublicLinkProvider
      value={{
        siteId: data.id,
        slug: data.slug,
        domain: data.domain ?? null,
        displayName: data.displayName,
        layoutPrefs,
        contact: data.contact ?? null,
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <HmCustomPageContent
          pageSlug={pageSlug}
          site={{
            id: data.id,
            slug: data.slug,
            domain: data.domain ?? null,
            displayName: data.displayName,
            contact: data.contact ?? null,
            layoutPrefs,
          }}
        />
        <HmPublicSiteFooter
          siteId={data.id}
          slug={data.slug}
          layoutPrefs={layoutPrefs}
          showVideoTvLink={resolveHmNewsVideoTvEnabled(layoutPrefs)}
          siteDisplayName={data.displayName}
          contact={data.contact ?? null}
          className="mt-auto"
        />
      </div>
    </HmPublicLinkProvider>
  );
}

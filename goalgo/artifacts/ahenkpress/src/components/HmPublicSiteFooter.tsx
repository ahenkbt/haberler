import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Rss } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { resolveHmCorporateAuthorsEnabled, resolveHmCorporateRssLinksEnabled } from "@/lib/newsSiteLayout";
import { HM_PUBLIC_FOOTER_CATEGORY_LINKS } from "@/lib/hmPublicFooterNav";
import {
  filterVkdFooterCategoryLinks,
  isVkdSiteSlug,
  VKD_FOOTER_CATEGORY_LINKS,
} from "@/lib/hmVkdFooterNav";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import type { HmPublicSiteContact } from "@/contexts/HmPublicLinkContext";
import { rewriteHmSiteAnchorsInHtml } from "@/lib/rewriteNewsBodyLinksForHm";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { hmChromeContainedShellClass, hmFullWidthPageShellClass, isHmSiteLayoutContained } from "@/lib/hmChromeLayout";
import { BILGI_AGACI_DISPLAY_NAME } from "@/lib/bilgiAgaciBrand";
import { isYekparePortalHubOnly } from "@/lib/hmPortalHosts";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { buildCorporateFooterMenuGroups } from "@/lib/hmCorporateNavMenu";
import { normalizeHmEditorLoginMenuHref } from "@/lib/hmEditorPublicLinks";
import { sortHmCategoriesForNav } from "@/lib/hmCategoryNav";
import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import { mergeHmStandardNewsCategoryRows } from "@/lib/hmStandardNewsCategories";
import {
  filterHmPublicCategoryRows,
  resolveHmPublicActiveGlobalSlugs,
  resolveHmPublicHiddenCategorySlugs,
} from "@/lib/hmPublicCategoryFilter";
import { PORTAL_ORIGIN } from "@/lib/portalBrand";
import {
  hmTelifFooterNavItem,
  isHmTelifMenuHref,
  shouldHideHmTelifNavLink,
  shouldShowHmTelifInPublicNav,
} from "@/lib/hmTelifNav";

import { isHmPublicNavExternal } from "@/lib/hmPublicLinks";

function isExternalFooterHref(href: string): boolean {
  return isHmPublicNavExternal(href);
}

function isAuthorLoginFooterHref(href: string): boolean {
  const path = String(href ?? "").trim().split(/[?#]/)[0].replace(/\/+$/, "");
  return /(^|\/)yazar\/giris$/i.test(path);
}

type FooterLinkItem = {
  key: string;
  label: string;
  href: string;
  external?: boolean;
  rss?: boolean;
};

function isPwaInstallFooterCandidate(label: string, href?: string): boolean {
  const normalizedLabel = label.trim().toLocaleLowerCase("tr-TR");
  const normalizedHref = String(href ?? "").trim().toLocaleLowerCase("tr-TR");
  if (normalizedHref.includes("/uygulamayi-indir") || normalizedHref.includes("/pwastore")) return true;
  if (normalizedLabel.includes("pwa")) return true;
  return normalizedLabel.includes("uygulama") && (normalizedLabel.includes("yükle") || normalizedLabel.includes("indir"));
}

const HM_FOOTER_HEADING_CLASS =
  "text-[11px] font-black uppercase tracking-widest text-[color:var(--hm-footer-heading,var(--hm-brand-label,#f87171))]";
const HM_FOOTER_SUBHEADING_CLASS =
  "text-[10px] font-black uppercase tracking-widest text-[color:var(--hm-footer-text,rgba(203,213,225,0.72))]";
const HM_FOOTER_BODY_CLASS = "text-sm text-[color:var(--hm-footer-text,rgba(203,213,225,0.88))]";
const HM_FOOTER_LINK_CLASS =
  "text-[color:var(--hm-footer-link,rgba(226,232,240,0.96))] hover:text-[color:var(--hm-footer-link-hover,var(--hm-text-on-dark,#fff))] hover:underline";
const HM_FOOTER_LINK_EMPHASIS_CLASS =
  "font-semibold text-[color:var(--hm-footer-link,rgba(248,250,252,0.98))] hover:text-[color:var(--hm-footer-link-hover,var(--hm-text-on-dark,#fff))] hover:underline";
const HM_FOOTER_PROSE_CLASS =
  "prose prose-sm max-w-none prose-p:my-2 text-[color:var(--hm-footer-text,rgba(203,213,225,0.88))] [&_a]:text-[color:var(--hm-footer-link-hover,var(--hm-brand-label,#f87171))] [&_h1]:text-[color:var(--hm-footer-heading,var(--hm-brand-label,#f87171))] [&_h2]:text-[color:var(--hm-footer-heading,var(--hm-brand-label,#f87171))] [&_h3]:text-[color:var(--hm-footer-heading,var(--hm-brand-label,#f87171))] [&_h4]:text-[color:var(--hm-footer-heading,var(--hm-brand-label,#f87171))] [&_strong]:text-[color:var(--hm-footer-link,rgba(248,250,252,0.98))]";

export type HmPublicSiteFooterProps = {
  siteId: number;
  slug: string;
  layoutPrefs: NewsSiteLayoutPrefs;
  /** Video TV vitrin linki (yalnızca gömülü Yektube rotalarında true). */
  showVideoTvLink?: boolean;
  className?: string;
  /** Telif satırı için görünen ad */
  siteDisplayName?: string | null;
  /** Sunucudaki site iletişim kaydı (alt şerit sağ) */
  contact?: HmPublicSiteContact;
};

/**
 * Haber merkezi genel sayfaları: sitene ekle, künye, kategoriler, özel sayfalar.
 */
export function HmPublicSiteFooter({
  siteId,
  slug,
  layoutPrefs,
  showVideoTvLink = true,
  className = "",
  siteDisplayName = null,
  contact = null,
}: HmPublicSiteFooterProps) {
  const h = useHmPublicHref();
  const hmCtx = useHmPublicLinkContextOptional();
  const portalHubOnly = isYekparePortalHubOnly(
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "",
    slug,
  );
  const effectiveShowVideoTvLink = showVideoTvLink && portalHubOnly;
  const [loc] = useLocation();
  const locPath = useMemo(() => (loc.split("?")[0] || "/").replace(/\/$/, "") || "/", [loc]);
  const home = h("/");
  const videoPath = `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}/video-tv`;
  const about = (layoutPrefs.hmFooterAboutHtml ?? "").trim();
  const isCorporateTheme = layoutPrefs.hmVitrinTheme === "corporate";
  const siteLayoutContained = isHmSiteLayoutContained(layoutPrefs);
  const showFooter = layoutPrefs.hmNewsFooterEnabled !== false;
  const aboutDisplay = useMemo(() => {
    if (!about) return about;
    const rewritten = hmCtx
      ? rewriteHmSiteAnchorsInHtml(about, {
          slug: hmCtx.slug,
          siteId: hmCtx.siteId,
          domain: hmCtx.domain,
        })
      : about;
    return sanitizeHtml(rewritten);
  }, [about, hmCtx]);
  const label = (siteDisplayName ?? "").trim() || slug;
  const showRssLinks = isCorporateTheme
    ? resolveHmCorporateRssLinksEnabled(layoutPrefs)
    : layoutPrefs.hmNewsRssLinksEnabled !== false;
  const showFooterCategories = layoutPrefs.hmNewsFooterCategoriesEnabled !== false;
  const hiddenCategorySlugs = useMemo(
    () => resolveHmPublicHiddenCategorySlugs(layoutPrefs),
    [layoutPrefs],
  );
  const { data: apiCats = [] } = useQuery<any[]>({
    queryKey: ["/api/categories", siteId, "footer"],
    queryFn: () =>
      apiRequest(`/api/categories?siteId=${encodeURIComponent(String(siteId))}`) as Promise<any[]>,
    staleTime: 10 * 60 * 1000,
    enabled: siteId > 0 && showFooterCategories,
  });
  const activeGlobalSlugs = useMemo(() => {
    const globals = apiCats
      .filter((c: any) => c.exclusiveSiteId == null)
      .map((c: any) => normalizeNewsCategorySlug(c.slug))
      .filter(Boolean);
    return resolveHmPublicActiveGlobalSlugs(layoutPrefs, globals);
  }, [apiCats, layoutPrefs]);

  const categoryLinks = useMemo(() => {
    const vkdFooter = isVkdSiteSlug(slug);
    const filteredApiCats = filterHmPublicCategoryRows(apiCats, layoutPrefs, siteId, slug);
    const apiRows = filteredApiCats
      .map((c: any) => ({
        label: String(c.name ?? c.slug ?? "").trim() || String(c.slug ?? ""),
        slug: normalizeNewsCategorySlug(c.slug),
        sortOrder: typeof c.sortOrder === "number" ? c.sortOrder : null,
        exclusiveSiteId: c.exclusiveSiteId ?? null,
      }))
      .filter((c) => c.slug.length > 0);
    const mergedRows = !isCorporateTheme
      ? mergeHmStandardNewsCategoryRows(apiRows, {
          hiddenSlugs: hiddenCategorySlugs,
          activeGlobalSlugs,
        })
      : apiRows;
    if (mergedRows.length > 0) {
      const sorted = sortHmCategoriesForNav(mergedRows, layoutPrefs.hmCategorySortSlugs).map((c) => ({
        label: c.label,
        slug: c.slug,
      }));
      if (vkdFooter) return filterVkdFooterCategoryLinks(sorted);
      return sorted;
    }
    const fallback = vkdFooter ? VKD_FOOTER_CATEGORY_LINKS : HM_PUBLIC_FOOTER_CATEGORY_LINKS;
    return fallback.filter(
      (c) => !hiddenCategorySlugs.has(c.slug) && (isCorporateTheme || activeGlobalSlugs.has(c.slug)),
    );
  }, [
    apiCats,
    activeGlobalSlugs,
    hiddenCategorySlugs,
    isCorporateTheme,
    layoutPrefs,
    layoutPrefs.hmCategorySortSlugs,
    siteId,
    slug,
  ]);
  const manualFooterMenu = (layoutPrefs.hmNewsFooterMenuItems ?? [])
    .filter((item) => item.enabled !== false && item.label.trim() && item.href.trim())
    .filter((item) => !isPwaInstallFooterCandidate(item.label, item.href))
    .filter((item) => !(shouldHideHmTelifNavLink(layoutPrefs) && isHmTelifMenuHref(item.href)))
    .slice(0, 24);
  const hasCustomFooterMenu = manualFooterMenu.length > 0;
  const corporateFooterMenuGroups = useMemo(() => {
    if (!isCorporateTheme || hasCustomFooterMenu) return null;
    return buildCorporateFooterMenuGroups({
      layoutPrefs,
      h,
      siteSlug: slug,
      locPath,
      showVideoTvLink: effectiveShowVideoTvLink,
      newsAuthorsEnabled: resolveHmCorporateAuthorsEnabled(layoutPrefs),
      newsRssEnabled: showRssLinks,
    });
  }, [isCorporateTheme, hasCustomFooterMenu, layoutPrefs, h, slug, locPath, effectiveShowVideoTvLink, showRssLinks]);
  const authorLoginLink: FooterLinkItem = { key: "author-login", label: "Köşe yazarı girişi", href: h("/yazar/giris") };
  const defaultPageLinks: FooterLinkItem[] = [
    { key: "home", label: "Ana sayfa", href: home },
    ...(showRssLinks ? [{ key: "rss", label: "RSS", href: h("/rss-baglantilari"), rss: true }] : []),
    ...(effectiveShowVideoTvLink ? [{ key: "video-tv", label: "Video TV", href: h(videoPath) }] : []),
    { key: "foto", label: "Foto galeri", href: h("/foto-galeri") },
    ...(hiddenCategorySlugs.has("blog") ? [] : [{ key: "blog", label: "Blog", href: h("/kategori/blog") }]),
    { key: "sitene-ekle", label: "Sitene ekle", href: h("/sitene-ekle") },
    ...(portalHubOnly ? [{ key: "ansiklopedi", label: BILGI_AGACI_DISPLAY_NAME, href: h("/bilgiagaci") }] : []),
    { key: "kunye", label: "Künye", href: h("/kunye") },
    { key: "reklam", label: "Reklam", href: h("/reklam") },
    { key: "abonelik", label: "Abonelik", href: h("/abonelik") },
    ...(shouldShowHmTelifInPublicNav(layoutPrefs) ? [hmTelifFooterNavItem(h)] : []),
    { key: "iletisim", label: "İletişim", href: h("/iletisim") },
    authorLoginLink,
    { key: "editor", label: "Editör girişi", href: "/editor/giris" },
  ];
  const footerMatchesHeaderMenu =
    isCorporateTheme && !!corporateFooterMenuGroups && corporateFooterMenuGroups.length > 0;

  const pageLinksBase: FooterLinkItem[] = footerMatchesHeaderMenu
      ? corporateFooterMenuGroups.flatMap((group) =>
          group.links.map((item) => ({
            key: item.key,
            label: item.label,
            href: item.href,
            external: item.external,
            rss: item.rss,
          })),
        )
      : manualFooterMenu.length > 0
      ? manualFooterMenu.map((item) => {
          const label = item.label.trim();
          const raw = item.href.trim();
          const normalized = normalizeHmEditorLoginMenuHref(raw);
          const href = isExternalFooterHref(normalized) ? normalized : h(normalized.startsWith("/") ? normalized : `/${normalized}`);
          return { key: item.id, label, href, external: isExternalFooterHref(raw) };
        })
      : defaultPageLinks;
  const pageLinks = footerMatchesHeaderMenu
    ? pageLinksBase
    : pageLinksBase.some((item) => isAuthorLoginFooterHref(item.href))
      ? pageLinksBase
      : [...pageLinksBase, authorLoginLink];

  const soc = layoutPrefs.hmFooterSocial;
  const waDigits = (layoutPrefs.hmFooterWhatsappIhbar ?? "").replace(/\D/g, "");

  const showIletisimBlock =
    !!(contact?.phone || contact?.email || contact?.address || contact?.notes) || waDigits.length > 0;
  const hasRightColumn =
    showIletisimBlock || !!(soc?.instagramUrl || soc?.facebookUrl || soc?.xUrl || soc?.youtubeUrl);

  const socialRows = [
    { key: "instagram", label: "Instagram", url: soc?.instagramUrl },
    { key: "facebook", label: "Facebook", url: soc?.facebookUrl },
    { key: "x", label: "X", url: soc?.xUrl },
    { key: "youtube", label: "YouTube", url: soc?.youtubeUrl },
  ].filter((r) => (r.url ?? "").trim().length > 0) as { key: string; label: string; url: string }[];

  if (!isCorporateTheme && !showFooter) return null;

  const footerShellClass = siteLayoutContained
    ? hmChromeContainedShellClass("hm-public-site-footer__inner py-10")
    : hmFullWidthPageShellClass("py-10");

  return (
    <footer
      className={`hm-public-site-footer mt-auto border-t border-[color:var(--hm-header-border,rgba(255,255,255,0.1))] bg-[var(--hm-footer-bg,var(--hm-nav-strip-bg,var(--hm-header-bg,#0f172a)))] text-[color:var(--hm-footer-text,rgba(226,232,240,0.92))] ${siteLayoutContained ? "hm-public-site-footer--contained-outer" : ""} ${className}`}
    >
      <div className={footerShellClass}>
        <div
          className={`grid gap-10 ${hasRightColumn ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
        >
          <div className="min-w-0 space-y-3">
            {aboutDisplay ? (
              <>
                <h3 className={HM_FOOTER_HEADING_CLASS}>Site hakkında</h3>
                <div className={HM_FOOTER_PROSE_CLASS} dangerouslySetInnerHTML={{ __html: aboutDisplay }} />
              </>
            ) : (
              <p className={HM_FOOTER_BODY_CLASS}>Site hakkında metni henüz eklenmemiş.</p>
            )}
          </div>

          {showFooterCategories ? (
            <div>
              <h3 className={HM_FOOTER_HEADING_CLASS}>Haber kategorileri</h3>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {categoryLinks.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={h(`/kategori/${encodeURIComponent(c.slug)}?siteId=${encodeURIComponent(String(siteId))}`)}
                      className={HM_FOOTER_LINK_CLASS}
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <h3 className={HM_FOOTER_HEADING_CLASS}>
              {isCorporateTheme ? "Menü" : "Sayfalar"}
            </h3>
            {footerMatchesHeaderMenu && corporateFooterMenuGroups ? (
              <div className="mt-3 space-y-4">
                {corporateFooterMenuGroups.map((group) => (
                  <div key={group.key}>
                    <p className={HM_FOOTER_SUBHEADING_CLASS}>{group.heading}</p>
                    <ul className="mt-2 grid grid-cols-1 gap-y-1.5 text-sm sm:grid-cols-2 sm:gap-x-4">
                      {group.links.map((item) => (
                        <li key={item.key}>
                          {item.external ? (
                            <a
                              href={item.href}
                              className={HM_FOOTER_LINK_CLASS}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              {item.label}
                            </a>
                          ) : (
                            <Link href={item.href} className={HM_FOOTER_LINK_CLASS}>
                              {item.label}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {pageLinks.map((item) => (
                  <li key={item.key}>
                    {item.external ? (
                      <a href={item.href} className={HM_FOOTER_LINK_CLASS} rel="noopener noreferrer" target="_blank">
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className={
                          "rss" in item && item.rss
                            ? `inline-flex items-center gap-1.5 ${HM_FOOTER_LINK_CLASS}`
                            : item.key === "home" || item.key === "video-tv"
                              ? HM_FOOTER_LINK_EMPHASIS_CLASS
                              : HM_FOOTER_LINK_CLASS
                        }
                      >
                        {"rss" in item && item.rss ? <Rss className="h-3.5 w-3.5" aria-hidden /> : null}
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hasRightColumn ? (
            <div className="min-w-0 space-y-6 border-t border-[color:var(--hm-header-border,rgba(255,255,255,0.1))] pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              {showIletisimBlock ? (
                <div>
                  <h3 className={HM_FOOTER_HEADING_CLASS}>İletişim</h3>
                  <ul className={`mt-3 space-y-2 ${HM_FOOTER_BODY_CLASS}`}>
                    {contact?.phone ? (
                      <li>
                        <span className="text-[color:var(--hm-footer-text,rgba(203,213,225,0.65))]">Tel: </span>
                        <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className={HM_FOOTER_LINK_EMPHASIS_CLASS}>
                          {contact.phone}
                        </a>
                      </li>
                    ) : null}
                    {contact?.email ? (
                      <li>
                        <span className="text-[color:var(--hm-footer-text,rgba(203,213,225,0.65))]">E-posta: </span>
                        <a href={`mailto:${encodeURIComponent(contact.email)}`} className={`break-all ${HM_FOOTER_LINK_EMPHASIS_CLASS}`}>
                          {contact.email}
                        </a>
                      </li>
                    ) : null}
                    {contact?.address ? (
                      <li>
                        <span className="text-[color:var(--hm-footer-text,rgba(203,213,225,0.65))]">Adres: </span>
                        {contact.address}
                      </li>
                    ) : null}
                    {contact?.notes ? (
                      <li className="text-xs leading-relaxed whitespace-pre-wrap text-[color:var(--hm-footer-text,rgba(203,213,225,0.72))]">{contact.notes}</li>
                    ) : null}
                    {waDigits.length > 0 ? (
                      <li>
                        <a
                          href={`https://wa.me/${waDigits}`}
                          className="font-semibold text-emerald-300 hover:text-emerald-200 hover:underline"
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          WhatsApp haber ihbar
                        </a>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}

              {socialRows.length > 0 ? (
                <div>
                  <h3 className={HM_FOOTER_HEADING_CLASS}>Sosyal medya</h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    {socialRows.map((r) => (
                      <li key={r.key}>
                        <a href={r.url} className={HM_FOOTER_LINK_EMPHASIS_CLASS} rel="noopener noreferrer" target="_blank">
                          {r.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

            </div>
          ) : null}
        </div>

        <p className="mt-10 border-t border-[color:var(--hm-header-border,rgba(255,255,255,0.1))] pt-6 text-center text-xs text-[color:var(--hm-footer-text,rgba(203,213,225,0.88))]">
          <span className="mt-1 block sm:mt-0 sm:inline">
            Haber merkezi alt yapı:{" "}
            <a href={`${PORTAL_ORIGIN}/habermerkezi`} className="text-[color:var(--hm-footer-link-hover,var(--hm-brand-label,#f87171))] hover:underline" rel="noreferrer">
              yekpare.net
            </a>
          </span>
          <span className="mx-2 hidden sm:inline">·</span>
          <span className="block sm:inline">
            © {new Date().getFullYear()} {label}
          </span>
        </p>
      </div>
    </footer>
  );
}

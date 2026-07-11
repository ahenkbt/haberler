import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Rss } from "lucide-react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { PORTAL_ORIGIN, PWA_ICON_PATH } from "@/lib/portalBrand";
import {
  parseModulesEnabledJson,
  isModuleEnabled,
  parseFooterNavJson,
  parseFooterLegalLinksJson,
  parseFooterInfoLinksJson,
  MAIN_NAV_HREF,
  MAIN_NAV_LABELS,
  type FooterLegalLink,
} from "@workspace/site-nav";
import { useEditorPageFlagsSync } from "@/hooks/useEditorPageFlags";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { portalCopyrightFallback, portalNavBrandParts } from "@/lib/portalNavBrand";
import { TURIZM_FOOTER_MODULES, isTurizmSubmenuItemActive } from "@/themes/turizm/turizmRoutes";
import { YekpareFooterDisclaimer } from "@/components/YekpareFooterDisclaimer";

function LegalLink({ item }: { item: FooterLegalLink }) {
  const ext = /^https?:\/\//i.test(item.href);
  const cls = "text-slate-600 hover:text-[#0f766e] transition-colors text-[11px] sm:text-xs font-medium";
  if (ext) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {item.label}
      </a>
    );
  }
  return (
    <Link href={item.href} className={cls}>
      {item.label}
    </Link>
  );
}

/** Anasayfa ile aynı alt bilgi — tüm genel (PublicLayout) sayfalarda kullanılır. */
export function SiteFooter() {
  const [loc] = useLocation();
  const path = loc.split("?")[0] ?? "";
  const pageFlags = useEditorPageFlagsSync();
  const { data: settings } = useGetSiteSettings();
  const modulesMap = useMemo(
    () => parseModulesEnabledJson(settings?.modulesEnabledJson ?? null),
    [settings?.modulesEnabledJson],
  );
  const footerNavKeys = useMemo(() => {
    return parseFooterNavJson(settings?.footerNavJson ?? null).filter((k) => isModuleEnabled(modulesMap, k));
  }, [settings?.footerNavJson, modulesMap]);

  const rawFooterLegal = (settings as { footerLegalLinksJson?: string | null } | undefined)?.footerLegalLinksJson;
  const legalLinks = useMemo(() => parseFooterLegalLinksJson(rawFooterLegal ?? null), [rawFooterLegal]);
  const rawFooterInfo = (settings as { footerInfoLinksJson?: string | null } | undefined)?.footerInfoLinksJson;
  const infoLinks = useMemo(() => parseFooterInfoLinksJson(rawFooterInfo ?? null), [rawFooterInfo]);

  const primary = settings?.primaryColor?.trim() || "#e61e25";
  const brand = portalNavBrandParts(settings ?? undefined);
  const footerLogo = settings?.logoUrl?.trim()
    ? resolveClientMediaSrc(settings.logoUrl.trim()) || settings.logoUrl.trim()
    : PWA_ICON_PATH;
  const showTurizmModules = isModuleEnabled(modulesMap, "turizm");

  return (
    <footer className="mt-auto shrink-0 border-t border-emerald-100/80 bg-gradient-to-b from-emerald-50/70 to-white text-slate-600">
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-3 flex flex-col items-center text-center lg:items-start lg:text-left gap-3">
            <Link href="/" className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <img
                src={footerLogo}
                alt={brand.text}
                className="h-9 w-auto max-w-[200px] object-contain object-center lg:object-left"
              />
              {!settings?.logoUrl?.trim() && brand.single ? (
                <span className="text-lg font-black whitespace-nowrap text-slate-900">{brand.text}</span>
              ) : !settings?.logoUrl?.trim() ? (
                <span className="text-2xl font-black whitespace-nowrap">
                  <span style={{ color: primary }}>{brand.part1}</span>
                  <span className="text-slate-900">{brand.part2}</span>
                </span>
              ) : null}
            </Link>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              {settings?.footerText?.trim() || "Haber · Video · Harita · Sipariş · Alışveriş · İlan"}
            </p>
          </div>

          <div className="lg:col-span-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#0f766e] mb-3 text-center lg:text-left">
              Menü
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 justify-items-center lg:justify-items-start">
              {footerNavKeys.map((key) => (
                <Link
                  key={key}
                  href={MAIN_NAV_HREF[key]}
                  className="text-sm text-slate-700 hover:text-[#0f766e] transition-colors font-medium"
                >
                  {MAIN_NAV_LABELS[key]}
                </Link>
              ))}
              <Link href="/is-ortagi" className="text-sm text-slate-700 hover:text-[#0f766e] transition-colors font-medium">
                İş Ortağı
              </Link>
              <Link href="/isletme-giris" className="text-sm text-slate-700 hover:text-[#0f766e] transition-colors font-medium">
                İşletme Girişi
              </Link>
              <Link href="/destek" className="text-sm text-slate-700 hover:text-[#0f766e] transition-colors font-medium">
                Destek
              </Link>
              <Link href="/iletisim-kunye" className="text-sm text-slate-700 hover:text-[#0f766e] transition-colors font-medium">
                İletişim · Künye
              </Link>
              {pageFlags.kunye ? (
                <Link href="/kunye" className="text-sm text-slate-700 hover:text-[#0f766e] transition-colors font-medium">
                  Künye
                </Link>
              ) : null}
              {pageFlags.reklam ? (
                <Link href="/reklam" className="text-sm text-slate-700 hover:text-[#0f766e] transition-colors font-medium">
                  Reklam
                </Link>
              ) : null}
              {pageFlags.abonelik ? (
                <Link href="/abonelik" className="text-sm text-slate-700 hover:text-[#0f766e] transition-colors font-medium">
                  Abonelik
                </Link>
              ) : null}
              {pageFlags.iletisim ? (
                <Link href="/iletisim" className="text-sm text-slate-700 hover:text-[#0f766e] transition-colors font-medium">
                  İletişim
                </Link>
              ) : null}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#0f766e] mt-6 mb-2 text-center lg:text-left">
              Bilgi rehberi
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-x-3 gap-y-2 text-xs">
              {infoLinks.map((item, i) => (
                <LegalLink key={`${item.href}-${i}`} item={item} />
              ))}
            </div>
          </div>

          {showTurizmModules ? (
            <div className="lg:col-span-3 border-t border-emerald-100/80 pt-8 lg:border-t-0 lg:pt-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#0f766e] mb-3 text-center lg:text-left">
                Modüller
              </p>
              <div className="grid gap-2 justify-items-center lg:justify-items-start">
                {TURIZM_FOOTER_MODULES.map((item) => {
                  const active = isTurizmSubmenuItemActive(path, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`text-sm font-medium transition-colors ${
                        active ? "text-[#039D55]" : "text-slate-700 hover:text-[#0f766e]"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div
            className={`text-center lg:text-right border-t border-emerald-100/80 pt-8 lg:border-t-0 lg:pt-0 ${
              showTurizmModules ? "lg:col-span-2" : "lg:col-span-5"
            }`}
          >
            <p className="text-xs text-slate-500 leading-relaxed">
              {settings?.copyrightText?.trim() || portalCopyrightFallback(settings ?? undefined)}
            </p>
            <a
              href={PORTAL_ORIGIN}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-[10px] text-slate-500 hover:text-[#0f766e] transition-colors"
            >
              Altyapı: yekpare.net
            </a>
            <a
              href="https://ahenk.net.tr"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-1 text-[10px] text-slate-500 hover:text-[#0f766e] transition-colors"
            >
              Geliştirici: Ahenk Bilgi Teknolojileri
            </a>
          </div>
        </div>

        {legalLinks.length > 0 && (
          <div className="mt-10 pt-6 border-t border-emerald-100/80">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#0f766e] mb-3 text-center lg:text-left">
              Yasal ve bilgilendirme
            </p>
            <nav
              className="flex flex-wrap justify-center lg:justify-start gap-x-1 gap-y-2"
              aria-label="Yasal bağlantılar"
            >
              {legalLinks.map((item, i) => (
                <span key={`${item.href}-${i}`} className="inline-flex items-center gap-1">
                  {i > 0 ? <span className="text-slate-300 px-1 select-none" aria-hidden>|</span> : null}
                  <LegalLink item={item} />
                </span>
              ))}
            </nav>
          </div>
        )}

        <YekpareFooterDisclaimer className="mt-8 rounded-xl border border-emerald-100/90 bg-white/80 px-4 py-3 text-center text-[11px] leading-relaxed text-slate-500 lg:text-left [&_a]:font-semibold [&_a]:text-[#0f766e] [&_a]:hover:underline" />
      </div>
      <div className="border-t border-emerald-100/80 py-3 flex justify-center items-center">
        <Link
          href="/site-haritalari"
          title="RSS ve site haritaları"
          className="text-[#039D55] opacity-80 hover:opacity-100 transition-opacity"
          aria-label="RSS ve site haritaları"
        >
          <Rss className="w-5 h-5" strokeWidth={2.25} aria-hidden />
        </Link>
      </div>
    </footer>
  );
}

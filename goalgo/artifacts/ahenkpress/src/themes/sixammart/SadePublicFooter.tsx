import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Rss } from "lucide-react";
import { YEKPARE_BRAND_LOGO_SRC } from "@/components/YekpareBrandLogo";
import { useGetSiteSettings } from "@workspace/api-client-react";
import {
  parseFooterLegalLinksJson,
  parseModulesEnabledJson,
  isModuleEnabled,
} from "@workspace/site-nav";
import { YEKPARE_FOOTER_SERVICE_MODULES } from "@/lib/yekpareServiceNav";
import { TURIZM_FOOTER_MODULES, isTurizmSubmenuItemActive } from "@/themes/turizm/turizmRoutes";
import { OTOMOTIV_FOOTER_MODULES, isOtomotivSubmenuItemActive } from "@/themes/otomotiv/otomotivRoutes";
import { YekpareFooterDisclaimer } from "@/components/YekpareFooterDisclaimer";
import "@/styles/sade-public-footer.css";

const APP_STORE_LINKS = [
  { label: "Uygulama mağazası", href: "/pwastore" },
  { label: "Haber Merkezi", href: "/habermerkezi" },
  { label: "AI Call Center", href: "/ai-cagri-merkezi" },
  { label: "Haritalar", href: "/haritalar" },
  { label: "Navigasyon", href: "/kesfet" },
  { label: "Bilgi Ağacı", href: "/bilgiagaci" },
] as const;

const SADE_PUBLIC_LINKS = [
  { label: "Tüm hizmetler", href: "/servisler" },
  { label: "Yekpare nedir?", href: "/bilgi/yekpare-nedir" },
  { label: "Keşfet", href: "/kesfet" },
  { label: "Haberler", href: "/haberler" },
  { label: "YekTube", href: "/yektube" },
  { label: "Destek", href: "/destek" },
] as const;

const SERVICE_MODULES = YEKPARE_FOOTER_SERVICE_MODULES;

const ACCOUNT_LINKS = [
  { label: "Hesabım", href: "/hesabim" },
  { label: "Sepet", href: "/magaza/sepet" },
  { label: "Sipariş takip", href: "/siparis-takip" },
  { label: "Siparişlerim", href: "/siparislerim" },
  { label: "İşletme paneli", href: "/servis-saglayici-giris" },
  { label: "Mağaza aç", href: "/magaza/satici-ol" },
] as const;

const TURIZM_HELP_LINKS = [
  { label: "Sık sorulan sorular", href: "/sss" },
  { label: "Destek merkezi", href: "/destek" },
  { label: "İletişim · Künye", href: "/iletisim-kunye" },
];

const TURIZM_COMPANY_LINKS = [
  { label: "İş ortağı", href: "/is-ortagi" },
  { label: "İşletme başvurusu", href: "/isletme-basvuru" },
  { label: "Seyahat sağlayıcı paneli", href: "/turizm-paneli" },
];

const TURIZM_SUPPORT_LINKS = [
  { label: "İşletme girişi", href: "/isletme-giris" },
  { label: "Servis sağlayıcı girişi", href: "/servis-saglayici-giris" },
  { label: "Sipariş takip", href: "/siparis-takip" },
];

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <strong className="yekpare-public-footer__col-title">{title}</strong>
      <div className="yekpare-public-footer__links">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function FooterNewsletter({ label = "Güncellemeler ve daha fazlasını alın" }: { label?: string }) {
  const [email, setEmail] = useState("");
  const [newsMsg, setNewsMsg] = useState("");

  function onNewsletter(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setNewsMsg("Geçerli bir e-posta adresi girin.");
      return;
    }
    setNewsMsg("Teşekkürler! Bülten kaydınız alındı.");
    setEmail("");
  }

  return (
    <div className="yekpare-public-footer__newsletter">
      <div className="yekpare-public-footer__newsletter-inner">
        <p className="yekpare-public-footer__newsletter-text">
          <span aria-hidden>🌿</span> {label}
        </p>
        <form onSubmit={onNewsletter}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta adresiniz"
            autoComplete="email"
          />
          <button type="submit">ABONE</button>
          {newsMsg ? <span className="yekpare-public-footer__newsletter-msg">{newsMsg}</span> : null}
        </form>
      </div>
    </div>
  );
}

function TurizmFooterBody() {
  const [loc] = useLocation();
  const path = loc.split("?")[0] ?? "";
  const { data: settings } = useGetSiteSettings();
  const modulesMap = useMemo(
    () => parseModulesEnabledJson(settings?.modulesEnabledJson ?? null),
    [settings?.modulesEnabledJson],
  );
  const showModules = isModuleEnabled(modulesMap, "turizm");
  const legalLinks = useMemo(
    () => parseFooterLegalLinksJson((settings as { footerLegalLinksJson?: string | null } | undefined)?.footerLegalLinksJson ?? null),
    [settings],
  );

  return (
    <>
      <div className="yekpare-public-footer__main">
        <div className="yekpare-public-footer__grid">
          <FooterCol title="YARDIMA MI İHTİYACINIZ VAR?" links={TURIZM_HELP_LINKS} />
          <FooterCol title="ŞİRKET" links={TURIZM_COMPANY_LINKS} />
          <FooterCol title="DESTEK" links={TURIZM_SUPPORT_LINKS} />
          {showModules ? (
            <div>
              <strong className="yekpare-public-footer__col-title">MODÜLLER</strong>
              <div className="yekpare-public-footer__links">
                {TURIZM_FOOTER_MODULES.map((item) => {
                  const active = isTurizmSubmenuItemActive(path, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={active ? "yekpare-public-footer__link--active" : undefined}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        <YekpareFooterDisclaimer className="yekpare-public-footer__disclaimer" />
        <div className="yekpare-public-footer__bar">
          <span>© {new Date().getFullYear()} Yekpare Seyahat</span>
          {legalLinks.length > 0 ? (
            <nav className="yekpare-public-footer__legal" aria-label="Yasal bağlantılar">
              {legalLinks.map((item, i) => (
                <Link key={`${item.href}-${i}`} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}

function DefaultFooterBody() {
  const { data: settings } = useGetSiteSettings();
  const legalLinks = useMemo(
    () => parseFooterLegalLinksJson((settings as { footerLegalLinksJson?: string | null } | undefined)?.footerLegalLinksJson ?? null),
    [settings],
  );
  const footerText =
    settings?.footerText?.trim() ||
    "Yekpare'de sipariş, alışveriş, keşif, haber ve video içerikleri tek kullanıcı deneyiminde buluşur.";

  return (
    <div className="yekpare-public-footer__main">
      <div className="yekpare-public-footer__grid yekpare-public-footer__grid--default">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <Link href="/" className="yekpare-public-footer__brand-logo-link" aria-label="Yekpare ana sayfa">
              <img
                src={YEKPARE_BRAND_LOGO_SRC}
                alt="Yekpare"
                className="yekpare-public-footer__brand-logo"
                width={160}
                height={40}
                decoding="async"
              />
            </Link>
          </div>
          <p className="yekpare-public-footer__brand-text">{footerText}</p>
        </div>
        <FooterCol title="Hizmetler" links={[...SERVICE_MODULES]} />
        <FooterCol title="Hesap" links={[...ACCOUNT_LINKS]} />
        <FooterCol title="Yekstra" links={[...APP_STORE_LINKS]} />
        <FooterCol title="Yekpare" links={[...SADE_PUBLIC_LINKS]} />
      </div>
      <YekpareFooterDisclaimer className="yekpare-public-footer__disclaimer" />
      <div className="yekpare-public-footer__bar">
        <span>© {new Date().getFullYear()} Yekpare. Tüm hakları saklıdır.</span>
        {legalLinks.length > 0 ? (
          <nav className="yekpare-public-footer__legal" aria-label="Yasal bağlantılar">
            {legalLinks.map((item, i) => (
              <Link key={`${item.href}-${i}`} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        ) : (
          <nav className="yekpare-public-footer__legal" aria-label="Yasal bağlantılar">
            {parseFooterLegalLinksJson(null).map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <div className="yekpare-public-footer__rss">
        <Link href="/site-haritalari" title="RSS ve site haritaları" aria-label="RSS ve site haritaları">
          <Rss className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

const OTOMOTIV_HELP_LINKS = [
  { label: "Sık sorulan sorular", href: "/sss" },
  { label: "Destek merkezi", href: "/destek" },
  { label: "İletişim · Künye", href: "/iletisim-kunye" },
];

const OTOMOTIV_COMPANY_LINKS = [
  { label: "İş ortağı", href: "/is-ortagi" },
  { label: "İşletme başvurusu", href: "/isletme-basvuru" },
  { label: "Otomotiv yönetimi", href: "/admin/otomotiv" },
];

const OTOMOTIV_SUPPORT_LINKS = [
  { label: "İşletme girişi", href: "/isletme-giris" },
  { label: "Servis sağlayıcı girişi", href: "/servis-saglayici-giris" },
];

function OtomotivFooterBody() {
  const [loc] = useLocation();
  const path = loc.split("?")[0] ?? "";
  const { data: settings } = useGetSiteSettings();
  const modulesMap = useMemo(
    () => parseModulesEnabledJson(settings?.modulesEnabledJson ?? null),
    [settings?.modulesEnabledJson],
  );
  const showModules = isModuleEnabled(modulesMap, "otomotiv");
  const legalLinks = useMemo(
    () => parseFooterLegalLinksJson((settings as { footerLegalLinksJson?: string | null } | undefined)?.footerLegalLinksJson ?? null),
    [settings],
  );

  return (
    <>
      <div className="yekpare-public-footer__main">
        <div className="yekpare-public-footer__grid">
          <FooterCol title="YARDIMA MI İHTİYACINIZ VAR?" links={OTOMOTIV_HELP_LINKS} />
          <FooterCol title="ŞİRKET" links={OTOMOTIV_COMPANY_LINKS} />
          <FooterCol title="DESTEK" links={OTOMOTIV_SUPPORT_LINKS} />
          {showModules ? (
            <div>
              <strong className="yekpare-public-footer__col-title">MODÜLLER</strong>
              <div className="yekpare-public-footer__links">
                {OTOMOTIV_FOOTER_MODULES.map((item) => {
                  const active = isOtomotivSubmenuItemActive(path, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={active ? "yekpare-public-footer__link--active" : undefined}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        <YekpareFooterDisclaimer className="yekpare-public-footer__disclaimer" />
        <div className="yekpare-public-footer__bar">
          <span>© {new Date().getFullYear()} Yekpare Otomotiv</span>
          {legalLinks.length > 0 ? (
            <nav className="yekpare-public-footer__legal" aria-label="Yasal bağlantılar">
              {legalLinks.map((item, i) => (
                <Link key={`${item.href}-${i}`} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}

/** Unified Yekpare light footer — white + subtle green tint (§6). */
export function SadePublicFooter({ variant = "default" }: { variant?: "default" | "turizm" | "otomotiv" }) {
  const themed = variant === "turizm" || variant === "otomotiv";
  return (
    <footer className={`yekpare-public-footer${themed ? " sade-turizm-footer" : ""}`}>
      <FooterNewsletter label={themed ? "Güncellemeler ve daha fazlasını alın" : "Yekpare bültenine abone olun"} />
      {variant === "turizm" ? <TurizmFooterBody /> : variant === "otomotiv" ? <OtomotivFooterBody /> : <DefaultFooterBody />}
    </footer>
  );
}

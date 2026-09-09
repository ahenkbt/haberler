import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { applyAhenkAgencySeo, ahenkWhatsAppHref } from "@/lib/ahenkAgencySeo";
import { safeAhenkImageUrl } from "@/lib/ahenkAgencySite";
import "@/styles/ahenkHaber.css";

export function AhenkHaberChrome({
  children,
  subHeader,
  title = "AHENK HABER",
  description = "Ahenk Bilgi Teknolojileri haber sitesi yazılımının canlı demosu. Manşet, kategori ve haber detayı.",
}: {
  children: ReactNode;
  subHeader?: ReactNode;
  title?: string;
  description?: string;
}) {
  const site = useAhenkAgencySite();
  const mark = safeAhenkImageUrl(site.logoMarkUrl, "/ahenk-brand/ahenk-mark.png");

  useEffect(() => {
    applyAhenkAgencySeo({
      title,
      description,
      path: typeof window !== "undefined" ? window.location.pathname : "/haberler",
      site,
      image: site.heroImage,
    });
  }, [title, description, site]);

  return (
    <div className="ahenk-haber">
      <div className="ahenk-haber-demo">
        Canlı demo — Ahenk haber sitesi yazılımı ·{" "}
        <Link href="/haber-sitesi-yazilimi">Yazılımı inceleyin</Link>
        {" · "}
        <Link href="/">Ahenk BT</Link>
      </div>
      <header className="ahenk-haber-header">
        <div className="ahenk-haber-header-inner">
          <Link href="/haberler" className="ahenk-haber-brand" aria-label="AHENK HABER">
            {mark ? <img src={mark} alt="" /> : null}
            <span>
              AHENK <em>HABER</em>
            </span>
          </Link>
          <nav className="ahenk-haber-nav">
            <Link href="/haberler">Gündem</Link>
            <Link href="/haber-merkezi">Haber Merkezi</Link>
            <Link href="/iletisim">İletişim</Link>
            <a href={ahenkWhatsAppHref(site.whatsappTel || site.phoneTel, "Merhaba, haber sitesi yazılımı istiyorum.")} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </nav>
        </div>
        {subHeader ? <div className="ahenk-haber-cats">{subHeader}</div> : null}
      </header>
      {children}
      <footer className="ahenk-haber-footer">
        <p>
          <strong>AHENK HABER</strong> — {site.brandName} haber sitesi yazılımı demosu. İçerik örnek yayın içindir.
        </p>
        <p>
          <Link href="/">ahenk.net.tr</Link>
          {" · "}
          <Link href="/haber-sitesi-yazilimi">Haber sitesi yazılımı</Link>
          {" · "}
          <Link href="/iletisim">{site.email}</Link>
          {" · "}
          <a href={`tel:${site.phoneTel}`}>{site.phone}</a>
        </p>
      </footer>
    </div>
  );
}

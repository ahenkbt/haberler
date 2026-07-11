import type { ReactNode } from "react";
import { Link } from "wouter";
import { BilgiAgaciSubNavBar } from "@/components/BilgiAgaciSubNavBar";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { BILGI_AGACI_DISPLAY_NAME } from "@/lib/bilgiAgaciBrand";
import { useAnsiklopediBasePath } from "@/lib/ansiklopediPaths";
import "@/styles/bilgiAgaciTheme.css";

type Props = { children: ReactNode };

/** Bilgi Ağacı — portal: marka şeridi + alt menü; HM vitrin: üst kromda `HmBilgiAgaciChromeBand`. */
export function BilgiAgaciShell({ children }: Props) {
  const hmCtx = useHmPublicLinkContextOptional();
  const hmEmbedded = hmCtx != null;
  const basePath = useAnsiklopediBasePath();

  return (
    <div
      className="bilgi-agaci-site min-h-screen w-full max-w-none"
      data-page="bilgi-agaci"
      data-hm-embedded={hmEmbedded ? "true" : undefined}
    >
      {!hmEmbedded ? (
        <>
          <header className="bilgi-agaci-brandbar" aria-label={`${BILGI_AGACI_DISPLAY_NAME} marka şeridi`}>
            <div className="bilgi-agaci-brandbar__inner">
              <Link href={basePath} className="bilgi-agaci-brandbar__logo">
                <span aria-hidden>🌳</span>
                {BILGI_AGACI_DISPLAY_NAME}
              </Link>
            </div>
          </header>
          <BilgiAgaciSubNavBar sticky />
        </>
      ) : null}
      {children}
      {!hmEmbedded ? (
        <footer className="bilgi-agaci-mini-footer">
          <div className="bilgi-agaci-mini-footer__inner">
            <p>
              <strong>{BILGI_AGACI_DISPLAY_NAME}</strong> — Yekpare bilgi ve keşif platformu
            </p>
            <div className="bilgi-agaci-mini-footer__links">
              <Link href={`${basePath}/kategori/gezi-seyahat`}>Gezi Seyahat</Link>
              <Link href="/haritalar">Haritalar</Link>
              <Link href="/">Yekpare ana sayfa</Link>
            </div>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
